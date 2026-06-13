import React, { useEffect, useMemo, useState } from 'react';
import { AgentHubAgent, AgentHubChatMessage as AgentChatMessage, AgentHubStatus, AgentTask, useStore } from '../store';
import { GlobalAgent } from './GlobalAgent';
import { useTranslation } from '../lib/i18n';
import { useAuthStore } from '../authStore';
import {
  AgentHubTab,
  emptyAgent,
  formatChatRunResult,
  linkedOpportunityIdFromTask,
  taskFromOpportunityForView
} from './agent-hub/shared';
import { AgentHubHeader } from './agent-hub/AgentHubHeader';
import { AgentConsolePanel } from './agent-hub/AgentConsolePanel';
import { AgentFleetPanel } from './agent-hub/AgentFleetPanel';
import { AgentTaskQueuePanel } from './agent-hub/AgentTaskQueuePanel';
import { ApprovalCenterPanel } from './agent-hub/ApprovalCenterPanel';
import { type AgentTraceRun, ExecutionLogsPanel } from './agent-hub/ExecutionLogsPanel';

export function AgentHub() {
  const {
    language,
    agentHubAgents,
    addAgentHubAgent,
    updateAgentHubAgent,
    resetAgentHubAgentToDefault,
    incrementAgentHubTaskCount,
    deleteAgentHubAgent,
    agentHarnessRuns,
    globalAgentPlans,
    agentRunRecords,
    agentOpportunities,
    agentTasks,
    agentOpportunityRoutingPolicy,
    updateAgentOpportunityRoutingPolicy,
    updateAgentOpportunity,
    deleteAgentOpportunity,
    updateAgentTask,
    deleteAgentTask,
    agentChatMessages,
    setAgentChatMessages,
    clients,
    updateAgentHarnessRun,
    deleteAgentHarnessRun,
    updateGlobalAgentPlan,
    deleteGlobalAgentPlan,
    updateAgentRunRecord,
    deleteAgentRunRecord,
    agentExecutionPolicy,
    updateAgentExecutionPolicy,
    fetchUserSettings,
    notify
  } = useStore();
  const { token } = useAuthStore();
  const t = useTranslation(language);
  const [tab, setTab] = useState<AgentHubTab>('opportunities');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentHubAgents[0]?.id || null);
  const [draftAgent, setDraftAgent] = useState<ReturnType<typeof emptyAgent> | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);
  const [dispatchingOpportunityId, setDispatchingOpportunityId] = useState<string | null>(null);
  const [schedulerSummary, setSchedulerSummary] = useState<string | null>(null);
  const [schedulerAgentDetails, setSchedulerAgentDetails] = useState<any[]>([]);
  const [logDisplayLimit, setLogDisplayLimit] = useState(30);
  const [expandedTraceRunIds, setExpandedTraceRunIds] = useState<string[]>([]);
  const [agentQueueFilter, setAgentQueueFilter] = useState<'system' | 'custom'>('system');
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [chatRunningAgentId, setChatRunningAgentId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);

  useEffect(() => {
    if (tab === 'fleet') return;
    const interval = window.setInterval(() => {
      void fetchUserSettings();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [fetchUserSettings, tab]);

  const pendingItems = useMemo(() => [
    ...agentHarnessRuns.filter(run => run.status === 'pending_review').map(run => ({ kind: 'harness' as const, id: run.id, title: run.summary, agent: 'Execution Engine', body: run.objective, createdAt: run.createdAt })),
    ...globalAgentPlans.filter(plan => plan.status === 'pending_review').map(plan => ({ kind: 'global' as const, id: plan.id, title: plan.summary, agent: 'Global Orchestrator', body: plan.objective, createdAt: plan.createdAt }))
  ], [agentHarnessRuns, globalAgentPlans]);

  const normalizeRunStep = (step: any) => ({
    title: step.title || step.tool || step.actionType || 'agent.run',
    tool: step.tool || step.actionType || step.title || 'agent.run',
    status: step.status || 'pending',
    result: step.result || step.error || ''
  });

  const isLegacySignalScannerPendingTrace = (run: any) => (
    run.summary?.includes('Signal Scanner Agent') &&
    run.status === 'approved' &&
    run.steps?.length === 1 &&
    run.steps?.[0]?.tool === 'client.read' &&
    run.steps?.[0]?.status === 'pending'
  );

  const runLogs = useMemo(() => [
    ...agentHarnessRuns
      .filter(run => !isLegacySignalScannerPendingTrace(run))
      .map(run => ({
        kind: 'harness' as const,
        id: run.id,
        title: run.summary,
        agent: 'Execution Engine',
        status: run.status,
        steps: run.steps.map(normalizeRunStep),
        createdAt: run.createdAt
      })),
    ...globalAgentPlans.map(plan => ({
      kind: 'global' as const,
      id: plan.id,
      title: plan.summary,
      agent: 'Global Orchestrator',
      status: plan.status,
      steps: plan.steps.map(normalizeRunStep),
      createdAt: plan.createdAt
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [agentHarnessRuns, globalAgentPlans]);
  const visibleOpportunities = agentOpportunities
    .filter(opportunity => opportunity.status !== 'ignored')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const visibleTasks = useMemo(() => {
    const byId = new Map<string, AgentTask>();
    agentTasks.filter(task => task.status !== 'ignored').forEach(task => byId.set(task.id, task));
    visibleOpportunities.map(taskFromOpportunityForView).forEach(task => {
      const existing = byId.get(task.id);
      byId.set(task.id, existing ? { ...existing, ...task, retryCount: existing.retryCount || 0 } : task);
    });
    return Array.from(byId.values())
      .filter(task => task.status !== 'ignored')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  }, [agentTasks, visibleOpportunities]);
  const dispatchableTasks = visibleTasks.filter(task => !!linkedOpportunityIdFromTask(task) && ['open', 'failed', 'skipped'].includes(task.status));

  const computedAgents = agentHubAgents.map(agent => ({
    ...agent,
    tasksCompleted: agent.tasksCompleted + runLogs.filter(run => run.agent.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()) && run.status === 'completed').length
  }));
  const systemAgents = computedAgents.filter(agent => agent.builtIn);
  const customAgents = computedAgents.filter(agent => !agent.builtIn);
  const visibleQueueAgents = agentQueueFilter === 'system' ? systemAgents : customAgents;
  const activeQueueMeta = agentQueueFilter === 'system'
    ? {
        title: language === 'zh' ? '系统级智能体' : 'System Agents',
        description: language === 'zh'
          ? '内置 AI 能力与核心业务智能体。不可删除，但可以配置权限、策略与运行周期。'
          : 'Built-in AI operations and core business agents. They cannot be deleted, but permissions, policy, and schedules can be configured.'
      }
    : {
        title: language === 'zh' ? '自定义智能体' : 'Custom Agents',
        description: language === 'zh'
          ? '你为具体业务流程创建的智能体，可新增、配置和删除。'
          : 'Agents created for your own workflows. They can be added, configured, and deleted.'
      };
  const activeAgents = computedAgents.filter(agent => agent.status === 'active').length;
  const scheduledAgents = computedAgents.filter(agent => agent.scheduleEnabled).length;
  const eventTriggeredAgents = computedAgents.filter(agent => (agent.eventTriggers || []).length > 0).length;
  const reviewRequiredCount = pendingItems.length;
  const selectedVisibleAgent = visibleQueueAgents.find(agent => agent.id === selectedAgentId);
  const selectedAgent = draftAgent || selectedVisibleAgent || visibleQueueAgents[0] || emptyAgent();
  const savedGlobalAgent = agentHubAgents.find(agent => agent.id === 'global_agent');
  const globalAgent = savedGlobalAgent || ({
    ...emptyAgent(),
    id: 'global_agent',
    name: 'Global Orchestrator',
    instructions: 'Coordinate CRM-wide acquisition, enrichment, follow-up, and conversion plans.',
    status: 'active',
    tools: ['global_agent.plan'],
    tasksCompleted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as AgentHubAgent);
  const activeChatAgent = agentHubAgents.find(agent => agent.id === chatAgentId) || globalAgent;
  const chatAgents = savedGlobalAgent ? agentHubAgents : [globalAgent, ...agentHubAgents];
  const visibleChatMessages = agentChatMessages
    .filter(message => message.agentId === activeChatAgent?.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-30);
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
  useEffect(() => {
    if (draftAgent || tab !== 'fleet') return;
    const selectedVisible = visibleQueueAgents.some(agent => agent.id === selectedAgentId);
    if (!selectedVisible) {
      setSelectedAgentId(visibleQueueAgents[0]?.id || null);
    }
  }, [draftAgent, selectedAgentId, tab, visibleQueueAgents]);
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
  const isExecutionIntent = (value: string) => (
    /(执行|开始|运行|获取|生成|导入|富集|分析|评分|打分|跟进|发送|起草|创建|run|execute|start|acquire|get|import|enrich|analyze|score|send|draft|create)/i.test(value)
  );
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
  const saveAgent = (agent: Omit<AgentHubAgent, 'createdAt' | 'updatedAt' | 'tasksCompleted'> | Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'>) => {
    const existingAgent = 'id' in agent ? agentHubAgents.find(item => item.id === agent.id) : null;
    const normalizedAgent = {
      ...agent,
      name: existingAgent?.builtIn ? existingAgent.name : agent.name,
      status: agent.scheduleEnabled && agent.status === 'idle' ? 'active' as AgentHubStatus : agent.status
    };
    if ('id' in agent) {
      updateAgentHubAgent(agent.id, normalizedAgent as AgentHubAgent);
      setSelectedAgentId(agent.id);
    } else {
      const id = addAgentHubAgent(normalizedAgent);
      setSelectedAgentId(id);
    }
    setDraftAgent(null);
    void persistAgentHubState()
      .then(() => notify('id' in agent ? t('Agent configuration saved.') : t('Agent created.'), 'success'))
      .catch((error) => notify(error.message || t('Failed to save agent settings.'), 'error'));
  };

  const deleteSelectedAgent = (agent: AgentHubAgent) => {
    if (agent.builtIn) {
      notify(language === 'zh' ? '系统级智能体不可删除。' : 'System agents cannot be deleted.', 'warning');
      return;
    }
    deleteAgentHubAgent(agent.id);
    const nextAgent = agentHubAgents.find(item => item.id !== agent.id) || null;
    setSelectedAgentId(nextAgent?.id || null);
    setDraftAgent(null);
    void persistAgentHubState()
      .then(() => notify(language === 'zh' ? '智能体已删除。' : 'Agent deleted.', 'success'))
      .catch((error) => notify(error.message || t('Failed to save agent settings.'), 'error'));
  };

  const resetSystemAgent = (agent: AgentHubAgent) => {
    const restored = resetAgentHubAgentToDefault(agent.id);
    if (!restored) {
      notify(language === 'zh' ? '未找到系统智能体的默认配置。' : 'No default configuration found for this system agent.', 'error');
      return null;
    }
    setSelectedAgentId(restored.id);
    setDraftAgent(null);
    void persistAgentHubState()
      .then(() => notify(language === 'zh' ? '系统智能体已恢复默认最佳实践配置。' : 'System agent restored to the default best-practice configuration.', 'success'))
      .catch((error) => notify(error.message || t('Failed to save agent settings.'), 'error'));
    return restored;
  };

  const runAgentNow = async (agent: AgentHubAgent, objective?: string, options?: { preserveTab?: boolean; skipRefresh?: boolean }) => {
    setRunningAgentId(agent.id);
    try {
      const response = await fetch(`/api/agent-hub/agents/${encodeURIComponent(agent.id)}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ objective })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to run agent');
      if (!options?.skipRefresh) {
        await fetchUserSettings();
      }
      notify(agent.guardrail === 'auto'
        ? (language === 'zh' ? '智能体已开始执行。' : 'Agent run started.')
        : (language === 'zh' ? '已创建待审核的智能体运行。' : 'Agent run created for review.'),
        'success'
      );
      if (!options?.preserveTab) {
        setTab(agent.guardrail === 'auto' ? 'runs' : 'approvals');
      }
      return data;
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : (language === 'zh' ? '智能体执行失败。' : 'Failed to run agent.'), 'error');
    } finally {
      setRunningAgentId(null);
    }
  };

  const runOpportunity = async (opportunity: typeof agentOpportunities[number]) => {
    const agent = agentHubAgents.find(item => item.id === opportunity.recommendedAgentId);
    if (!agent) {
      notify(language === 'zh' ? '未找到推荐智能体。' : 'Recommended agent was not found.', 'error');
      return;
    }
    updateAgentOpportunity(opportunity.id, { status: 'running' });
    const result = await runAgentNow(agent, opportunity.objective, { preserveTab: true });
    updateAgentOpportunity(opportunity.id, {
      status: result ? 'completed' : 'open',
      completedAt: result ? new Date().toISOString() : undefined
    });
  };

  const dispatchOpportunity = async (opportunity: typeof agentOpportunities[number]) => {
    setDispatchingOpportunityId(opportunity.id);
    updateAgentOpportunity(opportunity.id, { status: 'queued' });
    try {
      const response = await fetch(`/api/agent-hub/opportunities/${encodeURIComponent(opportunity.id)}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to dispatch opportunity');
      await fetchUserSettings();
      const reviewStatus = data.result?.reviewStatus;
      notify(
        reviewStatus === 'pending_review'
          ? (language === 'zh' ? '机会任务已派发，等待人工审核。' : 'Opportunity dispatched and waiting for approval.')
          : (language === 'zh' ? '机会任务已派发并执行。' : 'Opportunity dispatched and executed.'),
        'success'
      );
    } catch (error) {
      console.error(error);
      updateAgentOpportunity(opportunity.id, {
        status: 'failed',
        resultSummary: error instanceof Error ? error.message : 'Failed to dispatch opportunity.',
        completedAt: new Date().toISOString()
      });
      notify(error instanceof Error ? error.message : (language === 'zh' ? '机会任务派发失败。' : 'Failed to dispatch opportunity.'), 'error');
    } finally {
      setDispatchingOpportunityId(null);
    }
  };

  const taskOpportunityId = (task: AgentTask) => linkedOpportunityIdFromTask(task);

  const updateTaskAndLinkedOpportunity = (task: AgentTask, taskUpdates: Partial<AgentTask>, opportunityUpdates?: any) => {
    updateAgentTask(task.id, taskUpdates);
    const opportunityId = taskOpportunityId(task);
    if (opportunityId) updateAgentOpportunity(opportunityId, opportunityUpdates || taskUpdates as any);
  };

  const deleteTaskAndLinkedOpportunity = (task: AgentTask) => {
    deleteAgentTask(task.id);
    const opportunityId = taskOpportunityId(task);
    if (opportunityId) deleteAgentOpportunity(opportunityId);
  };

  const updateTasksForRun = (runId: string, runType: 'harness' | 'global', updates: Partial<AgentTask>) => {
    agentTasks
      .filter(task => task.runId === runId && task.runType === runType)
      .forEach(task => updateAgentTask(task.id, updates));
  };

  const dispatchTask = async (task: AgentTask) => {
    setDispatchingOpportunityId(task.id);
    const queuedAt = new Date().toISOString();
    updateTaskAndLinkedOpportunity(task, { status: 'queued', queuedAt }, { status: 'queued' });
    try {
      const response = await fetch(`/api/agent-hub/tasks/${encodeURIComponent(task.id)}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to dispatch task');
      await fetchUserSettings();
      const reviewStatus = data.result?.reviewStatus;
      notify(
        reviewStatus === 'pending_review'
          ? (language === 'zh' ? '任务已派发，等待人工审核。' : 'Task dispatched and waiting for approval.')
          : (language === 'zh' ? '任务已派发并执行。' : 'Task dispatched and executed.'),
        'success'
      );
    } catch (error) {
      console.error(error);
      updateTaskAndLinkedOpportunity(task, {
        status: 'failed',
        resultSummary: error instanceof Error ? error.message : 'Failed to dispatch task.',
        completedAt: new Date().toISOString()
      }, {
        status: 'failed',
        resultSummary: error instanceof Error ? error.message : 'Failed to dispatch task.',
        completedAt: new Date().toISOString()
      });
      notify(error instanceof Error ? error.message : (language === 'zh' ? '任务派发失败。' : 'Failed to dispatch task.'), 'error');
    } finally {
      setDispatchingOpportunityId(null);
    }
  };

  const runAllDispatchableOpportunities = async () => {
    for (const task of dispatchableTasks.slice(0, 20)) {
      // eslint-disable-next-line no-await-in-loop
      await dispatchTask(task);
    }
  };

  const approveItem = async (item: typeof pendingItems[number]) => {
    const approvedAt = new Date().toISOString();
    if (item.kind === 'harness') updateAgentHarnessRun(item.id, { status: 'running', approvedAt });
    if (item.kind === 'global') updateGlobalAgentPlan(item.id, { status: 'approved', approvedAt });
    updateTasksForRun(item.id, item.kind, {
      status: item.kind === 'harness' ? 'running' : 'queued',
      approvalStatus: 'approved',
      queuedAt: approvedAt,
      startedAt: item.kind === 'harness' ? approvedAt : undefined,
      resultSummary: language === 'zh' ? '人工已批准，正在进入执行流程。' : 'Approved by a human and entering execution.'
    });
    const linkedRecord = agentRunRecords.find(record => record.relatedRunId === item.id && record.relatedRunType === item.kind);
    if (linkedRecord) {
      updateAgentRunRecord(linkedRecord.id, {
        status: item.kind === 'harness' ? 'running' : 'approved',
        actualResult: item.kind === 'harness'
          ? (language === 'zh' ? '人工已批准计划运行，正在执行配置的工具。' : 'Human approved the planned agent run. Executing configured tools now.')
          : (language === 'zh' ? '人工已批准计划运行。' : 'Human approved the planned agent run.')
      });
    }
    if (item.kind !== 'harness') return;
    try {
      const response = await fetch(`/api/agent-hub/harness-runs/${item.id}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to execute Agent Hub run');
      await fetchUserSettings();
      const result = data.result || {};
      notify(
        `${t('Agent run completed.') || 'Agent run completed.'} ${t('Acted') || 'Acted'}: ${result.acted || 0}, ${t('Skipped') || 'Skipped'}: ${result.skipped || 0}`,
        'success'
      );
    } catch (error) {
      console.error(error);
      updateAgentHarnessRun(item.id, { status: 'failed' });
      updateTasksForRun(item.id, item.kind, {
        status: 'failed',
        resultSummary: error instanceof Error ? error.message : (language === 'zh' ? '智能体运行失败。' : 'Agent Hub run failed.'),
        completedAt: new Date().toISOString()
      });
      if (linkedRecord) {
        updateAgentRunRecord(linkedRecord.id, {
          status: 'failed',
          actualResult: error instanceof Error ? error.message : (language === 'zh' ? '智能体运行失败。' : 'Agent Hub run failed.'),
          completedAt: new Date().toISOString()
        });
      }
      notify(error instanceof Error ? error.message : 'Agent Hub run failed.', 'error');
    }
  };

  const rejectItem = (item: typeof pendingItems[number]) => {
    const rejectedAt = new Date().toISOString();
    if (item.kind === 'harness') updateAgentHarnessRun(item.id, { status: 'rejected', rejectedAt, rejectedReason: 'Rejected from Agent Hub' });
    if (item.kind === 'global') updateGlobalAgentPlan(item.id, { status: 'rejected', rejectedAt, rejectedReason: 'Rejected from Agent Hub' });
    updateTasksForRun(item.id, item.kind, {
      status: 'skipped',
      approvalStatus: 'rejected',
      resultSummary: language === 'zh' ? '人工已拒绝执行任务。' : 'Human rejected this execution task.',
      completedAt: rejectedAt
    });
    const linkedOpportunity = agentOpportunities.find(opportunity => opportunity.relatedRunId === item.id && opportunity.relatedRunType === item.kind);
    if (linkedOpportunity) {
      updateAgentOpportunity(linkedOpportunity.id, {
        status: 'failed',
        resultSummary: language === 'zh' ? '人工已拒绝机会任务派发。' : 'Human rejected this opportunity dispatch.',
        completedAt: new Date().toISOString()
      });
    }
    const linkedRecord = agentRunRecords.find(record => record.relatedRunId === item.id && record.relatedRunType === item.kind);
    if (linkedRecord) {
      updateAgentRunRecord(linkedRecord.id, {
        status: 'rejected',
        actualResult: language === 'zh' ? '人工已拒绝计划运行。' : 'Human rejected the planned agent run.',
        completedAt: new Date().toISOString()
      });
    }
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

  const deleteRunLog = (run: AgentTraceRun) => {
    if (run.kind === 'harness') deleteAgentHarnessRun(run.id);
    if (run.kind === 'global') deleteGlobalAgentPlan(run.id);
    setExpandedTraceRunIds(ids => ids.filter(id => id !== run.id));
  };

  const clearTraceLogs = async () => {
    try {
      await fetch('/api/agent-hub/logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target: 'trace' })
      });
      runLogs.forEach(run => deleteRunLog(run));
      await fetchUserSettings();
      notify(t('Logs cleared.'), 'success');
    } catch (error) {
      console.error(error);
      notify(t('Failed to clear logs.'), 'error');
    }
  };

  const clearAgentRunRecords = async () => {
    try {
      await fetch('/api/agent-hub/logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target: 'records' })
      });
      agentRunRecords.forEach(record => deleteAgentRunRecord(record.id));
      await fetchUserSettings();
      notify(t('Logs cleared.'), 'success');
    } catch (error) {
      console.error(error);
      notify(t('Failed to clear logs.'), 'error');
    }
  };

  const runSchedulerNow = async () => {
    setSchedulerRunning(true);
    try {
      const response = await fetch('/api/agent-hub/scheduler/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to run scheduler');
      const summary = data.summary || {};
      setSchedulerSummary(
        `${t('Users')}: ${summary.users || 0} · ${t('Agents')}: ${summary.configuredAgents || 0} · ${t('Due')}: ${summary.dueAgents || 0} · ${t('Records')}: ${summary.recordsCreated || 0} · ${language === 'zh' ? '机会任务' : 'Opportunities'}: ${summary.opportunitiesCreated || 0} · ${language === 'zh' ? '已路由' : 'Routed'}: ${summary.opportunitiesRouted || 0}`
      );
      setSchedulerAgentDetails(Array.isArray(summary.agents) ? summary.agents : []);
      await fetchUserSettings();
      notify(t('Agent scheduler checked.'), 'info');
    } catch (error) {
      console.error(error);
      setSchedulerSummary(error instanceof Error ? error.message : 'Failed to run scheduler');
      setSchedulerAgentDetails([]);
      notify(t('Agent scheduler check failed.'), 'error');
    } finally {
      setSchedulerRunning(false);
    }
  };

  return (
    <div className="flex-1 bg-black text-slate-100 overflow-y-auto">
      <div className="p-8 space-y-8">
        <AgentHubHeader
          language={language}
          tab={tab}
          t={t}
          onTabChange={setTab}
          onCreateAgent={() => {
            setDraftAgent(emptyAgent());
            setSelectedAgentId(null);
            setAgentQueueFilter('custom');
            setTab('fleet');
          }}
        />

        {tab === 'chat' && (
          <AgentConsolePanel
            language={language}
            chatAgents={chatAgents}
            activeChatAgent={activeChatAgent}
            chatRunningAgentId={chatRunningAgentId}
            visibleChatMessages={visibleChatMessages}
            pendingItems={pendingItems}
            clients={clients}
            chatInput={chatInput}
            chatSending={chatSending}
            setChatAgentId={setChatAgentId}
            clearActiveAgentChat={clearActiveAgentChat}
            deleteChatMessage={deleteChatMessage}
            handleChatApproval={handleChatApproval}
            buildAgentChatUsage={buildAgentChatUsage}
            setChatInput={setChatInput}
            sendAgentChat={sendAgentChat}
          />
        )}

        {tab === 'fleet' && (
          <AgentFleetPanel
            language={language}
            t={t}
            activeAgents={activeAgents}
            scheduledAgents={scheduledAgents}
            eventTriggeredAgents={eventTriggeredAgents}
            reviewRequiredCount={reviewRequiredCount}
            systemAgents={systemAgents}
            customAgents={customAgents}
            visibleQueueAgents={visibleQueueAgents}
            activeQueueMeta={activeQueueMeta}
            agentQueueFilter={agentQueueFilter}
            selectedAgentId={selectedAgentId}
            draftAgent={draftAgent}
            selectedAgent={selectedAgent}
            runningAgentId={runningAgentId}
            onQueueFilterChange={(filter) => {
              setAgentQueueFilter(filter);
              setDraftAgent(null);
            }}
            onSelectAgent={(agentId) => {
              setSelectedAgentId(agentId);
              setDraftAgent(null);
            }}
            onRunAgent={runAgentNow}
            onSaveAgent={saveAgent}
            onResetAgent={resetSystemAgent}
            onDeleteAgent={deleteSelectedAgent}
          />
        )}

        {tab === 'opportunities' && (
          <AgentTaskQueuePanel
            language={language}
            visibleTasks={visibleTasks}
            dispatchableTasks={dispatchableTasks}
            pendingCount={pendingItems.length}
            schedulerRunning={schedulerRunning}
            dispatchingOpportunityId={dispatchingOpportunityId}
            agentOpportunityRoutingPolicy={agentOpportunityRoutingPolicy}
            onRunScheduler={runSchedulerNow}
            onDispatchAll={runAllDispatchableOpportunities}
            onUpdateRoutingPolicy={updateAgentOpportunityRoutingPolicy}
            onReopenOpportunity={updateAgentOpportunity}
            onDispatchTask={dispatchTask}
            onUpdateTaskAndOpportunity={updateTaskAndLinkedOpportunity}
            onDeleteTaskAndOpportunity={deleteTaskAndLinkedOpportunity}
          />
        )}

        {tab === 'approvals' && (
          <ApprovalCenterPanel
            language={language}
            pendingItems={pendingItems}
            agentExecutionPolicy={agentExecutionPolicy}
            t={t}
            onApprove={approveItem}
            onReject={rejectItem}
            onTabChange={setTab}
            onUpdatePolicy={updateAgentExecutionPolicy}
          />
        )}

        {tab === 'runs' && (
          <ExecutionLogsPanel
            language={language}
            t={t}
            runLogs={runLogs}
            agentRunRecords={agentRunRecords}
            logDisplayLimit={logDisplayLimit}
            expandedTraceRunIds={expandedTraceRunIds}
            schedulerRunning={schedulerRunning}
            schedulerSummary={schedulerSummary}
            schedulerAgentDetails={schedulerAgentDetails}
            onLogDisplayLimitChange={setLogDisplayLimit}
            onOpenPolicy={() => setTab('approvals')}
            onClearTraceLogs={clearTraceLogs}
            onDeleteTraceRun={deleteRunLog}
            onToggleTraceRunExpanded={(runId) => setExpandedTraceRunIds(ids => (
              ids.includes(runId) ? ids.filter(id => id !== runId) : [...ids, runId]
            ))}
            onRunScheduler={runSchedulerNow}
            onClearAgentRunRecords={clearAgentRunRecords}
            onDeleteAgentRunRecord={deleteAgentRunRecord}
          />
        )}

        {tab === 'global' && (
          <div className="rounded-lg border border-neutral-800 overflow-hidden bg-slate-950">
            <GlobalAgent />
          </div>
        )}
      </div>

    </div>
  );
}
