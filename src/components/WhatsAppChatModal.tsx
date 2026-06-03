import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Download, FileText, FolderOpen, Languages, Loader2, MessageCircle, Paperclip, Plus, Send, Smile, Sparkles, Tag, User, UserPlus, X } from 'lucide-react';
import { Client, Comment, MediaItem, useStore } from '../store';
import { MediaSelectorModal } from './MediaSelectorModal';
import { useTranslation } from '../lib/i18n';
import { AgentContextSuggestions } from './AgentContextSuggestions';
import { getCustomerOutputLanguage, getOutboundLanguage } from '../lib/language';
import { ClientFormModal, PREFERRED_LANGUAGES } from './ClientFormModal';
import { AddContactToClientModal } from './AddContactToClientModal';

interface WhatsAppHubClient {
  id: string;
  name: string;
  phone?: string;
  status: string;
  quota?: { sentToday: number; dailyQuota: number; remaining: number; replyRate: number };
}

interface WhatsAppHubMessage {
  id: string;
  client_id: string;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient: string;
  body: string;
  message_type?: string;
  payload?: any;
  translation?: WhatsAppTranslation;
  created_at: string;
  received_at?: string;
}

interface WhatsAppTranslation {
  language?: string;
  kind?: 'inbound_translation' | 'outbound_original' | string;
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  bodyHash: string;
  skipped?: boolean;
  modelId?: string | null;
  updatedAt?: string;
}

interface Props {
  client?: Client | null;
  phone: string;
  conversation?: WhatsAppConversation | null;
  initialMessage?: string;
  embedded?: boolean;
  onClose: () => void;
}

interface WhatsAppConversation {
  id: string;
  targetPhone: string;
  contactPhone?: string;
  rawChatId?: string;
  conversationKey?: string;
  clientId?: string;
  clientName?: string;
  clientCompany?: string;
  tags: string[];
  comments: Comment[];
  agentContextAnalysis?: any;
  agentContextAnalysisKey?: string;
}

const cleanPhone = (value: string) => value.replace(/[^0-9]/g, '');
const isChatId = (value: string) => /@(?:lid|c\.us|g\.us|broadcast)$/i.test(value || '');

const isInlineMedia = (mimeType: string) => mimeType.startsWith('image/') || mimeType.startsWith('video/');
const WHATSAPP_ACTIVE_CHAT_POLL_MS = 12_000;
const WHATSAPP_FOLLOW_UP_MARKER = '__FOLLOW_UP__';

const whatsappMessageCacheKey = (targetPhone: string) => `tradequest.whatsapp.messages.cache.v1.${targetPhone}`;
const whatsappTranslationCacheKey = (targetPhone: string, language: 'en' | 'zh') => `tradequest.whatsapp.translations.v2.${language}.${targetPhone}`;

function readCachedWhatsAppMessages(targetPhone: string): WhatsAppHubMessage[] {
  try {
    const raw = sessionStorage.getItem(whatsappMessageCacheKey(targetPhone));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedWhatsAppMessages(targetPhone: string, messages: WhatsAppHubMessage[]) {
  try {
    sessionStorage.setItem(whatsappMessageCacheKey(targetPhone), JSON.stringify(messages.slice(-300)));
  } catch {
    // Session storage is only a speed cache.
  }
}

function readCachedWhatsAppTranslations(targetPhone: string, language: 'en' | 'zh'): Record<string, WhatsAppTranslation> {
  try {
    const raw = localStorage.getItem(whatsappTranslationCacheKey(targetPhone, language));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCachedWhatsAppTranslations(targetPhone: string, language: 'en' | 'zh', translations: Record<string, WhatsAppTranslation>) {
  try {
    localStorage.setItem(whatsappTranslationCacheKey(targetPhone, language), JSON.stringify(translations));
  } catch {
    // Browser translation cache is optional; database remains the source of truth.
  }
}

function simpleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return String(Math.abs(hash));
}

const dataUrlToFile = async (dataUrl: string, name: string, mimeType: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: mimeType || blob.type || 'application/octet-stream' });
};

const resolveWhatsAppMediaUrl = (url: string, hubBaseUrl?: string) => {
  const rawUrl = String(url || '').trim();
  const baseUrl = String(hubBaseUrl || '').replace(/\/+$/, '');
  if (!rawUrl) return '';
  if (rawUrl.startsWith('/')) return baseUrl ? `${baseUrl}${rawUrl}` : rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (baseUrl && parsed.pathname.startsWith('/uploads/') && parsed.origin === window.location.origin) {
      return `${baseUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Non-URL values are left untouched.
  }
  return rawUrl;
};

const getWhatsAppMessageMedia = (message: WhatsAppHubMessage, hubBaseUrl?: string) => {
  const payload = message.payload || {};
  const media = payload.media || payload.file || payload.attachment || {};
  const url = resolveWhatsAppMediaUrl(media.url || media.mediaUrl || media.fileUrl || payload.mediaUrl || payload.fileUrl || payload.url || '', hubBaseUrl);
  const mimeType = media.mimeType || media.type || payload.mimeType || payload.type || '';
  const name = media.originalName || media.filename || media.name || payload.originalName || payload.filename || payload.name || message.message_type || 'Media';
  const lowerMime = String(mimeType || '').toLowerCase();
  const lowerName = String(name || url || '').toLowerCase();
  const isImage = lowerMime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerName);
  const isVideo = lowerMime.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(lowerName);
  const hasMedia = Boolean(payload.hasMedia || url || media.url || message.message_type !== 'chat');
  return { hasMedia, url, mimeType, name, isImage, isVideo };
};

export function WhatsAppChatModal({ client, phone, conversation: initialConversation, initialMessage = '', embedded = false, onClose }: Props) {
  const { notify, addLog, selectClient, editClient, language, llmConfigs, activeLLMId, llmMappings, logs, emails, clients, deals, knowledgeBase, products, whatsappHubConfig, whatsappCustomerServiceAgentEnabled, setWhatsAppCustomerServiceAgentEnabled, whatsappAutoTranslateConfig, setWhatsAppAutoTranslateEnabled, whatsappOutboundAutoTranslateConfig, setWhatsAppOutboundAutoTranslateEnabled, incrementAgentHubTaskCount } = useStore();
  const t = useTranslation(language);
  const [hubClients, setHubClients] = useState<WhatsAppHubClient[]>([]);
  const targetPhone = useMemo(() => isChatId(phone) ? phone.trim() : cleanPhone(phone), [phone]);
  const [messages, setMessages] = useState<WhatsAppHubMessage[]>(() => readCachedWhatsAppMessages(targetPhone));
  const [conversation, setConversation] = useState<WhatsAppConversation | null>(initialConversation || null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [body, setBody] = useState(initialMessage);
  const [tagInput, setTagInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [translatingOutbound, setTranslatingOutbound] = useState(false);
  const [translations, setTranslations] = useState<Record<string, WhatsAppTranslation>>(() => readCachedWhatsAppTranslations(targetPhone, language));
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isAddingContactToClient, setIsAddingContactToClient] = useState(false);
  const [mappingEdit, setMappingEdit] = useState<{ chatId: string; phone: string; saving?: boolean } | null>(null);
  const syncInFlightRef = useRef(false);
  const loadRequestRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const rawChatId = conversation?.rawChatId || (isChatId(targetPhone) ? targetPhone : '');
  const mappedPhone = conversation?.contactPhone || (!isChatId(targetPhone) ? targetPhone : '');
  const displayPhone = mappedPhone || targetPhone;
  const messageLookupTarget = mappedPhone || targetPhone;
  const autoTranslateKey = useMemo(() => (cleanPhone(displayPhone) || displayPhone || targetPhone).trim().toLowerCase(), [displayPhone, targetPhone]);
  const whatsappAutoTranslateEnabled = Boolean(autoTranslateKey && whatsappAutoTranslateConfig?.[autoTranslateKey]);
  const whatsappOutboundAutoTranslateEnabled = Boolean(autoTranslateKey && whatsappOutboundAutoTranslateConfig?.[autoTranslateKey]);
  const activeClient = useMemo(() => {
    if (client) return client;
    if (conversation?.clientId) return clients.find(item => item.id === conversation.clientId) || null;
    return clients.find(item => item.contactMethods?.some(method => (
      mappedPhone && ['whatsapp', 'phone'].includes(method.type) && cleanPhone(method.value).endsWith(mappedPhone.slice(-8))
    ))) || null;
  }, [client, conversation?.clientId, clients, mappedPhone]);
  const mappingHubClientId = useMemo(() => (
    selectedClientId
    || messages.find(message => message.direction === 'outbound' && message.client_id)?.client_id
    || hubClients.find(item => item.status === 'online')?.id
    || hubClients[0]?.id
    || ''
  ), [hubClients, messages, selectedClientId]);
  const relatedDeals = useMemo(() => (
    activeClient
      ? deals
          .filter(deal => deal.clientId === activeClient.id)
          .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
          .slice(0, 5)
      : []
  ), [activeClient?.id, deals]);
  const localKnowledgeSnippets = useMemo(() => (
    activeClient
      ? knowledgeBase
          .filter(item => !item.clientId || item.clientId === activeClient.id)
          .slice(0, 8)
          .map(item => ({ title: item.title, content: item.content?.slice(0, 900) }))
      : knowledgeBase.slice(0, 5).map(item => ({ title: item.title, content: item.content?.slice(0, 900) }))
  ), [activeClient?.id, knowledgeBase]);
  const productSnippets = useMemo(() => products.slice(0, 12).map(product => ({
    name: product.name,
    sku: product.sku,
    description: product.description?.slice(0, 700),
    salesPoints: product.salesPoints?.slice(0, 700),
    bulkPrices: product.bulkPrices || []
  })), [products]);
  const latestInboundMessage = messages.filter(message => message.direction === 'inbound').slice(-1)[0];
  const latestOutboundMessage = messages.filter(message => message.direction === 'outbound').slice(-1)[0];
  const recentInboundMessages = messages.filter(message => message.direction === 'inbound').slice(-6);
  const recentOutboundMessages = messages.filter(message => message.direction === 'outbound').slice(-6);
  const agentContextCacheKey = latestInboundMessage
    ? `whatsapp:${targetPhone}:inbound:${latestInboundMessage.id}`
    : `whatsapp:${targetPhone}:no-inbound`;
  const agentContextBody = recentInboundMessages.length > 0
    ? [
        'Customer inbound WhatsApp messages only. Use these to infer customer intent:',
        ...recentInboundMessages.map(message => `inbound customer: ${message.body}`),
        '',
        'Our outbound WhatsApp messages are background only. Do not infer customer intent from these:',
        ...recentOutboundMessages.map(message => `outbound team: ${message.body}`)
      ].join('\n')
    : [
        'NO_INBOUND_CUSTOMER_MESSAGES',
        'The customer has not sent any inbound WhatsApp messages in this conversation.',
        'Our outbound WhatsApp messages are prior outreach only and must not be used as evidence of customer intent:',
        ...recentOutboundMessages.map(message => `outbound team: ${message.body}`)
      ].join('\n');
  const agentContextAdditionalContext = activeClient
    ? [
        `Client profile: ${activeClient.name || ''} ${activeClient.company || ''} ${activeClient.country || ''}`.trim(),
        `Preferred language: ${activeClient.preferredLanguage || 'N/A'}`,
        `AI customer summary: ${activeClient.agentSummary || activeClient.leadSummary || 'N/A'}`,
        `Best next action: ${activeClient.agentNextStep || activeClient.leadNextStep || 'N/A'}`,
        `Lead score: ${activeClient.leadScore ?? 'N/A'}`,
        `Tags: ${(activeClient.tags || []).join(', ') || 'N/A'}`,
        `Recent internal comments: ${(activeClient.comments || []).slice(-5).map(comment => comment.content).join(' | ') || 'N/A'}`,
        `Recent CRM activity: ${logs.filter(log => log.clientId === activeClient.id).slice(0, 10).map(log => `${log.date}: ${log.content}`).join(' | ') || 'N/A'}`,
        `Recent email history: ${emails.filter(email => email.clientId === activeClient.id).slice(0, 6).map(email => `${email.type} ${email.date}: ${email.subject} - ${(email.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220)}`).join(' | ') || 'N/A'}`,
        `Related leads/deals: ${relatedDeals.map(deal => `${deal.name} (${deal.status}) score ${deal.leadScore ?? 'N/A'} summary: ${deal.leadSummary || 'N/A'} next: ${deal.leadNextStep || 'N/A'}`).join(' | ') || 'N/A'}`,
        `Relevant knowledge snippets: ${localKnowledgeSnippets.map(item => `${item.title}: ${item.content}`).join(' | ') || 'N/A'}`,
        `Product context: ${productSnippets.map(product => `${product.name}: ${product.salesPoints || product.description || ''}`).join(' | ') || 'N/A'}`
      ].join('\n')
    : [
        `Unlinked WhatsApp conversation: ${displayPhone}`,
        `Product context: ${productSnippets.map(product => `${product.name}: ${product.salesPoints || product.description || ''}`).join(' | ') || 'N/A'}`,
        `Relevant knowledge snippets: ${localKnowledgeSnippets.map(item => `${item.title}: ${item.content}`).join(' | ') || 'N/A'}`
      ].join('\n');
  const visibleConversationComments = (conversation?.comments || []).filter(comment => !String(comment.content || '').startsWith(WHATSAPP_FOLLOW_UP_MARKER));
  const whatsappFollowUp = useMemo(() => {
    const marker = [...(conversation?.comments || [])].reverse().find(comment => String(comment.content || '').startsWith(WHATSAPP_FOLLOW_UP_MARKER));
    if (!marker) return null;
    try {
      const parsed = JSON.parse(String(marker.content).slice(WHATSAPP_FOLLOW_UP_MARKER.length));
      return parsed?.status === 'open' ? { dueAt: parsed.dueAt as string, note: parsed.note as string } : null;
    } catch {
      return null;
    }
  }, [conversation?.comments]);
  const outboundLanguage = getCustomerOutputLanguage({
    lastCommunicationText: latestInboundMessage?.body,
    preferredLanguage: activeClient?.preferredLanguage,
    country: activeClient?.country
  });
  const outboundAutoTranslateLanguage = getOutboundLanguage(activeClient?.preferredLanguage, activeClient?.country);
  const outboundLanguageOptions = useMemo(() => {
    const options = PREFERRED_LANGUAGES.map(item => item.name);
    return options.includes(outboundAutoTranslateLanguage)
      ? options
      : [outboundAutoTranslateLanguage, ...options];
  }, [outboundAutoTranslateLanguage]);
  const latestMessageId = messages[messages.length - 1]?.id || '';

  const scrollMessagesToBottom = (behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior });
  };

  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(llm => llm.id === id) || null;
  };

  const getTranslationLLMConfig = () => getLLMConfig('agent_context_suggestions') || getLLMConfig('whatsapp_drafting') || getLLMConfig('drafting');

  const translateInboundMessage = async (message: WhatsAppHubMessage, signal?: AbortSignal) => {
    const bodyText = String(message.body || '').trim();
    const bodyHash = simpleHash(bodyText);
    const cached = translations[message.id];
    if (!bodyText || (cached && cached.bodyHash === bodyHash)) return;
    const llmConfig = getTranslationLLMConfig();
    if (!llmConfig) return;
    setTranslatingIds(prev => new Set(prev).add(message.id));
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
          command: `You are translating an inbound WhatsApp customer message for an internal CRM user.
Target system language: ${targetLanguage}.
If the message is already in ${targetLanguage}, return JSON with alreadyTargetLanguage true and translatedText empty.
Otherwise translate faithfully into ${targetLanguage}. Keep names, numbers, product names, URLs, and line breaks. Do not add commentary.
Return only valid JSON: {"alreadyTargetLanguage": boolean, "sourceLanguage": string, "translatedText": string}.

Message:
${bodyText}`,
          context: {
            channel: 'whatsapp',
            messageId: message.id,
            direction: message.direction,
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
      const nextTranslation: WhatsAppTranslation = {
        language,
        text: parsed.alreadyTargetLanguage ? '' : String(parsed.translatedText || '').trim(),
        sourceLanguage: parsed.sourceLanguage || '',
        bodyHash,
        skipped: !!parsed.alreadyTargetLanguage,
        modelId: llmConfig.id
      };
      const saveResponse = await fetch(`/api/whatsapp-hub/messages/${encodeURIComponent(message.id)}/translation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          language,
          translatedText: nextTranslation.text,
          sourceLanguage: nextTranslation.sourceLanguage,
          bodyHash,
          skipped: nextTranslation.skipped,
          modelId: llmConfig.id
        })
      });
      const savedData = await saveResponse.json().catch(() => ({}));
      if (!saveResponse.ok) throw new Error(savedData.error || 'Failed to save translation');
      setTranslations(prev => {
        const next = { ...prev, [message.id]: savedData.translation || nextTranslation };
        writeCachedWhatsAppTranslations(targetPhone, language, next);
        return next;
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.warn('WhatsApp translation failed', error);
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    }
  };

  const translateOutboundMessageText = async (text: string) => {
    const bodyText = text.trim();
    if (!bodyText) return { originalText: bodyText, translatedText: bodyText, sourceLanguage: '', targetLanguage: outboundAutoTranslateLanguage || 'English', changed: false, modelId: null as string | null };
    const llmConfig = getTranslationLLMConfig();
    if (!llmConfig) {
      throw new Error(language === 'zh' ? '请先在设置中配置 AI 模型后再使用发送前自动翻译。' : 'Configure an AI model in Settings before using auto-translate before sending.');
    }
    setTranslatingOutbound(true);
    try {
      const targetLanguage = outboundAutoTranslateLanguage || 'English';
      const response = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          command: `You are translating an outbound WhatsApp message before it is sent to a customer.
Target customer language: ${targetLanguage}.
If the message is already in ${targetLanguage}, return JSON with alreadyTargetLanguage true and translatedText empty.
Otherwise translate faithfully into ${targetLanguage}. Keep names, numbers, product names, URLs, emojis, and line breaks. Use a concise, natural WhatsApp style. Do not add commentary.
Return only valid JSON: {"alreadyTargetLanguage": boolean, "sourceLanguage": string, "translatedText": string}.

Message:
${bodyText}`,
          context: {
            channel: 'whatsapp',
            direction: 'outbound',
            targetLanguage,
            clientId: activeClient?.id || null,
            preferredLanguage: activeClient?.preferredLanguage || null,
            country: activeClient?.country || null
          },
          llmConfig,
          skipKnowledgeBase: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Outbound translation failed');
      const raw = String(data.result || '').replace(/```json|```/g, '').trim();
      const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
      const parsed = JSON.parse(jsonText);
      const translatedText = parsed.alreadyTargetLanguage ? bodyText : String(parsed.translatedText || '').trim() || bodyText;
      return {
        originalText: bodyText,
        translatedText,
        sourceLanguage: parsed.sourceLanguage || '',
        targetLanguage,
        changed: translatedText !== bodyText,
        modelId: llmConfig.id
      };
    } finally {
      setTranslatingOutbound(false);
    }
  };

  const loadCachedMessages = async (options: { notifyErrors?: boolean; requestId?: number } = {}) => {
    const requestId = options.requestId ?? loadRequestRef.current;
    const expectedTargetPhone = targetPhone;
    const expectedLookupTarget = messageLookupTarget;
    if (!expectedTargetPhone) return;
    try {
      const messageQuery = isChatId(expectedLookupTarget)
        ? `chatId=${encodeURIComponent(expectedLookupTarget)}&language=${encodeURIComponent(language)}`
        : `targetPhone=${encodeURIComponent(expectedLookupTarget)}&language=${encodeURIComponent(language)}`;
      const [clientsRes, messagesRes] = await Promise.all([
        fetch('/api/whatsapp-hub/clients', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`/api/whatsapp-hub/messages?${messageQuery}&limit=200`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const clientsData = await clientsRes.json();
      const messagesData = await messagesRes.json();
      if (!clientsRes.ok) throw new Error(clientsData.error || 'Failed to load WhatsApp clients');
      if (!messagesRes.ok) throw new Error(messagesData.error || 'Failed to load WhatsApp messages');
      if (requestId !== loadRequestRef.current || expectedTargetPhone !== targetPhone || expectedLookupTarget !== messageLookupTarget) return;
      setHubClients(clientsData.clients || []);
      const nextMessages = (messagesData.messages || []).slice().reverse();
      setMessages(nextMessages);
      writeCachedWhatsAppMessages(expectedTargetPhone, nextMessages);
      const cachedTranslations = readCachedWhatsAppTranslations(expectedTargetPhone, language);
      const mergedTranslations = nextMessages.reduce((acc: Record<string, WhatsAppTranslation>, message: WhatsAppHubMessage) => {
        const bodyHash = simpleHash(String(message.body || '').trim());
        const cached = cachedTranslations[message.id];
        if (cached?.bodyHash === bodyHash) {
          acc[message.id] = cached;
        } else if (message.translation?.bodyHash === bodyHash) {
          acc[message.id] = message.translation;
        }
        return acc;
      }, {});
      setTranslations(mergedTranslations);
      writeCachedWhatsAppTranslations(expectedTargetPhone, language, mergedTranslations);
      const sticky = (messagesData.messages || []).find((message: WhatsAppHubMessage) => message.direction === 'outbound' && message.client_id)?.client_id;
      if (sticky) setSelectedClientId(sticky);
      const conversationsRes = await fetch(`/api/whatsapp-hub/conversations?search=${encodeURIComponent(expectedLookupTarget)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const conversationsData = await conversationsRes.json();
      if (requestId !== loadRequestRef.current || expectedTargetPhone !== targetPhone || expectedLookupTarget !== messageLookupTarget) return;
      if (conversationsRes.ok) {
        const matched = (conversationsData.conversations || []).find((item: WhatsAppConversation) => (
          item.targetPhone === expectedLookupTarget || item.contactPhone === expectedLookupTarget || item.rawChatId === expectedTargetPhone || item.conversationKey === expectedLookupTarget
        ));
        if (matched) setConversation(matched);
      }
    } catch (error: any) {
      if (options.notifyErrors !== false) {
        notify(error.message || 'WhatsApp Actor Hub is not configured.', 'error');
      }
      throw error;
    }
  };

  const syncLatestMessages = async (requestId = loadRequestRef.current) => {
    const expectedLookupTarget = messageLookupTarget;
    if (!targetPhone || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      const syncRes = await fetch('/api/whatsapp-hub/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(isChatId(expectedLookupTarget)
          ? { chatId: expectedLookupTarget, limit: 500 }
          : { targetPhone: expectedLookupTarget, limit: 500 })
      });
      if (syncRes.ok && requestId === loadRequestRef.current && expectedLookupTarget === messageLookupTarget) {
        await loadCachedMessages({ notifyErrors: false, requestId });
      }
    } catch (error) {
      console.warn('WhatsApp background sync unavailable in chat modal', error);
    } finally {
      syncInFlightRef.current = false;
    }
  };

  const loadData = async (options: { sync?: boolean } = {}) => {
    const requestId = loadRequestRef.current;
    if (!targetPhone) return;
    setLoading(true);
    try {
      await loadCachedMessages({ notifyErrors: true, requestId });
      if (options.sync !== false && requestId === loadRequestRef.current) {
        void syncLatestMessages(requestId);
      }
    } catch {
      // loadCachedMessages already surfaced a user-facing notification.
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadRequestRef.current += 1;
    syncInFlightRef.current = false;
    setMessages(readCachedWhatsAppMessages(targetPhone));
    setConversation(initialConversation || null);
    setSelectedClientId('');
    setBody(initialMessage);
    setTagInput('');
    setCommentInput('');
    setSelectedFile(null);
    setSelectedMedia(null);
    setMappingEdit(null);
    setTranslations(readCachedWhatsAppTranslations(targetPhone, language));
    setTranslatingIds(new Set());
    loadData();
  }, [targetPhone, initialConversation?.id, initialMessage, language]);

  useEffect(() => {
    if (!targetPhone || messages.length === 0) return;
    const frame = window.requestAnimationFrame(() => scrollMessagesToBottom('auto'));
    const shortTimer = window.setTimeout(() => scrollMessagesToBottom('auto'), 80);
    const mediaTimer = window.setTimeout(() => scrollMessagesToBottom('auto'), 300);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(shortTimer);
      window.clearTimeout(mediaTimer);
    };
  }, [targetPhone, latestMessageId, messages.length]);

  useEffect(() => {
    if (!whatsappAutoTranslateEnabled || messages.length === 0) return;
    const llmConfig = getTranslationLLMConfig();
    if (!llmConfig) {
      notify(language === 'zh' ? '请先在设置中配置 AI 模型后再使用 WhatsApp 自动翻译。' : 'Configure an AI model in Settings before using WhatsApp auto-translation.', 'warning');
      return;
    }
    const controller = new AbortController();
    const pendingMessages = messages
      .filter(message => message.direction === 'inbound' && String(message.body || '').trim())
      .filter(message => {
        const bodyHash = simpleHash(String(message.body || '').trim());
        return translations[message.id]?.bodyHash !== bodyHash;
      })
      .slice(-20);
    void (async () => {
      for (const message of pendingMessages) {
        if (controller.signal.aborted) break;
        await translateInboundMessage(message, controller.signal);
      }
    })();
    return () => controller.abort();
  }, [whatsappAutoTranslateEnabled, latestMessageId, messages.length, language, targetPhone]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void syncLatestMessages();
    }, WHATSAPP_ACTIVE_CHAT_POLL_MS);
    const handleFocus = () => {
      void syncLatestMessages();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', handleFocus);
    };
  }, [targetPhone, messageLookupTarget]);

  const confirmChatIdMapping = async () => {
    if (!mappingEdit?.chatId) return;
    const phone = cleanPhone(mappingEdit.phone);
    if (!phone) {
      notify('Phone is required to map this WhatsApp chatId.', 'warning');
      return;
    }
    if (!mappingHubClientId) {
      notify('Please select or connect a WhatsApp Hub client before confirming this mapping.', 'warning');
      return;
    }
    setMappingEdit(prev => prev ? { ...prev, saving: true } : prev);
    try {
      const response = await fetch('/api/whatsapp-hub/contact-mappings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          conversationId: conversation?.id,
          chatId: mappingEdit.chatId,
          phone,
          hubClientId: mappingHubClientId,
          crmClientId: activeClient?.id
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update WhatsApp chatId mapping.');
      if (data.conversation) setConversation(data.conversation);
      setMappingEdit(null);
      notify('WhatsApp chatId mapping updated.', 'success');
      await loadData({ sync: false });
    } catch (error: any) {
      notify(error.message || 'Failed to update WhatsApp chatId mapping.', 'error');
      setMappingEdit(prev => prev ? { ...prev, saving: false } : prev);
    }
  };

  const defaultScheduleDateTime = () => {
    const date = new Date(Date.now() + 15 * 60 * 1000);
    date.setSeconds(0, 0);
    return date.toISOString().slice(0, 16);
  };

  const updateConversationTags = async (nextTags: string[]) => {
    if (!conversation?.id) return;
    const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ tags: nextTags })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to update WhatsApp tags');
    setConversation(prev => prev ? { ...prev, tags: nextTags } : prev);
  };

  const addTag = async () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (!tag || !conversation) return;
    const nextTags = Array.from(new Set([...(conversation.tags || []), tag]));
    try {
      await updateConversationTags(nextTags);
      setTagInput('');
    } catch (error: any) {
      notify(error.message || 'Failed to update WhatsApp tags.', 'error');
    }
  };

  const removeTag = async (tag: string) => {
    if (!conversation) return;
    try {
      await updateConversationTags((conversation.tags || []).filter(item => item !== tag));
    } catch (error: any) {
      notify(error.message || 'Failed to update WhatsApp tags.', 'error');
    }
  };

  const addConversationComment = async (content = commentInput) => {
    if (!conversation?.id || !content.trim()) return;
    try {
      const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add WhatsApp comment');
      setConversation(prev => prev ? { ...prev, comments: data.comments || [...(prev.comments || []), data.comment] } : prev);
      if (content === commentInput) setCommentInput('');
    } catch (error: any) {
      notify(error.message || 'Failed to add WhatsApp comment.', 'error');
    }
  };

  const deleteConversationComment = async (commentId: string) => {
    if (!conversation?.id) return;
    try {
      const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete WhatsApp comment');
      setConversation(prev => prev ? { ...prev, comments: data.comments || (prev.comments || []).filter(comment => comment.id !== commentId) } : prev);
    } catch (error: any) {
      notify(error.message || 'Failed to delete WhatsApp comment.', 'error');
    }
  };

  const linkConversationToClient = async (clientId: string) => {
    const linkedClient = useStore.getState().clients.find(item => item.id === clientId);
    if (conversation?.id) {
      try {
        const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            clientId,
            clientName: linkedClient?.name || displayPhone,
            clientCompany: linkedClient?.company || ''
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to link WhatsApp conversation');
      } catch (error: any) {
        notify(error.message || 'Failed to link WhatsApp conversation.', 'warning');
      }
    }
    setConversation(prev => prev ? {
      ...prev,
      clientId,
      clientName: linkedClient?.name || displayPhone,
      clientCompany: linkedClient?.company || ''
    } : prev);
    selectClient(clientId);
  };

  const handleLeadCreated = async (newClientId: string) => {
    await linkConversationToClient(newClientId);
    setIsCreatingLead(false);
  };

  const generateWhatsAppMessageText = async (seedPrompt: string, mode: 'draft' | 'customer_service' = 'draft') => {
    const prompt = seedPrompt.trim() || (mode === 'customer_service'
      ? 'Generate the best next WhatsApp customer-service reply based on the latest inbound customer message, CRM context, products, and RAG.'
      : '');
    if (!prompt) {
      notify(t('typePromptFirst'), 'warning');
      return '';
    }

    const llmConfig = getLLMConfig('whatsapp_drafting') || getLLMConfig('drafting');
    if (!llmConfig) {
      notify(t('configureWhatsAppDraftingModel'), 'warning');
      return '';
    }

      const recentMessages = messages.slice(-12).map(message => ({
        direction: message.direction,
        body: message.body,
        at: message.created_at || message.received_at
      }));
      const clientLogs = activeClient
        ? logs
            .filter(log => log.clientId === activeClient.id)
            .slice(0, 20)
            .map(log => ({ date: log.date, type: log.type, content: log.content }))
        : [];
      const clientEmails = activeClient
        ? emails
            .filter(email => email.clientId === activeClient.id)
            .slice(0, 8)
            .map(email => ({
              date: email.date,
              type: email.type,
              subject: email.subject,
              bodyPreview: email.body?.slice(0, 600)
            }))
        : [];
      const response = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          command: `${mode === 'customer_service' ? 'You are WhatsApp Customer Service Agent. Generate the next customer-service WhatsApp reply using this operator guidance or blank instruction' : 'Draft an outbound WhatsApp message using this user instruction as the prompt'}: ${prompt}

Write in a WhatsApp style: concise, natural, conversational, easy to reply to, and not formatted like an email. Customer-facing output language: ${outboundLanguage}. This language was resolved by priority: last customer communication language > client preferred language > official country/region language > English. Adapt tone, timing, offer details, and next step to the customer profile, preferences, prior communication, CRM records, recent WhatsApp chat, and relevant knowledge base context.
Critical direction rule: inbound messages are customer messages; outbound messages are our team's messages. Never treat our outbound messages as if the customer said them. If the latest message is outbound, draft a follow-up based on the latest inbound customer message and prior outreach context.
Before drafting, use the provided AI Customer Summary, AI next step, lead summaries, deal context, local RAG snippets, and product sales points. If those conflict with the raw chat, prioritize the latest inbound customer message and then CRM AI analysis.
${mode === 'customer_service' ? 'If there is no inbound customer message, do not pretend the customer asked a question. Send a low-pressure service follow-up or request clarification only when appropriate.' : ''}
Return only the message text.`,
          context: {
            channel: 'whatsapp',
            userInstruction: prompt,
            directionPolicy: 'Only inbound WhatsApp messages are customer messages. Outbound messages were sent by our team and must be used only as prior outreach context, never as customer requests to answer.',
            client: activeClient,
            clientId: activeClient?.id || conversation?.clientId || null,
            aiCustomerSummary: activeClient?.agentSummary || activeClient?.leadSummary || '',
            aiCustomerNextStep: activeClient?.agentNextStep || activeClient?.leadNextStep || '',
            aiCustomerScore: activeClient?.leadScore ?? null,
            relatedLeads: relatedDeals.map(deal => ({
              id: deal.id,
              name: deal.name,
              status: deal.status,
              value: deal.value,
              leadScore: deal.leadScore,
              leadSummary: deal.leadSummary,
              leadNextStep: deal.leadNextStep,
              comments: (deal.comments || []).slice(-5)
            })),
            localKnowledgeSnippets,
            productSnippets,
            clientPreferences: {
              preferredLanguage: activeClient?.preferredLanguage,
              preferredTimeRange: activeClient?.preferredTimeRange,
              country: activeClient?.country,
              tags: activeClient?.tags || []
            },
            clientComments: activeClient?.comments || [],
            clientLogs,
            relatedEmails: clientEmails,
            conversation,
            recentWhatsAppMessages: recentMessages,
            latestInboundCustomerMessage: latestInboundMessage?.body || '',
            latestOutboundOurMessage: latestOutboundMessage?.body || '',
            targetPhone: displayPhone,
            outboundLanguage,
            clientPreferredLanguage: activeClient?.preferredLanguage || null,
            systemLanguage: language === 'zh' ? 'Chinese' : 'English'
          },
          llmConfig,
          embeddingLlmConfig: getLLMConfig('embedding'),
          skipKnowledgeBase: false
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate WhatsApp message');
      return (data.result || '').trim();
  };

  const generateWhatsAppMessage = async (seedPrompt = body.trim()) => {
    setGenerating(true);
    try {
      const text = await generateWhatsAppMessageText(seedPrompt, 'draft');
      if (!text) return;
      setBody(text);
      incrementAgentHubTaskCount('whatsapp_draft_agent');
      notify('WhatsApp message drafted with AI.', 'success');
    } catch (error: any) {
      notify(error.message || 'Failed to generate WhatsApp message.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const sendMessage = async () => {
    if ((!body.trim() && !selectedFile && !selectedMedia && !whatsappCustomerServiceAgentEnabled) || !displayPhone) return;
    setSending(true);
    try {
      let messageBody = body.trim();
      let outboundOriginalRecord: {
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        changed: boolean;
        modelId: string | null;
      } | null = null;
      if (whatsappCustomerServiceAgentEnabled) {
        const generated = await generateWhatsAppMessageText(messageBody, 'customer_service');
        if (!generated) throw new Error('WhatsApp Customer Service Agent did not generate a message.');
        messageBody = generated;
        setBody(generated);
        incrementAgentHubTaskCount('whatsapp_customer_service_agent');
      }
      if (whatsappOutboundAutoTranslateEnabled && messageBody) {
        outboundOriginalRecord = await translateOutboundMessageText(messageBody);
        messageBody = outboundOriginalRecord.translatedText;
        setBody(messageBody);
      }
      let media: any;
      const uploadFileToHub = async (fileToUpload: File) => {
        const form = new FormData();
        form.append('file', fileToUpload);
        const uploadResponse = await fetch('/api/whatsapp-hub/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: form
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || 'Failed to upload WhatsApp media');
        const file = uploadData.file;
        return {
          url: file.url,
          originalName: file.originalName || fileToUpload.name,
          mimeType: file.mimeType || fileToUpload.type,
          sendAsDocument: !isInlineMedia(file.mimeType || fileToUpload.type)
        };
      };

      if (selectedFile) {
        media = await uploadFileToHub(selectedFile);
      } else if (selectedMedia) {
        if (selectedMedia.url.startsWith('data:')) {
          const file = await dataUrlToFile(selectedMedia.url, selectedMedia.name, selectedMedia.type);
          media = await uploadFileToHub(file);
        } else {
          media = {
            url: selectedMedia.url,
            originalName: selectedMedia.name,
            mimeType: selectedMedia.type,
            sendAsDocument: !isInlineMedia(selectedMedia.type)
          };
        }
      }
      const response = await fetch('/api/whatsapp-hub/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: displayPhone,
          body: messageBody,
          media,
          clientId: selectedClientId || undefined,
          scheduledAt: scheduleEnabled && scheduleDateTime ? new Date(scheduleDateTime).toISOString() : undefined,
          metadata: { clientId: activeClient?.id, hasMedia: !!media, agentMode: whatsappCustomerServiceAgentEnabled ? 'whatsapp_customer_service_agent' : undefined }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send WhatsApp message');
      setSelectedClientId(data.selectedClientId || selectedClientId);
      if (outboundOriginalRecord?.changed && data.messageId) {
        const originalTranslation: WhatsAppTranslation = {
          language,
          kind: 'outbound_original',
          text: outboundOriginalRecord.originalText,
          sourceLanguage: outboundOriginalRecord.sourceLanguage,
          targetLanguage: outboundOriginalRecord.targetLanguage,
          bodyHash: simpleHash(messageBody),
          skipped: false,
          modelId: outboundOriginalRecord.modelId
        };
        const saveOriginalResponse = await fetch(`/api/whatsapp-hub/messages/${encodeURIComponent(data.messageId)}/translation`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            language,
            kind: 'outbound_original',
            translatedText: outboundOriginalRecord.originalText,
            sourceLanguage: outboundOriginalRecord.sourceLanguage,
            targetLanguage: outboundOriginalRecord.targetLanguage,
            bodyHash: simpleHash(messageBody),
            skipped: false,
            modelId: outboundOriginalRecord.modelId
          })
        });
        const savedOriginalData = await saveOriginalResponse.json().catch(() => ({}));
        if (saveOriginalResponse.ok) {
          setTranslations(prev => {
            const next = { ...prev, [data.messageId]: savedOriginalData.translation || originalTranslation };
            writeCachedWhatsAppTranslations(targetPhone, language, next);
            return next;
          });
        } else {
          console.warn('Failed to save outbound WhatsApp original text', savedOriginalData.error);
        }
      }
      if (activeClient) {
        addLog(
          activeClient.id,
          data.scheduled
            ? `WhatsApp Hub message scheduled for ${new Date(data.scheduledAt).toLocaleString()}: ${messageBody.slice(0, 120)}`
            : `WhatsApp Hub message sent: ${messageBody.slice(0, 120)}`,
          undefined,
          'whatsapp',
          data
        );
      }
      setBody('');
      setSelectedFile(null);
      setSelectedMedia(null);
      if (data.scheduled) {
        setScheduleEnabled(false);
        setScheduleDateTime('');
      }
      notify(data.scheduled ? 'WhatsApp message scheduled.' : 'WhatsApp message queued.', 'success');
      await loadData({ sync: false });
    } catch (error: any) {
      notify(error.message || 'Failed to send WhatsApp message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const emojiOptions = ['😀', '😊', '👍', '🙏', '🔥', '🎉', '✅', '📦', '💬', '🤝', '📄', '🚀'];

  return (
    <div className={embedded ? "flex-1 min-h-0 flex flex-col bg-slate-950/50" : "fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"}>
      <div className={embedded ? "flex-1 min-h-0 bg-slate-950/50 flex flex-col overflow-hidden" : "w-full max-w-3xl h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-green-400" />
              <div>
              {activeClient ? (
                <button
                  onClick={() => selectClient(activeClient.id)}
                  className="font-bold text-white hover:text-cyan-300 hover:underline flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" />
                  {activeClient.name}
                </button>
              ) : (
                <div className="font-bold text-white">{conversation?.clientName || displayPhone}</div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{displayPhone}</span>
                {!activeClient && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsCreatingLead(true)}
                      className="inline-flex items-center gap-1 rounded bg-slate-800/70 px-1.5 py-0.5 font-bold text-cyan-400 hover:bg-slate-700 hover:text-cyan-300"
                    >
                      <UserPlus className="w-3 h-3" />
                      New Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingContactToClient(true)}
                      className="inline-flex items-center gap-1 rounded bg-slate-800/70 px-1.5 py-0.5 font-bold text-emerald-400 hover:bg-slate-700 hover:text-emerald-300"
                    >
                      <User className="w-3 h-3" />
                      Add to Existing Client
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {rawChatId && (
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/70">
            {mappingEdit ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-slate-500 truncate max-w-[220px]" title={mappingEdit.chatId}>
                  {mappingEdit.chatId}
                </span>
                <span className="text-slate-600">-&gt;</span>
                <input
                  value={mappingEdit.phone}
                  onChange={event => setMappingEdit(prev => prev ? { ...prev, phone: event.target.value } : prev)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') confirmChatIdMapping();
                    if (event.key === 'Escape') setMappingEdit(null);
                  }}
                  placeholder="Enter mobile number"
                  className="min-w-[180px] flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-green-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={confirmChatIdMapping}
                  disabled={mappingEdit.saving || !cleanPhone(mappingEdit.phone)}
                  className="rounded bg-green-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {mappingEdit.saving ? 'Saving' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setMappingEdit(null)}
                  className="rounded bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onDoubleClick={() => setMappingEdit({ chatId: rawChatId, phone: mappedPhone || '' })}
                title="Double-click to edit chatId to mobile mapping"
                className="block max-w-full truncate rounded px-1 py-1 text-left text-[11px] font-mono text-slate-500 hover:bg-slate-900 hover:text-slate-300"
              >
                {mappedPhone ? `${mappedPhone} (${rawChatId} -> ${mappedPhone})` : rawChatId}
              </button>
            )}
          </div>
        )}

        <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
            >
              <option value="">{t('randomStickyClient')}</option>
              {hubClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name || client.id} ({client.status}) {client.quota ? `quota ${client.quota.remaining}/${client.quota.dailyQuota}` : ''}
                </option>
              ))}
            </select>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWhatsAppAutoTranslateEnabled(autoTranslateKey, !whatsappAutoTranslateEnabled)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                whatsappAutoTranslateEnabled
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                  : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
              title={language === 'zh' ? `仅为 ${displayPhone} 自动翻译客户 WhatsApp 消息` : `Auto-translate customer WhatsApp messages for ${displayPhone}`}
            >
              <Languages className="h-4 w-4" />
              <span>{language === 'zh' ? '自动翻译' : 'Auto Translate'}</span>
              <span className={`h-2 w-2 rounded-full ${whatsappAutoTranslateEnabled ? 'bg-cyan-400' : 'bg-slate-600'}`} />
            </button>
            <button
              type="button"
              onClick={() => setWhatsAppCustomerServiceAgentEnabled(!whatsappCustomerServiceAgentEnabled)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                whatsappCustomerServiceAgentEnabled
                  ? 'border-green-500/40 bg-green-500/15 text-green-300'
                  : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
              title="WhatsApp Customer Service Agent"
            >
              <Sparkles className="h-4 w-4" />
              <span>Agent Mode</span>
              <span className={`h-2 w-2 rounded-full ${whatsappCustomerServiceAgentEnabled ? 'bg-green-400' : 'bg-slate-600'}`} />
            </button>
          </div>
        </div>

        {conversation && (
          <div className="p-3 border-b border-slate-800 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 bg-slate-900">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {(conversation.tags || []).map(tag => (
                  <button key={tag} onClick={() => removeTag(tag)} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-red-950/40 text-xs text-cyan-300 hover:text-red-300 border border-slate-700">
                    <Tag className="w-3 h-3" />
                    {tag}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
                  placeholder={t('addTag')}
                  className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
                />
                <button onClick={addTag} className="px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="max-h-20 overflow-y-auto space-y-1">
                {visibleConversationComments.slice(-3).map(comment => (
                  <div key={comment.id} className="group flex items-start gap-2 text-[11px] bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400">
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-300 break-words">{comment.content}</span>
                      <span className="ml-2 text-slate-600">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => deleteConversationComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-300 transition-opacity"
                      title={t('deleteComment')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addConversationComment(); }}
                  placeholder={t('addConversationComment')}
                  className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
                />
                <button onClick={() => addConversationComment()} className="px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950">
          {messages.length === 0 && !loading && (
            <div className="text-center text-slate-500 text-sm py-10">{t('noWhatsAppMessages')}</div>
          )}
          {messages.map(message => {
            const media = getWhatsAppMessageMedia(message, whatsappHubConfig.baseUrl);
            const translation = translations[message.id];
            const isTranslating = translatingIds.has(message.id);
            const outboundOriginal = message.direction === 'outbound' && translation?.kind === 'outbound_original' ? translation : undefined;
            return (
            <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] overflow-hidden rounded-2xl px-4 py-2 text-sm ${message.direction === 'outbound' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                {media.hasMedia && (
                  <div className="mb-2">
                    {media.url && media.isImage ? (
                      <a href={media.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/15 bg-black/20">
                        <img src={media.url} alt={media.name} className="max-h-72 w-full max-w-sm object-contain" loading="lazy" onLoad={() => scrollMessagesToBottom('auto')} />
                      </a>
                    ) : media.url && media.isVideo ? (
                      <video src={media.url} controls className="max-h-72 w-full max-w-sm rounded-xl border border-white/15 bg-black/40" onLoadedMetadata={() => scrollMessagesToBottom('auto')} />
                    ) : media.url ? (
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs hover:bg-black/30"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{media.name}</span>
                        <Download className="h-4 w-4 shrink-0 opacity-80" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-xs opacity-80">
                        <FileText className="w-3 h-3" />
                        {media.name || t('mediaMessage')}
                      </div>
                    )}
                  </div>
                )}
                {message.body && <div className="whitespace-pre-wrap break-words">{message.body}</div>}
                {whatsappAutoTranslateEnabled && message.direction === 'inbound' && (isTranslating || translation?.text) && translation?.kind !== 'outbound_original' && (
                  <div className="mt-2 border-t border-slate-600/70 pt-2">
                    <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                      {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                      {language === 'zh' ? '译文' : 'Translation'}
                      {translation?.sourceLanguage && <span className="font-normal normal-case text-slate-400">({translation.sourceLanguage})</span>}
                    </div>
                    <div className="whitespace-pre-wrap break-words text-slate-100">
                      {translation?.text || (language === 'zh' ? '正在翻译...' : 'Translating...')}
                    </div>
                  </div>
                )}
                {outboundOriginal?.text && (
                  <div className="mt-2 border-t border-green-300/40 pt-2">
                    <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-green-100">
                      <Languages className="h-3 w-3" />
                      {language === 'zh' ? '原文' : 'Original'}
                      {outboundOriginal.targetLanguage && <span className="font-normal normal-case text-green-100/80">→ {outboundOriginal.targetLanguage}</span>}
                    </div>
                    <div className="whitespace-pre-wrap break-words text-green-50">
                      {outboundOriginal.text}
                    </div>
                  </div>
                )}
                <div className="text-[10px] opacity-70 mt-1">
                  {message.client_id} · {new Date(message.created_at || message.received_at || Date.now()).toLocaleString()}
                </div>
              </div>
            </div>
            );
          })}
          <div ref={messagesEndRef} />
          <AgentContextSuggestions
            channel="whatsapp"
            cacheKey={agentContextCacheKey}
            clientId={conversation?.clientId || activeClient?.id}
            whatsappNumber={displayPhone}
            persistedInsight={conversation?.agentContextAnalysisKey === agentContextCacheKey ? conversation?.agentContextAnalysis : undefined}
            persistedInsightKey={conversation?.agentContextAnalysisKey}
            subject={conversation?.clientName || activeClient?.name || displayPhone}
            body={agentContextBody}
            additionalContext={agentContextAdditionalContext}
            clientName={conversation?.clientName || activeClient?.name}
            hasClient={!!(conversation?.clientId || activeClient?.id)}
            hasKnowledge={!!activeClient}
            hasCustomerMessage={recentInboundMessages.length > 0}
            autoScrollOnOpen={embedded}
            onDraftReply={() => generateWhatsAppMessage(
              body.trim() || (latestInboundMessage
                ? `Reply to the latest inbound customer WhatsApp message from ${conversation?.clientName || activeClient?.name || displayPhone}: ${latestInboundMessage.body}`
                : `Draft a polite WhatsApp follow-up to ${conversation?.clientName || activeClient?.name || displayPhone}. There is no inbound customer message yet, so do not answer our own outbound messages.`)
            )}
            onAddComment={() => addConversationComment(`Agent suggestion: review WhatsApp conversation with ${conversation?.clientName || activeClient?.name || displayPhone} and prepare the next best reply.`)}
            followUpAt={whatsappFollowUp?.dueAt}
            followUpNote={whatsappFollowUp?.note}
            onSetFollowUp={(dueAt, note) => addConversationComment(`${WHATSAPP_FOLLOW_UP_MARKER}${JSON.stringify({
              status: 'open',
              dueAt,
              note: note || `Follow up WhatsApp conversation with ${conversation?.clientName || activeClient?.name || displayPhone}.`
            })}`)}
            onClearFollowUp={() => addConversationComment(`${WHATSAPP_FOLLOW_UP_MARKER}${JSON.stringify({
              status: 'canceled',
              canceledAt: new Date().toISOString()
            })}`)}
            onCompleteFollowUp={() => addConversationComment(`${WHATSAPP_FOLLOW_UP_MARKER}${JSON.stringify({
              status: 'completed',
              completedAt: new Date().toISOString()
            })}`)}
            onDeleteItem={async () => {
              if (!conversation?.id) throw new Error('No WhatsApp conversation is selected.');
              const response = await fetch(`/api/whatsapp-hub/conversations/${encodeURIComponent(conversation.id)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(data.error || 'Failed to delete WhatsApp conversation.');
              notify('WhatsApp conversation deleted.', 'success');
              onClose();
            }}
            onSaveAnalysis={async (key, insight) => {
              if (!conversation?.id) return;
              const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ agentContextAnalysis: insight, agentContextAnalysisKey: key })
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(data.error || 'Failed to save WhatsApp analysis');
              setConversation(prev => prev ? { ...prev, agentContextAnalysis: insight, agentContextAnalysisKey: key } : prev);
            }}
          />
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3">
          {selectedFile && (
            <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
              <span className="truncate flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-400" />
                {selectedFile.name}
              </span>
              <button onClick={() => setSelectedFile(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {selectedMedia && (
            <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
              <span className="truncate flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                {selectedMedia.name}
              </span>
              <button onClick={() => setSelectedMedia(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {showEmoji && (
            <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-700 rounded-lg p-2">
              {emojiOptions.map(emoji => (
                <button key={emoji} onClick={() => setBody(prev => `${prev}${emoji}`)} className="text-xl hover:bg-slate-800 rounded p-1">
                  {emoji}
                </button>
              ))}
            </div>
          )}
          {scheduleEnabled && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm">
              <CalendarClock className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">{t('sendLater')}</span>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setScheduleDateTime(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-500">{t('whatsappRetryHint')}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Languages className="h-4 w-4 text-cyan-300" />
              <span className="font-bold text-slate-200">{language === 'zh' ? '发送前翻译' : 'Translate before send'}</span>
              <label className="flex items-center gap-1">
                <span>{language === 'zh' ? '目标语言' : 'Target'}</span>
                <select
                  value={outboundAutoTranslateLanguage}
                  disabled={!activeClient}
                  onChange={e => {
                    if (!activeClient) return;
                    editClient(activeClient.id, { preferredLanguage: e.target.value });
                    notify(
                      language === 'zh'
                        ? `客户偏好语言已更新为 ${e.target.value}。`
                        : `Client preferred language updated to ${e.target.value}.`,
                      'success'
                    );
                  }}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                  title={activeClient ? (language === 'zh' ? '修改后会同步保存为客户偏好语言' : 'Changing this saves the client preferred language') : (language === 'zh' ? '请先关联客户后再保存偏好语言' : 'Link a client before saving preferred language')}
                >
                  {outboundLanguageOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => setWhatsAppOutboundAutoTranslateEnabled(autoTranslateKey, !whatsappOutboundAutoTranslateEnabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                whatsappOutboundAutoTranslateEnabled
                  ? 'border-cyan-500/50 bg-cyan-500/30'
                  : 'border-slate-700 bg-slate-900'
              }`}
              title={language === 'zh' ? `仅为 ${displayPhone} 保存发送前翻译开关` : `Save translate-before-send for ${displayPhone}`}
            >
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${whatsappOutboundAutoTranslateEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-2">
              <label className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer">
                <Paperclip className="w-5 h-5" />
                <input
                  type="file"
                  className="hidden"
                  onChange={e => {
                    setSelectedFile(e.target.files?.[0] || null);
                    setSelectedMedia(null);
                  }}
                />
              </label>
              <button onClick={() => setShowMediaSelector(true)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg" title={t('selectFromMediaLibrary')}>
                <FolderOpen className="w-5 h-5" />
              </button>
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">
                <Smile className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setScheduleEnabled(prev => {
                    const next = !prev;
                    if (next && !scheduleDateTime) setScheduleDateTime(defaultScheduleDateTime());
                    return next;
                  });
                }}
                className={`p-2 rounded-lg ${scheduleEnabled ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                title={t('scheduleMessage')}
              >
                <CalendarClock className="w-5 h-5" />
              </button>
              <button
                onClick={() => generateWhatsAppMessage()}
                disabled={generating || !body.trim()}
                className="p-2 bg-cyan-900/50 hover:bg-cyan-800 disabled:bg-slate-800 disabled:text-slate-600 text-cyan-300 rounded-lg"
                title={t('generateWhatsAppWithAI')}
              >
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={whatsappCustomerServiceAgentEnabled ? 'Agent mode: optional guidance, or leave blank to auto-reply from context.' : t('typeWhatsAppMessage')}
              className="flex-1 min-h-16 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none resize-none focus:border-green-500"
            />
            <button
              onClick={sendMessage}
              disabled={sending || translatingOutbound || (!body.trim() && !selectedFile && !selectedMedia && !whatsappCustomerServiceAgentEnabled) || (scheduleEnabled && !scheduleDateTime)}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold text-white flex items-center gap-2 self-end"
            >
              {(sending || translatingOutbound) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {translatingOutbound
                ? (language === 'zh' ? '翻译中' : 'Translating')
                : whatsappCustomerServiceAgentEnabled ? (scheduleEnabled ? 'Agent Schedule' : 'Agent Send') : (scheduleEnabled ? t('schedule') : t('send'))}
            </button>
          </div>
        </div>
      </div>
      {showMediaSelector && (
        <MediaSelectorModal
          onSelect={(_, media) => {
            setSelectedMedia(media);
            setSelectedFile(null);
          }}
          onClose={() => setShowMediaSelector(false)}
          allowedTypes={[]}
        />
      )}
      {isCreatingLead && (
        <ClientFormModal
          onClose={() => setIsCreatingLead(false)}
          initialData={{
            name: conversation?.clientName || displayPhone,
            company: conversation?.clientCompany || 'Unknown',
            country: 'Unknown',
            status: 'Leads',
            tags: ['whatsapp'],
            contactMethods: [{ type: 'whatsapp', value: displayPhone }],
            contacts: [{
              id: `contact_${Date.now()}`,
              name: conversation?.clientName || displayPhone,
              title: '',
              isPrimary: true,
              contactMethods: [{ type: 'whatsapp', value: displayPhone }]
            }]
          }}
          onSave={handleLeadCreated}
        />
      )}
      {isAddingContactToClient && (
        <AddContactToClientModal
          contactMethod={{ type: 'whatsapp', value: displayPhone }}
          displayName={conversation?.clientName || displayPhone}
          onClose={() => setIsAddingContactToClient(false)}
          onLinked={async (clientId) => {
            await linkConversationToClient(clientId);
          }}
        />
      )}
    </div>
  );
}
