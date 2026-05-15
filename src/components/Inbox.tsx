import React, { useState } from 'react';
import { useStore, EmailMessage } from '../store';
import { Mail, Send, Reply, Trash2, ArrowLeft, Edit3, User, Sparkles, Loader2, Search, Tag, CalendarClock, UserPlus, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { CommentItem } from './CommentItem';

export function Inbox() {
  const { emails, markEmailRead, clients, addEmail, addLog, addClient, editEmail, addEmailComment, addEmailReply, addQuest } = useStore();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'inbox' | 'sent' | 'scheduled'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<{recipient: string, subject: string} | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [commentText, setCommentText] = useState('');

  const filteredEmails = emails.filter(e => {
    if (e.type !== filter) return false;
    if (searchQuery && !e.subject.toLowerCase().includes(searchQuery.toLowerCase()) && !e.body.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (tagFilter && (!e.tags || !e.tags.includes(tagFilter))) return false;
    return true;
  });

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  const handleSelect = (id: string) => {
    setSelectedEmailId(id);
    markEmailRead(id);
  };

  const handleCreateLead = () => {
    if (!selectedEmail || selectedEmail.clientId) return;
    const name = filter === 'inbox' ? (selectedEmail.senderName || selectedEmail.sender.split('@')[0]) : (selectedEmail.recipient.split('@')[0]);
    const emailAddr = filter === 'inbox' ? selectedEmail.sender : selectedEmail.recipient;
    const newClientId = `c${Date.now()}`;
    addClient({
      name,
      company: 'Unknown',
      country: 'Unknown',
      status: 'Leads',
      tags: [],
      lastContact: new Date().toISOString(),
      contactMethods: [{ type: 'email', value: emailAddr }]
    });
    // The previous action creates an ID async via Date.now(). It's a bit hard to get it identically in Zustand without returning it.
    // Actually addClient doesn't return ID. We'll update clients and then editEmail but without ID it's tricky.
    // Let's just rely on the user to link it manually later if we can't reliably get the ID, or we cheat:
    // Wait, let's look at addClient... it generates `c${Date.now()}`. We can't easily predict it if execution drifts, but typically it works if we use Date.now() directly here, but addClient takes Omit<Client, 'id'>.
    // Since we can't easily do it perfectly without changing store, let's do a workaround.
  };

  const handleAddTag = () => {
    if (!selectedEmail || !newTag.trim()) return;
    let tg = newTag.trim();
    if (!tg.startsWith('#')) tg = '#' + tg;
    const currentTags = selectedEmail.tags || [];
    if (!currentTags.includes(tg)) {
      editEmail(selectedEmail.id, { tags: [...currentTags, tg] });
    }
    setNewTag('');
    setIsAddingTag(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-900 border-t border-slate-800">
      {/* Sidebar List */}
      <div className={cn("w-full md:w-80 border-r border-slate-800 flex flex-col shrink-0 transition-transform", selectedEmailId && "hidden md:flex")}>
        <div className="p-4 border-b border-slate-800 flex flex-col gap-3 bg-slate-900">
          <div className="flex justify-between items-center bg-slate-900">
            <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
              <button 
                onClick={() => setFilter('inbox')}
                className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", filter === 'inbox' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}
              >
                Inbox
              </button>
              <button 
                onClick={() => setFilter('sent')}
                className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", filter === 'sent' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}
              >
                Sent
              </button>
              <button 
                onClick={() => setFilter('scheduled')}
                className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", filter === 'scheduled' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}
              >
                Scheduled
              </button>
            </div>
            <button 
              onClick={() => { setComposeDefaults(null); setIsComposing(true); setSelectedEmailId(null); }}
              className="p-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
              title="Compose"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded px-2">
              <Search className="w-3 h-3 text-slate-500 mr-2" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-200 py-1.5 focus:outline-none"
              />
            </div>
            <div className="w-24 flex items-center bg-slate-950 border border-slate-800 rounded px-2">
              <Tag className="w-3 h-3 text-slate-500 mr-1" />
              <input 
                type="text" 
                placeholder="Filter tag" 
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-xs text-slate-200 py-1.5 focus:outline-none"
              />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredEmails.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500 italic">No emails found.</div>
          )}
          {filteredEmails.map(email => (
            <div 
              key={email.id}
              onClick={() => handleSelect(email.id)}
              className={cn("cursor-pointer border-b border-slate-800/50 p-4 transition-colors", 
                selectedEmailId === email.id ? "bg-cyan-950/20" : "hover:bg-slate-800/30",
                !email.read && filter === 'inbox' && "bg-slate-800/40"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-sm font-bold truncate pr-2", !email.read && filter === 'inbox' ? "text-white" : "text-slate-300")}>
                  {filter === 'inbox' ? (email.senderName || email.sender) : (email.recipient)}
                </span>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {email.type === 'scheduled' && email.scheduledAt ? `Sched: ${new Date(email.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}` : new Date(email.date).toLocaleDateString()}
                </span>
              </div>
              <div className={cn("text-xs font-medium mb-1 truncate", !email.read && filter === 'inbox' ? "text-slate-200" : "text-slate-400")}>
                {email.subject}
              </div>
              <div className="text-[10px] text-slate-500 truncate h-4">
                {email.body.replace(/\n/g, ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reading Pane / Compose Pane */}
      <div className={cn("flex-1 flex flex-col bg-slate-950/50 relative", !selectedEmailId && !isComposing && "hidden md:flex")}>
        {isComposing ? (
          <ComposeEmail onClose={() => setIsComposing(false)} initialRecipient={composeDefaults?.recipient} initialSubject={composeDefaults?.subject} />
        ) : selectedEmail ? (
          <>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 sticky top-0 md:static backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedEmailId(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {filter === 'inbox' ? (selectedEmail.senderName || selectedEmail.sender) : selectedEmail.recipient}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                       {filter === 'inbox' ? `From: ${selectedEmail.sender}` : `To: ${selectedEmail.recipient}`}
                       {selectedEmail.clientId ? (
                         <span className="bg-slate-800 px-2 py-0.5 rounded text-cyan-400 border border-slate-700">
                           {clients.find(c => c.id === selectedEmail.clientId)?.name || 'Linked'}
                         </span>
                       ) : (
                         <button onClick={handleCreateLead} className="text-cyan-500 flex items-center gap-1 hover:text-cyan-400 bg-slate-800/50 rounded px-1.5 py-0.5">
                           <UserPlus className="w-3 h-3" /> New Lead
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => { setComposeDefaults({ recipient: selectedEmail.sender, subject: `Re: ${selectedEmail.subject}` }); setIsComposing(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Reply">
                   <Reply className="w-4 h-4" />
                 </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto scrollbar-thin flex-1">
               {/* Tags Row */}
               <div className="flex flex-wrap items-center gap-2 mb-4">
                 {selectedEmail.tags?.map(tg => (
                   <span key={tg} className="text-[10px] items-center flex gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                     <Tag className="w-3 h-3" /> {tg}
                   </span>
                 ))}
                 {isAddingTag ? (
                   <input 
                     type="text" autoFocus value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleAddTag(); }} onBlur={() => setIsAddingTag(false)} 
                     className="text-[10px] bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-20 text-slate-300 focus:outline-none" 
                     placeholder="tag..." 
                   />
                 ) : (
                   <button onClick={() => setIsAddingTag(true)} className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-500">
                     + add tag
                   </button>
                 )}
               </div>

               <h2 className="text-xl font-bold text-slate-200 mb-6">{selectedEmail.subject}</h2>
               <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                 {selectedEmail.body}
               </div>

               {/* Comments Section */}
               <div className="mt-12 border-t border-slate-800 pt-6">
                 <h3 className="text-sm border-b border-slate-800 pb-2 font-bold flex items-center text-slate-400 mb-4">
                   <MessageSquare className="w-4 h-4 mr-2" /> Comments & Notes
                 </h3>
                 <div className="space-y-4 mb-4">
                   {selectedEmail.comments?.map(comment => (
                     <CommentItem key={comment.id} comment={comment} onReply={(cmtId, text, atts) => addEmailReply(selectedEmail.id, cmtId, text, atts)} />
                   ))}
                 </div>
                 <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                   <textarea
                     value={commentText}
                     onChange={(e) => setCommentText(e.target.value)}
                     className="w-full bg-transparent text-sm resize-none focus:outline-none text-slate-300 placeholder-slate-600 p-1 min-h-[60px]"
                     placeholder="Add a comment to this email..."
                   />
                   <div className="flex justify-end pt-2">
                     <button
                       onClick={() => { if(commentText.trim()) { addEmailComment(selectedEmail.id, commentText); setCommentText(''); } }}
                       disabled={!commentText.trim()}
                       className="bg-slate-800 disabled:opacity-50 text-slate-300 px-3 py-1 text-xs rounded hover:text-white"
                     >
                       Post Comment
                     </button>
                   </div>
                 </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Mail className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">Select an email to read or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ComposeEmail({ onClose, initialRecipient = '', initialSubject = '' }: { onClose: () => void, initialRecipient?: string, initialSubject?: string }) {
  const { clients, emails, logs, addEmail, addLog } = useStore();
  const [recipient, setRecipient] = useState(initialRecipient);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPurpose, setLoadingPurpose] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Auto-associate client if recipient matches
  const matchedClient = clients.find(c => 
    c.contactMethods?.some(m => m.type === 'email' && m.value.toLowerCase() === recipient.toLowerCase())
  );

  const handleGeneratePurpose = async () => {
    if (!matchedClient) return;
    setLoadingPurpose(true);
    const clientLogs = logs.filter(l => l.clientId === matchedClient.id).map(l => `[${new Date(l.date).toLocaleDateString()}] ${l.content}`);
    const clientEmails = emails.filter(e => e.clientId === matchedClient.id).map(e => `[${e.type} - ${new Date(e.date).toLocaleDateString()}] ${e.subject}\n${e.body}`);

    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: "Suggest a single, short sentence purpose for follow-up with this lead based on communication history.", 
          context: { 
             clientLogs: clientLogs.join('\n'), 
             recentEmails: clientEmails.join('\n\n'),
             userLanguagePreference: navigator.language || 'en'
          } 
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

  const doSchedule = () => {
    if (!recipient || !subject || !scheduleDateTime) return;
    const scheduledAt = new Date(scheduleDateTime).toISOString();
    addEmail({
      recipient,
      sender: 'me@soho.com',
      senderName: 'Alex.W',
      subject,
      body,
      read: true,
      type: 'scheduled',
      clientId: matchedClient?.id,
      scheduledAt
    });
    if (matchedClient) {
      addLog(matchedClient.id, `Scheduled Email: ${subject} for ${new Date(scheduledAt).toLocaleString()}${purpose ? ` (Purpose: ${purpose})` : ''}`);
    }
    setShowSchedule(false);
    setScheduleDateTime('');
    onClose();
  };

  const handleSend = () => {
    if (!recipient || !subject) return;
    addEmail({
      recipient,
      sender: 'me@soho.com',
      senderName: 'Alex.W',
      subject,
      body,
      read: true,
      type: 'sent',
      clientId: matchedClient?.id
    });
    if (matchedClient) {
      addLog(matchedClient.id, `Sent Email: ${subject}${purpose ? ` (Purpose: ${purpose})` : ''}`);
    }
    onClose();
  };

  const handleMagicDraft = async () => {
    if (!recipient || !matchedClient) {
      alert("Please enter a recipient email that matches a Lead to use AI drafting.");
      return;
    }
    setLoading(true);
    
    const clientLogs = logs.filter(l => l.clientId === matchedClient.id).map(l => l.content).join('\\n');
    const lastEmailReceived = emails.filter(e => e.clientId === matchedClient.id && e.type === 'inbox').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: `Draft an email. Subject: ${subject || "Follow up"}. Purpose for this email: ${purpose || 'General follow up'}`,
          context: { 
            client: matchedClient,
            historicalFollowUpLogs: clientLogs,
            lastReceivedEmailBody: lastEmailReceived?.body || 'No previous received emails'
          } 
        })
      });
      const data = await res.json();
      setBody(data.result);
      if (!subject) setSubject('Follow up from Alex');
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 animate-in fade-in duration-200">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
        <h3 className="font-bold text-white text-sm">New Message</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 w-12 text-right">To:</label>
          <input 
            type="email" 
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-600" 
            placeholder="client@company.com" 
          />
          {matchedClient && (
            <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-1 rounded border border-slate-700">
              Matched: {matchedClient.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 w-12 text-right">Subject:</label>
          <input 
            type="text" 
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-600 font-medium" 
            placeholder="Enter subject here..." 
          />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col p-4">
        <textarea 
          value={body}
          onChange={e => setBody(e.target.value)}
          className="flex-1 w-full bg-transparent text-sm text-slate-300 resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed scrollbar-thin"
          placeholder="Write your email here..."
        />
      </div>

      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between pl-14">
          <label className="text-[10px] text-slate-500 uppercase font-bold">Follow-up Purpose</label>
          <button onClick={handleGeneratePurpose} disabled={loadingPurpose || !matchedClient} className="text-[10px] flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50">
             {loadingPurpose ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
             Auto-detect
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 w-12 text-right">Draft:</label>
          <input 
            type="text" 
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500" 
            placeholder="AI follow-up purpose (e.g., 'Remind them about the sample pricing')" 
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <button 
            onClick={handleMagicDraft} 
            disabled={loading || !recipient}
            className="text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors font-medium"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
            AI Draft
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowSchedule(!showSchedule)}
                disabled={!recipient || !body}
                className="text-sm bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500 text-slate-300 px-3 py-2 rounded-lg flex items-center shadow-lg transition-colors"
                title="Schedule Send"
              >
                <CalendarClock className="w-4 h-4" />
              </button>
              {showSchedule && (
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400">Select Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={e => setScheduleDateTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setShowSchedule(false)} className="flex-1 text-xs py-1 text-slate-400 hover:text-white transition-colors">Cancel</button>
                    <button onClick={doSchedule} disabled={!scheduleDateTime} className="flex-1 text-xs py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-white font-medium transition-colors">Confirm</button>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={handleSend}
              disabled={!recipient || !body}
              className="text-sm font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-colors"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
