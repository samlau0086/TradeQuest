import React from 'react';
import { Link2, Sparkles, UserPlus } from 'lucide-react';
import type { AgentContextSuggestionInsight, Client, ContactMethod } from '../../store';
import { TelegramAgentSuggestionsPanel } from './ConversationAgentPanels';
import { ConversationContextRail } from './ConversationContextRail';
import { ConversationChannelWorkroom } from './ConversationChannelWorkroom';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { ConversationFollowUpStrip } from './ConversationFollowUpStrip';
import { ConversationRecordSummaryStrip } from './ConversationRecordSummaryStrip';
import { ConversationToolbarButton } from './ConversationToolbar';
import { TelegramHeaderActions, TelegramHeaderMeta } from './TelegramHeaderControls';
import type { ConversationMessageTranslation, UnifiedCommunicationConversation } from './inboxModel';

interface TelegramConversationPaneProps {
  language: 'en' | 'zh';
  selectedTelegramConversation: UnifiedCommunicationConversation;
  activeTelegramClient?: Client | null;
  activeTelegramContactMethod?: ContactMethod | null;
  activeTelegramDisplayName: string;
  activeTelegramTranslateEnabled: boolean;
  activeTelegramTranslations: Record<string, ConversationMessageTranslation>;
  activeTelegramAgentContext: {
    cacheKey: string;
    body: string;
    additionalContext: string;
    hasCustomerMessage: boolean;
    latestInbound?: { body?: string };
  };
  currentUser?: { id: string } | null;
  telegramMessages: any[];
  isTelegramMessagesLoading: boolean;
  translatingConversationMessageIds: Set<string>;
  activeConversationComments: any[];
  commentText: string;
  telegramReply: string;
  isSendingTelegramReply: boolean;
  activeFollowUpAt?: string | null;
  activeFollowUpNote?: string | null;
  onBack: () => void;
  onClientClick: () => void;
  onOwnerChange: (ownerId: string | null) => void | Promise<void>;
  onStageChange: (stage: string | null) => void | Promise<void>;
  onDeleteConversation: () => void;
  onToggleHumanTakeover: () => void | Promise<void>;
  onToggleTranslate: () => void;
  onCreateLead?: () => void | Promise<void>;
  onAddToExistingClient: () => void;
  onSetConversationFollowUp: (dueAt: string, note: string) => void | Promise<void>;
  onClearConversationFollowUp: () => void | Promise<void>;
  onCompleteConversationFollowUp: () => void | Promise<void>;
  onDraftReply: () => void | Promise<void>;
  onAddSuggestionComment: () => void | Promise<void>;
  onSetAgentFollowUp: (dueAt: string, note: string) => void | Promise<void>;
  onClearAgentFollowUp: () => void | Promise<void>;
  onCompleteAgentFollowUp: () => void | Promise<void>;
  onSaveAnalysis: (key: string, insight: AgentContextSuggestionInsight) => void | Promise<void>;
  onCommentTextChange: (value: string) => void;
  onReplyComment: (commentId: string, content: string, attachments?: any[]) => void;
  onSubmitComment: () => void;
  onTelegramReplyChange: (value: string) => void;
  onSendTelegramReply: () => void | Promise<void>;
}

export function TelegramConversationPane({
  language,
  selectedTelegramConversation,
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
  onBack,
  onClientClick,
  onOwnerChange,
  onStageChange,
  onDeleteConversation,
  onToggleHumanTakeover,
  onToggleTranslate,
  onCreateLead,
  onAddToExistingClient,
  onSetConversationFollowUp,
  onClearConversationFollowUp,
  onCompleteConversationFollowUp,
  onDraftReply,
  onAddSuggestionComment,
  onSetAgentFollowUp,
  onClearAgentFollowUp,
  onCompleteAgentFollowUp,
  onSaveAnalysis,
  onCommentTextChange,
  onReplyComment,
  onSubmitComment,
  onTelegramReplyChange,
  onSendTelegramReply,
}: TelegramConversationPaneProps) {
  const isZh = language === 'zh';
  const clientId = activeTelegramClient?.id || selectedTelegramConversation.client_id;
  const clientName = activeTelegramClient?.name || selectedTelegramConversation.client_name;
  const humanTakeover = !!selectedTelegramConversation.metadata?.humanTakeover;

  return (
    <ConversationChannelWorkroom
      header={(
        <ConversationDetailHeader
          language={language}
          channel="telegram"
          title={
            selectedTelegramConversation.client_name ||
            selectedTelegramConversation.title ||
            selectedTelegramConversation.contact_name ||
            selectedTelegramConversation.contact_address ||
            'Telegram'
          }
          subtitle={selectedTelegramConversation.contact_address || selectedTelegramConversation.metadata?.telegramChatId || ''}
          clientId={clientId}
          clientName={clientName}
          tags={activeTelegramClient?.tags || selectedTelegramConversation.tags || []}
          ownerId={selectedTelegramConversation.owner_id}
          stage={selectedTelegramConversation.stage}
          currentUser={currentUser}
          statusBadges={[
            {
              label: humanTakeover ? (isZh ? '\u4eba\u5de5\u63a5\u7ba1' : 'Human takeover') : (isZh ? 'Bot \u534f\u4f5c' : 'Bot assisted'),
              tone: humanTakeover ? 'warning' : 'sky',
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
            <TelegramHeaderActions
              language={language}
              humanTakeover={humanTakeover}
              onToggleHumanTakeover={onToggleHumanTakeover}
            />
          )}
          meta={(
            <TelegramHeaderMeta
              language={language}
              isLinked={!!(activeTelegramClient || selectedTelegramConversation.client_id)}
              hasContactMethod={!!activeTelegramContactMethod}
              translateEnabled={activeTelegramTranslateEnabled}
              humanTakeover={humanTakeover}
              chatId={selectedTelegramConversation.metadata?.telegramChatId}
              userId={selectedTelegramConversation.metadata?.telegramUserId}
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
              label: humanTakeover ? (isZh ? '\u4eba\u5de5\u63a5\u7ba1' : 'Human takeover') : (isZh ? 'Bot \u534f\u4f5c' : 'Bot assisted'),
              tone: humanTakeover ? 'warning' : 'sky',
            },
            {
              label: clientId ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client') : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
              tone: clientId ? 'success' : 'default',
            },
            {
              label: activeTelegramTranslateEnabled ? (isZh ? '\u81ea\u52a8\u7ffb\u8bd1\u5df2\u5f00\u542f' : 'Translate on') : (isZh ? '\u81ea\u52a8\u7ffb\u8bd1\u5173\u95ed' : 'Translate off'),
              tone: activeTelegramTranslateEnabled ? 'sky' : 'default',
            },
          ]}
          primaryTitle={
            humanTakeover
              ? (isZh ? '\u5f53\u524d\u7531\u4eba\u5de5\u63a5\u7ba1 Telegram \u4f1a\u8bdd' : 'Telegram conversation is under human takeover')
              : (isZh ? '\u7ee7\u7eed\u63a8\u8fdb\u8fd9\u6bb5 Telegram \u5bf9\u8bdd' : 'Advance this Telegram conversation')
          }
          primaryDescription={
            humanTakeover
              ? (isZh
                ? '\u4f18\u5148\u4eba\u5de5\u5904\u7406\u5f53\u524d\u4f1a\u8bdd\uff1b\u5982\u5df2\u5b8c\u6210\uff0c\u53ef\u91cd\u65b0\u4ea4\u56de Agent \u6301\u7eed\u81ea\u52a8\u8ddf\u8fdb\u3002'
                : 'Handle this session manually first; once resolved, return it to the agent for ongoing automation.')
              : (isZh
                ? '\u7ed3\u5408\u6700\u8fd1\u6d88\u606f\u3001\u7ffb\u8bd1\u72b6\u6001\u3001\u5ba2\u6237\u5173\u8054\u548c Agent \u5efa\u8bae\uff0c\u751f\u6210\u66f4\u5408\u9002\u7684\u4e0b\u4e00\u6761\u56de\u590d\u3002'
                : 'Use recent messages, translation state, linked customer context, and agent suggestions to produce the most appropriate next reply.')
          }
          primaryTone={humanTakeover ? 'warning' : 'sky'}
          primaryMeta={humanTakeover ? (isZh ? '\u4eba\u5de5\u63a5\u7ba1\u4e2d' : 'Human takeover active') : (isZh ? 'Bot \u534f\u4f5c\u6a21\u5f0f' : 'Bot-assisted')}
          primaryActions={(
            <>
              <ConversationToolbarButton tone="sky" compact onClick={() => void onDraftReply()}>
                <Sparkles className="h-3.5 w-3.5" />
                {isZh ? '\u751f\u6210\u56de\u590d' : 'Draft reply'}
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
          activityLabel={isZh ? '\u4f1a\u8bdd\u72b6\u6001' : 'Conversation state'}
          activityValue={selectedTelegramConversation.status || (isZh ? '\u8fdb\u884c\u4e2d' : 'Open')}
          tagsCount={(activeTelegramClient?.tags || selectedTelegramConversation.tags || []).length}
          followUpAt={selectedTelegramConversation.todo_at || activeFollowUpAt}
          items={[
            {
              label: isZh ? '\u6d88\u606f' : 'Messages',
              value: String(telegramMessages.length),
              tone: 'sky',
            },
            {
              label: isZh ? '\u63a5\u7ba1' : 'Takeover',
              value: humanTakeover ? (isZh ? '\u4eba\u5de5' : 'Human') : 'Agent',
              tone: humanTakeover ? 'warning' : 'success',
            },
            {
              label: isZh ? '\u7ffb\u8bd1' : 'Translate',
              value: activeTelegramTranslateEnabled ? (isZh ? '\u5f00\u542f' : 'On') : (isZh ? '\u5173\u95ed' : 'Off'),
              tone: activeTelegramTranslateEnabled ? 'sky' : 'default',
            },
            {
              label: isZh ? '\u5bf9\u8c61' : 'Handle',
              value: activeTelegramDisplayName,
              tone: 'default',
            },
          ]}
        />
      )}
      followUp={(
        <ConversationFollowUpStrip
          language={language}
          dueAt={selectedTelegramConversation.todo_at || null}
          note={selectedTelegramConversation.todo_note || null}
          onSet={onSetConversationFollowUp}
          onClear={onClearConversationFollowUp}
          onComplete={onCompleteConversationFollowUp}
        />
      )}
      channel="telegram"
      language={language}
      messages={telegramMessages}
      isLoading={isTelegramMessagesLoading}
      translateEnabled={activeTelegramTranslateEnabled}
      translations={activeTelegramTranslations}
      translatingIds={translatingConversationMessageIds}
      comments={activeConversationComments}
      commentText={commentText}
      accent="sky"
      isLinked={!!activeTelegramClient}
      linkedDescription={isZh ? '\u5df2\u5173\u8054\u5ba2\u6237\uff1a\u5907\u6ce8\u4f1a\u5199\u5165\u5ba2\u6237\u6863\u6848\u3002' : 'Linked client: notes are saved to the customer profile.'}
      unlinkedDescription={isZh ? '\u672a\u5173\u8054 Telegram \u7528\u6237\uff1a\u5907\u6ce8\u4f1a\u4fdd\u5b58\u5230\u5f53\u524d\u4f1a\u8bdd\u3002' : 'Unlinked Telegram user: notes are saved to this conversation.'}
      onCommentTextChange={onCommentTextChange}
      onReplyComment={onReplyComment}
      onSubmitComment={onSubmitComment}
      rail={(
        <ConversationContextRail
          variant="rail"
          title={isZh ? 'Telegram \u4e0a\u4e0b\u6587' : 'Telegram Context'}
          description={
            isZh
              ? 'Telegram \u5bf9\u8bdd\u5206\u6790\u3001\u5ba2\u6237\u5173\u8054\u548c Agent \u5efa\u8bae\u96c6\u4e2d\u5728\u8fd9\u91cc\uff0c\u4fbf\u4e8e\u5224\u65ad\u4e0b\u4e00\u6b65\u3002'
              : 'Telegram analysis, linked customer context, and agent suggestions for deciding the next action.'
          }
          badges={[
            {
              label: `${telegramMessages.length} ${isZh ? '\u6761\u6d88\u606f' : telegramMessages.length === 1 ? 'message' : 'messages'}`,
              tone: 'sky',
            },
            {
              label: clientId ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client') : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
              tone: clientId ? 'success' : 'default',
            },
            {
              label: humanTakeover ? (isZh ? '\u4eba\u5de5\u63a5\u7ba1\u4e2d' : 'Human takeover') : (isZh ? 'Bot \u534f\u4f5c\u4e2d' : 'Bot assisted'),
              tone: humanTakeover ? 'warning' : 'sky',
            },
          ]}
          collapsible
        >
          <TelegramAgentSuggestionsPanel
            language={language}
            cacheKey={activeTelegramAgentContext.cacheKey}
            conversationId={selectedTelegramConversation.id}
            clientId={clientId}
            clientName={clientName}
            persistedInsight={
              selectedTelegramConversation.agent_context_analysis_key === activeTelegramAgentContext.cacheKey
                ? selectedTelegramConversation.agent_context_analysis
                : undefined
            }
            persistedInsightKey={selectedTelegramConversation.agent_context_analysis_key}
            subject={selectedTelegramConversation.title || activeTelegramDisplayName || 'Telegram conversation'}
            body={activeTelegramAgentContext.body}
            additionalContext={activeTelegramAgentContext.additionalContext}
            hasClient={!!clientId}
            hasKnowledge={!!activeTelegramClient}
            hasCustomerMessage={activeTelegramAgentContext.hasCustomerMessage}
            onDraftReply={onDraftReply}
            onAddComment={onAddSuggestionComment}
            onCreateLead={onCreateLead}
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
      composerValue={telegramReply}
      composerSending={isSendingTelegramReply}
      composerAccent="sky"
      composerPlaceholder={isZh ? '\u8f93\u5165 Telegram \u56de\u590d\uff0cCtrl+Enter \u53d1\u9001...' : 'Write a Telegram reply, Ctrl+Enter to send...'}
      composerHelperText={isZh
        ? '\u53d1\u9001\u5c06\u4f7f\u7528 Settings -> Telegram Bot \u4e2d\u914d\u7f6e\u7684 Bot Token\u3002\u4eba\u5de5\u63a5\u7ba1\u5f00\u542f\u540e\uff0cTelegram Agent \u7684\u81ea\u52a8\u56de\u590d\u4f1a\u6682\u505c\u3002'
        : 'Sending uses the Bot Token configured in Settings -> Telegram Bot. Human takeover pauses Telegram Agent auto-replies.'}
      onComposerChange={onTelegramReplyChange}
      onComposerSend={onSendTelegramReply}
      composerClassName="border-t-0 bg-transparent"
    />
  );
}
