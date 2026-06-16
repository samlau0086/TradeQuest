import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client, MediaItem, useStore } from '../store';
import { MediaSelectorModal } from './MediaSelectorModal';
import { useTranslation } from '../lib/i18n';
import { AgentContextSuggestions } from './AgentContextSuggestions';
import { getCustomerOutputLanguage, getOutboundLanguage } from '../lib/language';
import { ClientFormModal, PREFERRED_LANGUAGES } from './ClientFormModal';
import { AddContactToClientModal } from './AddContactToClientModal';
import { buildUnifiedAgentContext } from '../lib/agentContext';
import { ConversationContextRail } from './inbox-ui/ConversationContextRail';
import { WhatsAppChatHeader } from './WhatsAppChatHeader';
import { WhatsAppConversationMetaBar } from './WhatsAppConversationMetaBar';
import { WhatsAppMessageComposer } from './WhatsAppMessageComposer';
import { WhatsAppMessageList } from './WhatsAppMessageList';
import { useWhatsAppChatData } from './useWhatsAppChatData';
import { useWhatsAppConversationSummary } from './useWhatsAppConversationSummary';
import { useWhatsAppTranslation } from './useWhatsAppTranslation';
import {
  cleanWhatsAppPhone,
  isWhatsAppChatId,
  readCachedWhatsAppTranslations,
  simpleHash,
  writeCachedWhatsAppTranslations,
  type WhatsAppConversation,
  type WhatsAppTranslation
} from './whatsappMessageModel';

interface Props {
  client?: Client | null;
  phone: string;
  conversation?: WhatsAppConversation | null;
  initialMessage?: string;
  embedded?: boolean;
  onClose: () => void;
  onOpenInInbox?: () => void;
}

const cleanPhone = cleanWhatsAppPhone;
const isChatId = isWhatsAppChatId;
const isInlineMedia = (mimeType: string) => mimeType.startsWith('image/') || mimeType.startsWith('video/');
const WHATSAPP_FOLLOW_UP_MARKER = '__FOLLOW_UP__';

const dataUrlToFile = async (dataUrl: string, name: string, mimeType: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: mimeType || blob.type || 'application/octet-stream' });
};

export function WhatsAppChatModal({ client, phone, conversation: initialConversation, initialMessage = '', embedded = false, onClose, onOpenInInbox }: Props) {
  const { notify, addLog, selectClient, editClient, language, llmConfigs, activeLLMId, llmMappings, logs, emails, clients, deals, knowledgeBase, products, whatsappHubConfig, whatsappCustomerServiceAgentEnabled, setWhatsAppCustomerServiceAgentEnabled, whatsappAutoTranslateConfig, setWhatsAppAutoTranslateEnabled, whatsappOutboundAutoTranslateConfig, setWhatsAppOutboundAutoTranslateEnabled, incrementAgentHubTaskCount } = useStore();
  const t = useTranslation(language);
  const targetPhone = useMemo(() => isChatId(phone) ? phone.trim() : cleanPhone(phone), [phone]);
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
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [translations, setTranslations] = useState<Record<string, WhatsAppTranslation>>(() => readCachedWhatsAppTranslations(targetPhone, language));
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isAddingContactToClient, setIsAddingContactToClient] = useState(false);
  const [mappingEdit, setMappingEdit] = useState<{ chatId: string; phone: string; saving?: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const {
    hubClients,
    messages,
    conversation,
    setConversation,
    loading,
    loadData
  } = useWhatsAppChatData({
    targetPhone,
    messageLookupTarget: targetPhone,
    language,
    initialConversation,
    notify,
    setSelectedClientId,
    setTranslations
  });
  const rawChatId = conversation?.rawChatId || (isChatId(targetPhone) ? targetPhone : '');
  const mappedPhone = conversation?.contactPhone || (!isChatId(targetPhone) ? targetPhone : '');
  const displayPhone = mappedPhone || targetPhone;
  const autoTranslateKey = useMemo(() => (cleanPhone(displayPhone) || displayPhone || targetPhone).trim().toLowerCase(), [displayPhone, targetPhone]);
  const whatsappAutoTranslateEnabled = Boolean(autoTranslateKey && whatsappAutoTranslateConfig?.[autoTranslateKey]);
  const whatsappOutboundAutoTranslateEnabled = Boolean(autoTranslateKey && whatsappOutboundAutoTranslateConfig?.[autoTranslateKey]);
  const selectableHubClients = useMemo(() => {
    const actorClientIds = new Set((whatsappHubConfig.actors || [])
      .filter(actor => actor.enabled !== false && actor.clientId)
      .map(actor => actor.clientId));
    if (actorClientIds.size === 0) return hubClients;
    return hubClients.filter(client => actorClientIds.has(client.id));
  }, [hubClients, whatsappHubConfig.actors]);
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
    || selectableHubClients.find(item => item.status === 'online')?.id
    || selectableHubClients[0]?.id
    || ''
  ), [messages, selectableHubClients, selectedClientId]);
  useEffect(() => {
    if (selectedClientId && selectableHubClients.length > 0 && !selectableHubClients.some(item => item.id === selectedClientId)) {
      setSelectedClientId('');
    }
  }, [selectableHubClients, selectedClientId]);
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
  const whatsappMemoryContext = useMemo(() => {
    if (!conversation?.whatsappSummary) return '';
    return [
      `Compressed WhatsApp memory: ${conversation.whatsappSummary}`,
      conversation.whatsappSummaryNextStep ? `Compressed WhatsApp next step: ${conversation.whatsappSummaryNextStep}` : '',
      Array.isArray(conversation.whatsappSummaryKeyPoints) && conversation.whatsappSummaryKeyPoints.length > 0
        ? `Compressed WhatsApp key points: ${conversation.whatsappSummaryKeyPoints.join(' | ')}`
        : '',
      conversation.whatsappSummaryUpdatedAt ? `Compressed WhatsApp memory updated at: ${conversation.whatsappSummaryUpdatedAt}` : ''
    ].filter(Boolean).join('\n');
  }, [conversation?.whatsappSummary, conversation?.whatsappSummaryKeyPoints, conversation?.whatsappSummaryNextStep, conversation?.whatsappSummaryUpdatedAt]);
  const latestInboundMessage = messages.filter(message => message.direction === 'inbound').slice(-1)[0];
  const latestOutboundMessage = messages.filter(message => message.direction === 'outbound').slice(-1)[0];
  const whatsappAgentContext = buildUnifiedAgentContext({
    channel: 'whatsapp',
    subject: conversation?.clientName || activeClient?.name || displayPhone,
    contactLabel: displayPhone,
    client: activeClient,
    messages: messages.map(message => ({
      id: message.id,
      direction: message.direction,
      body: message.body,
      createdAt: message.created_at || message.received_at,
      channel: 'whatsapp',
      sender: message.sender || message.client_id
    })),
    emails,
    logs,
    deals,
    knowledgeBase,
    products,
    memory: whatsappMemoryContext || 'Compressed WhatsApp memory: N/A',
    currentMessageId: latestInboundMessage?.id || latestOutboundMessage?.id
  });
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

  const getLLMConfig = useCallback((module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(llm => llm.id === id) || null;
  }, [activeLLMId, llmConfigs, llmMappings]);

  const getTranslationLLMConfig = useCallback(() => (
    getLLMConfig('agent_context_suggestions') || getLLMConfig('whatsapp_drafting') || getLLMConfig('drafting')
  ), [getLLMConfig]);

  const {
    translatingIds,
    translatingOutbound,
    translateOutboundMessageText
  } = useWhatsAppTranslation({
    targetPhone,
    language,
    messages,
    latestMessageId,
    translations,
    setTranslations,
    inboundAutoTranslateEnabled: whatsappAutoTranslateEnabled,
    outboundAutoTranslateLanguage,
    activeClient,
    notify,
    getTranslationLLMConfig
  });
  useWhatsAppConversationSummary({
    conversation,
    messageCount: messages.length,
    latestMessageId,
    setConversation
  });

  useEffect(() => {
    setBody(initialMessage);
    setTagInput('');
    setCommentInput('');
    setSelectedFile(null);
    setSelectedMedia(null);
    setMappingEdit(null);
  }, [targetPhone, initialConversation?.id, initialMessage, language]);

  useEffect(() => {
    if (embedded) return;
    if (!targetPhone || messages.length === 0) return;
    const frame = window.requestAnimationFrame(() => scrollMessagesToBottom('auto'));
    const shortTimer = window.setTimeout(() => scrollMessagesToBottom('auto'), 80);
    const mediaTimer = window.setTimeout(() => scrollMessagesToBottom('auto'), 300);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(shortTimer);
      window.clearTimeout(mediaTimer);
    };
  }, [embedded, targetPhone, latestMessageId, messages.length]);

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
    const unifiedId = conversation.unifiedId;
    const response = await fetch(unifiedId ? `/api/conversations/${unifiedId}` : `/api/whatsapp-hub/conversations/${conversation.id}`, {
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
      const comment = { id: `uc_${Date.now()}_${Math.floor(Math.random() * 1000)}`, author: 'User', content: content.trim(), createdAt: new Date().toISOString(), replies: [] };
      if (conversation.unifiedId) {
        const nextComments = [...(conversation.comments || []), comment];
        const response = await fetch(`/api/conversations/${conversation.unifiedId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ comments: nextComments })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to add WhatsApp comment');
        setConversation(prev => prev ? { ...prev, comments: data.conversation?.comments || nextComments } : prev);
        if (content === commentInput) setCommentInput('');
        return;
      }
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
      if (conversation.unifiedId) {
        const nextComments = (conversation.comments || []).filter(comment => comment.id !== commentId);
        const response = await fetch(`/api/conversations/${conversation.unifiedId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ comments: nextComments })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to delete WhatsApp comment');
        setConversation(prev => prev ? { ...prev, comments: data.conversation?.comments || nextComments } : prev);
        return;
      }
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
        const response = await fetch(conversation.unifiedId ? `/api/conversations/${conversation.unifiedId}` : `/api/whatsapp-hub/conversations/${conversation.id}`, {
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
If compressed WhatsApp memory is provided, use it as durable long-conversation memory and avoid re-reading old turns unless the latest inbound message changes the context.
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
            compressedWhatsAppMemory: {
              summary: conversation?.whatsappSummary || '',
              keyPoints: conversation?.whatsappSummaryKeyPoints || [],
              nextStep: conversation?.whatsappSummaryNextStep || '',
              updatedAt: conversation?.whatsappSummaryUpdatedAt || null
            },
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
        <WhatsAppChatHeader
          activeClient={activeClient}
          conversationClientName={conversation?.clientName}
          displayPhone={displayPhone}
          embedded={embedded}
          language={language}
          rawChatId={rawChatId}
          mappedPhone={mappedPhone}
          mappingEdit={mappingEdit}
          selectableHubClients={selectableHubClients}
          selectedClientId={selectedClientId}
          loading={loading}
          autoTranslateEnabled={whatsappAutoTranslateEnabled}
          customerServiceAgentEnabled={whatsappCustomerServiceAgentEnabled}
          randomStickyClientLabel={t('randomStickyClient')}
          onSelectClient={selectClient}
          onCreateLead={() => setIsCreatingLead(true)}
          onAddToExistingClient={() => setIsAddingContactToClient(true)}
          onOpenInInbox={onOpenInInbox}
          onClose={onClose}
          onStartMapping={(chatId, phone) => setMappingEdit({ chatId, phone })}
          onChangeMappingPhone={phone => setMappingEdit(prev => prev ? { ...prev, phone } : prev)}
          onConfirmMapping={confirmChatIdMapping}
          onCancelMapping={() => setMappingEdit(null)}
          canConfirmMapping={!!(mappingEdit && cleanPhone(mappingEdit.phone))}
          onSelectedClientChange={setSelectedClientId}
          onToggleAutoTranslate={() => setWhatsAppAutoTranslateEnabled(autoTranslateKey, !whatsappAutoTranslateEnabled)}
          onToggleCustomerServiceAgent={() => setWhatsAppCustomerServiceAgentEnabled(!whatsappCustomerServiceAgentEnabled)}
        />

        {conversation && (
          <WhatsAppConversationMetaBar
            tags={conversation.tags || []}
            comments={visibleConversationComments}
            tagInput={tagInput}
            commentInput={commentInput}
            addTagLabel={t('addTag')}
            addCommentLabel={t('addConversationComment')}
            deleteCommentLabel={t('deleteComment')}
            onTagInputChange={setTagInput}
            onCommentInputChange={setCommentInput}
            onAddTag={addTag}
            onRemoveTag={removeTag}
            onAddComment={() => addConversationComment()}
            onDeleteComment={deleteConversationComment}
          />
        )}

        <div className={embedded ? 'flex-1 min-h-0 bg-slate-950 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]' : 'flex-1 min-h-0 overflow-y-auto bg-slate-950'}>
          <section className={embedded ? 'min-h-0 overflow-y-auto p-4 space-y-3' : 'p-4 space-y-3'}>
            <WhatsAppMessageList
              messages={messages}
              loading={loading}
              embedded={embedded}
              hubBaseUrl={whatsappHubConfig.baseUrl}
              translations={translations}
              translatingIds={translatingIds}
              autoTranslateEnabled={whatsappAutoTranslateEnabled}
              language={language}
              noMessagesLabel={t('noWhatsAppMessages')}
              mediaMessageLabel={t('mediaMessage')}
              messagesEndRef={messagesEndRef}
              onMediaLoaded={() => scrollMessagesToBottom('auto')}
            />
          </section>
          <ConversationContextRail
            variant="rail"
            title={language === 'zh' ? '智能体建议' : 'Agent Suggestions'}
            description={language === 'zh'
              ? '分析 WhatsApp 对话、客户资料、产品和 RAG 上下文，准备回复、待跟进和内部备注操作。'
              : 'Analyze WhatsApp, customer, product, and RAG context for reply, follow-up, and internal note actions.'}
            className={embedded ? 'min-h-0 overflow-y-auto border-t border-slate-800 bg-slate-950/60 p-4 lg:border-l lg:border-t-0' : 'border-t border-slate-800 bg-slate-950/60 p-4'}
            collapsible
          >
            <AgentContextSuggestions
              channel="whatsapp"
              cacheKey={whatsappAgentContext.cacheKey}
              contextLookup={conversation?.unifiedId ? { conversationId: conversation.unifiedId } : undefined}
              clientId={conversation?.clientId || activeClient?.id}
              whatsappNumber={displayPhone}
              persistedInsight={conversation?.agentContextAnalysisKey === whatsappAgentContext.cacheKey ? conversation?.agentContextAnalysis : undefined}
              persistedInsightKey={conversation?.agentContextAnalysisKey}
              subject={conversation?.clientName || activeClient?.name || displayPhone}
              body={whatsappAgentContext.body}
              additionalContext={whatsappAgentContext.additionalContext}
              clientName={conversation?.clientName || activeClient?.name}
              hasClient={!!(conversation?.clientId || activeClient?.id)}
              hasKnowledge={!!activeClient}
              hasCustomerMessage={whatsappAgentContext.hasCustomerMessage}
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
                const response = await fetch(conversation.unifiedId ? `/api/conversations/${encodeURIComponent(conversation.unifiedId)}` : `/api/whatsapp-hub/conversations/${encodeURIComponent(conversation.id)}`, {
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
          </ConversationContextRail>
        </div>

        <WhatsAppMessageComposer
          language={language}
          displayPhone={displayPhone}
          selectedFile={selectedFile}
          selectedMedia={selectedMedia}
          showEmoji={showEmoji}
          emojiOptions={emojiOptions}
          scheduleEnabled={scheduleEnabled}
          scheduleDateTime={scheduleDateTime}
          outboundAutoTranslateLanguage={outboundAutoTranslateLanguage}
          outboundLanguageOptions={outboundLanguageOptions}
          hasActiveClient={!!activeClient}
          outboundAutoTranslateEnabled={whatsappOutboundAutoTranslateEnabled}
          body={body}
          customerServiceAgentEnabled={whatsappCustomerServiceAgentEnabled}
          generating={generating}
          sending={sending}
          translatingOutbound={translatingOutbound}
          canSend={!(sending || translatingOutbound || (!body.trim() && !selectedFile && !selectedMedia && !whatsappCustomerServiceAgentEnabled) || (scheduleEnabled && !scheduleDateTime))}
          canGenerate={!!body.trim()}
          sendLaterLabel={t('sendLater')}
          retryHintLabel={t('whatsappRetryHint')}
          selectFromMediaLibraryLabel={t('selectFromMediaLibrary')}
          scheduleMessageLabel={t('scheduleMessage')}
          generateWithAiLabel={t('generateWhatsAppWithAI')}
          typeMessageLabel={t('typeWhatsAppMessage')}
          scheduleLabel={t('schedule')}
          sendLabel={t('send')}
          onClearSelectedFile={() => setSelectedFile(null)}
          onClearSelectedMedia={() => setSelectedMedia(null)}
          onFileSelected={file => {
            setSelectedFile(file);
            setSelectedMedia(null);
          }}
          onOpenMediaSelector={() => setShowMediaSelector(true)}
          onToggleEmoji={() => setShowEmoji(!showEmoji)}
          onPickEmoji={emoji => setBody(prev => `${prev}${emoji}`)}
          onToggleSchedule={() => {
            setScheduleEnabled(prev => {
              const next = !prev;
              if (next && !scheduleDateTime) setScheduleDateTime(defaultScheduleDateTime());
              return next;
            });
          }}
          onScheduleDateTimeChange={setScheduleDateTime}
          onTargetLanguageChange={value => {
            if (!activeClient) return;
            editClient(activeClient.id, { preferredLanguage: value });
            notify(
              language === 'zh'
                ? `客户偏好语言已更新为 ${value}。`
                : `Client preferred language updated to ${value}.`,
              'success'
            );
          }}
          onToggleOutboundAutoTranslate={() => setWhatsAppOutboundAutoTranslateEnabled(autoTranslateKey, !whatsappOutboundAutoTranslateEnabled)}
          onBodyChange={setBody}
          onGenerate={() => generateWhatsAppMessage()}
          onSend={sendMessage}
        />
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
