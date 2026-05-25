import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { Client, useStore } from '../store';

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

export function WhatsAppChatModal({ client, phone, initialMessage = '', onClose }: Props) {
  const { notify, addLog } = useStore();
  const [hubClients, setHubClients] = useState<WhatsAppHubClient[]>([]);
  const [messages, setMessages] = useState<WhatsAppHubMessage[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [body, setBody] = useState(initialMessage);
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
    if (!body.trim() || !targetPhone) return;
    setSending(true);
    try {
      const response = await fetch('/api/whatsapp-hub/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: targetPhone,
          body,
          clientId: selectedClientId || undefined,
          metadata: { clientId: client?.id }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send WhatsApp message');
      setSelectedClientId(data.selectedClientId || selectedClientId);
      if (client) addLog(client.id, `WhatsApp Hub message sent: ${body.slice(0, 120)}`, undefined, 'whatsapp', data);
      setBody('');
      notify('WhatsApp message queued.', 'success');
      await loadData();
    } catch (error: any) {
      notify(error.message || 'Failed to send WhatsApp message.', 'error');
    } finally {
      setSending(false);
    }
  };

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
                <div>{message.body}</div>
                <div className="text-[10px] opacity-70 mt-1">
                  {message.client_id} · {new Date(message.created_at || message.received_at || Date.now()).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 flex gap-3">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Type a WhatsApp message..."
            className="flex-1 min-h-16 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none resize-none focus:border-green-500"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !body.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold text-white flex items-center gap-2 self-end"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
