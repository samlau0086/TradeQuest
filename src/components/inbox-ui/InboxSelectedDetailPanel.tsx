import React from 'react';
import { InboxEmailDetailContainer } from './InboxEmailDetailContainer';
import { LiveChatConversationPane } from './LiveChatConversationPane';
import { TelegramConversationPane } from './TelegramConversationPane';
import { WhatsAppConversationPane } from './WhatsAppConversationPane';
import type { InboxSelectedDetailPanelProps } from './InboxContentPanelTypes';

export function InboxSelectedDetailPanel(props: InboxSelectedDetailPanelProps) {
  const {
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
  visibleLiveChatMessages,
  liveChatReply,
  isSendingLiveChatReply,
  isRunningLiveChatAgent,
  latestLiveChatVisitorMessage,
  liveChatEndRef,
  setSelectedLiveChatConversation,
  toggleLiveChatHumanTakeover,
  runSelectedLiveChatAgent,
  setLiveChatReply,
  sendLiveChatReply,
  selectedWhatsAppPhone,
  setSelectedWhatsAppPhone,
  selectedWhatsAppClientId,
  setSelectedWhatsAppClientId,
  activeWhatsAppConversation,
  activeWhatsAppClient,
  handleDeleteWhatsAppConversation,
  loadWhatsAppConversations,
  selectedEmail,
  } = props;
  if (selectedTelegramConversation) {
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

  if (selectedLiveChatConversation) {
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

  if (selectedWhatsAppPhone) {
    return (
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
    );
  }

  if (selectedEmail) {
    return <InboxEmailDetailContainer {...props} />;
  }

  return null;
}
