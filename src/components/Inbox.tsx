import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore, EmailMessage } from '../store';
import { useAuthStore } from '../authStore';
import { Mail, Send, Reply, Trash2, ArrowLeft, RefreshCw, PenLine, Edit3, User, Sparkles, Loader2, Search, Tag, CalendarClock, UserPlus, MessageSquare, MessageCircle, Paperclip, ChevronDown, ChevronUp, X, Database, CheckCircle2, MoreHorizontal, Star, Clock, Activity, Eye, MousePointerClick, Radar, Timer, Bold, Italic, List, Link2, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { CommentItem } from './CommentItem';
import { AddressInput } from './AddressInput';
import { ClientFormModal } from './ClientFormModal';
import { UploadAttachmentModal } from './UploadAttachmentModal';
import { MediaSelectorModal } from './MediaSelectorModal';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { WhatsAppChatModal } from './WhatsAppChatModal';
import { AgentContextSuggestions } from './AgentContextSuggestions';
import { getCustomerOutputLanguage } from '../lib/language';

interface InboxWhatsAppConversation {
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

export function Inbox() {
  const { emails, markEmailRead, clients, addEmail, addLog, addClient, editEmail, addEmailComment, addEmailReply, addQuest, selectClient, addKnowledgeItem, selectedEmailId, selectEmail, notify } = useStore();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: 'inbox-layout' });
  const [filter, setFilter] = useState<'inbox' | 'sent' | 'scheduled' | 'drafts'>('inbox');
  const [emailListMode, setEmailListMode] = useState<'list' | 'conversation'>('list');
  const [search, setSearch] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<{recipient: string, subject: string, originalEmailBody?: string, initialBody?: string, draftId?: string, replyToEmailId?: string, initialOutboxId?: string} | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [showCommentAttachmentModal, setShowCommentAttachmentModal] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [addingToRag, setAddingToRag] = useState(false);
  const [addedToRagId, setAddedToRagId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [todoModalEmail, setTodoModalEmail] = useState<string | null>(null);
  const [todoAt, setTodoAt] = useState('');
  const [todoNote, setTodoNote] = useState('');
  const [tagModalEmail, setTagModalEmail] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [whatsappConversations, setWhatsappConversations] = useState<InboxWhatsAppConversation[]>([]);
  const [selectedWhatsAppPhone, setSelectedWhatsAppPhone] = useState<string | null>(null);
  const [isStartingWhatsApp, setIsStartingWhatsApp] = useState(false);
  const [newWhatsAppPhone, setNewWhatsAppPhone] = useState('');
  const whatsappSyncInFlightRef = useRef(false);

  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [alertDialog, setAlertDialog] = useState<string | null>(null);
  const isInboundCustomerEmail = (email: EmailMessage) => ['inbox', 'inbound'].includes(email.type);

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const fetchCachedWhatsAppConversations = async (activeSearch = search) => {
    try {
      const res = await fetch(`/api/whatsapp-hub/conversations?search=${encodeURIComponent(activeSearch)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWhatsappConversations(data.conversations || []);
      }
    } catch (error) {
      console.warn('WhatsApp conversations unavailable in unified inbox', error);
    }
  };

  const syncWhatsAppConversations = async (activeSearch = search) => {
    if (whatsappSyncInFlightRef.current) return;
    whatsappSyncInFlightRef.current = true;
    try {
      const res = await fetch('/api/whatsapp-hub/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ limit: 100 })
      });
      if (res.ok) {
        await fetchCachedWhatsAppConversations(activeSearch);
      }
    } catch (error) {
      console.warn('WhatsApp background sync unavailable in unified inbox', error);
    } finally {
      whatsappSyncInFlightRef.current = false;
    }
  };

  const loadWhatsAppConversations = async () => {
    const activeSearch = search;
    await fetchCachedWhatsAppConversations(activeSearch);
    void syncWhatsAppConversations(activeSearch);
  };

  useEffect(() => {
    const timeout = window.setTimeout(loadWhatsAppConversations, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const filteredEmails = emails.filter(e => {
    // Support both new ('inbox'/'sent') and legacy ('inbound'/'outbound') types
    const typeMatch = (filter === 'inbox' && (e.type === 'inbox' || e.type === 'inbound')) ||
                      (filter === 'sent' && (e.type === 'sent' || e.type === 'outbound')) ||
                      (filter === 'scheduled' && e.type === 'scheduled') ||
                      (filter === 'drafts' && e.type === 'draft');
    
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

  const filteredWhatsAppConversations = filter === 'inbox'
    ? whatsappConversations.filter(conversation => {
        const termsToMatch = [...searchTags];
        if (search.trim()) {
          termsToMatch.push(...search.trim().toLowerCase().split(/\s+/));
        }
        if (termsToMatch.length === 0) return true;
        const haystack = [
          conversation.targetPhone,
          conversation.clientName || '',
          conversation.clientCompany || '',
          conversation.lastBody || '',
          ...(conversation.tags || [])
        ].join(' ').toLowerCase();
        return termsToMatch.every(term => {
          const normalized = term.toLowerCase();
          return normalized.startsWith('#')
            ? (conversation.tags || []).some(tag => tag.toLowerCase() === normalized)
            : haystack.includes(normalized);
        });
      })
    : [];

  const emailConversationGroups = useMemo(() => {
    const stripHtml = (value: string) => value.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const findClientForEmail = (email: EmailMessage) => {
      if (email.clientId) return clients.find(client => client.id === email.clientId) || null;
      const addresses = [email.sender, email.recipient].map(value => value?.toLowerCase()).filter(Boolean);
      return clients.find(client => client.contactMethods?.some(method => (
        method.type === 'email' && addresses.includes(method.value.toLowerCase())
      ))) || null;
    };
    const contactAddress = (email: EmailMessage) => {
      if (email.type === 'inbox' || email.type === 'inbound') return email.sender;
      return email.recipient || email.sender;
    };
    const groups = new Map<string, {
      key: string;
      title: string;
      subtitle: string;
      clientId?: string;
      emails: EmailMessage[];
      latest: EmailMessage;
      unreadCount: number;
    }>();

    filteredEmails.forEach(email => {
      const client = findClientForEmail(email);
      const address = contactAddress(email);
      const key = client ? `client:${client.id}` : `email:${(address || 'unknown').toLowerCase()}`;
      const existing = groups.get(key);
      const nextEmails = existing ? [...existing.emails, email] : [email];
      nextEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      groups.set(key, {
        key,
        title: client?.name || client?.company || address || 'Unknown contact',
        subtitle: client ? [client.company, client.country].filter(Boolean).join(' · ') || address : address,
        clientId: client?.id,
        emails: nextEmails,
        latest: nextEmails[0],
        unreadCount: nextEmails.filter(item => !item.read && (item.type === 'inbox' || item.type === 'inbound')).length
      });
    });

    return Array.from(groups.values()).sort((a, b) => new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime()).map(group => ({
      ...group,
      preview: stripHtml(group.latest.body || '').slice(0, 140)
    }));
  }, [filteredEmails, clients]);

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
        if (selectedEmailId && selectedIds.has(selectedEmailId)) selectEmail(null);
        setConfirmDialog(null);
      }
    });
  };

  const handleSync = async (options: { silent?: boolean } = {}) => {
    if (syncInFlightRef.current) return;
    const configs = useStore.getState().inboxConfigs;
    if (!configs || configs.length === 0) {
      if (!options.silent) notify("No Inbox configurations found. Please add one in Settings.", 'warning');
      return;
    }
    
    syncInFlightRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
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
        } else if (!options.silent) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to sync emails.');
        }
      }
      if (totalSynced > 0) {
        useStore.getState().fetchEmails();
      } else if (!options.silent) {
        useStore.getState().fetchEmails();
      }
      loadWhatsAppConversations();
      setLastSyncAt(new Date().toISOString());
      if (!options.silent) notify(`Sync complete. Fetched ${totalSynced} new email(s).`, 'success');
    } catch (e) {
      console.error(e);
      setSyncError(e instanceof Error ? e.message : 'Error syncing emails.');
      if (!options.silent) notify(e instanceof Error ? e.message : 'Error syncing emails.', 'error');
    } finally {
      setIsSyncing(false);
      syncInFlightRef.current = false;
    }
  };

  const toggleGroupSelection = (e: React.MouseEvent, ids: string[]) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    const allSelected = ids.every(id => newSet.has(id));
    ids.forEach(id => {
      if (allSelected) newSet.delete(id);
      else newSet.add(id);
    });
    setSelectedIds(newSet);
  };

  useEffect(() => {
    const initialSync = window.setTimeout(() => handleSync({ silent: true }), 15000);
    return () => {
      window.clearTimeout(initialSync);
    };
  }, []);

  const selectedEmail = emails.find(e => e.id === selectedEmailId);
  const matchWhatsAppClient = (phone: string) => clients.find(client => client.contactMethods?.some(method => (
    ['whatsapp', 'phone'].includes(method.type) && method.value.replace(/[^0-9]/g, '').endsWith(phone.slice(-8))
  )));
  const activeWhatsAppConversation = selectedWhatsAppPhone
    ? whatsappConversations.find(conversation => conversation.targetPhone === selectedWhatsAppPhone)
    : null;
  const activeWhatsAppClient = activeWhatsAppConversation
    ? clients.find(client => client.id === activeWhatsAppConversation.clientId) || matchWhatsAppClient(activeWhatsAppConversation.targetPhone) || null
    : null;

  const handleSelect = (id: string) => {
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    setSelectedWhatsAppPhone(null);
    selectEmail(id);
    markEmailRead(id);
  };

  const handleSelectWhatsApp = (conversation: InboxWhatsAppConversation) => {
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    selectEmail(null);
    setSelectedWhatsAppPhone(conversation.targetPhone);
  };

  const handleDeleteWhatsAppConversation = (conversation: InboxWhatsAppConversation) => {
    setConfirmDialog({
      message: `Are you sure you want to delete this WhatsApp conversation with ${conversation.clientName || conversation.targetPhone}? This will remove the saved conversation and messages from this system.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/whatsapp-hub/conversations/${encodeURIComponent(conversation.id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Failed to delete WhatsApp conversation.');
          setWhatsappConversations(prev => prev.filter(item => item.id !== conversation.id));
          if (selectedWhatsAppPhone === conversation.targetPhone) setSelectedWhatsAppPhone(null);
          notify('WhatsApp conversation deleted.', 'success');
        } catch (error) {
          notify(error instanceof Error ? error.message : 'Failed to delete WhatsApp conversation.', 'error');
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  const startNewWhatsApp = () => {
    const phone = newWhatsAppPhone.replace(/[^0-9]/g, '');
    if (!phone) return;
    setSelectedWhatsAppPhone(phone);
    setIsStartingWhatsApp(false);
    setNewWhatsAppPhone('');
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
    <PanelGroup id="inbox-layout" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} orientation="horizontal" className="flex-1 overflow-hidden bg-slate-900 border-t border-slate-800">
      {/* Sidebar List */}
      <Panel id="inbox-list" defaultSize={320} minSize={250} maxSize={500} className={cn("flex flex-col transition-transform relative z-10", (selectedEmailId || selectedWhatsAppPhone || isStartingWhatsApp) && "hidden md:flex")}>
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
              <button 
                onClick={() => setFilter('drafts')}
                className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", filter === 'drafts' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}
              >
                Drafts
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleSync()}
                disabled={isSyncing}
                className={cn("p-1.5 bg-slate-800 text-slate-300 rounded-md hover:bg-slate-700 transition-colors border border-slate-700", isSyncing && "opacity-50")}
                title="Sync Emails"
              >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              </button>
              <button 
                onClick={() => { setComposeDefaults(null); setIsComposing(true); setIsStartingWhatsApp(false); setSelectedWhatsAppPhone(null); selectEmail(null); }}
                className="p-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
                title="Compose Email"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setIsStartingWhatsApp(true); setIsComposing(false); setSelectedWhatsAppPhone(null); selectEmail(null); }}
                className="p-1.5 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors shadow-lg shadow-green-600/20"
                title="New WhatsApp Message"
              >
                <MessageCircle className="w-4 h-4" />
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
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex bg-slate-950 border border-slate-800 rounded-md p-1">
              <button
                onClick={() => setEmailListMode('list')}
                className={cn("px-2 py-1 rounded text-[10px] font-bold transition-colors", emailListMode === 'list' ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300")}
              >
                List
              </button>
              <button
                onClick={() => setEmailListMode('conversation')}
                className={cn("px-2 py-1 rounded text-[10px] font-bold transition-colors", emailListMode === 'conversation' ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300")}
              >
                By Customer
              </button>
            </div>
            {emailListMode === 'conversation' && (
              <span className="text-[10px] text-slate-500">{emailConversationGroups.length} conversations</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
            <span className="inline-flex min-w-0 items-center gap-1">
              <Timer className={cn("w-3 h-3 shrink-0", isSyncing ? "text-cyan-400" : syncError ? "text-rose-400" : "text-slate-500")} />
              <span className="truncate">
                {isSyncing
                  ? 'Auto syncing emails...'
                  : syncError
                    ? `Auto sync waiting: ${syncError}`
                    : 'Background auto sync is enabled'}
              </span>
            </span>
            {lastSyncAt && (
              <span className="shrink-0">
                Last {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
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
          {filteredEmails.length === 0 && filteredWhatsAppConversations.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500 italic">No conversations found.</div>
          )}
          {filteredWhatsAppConversations.map(conversation => {
            const client = conversation.clientId ? clients.find(c => c.id === conversation.clientId) : matchWhatsAppClient(conversation.targetPhone);
            return (
              <div
                key={`wa_${conversation.id}`}
                onClick={() => handleSelectWhatsApp(conversation)}
                className={cn("cursor-pointer border-b border-slate-800/50 p-4 transition-colors flex gap-3 group relative",
                  selectedWhatsAppPhone === conversation.targetPhone ? "bg-green-950/20" : "hover:bg-slate-800/30"
                )}
              >
                <div className="pt-0.5 flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-green-950/50 border border-green-900/60 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm font-bold truncate text-slate-200">
                      {client?.name || conversation.clientName || conversation.targetPhone}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-500">
                        {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString() : 'WhatsApp'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWhatsAppConversation(conversation);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition-opacity"
                        title="Delete WhatsApp conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-green-400 font-bold uppercase mb-1">
                    WhatsApp {conversation.lastDirection === 'outbound' ? 'sent' : 'inbox'}
                  </div>
                  <div className="text-xs font-medium mb-1 truncate text-slate-400">
                    {conversation.lastBody || 'Media message'}
                  </div>
                  {conversation.tags && conversation.tags.length > 0 && (
                    <div className="flex gap-1 mb-1 overflow-x-auto scrollbar-hide">
                      {conversation.tags.slice(0, 4).map(t => (
                        <span key={t} className="text-[9px] bg-slate-800 text-green-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {emailListMode === 'conversation' && emailConversationGroups.map(group => {
            const groupIds = group.emails.map(email => email.id);
            const groupSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id));
            const groupIndeterminate = groupIds.some(id => selectedIds.has(id)) && !groupSelected;
            return (
              <div
                key={group.key}
                onClick={() => handleSelect(group.latest.id)}
                className={cn("cursor-pointer border-b border-slate-800/50 p-4 transition-colors group relative",
                  selectedEmailId && groupIds.includes(selectedEmailId) ? "bg-cyan-950/20" : "hover:bg-slate-800/30",
                  group.unreadCount > 0 && filter === 'inbox' && "bg-slate-800/40"
                )}
              >
                <div className="flex gap-3">
                  <div
                    className={cn("pt-0.5 transition-opacity", groupSelected || groupIndeterminate ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                    onClick={(e) => toggleGroupSelection(e, groupIds)}
                  >
                    <input
                      type="checkbox"
                      checked={groupSelected}
                      ref={input => {
                        if (input) input.indeterminate = groupIndeterminate;
                      }}
                      onChange={() => {}}
                      className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="pt-0.5 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-cyan-950/50 border border-cyan-900/60 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-cyan-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <div className={cn("text-sm font-bold truncate", group.unreadCount > 0 ? "text-white" : "text-slate-200")}>{group.title}</div>
                        {group.subtitle && <div className="text-[10px] text-slate-500 truncate">{group.subtitle}</div>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {group.unreadCount > 0 && (
                          <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                            {group.unreadCount}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">{new Date(group.latest.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                      <span>{group.emails.length} email{group.emails.length === 1 ? '' : 's'}</span>
                      <span>·</span>
                      <span>{group.latest.type === 'draft' ? 'Draft' : group.latest.type === 'scheduled' ? 'Scheduled' : group.latest.type === 'sent' || group.latest.type === 'outbound' ? 'Latest sent' : 'Latest inbox'}</span>
                    </div>
                    <div className="text-xs font-medium mb-2 truncate text-slate-300">{group.latest.subject}</div>
                    {group.preview && <div className="text-xs text-slate-500 line-clamp-2">{group.preview}</div>}
                    {group.emails.length > 1 && (
                      <div className="mt-3 space-y-1">
                        {group.emails.slice(1, 4).map(email => (
                          <button
                            key={email.id}
                            onClick={(e) => { e.stopPropagation(); handleSelect(email.id); }}
                            className="w-full flex items-center justify-between gap-2 rounded bg-slate-950/60 border border-slate-800 px-2 py-1 text-left hover:border-slate-700"
                          >
                            <span className={cn("min-w-0 truncate text-[11px]", !email.read && (email.type === 'inbox' || email.type === 'inbound') ? "text-slate-100 font-bold" : "text-slate-400")}>{email.subject || '(No Subject)'}</span>
                            <span className="shrink-0 text-[9px] text-slate-600">{new Date(email.date).toLocaleDateString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {emailListMode === 'list' && filteredEmails.map(email => (
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
              <div className="pt-0.5 flex-shrink-0" title="Email">
                <Mail className="w-4 h-4 text-cyan-400" />
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
                    {filter === 'inbox' ? (email.senderName || email.sender) : (filter === 'drafts' ? `Draft: ${email.recipient || '(No Recipient)'}` : email.recipient)}
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
                                if (selectedEmailId === email.id) selectEmail(null);
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
      <Panel id="inbox-content" className={cn("flex flex-col bg-slate-950/50 relative", !selectedEmailId && !selectedWhatsAppPhone && !isComposing && !isStartingWhatsApp && "hidden md:flex")}>
        {isComposing ? (
          <ComposeEmail onClose={() => setIsComposing(false)} initialRecipient={composeDefaults?.recipient} initialSubject={composeDefaults?.subject} initialBody={composeDefaults?.initialBody} originalEmailBody={composeDefaults?.originalEmailBody} draftId={composeDefaults?.draftId} replyToEmailId={composeDefaults?.replyToEmailId} initialOutboxId={composeDefaults?.initialOutboxId} />
        ) : isStartingWhatsApp ? (
          <div className="flex-1 flex flex-col bg-slate-950/50">
            <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/80">
              <button onClick={() => setIsStartingWhatsApp(false)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-green-950/50 border border-green-900/60 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">New WhatsApp Message</div>
                <div className="text-[10px] text-slate-500">Start a WhatsApp conversation from Inbox</div>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <input
                    value={newWhatsAppPhone}
                    onChange={e => setNewWhatsAppPhone(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') startNewWhatsApp(); }}
                    placeholder="+1 555 000 0000"
                    className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-green-500"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsStartingWhatsApp(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                    Cancel
                  </button>
                  <button
                    onClick={startNewWhatsApp}
                    disabled={!newWhatsAppPhone.replace(/[^0-9]/g, '')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-sm font-bold text-white flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Start Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : selectedWhatsAppPhone ? (
          <div className="flex-1 flex flex-col min-h-0">
            {activeWhatsAppConversation && (
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
                <button onClick={() => setSelectedWhatsAppPhone(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-200 truncate">{activeWhatsAppClient?.name || activeWhatsAppConversation.clientName || activeWhatsAppConversation.targetPhone}</div>
                  <div className="text-[10px] text-green-400 font-bold uppercase">WhatsApp conversation</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteWhatsAppConversation(activeWhatsAppConversation)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10"
                  title="Delete WhatsApp conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <WhatsAppChatModal
              embedded
              phone={selectedWhatsAppPhone}
              client={activeWhatsAppClient}
              conversation={activeWhatsAppConversation}
              onClose={() => {
                setSelectedWhatsAppPhone(null);
                loadWhatsAppConversations();
              }}
            />
          </div>
        ) : selectedEmail ? (
          <>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 sticky top-0 md:static backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => selectEmail(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {isInboundCustomerEmail(selectedEmail) ? (selectedEmail.senderName || selectedEmail.sender) : (selectedEmail.type === 'draft' ? `Draft: ${selectedEmail.recipient || '(No Recipient)'}` : selectedEmail.recipient)}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                       {isInboundCustomerEmail(selectedEmail) ? `From: ${selectedEmail.sender}` : (selectedEmail.type === 'draft' ? `To: ${selectedEmail.recipient || '(No Recipient)'}` : `To: ${selectedEmail.recipient}`)}
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
                    {isInboundCustomerEmail(selectedEmail) && (selectedEmail.senderIp || selectedEmail.senderCountry) && (
                      <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        {selectedEmail.senderIp && (
                          <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">
                            IP: {selectedEmail.senderIp}
                          </span>
                        )}
                        {selectedEmail.senderCountry && (
                          <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70 text-emerald-300">
                            {selectedEmail.senderCountry}
                          </span>
                        )}
                      </div>
                    )}
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
                       selectEmail(null);
                       await useStore.getState().deleteEmails([id]);
                       setConfirmDialog(null);
                     }
                   });
                 }} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete">
                   <Trash2 className="w-4 h-4" />
                 </button>
                 {selectedEmail.type === 'draft' ? (
                   <button 
                     onClick={() => { 
                       setComposeDefaults({ 
                         recipient: selectedEmail.recipient, 
                         subject: selectedEmail.subject, 
                         initialBody: selectedEmail.body,
                         draftId: selectedEmail.id,
                         initialOutboxId: selectedEmail.outboxConfigId
                       }); 
                       setIsComposing(true); 
                     }} 
                     className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" 
                     title="Edit Draft"
                   >
                     <PenLine className="w-4 h-4" />
                   </button>
                 ) : (
                   <button onClick={() => { setComposeDefaults({ recipient: selectedEmail.sender, subject: `Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`, originalEmailBody: `On ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.senderName || selectedEmail.sender} wrote:<br>${selectedEmail.body || ''}`, replyToEmailId: selectedEmail.id }); setIsComposing(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Reply">
                     <Reply className="w-4 h-4" />
                   </button>
                 )}
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

               <AgentContextSuggestions
                 channel="email"
                 cacheKey={`email:${selectedEmail.id}`}
                 clientId={selectedEmail.clientId}
                 emailAddress={isInboundCustomerEmail(selectedEmail) ? selectedEmail.sender : selectedEmail.recipient}
                 defaultAnalysisMode={['sent', 'outbound', 'scheduled'].includes(selectedEmail.type) ? 'manual' : undefined}
                 persistedInsight={selectedEmail.agentContextAnalysisKey === `email:${selectedEmail.id}` ? selectedEmail.agentContextAnalysis : undefined}
                 persistedInsightKey={selectedEmail.agentContextAnalysisKey}
                 subject={selectedEmail.subject}
                 body={selectedEmail.body}
                 clientName={selectedEmail.clientId ? clients.find(c => c.id === selectedEmail.clientId)?.name : undefined}
                 hasClient={!!selectedEmail.clientId}
                 hasKnowledge={addedToRagId === selectedEmail.id}
                 onDraftReply={() => {
                   setComposeDefaults({
                     recipient: isInboundCustomerEmail(selectedEmail) ? selectedEmail.sender : selectedEmail.recipient,
                     subject: `Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`,
                     originalEmailBody: `On ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.senderName || selectedEmail.sender} wrote:<br>${selectedEmail.body || ''}`,
                     initialBody: '',
                     replyToEmailId: selectedEmail.id
                   });
                   setIsComposing(true);
                 }}
                 onAddComment={() => addEmailComment(
                   selectedEmail.id,
                   `Agent suggestion: ${selectedEmail.subject || 'Follow up this conversation'}`
                 )}
                 onCreateLead={!selectedEmail.clientId ? handleCreateLead : undefined}
                 onAddToKnowledge={selectedEmail.clientId ? handleAddToRag : undefined}
                 onSaveAnalysis={(key, insight) => editEmail(selectedEmail.id, {
                   agentContextAnalysis: insight,
                   agentContextAnalysisKey: key
                 })}
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

const escapeEmailHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const plainTextToEmailHtml = (value: string) => escapeEmailHtml(value)
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .split(/\n{2,}/)
  .map(part => `<p>${part.replace(/\n/g, '<br>') || '<br>'}</p>`)
  .join('');

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);
const normalizeEmailEditorHtml = (value: string) => {
  if (!value?.trim()) return '';
  return looksLikeHtml(value) ? value : plainTextToEmailHtml(value);
};
const emailHtmlToText = (value: string) => value
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ')
  .trim();
const emailHtmlHasContent = (value: string) => !!emailHtmlToText(value) || /<img\b/i.test(value || '');

function EmailRichTextEditor({
  value,
  onChange,
  loading,
  originalEmailBody,
  quotes,
  onOptimize,
  onInlineAI
}: {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  originalEmailBody?: string;
  quotes: any[];
  onOptimize: () => void;
  onInlineAI: (prompt: string, currentHtml: string) => Promise<string>;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showQuoteMenu, setShowQuoteMenu] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [runningInlineAI, setRunningInlineAI] = useState(false);

  useEffect(() => {
    if (!editorRef.current || document.activeElement === editorRef.current) return;
    if (editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value || '';
  }, [value]);

  const syncEditor = () => onChange(editorRef.current?.innerHTML || '');

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncEditor();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    syncEditor();
  };

  const insertImage = (url: string, alt = '') => {
    insertHtml(`<p><img src="${escapeEmailHtml(url)}" alt="${escapeEmailHtml(alt)}" style="max-width:100%;height:auto;border-radius:6px;" /></p>`);
  };

  const findAiCommandNode = () => {
    if (!editorRef.current) return null;
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes.reverse()) {
      const match = node.data.match(/\/ai:([^\n\r<]*)/);
      if (match) {
        return { node, matchText: match[0], prompt: match[1].trim(), index: match.index || 0 };
      }
    }
    return null;
  };

  const runInlineAI = async () => {
    const command = findAiCommandNode();
    if (!command || !command.prompt || runningInlineAI) return;
    setRunningInlineAI(true);
    try {
      const result = await onInlineAI(command.prompt, editorRef.current?.innerHTML || '');
      const range = document.createRange();
      range.setStart(command.node, command.index);
      range.setEnd(command.node, command.index + command.matchText.length);
      range.deleteContents();
      range.insertNode(range.createContextualFragment(normalizeEmailEditorHtml(result)));
      syncEditor();
      editorRef.current?.focus();
    } finally {
      setRunningInlineAI(false);
    }
  };

  const handleLocalImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => insertImage(String(reader.result || ''), file.name);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    runCommand('createLink', url);
    setLinkUrl('');
    setShowLinkForm(false);
  };

  const filteredQuotes = quotes.filter(quote => quote.quoteNumber.toLowerCase().includes(quoteSearch.toLowerCase())).slice(0, 8);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-slate-800 bg-slate-950/70 px-2 py-2">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => runCommand('bold')} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => runCommand('italic')} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => runCommand('insertUnorderedList')} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="List">
          <List className="w-4 h-4" />
        </button>
        <div className="h-6 w-px bg-slate-800 mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowLinkForm(prev => !prev)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="Insert link">
          <Link2 className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="Insert image">
          <ImageIcon className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowMediaSelector(true)} className="px-2.5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white">
          Media
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowQuoteMenu(prev => !prev)} className="px-2.5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white">
          Quote
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={runInlineAI} disabled={loading || runningInlineAI} className="px-2.5 py-2 rounded-lg text-xs font-bold text-cyan-300 hover:bg-cyan-950/40 disabled:text-slate-600">
          {runningInlineAI ? 'Generating...' : '/ai'}
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onOptimize}
            disabled={loading || !emailHtmlHasContent(value)}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.35)]"
            title="Optimize Content with AI"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLocalImage} className="hidden" />
      </div>

      {showLinkForm && (
        <div className="flex items-center gap-2 border-x border-slate-800 bg-slate-950 px-3 py-2">
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink(); }}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
            placeholder="https://example.com"
          />
          <button type="button" onClick={applyLink} className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-xs font-bold text-white">Apply</button>
          <button type="button" onClick={() => setShowLinkForm(false)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300">Cancel</button>
        </div>
      )}

      {showQuoteMenu && (
        <div className="border-x border-slate-800 bg-slate-950 px-3 py-2 space-y-2">
          <input
            value={quoteSearch}
            onChange={e => setQuoteSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
            placeholder="Search quote number..."
          />
          <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-800">
            {filteredQuotes.map(quote => (
              <button
                key={quote.id}
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/quote/${quote.id}`;
                  insertHtml(`<a href="${escapeEmailHtml(link)}">${escapeEmailHtml(quote.quoteNumber)}</a>`);
                  setShowQuoteMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-cyan-950/50 hover:text-cyan-300 flex items-center justify-between"
              >
                <span className="font-mono">{quote.quoteNumber}</span>
                <span className="text-slate-500">{quote.status}</span>
              </button>
            ))}
            {filteredQuotes.length === 0 && <div className="px-3 py-2 text-xs text-slate-500 text-center">No matching quotes</div>}
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncEditor}
        onBlur={syncEditor}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && findAiCommandNode()) {
            e.preventDefault();
            void runInlineAI();
          }
        }}
        className={cn(
          "email-rich-editor flex-1 min-h-[220px] overflow-y-auto rounded-b-xl border-x border-b border-slate-800 bg-slate-950/30 px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 leading-relaxed",
          !value && "before:content-['Write_your_email_here...'] before:text-slate-600"
        )}
      />

      {originalEmailBody && (
        <div className="mt-4 pt-4 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-500 mb-2 font-medium">Original Message</div>
          <div
            className="text-sm text-slate-400 pl-3 border-l-2 border-slate-700 py-1"
            dangerouslySetInnerHTML={{ __html: originalEmailBody }}
          />
        </div>
      )}

      {showMediaSelector && (
        <MediaSelectorModal
          onClose={() => setShowMediaSelector(false)}
          onSelect={(url, media) => {
            insertImage(url, media.name);
            setShowMediaSelector(false);
          }}
          allowedTypes={['image']}
        />
      )}
    </div>
  );
}

export function ComposeEmail({ onClose, initialRecipient = '', initialSubject = '', initialBody = '', originalEmailBody = '', draftId, replyToEmailId, initialOutboxId, className = '' }: { onClose: () => void, initialRecipient?: string, initialSubject?: string, initialBody?: string, originalEmailBody?: string, draftId?: string, replyToEmailId?: string, initialOutboxId?: string, className?: string }) {
  const { clients, emails, logs, addEmail, editEmail, deleteEmails, addLog, outboxConfigs, inboxConfigs, emailServerMappings, signatures, timezone, notify, incrementAgentHubTaskCount } = useStore();
  const resolvePreferredOutboxId = () => {
    if (initialOutboxId && outboxConfigs.some(config => config.id === initialOutboxId)) return initialOutboxId;
    if (draftId) {
      const draft = emails.find(email => email.id === draftId);
      if (draft?.outboxConfigId && outboxConfigs.some(config => config.id === draft.outboxConfigId)) return draft.outboxConfigId;
    }
    const replyEmail = replyToEmailId ? emails.find(email => email.id === replyToEmailId) : null;
    if (replyEmail) {
      const relatedSent = emails
        .filter(email => ['sent', 'scheduled', 'outbound'].includes(email.type) && email.outboxConfigId)
        .filter(email => {
          if (replyEmail.clientId && email.clientId === replyEmail.clientId) return true;
          const target = (replyEmail.sender || '').toLowerCase();
          const recipients = `${email.recipient || ''},${email.cc || ''},${email.bcc || ''}`.toLowerCase();
          return !!target && recipients.includes(target);
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastOutboxId = relatedSent[0]?.outboxConfigId;
      if (lastOutboxId && outboxConfigs.some(config => config.id === lastOutboxId)) return lastOutboxId;

      const mappedByInbox = emailServerMappings.find(route => route.inboxConfigId === replyEmail.inboxConfigId);
      if (mappedByInbox?.outboxConfigId && outboxConfigs.some(config => config.id === mappedByInbox.outboxConfigId)) return mappedByInbox.outboxConfigId;

      const receivedBy = `${replyEmail.recipient || ''}`.toLowerCase();
      const matchedInbox = inboxConfigs.find(config => receivedBy.includes((config.username || '').toLowerCase()));
      const mappedByRecipient = matchedInbox ? emailServerMappings.find(route => route.inboxConfigId === matchedInbox.id) : null;
      if (mappedByRecipient?.outboxConfigId && outboxConfigs.some(config => config.id === mappedByRecipient.outboxConfigId)) return mappedByRecipient.outboxConfigId;
    }
    const defaultRoute = emailServerMappings.find(route => route.isDefault) || emailServerMappings[0];
    if (defaultRoute?.outboxConfigId && outboxConfigs.some(config => config.id === defaultRoute.outboxConfigId)) return defaultRoute.outboxConfigId;
    return outboxConfigs?.[0]?.id || '';
  };
  const [selectedOutboxId, setSelectedOutboxId] = useState<string>(() => resolvePreferredOutboxId());
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>(
    signatures?.find(s => s.isDefault)?.id || signatures?.[0]?.id || ''
  );
  
  const [recipient, setRecipient] = useState(initialRecipient);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(() => normalizeEmailEditorHtml(initialBody));
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPurpose, setLoadingPurpose] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [trackEmail, setTrackEmail] = useState(true);

  const { quotes, products, knowledgeBase } = useStore();

  useEffect(() => {
    const preferredOutboxId = resolvePreferredOutboxId();
    if (preferredOutboxId && (!selectedOutboxId || !outboxConfigs.some(config => config.id === selectedOutboxId))) {
      setSelectedOutboxId(preferredOutboxId);
    }
  }, [replyToEmailId, initialOutboxId, draftId, outboxConfigs, emailServerMappings, inboxConfigs, emails]);

  // Auto-associate client if recipient matches the first given recipient
  const firstRecipient = recipient.split(',')[0]?.trim() || '';
  const matchedClient = clients.find(c => 
    c.contactMethods?.some(m => m.type === 'email' && m.value.toLowerCase() === firstRecipient.toLowerCase())
  );
  const latestCustomerEmail = matchedClient
    ? emails
      .filter(email => email.clientId === matchedClient.id && (email.type === 'inbox' || email.type === 'inbound'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : undefined;
  const outboundLanguage = getCustomerOutputLanguage({
    lastCommunicationText: latestCustomerEmail?.body,
    preferredLanguage: matchedClient?.preferredLanguage,
    country: matchedClient?.country
  });

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

  const senderConfig = outboxConfigs.find(c => c.id === selectedOutboxId);
  const senderEmail = senderConfig?.fromEmail || 'me@soho.com';
  const senderName = senderConfig?.fromName || 'Alex.W';
  const selectedSignature = signatures.find(s => s.id === selectedSignatureId);

  const stripTrailingConfiguredSignature = (value: string) => {
    let next = value.trimEnd();
    signatures.forEach(sig => {
      if (!sig.content?.trim()) return;
      const escaped = sig.content.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      next = next.replace(new RegExp(`(?:\\s|<br\\s*/?>)*${escaped}\\s*$`, 'i'), '').trimEnd();
    });
    return next;
  };

  const buildEmailBodyForDelivery = () => {
    const cleanBody = stripTrailingConfiguredSignature(body);
    const signatureBlock = selectedSignature?.content?.trim() ? `<br><br>${plainTextToEmailHtml(selectedSignature.content.trim())}` : '';
    const bodyWithSignature = `${cleanBody}${signatureBlock}`;
    return originalEmailBody
      ? `${bodyWithSignature}<br><br><div class="gmail_quote" dir="ltr"><blockquote style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">${originalEmailBody}</blockquote></div>`
      : bodyWithSignature;
  };

  const parseAiEmailDraft = (raw: string) => {
    const cleaned = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return {
        subject: String(parsed.subject || parsed.emailSubject || '').trim(),
        body: String(parsed.body || parsed.emailBody || parsed.content || '').trim()
      };
    } catch {
      const subjectMatch = cleaned.match(/(?:^|\n)\s*(?:Subject|主题)\s*:\s*(.+)/i);
      const bodyWithoutSubject = subjectMatch
        ? cleaned.replace(subjectMatch[0], '').replace(/^\s*(?:Body|正文)\s*:\s*/i, '').trim()
        : cleaned;
      return {
        subject: subjectMatch?.[1]?.trim() || '',
        body: bodyWithoutSubject
      };
    }
  };

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

    const finalBody = buildEmailBodyForDelivery();

    const newEmailId = addEmail({
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
      enableTracking: trackEmail,
      outboxConfigId: selectedOutboxId || undefined
    });
    if (matchedClient) {
      addLog(matchedClient.id, `Scheduled Email: ${subject} for ${new Date(scheduledAt).toLocaleString()}${purpose ? ` (Purpose: ${purpose})` : ''}`, newEmailId);
    }
    setShowSchedule(false);
    setScheduleDateTime('');
    onClose();
  };

  const handleSaveDraft = () => {
    if (!recipient && !subject && !emailHtmlHasContent(body)) {
      onClose();
      return;
    }

    const attachmentsPayload = attachments.map(a => ({
      id: `att_${Date.now()}_${Math.random()}`,
      name: a.name,
      type: (a.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
      url: URL.createObjectURL(a)
    }));

    const emailPayload = {
      recipient,
      cc: cc || undefined,
      bcc: bcc || undefined,
      sender: senderEmail,
      senderName: senderName,
      subject: subject || 'No Subject',
      body,
      read: true,
      type: 'draft' as const,
      clientId: matchedClient?.id,
      attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
      enableTracking: trackEmail,
      outboxConfigId: selectedOutboxId || undefined
    };

    if (draftId) {
      editEmail(draftId, emailPayload);
    } else {
      addEmail(emailPayload);
      // Removed addLog for drafts
    }
    
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

    const finalBody = buildEmailBodyForDelivery();

    const newEmailId = addEmail({
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
      enableTracking: trackEmail,
      outboxConfigId: selectedOutboxId || undefined
    });
    
    if (draftId) {
       deleteEmails([draftId]);
    }
    
    if (matchedClient) {
      addLog(matchedClient.id, `Sent Email: ${subject}${purpose ? ` (Purpose: ${purpose})` : ''}`, newEmailId);
    }
    onClose();
  };

  const handleOptimizeBody = async () => {
    if (!emailHtmlHasContent(body)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Please politely optimize the following outbound email draft for clarity, professional tone, and grammatical correctness. Do not include any email signature, sign-off block, sender name, company footer, or quoted original email. Output ONLY the resulting optimized email body, nothing else. Customer-facing output language: ${outboundLanguage}.\n\n${emailHtmlToText(stripTrailingConfiguredSignature(body))}`,
          context: { 
             outboundLanguage,
             clientPreferredLanguage: matchedClient?.preferredLanguage || null
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
      if (data.result) {
        incrementAgentHubTaskCount('email_draft_agent');
        setBody(normalizeEmailEditorHtml(stripTrailingConfiguredSignature(data.result)));
      }
    } catch (e) {
      console.error(e);
      notify('Failed to optimize email body.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInlineAICommand = async (prompt: string, currentHtml: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Write an outbound email snippet or sentence based on this instruction: ${prompt}. Do not include any email signature, sign-off block, sender name, company footer, or quoted original email. Customer-facing output language: ${outboundLanguage}.`,
          context: { 
             currentEmailBodyPreview: emailHtmlToText(currentHtml).replace(`/ai:${prompt}`, '[Generate Here]'),
             outboundLanguage,
             clientPreferredLanguage: matchedClient?.preferredLanguage || null
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
      if (data.result) incrementAgentHubTaskCount('email_draft_agent');
      return stripTrailingConfiguredSignature(data.result || '');
    } catch(err) {
      console.error(err);
      notify('Failed to process magic command', 'error');
      return '';
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
      notify('Enter a recipient email that matches a lead before using AI drafting.', 'warning');
      return;
    }
    setLoading(true);
    
    const clientLogs = logs.filter(l => l.clientId === matchedClient.id).map(l => l.content).join('\\n');
    const clientEmails = emails
      .filter(e => e.clientId === matchedClient.id)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12)
      .map(e => `[${e.type} - ${new Date(e.date).toLocaleDateString()}] ${e.subject}\n${e.body?.slice(0, 1200)}`)
      .join('\n\n');
    const lastEmailReceived = emails.filter(e => e.clientId === matchedClient.id && ['inbox', 'inbound'].includes(e.type)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const productContext = products
      .slice(0, 30)
      .map(product => {
        const prices = (product.bulkPrices || []).map(price => `${price.minQuantity}+ ${price.price}`).join(', ');
        return `${product.name}${product.sku ? ` (${product.sku})` : ''}: ${product.description || 'No description'}${prices ? ` | Bulk prices: ${prices}` : ''}`;
      })
      .join('\n');
    const knowledgeContext = knowledgeBase
      .filter(item => !item.clientId || item.clientId === matchedClient.id)
      .slice(0, 12)
      .map(item => `[${item.title}]\n${item.content?.slice(0, 1200)}`)
      .join('\n\n');

    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Draft a complete outbound email reply using CRM context, RAG, and product catalog.
Return JSON only with exactly these keys: "subject" and "body".
Subject seed: ${subject || "Follow up"}.
Purpose for this email: ${purpose || 'General follow up'}.
Use relevant product facts and knowledge base snippets when they help answer the customer or move the deal forward.
Do not invent product specs, prices, delivery promises, compliance claims, or discounts not present in the provided context.
Do not include any email signature, sign-off block, sender name, company footer, or quoted original email. The app will append the selected signature and original email separately when sending.
Customer-facing output language: ${outboundLanguage}. This language was resolved by priority: last customer communication language > client preferred language > official country/region language > English.`,
          context: { 
            client: matchedClient,
            clientId: matchedClient.id,
            outboundLanguage,
            clientPreferredLanguage: matchedClient.preferredLanguage || null,
            historicalFollowUpLogs: clientLogs,
            recentEmails: clientEmails,
            lastReceivedEmailBody: lastEmailReceived?.body || 'No previous received emails',
            productCatalog: productContext || 'No products configured',
            localKnowledgeBaseContext: knowledgeContext || 'No local knowledge snippets loaded'
          },
          llmConfig: getLLMConfig('drafting'),
          embeddingLlmConfig: getLLMConfig('agent_context_suggestions') || getLLMConfig('drafting'),
          skipKnowledgeBase: false
        })
      });
      const data = await res.json();
      if (data.result) incrementAgentHubTaskCount('email_draft_agent');
      const draft = parseAiEmailDraft(data.result || '');
      if (draft.subject) setSubject(draft.subject);
      else if (!subject) setSubject('Follow up');
      setBody(normalizeEmailEditorHtml(stripTrailingConfiguredSignature(draft.body || data.result || '')));
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex-1 flex flex-col bg-slate-900 animate-in fade-in duration-200", className)}>
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
          <label className="text-xs font-bold text-slate-500 w-12 text-right">Sign:</label>
          <select 
            value={selectedSignatureId}
            onChange={(e) => setSelectedSignatureId(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none focus:ring-0 pb-1 w-full truncate"
          >
            <option value="" className="bg-slate-900">None</option>
            {signatures.map(s => (
              <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
            ))}
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
        <EmailRichTextEditor
          value={body}
          onChange={setBody}
          loading={loading}
          originalEmailBody={originalEmailBody}
          quotes={quotes}
          onOptimize={handleOptimizeBody}
          onInlineAI={handleInlineAICommand}
        />
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
                disabled={!recipient || !emailHtmlHasContent(body)}
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
              onClick={handleSaveDraft}
              className="text-sm border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-lg transition-colors"
            >
              Save Draft
            </button>
            <button 
              onClick={handleSend}
              disabled={!recipient || !emailHtmlHasContent(body)}
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
