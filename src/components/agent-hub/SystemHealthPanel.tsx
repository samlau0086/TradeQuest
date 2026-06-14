import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, Wrench } from 'lucide-react';
import { useAuthStore } from '../../authStore';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';

interface WorkerState {
  id: string;
  label: string;
  status: 'idle' | 'running' | 'ok' | 'failed' | string;
  intervalMs?: number;
  registeredAt?: string | null;
  lastRunAt?: string | null;
  lastFinishedAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastDurationMs?: number;
  lastError?: string | null;
  nextRunAt?: string | null;
  runCount?: number;
  successCount?: number;
  failureCount?: number;
  details?: any;
}

interface HealthSection {
  status: 'ok' | 'warning' | 'idle' | string;
  worker?: WorkerState;
  signalScannerWorker?: WorkerState;
  [key: string]: any;
}

interface SystemHealth {
  generatedAt: string;
  workers?: WorkerState[];
  emailSync: HealthSection;
  whatsappSync: HealthSection;
  liveChat: HealthSection;
  scheduler: HealthSection;
  notifications: HealthSection;
  rag: HealthSection;
  llm: HealthSection;
  agentPersistence: HealthSection;
  startup?: {
    generatedAt: string | null;
    checks: Array<{ name: string; status: string; message: string; details?: any; checkedAt: string }>;
    workers: Record<string, { status: string; intervalMs?: number; registeredAt?: string; message?: string }>;
  };
}

interface SystemHealthPanelProps {
  language: string;
}

function statusTone(status: string) {
  if (status === 'ok') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'running') return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
  if (status === 'failed' || status === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

function statusIcon(status: string) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'running') return <RefreshCw className="h-4 w-4 animate-spin" />;
  if (status === 'failed' || status === 'warning') return <AlertTriangle className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatDuration(ms?: number) {
  if (typeof ms !== 'number') return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

function formatInterval(ms?: number) {
  if (!ms) return '-';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3_600_000)}h`;
}

function compactDetails(details: any) {
  if (!details) return '-';
  if (typeof details === 'string') return details;
  if (Array.isArray(details)) return `${details.length} item(s)`;
  if (typeof details === 'object') {
    return Object.entries(details)
      .slice(0, 5)
      .map(([key, value]) => `${key}:${String(value)}`)
      .join(' · ');
  }
  return String(details);
}

export function SystemHealthPanel({ language }: SystemHealthPanelProps) {
  const isZh = language === 'zh';
  const { token } = useAuthStore();
  const { notify, fetchUserSettings } = useStore();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState('');

  const loadHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/system/health', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load system health');
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHealth();
  }, [token]);

  const runRepair = async () => {
    setRepairing(true);
    setError('');
    try {
      const response = await fetch('/api/agent-hub/repair', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scope: 'invalid-agent-work' })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to repair Agent Hub state');
      notify(
        isZh
          ? `Agent Hub 状态已修复，关闭 ${data.changed || 0} 个无效项。`
          : `Agent Hub state repaired. Closed ${data.changed || 0} invalid item(s).`,
        data.changed > 0 ? 'success' : 'info'
      );
      await fetchUserSettings();
      await loadHealth();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to repair Agent Hub state';
      setError(message);
      notify(message, 'error');
    } finally {
      setRepairing(false);
    }
  };

  const workers = health?.workers || [];
  const workerSummary = useMemo(() => ({
    running: workers.filter(worker => worker.status === 'running').length,
    failed: workers.filter(worker => worker.status === 'failed').length,
    ok: workers.filter(worker => worker.status === 'ok').length,
    idle: workers.filter(worker => worker.status === 'idle').length
  }), [workers]);

  const cards = useMemo(() => health ? [
    {
      id: 'email',
      title: isZh ? '邮件同步' : 'Email Sync',
      description: isZh ? '后台收件同步的真实运行状态和邮箱配置。' : 'Real background inbox sync runtime and mailbox configuration.',
      status: health.emailSync.status,
      metrics: [
        [isZh ? '最近运行' : 'Last run', formatTime(health.emailSync.worker?.lastRunAt || health.emailSync.lastSyncAt)],
        [isZh ? '耗时' : 'Duration', formatDuration(health.emailSync.worker?.lastDurationMs)],
        [isZh ? '下次运行' : 'Next run', formatTime(health.emailSync.worker?.nextRunAt)],
        [isZh ? '收件服务器' : 'Inbox configs', health.emailSync.inboxConfigs],
        [isZh ? '最近错误' : 'Last error', health.emailSync.worker?.lastError || health.emailSync.lastError || '-']
      ]
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Sync',
      description: isZh ? 'Actor Hub 增量同步与客服消息拉取状态。' : 'Actor Hub incremental sync and customer-service message fetch state.',
      status: health.whatsappSync.status,
      metrics: [
        [isZh ? '最近运行' : 'Last run', formatTime(health.whatsappSync.worker?.lastRunAt)],
        [isZh ? '耗时' : 'Duration', formatDuration(health.whatsappSync.worker?.lastDurationMs)],
        [isZh ? '下次运行' : 'Next run', formatTime(health.whatsappSync.worker?.nextRunAt)],
        [isZh ? 'Actor 数量' : 'Actors', health.whatsappSync.actorCount],
        [isZh ? '最近错误' : 'Last error', health.whatsappSync.worker?.lastError || '-']
      ]
    },
    {
      id: 'liveChat',
      title: isZh ? 'Live Chat Agent' : 'Live Chat Agent',
      description: isZh ? '访客消息触发的实时客服 Agent 运行状态。' : 'Event-driven customer-service agent runtime for visitor messages.',
      status: health.liveChat.worker?.status || health.liveChat.status,
      metrics: [
        [isZh ? '最近运行' : 'Last run', formatTime(health.liveChat.worker?.lastRunAt)],
        [isZh ? '耗时' : 'Duration', formatDuration(health.liveChat.worker?.lastDurationMs)],
        [isZh ? '成功/失败' : 'Success/Fail', `${health.liveChat.worker?.successCount || 0}/${health.liveChat.worker?.failureCount || 0}`],
        [isZh ? '开放会话' : 'Open sessions', health.liveChat.openSessions],
        [isZh ? '最近错误' : 'Last error', health.liveChat.worker?.lastError || '-']
      ]
    },
    {
      id: 'signal',
      title: isZh ? 'Signal Scanner' : 'Signal Scanner',
      description: isZh ? '扫描 CRM 信号并生成机会任务的实际运行状态。' : 'Runtime for scanning CRM signals and creating opportunity tasks.',
      status: health.scheduler.signalScannerWorker?.status || 'idle',
      metrics: [
        [isZh ? '最近运行' : 'Last run', formatTime(health.scheduler.signalScannerWorker?.lastRunAt)],
        [isZh ? '耗时' : 'Duration', formatDuration(health.scheduler.signalScannerWorker?.lastDurationMs)],
        [isZh ? '下次检查' : 'Next check', formatTime(health.scheduler.signalScannerWorker?.nextRunAt)],
        [isZh ? '成功/失败' : 'Success/Fail', `${health.scheduler.signalScannerWorker?.successCount || 0}/${health.scheduler.signalScannerWorker?.failureCount || 0}`],
        [isZh ? '最近错误' : 'Last error', health.scheduler.signalScannerWorker?.lastError || '-']
      ]
    },
    {
      id: 'scheduler',
      title: isZh ? 'Scheduler' : 'Scheduler',
      description: isZh ? 'Agent Hub 调度器本身的心跳与执行状态。' : 'Agent Hub scheduler heartbeat and execution state.',
      status: health.scheduler.worker?.status || health.scheduler.status,
      metrics: [
        [isZh ? '最近运行' : 'Last run', formatTime(health.scheduler.worker?.lastRunAt)],
        [isZh ? '耗时' : 'Duration', formatDuration(health.scheduler.worker?.lastDurationMs)],
        [isZh ? '下次运行' : 'Next run', formatTime(health.scheduler.worker?.nextRunAt)],
        [isZh ? '定时 Agent' : 'Scheduled agents', health.scheduler.activeScheduledAgents],
        [isZh ? '事件 Agent' : 'Event agents', health.scheduler.activeEventAgents]
      ]
    },
    {
      id: 'rag',
      title: 'RAG / LLM',
      description: isZh ? '知识库、Embedding 与 AI Provider 配置。' : 'Knowledge base, embeddings, and AI provider configuration.',
      status: health.rag.status === 'ok' && health.llm.status === 'ok' ? 'ok' : 'warning',
      metrics: [
        [isZh ? '知识条目' : 'Knowledge items', health.rag.knowledgeItems],
        [isZh ? '已向量化' : 'Embedded', health.rag.embeddedItems],
        [isZh ? 'Provider 数量' : 'Providers', health.llm.configuredProviders],
        [isZh ? '默认模型' : 'Active LLM', health.llm.activeLLMId || '-'],
        [isZh ? '最近更新' : 'Last updated', formatTime(health.rag.lastUpdatedAt)]
      ]
    }
  ] : [], [health, isZh]);

  const repair = health?.agentPersistence?.repair;

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Activity className="h-4 w-4 text-blue-300" /> {isZh ? '后台 Worker 运行监控' : 'Background Worker Monitor'}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {isZh
              ? '显示 Email Sync、WhatsApp Sync、Live Chat Agent、Signal Scanner 和 Scheduler 的真实运行状态。'
              : 'Shows real runtime status for Email Sync, WhatsApp Sync, Live Chat Agent, Signal Scanner, and Scheduler.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadHealth()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-600/20 px-3 py-2 text-xs font-bold text-blue-100 hover:bg-blue-600/30 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          {isZh ? '刷新' : 'Refresh'}
        </button>
      </div>

      {error && <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      {health && (
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded border border-neutral-800 bg-black px-3 py-2">
            <div className="text-xs text-slate-500">{isZh ? '生成时间' : 'Generated'}</div>
            <div className="mt-1 text-sm text-slate-200">{formatTime(health.generatedAt)}</div>
          </div>
          <div className="rounded border border-neutral-800 bg-black px-3 py-2">
            <div className="text-xs text-slate-500">{isZh ? '运行中' : 'Running'}</div>
            <div className="mt-1 text-lg font-bold text-blue-200">{workerSummary.running}</div>
          </div>
          <div className="rounded border border-neutral-800 bg-black px-3 py-2">
            <div className="text-xs text-slate-500">{isZh ? '成功' : 'OK'}</div>
            <div className="mt-1 text-lg font-bold text-emerald-200">{workerSummary.ok}</div>
          </div>
          <div className="rounded border border-neutral-800 bg-black px-3 py-2">
            <div className="text-xs text-slate-500">{isZh ? '失败' : 'Failed'}</div>
            <div className="mt-1 text-lg font-bold text-amber-200">{workerSummary.failed}</div>
          </div>
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Clock3 className="h-4 w-4 text-blue-300" />
          {isZh ? 'Worker 状态表' : 'Worker Status Table'}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-neutral-950 text-slate-500">
              <tr>
                <th className="px-4 py-3">{isZh ? 'Worker' : 'Worker'}</th>
                <th className="px-4 py-3">{isZh ? '状态' : 'Status'}</th>
                <th className="px-4 py-3">{isZh ? '最近运行' : 'Last Run'}</th>
                <th className="px-4 py-3">{isZh ? '耗时' : 'Duration'}</th>
                <th className="px-4 py-3">{isZh ? '下次运行' : 'Next Run'}</th>
                <th className="px-4 py-3">{isZh ? '成功/失败' : 'Success/Fail'}</th>
                <th className="px-4 py-3">{isZh ? '详情 / 错误' : 'Details / Error'}</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(worker => (
                <tr key={worker.id} className="border-t border-neutral-900">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-100">{worker.label}</div>
                    <div className="mt-1 font-mono text-[10px] text-slate-600">{worker.id} · {formatInterval(worker.intervalMs)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold uppercase', statusTone(worker.status))}>
                      {statusIcon(worker.status)}
                      {worker.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatTime(worker.lastRunAt)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatDuration(worker.lastDurationMs)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatTime(worker.nextRunAt)}</td>
                  <td className="px-4 py-3 text-slate-300">{worker.successCount || 0}/{worker.failureCount || 0}</td>
                  <td className="max-w-xs px-4 py-3">
                    <div className={cn('truncate', worker.lastError ? 'text-amber-200' : 'text-slate-500')} title={worker.lastError || compactDetails(worker.details)}>
                      {worker.lastError || compactDetails(worker.details)}
                    </div>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    {isZh ? '暂无 Worker 运行记录。' : 'No worker runtime records yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {repair && (
        <div className={cn(
          'mb-4 rounded-lg border p-4',
          repair.repairableCount > 0 ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10'
        )}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                <Wrench className={cn('h-4 w-4', repair.repairableCount > 0 ? 'text-amber-300' : 'text-emerald-300')} />
                {isZh ? 'Agent Hub 状态修复' : 'Agent Hub State Repair'}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {isZh
                  ? '检查引用已删除或缺失邮件、客户、Lead 的任务，避免刷新后复活或重复派发。'
                  : 'Checks tasks that reference deleted or missing emails, clients, or leads to prevent resurrection and redispatch.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runRepair()}
              disabled={repairing || loading || repair.repairableCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wrench className={cn('h-4 w-4', repairing && 'animate-pulse')} />
              {repair.repairableCount > 0
                ? (isZh ? `修复 ${repair.repairableCount} 个问题` : `Repair ${repair.repairableCount} issue(s)`)
                : (isZh ? '无需修复' : 'No repair needed')}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => (
          <div key={card.id} className="rounded-lg border border-neutral-800 bg-black p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-100">{card.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{card.description}</p>
              </div>
              <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold uppercase', statusTone(card.status))}>
                {statusIcon(card.status)}
                {card.status}
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-xs">
              {card.metrics.map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-3 rounded border border-neutral-900 bg-neutral-950 px-2 py-1.5">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="max-w-[58%] truncate text-right text-slate-200" title={String(value ?? '-')}>{String(value ?? '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
