import React from 'react';
import type { AgentContextSuggestionInsight, Client, ContactMethod } from '../../store';
import { ConversationContextRail } from './ConversationContextRail';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { TelegramAgentSuggestionsPanel } from './ConversationAgentPanels';
import { ConversationFollowUpStrip } from './ConversationFollowUpStrip';
import { ConversationInternalNotesPanel } from './ConversationInternalNotesPanel';
import { ConversationMessageList } from './ConversationMessageList';
import { ConversationReplyComposer } from './ConversationReplyComposer';
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
  const clientId = activeTelegramClient?.id || selectedTelegramConversation.client_id;
  const clientName = activeTelegramClient?.name || selectedTelegramConversation.client_name;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ConversationDetailHeader
        language={language}
        channel="telegram"
        title={selectedTelegramConversation.client_name || selectedTelegramConversation.title || selectedTelegramConversation.contact_name || selectedTelegramConversation.contact_address || 'Telegram'}
        subtitle={selectedTelegramConversation.contact_address || selectedTelegramConversation.metadata?.telegramChatId || ''}
        clientId={clientId}
        clientName={clientName}
        tags={activeTelegramClient?.tags || selectedTelegramConversation.tags || []}
        ownerId={selectedTelegramConversation.owner_id}
        stage={selectedTelegramConversation.stage}
        currentUser={currentUser}
        onBack={onBack}
        onClientClick={onClientClick}
        onOwnerChange={onOwnerChange}
        onStageChange={onStageChange}
        onDelete={onDeleteConversation}
        actions={(
          <TelegramHeaderActions
            language={language}
            humanTakeover={selectedTelegramConversation.metadata?.humanTakeover}
            onToggleHumanTakeover={onToggleHumanTakeover}
          />
        )}
        meta={(
          <TelegramHeaderMeta
            language={language}
            isLinked={!!(activeTelegramClient || selectedTelegramConversation.client_id)}
            hasContactMethod={!!activeTelegramContactMethod}
            translateEnabled={activeTelegramTranslateEnabled}
            humanTakeover={selectedTelegramConversation.metadata?.humanTakeover}
            chatId={selectedTelegramConversation.metadata?.telegramChatId}
            userId={selectedTelegramConversation.metadata?.telegramUserId}
            onToggleTranslate={onToggleTranslate}
            onCreateLead={onCreateLead || (() => {})}
            onAddToExistingClient={onAddToExistingClient}
          />
        )}
      />
      <ConversationFollowUpStrip
        language={language}
        dueAt={selectedTelegramConversation.todo_at || null}
        note={selectedTelegramConversation.todo_note || null}
        onSet={onSetConversationFollowUp}
        onClear={onClearConversationFollowUp}
        onComplete={onCompleteConversationFollowUp}
      />
      <div className="flex-1 min-h-0 bg-slate-950/50 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-0 overflow-y-auto p-6 space-y-4">
          <ConversationMessageList
            channel="telegram"
            language={language}
            messages={telegramMessages}
            isLoading={isTelegramMessagesLoading}
            translateEnabled={activeTelegramTranslateEnabled}
            translations={activeTelegramTranslations}
            translatingIds={translatingConversationMessageIds}
          />
          <ConversationInternalNotesPanel
            language={language}
            comments={activeConversationComments}
            commentText={commentText}
            accent="sky"
            isLinked={!!activeTelegramClient}
            linkedDescription="Linked client: notes are saved to the customer profile."
            unlinkedDescription="Unlinked Telegram user: notes are saved to this conversation."
            onCommentTextChange={onCommentTextChange}
            onReply={onReplyComment}
            onSubmit={onSubmitComment}
          />
        </section>

        <ConversationContextRail
          variant="rail"
          title={language === 'zh' ? 'Telegram 上下文' : 'Telegram Context'}
          description={language === 'zh'
            ? 'Telegram 对话分析、客户关联和 Agent 建议集中在这里，便于判断下一步。'
            : 'Telegram analysis, linked customer context, and Agent suggestions for deciding the next action.'}
          className="min-h-0 overflow-y-auto border-t border-slate-800 bg-slate-950/60 p-4 lg:border-l lg:border-t-0"
          collapsible
        >
          <TelegramAgentSuggestionsPanel
            language={language}
            cacheKey={activeTelegramAgentContext.cacheKey}
            conversationId={selectedTelegramConversation.id}
            clientId={clientId}
            clientName={clientName}
            persistedInsight={selectedTelegramConversation.agent_context_analysis_key === activeTelegramAgentContext.cacheKey ? selectedTelegramConversation.agent_context_analysis : undefined}
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
      </div>
      <ConversationReplyComposer
        language={language}
        value={telegramReply}
        isSending={isSendingTelegramReply}
        accent="sky"
        placeholder="Write a Telegram reply, Ctrl+Enter to send..."
        helperText="Sending uses the Bot Token configured in Settings -> Telegram Bot. Human takeover pauses Telegram Agent auto-replies."
        onChange={onTelegramReplyChange}
        onSend={onSendTelegramReply}
      />
    </div>
  );
}
