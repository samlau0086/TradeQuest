import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, FileText, FolderOpen, Loader2, MessageCircle, Paperclip, Plus, Send, Smile, Sparkles, Tag, User, UserPlus, X } from 'lucide-react';
import { Client, Comment, MediaItem, useStore } from '../store';
import { MediaSelectorModal } from './MediaSelectorModal';
import { useTranslation } from '../lib/i18n';
import { AgentContextSuggestions } from './AgentContextSuggestions';
import { getCustomerOutputLanguage } from '../lib/language';
import { ClientFormModal } from './ClientFormModal';
import { AddContactToClientModal } from './AddContactToClientModal';

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
  contactPhone?: string;
  rawChatId?: string;
  conversationKey?: string;
  clientId?: string;
  clientName?: string;
  clientCompany?: string;
  tags: string[];
  comments: Comment[];
  agentContextAnalysis?: any;
  agentContextAnalysisKey?: string;
}

const cleanPhone = (value: string) => value.replace(/[^0-9]/g, '');
const isChatId = (value: string) => /@(?:lid|c\.us|g\.us|broadcast)$/i.test(value || '');

const isInlineMedia = (mimeType: string) => mimeType.startsWith('image/') || mimeType.startsWith('video/');

const whatsappMessageCacheKey = (targetPhone: string) => `tradequest.whatsapp.messages.cache.v1.${targetPhone}`;

function readCachedWhatsAppMessages(targetPhone: string): WhatsAppHubMessage[] {
  try {
    const raw = sessionStorage.getItem(whatsappMessageCacheKey(targetPhone));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedWhatsAppMessages(targetPhone: string, messages: WhatsAppHubMessage[]) {
  try {
    sessionStorage.setItem(whatsappMessageCacheKey(targetPhone), JSON.stringify(messages.slice(-300)));
  } catch {
    // Session storage is only a speed cache.
  }
}

const dataUrlToFile = async (dataUrl: string, name: string, mimeType: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: mimeType || blob.type || 'application/octet-stream' });
};

export function WhatsAppChatModal({ client, phone, conversation: initialConversation, initialMessage = '', embedded = false, onClose }: Props) {
  const { notify, addLog, selectClient, language, llmConfigs, activeLLMId, llmMappings, logs, emails, clients, deals, knowledgeBase, products, incrementAgentHubTaskCount } = useStore();
  const t = useTranslation(language);
  const [hubClients, setHubClients] = useState<WhatsAppHubClient[]>([]);
  const targetPhone = useMemo(() => isChatId(phone) ? phone.trim() : cleanPhone(phone), [phone]);
  const [messages, setMessages] = useState<WhatsAppHubMessage[]>(() => readCachedWhatsAppMessages(targetPhone));
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
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isAddingContactToClient, setIsAddingContactToClient] = useState(false);
  const syncInFlightRef = useRef(false);
  const activeClient = useMemo(() => {
    if (client) return client;
    if (conversation?.clientId) return clients.find(item => item.id === conversation.clientId) || null;
    return clients.find(item => item.contactMethods?.some(method => (
      !isChatId(targetPhone) && ['whatsapp', 'phone'].includes(method.type) && cleanPhone(method.value).endsWith(targetPhone.slice(-8))
    ))) || null;
  }, [client, conversation?.clientId, clients, targetPhone]);
  const relatedDeals = useMemo(() => (
    activeClient
      ? deals
          .filter(deal => deal.clientId === activeClient.id)
          .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
          .slice(0, 5)
      : []
  ), [activeClient?.id, deals]);
  const localKnowledgeSnippets = useMemo(() => (
    activeClient
      ? knowledgeBase
          .filter(item => !item.clientId || item.clientId === activeClient.id)
          .slice(0, 8)
          .map(item => ({ title: item.title, content: item.content?.slice(0, 900) }))
      : knowledgeBase.slice(0, 5).map(item => ({ title: item.title, content: item.content?.slice(0, 900) }))
  ), [activeClient?.id, knowledgeBase]);
  const productSnippets = useMemo(() => products.slice(0, 12).map(product => ({
    name: product.name,
    sku: product.sku,
    description: product.description?.slice(0, 700),
    salesPoints: product.salesPoints?.slice(0, 700),
    bulkPrices: product.bulkPrices || []
  })), [products]);
  const latestInboundMessage = messages.filter(message => message.direction === 'inbound').slice(-1)[0];
  const latestOutboundMessage = messages.filter(message => message.direction === 'outbound').slice(-1)[0];
  const recentInboundMessages = messages.filter(message => message.direction === 'inbound').slice(-6);
  const recentOutboundMessages = messages.filter(message => message.direction === 'outbound').slice(-6);
  const agentContextCacheKey = latestInboundMessage
    ? `whatsapp:${targetPhone}:inbound:${latestInboundMessage.id}`
    : `whatsapp:${targetPhone}:no-inbound`;
  const agentContextBody = recentInboundMessages.length > 0
    ? [
        'Customer inbound WhatsApp messages only. Use these to infer customer intent:',
        ...recentInboundMessages.map(message => `inbound customer: ${message.body}`),
        '',
        'Our outbound WhatsApp messages are background only. Do not infer customer intent from these:',
        ...recentOutboundMessages.map(message => `outbound team: ${message.body}`)
      ].join('\n')
    : [
        'NO_INBOUND_CUSTOMER_MESSAGES',
        'The customer has not sent any inbound WhatsApp messages in this conversation.',
        'Our outbound WhatsApp messages are prior outreach only and must not be used as evidence of customer intent:',
        ...recentOutboundMessages.map(message => `outbound team: ${message.body}`)
      ].join('\n');
  const agentContextAdditionalContext = activeClient
    ? [
        `Client profile: ${activeClient.name || ''} ${activeClient.company || ''} ${activeClient.country || ''}`.trim(),
        `Preferred language: ${activeClient.preferredLanguage || 'N/A'}`,
        `AI customer summary: ${activeClient.agentSummary || activeClient.leadSummary || 'N/A'}`,
        `Best next action: ${activeClient.agentNextStep || activeClient.leadNextStep || 'N/A'}`,
        `Lead score: ${activeClient.leadScore ?? 'N/A'}`,
        `Tags: ${(activeClient.tags || []).join(', ') || 'N/A'}`,
        `Recent internal comments: ${(activeClient.comments || []).slice(-5).map(comment => comment.content).join(' | ') || 'N/A'}`,
        `Recent CRM activity: ${logs.filter(log => log.clientId === activeClient.id).slice(0, 10).map(log => `${log.date}: ${log.content}`).join(' | ') || 'N/A'}`,
        `Recent email history: ${emails.filter(email => email.clientId === activeClient.id).slice(0, 6).map(email => `${email.type} ${email.date}: ${email.subject} - ${(email.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220)}`).join(' | ') || 'N/A'}`,
        `Related leads/deals: ${relatedDeals.map(deal => `${deal.name} (${deal.status}) score ${deal.leadScore ?? 'N/A'} summary: ${deal.leadSummary || 'N/A'} next: ${deal.leadNextStep || 'N/A'}`).join(' | ') || 'N/A'}`,
        `Relevant knowledge snippets: ${localKnowledgeSnippets.map(item => `${item.title}: ${item.content}`).join(' | ') || 'N/A'}`,
        `Product context: ${productSnippets.map(product => `${product.name}: ${product.salesPoints || product.description || ''}`).join(' | ') || 'N/A'}`
      ].join('\n')
    : [
        `Unlinked WhatsApp conversation: ${targetPhone}`,
        `Product context: ${productSnippets.map(product => `${product.name}: ${product.salesPoints || product.description || ''}`).join(' | ') || 'N/A'}`,
        `Relevant knowledge snippets: ${localKnowledgeSnippets.map(item => `${item.title}: ${item.content}`).join(' | ') || 'N/A'}`
      ].join('\n');
  const outboundLanguage = getCustomerOutputLanguage({
    lastCommunicationText: latestInboundMessage?.body,
    preferredLanguage: activeClient?.preferredLanguage,
    country: activeClient?.country
  });

  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(llm => llm.id === id) || null;
  };

  const loadCachedMessages = async (options: { notifyErrors?: boolean } = {}) => {
    if (!targetPhone) return;
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
      const nextMessages = (messagesData.messages || []).slice().reverse();
      setMessages(nextMessages);
      writeCachedWhatsAppMessages(targetPhone, nextMessages);
      const sticky = (messagesData.messages || []).find((message: WhatsAppHubMessage) => message.direction === 'outbound' && message.client_id)?.client_id;
      if (sticky) setSelectedClientId(sticky);
      const conversationsRes = await fetch(`/api/whatsapp-hub/conversations?search=${encodeURIComponent(targetPhone)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const conversationsData = await conversationsRes.json();
      if (conversationsRes.ok) {
        const matched = (conversationsData.conversations || []).find((item: WhatsAppConversation) => (
          item.targetPhone === targetPhone || item.contactPhone === targetPhone || item.rawChatId === targetPhone || item.conversationKey === targetPhone
        ));
        if (matched) setConversation(matched);
      }
    } catch (error: any) {
      if (options.notifyErrors !== false) {
        notify(error.message || 'WhatsApp Actor Hub is not configured.', 'error');
      }
      throw error;
    }
  };

  const syncLatestMessages = async () => {
    if (!targetPhone || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      const syncRes = await fetch('/api/whatsapp-hub/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ targetPhone, limit: 500 })
      });
      if (syncRes.ok) {
        await loadCachedMessages({ notifyErrors: false });
      }
    } catch (error) {
      console.warn('WhatsApp background sync unavailable in chat modal', error);
    } finally {
      syncInFlightRef.current = false;
    }
  };

  const loadData = async (options: { sync?: boolean } = {}) => {
    if (!targetPhone) return;
    setLoading(true);
    try {
      await loadCachedMessages({ notifyErrors: true });
      if (options.sync !== false) {
        void syncLatestMessages();
      }
    } catch {
      // loadCachedMessages already surfaced a user-facing notification.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMessages(readCachedWhatsAppMessages(targetPhone));
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

  const addConversationComment = async (content = commentInput) => {
    if (!conversation?.id || !content.trim()) return;
    try {
      const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add WhatsApp comment');
      setConversation(prev => prev ? { ...prev, comments: data.comments || [...(prev.comments || []), data.comment] } : prev);
      if (content === commentInput) setCommentInput('');
    } catch (error: any) {
      notify(error.message || 'Failed to add WhatsApp comment.', 'error');
    }
  };

  const deleteConversationComment = async (commentId: string) => {
    if (!conversation?.id) return;
    try {
      const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete WhatsApp comment');
      setConversation(prev => prev ? { ...prev, comments: data.comments || (prev.comments || []).filter(comment => comment.id !== commentId) } : prev);
    } catch (error: any) {
      notify(error.message || 'Failed to delete WhatsApp comment.', 'error');
    }
  };

  const linkConversationToClient = async (clientId: string) => {
    const linkedClient = useStore.getState().clients.find(item => item.id === clientId);
    if (conversation?.id) {
      try {
        const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            clientId,
            clientName: linkedClient?.name || targetPhone,
            clientCompany: linkedClient?.company || ''
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to link WhatsApp conversation');
      } catch (error: any) {
        notify(error.message || 'Failed to link WhatsApp conversation.', 'warning');
      }
    }
    setConversation(prev => prev ? {
      ...prev,
      clientId,
      clientName: linkedClient?.name || targetPhone,
      clientCompany: linkedClient?.company || ''
    } : prev);
    selectClient(clientId);
  };

  const handleLeadCreated = async (newClientId: string) => {
    await linkConversationToClient(newClientId);
    setIsCreatingLead(false);
  };

  const generateWhatsAppMessage = async (seedPrompt = body.trim()) => {
    const prompt = seedPrompt.trim();
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
      const clientLogs = activeClient
        ? logs
            .filter(log => log.clientId === activeClient.id)
            .slice(0, 20)
            .map(log => ({ date: log.date, type: log.type, content: log.content }))
        : [];
      const clientEmails = activeClient
        ? emails
            .filter(email => email.clientId === activeClient.id)
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
          command: `Draft an outbound WhatsApp message using this user instruction as the prompt: ${prompt}

Write in a WhatsApp style: concise, natural, conversational, easy to reply to, and not formatted like an email. Customer-facing output language: ${outboundLanguage}. This language was resolved by priority: last customer communication language > client preferred language > official country/region language > English. Adapt tone, timing, offer details, and next step to the customer profile, preferences, prior communication, CRM records, recent WhatsApp chat, and relevant knowledge base context.
Critical direction rule: inbound messages are customer messages; outbound messages are our team's messages. Never treat our outbound messages as if the customer said them. If the latest message is outbound, draft a follow-up based on the latest inbound customer message and prior outreach context.
Before drafting, use the provided AI Customer Summary, AI next step, lead summaries, deal context, local RAG snippets, and product sales points. If those conflict with the raw chat, prioritize the latest inbound customer message and then CRM AI analysis.
Return only the message text.`,
          context: {
            channel: 'whatsapp',
            userInstruction: prompt,
            directionPolicy: 'Only inbound WhatsApp messages are customer messages. Outbound messages were sent by our team and must be used only as prior outreach context, never as customer requests to answer.',
            client: activeClient,
            clientId: activeClient?.id || conversation?.clientId || null,
            aiCustomerSummary: activeClient?.agentSummary || activeClient?.leadSummary || '',
            aiCustomerNextStep: activeClient?.agentNextStep || activeClient?.leadNextStep || '',
            aiCustomerScore: activeClient?.leadScore ?? null,
            relatedLeads: relatedDeals.map(deal => ({
              id: deal.id,
              name: deal.name,
              status: deal.status,
              value: deal.value,
              leadScore: deal.leadScore,
              leadSummary: deal.leadSummary,
              leadNextStep: deal.leadNextStep,
              comments: (deal.comments || []).slice(-5)
            })),
            localKnowledgeSnippets,
            productSnippets,
            clientPreferences: {
              preferredLanguage: activeClient?.preferredLanguage,
              preferredTimeRange: activeClient?.preferredTimeRange,
              country: activeClient?.country,
              tags: activeClient?.tags || []
            },
            clientComments: activeClient?.comments || [],
            clientLogs,
            relatedEmails: clientEmails,
            conversation,
            recentWhatsAppMessages: recentMessages,
            latestInboundCustomerMessage: latestInboundMessage?.body || '',
            latestOutboundOurMessage: latestOutboundMessage?.body || '',
            targetPhone,
            outboundLanguage,
            clientPreferredLanguage: activeClient?.preferredLanguage || null,
            systemLanguage: language === 'zh' ? 'Chinese' : 'English'
          },
          llmConfig,
          embeddingLlmConfig: getLLMConfig('embedding'),
          skipKnowledgeBase: false
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate WhatsApp message');
      setBody((data.result || '').trim());
      incrementAgentHubTaskCount('whatsapp_draft_agent');
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
          metadata: { clientId: activeClient?.id, hasMedia: !!media }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send WhatsApp message');
      setSelectedClientId(data.selectedClientId || selectedClientId);
      if (activeClient) {
        addLog(
          activeClient.id,
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
      await loadData({ sync: false });
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
              {activeClient ? (
                <button
                  onClick={() => selectClient(activeClient.id)}
                  className="font-bold text-white hover:text-cyan-300 hover:underline flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" />
                  {activeClient.name}
                </button>
              ) : (
                <div className="font-bold text-white">{conversation?.clientName || targetPhone}</div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{targetPhone}</span>
                {!activeClient && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsCreatingLead(true)}
                      className="inline-flex items-center gap-1 rounded bg-slate-800/70 px-1.5 py-0.5 font-bold text-cyan-400 hover:bg-slate-700 hover:text-cyan-300"
                    >
                      <UserPlus className="w-3 h-3" />
                      New Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingContactToClient(true)}
                      className="inline-flex items-center gap-1 rounded bg-slate-800/70 px-1.5 py-0.5 font-bold text-emerald-400 hover:bg-slate-700 hover:text-emerald-300"
                    >
                      <User className="w-3 h-3" />
                      Add to Existing Client
                    </button>
                  </>
                )}
              </div>
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
                  <div key={comment.id} className="group flex items-start gap-2 text-[11px] bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400">
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-300 break-words">{comment.content}</span>
                      <span className="ml-2 text-slate-600">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => deleteConversationComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-300 transition-opacity"
                      title={t('deleteComment')}
                    >
                      <X className="w-3 h-3" />
                    </button>
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
                <button onClick={() => addConversationComment()} className="px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
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
          <AgentContextSuggestions
            channel="whatsapp"
            cacheKey={agentContextCacheKey}
            clientId={conversation?.clientId || activeClient?.id}
            whatsappNumber={targetPhone}
            persistedInsight={conversation?.agentContextAnalysisKey === agentContextCacheKey ? conversation?.agentContextAnalysis : undefined}
            persistedInsightKey={conversation?.agentContextAnalysisKey}
            subject={conversation?.clientName || activeClient?.name || targetPhone}
            body={agentContextBody}
            additionalContext={agentContextAdditionalContext}
            clientName={conversation?.clientName || activeClient?.name}
            hasClient={!!(conversation?.clientId || activeClient?.id)}
            hasKnowledge={!!activeClient}
            hasCustomerMessage={recentInboundMessages.length > 0}
            onDraftReply={() => generateWhatsAppMessage(
              body.trim() || (latestInboundMessage
                ? `Reply to the latest inbound customer WhatsApp message from ${conversation?.clientName || activeClient?.name || targetPhone}: ${latestInboundMessage.body}`
                : `Draft a polite WhatsApp follow-up to ${conversation?.clientName || activeClient?.name || targetPhone}. There is no inbound customer message yet, so do not answer our own outbound messages.`)
            )}
            onAddComment={() => addConversationComment(`Agent suggestion: review WhatsApp conversation with ${conversation?.clientName || activeClient?.name || targetPhone} and prepare the next best reply.`)}
            onSaveAnalysis={async (key, insight) => {
              if (!conversation?.id) return;
              const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ agentContextAnalysis: insight, agentContextAnalysisKey: key })
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(data.error || 'Failed to save WhatsApp analysis');
              setConversation(prev => prev ? { ...prev, agentContextAnalysis: insight, agentContextAnalysisKey: key } : prev);
            }}
          />
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
                onClick={() => generateWhatsAppMessage()}
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
      {isCreatingLead && (
        <ClientFormModal
          onClose={() => setIsCreatingLead(false)}
          initialData={{
            name: conversation?.clientName || targetPhone,
            company: conversation?.clientCompany || 'Unknown',
            country: 'Unknown',
            status: 'Leads',
            tags: ['whatsapp'],
            contactMethods: [{ type: 'whatsapp', value: targetPhone }],
            contacts: [{
              id: `contact_${Date.now()}`,
              name: conversation?.clientName || targetPhone,
              title: '',
              isPrimary: true,
              contactMethods: [{ type: 'whatsapp', value: targetPhone }]
            }]
          }}
          onSave={handleLeadCreated}
        />
      )}
      {isAddingContactToClient && (
        <AddContactToClientModal
          contactMethod={{ type: 'whatsapp', value: targetPhone }}
          displayName={conversation?.clientName || targetPhone}
          onClose={() => setIsAddingContactToClient(false)}
          onLinked={async (clientId) => {
            await linkConversationToClient(clientId);
          }}
        />
      )}
    </div>
  );
}
