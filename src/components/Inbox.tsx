import React, { useState, useRef, useEffect } from 'react';
import { useStore, EmailMessage, LiveChatSession } from '../store';
import { useAuthStore } from '../authStore';
import { Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { ClientFormModal } from './ClientFormModal';
import { UploadAttachmentModal } from './UploadAttachmentModal';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import {
  CONVERSATION_STAGES,
  ComposeEmail,
  EmailConversationPane,
  EmailTagDialog,
  EmailTodoDialog,
  InboxConfirmDialog,
  InboxConversationSidebar,
  InboxNotificationDialog,
  LiveChatConversationPane,
  StartWhatsAppConversationPane,
  TelegramConversationPane,
  WhatsAppConversationPane,
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
import { AddContactToClientModal } from './AddContactToClientModal';

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
          <TelegramConversationPane
            language={language}
            selectedTelegramConversation={selectedTelegramConversation}
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
            onDeleteConversation={() => {
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
            onToggleHumanTakeover={toggleTelegramHumanTakeover}
            onToggleTranslate={() => setConversationAutoTranslateEnabled('telegram', selectedTelegramConversation.id, !activeTelegramTranslateEnabled)}
            onCreateLead={!activeTelegramClient && !selectedTelegramConversation.client_id ? handleCreateLead : undefined}
            onAddToExistingClient={() => setIsAddingContactToClient(true)}
            onSetConversationFollowUp={async (dueAt, note) => {
              const patched = await patchUnifiedConversation(selectedTelegramConversation, { todoAt: dueAt, todoNote: note });
              setSelectedTelegramConversation(patched);
              await refreshUnifiedConversationData();
            }}
            onClearConversationFollowUp={async () => {
              const patched = await patchUnifiedConversation(selectedTelegramConversation, { todoAt: null, todoNote: null });
              setSelectedTelegramConversation(patched);
              await refreshUnifiedConversationData();
            }}
            onCompleteConversationFollowUp={async () => {
              const patched = await patchUnifiedConversation(selectedTelegramConversation, { todoAt: null, todoNote: null, status: 'completed' });
              setSelectedTelegramConversation(patched);
              await refreshUnifiedConversationData();
            }}
            onDraftReply={draftTelegramReply}
            onAddSuggestionComment={async () => appendActiveConversationComment(`Telegram note: ${activeTelegramAgentContext.latestInbound?.body || selectedTelegramConversation.title || 'Follow up this Telegram conversation'}`)}
            onSetAgentFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note || `Follow up Telegram conversation with ${activeTelegramDisplayName}.`, 'open')}
            onClearAgentFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
            onCompleteAgentFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
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
            onCommentTextChange={setCommentText}
            onReplyComment={(commentId, content, attachments) => void replyActiveConversationComment(commentId, content, attachments)}
            onSubmitComment={() => {
              if (!commentText.trim()) return;
              void appendActiveConversationComment(commentText.trim()).then(() => setCommentText(''));
            }}
            onTelegramReplyChange={setTelegramReply}
            onSendTelegramReply={sendTelegramReply}
          />
        ) : selectedLiveChatConversation ? (
          <LiveChatConversationPane
            language={language}
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
            currentUser={currentUser}
            visibleLiveChatMessages={visibleLiveChatMessages}
            translatingConversationMessageIds={translatingConversationMessageIds}
            activeConversationComments={activeConversationComments}
            commentText={commentText}
            liveChatReply={liveChatReply}
            isSendingLiveChatReply={isSendingLiveChatReply}
            isRunningLiveChatAgent={isRunningLiveChatAgent}
            latestLiveChatVisitorMessage={latestLiveChatVisitorMessage}
            liveChatEndRef={liveChatEndRef}
            activeFollowUpAt={activeFollowUpAt}
            activeFollowUpNote={activeFollowUpNote}
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
            onDeleteConversation={() => {
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
            onToggleHumanTakeover={toggleLiveChatHumanTakeover}
            onRunAgent={runSelectedLiveChatAgent}
            onToggleTranslate={() => setConversationAutoTranslateEnabled('live_chat', selectedLiveChatConversation.source_id, !activeLiveChatTranslateEnabled)}
            onCreateLead={handleCreateLead}
            onAddToExistingClient={() => setIsAddingContactToClient(true)}
            onSetConversationFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note, 'open')}
            onClearConversationFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
            onCompleteConversationFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
            onAddSuggestionComment={async () => appendActiveConversationComment(`Live Chat note: ${latestLiveChatVisitorMessage?.body || selectedLiveChatConversation.title || 'Follow up this visitor'}`)}
            onSetAgentFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note || `Follow up Live Chat: ${selectedLiveChatConversation.title || selectedLiveChatConversation.contact_address || selectedLiveChatConversation.source_id}`, 'open')}
            onClearAgentFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
            onCompleteAgentFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
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
            onCommentTextChange={setCommentText}
            onReplyComment={(commentId, content, attachments) => void replyActiveConversationComment(commentId, content, attachments)}
            onSubmitComment={() => {
              if (!commentText.trim()) return;
              void appendActiveConversationComment(commentText.trim()).then(() => setCommentText(''));
            }}
            onLiveChatReplyChange={setLiveChatReply}
            onSendLiveChatReply={sendLiveChatReply}
          />
        ) : selectedWhatsAppPhone ? (
          <WhatsAppConversationPane
            language={language}
            selectedWhatsAppPhone={selectedWhatsAppPhone}
            activeWhatsAppConversation={activeWhatsAppConversation}
            activeWhatsAppClient={activeWhatsAppClient}
            activeUnifiedConversation={activeUnifiedConversation}
            currentUser={currentUser}
            activeFollowUpAt={activeFollowUpAt}
            activeFollowUpNote={activeFollowUpNote}
            onBack={() => { setSelectedWhatsAppPhone(null); setSelectedWhatsAppClientId(null); }}
            onClientClick={() => {
              const id = activeWhatsAppClient?.id || activeWhatsAppConversation?.clientId;
              if (id) selectClient(id);
            }}
            onOwnerChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (ownerId) => {
              updateConversationOwnerStage(activeUnifiedConversation, { ownerId });
            } : undefined}
            onStageChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (stage) => {
              updateConversationOwnerStage(activeUnifiedConversation, { stage });
            } : undefined}
            onDeleteConversation={handleDeleteWhatsAppConversation}
            onSetFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note, 'open')}
            onClearFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
            onCompleteFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
            onCloseChat={() => {
              setSelectedWhatsAppPhone(null);
              setSelectedWhatsAppClientId(null);
              loadWhatsAppConversations();
            }}
          />
        ) : selectedEmail ? (
          <EmailConversationPane
            language={language}
            selectedEmail={selectedEmail}
            clientName={selectedEmail.clientId ? clients.find(c => c.id === selectedEmail.clientId)?.name : undefined}
            activeUnifiedConversation={activeUnifiedConversation}
            currentUser={currentUser}
            isInboundCustomerEmail={isInboundCustomerEmail}
            addingToRag={addingToRag}
            addedToRagId={addedToRagId}
            selectedTrackingEvents={selectedTrackingEvents}
            visibleTrackingEvents={visibleTrackingEvents}
            isTrackingExpanded={isTrackingExpanded}
            selectedEmailAgentContext={selectedEmailAgentContext}
            latestInboundEmailForSelectedClient={latestInboundEmailForSelectedClient}
            activeFollowUpAt={activeFollowUpAt}
            activeFollowUpNote={activeFollowUpNote}
            activeConversationComments={activeConversationComments}
            commentText={commentText}
            commentAttachments={commentAttachments}
            onBack={() => selectEmail(null)}
            onClientClick={() => selectedEmail.clientId && selectClient(selectedEmail.clientId)}
            onOwnerChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (ownerId) => {
              updateConversationOwnerStage(activeUnifiedConversation, { ownerId });
            } : undefined}
            onStageChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (stage) => {
              updateConversationOwnerStage(activeUnifiedConversation, { stage });
            } : undefined}
            onDeleteEmail={() => {
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
            onToggleTrackingExpanded={() => toggleTrackingExpanded(selectedEmail.id)}
            onDraftAgentReply={() => {
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
            onAddAgentComment={async () => {
              const content = `Agent suggestion: ${selectedEmail.subject || 'Follow up this conversation'}`;
              await appendActiveConversationComment(content);
            }}
            onCreateLead={!selectedEmail.clientId ? handleCreateLead : undefined}
            onAddToExistingClient={() => setIsAddingContactToClient(true)}
            onSetFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note || `Follow up: ${selectedEmail.subject || selectedEmail.sender}`, 'open')}
            onClearFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
            onCompleteFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
            onSaveAnalysis={(key, insight) => editEmail(selectedEmail.id, {
              agentContextAnalysis: insight,
              agentContextAnalysisKey: key
            })}
            onCommentTextChange={setCommentText}
            onAttachClick={() => setShowCommentAttachmentModal(true)}
            onRemoveAttachment={(index) => setCommentAttachments(prev => prev.filter((_, i) => i !== index))}
            onReplyComment={(commentId, content, attachments) => void replyActiveConversationComment(commentId, content, attachments)}
            onSubmitComment={() => {
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
