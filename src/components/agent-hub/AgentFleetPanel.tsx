import React from 'react';
import { Power, RefreshCw, Server, ShieldCheck, SlidersHorizontal, Zap } from 'lucide-react';
import { AgentHubAgent } from '../../store';
import { cn } from '../../lib/utils';
import { eventTriggerLabel, guardrailLabel, scheduleLabel, statusClass } from './shared';
import { AgentConfigPanel, AgentConfigValue } from './AgentConfigPanel';

type AgentQueueFilter = 'system' | 'custom';

interface AgentFleetPanelProps {
  language: string;
  t: (key: string) => string;
  activeAgents: number;
  scheduledAgents: number;
  eventTriggeredAgents: number;
  reviewRequiredCount: number;
  systemAgents: AgentHubAgent[];
  customAgents: AgentHubAgent[];
  visibleQueueAgents: AgentHubAgent[];
  activeQueueMeta: { title: string; description: string };
  agentQueueFilter: AgentQueueFilter;
  selectedAgentId: string | null;
  draftAgent: AgentConfigValue | null;
  selectedAgent: AgentConfigValue;
  runningAgentId: string | null;
  onQueueFilterChange: (filter: AgentQueueFilter) => void;
  onSelectAgent: (agentId: string) => void;
  onRunAgent: (agent: AgentHubAgent) => void | Promise<void>;
  onSaveAgent: (agent: AgentConfigValue) => void;
  onResetAgent?: (agent: AgentHubAgent) => AgentHubAgent | null;
  onDeleteAgent?: (agent: AgentHubAgent) => void;
}

export function AgentFleetPanel({
  language,
  t,
  activeAgents,
  scheduledAgents,
  eventTriggeredAgents,
  reviewRequiredCount,
  systemAgents,
  customAgents,
  visibleQueueAgents,
  activeQueueMeta,
  agentQueueFilter,
  selectedAgentId,
  draftAgent,
  selectedAgent,
  runningAgentId,
  onQueueFilterChange,
  onSelectAgent,
  onRunAgent,
  onSaveAgent,
  onResetAgent,
  onDeleteAgent
}: AgentFleetPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: language === 'zh' ? '已启用智能体' : 'Active agents', value: activeAgents, icon: <Power className="w-4 h-4 text-emerald-300" /> },
          { label: language === 'zh' ? '定期运行' : 'Scheduled', value: scheduledAgents, icon: <RefreshCw className="w-4 h-4 text-blue-300" /> },
          { label: language === 'zh' ? '事件触发' : 'Event triggers', value: eventTriggeredAgents, icon: <Zap className="w-4 h-4 text-cyan-300" /> },
          { label: language === 'zh' ? '待审核' : 'Pending review', value: reviewRequiredCount, icon: <ShieldCheck className="w-4 h-4 text-amber-300" /> }
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">{item.label}</span>
              {item.icon}
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-100">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)] gap-8">
        <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
          <div className="mb-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <Server className="w-4 h-4" /> {t('Agent Runtime Status')}
                </div>
                <div className="mt-3 text-sm font-bold text-slate-100">{activeQueueMeta.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{activeQueueMeta.description}</p>
              </div>
              <div className="inline-flex shrink-0 rounded-md border border-neutral-700 bg-black p-1">
                {[
                  { id: 'system' as const, label: language === 'zh' ? '系统 Agent' : 'System', count: systemAgents.length },
                  { id: 'custom' as const, label: language === 'zh' ? '自定义 Agent' : 'Custom', count: customAgents.length }
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onQueueFilterChange(option.id)}
                    className={cn(
                      'rounded px-3 py-1.5 text-xs font-bold transition-colors',
                      agentQueueFilter === option.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-neutral-900 hover:text-slate-100'
                    )}
                  >
                    {option.label}
                    <span className="ml-2 text-[10px] opacity-70">{option.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {visibleQueueAgents.length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-800 bg-black/40 px-4 py-10 text-center text-sm text-slate-500">
                {agentQueueFilter === 'custom'
                  ? (language === 'zh' ? '还没有自定义智能体，点击右上 Create Agent 开始创建。' : 'No custom agents yet. Use Create Agent to add one.')
                  : (language === 'zh' ? '暂无系统级智能体。' : 'No system agents available.')}
              </div>
            )}

            {visibleQueueAgents.map(agent => (
              <div
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                role="button"
                tabIndex={0}
                className={cn(
                  'w-full text-left border rounded-lg p-5 bg-neutral-900 transition-colors cursor-pointer',
                  selectedAgentId === agent.id && !draftAgent ? 'border-blue-500/70 bg-blue-950/20' : 'border-neutral-800 hover:border-blue-500/60'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-100">{agent.name}</h3>
                    <p className="text-sm text-slate-400 mt-3 max-w-2xl">{agent.instructions}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {agent.builtIn && <span className="px-2 py-1 rounded border border-cyan-500/30 bg-cyan-500/10 text-[10px] font-bold uppercase text-cyan-200">{language === 'zh' ? '系统' : 'System'}</span>}
                    <span className={cn('px-3 py-1 rounded border text-[10px] font-bold uppercase', statusClass(agent.status))}>{t(agent.status)}</span>
                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-between gap-4">
                  <span className="px-3 py-1 rounded-md border border-neutral-800 bg-black text-[10px] text-slate-300 uppercase flex items-center gap-1">
                    {agent.guardrail === 'auto' ? <Zap className="w-3 h-3 text-amber-400" /> : <ShieldCheck className="w-3 h-3 text-blue-400" />}
                    {t(guardrailLabel(agent.guardrail))}
                  </span>
                  <span className="px-3 py-1 rounded-md border border-neutral-800 bg-black text-[10px] text-slate-300">{t('Tasks completed')}: {agent.tasksCompleted}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 text-[10px] text-slate-500">
                  <span>{scheduleLabel(agent, t)}</span>
                  {agent.lastRunAt && <span>{t('Last run')}: {new Date(agent.lastRunAt).toLocaleString()}</span>}
                </div>
                {(agent.eventTriggers || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(agent.eventTriggers || []).slice(0, 4).map(trigger => (
                      <span key={trigger} className="rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                        {eventTriggerLabel(trigger, language)}
                      </span>
                    ))}
                    {(agent.eventTriggers || []).length > 4 && <span className="text-[10px] text-slate-500">+{(agent.eventTriggers || []).length - 4}</span>}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onRunAgent(agent);
                    }}
                    disabled={runningAgentId === agent.id || agent.status === 'paused'}
                    className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
                  >
                    {runningAgentId === agent.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {language === 'zh' ? '执行' : 'Run'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <AgentConfigPanel
          agent={selectedAgent}
          onSave={onSaveAgent}
          onReset={'id' in selectedAgent && selectedAgent.builtIn ? onResetAgent : undefined}
          onDelete={'id' in selectedAgent && !selectedAgent.builtIn ? onDeleteAgent : undefined}
        />
      </div>
    </div>
  );
}
