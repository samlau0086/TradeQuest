import React, { type Dispatch, type SetStateAction } from 'react';
import { type AgentContextSuggestionInsight, type Client } from '../store';
import { AgentContextSuggestions } from './AgentContextSuggestions';
import { ConversationContextRail } from './inbox-ui/ConversationContextRail';
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
    notify('WhatsApp conversation deleted.', 'success');
    onClose();
  };

  return (
    <ConversationContextRail
      variant="rail"
      title="Agent Suggestions"
      description="Analyze WhatsApp, customer, product, and RAG context for reply, follow-up, and internal note actions."
      className={embedded ? 'min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0' : 'border-t border-slate-800 bg-slate-950/60 p-4'}
      collapsible
    >
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
        autoScrollOnOpen={embedded}
        onDraftReply={() => generateWhatsAppMessage(
          body.trim() || (
            latestInboundMessage
              ? `Reply to the latest inbound customer WhatsApp message from ${contactName}: ${latestInboundMessage.body}`
              : `Draft a polite WhatsApp follow-up to ${contactName}. There is no inbound customer message yet, so do not answer our own outbound messages.`
          )
        )}
        onAddComment={() => addConversationComment(`Agent suggestion: review WhatsApp conversation with ${contactName} and prepare the next best reply.`)}
        followUpAt={whatsappFollowUp?.dueAt}
        followUpNote={whatsappFollowUp?.note}
        onSetFollowUp={(dueAt, note) => addConversationComment(`${WHATSAPP_FOLLOW_UP_MARKER}${JSON.stringify({
          status: 'open',
          dueAt,
          note: note || `Follow up WhatsApp conversation with ${contactName}.`,
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
