import React from 'react';
import { Cpu, ListChecks, RefreshCw, Trash2 } from 'lucide-react';
import { AgentHubRunRecord } from '../../store';
import { cn } from '../../lib/utils';

export interface AgentTraceRunStep {
  title: string;
  tool: string;
  status: string;
  result?: string;
}

export interface AgentTraceRun {
  kind: 'harness' | 'global';
  id: string;
  title: string;
  agent: string;
  status: string;
  steps: AgentTraceRunStep[];
  createdAt: string;
}

interface SchedulerAgentDetail {
  userId?: string;
  agentId?: string;
  agentName?: string;
  status?: string;
  scheduleIntervalValue?: number;
  scheduleIntervalUnit?: string;
  reason?: string;
  secondsRemaining?: number | null;
  lastRunAt?: string;
  nextRunAt?: string;
}

interface ExecutionLogsPanelProps {
  language: string;
  t: (key: string) => string;
  runLogs: AgentTraceRun[];
  agentRunRecords: AgentHubRunRecord[];
  logDisplayLimit: number;
  expandedTraceRunIds: string[];
  schedulerRunning: boolean;
  schedulerSummary: string | null;
  schedulerAgentDetails: SchedulerAgentDetail[];
  onLogDisplayLimitChange: (limit: number) => void;
  onOpenPolicy: () => void;
  onClearTraceLogs: () => void | Promise<void>;
  onDeleteTraceRun: (run: AgentTraceRun) => void;
  onToggleTraceRunExpanded: (runId: string) => void;
  onRunScheduler: () => void | Promise<void>;
  onClearAgentRunRecords: () => void | Promise<void>;
  onDeleteAgentRunRecord: (recordId: string) => void;
}

function timelineTone(tone: string) {
  if (tone === 'emerald') return { dot: 'bg-emerald-400 border-emerald-300 shadow-emerald-500/30', label: 'text-emerald-300' };
  if (tone === 'amber') return { dot: 'bg-amber-400 border-amber-300 shadow-amber-500/30', label: 'text-amber-300' };
  if (tone === 'red') return { dot: 'bg-red-400 border-red-300 shadow-red-500/30', label: 'text-red-300' };
  return { dot: 'bg-blue-400 border-blue-300 shadow-blue-500/30', label: 'text-blue-300' };
}

function splitTimelineText(value: string) {
  const cleanLine = (line: string) => line
    .replace(/^\s*(?:[-*?]|\d+[.)]|[一二三四五六七八九十]+[、.])\s*/, '')
    .trim();
  const directLines = value
    .replace(/\r/g, '\n')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);
  if (directLines.length > 1) return directLines.slice(0, 12);

  const text = directLines[0] || value.trim();
  if (!text) return [];
  const colonMatch = text.match(/^([^:：]{1,80})[:：]\s*(.+)$/);
  const candidate = colonMatch && colonMatch[2].length > 40 ? colonMatch[2] : text;
  const parts = candidate
    .replace(/\band\s+(?=(read|check|generate|execute|update|report|scan|skip|create|review|send|enrich|process)\b)/gi, ', ')
    .replace(/并(?=(读取|检查|生成|执行|更新|汇总|扫描|跳过|创建|审核|发送|富集|处理|报告))/g, '，')
    .split(/;\s*|；\s*|,\s+(?=(?:read|check|generate|execute|update|report|scan|skip|create|review|send|enrich|process|wait)\b)|，(?=(?:读取|检查|生成|执行|更新|汇总|扫描|跳过|创建|审核|发送|富集|处理|报告|等待))/i)
    .map(cleanLine)
    .filter(Boolean);
  return (parts.length > 1 ? parts : [text]).slice(0, 12);
}

function todoTone(text: string, fallback: string) {
  const lower = text.toLowerCase();
  if (/(failed|error|rejected|失败|错误|拒绝)/.test(lower)) return 'red';
  if (/(skipped|skip|waiting|pending|待审核|等待|跳过)/.test(lower)) return 'amber';
  if (/(completed|success|approved|sent|acted|done|完成|成功|通过|已发送|执行)/.test(lower)) return 'emerald';
  return fallback;
}

function localizeInternalRunText(value: string, language: string) {
  if (language !== 'zh') return value;
  return value
    .replace(/Scheduled run for ([^:]+):/g, '定期运行：$1：')
    .replace(/Scheduled triggers (?:now )?enqueue an opportunity first\. The policy router decides whether to auto-execute, send to review, or keep it for manual dispatch\./g, '定期触发先进入机会任务队列，由策略路由器决定自动执行、进入审核或保留待派发。')
    .replace(/Creating an opportunity and applying routing policy\./g, '正在创建机会任务并应用路由策略。')
    .replace(/Opportunity dispatched and auto-approved by the agent guardrail policy\./g, '机会任务已派发，并根据智能体护栏策略自动通过。')
    .replace(/Opportunity dispatched and a review-gated execution item was created\./g, '机会任务已派发，并创建待审核执行项。')
    .replace(/Human approved the planned agent run\. Executing configured tools now\./g, '人工已批准计划运行，正在执行配置的工具。')
    .replace(/Human approved the planned agent run\./g, '人工已批准计划运行。')
    .replace(/Human rejected the planned agent run\./g, '人工已拒绝计划运行。')
    .replace(/Backend scheduled agent run started\./g, '后端定期智能体运行已开始。');
}

function runTimelineItems(record: AgentHubRunRecord, language: string, t: (key: string) => string) {
  return [
    {
      label: t('Plan'),
      value: localizeInternalRunText(record.plan, language),
      tone: 'blue',
      time: new Date(record.createdAt).toLocaleString()
    },
    {
      label: t('Expected Result'),
      value: localizeInternalRunText(record.expectedResult, language),
      tone: 'amber',
      time: record.relatedRunId ? `${record.relatedRunType}:${record.relatedRunId}` : t(`trigger_${record.trigger}`)
    },
    {
      label: t('Actual Result'),
      value: record.actualResult ? localizeInternalRunText(record.actualResult, language) : t('Waiting for execution result.'),
      tone: record.status === 'failed' || record.status === 'rejected' ? 'red' : record.status === 'completed' || record.status === 'approved' ? 'emerald' : 'blue',
      time: record.completedAt ? `${t('Completed at')}: ${new Date(record.completedAt).toLocaleString()}` : t(record.status)
    }
  ];
}

function renderTodoTimeline(value: string, fallbackTone: string, language: string) {
  const items = splitTimelineText(value);
  if (items.length === 0) return <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{value}</p>;
  return (
    <div className="relative space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-800/80">
      {items.map((line, itemIndex) => {
        const tone = timelineTone(todoTone(line, fallbackTone));
        return (
          <div key={`${line}-${itemIndex}`} className="relative flex gap-3">
            <div className={cn('relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border shadow', tone.dot)} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-600 mb-0.5">{language === 'zh' ? '步骤' : 'Step'} {itemIndex + 1}</div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{line}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ExecutionLogsPanel({
  language,
  t,
  runLogs,
  agentRunRecords,
  logDisplayLimit,
  expandedTraceRunIds,
  schedulerRunning,
  schedulerSummary,
  schedulerAgentDetails,
  onLogDisplayLimitChange,
  onOpenPolicy,
  onClearTraceLogs,
  onDeleteTraceRun,
  onToggleTraceRunExpanded,
  onRunScheduler,
  onClearAgentRunRecords,
  onDeleteAgentRunRecord
}: ExecutionLogsPanelProps) {
  const isZh = language === 'zh';
  const visibleRunLogs = runLogs.slice(0, logDisplayLimit);
  const visibleAgentRunRecords = agentRunRecords.slice(0, logDisplayLimit);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <ListChecks className="w-4 h-4" /> {t('Agent Runs & Trace Log')}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={logDisplayLimit}
              onChange={event => onLogDisplayLimitChange(Number(event.target.value))}
              className="bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-slate-300"
              title={t('Log display count')}
            >
              {[10, 30, 50, 100].map(count => <option key={count} value={count}>{count}</option>)}
            </select>
            <button onClick={onOpenPolicy} className="text-xs text-blue-300 hover:text-blue-200">{isZh ? '打开审核策略' : 'Open policy'}</button>
            <button
              onClick={() => void onClearTraceLogs()}
              disabled={runLogs.length === 0}
              className="p-1.5 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-40"
              title={t('Clear logs')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="space-y-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
          {runLogs.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">{t('No agent runs yet.')}</div>}
          {visibleRunLogs.map(run => {
            const isExpanded = expandedTraceRunIds.includes(run.id);
            const visibleSteps = isExpanded ? run.steps : run.steps.slice(0, 5);
            const hiddenStepCount = run.steps.length - visibleSteps.length;
            return (
              <div key={run.id} className="bg-black border border-neutral-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-100">{run.title}</div>
                    <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {run.agent}</span>
                      <span>{t('Execution time')}: {new Date(run.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 capitalize">{t(run.status)}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteTraceRun(run)}
                      title={t('Delete run record')}
                      className="p-1.5 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <ol className="mt-4 space-y-2 text-xs text-slate-300">
                  {visibleSteps.map((step, index) => (
                    <li key={`${run.id}-${step.tool}-${index}`} className="rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-500">{index + 1}.</span>
                        <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 font-mono">{step.tool}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] uppercase tracking-wide border',
                          step.status === 'completed' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                            step.status === 'failed' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                              step.status === 'approved' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                                'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        )}>
                          {t(step.status)}
                        </span>
                        {step.title && step.title !== step.tool && <span className="text-slate-400">{step.title}</span>}
                      </div>
                      {step.result && <div className="mt-2 text-slate-500 leading-relaxed">{step.result}</div>}
                    </li>
                  ))}
                  {run.steps.length > 5 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => onToggleTraceRunExpanded(run.id)}
                        className="mt-1 inline-flex items-center rounded border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-500/20"
                      >
                        {isExpanded
                          ? (isZh ? '收起步骤' : 'Collapse steps')
                          : (isZh ? `显示全部步骤（还有 ${hiddenStepCount} 个）` : `Show all steps (${hiddenStepCount} more)`)}
                      </button>
                    </li>
                  )}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <ListChecks className="w-4 h-4" /> {isZh ? '智能体执行历史' : 'Agent Execution History'}
            </div>
            <p className="text-xs text-slate-500 mt-2">{t('Monitor each agent run plan, expected result, and actual result.')}</p>
          </div>
          <button
            onClick={() => void onRunScheduler()}
            disabled={schedulerRunning}
            className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 disabled:bg-slate-900 border border-blue-500/30 disabled:border-slate-700 rounded-md text-xs font-bold text-blue-200 disabled:text-slate-500 flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', schedulerRunning && 'animate-spin')} />
            {t('Run Scheduler')}
          </button>
          <button
            onClick={() => void onClearAgentRunRecords()}
            disabled={agentRunRecords.length === 0}
            className="p-2 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-40"
            title={t('Clear logs')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {schedulerSummary && (
          <div className="mb-4 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-100 space-y-2">
            <div>{schedulerSummary}</div>
            {schedulerAgentDetails.length > 0 && (
              <div className="space-y-1 text-slate-300">
                {schedulerAgentDetails.slice(0, 8).map((item, index) => (
                  <div key={`${item.userId}-${item.agentId}-${index}`} className="flex flex-col gap-0.5 rounded bg-black/40 px-2 py-1">
                    <span className="font-bold text-slate-100">{item.agentName}</span>
                    <span>
                      {t('Status')}: {item.status} · {t('Interval')}: {item.scheduleIntervalValue} {item.scheduleIntervalUnit} · {t('Reason')}: {item.reason}
                      {item.secondsRemaining != null ? ` · ${t('Seconds remaining')}: ${item.secondsRemaining}` : ''}
                    </span>
                    {item.lastRunAt && <span>{t('Last run')}: {new Date(item.lastRunAt).toLocaleString()}</span>}
                    {item.nextRunAt && <span>{t('Next run')}: {new Date(item.nextRunAt).toLocaleString()}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
          {agentRunRecords.length === 0 && (
            <div className="text-sm text-slate-500 py-8 text-center">{t('No agent run records yet.')}</div>
          )}
          {visibleAgentRunRecords.map(record => (
            <div key={record.id} className="bg-black border border-neutral-800 rounded-lg p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-100">{record.agentName}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400 uppercase">{t(`trigger_${record.trigger}`)}</span>
                    <span className={cn('px-2 py-0.5 rounded border text-[10px] uppercase font-bold', record.status === 'failed' || record.status === 'rejected' ? 'bg-red-500/10 border-red-500/30 text-red-300' : record.status === 'completed' || record.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-blue-500/10 border-blue-500/30 text-blue-300')}>
                      {t(record.status)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-2">
                    {new Date(record.createdAt).toLocaleString()}
                    {record.relatedRunId && ` · ${record.relatedRunType}:${record.relatedRunId}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.completedAt && <div className="text-[10px] text-slate-500">{t('Completed at')}: {new Date(record.completedAt).toLocaleString()}</div>}
                  <button
                    type="button"
                    onClick={() => onDeleteAgentRunRecord(record.id)}
                    title={t('Delete run record')}
                    className="p-1.5 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-5 pl-1">
                <div className="relative space-y-5 before:absolute before:left-[10px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-800">
                  {runTimelineItems(record, language, t).map((item, index) => {
                    const tone = timelineTone(item.tone);
                    return (
                      <div key={`${record.id}-${item.label}-${index}`} className="relative flex gap-4">
                        <div className={cn('relative z-10 mt-1 h-5 w-5 rounded-full border-2 shadow-lg', tone.dot)} />
                        <div className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-950 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className={cn('text-[10px] uppercase font-bold', tone.label)}>{item.label}</div>
                            <div className="text-[10px] text-slate-600">{item.time}</div>
                          </div>
                          {item.label === t('Plan') ? (
                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{item.value}</p>
                          ) : (
                            renderTodoTimeline(item.value, item.tone, language)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
