import React, { useState, useRef, useEffect } from 'react';
import { useStore, EmailMessage } from '../store';
import { useAuthStore } from '../authStore';
import { cn } from '../lib/utils';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import {
  CONVERSATION_STAGES,
  InboxAuxiliaryDialogs,
  InboxContactLinkingModals,
  InboxContentPanel,
  InboxConversationSidebar,
  useActiveConversationComments,
  useActiveConversationContext,
  useConversationFollowUp,
  useConversationReplyActions,
  useConversationTranslations,
  useEmailQuickActions,
  useInboxBulkActions,
  useInboxConversationList,
  useInboxNavigationActions,
  useInboxSelection,
  useInboxSidebarActions,
  useInboxSync,
  useLiveChatInboxSession,
  useSelectedEmailContext,
  useUnifiedConversationActions,
  WHATSAPP_CONVERSATION_POLL_MS,
  WHATSAPP_FOLLOW_UP_MARKER,
} from './inbox-ui';
import type {
  InboxChannelFilter,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
} from './inbox-ui';

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
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkNoteInput, setBulkNoteInput] = useState('');
  const [bulkFollowUpAt, setBulkFollowUpAt] = useState('');
  const [bulkOwnerId, setBulkOwnerId] = useState('');
  const [bulkStage, setBulkStage] = useState('');
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
  const liveChatEndRef = useRef<HTMLDivElement | null>(null);
  const [isStartingWhatsApp, setIsStartingWhatsApp] = useState(false);
  const [newWhatsAppPhone, setNewWhatsAppPhone] = useState('');
  const [showWhatsAppContactPicker, setShowWhatsAppContactPicker] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [alertDialog, setAlertDialog] = useState<string | null>(null);
  const isInboundCustomerEmail = (email: EmailMessage) => ['inbox', 'inbound'].includes(email.type);

  const {
    conversationAutoTranslateConfig,
    conversationTranslations,
    translatingConversationMessageIds,
    setConversationAutoTranslateEnabled,
  } = useConversationTranslations({
    language,
    llmConfigs,
    activeLLMId,
    llmMappings,
    selectedTelegramConversation,
    telegramMessages,
    selectedLiveChatConversation,
    liveChatMessages,
  });

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    void loadWhatsAppConversations();
  }, []);

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

  const {
    unifiedConversationSource,
    unifiedConversationList,
    visibleFollowUpCount,
    visibleWhatsAppContactOptions,
  } = useInboxConversationList({
    filter,
    channelFilter,
    search,
    searchTags,
    followUpOnly,
    emails,
    clients,
    whatsappConversations,
    unifiedConversations,
    newWhatsAppPhone,
    showWhatsAppContactPicker,
  });


  const {
    selectedIds,
    selectedWhatsAppIds,
    selectedConversationIds,
    selectedUnifiedConversations,
    selectedCount,
    selectableVisibleCount,
    totalVisibleCount,
    allVisibleSelected,
    someVisibleSelected,
    toggleUnifiedSelection,
    toggleSelectAll,
    clearBulkSelection,
  } = useInboxSelection({
    unifiedConversationList,
    emails,
    whatsappConversations,
    unifiedConversations,
  });

  const {
    handleFilterChange,
    handleChannelFilterChange,
    handleToggleFollowUpOnly,
    handleClearFollowUpOnly,
    handleComposeEmail,
    handleStartWhatsApp,
  } = useInboxSidebarActions({
    selectedWhatsAppPhone,
    selectEmail,
    clearBulkSelection,
    setFilter,
    setChannelFilter,
    setEmailListMode,
    setFollowUpOnly,
    setIsComposing,
    setComposeDefaults,
    setIsStartingWhatsApp,
    setSelectedWhatsAppPhone,
    setSelectedWhatsAppClientId,
    setSelectedTelegramConversation,
    setTelegramMessages,
    setSelectedLiveChatConversation,
  });

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

  useLiveChatInboxSession({
    selectedLiveChatConversation,
    liveChatMessages,
    liveChatSocketStatus,
    liveChatEndRef,
    connectLiveChatSocket,
    joinLiveChatSocketSession,
    fetchLiveChatMessages,
    patchUnifiedConversation,
    refreshUnifiedConversationData,
  });

  useEffect(() => {
    const initialSync = window.setTimeout(() => handleSync({ silent: true }), 15000);
    return () => {
      window.clearTimeout(initialSync);
    };
  }, []);

  const {
    selectedEmail,
    selectedEmailIsInbound,
    selectedEmailContactAddress,
    selectedEmailClient,
    latestInboundEmailForSelectedClient,
    selectedEmailAgentContext,
    selectedTrackingEvents,
    isTrackingExpanded,
    visibleTrackingEvents,
    toggleTrackingExpanded,
  } = useSelectedEmailContext({
    selectedEmailId,
    emails,
    clients,
    logs,
    deals,
    knowledgeBase,
    products,
    filter,
    setFilter,
  });

  const {
    activeWhatsAppConversation,
    activeWhatsAppClient,
    activeWhatsAppFollowUp,
    activeTelegramClient,
    activeTelegramContactMethod,
    activeTelegramDisplayName,
    activeTelegramTranslateEnabled,
    activeTelegramTranslations,
    activeTelegramAgentContext,
    activeLiveChatSession,
    activeLiveChatMessages,
    activeLiveChatTranslateEnabled,
    activeLiveChatTranslations,
    visibleLiveChatMessages,
    activeLiveChatClient,
    activeLiveChatVisitorInfo,
    latestLiveChatVisitorMessage,
    activeLiveChatEvidenceItems,
    activeLiveChatContactMethod,
    activeLiveChatDisplayName,
    activeLiveChatAgentContext,
    activeLinkableContactMethod,
    activeLinkableDisplayName,
    activeUnifiedConversation,
  } = useActiveConversationContext({
    language,
    clients,
    emails,
    logs,
    deals,
    knowledgeBase,
    products,
    conversationAutoTranslateConfig,
    conversationTranslations,
    liveChatSessions,
    liveChatMessages,
    selectedEmail,
    selectedEmailContactAddress,
    selectedWhatsAppPhone,
    selectedWhatsAppClientId,
    selectedTelegramConversation,
    telegramMessages,
    selectedLiveChatConversation,
    unifiedConversationSource,
    whatsappConversations,
  });

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

  const {
    handleSelect,
    handleSelectWhatsApp,
    handleSelectUnifiedConversation,
    handleDeleteWhatsAppConversation,
    startNewWhatsApp,
    selectWhatsAppContactOption,
    handleCreateLead,
  } = useInboxNavigationActions({
    whatsappConversations,
    unifiedConversationSource,
    selectedEmail,
    selectedEmailId,
    selectedWhatsAppPhone,
    selectedLiveChatConversation,
    selectedTelegramConversation,
    activeLiveChatClient,
    activeLiveChatContactMethod,
    activeTelegramClient,
    activeTelegramContactMethod,
    newWhatsAppPhone,
    markEmailRead,
    selectEmail,
    setIsComposing,
    setComposeDefaults,
    setIsStartingWhatsApp,
    setSelectedWhatsAppPhone,
    setSelectedWhatsAppClientId,
    setSelectedTelegramConversation,
    setTelegramMessages,
    setTelegramReply,
    setSelectedLiveChatConversation,
    setLiveChatReply,
    setWhatsappConversations,
    setNewWhatsAppPhone,
    setShowWhatsAppContactPicker,
    setChannelFilter,
    setIsCreatingLead,
    setConfirmDialog,
    findEmailUnifiedConversation,
    patchUnifiedConversation,
    deleteUnifiedConversation,
    refreshUnifiedConversationData,
    loadTelegramMessages,
    fetchLiveChatMessages,
    fetchLiveChatSessions,
    notify,
  });

  const {
    addingToRag,
    addedToRagId,
    submitTodo,
    submitTag,
    toggleImportant,
    handleAddToRag,
  } = useEmailQuickActions({
    selectedEmail,
    emails,
    todoModalEmail,
    todoAt,
    todoNote,
    tagModalEmail,
    tagInput,
    language,
    llmMappings,
    activeLLMId,
    llmConfigs,
    setTodoModalEmail,
    setTodoAt,
    setTodoNote,
    setTagModalEmail,
    setTagInput,
    setActiveMenu,
    editEmail,
    addKnowledgeItem,
    findEmailUnifiedConversation,
    patchUnifiedConversation,
    refreshUnifiedConversationData,
    notify,
  });

  return (
    <PanelGroup id="inbox-layout" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} orientation="horizontal" className="flex-1 overflow-hidden bg-slate-900 border-t border-slate-800">
      {/* Sidebar List */}
      <Panel id="inbox-list" defaultSize={320} minSize={250} maxSize={500} className={cn("flex flex-col transition-transform relative z-10", (selectedEmailId || selectedWhatsAppPhone || selectedTelegramConversation || selectedLiveChatConversation || isStartingWhatsApp) && "hidden md:flex")}>
        <InboxConversationSidebar
          language={language}
          filter={filter}
          channelFilter={channelFilter}
          search={search}
          searchTags={searchTags}
          tagSuggestions={Array.from(new Set(emails.flatMap(e => e.tags || [])))}
          followUpOnly={followUpOnly}
          visibleFollowUpCount={visibleFollowUpCount}
          unifiedConversationList={unifiedConversationList}
          selectableVisibleCount={selectableVisibleCount}
          totalVisibleCount={totalVisibleCount}
          isUnifiedConversationLoading={isUnifiedConversationLoading}
          isSyncing={isSyncing}
          isWhatsAppBackgroundSyncing={isWhatsAppBackgroundSyncing}
          syncError={syncError}
          lastSyncAt={lastSyncAt}
          selectedEmailId={selectedEmailId}
          selectedWhatsAppPhone={selectedWhatsAppPhone}
          selectedTelegramConversation={selectedTelegramConversation}
          selectedLiveChatConversation={selectedLiveChatConversation}
          selectedConversationIds={selectedConversationIds}
          emails={emails}
          clients={clients}
          currentUser={currentUser}
          selectedCount={selectedCount}
          allVisibleSelected={allVisibleSelected}
          someVisibleSelected={someVisibleSelected}
          bulkTagInput={bulkTagInput}
          bulkNoteInput={bulkNoteInput}
          bulkOwnerId={bulkOwnerId}
          bulkStage={bulkStage}
          bulkFollowUpAt={bulkFollowUpAt}
          onFilterChange={handleFilterChange}
          onChannelFilterChange={handleChannelFilterChange}
          onSearchChange={setSearch}
          onSearchTagsChange={setSearchTags}
          onToggleFollowUpOnly={handleToggleFollowUpOnly}
          onClearFollowUpOnly={handleClearFollowUpOnly}
          onSync={() => handleSync()}
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
          onSelectConversation={handleSelectUnifiedConversation}
          onToggleConversationSelection={toggleUnifiedSelection}
          onDeleteWhatsAppConversation={handleDeleteWhatsAppConversation}
          onOwnerStageChange={updateConversationOwnerStage}
          onComposeEmail={handleComposeEmail}
          onStartWhatsApp={handleStartWhatsApp}
        />
      </Panel>

      <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors hidden md:block" />

      {/* Reading Pane / Compose Pane */}
      <Panel id="inbox-content" className={cn("flex flex-col bg-slate-950/50 relative", !selectedEmailId && !selectedWhatsAppPhone && !selectedTelegramConversation && !selectedLiveChatConversation && !isComposing && !isStartingWhatsApp && "hidden md:flex")}>
        <InboxContentPanel
          isComposing={isComposing}
          composeDefaults={composeDefaults}
          setIsComposing={setIsComposing}
          isStartingWhatsApp={isStartingWhatsApp}
          setIsStartingWhatsApp={setIsStartingWhatsApp}
          newWhatsAppPhone={newWhatsAppPhone}
          visibleWhatsAppContactOptions={visibleWhatsAppContactOptions}
          setNewWhatsAppPhone={setNewWhatsAppPhone}
          setShowWhatsAppContactPicker={setShowWhatsAppContactPicker}
          selectedWhatsAppClientId={selectedWhatsAppClientId}
          setSelectedWhatsAppClientId={setSelectedWhatsAppClientId}
          selectWhatsAppContactOption={selectWhatsAppContactOption}
          startNewWhatsApp={startNewWhatsApp}
          selectedTelegramConversation={selectedTelegramConversation}
          language={language}
          activeTelegramClient={activeTelegramClient}
          activeTelegramContactMethod={activeTelegramContactMethod}
          activeTelegramDisplayName={activeTelegramDisplayName}
          activeTelegramTranslateEnabled={activeTelegramTranslateEnabled}
          activeTelegramTranslations={activeTelegramTranslations}
          activeTelegramAgentContext={activeTelegramAgentContext}
          currentUser={currentUser}
          telegramMessages={telegramMessages}
          isTelegramMessagesLoading={isTelegramMessagesLoading}
          translatingConversationMessageIds={translatingConversationMessageIds}
          activeConversationComments={activeConversationComments}
          commentText={commentText}
          telegramReply={telegramReply}
          isSendingTelegramReply={isSendingTelegramReply}
          activeFollowUpAt={activeFollowUpAt}
          activeFollowUpNote={activeFollowUpNote}
          setSelectedTelegramConversation={setSelectedTelegramConversation}
          setTelegramMessages={setTelegramMessages}
          selectClient={selectClient}
          updateConversationOwnerStage={updateConversationOwnerStage}
          setConfirmDialog={setConfirmDialog}
          deleteUnifiedConversation={deleteUnifiedConversation}
          refreshUnifiedConversationData={refreshUnifiedConversationData}
          toggleTelegramHumanTakeover={toggleTelegramHumanTakeover}
          setConversationAutoTranslateEnabled={setConversationAutoTranslateEnabled}
          handleCreateLead={handleCreateLead}
          setIsAddingContactToClient={setIsAddingContactToClient}
          patchUnifiedConversation={patchUnifiedConversation}
          applyUnifiedConversationUpdate={applyUnifiedConversationUpdate}
          draftTelegramReply={draftTelegramReply}
          appendActiveConversationComment={appendActiveConversationComment}
          updateActiveConversationFollowUp={updateActiveConversationFollowUp}
          setCommentText={setCommentText}
          replyActiveConversationComment={replyActiveConversationComment}
          setTelegramReply={setTelegramReply}
          sendTelegramReply={sendTelegramReply}
          selectedLiveChatConversation={selectedLiveChatConversation}
          activeLiveChatClient={activeLiveChatClient}
          activeLiveChatContactMethod={activeLiveChatContactMethod}
          activeLiveChatSession={activeLiveChatSession}
          activeLiveChatTranslateEnabled={activeLiveChatTranslateEnabled}
          activeLiveChatTranslations={activeLiveChatTranslations}
          activeLiveChatVisitorInfo={activeLiveChatVisitorInfo}
          activeLiveChatEvidenceItems={activeLiveChatEvidenceItems}
          activeLiveChatAgentContext={activeLiveChatAgentContext}
          activeUnifiedConversation={activeUnifiedConversation}
          visibleLiveChatMessages={visibleLiveChatMessages}
          liveChatReply={liveChatReply}
          isSendingLiveChatReply={isSendingLiveChatReply}
          isRunningLiveChatAgent={isRunningLiveChatAgent}
          latestLiveChatVisitorMessage={latestLiveChatVisitorMessage}
          liveChatEndRef={liveChatEndRef}
          setSelectedLiveChatConversation={setSelectedLiveChatConversation}
          toggleLiveChatHumanTakeover={toggleLiveChatHumanTakeover}
          runSelectedLiveChatAgent={runSelectedLiveChatAgent}
          setLiveChatReply={setLiveChatReply}
          sendLiveChatReply={sendLiveChatReply}
          selectedWhatsAppPhone={selectedWhatsAppPhone}
          setSelectedWhatsAppPhone={setSelectedWhatsAppPhone}
          activeWhatsAppConversation={activeWhatsAppConversation}
          activeWhatsAppClient={activeWhatsAppClient}
          handleDeleteWhatsAppConversation={handleDeleteWhatsAppConversation}
          loadWhatsAppConversations={loadWhatsAppConversations}
          selectedEmail={selectedEmail}
          clients={clients}
          isInboundCustomerEmail={isInboundCustomerEmail}
          addingToRag={addingToRag}
          addedToRagId={addedToRagId}
          selectedTrackingEvents={selectedTrackingEvents}
          visibleTrackingEvents={visibleTrackingEvents}
          isTrackingExpanded={isTrackingExpanded}
          selectedEmailAgentContext={selectedEmailAgentContext}
          latestInboundEmailForSelectedClient={latestInboundEmailForSelectedClient}
          commentAttachments={commentAttachments}
          selectEmail={selectEmail}
          setComposeDefaults={setComposeDefaults}
          handleAddToRag={handleAddToRag}
          toggleTrackingExpanded={toggleTrackingExpanded}
          editEmail={editEmail}
          setShowCommentAttachmentModal={setShowCommentAttachmentModal}
          setCommentAttachments={setCommentAttachments}
        />
      </Panel>

      <InboxContactLinkingModals
        isCreatingLead={isCreatingLead}
        isAddingContactToClient={isAddingContactToClient}
        filter={filter}
        selectedEmail={selectedEmail}
        selectedTelegramConversation={selectedTelegramConversation}
        selectedLiveChatConversation={selectedLiveChatConversation}
        activeTelegramDisplayName={activeTelegramDisplayName}
        activeLiveChatDisplayName={activeLiveChatDisplayName}
        activeTelegramContactMethod={activeTelegramContactMethod}
        activeLiveChatContactMethod={activeLiveChatContactMethod}
        activeLinkableContactMethod={activeLinkableContactMethod}
        activeLinkableDisplayName={activeLinkableDisplayName}
        activeUnifiedConversation={activeUnifiedConversation}
        onCloseCreateLead={() => setIsCreatingLead(false)}
        onCloseAddToExistingClient={() => setIsAddingContactToClient(false)}
        patchUnifiedConversation={patchUnifiedConversation}
        setSelectedTelegramConversation={setSelectedTelegramConversation}
        setSelectedLiveChatConversation={setSelectedLiveChatConversation}
        updateLiveChatSession={updateLiveChatSession}
        fetchLiveChatSessions={fetchLiveChatSessions}
        refreshUnifiedConversationData={refreshUnifiedConversationData}
        editEmail={editEmail}
        selectClient={selectClient}
      />

      <InboxAuxiliaryDialogs
        confirmDialog={confirmDialog}
        alertDialog={alertDialog}
        showCommentAttachmentModal={showCommentAttachmentModal}
        tagModalEmail={tagModalEmail}
        tagInput={tagInput}
        todoModalEmail={todoModalEmail}
        todoAt={todoAt}
        todoNote={todoNote}
        onCloseConfirm={() => setConfirmDialog(null)}
        onCloseAlert={() => setAlertDialog(null)}
        onCloseAttachment={() => setShowCommentAttachmentModal(false)}
        onUploadAttachments={(files) => {
          setCommentAttachments(prev => [...prev, ...files]);
          setShowCommentAttachmentModal(false);
        }}
        onTagInputChange={setTagInput}
        onSubmitTag={submitTag}
        onCloseTag={() => setTagModalEmail(null)}
        onTodoAtChange={setTodoAt}
        onTodoNoteChange={setTodoNote}
        onSubmitTodo={submitTodo}
        onCloseTodo={() => setTodoModalEmail(null)}
      />

    </PanelGroup>
  );
}

export { ComposeEmail } from './inbox-ui';
