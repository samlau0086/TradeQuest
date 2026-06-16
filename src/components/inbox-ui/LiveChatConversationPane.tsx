import React from 'react';
import type { AgentContextSuggestionInsight, Client, ContactMethod, LiveChatSession } from '../../store';
import { ConversationContextRail } from './ConversationContextRail';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { LiveChatAgentSuggestionsPanel } from './ConversationAgentPanels';
import { ConversationFollowUpStrip } from './ConversationFollowUpStrip';
import { ConversationInternalNotesPanel } from './ConversationInternalNotesPanel';
import { ConversationMessageList } from './ConversationMessageList';
import { ConversationReplyComposer } from './ConversationReplyComposer';
import { ConversationSplitPane } from './ConversationSplitPane';
import { LiveChatCustomerInsightCard, LiveChatEvidencePanel } from './LiveChatContextWidgets';
import { LiveChatHeaderActions, LiveChatHeaderMeta } from './LiveChatHeaderControls';
import type { ConversationMessageTranslation, UnifiedCommunicationConversation } from './inboxModel';

interface LiveChatConversationPaneProps {
  language: 'en' | 'zh';
  selectedLiveChatConversation: UnifiedCommunicationConversation;
  activeLiveChatClient?: Client | null;
  activeLiveChatContactMethod?: ContactMethod | null;
  activeLiveChatSession?: LiveChatSession | null;
  activeLiveChatTranslateEnabled: boolean;
  activeLiveChatTranslations: Record<string, ConversationMessageTranslation>;
  activeLiveChatVisitorInfo?: any;
  activeLiveChatEvidenceItems: Array<{ label: string; value: string }>;
  activeLiveChatAgentContext: {
    cacheKey: string;
    body: string;
    additionalContext: string;
    hasCustomerMessage: boolean;
  };
  activeUnifiedConversation?: UnifiedCommunicationConversation | null;
  currentUser?: { id: string } | null;
  visibleLiveChatMessages: any[];
  translatingConversationMessageIds: Set<string>;
  activeConversationComments: any[];
  commentText: string;
  liveChatReply: string;
  isSendingLiveChatReply: boolean;
  isRunningLiveChatAgent: boolean;
  latestLiveChatVisitorMessage?: { body?: string } | null;
  liveChatEndRef: React.RefObject<HTMLDivElement | null>;
  activeFollowUpAt?: string | null;
  activeFollowUpNote?: string | null;
  onBack: () => void;
  onClientClick: () => void;
  onOwnerChange?: (ownerId: string | null) => void | Promise<void>;
  onStageChange?: (stage: string | null) => void | Promise<void>;
  onDeleteConversation: () => void;
  onToggleHumanTakeover: () => void | Promise<void>;
  onRunAgent: () => void | Promise<void>;
  onToggleTranslate: () => void;
  onCreateLead?: () => void | Promise<void>;
  onAddToExistingClient: () => void;
  onSetConversationFollowUp: (dueAt: string, note: string) => void | Promise<void>;
  onClearConversationFollowUp: () => void | Promise<void>;
  onCompleteConversationFollowUp: () => void | Promise<void>;
  onAddSuggestionComment: () => void | Promise<void>;
  onSetAgentFollowUp: (dueAt: string, note: string) => void | Promise<void>;
  onClearAgentFollowUp: () => void | Promise<void>;
  onCompleteAgentFollowUp: () => void | Promise<void>;
  onSaveAnalysis: (key: string, insight: AgentContextSuggestionInsight) => void | Promise<void>;
  onCommentTextChange: (value: string) => void;
  onReplyComment: (commentId: string, content: string, attachments?: any[]) => void;
  onSubmitComment: () => void;
  onLiveChatReplyChange: (value: string) => void;
  onSendLiveChatReply: () => void | Promise<void>;
}

export function LiveChatConversationPane({
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
  liveChatEndRef,
  activeFollowUpAt,
  activeFollowUpNote,
  onBack,
  onClientClick,
  onOwnerChange,
  onStageChange,
  onDeleteConversation,
  onToggleHumanTakeover,
  onRunAgent,
  onToggleTranslate,
  onCreateLead,
  onAddToExistingClient,
  onSetConversationFollowUp,
  onClearConversationFollowUp,
  onCompleteConversationFollowUp,
  onAddSuggestionComment,
  onSetAgentFollowUp,
  onClearAgentFollowUp,
  onCompleteAgentFollowUp,
  onSaveAnalysis,
  onCommentTextChange,
  onReplyComment,
  onSubmitComment,
  onLiveChatReplyChange,
  onSendLiveChatReply,
}: LiveChatConversationPaneProps) {
  const clientId = activeLiveChatClient?.id || selectedLiveChatConversation.client_id;
  const clientName = activeLiveChatClient?.name || selectedLiveChatConversation.client_name;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ConversationDetailHeader
        language={language}
        channel="live_chat"
        title={activeLiveChatClient?.name || selectedLiveChatConversation.client_name || selectedLiveChatConversation.title || activeLiveChatSession?.visitorName || 'Live Chat'}
        subtitle={activeLiveChatSession?.visitorEmail || activeLiveChatSession?.visitorPhone || selectedLiveChatConversation.contact_address || activeLiveChatSession?.pageUrl || ''}
        clientId={clientId}
        clientName={clientName}
        tags={activeLiveChatClient?.tags || activeUnifiedConversation?.tags || activeLiveChatSession?.tags || selectedLiveChatConversation.tags || []}
        ownerId={activeUnifiedConversation?.owner_id}
        stage={activeUnifiedConversation?.stage}
        currentUser={currentUser}
        onBack={onBack}
        onClientClick={onClientClick}
        onOwnerChange={onOwnerChange}
        onStageChange={onStageChange}
        onDelete={onDeleteConversation}
        actions={(
          <LiveChatHeaderActions
            language={language}
            humanTakeover={activeLiveChatSession?.humanTakeover ?? selectedLiveChatConversation.metadata?.humanTakeover}
            isRunningAgent={isRunningLiveChatAgent}
            onToggleHumanTakeover={onToggleHumanTakeover}
            onRunAgent={onRunAgent}
          />
        )}
        meta={(
          <LiveChatHeaderMeta
            language={language}
            isLinked={!!(activeLiveChatClient || selectedLiveChatConversation.client_id)}
            hasContactMethod={!!activeLiveChatContactMethod}
            translateEnabled={activeLiveChatTranslateEnabled}
            visitorEmail={activeLiveChatSession?.visitorEmail}
            visitorPhone={activeLiveChatSession?.visitorPhone}
            pageUrl={activeLiveChatSession?.pageUrl}
            visitorInfo={activeLiveChatVisitorInfo}
            onToggleTranslate={onToggleTranslate}
            onCreateLead={onCreateLead || (() => {})}
            onAddToExistingClient={onAddToExistingClient}
          />
        )}
      />
      <ConversationFollowUpStrip
        language={language}
        dueAt={activeFollowUpAt}
        note={activeFollowUpNote}
        onSet={onSetConversationFollowUp}
        onClear={onClearConversationFollowUp}
        onComplete={onCompleteConversationFollowUp}
      />
      <ConversationSplitPane
        main={(
          <>
            <ConversationMessageList
              channel="live_chat"
              language={language}
              messages={visibleLiveChatMessages}
              translateEnabled={activeLiveChatTranslateEnabled}
              translations={activeLiveChatTranslations}
              translatingIds={translatingConversationMessageIds}
            />
            <ConversationInternalNotesPanel
              language={language}
              comments={activeConversationComments}
              commentText={commentText}
              accent="violet"
              isLinked={!!activeLiveChatClient}
              linkedDescription="Linked client: notes are saved to the customer profile."
              unlinkedDescription="Unlinked visitor: notes are saved to this conversation."
              onCommentTextChange={onCommentTextChange}
              onReply={onReplyComment}
              onSubmit={onSubmitComment}
            />
            <div ref={liveChatEndRef} />
          </>
        )}
        rail={(
          <ConversationContextRail
            variant="rail"
            title={language === 'zh' ? 'Live Chat 上下文' : 'Live Chat Context'}
            description={language === 'zh'
              ? '客户摘要、访客证据和 Agent 建议集中在这里，便于边看消息边判断下一步。'
              : 'Customer summary, visitor evidence, and Agent suggestions for deciding the next action.'}
            collapsible
          >
            <LiveChatCustomerInsightCard client={activeLiveChatClient} />
            <LiveChatEvidencePanel language={language} items={activeLiveChatEvidenceItems} />
            <LiveChatAgentSuggestionsPanel
              language={language}
              cacheKey={activeLiveChatAgentContext.cacheKey}
              conversationId={selectedLiveChatConversation.id}
              clientId={clientId}
              clientName={clientName}
              persistedInsight={selectedLiveChatConversation.agent_context_analysis_key === activeLiveChatAgentContext.cacheKey ? selectedLiveChatConversation.agent_context_analysis : undefined}
              persistedInsightKey={selectedLiveChatConversation.agent_context_analysis_key}
              subject={selectedLiveChatConversation.title || 'Live Chat conversation'}
              body={activeLiveChatAgentContext.body}
              additionalContext={activeLiveChatAgentContext.additionalContext}
              hasClient={!!clientId}
              hasKnowledge={!!activeLiveChatClient}
              hasCustomerMessage={activeLiveChatAgentContext.hasCustomerMessage}
              onDraftReply={onRunAgent}
              onAddComment={onAddSuggestionComment}
              followUpAt={activeFollowUpAt}
              followUpNote={activeFollowUpNote}
              onSetFollowUp={onSetAgentFollowUp}
              onClearFollowUp={onClearAgentFollowUp}
              onCompleteFollowUp={onCompleteAgentFollowUp}
              onSaveAnalysis={onSaveAnalysis}
              onDeleteItem={onDeleteConversation}
            />
          </ConversationContextRail>
        )}
      />
      <ConversationReplyComposer
        language={language}
        value={liveChatReply}
        isSending={isSendingLiveChatReply}
        accent="violet"
        placeholder="Write a Live Chat reply, Ctrl+Enter to send..."
        helperText="Human takeover pauses background Live Chat Agent replies. Hand back to Agent to let new visitor messages trigger automation."
        onChange={onLiveChatReplyChange}
        onSend={onSendLiveChatReply}
      />
    </div>
  );
}
