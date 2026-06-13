import React, { useMemo, useState } from 'react';
import { Info, RefreshCw, Send, ShieldCheck, Trash2, X, Zap } from 'lucide-react';
import { AgentHubAgent, AgentOpportunityRoutingPolicy, AgentTask } from '../../store';
import { cn } from '../../lib/utils';
import {
  linkedOpportunityIdFromTask,
  opportunityStatusClass,
  opportunityStatusLabel,
  riskClass,
  AgentTaskQueueFilter
} from './shared';

interface AgentTaskQueuePanelProps {
  language: string;
  visibleTasks: AgentTask[];
  dispatchableTasks: AgentTask[];
  allAgents: AgentHubAgent[];
  taskStatusFilter: AgentTaskQueueFilter;
  pendingCount: number;
  schedulerRunning: boolean;
  dispatchingOpportunityId: string | null;
  agentOpportunityRoutingPolicy: AgentOpportunityRoutingPolicy;
  onTaskStatusFilterChange: (filter: AgentTaskQueueFilter) => void;
  onRunScheduler: () => void | Promise<void>;
  onDispatchAll: () => void | Promise<void>;
  onUpdateRoutingPolicy: (updates: Partial<AgentOpportunityRoutingPolicy>) => void;
  onReopenOpportunity: (id: string, updates: Record<string, unknown>) => void;
  onDispatchTask: (task: AgentTask) => void | Promise<void>;
  onUpdateTaskAndOpportunity: (task: AgentTask, taskUpdates: Partial<AgentTask>, opportunityUpdates?: Record<string, unknown>) => void;
  onDeleteTaskAndOpportunity: (task: AgentTask) => void;
}

export function AgentTaskQueuePanel({
  language,
  visibleTasks,
  dispatchableTasks,
  allAgents,
  taskStatusFilter,
  pendingCount,
  schedulerRunning,
  dispatchingOpportunityId,
  agentOpportunityRoutingPolicy,
  onTaskStatusFilterChange,
  onRunScheduler,
  onDispatchAll,
  onUpdateRoutingPolicy,
  onReopenOpportunity,
  onDispatchTask,
  onUpdateTaskAndOpportunity,
  onDeleteTaskAndOpportunity
}: AgentTaskQueuePanelProps) {
  const isZh = language === 'zh';
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkAgentId, setBulkAgentId] = useState('');
  const taskOpportunityId = (task: AgentTask) => linkedOpportunityIdFromTask(task);
  const taskEntityLabel = (task: AgentTask) => {
    const labels: Record<string, string> = {
      client: isZh ? '客户' : 'Client',
      lead: isZh ? '线索' : 'Lead',
      email: isZh ? '邮件' : 'Email',
      whatsapp: isZh ? 'WhatsApp' : 'WhatsApp',
      live_chat: isZh ? 'Live Chat' : 'Live Chat',
      conversation: isZh ? '统一会话' : 'Conversation',
      system: isZh ? '系统' : 'System'
    };
    const type = task.entityType || 'system';
    return `${labels[type] || type}:${task.entityId || '-'}`;
  };
  const taskFilterOptions: { id: AgentTaskQueueFilter; label: string }[] = [
    { id: 'active', label: isZh ? '待处理' : 'Active' },
    { id: 'open', label: isZh ? '开放' : 'Open' },
    { id: 'approval_required', label: isZh ? '待审批' : 'Needs approval' },
    { id: 'running', label: isZh ? '运行中' : 'Running' },
    { id: 'failed', label: isZh ? '失败' : 'Failed' },
    { id: 'completed', label: isZh ? '已完成' : 'Completed' },
    { id: 'ignored', label: isZh ? '已忽略' : 'Ignored' },
    { id: 'all', label: isZh ? '全部' : 'All' }
  ];
  const taskMatchesFilter = (task: AgentTask, filter: AgentTaskQueueFilter) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['completed', 'ignored'].includes(task.status);
    if (filter === 'running') return ['queued', 'running'].includes(task.status);
    if (filter === 'failed') return ['failed', 'skipped'].includes(task.status);
    return task.status === filter;
  };
  const taskFilterCounts = useMemo(() => (
    taskFilterOptions.reduce<Record<AgentTaskQueueFilter, number>>((counts, option) => {
      counts[option.id] = visibleTasks.filter(task => taskMatchesFilter(task, option.id)).length;
      return counts;
    }, {
      active: 0,
      open: 0,
      approval_required: 0,
      running: 0,
      completed: 0,
      failed: 0,
      ignored: 0,
      all: 0
    })
  ), [visibleTasks, taskFilterOptions]);
  const filteredTasks = useMemo(() => (
    visibleTasks.filter(task => taskMatchesFilter(task, taskStatusFilter))
  ), [taskStatusFilter, visibleTasks]);
  const selectedTask = selectedTaskId ? visibleTasks.find(task => task.id === selectedTaskId) || null : null;
  const selectedTaskAgent = selectedTask ? allAgents.find(agent => agent.id === selectedTask.agentId) || null : null;
  const selectedTasks = visibleTasks.filter(task => selectedTaskIds.includes(task.id));
  const filteredTaskIds = filteredTasks.map(task => task.id);
  const allFilteredSelected = filteredTaskIds.length > 0 && filteredTaskIds.every(id => selectedTaskIds.includes(id));
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(current => current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId]);
  };
  const toggleFilteredSelection = () => {
    setSelectedTaskIds(current => {
      if (allFilteredSelected) return current.filter(id => !filteredTaskIds.includes(id));
      return Array.from(new Set([...current, ...filteredTaskIds]));
    });
  };
  const clearSelection = () => setSelectedTaskIds([]);
  const bulkIgnore = () => {
    const completedAt = new Date().toISOString();
    selectedTasks.forEach(task => onUpdateTaskAndOpportunity(task, { status: 'ignored', completedAt }, { status: 'ignored', completedAt }));
    clearSelection();
  };
  const bulkComplete = () => {
    const completedAt = new Date().toISOString();
    const resultSummary = isZh ? '已由批量操作标记完成。' : 'Marked complete by bulk operation.';
    selectedTasks.forEach(task => onUpdateTaskAndOpportunity(task, { status: 'completed', completedAt, resultSummary }, { status: 'completed', completedAt, resultSummary }));
    clearSelection();
  };
  const bulkReopen = () => {
    const resultSummary = isZh ? '已由批量操作重新打开。' : 'Reopened by bulk operation.';
    selectedTasks.forEach(task => onUpdateTaskAndOpportunity(task, { status: 'open', completedAt: undefined, resultSummary }, { status: 'open', completedAt: undefined, resultSummary }));
    clearSelection();
  };
  const bulkDispatch = async () => {
    for (const task of selectedTasks.filter(item => !!taskOpportunityId(item) && ['open', 'failed', 'skipped'].includes(item.status))) {
      // eslint-disable-next-line no-await-in-loop
      await onDispatchTask(task);
    }
    clearSelection();
  };
  const bulkAssignAgent = () => {
    const agent = allAgents.find(item => item.id === bulkAgentId);
    if (!agent) return;
    selectedTasks.forEach(task => onUpdateTaskAndOpportunity(
      task,
      { agentId: agent.id, agentName: agent.name },
      { recommendedAgentId: agent.id, recommendedAgentName: agent.name }
    ));
    clearSelection();
  };
  const metadataValue = (task: AgentTask | null, keys: string[]) => {
    const metadata = (task?.metadata || {}) as Record<string, unknown>;
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.trim()) return value;
      if (Array.isArray(value) && value.length) return value.join(', ');
    }
    return '';
  };
  const executionBlockers = (task: AgentTask) => {
    const blockers: string[] = [];
    if (!taskOpportunityId(task)) blockers.push(isZh ? '未关联可派发的机会任务' : 'No dispatchable linked opportunity');
    if (!task.agentId) blockers.push(isZh ? '未指定负责智能体' : 'No responsible agent configured');
    if (task.status === 'approval_required' || task.approvalStatus === 'pending') blockers.push(isZh ? '等待人工审核' : 'Waiting for human approval');
    if (task.status === 'queued' || task.status === 'running') blockers.push(isZh ? '任务已在执行流程中' : 'Task is already in the execution flow');
    if (task.status === 'completed') blockers.push(isZh ? '任务已完成，需要重新打开后才能再次执行' : 'Task is completed and must be reopened before rerun');
    if (task.status === 'ignored') blockers.push(isZh ? '任务已忽略，用于保留去重墓碑' : 'Task is ignored to preserve the dedupe tombstone');
    if (task.status === 'failed' && task.resultSummary) blockers.push(task.resultSummary);
    return blockers.length ? blockers : [isZh ? '暂无明显阻塞，可按策略派发或执行' : 'No obvious blockers; it can be routed or dispatched according to policy'];
  };

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Zap className="h-4 w-4 text-blue-300" /> {isZh ? '统一任务队列' : 'Unified Agent Task Queue'}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {isZh
              ? 'Signal Scanner、事件触发、定时运行和 Console 请求都会先形成任务，再由执行策略决定自动执行、进入审批，或交给指定智能体处理。'
              : 'Signal Scanner, event triggers, schedules, and Console requests should first become tasks. Policy then decides whether to auto-run, request approval, or route to a specific agent.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRunScheduler()}
          disabled={schedulerRunning}
          className="inline-flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-600/20 px-3 py-2 text-xs font-bold text-blue-100 hover:bg-blue-600/30 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', schedulerRunning && 'animate-spin')} />
          {isZh ? '立即扫描' : 'Scan Now'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-black px-4 py-3">
        <div className="text-xs text-slate-500">
          {isZh
            ? `可派发任务 ${dispatchableTasks.length} 个 · 当前筛选 ${filteredTasks.length}/${visibleTasks.length} 个 · 待审核 ${pendingCount} 个`
            : `${dispatchableTasks.length} dispatchable · ${filteredTasks.length}/${visibleTasks.length} shown · ${pendingCount} waiting for approval`}
        </div>
        <button
          type="button"
          onClick={() => void onDispatchAll()}
          disabled={dispatchableTasks.length === 0 || !!dispatchingOpportunityId}
          className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-600/15 px-3 py-2 text-xs font-bold text-emerald-100 hover:bg-emerald-600/25 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {isZh ? '派发全部开放任务' : 'Dispatch All Open'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {taskFilterOptions.map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => onTaskStatusFilterChange(option.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors',
              taskStatusFilter === option.id
                ? 'border-blue-500/60 bg-blue-600/20 text-blue-100'
                : 'border-neutral-800 bg-black text-slate-400 hover:border-neutral-700 hover:text-slate-100'
            )}
          >
            {option.label}
            <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-slate-400">
              {taskFilterCounts[option.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-neutral-800 bg-black px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              disabled={filteredTasks.length === 0}
              onChange={toggleFilteredSelection}
            />
            {isZh ? '选择当前筛选' : 'Select filtered'}
          </label>
          <span>{isZh ? `已选 ${selectedTasks.length} 个` : `${selectedTasks.length} selected`}</span>
          {selectedTasks.length > 0 && (
            <button type="button" onClick={clearSelection} className="text-slate-500 hover:text-slate-200">
              {isZh ? '清除选择' : 'Clear'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={bulkAgentId}
            onChange={event => setBulkAgentId(event.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-slate-200"
          >
            <option value="">{isZh ? '指定负责 Agent...' : 'Assign agent...'}</option>
            {allAgents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={bulkAssignAgent}
            disabled={selectedTasks.length === 0 || !bulkAgentId}
            className="rounded-md border border-neutral-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-neutral-900 disabled:opacity-50"
          >
            {isZh ? '指定 Agent' : 'Assign'}
          </button>
          <button
            type="button"
            onClick={() => void bulkDispatch()}
            disabled={selectedTasks.length === 0 || !!dispatchingOpportunityId}
            className="rounded-md border border-blue-500/30 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/10 disabled:opacity-50"
          >
            {isZh ? '批量派发' : 'Dispatch'}
          </button>
          <button
            type="button"
            onClick={bulkReopen}
            disabled={selectedTasks.length === 0}
            className="rounded-md border border-neutral-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-neutral-900 disabled:opacity-50"
          >
            {isZh ? '重新打开' : 'Reopen'}
          </button>
          <button
            type="button"
            onClick={bulkComplete}
            disabled={selectedTasks.length === 0}
            className="rounded-md border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {isZh ? '标记完成' : 'Complete'}
          </button>
          <button
            type="button"
            onClick={bulkIgnore}
            disabled={selectedTasks.length === 0}
            className="rounded-md border border-red-500/30 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"
          >
            {isZh ? '忽略' : 'Ignore'}
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-950/10 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-200">
          <ShieldCheck className="h-4 w-4" /> {isZh ? '任务路由策略' : 'Task Routing Policy'}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex items-center gap-2 rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={agentOpportunityRoutingPolicy.enabled}
              onChange={event => onUpdateRoutingPolicy({ enabled: event.target.checked })}
            />
            {isZh ? '启用路由' : 'Enable routing'}
          </label>
          <label className="flex items-center gap-2 rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={agentOpportunityRoutingPolicy.autoExecuteLowRisk}
              onChange={event => onUpdateRoutingPolicy({ autoExecuteLowRisk: event.target.checked })}
            />
            {isZh ? '低风险自动执行' : 'Auto low risk'}
          </label>
          <label className="flex items-center gap-2 rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={agentOpportunityRoutingPolicy.routeMediumRiskToReview}
              onChange={event => onUpdateRoutingPolicy({ routeMediumRiskToReview: event.target.checked })}
            />
            {isZh ? '中风险进审核' : 'Review medium risk'}
          </label>
          <label className="flex items-center gap-2 rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={agentOpportunityRoutingPolicy.routeHighRiskToReview}
              onChange={event => onUpdateRoutingPolicy({ routeHighRiskToReview: event.target.checked })}
            />
            {isZh ? '高风险进审核' : 'Review high risk'}
          </label>
          <label className="rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-slate-300">
            <span className="mb-1 block text-slate-500">{isZh ? '每次最多路由' : 'Max per run'}</span>
            <input
              type="number"
              min={0}
              max={100}
              value={agentOpportunityRoutingPolicy.maxAutoDispatchPerRun}
              onChange={event => onUpdateRoutingPolicy({ maxAutoDispatchPerRun: Number(event.target.value || 0) })}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-slate-100"
            />
          </label>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="rounded-lg border border-neutral-800 bg-black px-4 py-10 text-center text-sm text-slate-500">
          {visibleTasks.length === 0
            ? (isZh ? '暂无机会任务。运行扫描器后，新的可执行任务会出现在这里。' : 'No opportunity tasks yet. Run the scanner and actionable tasks will appear here.')
            : (isZh ? '当前筛选下暂无任务。' : 'No tasks match this filter.')}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map(task => {
            const opportunityId = taskOpportunityId(task);
            return (
              <div key={task.id} className="rounded-lg border border-neutral-800 bg-black p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.includes(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        aria-label={isZh ? '选择任务' : 'Select task'}
                      />
                      <span className="font-bold text-slate-100">{task.title}</span>
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold uppercase', opportunityStatusClass(task.status))}>
                        {opportunityStatusLabel(task.status, language)}
                      </span>
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold uppercase', riskClass(task.risk))}>{task.risk}</span>
                      <span className="rounded border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] text-slate-400">{task.agentName || task.agentId}</span>
                      {task.entityType && <span className="rounded border border-neutral-800 px-2 py-0.5 text-[10px] text-slate-500">{taskEntityLabel(task)}</span>}
                      {task.runId && <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300">{task.runType}:{task.runId}</span>}
                      <span className="rounded border border-neutral-800 px-2 py-0.5 text-[10px] text-slate-500">{task.triggerType}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{task.description}</p>
                    <p className="mt-3 text-xs leading-relaxed text-slate-500">{task.objective}</p>
                    {task.resultSummary && <p className="mt-3 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs leading-relaxed text-slate-400">{task.resultSummary}</p>}
                    <div className="mt-2 text-[10px] text-slate-600">{new Date(task.createdAt).toLocaleString()} · {task.source}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-neutral-900"
                    >
                      <Info className="h-3.5 w-3.5" />
                      {isZh ? '详情' : 'Details'}
                    </button>
                    {task.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => opportunityId && onReopenOpportunity(opportunityId, {
                          status: 'open',
                          relatedRunId: undefined,
                          relatedRunType: undefined,
                          resultSummary: isZh ? '已重新打开，可再次派发。' : 'Reopened for dispatch.',
                          completedAt: undefined
                        })}
                        className="rounded-md border border-blue-500/30 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-500/10"
                      >
                        {isZh ? '重新打开' : 'Reopen'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onDispatchTask(task)}
                      disabled={!opportunityId || !['open', 'failed', 'skipped'].includes(task.status) || dispatchingOpportunityId === task.id}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {dispatchingOpportunityId === task.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {isZh ? '交给 Agent 执行' : 'Run with Agent'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateTaskAndOpportunity(task, { status: 'ignored', completedAt: new Date().toISOString() }, { status: 'ignored', completedAt: new Date().toISOString() })}
                      className="rounded-md border border-neutral-700 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-100"
                    >
                      {isZh ? '忽略' : 'Ignore'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTaskAndOpportunity(task)}
                      className="rounded-md p-2 text-slate-600 hover:bg-red-500/10 hover:text-red-300"
                      title={isZh ? '从队列移除' : 'Remove from queue'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setSelectedTaskId(null)}>
          <aside
            className="h-full w-full max-w-xl overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-blue-300">
                  {isZh ? '任务详情' : 'Task Detail'}
                </div>
                <h3 className="mt-2 text-xl font-bold text-slate-100">{selectedTask.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold uppercase', opportunityStatusClass(selectedTask.status))}>
                    {opportunityStatusLabel(selectedTask.status, language)}
                  </span>
                  <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold uppercase', riskClass(selectedTask.risk))}>{selectedTask.risk}</span>
                  <span className="rounded border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] text-slate-400">{selectedTask.triggerType}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                className="rounded-md p-2 text-slate-500 hover:bg-neutral-900 hover:text-slate-100"
                aria-label={isZh ? '关闭任务详情' : 'Close task detail'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-lg border border-neutral-800 bg-black p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">{isZh ? '触发原因' : 'Trigger Reason'}</div>
                <p className="text-sm leading-relaxed text-slate-300">
                  {metadataValue(selectedTask, ['triggerReason', 'reason', 'signalReason']) || selectedTask.description || selectedTask.objective}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-black p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">{isZh ? '关联主体' : 'Linked Entity'}</div>
                <dl className="grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">{isZh ? '主体' : 'Entity'}</dt>
                    <dd className="mt-1 font-mono text-slate-200">{taskEntityLabel(selectedTask)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{isZh ? '来源' : 'Source'}</dt>
                    <dd className="mt-1 font-mono text-slate-200">{selectedTask.source}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{isZh ? '来源记录' : 'Source Ref'}</dt>
                    <dd className="mt-1 font-mono text-slate-200">{selectedTask.sourceRefType || '-'}:{selectedTask.sourceRefId || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{isZh ? '运行记录' : 'Run'}</dt>
                    <dd className="mt-1 font-mono text-slate-200">{selectedTask.runType || '-'}:{selectedTask.runId || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-black p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">{isZh ? '路由与风险' : 'Routing and Risk'}</div>
                <dl className="grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">{isZh ? '推荐智能体' : 'Recommended Agent'}</dt>
                    <dd className="mt-1 text-slate-200">{selectedTask.agentName || selectedTask.agentId || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{isZh ? '审批状态' : 'Approval'}</dt>
                    <dd className="mt-1 text-slate-200">{selectedTask.approvalStatus || 'not_required'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">{isZh ? '风险依据' : 'Risk Rationale'}</dt>
                    <dd className="mt-1 leading-relaxed text-slate-200">
                      {metadataValue(selectedTask, ['riskReason', 'riskRationale', 'risk_rationale']) || (isZh ? '未提供单独风险说明，参考任务描述与执行策略。' : 'No separate risk rationale was provided; use the task description and execution policy.')}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">{isZh ? '去重 Key' : 'Dedupe Key'}</dt>
                    <dd className="mt-1 break-all font-mono text-slate-200">{selectedTask.dedupeKey || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-black p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">{isZh ? '执行阻塞' : 'Execution Blockers'}</div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {executionBlockers(selectedTask).map((blocker, index) => (
                    <li key={`${blocker}-${index}`} className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2">{blocker}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-blue-500/20 bg-blue-950/10 p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-200">{isZh ? '模拟运行预览' : 'Dry Run Preview'}</div>
                <div className="grid gap-3 text-xs">
                  <div className="rounded border border-neutral-800 bg-black px-3 py-2">
                    <div className="text-slate-500">{isZh ? '预计影响记录' : 'Affected record'}</div>
                    <div className="mt-1 font-mono text-slate-200">{taskEntityLabel(selectedTask)}</div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-black px-3 py-2">
                    <div className="text-slate-500">{isZh ? '执行智能体' : 'Executing agent'}</div>
                    <div className="mt-1 text-slate-200">{selectedTaskAgent?.name || selectedTask.agentName || selectedTask.agentId || '-'}</div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-black px-3 py-2">
                    <div className="text-slate-500">{isZh ? '计划工具调用' : 'Planned tool calls'}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(selectedTaskAgent?.tools || []).length > 0 ? (
                        (selectedTaskAgent?.tools || []).map(tool => (
                          <span key={tool} className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1 font-mono text-[10px] text-blue-200">{tool}</span>
                        ))
                      ) : (
                        <span className="text-slate-500">{isZh ? '未配置工具' : 'No tools configured'}</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-black px-3 py-2">
                    <div className="text-slate-500">{isZh ? '预计治理结果' : 'Expected governance result'}</div>
                    <div className="mt-1 text-slate-200">
                      {selectedTask.status === 'approval_required' || selectedTask.risk === 'high'
                        ? (isZh ? '需要人工审核后执行。' : 'Requires human review before execution.')
                        : selectedTaskAgent?.guardrail === 'auto' && selectedTask.risk === 'low'
                          ? (isZh ? '符合低风险自动执行条件。' : 'Eligible for low-risk auto execution.')
                          : (isZh ? '将按任务路由策略决定自动执行或进入审核。' : 'Routing policy will decide auto execution or review.')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
