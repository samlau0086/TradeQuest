import React, { useState, useRef, useEffect } from 'react';
import { useStore, EmailMessage } from '../store';
import { useAuthStore } from '../authStore';
import { Mail, Send, Reply, Trash2, ArrowLeft, RefreshCw, Edit3, User, Sparkles, Loader2, Search, Tag, CalendarClock, UserPlus, MessageSquare, Paperclip, ChevronDown, ChevronUp, X, Database, CheckCircle2, MoreHorizontal, Star, Clock, Activity, Eye, MousePointerClick, Radar, Timer } from 'lucide-react';
import { cn } from '../lib/utils';
import { CommentItem } from './CommentItem';
import { AddressInput } from './AddressInput';
import { getCaretCoordinates } from '../utils/caret';
import { ClientFormModal } from './ClientFormModal';
import { UploadAttachmentModal } from './UploadAttachmentModal';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

export function Inbox() {
  const { emails, markEmailRead, clients, addEmail, addLog, addClient, editEmail, addEmailComment, addEmailReply, addQuest, selectClient, addKnowledgeItem } = useStore();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'inbox' | 'sent' | 'scheduled'>('inbox');
  const [search, setSearch] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<{recipient: string, subject: string, originalEmailBody?: string} | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [showCommentAttachmentModal, setShowCommentAttachmentModal] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [addingToRag, setAddingToRag] = useState(false);
  const [addedToRagId, setAddedToRagId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [todoModalEmail, setTodoModalEmail] = useState<string | null>(null);
  const [todoAt, setTodoAt] = useState('');
  const [todoNote, setTodoNote] = useState('');
  const [tagModalEmail, setTagModalEmail] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [alertDialog, setAlertDialog] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const filteredEmails = emails.filter(e => {
    // Support both new ('inbox'/'sent') and legacy ('inbound'/'outbound') types
    const typeMatch = (filter === 'inbox' && (e.type === 'inbox' || e.type === 'inbound')) ||
                      (filter === 'sent' && (e.type === 'sent' || e.type === 'outbound' || e.type === 'scheduled')) ||
                      (filter === 'scheduled' && e.type === 'scheduled');
    
    if (!typeMatch) return false;
    if (e.pendingDelete) return false;
    
    const termsToMatch = [...searchTags];
    if (search.trim()) {
      termsToMatch.push(...search.trim().toLowerCase().split(/\s+/));
    }
    
    if (termsToMatch.length > 0) {
      for (const t of termsToMatch) {
        const lowerT = t.toLowerCase();
        if (t.startsWith('#')) {
          if (!e.tags || !e.tags.some(tag => tag.toLowerCase() === lowerT)) {
            return false;
          }
        } else {
          // Regular text search
          if (!e.subject.toLowerCase().includes(lowerT) && !e.body.toLowerCase().includes(lowerT)) {
             return false;
          }
        }
      }
    }
    return true;
  });

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEmails.length && filteredEmails.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmails.map(e => e.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setConfirmDialog({
      message: `Are you sure you want to delete ${selectedIds.size} email(s)? Emails associated with a client will be soft-deleted pending admin review.`,
      onConfirm: async () => {
        await useStore.getState().deleteEmails(Array.from(selectedIds));
        setSelectedIds(new Set());
        if (selectedEmailId && selectedIds.has(selectedEmailId)) setSelectedEmailId(null);
        setConfirmDialog(null);
      }
    });
  };

  const handleSync = async () => {
    const configs = useStore.getState().inboxConfigs;
    if (!configs || configs.length === 0) {
      setAlertDialog("No Inbox configurations found. Please add one in Settings.");
      return;
    }
    
    setIsSyncing(true);
    let totalSynced = 0;
    try {
      const token = localStorage.getItem('token');
      for (const config of configs) {
        if (config.type !== 'imap' && config.type !== 'pop3') continue;
        const res = await fetch('/api/sync-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(config)
        });
        if (res.ok) {
          const data = await res.json();
          totalSynced += data.count || 0;
        }
      }
      if (totalSynced > 0) {
        useStore.getState().fetchEmails();
      }
      setAlertDialog(`Sync complete. Fetched ${totalSynced} new email(s).`);
    } catch (e) {
      console.error(e);
      setAlertDialog("Error syncing emails.");
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  const handleSelect = (id: string) => {
    setSelectedEmailId(id);
    markEmailRead(id);
  };

  const handleCreateLead = () => {
    if (!selectedEmail || selectedEmail.clientId) return;
    setIsCreatingLead(true);
  };

  const submitTodo = () => {
    if (!todoModalEmail || !todoAt) return;
    editEmail(todoModalEmail, { todoAt, todoNote });
    setTodoModalEmail(null);
    setTodoAt('');
    setTodoNote('');
    setActiveMenu(null);
  };

  const submitTag = () => {
    if (!tagModalEmail || !tagInput.trim()) return;
    const email = emails.find(e => e.id === tagModalEmail);
    if (!email) return;
    let tg = tagInput.trim();
    if (!tg.startsWith('#')) tg = '#' + tg;
    const currentTags = email.tags || [];
    if (!currentTags.includes(tg)) {
      editEmail(email.id, { tags: [...currentTags, tg] });
    }
    setTagModalEmail(null);
    setTagInput('');
    setActiveMenu(null);
  };

  const toggleImportant = (email: EmailMessage) => {
    editEmail(email.id, { isImportant: !email.isImportant });
    setActiveMenu(null);
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

  const handleAddToRag = () => {
    if (!selectedEmail || !selectedEmail.clientId) return;
    setAddingToRag(true);
    addKnowledgeItem({
      clientId: selectedEmail.clientId,
      title: `Email: ${selectedEmail.subject}`,
      content: `Date: ${new Date(selectedEmail.date).toLocaleString()}\nFrom: ${selectedEmail.sender}\nTo: ${selectedEmail.recipient}\n\n${selectedEmail.body}`
    });
    setTimeout(() => {
      setAddingToRag(false);
      setAddedToRagId(selectedEmail.id);
      setTimeout(() => setAddedToRagId(null), 2000);
    }, 500);
  };

  return (
    <PanelGroup orientation="horizontal" id="inbox-layout" className="flex-1 overflow-hidden bg-slate-900 border-t border-slate-800">
      {/* Sidebar List */}
      <Panel defaultSize={320} minSize={250} maxSize={500} className={cn("flex flex-col transition-transform relative z-10", selectedEmailId && "hidden md:flex")}>
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
            <div className="flex gap-2">
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className={cn("p-1.5 bg-slate-800 text-slate-300 rounded-md hover:bg-slate-700 transition-colors border border-slate-700", isSyncing && "opacity-50")}
                title="Sync Emails"
              >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              </button>
              <button 
                onClick={() => { setComposeDefaults(null); setIsComposing(true); setSelectedEmailId(null); }}
                className="p-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
                title="Compose"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex flex-wrap items-center bg-slate-950 border border-slate-800 rounded px-2 min-h-[36px] focus-within:border-cyan-500 transition-colors">
              <Search className="w-3 h-3 text-slate-500 mr-2" />
              {searchTags.map((tag, i) => (
                <span key={i} className="flex items-center gap-1 bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 mr-1 my-1">
                  {tag}
                  <button onClick={() => setSearchTags(tags => tags.filter((_, index) => index !== i))} className="hover:text-red-400 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input 
                type="text" 
                placeholder={searchTags.length > 0 ? "Search..." : "Search or add #tag..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    if (search.trim()) {
                      let tg = search.trim();
                      setSearchTags([...searchTags, tg]);
                      setSearch('');
                    }
                  } else if (e.key === 'Backspace' && !search && searchTags.length > 0) {
                    setSearchTags(searchTags.slice(0, -1));
                  }
                }}
                list="inbox-tag-suggestions"
                className="flex-1 min-w-[100px] bg-transparent text-xs text-slate-200 py-1.5 focus:outline-none"
              />
              <datalist id="inbox-tag-suggestions">
                {Array.from(new Set(emails.flatMap(e => e.tags || []))).map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin pb-48">
          {filteredEmails.length > 0 && (
            <div className="flex items-center justify-between p-2 px-4 border-b border-slate-800 bg-slate-900/50 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={selectedIds.size === filteredEmails.length && filteredEmails.length > 0}
                  ref={input => {
                    if (input) {
                      input.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredEmails.length;
                    }
                  }}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                />
                <span>Select All</span>
              </div>
              {selectedIds.size > 0 && (
                <button 
                  onClick={handleDeleteSelected}
                  className="px-2 py-1 bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/60 rounded flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          )}
          {filteredEmails.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500 italic">No emails found.</div>
          )}
          {filteredEmails.map(email => (
            <div 
              key={email.id}
              onClick={() => handleSelect(email.id)}
              className={cn("cursor-pointer border-b border-slate-800/50 p-4 transition-colors flex gap-3 group relative", 
                selectedEmailId === email.id ? "bg-cyan-950/20" : "hover:bg-slate-800/30",
                !email.read && filter === 'inbox' && "bg-slate-800/40"
              )}
            >
              <div 
                className={cn("pt-0.5 transition-opacity", selectedIds.has(email.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")} 
                onClick={(e) => toggleSelection(e, email.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(email.id)}
                  onChange={() => {}}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                />
              </div>
              <div 
                className={cn("pt-0.5 cursor-pointer transition-opacity flex-shrink-0", email.isImportant ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                onClick={(e) => { e.stopPropagation(); toggleImportant(email); }}
                title={email.isImportant ? "Unmark Important" : "Mark Important"}
              >
                <Star className={cn("w-4 h-4", email.isImportant ? "text-yellow-500 fill-yellow-500" : "text-slate-500 hover:text-slate-300")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 relative">
                  <span className={cn("text-sm font-bold truncate pr-2 flex items-center gap-1", !email.read && filter === 'inbox' ? "text-white" : "text-slate-300")}>
                    {filter === 'inbox' ? (email.senderName || email.sender) : (email.recipient)}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {((email.type === 'sent' || email.type === 'scheduled' || email.type === 'outbound') && (email.body?.includes('/api/track/open/') || email.enableTracking)) && (
                      <div className="relative group/track flex items-center">
                        <Radar 
                          className={cn("w-3.5 h-3.5 cursor-pointer", email.trackingEvents && email.trackingEvents.length > 0 ? "text-emerald-400" : "text-slate-500")} 
                        />
                        <div className="absolute right-0 top-full mt-2 w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[999] p-2 opacity-0 invisible group-hover/track:opacity-100 group-hover/track:visible transition-all text-xs cursor-default" onClick={e => e.stopPropagation()}>
                          <div className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">Tracking Activity</div>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                            {(!email.trackingEvents || email.trackingEvents.length === 0) ? (
                              <div className="text-slate-500 py-2 text-center">No tracking events yet</div>
                            ) : (
                              email.trackingEvents.map((evt: any, i: number) => (
                                <div key={i} className="flex gap-2 text-left">
                                  <div className="mt-0.5">{evt.type === 'open' ? <Eye className="w-3 h-3 text-cyan-400" /> : <MousePointerClick className="w-3 h-3 text-fuchsia-400" />}</div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-white capitalize">{evt.type} {evt.type === 'click' && evt.url && <a href={evt.url} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 underline ml-1 truncate max-w-[120px] inline-block align-bottom px-1">{evt.url}</a>}</div>
                                    <div className="text-slate-500 text-[10px] truncate">{new Date(evt.created_at).toLocaleString()}</div>
                                    {evt.location && <div className="text-slate-400 text-[10px] truncate">{evt.location.city ? `${evt.location.city}, ` : ''}{evt.location.region ? `${evt.location.region}, ` : ''}{evt.location.country}</div>}
                                    <div className="text-slate-600 text-[9px] truncate" title={evt.ip_address}>{evt.ip_address}</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {(email.type === 'scheduled' && email.scheduledAt) && (
                      <div className="relative flex items-center" title={`将在 ${new Date(email.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })} 发送`}>
                        <Timer 
                          className="w-3.5 h-3.5 text-amber-500" 
                        />
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500">
                      {email.type === 'scheduled' && email.scheduledAt ? `Sched: ${new Date(email.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}` : new Date(email.date).toLocaleDateString()}
                    </span>
                    <div className={cn("relative transition-opacity", activeMenu === email.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 hidden md:block")}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === email.id ? null : email.id); }}
                        className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {activeMenu === email.id && (
                        <div className="absolute right-0 top-6 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setTagModalEmail(email.id); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                            <Tag className="w-3 h-3" /> Add Tag
                          </button>
                          <button onClick={() => toggleImportant(email)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                            <Star className="w-3 h-3" /> {email.isImportant ? 'Unmark Important' : 'Mark Important'}
                          </button>
                          <button onClick={() => { setTodoModalEmail(email.id); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Add to Todo
                          </button>
                          <div className="border-t border-slate-700 my-1"></div>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(null);
                            setConfirmDialog({
                              message: 'Are you sure you want to delete this email? Emails associated with a client will be soft-deleted pending admin review.',
                              onConfirm: async () => {
                                if (selectedEmailId === email.id) setSelectedEmailId(null);
                                await useStore.getState().deleteEmails([email.id]);
                                setConfirmDialog(null);
                              }
                            });
                          }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300 flex items-center gap-2">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={cn("text-xs font-medium mb-1 truncate", !email.read && filter === 'inbox' ? "text-slate-200" : "text-slate-400")}>
                  {email.subject}
                </div>
                {email.tags && email.tags.length > 0 && (
                  <div className="flex gap-1 mb-1 overflow-x-auto scrollbar-hide">
                    {email.tags.map(t => (
                      <span key={t} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors hidden md:block" />

      {/* Reading Pane / Compose Pane */}
      <Panel className={cn("flex flex-col bg-slate-950/50 relative", !selectedEmailId && !isComposing && "hidden md:flex")}>
        {isComposing ? (
          <ComposeEmail onClose={() => setIsComposing(false)} initialRecipient={composeDefaults?.recipient} initialSubject={composeDefaults?.subject} originalEmailBody={composeDefaults?.originalEmailBody} />
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
                         <span onClick={() => selectClient(selectedEmail.clientId!)} className="bg-slate-800 px-2 py-0.5 rounded text-cyan-400 border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors">
                           {clients.find(c => c.id === selectedEmail.clientId)?.name || 'Linked'}
                         </span>
                       ) : (
                         <button onClick={handleCreateLead} className="text-cyan-500 flex items-center gap-1 hover:text-cyan-400 bg-slate-800/50 rounded px-1.5 py-0.5">
                           <UserPlus className="w-3 h-3" /> New Lead
                         </button>
                       )}
                    </div>
                    {(selectedEmail.cc || selectedEmail.bcc) && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {selectedEmail.cc && <span>Cc: {selectedEmail.cc}</span>}
                        {selectedEmail.bcc && <span>Bcc: {selectedEmail.bcc}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => {
                   setConfirmDialog({
                     message: 'Are you sure you want to delete this email? Emails associated with a client will be soft-deleted pending admin review.',
                     onConfirm: async () => {
                       const id = selectedEmail.id;
                       setSelectedEmailId(null);
                       await useStore.getState().deleteEmails([id]);
                       setConfirmDialog(null);
                     }
                   });
                 }} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete">
                   <Trash2 className="w-4 h-4" />
                 </button>
                 <button onClick={() => { setComposeDefaults({ recipient: selectedEmail.sender, subject: `Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`, originalEmailBody: `On ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.senderName || selectedEmail.sender} wrote:<br>${selectedEmail.body || ''}` }); setIsComposing(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Reply">
                   <Reply className="w-4 h-4" />
                 </button>
                 {selectedEmail.clientId && (
                   <button 
                     onClick={handleAddToRag} 
                     disabled={addingToRag}
                     className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded transition-colors flex items-center gap-1"
                     title="Add to Knowledge Base (RAG)"
                   >
                     {addingToRag ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                      addedToRagId === selectedEmail.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : 
                      <Database className="w-4 h-4" />}
                   </button>
                 )}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto scrollbar-thin flex-1">
               {/* Tracking Details */}
               {((selectedEmail.type === 'sent' || selectedEmail.type === 'scheduled' || selectedEmail.type === 'outbound') && (selectedEmail.body?.includes('/api/track/open/') || selectedEmail.enableTracking)) && (
                 <div className="mb-6 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                     <Radar className="w-4 h-4 text-emerald-400" /> Interaction Tracking Activity
                   </div>
                   {(!selectedEmail.trackingEvents || selectedEmail.trackingEvents.length === 0) ? (
                     <div className="text-sm text-slate-500 py-2">No tracking events have been recorded yet.</div>
                   ) : (
                   <div className="space-y-3">
                     {selectedEmail.trackingEvents.map((evt: any, i: number) => (
                       <div key={i} className="flex flex-wrap items-center gap-4 text-sm bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
                         <div className="flex items-center gap-2 min-w-[100px]">
                            {evt.type === 'open' ? <Eye className="w-4 h-4 text-cyan-500" /> : <MousePointerClick className="w-4 h-4 text-fuchsia-500" />}
                            <span className="text-white font-medium capitalize">{evt.type}</span>
                         </div>
                         <div className="flex items-center gap-2 text-slate-400 text-xs min-w-[140px]">
                           <Clock className="w-3.5 h-3.5" />
                           {new Date(evt.created_at).toLocaleString()}
                         </div>
                         {(evt.location?.country || evt.location?.city) && (
                           <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                             {evt.location.city ? `${evt.location.city}, ` : ''}{evt.location.region ? `${evt.location.region}, ` : ''}{evt.location.country}
                           </div>
                         )}
                         <div className="text-slate-500 text-xs ml-auto font-mono bg-slate-800 px-2 py-0.5 rounded" title={evt.user_agent}>
                           {evt.ip_address}
                         </div>
                         {evt.type === 'click' && evt.url && (
                           <div className="w-full mt-1.5 text-xs">
                             <span className="text-slate-500 mr-2">Link Clicked:</span>
                             <a href={evt.url} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 hover:text-fuchsia-300 underline break-all">{evt.url}</a>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                   )}
                 </div>
               )}

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
               <div 
                 className="text-sm bg-white text-black p-6 rounded-lg leading-relaxed overflow-x-auto"
                 dangerouslySetInnerHTML={{ __html: (selectedEmail.body || '').replace(/<img[^>]*\/api\/track\/open\/[^>]*>/g, '') }}
               />

               {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                 <div className="mt-8 border-t border-slate-800/50 pt-4">
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3">
                     <Paperclip className="w-4 h-4" /> Attachments
                   </div>
                   <div className="flex flex-wrap gap-3">
                     {selectedEmail.attachments.map((att, idx) => (
                       <a href={att.url} key={idx} className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 px-3 py-2 rounded-lg text-sm text-slate-300 transition-colors">
                         <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                         <span>{att.name}</span>
                       </a>
                     ))}
                   </div>
                 </div>
               )}

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
                   {commentAttachments.length > 0 && (
                     <div className="flex flex-wrap gap-2 px-1 mb-2">
                       {commentAttachments.map((f, idx) => (
                         <div key={idx} className="relative group overflow-hidden border border-slate-700 rounded-md bg-slate-900 w-16 h-16 shrink-0">
                           {f.type.startsWith('image/') ? (
                             <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 p-1 text-center break-words">
                               <Paperclip className="w-3 h-3 mb-1" />
                               <span className="truncate w-full line-clamp-2">{f.name}</span>
                             </div>
                           )}
                           <button 
                             onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== idx))}
                             className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <X className="w-3 h-3" />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                   <div className="flex justify-between items-center pt-2">
                     <div className="flex items-center gap-2 shrink-0 pb-1">
                       <button onClick={() => setShowCommentAttachmentModal(true)} className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-md transition-colors flex items-center gap-1" title="Attach Files">
                         <Paperclip className="w-4 h-4" />
                         {commentAttachments.length > 0 && <span className="text-xs bg-cyan-600 text-white px-1.5 py-0.5 rounded-full">{commentAttachments.length}</span>}
                       </button>
                     </div>
                     <button
                       onClick={() => { 
                         if (commentText.trim() || commentAttachments.length > 0) { 
                           const attsPayload = commentAttachments.length > 0 
                             ? commentAttachments.map(f => ({
                                 id: `file${Date.now()}_${Math.random()}`,
                                 name: f.name,
                                 type: (f.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
                                 url: URL.createObjectURL(f)
                               })) 
                             : undefined;
                           if (commentText.trim() || attsPayload) {
                             addEmailComment(selectedEmail.id, commentText || 'Uploaded attachment(s)', attsPayload); 
                           }
                           setCommentText(''); 
                           setCommentAttachments([]);
                         } 
                       }}
                       disabled={!commentText.trim() && commentAttachments.length === 0}
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
      </Panel>

      {isCreatingLead && selectedEmail && (
        <ClientFormModal
          onClose={() => setIsCreatingLead(false)}
          initialData={{
            name: filter === 'inbox' ? (selectedEmail.senderName || selectedEmail.sender.split('@')[0]) : (selectedEmail.recipient.split('@')[0]),
            company: 'Unknown',
            country: 'Unknown',
            status: 'Leads',
            tags: [],
            contactMethods: [{ type: 'email', value: filter === 'inbox' ? selectedEmail.sender : selectedEmail.recipient }]
          }}
          onSave={(newClientId) => {
            editEmail(selectedEmail.id, { clientId: newClientId });
            selectClient(newClientId);
          }}
        />
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Confirm Action</h3>
            <p className="text-slate-300 text-sm mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog(null)} 
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-500 rounded transition-colors shadow shadow-red-600/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {alertDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-cyan-400 mb-4">Notification</h3>
            <p className="text-slate-300 text-sm mb-6">{alertDialog}</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAlertDialog(null)}
                className="px-4 py-2 text-sm bg-cyan-600 text-white hover:bg-cyan-500 rounded transition-colors shadow shadow-cyan-600/20"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showCommentAttachmentModal && (
        <UploadAttachmentModal 
          onClose={() => setShowCommentAttachmentModal(false)}
          onUpload={(files) => {
            setCommentAttachments(prev => [...prev, ...files]);
            setShowCommentAttachmentModal(false);
          }}
        />
      )}

      {tagModalEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-4">Add Tag</h3>
            <input 
              type="text" 
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="e.g. VIP, Urgent"
              className="w-full bg-slate-800 border-slate-700 text-white rounded p-2 mb-4"
              autoFocus
              onKeyDown={e => { if(e.key === 'Enter') submitTag(); else if(e.key === 'Escape') setTagModalEmail(null) }}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setTagModalEmail(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button onClick={submitTag} disabled={!tagInput.trim()} className="px-4 py-2 bg-cyan-600 text-white rounded-md disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}

      {todoModalEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Add Email to Todo</h3>
            <label className="text-xs text-slate-400 block mb-1">Due Date & Time</label>
            <input 
              type="datetime-local" 
              value={todoAt}
              onChange={e => setTodoAt(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 mb-4"
            />
            <label className="text-xs text-slate-400 block mb-1">Note (Optional)</label>
            <textarea 
              value={todoNote}
              onChange={e => setTodoNote(e.target.value)}
              placeholder="E.g. Follow up with a proposal..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 mb-4 min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setTodoModalEmail(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button onClick={submitTodo} disabled={!todoAt} className="px-4 py-2 bg-cyan-600 text-white rounded-md disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </PanelGroup>
  );
}

function ComposeEmail({ onClose, initialRecipient = '', initialSubject = '', originalEmailBody = '' }: { onClose: () => void, initialRecipient?: string, initialSubject?: string, originalEmailBody?: string }) {
  const { clients, emails, logs, addEmail, addLog, outboxConfigs, timezone } = useStore();
  const [selectedOutboxId, setSelectedOutboxId] = useState<string>(outboxConfigs?.[0]?.id || '');
  const [recipient, setRecipient] = useState(initialRecipient);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPurpose, setLoadingPurpose] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [trackEmail, setTrackEmail] = useState(true);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [caretCoords, setCaretCoords] = useState<{top: number, left: number, matchText: string} | null>(null);
  const [quoteCoords, setQuoteCoords] = useState<{top: number, left: number, matchText: string, search: string} | null>(null);

  const { quotes } = useStore();

  const updateCaretPosition = () => {
    if (!bodyRef.current) return;
    const aiPattern = /\/ai:(.*?)(?=\n|$)/g;
    const quotePattern = /\/quote:(.*?)(?=\n|$)/g;
    const cursorIdx = bodyRef.current.selectionStart;
    
    let match;
    let foundAiMatch = null;
    let foundQuoteMatch = null;
    let text = bodyRef.current.value;

    // Check AI pattern
    while ((match = aiPattern.exec(text)) !== null) {
      const startIdx = match.index;
      const endIdx = match.index + match[0].length;
      if (cursorIdx >= startIdx && cursorIdx <= endIdx + 1) {
        foundAiMatch = match;
        break;
      }
    }

    // Check Quote pattern if AI not found
    if (!foundAiMatch) {
      // reset lastIndex for regex
      quotePattern.lastIndex = 0;
      while ((match = quotePattern.exec(text)) !== null) {
        const startIdx = match.index;
        const endIdx = match.index + match[0].length;
        if (cursorIdx >= startIdx && cursorIdx <= endIdx + 1) {
          foundQuoteMatch = match;
          break;
        }
      }
    }

    if (foundAiMatch) {
       const endIdx = foundAiMatch.index + foundAiMatch[0].length;
       const coords = getCaretCoordinates(bodyRef.current, endIdx);
       setCaretCoords({ top: coords.top + 20, left: coords.left, matchText: foundAiMatch[0] });
       setQuoteCoords(null);
    } else if (foundQuoteMatch) {
       const endIdx = foundQuoteMatch.index + foundQuoteMatch[0].length;
       const coords = getCaretCoordinates(bodyRef.current, endIdx);
       setQuoteCoords({ top: coords.top + 20, left: coords.left, matchText: foundQuoteMatch[0], search: foundQuoteMatch[1].trim() });
       setCaretCoords(null);
    } else {
       setCaretCoords(null);
       setQuoteCoords(null);
    }
  };

  const handleInsertQuote = (quoteId: string, quoteNumber: string) => {
    if (!quoteCoords) return;
    const link = `${window.location.origin}/quote/${quoteId}`;
    const insertText = `${quoteNumber} <${link}>`;
    setBody(prev => prev.replace(quoteCoords.matchText, insertText));
    setQuoteCoords(null);
  };


  useEffect(() => {
    updateCaretPosition();
  }, [body]);

  // Auto-associate client if recipient matches the first given recipient
  const firstRecipient = recipient.split(',')[0]?.trim() || '';
  const matchedClient = clients.find(c => 
    c.contactMethods?.some(m => m.type === 'email' && m.value.toLowerCase() === firstRecipient.toLowerCase())
  );

  const { llmConfigs, activeLLMId, llmMappings, language } = useStore();
  
  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(l => l.id === id) || null;
  };

  const handleGeneratePurpose = async () => {
    if (!matchedClient) return;
    setLoadingPurpose(true);
    const clientLogs = logs.filter(l => l.clientId === matchedClient.id).map(l => `[${new Date(l.date).toLocaleDateString()}] ${l.content}`);
    const clientEmails = emails.filter(e => e.clientId === matchedClient.id).map(e => `[${e.type} - ${new Date(e.date).toLocaleDateString()}] ${e.subject}\n${e.body}`);

    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
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

  const senderConfig = outboxConfigs.find(c => c.id === selectedOutboxId);
  const senderEmail = senderConfig?.fromEmail || 'me@soho.com';
  const senderName = senderConfig?.fromName || 'Alex.W';

  const doSchedule = () => {
    if (!recipient || !subject || !scheduleDateTime) return;
    
    // Parse the local datetime string into UTC, treating it as if it was in `timezone`
    // scheduleDateTime format: "YYYY-MM-DDTHH:mm"
    let scheduledAt = new Date(scheduleDateTime).toISOString();
    try {
      if (timezone && timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone) {
        // We have a custom timezone. We need to find the offset of `timezone` at the given time.
        // A simple trick is to format the date in the target timezone and calculate the offset.
        const dt = new Date(scheduleDateTime);
        const invTzDateStr = dt.toLocaleString('en-US', { timeZone: timezone });
        const invTzDate = new Date(invTzDateStr);
        const diff = dt.getTime() - invTzDate.getTime();
        scheduledAt = new Date(dt.getTime() + diff).toISOString();
      }
    } catch(e) {
      console.warn("Timezone parsing failed", e);
    }
    
    // We add attachments if any
    const attachmentsPayload = attachments.map(a => ({
      id: `att_${Date.now()}_${Math.random()}`,
      name: a.name,
      type: (a.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
      url: URL.createObjectURL(a)
    }));

    const finalBody = originalEmailBody ? `${body}<br><br><div class="gmail_quote" dir="ltr"><blockquote style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">${originalEmailBody}</blockquote></div>` : body;

    addEmail({
      recipient,
      cc: cc || undefined,
      bcc: bcc || undefined,
      sender: senderEmail,
      senderName: senderName,
      subject,
      body: finalBody,
      read: true,
      type: 'scheduled',
      clientId: matchedClient?.id,
      scheduledAt,
      attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
      enableTracking: trackEmail
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

    const attachmentsPayload = attachments.map(a => ({
      id: `att_${Date.now()}_${Math.random()}`,
      name: a.name,
      type: (a.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
      url: URL.createObjectURL(a)
    }));

    const finalBody = originalEmailBody ? `${body}<br><br><div class="gmail_quote" dir="ltr"><blockquote style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">${originalEmailBody}</blockquote></div>` : body;

    addEmail({
      recipient,
      cc: cc || undefined,
      bcc: bcc || undefined,
      sender: senderEmail,
      senderName: senderName,
      subject,
      body: finalBody,
      read: true,
      type: 'sent',
      clientId: matchedClient?.id,
      attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
      enableTracking: trackEmail
    });
    if (matchedClient) {
      addLog(matchedClient.id, `Sent Email: ${subject}${purpose ? ` (Purpose: ${purpose})` : ''}`);
    }
    onClose();
  };

  const handleOptimizeBody = async () => {
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Please politely optimize the following email draft for clarity, professional tone, and grammatical correctness. Output ONLY the resulting optimized text, nothing else:\n\n${body}`,
          context: { 
             userLanguagePreference: language === 'zh' ? 'Chinese' : 'English'
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
      if (data.result) {
        setBody(data.result);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to optimize email body.");
    } finally {
      setLoading(false);
    }
  };

  const handleInlineAI = async (matchText: string) => {
    const aiPattern = /\/ai:(.*?)(?=\n|$)/;
    const match = matchText.match(aiPattern);
    if (!match) {
      alert("No /ai:prompt found in the email body.");
      return;
    }
    
    setLoading(true);
    const prompt = match[1].trim();
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Write an email snippet or sentence based on this instruction: ${prompt}`,
          context: { 
             currentEmailBodyPreview: body.replace(matchText, '[Generate Here]'),
             userLanguagePreference: language === 'zh' ? 'Chinese' : 'English'
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
      setBody(prev => prev.replace(matchText, data.result));
      setCaretCoords(null);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Draft an email. Subject: ${subject || "Follow up"}. Purpose for this email: ${purpose || 'General follow up'}`,
          context: { 
            client: matchedClient,
            historicalFollowUpLogs: clientLogs,
            lastReceivedEmailBody: lastEmailReceived?.body || 'No previous received emails'
          },
          llmConfig: getLLMConfig('drafting')
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
      
      <div className="p-4 border-b border-slate-800 space-y-2">
        <div className="flex items-start gap-3 w-full">
          <div className="flex-1 w-full">
            <AddressInput 
              label="To:" 
              value={recipient} 
              onChange={setRecipient} 
              placeholder="Type email or @name" 
              autoFocus 
            />
          </div>
          <div className="flex items-center gap-2 pt-1.5 shrink-0">
            {matchedClient && (
              <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                Matched: {matchedClient.name}
              </span>
            )}
            <button 
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-0.5"
            >
              Cc/Bcc {showCcBcc ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
          </div>
        </div>

        {showCcBcc && (
          <>
            <div className="flex-1 w-full">
              <AddressInput 
                label="Cc:" 
                value={cc} 
                onChange={setCc} 
                placeholder="Type email or @name" 
              />
            </div>
            <div className="flex-1 w-full">
              <AddressInput 
                label="Bcc:" 
                value={bcc} 
                onChange={setBcc} 
                placeholder="Type email or @name" 
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-3 pt-1 border-t border-transparent focus-within:border-indigo-500/30">
          <label className="text-xs font-bold text-slate-500 w-12 text-right">From:</label>
          <select 
            value={selectedOutboxId}
            onChange={(e) => setSelectedOutboxId(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none focus:ring-0 pb-1 w-full truncate"
          >
            {outboxConfigs.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.name} ({c.fromEmail})</option>
            ))}
            {outboxConfigs.length === 0 && <option value="" className="bg-slate-900">Default Backend Sender (me@soho.com)</option>}
          </select>
        </div>
        <div className="flex items-center gap-3 pt-1 border-t border-transparent focus-within:border-indigo-500/30">
          <label className="text-xs font-bold text-slate-500 w-12 text-right">Subject:</label>
          <input 
            type="text" 
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-600 font-medium pb-1" 
            placeholder="Enter subject here..." 
          />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col p-4 relative overflow-y-auto">
        <textarea 
          ref={bodyRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onClick={updateCaretPosition}
          onKeyUp={updateCaretPosition}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && caretCoords && !loading) {
              e.preventDefault();
              handleInlineAI(caretCoords.matchText);
            }
          }}
          className="flex-1 w-full bg-transparent text-sm text-slate-300 resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed scrollbar-thin relative z-0"
          placeholder="Write your email here... Type /ai:prompt to generate content inline."
        />
        
        {/* Optimize Button */}
        <button
          onClick={handleOptimizeBody}
          disabled={loading || !body.trim()}
          className="absolute bottom-4 right-6 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center disabled:opacity-50 group z-10"
          title="Optimize Content with AI"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform"/>}
        </button>

        {caretCoords && (
          <div className="absolute z-10" style={{ top: caretCoords.top, left: Math.min(caretCoords.left, document.body.clientWidth - 150) }}>
             <button 
                onClick={() => handleInlineAI(caretCoords.matchText)} 
                disabled={loading}
                className="text-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1.5 rounded shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all font-bold animate-pulse hover:animate-none group disabled:opacity-80 disabled:animate-none"
                title="Generate with AI"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform"/>}
                {loading ? 'Generating...' : 'Generate AI'} {!loading && <span className="opacity-70 font-normal ml-1 border border-white/20 px-1 rounded text-[10px]">Enter</span>}
              </button>
          </div>
        )}
        {quoteCoords && (
          <div className="absolute z-10 bg-slate-800 border border-slate-700 rounded-lg shadow-lg w-64 overflow-hidden" style={{ top: quoteCoords.top, left: Math.min(quoteCoords.left, document.body.clientWidth - 260) }}>
             <div className="px-3 py-2 bg-slate-900 border-b border-slate-700 text-xs font-bold text-slate-400">
               Select Quote
             </div>
             <div className="max-h-48 overflow-y-auto">
               {quotes.filter(q => q.quoteNumber.toLowerCase().includes(quoteCoords.search.toLowerCase())).map(quote => (
                 <button
                   key={quote.id}
                   onClick={() => handleInsertQuote(quote.id, quote.quoteNumber)}
                   className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-cyan-950/50 hover:text-cyan-400 flex items-center justify-between"
                 >
                   <span className="font-mono">{quote.quoteNumber}</span>
                   <span className="text-[10px] text-slate-500">{quote.status}</span>
                 </button>
               ))}
               {quotes.filter(q => q.quoteNumber.toLowerCase().includes(quoteCoords.search.toLowerCase())).length === 0 && (
                 <div className="px-3 py-2 text-xs text-slate-500 text-center">No matching quotes</div>
               )}
             </div>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group overflow-hidden border border-slate-700 rounded-md bg-slate-800 w-24 h-24 shrink-0 flex items-center justify-center">
                {att.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(att)} alt={att.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 p-2 text-center break-words">
                    <Paperclip className="w-5 h-5 mb-2 text-slate-500" />
                    <span className="truncate w-full line-clamp-2">{att.name}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{(att.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}
                <button 
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
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
          <div className="flex items-center gap-2">
            <button 
              onClick={handleMagicDraft} 
              disabled={loading || !recipient}
              className="text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors font-medium"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
              AI Draft Full Email
            </button>
            
            <button 
              onClick={() => setShowAttachmentModal(true)}
              className="text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors font-medium cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5"/>
              Attach
            </button>

            <button
              onClick={() => setTrackEmail(!trackEmail)}
              className={cn(
                "text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-medium",
                trackEmail 
                  ? "bg-emerald-950/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50" 
                  : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400 hover:bg-slate-700"
              )}
              title={trackEmail ? "Email tracking enabled" : "Email tracking disabled"}
            >
              <Radar className="w-3.5 h-3.5" />
              Track
            </button>
          </div>

          
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
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400">Select Date & Time</label>
                    <span className="text-[10px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap pl-2 text-right" title={timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}>
                      {timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </span>
                  </div>
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
      {showAttachmentModal && (
        <UploadAttachmentModal 
          onClose={() => setShowAttachmentModal(false)}
          onUpload={(files) => {
            setAttachments(prev => [...prev, ...files]);
            setShowAttachmentModal(false);
          }}
        />
      )}
    </div>
  );
}
