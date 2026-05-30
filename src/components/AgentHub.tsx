import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, CheckCircle2, ClipboardCheck, Cpu, ListChecks, Plus, Power, RefreshCw, Save, Search, Server, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, X, XCircle, Zap } from 'lucide-react';
import { AgentHubAgent, AgentHubEventScope, AgentHubEventTrigger, AgentHubGuardrail, AgentHubScheduleUnit, AgentHubStatus, GLOBAL_AGENT_ACTION_TYPES, GlobalAgentActionType, useStore } from '../store';
import { cn } from '../lib/utils';
import { GlobalAgent } from './GlobalAgent';
import { useTranslation } from '../lib/i18n';
import { AGENT_TOOL_REGISTRY, getAgentToolDefinition, inferAgentToolsFromPrompt } from '../lib/agentTools';
import { useAuthStore } from '../authStore';

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

type AgentHubTab = 'fleet' | 'approvals' | 'runs' | 'global';

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
  eventTriggers: [],
  eventTriggerScope: 'subject',
  contextSuggestionMode: 'manual',
  builtIn: false
});

const AGENT_EVENT_TRIGGER_OPTIONS: { id: AgentHubEventTrigger; label: string; description: string }[] = [
  { id: 'email_received', label: 'Email received', description: 'Run when new inbound email is synced.' },
  { id: 'whatsapp_received', label: 'WhatsApp received', description: 'Run when a WhatsApp inbound message is saved.' },
  { id: 'review_required', label: 'Review required', description: 'Run when a human approval item is created.' },
  { id: 'execution_failed', label: 'Execution failed', description: 'Run when an agent or workflow execution fails.' },
  { id: 'client_created', label: 'Client created', description: 'Run when a new client record is created.' },
  { id: 'lead_created', label: 'Lead created', description: 'Run when a new lead/deal is created.' },
  { id: 'client_updated', label: 'Client updated', description: 'Run when a client profile or stage changes.' },
];

function eventTriggerLabel(trigger: AgentHubEventTrigger, language?: string) {
  const zh: Record<AgentHubEventTrigger, string> = {
    email_received: '收到邮件',
    whatsapp_received: '收到 WhatsApp',
    review_required: '需要审核',
    execution_failed: '执行失败',
    client_created: '创建客户',
    lead_created: '创建线索',
    client_updated: '客户更新',
  };
  return language === 'zh' ? zh[trigger] : (AGENT_EVENT_TRIGGER_OPTIONS.find(item => item.id === trigger)?.label || trigger);
}

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
  t,
  autoPrompt,
  onAutoSelect
}: {
  selected: string[];
  onChange: (tools: string[]) => void;
  t: (key: string) => string;
  autoPrompt?: string;
  onAutoSelect?: () => Promise<string[]>;
}) {
  const [query, setQuery] = useState('');
  const [autoSelecting, setAutoSelecting] = useState(false);
  const normalized = query.trim().toLowerCase();
  const selectedSet = new Set(selected);
  const inferredTools = useMemo(() => inferAgentToolsFromPrompt(autoPrompt || ''), [autoPrompt]);
  const filteredTools = AGENT_TOOL_REGISTRY.filter(tool => {
    const haystack = `${tool.id} ${tool.label} ${tool.description} ${tool.category}`.toLowerCase();
    return !normalized || haystack.includes(normalized);
  });
  const unknownTools = selected.filter(tool => !getAgentToolDefinition(tool));

  const toggleTool = (toolId: string) => {
    onChange(selectedSet.has(toolId) ? selected.filter(item => item !== toolId) : [...selected, toolId]);
  };

  const handleAutoSelect = async () => {
    setAutoSelecting(true);
    try {
      const tools = onAutoSelect ? await onAutoSelect() : inferredTools;
      onChange(tools);
    } catch (error) {
      console.error(error);
      onChange(inferredTools);
    } finally {
      setAutoSelecting(false);
    }
  };

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2">
        <div>
          <div className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> {t('AI Auto Select Tools')}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{t('Use the configured AI model to infer tools from the agent name and prompt.')}</p>
        </div>
        <button
          type="button"
          onClick={handleAutoSelect}
          disabled={autoSelecting || (!onAutoSelect && inferredTools.length === 0)}
          className="shrink-0 rounded-md border border-blue-500/40 bg-blue-600/20 px-3 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
        >
          {autoSelecting ? t('Selecting...') : t('Auto Select')}
        </button>
      </div>
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

async function generateAgentInstructions(
  form: Pick<AgentHubAgent, 'name' | 'instructions' | 'tools' | 'guardrail'>,
  token: string | null,
  language: string
) {
  const state = useStore.getState();
  const llmId = state.llmMappings.agent_instruction_generation || state.activeLLMId;
  const llmConfig = llmId ? state.llmConfigs.find(config => config.id === llmId) : null;
  const response = await fetch('/api/agent-instructions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      agentName: form.name,
      currentInstructions: form.instructions,
      selectedTools: form.tools || [],
      availableTools: AGENT_TOOL_REGISTRY,
      guardrail: form.guardrail,
      systemLanguage: language === 'zh' ? 'Chinese' : 'English',
      llmConfig
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to generate agent instructions');
  return String(data.instructions || '').trim();
}

async function selectAgentToolsWithAI(
  form: Pick<AgentHubAgent, 'name' | 'instructions'>,
  token: string | null
) {
  const state = useStore.getState();
  const llmId = state.llmMappings.agent_tool_selection || state.activeLLMId;
  const llmConfig = llmId ? state.llmConfigs.find(config => config.id === llmId) : null;
  const response = await fetch('/api/agent-tools/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      agentName: form.name,
      instructions: form.instructions,
      availableTools: AGENT_TOOL_REGISTRY,
      llmConfig
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to select tools');
  return Array.isArray(data.tools) ? data.tools : [];
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
  const { token } = useAuthStore();
  const t = useTranslation(language);
  const [form, setForm] = useState(agent);
  const [generatingInstructions, setGeneratingInstructions] = useState(false);
  const isEdit = 'id' in agent;
  const selectToolsWithAI = async () => {
    return selectAgentToolsWithAI(form, token);
  };
  const handleGenerateInstructions = async () => {
    setGeneratingInstructions(true);
    try {
      const aiTools = await selectAgentToolsWithAI(form, token).catch(() => []);
      const selectedTools = aiTools.length > 0
        ? aiTools
        : Array.from(new Set([...(form.tools || []), ...inferAgentToolsFromPrompt(`${form.name} ${form.instructions}`)]));
      const instructions = await generateAgentInstructions({ ...form, tools: selectedTools }, token, language);
      if (instructions) {
        setForm({ ...form, instructions, tools: selectedTools });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingInstructions(false);
    }
  };

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
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-200">{t('Prompt / Instructions')}</span>
              <button
                type="button"
                onClick={handleGenerateInstructions}
                disabled={generatingInstructions || (!form.name.trim() && !form.instructions.trim())}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/40 bg-blue-600/20 px-2.5 py-1 text-xs font-bold text-blue-200 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generatingInstructions ? t('Generating...') : t('AI Generate')}
              </button>
            </div>
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
            <ToolSelector selected={form.tools || []} onChange={tools => setForm({ ...form, tools })} t={t} autoPrompt={`${form.name} ${form.instructions}`} onAutoSelect={selectToolsWithAI} />
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

function AgentConfigPanel({
  agent,
  onSave,
  onDelete
}: {
  agent: Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'> | AgentHubAgent;
  onSave: (agent: Omit<AgentHubAgent, 'createdAt' | 'updatedAt' | 'tasksCompleted'> | Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'>) => void;
  onDelete?: (agent: AgentHubAgent) => void;
}) {
  const { language } = useStore();
  const { token } = useAuthStore();
  const t = useTranslation(language);
  const [form, setForm] = useState(agent);
  const [generatingInstructions, setGeneratingInstructions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = 'id' in agent;
  const agentKeyRef = useRef('id' in agent ? agent.id : 'new');

  React.useEffect(() => {
    const nextKey = 'id' in agent ? agent.id : 'new';
    if (agentKeyRef.current !== nextKey) {
      agentKeyRef.current = nextKey;
      setForm(agent);
    }
  }, [agent]);

  const selectToolsWithAI = async () => {
    return selectAgentToolsWithAI(form, token);
  };
  const handleGenerateInstructions = async () => {
    setGeneratingInstructions(true);
    try {
      const aiTools = await selectAgentToolsWithAI(form, token).catch(() => []);
      const selectedTools = aiTools.length > 0
        ? aiTools
        : Array.from(new Set([...(form.tools || []), ...inferAgentToolsFromPrompt(`${form.name} ${form.instructions}`)]));
      const instructions = await generateAgentInstructions({ ...form, tools: selectedTools }, token, language);
      if (instructions) {
        setForm({ ...form, instructions, tools: selectedTools });
      }
    } catch (error) {
      console.error(error);
      useStore.getState().notify(t('Failed to generate agent instructions.'), 'error');
    } finally {
      setGeneratingInstructions(false);
    }
  };

  return (
    <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-neutral-100">{isEdit ? t('Configure Agent') : t('Create Agent')}</h3>
          <p className="text-xs text-slate-500 mt-1">{t('Edit the selected agent role, tools, guardrails, and schedule.')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => confirmDelete ? onDelete(form as AgentHubAgent) : setConfirmDelete(true)}
              onBlur={() => window.setTimeout(() => setConfirmDelete(false), 150)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 border',
                confirmDelete
                  ? 'bg-red-600/20 border-red-500/50 text-red-200 hover:bg-red-600/30'
                  : 'bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/15'
              )}
            >
              <Trash2 className="w-4 h-4" />
              {confirmDelete ? (language === 'zh' ? '确认删除' : 'Confirm Delete') : t('Delete')}
            </button>
          )}
          <button
            onClick={() => form.name.trim() && onSave(form)}
            disabled={!form.name.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-md text-sm font-bold text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isEdit ? t('Save Changes') : t('Create Agent')}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5 max-h-[calc(100vh-230px)] overflow-y-auto">
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
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-200">{t('Prompt / Instructions')}</span>
            <button
              type="button"
              onClick={handleGenerateInstructions}
              disabled={generatingInstructions || (!form.name.trim() && !form.instructions.trim())}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/40 bg-blue-600/20 px-2.5 py-1 text-xs font-bold text-blue-200 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generatingInstructions ? t('Generating...') : t('AI Generate')}
            </button>
          </div>
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
          <ToolSelector selected={form.tools || []} onChange={tools => setForm({ ...form, tools })} t={t} autoPrompt={`${form.name} ${form.instructions}`} onAutoSelect={selectToolsWithAI} />
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
          <div>
            <div className="text-sm text-slate-200">{language === 'zh' ? 'Event Trigger / 事件触发' : 'Event Trigger'}</div>
            <p className="mt-1 text-xs text-slate-500">{language === 'zh' ? '当系统事件发生时自动创建该智能体运行。是否直接执行仍由 Harness / Guardrails 控制。' : 'Create an agent run automatically when selected system events happen. Execution is still controlled by Harness / Guardrails.'}</p>
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{language === 'zh' ? '事件作用范围' : 'Event Scope'}</span>
            <select
              value={form.eventTriggerScope || 'subject'}
              onChange={e => setForm({ ...form, eventTriggerScope: e.target.value as AgentHubEventScope })}
              className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="subject">{language === 'zh' ? '仅针对事件发生主体（默认）' : 'Event subject only (default)'}</option>
              <option value="global">{language === 'zh' ? '全局运行' : 'Global run'}</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              {language === 'zh'
                ? '事件主体模式只处理触发事件关联的客户/线索/消息；全局模式会按该智能体的配置扫描所有可处理对象。'
                : 'Subject mode only handles the client, lead, or message related to the event. Global mode scans all eligible records according to this agent configuration.'}
            </p>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AGENT_EVENT_TRIGGER_OPTIONS.map(option => {
              const selected = (form.eventTriggers || []).includes(option.id);
              return (
                <label key={option.id} className={cn('flex items-start gap-2 rounded-md border p-3 cursor-pointer transition-colors', selected ? 'border-blue-500/40 bg-blue-500/10' : 'border-neutral-800 bg-black hover:border-neutral-700')}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={e => {
                      const current = form.eventTriggers || [];
                      setForm({
                        ...form,
                        eventTriggers: e.target.checked
                          ? [...current, option.id]
                          : current.filter(item => item !== option.id)
                      });
                    }}
                    className="mt-0.5 h-4 w-4 accent-blue-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-200">{eventTriggerLabel(option.id, language)}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{language === 'zh' ? {
                      email_received: '同步到新的入站邮件时触发。',
                      whatsapp_received: '保存新的 WhatsApp 入站消息时触发。',
                      review_required: '创建人工审核事项时触发。',
                      execution_failed: '智能体或工作流执行失败时触发。',
                      client_created: '创建新客户记录时触发。',
                      lead_created: '创建新线索/Deal 时触发。',
                      client_updated: '客户资料或阶段更新时触发。',
                    }[option.id] : option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
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
    </section>
  );
}

export function AgentHub() {
  const {
    language,
    agentHubAgents,
    addAgentHubAgent,
    updateAgentHubAgent,
    deleteAgentHubAgent,
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
    updateAgentExecutionPolicy,
    fetchUserSettings,
    notify
  } = useStore();
  const { token } = useAuthStore();
  const t = useTranslation(language);
  const [tab, setTab] = useState<AgentHubTab>('fleet');
  const [modalAgent, setModalAgent] = useState<AgentHubAgent | ReturnType<typeof emptyAgent> | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentHubAgents[0]?.id || null);
  const [draftAgent, setDraftAgent] = useState<ReturnType<typeof emptyAgent> | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);
  const [schedulerSummary, setSchedulerSummary] = useState<string | null>(null);
  const [schedulerAgentDetails, setSchedulerAgentDetails] = useState<any[]>([]);
  const [logDisplayLimit, setLogDisplayLimit] = useState(30);

  useEffect(() => {
    if (tab === 'fleet') return;
    const interval = window.setInterval(() => {
      void fetchUserSettings();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [fetchUserSettings, tab]);

  const pendingItems = useMemo(() => [
    ...agentHarnessRuns.filter(run => run.status === 'pending_review').map(run => ({ kind: 'harness' as const, id: run.id, title: run.summary, agent: 'Execution Harness', body: run.objective, createdAt: run.createdAt })),
    ...globalAgentPlans.filter(plan => plan.status === 'pending_review').map(plan => ({ kind: 'global' as const, id: plan.id, title: plan.summary, agent: 'Global Agent', body: plan.objective, createdAt: plan.createdAt }))
  ], [agentHarnessRuns, globalAgentPlans]);

  const runLogs = useMemo(() => [
    ...agentHarnessRuns.map(run => ({ kind: 'harness' as const, id: run.id, title: run.summary, agent: 'Execution Harness', status: run.status, steps: run.steps.map(step => `${step.tool}: ${step.status}`), createdAt: run.createdAt })),
    ...globalAgentPlans.map(plan => ({ kind: 'global' as const, id: plan.id, title: plan.summary, agent: 'Global Agent', status: plan.status, steps: plan.steps.map(step => `${step.actionType}: ${step.status}`), createdAt: plan.createdAt }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [agentHarnessRuns, globalAgentPlans]);
  const visibleRunLogs = runLogs.slice(0, logDisplayLimit);
  const visibleAgentRunRecords = agentRunRecords.slice(0, logDisplayLimit);

  const computedAgents = agentHubAgents.map(agent => ({
    ...agent,
    tasksCompleted: agent.tasksCompleted + runLogs.filter(run => run.agent.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()) && run.status === 'completed').length
  }));
  const activeAgents = computedAgents.filter(agent => agent.status === 'active').length;
  const scheduledAgents = computedAgents.filter(agent => agent.scheduleEnabled).length;
  const eventTriggeredAgents = computedAgents.filter(agent => (agent.eventTriggers || []).length > 0).length;
  const reviewRequiredCount = pendingItems.length;
  const selectedAgent = draftAgent || agentHubAgents.find(agent => agent.id === selectedAgentId) || agentHubAgents[0] || emptyAgent();
  const persistAgentHubState = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;
    const state = useStore.getState();
    const response = await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        agentHubAgents: state.agentHubAgents,
        deletedAgentHubAgentIds: state.deletedAgentHubAgentIds,
        agentRunRecords: state.agentRunRecords,
        agentIdempotencyRecords: state.agentIdempotencyRecords,
        agentHarnessRuns: state.agentHarnessRuns,
        globalAgentPlans: state.globalAgentPlans
      })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save agent settings');
    }
  };
  const saveAgent = (agent: Omit<AgentHubAgent, 'createdAt' | 'updatedAt' | 'tasksCompleted'> | Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'>) => {
    const normalizedAgent = {
      ...agent,
      status: agent.scheduleEnabled && agent.status === 'idle' ? 'active' as AgentHubStatus : agent.status
    };
    if ('id' in agent) {
      updateAgentHubAgent(agent.id, normalizedAgent as AgentHubAgent);
      setSelectedAgentId(agent.id);
    } else {
      const id = addAgentHubAgent(normalizedAgent);
      setSelectedAgentId(id);
    }
    setDraftAgent(null);
    void persistAgentHubState()
      .then(() => notify('id' in agent ? t('Agent configuration saved.') : t('Agent created.'), 'success'))
      .catch((error) => notify(error.message || t('Failed to save agent settings.'), 'error'));
  };

  const deleteSelectedAgent = (agent: AgentHubAgent) => {
    deleteAgentHubAgent(agent.id);
    const nextAgent = agentHubAgents.find(item => item.id !== agent.id) || null;
    setSelectedAgentId(nextAgent?.id || null);
    setDraftAgent(null);
    void persistAgentHubState()
      .then(() => notify(language === 'zh' ? '智能体已删除。' : 'Agent deleted.', 'success'))
      .catch((error) => notify(error.message || t('Failed to save agent settings.'), 'error'));
  };

  const runAgentNow = async (agent: AgentHubAgent) => {
    setRunningAgentId(agent.id);
    try {
      const response = await fetch(`/api/agent-hub/agents/${encodeURIComponent(agent.id)}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to run agent');
      await fetchUserSettings();
      notify(agent.guardrail === 'auto'
        ? (language === 'zh' ? '智能体已开始执行。' : 'Agent run started.')
        : (language === 'zh' ? '已创建待审核的智能体运行。' : 'Agent run created for review.'),
        'success'
      );
      setTab(agent.guardrail === 'auto' ? 'runs' : 'approvals');
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : (language === 'zh' ? '智能体执行失败。' : 'Failed to run agent.'), 'error');
    } finally {
      setRunningAgentId(null);
    }
  };

  const approveItem = async (item: typeof pendingItems[number]) => {
    if (item.kind === 'harness') updateAgentHarnessRun(item.id, { status: 'running', approvedAt: new Date().toISOString() });
    if (item.kind === 'global') updateGlobalAgentPlan(item.id, { status: 'approved', approvedAt: new Date().toISOString() });
    const linkedRecord = agentRunRecords.find(record => record.relatedRunId === item.id && record.relatedRunType === item.kind);
    if (linkedRecord) {
      updateAgentRunRecord(linkedRecord.id, {
        status: item.kind === 'harness' ? 'running' : 'approved',
        actualResult: item.kind === 'harness'
          ? 'Human approved the planned agent run. Executing configured tools now.'
          : 'Human approved the planned agent run.'
      });
    }
    if (item.kind !== 'harness') return;
    try {
      const response = await fetch(`/api/agent-hub/harness-runs/${item.id}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to execute Agent Hub run');
      await fetchUserSettings();
      const result = data.result || {};
      notify(
        `${t('Agent run completed.') || 'Agent run completed.'} ${t('Acted') || 'Acted'}: ${result.acted || 0}, ${t('Skipped') || 'Skipped'}: ${result.skipped || 0}`,
        'success'
      );
    } catch (error) {
      console.error(error);
      updateAgentHarnessRun(item.id, { status: 'failed' });
      if (linkedRecord) {
        updateAgentRunRecord(linkedRecord.id, {
          status: 'failed',
          actualResult: error instanceof Error ? error.message : 'Agent Hub run failed.',
          completedAt: new Date().toISOString()
        });
      }
      notify(error instanceof Error ? error.message : 'Agent Hub run failed.', 'error');
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

  const clearTraceLogs = async () => {
    try {
      await fetch('/api/agent-hub/logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target: 'trace' })
      });
      runLogs.forEach(run => deleteRunLog(run));
      await fetchUserSettings();
      notify(t('Logs cleared.'), 'success');
    } catch (error) {
      console.error(error);
      notify(t('Failed to clear logs.'), 'error');
    }
  };

  const clearAgentRunRecords = async () => {
    try {
      await fetch('/api/agent-hub/logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target: 'records' })
      });
      agentRunRecords.forEach(record => deleteAgentRunRecord(record.id));
      await fetchUserSettings();
      notify(t('Logs cleared.'), 'success');
    } catch (error) {
      console.error(error);
      notify(t('Failed to clear logs.'), 'error');
    }
  };

  const runSchedulerNow = async () => {
    setSchedulerRunning(true);
    try {
      const response = await fetch('/api/agent-hub/scheduler/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to run scheduler');
      const summary = data.summary || {};
      setSchedulerSummary(
        `${t('Users')}: ${summary.users || 0} · ${t('Agents')}: ${summary.configuredAgents || 0} · ${t('Due')}: ${summary.dueAgents || 0} · ${t('Records')}: ${summary.recordsCreated || 0}`
      );
      setSchedulerAgentDetails(Array.isArray(summary.agents) ? summary.agents : []);
      await fetchUserSettings();
      notify(t('Agent scheduler checked.'), 'info');
    } catch (error) {
      console.error(error);
      setSchedulerSummary(error instanceof Error ? error.message : 'Failed to run scheduler');
      setSchedulerAgentDetails([]);
      notify(t('Agent scheduler check failed.'), 'error');
    } finally {
      setSchedulerRunning(false);
    }
  };

  const tabButton = (id: AgentHubTab, label: string, icon: React.ReactNode) => (
    <button onClick={() => setTab(id)} className={cn('px-4 py-2 rounded text-sm flex items-center gap-2', tab === id ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:text-white')}>
      {icon} {t(label)}
    </button>
  );

  const runTimelineItems = (record: typeof agentRunRecords[number]) => [
    {
      label: t('Plan'),
      value: record.plan,
      tone: 'blue',
      time: new Date(record.createdAt).toLocaleString()
    },
    {
      label: t('Expected Result'),
      value: record.expectedResult,
      tone: 'amber',
      time: record.relatedRunId ? `${record.relatedRunType}:${record.relatedRunId}` : t(`trigger_${record.trigger}`)
    },
    {
      label: t('Actual Result'),
      value: record.actualResult || t('Waiting for execution result.'),
      tone: record.status === 'failed' || record.status === 'rejected' ? 'red' : record.status === 'completed' || record.status === 'approved' ? 'emerald' : 'blue',
      time: record.completedAt ? `${t('Completed at')}: ${new Date(record.completedAt).toLocaleString()}` : t(record.status)
    }
  ];

  const timelineTone = (tone: string) => {
    if (tone === 'emerald') return { dot: 'bg-emerald-400 border-emerald-300 shadow-emerald-500/30', label: 'text-emerald-300' };
    if (tone === 'amber') return { dot: 'bg-amber-400 border-amber-300 shadow-amber-500/30', label: 'text-amber-300' };
    if (tone === 'red') return { dot: 'bg-red-400 border-red-300 shadow-red-500/30', label: 'text-red-300' };
    return { dot: 'bg-blue-400 border-blue-300 shadow-blue-500/30', label: 'text-blue-300' };
  };

  const splitTimelineText = (value: string) => {
    const cleanLine = (line: string) => line
      .replace(/^\s*(?:[-*•]|\d+[.)]|[一二三四五六七八九十]+[、.])\s*/, '')
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
  };

  const todoTone = (text: string, fallback: string) => {
    const lower = text.toLowerCase();
    if (/(failed|error|rejected|失败|错误|拒绝)/.test(lower)) return 'red';
    if (/(skipped|skip|waiting|pending|待审核|等待|跳过)/.test(lower)) return 'amber';
    if (/(completed|success|approved|sent|acted|done|完成|成功|通过|已发送|执行)/.test(lower)) return 'emerald';
    return fallback;
  };

  const renderTodoTimeline = (value: string, fallbackTone: string) => {
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
  };

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
              {tabButton('approvals', language === 'zh' ? '编排与审核' : 'Approvals & Policy', <ShieldCheck className="w-4 h-4" />)}
              {tabButton('runs', 'Agent Run History', <ListChecks className="w-4 h-4" />)}
              {tabButton('fleet', 'Agent Fleet', <Server className="w-4 h-4" />)}
            </div>
            <button onClick={() => { setDraftAgent(emptyAgent()); setSelectedAgentId(null); setTab('fleet'); }} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('Create Agent')}
            </button>
          </div>
        </div>

        {tab === 'fleet' && (
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
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
                <Server className="w-4 h-4" /> {t('Agent Runtime Status')}
              </div>
              <div className="space-y-4">
                {computedAgents.map(agent => (
                  <div
                    key={agent.id}
                    onClick={() => { setSelectedAgentId(agent.id); setDraftAgent(null); }}
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
                        void runAgentNow(agent);
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
            <AgentConfigPanel agent={selectedAgent} onSave={saveAgent} onDelete={'id' in selectedAgent ? deleteSelectedAgent : undefined} />
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
                <ShieldCheck className="w-4 h-4" /> {language === 'zh' ? '执行底座与策略' : 'Execution Layer & Policy'}
              </div>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-black border border-neutral-800 rounded-md p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-100"><Cpu className="w-4 h-4 text-blue-300" /> {language === 'zh' ? 'Execution Harness' : 'Execution Harness'}</div>
                  <p className="mt-2 text-xs text-slate-500">
                    {language === 'zh'
                      ? 'Harness 现在作为执行与审核底座：检查工具权限、应用执行策略、创建审核项并记录 trace，不再作为独立业务智能体规划任务。'
                      : 'Harness now acts as the execution and approval layer: it checks tool permissions, applies policy, creates review items, and records traces instead of acting as a standalone business planner.'}
                  </p>
                </div>
                <button onClick={() => setTab('global')} className="bg-black border border-neutral-800 rounded-md p-4 text-left hover:border-blue-500/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-100"><Bot className="w-4 h-4 text-blue-300" /> {t('Global Agent')}</div>
                  <p className="mt-2 text-xs text-slate-500">{t('Coordinate CRM-wide acquisition, enrichment, follow-up, and conversion plans.')}</p>
                </button>
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <ListChecks className="w-4 h-4" /> {t('Agent Runs & Trace Log')}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={logDisplayLimit}
                    onChange={e => setLogDisplayLimit(Number(e.target.value))}
                    className="bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-slate-300"
                    title={t('Log display count')}
                  >
                    {[10, 30, 50, 100].map(count => <option key={count} value={count}>{count}</option>)}
                  </select>
                  <button onClick={() => setTab('approvals')} className="text-xs text-blue-300 hover:text-blue-200">{language === 'zh' ? '打开审核策略' : 'Open policy'}</button>
                  <button
                    onClick={clearTraceLogs}
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
                {visibleRunLogs.map(run => (
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
                <button
                  onClick={runSchedulerNow}
                  disabled={schedulerRunning}
                  className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 disabled:bg-slate-900 border border-blue-500/30 disabled:border-slate-700 rounded-md text-xs font-bold text-blue-200 disabled:text-slate-500 flex items-center gap-2"
                >
                  <RefreshCw className={cn('w-4 h-4', schedulerRunning && 'animate-spin')} />
                  {t('Run Scheduler')}
                </button>
                <button
                  onClick={clearAgentRunRecords}
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
                          onClick={() => deleteAgentRunRecord(record.id)}
                          title={t('Delete run record')}
                          className="p-1.5 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-5 pl-1">
                      <div className="relative space-y-5 before:absolute before:left-[10px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-800">
                        {runTimelineItems(record).map((item, index) => {
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
                                  renderTodoTimeline(item.value, item.tone)
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
        )}

        {tab === 'global' && (
          <div className="rounded-lg border border-neutral-800 overflow-hidden bg-slate-950">
            <GlobalAgent />
          </div>
        )}
      </div>

      {false && modalAgent && (
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
