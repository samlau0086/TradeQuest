import { useMemo } from 'react';
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

  const pendingItems = useMemo<AgentHubPendingItem[]>(() => [
    ...agentHarnessRuns
      .filter(run => run.status === 'pending_review')
      .map(run => ({
        kind: 'harness' as const,
        id: run.id,
        title: run.summary,
        agent: 'Execution Engine',
        body: run.objective,
        createdAt: run.createdAt
      })),
    ...globalAgentPlans
      .filter(plan => plan.status === 'pending_review')
      .map(plan => ({
        kind: 'global' as const,
        id: plan.id,
        title: plan.summary,
        agent: 'Global Orchestrator',
        body: plan.objective,
        createdAt: plan.createdAt
      }))
  ], [agentHarnessRuns, globalAgentPlans]);

  const runLogs = useMemo<AgentTraceRun[]>(() => [
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
    visibleTasks.filter(task => !!linkedOpportunityIdFromTask(task) && ['open', 'failed', 'skipped'].includes(task.status))
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
