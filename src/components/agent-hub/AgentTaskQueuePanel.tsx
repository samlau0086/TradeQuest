import React from 'react';
import { RefreshCw, Send, ShieldCheck, Trash2, Zap } from 'lucide-react';
import { AgentOpportunityRoutingPolicy, AgentTask } from '../../store';
import { cn } from '../../lib/utils';
import {
  linkedOpportunityIdFromTask,
  opportunityStatusClass,
  opportunityStatusLabel,
  riskClass
} from './shared';

interface AgentTaskQueuePanelProps {
  language: string;
  visibleTasks: AgentTask[];
  dispatchableTasks: AgentTask[];
  pendingCount: number;
  schedulerRunning: boolean;
  dispatchingOpportunityId: string | null;
  agentOpportunityRoutingPolicy: AgentOpportunityRoutingPolicy;
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
  pendingCount,
  schedulerRunning,
  dispatchingOpportunityId,
  agentOpportunityRoutingPolicy,
  onRunScheduler,
  onDispatchAll,
  onUpdateRoutingPolicy,
  onReopenOpportunity,
  onDispatchTask,
  onUpdateTaskAndOpportunity,
  onDeleteTaskAndOpportunity
}: AgentTaskQueuePanelProps) {
  const isZh = language === 'zh';
  const taskOpportunityId = (task: AgentTask) => linkedOpportunityIdFromTask(task);

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
            ? `可派发任务 ${dispatchableTasks.length} 个 · 队列总数 ${visibleTasks.length} 个 · 待审核 ${pendingCount} 个`
            : `${dispatchableTasks.length} dispatchable · ${visibleTasks.length} total · ${pendingCount} waiting for approval`}
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

      {visibleTasks.length === 0 ? (
        <div className="rounded-lg border border-neutral-800 bg-black px-4 py-10 text-center text-sm text-slate-500">
          {isZh ? '暂无开放机会任务。运行扫描器后，新的可执行任务会出现在这里。' : 'No open opportunities yet. Run the scanner and actionable tasks will appear here.'}
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleTasks.map(task => {
            const opportunityId = taskOpportunityId(task);
            return (
              <div key={task.id} className="rounded-lg border border-neutral-800 bg-black p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-100">{task.title}</span>
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold uppercase', opportunityStatusClass(task.status))}>
                        {opportunityStatusLabel(task.status, language)}
                      </span>
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold uppercase', riskClass(task.risk))}>{task.risk}</span>
                      <span className="rounded border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] text-slate-400">{task.agentName || task.agentId}</span>
                      {task.entityType && <span className="rounded border border-neutral-800 px-2 py-0.5 text-[10px] text-slate-500">{task.entityType}:{task.entityId}</span>}
                      {task.runId && <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300">{task.runType}:{task.runId}</span>}
                      <span className="rounded border border-neutral-800 px-2 py-0.5 text-[10px] text-slate-500">{task.triggerType}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{task.description}</p>
                    <p className="mt-3 text-xs leading-relaxed text-slate-500">{task.objective}</p>
                    {task.resultSummary && <p className="mt-3 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs leading-relaxed text-slate-400">{task.resultSummary}</p>}
                    <div className="mt-2 text-[10px] text-slate-600">{new Date(task.createdAt).toLocaleString()} · {task.source}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                      title={isZh ? '删除任务' : 'Delete task'}
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
    </section>
  );
}
