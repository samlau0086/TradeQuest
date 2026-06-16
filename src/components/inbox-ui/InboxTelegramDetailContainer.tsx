import { TelegramConversationPane } from './TelegramConversationPane';
import type { InboxSelectedDetailPanelProps } from './InboxContentPanelTypes';

export function InboxTelegramDetailContainer({
  selectedTelegramConversation,
  language,
  activeTelegramClient,
  activeTelegramContactMethod,
  activeTelegramDisplayName,
  activeTelegramTranslateEnabled,
  activeTelegramTranslations,
  activeTelegramAgentContext,
  currentUser,
  telegramMessages,
  isTelegramMessagesLoading,
  translatingConversationMessageIds,
  activeConversationComments,
  commentText,
  telegramReply,
  isSendingTelegramReply,
  activeFollowUpAt,
  activeFollowUpNote,
  setSelectedTelegramConversation,
  setTelegramMessages,
  selectClient,
  updateConversationOwnerStage,
  setConfirmDialog,
  deleteUnifiedConversation,
  refreshUnifiedConversationData,
  toggleTelegramHumanTakeover,
  setConversationAutoTranslateEnabled,
  handleCreateLead,
  setIsAddingContactToClient,
  patchUnifiedConversation,
  applyUnifiedConversationUpdate,
  draftTelegramReply,
  appendActiveConversationComment,
  updateActiveConversationFollowUp,
  setCommentText,
  replyActiveConversationComment,
  setTelegramReply,
  sendTelegramReply,
}: InboxSelectedDetailPanelProps) {
  if (!selectedTelegramConversation) return null;

  return (
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
        void (async () => {
          await appendActiveConversationComment(commentText.trim());
          setCommentText('');
        })();
      }}
      onTelegramReplyChange={setTelegramReply}
      onSendTelegramReply={sendTelegramReply}
    />
  );
}
