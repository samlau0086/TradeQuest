import { useMemo, useState } from 'react';
import { AgentHubAgent, AgentHubChatMessage as AgentChatMessage, useStore } from '../../../store';
import { useAuthStore } from '../../../authStore';
import { AgentHubPendingItem, formatChatRunResult } from '../shared';

interface UseAgentChatOptions {
  language: string;
  agentHubAgents: AgentHubAgent[];
  globalAgent: AgentHubAgent;
  pendingItems: AgentHubPendingItem[];
  runAgentNow: (agent: AgentHubAgent, objective?: string, options?: { preserveTab?: boolean; skipRefresh?: boolean }) => Promise<any>;
  approveItem: (item: AgentHubPendingItem) => Promise<void>;
  rejectItem: (item: AgentHubPendingItem) => void;
}

const isExecutionIntent = (value: string) => (
  /(执行|开始|运行|获取|生成|导入|富集|分析|评分|打分|跟进|发送|起草|创建|run|execute|start|acquire|get|import|enrich|analyze|score|send|draft|create)/i.test(value)
);

export function useAgentChat({
  language,
  agentHubAgents,
  globalAgent,
  pendingItems,
  runAgentNow,
  approveItem,
  rejectItem
}: UseAgentChatOptions) {
  const {
    agentChatMessages,
    setAgentChatMessages,
    clients,
    incrementAgentHubTaskCount,
    updateAgentHubAgent,
    notify
  } = useStore();
  const { token } = useAuthStore();
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [chatRunningAgentId, setChatRunningAgentId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);

  const savedGlobalAgent = agentHubAgents.find(agent => agent.id === 'global_agent');
  const activeChatAgent = agentHubAgents.find(agent => agent.id === chatAgentId) || globalAgent;
  const chatAgents = savedGlobalAgent ? agentHubAgents : [globalAgent, ...agentHubAgents];
  const visibleChatMessages = useMemo(() => (
    agentChatMessages
      .filter(message => message.agentId === activeChatAgent?.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-30)
  ), [activeChatAgent?.id, agentChatMessages]);

  const resolveMentionedClients = (raw: string) => {
    const lower = raw.toLowerCase();
    return clients
      .filter(client => {
        const labels = [client.name, client.company, client.id]
          .filter(Boolean)
          .map(value => String(value).toLowerCase());
        return labels.some(label => label && lower.includes(`@${label}`));
      })
      .slice(0, 5);
  };

  const formatMentionedClientContext = (mentionedClients: typeof clients) => (
    mentionedClients.map(client => ({
      id: client.id,
      name: client.name,
      company: client.company,
      status: client.status,
      country: client.country,
      preferredLanguage: client.preferredLanguage,
      tags: client.tags || [],
      contactMethods: client.contactMethods || [],
      leadScore: client.leadScore,
      leadSummary: client.leadSummary,
      leadNextStep: client.leadNextStep,
      agentSummary: client.agentSummary,
      agentNextStep: client.agentNextStep
    }))
  );

  const buildClientAwareObjective = (content: string, mentionedClients: typeof clients) => {
    if (mentionedClients.length === 0) return content;
    const clientLines = mentionedClients.map(client => `${client.name}${client.company ? ` / ${client.company}` : ''} (${client.id})`).join('; ');
    return `${content}\n\nTarget client context: ${clientLines}. Operate only on the referenced client(s) unless the user explicitly asks for a global run.`;
  };

  const buildAgentChatUsage = (agent: AgentHubAgent) => {
    const tools = agent.tools || [];
    const canAcquire = tools.some(tool => tool.startsWith('lead.acquire') || tool === 'public_pool.import');
    const canAnalyze = tools.some(tool => ['lead.analyze', 'lead.score', 'client.summarize', 'next_step.recommend', 'knowledge.search', 'product.read'].includes(tool));
    const canEmail = tools.some(tool => tool.startsWith('email.'));
    const canWhatsApp = tools.some(tool => tool.startsWith('whatsapp.'));
    const canWriteCrm = tools.some(tool => /^(client|lead)\.(update|comment|log|tag|stage|create)/.test(tool));
    const canPlan = tools.some(tool => tool.includes('plan') || tool.includes('global_agent'));
    const modes = [
      canAcquire && (language === 'zh' ? '获取/导入线索' : 'acquire or import leads'),
      canAnalyze && (language === 'zh' ? '分析客户、评分和推荐下一步' : 'analyze accounts, score leads, and recommend next steps'),
      canEmail && (language === 'zh' ? '起草/安排/发送邮件（高风险动作会进入审批）' : 'draft, schedule, or send email, with risky actions routed to approval'),
      canWhatsApp && (language === 'zh' ? '起草/发送 WhatsApp 消息（遵循账号与额度策略）' : 'draft or send WhatsApp messages while respecting account and quota rules'),
      canWriteCrm && (language === 'zh' ? '更新 CRM 记录、备注、标签和日志' : 'update CRM records, comments, tags, and logs'),
      canPlan && (language === 'zh' ? '拆解跨模块计划并生成可审核执行项' : 'break work into cross-module plans and reviewable execution items')
    ].filter(Boolean);
    const mentionHint = language === 'zh'
      ? '在聊天输入 @客户名称 可引用客户资料；不引用客户时，我会按当前 Agent 的职责判断是否执行全局任务。'
      : 'Type @client name to reference a customer; without a customer mention, I will decide whether the request should run globally based on this agent role.';
    const executionHint = agent.guardrail === 'auto'
      ? (language === 'zh' ? '该 Agent 当前允许自动执行低风险授权工具；需要审批的动作会在聊天窗口显示按钮。' : 'This agent can auto-run authorized low-risk tools; approval-required actions will show confirmation buttons in chat.')
      : (language === 'zh' ? '该 Agent 当前以人工审核为主；会先生成计划或待审批动作，再由你确认。' : 'This agent is review-first; it will prepare plans or approval items before execution.');
    const examples = [
      canAcquire && (language === 'zh' ? '例：帮我基于产品和知识库获取 10 条太阳能运维客户线索' : 'Example: find 10 solar operations leads based on our products and knowledge base'),
      canAnalyze && (language === 'zh' ? '例：分析 @客户名称 的成交率和最佳下一步' : 'Example: analyze @Client Name conversion probability and best next step'),
      canEmail && (language === 'zh' ? '例：为 @客户名称 起草一封首次跟进邮件' : 'Example: draft a first follow-up email for @Client Name'),
      canWhatsApp && (language === 'zh' ? '例：给 @客户名称 生成 WhatsApp 破冰消息' : 'Example: create a WhatsApp ice-breaking message for @Client Name')
    ].filter(Boolean).slice(0, 2);
    return [
      modes.length
        ? (language === 'zh' ? `你可以${modes.join('、')}。` : `Use this agent to ${modes.join(', ')}.`)
        : (language === 'zh' ? '你可以把业务目标直接告诉这个 Agent，它会根据授权工具判断可执行范围。' : 'Tell this agent the business goal; it will decide what it can do from its authorized tools.'),
      mentionHint,
      executionHint,
      ...examples
    ].join(' ');
  };

  const persistAgentHubState = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;
    const state = useStore.getState();
    const response = await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        agentHubAgents: state.agentHubAgents,
        deletedAgentHubAgentIds: state.deletedAgentHubAgentIds,
        agentRunRecords: state.agentRunRecords,
        agentChatMessages: state.agentChatMessages,
        agentIdempotencyRecords: state.agentIdempotencyRecords,
        agentHarnessRuns: state.agentHarnessRuns,
        globalAgentPlans: state.globalAgentPlans
      })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save agent settings');
    }
  };

  const persistAgentChatMessages = async (messages: AgentChatMessage[]) => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;
    const response = await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ agentChatMessages: messages })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save chat history');
    }
  };

  const sendAgentChat = async () => {
    const targetAgent = activeChatAgent || globalAgent;
    const content = chatInput.trim();
    const mentionedClients = resolveMentionedClients(content);
    const clientContext = formatMentionedClientContext(mentionedClients);
    if (!targetAgent || !content || chatSending) return;
    const now = new Date().toISOString();
    const userMessage: AgentChatMessage = {
      id: `chat_${Date.now()}_user`,
      agentId: targetAgent.id,
      agentName: targetAgent.name,
      role: 'user',
      content,
      createdAt: now
    };
    const nextUserMessages = [...agentChatMessages, userMessage]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-300);
    setAgentChatMessages(nextUserMessages);
    setChatInput('');
    setChatSending(true);
    try {
      const response = await fetch('/api/agent-hub/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          agentId: targetAgent.id,
          agent: targetAgent,
          message: content,
          contextClients: clientContext,
          history: nextUserMessages.filter(item => item.agentId === targetAgent.id).slice(-10).map(item => ({
            role: item.role,
            agentName: item.agentName,
            content: item.content,
            createdAt: item.createdAt
          }))
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to chat with agent');
      incrementAgentHubTaskCount(targetAgent.id);
      const reply: AgentChatMessage = {
        id: `chat_${Date.now()}_agent`,
        agentId: targetAgent.id,
        agentName: targetAgent.name,
        role: 'agent',
        content: data.reply || (language === 'zh' ? '已记录。' : 'Noted.'),
        createdAt: new Date().toISOString()
      };
      const nextMessages = [...useStore.getState().agentChatMessages, reply]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-300);
      setAgentChatMessages(nextMessages);
      const shouldRunFromChat = !!data.shouldRun || isExecutionIntent(content);
      if (shouldRunFromChat) {
        const loadingMessageId = `chat_${Date.now()}_running`;
        const loadingMessage: AgentChatMessage = {
          id: loadingMessageId,
          agentId: targetAgent.id,
          agentName: targetAgent.name,
          role: 'agent',
          content: language === 'zh' ? '正在执行任务...' : 'Running task...',
          createdAt: new Date().toISOString()
        };
        setChatRunningAgentId(targetAgent.id);
        setAgentChatMessages(messages => [...messages, loadingMessage]);
        try {
          const result = await runAgentNow(targetAgent, data.runObjective || buildClientAwareObjective(content, mentionedClients), { preserveTab: true, skipRefresh: true });
          const executionSummary = formatChatRunResult(result, language);
          const statusMessage: AgentChatMessage = {
            id: loadingMessageId,
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            role: 'agent',
            content: language === 'zh' ? `任务执行完成。${executionSummary}` : `Task completed. ${executionSummary}`,
            createdAt: new Date().toISOString(),
            action: targetAgent.guardrail === 'auto' || !result?.runId || !result?.relatedRunType
              ? undefined
              : { type: 'approval', kind: result.relatedRunType, id: result.runId }
          };
          setAgentChatMessages(messages => messages.map(message => message.id === loadingMessageId ? statusMessage : message));
        } catch {
          const statusMessage: AgentChatMessage = {
            id: loadingMessageId,
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            role: 'agent',
            content: language === 'zh' ? '任务执行失败，请查看通知或运行记录。' : 'Task execution failed. Check the notification or run history.',
            createdAt: new Date().toISOString()
          };
          setAgentChatMessages(messages => messages.map(message => message.id === loadingMessageId ? statusMessage : message));
        } finally {
          setChatRunningAgentId(null);
        }
      }
      if (data.soulPatch) {
        const current = useStore.getState().agentHubAgents.find(agent => agent.id === targetAgent.id) || targetAgent;
        updateAgentHubAgent(targetAgent.id, {
          evolutionLog: [{
            id: `evo_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            source: 'chat' as const,
            summary: data.summary || (language === 'zh' ? '来自 Agent 聊天的进化建议' : 'Evolution proposal from Agent chat'),
            proposal: data.soulPatch,
            status: 'proposed' as const,
            createdAt: new Date().toISOString()
          }, ...(current.evolutionLog || [])].slice(0, 50)
        });
        void persistAgentHubState();
        notify(language === 'zh' ? '已生成进化建议，请到该 Agent 的 Soul 区块审核。' : 'Evolution proposal created. Review it in this agent Soul section.', 'info');
      }
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : (language === 'zh' ? 'Agent 聊天失败。' : 'Agent chat failed.'), 'error');
    } finally {
      setChatSending(false);
    }
  };

  const deleteChatMessage = (messageId: string) => {
    const nextMessages = useStore.getState().agentChatMessages.filter(message => message.id !== messageId);
    setAgentChatMessages(nextMessages);
    void persistAgentChatMessages(nextMessages)
      .then(() => notify(language === 'zh' ? '聊天消息已删除。' : 'Chat message deleted.', 'success'))
      .catch((error) => notify(error.message || (language === 'zh' ? '保存聊天记录失败。' : 'Failed to save chat history.'), 'error'));
  };

  const clearActiveAgentChat = () => {
    if (!activeChatAgent) return;
    const nextMessages = useStore.getState().agentChatMessages.filter(message => message.agentId !== activeChatAgent.id);
    setAgentChatMessages(nextMessages);
    void persistAgentChatMessages(nextMessages)
      .then(() => notify(language === 'zh' ? '当前智能体聊天记录已清空。' : 'Current agent chat history cleared.', 'success'))
      .catch((error) => notify(error.message || (language === 'zh' ? '保存聊天记录失败。' : 'Failed to save chat history.'), 'error'));
  };

  const handleChatApproval = async (message: AgentChatMessage, approve: boolean) => {
    if (!message.action || message.action.type !== 'approval') return;
    const item = pendingItems.find(entry => entry.kind === message.action?.kind && entry.id === message.action?.id);
    if (!item) {
      setAgentChatMessages(messages => messages.map(entry => entry.id === message.id ? {
        ...entry,
        action: undefined,
        content: language === 'zh' ? '该审核任务已处理或不存在。' : 'This review item has already been handled or no longer exists.'
      } : entry));
      return;
    }
    if (approve) {
      setAgentChatMessages(messages => messages.map(entry => entry.id === message.id ? {
        ...entry,
        content: language === 'zh' ? '已批准，正在执行任务...' : 'Approved. Running task...'
      } : entry));
      await approveItem(item);
      setAgentChatMessages(messages => messages.map(entry => entry.id === message.id ? {
        ...entry,
        action: undefined,
        content: language === 'zh' ? '已批准并执行完成。请查看上方通知或运行记录中的详细结果。' : 'Approved and executed. Check the notification or run history for details.'
      } : entry));
    } else {
      rejectItem(item);
      setAgentChatMessages(messages => messages.map(entry => entry.id === message.id ? {
        ...entry,
        action: undefined,
        content: language === 'zh' ? '已拒绝执行任务。' : 'Execution rejected.'
      } : entry));
    }
  };

  return {
    activeChatAgent,
    chatAgents,
    chatAgentId,
    chatInput,
    chatRunningAgentId,
    chatSending,
    visibleChatMessages,
    buildAgentChatUsage,
    clearActiveAgentChat,
    deleteChatMessage,
    handleChatApproval,
    sendAgentChat,
    setChatAgentId,
    setChatInput
  };
}
