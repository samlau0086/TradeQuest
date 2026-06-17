import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Client, useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { WhatsAppChatHeader } from './WhatsAppChatHeader';
import { WhatsAppContextSuggestionsPanel } from './WhatsAppContextSuggestionsPanel';
import { WhatsAppDialogLayer } from './WhatsAppDialogLayer';
import { WhatsAppConversationMetaBar } from './WhatsAppConversationMetaBar';
import { WhatsAppMessageComposer } from './WhatsAppMessageComposer';
import { WhatsAppMessageList } from './WhatsAppMessageList';
import { ConversationSplitPane } from './inbox-ui/ConversationSplitPane';
import { ConversationWorkspaceShell } from './inbox-ui/ConversationWorkspaceShell';
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
  type WhatsAppTranslation,
} from './whatsappMessageModel';

interface WhatsAppWorkroomChrome {
  header?: ReactNode;
  summary?: ReactNode;
  followUp?: ReactNode;
  className?: string;
  contentClassName?: string;
  composerClassName?: string;
}

interface Props {
  client?: Client | null;
  phone: string;
  conversation?: WhatsAppConversation | null;
  initialMessage?: string;
  embedded?: boolean;
  onClose: () => void;
  onOpenInInbox?: () => void;
  workroomChrome?: WhatsAppWorkroomChrome;
}

const cleanPhone = cleanWhatsAppPhone;
const isChatId = isWhatsAppChatId;

export function WhatsAppChatModal({
  client,
  phone,
  conversation: initialConversation,
  initialMessage = '',
  embedded = false,
  onClose,
  onOpenInInbox,
  workroomChrome,
}: Props) {
  const {
    notify,
    addLog,
    selectClient,
    editClient,
    language,
    llmConfigs,
    activeLLMId,
    llmMappings,
    logs,
    emails,
    clients,
    deals,
    knowledgeBase,
    products,
    whatsappHubConfig,
    whatsappCustomerServiceAgentEnabled,
    setWhatsAppCustomerServiceAgentEnabled,
    whatsappAutoTranslateConfig,
    setWhatsAppAutoTranslateEnabled,
    whatsappOutboundAutoTranslateConfig,
    setWhatsAppOutboundAutoTranslateEnabled,
    incrementAgentHubTaskCount,
  } = useStore();

  const t = useTranslation(language);
  const targetPhone = useMemo(() => (isChatId(phone) ? phone.trim() : cleanPhone(phone)), [phone]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [translations, setTranslations] = useState<Record<string, WhatsAppTranslation>>(
    () => readCachedWhatsAppTranslations(targetPhone, language),
  );

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
    toggleSchedule,
  } = useWhatsAppComposerState({
    initialMessage,
    resetKey: `${targetPhone}|${initialConversation?.id || ''}|${language}`,
  });

  const {
    hubClients,
    messages,
    conversation,
    setConversation,
    loading,
    loadData,
  } = useWhatsAppChatData({
    targetPhone,
    messageLookupTarget: targetPhone,
    language,
    initialConversation,
    notify,
    setSelectedClientId,
    setTranslations,
  });

  const { messagesEndRef, latestMessageId, scrollMessagesToBottom } = useWhatsAppMessageScroll({
    embedded,
    targetPhone,
    messages,
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
    setSelectedClientId,
  });

  const whatsappAutoTranslateEnabled = Boolean(
    autoTranslateKey && whatsappAutoTranslateConfig?.[autoTranslateKey],
  );
  const whatsappOutboundAutoTranslateEnabled = Boolean(
    autoTranslateKey && whatsappOutboundAutoTranslateConfig?.[autoTranslateKey],
  );

  const {
    mappingEdit,
    canConfirmMapping,
    startMapping,
    changeMappingPhone,
    cancelMapping,
    confirmMapping,
  } = useWhatsAppChatMapping({
    conversation,
    activeClientId: activeClient?.id,
    hubClientId: mappingHubClientId,
    resetKey: targetPhone,
    notify,
    setConversation,
    reloadConversation: () => loadData({ sync: false }),
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
    handleExistingClientLinked,
  } = useWhatsAppClientLinking({
    clients,
    conversation,
    displayPhone,
    setConversation,
    selectClient,
    notify,
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
    deleteConversationComment,
  } = useWhatsAppConversationMeta({
    conversation,
    setConversation,
    notify,
  });

  const {
    relatedDeals,
    latestInboundMessage,
    latestOutboundMessage,
    whatsappAgentContext,
    outboundLanguage,
    outboundAutoTranslateLanguage,
    outboundLanguageOptions,
  } = useWhatsAppAgentContext({
    activeClient,
    conversation,
    displayPhone,
    messages,
    emails,
    logs,
    deals,
    knowledgeBase,
    products,
  });

  const getLLMConfig = useCallback(
    (module: string) => {
      const id = llmMappings[module] || activeLLMId;
      return llmConfigs.find(llm => llm.id === id) || null;
    },
    [activeLLMId, llmConfigs, llmMappings],
  );

  const getTranslationLLMConfig = useCallback(
    () => getLLMConfig('agent_context_suggestions') || getLLMConfig('whatsapp_drafting') || getLLMConfig('drafting'),
    [getLLMConfig],
  );

  const { generating, generateWhatsAppMessageText, generateWhatsAppMessage } =
    useWhatsAppDrafting({
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
      incrementAgentHubTaskCount,
    });

  const { translatingIds, translatingOutbound, translateOutboundMessageText } =
    useWhatsAppTranslation({
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
      getTranslationLLMConfig,
    });

  const { sending, sendMessage } = useWhatsAppSending({
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
    setTranslations,
  });

  useWhatsAppConversationSummary({
    conversation,
    messageCount: messages.length,
    latestMessageId,
    setConversation,
  });

  useEffect(() => {
    resetConversationMetaInputs();
  }, [targetPhone, initialConversation?.id, language, resetConversationMetaInputs]);

  const messageWorkspace = (
    <WhatsAppMessageList
      messages={messages}
      loading={loading}
      embedded={embedded}
      cardSurface
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
  );

  const contextWorkspace = (
    <WhatsAppContextSuggestionsPanel
      embedded={embedded}
      withinConversationSplit
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
  );

  const chatWorkspace = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f3f6fb]">
      <WhatsAppChatHeader
        activeClient={activeClient}
        conversationClientName={conversation?.clientName}
        displayPhone={displayPhone}
        embedded={embedded}
        lightChrome
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
        onToggleAutoTranslate={() =>
          setWhatsAppAutoTranslateEnabled(autoTranslateKey, !whatsappAutoTranslateEnabled)
        }
        onToggleCustomerServiceAgent={() =>
          setWhatsAppCustomerServiceAgentEnabled(!whatsappCustomerServiceAgentEnabled)
        }
      />

      {conversation && (
        <WhatsAppConversationMetaBar
          language={language}
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

      <ConversationSplitPane
        main={messageWorkspace}
        rail={contextWorkspace}
        className={embedded ? undefined : 'bg-[#f6f8fb]'}
        mainClassName={embedded ? undefined : 'p-5'}
      />
    </div>
  );

  const composer = (
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
      canSend={
        !(
          sending ||
          translatingOutbound ||
          (!body.trim() && !selectedFile && !selectedMedia && !whatsappCustomerServiceAgentEnabled) ||
          (scheduleEnabled && !scheduleDateTime)
        )
      }
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
            ? `\u5ba2\u6237\u504f\u597d\u8bed\u8a00\u5df2\u66f4\u65b0\u4e3a ${value}\u3002`
            : `Client preferred language updated to ${value}.`,
          'success',
        );
      }}
      onToggleOutboundAutoTranslate={() =>
        setWhatsAppOutboundAutoTranslateEnabled(
          autoTranslateKey,
          !whatsappOutboundAutoTranslateEnabled,
        )
      }
      onBodyChange={setBody}
      onGenerate={() => generateWhatsAppMessage()}
      onSend={sendMessage}
    />
  );

  const modalOrEmbeddedWorkspace = workroomChrome ? (
    <ConversationWorkspaceShell
      header={workroomChrome.header}
      summary={workroomChrome.summary}
      followUp={workroomChrome.followUp}
      content={chatWorkspace}
      composer={composer}
      className={workroomChrome.className}
      contentClassName={workroomChrome.contentClassName}
      composerClassName={workroomChrome.composerClassName}
    />
  ) : (
    <div
      className={
        embedded
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f3f6fb]'
          : 'flex h-[86vh] w-full max-w-[1380px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-[#f6f8fb] shadow-[0_28px_90px_rgba(15,23,42,0.28)]'
      }
    >
      {chatWorkspace}
      {composer}
    </div>
  );

  return (
    <div
      className={
        embedded
          ? 'flex min-h-0 flex-1 flex-col bg-[#f3f6fb]'
          : 'fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4'
      }
    >
      {modalOrEmbeddedWorkspace}

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
