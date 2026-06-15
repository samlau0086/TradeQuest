import React from 'react';
import { AgentContextSuggestionInsight } from '../../store';
import { AgentContextSuggestions } from '../AgentContextSuggestions';

interface BaseConversationAgentPanelProps {
  cacheKey: string;
  conversationId: string;
  clientId?: string;
  clientName?: string;
  persistedInsight?: AgentContextSuggestionInsight;
  persistedInsightKey?: string;
  subject: string;
  body: string;
  additionalContext: string;
  hasClient: boolean;
  hasKnowledge: boolean;
  hasCustomerMessage: boolean;
  followUpAt?: string | null;
  followUpNote?: string | null;
  onDraftReply: () => void | Promise<void>;
  onAddComment: () => void | Promise<void>;
  onSetFollowUp: (dueAt: string, note: string) => void | Promise<void>;
  onClearFollowUp: () => void | Promise<void>;
  onCompleteFollowUp: () => void | Promise<void>;
  onSaveAnalysis: (key: string, insight: AgentContextSuggestionInsight) => void | Promise<void>;
  onDeleteItem: () => void | Promise<void>;
}

interface TelegramAgentSuggestionsPanelProps extends BaseConversationAgentPanelProps {
  language: 'en' | 'zh';
  onCreateLead?: () => void | Promise<void>;
}

export function TelegramAgentSuggestionsPanel({
  language,
  conversationId,
  onCreateLead,
  ...props
}: TelegramAgentSuggestionsPanelProps) {
  return (
    <AgentContextSuggestions
      channel="telegram"
      contextLookup={{ conversationId }}
      draftReplyLabel={language === 'zh' ? '起草 Telegram 回复' : 'Draft Telegram Reply'}
      draftReplyDescription={language === 'zh'
        ? '使用客户资料、Telegram 记录、产品和 RAG 上下文生成回复草稿。'
        : 'Draft a Telegram reply using customer, conversation, product, and RAG context.'}
      onCreateLead={onCreateLead}
      {...props}
    />
  );
}

interface LiveChatAgentSuggestionsPanelProps extends BaseConversationAgentPanelProps {
  language: 'en' | 'zh';
}

export function LiveChatAgentSuggestionsPanel({
  language,
  conversationId,
  ...props
}: LiveChatAgentSuggestionsPanelProps) {
  return (
    <AgentContextSuggestions
      channel="live_chat"
      contextLookup={{ conversationId }}
      draftReplyLabel={language === 'zh' ? '运行 Agent 回复' : 'Run Agent Reply'}
      draftReplyDescription={language === 'zh'
        ? '使用客户资料、聊天记录、产品和 RAG 上下文生成并发送 Live Chat 回复。'
        : 'Generate and send a Live Chat reply using customer, conversation, product, and RAG context.'}
      {...props}
    />
  );
}
