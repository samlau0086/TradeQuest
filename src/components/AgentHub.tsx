import React, { useMemo, useState } from 'react';
import { Bot, Check, CheckCircle2, ClipboardCheck, Cpu, ListChecks, Plus, Power, Save, Search, Server, ShieldCheck, SlidersHorizontal, Trash2, X, XCircle, Zap } from 'lucide-react';
import { AgentHubAgent, AgentHubGuardrail, AgentHubScheduleUnit, AgentHubStatus, GLOBAL_AGENT_ACTION_TYPES, GlobalAgentActionType, useStore } from '../store';
import { cn } from '../lib/utils';
import { AgentHarness } from './AgentHarness';
import { GlobalAgent } from './GlobalAgent';
import { useTranslation } from '../lib/i18n';
import { AGENT_TOOL_REGISTRY, getAgentToolDefinition } from '../lib/agentTools';

const ACTION_LABELS: Record<GlobalAgentActionType, string> = {
  create_lead_campaign: 'Create Lead Campaign',
  run_lead_campaign: 'Run Lead Campaign',
  create_followup_workflow: 'Create Follow-up Workflow',
  process_customer_reply: 'Process Customer Reply',
  send_email: 'Send Email',
  send_whatsapp: 'Send WhatsApp',
  update_client_stage: 'Update Client Stage',
  add_client_comment: 'Add Client Comment',
  enrich_client_data: 'Enrich Client Data',
  create_deal: 'Create Deal',
  create_quote: 'Create Quote',
  prioritize_leads: 'Prioritize Leads',
  review_pipeline: 'Review Pipeline'
};

type AgentHubTab = 'fleet' | 'approvals' | 'runs' | 'harness' | 'global';

const emptyAgent = (): Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'> => ({
  name: '',
  instructions: '',
  guardrail: 'review',
  status: 'idle',
  tools: [],
  scheduleEnabled: false,
  scheduleIntervalMinutes: 1440,
  scheduleIntervalValue: 1,
  scheduleIntervalUnit: 'day',
  scheduleDayOfMonth: 1,
  scheduleMaxRuns: null,
  scheduleRunCount: 0,
  contextSuggestionMode: 'manual',
  builtIn: false
});

function statusClass(status: AgentHubStatus) {
  if (status === 'active') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  if (status === 'paused') return 'border-slate-500/40 bg-slate-500/10 text-slate-300';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
}

function guardrailLabel(guardrail: AgentHubGuardrail) {
  if (guardrail === 'auto') return 'Auto';
  if (guardrail === 'human_loop') return 'Human-in-the-loop';
  return 'Review required';
}

function scheduleLabel(agent: AgentHubAgent, t: (key: string) => string) {
  if (!agent.scheduleEnabled) return t('Schedule off');
  const unit = agent.scheduleIntervalUnit || 'minute';
  const value = agent.scheduleIntervalValue || agent.scheduleIntervalMinutes || 1;
  const runs = agent.scheduleMaxRuns ? ` · ${t('Runs')} ${agent.scheduleRunCount || 0}/${agent.scheduleMaxRuns}` : '';
  if (unit === 'month_day') return `${t('Monthly on day')} ${agent.scheduleDayOfMonth || 1}${runs}`;
  return `${t('Every')} ${value} ${t(unit)}${value === 1 ? '' : t('s')}${runs}`;
}

function riskClass(risk: string) {
  if (risk === 'high') return 'border-red-500/40 bg-red-500/10 text-red-300';
  if (risk === 'medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
}

function ToolSelector({
  selected,
  onChange,
  t
}: {
  selected: string[];
  onChange: (tools: string[]) => void;
  t: (key: string) => string;
}) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const selectedSet = new Set(selected);
  const filteredTools = AGENT_TOOL_REGISTRY.filter(tool => {
    const haystack = `${tool.id} ${tool.label} ${tool.description} ${tool.category}`.toLowerCase();
    return !normalized || haystack.includes(normalized);
  });
  const unknownTools = selected.filter(tool => !getAgentToolDefinition(tool));

  const toggleTool = (toolId: string) => {
    onChange(selectedSet.has(toolId) ? selected.filter(item => item !== toolId) : [...selected, toolId]);
  };

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-2 min-h-8">
        {selected.length === 0 && <span className="text-xs text-slate-500">{t('No tools selected')}</span>}
        {selected.map(toolId => {
          const tool = getAgentToolDefinition(toolId);
          return (
            <span key={toolId} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', tool ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-red-500/40 bg-red-500/10 text-red-300')}>
              {tool?.id || toolId}
              <button type="button" onClick={() => onChange(selected.filter(item => item !== toolId))} className="text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('Search tools...')}
          className="w-full bg-black border border-neutral-700 rounded-md pl-9 pr-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
        />
      </div>
      {unknownTools.length > 0 && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {t('Unknown tools will not be executed by the system')}: {unknownTools.join(', ')}
        </div>
      )}
      <div className="max-h-64 overflow-y-auto rounded-md border border-neutral-800 bg-black">
        {filteredTools.map(tool => {
          const isSelected = selectedSet.has(tool.id);
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => toggleTool(tool.id)}
              className={cn('w-full text-left p-3 border-b border-neutral-900 hover:bg-slate-900/80 transition-colors', isSelected && 'bg-blue-950/30')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-blue-300">{tool.id}</span>
                    <span className="text-xs text-slate-300">{t(tool.label)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{t(tool.description)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">{t(tool.category)}</span>
                    <span className={cn('rounded border px-2 py-0.5 text-[10px] uppercase font-bold', riskClass(tool.risk))}>{t(tool.risk)}</span>
                    {tool.reviewRequired && <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300">{t('Review required')}</span>}
                  </div>
                </div>
                <span className={cn('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border', isSelected ? 'border-blue-400 bg-blue-500 text-white' : 'border-slate-700 text-transparent')}>
                  <Check className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          );
        })}
        {filteredTools.length === 0 && <div className="p-4 text-sm text-slate-500 text-center">{t('No matching tools')}</div>}
      </div>
    </div>
  );
}

function AgentModal({
  agent,
  onClose,
  onSave
}: {
  agent: Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'> | AgentHubAgent;
  onClose: () => void;
  onSave: (agent: Omit<AgentHubAgent, 'createdAt' | 'updatedAt' | 'tasksCompleted'> | Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'>) => void;
}) {
  const { language } = useStore();
  const t = useTranslation(language);
  const [form, setForm] = useState(agent);
  const isEdit = 'id' in agent;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-100">{isEdit ? t('Configure Agent') : t('Create Agent')}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <label className="block">
            <span className="text-sm text-slate-200">{t('Agent Name')}</span>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={t('e.g. Objections Handler Agent')}
              className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-200">{t('Prompt / Instructions')}</span>
            <textarea
              value={form.instructions}
              onChange={e => setForm({ ...form, instructions: e.target.value })}
              placeholder={t('Describe what this agent does...')}
              className="mt-2 w-full min-h-28 bg-black border border-neutral-700 rounded-md px-4 py-3 text-sm text-slate-100 outline-none resize-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-200">{t('Harness / Guardrails')}</span>
            <select
              value={form.guardrail}
              onChange={e => setForm({ ...form, guardrail: e.target.value as AgentHubGuardrail })}
              className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="auto">{t('Auto-execute (No approval needed)')}</option>
              <option value="review">{t('Requires approval before execution')}</option>
              <option value="human_loop">{t('Human-in-the-loop for outbound actions')}</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">{t('Determines whether this agent can immediately act or must wait for approval.')}</p>
          </label>
          <label className="block">
            <span className="text-sm text-slate-200">{t('Tools')}</span>
            <ToolSelector selected={form.tools || []} onChange={tools => setForm({ ...form, tools })} t={t} />
          </label>
          <label className="block">
            <span className="text-sm text-slate-200">{t('Context Suggestions')}</span>
            <select
              value={form.contextSuggestionMode || 'manual'}
              onChange={e => setForm({ ...form, contextSuggestionMode: e.target.value as any })}
              className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="manual">{t('Manual options only')}</option>
              <option value="auto">{t('Allow automated option execution')}</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">{t('Controls whether inbox context suggestions are shown as manual actions or automation-ready options.')}</p>
          </label>
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm text-slate-200">{t('Scheduled Run')}</span>
                <span className="block text-xs text-slate-500 mt-1">{t('Create a run automatically on a recurring interval.')}</span>
              </span>
              <input
                type="checkbox"
                checked={!!form.scheduleEnabled}
                onChange={e => setForm({ ...form, scheduleEnabled: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400 font-bold uppercase">{t('Schedule Frequency')}</span>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-2">
                <input
                  type="number"
                  min={1}
                  value={form.scheduleIntervalValue || form.scheduleIntervalMinutes || 1}
                  onChange={e => {
                    const value = Math.max(1, Number(e.target.value) || 1);
                    const unit = form.scheduleIntervalUnit || 'day';
                    const minutes = unit === 'second' ? Math.max(1, Math.ceil(value / 60)) : unit === 'minute' ? value : unit === 'hour' ? value * 60 : value * 1440;
                    setForm({ ...form, scheduleIntervalValue: value, scheduleIntervalMinutes: minutes });
                  }}
                  disabled={form.scheduleIntervalUnit === 'month_day'}
                  className="w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <select
                  value={form.scheduleIntervalUnit || 'day'}
                  onChange={e => {
                    const unit = e.target.value as AgentHubScheduleUnit;
                    const value = form.scheduleIntervalValue || 1;
                    const minutes = unit === 'second' ? Math.max(1, Math.ceil(value / 60)) : unit === 'minute' ? value : unit === 'hour' ? value * 60 : value * 1440;
                    setForm({ ...form, scheduleIntervalUnit: unit, scheduleIntervalMinutes: minutes, scheduleDayOfMonth: form.scheduleDayOfMonth || 1 });
                  }}
                  className="w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                >
                  <option value="second">{t('seconds')}</option>
                  <option value="minute">{t('minutes')}</option>
                  <option value="hour">{t('hours')}</option>
                  <option value="day">{t('days')}</option>
                  <option value="month_day">{t('monthlyDay')}</option>
                </select>
              </div>
            </label>
            {(form.scheduleIntervalUnit || 'day') === 'month_day' && (
              <label className="block">
                <span className="text-xs text-slate-400 font-bold uppercase">{t('Day of month')}</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.scheduleDayOfMonth || 1}
                  onChange={e => setForm({ ...form, scheduleDayOfMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                  className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs text-slate-400 font-bold uppercase">{t('Execution count')}</span>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={form.scheduleMaxRuns ?? ''}
                  placeholder={t('Unlimited')}
                  onChange={e => setForm({ ...form, scheduleMaxRuns: e.target.value === '' ? null : Math.max(1, Number(e.target.value) || 1) })}
                  className="w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                />
                <div className="bg-black border border-neutral-800 rounded-md px-3 py-2 text-sm text-slate-400">
                  {t('Executed')}: {form.scheduleRunCount || 0}
                </div>
              </div>
            </label>
            {'lastRunAt' in form && form.lastRunAt && (
              <div className="text-xs text-slate-500">{t('Last run')}: {new Date(form.lastRunAt).toLocaleString()}</div>
            )}
          </div>
          {isEdit && (
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-100">{t('Agent Status')}</div>
                <div className="text-xs text-slate-500">{t('Currently')}: {t(form.status)}</div>
              </div>
              <button
                onClick={() => setForm({ ...form, status: form.status === 'active' ? 'idle' : 'active' })}
                className="px-4 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center gap-2"
              >
                <Power className="w-4 h-4" />
                {form.status === 'active' ? t('Set Idle') : t('Activate Agent')}
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-5 border-t border-neutral-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm text-slate-300 hover:text-white">{t('Cancel')}</button>
          <button
            onClick={() => form.name.trim() && onSave(form)}
            disabled={!form.name.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-md text-sm font-bold text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isEdit ? t('Save Changes') : t('Create Agent')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AgentHub() {
  const {
    language,
    agentHubAgents,
    addAgentHubAgent,
    updateAgentHubAgent,
    agentHarnessRuns,
    globalAgentPlans,
    agentRunRecords,
    updateAgentHarnessRun,
    deleteAgentHarnessRun,
    updateGlobalAgentPlan,
    deleteGlobalAgentPlan,
    updateAgentRunRecord,
    deleteAgentRunRecord,
    agentExecutionPolicy,
    updateAgentExecutionPolicy
  } = useStore();
  const t = useTranslation(language);
  const [tab, setTab] = useState<AgentHubTab>('fleet');
  const [modalAgent, setModalAgent] = useState<AgentHubAgent | ReturnType<typeof emptyAgent> | null>(null);

  const pendingItems = useMemo(() => [
    ...agentHarnessRuns.filter(run => run.status === 'pending_review').map(run => ({ kind: 'harness' as const, id: run.id, title: run.summary, agent: 'Agent Harness', body: run.objective, createdAt: run.createdAt })),
    ...globalAgentPlans.filter(plan => plan.status === 'pending_review').map(plan => ({ kind: 'global' as const, id: plan.id, title: plan.summary, agent: 'Global Agent', body: plan.objective, createdAt: plan.createdAt }))
  ], [agentHarnessRuns, globalAgentPlans]);

  const runLogs = useMemo(() => [
    ...agentHarnessRuns.map(run => ({ kind: 'harness' as const, id: run.id, title: run.summary, agent: 'Agent Harness', status: run.status, steps: run.steps.map(step => `${step.tool}: ${step.status}`), createdAt: run.createdAt })),
    ...globalAgentPlans.map(plan => ({ kind: 'global' as const, id: plan.id, title: plan.summary, agent: 'Global Agent', status: plan.status, steps: plan.steps.map(step => `${step.actionType}: ${step.status}`), createdAt: plan.createdAt }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8), [agentHarnessRuns, globalAgentPlans]);

  const computedAgents = agentHubAgents.map(agent => ({
    ...agent,
    tasksCompleted: agent.tasksCompleted + runLogs.filter(run => run.agent.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()) && run.status === 'completed').length
  }));

  const approveItem = (item: typeof pendingItems[number]) => {
    if (item.kind === 'harness') updateAgentHarnessRun(item.id, { status: 'approved', approvedAt: new Date().toISOString() });
    if (item.kind === 'global') updateGlobalAgentPlan(item.id, { status: 'approved', approvedAt: new Date().toISOString() });
    const linkedRecord = agentRunRecords.find(record => record.relatedRunId === item.id && record.relatedRunType === item.kind);
    if (linkedRecord) {
      updateAgentRunRecord(linkedRecord.id, {
        status: 'approved',
        actualResult: 'Human approved the planned agent run.'
      });
    }
  };

  const rejectItem = (item: typeof pendingItems[number]) => {
    if (item.kind === 'harness') updateAgentHarnessRun(item.id, { status: 'rejected', rejectedAt: new Date().toISOString(), rejectedReason: 'Rejected from Agent Hub' });
    if (item.kind === 'global') updateGlobalAgentPlan(item.id, { status: 'rejected', rejectedAt: new Date().toISOString(), rejectedReason: 'Rejected from Agent Hub' });
    const linkedRecord = agentRunRecords.find(record => record.relatedRunId === item.id && record.relatedRunType === item.kind);
    if (linkedRecord) {
      updateAgentRunRecord(linkedRecord.id, {
        status: 'rejected',
        actualResult: 'Human rejected the planned agent run.',
        completedAt: new Date().toISOString()
      });
    }
  };

  const deleteRunLog = (run: typeof runLogs[number]) => {
    if (run.kind === 'harness') deleteAgentHarnessRun(run.id);
    if (run.kind === 'global') deleteGlobalAgentPlan(run.id);
  };

  const tabButton = (id: AgentHubTab, label: string, icon: React.ReactNode) => (
    <button onClick={() => setTab(id)} className={cn('px-4 py-2 rounded text-sm flex items-center gap-2', tab === id ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:text-white')}>
      {icon} {t(label)}
    </button>
  );

  return (
    <div className="flex-1 bg-black text-slate-100 overflow-y-auto">
      <div className="p-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-normal">{t('Agent Hub')}</h1>
            <p className="text-slate-400 text-sm mt-1">{t('Monitor workloads and manage the intelligence layer.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-neutral-900 border border-neutral-700 rounded-md p-1 flex flex-wrap">
              {tabButton('approvals', 'Harness & Approvals', <ShieldCheck className="w-4 h-4" />)}
              {tabButton('runs', 'Agent Run History', <ListChecks className="w-4 h-4" />)}
              {tabButton('harness', 'Agent Harness', <Cpu className="w-4 h-4" />)}
              {tabButton('global', 'Global Agent', <Bot className="w-4 h-4" />)}
              {tabButton('fleet', 'Agent Fleet', <Server className="w-4 h-4" />)}
            </div>
            <button onClick={() => setModalAgent(emptyAgent())} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('Create Agent')}
            </button>
          </div>
        </div>

        {tab === 'fleet' && (
          <div className="max-w-5xl bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
              <Server className="w-4 h-4" /> {t('Agent Runtime Status')}
            </div>
            <div className="space-y-4">
              {computedAgents.map(agent => (
                <div key={agent.id} className="border border-neutral-800 hover:border-blue-500/60 rounded-lg p-5 bg-neutral-900 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-100">{agent.name}</h3>
                      <p className="text-sm text-slate-400 mt-3 max-w-2xl">{agent.instructions}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-3 py-1 rounded border text-[10px] font-bold uppercase', statusClass(agent.status))}>{t(agent.status)}</span>
                      <button onClick={() => setModalAgent(agent)} className="p-2 text-slate-400 hover:text-white hover:bg-neutral-800 rounded-md">
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
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
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'approvals' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
                <ClipboardCheck className="w-4 h-4" /> {t('Human Approvals')}
              </div>
              <div className="space-y-4">
                {pendingItems.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">{t('No approvals waiting.')}</div>}
                {pendingItems.map(item => (
                  <div key={`${item.kind}-${item.id}`} className="bg-slate-950 border border-blue-500/30 rounded-lg p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-blue-300 mb-3">
                          <span className="px-2 py-1 rounded bg-blue-600/20 border border-blue-500/40 uppercase font-bold">{t('Requires Approval')}</span>
                          <Bot className="w-3 h-3" /> {item.agent}
                        </div>
                        <h3 className="font-bold text-slate-100">{item.title}</h3>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-4 bg-black border border-neutral-800 rounded-md p-4 text-sm text-slate-300 whitespace-pre-wrap">{item.body}</div>
                    <div className="mt-4 flex justify-end gap-3">
                      <button onClick={() => rejectItem(item)} className="px-4 py-2 text-red-300 hover:bg-red-500/10 rounded-md text-sm font-bold flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> {t('Reject')}
                      </button>
                      <button onClick={() => approveItem(item)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-white text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> {t('Approve')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                <ShieldCheck className="w-4 h-4" /> {t('Harness Strategy')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {GLOBAL_AGENT_ACTION_TYPES.map(actionType => {
                  const rule = agentExecutionPolicy[actionType];
                  return (
                    <div key={actionType} className="bg-black border border-neutral-800 rounded-md p-3">
                      <div className="text-xs font-bold text-slate-200 mb-2">{t(ACTION_LABELS[actionType])}</div>
                      <div className="flex gap-2">
                        <select value={rule.mode} onChange={e => updateAgentExecutionPolicy(actionType, { mode: e.target.value as any })} className="min-w-0 flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-slate-200">
                          <option value="auto">{t('Auto')}</option>
                          <option value="review">{t('Review')}</option>
                        </select>
                        <select value={rule.risk} onChange={e => updateAgentExecutionPolicy(actionType, { risk: e.target.value as any })} className="min-w-0 flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-slate-200">
                          <option value="low">{t('Low')}</option>
                          <option value="medium">{t('Medium')}</option>
                          <option value="high">{t('High')}</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {tab === 'runs' && (
          <div className="space-y-8">
            <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <ListChecks className="w-4 h-4" /> {t('Agent Runs & Trace Log')}
                </div>
                <button onClick={() => setTab('harness')} className="text-xs text-blue-300 hover:text-blue-200">{t('Open Harness')}</button>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {runLogs.length === 0 && <div className="xl:col-span-2 text-sm text-slate-500 py-8 text-center">{t('No agent runs yet.')}</div>}
                {runLogs.map(run => (
                  <div key={run.id} className="bg-black border border-neutral-800 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-100">{run.title}</div>
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-1"><Cpu className="w-3 h-3" /> {run.agent}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 capitalize">{t(run.status)}</span>
                        <button
                          type="button"
                          onClick={() => deleteRunLog(run)}
                          title={t('Delete run record')}
                          className="p-1.5 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <ol className="mt-4 space-y-2 text-xs text-slate-300">
                      {run.steps.slice(0, 4).map((step, index) => (
                        <li key={step} className="flex items-center gap-2">
                          <span className="text-slate-500">{index + 1}.</span>
                          <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 font-mono">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <ListChecks className="w-4 h-4" /> {t('Agent Run History')}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{t('Monitor each agent run plan, expected result, and actual result.')}</p>
                </div>
              </div>
              <div className="space-y-3">
                {agentRunRecords.length === 0 && (
                  <div className="text-sm text-slate-500 py-8 text-center">{t('No agent run records yet.')}</div>
                )}
                {agentRunRecords.slice(0, 30).map(record => (
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
                          onClick={() => deleteAgentRunRecord(record.id)}
                          title={t('Delete run record')}
                          className="p-1.5 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
                      <div className="bg-neutral-950 border border-neutral-800 rounded-md p-3">
                        <div className="text-[10px] uppercase font-bold text-blue-300 mb-2">{t('Plan')}</div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{record.plan}</p>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-800 rounded-md p-3">
                        <div className="text-[10px] uppercase font-bold text-amber-300 mb-2">{t('Expected Result')}</div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{record.expectedResult}</p>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-800 rounded-md p-3">
                        <div className="text-[10px] uppercase font-bold text-emerald-300 mb-2">{t('Actual Result')}</div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{record.actualResult || t('Waiting for execution result.')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'harness' && (
          <div className="rounded-lg border border-neutral-800 overflow-hidden bg-slate-950">
            <AgentHarness />
          </div>
        )}

        {tab === 'global' && (
          <div className="rounded-lg border border-neutral-800 overflow-hidden bg-slate-950">
            <GlobalAgent />
          </div>
        )}
      </div>

      {modalAgent && (
        <AgentModal
          agent={modalAgent}
          onClose={() => setModalAgent(null)}
          onSave={(agent) => {
            if ('id' in agent) updateAgentHubAgent(agent.id, agent as AgentHubAgent);
            else addAgentHubAgent(agent);
            setModalAgent(null);
          }}
        />
      )}
    </div>
  );
}
