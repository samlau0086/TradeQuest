import React from 'react';
import { Link2, PenSquare, Reply, Sparkles, UserPlus } from 'lucide-react';
import type { EmailMessage } from '../../store';
import { ConversationContextRail } from './ConversationContextRail';
import { ConversationDetailWorkroom } from './ConversationDetailWorkroom';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { ConversationFollowUpStrip } from './ConversationFollowUpStrip';
import { ConversationRecordSummaryStrip } from './ConversationRecordSummaryStrip';
import { ConversationToolbarButton } from './ConversationToolbar';
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
  const isZh = language === 'zh';

  const headerTitle = inbound
    ? (selectedEmail.senderName || selectedEmail.sender)
    : (selectedEmail.type === 'draft'
      ? `Draft: ${selectedEmail.recipient || '(No Recipient)'}`
      : selectedEmail.recipient);

  const headerSubtitle = inbound
    ? `From: ${selectedEmail.sender}`
    : (selectedEmail.type === 'draft'
      ? `To: ${selectedEmail.recipient || '(No Recipient)'}`
      : `To: ${selectedEmail.recipient}`);

  return (
    <ConversationDetailWorkroom
      header={(
        <ConversationDetailHeader
          language={language}
          channel="email"
          title={headerTitle}
          subtitle={headerSubtitle}
          clientId={selectedEmail.clientId}
          clientName={clientName}
          tags={activeUnifiedConversation?.tags || selectedEmail.tags || []}
          ownerId={activeUnifiedConversation?.owner_id}
          stage={activeUnifiedConversation?.stage}
          currentUser={currentUser}
          statusBadges={[
            {
              label: selectedEmail.type === 'draft'
                ? (isZh ? '\u8349\u7a3f' : 'Draft')
                : inbound
                  ? (isZh ? '\u5165\u7ad9' : 'Inbound')
                  : (isZh ? '\u5916\u53d1' : 'Outbound'),
              tone: selectedEmail.type === 'draft' ? 'warning' : inbound ? 'info' : 'default',
            },
            {
              label: selectedEmail.clientId
                ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client')
                : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
              tone: selectedEmail.clientId ? 'success' : 'default',
            },
          ]}
          onBack={onBack}
          onClientClick={onClientClick}
          onOwnerChange={onOwnerChange}
          onStageChange={onStageChange}
          onDelete={onDeleteEmail}
          meta={(
            <EmailHeaderMeta
              language={language}
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
              language={language}
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
      )}
      summary={(
        <ConversationRecordSummaryStrip
          language={language}
          eyebrow={isZh ? '\u4e0b\u4e00\u6b65\u884c\u52a8' : 'Next action'}
          statusBadges={[
            {
              label: selectedEmail.type === 'draft'
                ? (isZh ? '\u8349\u7a3f' : 'Draft')
                : inbound
                  ? (isZh ? '\u5165\u7ad9' : 'Inbound')
                  : (isZh ? '\u5916\u53d1' : 'Outbound'),
              tone: selectedEmail.type === 'draft' ? 'warning' : inbound ? 'info' : 'default',
            },
            {
              label: selectedEmail.clientId
                ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client')
                : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
              tone: selectedEmail.clientId ? 'success' : 'default',
            },
            {
              label: selectedEmailAgentContext.hasCustomerMessage
                ? (isZh ? '\u5df2\u8bfb\u53d6\u5ba2\u6237\u4e0a\u4e0b\u6587' : 'Customer context found')
                : (isZh ? '\u65e0\u65b0\u5ba2\u6237\u4e0a\u4e0b\u6587' : 'No fresh context'),
              tone: selectedEmailAgentContext.hasCustomerMessage ? 'violet' : 'default',
            },
          ]}
          primaryTitle={
            selectedEmail.type === 'draft'
              ? (isZh ? '\u5b8c\u5584\u5e76\u53d1\u9001\u8fd9\u5c01\u8349\u7a3f\u90ae\u4ef6' : 'Finish and send this draft')
              : inbound
                ? (isZh ? '\u4f18\u5148\u56de\u590d\u8fd9\u5c01\u5ba2\u6237\u6765\u4fe1' : 'Reply to this customer message')
                : (isZh ? '\u7ee7\u7eed\u63a8\u8fdb\u8fd9\u6b21\u5916\u53d1\u8ddf\u8fdb' : 'Keep this outbound follow-up moving')
          }
          primaryDescription={
            selectedEmail.type === 'draft'
              ? (isZh
                ? '\u5148\u5b8c\u5584\u4e3b\u9898\u548c\u6b63\u6587\uff0c\u518d\u786e\u8ba4\u662f\u5426\u9700\u8981\u8865\u5145\u4ea7\u54c1\u6216\u77e5\u8bc6\u4f9d\u636e\u540e\u53d1\u9001\u3002'
                : 'Polish the subject and body, then confirm whether product or knowledge evidence should be added before sending.')
              : inbound
                ? (isZh
                  ? '\u7ed3\u5408\u5ba2\u6237\u6700\u65b0\u6765\u4fe1\u3001\u5386\u53f2\u5f80\u6765\u548c\u77e5\u8bc6\u4f9d\u636e\uff0c\u5c3d\u5feb\u5f62\u6210\u56de\u590d\u6216\u540e\u7eed\u52a8\u4f5c\u3002'
                  : 'Use the latest inbound message, prior thread history, and knowledge context to prepare the next response quickly.')
                : (isZh
                  ? '\u68c0\u67e5\u8fd9\u6b21\u5916\u53d1\u540e\u7684\u4e92\u52a8\u4e0e\u5f85\u8ddf\u8fdb\u72b6\u6001\uff0c\u51b3\u5b9a\u662f\u5426\u7ee7\u7eed\u8ffd\u52a0\u6d88\u606f\u6216\u8f6c\u6210\u4efb\u52a1\u3002'
                  : 'Review engagement and follow-up status after this outbound message to decide whether to send the next touch or turn it into a task.')
          }
          primaryTone={selectedEmail.type === 'draft' ? 'warning' : inbound ? 'info' : 'primary'}
          primaryMeta={
            selectedEmail.type === 'draft'
              ? (isZh ? '\u8349\u7a3f\u5de5\u4f5c\u533a' : 'Draft workspace')
              : inbound
                ? (isZh ? '\u5ba2\u6237\u5165\u7ad9\u6d88\u606f' : 'Customer inbound')
                : (isZh ? '\u5916\u53d1\u8ddf\u8fdb' : 'Outbound follow-up')
          }
          primaryActions={(
            <>
              {selectedEmail.type === 'draft' ? (
                <ConversationToolbarButton tone="warning" compact onClick={onEditDraft}>
                  <PenSquare className="h-3.5 w-3.5" />
                  {isZh ? '\u7f16\u8f91\u8349\u7a3f' : 'Edit draft'}
                </ConversationToolbarButton>
              ) : (
                <ConversationToolbarButton tone="info" compact onClick={onReply}>
                  <Reply className="h-3.5 w-3.5" />
                  {isZh ? '\u56de\u590d\u90ae\u4ef6' : 'Reply'}
                </ConversationToolbarButton>
              )}
              <ConversationToolbarButton tone="primary" compact onClick={onDraftAgentReply}>
                <Sparkles className="h-3.5 w-3.5" />
                {isZh ? 'AI \u8d77\u8349' : 'AI draft'}
              </ConversationToolbarButton>
              {selectedEmail.clientId ? (
                <ConversationToolbarButton tone="success" compact onClick={onClientClick}>
                  <Link2 className="h-3.5 w-3.5" />
                  {isZh ? '\u6253\u5f00\u5ba2\u6237' : 'Open customer'}
                </ConversationToolbarButton>
              ) : (
                <>
                  {onCreateLead && (
                    <ConversationToolbarButton tone="info" compact onClick={() => void onCreateLead()}>
                      <UserPlus className="h-3.5 w-3.5" />
                      {isZh ? '\u65b0\u5efa\u7ebf\u7d22' : 'New lead'}
                    </ConversationToolbarButton>
                  )}
                  <ConversationToolbarButton tone="success" compact onClick={onAddToExistingClient}>
                    <Link2 className="h-3.5 w-3.5" />
                    {isZh ? '\u5173\u8054\u5ba2\u6237' : 'Link client'}
                  </ConversationToolbarButton>
                </>
              )}
            </>
          )}
          linkedLabel={isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked customer'}
          linkedValue={selectedEmail.clientId ? (clientName || selectedEmail.clientId) : undefined}
          activityLabel={isZh ? '\u90ae\u4ef6\u72b6\u6001' : 'Email status'}
          activityValue={
            selectedEmail.type === 'draft'
              ? (isZh ? '\u8349\u7a3f\u5f85\u5904\u7406' : 'Draft pending')
              : inbound
                ? (isZh ? '\u5ba2\u6237\u6765\u4fe1' : 'Inbound customer message')
                : (isZh ? '\u6211\u65b9\u5916\u53d1' : 'Outbound team message')
          }
          tagsCount={(activeUnifiedConversation?.tags || selectedEmail.tags || []).length}
          followUpAt={activeFollowUpAt}
          items={[
            {
              label: isZh ? '\u4e3b\u9898' : 'Subject',
              value: selectedEmail.subject || (isZh ? '\u65e0\u4e3b\u9898' : 'No subject'),
              tone: 'default',
            },
            {
              label: isZh ? '\u9644\u4ef6' : 'Attachments',
              value: String(selectedEmail.attachments?.length || 0),
              tone: 'info',
            },
            {
              label: isZh ? '\u8ffd\u8e2a' : 'Tracking',
              value: String(selectedTrackingEvents.length),
              tone: selectedTrackingEvents.length > 0 ? 'success' : 'default',
            },
            {
              label: isZh ? '\u8bc4\u8bba' : 'Comments',
              value: String(activeConversationComments.length),
              tone: activeConversationComments.length > 0 ? 'violet' : 'default',
            },
          ]}
        />
      )}
      followUp={(
        <ConversationFollowUpStrip
          language={language}
          dueAt={activeFollowUpAt}
          note={activeFollowUpNote}
          onSet={onSetFollowUp}
          onClear={onClearFollowUp}
          onComplete={onCompleteFollowUp}
        />
      )}
      mainClassName="scrollbar-thin"
      main={(
        <>
          <EmailTrackingPanel
            language={language}
            enabled={
              (selectedEmail.type === 'sent' || selectedEmail.type === 'scheduled' || selectedEmail.type === 'outbound') &&
              (selectedEmail.body?.includes('/api/track/open/') || !!selectedEmail.enableTracking)
            }
            events={selectedTrackingEvents}
            visibleEvents={visibleTrackingEvents}
            isExpanded={isTrackingExpanded}
            onToggleExpanded={onToggleTrackingExpanded}
          />
          <EmailBodyPanel
            language={language}
            subject={selectedEmail.subject}
            body={selectedEmail.body}
          />
          <EmailAttachmentsPanel
            language={language}
            attachments={selectedEmail.attachments}
          />
          <EmailCommentsPanel
            comments={activeConversationComments}
            commentText={commentText}
            attachments={commentAttachments}
            language={language}
            onCommentTextChange={onCommentTextChange}
            onAttachClick={onAttachClick}
            onRemoveAttachment={onRemoveAttachment}
            onReply={onReplyComment}
            onSubmit={onSubmitComment}
          />
        </>
      )}
      rail={(
        <ConversationContextRail
          variant="rail"
          title={isZh ? '\u90ae\u4ef6\u4e0a\u4e0b\u6587' : 'Email Context'}
          description={
            isZh
              ? '\u628a\u90ae\u4ef6\u5206\u6790\u3001\u5ba2\u6237\u8d44\u6599\u3001\u4ea7\u54c1\u4fe1\u606f\u548c RAG \u4f9d\u636e\u96c6\u4e2d\u653e\u5728\u8fd9\u91cc\uff0c\u4fbf\u4e8e\u51c6\u5907\u56de\u590d\u548c\u4e0b\u4e00\u6b65\u52a8\u4f5c\u3002'
              : 'Email analysis, customer profile, product, and RAG context for preparing replies and next steps.'
          }
          badges={[
            {
              label: selectedEmail.type === 'draft'
                ? (isZh ? '\u8349\u7a3f\u6a21\u5f0f' : 'Draft mode')
                : inbound
                  ? (isZh ? '\u5ba2\u6237\u6765\u4fe1' : 'Inbound')
                  : (isZh ? '\u6211\u65b9\u5916\u53d1' : 'Outbound'),
              tone: selectedEmail.type === 'draft' ? 'warning' : inbound ? 'info' : 'default',
            },
            {
              label: selectedEmail.clientId
                ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client')
                : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
              tone: selectedEmail.clientId ? 'success' : 'default',
            },
            {
              label: selectedEmailAgentContext.hasCustomerMessage
                ? (isZh ? '\u5df2\u8bfb\u53d6\u5ba2\u6237\u4e0a\u4e0b\u6587' : 'Customer context found')
                : (isZh ? '\u65e0\u65b0\u5ba2\u6237\u4e0a\u4e0b\u6587' : 'No fresh customer context'),
              tone: selectedEmailAgentContext.hasCustomerMessage ? 'violet' : 'default',
            },
          ]}
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
      )}
    />
  );
}
