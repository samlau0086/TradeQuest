import { LiveChatConversationPane } from './LiveChatConversationPane';
import type { InboxSelectedDetailPanelProps } from './InboxContentPanelTypes';

export function InboxLiveChatDetailContainer({
  language,
  selectedLiveChatConversation,
  activeLiveChatClient,
  activeLiveChatContactMethod,
  activeLiveChatSession,
  activeLiveChatTranslateEnabled,
  activeLiveChatTranslations,
  activeLiveChatVisitorInfo,
  activeLiveChatEvidenceItems,
  activeLiveChatAgentContext,
  activeUnifiedConversation,
  currentUser,
  visibleLiveChatMessages,
  translatingConversationMessageIds,
  activeConversationComments,
  commentText,
  liveChatReply,
  isSendingLiveChatReply,
  isRunningLiveChatAgent,
  latestLiveChatVisitorMessage,
  liveChatEndRef,
  activeFollowUpAt,
  activeFollowUpNote,
  setSelectedLiveChatConversation,
  selectClient,
  updateConversationOwnerStage,
  setConfirmDialog,
  deleteUnifiedConversation,
  refreshUnifiedConversationData,
  toggleLiveChatHumanTakeover,
  runSelectedLiveChatAgent,
  setConversationAutoTranslateEnabled,
  handleCreateLead,
  setIsAddingContactToClient,
  updateActiveConversationFollowUp,
  patchUnifiedConversation,
  applyUnifiedConversationUpdate,
  appendActiveConversationComment,
  setCommentText,
  replyActiveConversationComment,
  setLiveChatReply,
  sendLiveChatReply,
}: InboxSelectedDetailPanelProps) {
  if (!selectedLiveChatConversation) return null;

  return (
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
        void (async () => {
          await appendActiveConversationComment(commentText.trim());
          setCommentText('');
        })();
      }}
      onLiveChatReplyChange={setLiveChatReply}
      onSendLiveChatReply={sendLiveChatReply}
    />
  );
}
