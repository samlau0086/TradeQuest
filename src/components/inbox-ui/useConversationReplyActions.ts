import { Dispatch, SetStateAction, useState } from 'react';
import { Client, LiveChatSession } from '../../store';
import { UnifiedCommunicationConversation } from './inboxModel';

interface UseConversationReplyActionsArgs {
  language: string;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  setSelectedTelegramConversation: Dispatch<SetStateAction<UnifiedCommunicationConversation | null>>;
  setTelegramMessages: Dispatch<SetStateAction<any[]>>;
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  setSelectedLiveChatConversation: Dispatch<SetStateAction<UnifiedCommunicationConversation | null>>;
  activeLiveChatSession: LiveChatSession | null;
  activeTelegramClient: Client | null;
  activeTelegramAgentContext: { body: string; additionalContext: string };
  llmMappings: Record<string, string>;
  activeLLMId?: string | null;
  llmConfigs: any[];
  sendLiveChatOperatorMessage: (sessionId: string, body: string) => Promise<any>;
  updateLiveChatSession: (sessionId: string, updates: Partial<LiveChatSession>) => Promise<any>;
  runLiveChatAgent: (sessionId: string) => Promise<any>;
  fetchLiveChatMessages: (sessionId: string) => Promise<any>;
  patchUnifiedConversation: (conversation: UnifiedCommunicationConversation, updates: any) => Promise<any>;
  refreshUnifiedConversationData: () => Promise<void>;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useConversationReplyActions({
  language,
  selectedTelegramConversation,
  setSelectedTelegramConversation,
  setTelegramMessages,
  selectedLiveChatConversation,
  setSelectedLiveChatConversation,
  activeLiveChatSession,
  activeTelegramClient,
  activeTelegramAgentContext,
  llmMappings,
  activeLLMId,
  llmConfigs,
  sendLiveChatOperatorMessage,
  updateLiveChatSession,
  runLiveChatAgent,
  fetchLiveChatMessages,
  patchUnifiedConversation,
  refreshUnifiedConversationData,
  notify,
}: UseConversationReplyActionsArgs) {
  const [telegramReply, setTelegramReply] = useState('');
  const [isSendingTelegramReply, setIsSendingTelegramReply] = useState(false);
  const [isTelegramMessagesLoading, setIsTelegramMessagesLoading] = useState(false);
  const [liveChatReply, setLiveChatReply] = useState('');
  const [isSendingLiveChatReply, setIsSendingLiveChatReply] = useState(false);
  const [isRunningLiveChatAgent, setIsRunningLiveChatAgent] = useState(false);

  const loadTelegramMessages = async (conversation: UnifiedCommunicationConversation) => {
    setIsTelegramMessagesLoading(true);
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Telegram messages');
      setTelegramMessages(Array.isArray(data.messages) ? data.messages : []);
      if (!conversation.read) {
        await patchUnifiedConversation(conversation, { read: true });
        await refreshUnifiedConversationData();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to load Telegram messages.', 'error');
    } finally {
      setIsTelegramMessagesLoading(false);
    }
  };

  const sendTelegramReply = async () => {
    if (!selectedTelegramConversation || !telegramReply.trim()) return;
    setIsSendingTelegramReply(true);
    try {
      const res = await fetch(`/api/telegram/conversations/${encodeURIComponent(selectedTelegramConversation.source_id)}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ body: telegramReply.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send Telegram message');
      setTelegramReply('');
      await loadTelegramMessages(selectedTelegramConversation);
      await refreshUnifiedConversationData();
      notify(language === 'zh' ? 'Telegram 消息已发送。' : 'Telegram message sent.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to send Telegram message.', 'error');
    } finally {
      setIsSendingTelegramReply(false);
    }
  };

  const draftTelegramReply = async () => {
    if (!selectedTelegramConversation) return;
    const llmId = llmMappings.telegram_customer_service_agent
      || llmMappings.agent_context_suggestions
      || llmMappings.drafting
      || activeLLMId;
    const llmConfig = llmId ? llmConfigs.find(config => config.id === llmId) : null;
    if (!llmConfig) {
      notify(language === 'zh' ? '请先在 AI & Integrations 配置 Telegram/上下文建议模型。' : 'Configure a Telegram/context suggestion AI model first.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          command: `Draft a concise Telegram customer-service reply. Do not send it. Return only the message body.

Rules:
- Reply only to inbound customer intent. Team outbound messages are background only.
- Use the customer's preferred/likely language when available.
- Use product, RAG, AI summary, best next step, and cross-channel history only when helpful.
- If no inbound customer message exists, write a light, low-pressure follow-up instead of pretending the customer asked something.

Current context:
${activeTelegramAgentContext.body}

Broader CRM context:
${activeTelegramAgentContext.additionalContext}`,
          context: {
            channel: 'telegram',
            clientId: activeTelegramClient?.id || selectedTelegramConversation.client_id || null,
            conversationId: selectedTelegramConversation.source_id,
            systemLanguage: language === 'zh' ? 'Chinese' : 'English',
          },
          llmConfig,
          skipKnowledgeBase: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to draft Telegram reply');
      const draft = String(data.result || '').replace(/```[\s\S]*?```/g, match => match.replace(/```(?:text|markdown)?/g, '').replace(/```/g, '')).trim();
      if (!draft) throw new Error('AI returned an empty Telegram draft.');
      setTelegramReply(draft);
      notify(language === 'zh' ? 'Telegram 回复草稿已生成。' : 'Telegram reply draft generated.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to draft Telegram reply.', 'error');
    }
  };

  const toggleTelegramHumanTakeover = async () => {
    if (!selectedTelegramConversation) return;
    const nextHumanTakeover = !selectedTelegramConversation.metadata?.humanTakeover;
    try {
      const res = await fetch(`/api/telegram/conversations/${encodeURIComponent(selectedTelegramConversation.source_id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ humanTakeover: nextHumanTakeover }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update Telegram takeover mode');
      setSelectedTelegramConversation(prev => prev ? {
        ...prev,
        metadata: {
          ...(prev.metadata || {}),
          humanTakeover: nextHumanTakeover,
          priority: data.conversation?.priority ?? prev.metadata?.priority,
        },
      } : prev);
      await refreshUnifiedConversationData();
      notify(
        nextHumanTakeover
          ? (language === 'zh' ? '已开启人工接管，Telegram Agent 将暂停自动回复。' : 'Human takeover enabled. Telegram Agent auto-reply is paused.')
          : (language === 'zh' ? '已关闭人工接管，Telegram Agent 将在新入站消息后自动回复。' : 'Human takeover disabled. Telegram Agent can auto-reply to the next inbound message.'),
        'success'
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to update Telegram takeover mode.', 'error');
    }
  };

  const sendLiveChatReply = async () => {
    if (!selectedLiveChatConversation || !liveChatReply.trim()) return;
    setIsSendingLiveChatReply(true);
    try {
      await sendLiveChatOperatorMessage(selectedLiveChatConversation.source_id, liveChatReply.trim());
      setLiveChatReply('');
      await refreshUnifiedConversationData();
      notify(language === 'zh' ? 'Live Chat 消息已发送。' : 'Live Chat message sent.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to send Live Chat message.', 'error');
    } finally {
      setIsSendingLiveChatReply(false);
    }
  };

  const toggleLiveChatHumanTakeover = async () => {
    if (!selectedLiveChatConversation) return;
    const current = activeLiveChatSession?.humanTakeover ?? selectedLiveChatConversation.metadata?.humanTakeover;
    const nextHumanTakeover = !current;
    try {
      await updateLiveChatSession(selectedLiveChatConversation.source_id, { humanTakeover: nextHumanTakeover } as Partial<LiveChatSession>);
      setSelectedLiveChatConversation(prev => prev ? {
        ...prev,
        metadata: {
          ...(prev.metadata || {}),
          humanTakeover: nextHumanTakeover,
        },
      } : prev);
      await refreshUnifiedConversationData();
      notify(
        nextHumanTakeover
          ? (language === 'zh' ? '已开启人工接管，Live Chat Agent 将暂停自动回复。' : 'Human takeover enabled. Live Chat Agent auto-reply is paused.')
          : (language === 'zh' ? '已交还给 Agent，新访客消息可自动回复。' : 'Handed back to Agent. New visitor messages can trigger auto-replies.'),
        'success'
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to update Live Chat takeover mode.', 'error');
    }
  };

  const runSelectedLiveChatAgent = async () => {
    if (!selectedLiveChatConversation) return;
    setIsRunningLiveChatAgent(true);
    try {
      await runLiveChatAgent(selectedLiveChatConversation.source_id);
      await fetchLiveChatMessages(selectedLiveChatConversation.source_id);
      await refreshUnifiedConversationData();
      notify(language === 'zh' ? 'Live Chat Agent 已运行。' : 'Live Chat Agent ran successfully.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to run Live Chat Agent.', 'error');
    } finally {
      setIsRunningLiveChatAgent(false);
    }
  };

  return {
    telegramReply,
    setTelegramReply,
    isSendingTelegramReply,
    isTelegramMessagesLoading,
    loadTelegramMessages,
    sendTelegramReply,
    draftTelegramReply,
    toggleTelegramHumanTakeover,
    liveChatReply,
    setLiveChatReply,
    isSendingLiveChatReply,
    sendLiveChatReply,
    toggleLiveChatHumanTakeover,
    isRunningLiveChatAgent,
    runSelectedLiveChatAgent,
  };
}
