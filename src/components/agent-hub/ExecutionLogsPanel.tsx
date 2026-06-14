import React, { useMemo, useState } from 'react';
import { Cpu, ListChecks, RefreshCw, Trash2, Wrench } from 'lucide-react';
import { AgentHubRunRecord } from '../../store';
import { cn } from '../../lib/utils';
import { agentFixSuggestions } from './shared';

export interface AgentTraceRunStep {
  title: string;
  tool: string;
  status: string;
  result?: string;
  risk?: string;
  resultMeta?: {
    impact?: string;
    landed?: boolean;
    readOnly?: boolean;
    label?: string;
    evidence?: string[];
    summary?: string;
  };
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

type LogTimeFilter = 'all' | 'today' | '7d' | '30d';

const riskFilters = ['all', 'low', 'medium', 'high'] as const;
type LogRiskFilter = typeof riskFilters[number];

function classifyRunIssue(text: string, language: string) {
  const lower = text.toLowerCase();
  const labels = {
    missingConfig: language === 'zh' ? '渠道或配置缺失' : 'Missing channel/config',
    idempotency: language === 'zh' ? '幂等窗口跳过' : 'Idempotency skip',
    noEntity: language === 'zh' ? '未关联主体' : 'No linked entity',
    approval: language === 'zh' ? '等待审批' : 'Approval required',
    failed: language === 'zh' ? '执行失败' : 'Execution failed',
    skipped: language === 'zh' ? '其他跳过' : 'Other skip'
  };
  if (/(not configured|missing|api key|credential|channel|server|未配置|缺失|凭证|密钥)/.test(lower)) return labels.missingConfig;
  if (/(idempot|duplicate|dedupe|skip window|幂等|去重|重复|窗口跳过)/.test(lower)) return labels.idempotency;
  if (/(no linked|not linked|entity|subject|client\/lead|客户\/线索|未关联|主体)/.test(lower)) return labels.noEntity;
  if (/(approval|review|required|pending_review|human|审批|审核|人工)/.test(lower)) return labels.approval;
  if (/(failed|error|exception|失败|错误|报错)/.test(lower)) return labels.failed;
  if (/(skip|skipped|跳过|忽略)/.test(lower)) return labels.skipped;
  return '';
}

function timelineTone(tone: string) {
  if (tone === 'emerald') return { dot: 'bg-emerald-400 border-emerald-300 shadow-emerald-500/30', label: 'text-emerald-300' };
  if (tone === 'amber') return { dot: 'bg-amber-400 border-amber-300 shadow-amber-500/30', label: 'text-amber-300' };
  if (tone === 'red') return { dot: 'bg-red-400 border-red-300 shadow-red-500/30', label: 'text-red-300' };
  return { dot: 'bg-blue-400 border-blue-300 shadow-blue-500/30', label: 'text-blue-300' };
}

function resultMetaTone(meta?: AgentTraceRunStep['resultMeta']) {
  if (!meta) return 'border-neutral-700 bg-neutral-900 text-slate-400';
  if (meta.landed) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (meta.readOnly) return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
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
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState<LogRiskFilter>('all');
  const [timeFilter, setTimeFilter] = useState<LogTimeFilter>('all');
  const withinTimeFilter = (createdAt: string) => {
    if (timeFilter === 'all') return true;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    if (timeFilter === 'today') return new Date(createdAt).toDateString() === new Date().toDateString();
    if (timeFilter === '7d') return now - created <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === '30d') return now - created <= 30 * 24 * 60 * 60 * 1000;
    return true;
  };
  const textRisk = (value: string) => {
    const lower = value.toLowerCase();
    if (/\bhigh\b|高风险|高風險/.test(lower)) return 'high';
    if (/\bmedium\b|中风险|中風險/.test(lower)) return 'medium';
    if (/\blow\b|低风险|低風險/.test(lower)) return 'low';
    return '';
  };
  const runRisk = (run: AgentTraceRun) => {
    const stepRisk = run.steps.map(step => step.risk).find(Boolean);
    return stepRisk || textRisk(`${run.title} ${run.steps.map(step => `${step.title} ${step.result || ''}`).join(' ')}`);
  };
  const recordRisk = (record: AgentHubRunRecord) => textRisk(`${record.plan} ${record.expectedResult} ${record.actualResult || ''}`);
  const agentOptions = useMemo(() => Array.from(new Set([
    ...runLogs.map(run => run.agent),
    ...agentRunRecords.map(record => record.agentName)
  ].filter(Boolean))).sort(), [agentRunRecords, runLogs]);
  const statusOptions = useMemo(() => Array.from(new Set([
    ...runLogs.map(run => run.status),
    ...agentRunRecords.map(record => record.status)
  ].filter(Boolean))).sort(), [agentRunRecords, runLogs]);
  const triggerOptions = useMemo(() => Array.from(new Set([
    ...runLogs.map(run => run.kind),
    ...agentRunRecords.map(record => record.trigger)
  ].filter(Boolean))).sort(), [agentRunRecords, runLogs]);
  const filteredRunLogs = useMemo(() => runLogs.filter(run => (
    (agentFilter === 'all' || run.agent === agentFilter) &&
    (statusFilter === 'all' || run.status === statusFilter) &&
    (triggerFilter === 'all' || run.kind === triggerFilter) &&
    (riskFilter === 'all' || runRisk(run) === riskFilter) &&
    withinTimeFilter(run.createdAt)
  )), [agentFilter, riskFilter, runLogs, statusFilter, timeFilter, triggerFilter]);
  const filteredAgentRunRecords = useMemo(() => agentRunRecords.filter(record => (
    (agentFilter === 'all' || record.agentName === agentFilter) &&
    (statusFilter === 'all' || record.status === statusFilter) &&
    (triggerFilter === 'all' || record.trigger === triggerFilter) &&
    (riskFilter === 'all' || recordRisk(record) === riskFilter) &&
    withinTimeFilter(record.createdAt)
  )), [agentFilter, agentRunRecords, riskFilter, statusFilter, timeFilter, triggerFilter]);
  const issueAggregates = useMemo(() => {
    const buckets = new Map<string, { count: number; sample: string }>();
    const addIssue = (category: string, sample: string) => {
      if (!category) return;
      const existing = buckets.get(category);
      buckets.set(category, {
        count: (existing?.count || 0) + 1,
        sample: existing?.sample || sample.slice(0, 180)
      });
    };
    filteredRunLogs.forEach(run => {
      run.steps.forEach(step => {
        const issueText = `${step.status} ${step.title} ${step.tool} ${step.result || ''}`;
        if (/(failed|skipped|pending|approval|required|error|skip|跳过|失败|审批|审核|未配置|未关联|幂等|去重)/i.test(issueText)) {
          addIssue(classifyRunIssue(issueText, language), `${run.title}: ${step.result || step.title || step.tool}`);
        }
      });
    });
    filteredAgentRunRecords.forEach(record => {
      const issueText = `${record.status} ${record.plan} ${record.expectedResult} ${record.actualResult || ''}`;
      if (/(failed|skipped|pending|approval|required|error|skip|跳过|失败|审批|审核|未配置|未关联|幂等|去重)/i.test(issueText)) {
        addIssue(classifyRunIssue(issueText, language), `${record.agentName}: ${record.actualResult || record.expectedResult || record.plan}`);
      }
    });
    return Array.from(buckets.entries())
      .map(([label, item]) => ({ label, ...item }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAgentRunRecords, filteredRunLogs, language]);
  const visibleRunLogs = filteredRunLogs.slice(0, logDisplayLimit);
  const visibleAgentRunRecords = filteredAgentRunRecords.slice(0, logDisplayLimit);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {isZh ? '日志筛选' : 'Log Filters'}
          </div>
          <button
            type="button"
            onClick={() => {
              setAgentFilter('all');
              setStatusFilter('all');
              setTriggerFilter('all');
              setRiskFilter('all');
              setTimeFilter('all');
            }}
            className="text-xs text-slate-500 hover:text-slate-200"
          >
            {isZh ? '重置筛选' : 'Reset filters'}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">{isZh ? 'Agent' : 'Agent'}</span>
            <select value={agentFilter} onChange={event => setAgentFilter(event.target.value)} className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-slate-200">
              <option value="all">{isZh ? '全部 Agent' : 'All agents'}</option>
              {agentOptions.map(agent => <option key={agent} value={agent}>{agent}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">{isZh ? '状态' : 'Status'}</span>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-slate-200">
              <option value="all">{isZh ? '全部状态' : 'All statuses'}</option>
              {statusOptions.map(status => <option key={status} value={status}>{t(status)}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">{isZh ? '触发来源' : 'Trigger'}</span>
            <select value={triggerFilter} onChange={event => setTriggerFilter(event.target.value)} className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-slate-200">
              <option value="all">{isZh ? '全部来源' : 'All triggers'}</option>
              {triggerOptions.map(trigger => <option key={trigger} value={trigger}>{t(`trigger_${trigger}`)}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">{isZh ? '风险' : 'Risk'}</span>
            <select value={riskFilter} onChange={event => setRiskFilter(event.target.value as LogRiskFilter)} className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-slate-200">
              {riskFilters.map(risk => <option key={risk} value={risk}>{risk === 'all' ? (isZh ? '全部风险' : 'All risks') : risk}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">{isZh ? '时间范围' : 'Time range'}</span>
            <select value={timeFilter} onChange={event => setTimeFilter(event.target.value as LogTimeFilter)} className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-slate-200">
              <option value="all">{isZh ? '全部时间' : 'All time'}</option>
              <option value="today">{isZh ? '今天' : 'Today'}</option>
              <option value="7d">{isZh ? '最近 7 天' : 'Last 7 days'}</option>
              <option value="30d">{isZh ? '最近 30 天' : 'Last 30 days'}</option>
            </select>
          </label>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {isZh
            ? `Trace ${filteredRunLogs.length}/${runLogs.length} · 执行记录 ${filteredAgentRunRecords.length}/${agentRunRecords.length}`
            : `Trace ${filteredRunLogs.length}/${runLogs.length} · execution records ${filteredAgentRunRecords.length}/${agentRunRecords.length}`}
        </div>
        <div className="mt-4 rounded-lg border border-neutral-800 bg-black p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            {isZh ? '失败 / 跳过原因聚合' : 'Failure / Skip Aggregation'}
          </div>
          {issueAggregates.length === 0 ? (
            <div className="text-xs text-slate-500">
              {isZh ? '当前筛选下没有明显失败或跳过原因。' : 'No obvious failure or skip reasons in the current filter.'}
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {issueAggregates.map(item => (
                <div key={item.label} className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-200">{item.label}</span>
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-200">{item.count}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{item.sample}</p>
                  {agentFixSuggestions(`${item.label}\n${item.sample}`, language).length > 0 && (
                    <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1.5">
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-amber-200">
                        <Wrench className="h-3 w-3" />
                        {isZh ? '可修复建议' : 'Fix'}
                      </div>
                      <ul className="space-y-1 text-[10px] leading-relaxed text-amber-100/90">
                        {agentFixSuggestions(`${item.label}\n${item.sample}`, language).slice(0, 2).map(suggestion => <li key={suggestion}>• {suggestion}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
          {filteredRunLogs.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">{t('No agent runs yet.')}</div>}
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
                        {step.resultMeta && (
                          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', resultMetaTone(step.resultMeta))}>
                            {step.resultMeta.label || step.resultMeta.impact || (isZh ? '执行结果' : 'Result')}
                          </span>
                        )}
                        {step.title && step.title !== step.tool && <span className="text-slate-400">{step.title}</span>}
                      </div>
                      {step.resultMeta?.evidence && step.resultMeta.evidence.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {step.resultMeta.evidence.slice(0, 6).map(item => (
                            <span key={`${run.id}-${step.tool}-${index}-${item}`} className="rounded border border-neutral-800 bg-black px-2 py-1 font-mono text-[10px] text-slate-400">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                      {step.result && <div className="mt-2 text-slate-500 leading-relaxed">{step.result}</div>}
                      {agentFixSuggestions(`${step.status}\n${step.title}\n${step.tool}\n${step.result || ''}`, language).length > 0 && (
                        <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                            <Wrench className="h-3.5 w-3.5" />
                            {isZh ? '可修复建议' : 'Fix suggestions'}
                          </div>
                          <ul className="space-y-1 text-[10px] leading-relaxed text-amber-100/90">
                            {agentFixSuggestions(`${step.status}\n${step.title}\n${step.tool}\n${step.result || ''}`, language).map(suggestion => <li key={suggestion}>• {suggestion}</li>)}
                          </ul>
                        </div>
                      )}
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
          {filteredAgentRunRecords.length === 0 && (
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
              {agentFixSuggestions(`${record.status}\n${record.plan}\n${record.expectedResult}\n${record.actualResult || ''}`, language).length > 0 && (
                <div className="mt-4 rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-200">
                    <Wrench className="h-4 w-4" />
                    {isZh ? '可修复建议' : 'Fix Suggestions'}
                  </div>
                  <ul className="space-y-1 text-xs leading-relaxed text-amber-100/90">
                    {agentFixSuggestions(`${record.status}\n${record.plan}\n${record.expectedResult}\n${record.actualResult || ''}`, language).map(suggestion => <li key={suggestion}>• {suggestion}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
    </div>
  );
}
