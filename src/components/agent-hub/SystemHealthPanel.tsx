import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../authStore';
import { cn } from '../../lib/utils';

interface HealthSection {
  status: 'ok' | 'warning' | 'idle' | string;
  [key: string]: any;
}

interface SystemHealth {
  generatedAt: string;
  emailSync: HealthSection;
  whatsappSync: HealthSection;
  liveChat: HealthSection;
  scheduler: HealthSection;
  notifications: HealthSection;
  rag: HealthSection;
  llm: HealthSection;
  agentPersistence: HealthSection;
}

interface SystemHealthPanelProps {
  language: string;
}

function statusTone(status: string) {
  if (status === 'ok') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

function statusIcon(status: string) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'warning') return <AlertTriangle className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export function SystemHealthPanel({ language }: SystemHealthPanelProps) {
  const isZh = language === 'zh';
  const { token } = useAuthStore();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
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

  const cards = useMemo(() => health ? [
    {
      id: 'email',
      title: isZh ? '邮件同步' : 'Email Sync',
      description: isZh ? '后台收件、发件配置和最近同步状态。' : 'Background inbox sync, mailbox configuration, and recent sync state.',
      status: health.emailSync.status,
      metrics: [
        [isZh ? '收件服务器' : 'Inbox configs', health.emailSync.inboxConfigs],
        [isZh ? '发件服务器' : 'Outbox configs', health.emailSync.outboxConfigs],
        [isZh ? '最近同步' : 'Last sync', health.emailSync.lastSyncAt ? new Date(health.emailSync.lastSyncAt).toLocaleString() : '-'],
        [isZh ? '错误' : 'Error', health.emailSync.lastError || '-']
      ]
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      description: isZh ? 'Actor Hub、Actor 池和客服 Agent 状态。' : 'Actor Hub, actor pool, and customer-service agent state.',
      status: health.whatsappSync.status,
      metrics: [
        [isZh ? 'Hub 已配置' : 'Hub configured', health.whatsappSync.hubConfigured ? (isZh ? '是' : 'Yes') : (isZh ? '否' : 'No')],
        [isZh ? 'Actor 数量' : 'Actors', health.whatsappSync.actorCount],
        [isZh ? '客服 Agent' : 'Service agent', health.whatsappSync.customerServiceAgentEnabled ? (isZh ? '启用' : 'Enabled') : (isZh ? '关闭' : 'Off')],
        [isZh ? '已处理消息' : 'Processed messages', health.whatsappSync.processedMessageCount]
      ]
    },
    {
      id: 'liveChat',
      title: isZh ? 'Live Chat' : 'Live Chat',
      description: isZh ? '网站访客会话和人工接管工作台状态。' : 'Website visitor sessions and operator desk state.',
      status: health.liveChat.status,
      metrics: [
        [isZh ? '总会话' : 'Total sessions', health.liveChat.totalSessions],
        [isZh ? '开放会话' : 'Open sessions', health.liveChat.openSessions],
        [isZh ? 'Agent 已配置' : 'Agent configured', health.liveChat.agentConfigured ? (isZh ? '是' : 'Yes') : (isZh ? '否' : 'No')],
        [isZh ? '最近更新' : 'Last updated', health.liveChat.lastUpdatedAt ? new Date(health.liveChat.lastUpdatedAt).toLocaleString() : '-']
      ]
    },
    {
      id: 'scheduler',
      title: isZh ? '调度器' : 'Scheduler',
      description: isZh ? '后台智能体调度、周期和事件触发状态。' : 'Background agent schedule, polling, and event trigger state.',
      status: health.scheduler.status,
      metrics: [
        [isZh ? '轮询秒数' : 'Polling seconds', health.scheduler.pollingSeconds || '-'],
        [isZh ? '定时 Agent' : 'Scheduled agents', health.scheduler.activeScheduledAgents],
        [isZh ? '事件 Agent' : 'Event agents', health.scheduler.activeEventAgents]
      ]
    },
    {
      id: 'notifications',
      title: isZh ? '通知' : 'Notifications',
      description: isZh ? 'Bark、Webhook 和事件通知配置。' : 'Bark, webhook, and notification event configuration.',
      status: health.notifications.status,
      metrics: [
        [isZh ? '通知总开关' : 'Enabled', health.notifications.enabled ? (isZh ? '开启' : 'On') : (isZh ? '关闭' : 'Off')],
        ['Bark', health.notifications.barkEnabled ? (isZh ? '开启' : 'On') : (isZh ? '关闭' : 'Off')],
        ['Webhook', health.notifications.webhookEnabled ? (isZh ? '开启' : 'On') : (isZh ? '关闭' : 'Off')],
        [isZh ? '事件数量' : 'Events', health.notifications.enabledEvents?.length || 0]
      ]
    },
    {
      id: 'rag',
      title: 'RAG',
      description: isZh ? '知识库、embedding 和服务器导入目录状态。' : 'Knowledge base, embeddings, and server import directory state.',
      status: health.rag.status,
      metrics: [
        [isZh ? '知识条目' : 'Knowledge items', health.rag.knowledgeItems],
        [isZh ? '已向量化' : 'Embedded', health.rag.embeddedItems],
        [isZh ? '导入目录' : 'Import dir', health.rag.importDirConfigured ? (isZh ? '已配置' : 'Configured') : (isZh ? '未配置' : 'Not configured')],
        [isZh ? '最近更新' : 'Last updated', health.rag.lastUpdatedAt ? new Date(health.rag.lastUpdatedAt).toLocaleString() : '-']
      ]
    },
    {
      id: 'llm',
      title: 'LLM',
      description: isZh ? 'AI Provider 和模块模型映射。' : 'AI providers and module-to-model mapping.',
      status: health.llm.status,
      metrics: [
        [isZh ? 'Provider 数量' : 'Providers', health.llm.configuredProviders],
        [isZh ? '默认模型' : 'Active LLM', health.llm.activeLLMId || '-'],
        [isZh ? '模块映射' : 'Mapped modules', health.llm.mappedModules]
      ]
    },
    {
      id: 'agentPersistence',
      title: isZh ? 'Agent 数据表' : 'Agent Persistence',
      description: isZh ? '任务、机会、审批和执行记录独立表状态。' : 'Dedicated tables for tasks, opportunities, approvals, and execution records.',
      status: health.agentPersistence.status,
      metrics: [
        [isZh ? '任务' : 'Tasks', health.agentPersistence.tasks],
        [isZh ? '机会' : 'Opportunities', health.agentPersistence.opportunities],
        [isZh ? '运行记录' : 'Run records', health.agentPersistence.run_records],
        [isZh ? 'Harness' : 'Harness', health.agentPersistence.harness_runs],
        [isZh ? 'Global Plans' : 'Global plans', health.agentPersistence.global_plans]
      ]
    }
  ] : [], [health, isZh]);

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Activity className="h-4 w-4 text-blue-300" /> {isZh ? '系统健康检查' : 'System Health'}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {isZh ? '检查后台同步、智能体调度、通知、RAG、LLM 和 Agent 数据持久化状态。' : 'Monitor background sync, agent scheduling, notifications, RAG, LLM, and Agent persistence.'}
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
      {health && <div className="mb-4 text-xs text-slate-500">{isZh ? '生成时间' : 'Generated'}: {new Date(health.generatedAt).toLocaleString()}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  <dd className="max-w-[55%] truncate text-right text-slate-200">{String(value ?? '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
