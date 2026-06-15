import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ContactMethod, useStore, EmailMessage, LiveChatSession } from '../store';
import { useAuthStore } from '../authStore';
import { Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { ClientFormModal } from './ClientFormModal';
import { UploadAttachmentModal } from './UploadAttachmentModal';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { WhatsAppChatModal } from './WhatsAppChatModal';
import {
  ConversationDetailHeader,
  ConversationFollowUpStrip,
  CONVERSATION_STAGES,
  ConversationMessageList,
  ConversationReplyComposer,
  ComposeEmail,
  EmailAgentSuggestionsPanel,
  EmailAttachmentsPanel,
  EmailBodyPanel,
  EmailCommentsPanel,
  EmailHeaderActions,
  EmailHeaderMeta,
  EmailTrackingPanel,
  EmailTagDialog,
  EmailTodoDialog,
  InboxBulkActionsPanel,
  InboxConfirmDialog,
  ConversationInternalNotesPanel,
  InboxConversationListItem,
  InboxNotificationDialog,
  InboxSidebarControls,
  LiveChatAgentSuggestionsPanel,
  LiveChatCustomerInsightCard,
  LiveChatEvidencePanel,
  LiveChatHeaderActions,
  LiveChatHeaderMeta,
  StartWhatsAppConversationPane,
  TelegramAgentSuggestionsPanel,
  TelegramHeaderActions,
  TelegramHeaderMeta,
  useActiveConversationComments,
  useConversationFollowUp,
  useConversationReplyActions,
  useInboxBulkActions,
  useInboxSync,
  useUnifiedConversationActions,
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
  const [selectedWhatsAppPhone, setSelectedWhatsAppPhone] = useState<string | null>(null);
  const [selectedWhatsAppClientId, setSelectedWhatsAppClientId] = useState<string | null>(null);
  const [selectedTelegramConversation, setSelectedTelegramConversation] = useState<UnifiedCommunicationConversation | null>(null);
  const [telegramMessages, setTelegramMessages] = useState<any[]>([]);
  const [selectedLiveChatConversation, setSelectedLiveChatConversation] = useState<UnifiedCommunicationConversation | null>(null);
  const [conversationAutoTranslateConfig, setConversationAutoTranslateConfig] = useState<Record<string, boolean>>(() => readConversationAutoTranslateConfig());
  const [conversationTranslations, setConversationTranslations] = useState<Record<string, Record<string, ConversationMessageTranslation>>>({});
  const {
    isSyncing,
    lastSyncAt,
    syncError,
    isUnifiedConversationLoading,
    whatsappConversations,
    setWhatsappConversations,
    isWhatsAppBackgroundSyncing,
    updateWhatsAppConversationState,
    fetchUnifiedConversations,
    syncWhatsAppConversations,
    loadWhatsAppConversations,
    handleSync,
  } = useInboxSync({
    search,
    searchTags,
    fetchEmails,
    fetchLiveChatSessions,
    notify,
    setUnifiedConversations,
  });
  const [translatingConversationMessageIds, setTranslatingConversationMessageIds] = useState<Set<string>>(new Set());
  const liveChatEndRef = useRef<HTMLDivElement | null>(null);
  const [isStartingWhatsApp, setIsStartingWhatsApp] = useState(false);
  const [newWhatsAppPhone, setNewWhatsAppPhone] = useState('');
  const [showWhatsAppContactPicker, setShowWhatsAppContactPicker] = useState(false);

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

  const {
    addWhatsAppConversationComment,
    patchUnifiedConversation,
    deleteUnifiedConversation,
    applyUnifiedConversationUpdate,
    updateConversationOwnerStage,
    findEmailUnifiedConversation,
    refreshUnifiedConversationData,
  } = useUnifiedConversationActions({
    language,
    unifiedConversationSource,
    setUnifiedConversations,
    fetchUnifiedConversations,
    fetchEmails,
    fetchLiveChatSessions,
    notify,
  });

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
  const {
    handleDeleteSelected,
    handleBulkAddTag,
    handleBulkMarkImportant,
    handleBulkAddComment,
    handleBulkSetFollowUp,
    handleBulkAssignOwner,
    handleBulkSetStage,
  } = useInboxBulkActions({
    language,
    selectedCount,
    selectedUnifiedConversations,
    selectedIds,
    selectedWhatsAppIds,
    selectedEmailId,
    activeWhatsAppConversation,
    whatsappConversations,
    clients,
    bulkTagInput,
    bulkNoteInput,
    bulkFollowUpAt,
    bulkOwnerId,
    bulkStage,
    setBulkTagInput,
    setBulkNoteInput,
    setBulkFollowUpAt,
    setBulkOwnerId,
    setBulkStage,
    setConfirmDialog,
    setSelectedWhatsAppPhone,
    selectEmail,
    clearBulkSelection,
    editClient,
    notify,
    patchUnifiedConversation,
    deleteUnifiedConversation,
    applyUnifiedConversationUpdate,
    refreshUnifiedConversationData,
    updateWhatsAppConversationState,
  });

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
  const {
    activeConversationComments,
    appendActiveConversationComment,
    replyActiveConversationComment,
  } = useActiveConversationComments({
    selectedTelegramConversation,
    activeTelegramClient,
    selectedLiveChatConversation,
    activeLiveChatClient,
    activeUnifiedConversation,
    selectedEmail,
    activeWhatsAppConversation,
    whatsappConversations,
    editClient,
    addEmailComment,
    addEmailReply,
    patchUnifiedConversation,
    refreshUnifiedConversationData,
    addWhatsAppConversationComment,
    updateWhatsAppConversationState,
  });

  const {
    activeFollowUpAt,
    activeFollowUpNote,
    updateActiveConversationFollowUp,
  } = useConversationFollowUp({
    activeUnifiedConversation,
    selectedEmail,
    activeWhatsAppConversation,
    whatsappConversations,
    activeWhatsAppFollowUp,
    language,
    editEmail,
    patchUnifiedConversation,
    applyUnifiedConversationUpdate,
    addWhatsAppConversationComment,
    updateWhatsAppConversationState,
    appendActiveConversationComment,
    notify,
    whatsappFollowUpMarker: WHATSAPP_FOLLOW_UP_MARKER,
  });

  const {
    telegramReply,
    setTelegramReply,
    isSendingTelegramReply,
    isTelegramMessagesLoading,
    loadTelegramMessages,
    sendTelegramReply,
    draftTelegramReply,
    toggleTelegramHumanTakeover,
    liveChatReply,
    setLiveChatReply,
    isSendingLiveChatReply,
    sendLiveChatReply,
    toggleLiveChatHumanTakeover,
    isRunningLiveChatAgent,
    runSelectedLiveChatAgent,
  } = useConversationReplyActions({
    language,
    selectedTelegramConversation,
    setSelectedTelegramConversation,
    setTelegramMessages,
    selectedLiveChatConversation,
    setSelectedLiveChatConversation,
    activeLiveChatSession,
    activeTelegramClient,
    activeTelegramAgentContext,
    llmMappings,
    activeLLMId,
    llmConfigs,
    sendLiveChatOperatorMessage,
    updateLiveChatSession,
    runLiveChatAgent,
    fetchLiveChatMessages,
    patchUnifiedConversation,
    refreshUnifiedConversationData,
    notify,
  });

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
            return (
              <InboxConversationListItem
                key={`${conversation.channel}_${conversation.source_id}`}
                language={language}
                conversation={conversation}
                email={email}
                clientName={client?.name}
                filter={filter}
                isSelected={isSelected}
                isChecked={selectedConversationIds.has(conversation.id)}
                currentUser={currentUser}
                whatsappConversation={whatsappConversation}
                onSelect={() => handleSelectUnifiedConversation(conversation)}
                onToggleSelection={(event) => toggleUnifiedSelection(event, conversation)}
                onDeleteWhatsApp={whatsappConversation ? () => handleDeleteWhatsAppConversation(whatsappConversation) : undefined}
                onOwnerStageChange={(updates) => updateConversationOwnerStage(conversation, updates)}
              />
            );
          })}

        </div>
      </Panel>

      <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors hidden md:block" />

      {/* Reading Pane / Compose Pane */}
      <Panel id="inbox-content" className={cn("flex flex-col bg-slate-950/50 relative", !selectedEmailId && !selectedWhatsAppPhone && !selectedTelegramConversation && !selectedLiveChatConversation && !isComposing && !isStartingWhatsApp && "hidden md:flex")}>
        {isComposing ? (
          <ComposeEmail onClose={() => setIsComposing(false)} initialRecipient={composeDefaults?.recipient} initialSubject={composeDefaults?.subject} initialBody={composeDefaults?.initialBody} originalEmailBody={composeDefaults?.originalEmailBody} draftId={composeDefaults?.draftId} replyToEmailId={composeDefaults?.replyToEmailId} initialOutboxId={composeDefaults?.initialOutboxId} />
        ) : isStartingWhatsApp ? (
          <StartWhatsAppConversationPane
            phone={newWhatsAppPhone}
            contactOptions={visibleWhatsAppContactOptions}
            onPhoneChange={(value) => {
              setNewWhatsAppPhone(value);
              if (value.includes('@')) setShowWhatsAppContactPicker(true);
              if (selectedWhatsAppClientId && value.replace(/[^0-9]/g, '') !== newWhatsAppPhone.replace(/[^0-9]/g, '')) {
                setSelectedWhatsAppClientId(null);
              }
            }}
            onPhoneFocus={() => setShowWhatsAppContactPicker(newWhatsAppPhone.includes('@'))}
            onSelectContact={selectWhatsAppContactOption}
            onStart={startNewWhatsApp}
            onCancel={() => {
              setIsStartingWhatsApp(false);
              setShowWhatsAppContactPicker(false);
            }}
          />
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
                <TelegramHeaderActions
                  language={language}
                  humanTakeover={selectedTelegramConversation.metadata?.humanTakeover}
                  onToggleHumanTakeover={toggleTelegramHumanTakeover}
                />
              )}
              meta={(
                <TelegramHeaderMeta
                  language={language}
                  isLinked={!!(activeTelegramClient || selectedTelegramConversation.client_id)}
                  hasContactMethod={!!activeTelegramContactMethod}
                  translateEnabled={activeTelegramTranslateEnabled}
                  humanTakeover={selectedTelegramConversation.metadata?.humanTakeover}
                  chatId={selectedTelegramConversation.metadata?.telegramChatId}
                  userId={selectedTelegramConversation.metadata?.telegramUserId}
                  onToggleTranslate={() => setConversationAutoTranslateEnabled('telegram', selectedTelegramConversation.id, !activeTelegramTranslateEnabled)}
                  onCreateLead={handleCreateLead}
                  onAddToExistingClient={() => setIsAddingContactToClient(true)}
                />
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
              <ConversationMessageList
                channel="telegram"
                language={language}
                messages={telegramMessages}
                isLoading={isTelegramMessagesLoading}
                translateEnabled={activeTelegramTranslateEnabled}
                translations={activeTelegramTranslations}
                translatingIds={translatingConversationMessageIds}
              />
              <TelegramAgentSuggestionsPanel
                language={language}
                cacheKey={activeTelegramAgentContext.cacheKey}
                conversationId={selectedTelegramConversation.id}
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
              <ConversationInternalNotesPanel
                language={language}
                comments={activeConversationComments}
                commentText={commentText}
                accent="sky"
                isLinked={!!activeTelegramClient}
                linkedDescription={language === 'zh' ? '已关联客户：备注保存到客户资料。' : 'Linked client: notes are saved to the customer profile.'}
                unlinkedDescription={language === 'zh' ? '未关联客户：备注暂存到当前 Telegram 会话。' : 'Unlinked Telegram user: notes are saved to this conversation.'}
                onCommentTextChange={setCommentText}
                onReply={(commentId, content, attachments) => void replyActiveConversationComment(commentId, content, attachments)}
                onSubmit={() => {
                  if (!commentText.trim()) return;
                  void appendActiveConversationComment(commentText.trim()).then(() => setCommentText(''));
                }}
              />
            </div>
            <ConversationReplyComposer
              language={language}
              value={telegramReply}
              isSending={isSendingTelegramReply}
              accent="sky"
              placeholder={language === 'zh' ? '输入 Telegram 回复，Ctrl+Enter 发送...' : 'Write a Telegram reply, Ctrl+Enter to send...'}
              helperText={language === 'zh'
                ? '发送使用 Settings -> Telegram Bot 中配置的 Bot Token。人工接管会暂停 Telegram Agent 自动回复。'
                : 'Sending uses the Bot Token configured in Settings -> Telegram Bot. Human takeover pauses Telegram Agent auto-replies.'}
              onChange={setTelegramReply}
              onSend={sendTelegramReply}
            />
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
                <LiveChatHeaderActions
                  language={language}
                  humanTakeover={activeLiveChatSession?.humanTakeover ?? selectedLiveChatConversation.metadata?.humanTakeover}
                  isRunningAgent={isRunningLiveChatAgent}
                  onToggleHumanTakeover={toggleLiveChatHumanTakeover}
                  onRunAgent={runSelectedLiveChatAgent}
                />
              )}
              meta={(
                <LiveChatHeaderMeta
                  language={language}
                  isLinked={!!(activeLiveChatClient || selectedLiveChatConversation.client_id)}
                  hasContactMethod={!!activeLiveChatContactMethod}
                  translateEnabled={activeLiveChatTranslateEnabled}
                  visitorEmail={activeLiveChatSession?.visitorEmail}
                  visitorPhone={activeLiveChatSession?.visitorPhone}
                  pageUrl={activeLiveChatSession?.pageUrl}
                  visitorInfo={activeLiveChatVisitorInfo}
                  onToggleTranslate={() => setConversationAutoTranslateEnabled('live_chat', selectedLiveChatConversation.source_id, !activeLiveChatTranslateEnabled)}
                  onCreateLead={handleCreateLead}
                  onAddToExistingClient={() => setIsAddingContactToClient(true)}
                />
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
              <LiveChatCustomerInsightCard client={activeLiveChatClient} />
              <LiveChatEvidencePanel language={language} items={activeLiveChatEvidenceItems} />
              <ConversationMessageList
                channel="live_chat"
                language={language}
                messages={visibleLiveChatMessages}
                translateEnabled={activeLiveChatTranslateEnabled}
                translations={activeLiveChatTranslations}
                translatingIds={translatingConversationMessageIds}
              />
              <LiveChatAgentSuggestionsPanel
                language={language}
                cacheKey={activeLiveChatAgentContext.cacheKey}
                conversationId={selectedLiveChatConversation.id}
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
              <ConversationInternalNotesPanel
                language={language}
                comments={activeConversationComments}
                commentText={commentText}
                accent="violet"
                isLinked={!!activeLiveChatClient}
                linkedDescription={language === 'zh' ? '已关联客户：备注保存到客户资料。' : 'Linked client: notes are saved to the customer profile.'}
                unlinkedDescription={language === 'zh' ? '未关联客户：备注暂存到当前会话。' : 'Unlinked visitor: notes are saved to this conversation.'}
                onCommentTextChange={setCommentText}
                onReply={(commentId, content, attachments) => void replyActiveConversationComment(commentId, content, attachments)}
                onSubmit={() => {
                  if (!commentText.trim()) return;
                  void appendActiveConversationComment(commentText.trim()).then(() => setCommentText(''));
                }}
              />
              <div ref={liveChatEndRef} />
            </div>
            <ConversationReplyComposer
              language={language}
              value={liveChatReply}
              isSending={isSendingLiveChatReply}
              accent="violet"
              placeholder={language === 'zh' ? '输入 Live Chat 回复，Ctrl+Enter 发送...' : 'Write a Live Chat reply, Ctrl+Enter to send...'}
              helperText={language === 'zh'
                ? '人工接管会暂停后台 Live Chat Agent 自动回复；交还给 Agent 后，新访客消息可自动触发。'
                : 'Human takeover pauses background Live Chat Agent replies. Hand back to Agent to let new visitor messages trigger automation.'}
              onChange={setLiveChatReply}
              onSend={sendLiveChatReply}
            />
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
                <EmailHeaderMeta
                  isLinked={!!selectedEmail.clientId}
                  isInbound={isInboundCustomerEmail(selectedEmail)}
                  senderIp={selectedEmail.senderIp}
                  senderCountry={selectedEmail.senderCountry}
                  cc={selectedEmail.cc}
                  bcc={selectedEmail.bcc}
                  onCreateLead={handleCreateLead}
                  onAddToExistingClient={() => setIsAddingContactToClient(true)}
                />
              )}
              actions={(
                <EmailHeaderActions
                  isDraft={selectedEmail.type === 'draft'}
                  hasClient={!!selectedEmail.clientId}
                  isAddingToRag={addingToRag}
                  isAddedToRag={addedToRagId === selectedEmail.id}
                  onEditDraft={() => {
                    setComposeDefaults({
                      recipient: selectedEmail.recipient,
                      subject: selectedEmail.subject,
                      initialBody: selectedEmail.body,
                      draftId: selectedEmail.id,
                      initialOutboxId: selectedEmail.outboxConfigId
                    });
                    setIsComposing(true);
                  }}
                  onReply={() => {
                    setComposeDefaults({
                      recipient: selectedEmail.sender,
                      subject: `Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`,
                      originalEmailBody: `On ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.senderName || selectedEmail.sender} wrote:<br>${selectedEmail.body || ''}`,
                      replyToEmailId: selectedEmail.id
                    });
                    setIsComposing(true);
                  }}
                  onAddToRag={handleAddToRag}
                />
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
               <EmailTrackingPanel
                 language={language}
                 enabled={(selectedEmail.type === 'sent' || selectedEmail.type === 'scheduled' || selectedEmail.type === 'outbound') && (selectedEmail.body?.includes('/api/track/open/') || !!selectedEmail.enableTracking)}
                 events={selectedTrackingEvents}
                 visibleEvents={visibleTrackingEvents}
                 isExpanded={isTrackingExpanded}
                 onToggleExpanded={() => toggleTrackingExpanded(selectedEmail.id)}
               />

               <EmailBodyPanel subject={selectedEmail.subject} body={selectedEmail.body} />

               <EmailAgentSuggestionsPanel
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
                 followUpAt={activeFollowUpAt || selectedEmail.todoAt}
                 followUpNote={activeFollowUpNote || selectedEmail.todoNote}
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

               <EmailAttachmentsPanel attachments={selectedEmail.attachments} />               <EmailAttachmentsPanel attachments={selectedEmail.attachments} />

               <EmailCommentsPanel
                 comments={activeConversationComments}
                 commentText={commentText}
                 attachments={commentAttachments}
                 onCommentTextChange={setCommentText}
                 onAttachClick={() => setShowCommentAttachmentModal(true)}
                 onRemoveAttachment={(index) => setCommentAttachments(prev => prev.filter((_, i) => i !== index))}
                 onReply={(commentId, content, attachments) => void replyActiveConversationComment(commentId, content, attachments)}
                 onSubmit={() => {
                   if (commentText.trim() || commentAttachments.length > 0) {
                     const attsPayload = commentAttachments.length > 0
                       ? commentAttachments.map(file => ({
                           id: `file${Date.now()}_${Math.random()}`,
                           name: file.name,
                           type: (file.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
                           url: URL.createObjectURL(file)
                         }))
                       : undefined;
                     if (commentText.trim() || attsPayload) {
                       void appendActiveConversationComment(commentText || 'Uploaded attachment(s)', attsPayload);
                     }
                     setCommentText('');
                     setCommentAttachments([]);
                   }
                 }}
               />
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
        <InboxConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {alertDialog && (
        <InboxNotificationDialog
          message={alertDialog}
          onClose={() => setAlertDialog(null)}
        />
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
        <EmailTagDialog
          tagInput={tagInput}
          onTagInputChange={setTagInput}
          onSubmit={submitTag}
          onClose={() => setTagModalEmail(null)}
        />
      )}

      {todoModalEmail && (
        <EmailTodoDialog
          todoAt={todoAt}
          todoNote={todoNote}
          onTodoAtChange={setTodoAt}
          onTodoNoteChange={setTodoNote}
          onSubmit={submitTodo}
          onClose={() => setTodoModalEmail(null)}
        />
      )}

    </PanelGroup>
  );
}

export { ComposeEmail } from './inbox-ui';
