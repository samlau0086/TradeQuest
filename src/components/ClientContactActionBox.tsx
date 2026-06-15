import React, { useState } from 'react';
import { Loader2, Mail, Send, Sparkles } from 'lucide-react';
import { useAuthStore } from '../authStore';
import { Client, ContactMethod, useStore } from '../store';
import { getCustomerOutputLanguage } from '../lib/language';
import { WhatsAppChatModal } from './WhatsAppChatModal';

const INBOX_OPEN_REQUEST_KEY = 'tradequest:inbox-open-request:v1';

const requestInboxOpen = (payload: any) => {
  localStorage.setItem(INBOX_OPEN_REQUEST_KEY, JSON.stringify({ ...payload, requestedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('tradequest:open-inbox-request'));
};

interface ClientContactActionBoxProps {
  method: ContactMethod;
  client: Client;
  onClose: () => void;
  onOpenEmailCompose?: (email: string) => void;
}

export function ClientContactActionBox({ method, client, onClose, onOpenEmailCompose }: ClientContactActionBoxProps) {
  const [purpose, setPurpose] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPurpose, setLoadingPurpose] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const { addLog, logs, emails, outboxConfigs, addEmail, llmConfigs, activeLLMId, llmMappings, language, setView, selectEmail, selectClient, selectDeal, notify, incrementAgentHubTaskCount } = useStore();
  const [selectedOutboxId] = useState<string>(outboxConfigs?.[0]?.id || '');

  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(l => l.id === id) || null;
  };

  const latestCustomerEmail = emails
    .filter(e => e.clientId === client.id && (e.type === 'inbox' || e.type === 'inbound'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const outboundLanguage = getCustomerOutputLanguage({
    lastCommunicationText: latestCustomerEmail?.body,
    preferredLanguage: client.preferredLanguage,
    country: client.country,
  });

  if (method.type === 'whatsapp') {
    return (
      <div onClick={event => event.stopPropagation()}>
        <WhatsAppChatModal
          client={client}
          phone={method.value}
          onClose={onClose}
          onOpenInInbox={() => {
            requestInboxOpen({ type: 'whatsapp', phone: method.value, clientId: client.id });
            onClose();
            selectDeal(null);
            selectClient(null);
            setView('inbox');
          }}
        />
      </div>
    );
  }

  const generatePurpose = async () => {
    setLoadingPurpose(true);
    const clientLogs = logs.filter(l => l.clientId === client.id).map(l => `[${new Date(l.date).toLocaleDateString()}] ${l.content}`);
    const clientEmails = emails.filter(e => e.clientId === client.id).map(e => `[${e.type} - ${new Date(e.date).toLocaleDateString()}] ${e.subject}\n${e.body}`);

    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          command: `Suggest a single, short sentence internal purpose for follow-up with this lead based on communication history. Output language: ${language === 'zh' ? 'Chinese' : 'English'}.`,
          context: {
            clientLogs: clientLogs.join('\n'),
            recentEmails: clientEmails.join('\n\n'),
            userLanguagePreference: language === 'zh' ? 'Chinese' : 'English'
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
      if (data.result) incrementAgentHubTaskCount('follow_up_agent');
      setPurpose(data.result.replace(/["']/g, '').trim());
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingPurpose(false);
    }
  };

  const generateDraft = async () => {
    if (!purpose.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          command: `Draft a very short professional outbound message to the client on ${method.type}. Purpose: ${purpose}. Customer-facing output language: ${outboundLanguage}. This language was resolved by priority: last customer communication language > client preferred language > official country/region language > English. Return only the customer-facing draft.`,
          context: { client, outboundLanguage, clientPreferredLanguage: client.preferredLanguage || null },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
      if (data.result) incrementAgentHubTaskCount(method.type === 'whatsapp' ? 'whatsapp_draft_agent' : method.type === 'email' ? 'email_draft_agent' : 'follow_up_agent');
      setDraft(data.result);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    const text = draft || purpose;
    if (method.type === 'email') {
      const selectedOutbox = outboxConfigs.find(c => c.id === selectedOutboxId);
      const senderEmail = selectedOutbox ? selectedOutbox.fromEmail : 'me@soho.com';
      const senderName = selectedOutbox ? selectedOutbox.fromName : 'Me';

      const newEmailId = addEmail({
        recipient: method.value,
        sender: senderEmail,
        senderName: senderName,
        subject: purpose || 'Follow up',
        body: text,
        read: true,
        type: 'sent',
        clientId: client.id,
      });
      addLog(client.id, `Sent Email via app: ${purpose || 'Follow up'}`, newEmailId);
      notify('Email sent successfully.', 'success');
    } else if (method.type === 'wechat') {
      navigator.clipboard.writeText(text);
      notify('Text copied to clipboard. Please paste it in WeChat.', 'success');
    } else {
      navigator.clipboard.writeText(text);
    }
    addLog(client.id, `Follow-up via ${method.type}: ${purpose}`);
    onClose();
  };

  return (
    <div className="mt-2 p-3 bg-slate-900 border border-slate-700/50 rounded-lg space-y-3 cursor-default" onClick={event => event.stopPropagation()}>
      {method.type === 'email' && (
        <div className="flex items-center gap-4 border-b border-slate-800 pb-2 mb-3">
          <button
            onClick={() => setActiveTab('compose')}
            className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'compose' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1 -mb-[9px]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Compose
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'history' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1 -mb-[9px]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            History
          </button>
        </div>
      )}

      {method.type === 'email' && activeTab === 'compose' && (
        <div className="flex flex-col items-center justify-center py-6 px-4">
          <Mail className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-xs text-slate-400 mb-4 text-center">Use the full email editor to compose and send messages.</p>
          <button
            onClick={() => {
              if (onOpenEmailCompose) {
                onOpenEmailCompose(method.value);
              }
            }}
            className="px-4 py-2 bg-cyan-600 text-white rounded text-xs font-medium hover:bg-cyan-500 transition-colors flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Open Compose Modal
          </button>
        </div>
      )}

      {method.type !== 'email' && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-500 uppercase font-bold">Follow-up Purpose</label>
              <button onClick={generatePurpose} disabled={loadingPurpose} className="text-[10px] flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50">
                {loadingPurpose ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                Auto-detect
              </button>
            </div>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={purpose}
                onChange={event => setPurpose(event.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-500 outline-none"
                placeholder="e.g. following up on the sample"
              />
              <button onClick={generateDraft} disabled={loading || !purpose.trim()} className="bg-cyan-900/40 text-cyan-400 px-2 rounded text-xs font-medium hover:bg-cyan-900 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1">
                {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                AI
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold">Message Draft</label>
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 mt-1 h-16 focus:border-cyan-500 outline-none resize-none scrollbar-thin"
              placeholder={purpose ? "Generated draft will appear here..." : "Select AI or type here..."}
            />
          </div>

          <div className="flex justify-end gap-2 mt-2 border-b border-slate-700/50 pb-4">
            <button onClick={onClose} className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button onClick={handleAction} className="px-3 py-1 bg-cyan-600 text-white rounded text-xs font-medium hover:bg-cyan-500 flex items-center gap-1 transition-colors">
              <Send className="w-3 h-3"/>
              {method.type === 'wechat' ? 'Copy for WeChat' : 'Copy Text'}
            </button>
          </div>
        </>
      )}

      {method.type === 'email' && activeTab === 'history' && (
        <div className="mt-2 space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[9px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
            {emails.filter(e => e.clientId === client.id).length === 0 ? (
              <p className="text-xs text-slate-500 italic pl-6 relative">No email history yet.</p>
            ) : (
              emails.filter(e => e.clientId === client.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(email => (
                <div key={email.id} className="relative flex items-start pl-6 group">
                  <div className={`absolute left-[5px] top-1 flex items-center justify-center w-2.5 h-2.5 rounded-full border-2 ${email.type === 'draft' ? 'border-amber-500/30 bg-amber-500' : email.type === 'sent' ? 'border-cyan-500/30 bg-cyan-500' : 'border-indigo-500/30 bg-indigo-500'}`}></div>
                  <div
                    onClick={() => {
                      selectEmail(email.id);
                      selectDeal(null);
                      selectClient(null);
                      setView('inbox');
                      onClose();
                    }}
                    className="flex flex-col gap-1.5 w-full bg-slate-800/30 p-2.5 rounded-lg border border-slate-700/30 group-hover:border-slate-700/60 transition-colors cursor-pointer hover:bg-slate-800/50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] font-medium text-slate-300 truncate">
                        {email.type === 'draft' ? `Draft: ${email.recipient || 'No recipient'}` : email.type === 'sent' ? `To: ${email.recipient}` : `From: ${email.sender}`}
                      </span>
                      <time className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                        {new Date(email.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    <p className="text-xs text-slate-200 font-medium truncate">
                      {email.subject}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed max-h-12 overflow-hidden text-ellipsis line-clamp-2">
                      {email.body.replace(/<[^>]*>?/gm, '')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
