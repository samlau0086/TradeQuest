import React, { type Dispatch, type SetStateAction } from 'react';
import { Bot, MessageSquareQuote } from 'lucide-react';
import { type AgentContextSuggestionInsight, type Client } from '../store';
import { AgentContextSuggestions } from './AgentContextSuggestions';
import { ConversationContextRail } from './inbox-ui/ConversationContextRail';
import { ConversationSectionCard, ConversationSectionHeader } from './inbox-ui/ConversationSectionCard';
import { WHATSAPP_FOLLOW_UP_MARKER } from './useWhatsAppConversationMeta';
import { type WhatsAppConversation, type WhatsAppHubMessage } from './whatsappMessageModel';

interface WhatsAppAgentContextView {
  cacheKey: string;
  body: string;
  additionalContext: string;
  hasCustomerMessage: boolean;
}

interface WhatsAppContextSuggestionsPanelProps {
  embedded: boolean;
  withinConversationSplit?: boolean;
  language: 'en' | 'zh';
  conversation: WhatsAppConversation | null;
  activeClient: Client | null;
  displayPhone: string;
  body: string;
  latestInboundMessage?: WhatsAppHubMessage;
  whatsappAgentContext: WhatsAppAgentContextView;
  whatsappFollowUp?: { dueAt?: string; note?: string } | null;
  generateWhatsAppMessage: (seedPrompt?: string) => void | Promise<void>;
  addConversationComment: (content?: string) => void | Promise<void>;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onClose: () => void;
  setConversation: Dispatch<SetStateAction<WhatsAppConversation | null>>;
}

export function WhatsAppContextSuggestionsPanel({
  embedded,
  withinConversationSplit = false,
  language,
  conversation,
  activeClient,
  displayPhone,
  body,
  latestInboundMessage,
  whatsappAgentContext,
  whatsappFollowUp,
  generateWhatsAppMessage,
  addConversationComment,
  notify,
  onClose,
  setConversation,
}: WhatsAppContextSuggestionsPanelProps) {
  const isZh = language === 'zh';
  const contactName = conversation?.clientName || activeClient?.name || displayPhone;

  const saveAnalysis = async (key: string, insight: AgentContextSuggestionInsight) => {
    if (!conversation?.id) return;
    const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ agentContextAnalysis: insight, agentContextAnalysisKey: key }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to save WhatsApp analysis');
    setConversation(prev => prev ? { ...prev, agentContextAnalysis: insight, agentContextAnalysisKey: key } : prev);
  };

  const deleteConversation = async () => {
    if (!conversation?.id) throw new Error('No WhatsApp conversation is selected.');
    const response = await fetch(
      conversation.unifiedId
        ? `/api/conversations/${encodeURIComponent(conversation.unifiedId)}`
        : `/api/whatsapp-hub/conversations/${encodeURIComponent(conversation.id)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to delete WhatsApp conversation.');
    notify(isZh ? 'WhatsApp 对话已删除。' : 'WhatsApp conversation deleted.', 'success');
    onClose();
  };

  return (
    <ConversationContextRail
      variant="rail"
      title={isZh ? 'WhatsApp 智能体上下文' : 'WhatsApp Agent Context'}
      description={
        isZh
          ? '结合客户资料、产品、RAG 和记忆内容，生成下一步回复、待跟进与内部动作建议。'
          : 'Use customer profile, products, RAG, and conversation memory to guide replies, follow-ups, and internal actions.'
      }
      className={
        withinConversationSplit
          ? 'min-h-0'
          : embedded
            ? 'min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0'
            : 'border-t border-slate-800 bg-slate-950/60 p-4'
      }
      collapsible
    >
      <ConversationSectionCard className="mb-4">
        <ConversationSectionHeader
          title={isZh ? '使用方式' : 'How to use this panel'}
          icon={<Bot className="h-4 w-4" />}
          description={
            isZh
              ? '这里会优先读取客户入站消息、客户摘要、最佳下一步、产品资料和知识库，再帮助你生成更合适的 WhatsApp 跟进动作。'
              : 'This panel prioritizes inbound customer messages, CRM summary, best next step, product data, and knowledge snippets before proposing the next WhatsApp action.'
          }
        />
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
          <div className="leading-6">
            {isZh
              ? '点击“起草 AI 回复”时，如果当前输入框已有内容，会把它当作指导语；如果没有，会自动基于最近客户消息和上下文生成建议。'
              : 'When you choose Draft AI Reply, the current composer text is treated as guidance; if it is empty, the system drafts directly from the latest customer message and context.'}
          </div>
        </div>
      </ConversationSectionCard>

      <AgentContextSuggestions
        channel="whatsapp"
        cacheKey={whatsappAgentContext.cacheKey}
        contextLookup={conversation?.unifiedId ? { conversationId: conversation.unifiedId } : undefined}
        clientId={conversation?.clientId || activeClient?.id}
        whatsappNumber={displayPhone}
        persistedInsight={conversation?.agentContextAnalysisKey === whatsappAgentContext.cacheKey ? conversation?.agentContextAnalysis : undefined}
        persistedInsightKey={conversation?.agentContextAnalysisKey}
        subject={contactName}
        body={whatsappAgentContext.body}
        additionalContext={whatsappAgentContext.additionalContext}
        clientName={conversation?.clientName || activeClient?.name}
        hasClient={!!(conversation?.clientId || activeClient?.id)}
        hasKnowledge={!!activeClient}
        hasCustomerMessage={whatsappAgentContext.hasCustomerMessage}
        autoScrollOnOpen={embedded || withinConversationSplit}
        onDraftReply={() => generateWhatsAppMessage(
          body.trim() || (
            latestInboundMessage
              ? `Reply to the latest inbound customer WhatsApp message from ${contactName}: ${latestInboundMessage.body}`
              : `Draft a polite WhatsApp follow-up to ${contactName}. There is no inbound customer message yet, so do not answer our own outbound messages.`
          )
        )}
        onAddComment={() => addConversationComment(
          isZh
            ? `智能体建议：复核与 ${contactName} 的 WhatsApp 对话，并准备下一条最合适的回复。`
            : `Agent suggestion: review WhatsApp conversation with ${contactName} and prepare the next best reply.`
        )}
        followUpAt={whatsappFollowUp?.dueAt}
        followUpNote={whatsappFollowUp?.note}
        onSetFollowUp={(dueAt, note) => addConversationComment(`${WHATSAPP_FOLLOW_UP_MARKER}${JSON.stringify({
          status: 'open',
          dueAt,
          note: note || (isZh ? `跟进与 ${contactName} 的 WhatsApp 对话。` : `Follow up WhatsApp conversation with ${contactName}.`),
        })}`)}
        onClearFollowUp={() => addConversationComment(`${WHATSAPP_FOLLOW_UP_MARKER}${JSON.stringify({
          status: 'canceled',
          canceledAt: new Date().toISOString(),
        })}`)}
        onCompleteFollowUp={() => addConversationComment(`${WHATSAPP_FOLLOW_UP_MARKER}${JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
        })}`)}
        onDeleteItem={deleteConversation}
        onSaveAnalysis={saveAnalysis}
      />
    </ConversationContextRail>
  );
}
