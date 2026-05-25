import React, { useEffect, useMemo, useState } from 'react';
import { FileText, FolderOpen, Loader2, MessageCircle, Paperclip, Send, Smile, X } from 'lucide-react';
import { Client, MediaItem, useStore } from '../store';
import { MediaSelectorModal } from './MediaSelectorModal';

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
  initialMessage?: string;
  onClose: () => void;
}

const cleanPhone = (value: string) => value.replace(/[^0-9]/g, '');

const isInlineMedia = (mimeType: string) => mimeType.startsWith('image/') || mimeType.startsWith('video/');

const dataUrlToFile = async (dataUrl: string, name: string, mimeType: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: mimeType || blob.type || 'application/octet-stream' });
};

export function WhatsAppChatModal({ client, phone, initialMessage = '', onClose }: Props) {
  const { notify, addLog } = useStore();
  const [hubClients, setHubClients] = useState<WhatsAppHubClient[]>([]);
  const [messages, setMessages] = useState<WhatsAppHubMessage[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [body, setBody] = useState(initialMessage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const targetPhone = useMemo(() => cleanPhone(phone), [phone]);

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
    } catch (error: any) {
      notify(error.message || 'WhatsApp Actor Hub is not configured.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetPhone]);

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
          metadata: { clientId: client?.id, hasMedia: !!media }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send WhatsApp message');
      setSelectedClientId(data.selectedClientId || selectedClientId);
      if (client) addLog(client.id, `WhatsApp Hub message sent: ${body.slice(0, 120)}`, undefined, 'whatsapp', data);
      setBody('');
      setSelectedFile(null);
      setSelectedMedia(null);
      notify('WhatsApp message queued.', 'success');
      await loadData();
    } catch (error: any) {
      notify(error.message || 'Failed to send WhatsApp message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const emojiOptions = ['😀', '😊', '👍', '🙏', '🔥', '🎉', '✅', '📦', '💬', '🤝', '📄', '🚀'];

  return (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-green-400" />
            <div>
              <div className="font-bold text-white">{client?.name || targetPhone}</div>
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
            <option value="">Random / Sticky client</option>
            {hubClients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name || client.id} ({client.status}) {client.quota ? `quota ${client.quota.remaining}/${client.quota.dailyQuota}` : ''}
              </option>
            ))}
          </select>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950">
          {messages.length === 0 && !loading && (
            <div className="text-center text-slate-500 text-sm py-10">No WhatsApp messages yet.</div>
          )}
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${message.direction === 'outbound' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                {(message.payload?.hasMedia || message.message_type !== 'chat') && (
                  <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
                    <FileText className="w-3 h-3" />
                    {message.payload?.filename || message.payload?.type || message.message_type || 'media'}
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
              <button onClick={() => setShowMediaSelector(true)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg" title="Select from media library">
                <FolderOpen className="w-5 h-5" />
              </button>
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type a WhatsApp message..."
              className="flex-1 min-h-16 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none resize-none focus:border-green-500"
            />
            <button
              onClick={sendMessage}
              disabled={sending || (!body.trim() && !selectedFile && !selectedMedia)}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold text-white flex items-center gap-2 self-end"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
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
