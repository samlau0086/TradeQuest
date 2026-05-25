import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { useStore } from '../store';
import { WhatsAppChatModal } from './WhatsAppChatModal';

interface HubClient {
  id: string;
  name: string;
  phone?: string;
  status: string;
  quota?: { sentToday: number; dailyQuota: number; remaining: number; replyRate: number };
}

interface HubMessage {
  id: string;
  client_id: string;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient: string;
  body: string;
  created_at: string;
  received_at?: string;
}

const phoneFromMessage = (message: HubMessage) => (
  message.direction === 'inbound' ? message.sender : message.recipient
).replace('@c.us', '').replace(/[^0-9]/g, '');

export function WhatsAppHub() {
  const { clients, notify } = useStore();
  const [hubClients, setHubClients] = useState<HubClient[]>([]);
  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [chatPhone, setChatPhone] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, messagesRes] = await Promise.all([
        fetch('/api/whatsapp-hub/clients', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/whatsapp-hub/messages?limit=500', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const clientsData = await clientsRes.json();
      const messagesData = await messagesRes.json();
      if (!clientsRes.ok) throw new Error(clientsData.error || 'Failed to load WhatsApp clients');
      if (!messagesRes.ok) throw new Error(messagesData.error || 'Failed to load WhatsApp messages');
      setHubClients(clientsData.clients || []);
      setMessages(messagesData.messages || []);
    } catch (error: any) {
      notify(error.message || 'WhatsApp Actor Hub is not configured.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const conversations = useMemo(() => {
    const map = new Map<string, HubMessage>();
    for (const message of messages) {
      const phone = phoneFromMessage(message);
      if (!phone) continue;
      const existing = map.get(phone);
      if (!existing || new Date(message.created_at || message.received_at).getTime() > new Date(existing.created_at || existing.received_at).getTime()) {
        map.set(phone, message);
      }
    }
    return Array.from(map.entries()).sort((a, b) => (
      new Date(b[1].created_at || b[1].received_at).getTime() - new Date(a[1].created_at || a[1].received_at).getTime()
    ));
  }, [messages]);

  const matchClient = (phone: string) => clients.find(client => client.contactMethods?.some(method => (
    ['whatsapp', 'phone'].includes(method.type) && method.value.replace(/[^0-9]/g, '').endsWith(phone.slice(-8))
  )));

  return (
    <div className="flex-1 overflow-hidden bg-slate-900 border-t border-slate-800 text-white grid grid-cols-[320px_1fr]">
      <aside className="border-r border-slate-800 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-400" />
              WhatsApp Hub
            </h1>
            <button onClick={loadData} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={manualPhone}
              onChange={e => setManualPhone(e.target.value)}
              placeholder="Add phone..."
              className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => setChatPhone(manualPhone.replace(/[^0-9]/g, ''))}
              className="px-3 bg-green-600 hover:bg-green-500 rounded-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-3 border-b border-slate-800">
          <div className="text-xs font-bold uppercase text-slate-500 mb-2">Actor Clients</div>
          <div className="space-y-2">
            {hubClients.map(client => (
              <div key={client.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="flex justify-between gap-2">
                  <span className="font-bold text-sm truncate">{client.name || client.id}</span>
                  <span className={`text-[10px] font-bold ${client.status === 'online' ? 'text-green-400' : 'text-slate-500'}`}>{client.status}</span>
                </div>
                {client.quota && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    quota {client.quota.remaining}/{client.quota.dailyQuota} · reply {(client.quota.replyRate * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto min-h-0">
          {conversations.map(([phone, message]) => {
            const client = matchClient(phone);
            return (
              <button key={phone} onClick={() => setChatPhone(phone)} className="w-full text-left p-4 border-b border-slate-800 hover:bg-slate-800/60">
                <div className="font-bold text-sm truncate">{client?.name || phone}</div>
                <div className="text-xs text-slate-500 truncate mt-1">{message.body}</div>
                <div className="text-[10px] text-slate-600 mt-1">{message.client_id}</div>
              </button>
            );
          })}
        </div>
      </aside>
      <main className="min-h-0 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-700" />
          Select a conversation or add a phone number to start.
        </div>
      </main>
      {chatPhone && (
        <WhatsAppChatModal
          phone={chatPhone}
          client={matchClient(chatPhone) || null}
          onClose={() => {
            setChatPhone('');
            loadData();
          }}
        />
      )}
    </div>
  );
}
