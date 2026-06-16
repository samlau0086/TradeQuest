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
import { useWhatsAppChatMapping } from './useWhatsAppChatMapping';
import { useWhatsAppConversationMeta, WHATSAPP_FOLLOW_UP_MARKER } from './useWhatsAppConversationMeta';
import { useWhatsAppConversationSummary } from './useWhatsAppConversationSummary';
import { useWhatsAppDrafting } from './useWhatsAppDrafting';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [sending, setSending] = useState(false);
  const [translations, setTranslations] = useState<Record<string, WhatsAppTranslation>>(() => readCachedWhatsAppTranslations(targetPhone, language));
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isAddingContactToClient, setIsAddingContactToClient] = useState(false);
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
  const {
    mappingEdit,
    canConfirmMapping,
    startMapping,
    changeMappingPhone,
    cancelMapping,
    confirmMapping
  } = useWhatsAppChatMapping({
    conversation,
    activeClientId: activeClient?.id,
    hubClientId: mappingHubClientId,
    resetKey: targetPhone,
    notify,
    setConversation,
    reloadConversation: () => loadData({ sync: false })
  });
  const {
    tagInput,
    setTagInput,
    commentInput,
    setCommentInput,
    visibleConversationComments,
    whatsappFollowUp,
    resetConversationMetaInputs,
    addTag,
    removeTag,
    addConversationComment,
    deleteConversationComment
  } = useWhatsAppConversationMeta({
    conversation,
    setConversation,
    notify
  });
  const relatedDeals = useMemo(() => (
    activeClient
      ? deals
          .filter(deal => deal.clientId === activeClient.id)
          .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
          .slice(0, 5)
      : []
  ), [activeClient?.id, deals]);
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
    generating,
    generateWhatsAppMessageText,
    generateWhatsAppMessage
  } = useWhatsAppDrafting({
    body,
    setBody,
    messages,
    activeClient,
    conversation,
    relatedDeals,
    knowledgeBase,
    products,
    logs,
    emails,
    latestInboundMessage,
    latestOutboundMessage,
    displayPhone,
    outboundLanguage,
    language,
    notify,
    translate: t,
    getLLMConfig,
    incrementAgentHubTaskCount
  });

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
    resetConversationMetaInputs();
    setSelectedFile(null);
    setSelectedMedia(null);
  }, [targetPhone, initialConversation?.id, initialMessage, language, resetConversationMetaInputs]);

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

  const defaultScheduleDateTime = () => {
    const date = new Date(Date.now() + 15 * 60 * 1000);
    date.setSeconds(0, 0);
    return date.toISOString().slice(0, 16);
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
          onStartMapping={startMapping}
          onChangeMappingPhone={changeMappingPhone}
          onConfirmMapping={confirmMapping}
          onCancelMapping={cancelMapping}
          canConfirmMapping={canConfirmMapping}
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
