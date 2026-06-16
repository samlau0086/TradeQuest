import { useStore } from '../../store';
import { EmailConversationPane } from './EmailConversationPane';
import type { InboxSelectedDetailPanelProps } from './InboxContentPanelTypes';

export function InboxEmailDetailContainer({
  language,
  currentUser,
  activeUnifiedConversation,
  selectedEmail,
  clients,
  isInboundCustomerEmail,
  addingToRag,
  addedToRagId,
  selectedTrackingEvents,
  visibleTrackingEvents,
  isTrackingExpanded,
  selectedEmailAgentContext,
  latestInboundEmailForSelectedClient,
  activeFollowUpAt,
  activeFollowUpNote,
  activeConversationComments,
  commentText,
  commentAttachments,
  selectEmail,
  selectClient,
  updateConversationOwnerStage,
  setConfirmDialog,
  deleteUnifiedConversation,
  refreshUnifiedConversationData,
  setComposeDefaults,
  setIsComposing,
  handleAddToRag,
  toggleTrackingExpanded,
  appendActiveConversationComment,
  handleCreateLead,
  setIsAddingContactToClient,
  updateActiveConversationFollowUp,
  editEmail,
  setCommentText,
  setShowCommentAttachmentModal,
  setCommentAttachments,
  replyActiveConversationComment,
}: InboxSelectedDetailPanelProps) {
  if (!selectedEmail) return null;

  return (
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
  );
}
