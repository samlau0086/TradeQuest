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
      draftReplyLabel={language === 'zh' ? '\u8d77\u8349 Telegram \u56de\u590d' : 'Draft Telegram Reply'}
      draftReplyDescription={
        language === 'zh'
          ? '\u7ed3\u5408\u5ba2\u6237\u8d44\u6599\u3001Telegram \u5bf9\u8bdd\u3001\u4ea7\u54c1\u4fe1\u606f\u548c RAG \u4e0a\u4e0b\u6587\u751f\u6210\u66f4\u5408\u9002\u7684\u56de\u590d\u8349\u7a3f\u3002'
          : 'Draft a Telegram reply using customer, conversation, product, and RAG context.'
      }
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
      draftReplyLabel={language === 'zh' ? '\u8fd0\u884c Agent \u56de\u590d' : 'Run Agent Reply'}
      draftReplyDescription={
        language === 'zh'
          ? '\u7ed3\u5408\u5ba2\u6237\u8d44\u6599\u3001\u8bbf\u5ba2\u5bf9\u8bdd\u3001\u4ea7\u54c1\u4fe1\u606f\u548c RAG \u4e0a\u4e0b\u6587\u751f\u6210\u5e76\u53d1\u9001 Live Chat \u56de\u590d\u3002'
          : 'Generate and send a Live Chat reply using customer, conversation, product, and RAG context.'
      }
      {...props}
    />
  );
}
