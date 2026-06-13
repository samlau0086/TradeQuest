import React from 'react';
import { Cpu, ListChecks, MessageSquare, Plus, Server, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AgentHubTab } from './shared';

interface AgentHubHeaderProps {
  language: string;
  tab: AgentHubTab;
  t: (key: string) => string;
  onTabChange: (tab: AgentHubTab) => void;
  onCreateAgent: () => void;
}

export function AgentHubHeader({ language, tab, t, onTabChange, onCreateAgent }: AgentHubHeaderProps) {
  const tabButton = (id: AgentHubTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => onTabChange(id)}
      className={cn(
        'px-4 py-2 rounded text-sm flex items-center gap-2',
        tab === id ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:text-white'
      )}
    >
      {icon} {label}
    </button>
  );

  const agentOperatingModel = [
    {
      title: language === 'zh' ? '1. 信号扫描' : '1. Signal Scanner',
      description: language === 'zh' ? '发现机会，不直接改数据或发消息。' : 'Finds opportunities without changing data or sending messages.',
      icon: <Zap className="h-4 w-4 text-cyan-300" />
    },
    {
      title: language === 'zh' ? '2. 任务队列' : '2. Task Queue',
      description: language === 'zh' ? '定时、事件和聊天触发都会先进入统一任务队列。' : 'Scheduled, event, and console-triggered work enters one queue.',
      icon: <ListChecks className="h-4 w-4 text-blue-300" />
    },
    {
      title: language === 'zh' ? '3. 执行策略' : '3. Execution Policy',
      description: language === 'zh' ? '低风险可自动执行，高风险进入审核。' : 'Low-risk work can run automatically; risky work waits for review.',
      icon: <ShieldCheck className="h-4 w-4 text-amber-300" />
    },
    {
      title: language === 'zh' ? '4. 执行日志' : '4. Runtime Trace',
      description: language === 'zh' ? '计划、工具调用结果和失败原因统一追踪。' : 'Plans, tool calls, outcomes, and failures are tracked in one place.',
      icon: <Cpu className="h-4 w-4 text-emerald-300" />
    }
  ];

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-normal">{t('Agent Hub')}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {language === 'zh'
              ? '统一管理信号发现、任务队列、审批策略、执行日志和智能体配置。'
              : 'One operating layer for signals, task queue, approvals, runtime traces, and agent configuration.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-neutral-900 border border-neutral-700 rounded-md p-1 flex flex-wrap">
            {tabButton('opportunities', language === 'zh' ? '任务队列' : 'Task Queue', <Zap className="w-4 h-4" />)}
            {tabButton('approvals', language === 'zh' ? '审批中心' : 'Approval Center', <ShieldCheck className="w-4 h-4" />)}
            {tabButton('runs', language === 'zh' ? '执行日志' : 'Execution Logs', <ListChecks className="w-4 h-4" />)}
            {tabButton('fleet', language === 'zh' ? '智能体配置' : 'Agent Config', <Server className="w-4 h-4" />)}
            {tabButton('chat', language === 'zh' ? '智能体控制台' : 'Agent Console', <MessageSquare className="w-4 h-4" />)}
          </div>
          <button onClick={onCreateAgent} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t('Create Agent')}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {agentOperatingModel.map(item => (
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
