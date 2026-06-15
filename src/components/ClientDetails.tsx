import React, { useEffect, useRef, useState } from 'react';
import { useStore, ClientStatus, Client, ContactMethod, Comment } from '../store';
import { useAuthStore } from '../authStore';
import { X, Flame, Sparkles, Send, Loader2, Workflow, Mail, Edit, Trash2, Paperclip, MessageSquare, Settings, ArrowLeft, Building2, MapPin, BadgeDollarSign, Tag, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { ClientFormModal } from './ClientFormModal';

import { User } from 'lucide-react';

import { CommentItem } from './CommentItem';
import { ClientAiRadarCard } from './ClientAiRadarCard';
import { ClientContactsWidget } from './ClientContactsWidget';
import { ClientEmailComposeOverlay } from './ClientEmailComposeOverlay';
import { ClientEventPanel } from './ClientEventPanel';
import { ClientQuotesWidget } from './ClientQuotesWidget';
import { ClientWorkroomPanel } from './ClientWorkroomPanel';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';
import { WorkflowConfigModal } from './WorkflowConfigModal';
import { LocalTime } from './LocalTime';
import { WhatsAppChatModal } from './WhatsAppChatModal';
import { getCustomerOutputLanguage } from '../lib/language';
import { buildLeadScoringSignature } from '../lib/leadScoring';

const INBOX_OPEN_REQUEST_KEY = 'tradequest:inbox-open-request:v1';

const requestInboxOpen = (payload: any) => {
  localStorage.setItem(INBOX_OPEN_REQUEST_KEY, JSON.stringify({ ...payload, requestedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('tradequest:open-inbox-request'));
};

const shortText = (value: string | undefined | null, max = 120) => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const hasCjkText = (value: string | undefined | null) => /[\u3400-\u9fff]/.test(value || '');

const internalTextMatchesSystemLanguage = (value: string | undefined | null, language: string) => {
  const text = String(value || '').trim();
  if (!text) return true;
  return language === 'zh' ? hasCjkText(text) : !hasCjkText(text);
};

function ContactActionBox({ method, client, onClose, onOpenEmailCompose }: { method: ContactMethod, client: Client, onClose: () => void, onOpenEmailCompose?: (email: string) => void }) {
  const [purpose, setPurpose] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPurpose, setLoadingPurpose] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const { addLog, logs, emails, userTitle, outboxConfigs, addEmail, llmConfigs, activeLLMId, llmMappings, language, setView, selectEmail, selectClient, selectDeal, notify, incrementAgentHubTaskCount } = useStore();
  const [selectedOutboxId, setSelectedOutboxId] = useState<string>(outboxConfigs?.[0]?.id || '');

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
      <div onClick={e => e.stopPropagation()}>
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
      // WeChat doesn't have a reliable web url scheme that takes pre-filled text like WhatsApp
      notify('Text copied to clipboard. Please paste it in WeChat.', 'success');
    } else {
      navigator.clipboard.writeText(text);
    }
    addLog(client.id, `Follow-up via ${method.type}: ${purpose}`);
    onClose();
  };

  return (
    <div className="mt-2 p-3 bg-slate-900 border border-slate-700/50 rounded-lg space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
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
                 onChange={e => setPurpose(e.target.value)}
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
               onChange={e => setDraft(e.target.value)}
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

function AgentSettingsModal({ client, onClose }: { client: Client, onClose: () => void }) {
  const { editClient, agentWorkflows, addQuest, emails } = useStore();
  const [enabled, setEnabled] = useState(client.agentEnabled || false);
  const [mode, setMode] = useState<'manual'|'auto_email'>(client.agentMode || 'manual');
  const [context, setContext] = useState(client.agentContext || '');
  const [workflowId, setWorkflowId] = useState(client.agentWorkflowId || agentWorkflows[0]?.id || '');
  const [showWfManager, setShowWfManager] = useState(false);

  const selectedWf = agentWorkflows.find(wf => wf.id === workflowId);

  const hasNonEmailSteps = selectedWf?.steps.some(s => s.type !== 'email');

  const handleSave = () => {
    editClient(client.id, {
      agentEnabled: enabled,
      agentMode: mode,
      agentContext: context,
      agentWorkflowId: workflowId
    });
    
    // Auto-schedule non-email steps if enabled and auto email mode
    if (enabled && mode === 'auto_email' && selectedWf && hasNonEmailSteps) {
        const latestCustomerEmail = emails
          .filter(e => e.clientId === client.id && (e.type === 'inbox' || e.type === 'inbound'))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const customerLanguage = getCustomerOutputLanguage({
          lastCommunicationText: latestCustomerEmail?.body,
          preferredLanguage: client.preferredLanguage,
          country: client.country,
        });
        selectedWf.steps.filter(s => s.type !== 'email').forEach((step, idx) => {
         const languageInstruction = `Language: Write customer-facing outbound content in ${customerLanguage}. This was resolved by priority: last customer communication language > client preferred language > official country/region language > English.`;
         
         addQuest({
            title: `[Agent] Follow up via ${step.type} (${client.name})`,
            description: `Agent drafted instructions based on communication habits:\n\n"${step.templatePrompt}\n\n${languageInstruction}"\n\nPlease manually draft and send via ${step.type}. Draft will open when you execute this task.`,
            expReward: 15
         });
       });
    }
    
    onClose();
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-indigo-900/50 p-6 rounded-xl shadow-2xl max-w-md w-full relative max-h-[90vh] flex flex-col">
        <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> AI Agent Setup
        </h3>
        
        <div className="space-y-4 overflow-y-auto min-h-0 pr-2 pb-4 flex-1">
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div>
              <div className="text-sm font-bold text-white">Enable Auto Agent</div>
              <div className="text-xs text-slate-400">Allow AI to analyze and follow up.</div>
            </div>
            <button 
              onClick={() => setEnabled(!enabled)}
              className={cn("w-10 h-5 rounded-full relative transition-colors", enabled ? "bg-indigo-600" : "bg-slate-700")}
            >
              <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform", enabled ? "translate-x-5" : "translate-x-1")} />
            </button>
          </div>

          <div className={cn("space-y-4 transition-opacity", !enabled && "opacity-50 pointer-events-none")}>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Follow-up Mode</label>
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="manual">Prompt Only (Suggest next step)</option>
                <option value="auto_email">Auto Execute (Auto email + Manual Tasks)</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase">Workflow Preset</label>
                <button onClick={() => setShowWfManager(true)} className="text-xs text-indigo-400 hover:text-indigo-300">
                  Manage Workflows
                </button>
              </div>
              <select 
                value={workflowId} 
                onChange={(e) => setWorkflowId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                {agentWorkflows.map(wf => (
                  <option key={wf.id} value={wf.id}>{wf.name}</option>
                ))}
              </select>
              
              {selectedWf && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mt-2 space-y-2">
                   <div className="text-xs font-bold text-indigo-300 mb-1">Preview Follow-up Plan</div>
                   {selectedWf.steps.map((s, idx) => (
                      <div key={idx} className="flex gap-2 text-xs">
                         <span className="text-slate-500 font-mono w-12 shrink-0">Day {s.delayDays}</span>
                         <span className={cn("px-1.5 py-0.5 rounded uppercase font-bold text-[9px]", s.type === 'email' ? "bg-blue-900/40 text-blue-400" : "bg-orange-900/40 text-orange-400")}>{s.type}</span>
                         <span className="text-slate-300 truncate">{s.templatePrompt}</span>
                      </div>
                   ))}
                </div>
              )}
              
              {mode === 'auto_email' && hasNonEmailSteps && (
                <div className="p-3 bg-orange-900/30 border border-orange-900/50 rounded-lg text-xs leading-relaxed text-orange-200 mt-2">
                  <span className="font-bold">Note:</span> WhatsApp workflow steps can be sent automatically through WhatsApp Actor Hub when the client has a WhatsApp/phone contact and Hub is configured. Call/Other steps still generate task reminders.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Agent Instructions / Context</label>
              <textarea 
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. This client is very price-sensitive. Focus on ROI and value. Do not offer discounts upfront."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 min-h-[100px] resize-none scrollbar-thin"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow font-medium transition-colors text-sm">Save Configuration</button>
        </div>
      </div>
    </div>
    {showWfManager && <WorkflowConfigModal clientId={client.id} onClose={() => setShowWfManager(false)} />}
    </>
  );
}

export function ClientDetails() {
  const { clients, deals, quotes, selectedClientId, selectedDealId, selectClient, selectDeal, updateClientStatus, updateDeal, deleteClient, editClient, addComment, addReply, deleteLog, llmConfigs, activeLLMId, llmMappings, setView, selectEmail, logs, emails, incrementAgentHubTaskCount, notify, language, currencyRates, knowledgeBase, agentTasks, liveChatSessions } = useStore();
  
  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(c => c.id === id) || llmConfigs[0];
  };

  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<{
    sentiment: string;
    temperature: number;
    icebreaker: string;
    summary: string;
    leadScore?: number;
    leadSummary?: string;
    leadNextStep?: string;
    nextStep?: string;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [expandedContactIdx, setExpandedContactIdx] = useState<string | null>(null);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeInitialBody, setComposeInitialBody] = useState('');

  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reconciledPendingCommentDeletesRef = useRef<Set<string>>(new Set());

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(false);
  const [eventView, setEventView] = useState<'timeline' | 'list' | 'growth'>('timeline');
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [eventListExpanded, setEventListExpanded] = useState(false);
  const [growthLogsExpanded, setGrowthLogsExpanded] = useState(false);

  // Agent State
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);

  const client = clients.find(c => c.id === selectedClientId);
  const selectedDeal = selectedDealId
    ? deals.find(deal => deal.id === selectedDealId && (!selectedClientId || deal.clientId === selectedClientId))
    : undefined;
  const leadRecord = selectedDeal || null;
  const leadComments = leadRecord ? (leadRecord.comments || []) : (client?.comments || []);
  const leadLogs = logs.filter(log => {
    if (!client || log.clientId !== client.id) return false;
    if (!leadRecord) return true;
    return log.metadata?.leadId === leadRecord.id || log.metadata?.dealId === leadRecord.id;
  });
  const sortedLeadLogs = [...leadLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const growthLogs = leadLogs.filter(l => {
    if (l.content.startsWith('Saved Draft:')) return false;
    if (l.relatedEmailId) {
      const relatedEmail = emails.find(e => e.id === l.relatedEmailId);
      if (relatedEmail && relatedEmail.type === 'draft') return false;
    }
    return true;
  });
  const visibleTimelineLogs = timelineExpanded ? sortedLeadLogs : sortedLeadLogs.slice(0, 10);
  const visibleEventListLogs = eventListExpanded ? sortedLeadLogs : sortedLeadLogs.slice(0, 20);
  const visibleGrowthLogs = growthLogsExpanded ? growthLogs : growthLogs.slice(0, 10);
  const leadScore = leadRecord ? leadRecord.leadScore : client?.leadScore;
  const relatedQuotes = client
    ? quotes.filter(quote => leadRecord ? quote.leadId === leadRecord.id : quote.clientId === client.id)
    : [];
  const openQuote = (quoteId: string) => {
    localStorage.setItem('tradequest:openQuoteId', quoteId);
    selectDeal(null);
    selectClient(null);
    setView('quotes');
  };
  const openEmailInInbox = (emailId: string | null | undefined) => {
    selectEmail(emailId || null);
    selectDeal(null);
    selectClient(null);
    setView('inbox');
  };
  const summaryText = leadRecord
    ? leadRecord.leadSummary
    : (client?.agentSummary || client?.leadSummary);
  const nextStepText = leadRecord
    ? leadRecord.leadNextStep
    : (client?.agentNextStep || client?.leadNextStep);

  useEffect(() => {
    if (!client) return;
    const pendingIds = collectPendingDeleteCommentIds(leadComments);
    pendingIds.forEach(commentId => {
      const key = `${leadRecord ? 'lead' : 'client'}:${leadRecord?.id || client.id}:${commentId}`;
      if (reconciledPendingCommentDeletesRef.current.has(key)) return;
      reconciledPendingCommentDeletesRef.current.add(key);
      submitCommentDeleteApprovalRequest(commentId).catch(error => {
        console.warn('Failed to reconcile pending comment delete request', error);
      });
    });
  }, [client?.id, leadRecord?.id, leadComments]);

  if (!client) return null;
  const displayContacts = (client.contacts && client.contacts.length > 0)
    ? client.contacts
    : [{
        id: client.primaryContactId || 'primary',
        name: client.name,
        title: 'Key Contact',
        avatarUrl: undefined,
        isPrimary: true,
        contactMethods: client.contactMethods || []
      }];
  const clientSummaryText = client.agentSummary || client.leadSummary || client.agentContext || '';
  const clientNextStepText = client.agentNextStep || client.leadNextStep || '';
  const leadSummaryText = leadRecord?.leadSummary || '';
  const leadNextStepText = leadRecord?.leadNextStep || '';
  const relatedEmails = emails
    .filter(email => email.clientId === client.id && !email.pendingDelete)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const pendingFollowUps = relatedEmails
    .filter(email => email.todoAt)
    .sort((a, b) => new Date(a.todoAt || a.date).getTime() - new Date(b.todoAt || b.date).getTime());
  const relatedAgentTasks = agentTasks
    .filter(task => {
      if (!['open', 'queued', 'approval_required', 'running'].includes(task.status)) return false;
      if (task.entityType === 'client' && task.entityId === client.id) return true;
      if (leadRecord && task.entityType === 'lead' && task.entityId === leadRecord.id) return true;
      return task.affectedRecords?.some(record => (
        (record.type === 'client' && record.id === client.id) ||
        (leadRecord && record.type === 'lead' && record.id === leadRecord.id)
      ));
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  const clientKnowledge = knowledgeBase
    .filter(item => item.clientId === client.id && item.importState !== 'deleted')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  const clientLiveChatSessions = liveChatSessions
    .filter(session => session.clientId === client.id)
    .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime());
  const channelHighlights = [
    ...relatedEmails.slice(0, 6).map(email => ({
      id: `email_${email.id}`,
      channel: email.type === 'sent' || email.type === 'outbound' ? 'Email sent' : email.type === 'draft' ? 'Email draft' : 'Email inbox',
      title: email.subject || '(No subject)',
      body: shortText(email.body, 110),
      date: email.date,
      action: () => openEmailInInbox(email.id)
    })),
    ...sortedLeadLogs.slice(0, 6).map(log => ({
      id: `log_${log.id}`,
      channel: log.type === 'whatsapp' ? 'WhatsApp' : log.type === 'email' ? 'Email activity' : 'CRM event',
      title: log.content,
      body: '',
      date: log.date,
      action: log.relatedEmailId ? () => openEmailInInbox(log.relatedEmailId) : undefined
    })),
    ...clientLiveChatSessions.slice(0, 4).map(session => ({
      id: `live_${session.id}`,
      channel: 'Live Chat',
      title: session.lastMessage?.body || session.visitorName || session.visitorEmail || 'Live chat session',
      body: session.pageUrl || '',
      date: session.lastMessageAt || session.updatedAt || session.createdAt,
      action: () => setView('live-chat')
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  const primaryNextStep = leadNextStepText || clientNextStepText || '检查最近互动、确认采购背景，然后选择下一步跟进动作。';
  const primarySummary = leadSummaryText || clientSummaryText || '暂未生成AI摘要，可运行AI Radar或等待Signal Scanner分析此客户/Lead。';
  const contactMethodCount = displayContacts.reduce((sum, contact) => sum + (contact.contactMethods || []).length, 0);
  const workroomTodoItems = [
    ...pendingFollowUps.slice(0, 3).map(email => ({
      id: `todo_${email.id}`,
      label: email.todoNote || email.subject || '待跟进邮件',
      meta: email.todoAt ? new Date(email.todoAt).toLocaleString() : '未设置时间',
      onClick: () => openEmailInInbox(email.id)
    })),
    ...relatedAgentTasks.slice(0, 3).map(task => ({
      id: `task_${task.id}`,
      label: task.title,
      meta: `${task.status} · ${task.risk}`,
      onClick: () => setView('agent-hub')
    }))
  ].slice(0, 4);
  const buildCurrentAnalysisSignature = () => `${buildLeadScoringSignature(client, leadRecord ? leadLogs : logs, emails, {
    lead: leadRecord || deals
      .filter(deal => deal.clientId === client.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null,
    workflows: useStore.getState().agentWorkflows,
    now: new Date()
  })}:lang:${language}`;
  const existingAnalysisResult = () => {
    const score = leadRecord ? leadRecord.leadScore : client.leadScore;
    const summary = leadRecord ? leadRecord.leadSummary : (client.agentSummary || client.leadSummary);
    const nextStep = leadRecord ? leadRecord.leadNextStep : (client.agentNextStep || client.leadNextStep);
    const icebreaker = leadRecord ? leadRecord.leadIcebreaker : client.leadIcebreaker;
    if (score === undefined || !summary || !nextStep) return null;
    if (!internalTextMatchesSystemLanguage(summary, language) || !internalTextMatchesSystemLanguage(nextStep, language)) return null;
    return {
      sentiment: Number(score) >= 70 ? 'HOT' : Number(score) >= 35 ? 'WARM' : 'COLD',
      temperature: Number(score) || 0,
      icebreaker: icebreaker || '',
      summary,
      leadScore: Number(score) || 0,
      leadSummary: summary,
      leadNextStep: nextStep
    };
  };

  const findPreferredContactValue = (types: ContactMethod['type'][]) => {
    const methods = [
      ...(client.contactMethods || []),
      ...displayContacts.flatMap(contact => contact.contactMethods || [])
    ];
    return methods.find(method => types.includes(method.type) && method.value)?.value || '';
  };

  const handleInsertIcebreaker = async () => {
    const icebreaker = String((aiData || existingAnalysisResult())?.icebreaker || '').trim();
    if (!icebreaker) {
      notify(language === 'zh' ? '暂无可插入的破冰话术。' : 'No icebreaker is available to insert.', 'warning');
      return;
    }
    const email = findPreferredContactValue(['email']);
    if (email) {
      setComposeRecipient(email);
      setComposeInitialBody(icebreaker);
      setShowEmailCompose(true);
      notify(language === 'zh' ? '已插入到邮件草稿。' : 'Inserted into an email draft.', 'success');
      return;
    }
    await navigator.clipboard.writeText(icebreaker).catch(() => undefined);
    notify(
      findPreferredContactValue(['whatsapp', 'phone'])
        ? (language === 'zh' ? '客户没有邮箱，已复制话术，可粘贴到 WhatsApp。' : 'No email found. Copied the icebreaker for WhatsApp.')
        : (language === 'zh' ? '未找到可用联系方式，已复制话术。' : 'No usable contact found. Copied the icebreaker.'),
      'info'
    );
  };

  const openEmailComposeInInbox = () => {
    requestInboxOpen({
      type: 'composeEmail',
      recipient: composeRecipient,
      subject: leadRecord ? `Follow up: ${leadRecord.name}` : `Follow up from ${client.company || client.name}`,
      initialBody: composeInitialBody
    });
    setShowEmailCompose(false);
    setComposeInitialBody('');
    selectDeal(null);
    selectClient(null);
    setView('inbox');
  };

  const closeDetails = () => {
    selectDeal(null);
    selectClient(null);
  };

  const handleRunAgent = async () => {
    if (!client.agentEnabled) return;
    setAgentLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/run-agent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          llmConfig: getLLMConfig('analysis'),
          systemLanguage: useStore.getState().language === 'zh' ? 'Chinese' : 'English',
        })
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically update local store or refetch clients
        useAuthStore.getState().fetchProfile(); // Not the best way to refetch clients, but no dedicated fetchClients exists in store. Let's just rely on global update if any, or reload. We should ideally update the local client object in the store.
        useStore.getState().editClient(client.id, { 
          agentSummary: data.summary, 
          agentNextStep: data.nextStep 
        });
      }
    } catch(err) {
      console.error(err);
    } finally {
      setAgentLoading(false);
    }
  };

  const handleAnalyze = async (forceRefresh = false) => {
    const signature = buildCurrentAnalysisSignature();
    const existingResult = existingAnalysisResult();
    const previousSignature = leadRecord ? leadRecord.leadScoringSignature : client.leadScoringSignature;
    if (!forceRefresh && existingResult && previousSignature === signature) {
      setAiData(existingResult);
      notify(
        language === 'zh'
          ? '客户/Lead 信息没有变化，已复用上次 AI 分析结果。'
          : 'No client/lead changes detected. Reused the previous AI analysis.',
        'info'
      );
      return;
    }
    setLoading(true);
    const clientLogs = leadLogs
      .slice(0, 20)
      .map(log => ({ date: log.date, type: log.type, content: log.content }));
    const clientEmails = emails
      .filter(email => email.clientId === client.id)
      .slice(0, 10)
      .map(email => ({ date: email.date, type: email.type, subject: email.subject, body: email.body?.slice(0, 800) }));
    try {
      const res = await fetch('/api/chat/icebreaker', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          client, 
          lead: leadRecord,
          logs: clientLogs,
          emails: clientEmails,
          llmConfig: getLLMConfig('analysis'),
          embeddingLlmConfig: getLLMConfig('embedding'),
          systemLanguage: useStore.getState().language === 'zh' ? 'Chinese' : 'English',
        })
      });
      const data = await res.json();
      const score = Number(data.leadScore ?? data.temperature ?? 0);
      const fallbackSummary = [
        leadRecord?.name || client.company || client.name,
        client.country,
        leadRecord?.status || client.status,
        client.tags?.length ? `Tags: ${client.tags.join(', ')}` : ''
      ].filter(Boolean).join(' / ');
      const analyzedLeadSummary = data.leadSummary || data.summary || fallbackSummary || (language === 'zh' ? '线索资料还需要更多互动数据。' : 'Lead profile requires more interaction data.');
      const analyzedLeadNextStep = data.leadNextStep || data.nextStep || (leadRecord ? leadRecord.leadNextStep : client.agentNextStep) || (language === 'zh' ? '检查线索资料并选择下一步跟进动作。' : 'Review the lead profile and choose the next follow-up action.');
      const analyzedIcebreaker = String(data.icebreaker || '').trim();
      const normalizedData = { ...data, leadScore: score, leadSummary: analyzedLeadSummary, leadNextStep: analyzedLeadNextStep, icebreaker: analyzedIcebreaker };
      setAiData(normalizedData);
      if (leadRecord) {
        updateDeal(leadRecord.id, {
          leadScore: score,
          leadSummary: analyzedLeadSummary,
          leadNextStep: analyzedLeadNextStep,
          leadIcebreaker: analyzedIcebreaker,
          leadScoringSignature: signature,
          leadScoringAnalyzedAt: new Date().toISOString()
        });
      } else {
        useStore.getState().editClient(client.id, {
          leadScore: score,
          agentSummary: analyzedLeadSummary,
          agentNextStep: analyzedLeadNextStep,
          leadIcebreaker: analyzedIcebreaker,
          leadScoringSignature: signature,
          leadScoringAnalyzedAt: new Date().toISOString()
        });
      }
      useStore.getState().addLog(
        client.id,
        language === 'zh'
          ? `线索评分智能体已分析线索：评分 ${score}/100。下一步：${analyzedLeadNextStep}`
          : `Lead Scoring Agent analyzed lead: score ${score}/100. Next step: ${analyzedLeadNextStep}`,
        undefined,
        'general',
        { source: 'lead_scoring_agent', score, summary: analyzedLeadSummary, leadId: leadRecord?.id, dealId: leadRecord?.id }
      );
      incrementAgentHubTaskCount('lead_scoring_agent');
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    
    // Determine if attachments exist based on file input files.
    const attachments = fileInputRef.current?.files && fileInputRef.current.files.length > 0 
      ? Array.from(fileInputRef.current.files).map(f => ({
          id: `file${Date.now()}`,
          name: f.name,
          type: (f.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
          url: URL.createObjectURL(f)
        })) 
      : undefined;

    if (leadRecord) {
      const newComment: Comment = {
        id: `cmt${Date.now()}`,
        author: useStore.getState().userTitle,
        content: commentText,
        createdAt: new Date().toISOString(),
        attachments,
        replies: []
      };
      updateDeal(leadRecord.id, { comments: [...(leadRecord.comments || []), newComment] });
    } else {
      addComment(client.id, commentText, attachments);
    }
    setCommentText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLeadReply = (commentId: string, content: string, attachments?: any[]) => {
    if (!leadRecord) {
      addReply(client.id, commentId, content, attachments);
      return;
    }
    const addReplyRecursive = (comments: Comment[]): Comment[] => comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [
            ...(comment.replies || []),
            {
              id: `rep${Date.now()}`,
              author: useStore.getState().userTitle,
              content,
              createdAt: new Date().toISOString(),
              attachments,
              replies: []
            }
          ]
        };
      }
      return comment.replies?.length
        ? { ...comment, replies: addReplyRecursive(comment.replies) }
        : comment;
    });
    updateDeal(leadRecord.id, { comments: addReplyRecursive(leadRecord.comments || []) });
  };

  const markCommentPendingDelete = (comments: Comment[], commentId: string): Comment[] => comments.map(comment => {
    if (comment.id === commentId) {
      return { ...comment, pendingDelete: true, pendingDeleteRequestedAt: new Date().toISOString() };
    }
    return comment.replies?.length
      ? { ...comment, replies: markCommentPendingDelete(comment.replies, commentId) }
      : comment;
  });

  const collectPendingDeleteCommentIds = (comments: Comment[]): string[] => {
    const ids: string[] = [];
    const walk = (items: Comment[]) => {
      items.forEach(comment => {
        if (comment.pendingDelete) ids.push(comment.id);
        if (comment.replies?.length) walk(comment.replies);
      });
    };
    walk(comments);
    return ids;
  };

  const submitCommentDeleteApprovalRequest = async (commentId: string) => {
    const token = useAuthStore.getState().token || localStorage.getItem('token');
    if (!token) throw new Error('Authentication is required.');
    const payload = leadRecord
      ? { action: 'delete_deal_comment', deal_id: leadRecord.id, comment_id: commentId, lead_name: leadRecord.name }
      : { action: 'delete_client_comment', comment_id: commentId };
    const response = await fetch(`/api/clients/${client.id}/edit-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to create approval request.');
    return data;
  };

  const handleRequestCommentDelete = async (commentId: string) => {
    try {
      if (leadRecord) {
        const previousComments = leadRecord.comments || [];
        const nextComments = markCommentPendingDelete(leadRecord.comments || [], commentId);
        updateDeal(leadRecord.id, { comments: nextComments });
        try {
          await submitCommentDeleteApprovalRequest(commentId);
        } catch (error) {
          updateDeal(leadRecord.id, { comments: previousComments });
          throw error;
        }
      } else {
        const previousComments = client.comments || [];
        const nextComments = markCommentPendingDelete(client.comments || [], commentId);
        editClient(client.id, { comments: nextComments });
        try {
          await submitCommentDeleteApprovalRequest(commentId);
        } catch (error) {
          editClient(client.id, { comments: previousComments });
          throw error;
        }
      }
      notify(useStore.getState().language === 'zh' ? '评论删除请求已提交，等待审批。' : 'Comment delete request submitted for approval.', 'success');
    } catch (error) {
      console.error(error);
      notify(useStore.getState().language === 'zh' ? '提交评论删除请求失败。' : 'Failed to request comment deletion.', 'error');
    }
  };

  const visibleAiData = aiData || existingAnalysisResult();

  return (
    <div className="fixed inset-0 z-50 bg-[#05070b] text-slate-100 overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="px-5 py-5 lg:px-8 border-b border-slate-900/80 bg-black/40">
        <div className="mx-auto max-w-[1800px] flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <button onClick={closeDetails} className="mt-1 p-2 rounded-lg border border-slate-800 bg-slate-950/80 text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-white truncate">{leadRecord?.name || client.name}</h2>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">
                  {leadRecord ? 'Lead' : 'Client'}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-200 border border-cyan-500/20">
                  {leadRecord?.status || client.status}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{client.company || 'No company'}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{[client.city, client.state, client.country].filter(Boolean).join(', ') || 'No location'}</span>
                <LocalTime country={client.country} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowEditModal(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors">
              <Edit className="w-4 h-4" /> Edit Info
            </button>
            <button onClick={() => setConfirmDeleteTarget(true)} className="p-2.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="h-[calc(100dvh-93px)] overflow-y-auto px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-[1800px] space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.85fr)] gap-6">
            <div className="space-y-6 min-w-0">
              <ClientWorkroomPanel
                quoteCount={relatedQuotes.length}
                contactMethodCount={contactMethodCount}
                ragCount={clientKnowledge.length}
                todoCount={pendingFollowUps.length + relatedAgentTasks.length}
                loading={loading}
                primaryNextStep={primaryNextStep}
                primarySummary={primarySummary}
                clientSummaryText={clientSummaryText}
                clientNextStepText={clientNextStepText}
                leadSummaryText={leadSummaryText}
                leadNextStepText={leadNextStepText}
                hasLeadRecord={!!leadRecord}
                todoItems={workroomTodoItems}
                ragItems={clientKnowledge}
                channelHighlights={channelHighlights.map(({ action, ...item }) => ({ ...item, onClick: action }))}
                onRefreshAiRecommendation={() => handleAnalyze(true)}
                onOpenCommunication={() => openEmailInInbox(relatedEmails[0]?.id)}
                onOpenAgentHub={() => setView('agent-hub')}
                onOpenKnowledgeBase={() => setView('knowledge-base')}
              />

              <ClientEventPanel
                eventView={eventView}
                onEventViewChange={setEventView}
                sortedLogs={sortedLeadLogs}
                visibleTimelineLogs={visibleTimelineLogs}
                visibleEventListLogs={visibleEventListLogs}
                visibleGrowthLogs={visibleGrowthLogs}
                growthLogs={growthLogs}
                isDormant={!!client.isDormant}
                timelineExpanded={timelineExpanded}
                eventListExpanded={eventListExpanded}
                growthLogsExpanded={growthLogsExpanded}
                onToggleTimelineExpanded={() => setTimelineExpanded(prev => !prev)}
                onToggleEventListExpanded={() => setEventListExpanded(prev => !prev)}
                onToggleGrowthLogsExpanded={() => setGrowthLogsExpanded(prev => !prev)}
                onDeleteGrowthLog={deleteLog}
                onOpenEmail={openEmailInInbox}
              />
            </div>

            <div className="space-y-6 min-w-0">
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-5">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-3">Pending Approval</div>
                {client.pendingEditRequest ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Client profile update is waiting for review.
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-500">
                    No pending approval items.
                  </div>
                )}
              </div>

              {/* Status Pipeline change */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Workflow className="w-4 h-4" /> Pipeline Stage
                </h3>
                <select 
                  value={leadRecord?.status || client.status} 
                  onChange={(e) => {
                    const status = e.target.value as ClientStatus;
                    if (leadRecord) updateDeal(leadRecord.id, { status });
                    else updateClientStatus(client.id, status);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg p-2 focus:ring-2 ring-cyan-500 outline-none"
                >
                  {['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Profile Notes</h3>
                <div className="divide-y divide-slate-800">
                  <div className="py-3 flex gap-3">
                    <Building2 className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase">Company</div>
                      <div className="text-sm text-slate-200">{client.company || 'Not set'}</div>
                    </div>
                  </div>
                  <div className="py-3 flex gap-3">
                    <BadgeDollarSign className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase">Potential Value</div>
                      <div className="text-sm text-slate-200">{leadRecord ? `$${leadRecord.value.toLocaleString()}` : 'Not set'}</div>
                    </div>
                  </div>
                  <div className="py-3 flex gap-3">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase">Address</div>
                      <div className="text-sm text-slate-200">{[client.address, client.city, client.state, client.country].filter(Boolean).join(', ') || 'Not set'}</div>
                    </div>
                  </div>
                  <div className="py-3 flex gap-3">
                    <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase">Source</div>
                      <div className="text-sm text-slate-200">{leadRecord?.sourceLabel || client.sourceLabel || 'Not set'}</div>
                      {(leadRecord?.sourceId || client.sourceId) && (
                        <div className="mt-1 font-mono text-[11px] text-slate-500">ID: {leadRecord?.sourceId || client.sourceId}</div>
                      )}
                    </div>
                  </div>
                  <div className="py-3 flex gap-3">
                    <MessageSquare className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase">Description</div>
                      <div className="text-sm text-slate-300 leading-relaxed">{client.agentContext || summaryText || 'No description yet.'}</div>
                    </div>
                  </div>
                  {leadRecord?.leadNotes && (
                    <div className="py-3 flex gap-3">
                      <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
                      <div>
                        <div className="text-[11px] text-slate-500 uppercase">Lead Notes</div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{leadRecord.leadNotes}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <ClientQuotesWidget
                quotes={relatedQuotes}
                leadRecord={leadRecord}
                currencyRates={currencyRates}
                onOpenQuote={openQuote}
              />

              <ClientAiRadarCard
                visibleAiData={visibleAiData}
                loading={loading}
                leadScore={leadScore}
                summaryText={summaryText}
                nextStepText={nextStepText}
                hasLeadRecord={!!leadRecord}
                onAnalyze={handleAnalyze}
                onInsertIcebreaker={handleInsertIcebreaker}
              />

              {/* Contacts */}
              <ClientContactsWidget
                client={client}
                contacts={displayContacts}
                expandedContactIdx={expandedContactIdx}
                onExpandedContactChange={setExpandedContactIdx}
                renderContactAction={(method, closeContactAction) => (
                  <ContactActionBox
                    method={method}
                    client={client}
                    onClose={closeContactAction}
                    onOpenEmailCompose={(email) => {
                      setComposeRecipient(email);
                      setShowEmailCompose(true);
                      closeContactAction();
                    }}
                  />
                )}
              />

              {/* AI Auto Agent */}
              <div className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-indigo-900/50 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Settings className="w-24 h-24 text-indigo-400" />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> AI Follow-Up Agent
                  </h3>
                  <button 
                    onClick={() => setAgentSettingsOpen(true)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Agent Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 relative z-10">
                  {!client.agentEnabled ? (
                    <div className="text-center py-4">
                      <p className="text-slate-400 text-xs mb-3">Automate follow-ups and analyze client journey using AI.</p>
                      <button 
                        onClick={() => setAgentSettingsOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-2 transition-colors font-medium border border-indigo-500 shadow-lg shadow-indigo-900/20"
                      >
                        <Workflow className="w-3 h-3" /> Enable Agent
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                          <span className="text-xs font-medium text-indigo-300">Agent Active</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Mode: {client.agentMode === 'auto_email' ? 'Auto Email' : 'Prompt Only'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {client.agentSummary && (
                          <div className="bg-slate-900/80 rounded-lg p-3 border border-indigo-900/30">
                            <h4 className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Long-term summary</h4>
                            <p className="text-xs text-slate-300 leading-relaxed">{client.agentSummary}</p>
                          </div>
                        )}

                        {client.agentNextStep && (
                          <div className="bg-indigo-900/20 rounded-lg p-3 border border-indigo-500/20">
                            <h4 className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Suggested Next Step</h4>
                            <p className="text-sm font-medium text-white">{client.agentNextStep}</p>
                          </div>
                        )}
                        
                        <div className="flex justify-end pt-2">
                          <button 
                            onClick={handleRunAgent}
                            disabled={agentLoading}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded font-medium flex items-center gap-2 transition-colors shadow shadow-indigo-900/20"
                          >
                            {agentLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                            Run Agent
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Conversation Notes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(client.tags || []).map(tag => (
                    <span key={tag} className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">{tag}</span>
                  ))}
                  {(!client.tags || client.tags.length === 0) && <span className="text-sm text-slate-500">No tags yet.</span>}
                </div>
              </div>

        {/* Client Knowledge Base */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <KnowledgeBaseManager clientId={client.id} />
        </div>
            </div>
          </div>

        {/* Comments Section */}
        <div className="border-t border-slate-800 pt-6 pb-20">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Team Comments
          </h3>
          
          <div className="space-y-4 mb-6">
            {leadComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onReply={handleAddLeadReply} onDelete={handleRequestCommentDelete} />
            ))}
            {leadComments.length === 0 && (
              <div className="text-center text-xs text-slate-500 py-4 italic">No comments yet.</div>
            )}
          </div>

          <div className="sticky bottom-0 bg-slate-900 pt-2 border-t border-slate-800/50 mt-4">
            <div className="flex items-end gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
              <textarea 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-transparent text-sm resize-none focus:outline-none text-slate-200 max-h-24 leading-snug p-1 scrollbar-thin"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
                }}
              />
              <div className="flex items-center gap-1 shrink-0 pb-1">
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-md transition-colors" title="Attach Files">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button onClick={handleAddComment} disabled={!commentText.trim()} className="bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white p-1.5 rounded-md hover:bg-cyan-500 transition-colors shadow-sm disabled:shadow-none">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
        </div>
      {showEditModal && <ClientFormModal clientId={client.id} onClose={() => setShowEditModal(false)} />}
      
      {agentSettingsOpen && <AgentSettingsModal client={client} onClose={() => setAgentSettingsOpen(false)} />}

      {confirmDeleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Delete Client & Leads?</h3>
            <p className="text-slate-400 mb-6 text-sm">Are you sure you want to delete this client? All associated leads and data will be lost. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteTarget(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => { deleteClient(client.id); setConfirmDeleteTarget(false); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow font-medium transition-colors">Delete Client</button>
            </div>
          </div>
        </div>
      )}

      {/* Gmail-style sticky Compose block in corner */}
      {showEmailCompose && (
        <ClientEmailComposeOverlay
          language={language}
          recipient={composeRecipient}
          subject={leadRecord ? `Follow up: ${leadRecord.name}` : `Follow up from ${client.company || client.name}`}
          initialBody={composeInitialBody}
          onOpenInInbox={openEmailComposeInInbox}
          onClose={() => {
            setShowEmailCompose(false);
            setComposeInitialBody('');
          }}
        />
      )}
    </div>
  );
}
