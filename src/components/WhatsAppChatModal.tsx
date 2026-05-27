import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, FileText, FolderOpen, Loader2, MessageCircle, Paperclip, Plus, Send, Smile, Sparkles, Tag, User, X } from 'lucide-react';
import { Client, Comment, MediaItem, useStore } from '../store';
import { MediaSelectorModal } from './MediaSelectorModal';
import { useTranslation } from '../lib/i18n';

interface WhatsAppHubClient {
  id: string;
  name: string;
  phone?: string;
  status: string;
  quota?: { sentToday: number; dailyQuota: number; remaining: number; replyRate: number };
}

interface WhatsAppHubMessage {
  id: string;
  client_id: string;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient: string;
  body: string;
  message_type?: string;
  payload?: any;
  created_at: string;
  received_at?: string;
}

interface Props {
  client?: Client | null;
  phone: string;
  conversation?: WhatsAppConversation | null;
  initialMessage?: string;
  embedded?: boolean;
  onClose: () => void;
}

interface WhatsAppConversation {
  id: string;
  targetPhone: string;
  clientId?: string;
  clientName?: string;
  clientCompany?: string;
  tags: string[];
  comments: Comment[];
}

const cleanPhone = (value: string) => value.replace(/[^0-9]/g, '');

const isInlineMedia = (mimeType: string) => mimeType.startsWith('image/') || mimeType.startsWith('video/');

const dataUrlToFile = async (dataUrl: string, name: string, mimeType: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: mimeType || blob.type || 'application/octet-stream' });
};

export function WhatsAppChatModal({ client, phone, conversation: initialConversation, initialMessage = '', embedded = false, onClose }: Props) {
  const { notify, addLog, selectClient, language, llmConfigs, activeLLMId, llmMappings, logs, emails } = useStore();
  const t = useTranslation(language);
  const [hubClients, setHubClients] = useState<WhatsAppHubClient[]>([]);
  const [messages, setMessages] = useState<WhatsAppHubMessage[]>([]);
  const [conversation, setConversation] = useState<WhatsAppConversation | null>(initialConversation || null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [body, setBody] = useState(initialMessage);
  const [tagInput, setTagInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const targetPhone = useMemo(() => cleanPhone(phone), [phone]);

  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(llm => llm.id === id) || null;
  };

  const loadData = async () => {
    if (!targetPhone) return;
    setLoading(true);
    try {
      const [clientsRes, messagesRes] = await Promise.all([
        fetch('/api/whatsapp-hub/clients', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`/api/whatsapp-hub/messages?targetPhone=${encodeURIComponent(targetPhone)}&limit=200`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const clientsData = await clientsRes.json();
      const messagesData = await messagesRes.json();
      if (!clientsRes.ok) throw new Error(clientsData.error || 'Failed to load WhatsApp clients');
      if (!messagesRes.ok) throw new Error(messagesData.error || 'Failed to load WhatsApp messages');
      setHubClients(clientsData.clients || []);
      setMessages((messagesData.messages || []).slice().reverse());
      const sticky = (messagesData.messages || []).find((message: WhatsAppHubMessage) => message.direction === 'outbound' && message.client_id)?.client_id;
      if (sticky) setSelectedClientId(sticky);
      const conversationsRes = await fetch(`/api/whatsapp-hub/conversations?search=${encodeURIComponent(targetPhone)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const conversationsData = await conversationsRes.json();
      if (conversationsRes.ok) {
        const matched = (conversationsData.conversations || []).find((item: WhatsAppConversation) => item.targetPhone === targetPhone);
        if (matched) setConversation(matched);
      }
    } catch (error: any) {
      notify(error.message || 'WhatsApp Actor Hub is not configured.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetPhone]);

  const defaultScheduleDateTime = () => {
    const date = new Date(Date.now() + 15 * 60 * 1000);
    date.setSeconds(0, 0);
    return date.toISOString().slice(0, 16);
  };

  const updateConversationTags = async (nextTags: string[]) => {
    if (!conversation?.id) return;
    const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ tags: nextTags })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to update WhatsApp tags');
    setConversation(prev => prev ? { ...prev, tags: nextTags } : prev);
  };

  const addTag = async () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (!tag || !conversation) return;
    const nextTags = Array.from(new Set([...(conversation.tags || []), tag]));
    try {
      await updateConversationTags(nextTags);
      setTagInput('');
    } catch (error: any) {
      notify(error.message || 'Failed to update WhatsApp tags.', 'error');
    }
  };

  const removeTag = async (tag: string) => {
    if (!conversation) return;
    try {
      await updateConversationTags((conversation.tags || []).filter(item => item !== tag));
    } catch (error: any) {
      notify(error.message || 'Failed to update WhatsApp tags.', 'error');
    }
  };

  const addConversationComment = async () => {
    if (!conversation?.id || !commentInput.trim()) return;
    try {
      const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: commentInput })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add WhatsApp comment');
      setConversation(prev => prev ? { ...prev, comments: data.comments || [...(prev.comments || []), data.comment] } : prev);
      setCommentInput('');
    } catch (error: any) {
      notify(error.message || 'Failed to add WhatsApp comment.', 'error');
    }
  };

  const generateWhatsAppMessage = async () => {
    const prompt = body.trim();
    if (!prompt) {
      notify(t('typePromptFirst'), 'warning');
      return;
    }

    const llmConfig = getLLMConfig('whatsapp_drafting') || getLLMConfig('drafting');
    if (!llmConfig) {
      notify(t('configureWhatsAppDraftingModel'), 'warning');
      return;
    }

    setGenerating(true);
    try {
      const recentMessages = messages.slice(-12).map(message => ({
        direction: message.direction,
        body: message.body,
        at: message.created_at || message.received_at
      }));
      const clientLogs = client
        ? logs
            .filter(log => log.clientId === client.id)
            .slice(0, 20)
            .map(log => ({ date: log.date, type: log.type, content: log.content }))
        : [];
      const clientEmails = client
        ? emails
            .filter(email => email.clientId === client.id)
            .slice(0, 8)
            .map(email => ({
              date: email.date,
              type: email.type,
              subject: email.subject,
              bodyPreview: email.body?.slice(0, 600)
            }))
        : [];
      const response = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          command: `Draft a WhatsApp message using this user instruction as the prompt: ${prompt}

Write in a WhatsApp style: concise, natural, conversational, easy to reply to, and not formatted like an email. Adapt tone, language, timing, offer details, and next step to the customer profile, preferences, prior communication, CRM records, recent WhatsApp chat, and relevant knowledge base context. Return only the message text.`,
          context: {
            channel: 'whatsapp',
            userInstruction: prompt,
            client,
            clientPreferences: {
              preferredLanguage: client?.preferredLanguage,
              preferredTimeRange: client?.preferredTimeRange,
              country: client?.country,
              tags: client?.tags || []
            },
            clientComments: client?.comments || [],
            clientLogs,
            relatedEmails: clientEmails,
            conversation,
            recentWhatsAppMessages: recentMessages,
            targetPhone,
            userLanguagePreference: language === 'zh' ? 'Chinese' : 'English'
          },
          llmConfig,
          embeddingLlmConfig: getLLMConfig('embedding'),
          skipKnowledgeBase: false
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate WhatsApp message');
      setBody((data.result || '').trim());
      notify('WhatsApp message drafted with AI.', 'success');
    } catch (error: any) {
      notify(error.message || 'Failed to generate WhatsApp message.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const sendMessage = async () => {
    if ((!body.trim() && !selectedFile && !selectedMedia) || !targetPhone) return;
    setSending(true);
    try {
      let media: any;
      const uploadFileToHub = async (fileToUpload: File) => {
        const form = new FormData();
        form.append('file', fileToUpload);
        const uploadResponse = await fetch('/api/whatsapp-hub/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: form
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || 'Failed to upload WhatsApp media');
        const file = uploadData.file;
        return {
          url: file.url,
          originalName: file.originalName || fileToUpload.name,
          mimeType: file.mimeType || fileToUpload.type,
          sendAsDocument: !isInlineMedia(file.mimeType || fileToUpload.type)
        };
      };

      if (selectedFile) {
        media = await uploadFileToHub(selectedFile);
      } else if (selectedMedia) {
        if (selectedMedia.url.startsWith('data:')) {
          const file = await dataUrlToFile(selectedMedia.url, selectedMedia.name, selectedMedia.type);
          media = await uploadFileToHub(file);
        } else {
          media = {
            url: selectedMedia.url,
            originalName: selectedMedia.name,
            mimeType: selectedMedia.type,
            sendAsDocument: !isInlineMedia(selectedMedia.type)
          };
        }
      }
      const response = await fetch('/api/whatsapp-hub/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: targetPhone,
          body,
          media,
          clientId: selectedClientId || undefined,
          scheduledAt: scheduleEnabled && scheduleDateTime ? new Date(scheduleDateTime).toISOString() : undefined,
          metadata: { clientId: client?.id, hasMedia: !!media }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send WhatsApp message');
      setSelectedClientId(data.selectedClientId || selectedClientId);
      if (client) {
        addLog(
          client.id,
          data.scheduled
            ? `WhatsApp Hub message scheduled for ${new Date(data.scheduledAt).toLocaleString()}: ${body.slice(0, 120)}`
            : `WhatsApp Hub message sent: ${body.slice(0, 120)}`,
          undefined,
          'whatsapp',
          data
        );
      }
      setBody('');
      setSelectedFile(null);
      setSelectedMedia(null);
      if (data.scheduled) {
        setScheduleEnabled(false);
        setScheduleDateTime('');
      }
      notify(data.scheduled ? 'WhatsApp message scheduled.' : 'WhatsApp message queued.', 'success');
      await loadData();
    } catch (error: any) {
      notify(error.message || 'Failed to send WhatsApp message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const emojiOptions = ['😀', '😊', '👍', '🙏', '🔥', '🎉', '✅', '📦', '💬', '🤝', '📄', '🚀'];

  return (
    <div className={embedded ? "flex-1 min-h-0 flex flex-col bg-slate-950/50" : "fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"}>
      <div className={embedded ? "flex-1 min-h-0 bg-slate-950/50 flex flex-col overflow-hidden" : "w-full max-w-3xl h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-green-400" />
            <div>
              {client ? (
                <button
                  onClick={() => selectClient(client.id)}
                  className="font-bold text-white hover:text-cyan-300 hover:underline flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" />
                  {client.name}
                </button>
              ) : (
                <div className="font-bold text-white">{conversation?.clientName || targetPhone}</div>
              )}
              <div className="text-xs text-slate-500">{targetPhone}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-800 flex items-center gap-3">
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
          >
            <option value="">{t('randomStickyClient')}</option>
            {hubClients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name || client.id} ({client.status}) {client.quota ? `quota ${client.quota.remaining}/${client.quota.dailyQuota}` : ''}
              </option>
            ))}
          </select>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>

        {conversation && (
          <div className="p-3 border-b border-slate-800 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 bg-slate-900">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {(conversation.tags || []).map(tag => (
                  <button key={tag} onClick={() => removeTag(tag)} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-red-950/40 text-xs text-cyan-300 hover:text-red-300 border border-slate-700">
                    <Tag className="w-3 h-3" />
                    {tag}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
                  placeholder={t('addTag')}
                  className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
                />
                <button onClick={addTag} className="px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="max-h-20 overflow-y-auto space-y-1">
                {(conversation.comments || []).slice(-3).map(comment => (
                  <div key={comment.id} className="text-[11px] bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400">
                    <span className="text-slate-300">{comment.content}</span>
                    <span className="ml-2 text-slate-600">{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addConversationComment(); }}
                  placeholder={t('addConversationComment')}
                  className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
                />
                <button onClick={addConversationComment} className="px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950">
          {messages.length === 0 && !loading && (
            <div className="text-center text-slate-500 text-sm py-10">{t('noWhatsAppMessages')}</div>
          )}
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${message.direction === 'outbound' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                {(message.payload?.hasMedia || message.message_type !== 'chat') && (
                  <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
                    <FileText className="w-3 h-3" />
                    {message.payload?.filename || message.payload?.type || message.message_type || t('mediaMessage')}
                  </div>
                )}
                <div>{message.body}</div>
                <div className="text-[10px] opacity-70 mt-1">
                  {message.client_id} · {new Date(message.created_at || message.received_at || Date.now()).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3">
          {selectedFile && (
            <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
              <span className="truncate flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-400" />
                {selectedFile.name}
              </span>
              <button onClick={() => setSelectedFile(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {selectedMedia && (
            <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
              <span className="truncate flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                {selectedMedia.name}
              </span>
              <button onClick={() => setSelectedMedia(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {showEmoji && (
            <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-700 rounded-lg p-2">
              {emojiOptions.map(emoji => (
                <button key={emoji} onClick={() => setBody(prev => `${prev}${emoji}`)} className="text-xl hover:bg-slate-800 rounded p-1">
                  {emoji}
                </button>
              ))}
            </div>
          )}
          {scheduleEnabled && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm">
              <CalendarClock className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">{t('sendLater')}</span>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setScheduleDateTime(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-500">{t('whatsappRetryHint')}</span>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex flex-col gap-2">
              <label className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer">
                <Paperclip className="w-5 h-5" />
                <input
                  type="file"
                  className="hidden"
                  onChange={e => {
                    setSelectedFile(e.target.files?.[0] || null);
                    setSelectedMedia(null);
                  }}
                />
              </label>
              <button onClick={() => setShowMediaSelector(true)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg" title={t('selectFromMediaLibrary')}>
                <FolderOpen className="w-5 h-5" />
              </button>
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">
                <Smile className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setScheduleEnabled(prev => {
                    const next = !prev;
                    if (next && !scheduleDateTime) setScheduleDateTime(defaultScheduleDateTime());
                    return next;
                  });
                }}
                className={`p-2 rounded-lg ${scheduleEnabled ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                title={t('scheduleMessage')}
              >
                <CalendarClock className="w-5 h-5" />
              </button>
              <button
                onClick={generateWhatsAppMessage}
                disabled={generating || !body.trim()}
                className="p-2 bg-cyan-900/50 hover:bg-cyan-800 disabled:bg-slate-800 disabled:text-slate-600 text-cyan-300 rounded-lg"
                title={t('generateWhatsAppWithAI')}
              >
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={t('typeWhatsAppMessage')}
              className="flex-1 min-h-16 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none resize-none focus:border-green-500"
            />
            <button
              onClick={sendMessage}
              disabled={sending || (!body.trim() && !selectedFile && !selectedMedia) || (scheduleEnabled && !scheduleDateTime)}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold text-white flex items-center gap-2 self-end"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {scheduleEnabled ? t('schedule') : t('send')}
            </button>
          </div>
        </div>
      </div>
      {showMediaSelector && (
        <MediaSelectorModal
          onSelect={(_, media) => {
            setSelectedMedia(media);
            setSelectedFile(null);
          }}
          onClose={() => setShowMediaSelector(false)}
          allowedTypes={[]}
        />
      )}
    </div>
  );
}
