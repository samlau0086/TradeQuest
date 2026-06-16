import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Client, useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { WhatsAppChatHeader } from './WhatsAppChatHeader';
import { WhatsAppContextSuggestionsPanel } from './WhatsAppContextSuggestionsPanel';
import { WhatsAppDialogLayer } from './WhatsAppDialogLayer';
import { WhatsAppConversationMetaBar } from './WhatsAppConversationMetaBar';
import { WhatsAppMessageComposer } from './WhatsAppMessageComposer';
import { WhatsAppMessageList } from './WhatsAppMessageList';
import { useWhatsAppAgentContext } from './useWhatsAppAgentContext';
import { useWhatsAppChatData } from './useWhatsAppChatData';
import { useWhatsAppChatMapping } from './useWhatsAppChatMapping';
import { useWhatsAppChatSelection } from './useWhatsAppChatSelection';
import { useWhatsAppClientLinking } from './useWhatsAppClientLinking';
import { useWhatsAppComposerState } from './useWhatsAppComposerState';
import { useWhatsAppConversationMeta } from './useWhatsAppConversationMeta';
import { useWhatsAppConversationSummary } from './useWhatsAppConversationSummary';
import { useWhatsAppDrafting } from './useWhatsAppDrafting';
import { useWhatsAppMessageScroll } from './useWhatsAppMessageScroll';
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
  const {
    messagesEndRef,
    latestMessageId,
    scrollMessagesToBottom
  } = useWhatsAppMessageScroll({
    embedded,
    targetPhone,
    messages
  });
  const {
    rawChatId,
    mappedPhone,
    displayPhone,
    autoTranslateKey,
    selectableHubClients,
    activeClient,
    mappingHubClientId,
  } = useWhatsAppChatSelection({
    client,
    clients,
    conversation,
    targetPhone,
    hubClients,
    hubActors: whatsappHubConfig.actors,
    messages,
    selectedClientId,
    setSelectedClientId
  });
  const whatsappAutoTranslateEnabled = Boolean(autoTranslateKey && whatsappAutoTranslateConfig?.[autoTranslateKey]);
  const whatsappOutboundAutoTranslateEnabled = Boolean(autoTranslateKey && whatsappOutboundAutoTranslateConfig?.[autoTranslateKey]);
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
  const {
    relatedDeals,
    latestInboundMessage,
    latestOutboundMessage,
    whatsappAgentContext,
    outboundLanguage,
    outboundAutoTranslateLanguage,
    outboundLanguageOptions
  } = useWhatsAppAgentContext({
    activeClient,
    conversation,
    displayPhone,
    messages,
    emails,
    logs,
    deals,
    knowledgeBase,
    products
  });
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

      <WhatsAppDialogLayer
        showMediaSelector={showMediaSelector}
        isCreatingLead={isCreatingLead}
        isAddingContactToClient={isAddingContactToClient}
        displayPhone={displayPhone}
        conversationClientName={conversation?.clientName}
        newLeadInitialData={newLeadInitialData}
        onSelectMedia={selectMedia}
        onCloseMediaSelector={closeMediaSelector}
        onCloseCreateLead={closeCreateLead}
        onLeadCreated={handleLeadCreated}
        onCloseAddToExistingClient={closeAddToExistingClient}
        onExistingClientLinked={handleExistingClientLinked}
      />
    </div>
  );
}
