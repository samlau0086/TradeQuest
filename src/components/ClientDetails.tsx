import React, { useState, useRef } from 'react';
import { useStore, ClientStatus, Client, ContactMethod } from '../store';
import { X, Thermometer, Flame, Snowflake, Sparkles, Send, Loader2, Workflow, History, Mail, MessageCircle, Phone, Edit, Trash2, Paperclip, MessageSquare } from 'lucide-react';
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

function ContactActionBox({ method, client, onClose }: { method: ContactMethod, client: Client, onClose: () => void }) {
  const [purpose, setPurpose] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPurpose, setLoadingPurpose] = useState(false);
  const { addLog, logs, emails, userTitle, outboxConfigs, addEmail, llmConfigs, activeLLMId, llmMappings, language } = useStore();
  const [selectedOutboxId, setSelectedOutboxId] = useState<string>(outboxConfigs?.[0]?.id || '');

  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(l => l.id === id) || null;
  };

  const generatePurpose = async () => {
    setLoadingPurpose(true);
    const clientLogs = logs.filter(l => l.clientId === client.id).map(l => `[${new Date(l.date).toLocaleDateString()}] ${l.content}`);
    const clientEmails = emails.filter(e => e.clientId === client.id).map(e => `[${e.type} - ${new Date(e.date).toLocaleDateString()}] ${e.subject}\n${e.body}`);

    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: "Suggest a single, short sentence purpose for follow-up with this lead based on communication history.", 
          context: { 
             clientLogs: clientLogs.join('\n'), 
             recentEmails: clientEmails.join('\n\n'),
             userLanguagePreference: language === 'zh' ? 'Chinese' : 'English'
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: `Draft a very short professional message to the client on ${method.type}. Purpose: ${purpose}`, 
          context: { client },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
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
      
      addEmail({
        recipient: method.value,
        sender: senderEmail,
        senderName: senderName,
        subject: purpose || 'Follow up',
        body: text,
        read: true,
        type: 'sent',
        clientId: client.id,
      });
      addLog(client.id, `Sent Email via app: ${purpose || 'Follow up'}`);
      alert("Email sent successfully!");
    } else if (method.type === 'whatsapp') {
      const phone = method.value.replace(/[^a-zA-Z0-9+]/g, '');
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank');
    } else if (method.type === 'wechat') {
      navigator.clipboard.writeText(text);
      // WeChat doesn't have a reliable web url scheme that takes pre-filled text like WhatsApp
      alert("Text copied to clipboard. Please paste it in WeChat.");
    } else {
      navigator.clipboard.writeText(text);
    }
    addLog(client.id, `Follow-up via ${method.type}: ${purpose}`);
    onClose();
  };

  return (
    <div className="mt-2 p-3 bg-slate-900 border border-slate-700/50 rounded-lg space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
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

       {method.type === 'email' && (
         <div className="flex items-center gap-2 mt-2">
           <label className="text-[10px] text-slate-500 uppercase font-bold shrink-0">Send From:</label>
           <select 
             value={selectedOutboxId}
             onChange={(e) => setSelectedOutboxId(e.target.value)}
             className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 truncate"
           >
             {outboxConfigs.map(c => (
               <option key={c.id} value={c.id}>{c.name} ({c.fromEmail})</option>
             ))}
             {outboxConfigs.length === 0 && <option value="">Default Backend Sender (me@soho.com)</option>}
           </select>
         </div>
       )}

       <div className="flex justify-end gap-2 mt-2">
         <button onClick={onClose} className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
         <button onClick={handleAction} className="px-3 py-1 bg-cyan-600 text-white rounded text-xs font-medium hover:bg-cyan-500 flex items-center gap-1 transition-colors">
           <Send className="w-3 h-3"/> 
           {method.type === 'email' ? 'Send Email' : method.type === 'whatsapp' ? 'Open WhatsApp' : method.type === 'wechat' ? 'Copy for WeChat' : 'Copy Text'}
         </button>
       </div>
    </div>
  );
}

export function ClientDetails() {
  const { clients, selectedClientId, selectClient, updateClientStatus, deleteClient, addComment, addReply, llmConfigs, activeLLMId, llmMappings } = useStore();
  
  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(c => c.id === id) || llmConfigs[0];
  };

  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<{ sentiment: string, temperature: number, icebreaker: string, summary: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [expandedContactIdx, setExpandedContactIdx] = useState<number | null>(null);

  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(false);

  const client = clients.find(c => c.id === selectedClientId);

  if (!client) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/icebreaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          client, 
          logs: [{ date: client.lastContact, content: "Discussed pricing. Client seemed hesitant but asked for samples. No reply since." }],
          llmConfig: getLLMConfig('analysis')
        })
      });
      const data = await res.json();
      setAiData(data);
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

    addComment(client.id, commentText, attachments);
    setCommentText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full h-full bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 shadow-2xl transition-transform">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {client.name}
            <button onClick={() => setShowEditModal(true)} className="text-slate-500 hover:text-cyan-400 p-1 rounded transition-colors inline-block"><Edit className="w-4 h-4" /></button>
          </h2>
          <p className="text-xs text-slate-400">{client.company} · {client.country}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setConfirmDeleteTarget(true)} className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => selectClient(null)} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
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
            value={client.status} 
            onChange={(e) => updateClientStatus(client.id, e.target.value as ClientStatus)}
            className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg p-2 focus:ring-2 ring-cyan-500 outline-none"
          >
            {['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Contact Methods */}
        {client.contactMethods && client.contactMethods.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
               Contacts
            </h3>
            <div className="space-y-2">
              {client.contactMethods.map((cm, idx) => {
                const Icon = CONTACT_ICONS[cm.type] || Mail;
                const isExpanded = expandedContactIdx === idx;
                return (
                  <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden transition-all">
                    <button 
                      onClick={() => setExpandedContactIdx(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between p-2 hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-md", cm.type === 'whatsapp' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300')}>
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
                        <ContactActionBox method={cm} client={client} onClose={() => setExpandedContactIdx(null)} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
              AI analysis requires target scan.
            </div>
          )}
        </div>

        {/* Growth Logs */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Growth Logs
          </h3>
          <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
            {useStore(s => s.logs).filter(l => l.clientId === client.id).map(log => (
              <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border border-slate-700 bg-slate-900 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
                </div>
                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg bg-slate-800/50 border border-slate-800 shadow-sm">
                  <time className="text-[10px] text-slate-500 font-medium mb-1 block">
                    {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                  <div className="text-xs text-slate-300">{log.content}</div>
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
            {client.comments?.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onReply={(commentId, text, attach) => addReply(client.id, commentId, text, attach)} />
            ))}
            {(!client.comments || client.comments.length === 0) && (
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
      
      {confirmDeleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Delete Target?</h3>
            <p className="text-slate-400 mb-6 text-sm">Are you sure you want to delete this target? All associated data will be lost. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteTarget(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => { deleteClient(client.id); setConfirmDeleteTarget(false); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
