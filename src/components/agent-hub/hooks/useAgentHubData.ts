import { useEffect, useMemo, useState } from 'react';
import { AgentHubAgent, AgentTask, useStore } from '../../../store';
import { AgentConfigValue } from '../AgentConfigPanel';
import { AgentTraceRun } from '../ExecutionLogsPanel';
import {
  AgentHubPendingItem,
  AgentQueueFilter,
  emptyAgent,
  linkedOpportunityIdFromTask,
  taskFromOpportunityForView
} from '../shared';

interface UseAgentHubDataOptions {
  language: string;
  agentQueueFilter: AgentQueueFilter;
  selectedAgentId: string | null;
  draftAgent: AgentConfigValue | null;
}

const normalizeRunStep = (step: any) => ({
  title: step.title || step.tool || step.actionType || 'agent.run',
  tool: step.tool || step.actionType || step.title || 'agent.run',
  status: step.status || 'pending',
  result: step.result || step.error || '',
  risk: step.risk || step.payload?.risk || '',
  resultMeta: step.resultMeta || step.payload?.resultMeta || undefined
});

const isLegacySignalScannerPendingTrace = (run: any) => (
  run.summary?.includes('Signal Scanner Agent') &&
  run.status === 'approved' &&
  run.steps?.length === 1 &&
  run.steps?.[0]?.tool === 'client.read' &&
  run.steps?.[0]?.status === 'pending'
);

const clientEditApprovalTitle = (request: any, language: string) => {
  const action = request.requested_data?.action || request.requestedData?.action || 'client_update';
  const isZh = language === 'zh';
  if (action === 'delete_client_comment') return isZh ? '删除客户 Team Comment' : 'Delete client team comment';
  if (action === 'delete_deal_comment') return isZh ? '删除 Lead Team Comment' : 'Delete lead team comment';
  if (action === 'delete_live_chat_session') return isZh ? '删除 Live Chat 对话' : 'Delete Live Chat conversation';
  if (action === 'delete_email') return isZh ? '删除邮件' : 'Delete email';
  if (action === 'delete_deal') return isZh ? '删除 Lead' : 'Delete lead';
  return isZh ? '客户资料修改审核' : 'Client profile change';
};

const clientEditApprovalBody = (request: any, language: string) => {
  const action = request.requested_data?.action || request.requestedData?.action || 'client_update';
  const requested = request.requested_data || request.requestedData || {};
  const isZh = language === 'zh';
  const lines = [
    isZh ? `动作：${clientEditApprovalTitle(request, language)}` : `Action: ${clientEditApprovalTitle(request, language)}`,
    isZh ? `客户：${request.current_client_name || request.client_id}` : `Client: ${request.current_client_name || request.client_id}`,
    requested.comment_id ? (isZh ? `评论 ID：${requested.comment_id}` : `Comment ID: ${requested.comment_id}`) : '',
    requested.deal_id ? (isZh ? `Lead ID：${requested.deal_id}` : `Lead ID: ${requested.deal_id}`) : '',
    requested.live_chat_session_id ? (isZh ? `Live Chat：${requested.live_chat_session_id}` : `Live Chat: ${requested.live_chat_session_id}`) : '',
    '',
    JSON.stringify({ action, requested }, null, 2)
  ].filter(Boolean);
  return lines.join('\n');
};

export function useAgentHubData({
  language,
  agentQueueFilter,
  selectedAgentId,
  draftAgent
}: UseAgentHubDataOptions) {
  const {
    agentHubAgents,
    agentHarnessRuns,
    globalAgentPlans,
    agentOpportunities,
    agentTasks
  } = useStore();
  const [clientEditRequests, setClientEditRequests] = useState<any[]>([]);

  const fetchClientEditRequests = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch('/api/admin/client-edit-requests?status=pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => []);
      setClientEditRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Failed to load client edit approval requests', error);
    }
  };

  useEffect(() => {
    void fetchClientEditRequests();
    const interval = window.setInterval(() => void fetchClientEditRequests(), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const pendingItems = useMemo<AgentHubPendingItem[]>(() => [
    ...agentHarnessRuns
      .filter(run => run.status === 'pending_review')
      .map(run => ({
        kind: 'harness' as const,
        id: run.id,
        title: run.summary,
        agent: language === 'zh' ? 'Agent Hub 执行器' : 'Agent Hub Executor',
        body: run.objective,
        createdAt: run.createdAt
      })),
    ...clientEditRequests
      .filter(request => request.status === 'pending')
      .map(request => ({
        kind: 'client_edit' as const,
        id: request.id,
        title: clientEditApprovalTitle(request, language),
        agent: language === 'zh' ? '数据审核' : 'Data Approval',
        body: clientEditApprovalBody(request, language),
        createdAt: request.created_at || request.createdAt || new Date().toISOString()
      })),
    ...globalAgentPlans
      .filter(plan => plan.status === 'pending_review')
      .map(plan => ({
        kind: 'global' as const,
        id: plan.id,
        title: plan.summary,
        agent: language === 'zh' ? '全局编排器' : 'Global Orchestrator',
        body: plan.objective,
        createdAt: plan.createdAt
      }))
  ], [agentHarnessRuns, clientEditRequests, globalAgentPlans, language]);

  const runLogs = useMemo<AgentTraceRun[]>(() => [
    ...agentHarnessRuns
      .filter(run => !isLegacySignalScannerPendingTrace(run))
      .map(run => ({
        kind: 'harness' as const,
        id: run.id,
        title: run.summary,
        agent: language === 'zh' ? 'Agent Hub 执行器' : 'Agent Hub Executor',
        status: run.status,
        steps: run.steps.map(normalizeRunStep),
        createdAt: run.createdAt
      })),
    ...globalAgentPlans.map(plan => ({
      kind: 'global' as const,
      id: plan.id,
      title: plan.summary,
      agent: language === 'zh' ? '全局编排器' : 'Global Orchestrator',
      status: plan.status,
      steps: plan.steps.map(normalizeRunStep),
      createdAt: plan.createdAt
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [agentHarnessRuns, globalAgentPlans, language]);

  const visibleOpportunities = useMemo(() => (
    agentOpportunities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  ), [agentOpportunities]);

  const visibleTasks = useMemo(() => {
    const byId = new Map<string, AgentTask>();
    agentTasks.forEach(task => byId.set(task.id, task));
    visibleOpportunities.map(taskFromOpportunityForView).forEach(task => {
      const existing = byId.get(task.id);
      byId.set(task.id, existing ? { ...existing, ...task, retryCount: existing.retryCount || 0 } : task);
    });
    return Array.from(byId.values())
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  }, [agentTasks, visibleOpportunities]);

  const dispatchableTasks = useMemo(() => (
    visibleTasks.filter(task => !!linkedOpportunityIdFromTask(task) && ['open', 'failed'].includes(task.status))
  ), [visibleTasks]);

  const computedAgents = useMemo<AgentHubAgent[]>(() => (
    agentHubAgents.map(agent => ({
      ...agent,
      tasksCompleted: agent.tasksCompleted + runLogs.filter(run => run.agent.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()) && run.status === 'completed').length
    }))
  ), [agentHubAgents, runLogs]);

  const systemAgents = useMemo(() => computedAgents.filter(agent => agent.builtIn), [computedAgents]);
  const customAgents = useMemo(() => computedAgents.filter(agent => !agent.builtIn), [computedAgents]);
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
  const globalAgent = useMemo(() => savedGlobalAgent || ({
    ...emptyAgent(),
    id: 'global_agent',
    name: 'Global Orchestrator',
    instructions: 'Coordinate CRM-wide acquisition, enrichment, follow-up, and conversion plans.',
    status: 'active',
    tools: ['global_agent.plan'],
    tasksCompleted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as AgentHubAgent), [savedGlobalAgent]);

  return {
    activeAgents,
    activeQueueMeta,
    computedAgents,
    customAgents,
    dispatchableTasks,
    eventTriggeredAgents,
    globalAgent,
    pendingItems,
    reviewRequiredCount,
    runLogs,
    scheduledAgents,
    selectedAgent,
    systemAgents,
    visibleOpportunities,
    visibleQueueAgents,
    visibleTasks
  };
}
