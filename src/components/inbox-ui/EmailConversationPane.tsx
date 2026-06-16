import React from 'react';
import type { EmailMessage } from '../../store';
import { ConversationContextRail } from './ConversationContextRail';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { ConversationFollowUpStrip } from './ConversationFollowUpStrip';
import {
  EmailAgentSuggestionsPanel,
  EmailAttachmentsPanel,
  EmailBodyPanel,
  EmailCommentsPanel,
  EmailHeaderActions,
  EmailHeaderMeta,
  EmailTrackingPanel,
} from './EmailDetailPanels';
import type { UnifiedCommunicationConversation } from './inboxModel';

interface EmailConversationPaneProps {
  language: 'en' | 'zh';
  selectedEmail: EmailMessage;
  clientName?: string;
  activeUnifiedConversation?: UnifiedCommunicationConversation | null;
  currentUser?: { id: string } | null;
  isInboundCustomerEmail: (email: EmailMessage) => boolean;
  addingToRag: boolean;
  addedToRagId: string | null;
  selectedTrackingEvents: any[];
  visibleTrackingEvents: any[];
  isTrackingExpanded: boolean;
  selectedEmailAgentContext: {
    cacheKey?: string;
    body: string;
    additionalContext: string;
    hasCustomerMessage: boolean;
  };
  latestInboundEmailForSelectedClient?: EmailMessage;
  activeFollowUpAt?: string | null;
  activeFollowUpNote?: string | null;
  activeConversationComments: any[];
  commentText: string;
  commentAttachments: File[];
  onBack: () => void;
  onClientClick: () => void;
  onOwnerChange?: (ownerId: string | null) => void;
  onStageChange?: (stage: string | null) => void;
  onDeleteEmail: () => void;
  onEditDraft: () => void;
  onReply: () => void;
  onAddToRag: () => void;
  onToggleTrackingExpanded: () => void;
  onDraftAgentReply: () => void;
  onAddAgentComment: () => void | Promise<void>;
  onCreateLead?: () => void | Promise<void>;
  onAddToExistingClient: () => void;
  onSetFollowUp: (dueAt: string, note: string) => void | Promise<void>;
  onClearFollowUp: () => void | Promise<void>;
  onCompleteFollowUp: () => void | Promise<void>;
  onSaveAnalysis: (key: string, insight: any) => void | Promise<void>;
  onCommentTextChange: (value: string) => void;
  onAttachClick: () => void;
  onRemoveAttachment: (index: number) => void;
  onReplyComment: (commentId: string, content: string, attachments?: any[]) => void;
  onSubmitComment: () => void;
}

export function EmailConversationPane({
  language,
  selectedEmail,
  clientName,
  activeUnifiedConversation,
  currentUser,
  isInboundCustomerEmail,
  addingToRag,
  addedToRagId,
  selectedTrackingEvents,
  visibleTrackingEvents,
  isTrackingExpanded,
  selectedEmailAgentContext,
  activeFollowUpAt,
  activeFollowUpNote,
  activeConversationComments,
  commentText,
  commentAttachments,
  onBack,
  onClientClick,
  onOwnerChange,
  onStageChange,
  onDeleteEmail,
  onEditDraft,
  onReply,
  onAddToRag,
  onToggleTrackingExpanded,
  onDraftAgentReply,
  onAddAgentComment,
  onCreateLead,
  onAddToExistingClient,
  onSetFollowUp,
  onClearFollowUp,
  onCompleteFollowUp,
  onSaveAnalysis,
  onCommentTextChange,
  onAttachClick,
  onRemoveAttachment,
  onReplyComment,
  onSubmitComment,
}: EmailConversationPaneProps) {
  const inbound = isInboundCustomerEmail(selectedEmail);
  const emailAddress = inbound ? selectedEmail.sender : selectedEmail.recipient;
  const cacheKey = selectedEmailAgentContext.cacheKey || `email:${selectedEmail.id}`;

  return (
    <>
      <ConversationDetailHeader
        language={language}
        channel="email"
        title={inbound ? (selectedEmail.senderName || selectedEmail.sender) : (selectedEmail.type === 'draft' ? `Draft: ${selectedEmail.recipient || '(No Recipient)'}` : selectedEmail.recipient)}
        subtitle={inbound ? `From: ${selectedEmail.sender}` : (selectedEmail.type === 'draft' ? `To: ${selectedEmail.recipient || '(No Recipient)'}` : `To: ${selectedEmail.recipient}`)}
        clientId={selectedEmail.clientId}
        clientName={clientName}
        tags={activeUnifiedConversation?.tags || selectedEmail.tags || []}
        ownerId={activeUnifiedConversation?.owner_id}
        stage={activeUnifiedConversation?.stage}
        currentUser={currentUser}
        onBack={onBack}
        onClientClick={onClientClick}
        onOwnerChange={onOwnerChange}
        onStageChange={onStageChange}
        onDelete={onDeleteEmail}
        meta={(
          <EmailHeaderMeta
            isLinked={!!selectedEmail.clientId}
            isInbound={inbound}
            senderIp={selectedEmail.senderIp}
            senderCountry={selectedEmail.senderCountry}
            cc={selectedEmail.cc}
            bcc={selectedEmail.bcc}
            onCreateLead={onCreateLead || (() => {})}
            onAddToExistingClient={onAddToExistingClient}
          />
        )}
        actions={(
          <EmailHeaderActions
            isDraft={selectedEmail.type === 'draft'}
            hasClient={!!selectedEmail.clientId}
            isAddingToRag={addingToRag}
            isAddedToRag={addedToRagId === selectedEmail.id}
            onEditDraft={onEditDraft}
            onReply={onReply}
            onAddToRag={onAddToRag}
          />
        )}
      />
      <ConversationFollowUpStrip
        language={language}
        dueAt={activeFollowUpAt}
        note={activeFollowUpNote}
        onSet={onSetFollowUp}
        onClear={onClearFollowUp}
        onComplete={onCompleteFollowUp}
      />

      <div className="p-6 overflow-y-auto scrollbar-thin flex-1">
        <EmailTrackingPanel
          language={language}
          enabled={(selectedEmail.type === 'sent' || selectedEmail.type === 'scheduled' || selectedEmail.type === 'outbound') && (selectedEmail.body?.includes('/api/track/open/') || !!selectedEmail.enableTracking)}
          events={selectedTrackingEvents}
          visibleEvents={visibleTrackingEvents}
          isExpanded={isTrackingExpanded}
          onToggleExpanded={onToggleTrackingExpanded}
        />

        <EmailBodyPanel subject={selectedEmail.subject} body={selectedEmail.body} />

        <ConversationContextRail
          variant="rail"
          title={language === 'zh' ? '智能体建议' : 'Agent Suggestions'}
          description={language === 'zh'
            ? '分析邮件、客户资料、产品和 RAG 上下文，准备回复、待跟进和知识库操作。'
            : 'Analyze email, customer, product, and RAG context for reply, follow-up, and knowledge actions.'}
          collapsible
        >
          <EmailAgentSuggestionsPanel
            cacheKey={cacheKey}
            contextLookup={activeUnifiedConversation?.id ? { conversationId: activeUnifiedConversation.id } : undefined}
            clientId={selectedEmail.clientId}
            emailAddress={emailAddress}
            defaultAnalysisMode={['sent', 'outbound', 'scheduled'].includes(selectedEmail.type) ? 'manual' : undefined}
            persistedInsight={selectedEmail.agentContextAnalysisKey === cacheKey ? selectedEmail.agentContextAnalysis : undefined}
            persistedInsightKey={selectedEmail.agentContextAnalysisKey}
            subject={selectedEmail.subject}
            body={selectedEmailAgentContext.body}
            additionalContext={selectedEmailAgentContext.additionalContext}
            clientName={clientName}
            hasClient={!!selectedEmail.clientId}
            hasKnowledge={addedToRagId === selectedEmail.id}
            hasCustomerMessage={selectedEmailAgentContext.hasCustomerMessage}
            followUpAt={activeFollowUpAt || selectedEmail.todoAt}
            followUpNote={activeFollowUpNote || selectedEmail.todoNote}
            onDraftReply={onDraftAgentReply}
            onAddComment={onAddAgentComment}
            onCreateLead={!selectedEmail.clientId ? onCreateLead : undefined}
            onAddToKnowledge={selectedEmail.clientId ? onAddToRag : undefined}
            onSetFollowUp={onSetFollowUp}
            onClearFollowUp={onClearFollowUp}
            onCompleteFollowUp={onCompleteFollowUp}
            onDeleteItem={onDeleteEmail}
            onSaveAnalysis={onSaveAnalysis}
          />
        </ConversationContextRail>

        <EmailAttachmentsPanel attachments={selectedEmail.attachments} />

        <EmailCommentsPanel
          comments={activeConversationComments}
          commentText={commentText}
          attachments={commentAttachments}
          onCommentTextChange={onCommentTextChange}
          onAttachClick={onAttachClick}
          onRemoveAttachment={onRemoveAttachment}
          onReply={onReplyComment}
          onSubmit={onSubmitComment}
        />
      </div>
    </>
  );
}
