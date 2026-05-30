import React, { useState, useRef } from 'react';
import { useStore, ClientStatus, Client, ContactMethod, Comment } from '../store';
import { useAuthStore } from '../authStore';
import { X, Thermometer, Flame, Snowflake, Sparkles, Send, Loader2, Workflow, History, Mail, MessageCircle, Phone, Edit, Trash2, Paperclip, MessageSquare, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { ClientFormModal } from './ClientFormModal';

const CONTACT_ICONS = {
  email: Mail,
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  telegram: Send,
  phone: Phone,
  wechat: MessageSquare,
};

import { User } from 'lucide-react';

import { CommentItem } from './CommentItem';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';
import { WorkflowConfigModal } from './WorkflowConfigModal';
import { LocalTime } from './LocalTime';
import { ComposeEmail } from './Inbox';
import { WhatsAppChatModal } from './WhatsAppChatModal';
import { getCustomerOutputLanguage } from '../lib/language';
import { buildLeadScoringSignature } from '../lib/leadScoring';

function ContactActionBox({ method, client, onClose, onOpenEmailCompose }: { method: ContactMethod, client: Client, onClose: () => void, onOpenEmailCompose?: (email: string) => void }) {
  const [purpose, setPurpose] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPurpose, setLoadingPurpose] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [showWhatsAppChat, setShowWhatsAppChat] = useState(false);
  const { addLog, logs, emails, userTitle, outboxConfigs, addEmail, llmConfigs, activeLLMId, llmMappings, language, setView, selectEmail, notify, incrementAgentHubTaskCount } = useStore();
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
    } else if (method.type === 'whatsapp') {
      setShowWhatsAppChat(true);
      return;
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
       {showWhatsAppChat && (
         <WhatsAppChatModal
           client={client}
           phone={method.value}
           initialMessage={draft || purpose}
           onClose={() => {
             setShowWhatsAppChat(false);
             onClose();
           }}
         />
       )}
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
               {method.type === 'whatsapp' ? 'Open WhatsApp' : method.type === 'wechat' ? 'Copy for WeChat' : 'Copy Text'}
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
                      onClick={() => { setView('inbox'); selectEmail(email.id); onClose(); }}
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

       {method.type === 'whatsapp' && (
         <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-900/90 py-1 z-10 backdrop-blur-sm">Follow-up History</h4>
           <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[9px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
             {logs.filter(l => l.clientId === client.id && l.type === 'whatsapp').length === 0 ? (
               <p className="text-xs text-slate-500 italic pl-6 relative">No follow-up history yet.</p>
             ) : (
               logs.filter(l => l.clientId === client.id && l.type === 'whatsapp').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                 <div key={log.id} className="relative flex items-start pl-6 group">
                   <div className="absolute left-[5px] top-1 flex items-center justify-center w-2.5 h-2.5 rounded-full border-2 border-cyan-500/30 bg-cyan-500"></div>
                   <div className="flex flex-col gap-1.5 w-full bg-slate-800/30 p-2.5 rounded-lg border border-slate-700/30 group-hover:border-slate-700/60 transition-colors">
                     <div className="flex items-center justify-between gap-4">
                       <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded truncate">
                         {log.metadata?.purpose || 'General Follow-up'}
                       </span>
                       <time className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                         {new Date(log.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </time>
                     </div>
                     <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                       {log.metadata?.text || log.content}
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
  const { clients, deals, selectedClientId, selectedDealId, selectClient, selectDeal, updateClientStatus, updateDeal, deleteClient, addComment, addReply, deleteLog, llmConfigs, activeLLMId, llmMappings, setView, selectEmail, logs, emails, incrementAgentHubTaskCount } = useStore();
  
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

  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(false);

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
  const leadScore = leadRecord ? leadRecord.leadScore : client?.leadScore;
  const leadSummary = leadRecord ? leadRecord.leadSummary : client?.leadSummary;
  const leadNextStep = leadRecord ? leadRecord.leadNextStep : client?.leadNextStep;

  if (!client) return null;
  const displayContacts = (client.contacts && client.contacts.length > 0)
    ? client.contacts
    : [{
        id: client.primaryContactId || 'primary',
        name: client.name,
        title: 'Key Contact',
        isPrimary: true,
        contactMethods: client.contactMethods || []
      }];

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

  const handleAnalyze = async () => {
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
        client.company || client.name,
        client.country,
        client.status,
        client.tags?.length ? `Tags: ${client.tags.join(', ')}` : ''
      ].filter(Boolean).join(' / ');
      const analyzedLeadSummary = data.leadSummary || data.summary || fallbackSummary || 'Lead profile requires more interaction data.';
      const analyzedLeadNextStep = data.leadNextStep || data.nextStep || client.agentNextStep || 'Review the lead profile and choose the next follow-up action.';
      const normalizedData = { ...data, leadScore: score, leadSummary: analyzedLeadSummary, leadNextStep: analyzedLeadNextStep };
      setAiData(normalizedData);
      if (leadRecord) {
        updateDeal(leadRecord.id, {
          leadScore: score,
          leadSummary: analyzedLeadSummary,
          leadNextStep: analyzedLeadNextStep,
          leadScoringSignature: buildLeadScoringSignature(client, leadLogs, emails),
          leadScoringAnalyzedAt: new Date().toISOString()
        });
      } else {
        useStore.getState().editClient(client.id, {
          leadScore: score,
          leadSummary: analyzedLeadSummary,
          leadNextStep: analyzedLeadNextStep,
          leadScoringSignature: buildLeadScoringSignature(client, logs, emails),
          leadScoringAnalyzedAt: new Date().toISOString(),
          agentSummary: analyzedLeadSummary || client.agentSummary,
          agentNextStep: analyzedLeadNextStep || client.agentNextStep
        });
      }
      useStore.getState().addLog(
        client.id,
        `Lead Scoring Agent analyzed lead: score ${score}/100. Next step: ${analyzedLeadNextStep}`,
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

  return (
    <div className="w-full h-full bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 shadow-2xl transition-transform">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex-1 min-w-0 mr-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {client.name}
            <button onClick={() => setShowEditModal(true)} className="text-slate-500 hover:text-cyan-400 p-1 rounded transition-colors inline-block shrink-0"><Edit className="w-4 h-4" /></button>
            <LocalTime country={client.country} />
          </h2>
          <p className="text-xs text-slate-400 truncate mt-1">
            {client.company} · {[client.city, client.state, client.country].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setConfirmDeleteTarget(true)} className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={closeDetails} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Status Pipeline change */}
        <div>
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

        {/* Contacts */}
        {displayContacts.some(contact => (contact.contactMethods || []).length > 0) && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
               Contacts
            </h3>
            <div className="space-y-3">
              {displayContacts.map((contact) => (
                <div key={contact.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        {contact.name || client.name}
                        {contact.isPrimary && <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">Key</span>}
                      </div>
                      {contact.title && <div className="text-[11px] text-slate-500 mt-0.5">{contact.title}</div>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(contact.contactMethods || []).map((cm, idx) => {
                      const Icon = CONTACT_ICONS[cm.type] || Mail;
                      const expandKey = `${contact.id}_${idx}`;
                      const isExpanded = expandedContactIdx === expandKey;
                      return (
                        <div key={expandKey} className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden transition-all">
                          <button
                            onClick={() => setExpandedContactIdx(isExpanded ? null : expandKey)}
                            className="w-full flex items-center justify-between p-2 hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn("p-1.5 rounded-md shrink-0", cm.type === 'whatsapp' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300')}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-sm text-slate-300 font-medium truncate">{cm.value}</span>
                            </div>
                            <span className="text-xs font-medium text-cyan-400 shrink-0 ml-2">
                              {isExpanded ? 'Close' : 'Action'}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="px-2 pb-2">
                              <ContactActionBox
                                method={cm}
                                client={client}
                                onClose={() => setExpandedContactIdx(null)}
                                onOpenEmailCompose={(email) => {
                                  setComposeRecipient(email);
                                  setShowEmailCompose(true);
                                  setExpandedContactIdx(null);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* AI Radar */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Thermometer className="w-4 h-4" /> AI Radar
            </h3>
            {!aiData && !loading && (
              <button onClick={handleAnalyze} className="text-[10px] bg-cyan-900/40 text-cyan-400 hover:bg-cyan-900 px-2 py-1 rounded">
                Analyze
              </button>
            )}
            {loading && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
          </div>

          {aiData ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-slate-900 rounded-lg p-3 border border-cyan-500/20">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase">Lead Score</span>
                    <span className="text-lg font-bold text-white">{Number(aiData.leadScore ?? aiData.temperature ?? 0)}/100</span>
                  </div>
                </div>
                {(aiData.leadSummary || leadSummary) && (
                  <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Lead Summary</span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{aiData.leadSummary || leadSummary}</p>
                  </div>
                )}
                {(aiData.leadNextStep || leadNextStep) && (
                  <div className="bg-cyan-950/30 rounded-lg p-3 border border-cyan-500/20">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase">Best Next Step</span>
                    <p className="text-sm text-white mt-1 font-medium">{aiData.leadNextStep || leadNextStep}</p>
                  </div>
                )}
              </div>
              {/* Thermometer */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className={aiData.sentiment === 'COLD' ? 'text-blue-400' : 'text-slate-400'}>Cold</span>
                  <span className={aiData.sentiment === 'HOT' ? 'text-orange-400' : 'text-slate-400'}>Hot</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000", 
                      aiData.temperature > 70 ? "bg-orange-500 shadow-[0_0_10px_orange]" : 
                      aiData.temperature > 30 ? "bg-amber-400" : "bg-blue-400"
                    )}
                    style={{ width: `${aiData.temperature}%` }}
                  />
                </div>
              </div>

              {/* Icebreaker */}
              <div className="bg-slate-900 rounded-lg p-3 relative">
                <Sparkles className="w-4 h-4 text-amber-400 absolute top-3 left-3" />
                <p className="text-xs text-slate-300 pl-6 leading-relaxed">
                  <span className="font-bold text-slate-500 block mb-1">Generated Icebreaker:</span>
                  "{aiData.icebreaker}"
                </p>
                <div className="mt-2 flex justify-end">
                  <button className="text-[10px] flex items-center gap-1 bg-cyan-600 text-white px-2 py-1 rounded hover:bg-cyan-500 transition-colors">
                    <Send className="w-3 h-3" /> Insert
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div>
                 <span className="font-bold text-[10px] text-slate-500 block mb-1 uppercase">AI Intelligence</span>
                 <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-slate-700 pl-2">
                   {aiData.summary}
                 </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">
              {leadScore !== undefined ? (
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-cyan-500/20">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase">Lead Score</span>
                    <span className="text-lg font-bold text-white">{leadScore}/100</span>
                  </div>
                  {leadSummary && <p className="text-xs text-slate-300 leading-relaxed">{leadSummary}</p>}
                  {leadNextStep && <p className="text-sm text-white font-medium">Next: {leadNextStep}</p>}
                </div>
              ) : 'AI analysis requires target scan.'}
            </div>
          )}
        </div>

        {/* Client Knowledge Base */}
        <div className="mb-8">
          <KnowledgeBaseManager clientId={client.id} />
        </div>

        {/* Growth Logs */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Growth Logs
          </h3>
          <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
            {leadLogs.filter(l => {
              if (l.content.startsWith('Saved Draft:')) return false;
              if (l.relatedEmailId) {
                const relatedEmail = useStore.getState().emails.find(e => e.id === l.relatedEmailId);
                if (relatedEmail && relatedEmail.type === 'draft') return false;
              }
              return true;
            }).map(log => (
              <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border border-slate-700 bg-slate-900 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
                </div>
                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg bg-slate-800/50 border border-slate-800 shadow-sm relative">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <time className="text-[10px] text-slate-500 font-medium block">
                      {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                    <button
                      type="button"
                      onClick={() => deleteLog(log.id)}
                      title="Delete"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-300">
                    {log.relatedEmailId ? (
                      <button 
                        onClick={() => {
                          setView('inbox');
                          selectEmail(log.relatedEmailId || null);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 text-left"
                      >
                        <Mail className="w-3 h-3 shrink-0" />
                        <span>{log.content}</span>
                      </button>
                    ) : (
                      log.content
                    )}
                  </div>
                </div>
              </div>
            ))}
            {client.isDormant && (
               <div className="relative flex items-center group">
                 <div className="flex items-center justify-center w-5 h-5 rounded-full border border-orange-500/30 bg-orange-950 text-orange-500 shadow shrink-0">
                   <Snowflake className="w-3 h-3" />
                 </div>
                 <div className="pl-3 w-[calc(100%-2.5rem)]">
                   <div className="text-xs font-bold text-orange-500 mb-1">Status changed to Dormant</div>
                 </div>
               </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="border-t border-slate-800 pt-6 pb-20">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Team Comments
          </h3>
          
          <div className="space-y-4 mb-6">
            {leadComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onReply={handleAddLeadReply} />
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
        <div className="fixed inset-0 md:inset-auto md:bottom-0 md:right-8 w-full md:max-w-[550px] h-[100dvh] md:h-[600px] shadow-2xl z-50 md:rounded-t-xl overflow-hidden md:border-t md:border-l md:border-r border-slate-700 bg-slate-900 flex flex-col">
          <ComposeEmail 
            onClose={() => setShowEmailCompose(false)} 
            initialRecipient={composeRecipient} 
            className="rounded-none border-none shadow-none h-full"
          />
        </div>
      )}
    </div>
  );
}
