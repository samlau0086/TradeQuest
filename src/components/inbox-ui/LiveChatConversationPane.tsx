import React from 'react';
import { Bot, Link2, Play, UserPlus } from 'lucide-react';
import type { AgentContextSuggestionInsight, Client, ContactMethod, LiveChatSession } from '../../store';
import { ConversationContextRail } from './ConversationContextRail';
import { ConversationChannelWorkroom } from './ConversationChannelWorkroom';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { LiveChatAgentSuggestionsPanel } from './ConversationAgentPanels';
import { ConversationFollowUpStrip } from './ConversationFollowUpStrip';
import { ConversationRecordSummaryStrip } from './ConversationRecordSummaryStrip';
import { ConversationToolbarButton } from './ConversationToolbar';
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
  const isZh = language === 'zh';
  const clientId = activeLiveChatClient?.id || selectedLiveChatConversation.client_id;
  const clientName = activeLiveChatClient?.name || selectedLiveChatConversation.client_name;
  const humanTakeover = activeLiveChatSession?.humanTakeover ?? selectedLiveChatConversation.metadata?.humanTakeover;

  return (
    <ConversationChannelWorkroom
      header={(
        <ConversationDetailHeader
          language={language}
          channel="live_chat"
          title={
            activeLiveChatClient?.name ||
            selectedLiveChatConversation.client_name ||
            selectedLiveChatConversation.title ||
            activeLiveChatSession?.visitorName ||
            'Live Chat'
          }
          subtitle={
            activeLiveChatSession?.visitorEmail ||
            activeLiveChatSession?.visitorPhone ||
            selectedLiveChatConversation.contact_address ||
            activeLiveChatSession?.pageUrl ||
            ''
          }
          clientId={clientId}
          clientName={clientName}
          tags={activeLiveChatClient?.tags || activeUnifiedConversation?.tags || activeLiveChatSession?.tags || selectedLiveChatConversation.tags || []}
          ownerId={activeUnifiedConversation?.owner_id}
          stage={activeUnifiedConversation?.stage}
          currentUser={currentUser}
          statusBadges={[
            {
              label: humanTakeover ? (isZh ? '\u4eba\u5de5\u63a5\u7ba1' : 'Human takeover') : (isZh ? 'Agent \u5728\u7ebf' : 'Agent active'),
              tone: humanTakeover ? 'warning' : 'violet',
            },
            {
              label: clientId ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client') : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
              tone: clientId ? 'success' : 'default',
            },
          ]}
          onBack={onBack}
          onClientClick={onClientClick}
          onOwnerChange={onOwnerChange}
          onStageChange={onStageChange}
          onDelete={onDeleteConversation}
          actions={(
            <LiveChatHeaderActions
              language={language}
              humanTakeover={humanTakeover}
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
      )}
      summary={(
        <ConversationRecordSummaryStrip
          language={language}
          eyebrow={isZh ? '\u4e0b\u4e00\u6b65\u884c\u52a8' : 'Next action'}
          statusBadges={[
            {
              label: humanTakeover ? (isZh ? '\u4eba\u5de5\u63a5\u7ba1' : 'Human takeover') : (isZh ? 'Agent \u5728\u7ebf' : 'Agent active'),
              tone: humanTakeover ? 'warning' : 'violet',
            },
            {
              label: clientId ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client') : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
              tone: clientId ? 'success' : 'default',
            },
            {
              label: activeLiveChatTranslateEnabled ? (isZh ? '\u81ea\u52a8\u7ffb\u8bd1\u5df2\u5f00\u542f' : 'Translate on') : (isZh ? '\u81ea\u52a8\u7ffb\u8bd1\u5173\u95ed' : 'Translate off'),
              tone: activeLiveChatTranslateEnabled ? 'sky' : 'default',
            },
          ]}
          primaryTitle={
            humanTakeover
              ? (isZh ? '\u5f53\u524d\u7531\u4eba\u5de5\u63a5\u7ba1\uff0c\u4f18\u5148\u5b8c\u6210\u4eba\u5de5\u5904\u7406' : 'Human takeover is active, continue manual handling')
              : (isZh ? '\u8ba9\u5ea7\u5e2d\u4e0e Agent \u534f\u540c\u63a8\u8fdb\u8fd9\u6bb5\u5bf9\u8bdd' : 'Coordinate agent and operator work on this conversation')
          }
          primaryDescription={
            humanTakeover
              ? (isZh
                ? '\u8fd9\u6bb5 Live Chat \u5df2\u6682\u505c\u81ea\u52a8\u56de\u590d\u3002\u4f60\u53ef\u4ee5\u76f4\u63a5\u4eba\u5de5\u56de\u590d\u3001\u8865\u5145\u5ba2\u6237\u5173\u8054\uff0c\u6216\u5728\u5904\u7406\u540e\u91cd\u65b0\u4ea4\u8fd8\u7ed9 Agent\u3002'
                : 'Auto-replies are paused for this Live Chat. Reply manually, enrich the linked record, or hand it back to the agent when ready.')
              : (isZh
                ? '\u7ed3\u5408\u8bbf\u5ba2\u8bc1\u636e\u3001\u5ba2\u6237\u6458\u8981\u548c\u4e0a\u4e0b\u6587\u5efa\u8bae\uff0c\u51b3\u5b9a\u662f\u8ba9 Agent \u56de\u590d\u3001\u4eba\u5de5\u63a5\u7ba1\uff0c\u8fd8\u662f\u5148\u521b\u5efa\u7ebf\u7d22\u6216\u5173\u8054\u5ba2\u6237\u3002'
                : 'Use visitor evidence, customer summary, and context suggestions to decide whether the agent should reply, a human should take over, or the visitor should first be linked to CRM.')
          }
          primaryTone={humanTakeover ? 'warning' : 'violet'}
          primaryMeta={humanTakeover ? (isZh ? '\u4eba\u5de5\u63a5\u7ba1\u4e2d' : 'Human takeover active') : (isZh ? 'Agent \u534f\u4f5c\u6a21\u5f0f' : 'Agent-assisted')}
          primaryActions={(
            <>
              <ConversationToolbarButton tone="violet" compact onClick={() => void onRunAgent()} disabled={isRunningLiveChatAgent}>
                <Bot className="h-3.5 w-3.5" />
                {isZh ? '\u8fd0\u884c Agent' : 'Run agent'}
              </ConversationToolbarButton>
              <ConversationToolbarButton tone={humanTakeover ? 'warning' : 'success'} compact onClick={() => void onToggleHumanTakeover()}>
                <Play className="h-3.5 w-3.5" />
                {humanTakeover ? (isZh ? '\u4ea4\u8fd8 Agent' : 'Return to agent') : (isZh ? '\u4eba\u5de5\u63a5\u7ba1' : 'Take over')}
              </ConversationToolbarButton>
              {clientId ? (
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
          linkedValue={clientName}
          activityLabel={isZh ? '\u4f1a\u8bdd\u72b6\u6001' : 'Session state'}
          activityValue={activeLiveChatSession?.status || selectedLiveChatConversation.status || (isZh ? '\u8fdb\u884c\u4e2d' : 'Open')}
          tagsCount={(activeLiveChatClient?.tags || activeUnifiedConversation?.tags || activeLiveChatSession?.tags || selectedLiveChatConversation.tags || []).length}
          followUpAt={activeFollowUpAt}
          items={[
            {
              label: isZh ? '\u6d88\u606f' : 'Messages',
              value: String(visibleLiveChatMessages.length),
              tone: 'violet',
            },
            {
              label: isZh ? '\u8bc1\u636e' : 'Evidence',
              value: String(activeLiveChatEvidenceItems.length),
              tone: 'info',
            },
            {
              label: isZh ? '\u63a5\u7ba1' : 'Takeover',
              value: humanTakeover ? (isZh ? '\u4eba\u5de5' : 'Human') : 'Agent',
              tone: humanTakeover ? 'warning' : 'success',
            },
            {
              label: isZh ? '\u7ffb\u8bd1' : 'Translate',
              value: activeLiveChatTranslateEnabled ? (isZh ? '\u5f00\u542f' : 'On') : (isZh ? '\u5173\u95ed' : 'Off'),
              tone: activeLiveChatTranslateEnabled ? 'sky' : 'default',
            },
          ]}
        />
      )}
      followUp={(
        <ConversationFollowUpStrip
          language={language}
          dueAt={activeFollowUpAt}
          note={activeFollowUpNote}
          onSet={onSetConversationFollowUp}
          onClear={onClearConversationFollowUp}
          onComplete={onCompleteConversationFollowUp}
        />
      )}
      channel="live_chat"
      language={language}
      messages={visibleLiveChatMessages}
      translateEnabled={activeLiveChatTranslateEnabled}
      translations={activeLiveChatTranslations}
      translatingIds={translatingConversationMessageIds}
      comments={activeConversationComments}
      commentText={commentText}
      accent="violet"
      isLinked={!!activeLiveChatClient}
      linkedDescription={isZh ? '\u5df2\u5173\u8054\u5ba2\u6237\uff1a\u5907\u6ce8\u4f1a\u5199\u5165\u5ba2\u6237\u6863\u6848\u3002' : 'Linked client: notes are saved to the customer profile.'}
      unlinkedDescription={isZh ? '\u672a\u5173\u8054\u8bbf\u5ba2\uff1a\u5907\u6ce8\u4f1a\u4fdd\u5b58\u5230\u5f53\u524d\u4f1a\u8bdd\u3002' : 'Unlinked visitor: notes are saved to this conversation.'}
      onCommentTextChange={onCommentTextChange}
      onReplyComment={onReplyComment}
      onSubmitComment={onSubmitComment}
      afterNotes={<div ref={liveChatEndRef} />}
      rail={(
        <ConversationContextRail
          variant="rail"
          title={isZh ? 'Live Chat \u4e0a\u4e0b\u6587' : 'Live Chat Context'}
          description={isZh
            ? '\u5ba2\u6237\u6458\u8981\u3001\u8bbf\u5ba2\u8bc1\u636e\u548c Agent \u5efa\u8bae\u96c6\u4e2d\u5728\u8fd9\u91cc\uff0c\u4fbf\u4e8e\u8fb9\u770b\u6d88\u606f\u8fb9\u5224\u65ad\u4e0b\u4e00\u6b65\u3002'
            : 'Customer summary, visitor evidence, and agent suggestions for deciding the next action.'}
          badges={[
            {
              label: `${activeLiveChatEvidenceItems.length} ${isZh ? '\u6761\u8bc1\u636e' : activeLiveChatEvidenceItems.length === 1 ? 'evidence' : 'evidence'}`,
              tone: 'info',
            },
            {
              label: clientId ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client') : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
              tone: clientId ? 'success' : 'default',
            },
            {
              label: humanTakeover ? (isZh ? '\u4eba\u5de5\u63a5\u7ba1\u4e2d' : 'Human takeover') : (isZh ? 'Agent \u5728\u7ebf' : 'Agent active'),
              tone: humanTakeover ? 'warning' : 'violet',
            },
          ]}
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
      composerValue={liveChatReply}
      composerSending={isSendingLiveChatReply}
      composerAccent="violet"
      composerPlaceholder={isZh ? '\u8f93\u5165 Live Chat \u56de\u590d\uff0cCtrl+Enter \u53d1\u9001...' : 'Write a Live Chat reply, Ctrl+Enter to send...'}
      composerHelperText={isZh
        ? '\u4eba\u5de5\u63a5\u7ba1\u4f1a\u6682\u505c Live Chat Agent \u7684\u540e\u53f0\u81ea\u52a8\u56de\u590d\u3002\u91ca\u653e\u63a5\u7ba1\u540e\uff0c\u65b0\u7684\u8bbf\u5ba2\u6d88\u606f\u624d\u4f1a\u518d\u6b21\u89e6\u53d1\u81ea\u52a8\u5316\u3002'
        : 'Human takeover pauses background Live Chat Agent replies. Hand back to Agent to let new visitor messages trigger automation.'}
      onComposerChange={onLiveChatReplyChange}
      onComposerSend={onSendLiveChatReply}
      composerClassName="border-t-0 bg-transparent"
    />
  );
}
