import React from 'react';
import { Activity, Cpu, ListChecks, MessageSquare, Plus, Server, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AgentHubTab } from './shared';

interface AgentHubHeaderProps {
  language: string;
  tab: AgentHubTab;
  t: (key: string) => string;
  taskCount: number;
  pendingCount: number;
  runCount: number;
  activeAgentCount: number;
  onTabChange: (tab: AgentHubTab) => void;
  onCreateAgent: () => void;
}

export function AgentHubHeader({
  language,
  tab,
  t,
  taskCount,
  pendingCount,
  runCount,
  activeAgentCount,
  onTabChange,
  onCreateAgent
}: AgentHubHeaderProps) {
  const isZh = language === 'zh';

  const tabButton = (id: AgentHubTab, label: string, icon: React.ReactNode, count?: number) => (
    <button
      type="button"
      onClick={() => onTabChange(id)}
      className={cn(
        'flex items-center gap-2 rounded px-4 py-2 text-sm transition-colors',
        tab === id ? 'bg-blue-600/30 text-blue-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'
      )}
    >
      {icon}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
          tab === id ? 'bg-blue-500/30 text-blue-100' : 'bg-neutral-800 text-slate-400'
        )}>
          {count}
        </span>
      )}
    </button>
  );

  const operatingSteps = [
    {
      title: isZh ? '1. 发现任务' : '1. Find Tasks',
      description: isZh ? '定时、事件、聊天或手动扫描都会先进入统一任务队列。' : 'Schedules, events, chat requests, and manual scans first become queue items.',
      icon: <Zap className="h-4 w-4 text-cyan-300" />
    },
    {
      title: isZh ? '2. 策略把关' : '2. Apply Policy',
      description: isZh ? '低风险自动执行；高风险、外发消息和敏感动作进入审批。' : 'Low-risk work can run automatically; risky or customer-facing actions wait for review.',
      icon: <ShieldCheck className="h-4 w-4 text-amber-300" />
    },
    {
      title: isZh ? '3. 追踪结果' : '3. Trace Results',
      description: isZh ? '所有计划、工具调用、跳过原因和失败原因都记录在运行日志。' : 'Plans, tool calls, skips, and failures are tracked in execution logs.',
      icon: <Cpu className="h-4 w-4 text-emerald-300" />
    }
  ];

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-normal">{t('Agent Hub')}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {isZh
              ? '把智能体工作统一收进任务队列、审批中心、运行日志和配置管理。Agent Chat 只作为辅助入口。'
              : 'A clearer operating layer for task queue, approvals, execution logs, and agent configuration. Agent Chat is a helper, not the main workflow.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap rounded-md border border-neutral-700 bg-neutral-900 p-1" aria-label={isZh ? 'Agent Hub 主导航' : 'Agent Hub primary navigation'}>
            {tabButton('opportunities', isZh ? '任务' : 'Tasks', <Zap className="h-4 w-4" />, taskCount)}
            {tabButton('approvals', isZh ? '审批' : 'Approvals', <ShieldCheck className="h-4 w-4" />, pendingCount)}
            {tabButton('runs', isZh ? '运行' : 'Runs', <ListChecks className="h-4 w-4" />, runCount)}
            {tabButton('fleet', isZh ? '配置' : 'Config', <Server className="h-4 w-4" />, activeAgentCount)}
            {tabButton('health', isZh ? '健康' : 'Health', <Activity className="h-4 w-4" />)}
          </div>
          <div className="flex items-center gap-2 border-l border-neutral-800 pl-3">
            <button
              type="button"
              onClick={() => onTabChange('chat')}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition-colors',
                tab === 'chat'
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                  : 'border-neutral-700 bg-neutral-900 text-slate-400 hover:border-neutral-600 hover:text-white'
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Agent Chat
            </button>
            <button onClick={onCreateAgent} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500">
              <Plus className="h-4 w-4" /> {t('Create Agent')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {operatingSteps.map(item => (
          <div key={item.title} className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              {item.icon}
              <span>{item.title}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
