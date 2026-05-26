import React, { useEffect, useState } from 'react';
import { CalendarClock, Loader2, MessageCircle, RefreshCw, Search, Send, Tag } from 'lucide-react';
import { useStore } from '../store';
import { WhatsAppChatModal } from './WhatsAppChatModal';

interface HubClient {
  id: string;
  name: string;
  phone?: string;
  status: string;
  quota?: { sentToday: number; dailyQuota: number; remaining: number; replyRate: number };
}

interface HubConversation {
  id: string;
  targetPhone: string;
  clientId?: string;
  clientName?: string;
  clientCompany?: string;
  tags: string[];
  comments: any[];
  lastMessageAt?: string;
  lastBody?: string;
  lastDirection?: 'inbound' | 'outbound';
  lastHubClientId?: string;
}

interface ScheduledWhatsAppMessage {
  id: string;
  to: string;
  body: string;
  hubClientId?: string;
  scheduledAt: string;
  status: string;
  attempts: number;
  lastError?: string;
}

export function WhatsAppHub() {
  const { clients, notify } = useStore();
  const [hubClients, setHubClients] = useState<HubClient[]>([]);
  const [conversations, setConversations] = useState<HubConversation[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledWhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [chatPhone, setChatPhone] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, conversationsRes, scheduledRes] = await Promise.all([
        fetch('/api/whatsapp-hub/clients', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`/api/whatsapp-hub/conversations?search=${encodeURIComponent(search)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/whatsapp-hub/scheduled', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const clientsData = await clientsRes.json();
      const conversationsData = await conversationsRes.json();
      const scheduledData = await scheduledRes.json();
      if (!clientsRes.ok) throw new Error(clientsData.error || 'Failed to load WhatsApp clients');
      if (!conversationsRes.ok) throw new Error(conversationsData.error || 'Failed to load WhatsApp conversations');
      if (!scheduledRes.ok) throw new Error(scheduledData.error || 'Failed to load scheduled WhatsApp messages');
      setHubClients(clientsData.clients || []);
      setConversations(conversationsData.conversations || []);
      setScheduledMessages(scheduledData.messages || []);
    } catch (error: any) {
      notify(error.message || 'WhatsApp Actor Hub is not configured.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(loadData, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const matchClient = (phone: string) => clients.find(client => client.contactMethods?.some(method => (
    ['whatsapp', 'phone'].includes(method.type) && method.value.replace(/[^0-9]/g, '').endsWith(phone.slice(-8))
  )));

  const activeConversation = conversations.find(conversation => conversation.targetPhone === chatPhone);

  const pendingScheduled = scheduledMessages.filter(message => message.status === 'pending').slice(0, 5);

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
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations, tags, clients..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none text-slate-200 placeholder:text-slate-600"
            />
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
        {pendingScheduled.length > 0 && (
          <div className="p-3 border-b border-slate-800">
            <div className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-2">
              <CalendarClock className="w-3 h-3 text-amber-400" />
              Scheduled
            </div>
            <div className="space-y-2">
              {pendingScheduled.map(message => (
                <button key={message.id} onClick={() => setChatPhone(message.to)} className="w-full text-left bg-slate-950 border border-slate-800 rounded-lg p-3 hover:border-amber-500/50">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-200 truncate">{matchClient(message.to)?.name || message.to}</span>
                    <span className="text-amber-400 shrink-0">{new Date(message.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-1">{message.body || 'Media message'}</div>
                  {message.lastError && (
                    <div className="text-[10px] text-rose-400 truncate mt-1">Waiting: {message.lastError}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="overflow-y-auto min-h-0">
          {conversations.map((conversation) => {
            const phone = conversation.targetPhone;
            const client = conversation.clientId ? clients.find(c => c.id === conversation.clientId) : matchClient(phone);
            return (
              <button key={conversation.id} onClick={() => setChatPhone(phone)} className="w-full text-left p-4 border-b border-slate-800 hover:bg-slate-800/60">
                <div className="font-bold text-sm truncate">{client?.name || conversation.clientName || phone}</div>
                <div className="text-xs text-slate-500 truncate mt-1">{conversation.lastBody || 'Media message'}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(conversation.tags || []).slice(0, 3).map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300">
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-600 mt-1">{conversation.lastHubClientId || 'local'} {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString() : ''}</div>
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
          client={(activeConversation?.clientId ? clients.find(c => c.id === activeConversation.clientId) : matchClient(chatPhone)) || null}
          conversation={activeConversation || null}
          onClose={() => {
            setChatPhone('');
            loadData();
          }}
        />
      )}
    </div>
  );
}
