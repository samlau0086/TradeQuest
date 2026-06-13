import { useState } from 'react';
import { AgentHubAgent, AgentOpportunity, AgentTask, useStore } from '../../store';
import { AgentHubPendingItem, AgentHubTab, linkedOpportunityIdFromTask } from './shared';

interface AgentTraceRunLike {
  kind: 'harness' | 'global';
  id: string;
}

interface UseAgentOperationsOptions {
  language: string;
  token: string | null;
  t: (key: string) => string;
  setTab: (tab: AgentHubTab) => void;
  pendingItems: AgentHubPendingItem[];
  dispatchableTasks: AgentTask[];
  runLogs: AgentTraceRunLike[];
}

export function useAgentOperations({
  language,
  token,
  t,
  setTab,
  pendingItems,
  dispatchableTasks,
  runLogs
}: UseAgentOperationsOptions) {
  const {
    agentHubAgents,
    agentRunRecords,
    agentOpportunities,
    agentTasks,
    updateAgentOpportunity,
    deleteAgentOpportunity,
    updateAgentTask,
    deleteAgentTask,
    updateAgentHarnessRun,
    deleteAgentHarnessRun,
    updateGlobalAgentPlan,
    deleteGlobalAgentPlan,
    updateAgentRunRecord,
    deleteAgentRunRecord,
    fetchUserSettings,
    notify
  } = useStore();
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);
  const [dispatchingOpportunityId, setDispatchingOpportunityId] = useState<string | null>(null);
  const [schedulerSummary, setSchedulerSummary] = useState<string | null>(null);
  const [schedulerAgentDetails, setSchedulerAgentDetails] = useState<any[]>([]);
  const [expandedTraceRunIds, setExpandedTraceRunIds] = useState<string[]>([]);

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

  const runOpportunity = async (opportunity: AgentOpportunity) => {
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

  const dispatchOpportunity = async (opportunity: AgentOpportunity) => {
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

  const approveItem = async (item: AgentHubPendingItem) => {
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

  const rejectItem = (item: AgentHubPendingItem) => {
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

  const deleteRunLog = (run: AgentTraceRunLike) => {
    if (run.kind === 'harness') deleteAgentHarnessRun(run.id);
    if (run.kind === 'global') deleteGlobalAgentPlan(run.id);
    setExpandedTraceRunIds(ids => ids.filter(id => id !== run.id));
  };

  const toggleTraceRunExpanded = (runId: string) => {
    setExpandedTraceRunIds(ids => (
      ids.includes(runId) ? ids.filter(id => id !== runId) : [...ids, runId]
    ));
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

  return {
    schedulerRunning,
    runningAgentId,
    dispatchingOpportunityId,
    schedulerSummary,
    schedulerAgentDetails,
    expandedTraceRunIds,
    approveItem,
    clearAgentRunRecords,
    clearTraceLogs,
    deleteRunLog,
    deleteTaskAndLinkedOpportunity,
    dispatchOpportunity,
    dispatchTask,
    rejectItem,
    runAgentNow,
    runAllDispatchableOpportunities,
    runOpportunity,
    runSchedulerNow,
    toggleTraceRunExpanded,
    updateTaskAndLinkedOpportunity
  };
}
