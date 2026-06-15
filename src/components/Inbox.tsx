import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ContactMethod, useStore, EmailMessage, LiveChatMessage, LiveChatSession } from '../store';
import { useAuthStore } from '../authStore';
import { Mail, MailOpen, Send, Reply, Trash2, ArrowLeft, PenLine, User, Sparkles, Loader2, Tag, CalendarClock, UserPlus, MessageSquare, MessageCircle, Paperclip, ChevronDown, ChevronUp, X, Database, CheckCircle2, MoreHorizontal, Star, Clock, Eye, MousePointerClick, Radar, Timer, Languages } from 'lucide-react';
import { cn } from '../lib/utils';
import { CommentItem } from './CommentItem';
import { ClientFormModal } from './ClientFormModal';
import { UploadAttachmentModal } from './UploadAttachmentModal';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { WhatsAppChatModal } from './WhatsAppChatModal';
import { AgentContextSuggestions } from './AgentContextSuggestions';
import {
  ConversationDetailHeader,
  ConversationFollowUpStrip,
  CONVERSATION_STAGES,
  ComposeEmail,
  InboxBulkActionsPanel,
  InboxSidebarControls,
  CONVERSATION_AUTO_TRANSLATE_KEY,
  INBOX_OPEN_REQUEST_KEY,
  WHATSAPP_CONVERSATION_POLL_MS,
  WHATSAPP_FOLLOW_UP_MARKER,
  conversationAutoTranslateId,
  conversationTranslationBucketId,
  emailToUnifiedConversation,
  extractLatestEmailText,
  fallbackEmailKnowledgeSummary,
  getInboxFilterForEmail,
  getWhatsAppFollowUp,
  hasOpenWhatsAppFollowUp,
  mapUnifiedWhatsAppConversation,
  normalizeTagSearchTerm,
  readCachedConversationTranslations,
  readCachedWhatsAppConversations,
  readConversationAutoTranslateConfig,
  simpleHash,
  whatsappToUnifiedConversation,
  writeCachedConversationTranslations,
  writeCachedWhatsAppConversations,
} from './inbox-ui';
import type {
  ConversationMessageTranslation,
  InboxChannelFilter,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
} from './inbox-ui';
import { AddContactToClientModal } from './AddContactToClientModal';
import { buildUnifiedAgentContext, extractLatestMessageText } from '../lib/agentContext';

interface WhatsAppContactOption {
  key: string;
  clientId: string;
  clientName: string;
  clientCompany?: string;
  contactName: string;
  contactTitle?: string;
  phone: string;
  label: string;
  searchText: string;
}


export function Inbox() {
  const { emails, markEmailRead, clients, logs, deals, knowledgeBase, products, addEmail, addLog, addClient, editClient, editEmail, addEmailComment, addEmailReply, addQuest, selectClient, addKnowledgeItem, selectedEmailId, selectEmail, notify, language, llmConfigs, activeLLMId, llmMappings, inboxFollowUpFilterRequest, fetchEmails, fetchLiveChatSessions, fetchLiveChatMessages, sendLiveChatOperatorMessage, updateLiveChatSession, runLiveChatAgent, connectLiveChatSocket, joinLiveChatSocketSession, liveChatSessions, liveChatMessages, liveChatSocketStatus } = useStore();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: 'inbox-layout' });
  const currentUser = useAuthStore(state => state.profile);
  const [filter, setFilter] = useState<'inbox' | 'sent' | 'scheduled' | 'drafts'>('inbox');
  const [channelFilter, setChannelFilter] = useState<InboxChannelFilter>('all');
  const [emailListMode, setEmailListMode] = useState<'list' | 'conversation'>('list');
  const [search, setSearch] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<{recipient: string, subject: string, originalEmailBody?: string, initialBody?: string, draftId?: string, replyToEmailId?: string, initialOutboxId?: string} | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [showCommentAttachmentModal, setShowCommentAttachmentModal] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isAddingContactToClient, setIsAddingContactToClient] = useState(false);
  const [addingToRag, setAddingToRag] = useState(false);
  const [addedToRagId, setAddedToRagId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedWhatsAppIds, setSelectedWhatsAppIds] = useState<Set<string>>(new Set());
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkNoteInput, setBulkNoteInput] = useState('');
  const [bulkFollowUpAt, setBulkFollowUpAt] = useState('');
  const [bulkOwnerId, setBulkOwnerId] = useState('');
  const [bulkStage, setBulkStage] = useState('');
  const [expandedTrackingEmailIds, setExpandedTrackingEmailIds] = useState<Set<string>>(new Set());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [todoModalEmail, setTodoModalEmail] = useState<string | null>(null);
  const [todoAt, setTodoAt] = useState('');
  const [todoNote, setTodoNote] = useState('');
  const [tagModalEmail, setTagModalEmail] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [unifiedConversations, setUnifiedConversations] = useState<UnifiedCommunicationConversation[]>([]);
  const [isUnifiedConversationLoading, setIsUnifiedConversationLoading] = useState(false);
  const [whatsappConversations, setWhatsappConversations] = useState<InboxWhatsAppConversation[]>(() => readCachedWhatsAppConversations());
  const [selectedWhatsAppPhone, setSelectedWhatsAppPhone] = useState<string | null>(null);
  const [selectedWhatsAppClientId, setSelectedWhatsAppClientId] = useState<string | null>(null);
  const [selectedTelegramConversation, setSelectedTelegramConversation] = useState<UnifiedCommunicationConversation | null>(null);
  const [telegramMessages, setTelegramMessages] = useState<any[]>([]);
  const [isTelegramMessagesLoading, setIsTelegramMessagesLoading] = useState(false);
  const [telegramReply, setTelegramReply] = useState('');
  const [isSendingTelegramReply, setIsSendingTelegramReply] = useState(false);
  const [selectedLiveChatConversation, setSelectedLiveChatConversation] = useState<UnifiedCommunicationConversation | null>(null);
  const [liveChatReply, setLiveChatReply] = useState('');
  const [isSendingLiveChatReply, setIsSendingLiveChatReply] = useState(false);
  const [isRunningLiveChatAgent, setIsRunningLiveChatAgent] = useState(false);
  const [conversationAutoTranslateConfig, setConversationAutoTranslateConfig] = useState<Record<string, boolean>>(() => readConversationAutoTranslateConfig());
  const [conversationTranslations, setConversationTranslations] = useState<Record<string, Record<string, ConversationMessageTranslation>>>({});
  const [translatingConversationMessageIds, setTranslatingConversationMessageIds] = useState<Set<string>>(new Set());
  const liveChatEndRef = useRef<HTMLDivElement | null>(null);
  const [isStartingWhatsApp, setIsStartingWhatsApp] = useState(false);
  const [newWhatsAppPhone, setNewWhatsAppPhone] = useState('');
  const [showWhatsAppContactPicker, setShowWhatsAppContactPicker] = useState(false);
  const [isWhatsAppBackgroundSyncing, setIsWhatsAppBackgroundSyncing] = useState(false);
  const whatsappSyncInFlightRef = useRef(false);

  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [alertDialog, setAlertDialog] = useState<string | null>(null);
  const isInboundCustomerEmail = (email: EmailMessage) => ['inbox', 'inbound'].includes(email.type);

  const setConversationAutoTranslateEnabled = (channel: 'live_chat' | 'telegram', conversationKey: string, enabled: boolean) => {
    if (!conversationKey) return;
    const key = conversationAutoTranslateId(channel, conversationKey);
    setConversationAutoTranslateConfig(prev => {
      const next = { ...prev, [key]: enabled };
      localStorage.setItem(CONVERSATION_AUTO_TRANSLATE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getConversationTranslationLLMConfig = () => {
    const id = llmMappings.agent_context_suggestions || llmMappings.whatsapp_drafting || llmMappings.drafting || activeLLMId;
    return llmConfigs.find(config => config.id === id) || null;
  };

  const mergeConversationTranslations = (
    channel: 'live_chat' | 'telegram',
    conversationKey: string,
    messageTranslations: Record<string, ConversationMessageTranslation>
  ) => {
    if (!conversationKey) return;
    const bucketId = conversationTranslationBucketId(channel, conversationKey, language);
    setConversationTranslations(prev => {
      const cached = readCachedConversationTranslations(channel, conversationKey, language);
      const nextBucket = { ...cached, ...(prev[bucketId] || {}), ...messageTranslations };
      writeCachedConversationTranslations(channel, conversationKey, language, nextBucket);
      return { ...prev, [bucketId]: nextBucket };
    });
  };

  const saveConversationTranslation = async (
    channel: 'live_chat' | 'telegram',
    messageId: string,
    translation: ConversationMessageTranslation
  ) => {
    const url = channel === 'telegram'
      ? `/api/conversations/messages/${encodeURIComponent(messageId)}/translation`
      : `/api/live-chat/messages/${encodeURIComponent(messageId)}/translation`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        language,
        translatedText: translation.text,
        sourceLanguage: translation.sourceLanguage,
        targetLanguage: translation.targetLanguage,
        bodyHash: translation.bodyHash,
        skipped: translation.skipped,
        modelId: translation.modelId
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to save translation');
    return data.translation || translation;
  };

  const translateConversationMessage = async (
    channel: 'live_chat' | 'telegram',
    conversationKey: string,
    messageId: string,
    body: string,
    signal?: AbortSignal
  ) => {
    const bodyText = String(body || '').trim();
    if (!conversationKey || !messageId || !bodyText) return;
    const bucketId = conversationTranslationBucketId(channel, conversationKey, language);
    const bodyHash = simpleHash(bodyText);
    const existing = (conversationTranslations[bucketId] || {})[messageId];
    if (existing && existing.bodyHash === bodyHash) return;
    const translatingKey = `${channel}:${messageId}`;
    if (translatingConversationMessageIds.has(translatingKey)) return;
    const llmConfig = getConversationTranslationLLMConfig();
    if (!llmConfig) return;
    setTranslatingConversationMessageIds(prev => new Set(prev).add(translatingKey));
    try {
      const targetLanguage = language === 'zh' ? 'Chinese' : 'English';
      const response = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        signal,
        body: JSON.stringify({
          command: `You are translating an inbound ${channel === 'telegram' ? 'Telegram' : 'Live Chat'} customer message for an internal CRM user.
Target system language: ${targetLanguage}.
If the message is already in ${targetLanguage}, return JSON with alreadyTargetLanguage true and translatedText empty.
Otherwise translate faithfully into ${targetLanguage}. Keep names, numbers, product names, URLs, and line breaks. Do not add commentary.
Return only valid JSON: {"alreadyTargetLanguage": boolean, "sourceLanguage": string, "translatedText": string}.

Message:
${bodyText}`,
          context: {
            channel,
            messageId,
            direction: 'inbound',
            systemLanguage: targetLanguage
          },
          llmConfig,
          skipKnowledgeBase: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Translation failed');
      const raw = String(data.result || '').replace(/```json|```/g, '').trim();
      const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
      const parsed = JSON.parse(jsonText);
      const nextTranslation: ConversationMessageTranslation = {
        language,
        text: parsed.alreadyTargetLanguage ? '' : String(parsed.translatedText || '').trim(),
        sourceLanguage: parsed.sourceLanguage || '',
        targetLanguage,
        bodyHash,
        skipped: !!parsed.alreadyTargetLanguage,
        modelId: llmConfig.id
      };
      const savedTranslation = await saveConversationTranslation(channel, messageId, nextTranslation).catch(() => nextTranslation);
      setConversationTranslations(prev => {
        const nextBucket = { ...(prev[bucketId] || {}), [messageId]: savedTranslation };
        writeCachedConversationTranslations(channel, conversationKey, language, nextBucket);
        return { ...prev, [bucketId]: nextBucket };
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.warn(`${channel} translation failed`, error);
    } finally {
      setTranslatingConversationMessageIds(prev => {
        const next = new Set(prev);
        next.delete(translatingKey);
        return next;
      });
    }
  };

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const updateWhatsAppConversationState = (conversations: InboxWhatsAppConversation[]) => {
    setWhatsappConversations(conversations);
    writeCachedWhatsAppConversations(conversations);
  };

  const fetchUnifiedConversations = async (activeSearch = search, activeTags = searchTags) => {
    setIsUnifiedConversationLoading(true);
    try {
      const params = new URLSearchParams({ limit: '300' });
      const textTerms = [
        activeSearch.trim(),
        ...activeTags.filter(tag => !tag.trim().startsWith('#')).map(tag => tag.trim())
      ].filter(Boolean);
      const tagTerms = activeTags
        .filter(tag => tag.trim().startsWith('#'))
        .map(normalizeTagSearchTerm)
        .filter(Boolean);
      if (textTerms.length > 0) params.set('search', textTerms.join(' '));
      if (tagTerms.length > 0) params.set('tags', tagTerms.join(','));
      const res = await fetch(`/api/conversations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load unified conversations.');
      const conversations = Array.isArray(data.conversations) ? data.conversations : [];
      setUnifiedConversations(conversations);
      const unifiedWhatsApp = conversations
        .filter((conversation: UnifiedCommunicationConversation) => conversation.channel === 'whatsapp')
        .map(mapUnifiedWhatsAppConversation);
      if (unifiedWhatsApp.length > 0) updateWhatsAppConversationState(unifiedWhatsApp);
      return conversations;
    } catch (error) {
      console.warn('Unified conversations unavailable in inbox', error);
      return [];
    } finally {
      setIsUnifiedConversationLoading(false);
    }
  };

  const fetchCachedWhatsAppConversations = async () => {
    try {
      const unified = await fetchUnifiedConversations();
      const unifiedWhatsApp = unified
        .filter((conversation: UnifiedCommunicationConversation) => conversation.channel === 'whatsapp')
        .map(mapUnifiedWhatsAppConversation);
      if (unifiedWhatsApp.length > 0) {
        updateWhatsAppConversationState(unifiedWhatsApp);
        return;
      }
      updateWhatsAppConversationState([]);
    } catch (error) {
      console.warn('WhatsApp conversations unavailable in unified inbox', error);
    }
  };

  const syncWhatsAppConversations = async (activeSearch = search) => {
    if (whatsappSyncInFlightRef.current) return;
    whatsappSyncInFlightRef.current = true;
    setIsWhatsAppBackgroundSyncing(true);
    try {
      const res = await fetch('/api/whatsapp-hub/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ limit: 500 })
      });
      if (res.ok) {
        await fetchCachedWhatsAppConversations();
      }
    } catch (error) {
      console.warn('WhatsApp background sync unavailable in unified inbox', error);
    } finally {
      setIsWhatsAppBackgroundSyncing(false);
      whatsappSyncInFlightRef.current = false;
    }
  };

  const loadWhatsAppConversations = async () => {
    await fetchCachedWhatsAppConversations();
    void syncWhatsAppConversations(search);
  };

  useEffect(() => {
    void loadWhatsAppConversations();
  }, []);

  useEffect(() => {
    void connectLiveChatSocket();
  }, [connectLiveChatSocket]);

  useEffect(() => {
    if (!selectedLiveChatConversation) return;
    const sessionId = selectedLiveChatConversation.source_id;
    joinLiveChatSocketSession(sessionId);
    void fetchLiveChatMessages(sessionId);
    if (!selectedLiveChatConversation.read) {
      void patchUnifiedConversation(selectedLiveChatConversation, { read: true })
        .then(() => refreshUnifiedConversationData())
        .catch(() => undefined);
    }
    const interval = window.setInterval(
      () => void fetchLiveChatMessages(sessionId),
      liveChatSocketStatus === 'connected' ? 45000 : 8000
    );
    return () => window.clearInterval(interval);
  }, [selectedLiveChatConversation?.id, selectedLiveChatConversation?.source_id, selectedLiveChatConversation?.read, fetchLiveChatMessages, joinLiveChatSocketSession, liveChatSocketStatus]);

  useEffect(() => {
    if (!selectedLiveChatConversation) return;
    const frame = window.requestAnimationFrame(() => {
      liveChatEndRef.current?.scrollIntoView({ block: 'end' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedLiveChatConversation?.id, liveChatMessages[selectedLiveChatConversation?.source_id || '']?.length]);

  useEffect(() => {
    if (!selectedTelegramConversation?.id) return;
    const messageTranslations: Record<string, ConversationMessageTranslation> = {};
    telegramMessages.forEach(message => {
      const translation = message.payload?.translation;
      if (translation && (!translation.language || translation.language === language)) {
        messageTranslations[message.id] = translation;
      }
    });
    mergeConversationTranslations('telegram', selectedTelegramConversation.id, messageTranslations);
  }, [selectedTelegramConversation?.id, telegramMessages, language]);

  useEffect(() => {
    if (!selectedLiveChatConversation?.source_id) return;
    const messages = liveChatMessages[selectedLiveChatConversation.source_id] || [];
    const messageTranslations: Record<string, ConversationMessageTranslation> = {};
    messages.forEach(message => {
      const translation = message.metadata?.translation;
      if (translation && (!translation.language || translation.language === language)) {
        messageTranslations[message.id] = translation;
      }
    });
    mergeConversationTranslations('live_chat', selectedLiveChatConversation.source_id, messageTranslations);
  }, [selectedLiveChatConversation?.source_id, liveChatMessages[selectedLiveChatConversation?.source_id || '']?.length, language]);

  useEffect(() => {
    if (!selectedTelegramConversation?.id) return;
    const autoKey = conversationAutoTranslateId('telegram', selectedTelegramConversation.id);
    if (!conversationAutoTranslateConfig[autoKey]) return;
    const controller = new AbortController();
    telegramMessages
      .filter(message => message.direction === 'inbound')
      .forEach(message => {
        const saved = message.payload?.translation;
        const bodyHash = simpleHash(String(message.body || '').trim());
        if (saved && (!saved.language || saved.language === language) && saved.bodyHash === bodyHash) return;
        void translateConversationMessage('telegram', selectedTelegramConversation.id, message.id, message.body || '', controller.signal);
      });
    return () => controller.abort();
  }, [selectedTelegramConversation?.id, telegramMessages, language, conversationAutoTranslateConfig]);

  useEffect(() => {
    if (!selectedLiveChatConversation?.source_id) return;
    const autoKey = conversationAutoTranslateId('live_chat', selectedLiveChatConversation.source_id);
    if (!conversationAutoTranslateConfig[autoKey]) return;
    const controller = new AbortController();
    (liveChatMessages[selectedLiveChatConversation.source_id] || [])
      .filter(message => message.role === 'visitor')
      .forEach(message => {
        const saved = message.metadata?.translation;
        const bodyHash = simpleHash(String(message.body || '').trim());
        if (saved && (!saved.language || saved.language === language) && saved.bodyHash === bodyHash) return;
        void translateConversationMessage('live_chat', selectedLiveChatConversation.source_id, message.id, message.body || '', controller.signal);
      });
    return () => controller.abort();
  }, [selectedLiveChatConversation?.source_id, liveChatMessages[selectedLiveChatConversation?.source_id || '']?.length, language, conversationAutoTranslateConfig]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchUnifiedConversations(search, searchTags);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, searchTags]);

  useEffect(() => {
    if (!inboxFollowUpFilterRequest) return;
    setFilter('inbox');
    setChannelFilter('all');
    setEmailListMode('list');
    setFollowUpOnly(true);
    clearBulkSelection();
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    setSelectedWhatsAppPhone(null);
    setSelectedWhatsAppClientId(null);
    selectEmail(null);
  }, [inboxFollowUpFilterRequest]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void syncWhatsAppConversations(search);
    }, WHATSAPP_CONVERSATION_POLL_MS);
    const handleFocus = () => {
      void syncWhatsAppConversations(search);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', handleFocus);
    };
  }, [search]);

  const filteredEmails = channelFilter === 'whatsapp' || channelFilter === 'live_chat' || channelFilter === 'telegram' ? [] : emails.filter(e => {
    // Support both new ('inbox'/'sent') and legacy ('inbound'/'outbound') types
    const typeMatch = (filter === 'inbox' && (e.type === 'inbox' || e.type === 'inbound')) ||
                      (filter === 'sent' && (e.type === 'sent' || e.type === 'outbound')) ||
                      (filter === 'scheduled' && e.type === 'scheduled') ||
                      (filter === 'drafts' && e.type === 'draft');
    
    if (!typeMatch) return false;
    if (e.pendingDelete) return false;
    if (followUpOnly && !e.todoAt) return false;
    
    const termsToMatch = [...searchTags];
    if (search.trim()) {
      termsToMatch.push(...search.trim().toLowerCase().split(/\s+/));
    }
    
    if (termsToMatch.length > 0) {
      for (const t of termsToMatch) {
        const lowerT = t.toLowerCase();
        if (t.startsWith('#')) {
          const normalizedTag = normalizeTagSearchTerm(t);
          if (!e.tags || !e.tags.some(tag => normalizeTagSearchTerm(tag) === normalizedTag)) {
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

  const filteredWhatsAppConversations = filter === 'inbox' && channelFilter !== 'email' && channelFilter !== 'live_chat' && channelFilter !== 'telegram'
    ? whatsappConversations.filter(conversation => {
        if (followUpOnly && !hasOpenWhatsAppFollowUp(conversation)) return false;
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
            ? (conversation.tags || []).some(tag => normalizeTagSearchTerm(tag) === normalizeTagSearchTerm(normalized))
            : haystack.includes(normalized);
        });
      })
    : [];
  const unifiedFallbackConversations = useMemo(() => ([
    ...emails.map(emailToUnifiedConversation),
    ...whatsappConversations.map(whatsappToUnifiedConversation)
  ]), [emails, whatsappConversations]);
  const unifiedConversationSource = unifiedConversations.length > 0 ? unifiedConversations : unifiedFallbackConversations;
  const isUnifiedConversationInCurrentMailbox = (conversation: UnifiedCommunicationConversation) => {
    if (channelFilter !== 'all' && conversation.channel !== channelFilter) return false;
    const emailType = String(conversation.metadata?.emailType || conversation.status || '').toLowerCase();
    if (conversation.channel === 'email') {
      if (filter === 'inbox') return conversation.direction !== 'outbound' && !['draft', 'scheduled'].includes(emailType);
      if (filter === 'sent') return conversation.direction === 'outbound' && !['draft', 'scheduled'].includes(emailType);
      if (filter === 'scheduled') return emailType === 'scheduled' || conversation.status === 'scheduled';
      if (filter === 'drafts') return emailType === 'draft' || conversation.status === 'draft';
      return true;
    }
    return filter === 'inbox';
  };
  const hasUnifiedOpenFollowUp = (conversation: UnifiedCommunicationConversation) => {
    if (conversation.todo_at) return true;
    if (conversation.channel !== 'whatsapp') return false;
    return hasOpenWhatsAppFollowUp(mapUnifiedWhatsAppConversation(conversation));
  };
  const unifiedConversationList = useMemo(() => {
    const termsToMatch = [...searchTags];
    if (search.trim()) termsToMatch.push(...search.trim().toLowerCase().split(/\s+/));
    return unifiedConversationSource
      .filter(conversation => {
        if (!isUnifiedConversationInCurrentMailbox(conversation)) return false;
        if (followUpOnly && !hasUnifiedOpenFollowUp(conversation)) return false;
        if (termsToMatch.length === 0) return true;
        const haystack = [
          conversation.title || '',
          conversation.subject || '',
          conversation.contact_name || '',
          conversation.contact_address || '',
          conversation.client_name || '',
          conversation.client_company || '',
          conversation.last_message_preview || '',
          ...(conversation.tags || [])
        ].join(' ').toLowerCase();
        return termsToMatch.every(term => {
          const normalized = term.toLowerCase();
          return normalized.startsWith('#')
            ? (conversation.tags || []).some(tag => normalizeTagSearchTerm(tag) === normalizeTagSearchTerm(normalized))
            : haystack.includes(normalized);
        });
      })
      .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
  }, [unifiedConversationSource, channelFilter, filter, followUpOnly, search, searchTags]);
  const visibleFollowUpCount = unifiedConversationSource.filter(hasUnifiedOpenFollowUp).length;

  const whatsappContactOptions = useMemo<WhatsAppContactOption[]>(() => {
    const options: WhatsAppContactOption[] = [];
    clients.forEach(client => {
      const pushMethod = (method: any, contactName: string, contactTitle?: string, suffix = '') => {
        if (method.type !== 'whatsapp') return;
        const phone = method.value || '';
        const normalized = phone.replace(/[^0-9]/g, '');
        if (!normalized) return;
        const label = `${contactName || client.name} · ${phone}`;
        options.push({
          key: `${client.id}:${suffix}:${normalized}`,
          clientId: client.id,
          clientName: client.name,
          clientCompany: client.company,
          contactName: contactName || client.name,
          contactTitle,
          phone,
          label,
          searchText: [
            client.name,
            client.company,
            client.country,
            contactName,
            contactTitle,
            phone,
            normalized
          ].filter(Boolean).join(' ').toLowerCase()
        });
      };

      (client.contactMethods || []).forEach((method, index) => pushMethod(method, client.name, undefined, `client-${index}`));
      (client.contacts || []).forEach(contact => {
        (contact.contactMethods || []).forEach((method, index) => pushMethod(method, contact.name || client.name, contact.title, `${contact.id}-${index}`));
      });
    });
    return options.sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [clients]);

  const whatsappMentionQuery = (() => {
    const atIndex = newWhatsAppPhone.lastIndexOf('@');
    return atIndex >= 0 ? newWhatsAppPhone.slice(atIndex + 1).trim().toLowerCase() : '';
  })();

  const visibleWhatsAppContactOptions = showWhatsAppContactPicker || newWhatsAppPhone.includes('@')
    ? whatsappContactOptions
        .filter(option => !whatsappMentionQuery || option.searchText.includes(whatsappMentionQuery))
        .slice(0, 8)
    : [];

  const emailConversationGroups = useMemo(() => {
    const stripHtml = (value: string) => value.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const findClientForEmail = (email: EmailMessage) => {
      if (email.clientId) return clients.find(client => client.id === email.clientId) || null;
      const addresses = [email.sender, email.recipient].map(value => value?.toLowerCase()).filter(Boolean);
      return clients.find(client => {
        const methods = [
          ...(client.contactMethods || []),
          ...(client.contacts || []).flatMap(contact => contact.contactMethods || [])
        ];
        return methods.some(method => (
          method.type === 'email' && addresses.includes(method.value.trim().toLowerCase())
        ));
      }) || null;
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

  const visibleEmailIds = unifiedConversationList
    .filter(conversation => conversation.channel === 'email')
    .map(conversation => conversation.source_id)
    .filter(id => emails.some(email => email.id === id));
  const visibleWhatsAppIds = unifiedConversationList
    .filter(conversation => conversation.channel === 'whatsapp')
    .map(conversation => conversation.source_id)
    .filter(id => whatsappConversations.some(conversation => conversation.id === id) || unifiedConversations.some(conversation => conversation.channel === 'whatsapp' && conversation.source_id === id));
  const visibleConversationIds = unifiedConversationList.map(conversation => conversation.id);
  const selectedUnifiedConversations = unifiedConversationList.filter(conversation => selectedConversationIds.has(conversation.id));
  const selectedCount = selectedConversationIds.size;
  const selectableVisibleCount = visibleConversationIds.length;
  const totalVisibleCount = unifiedConversationList.length;
  const allVisibleSelected = selectableVisibleCount > 0
    && visibleConversationIds.every(id => selectedConversationIds.has(id));
  const someVisibleSelected = visibleConversationIds.some(id => selectedConversationIds.has(id));
  const selectedWhatsAppConversations = whatsappConversations.filter(conversation => selectedWhatsAppIds.has(conversation.id));

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleWhatsAppSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedWhatsAppIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedWhatsAppIds(next);
  };

  const toggleUnifiedSelection = (e: React.MouseEvent, conversation: UnifiedCommunicationConversation) => {
    e.stopPropagation();
    const next = new Set(selectedConversationIds);
    if (next.has(conversation.id)) next.delete(conversation.id);
    else next.add(conversation.id);
    setSelectedConversationIds(next);

    if (conversation.channel === 'email') {
      const emailSet = new Set(selectedIds);
      if (next.has(conversation.id)) emailSet.add(conversation.source_id);
      else emailSet.delete(conversation.source_id);
      setSelectedIds(emailSet);
    } else if (conversation.channel === 'whatsapp') {
      const whatsappSet = new Set(selectedWhatsAppIds);
      if (next.has(conversation.id)) whatsappSet.add(conversation.source_id);
      else whatsappSet.delete(conversation.source_id);
      setSelectedWhatsAppIds(whatsappSet);
    }
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedConversationIds(new Set());
      setSelectedIds(new Set());
      setSelectedWhatsAppIds(new Set());
    } else {
      setSelectedConversationIds(new Set(visibleConversationIds));
      setSelectedIds(new Set(visibleEmailIds));
      setSelectedWhatsAppIds(new Set(visibleWhatsAppIds));
    }
  };

  const clearBulkSelection = () => {
    setSelectedConversationIds(new Set());
    setSelectedIds(new Set());
    setSelectedWhatsAppIds(new Set());
  };

  const addWhatsAppConversationComment = async (conversation: InboxWhatsAppConversation, content: string) => {
    const res = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ content })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to add WhatsApp comment.');
    return data.comments || [...(conversation.comments || []), data.comment].filter(Boolean);
  };

  const patchUnifiedConversation = async (conversation: UnifiedCommunicationConversation, updates: any) => {
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updates)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update conversation.');
    return data.conversation || { ...conversation, ...updates };
  };

  const deleteUnifiedConversation = async (conversation: UnifiedCommunicationConversation) => {
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to delete conversation.');
    return data.conversation || { ...conversation, deleted_at: new Date().toISOString() };
  };

  const applyUnifiedConversationUpdate = (conversation: UnifiedCommunicationConversation, updates: Partial<UnifiedCommunicationConversation>) => {
    setUnifiedConversations(prev => {
      const exists = prev.some(item => item.id === conversation.id);
      const next = exists
        ? prev.map(item => item.id === conversation.id ? { ...item, ...updates } : item)
        : [{ ...conversation, ...updates }, ...prev];
      return next;
    });
  };

  const updateConversationOwnerStage = async (conversation: UnifiedCommunicationConversation, updates: { ownerId?: string | null; stage?: string | null }) => {
    const patched = await patchUnifiedConversation(conversation, updates);
    applyUnifiedConversationUpdate(conversation, {
      owner_id: patched.owner_id,
      stage: patched.stage
    });
    notify(language === 'zh' ? '会话状态已更新。' : 'Conversation status updated.', 'success');
  };

  const findEmailUnifiedConversation = (emailId: string) => (
    unifiedConversationSource.find(conversation => conversation.channel === 'email' && conversation.source_id === emailId)
  );

  const refreshUnifiedConversationData = async () => {
    await fetchUnifiedConversations();
    void fetchEmails();
    void fetchLiveChatSessions();
  };

  const handleDeleteSelected = () => {
    if (selectedCount === 0) return;
    setConfirmDialog({
      message: `Are you sure you want to delete/archive ${selectedCount} selected conversation(s)? Emails associated with a client will be soft-deleted pending admin review; Live Chat sessions will be closed.`,
      onConfirm: async () => {
        for (const conversation of selectedUnifiedConversations) await deleteUnifiedConversation(conversation);
        updateWhatsAppConversationState(whatsappConversations.filter(conversation => !selectedWhatsAppIds.has(conversation.id)));
        clearBulkSelection();
        if (selectedEmailId && selectedIds.has(selectedEmailId)) selectEmail(null);
        if (activeWhatsAppConversation && selectedWhatsAppIds.has(activeWhatsAppConversation.id)) setSelectedWhatsAppPhone(null);
        await refreshUnifiedConversationData();
        setConfirmDialog(null);
        notify('Selected conversations updated.', 'success');
      }
    });
  };

  const handleBulkAddTag = async () => {
    const tag = bulkTagInput.trim().replace(/^#/, '');
    if (!tag || selectedCount === 0) return;
    const normalizedTag = `#${tag}`;
    for (const conversation of selectedUnifiedConversations) {
      const tagToApply = conversation.channel === 'email' ? normalizedTag : tag;
      const tags = Array.from(new Set([...(conversation.tags || []), tagToApply]));
      if ((conversation.channel === 'live_chat' || conversation.channel === 'telegram') && conversation.client_id) {
        const client = clients.find(item => item.id === conversation.client_id);
        if (client) {
          editClient(client.id, {
            tags: Array.from(new Set([...(client.tags || []), tagToApply]))
          });
        }
      }
      await patchUnifiedConversation(conversation, { tags });
    }
    await refreshUnifiedConversationData();
    setBulkTagInput('');
    notify('Tag added to selected items.', 'success');
  };

  const handleBulkMarkImportant = async () => {
    if (selectedCount === 0) return;
    for (const conversation of selectedUnifiedConversations) {
      await patchUnifiedConversation(conversation, { isImportant: true });
    }
    await refreshUnifiedConversationData();
    notify('Selected items marked important.', 'success');
  };

  const handleBulkAddComment = async () => {
    const content = bulkNoteInput.trim();
    if (!content || selectedCount === 0) return;
    for (const conversation of selectedUnifiedConversations) {
      const comment = {
        id: `uc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        author: 'User',
        content,
        createdAt: new Date().toISOString(),
        replies: []
      };
      if ((conversation.channel === 'live_chat' || conversation.channel === 'telegram') && conversation.client_id) {
        const client = clients.find(item => item.id === conversation.client_id);
        if (client) {
          editClient(client.id, {
            comments: [...(client.comments || []), {
              ...comment,
              content: `[${conversation.channel === 'telegram' ? 'Telegram' : 'Live Chat'}] ${content}`
            }]
          });
          continue;
        }
      }
      const comments = [...(conversation.comments || []), comment];
      await patchUnifiedConversation(conversation, { comments });
    }
    await refreshUnifiedConversationData();
    setBulkNoteInput('');
    notify('Internal comment added to selected items.', 'success');
  };

  const handleBulkSetFollowUp = async () => {
    if (!bulkFollowUpAt || selectedCount === 0) return;
    const dueAt = new Date(bulkFollowUpAt).toISOString();
    for (const conversation of selectedUnifiedConversations) {
      const note = bulkNoteInput.trim() || `Follow up: ${conversation.title || conversation.subject || conversation.contact_address || conversation.source_id}`;
      await patchUnifiedConversation(conversation, { todoAt: dueAt, todoNote: note });
    }
    await refreshUnifiedConversationData();
    setBulkFollowUpAt('');
    notify('Follow-up reminder set for selected items.', 'success');
  };

  const handleBulkAssignOwner = async () => {
    if (selectedCount === 0) return;
    const ownerId = bulkOwnerId || null;
    for (const conversation of selectedUnifiedConversations) {
      await patchUnifiedConversation(conversation, { ownerId });
      applyUnifiedConversationUpdate(conversation, { owner_id: ownerId || undefined });
    }
    setBulkOwnerId('');
    await refreshUnifiedConversationData();
    notify(language === 'zh' ? '负责人已批量更新。' : 'Owner updated for selected conversations.', 'success');
  };

  const handleBulkSetStage = async () => {
    if (selectedCount === 0 || !bulkStage) return;
    for (const conversation of selectedUnifiedConversations) {
      await patchUnifiedConversation(conversation, { stage: bulkStage });
      applyUnifiedConversationUpdate(conversation, { stage: bulkStage });
    }
    setBulkStage('');
    await refreshUnifiedConversationData();
    notify(language === 'zh' ? '阶段已批量更新。' : 'Stage updated for selected conversations.', 'success');
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
    let totalLinked = 0;
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
          totalLinked += data.linkedExistingEmails || 0;
        } else if (!options.silent) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to sync emails.');
        }
      }
      if (totalSynced > 0 || totalLinked > 0) {
        useStore.getState().fetchEmails();
      } else if (!options.silent) {
        useStore.getState().fetchEmails();
      }
      loadWhatsAppConversations();
      setLastSyncAt(new Date().toISOString());
      if (!options.silent) notify(`Sync complete. Fetched ${totalSynced} new email(s), linked ${totalLinked} existing email(s).`, 'success');
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
  const selectedEmailIsInbound = selectedEmail ? isInboundCustomerEmail(selectedEmail) : false;
  const selectedEmailContactAddress = selectedEmail
    ? (selectedEmailIsInbound ? selectedEmail.sender : selectedEmail.recipient)
    : '';
  const selectedEmailClient = selectedEmail?.clientId ? clients.find(client => client.id === selectedEmail.clientId) : null;
  const latestInboundEmailForSelectedClient = selectedEmailClient
    ? emails
        .filter(email => email.clientId === selectedEmailClient.id && ['inbox', 'inbound'].includes(email.type))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  const selectedEmailAgentContext = selectedEmail
    ? buildUnifiedAgentContext({
      channel: 'email',
      subject: selectedEmail.subject,
      contactLabel: selectedEmailContactAddress,
      client: selectedEmailClient,
      messages: [
        latestInboundEmailForSelectedClient && latestInboundEmailForSelectedClient.id !== selectedEmail.id ? {
          id: latestInboundEmailForSelectedClient.id,
          direction: 'inbound',
          subject: latestInboundEmailForSelectedClient.subject,
          body: extractLatestMessageText(latestInboundEmailForSelectedClient.body || ''),
          createdAt: latestInboundEmailForSelectedClient.date,
          channel: 'email',
          sender: latestInboundEmailForSelectedClient.senderName || latestInboundEmailForSelectedClient.sender
        } : null,
        {
          id: selectedEmail.id,
          direction: selectedEmailIsInbound ? 'inbound' : 'outbound',
          subject: selectedEmail.subject,
          body: extractLatestMessageText(selectedEmail.body || ''),
          createdAt: selectedEmail.date,
          channel: 'email',
          sender: selectedEmailIsInbound ? (selectedEmail.senderName || selectedEmail.sender) : selectedEmail.sender
        }
      ].filter(Boolean) as any,
      emails,
      logs,
      deals,
      knowledgeBase,
      products,
      currentMessageId: selectedEmail.id,
      extraFacts: [
        selectedEmail.senderIp ? `Sender IP: ${selectedEmail.senderIp}` : '',
        selectedEmail.senderCountry ? `Sender country: ${selectedEmail.senderCountry}` : ''
      ]
    })
    : { cacheKey: '', body: '', additionalContext: '', hasCustomerMessage: false };
  useEffect(() => {
    if (!selectedEmail) return;
    const nextFilter = getInboxFilterForEmail(selectedEmail);
    if (filter !== nextFilter) setFilter(nextFilter);
  }, [selectedEmail?.id, selectedEmail?.type]);

  const selectedTrackingEvents = [...(selectedEmail?.trackingEvents || [])].sort((a: any, b: any) => (
    new Date(b.created_at || b.createdAt || b.date || 0).getTime() - new Date(a.created_at || a.createdAt || a.date || 0).getTime()
  ));
  const isTrackingExpanded = selectedEmail ? expandedTrackingEmailIds.has(selectedEmail.id) : false;
  const visibleTrackingEvents = isTrackingExpanded ? selectedTrackingEvents : selectedTrackingEvents.slice(0, 3);
  const toggleTrackingExpanded = (emailId: string) => {
    setExpandedTrackingEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) next.delete(emailId);
      else next.add(emailId);
      return next;
    });
  };
  const matchWhatsAppClient = (phone: string) => clients.find(client => client.contactMethods?.some(method => (
    ['whatsapp', 'phone'].includes(method.type) && method.value.replace(/[^0-9]/g, '').endsWith(phone.slice(-8))
  )));
  const activeWhatsAppConversation = selectedWhatsAppPhone
    ? whatsappConversations.find(conversation => conversation.targetPhone === selectedWhatsAppPhone)
    : null;
  const activeWhatsAppClient = selectedWhatsAppPhone
    ? clients.find(client => client.id === (activeWhatsAppConversation?.clientId || selectedWhatsAppClientId))
      || matchWhatsAppClient(activeWhatsAppConversation?.targetPhone || selectedWhatsAppPhone)
      || null
    : null;
  const activeTelegramClient = selectedTelegramConversation?.client_id
    ? clients.find(client => client.id === selectedTelegramConversation.client_id) || null
    : null;
  const activeTelegramUsername = String(selectedTelegramConversation?.metadata?.username || selectedTelegramConversation?.contact_address || '').replace(/^@/, '').trim();
  const activeTelegramUserId = String(selectedTelegramConversation?.metadata?.telegramUserId || '').trim();
  const activeTelegramChatId = String(selectedTelegramConversation?.metadata?.telegramChatId || selectedTelegramConversation?.source_id || '').trim();
  const activeTelegramContactMethod: ContactMethod | null = selectedTelegramConversation
    ? {
        type: 'telegram',
        value: activeTelegramUsername
          ? `@${activeTelegramUsername}`
          : activeTelegramUserId || activeTelegramChatId
      }
    : null;
  const activeTelegramDisplayName = selectedTelegramConversation?.contact_name
    || selectedTelegramConversation?.title
    || (activeTelegramUsername ? `@${activeTelegramUsername}` : '')
    || activeTelegramUserId
    || activeTelegramChatId
    || 'Telegram User';
  const activeTelegramTranslateKey = selectedTelegramConversation?.id || '';
  const activeTelegramTranslateEnabled = Boolean(activeTelegramTranslateKey && conversationAutoTranslateConfig[conversationAutoTranslateId('telegram', activeTelegramTranslateKey)]);
  const activeTelegramTranslations = activeTelegramTranslateKey
    ? (conversationTranslations[conversationTranslationBucketId('telegram', activeTelegramTranslateKey, language)] || {})
    : {};
  const activeLiveChatSession = selectedLiveChatConversation
    ? liveChatSessions.find(session => session.id === selectedLiveChatConversation.source_id) || null
    : null;
  const activeLiveChatMessages = selectedLiveChatConversation
    ? (liveChatMessages[selectedLiveChatConversation.source_id] || [])
    : [];
  const activeLiveChatTranslateKey = selectedLiveChatConversation?.source_id || '';
  const activeLiveChatTranslateEnabled = Boolean(activeLiveChatTranslateKey && conversationAutoTranslateConfig[conversationAutoTranslateId('live_chat', activeLiveChatTranslateKey)]);
  const activeLiveChatTranslations = activeLiveChatTranslateKey
    ? (conversationTranslations[conversationTranslationBucketId('live_chat', activeLiveChatTranslateKey, language)] || {})
    : {};
  const visibleLiveChatMessages = activeLiveChatMessages.filter(message => message.role !== 'system').slice(-200);
  const activeLiveChatClient = activeLiveChatSession?.clientId || selectedLiveChatConversation?.client_id
    ? clients.find(client => client.id === (activeLiveChatSession?.clientId || selectedLiveChatConversation?.client_id)) || null
    : null;
  const activeLiveChatVisitorInfo = activeLiveChatSession?.metadata?.visitorInfo || selectedLiveChatConversation?.metadata?.visitorInfo || {};
  const latestLiveChatVisitorMessage = [...visibleLiveChatMessages].reverse().find(message => message.role === 'visitor') || null;
  const activeLiveChatTranscriptContext = visibleLiveChatMessages
    .slice(-12)
    .map(message => `${message.role}: ${message.body}`)
    .join('\n');
  const activeLiveChatEvidenceItems = [
    activeLiveChatSession?.pageUrl ? { label: language === 'zh' ? '访问页面' : 'Page URL', value: activeLiveChatSession.pageUrl } : null,
    activeLiveChatVisitorInfo.ip ? { label: 'IP', value: activeLiveChatVisitorInfo.ip } : null,
    activeLiveChatVisitorInfo.country ? { label: language === 'zh' ? '国家/地区' : 'Country', value: activeLiveChatVisitorInfo.country } : null,
    [activeLiveChatVisitorInfo.browserName, activeLiveChatVisitorInfo.browserVersion].filter(Boolean).join(' ')
      ? { label: language === 'zh' ? '浏览器' : 'Browser', value: [activeLiveChatVisitorInfo.browserName, activeLiveChatVisitorInfo.browserVersion].filter(Boolean).join(' ') }
      : null,
    activeLiveChatVisitorInfo.os ? { label: language === 'zh' ? '系统' : 'OS', value: activeLiveChatVisitorInfo.os } : null,
    activeLiveChatVisitorInfo.language || activeLiveChatVisitorInfo.acceptLanguage
      ? { label: language === 'zh' ? '语言' : 'Language', value: activeLiveChatVisitorInfo.language || activeLiveChatVisitorInfo.acceptLanguage }
      : null,
    activeLiveChatVisitorInfo.timezone ? { label: language === 'zh' ? '时区' : 'Timezone', value: activeLiveChatVisitorInfo.timezone } : null,
    activeLiveChatVisitorInfo.localTime ? { label: language === 'zh' ? '当地时间' : 'Local time', value: activeLiveChatVisitorInfo.localTime } : null,
    activeLiveChatSession?.createdAt ? { label: language === 'zh' ? '首次会话' : 'Session started', value: new Date(activeLiveChatSession.createdAt).toLocaleString() } : null,
    activeLiveChatSession?.lastMessageAt ? { label: language === 'zh' ? '最近消息' : 'Last message', value: new Date(activeLiveChatSession.lastMessageAt).toLocaleString() } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const activeLiveChatContactMethod: ContactMethod | null = activeLiveChatSession?.visitorEmail
    ? { type: 'email', value: activeLiveChatSession.visitorEmail }
    : activeLiveChatSession?.visitorPhone
      ? { type: 'phone', value: activeLiveChatSession.visitorPhone }
      : null;
  const activeLiveChatDisplayName = activeLiveChatSession?.visitorName
    || activeLiveChatSession?.visitorEmail
    || activeLiveChatSession?.visitorPhone
    || selectedLiveChatConversation?.contact_name
    || selectedLiveChatConversation?.contact_address
    || 'Live Chat Visitor';
  const activeLiveChatAgentContext = selectedLiveChatConversation
    ? buildUnifiedAgentContext({
      channel: 'live_chat',
      subject: selectedLiveChatConversation.title || 'Live Chat conversation',
      contactLabel: activeLiveChatDisplayName,
      client: activeLiveChatClient,
      messages: visibleLiveChatMessages.map(message => ({
        id: message.id,
        direction: message.role === 'visitor' ? 'inbound' : message.role === 'system' ? 'system' : 'outbound',
        body: message.body,
        createdAt: message.createdAt,
        channel: 'live_chat',
        sender: message.senderName || message.role
      })),
      emails,
      logs,
      deals,
      knowledgeBase,
      products,
      extraFacts: [
        activeLiveChatSession?.visitorEmail ? `Visitor email: ${activeLiveChatSession.visitorEmail}` : '',
        activeLiveChatSession?.visitorPhone ? `Visitor phone: ${activeLiveChatSession.visitorPhone}` : '',
        activeLiveChatSession?.pageUrl ? `Page URL: ${activeLiveChatSession.pageUrl}` : '',
        activeLiveChatEvidenceItems.length ? `Visitor evidence:\n${activeLiveChatEvidenceItems.map(item => `${item.label}: ${item.value}`).join('\n')}` : '',
        activeLiveChatTranscriptContext ? `Recent live chat transcript:\n${activeLiveChatTranscriptContext}` : ''
      ]
    })
    : { cacheKey: '', body: '', additionalContext: '', hasCustomerMessage: false };
  const activeTelegramAgentContext = selectedTelegramConversation
    ? buildUnifiedAgentContext({
      channel: 'telegram',
      subject: selectedTelegramConversation.title || 'Telegram conversation',
      contactLabel: activeTelegramDisplayName,
      client: activeTelegramClient,
      messages: telegramMessages.map(message => ({
        id: message.id,
        direction: message.direction === 'inbound' ? 'inbound' : message.direction === 'outbound' ? 'outbound' : 'system',
        body: message.body || '',
        createdAt: message.source_created_at || message.sourceCreatedAt || message.created_at || message.createdAt,
        channel: 'telegram',
        sender: message.sender || message.senderName || message.direction
      })),
      emails,
      logs,
      deals,
      knowledgeBase,
      products,
      extraFacts: [
        activeTelegramUsername ? `Telegram username: @${activeTelegramUsername}` : '',
        activeTelegramUserId ? `Telegram user id: ${activeTelegramUserId}` : '',
        activeTelegramChatId ? `Telegram chat id: ${activeTelegramChatId}` : '',
        selectedTelegramConversation.metadata?.humanTakeover ? 'Human takeover is active.' : ''
      ]
    })
    : { cacheKey: '', body: '', additionalContext: '', hasCustomerMessage: false };
  const activeLinkableContactMethod: ContactMethod | null = selectedEmail && selectedEmailContactAddress
    ? { type: 'email', value: selectedEmailContactAddress }
    : selectedLiveChatConversation
      ? activeLiveChatContactMethod
      : selectedTelegramConversation
        ? activeTelegramContactMethod
      : null;
  const activeLinkableDisplayName = selectedEmail
    ? (selectedEmail.senderName || selectedEmailContactAddress)
    : selectedTelegramConversation
      ? activeTelegramDisplayName
      : activeLiveChatDisplayName;
  const activeUnifiedConversation = useMemo(() => {
    if (selectedEmail) {
      return unifiedConversationSource.find(conversation => conversation.channel === 'email' && conversation.source_id === selectedEmail.id)
        || emailToUnifiedConversation(selectedEmail);
    }
    if (selectedWhatsAppPhone) {
      return unifiedConversationSource.find(conversation => (
        conversation.channel === 'whatsapp'
        && (
          conversation.source_id === activeWhatsAppConversation?.id
          || conversation.metadata?.targetPhone === selectedWhatsAppPhone
          || conversation.contact_address === selectedWhatsAppPhone
        )
      )) || (activeWhatsAppConversation ? whatsappToUnifiedConversation(activeWhatsAppConversation) : null);
    }
    if (selectedTelegramConversation) {
      return unifiedConversationSource.find(conversation => conversation.channel === 'telegram' && conversation.source_id === selectedTelegramConversation.source_id)
        || selectedTelegramConversation;
    }
    if (selectedLiveChatConversation) {
      return unifiedConversationSource.find(conversation => conversation.channel === 'live_chat' && conversation.source_id === selectedLiveChatConversation.source_id)
        || selectedLiveChatConversation;
    }
    return null;
  }, [activeWhatsAppConversation, selectedEmail, selectedWhatsAppPhone, selectedTelegramConversation, selectedLiveChatConversation, unifiedConversationSource]);
  const activeWhatsAppFollowUp = getWhatsAppFollowUp(activeWhatsAppConversation);
  const activeFollowUpAt = activeUnifiedConversation?.todo_at || selectedEmail?.todoAt || activeWhatsAppFollowUp?.dueAt || null;
  const activeFollowUpNote = activeUnifiedConversation?.todo_note || selectedEmail?.todoNote || activeWhatsAppFollowUp?.note || null;
  const activeConversationComments = (selectedTelegramConversation && activeTelegramClient)
    ? (activeTelegramClient.comments || [])
    : (selectedLiveChatConversation && activeLiveChatClient)
    ? (activeLiveChatClient.comments || [])
    : (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback)
    ? (activeUnifiedConversation.comments || [])
    : (selectedEmail?.comments || []);

  const appendActiveConversationComment = async (content: string, attachments?: any[]) => {
    const comment = {
      id: `uc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      author: 'User',
      content,
      createdAt: new Date().toISOString(),
      attachments,
      replies: []
    };
    if ((selectedTelegramConversation && activeTelegramClient) || (selectedLiveChatConversation && activeLiveChatClient)) {
      const client = activeTelegramClient || activeLiveChatClient!;
      const sourceLabel = selectedTelegramConversation ? 'Telegram' : 'Live Chat';
      editClient(client.id, {
        comments: [...(client.comments || []), {
          ...comment,
          content: `[${sourceLabel}] ${content}`
        }]
      });
      await refreshUnifiedConversationData();
    } else if (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback) {
      await patchUnifiedConversation(activeUnifiedConversation, {
        comments: [...(activeUnifiedConversation.comments || []), comment]
      });
      await refreshUnifiedConversationData();
    } else if (selectedEmail) {
      addEmailComment(selectedEmail.id, content, attachments);
    } else if (activeWhatsAppConversation) {
      const comments = await addWhatsAppConversationComment(activeWhatsAppConversation, content);
      updateWhatsAppConversationState(whatsappConversations.map(item => (
        item.id === activeWhatsAppConversation.id ? { ...item, comments } : item
      )));
    }
  };

  const replyActiveConversationComment = async (commentId: string, content: string, attachments?: any[]) => {
    if ((selectedTelegramConversation && activeTelegramClient) || (selectedLiveChatConversation && activeLiveChatClient)) {
      const client = activeTelegramClient || activeLiveChatClient!;
      const reply = {
        id: `ucr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        author: 'User',
        content,
        createdAt: new Date().toISOString(),
        attachments,
        replies: []
      };
      const comments = (client.comments || []).map((comment: any) => (
        comment.id === commentId
          ? { ...comment, replies: [...(comment.replies || []), reply] }
          : comment
      ));
      editClient(client.id, { comments });
    } else if (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback) {
      const reply = {
        id: `ucr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        author: 'User',
        content,
        createdAt: new Date().toISOString(),
        attachments,
        replies: []
      };
      const comments = (activeUnifiedConversation.comments || []).map((comment: any) => (
        comment.id === commentId
          ? { ...comment, replies: [...(comment.replies || []), reply] }
          : comment
      ));
      await patchUnifiedConversation(activeUnifiedConversation, { comments });
      await refreshUnifiedConversationData();
    } else if (selectedEmail) {
      addEmailReply(selectedEmail.id, commentId, content, attachments);
    }
  };

  const updateActiveConversationFollowUp = async (dueAt: string | null, note: string | null, status: 'open' | 'completed' | 'canceled' = 'open') => {
    if (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback) {
      await patchUnifiedConversation(activeUnifiedConversation, { todoAt: status === 'open' ? dueAt : null, todoNote: status === 'open' ? note : null });
      applyUnifiedConversationUpdate(activeUnifiedConversation, {
        todo_at: status === 'open' ? dueAt || undefined : undefined,
        todo_note: status === 'open' ? note || undefined : undefined
      });
    } else if (selectedEmail) {
      editEmail(selectedEmail.id, {
        todoAt: status === 'open' ? dueAt as any : null as any,
        todoNote: status === 'open' ? note as any : null as any
      });
      if (status === 'completed') await appendActiveConversationComment(language === 'zh' ? '跟进任务已完成。' : 'Follow-up task completed.');
    } else if (activeWhatsAppConversation) {
      const markerPayload = status === 'open'
        ? { status: 'open', dueAt, note: note || `Follow up WhatsApp conversation with ${activeWhatsAppConversation.clientName || activeWhatsAppConversation.targetPhone}.` }
        : status === 'completed'
          ? { status: 'completed', completedAt: new Date().toISOString() }
          : { status: 'canceled', canceledAt: new Date().toISOString() };
      const comments = await addWhatsAppConversationComment(activeWhatsAppConversation, `${WHATSAPP_FOLLOW_UP_MARKER}${JSON.stringify(markerPayload)}`);
      updateWhatsAppConversationState(whatsappConversations.map(item => (
        item.id === activeWhatsAppConversation.id ? { ...item, comments } : item
      )));
    }
    notify(
      status === 'open'
        ? (language === 'zh' ? '待跟进时间已更新。' : 'Follow-up reminder updated.')
        : status === 'completed'
          ? (language === 'zh' ? '待跟进已标记完成。' : 'Follow-up marked complete.')
          : (language === 'zh' ? '待跟进已取消。' : 'Follow-up cleared.'),
      'success'
    );
  };

  const handleSelect = (id: string) => {
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    setSelectedWhatsAppPhone(null);
    setSelectedWhatsAppClientId(null);
    setSelectedTelegramConversation(null);
    setTelegramMessages([]);
    setSelectedLiveChatConversation(null);
    selectEmail(id);
    const conversation = findEmailUnifiedConversation(id);
    if (conversation && !conversation.metadata?.localFallback) {
      void patchUnifiedConversation(conversation, { read: true }).then(() => refreshUnifiedConversationData()).catch(() => markEmailRead(id));
    } else {
      markEmailRead(id);
    }
  };

  const handleSelectWhatsApp = (conversation: InboxWhatsAppConversation) => {
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    setSelectedTelegramConversation(null);
    setTelegramMessages([]);
    setSelectedLiveChatConversation(null);
    selectEmail(null);
    setSelectedWhatsAppPhone(conversation.targetPhone);
    setSelectedWhatsAppClientId(conversation.clientId || null);
  };

  useEffect(() => {
    const consumeOpenRequest = () => {
      const raw = localStorage.getItem(INBOX_OPEN_REQUEST_KEY);
      if (!raw) return;
      let request: any = null;
      try {
        request = JSON.parse(raw);
      } catch {
        localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
        return;
      }
      if (!request || typeof request !== 'object') {
        localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
        return;
      }
      if (request.type === 'composeEmail') {
        setIsStartingWhatsApp(false);
        setSelectedWhatsAppPhone(null);
        setSelectedWhatsAppClientId(null);
        setSelectedTelegramConversation(null);
        setSelectedLiveChatConversation(null);
        selectEmail(null);
        setComposeDefaults({
          recipient: String(request.recipient || ''),
          subject: String(request.subject || ''),
          initialBody: String(request.initialBody || '')
        });
        setIsComposing(true);
        localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
        return;
      }
      if (request.type === 'whatsapp') {
        const phone = String(request.phone || '').trim();
        if (!phone) {
          localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
          return;
        }
        const normalizedPhone = phone.replace(/[^0-9]/g, '') || phone;
        const conversation = whatsappConversations.find(item => {
          const values = [item.targetPhone, item.contactPhone, item.rawChatId, item.conversationKey].filter(Boolean).map(value => String(value));
          return values.some(value => value === phone || value === normalizedPhone || value.replace(/[^0-9]/g, '') === normalizedPhone);
        });
        if (conversation) {
          handleSelectWhatsApp(conversation);
        } else {
          setIsComposing(false);
          setIsStartingWhatsApp(false);
          setSelectedTelegramConversation(null);
          setTelegramMessages([]);
          setSelectedLiveChatConversation(null);
          selectEmail(null);
          setSelectedWhatsAppPhone(normalizedPhone);
          setSelectedWhatsAppClientId(request.clientId || null);
        }
        setChannelFilter('whatsapp');
        localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
      }
    };
    consumeOpenRequest();
    window.addEventListener('storage', consumeOpenRequest);
    window.addEventListener('tradequest:open-inbox-request', consumeOpenRequest);
    return () => {
      window.removeEventListener('storage', consumeOpenRequest);
      window.removeEventListener('tradequest:open-inbox-request', consumeOpenRequest);
    };
  }, [whatsappConversations, selectEmail]);

  const loadTelegramMessages = async (conversation: UnifiedCommunicationConversation) => {
    setIsTelegramMessagesLoading(true);
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Telegram messages');
      setTelegramMessages(Array.isArray(data.messages) ? data.messages : []);
      if (!conversation.read) {
        await patchUnifiedConversation(conversation, { read: true });
        await refreshUnifiedConversationData();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to load Telegram messages.', 'error');
    } finally {
      setIsTelegramMessagesLoading(false);
    }
  };

  const handleSelectUnifiedConversation = (conversation: UnifiedCommunicationConversation) => {
    if (conversation.channel === 'email') {
      setSelectedTelegramConversation(null);
      setTelegramMessages([]);
      handleSelect(conversation.source_id);
      return;
    }
    if (conversation.channel === 'whatsapp') {
      setSelectedTelegramConversation(null);
      setTelegramMessages([]);
      const mapped = mapUnifiedWhatsAppConversation(conversation);
      setWhatsappConversations(prev => prev.some(item => item.id === mapped.id) ? prev : [mapped, ...prev]);
      handleSelectWhatsApp(mapped);
      return;
    }
    if (conversation.channel === 'telegram') {
      setIsComposing(false);
      setIsStartingWhatsApp(false);
      selectEmail(null);
      setSelectedWhatsAppPhone(null);
      setSelectedWhatsAppClientId(null);
      setSelectedLiveChatConversation(null);
      setSelectedTelegramConversation(conversation);
      setTelegramReply('');
      void loadTelegramMessages(conversation);
      return;
    }
    selectEmail(null);
    setSelectedWhatsAppPhone(null);
    setSelectedWhatsAppClientId(null);
    setSelectedTelegramConversation(null);
    setTelegramMessages([]);
    setSelectedLiveChatConversation(conversation);
    setLiveChatReply('');
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    void fetchLiveChatMessages(conversation.source_id);
    void fetchLiveChatSessions();
  };

  const sendTelegramReply = async () => {
    if (!selectedTelegramConversation || !telegramReply.trim()) return;
    setIsSendingTelegramReply(true);
    try {
      const res = await fetch(`/api/telegram/conversations/${encodeURIComponent(selectedTelegramConversation.source_id)}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ body: telegramReply.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send Telegram message');
      setTelegramReply('');
      await loadTelegramMessages(selectedTelegramConversation);
      await refreshUnifiedConversationData();
      notify(language === 'zh' ? 'Telegram 消息已发送。' : 'Telegram message sent.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to send Telegram message.', 'error');
    } finally {
      setIsSendingTelegramReply(false);
    }
  };

  const draftTelegramReply = async () => {
    if (!selectedTelegramConversation) return;
    const llmId = llmMappings.telegram_customer_service_agent
      || llmMappings.agent_context_suggestions
      || llmMappings.drafting
      || activeLLMId;
    const llmConfig = llmId ? llmConfigs.find(config => config.id === llmId) : null;
    if (!llmConfig) {
      notify(language === 'zh' ? '请先在 AI & Integrations 配置 Telegram/上下文建议模型。' : 'Configure a Telegram/context suggestion AI model first.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          command: `Draft a concise Telegram customer-service reply. Do not send it. Return only the message body.

Rules:
- Reply only to inbound customer intent. Team outbound messages are background only.
- Use the customer's preferred/likely language when available.
- Use product, RAG, AI summary, best next step, and cross-channel history only when helpful.
- If no inbound customer message exists, write a light, low-pressure follow-up instead of pretending the customer asked something.

Current context:
${activeTelegramAgentContext.body}

Broader CRM context:
${activeTelegramAgentContext.additionalContext}`,
          context: {
            channel: 'telegram',
            clientId: activeTelegramClient?.id || selectedTelegramConversation.client_id || null,
            conversationId: selectedTelegramConversation.source_id,
            systemLanguage: language === 'zh' ? 'Chinese' : 'English'
          },
          llmConfig,
          skipKnowledgeBase: false
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to draft Telegram reply');
      const draft = String(data.result || '').replace(/```[\s\S]*?```/g, match => match.replace(/```(?:text|markdown)?/g, '').replace(/```/g, '')).trim();
      if (!draft) throw new Error('AI returned an empty Telegram draft.');
      setTelegramReply(draft);
      notify(language === 'zh' ? 'Telegram 回复草稿已生成。' : 'Telegram reply draft generated.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to draft Telegram reply.', 'error');
    }
  };

  const toggleTelegramHumanTakeover = async () => {
    if (!selectedTelegramConversation) return;
    const nextHumanTakeover = !selectedTelegramConversation.metadata?.humanTakeover;
    try {
      const res = await fetch(`/api/telegram/conversations/${encodeURIComponent(selectedTelegramConversation.source_id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ humanTakeover: nextHumanTakeover })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update Telegram takeover mode');
      setSelectedTelegramConversation(prev => prev ? {
        ...prev,
        metadata: {
          ...(prev.metadata || {}),
          humanTakeover: nextHumanTakeover,
          priority: data.conversation?.priority ?? prev.metadata?.priority
        }
      } : prev);
      await refreshUnifiedConversationData();
      notify(
        nextHumanTakeover
          ? (language === 'zh' ? '已开启人工接管，Telegram Agent 将暂停自动回复。' : 'Human takeover enabled. Telegram Agent auto-reply is paused.')
          : (language === 'zh' ? '已关闭人工接管，Telegram Agent 将在新入站消息后自动回复。' : 'Human takeover disabled. Telegram Agent can auto-reply to the next inbound message.'),
        'success'
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to update Telegram takeover mode.', 'error');
    }
  };

  const sendLiveChatReply = async () => {
    if (!selectedLiveChatConversation || !liveChatReply.trim()) return;
    setIsSendingLiveChatReply(true);
    try {
      await sendLiveChatOperatorMessage(selectedLiveChatConversation.source_id, liveChatReply.trim());
      setLiveChatReply('');
      await refreshUnifiedConversationData();
      notify(language === 'zh' ? 'Live Chat 消息已发送。' : 'Live Chat message sent.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to send Live Chat message.', 'error');
    } finally {
      setIsSendingLiveChatReply(false);
    }
  };

  const toggleLiveChatHumanTakeover = async () => {
    if (!selectedLiveChatConversation) return;
    const current = activeLiveChatSession?.humanTakeover ?? selectedLiveChatConversation.metadata?.humanTakeover;
    const nextHumanTakeover = !current;
    try {
      await updateLiveChatSession(selectedLiveChatConversation.source_id, { humanTakeover: nextHumanTakeover } as Partial<LiveChatSession>);
      setSelectedLiveChatConversation(prev => prev ? {
        ...prev,
        metadata: {
          ...(prev.metadata || {}),
          humanTakeover: nextHumanTakeover
        }
      } : prev);
      await refreshUnifiedConversationData();
      notify(
        nextHumanTakeover
          ? (language === 'zh' ? '已开启人工接管，Live Chat Agent 将暂停自动回复。' : 'Human takeover enabled. Live Chat Agent auto-reply is paused.')
          : (language === 'zh' ? '已交还给 Agent，新访客消息可自动回复。' : 'Handed back to Agent. New visitor messages can trigger auto-replies.'),
        'success'
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to update Live Chat takeover mode.', 'error');
    }
  };

  const runSelectedLiveChatAgent = async () => {
    if (!selectedLiveChatConversation) return;
    setIsRunningLiveChatAgent(true);
    try {
      await runLiveChatAgent(selectedLiveChatConversation.source_id);
      await fetchLiveChatMessages(selectedLiveChatConversation.source_id);
      await refreshUnifiedConversationData();
      notify(language === 'zh' ? 'Live Chat Agent 已运行。' : 'Live Chat Agent ran successfully.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to run Live Chat Agent.', 'error');
    } finally {
      setIsRunningLiveChatAgent(false);
    }
  };

  const handleDeleteWhatsAppConversation = (conversation: InboxWhatsAppConversation) => {
    setConfirmDialog({
      message: `Are you sure you want to delete this WhatsApp conversation with ${conversation.clientName || conversation.targetPhone}? This will remove the saved conversation and messages from this system.`,
      onConfirm: async () => {
        try {
          const unified = unifiedConversationSource.find(item => item.channel === 'whatsapp' && (item.id === conversation.unifiedId || item.source_id === conversation.id));
          if (!unified) throw new Error('Unified WhatsApp conversation is not loaded yet.');
          await deleteUnifiedConversation(unified);
          setWhatsappConversations(prev => {
            const next = prev.filter(item => item.id !== conversation.id);
            writeCachedWhatsAppConversations(next);
            return next;
          });
          if (selectedWhatsAppPhone === conversation.targetPhone) setSelectedWhatsAppPhone(null);
          await refreshUnifiedConversationData();
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
    setShowWhatsAppContactPicker(false);
  };

  const selectWhatsAppContactOption = (option: WhatsAppContactOption) => {
    setNewWhatsAppPhone(option.phone);
    setSelectedWhatsAppClientId(option.clientId);
    setShowWhatsAppContactPicker(false);
  };

  const handleCreateLead = () => {
    const canCreateFromEmail = selectedEmail && !selectedEmail.clientId;
    const canCreateFromLiveChat = selectedLiveChatConversation && !activeLiveChatClient && activeLiveChatContactMethod;
    const canCreateFromTelegram = selectedTelegramConversation && !activeTelegramClient && activeTelegramContactMethod;
    if (!canCreateFromEmail && !canCreateFromLiveChat && !canCreateFromTelegram) return;
    setIsCreatingLead(true);
  };

  const submitTodo = async () => {
    if (!todoModalEmail || !todoAt) return;
    const conversation = findEmailUnifiedConversation(todoModalEmail);
    if (conversation && !conversation.metadata?.localFallback) {
      await patchUnifiedConversation(conversation, { todoAt, todoNote });
      await refreshUnifiedConversationData();
    } else {
      editEmail(todoModalEmail, { todoAt, todoNote });
    }
    setTodoModalEmail(null);
    setTodoAt('');
    setTodoNote('');
    setActiveMenu(null);
  };

  const submitTag = async () => {
    if (!tagModalEmail || !tagInput.trim()) return;
    const email = emails.find(e => e.id === tagModalEmail);
    if (!email) return;
    let tg = tagInput.trim();
    if (!tg.startsWith('#')) tg = '#' + tg;
    const currentTags = email.tags || [];
    if (!currentTags.includes(tg)) {
      const tags = [...currentTags, tg];
      const conversation = findEmailUnifiedConversation(email.id);
      if (conversation && !conversation.metadata?.localFallback) {
        await patchUnifiedConversation(conversation, { tags });
        await refreshUnifiedConversationData();
      } else {
        editEmail(email.id, { tags });
      }
    }
    setTagModalEmail(null);
    setTagInput('');
    setActiveMenu(null);
  };

  const toggleImportant = async (email: EmailMessage) => {
    const conversation = findEmailUnifiedConversation(email.id);
    const nextImportant = !email.isImportant;
    if (conversation && !conversation.metadata?.localFallback) {
      await patchUnifiedConversation(conversation, { isImportant: nextImportant });
      await refreshUnifiedConversationData();
    } else {
      editEmail(email.id, { isImportant: nextImportant });
    }
    setActiveMenu(null);
  };

  const handleAddToRag = async () => {
    if (!selectedEmail || !selectedEmail.clientId) return;
    setAddingToRag(true);
    try {
      const latestText = extractLatestEmailText(selectedEmail.body || '');
      if (!latestText) {
        notify('No readable email text found to add to the knowledge base.', 'warning');
        return;
      }

      let summary = '';
      const llmId = llmMappings.analysis || llmMappings.agent_context_suggestions || activeLLMId;
      const llmConfig = llmId ? llmConfigs.find(config => config.id === llmId) : null;
      if (llmConfig) {
        try {
          const res = await fetch('/api/chat/magic', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${useAuthStore.getState().token}`
            },
            body: JSON.stringify({
              command: `Summarize the latest email message into a concise CRM knowledge-base note. Use ${language === 'zh' ? 'Chinese' : 'English'} for internal users. Extract only stable facts, customer needs, objections, preferences, requirements, deadlines, quoted terms, and recommended follow-up context. Do not include HTML, quoted previous emails, signatures, greetings, tracking text, or markdown fences.`,
              context: {
                clientId: selectedEmail.clientId,
                systemLanguage: language,
                subject: selectedEmail.subject,
                sender: selectedEmail.sender,
                recipient: selectedEmail.recipient,
                latestEmailText: latestText
              },
              llmConfig,
              skipKnowledgeBase: true
            })
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.result) summary = String(data.result).trim();
        } catch (error) {
          console.warn('Email knowledge summarization failed, using cleaned text fallback.', error);
        }
      }

      const content = [
        `Date: ${new Date(selectedEmail.date).toLocaleString()}`,
        `From: ${selectedEmail.sender}`,
        `To: ${selectedEmail.recipient}`,
        '',
        summary || fallbackEmailKnowledgeSummary(latestText)
      ].join('\n');

      addKnowledgeItem({
        clientId: selectedEmail.clientId,
        title: `Email Summary: ${selectedEmail.subject}`,
        content
      });
      setAddedToRagId(selectedEmail.id);
      setTimeout(() => setAddedToRagId(null), 2000);
      notify(language === 'zh' ? '已将邮件摘要添加到知识库。' : 'Email summary added to knowledge base.', 'success');
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : 'Failed to add email to knowledge base.', 'error');
    } finally {
      setAddingToRag(false);
    }
  };

  return (
    <PanelGroup id="inbox-layout" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} orientation="horizontal" className="flex-1 overflow-hidden bg-slate-900 border-t border-slate-800">
      {/* Sidebar List */}
      <Panel id="inbox-list" defaultSize={320} minSize={250} maxSize={500} className={cn("flex flex-col transition-transform relative z-10", (selectedEmailId || selectedWhatsAppPhone || selectedTelegramConversation || selectedLiveChatConversation || isStartingWhatsApp) && "hidden md:flex")}>
        <InboxSidebarControls
          language={language}
          filter={filter}
          channelFilter={channelFilter}
          search={search}
          searchTags={searchTags}
          tagSuggestions={Array.from(new Set(emails.flatMap(e => e.tags || [])))}
          followUpOnly={followUpOnly}
          visibleFollowUpCount={visibleFollowUpCount}
          totalConversations={unifiedConversationList.length}
          isSyncing={isSyncing}
          isWhatsAppBackgroundSyncing={isWhatsAppBackgroundSyncing}
          syncError={syncError}
          lastSyncAt={lastSyncAt}
          onFilterChange={(nextFilter) => {
            selectEmail(null);
            setSelectedWhatsAppPhone(null);
            setSelectedTelegramConversation(null);
            setSelectedLiveChatConversation(null);
            setFilter(nextFilter);
          }}
          onChannelFilterChange={(nextChannel) => {
            setChannelFilter(nextChannel);
            if (nextChannel === 'whatsapp' || nextChannel === 'live_chat' || nextChannel === 'telegram') {
              setFilter('inbox');
              setEmailListMode('list');
              selectEmail(null);
            }
            if (nextChannel !== 'whatsapp' && selectedWhatsAppPhone) {
              setSelectedWhatsAppPhone(null);
              setSelectedWhatsAppClientId(null);
            }
            if (nextChannel !== 'telegram') {
              setSelectedTelegramConversation(null);
              setTelegramMessages([]);
            }
            if (nextChannel !== 'live_chat') {
              setSelectedLiveChatConversation(null);
            }
          }}
          onSearchChange={setSearch}
          onSearchTagsChange={setSearchTags}
          onToggleFollowUpOnly={() => {
            setFollowUpOnly(prev => !prev);
            clearBulkSelection();
          }}
          onClearFollowUpOnly={() => setFollowUpOnly(false)}
          onSync={() => handleSync()}
          onComposeEmail={() => {
            setComposeDefaults(null);
            setIsComposing(true);
            setIsStartingWhatsApp(false);
            setSelectedWhatsAppPhone(null);
            setSelectedTelegramConversation(null);
            setSelectedLiveChatConversation(null);
            selectEmail(null);
          }}
          onStartWhatsApp={() => {
            setIsStartingWhatsApp(true);
            setIsComposing(false);
            setSelectedWhatsAppPhone(null);
            setSelectedWhatsAppClientId(null);
            setSelectedTelegramConversation(null);
            setSelectedLiveChatConversation(null);
            selectEmail(null);
          }}
        />

        <div className="flex-1 overflow-y-auto scrollbar-thin pb-48">
          {selectableVisibleCount > 0 && (
            <InboxBulkActionsPanel
              language={language}
              selectedCount={selectedCount}
              allVisibleSelected={allVisibleSelected}
              someVisibleSelected={someVisibleSelected}
              currentUser={currentUser}
              bulkTagInput={bulkTagInput}
              bulkNoteInput={bulkNoteInput}
              bulkOwnerId={bulkOwnerId}
              bulkStage={bulkStage}
              bulkFollowUpAt={bulkFollowUpAt}
              onToggleSelectAll={toggleSelectAll}
              onClearSelection={clearBulkSelection}
              onBulkTagInputChange={setBulkTagInput}
              onBulkNoteInputChange={setBulkNoteInput}
              onBulkOwnerIdChange={setBulkOwnerId}
              onBulkStageChange={setBulkStage}
              onBulkFollowUpAtChange={setBulkFollowUpAt}
              onAddTag={handleBulkAddTag}
              onAddComment={handleBulkAddComment}
              onAssignOwner={handleBulkAssignOwner}
              onSetStage={handleBulkSetStage}
              onSetFollowUp={handleBulkSetFollowUp}
              onMarkImportant={handleBulkMarkImportant}
              onDeleteSelected={handleDeleteSelected}
            />
          )}
          {totalVisibleCount === 0 && (
            <div className="p-8 text-center text-sm text-slate-500 italic">
              {isUnifiedConversationLoading ? 'Loading conversations...' : 'No conversations found.'}
            </div>
          )}
          {unifiedConversationList.map(conversation => {
            const isEmail = conversation.channel === 'email';
            const isWhatsApp = conversation.channel === 'whatsapp';
            const isLiveChat = conversation.channel === 'live_chat';
            const isTelegram = conversation.channel === 'telegram';
            const isSelected = isEmail
              ? selectedEmailId === conversation.source_id
              : isWhatsApp
                ? selectedWhatsAppPhone === (conversation.metadata?.targetPhone || conversation.contact_address || conversation.source_id)
                : isTelegram
                  ? selectedTelegramConversation?.id === conversation.id
                  : isLiveChat
                    ? selectedLiveChatConversation?.id === conversation.id
                    : false;
            const email = isEmail ? emails.find(item => item.id === conversation.source_id) : null;
            const whatsappConversation = isWhatsApp ? mapUnifiedWhatsAppConversation(conversation) : null;
            const client = conversation.client_id ? clients.find(c => c.id === conversation.client_id) : null;
            const Icon = isWhatsApp ? MessageCircle : isLiveChat ? MessageSquare : isTelegram ? Send : (conversation.read ? MailOpen : Mail);
            const iconColor = isWhatsApp ? 'text-green-400' : isLiveChat ? 'text-violet-300' : isTelegram ? 'text-sky-300' : conversation.read ? 'text-slate-500' : 'text-cyan-400';
            const iconBg = isWhatsApp ? 'bg-green-950/50 border-green-900/60' : isLiveChat ? 'bg-violet-950/50 border-violet-900/60' : isTelegram ? 'bg-sky-950/50 border-sky-900/60' : 'bg-cyan-950/50 border-cyan-900/60';
            const channelLabel = isWhatsApp
              ? `WhatsApp ${conversation.direction === 'outbound' ? 'sent' : 'inbox'}`
              : isLiveChat
                ? `Live Chat ${conversation.status || 'open'}`
                : isTelegram
                  ? `Telegram ${conversation.status || 'open'}`
                : email?.type === 'draft'
                  ? 'Draft'
                  : email?.type === 'scheduled'
                    ? 'Scheduled Email'
                    : conversation.direction === 'outbound'
                      ? 'Email sent'
                      : 'Email inbox';
            const title = isEmail
              ? (filter === 'inbox' ? (email?.senderName || conversation.contact_name || conversation.contact_address || 'Email') : (conversation.contact_address || conversation.contact_name || 'Email'))
              : client?.name || conversation.client_name || conversation.title || conversation.contact_name || conversation.contact_address || (isWhatsApp ? 'WhatsApp' : isTelegram ? 'Telegram' : 'Live Chat');
            const subtitle = isEmail ? (conversation.subject || conversation.title || '(No Subject)') : (conversation.contact_address || conversation.client_company || '');
            return (
              <div
                key={`${conversation.channel}_${conversation.source_id}`}
                onClick={() => handleSelectUnifiedConversation(conversation)}
                className={cn(
                  "cursor-pointer border-b border-slate-800/50 p-4 transition-colors flex gap-3 group relative",
                  isSelected ? (isWhatsApp ? "bg-green-950/20" : isLiveChat ? "bg-violet-950/20" : isTelegram ? "bg-sky-950/20" : "bg-cyan-950/20") : "hover:bg-slate-800/30",
                  isEmail && !conversation.read && filter === 'inbox' && "bg-slate-800/40"
                )}
              >
                <div
                  className={cn("pt-0.5 transition-opacity", selectedConversationIds.has(conversation.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                  onClick={(e) => toggleUnifiedSelection(e, conversation)}
                >
                  <input
                    type="checkbox"
                    checked={selectedConversationIds.has(conversation.id)}
                    onChange={() => {}}
                    className={cn("rounded border-slate-700 bg-slate-800 focus:ring-cyan-500", isWhatsApp ? "text-green-500" : isLiveChat ? "text-violet-500" : isTelegram ? "text-sky-500" : "text-cyan-500")}
                  />
                </div>
                {false && (isEmail || isWhatsApp) && (
                  <div
                    className={cn("pt-0.5 transition-opacity", (isEmail ? selectedIds.has(conversation.source_id) : selectedWhatsAppIds.has(conversation.source_id)) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                    onClick={(e) => isEmail ? toggleSelection(e, conversation.source_id) : toggleWhatsAppSelection(e, conversation.source_id)}
                  >
                    <input
                      type="checkbox"
                      checked={isEmail ? selectedIds.has(conversation.source_id) : selectedWhatsAppIds.has(conversation.source_id)}
                      onChange={() => {}}
                      className={cn("rounded border-slate-700 bg-slate-800 focus:ring-cyan-500", isWhatsApp ? "text-green-500" : "text-cyan-500")}
                    />
                  </div>
                )}
                <div className="pt-0.5 flex-shrink-0">
                  <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center", iconBg)}>
                    <Icon className={cn("w-4 h-4", iconColor)} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className={cn("text-sm font-bold truncate", isEmail && !conversation.read && filter === 'inbox' ? "text-white" : "text-slate-200")}>
                      {title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-500">
                        {conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : channelLabel}
                      </span>
                      {(conversation.is_important || (conversation.tags || []).includes('important')) && (
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      )}
                      {isWhatsApp && whatsappConversation && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWhatsAppConversation(whatsappConversation);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition-opacity"
                          title="Delete WhatsApp conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold uppercase mb-1",
                    isWhatsApp ? 'text-green-400' : isLiveChat ? 'text-violet-300' : isTelegram ? 'text-sky-300' : 'text-cyan-400'
                  )}>
                    {channelLabel}
                  </div>
                  {subtitle && (
                    <div className={cn("text-xs font-medium mb-1 truncate", isEmail && !conversation.read && filter === 'inbox' ? "text-slate-200" : "text-slate-400")}>
                      {subtitle}
                    </div>
                  )}
                  {conversation.last_message_preview && (
                    <div className="text-xs text-slate-500 line-clamp-2">
                      {conversation.last_message_preview}
                    </div>
                  )}
                  {conversation.tags && conversation.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-hide">
                      {conversation.tags.slice(0, 4).map(t => (
                        <span key={t} className={cn(
                          "text-[9px] bg-slate-800 px-1.5 py-0.5 rounded-full whitespace-nowrap",
                          isWhatsApp ? 'text-green-300' : isLiveChat ? 'text-violet-200' : isTelegram ? 'text-sky-200' : 'text-slate-400'
                        )}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2" onClick={event => event.stopPropagation()}>
                    <select
                      value={conversation.owner_id || ''}
                      onChange={event => updateConversationOwnerStage(conversation, { ownerId: event.target.value || null })}
                      className="min-w-0 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400 outline-none hover:border-slate-700 focus:border-blue-500"
                      title={language === 'zh' ? '负责人' : 'Owner'}
                    >
                      <option value="">{language === 'zh' ? '未分配' : 'Unassigned'}</option>
                      {currentUser && (
                        <option value={currentUser.id}>{language === 'zh' ? '我负责' : 'Owner: Me'}</option>
                      )}
                    </select>
                    <select
                      value={conversation.stage || ''}
                      onChange={event => updateConversationOwnerStage(conversation, { stage: event.target.value || null })}
                      className="min-w-0 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400 outline-none hover:border-slate-700 focus:border-purple-500"
                      title={language === 'zh' ? '阶段' : 'Stage'}
                    >
                      <option value="">{language === 'zh' ? '未设阶段' : 'No stage'}</option>
                      {CONVERSATION_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          {false && ([] as UnifiedCommunicationConversation[]).map(conversation => {
            const client = conversation.client_id ? clients.find(c => c.id === conversation.client_id) : null;
            return (
              <div
                key={`lc_${conversation.id}`}
                onClick={() => {
                  selectEmail(null);
                  setSelectedWhatsAppPhone(null);
                  setSelectedWhatsAppClientId(null);
                  setSelectedLiveChatConversation(conversation);
                }}
                className="cursor-pointer border-b border-slate-800/50 p-4 transition-colors flex gap-3 group relative hover:bg-slate-800/30"
              >
                <div className="pt-0.5 flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-violet-950/50 border border-violet-900/60 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-violet-300" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm font-bold truncate text-slate-200">
                      {client?.name || conversation.client_name || conversation.title || conversation.contact_name || 'Live Chat'}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : 'Live Chat'}
                    </span>
                  </div>
                  <div className="text-[10px] text-violet-300 font-bold uppercase mb-1">
                    Live Chat {conversation.status || 'open'}
                  </div>
                  {(conversation.contact_address || conversation.client_company) && (
                    <div className="mb-1 truncate text-[10px] text-slate-600">
                      {[conversation.contact_address, conversation.client_company].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  <div className="text-xs font-medium mb-1 truncate text-slate-400">
                    {conversation.last_message_preview || 'Open live chat conversation'}
                  </div>
                  {conversation.tags && conversation.tags.length > 0 && (
                    <div className="flex gap-1 mb-1 overflow-x-auto scrollbar-hide">
                      {conversation.tags.slice(0, 4).map(t => (
                        <span key={t} className="text-[9px] bg-slate-800 text-violet-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {false && filteredWhatsAppConversations.map(conversation => {
            const displayPhone = conversation.contactPhone || conversation.targetPhone;
            const rawChatId = conversation.rawChatId || (/@(?:lid|c\.us|g\.us)$/i.test(conversation.targetPhone) ? conversation.targetPhone : '');
            const client = conversation.clientId ? clients.find(c => c.id === conversation.clientId) : matchWhatsAppClient(displayPhone);
            return (
              <div
                key={`wa_${conversation.id}`}
                onClick={() => handleSelectWhatsApp(conversation)}
                className={cn("cursor-pointer border-b border-slate-800/50 p-4 transition-colors flex gap-3 group relative",
                  selectedWhatsAppPhone === conversation.targetPhone ? "bg-green-950/20" : "hover:bg-slate-800/30"
                )}
              >
                <div
                  className={cn("pt-0.5 transition-opacity", selectedWhatsAppIds.has(conversation.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                  onClick={(e) => toggleWhatsAppSelection(e, conversation.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedWhatsAppIds.has(conversation.id)}
                    onChange={() => {}}
                    className="rounded border-slate-700 bg-slate-800 text-green-500 focus:ring-green-500"
                  />
                </div>
                <div className="pt-0.5 flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-green-950/50 border border-green-900/60 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm font-bold truncate text-slate-200">
                      {client?.name || conversation.clientName || displayPhone}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-500">
                        {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString() : 'WhatsApp'}
                      </span>
                      {(conversation.tags || []).includes('important') && (
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      )}
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
                  {rawChatId && (
                    <div className="mb-1 truncate text-[10px] text-slate-600" title={rawChatId}>
                      {conversation.contactPhone ? `${conversation.contactPhone} (${rawChatId} -> ${conversation.contactPhone})` : rawChatId}
                    </div>
                  )}
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
          {false && channelFilter !== 'whatsapp' && emailListMode === 'conversation' && emailConversationGroups.map(group => {
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
                      {group.unreadCount > 0 ? (
                        <Mail className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <MailOpen className="w-4 h-4 text-slate-500" />
                      )}
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
          {false && channelFilter !== 'whatsapp' && emailListMode === 'list' && filteredEmails.map(email => (
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
              <div className="pt-0.5 flex-shrink-0" title={email.read ? "Read email" : "Unread email"}>
                {email.read ? (
                  <MailOpen className="w-4 h-4 text-slate-500" />
                ) : (
                  <Mail className="w-4 h-4 text-cyan-400" />
                )}
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
                                const conversation = findEmailUnifiedConversation(email.id);
                                if (selectedEmailId === email.id) selectEmail(null);
                                if (conversation && !conversation.metadata?.localFallback) {
                                  await deleteUnifiedConversation(conversation);
                                  await refreshUnifiedConversationData();
                                } else {
                                  await useStore.getState().deleteEmails([email.id]);
                                }
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
      <Panel id="inbox-content" className={cn("flex flex-col bg-slate-950/50 relative", !selectedEmailId && !selectedWhatsAppPhone && !selectedTelegramConversation && !selectedLiveChatConversation && !isComposing && !isStartingWhatsApp && "hidden md:flex")}>
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
                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number or @Contact</label>
                  <input
                    value={newWhatsAppPhone}
                    onChange={e => {
                      const value = e.target.value;
                      setNewWhatsAppPhone(value);
                      if (value.includes('@')) setShowWhatsAppContactPicker(true);
                      if (selectedWhatsAppClientId && value.replace(/[^0-9]/g, '') !== newWhatsAppPhone.replace(/[^0-9]/g, '')) {
                        setSelectedWhatsAppClientId(null);
                      }
                    }}
                    onFocus={() => setShowWhatsAppContactPicker(newWhatsAppPhone.includes('@'))}
                    onKeyDown={e => { if (e.key === 'Enter') startNewWhatsApp(); }}
                    placeholder="+1 555 000 0000 or @customer"
                    className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-green-500"
                    autoFocus
                  />
                  <div className="mt-2 text-[11px] text-slate-500">
                    Type <span className="text-green-300">@</span> to choose a saved customer/contact WhatsApp number.
                  </div>
                  {visibleWhatsAppContactOptions.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
                      {visibleWhatsAppContactOptions.map(option => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => selectWhatsAppContactOption(option)}
                          className="w-full text-left px-3 py-2.5 hover:bg-green-500/10 border-b border-slate-800 last:border-b-0"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-200 truncate">
                                {option.contactName}
                                {option.contactName !== option.clientName && (
                                  <span className="ml-2 text-xs font-normal text-slate-500">({option.clientName})</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {[option.contactTitle, option.clientCompany].filter(Boolean).join(' · ') || option.clientName}
                              </div>
                            </div>
                            <div className="shrink-0 text-xs text-green-300 font-mono">{option.phone}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {newWhatsAppPhone.includes('@') && visibleWhatsAppContactOptions.length === 0 && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-xs text-slate-500 shadow-2xl">
                      No saved WhatsApp contacts matched.
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setIsStartingWhatsApp(false); setShowWhatsAppContactPicker(false); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
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
        ) : selectedTelegramConversation ? (
          <div className="flex-1 flex flex-col min-h-0">
            <ConversationDetailHeader
              language={language}
              channel="telegram"
              title={selectedTelegramConversation.client_name || selectedTelegramConversation.title || selectedTelegramConversation.contact_name || selectedTelegramConversation.contact_address || 'Telegram'}
              subtitle={selectedTelegramConversation.contact_address || selectedTelegramConversation.metadata?.telegramChatId || ''}
              clientId={activeTelegramClient?.id || selectedTelegramConversation.client_id}
              clientName={activeTelegramClient?.name || selectedTelegramConversation.client_name}
              tags={activeTelegramClient?.tags || selectedTelegramConversation.tags || []}
              ownerId={selectedTelegramConversation.owner_id}
              stage={selectedTelegramConversation.stage}
              currentUser={currentUser}
              onBack={() => { setSelectedTelegramConversation(null); setTelegramMessages([]); }}
              onClientClick={() => {
                const id = activeTelegramClient?.id || selectedTelegramConversation.client_id;
                if (id) selectClient(id);
              }}
              onOwnerChange={(ownerId) => {
                updateConversationOwnerStage(selectedTelegramConversation, { ownerId });
                setSelectedTelegramConversation(prev => prev ? { ...prev, owner_id: ownerId || undefined } : prev);
              }}
              onStageChange={(stage) => {
                updateConversationOwnerStage(selectedTelegramConversation, { stage });
                setSelectedTelegramConversation(prev => prev ? { ...prev, stage: stage || undefined } : prev);
              }}
              onDelete={() => {
                setConfirmDialog({
                  message: 'Are you sure you want to delete this Telegram conversation from CRM?',
                  onConfirm: async () => {
                    await deleteUnifiedConversation(selectedTelegramConversation);
                    setSelectedTelegramConversation(null);
                    setTelegramMessages([]);
                    await refreshUnifiedConversationData();
                    setConfirmDialog(null);
                  }
                });
              }}
              actions={(
                <button
                  type="button"
                  onClick={toggleTelegramHumanTakeover}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                    selectedTelegramConversation.metadata?.humanTakeover
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                      : "border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
                  )}
                  title={selectedTelegramConversation.metadata?.humanTakeover ? 'Human takeover is active' : 'Telegram Agent auto-reply is enabled when the agent is active'}
                >
                  {selectedTelegramConversation.metadata?.humanTakeover ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  {selectedTelegramConversation.metadata?.humanTakeover
                    ? (language === 'zh' ? '人工接管' : 'Human Takeover')
                    : (language === 'zh' ? 'Agent 自动' : 'Agent Auto')}
                </button>
              )}
              meta={(
                <>
                  <button
                    type="button"
                    onClick={() => setConversationAutoTranslateEnabled('telegram', selectedTelegramConversation.id, !activeTelegramTranslateEnabled)}
                    className={cn(
                      "text-xs flex items-center gap-1 rounded border px-1.5 py-0.5",
                      activeTelegramTranslateEnabled
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Languages className="w-3 h-3" />
                    {language === 'zh' ? '自动翻译' : 'Auto Translate'}
                    <span className={cn("h-1.5 w-1.5 rounded-full", activeTelegramTranslateEnabled ? "bg-cyan-300" : "bg-slate-600")} />
                  </button>
                  {!activeTelegramClient && !selectedTelegramConversation.client_id && activeTelegramContactMethod && (
                    <>
                      <button onClick={handleCreateLead} className="text-cyan-500 flex items-center gap-1 hover:text-cyan-400 bg-slate-800/50 rounded px-1.5 py-0.5">
                        <UserPlus className="w-3 h-3" /> New Lead
                      </button>
                      <button onClick={() => setIsAddingContactToClient(true)} className="text-emerald-400 flex items-center gap-1 hover:text-emerald-300 bg-slate-800/50 rounded px-1.5 py-0.5">
                        <User className="w-3 h-3" /> Add to Existing Client
                      </button>
                    </>
                  )}
                  {selectedTelegramConversation.metadata?.telegramChatId && (
                    <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">chat: {selectedTelegramConversation.metadata.telegramChatId}</span>
                  )}
                  {selectedTelegramConversation.metadata?.telegramUserId && (
                    <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">user: {selectedTelegramConversation.metadata.telegramUserId}</span>
                  )}
                  {selectedTelegramConversation.metadata?.humanTakeover && (
                    <span className="bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-700/40 text-amber-200">
                      {language === 'zh' ? 'Agent 已暂停' : 'Agent paused'}
                    </span>
                  )}
                </>
              )}
            />
            <ConversationFollowUpStrip
              language={language}
              dueAt={selectedTelegramConversation.todo_at || null}
              note={selectedTelegramConversation.todo_note || null}
              onSet={async (dueAt, note) => {
                const patched = await patchUnifiedConversation(selectedTelegramConversation, { todoAt: dueAt, todoNote: note });
                setSelectedTelegramConversation(patched);
                await refreshUnifiedConversationData();
              }}
              onClear={async () => {
                const patched = await patchUnifiedConversation(selectedTelegramConversation, { todoAt: null, todoNote: null });
                setSelectedTelegramConversation(patched);
                await refreshUnifiedConversationData();
              }}
              onComplete={async () => {
                const patched = await patchUnifiedConversation(selectedTelegramConversation, { todoAt: null, todoNote: null, status: 'completed' });
                setSelectedTelegramConversation(patched);
                await refreshUnifiedConversationData();
              }}
            />
            <div className="flex-1 overflow-y-auto bg-slate-950/50 p-6 space-y-4">
              {isTelegramMessagesLoading ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Telegram messages...
                </div>
              ) : telegramMessages.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500 italic">No Telegram messages saved yet.</div>
              ) : telegramMessages.map(message => {
                const outbound = message.direction === 'outbound';
                const translation = activeTelegramTranslations[message.id] || message.payload?.translation;
                const isTranslating = translatingConversationMessageIds.has(`telegram:${message.id}`);
                return (
                  <div key={message.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[78%] rounded-2xl border px-4 py-3 text-sm shadow-sm",
                      outbound
                        ? "border-sky-500/30 bg-sky-600/20 text-sky-50"
                        : "border-slate-800 bg-slate-900 text-slate-100"
                    )}>
                      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
                        <span>{message.sender || message.senderName || (outbound ? 'Operator' : 'Telegram')}</span>
                        <span>{message.message_type || message.messageType || 'message'}</span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">{message.body || '[media]'}</div>
                      {!outbound && ((activeTelegramTranslateEnabled && isTranslating) || translation?.text) && (
                        <div className="mt-3 border-t border-slate-700/70 pt-2 text-xs leading-relaxed text-cyan-100">
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                            <Languages className="h-3 w-3" />
                            {language === 'zh' ? '翻译' : 'Translation'}
                            {isTranslating && <Loader2 className="h-3 w-3 animate-spin" />}
                          </div>
                          <div className="whitespace-pre-wrap">{translation?.text || (language === 'zh' ? '翻译中...' : 'Translating...')}</div>
                        </div>
                      )}
                      <div className="mt-2 text-[10px] text-slate-500">
                        {message.source_created_at || message.sourceCreatedAt ? new Date(message.source_created_at || message.sourceCreatedAt).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              <AgentContextSuggestions
                channel="telegram"
                cacheKey={activeTelegramAgentContext.cacheKey}
                contextLookup={{ conversationId: selectedTelegramConversation.id }}
                clientId={activeTelegramClient?.id || selectedTelegramConversation.client_id}
                clientName={activeTelegramClient?.name || selectedTelegramConversation.client_name}
                persistedInsight={selectedTelegramConversation.agent_context_analysis_key === activeTelegramAgentContext.cacheKey ? selectedTelegramConversation.agent_context_analysis : undefined}
                persistedInsightKey={selectedTelegramConversation.agent_context_analysis_key}
                subject={selectedTelegramConversation.title || activeTelegramDisplayName || 'Telegram conversation'}
                body={activeTelegramAgentContext.body}
                additionalContext={activeTelegramAgentContext.additionalContext}
                hasClient={!!(activeTelegramClient?.id || selectedTelegramConversation.client_id)}
                hasKnowledge={!!activeTelegramClient}
                hasCustomerMessage={activeTelegramAgentContext.hasCustomerMessage}
                draftReplyLabel={language === 'zh' ? '起草 Telegram 回复' : 'Draft Telegram Reply'}
                draftReplyDescription={language === 'zh' ? '使用客户资料、Telegram 记录、产品和 RAG 上下文生成回复草稿。' : 'Draft a Telegram reply using customer, conversation, product, and RAG context.'}
                onDraftReply={draftTelegramReply}
                onAddComment={async () => appendActiveConversationComment(`Telegram note: ${activeTelegramAgentContext.latestInbound?.body || selectedTelegramConversation.title || 'Follow up this Telegram conversation'}`)}
                onCreateLead={!activeTelegramClient && !selectedTelegramConversation.client_id ? handleCreateLead : undefined}
                followUpAt={activeFollowUpAt}
                followUpNote={activeFollowUpNote}
                onSetFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note || `Follow up Telegram conversation with ${activeTelegramDisplayName}.`, 'open')}
                onClearFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
                onCompleteFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
                onSaveAnalysis={async (key, insight) => {
                  const patched = await patchUnifiedConversation(selectedTelegramConversation, {
                    agentContextAnalysis: insight,
                    agentContextAnalysisKey: key
                  });
                  setSelectedTelegramConversation(prev => prev ? {
                    ...prev,
                    agent_context_analysis: patched.agent_context_analysis || insight,
                    agent_context_analysis_key: patched.agent_context_analysis_key || key
                  } : prev);
                  applyUnifiedConversationUpdate(selectedTelegramConversation, {
                    agent_context_analysis: patched.agent_context_analysis || insight,
                    agent_context_analysis_key: patched.agent_context_analysis_key || key
                  });
                }}
                onDeleteItem={() => {
                  setConfirmDialog({
                    message: 'Are you sure you want to delete this Telegram conversation from CRM?',
                    onConfirm: async () => {
                      await deleteUnifiedConversation(selectedTelegramConversation);
                      setSelectedTelegramConversation(null);
                      setTelegramMessages([]);
                      await refreshUnifiedConversationData();
                      setConfirmDialog(null);
                    }
                  });
                }}
              />
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                      <MessageSquare className="h-4 w-4 text-sky-300" />
                      {language === 'zh' ? '内部备注' : 'Internal Notes'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {activeTelegramClient
                        ? (language === 'zh' ? '已关联客户：备注保存到客户资料。' : 'Linked client: notes are saved to the customer profile.')
                        : (language === 'zh' ? '未关联客户：备注暂存到当前 Telegram 会话。' : 'Unlinked Telegram user: notes are saved to this conversation.')}
                    </div>
                  </div>
                </div>
                <div className="mb-3 space-y-3">
                  {activeConversationComments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">
                      {language === 'zh' ? '暂无内部备注。' : 'No internal notes yet.'}
                    </div>
                  ) : activeConversationComments.slice(-5).map(comment => (
                    <CommentItem key={comment.id} comment={comment} onReply={(cmtId, text, atts) => void replyActiveConversationComment(cmtId, text, atts)} />
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={commentText}
                    onChange={event => setCommentText(event.target.value)}
                    placeholder={language === 'zh' ? '添加内部备注...' : 'Add an internal note...'}
                    className="min-h-[64px] flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!commentText.trim()) return;
                      void appendActiveConversationComment(commentText.trim()).then(() => setCommentText(''));
                    }}
                    disabled={!commentText.trim()}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {language === 'zh' ? '添加' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-end gap-3">
                <textarea
                  value={telegramReply}
                  onChange={event => setTelegramReply(event.target.value)}
                  onKeyDown={event => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                      event.preventDefault();
                      void sendTelegramReply();
                    }
                  }}
                  placeholder={language === 'zh' ? '输入 Telegram 回复，Ctrl+Enter 发送...' : 'Write a Telegram reply, Ctrl+Enter to send...'}
                  className="min-h-[76px] flex-1 resize-none rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={sendTelegramReply}
                  disabled={isSendingTelegramReply || !telegramReply.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {isSendingTelegramReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {language === 'zh' ? '发送' : 'Send'}
                </button>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {language === 'zh'
                  ? '发送使用 Settings -> Telegram Bot 中配置的 Bot Token。AI 自动回复和人工接管控制将在下一步接入。'
                  : 'Sending uses the Bot Token configured in Settings -> Telegram Bot. Human takeover pauses Telegram Agent auto-replies.'}
              </div>
            </div>
          </div>
        ) : selectedLiveChatConversation ? (
          <div className="flex-1 flex flex-col min-h-0">
            <ConversationDetailHeader
              language={language}
              channel="live_chat"
              title={activeLiveChatClient?.name || selectedLiveChatConversation.client_name || selectedLiveChatConversation.title || activeLiveChatSession?.visitorName || 'Live Chat'}
              subtitle={activeLiveChatSession?.visitorEmail || activeLiveChatSession?.visitorPhone || selectedLiveChatConversation.contact_address || activeLiveChatSession?.pageUrl || ''}
              clientId={activeLiveChatClient?.id || selectedLiveChatConversation.client_id}
              clientName={activeLiveChatClient?.name || selectedLiveChatConversation.client_name}
              tags={activeLiveChatClient?.tags || activeUnifiedConversation?.tags || activeLiveChatSession?.tags || selectedLiveChatConversation.tags || []}
              ownerId={activeUnifiedConversation?.owner_id}
              stage={activeUnifiedConversation?.stage}
              currentUser={currentUser}
              onBack={() => setSelectedLiveChatConversation(null)}
              onClientClick={() => {
                const id = activeLiveChatClient?.id || selectedLiveChatConversation.client_id;
                if (id) selectClient(id);
              }}
              onOwnerChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (ownerId) => {
                updateConversationOwnerStage(activeUnifiedConversation, { ownerId });
              } : undefined}
              onStageChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (stage) => {
                updateConversationOwnerStage(activeUnifiedConversation, { stage });
              } : undefined}
              onDelete={() => {
                setConfirmDialog({
                  message: 'Are you sure you want to delete this Live Chat conversation? It may require approval before records are removed.',
                  onConfirm: async () => {
                    await deleteUnifiedConversation(selectedLiveChatConversation);
                    setSelectedLiveChatConversation(null);
                    await refreshUnifiedConversationData();
                    setConfirmDialog(null);
                  }
                });
              }}
              actions={(
                <>
                  <button
                    type="button"
                    onClick={toggleLiveChatHumanTakeover}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                      (activeLiveChatSession?.humanTakeover ?? selectedLiveChatConversation.metadata?.humanTakeover)
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                        : "border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                    )}
                  >
                    {(activeLiveChatSession?.humanTakeover ?? selectedLiveChatConversation.metadata?.humanTakeover) ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {(activeLiveChatSession?.humanTakeover ?? selectedLiveChatConversation.metadata?.humanTakeover)
                      ? (language === 'zh' ? '人工接管' : 'Human Takeover')
                      : (language === 'zh' ? 'Agent 自动' : 'Agent Auto')}
                  </button>
                  <button
                    type="button"
                    onClick={runSelectedLiveChatAgent}
                    disabled={isRunningLiveChatAgent}
                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
                  >
                    {isRunningLiveChatAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {language === 'zh' ? '运行 Agent' : 'Run Agent'}
                  </button>
                </>
              )}
              meta={(
                <>
                  <button
                    type="button"
                    onClick={() => setConversationAutoTranslateEnabled('live_chat', selectedLiveChatConversation.source_id, !activeLiveChatTranslateEnabled)}
                    className={cn(
                      "text-xs flex items-center gap-1 rounded border px-1.5 py-0.5",
                      activeLiveChatTranslateEnabled
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Languages className="w-3 h-3" />
                    {language === 'zh' ? '自动翻译' : 'Auto Translate'}
                    <span className={cn("h-1.5 w-1.5 rounded-full", activeLiveChatTranslateEnabled ? "bg-cyan-300" : "bg-slate-600")} />
                  </button>
                  {!activeLiveChatClient && !selectedLiveChatConversation.client_id && activeLiveChatContactMethod && (
                    <>
                      <button onClick={handleCreateLead} className="text-cyan-500 flex items-center gap-1 hover:text-cyan-400 bg-slate-800/50 rounded px-1.5 py-0.5">
                        <UserPlus className="w-3 h-3" /> New Lead
                      </button>
                      <button onClick={() => setIsAddingContactToClient(true)} className="text-emerald-400 flex items-center gap-1 hover:text-emerald-300 bg-slate-800/50 rounded px-1.5 py-0.5">
                        <User className="w-3 h-3" /> Add to Existing Client
                      </button>
                    </>
                  )}
                  {activeLiveChatSession?.visitorEmail && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">email: {activeLiveChatSession.visitorEmail}</span>}
                  {activeLiveChatSession?.visitorPhone && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">phone: {activeLiveChatSession.visitorPhone}</span>}
                  {activeLiveChatSession?.pageUrl && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70 truncate max-w-[360px]">page: {activeLiveChatSession.pageUrl}</span>}
                  {activeLiveChatVisitorInfo.ip && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">IP: {activeLiveChatVisitorInfo.ip}</span>}
                  {activeLiveChatVisitorInfo.browserName && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">{[activeLiveChatVisitorInfo.browserName, activeLiveChatVisitorInfo.browserVersion].filter(Boolean).join(' ')}</span>}
                  {activeLiveChatVisitorInfo.os && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">{activeLiveChatVisitorInfo.os}</span>}
                </>
              )}
            />
            <ConversationFollowUpStrip
              language={language}
              dueAt={activeFollowUpAt}
              note={activeFollowUpNote}
              onSet={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note, 'open')}
              onClear={() => updateActiveConversationFollowUp(null, null, 'canceled')}
              onComplete={() => updateActiveConversationFollowUp(null, null, 'completed')}
            />
            <div className="flex-1 overflow-y-auto bg-slate-950/50 p-6 space-y-4">
              {activeLiveChatClient && (activeLiveChatClient.agentSummary || activeLiveChatClient.leadSummary || activeLiveChatClient.agentNextStep || activeLiveChatClient.leadNextStep) && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 text-sm text-slate-200">
                  {(activeLiveChatClient.agentSummary || activeLiveChatClient.leadSummary) && (
                    <div className="mb-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300">AI Customer Summary</div>
                      <div className="mt-1 leading-relaxed">{activeLiveChatClient.agentSummary || activeLiveChatClient.leadSummary}</div>
                    </div>
                  )}
                  {(activeLiveChatClient.agentNextStep || activeLiveChatClient.leadNextStep) && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Best Next Step</div>
                      <div className="mt-1 leading-relaxed">{activeLiveChatClient.agentNextStep || activeLiveChatClient.leadNextStep}</div>
                    </div>
                  )}
                </div>
              )}
              {activeLiveChatEvidenceItems.length > 0 && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-200">
                        {language === 'zh' ? '访客上下文证据' : 'Visitor Context Evidence'}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {language === 'zh'
                          ? '这些信息会作为 Live Chat Agent 建议的上下文依据。'
                          : 'These facts are used as context for Live Chat Agent suggestions.'}
                      </div>
                    </div>
                    <span className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-bold uppercase text-violet-200">
                      {activeLiveChatEvidenceItems.length} {language === 'zh' ? '项' : 'facts'}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {activeLiveChatEvidenceItems.map(item => (
                      <div key={`${item.label}:${item.value}`} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</div>
                        <div className="mt-1 break-words text-xs text-slate-200">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {visibleLiveChatMessages.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500 italic">No Live Chat messages saved yet.</div>
              ) : visibleLiveChatMessages.map((message: LiveChatMessage) => {
                const outbound = message.role === 'operator' || message.role === 'agent';
                const translation = activeLiveChatTranslations[message.id] || message.metadata?.translation;
                const isTranslating = translatingConversationMessageIds.has(`live_chat:${message.id}`);
                return (
                  <div key={message.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[78%] rounded-2xl border px-4 py-3 text-sm shadow-sm",
                      outbound
                        ? "border-violet-500/30 bg-violet-600/20 text-violet-50"
                        : "border-slate-800 bg-slate-900 text-slate-100"
                    )}>
                      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
                        <span>{message.senderName || (outbound ? 'Operator' : 'Visitor')}</span>
                        <span>{message.role}</span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">{message.body}</div>
                      {!outbound && ((activeLiveChatTranslateEnabled && isTranslating) || translation?.text) && (
                        <div className="mt-3 border-t border-slate-700/70 pt-2 text-xs leading-relaxed text-cyan-100">
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                            <Languages className="h-3 w-3" />
                            {language === 'zh' ? '翻译' : 'Translation'}
                            {isTranslating && <Loader2 className="h-3 w-3 animate-spin" />}
                          </div>
                          <div className="whitespace-pre-wrap">{translation?.text || (language === 'zh' ? '翻译中...' : 'Translating...')}</div>
                        </div>
                      )}
                      <div className="mt-2 text-[10px] text-slate-500">
                        {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              <AgentContextSuggestions
                channel="live_chat"
                cacheKey={activeLiveChatAgentContext.cacheKey}
                contextLookup={{ conversationId: selectedLiveChatConversation.id }}
                clientId={activeLiveChatClient?.id || selectedLiveChatConversation.client_id}
                clientName={activeLiveChatClient?.name || selectedLiveChatConversation.client_name}
                persistedInsight={selectedLiveChatConversation.agent_context_analysis_key === activeLiveChatAgentContext.cacheKey ? selectedLiveChatConversation.agent_context_analysis : undefined}
                persistedInsightKey={selectedLiveChatConversation.agent_context_analysis_key}
                subject={selectedLiveChatConversation.title || 'Live Chat conversation'}
                body={activeLiveChatAgentContext.body}
                additionalContext={activeLiveChatAgentContext.additionalContext}
                hasClient={!!(activeLiveChatClient?.id || selectedLiveChatConversation.client_id)}
                hasKnowledge={!!activeLiveChatClient}
                hasCustomerMessage={activeLiveChatAgentContext.hasCustomerMessage}
                draftReplyLabel={language === 'zh' ? '运行 Agent 回复' : 'Run Agent Reply'}
                draftReplyDescription={language === 'zh' ? '使用客户资料、聊天记录、产品和 RAG 上下文生成并发送 Live Chat 回复。' : 'Generate and send a Live Chat reply using customer, conversation, product, and RAG context.'}
                onDraftReply={runSelectedLiveChatAgent}
                onAddComment={async () => appendActiveConversationComment(`Live Chat note: ${latestLiveChatVisitorMessage?.body || selectedLiveChatConversation.title || 'Follow up this visitor'}`)}
                followUpAt={activeFollowUpAt}
                followUpNote={activeFollowUpNote}
                onSetFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note || `Follow up Live Chat: ${selectedLiveChatConversation.title || selectedLiveChatConversation.contact_address || selectedLiveChatConversation.source_id}`, 'open')}
                onClearFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
                onCompleteFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
                onSaveAnalysis={async (key, insight) => {
                  const patched = await patchUnifiedConversation(selectedLiveChatConversation, {
                    agentContextAnalysis: insight,
                    agentContextAnalysisKey: key
                  });
                  setSelectedLiveChatConversation(prev => prev ? {
                    ...prev,
                    agent_context_analysis: patched.agent_context_analysis || insight,
                    agent_context_analysis_key: patched.agent_context_analysis_key || key
                  } : prev);
                  applyUnifiedConversationUpdate(selectedLiveChatConversation, {
                    agent_context_analysis: patched.agent_context_analysis || insight,
                    agent_context_analysis_key: patched.agent_context_analysis_key || key
                  });
                }}
                onDeleteItem={() => {
                  setConfirmDialog({
                    message: 'Are you sure you want to delete this Live Chat conversation? It may require approval before records are removed.',
                    onConfirm: async () => {
                      await deleteUnifiedConversation(selectedLiveChatConversation);
                      setSelectedLiveChatConversation(null);
                      await refreshUnifiedConversationData();
                      setConfirmDialog(null);
                    }
                  });
                }}
              />
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                      <MessageSquare className="h-4 w-4 text-violet-300" />
                      {language === 'zh' ? '内部备注' : 'Internal Notes'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {activeLiveChatClient
                        ? (language === 'zh' ? '已关联客户：备注保存到客户资料。' : 'Linked client: notes are saved to the customer profile.')
                        : (language === 'zh' ? '未关联客户：备注暂存到当前会话。' : 'Unlinked visitor: notes are saved to this conversation.')}
                    </div>
                  </div>
                </div>
                <div className="mb-3 space-y-3">
                  {activeConversationComments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">
                      {language === 'zh' ? '暂无内部备注。' : 'No internal notes yet.'}
                    </div>
                  ) : activeConversationComments.slice(-5).map(comment => (
                    <CommentItem key={comment.id} comment={comment} onReply={(cmtId, text, atts) => void replyActiveConversationComment(cmtId, text, atts)} />
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={commentText}
                    onChange={event => setCommentText(event.target.value)}
                    placeholder={language === 'zh' ? '添加内部备注...' : 'Add an internal note...'}
                    className="min-h-[64px] flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!commentText.trim()) return;
                      void appendActiveConversationComment(commentText.trim()).then(() => setCommentText(''));
                    }}
                    disabled={!commentText.trim()}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {language === 'zh' ? '添加' : 'Add'}
                  </button>
                </div>
              </div>
              <div ref={liveChatEndRef} />
            </div>
            <div className="border-t border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-end gap-3">
                <textarea
                  value={liveChatReply}
                  onChange={event => setLiveChatReply(event.target.value)}
                  onKeyDown={event => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                      event.preventDefault();
                      void sendLiveChatReply();
                    }
                  }}
                  placeholder={language === 'zh' ? '输入 Live Chat 回复，Ctrl+Enter 发送...' : 'Write a Live Chat reply, Ctrl+Enter to send...'}
                  className="min-h-[76px] flex-1 resize-none rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={sendLiveChatReply}
                  disabled={isSendingLiveChatReply || !liveChatReply.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {isSendingLiveChatReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {language === 'zh' ? '发送' : 'Send'}
                </button>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {language === 'zh'
                  ? '人工接管会暂停后台 Live Chat Agent 自动回复；交还给 Agent 后，新访客消息可自动触发。'
                  : 'Human takeover pauses background Live Chat Agent replies. Hand back to Agent to let new visitor messages trigger automation.'}
              </div>
            </div>
          </div>
        ) : selectedWhatsAppPhone ? (
          <div className="flex-1 flex flex-col min-h-0">
            {activeWhatsAppConversation && (
              <ConversationDetailHeader
                language={language}
                channel="whatsapp"
                title={activeWhatsAppClient?.name || activeWhatsAppConversation.clientName || activeWhatsAppConversation.targetPhone}
                subtitle={activeWhatsAppConversation.contactPhone || activeWhatsAppConversation.targetPhone}
                clientId={activeWhatsAppClient?.id || activeWhatsAppConversation.clientId}
                clientName={activeWhatsAppClient?.name || activeWhatsAppConversation.clientName}
                tags={activeUnifiedConversation?.tags || activeWhatsAppConversation.tags || []}
                ownerId={activeUnifiedConversation?.owner_id}
                stage={activeUnifiedConversation?.stage}
                currentUser={currentUser}
                onBack={() => { setSelectedWhatsAppPhone(null); setSelectedWhatsAppClientId(null); }}
                onClientClick={() => {
                  const id = activeWhatsAppClient?.id || activeWhatsAppConversation.clientId;
                  if (id) selectClient(id);
                }}
                onOwnerChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (ownerId) => {
                  updateConversationOwnerStage(activeUnifiedConversation, { ownerId });
                } : undefined}
                onStageChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (stage) => {
                  updateConversationOwnerStage(activeUnifiedConversation, { stage });
                } : undefined}
                onDelete={() => handleDeleteWhatsAppConversation(activeWhatsAppConversation)}
                meta={activeWhatsAppConversation.rawChatId && activeWhatsAppConversation.rawChatId !== activeWhatsAppConversation.targetPhone ? (
                  <span>{activeWhatsAppConversation.rawChatId} -&gt; {activeWhatsAppConversation.targetPhone}</span>
                ) : undefined}
              />
            )}
            <ConversationFollowUpStrip
              language={language}
              dueAt={activeFollowUpAt}
              note={activeFollowUpNote}
              onSet={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note, 'open')}
              onClear={() => updateActiveConversationFollowUp(null, null, 'canceled')}
              onComplete={() => updateActiveConversationFollowUp(null, null, 'completed')}
            />
            <WhatsAppChatModal
              key={activeWhatsAppConversation?.id || selectedWhatsAppPhone}
              embedded
              phone={selectedWhatsAppPhone}
              client={activeWhatsAppClient}
              conversation={activeWhatsAppConversation}
              onClose={() => {
                setSelectedWhatsAppPhone(null);
                setSelectedWhatsAppClientId(null);
                loadWhatsAppConversations();
              }}
            />
          </div>
        ) : selectedEmail ? (
          <>
            <ConversationDetailHeader
              language={language}
              channel="email"
              title={isInboundCustomerEmail(selectedEmail) ? (selectedEmail.senderName || selectedEmail.sender) : (selectedEmail.type === 'draft' ? `Draft: ${selectedEmail.recipient || '(No Recipient)'}` : selectedEmail.recipient)}
              subtitle={isInboundCustomerEmail(selectedEmail) ? `From: ${selectedEmail.sender}` : (selectedEmail.type === 'draft' ? `To: ${selectedEmail.recipient || '(No Recipient)'}` : `To: ${selectedEmail.recipient}`)}
              clientId={selectedEmail.clientId}
              clientName={selectedEmail.clientId ? clients.find(c => c.id === selectedEmail.clientId)?.name : undefined}
              tags={activeUnifiedConversation?.tags || selectedEmail.tags || []}
              ownerId={activeUnifiedConversation?.owner_id}
              stage={activeUnifiedConversation?.stage}
              currentUser={currentUser}
              onBack={() => selectEmail(null)}
              onClientClick={() => selectedEmail.clientId && selectClient(selectedEmail.clientId)}
              onOwnerChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (ownerId) => {
                updateConversationOwnerStage(activeUnifiedConversation, { ownerId });
              } : undefined}
              onStageChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (stage) => {
                updateConversationOwnerStage(activeUnifiedConversation, { stage });
              } : undefined}
              onDelete={() => {
                setConfirmDialog({
                  message: 'Are you sure you want to delete this email? Emails associated with a client will be soft-deleted pending admin review.',
                  onConfirm: async () => {
                    const conversation = activeUnifiedConversation;
                    selectEmail(null);
                    if (conversation && !conversation.metadata?.localFallback) await deleteUnifiedConversation(conversation);
                    else await useStore.getState().deleteEmails([selectedEmail.id]);
                    await refreshUnifiedConversationData();
                    setConfirmDialog(null);
                  }
                });
              }}
              meta={(
                <>
                  {!selectedEmail.clientId && (
                    <>
                      <button onClick={handleCreateLead} className="text-cyan-500 flex items-center gap-1 hover:text-cyan-400 bg-slate-800/50 rounded px-1.5 py-0.5">
                        <UserPlus className="w-3 h-3" /> New Lead
                      </button>
                      <button onClick={() => setIsAddingContactToClient(true)} className="text-emerald-400 flex items-center gap-1 hover:text-emerald-300 bg-slate-800/50 rounded px-1.5 py-0.5">
                        <User className="w-3 h-3" /> Add to Existing Client
                      </button>
                    </>
                  )}
                  {isInboundCustomerEmail(selectedEmail) && selectedEmail.senderIp && (
                    <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">IP: {selectedEmail.senderIp}</span>
                  )}
                  {isInboundCustomerEmail(selectedEmail) && selectedEmail.senderCountry && (
                    <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70 text-emerald-300">{selectedEmail.senderCountry}</span>
                  )}
                  {selectedEmail.cc && <span>Cc: {selectedEmail.cc}</span>}
                  {selectedEmail.bcc && <span>Bcc: {selectedEmail.bcc}</span>}
                </>
              )}
              actions={(
                <>
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
                </>
              )}
            />
            <ConversationFollowUpStrip
              language={language}
              dueAt={activeFollowUpAt}
              note={activeFollowUpNote}
              onSet={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note, 'open')}
              onClear={() => updateActiveConversationFollowUp(null, null, 'canceled')}
              onComplete={() => updateActiveConversationFollowUp(null, null, 'completed')}
            />
            
            <div className="p-6 overflow-y-auto scrollbar-thin flex-1">
               {/* Tracking Details */}
               {((selectedEmail.type === 'sent' || selectedEmail.type === 'scheduled' || selectedEmail.type === 'outbound') && (selectedEmail.body?.includes('/api/track/open/') || selectedEmail.enableTracking)) && (
                 <div className="mb-6 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                     <Radar className="w-4 h-4 text-emerald-400" /> Interaction Tracking Activity
                   </div>
                   {selectedTrackingEvents.length === 0 ? (
                     <div className="text-sm text-slate-500 py-2">No tracking events have been recorded yet.</div>
                   ) : (
                     <div className="space-y-3">
                       {visibleTrackingEvents.map((evt: any, i: number) => (
                         <div key={`${evt.created_at || i}-${evt.type || 'event'}`} className="flex flex-wrap items-center gap-4 text-sm bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
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
                       {selectedTrackingEvents.length > 3 && (
                         <button
                           type="button"
                           onClick={() => toggleTrackingExpanded(selectedEmail.id)}
                           className="text-xs font-bold text-emerald-300 hover:text-emerald-200 transition-colors"
                         >
                           {isTrackingExpanded
                             ? (language === 'zh' ? '收起' : 'Show Less')
                             : (language === 'zh' ? `显示全部 ${selectedTrackingEvents.length} 条记录` : `Show More (${selectedTrackingEvents.length})`)}
                         </button>
                       )}
                     </div>
                   )}
                 </div>
               )}

               <h2 className="text-xl font-bold text-slate-200 mb-6">{selectedEmail.subject}</h2>
               <div 
                 className="text-sm bg-white text-black p-6 rounded-lg leading-relaxed overflow-x-auto"
                 dangerouslySetInnerHTML={{ __html: (selectedEmail.body || '').replace(/<img[^>]*\/api\/track\/open\/[^>]*>/g, '') }}
               />

               <AgentContextSuggestions
                 channel="email"
                 cacheKey={selectedEmailAgentContext.cacheKey || `email:${selectedEmail.id}`}
                 contextLookup={activeUnifiedConversation?.id ? { conversationId: activeUnifiedConversation.id } : undefined}
                 clientId={selectedEmail.clientId}
                 emailAddress={isInboundCustomerEmail(selectedEmail) ? selectedEmail.sender : selectedEmail.recipient}
                 defaultAnalysisMode={['sent', 'outbound', 'scheduled'].includes(selectedEmail.type) ? 'manual' : undefined}
                 persistedInsight={selectedEmail.agentContextAnalysisKey === (selectedEmailAgentContext.cacheKey || `email:${selectedEmail.id}`) ? selectedEmail.agentContextAnalysis : undefined}
                 persistedInsightKey={selectedEmail.agentContextAnalysisKey}
                 subject={selectedEmail.subject}
                 body={selectedEmailAgentContext.body}
                 additionalContext={selectedEmailAgentContext.additionalContext}
                 clientName={selectedEmail.clientId ? clients.find(c => c.id === selectedEmail.clientId)?.name : undefined}
                 hasClient={!!selectedEmail.clientId}
                 hasKnowledge={addedToRagId === selectedEmail.id}
                 hasCustomerMessage={selectedEmailAgentContext.hasCustomerMessage}
                 autoScrollOnOpen
                 onDraftReply={() => {
                   const replySourceEmail = isInboundCustomerEmail(selectedEmail)
                     ? selectedEmail
                     : latestInboundEmailForSelectedClient || selectedEmail;
                   setComposeDefaults({
                     recipient: isInboundCustomerEmail(replySourceEmail) ? replySourceEmail.sender : selectedEmail.recipient,
                     subject: `Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`,
                     originalEmailBody: isInboundCustomerEmail(replySourceEmail)
                       ? `On ${new Date(replySourceEmail.date).toLocaleString()}, ${replySourceEmail.senderName || replySourceEmail.sender} wrote:<br>${replySourceEmail.body || ''}`
                       : '',
                     initialBody: '',
                     replyToEmailId: replySourceEmail.id
                   });
                   setIsComposing(true);
                 }}
                 onAddComment={async () => {
                   const content = `Agent suggestion: ${selectedEmail.subject || 'Follow up this conversation'}`;
                   await appendActiveConversationComment(content);
                 }}
                 onCreateLead={!selectedEmail.clientId ? handleCreateLead : undefined}
                 onAddToKnowledge={selectedEmail.clientId ? handleAddToRag : undefined}
                  followUpAt={activeFollowUpAt || selectedEmail.todoAt}
                  followUpNote={activeFollowUpNote || selectedEmail.todoNote}
                  onSetFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note || `Follow up: ${selectedEmail.subject || selectedEmail.sender}`, 'open')}
                  onClearFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
                  onCompleteFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
                  onDeleteItem={() => {
                    setConfirmDialog({
                      message: 'Are you sure you want to delete this email? Emails associated with a client will be soft-deleted pending admin review.',
                      onConfirm: async () => {
                        const conversation = activeUnifiedConversation;
                        selectEmail(null);
                        if (conversation && !conversation.metadata?.localFallback) await deleteUnifiedConversation(conversation);
                        else await useStore.getState().deleteEmails([selectedEmail.id]);
                        await refreshUnifiedConversationData();
                        setConfirmDialog(null);
                      }
                    });
                 }}
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
                   {activeConversationComments.map(comment => (
                     <CommentItem key={comment.id} comment={comment} onReply={(cmtId, text, atts) => void replyActiveConversationComment(cmtId, text, atts)} />
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
                             void appendActiveConversationComment(commentText || 'Uploaded attachment(s)', attsPayload);
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

      {isCreatingLead && (selectedEmail || selectedLiveChatConversation || selectedTelegramConversation) && (
        <ClientFormModal
          onClose={() => setIsCreatingLead(false)}
          initialData={{
            name: selectedEmail
              ? (filter === 'inbox' ? (selectedEmail.senderName || selectedEmail.sender.split('@')[0]) : (selectedEmail.recipient.split('@')[0]))
              : selectedTelegramConversation
                ? activeTelegramDisplayName
              : activeLiveChatDisplayName,
            company: 'Unknown',
            country: 'Unknown',
            status: 'Leads',
            tags: selectedLiveChatConversation ? ['live-chat'] : selectedTelegramConversation ? ['telegram'] : [],
            sourceType: selectedLiveChatConversation ? 'live_chat' : selectedTelegramConversation ? 'telegram' : 'email',
            sourceId: selectedLiveChatConversation?.source_id || selectedTelegramConversation?.source_id || selectedEmail?.id,
            sourceLabel: selectedLiveChatConversation ? `Live Chat: ${activeLiveChatDisplayName}` : selectedTelegramConversation ? `Telegram: ${activeTelegramDisplayName}` : selectedEmail?.subject,
            contactMethods: selectedEmail
              ? [{ type: 'email', value: filter === 'inbox' ? selectedEmail.sender : selectedEmail.recipient }]
              : selectedTelegramConversation
                ? (activeTelegramContactMethod ? [activeTelegramContactMethod] : [])
              : (activeLiveChatContactMethod ? [activeLiveChatContactMethod] : [])
          }}
          onSave={async (newClientId) => {
            if (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback) {
              await patchUnifiedConversation(activeUnifiedConversation, { clientId: newClientId });
            }
            if (selectedTelegramConversation) {
              const res = await fetch(`/api/telegram/conversations/${encodeURIComponent(selectedTelegramConversation.source_id)}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ clientId: newClientId })
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to link Telegram conversation');
              }
              setSelectedTelegramConversation(prev => prev ? { ...prev, client_id: newClientId } : prev);
              await refreshUnifiedConversationData();
            } else if (selectedLiveChatConversation) {
              await updateLiveChatSession(selectedLiveChatConversation.source_id, { clientId: newClientId } as Partial<LiveChatSession>);
              setSelectedLiveChatConversation(prev => prev ? { ...prev, client_id: newClientId } : prev);
              await fetchLiveChatSessions();
              await refreshUnifiedConversationData();
            } else if (selectedEmail) {
              editEmail(selectedEmail.id, { clientId: newClientId });
            }
            selectClient(newClientId);
          }}
        />
      )}

      {isAddingContactToClient && activeLinkableContactMethod && (
        <AddContactToClientModal
          contactMethod={activeLinkableContactMethod}
          displayName={activeLinkableDisplayName}
          onClose={() => setIsAddingContactToClient(false)}
          onLinked={async (clientId) => {
            if (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback) {
              await patchUnifiedConversation(activeUnifiedConversation, { clientId });
            }
            if (selectedTelegramConversation) {
              const res = await fetch(`/api/telegram/conversations/${encodeURIComponent(selectedTelegramConversation.source_id)}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ clientId })
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to link Telegram conversation');
              }
              setSelectedTelegramConversation(prev => prev ? { ...prev, client_id: clientId } : prev);
              await refreshUnifiedConversationData();
            } else if (selectedLiveChatConversation) {
              await updateLiveChatSession(selectedLiveChatConversation.source_id, { clientId } as Partial<LiveChatSession>);
              setSelectedLiveChatConversation(prev => prev ? { ...prev, client_id: clientId } : prev);
              await fetchLiveChatSessions();
              await refreshUnifiedConversationData();
            } else if (selectedEmail) {
              editEmail(selectedEmail.id, { clientId });
            }
            selectClient(clientId);
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

export { ComposeEmail } from './inbox-ui';
