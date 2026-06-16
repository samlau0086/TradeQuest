import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client, useStore } from '../store';
import { MediaSelectorModal } from './MediaSelectorModal';
import { useTranslation } from '../lib/i18n';
import { getCustomerOutputLanguage, getOutboundLanguage } from '../lib/language';
import { ClientFormModal, PREFERRED_LANGUAGES } from './ClientFormModal';
import { AddContactToClientModal } from './AddContactToClientModal';
import { buildUnifiedAgentContext } from '../lib/agentContext';
import { WhatsAppChatHeader } from './WhatsAppChatHeader';
import { WhatsAppContextSuggestionsPanel } from './WhatsAppContextSuggestionsPanel';
import { WhatsAppConversationMetaBar } from './WhatsAppConversationMetaBar';
import { WhatsAppMessageComposer } from './WhatsAppMessageComposer';
import { WhatsAppMessageList } from './WhatsAppMessageList';
import { useWhatsAppChatData } from './useWhatsAppChatData';
import { useWhatsAppChatMapping } from './useWhatsAppChatMapping';
import { useWhatsAppClientLinking } from './useWhatsAppClientLinking';
import { useWhatsAppComposerState } from './useWhatsAppComposerState';
import { useWhatsAppConversationMeta } from './useWhatsAppConversationMeta';
import { useWhatsAppConversationSummary } from './useWhatsAppConversationSummary';
import { useWhatsAppDrafting } from './useWhatsAppDrafting';
import { useWhatsAppSending } from './useWhatsAppSending';
import { useWhatsAppTranslation } from './useWhatsAppTranslation';
import {
  cleanWhatsAppPhone,
  isWhatsAppChatId,
  readCachedWhatsAppTranslations,
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

export function WhatsAppChatModal({ client, phone, conversation: initialConversation, initialMessage = '', embedded = false, onClose, onOpenInInbox }: Props) {
  const { notify, addLog, selectClient, editClient, language, llmConfigs, activeLLMId, llmMappings, logs, emails, clients, deals, knowledgeBase, products, whatsappHubConfig, whatsappCustomerServiceAgentEnabled, setWhatsAppCustomerServiceAgentEnabled, whatsappAutoTranslateConfig, setWhatsAppAutoTranslateEnabled, whatsappOutboundAutoTranslateConfig, setWhatsAppOutboundAutoTranslateEnabled, incrementAgentHubTaskCount } = useStore();
  const t = useTranslation(language);
  const targetPhone = useMemo(() => isChatId(phone) ? phone.trim() : cleanPhone(phone), [phone]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [translations, setTranslations] = useState<Record<string, WhatsAppTranslation>>(() => readCachedWhatsAppTranslations(targetPhone, language));
  const {
    body,
    setBody,
    selectedFile,
    setSelectedFile,
    selectedMedia,
    setSelectedMedia,
    showMediaSelector,
    showEmoji,
    scheduleEnabled,
    setScheduleEnabled,
    scheduleDateTime,
    setScheduleDateTime,
    emojiOptions,
    clearSelectedFile,
    clearSelectedMedia,
    openMediaSelector,
    closeMediaSelector,
    toggleEmoji,
    pickEmoji,
    selectFile,
    selectMedia,
    toggleSchedule
  } = useWhatsAppComposerState({
    initialMessage,
    resetKey: `${targetPhone}|${initialConversation?.id || ''}|${language}`
  });
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
    isCreatingLead,
    isAddingContactToClient,
    openCreateLead,
    closeCreateLead,
    openAddToExistingClient,
    closeAddToExistingClient,
    newLeadInitialData,
    handleLeadCreated,
    handleExistingClientLinked
  } = useWhatsAppClientLinking({
    clients,
    conversation,
    displayPhone,
    setConversation,
    selectClient,
    notify
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
  const {
    sending,
    sendMessage
  } = useWhatsAppSending({
    body,
    setBody,
    selectedFile,
    setSelectedFile,
    selectedMedia,
    setSelectedMedia,
    selectedClientId,
    setSelectedClientId,
    scheduleEnabled,
    setScheduleEnabled,
    scheduleDateTime,
    setScheduleDateTime,
    displayPhone,
    targetPhone,
    language,
    activeClient,
    customerServiceAgentEnabled: whatsappCustomerServiceAgentEnabled,
    outboundAutoTranslateEnabled: whatsappOutboundAutoTranslateEnabled,
    translateOutboundMessageText,
    generateWhatsAppMessageText,
    incrementAgentHubTaskCount,
    addLog,
    notify,
    loadData,
    setTranslations
  });
  useWhatsAppConversationSummary({
    conversation,
    messageCount: messages.length,
    latestMessageId,
    setConversation
  });

  useEffect(() => {
    resetConversationMetaInputs();
  }, [targetPhone, initialConversation?.id, language, resetConversationMetaInputs]);

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
          onCreateLead={openCreateLead}
          onAddToExistingClient={openAddToExistingClient}
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
          <WhatsAppContextSuggestionsPanel
            embedded={embedded}
            language={language}
            conversation={conversation}
            activeClient={activeClient}
            displayPhone={displayPhone}
            body={body}
            latestInboundMessage={latestInboundMessage}
            whatsappAgentContext={whatsappAgentContext}
            whatsappFollowUp={whatsappFollowUp}
            generateWhatsAppMessage={generateWhatsAppMessage}
            addConversationComment={addConversationComment}
            notify={notify}
            onClose={onClose}
            setConversation={setConversation}
          />
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
          onClearSelectedFile={clearSelectedFile}
          onClearSelectedMedia={clearSelectedMedia}
          onFileSelected={selectFile}
          onOpenMediaSelector={openMediaSelector}
          onToggleEmoji={toggleEmoji}
          onPickEmoji={pickEmoji}
          onToggleSchedule={toggleSchedule}
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
            selectMedia(media);
          }}
          onClose={closeMediaSelector}
          allowedTypes={[]}
        />
      )}
      {isCreatingLead && (
        <ClientFormModal
          onClose={closeCreateLead}
          initialData={newLeadInitialData}
          onSave={handleLeadCreated}
        />
      )}
      {isAddingContactToClient && (
        <AddContactToClientModal
          contactMethod={{ type: 'whatsapp', value: displayPhone }}
          displayName={conversation?.clientName || displayPhone}
          onClose={closeAddToExistingClient}
          onLinked={handleExistingClientLinked}
        />
      )}
    </div>
  );
}
