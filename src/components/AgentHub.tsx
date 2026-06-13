import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ListChecks, Power, RefreshCw, Save, Search, Server, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { AgentHubAgent, AgentHubChatMessage as AgentChatMessage, AgentHubEventScope, AgentHubGuardrail, AgentHubScheduleUnit, AgentHubStatus, AgentTask, useStore } from '../store';
import { cn } from '../lib/utils';
import { GlobalAgent } from './GlobalAgent';
import { useTranslation } from '../lib/i18n';
import { AGENT_TOOL_REGISTRY, getAgentToolDefinition, inferAgentToolsFromPrompt } from '../lib/agentTools';
import { useAuthStore } from '../authStore';
import {
  AGENT_EVENT_TRIGGER_OPTIONS,
  AgentHubTab,
  emptyAgent,
  eventTriggerLabel,
  formatChatRunResult,
  guardrailLabel,
  linkedOpportunityIdFromTask,
  riskClass,
  scheduleLabel,
  statusClass,
  taskFromOpportunityForView
} from './agent-hub/shared';
import { AgentHubHeader } from './agent-hub/AgentHubHeader';
import { AgentConsolePanel } from './agent-hub/AgentConsolePanel';
import { AgentTaskQueuePanel } from './agent-hub/AgentTaskQueuePanel';
import { ApprovalCenterPanel } from './agent-hub/ApprovalCenterPanel';
import { type AgentTraceRun, ExecutionLogsPanel } from './agent-hub/ExecutionLogsPanel';

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
      throw error;
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
  state.incrementAgentHubTaskCount('agent_prompt_builder_agent');
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
  state.incrementAgentHubTaskCount('agent_tool_selection_agent');
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
            <span className="text-sm text-slate-200">{language === 'zh' ? '执行策略 / 护栏' : 'Execution Policy / Guardrails'}</span>
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
  onReset,
  onDelete
}: {
  agent: Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'> | AgentHubAgent;
  onSave: (agent: Omit<AgentHubAgent, 'createdAt' | 'updatedAt' | 'tasksCompleted'> | Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'>) => void;
  onReset?: (agent: AgentHubAgent) => AgentHubAgent | null;
  onDelete?: (agent: AgentHubAgent) => void;
}) {
  const { language } = useStore();
  const { token } = useAuthStore();
  const t = useTranslation(language);
  const [form, setForm] = useState(agent);
  const [generatingInstructions, setGeneratingInstructions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = 'id' in agent;
  const isSystemAgent = isEdit && (form as AgentHubAgent).builtIn;
  const agentKeyRef = useRef('id' in agent ? agent.id : 'new');

  React.useEffect(() => {
    const nextKey = 'id' in agent ? agent.id : 'new';
    if (agentKeyRef.current !== nextKey) {
      agentKeyRef.current = nextKey;
      setForm(agent);
    } else if ('id' in agent) {
      setForm(prev => ({
        ...prev,
        soul: agent.soul || '',
        evolutionLog: agent.evolutionLog || []
      }));
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
          {isSystemAgent && onReset && (
            <button
              type="button"
              onClick={() => {
                const restored = onReset(form as AgentHubAgent);
                if (restored) setForm(restored);
              }}
              className="px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
            >
              <RefreshCw className="w-4 h-4" />
              {language === 'zh' ? '恢复默认' : 'Restore Defaults'}
            </button>
          )}
          {isEdit && !isSystemAgent && onDelete && (
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
            onChange={e => {
              if (isSystemAgent) return;
              setForm({ ...form, name: e.target.value });
            }}
            disabled={isSystemAgent}
            placeholder={t('e.g. Objections Handler Agent')}
            className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-950 disabled:text-slate-500"
          />
          {isSystemAgent && (
            <p className="mt-2 text-xs text-slate-500">
              {language === 'zh' ? '系统级智能体名称代表固定角色定位，不能修改。' : 'System agent names represent fixed roles and cannot be changed.'}
            </p>
          )}
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
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
          <div>
            <div className="text-sm text-slate-200">{language === 'zh' ? 'Agent Soul / 进化记忆' : 'Agent Soul / Evolution Memory'}</div>
            <p className="mt-1 text-xs text-slate-500">
              {language === 'zh'
                ? '保存该智能体长期积累的经验、偏好、判断规则和失败教训。工具权限和审核策略仍由上方配置控制。'
                : 'Stores durable lessons, preferences, decision rules, and failure learnings. Tool permissions and guardrails are still controlled above.'}
            </p>
          </div>
          <textarea
            value={form.soul || ''}
            onChange={e => setForm({ ...form, soul: e.target.value })}
            placeholder={language === 'zh' ? '记录这个智能体应该长期记住的经验...' : 'Durable lessons this agent should remember...'}
            className="w-full min-h-24 bg-black border border-neutral-700 rounded-md px-4 py-3 text-sm text-slate-100 outline-none resize-y focus:border-blue-500"
          />
          {(form.evolutionLog || []).filter(item => item.status === 'proposed').length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{language === 'zh' ? '待处理进化建议' : 'Pending Evolution Proposals'}</div>
              {(form.evolutionLog || []).filter(item => item.status === 'proposed').slice(0, 4).map(item => (
                <div key={item.id} className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                  <div className="text-xs font-bold text-blue-200">{item.summary || (language === 'zh' ? '进化建议' : 'Evolution proposal')}</div>
                  <p className="mt-2 text-xs text-slate-300 whitespace-pre-wrap">{item.proposal}</p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        evolutionLog: (form.evolutionLog || []).map(log => log.id === item.id ? { ...log, status: 'rejected' } : log)
                      })}
                      className="px-2.5 py-1 rounded border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-200 hover:bg-red-500/20"
                    >
                      {language === 'zh' ? '拒绝' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        soul: `${form.soul || ''}${form.soul ? '\n\n' : ''}- ${item.proposal}`.trim(),
                        evolutionLog: (form.evolutionLog || []).map(log => log.id === item.id ? { ...log, status: 'applied', appliedAt: new Date().toISOString() } : log)
                      })}
                      className="px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20"
                    >
                      {language === 'zh' ? '吸收到 Soul' : 'Apply to Soul'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <label className="block">
          <span className="text-sm text-slate-200">{language === 'zh' ? '执行策略 / 护栏' : 'Execution Policy / Guardrails'}</span>
          <select
            value={form.guardrail}
            onChange={e => setForm({ ...form, guardrail: e.target.value as AgentHubGuardrail })}
            className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
          >
            <option value="auto">{t('Auto-execute (No approval needed)')}</option>
            <option value="review">{t('Requires approval before execution')}</option>
            <option value="human_loop">{t('Human-in-the-loop for outbound actions')}</option>
          </select>
          <p className="mt-2 text-xs text-slate-500">
            {language === 'zh'
              ? '控制该智能体是自动执行、先进入审批，还是对客户可见动作始终保留人工确认。'
              : 'Controls whether this agent auto-runs, waits for approval, or keeps customer-facing actions human-reviewed.'}
          </p>
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
            <p className="mt-1 text-xs text-slate-500">
              {language === 'zh'
                ? '当系统事件发生时自动创建任务。是否直接执行由执行策略与审批中心控制。'
                : 'Create a task when selected system events happen. Execution is controlled by policy and the approval center.'}
            </p>
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
                ? '事件主体模式只处理触发事件关联的客户、线索或消息；全局模式会按该智能体配置扫描所有可处理对象。'
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
                      email_received: '收到新的入站邮件时触发。',
                      whatsapp_received: '保存新的 WhatsApp 入站消息时触发。',
                      live_chat_received: '收到网站 Live Chat 消息时触发。',
                      review_required: '创建人工审核事项时触发。',
                      execution_failed: '智能体或工作流执行失败时触发。',
                      client_created: '创建新客户记录时触发。',
                      lead_created: '创建新线索或 Deal 时触发。',
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
    resetAgentHubAgentToDefault,
    incrementAgentHubTaskCount,
    deleteAgentHubAgent,
    agentHarnessRuns,
    globalAgentPlans,
    agentRunRecords,
    agentOpportunities,
    agentTasks,
    agentOpportunityRoutingPolicy,
    updateAgentOpportunityRoutingPolicy,
    updateAgentOpportunity,
    deleteAgentOpportunity,
    updateAgentTask,
    deleteAgentTask,
    agentChatMessages,
    setAgentChatMessages,
    clients,
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
  const [tab, setTab] = useState<AgentHubTab>('opportunities');
  const [modalAgent, setModalAgent] = useState<AgentHubAgent | ReturnType<typeof emptyAgent> | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentHubAgents[0]?.id || null);
  const [draftAgent, setDraftAgent] = useState<ReturnType<typeof emptyAgent> | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);
  const [dispatchingOpportunityId, setDispatchingOpportunityId] = useState<string | null>(null);
  const [schedulerSummary, setSchedulerSummary] = useState<string | null>(null);
  const [schedulerAgentDetails, setSchedulerAgentDetails] = useState<any[]>([]);
  const [logDisplayLimit, setLogDisplayLimit] = useState(30);
  const [expandedTraceRunIds, setExpandedTraceRunIds] = useState<string[]>([]);
  const [agentQueueFilter, setAgentQueueFilter] = useState<'system' | 'custom'>('system');
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [chatRunningAgentId, setChatRunningAgentId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);

  useEffect(() => {
    if (tab === 'fleet') return;
    const interval = window.setInterval(() => {
      void fetchUserSettings();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [fetchUserSettings, tab]);

  const pendingItems = useMemo(() => [
    ...agentHarnessRuns.filter(run => run.status === 'pending_review').map(run => ({ kind: 'harness' as const, id: run.id, title: run.summary, agent: 'Execution Engine', body: run.objective, createdAt: run.createdAt })),
    ...globalAgentPlans.filter(plan => plan.status === 'pending_review').map(plan => ({ kind: 'global' as const, id: plan.id, title: plan.summary, agent: 'Global Orchestrator', body: plan.objective, createdAt: plan.createdAt }))
  ], [agentHarnessRuns, globalAgentPlans]);

  const normalizeRunStep = (step: any) => ({
    title: step.title || step.tool || step.actionType || 'agent.run',
    tool: step.tool || step.actionType || step.title || 'agent.run',
    status: step.status || 'pending',
    result: step.result || step.error || ''
  });

  const isLegacySignalScannerPendingTrace = (run: any) => (
    run.summary?.includes('Signal Scanner Agent') &&
    run.status === 'approved' &&
    run.steps?.length === 1 &&
    run.steps?.[0]?.tool === 'client.read' &&
    run.steps?.[0]?.status === 'pending'
  );

  const runLogs = useMemo(() => [
    ...agentHarnessRuns
      .filter(run => !isLegacySignalScannerPendingTrace(run))
      .map(run => ({
        kind: 'harness' as const,
        id: run.id,
        title: run.summary,
        agent: 'Execution Engine',
        status: run.status,
        steps: run.steps.map(normalizeRunStep),
        createdAt: run.createdAt
      })),
    ...globalAgentPlans.map(plan => ({
      kind: 'global' as const,
      id: plan.id,
      title: plan.summary,
      agent: 'Global Orchestrator',
      status: plan.status,
      steps: plan.steps.map(normalizeRunStep),
      createdAt: plan.createdAt
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [agentHarnessRuns, globalAgentPlans]);
  const visibleOpportunities = agentOpportunities
    .filter(opportunity => opportunity.status !== 'ignored')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const visibleTasks = useMemo(() => {
    const byId = new Map<string, AgentTask>();
    agentTasks.filter(task => task.status !== 'ignored').forEach(task => byId.set(task.id, task));
    visibleOpportunities.map(taskFromOpportunityForView).forEach(task => {
      const existing = byId.get(task.id);
      byId.set(task.id, existing ? { ...existing, ...task, retryCount: existing.retryCount || 0 } : task);
    });
    return Array.from(byId.values())
      .filter(task => task.status !== 'ignored')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  }, [agentTasks, visibleOpportunities]);
  const dispatchableTasks = visibleTasks.filter(task => !!linkedOpportunityIdFromTask(task) && ['open', 'failed', 'skipped'].includes(task.status));

  const computedAgents = agentHubAgents.map(agent => ({
    ...agent,
    tasksCompleted: agent.tasksCompleted + runLogs.filter(run => run.agent.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()) && run.status === 'completed').length
  }));
  const systemAgents = computedAgents.filter(agent => agent.builtIn);
  const customAgents = computedAgents.filter(agent => !agent.builtIn);
  const visibleQueueAgents = agentQueueFilter === 'system' ? systemAgents : customAgents;
  const activeQueueMeta = agentQueueFilter === 'system'
    ? {
        title: language === 'zh' ? '系统级智能体' : 'System Agents',
        description: language === 'zh'
          ? '内置 AI 能力与核心业务智能体。不可删除，但可以配置权限、策略与运行周期。'
          : 'Built-in AI operations and core business agents. They cannot be deleted, but permissions, policy, and schedules can be configured.'
      }
    : {
        title: language === 'zh' ? '自定义智能体' : 'Custom Agents',
        description: language === 'zh'
          ? '你为具体业务流程创建的智能体，可新增、配置和删除。'
          : 'Agents created for your own workflows. They can be added, configured, and deleted.'
      };
  const activeAgents = computedAgents.filter(agent => agent.status === 'active').length;
  const scheduledAgents = computedAgents.filter(agent => agent.scheduleEnabled).length;
  const eventTriggeredAgents = computedAgents.filter(agent => (agent.eventTriggers || []).length > 0).length;
  const reviewRequiredCount = pendingItems.length;
  const selectedVisibleAgent = visibleQueueAgents.find(agent => agent.id === selectedAgentId);
  const selectedAgent = draftAgent || selectedVisibleAgent || visibleQueueAgents[0] || emptyAgent();
  const savedGlobalAgent = agentHubAgents.find(agent => agent.id === 'global_agent');
  const globalAgent = savedGlobalAgent || ({
    ...emptyAgent(),
    id: 'global_agent',
    name: 'Global Orchestrator',
    instructions: 'Coordinate CRM-wide acquisition, enrichment, follow-up, and conversion plans.',
    status: 'active',
    tools: ['global_agent.plan'],
    tasksCompleted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as AgentHubAgent);
  const activeChatAgent = agentHubAgents.find(agent => agent.id === chatAgentId) || globalAgent;
  const chatAgents = savedGlobalAgent ? agentHubAgents : [globalAgent, ...agentHubAgents];
  const visibleChatMessages = agentChatMessages
    .filter(message => message.agentId === activeChatAgent?.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-30);
  const resolveMentionedClients = (raw: string) => {
    const lower = raw.toLowerCase();
    return clients
      .filter(client => {
        const labels = [client.name, client.company, client.id]
          .filter(Boolean)
          .map(value => String(value).toLowerCase());
        return labels.some(label => label && lower.includes(`@${label}`));
      })
      .slice(0, 5);
  };
  const formatMentionedClientContext = (mentionedClients: typeof clients) => (
    mentionedClients.map(client => ({
      id: client.id,
      name: client.name,
      company: client.company,
      status: client.status,
      country: client.country,
      preferredLanguage: client.preferredLanguage,
      tags: client.tags || [],
      contactMethods: client.contactMethods || [],
      leadScore: client.leadScore,
      leadSummary: client.leadSummary,
      leadNextStep: client.leadNextStep,
      agentSummary: client.agentSummary,
      agentNextStep: client.agentNextStep
    }))
  );
  const buildClientAwareObjective = (content: string, mentionedClients: typeof clients) => {
    if (mentionedClients.length === 0) return content;
    const clientLines = mentionedClients.map(client => `${client.name}${client.company ? ` / ${client.company}` : ''} (${client.id})`).join('; ');
    return `${content}\n\nTarget client context: ${clientLines}. Operate only on the referenced client(s) unless the user explicitly asks for a global run.`;
  };
  const buildAgentChatUsage = (agent: AgentHubAgent) => {
    const tools = agent.tools || [];
    const canAcquire = tools.some(tool => tool.startsWith('lead.acquire') || tool === 'public_pool.import');
    const canAnalyze = tools.some(tool => ['lead.analyze', 'lead.score', 'client.summarize', 'next_step.recommend', 'knowledge.search', 'product.read'].includes(tool));
    const canEmail = tools.some(tool => tool.startsWith('email.'));
    const canWhatsApp = tools.some(tool => tool.startsWith('whatsapp.'));
    const canWriteCrm = tools.some(tool => /^(client|lead)\.(update|comment|log|tag|stage|create)/.test(tool));
    const canPlan = tools.some(tool => tool.includes('plan') || tool.includes('global_agent'));
    const modes = [
      canAcquire && (language === 'zh' ? '获取/导入线索' : 'acquire or import leads'),
      canAnalyze && (language === 'zh' ? '分析客户、评分和推荐下一步' : 'analyze accounts, score leads, and recommend next steps'),
      canEmail && (language === 'zh' ? '起草/安排/发送邮件（高风险动作会进入审批）' : 'draft, schedule, or send email, with risky actions routed to approval'),
      canWhatsApp && (language === 'zh' ? '起草/发送 WhatsApp 消息（遵循账号与额度策略）' : 'draft or send WhatsApp messages while respecting account and quota rules'),
      canWriteCrm && (language === 'zh' ? '更新 CRM 记录、备注、标签和日志' : 'update CRM records, comments, tags, and logs'),
      canPlan && (language === 'zh' ? '拆解跨模块计划并生成可审核执行项' : 'break work into cross-module plans and reviewable execution items')
    ].filter(Boolean);
    const mentionHint = language === 'zh'
      ? '在聊天输入 @客户名称 可引用客户资料；不引用客户时，我会按当前 Agent 的职责判断是否执行全局任务。'
      : 'Type @client name to reference a customer; without a customer mention, I will decide whether the request should run globally based on this agent role.';
    const executionHint = agent.guardrail === 'auto'
      ? (language === 'zh' ? '该 Agent 当前允许自动执行低风险授权工具；需要审批的动作会在聊天窗口显示按钮。' : 'This agent can auto-run authorized low-risk tools; approval-required actions will show confirmation buttons in chat.')
      : (language === 'zh' ? '该 Agent 当前以人工审核为主；会先生成计划或待审批动作，再由你确认。' : 'This agent is review-first; it will prepare plans or approval items before execution.');
    const examples = [
      canAcquire && (language === 'zh' ? '例：帮我基于产品和知识库获取 10 条太阳能运维客户线索' : 'Example: find 10 solar operations leads based on our products and knowledge base'),
      canAnalyze && (language === 'zh' ? '例：分析 @客户名称 的成交率和最佳下一步' : 'Example: analyze @Client Name conversion probability and best next step'),
      canEmail && (language === 'zh' ? '例：为 @客户名称 起草一封首次跟进邮件' : 'Example: draft a first follow-up email for @Client Name'),
      canWhatsApp && (language === 'zh' ? '例：给 @客户名称 生成 WhatsApp 破冰消息' : 'Example: create a WhatsApp ice-breaking message for @Client Name')
    ].filter(Boolean).slice(0, 2);
    return [
      modes.length
        ? (language === 'zh' ? `你可以${modes.join('、')}。` : `Use this agent to ${modes.join(', ')}.`)
        : (language === 'zh' ? '你可以把业务目标直接告诉这个 Agent，它会根据授权工具判断可执行范围。' : 'Tell this agent the business goal; it will decide what it can do from its authorized tools.'),
      mentionHint,
      executionHint,
      ...examples
    ].join(' ');
  };
  useEffect(() => {
    if (draftAgent || tab !== 'fleet') return;
    const selectedVisible = visibleQueueAgents.some(agent => agent.id === selectedAgentId);
    if (!selectedVisible) {
      setSelectedAgentId(visibleQueueAgents[0]?.id || null);
    }
  }, [draftAgent, selectedAgentId, tab, visibleQueueAgents]);
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
        agentChatMessages: state.agentChatMessages,
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
  const persistAgentChatMessages = async (messages: AgentChatMessage[]) => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;
    const response = await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ agentChatMessages: messages })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save chat history');
    }
  };
  const isExecutionIntent = (value: string) => (
    /(执行|开始|运行|获取|生成|导入|富集|分析|评分|打分|跟进|发送|起草|创建|run|execute|start|acquire|get|import|enrich|analyze|score|send|draft|create)/i.test(value)
  );
  const sendAgentChat = async () => {
    const targetAgent = activeChatAgent || globalAgent;
    const content = chatInput.trim();
    const mentionedClients = resolveMentionedClients(content);
    const clientContext = formatMentionedClientContext(mentionedClients);
    if (!targetAgent || !content || chatSending) return;
    const now = new Date().toISOString();
    const userMessage: AgentChatMessage = {
      id: `chat_${Date.now()}_user`,
      agentId: targetAgent.id,
      agentName: targetAgent.name,
      role: 'user',
      content,
      createdAt: now
    };
    const nextUserMessages = [...agentChatMessages, userMessage]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-300);
    setAgentChatMessages(nextUserMessages);
    setChatInput('');
    setChatSending(true);
    try {
      const response = await fetch('/api/agent-hub/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          agentId: targetAgent.id,
          agent: targetAgent,
          message: content,
          contextClients: clientContext,
          history: nextUserMessages.filter(item => item.agentId === targetAgent.id).slice(-10).map(item => ({
            role: item.role,
            agentName: item.agentName,
            content: item.content,
            createdAt: item.createdAt
          }))
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to chat with agent');
      incrementAgentHubTaskCount(targetAgent.id);
      const reply: AgentChatMessage = {
        id: `chat_${Date.now()}_agent`,
        agentId: targetAgent.id,
        agentName: targetAgent.name,
        role: 'agent',
        content: data.reply || (language === 'zh' ? '已记录。' : 'Noted.'),
        createdAt: new Date().toISOString()
      };
      const nextMessages = [...useStore.getState().agentChatMessages, reply]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-300);
      setAgentChatMessages(nextMessages);
      const shouldRunFromChat = !!data.shouldRun || isExecutionIntent(content);
      if (shouldRunFromChat) {
        const loadingMessageId = `chat_${Date.now()}_running`;
        const loadingMessage: AgentChatMessage = {
          id: loadingMessageId,
          agentId: targetAgent.id,
          agentName: targetAgent.name,
          role: 'agent',
          content: language === 'zh' ? '正在执行任务...' : 'Running task...',
          createdAt: new Date().toISOString()
        };
        setChatRunningAgentId(targetAgent.id);
        setAgentChatMessages(messages => [...messages, loadingMessage]);
        try {
          const result = await runAgentNow(targetAgent, data.runObjective || buildClientAwareObjective(content, mentionedClients), { preserveTab: true, skipRefresh: true });
          const executionSummary = formatChatRunResult(result, language);
          const statusMessage: AgentChatMessage = {
            id: loadingMessageId,
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            role: 'agent',
            content: language === 'zh' ? `任务执行完成。${executionSummary}` : `Task completed. ${executionSummary}`,
            createdAt: new Date().toISOString(),
            action: targetAgent.guardrail === 'auto' || !result?.runId || !result?.relatedRunType
              ? undefined
              : { type: 'approval', kind: result.relatedRunType, id: result.runId }
          };
          setAgentChatMessages(messages => messages.map(message => message.id === loadingMessageId ? statusMessage : message));
        } catch {
          const statusMessage: AgentChatMessage = {
            id: loadingMessageId,
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            role: 'agent',
            content: language === 'zh' ? '任务执行失败，请查看通知或运行记录。' : 'Task execution failed. Check the notification or run history.',
            createdAt: new Date().toISOString()
          };
          setAgentChatMessages(messages => messages.map(message => message.id === loadingMessageId ? statusMessage : message));
        } finally {
          setChatRunningAgentId(null);
        }
      }
      if (data.soulPatch) {
        const current = useStore.getState().agentHubAgents.find(agent => agent.id === targetAgent.id) || targetAgent;
        updateAgentHubAgent(targetAgent.id, {
          evolutionLog: [{
            id: `evo_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            source: 'chat' as const,
            summary: data.summary || (language === 'zh' ? '来自 Agent 聊天的进化建议' : 'Evolution proposal from Agent chat'),
            proposal: data.soulPatch,
            status: 'proposed' as const,
            createdAt: new Date().toISOString()
          }, ...(current.evolutionLog || [])].slice(0, 50)
        });
        void persistAgentHubState();
        notify(language === 'zh' ? '已生成进化建议，请到该 Agent 的 Soul 区块审核。' : 'Evolution proposal created. Review it in this agent Soul section.', 'info');
      }
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : (language === 'zh' ? 'Agent 聊天失败。' : 'Agent chat failed.'), 'error');
    } finally {
      setChatSending(false);
    }
  };
  const deleteChatMessage = (messageId: string) => {
    const nextMessages = useStore.getState().agentChatMessages.filter(message => message.id !== messageId);
    setAgentChatMessages(nextMessages);
    void persistAgentChatMessages(nextMessages)
      .then(() => notify(language === 'zh' ? '聊天消息已删除。' : 'Chat message deleted.', 'success'))
      .catch((error) => notify(error.message || (language === 'zh' ? '保存聊天记录失败。' : 'Failed to save chat history.'), 'error'));
  };
  const clearActiveAgentChat = () => {
    if (!activeChatAgent) return;
    const nextMessages = useStore.getState().agentChatMessages.filter(message => message.agentId !== activeChatAgent.id);
    setAgentChatMessages(nextMessages);
    void persistAgentChatMessages(nextMessages)
      .then(() => notify(language === 'zh' ? '当前智能体聊天记录已清空。' : 'Current agent chat history cleared.', 'success'))
      .catch((error) => notify(error.message || (language === 'zh' ? '保存聊天记录失败。' : 'Failed to save chat history.'), 'error'));
  };
  const saveAgent = (agent: Omit<AgentHubAgent, 'createdAt' | 'updatedAt' | 'tasksCompleted'> | Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'>) => {
    const existingAgent = 'id' in agent ? agentHubAgents.find(item => item.id === agent.id) : null;
    const normalizedAgent = {
      ...agent,
      name: existingAgent?.builtIn ? existingAgent.name : agent.name,
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
    if (agent.builtIn) {
      notify(language === 'zh' ? '系统级智能体不可删除。' : 'System agents cannot be deleted.', 'warning');
      return;
    }
    deleteAgentHubAgent(agent.id);
    const nextAgent = agentHubAgents.find(item => item.id !== agent.id) || null;
    setSelectedAgentId(nextAgent?.id || null);
    setDraftAgent(null);
    void persistAgentHubState()
      .then(() => notify(language === 'zh' ? '智能体已删除。' : 'Agent deleted.', 'success'))
      .catch((error) => notify(error.message || t('Failed to save agent settings.'), 'error'));
  };

  const resetSystemAgent = (agent: AgentHubAgent) => {
    const restored = resetAgentHubAgentToDefault(agent.id);
    if (!restored) {
      notify(language === 'zh' ? '未找到系统智能体的默认配置。' : 'No default configuration found for this system agent.', 'error');
      return null;
    }
    setSelectedAgentId(restored.id);
    setDraftAgent(null);
    void persistAgentHubState()
      .then(() => notify(language === 'zh' ? '系统智能体已恢复默认最佳实践配置。' : 'System agent restored to the default best-practice configuration.', 'success'))
      .catch((error) => notify(error.message || t('Failed to save agent settings.'), 'error'));
    return restored;
  };

  const runAgentNow = async (agent: AgentHubAgent, objective?: string, options?: { preserveTab?: boolean; skipRefresh?: boolean }) => {
    setRunningAgentId(agent.id);
    try {
      const response = await fetch(`/api/agent-hub/agents/${encodeURIComponent(agent.id)}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ objective })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to run agent');
      if (!options?.skipRefresh) {
        await fetchUserSettings();
      }
      notify(agent.guardrail === 'auto'
        ? (language === 'zh' ? '智能体已开始执行。' : 'Agent run started.')
        : (language === 'zh' ? '已创建待审核的智能体运行。' : 'Agent run created for review.'),
        'success'
      );
      if (!options?.preserveTab) {
        setTab(agent.guardrail === 'auto' ? 'runs' : 'approvals');
      }
      return data;
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : (language === 'zh' ? '智能体执行失败。' : 'Failed to run agent.'), 'error');
    } finally {
      setRunningAgentId(null);
    }
  };

  const runOpportunity = async (opportunity: typeof agentOpportunities[number]) => {
    const agent = agentHubAgents.find(item => item.id === opportunity.recommendedAgentId);
    if (!agent) {
      notify(language === 'zh' ? '未找到推荐智能体。' : 'Recommended agent was not found.', 'error');
      return;
    }
    updateAgentOpportunity(opportunity.id, { status: 'running' });
    const result = await runAgentNow(agent, opportunity.objective, { preserveTab: true });
    updateAgentOpportunity(opportunity.id, {
      status: result ? 'completed' : 'open',
      completedAt: result ? new Date().toISOString() : undefined
    });
  };

  const dispatchOpportunity = async (opportunity: typeof agentOpportunities[number]) => {
    setDispatchingOpportunityId(opportunity.id);
    updateAgentOpportunity(opportunity.id, { status: 'queued' });
    try {
      const response = await fetch(`/api/agent-hub/opportunities/${encodeURIComponent(opportunity.id)}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to dispatch opportunity');
      await fetchUserSettings();
      const reviewStatus = data.result?.reviewStatus;
      notify(
        reviewStatus === 'pending_review'
          ? (language === 'zh' ? '机会任务已派发，等待人工审核。' : 'Opportunity dispatched and waiting for approval.')
          : (language === 'zh' ? '机会任务已派发并执行。' : 'Opportunity dispatched and executed.'),
        'success'
      );
    } catch (error) {
      console.error(error);
      updateAgentOpportunity(opportunity.id, {
        status: 'failed',
        resultSummary: error instanceof Error ? error.message : 'Failed to dispatch opportunity.',
        completedAt: new Date().toISOString()
      });
      notify(error instanceof Error ? error.message : (language === 'zh' ? '机会任务派发失败。' : 'Failed to dispatch opportunity.'), 'error');
    } finally {
      setDispatchingOpportunityId(null);
    }
  };

  const taskOpportunityId = (task: AgentTask) => linkedOpportunityIdFromTask(task);

  const updateTaskAndLinkedOpportunity = (task: AgentTask, taskUpdates: Partial<AgentTask>, opportunityUpdates?: any) => {
    updateAgentTask(task.id, taskUpdates);
    const opportunityId = taskOpportunityId(task);
    if (opportunityId) updateAgentOpportunity(opportunityId, opportunityUpdates || taskUpdates as any);
  };

  const deleteTaskAndLinkedOpportunity = (task: AgentTask) => {
    deleteAgentTask(task.id);
    const opportunityId = taskOpportunityId(task);
    if (opportunityId) deleteAgentOpportunity(opportunityId);
  };

  const updateTasksForRun = (runId: string, runType: 'harness' | 'global', updates: Partial<AgentTask>) => {
    agentTasks
      .filter(task => task.runId === runId && task.runType === runType)
      .forEach(task => updateAgentTask(task.id, updates));
  };

  const dispatchTask = async (task: AgentTask) => {
    setDispatchingOpportunityId(task.id);
    const queuedAt = new Date().toISOString();
    updateTaskAndLinkedOpportunity(task, { status: 'queued', queuedAt }, { status: 'queued' });
    try {
      const response = await fetch(`/api/agent-hub/tasks/${encodeURIComponent(task.id)}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to dispatch task');
      await fetchUserSettings();
      const reviewStatus = data.result?.reviewStatus;
      notify(
        reviewStatus === 'pending_review'
          ? (language === 'zh' ? '任务已派发，等待人工审核。' : 'Task dispatched and waiting for approval.')
          : (language === 'zh' ? '任务已派发并执行。' : 'Task dispatched and executed.'),
        'success'
      );
    } catch (error) {
      console.error(error);
      updateTaskAndLinkedOpportunity(task, {
        status: 'failed',
        resultSummary: error instanceof Error ? error.message : 'Failed to dispatch task.',
        completedAt: new Date().toISOString()
      }, {
        status: 'failed',
        resultSummary: error instanceof Error ? error.message : 'Failed to dispatch task.',
        completedAt: new Date().toISOString()
      });
      notify(error instanceof Error ? error.message : (language === 'zh' ? '任务派发失败。' : 'Failed to dispatch task.'), 'error');
    } finally {
      setDispatchingOpportunityId(null);
    }
  };

  const runAllDispatchableOpportunities = async () => {
    for (const task of dispatchableTasks.slice(0, 20)) {
      // eslint-disable-next-line no-await-in-loop
      await dispatchTask(task);
    }
  };

  const approveItem = async (item: typeof pendingItems[number]) => {
    const approvedAt = new Date().toISOString();
    if (item.kind === 'harness') updateAgentHarnessRun(item.id, { status: 'running', approvedAt });
    if (item.kind === 'global') updateGlobalAgentPlan(item.id, { status: 'approved', approvedAt });
    updateTasksForRun(item.id, item.kind, {
      status: item.kind === 'harness' ? 'running' : 'queued',
      approvalStatus: 'approved',
      queuedAt: approvedAt,
      startedAt: item.kind === 'harness' ? approvedAt : undefined,
      resultSummary: language === 'zh' ? '人工已批准，正在进入执行流程。' : 'Approved by a human and entering execution.'
    });
    const linkedRecord = agentRunRecords.find(record => record.relatedRunId === item.id && record.relatedRunType === item.kind);
    if (linkedRecord) {
      updateAgentRunRecord(linkedRecord.id, {
        status: item.kind === 'harness' ? 'running' : 'approved',
        actualResult: item.kind === 'harness'
          ? (language === 'zh' ? '人工已批准计划运行，正在执行配置的工具。' : 'Human approved the planned agent run. Executing configured tools now.')
          : (language === 'zh' ? '人工已批准计划运行。' : 'Human approved the planned agent run.')
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
      updateTasksForRun(item.id, item.kind, {
        status: 'failed',
        resultSummary: error instanceof Error ? error.message : (language === 'zh' ? '智能体运行失败。' : 'Agent Hub run failed.'),
        completedAt: new Date().toISOString()
      });
      if (linkedRecord) {
        updateAgentRunRecord(linkedRecord.id, {
          status: 'failed',
          actualResult: error instanceof Error ? error.message : (language === 'zh' ? '智能体运行失败。' : 'Agent Hub run failed.'),
          completedAt: new Date().toISOString()
        });
      }
      notify(error instanceof Error ? error.message : 'Agent Hub run failed.', 'error');
    }
  };

  const rejectItem = (item: typeof pendingItems[number]) => {
    const rejectedAt = new Date().toISOString();
    if (item.kind === 'harness') updateAgentHarnessRun(item.id, { status: 'rejected', rejectedAt, rejectedReason: 'Rejected from Agent Hub' });
    if (item.kind === 'global') updateGlobalAgentPlan(item.id, { status: 'rejected', rejectedAt, rejectedReason: 'Rejected from Agent Hub' });
    updateTasksForRun(item.id, item.kind, {
      status: 'skipped',
      approvalStatus: 'rejected',
      resultSummary: language === 'zh' ? '人工已拒绝执行任务。' : 'Human rejected this execution task.',
      completedAt: rejectedAt
    });
    const linkedOpportunity = agentOpportunities.find(opportunity => opportunity.relatedRunId === item.id && opportunity.relatedRunType === item.kind);
    if (linkedOpportunity) {
      updateAgentOpportunity(linkedOpportunity.id, {
        status: 'failed',
        resultSummary: language === 'zh' ? '人工已拒绝机会任务派发。' : 'Human rejected this opportunity dispatch.',
        completedAt: new Date().toISOString()
      });
    }
    const linkedRecord = agentRunRecords.find(record => record.relatedRunId === item.id && record.relatedRunType === item.kind);
    if (linkedRecord) {
      updateAgentRunRecord(linkedRecord.id, {
        status: 'rejected',
        actualResult: language === 'zh' ? '人工已拒绝计划运行。' : 'Human rejected the planned agent run.',
        completedAt: new Date().toISOString()
      });
    }
  };

  const handleChatApproval = async (message: AgentChatMessage, approve: boolean) => {
    if (!message.action || message.action.type !== 'approval') return;
    const item = pendingItems.find(entry => entry.kind === message.action?.kind && entry.id === message.action?.id);
    if (!item) {
      setAgentChatMessages(messages => messages.map(entry => entry.id === message.id ? {
        ...entry,
        action: undefined,
        content: language === 'zh' ? '该审核任务已处理或不存在。' : 'This review item has already been handled or no longer exists.'
      } : entry));
      return;
    }
    if (approve) {
      setAgentChatMessages(messages => messages.map(entry => entry.id === message.id ? {
        ...entry,
        content: language === 'zh' ? '已批准，正在执行任务...' : 'Approved. Running task...'
      } : entry));
      await approveItem(item);
      setAgentChatMessages(messages => messages.map(entry => entry.id === message.id ? {
        ...entry,
        action: undefined,
        content: language === 'zh' ? '已批准并执行完成。请查看上方通知或运行记录中的详细结果。' : 'Approved and executed. Check the notification or run history for details.'
      } : entry));
    } else {
      rejectItem(item);
      setAgentChatMessages(messages => messages.map(entry => entry.id === message.id ? {
        ...entry,
        action: undefined,
        content: language === 'zh' ? '已拒绝执行任务。' : 'Execution rejected.'
      } : entry));
    }
  };

  const deleteRunLog = (run: AgentTraceRun) => {
    if (run.kind === 'harness') deleteAgentHarnessRun(run.id);
    if (run.kind === 'global') deleteGlobalAgentPlan(run.id);
    setExpandedTraceRunIds(ids => ids.filter(id => id !== run.id));
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
        `${t('Users')}: ${summary.users || 0} · ${t('Agents')}: ${summary.configuredAgents || 0} · ${t('Due')}: ${summary.dueAgents || 0} · ${t('Records')}: ${summary.recordsCreated || 0} · ${language === 'zh' ? '机会任务' : 'Opportunities'}: ${summary.opportunitiesCreated || 0} · ${language === 'zh' ? '已路由' : 'Routed'}: ${summary.opportunitiesRouted || 0}`
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

  return (
    <div className="flex-1 bg-black text-slate-100 overflow-y-auto">
      <div className="p-8 space-y-8">
        <AgentHubHeader
          language={language}
          tab={tab}
          t={t}
          onTabChange={setTab}
          onCreateAgent={() => {
            setDraftAgent(emptyAgent());
            setSelectedAgentId(null);
            setAgentQueueFilter('custom');
            setTab('fleet');
          }}
        />

        {tab === 'chat' && (
          <AgentConsolePanel
            language={language}
            chatAgents={chatAgents}
            activeChatAgent={activeChatAgent}
            chatRunningAgentId={chatRunningAgentId}
            visibleChatMessages={visibleChatMessages}
            pendingItems={pendingItems}
            clients={clients}
            chatInput={chatInput}
            chatSending={chatSending}
            setChatAgentId={setChatAgentId}
            clearActiveAgentChat={clearActiveAgentChat}
            deleteChatMessage={deleteChatMessage}
            handleChatApproval={handleChatApproval}
            buildAgentChatUsage={buildAgentChatUsage}
            setChatInput={setChatInput}
            sendAgentChat={sendAgentChat}
          />
        )}

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
                        onClick={() => { setAgentQueueFilter(option.id); setDraftAgent(null); }}
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
            <AgentConfigPanel
              agent={selectedAgent}
              onSave={saveAgent}
              onReset={'id' in selectedAgent && selectedAgent.builtIn ? resetSystemAgent : undefined}
              onDelete={'id' in selectedAgent && !selectedAgent.builtIn ? deleteSelectedAgent : undefined}
            />
            </div>
          </div>
        )}

        {tab === 'opportunities' && (
          <AgentTaskQueuePanel
            language={language}
            visibleTasks={visibleTasks}
            dispatchableTasks={dispatchableTasks}
            pendingCount={pendingItems.length}
            schedulerRunning={schedulerRunning}
            dispatchingOpportunityId={dispatchingOpportunityId}
            agentOpportunityRoutingPolicy={agentOpportunityRoutingPolicy}
            onRunScheduler={runSchedulerNow}
            onDispatchAll={runAllDispatchableOpportunities}
            onUpdateRoutingPolicy={updateAgentOpportunityRoutingPolicy}
            onReopenOpportunity={updateAgentOpportunity}
            onDispatchTask={dispatchTask}
            onUpdateTaskAndOpportunity={updateTaskAndLinkedOpportunity}
            onDeleteTaskAndOpportunity={deleteTaskAndLinkedOpportunity}
          />
        )}

        {tab === 'approvals' && (
          <ApprovalCenterPanel
            language={language}
            pendingItems={pendingItems}
            agentExecutionPolicy={agentExecutionPolicy}
            t={t}
            onApprove={approveItem}
            onReject={rejectItem}
            onTabChange={setTab}
            onUpdatePolicy={updateAgentExecutionPolicy}
          />
        )}

        {tab === 'runs' && (
          <ExecutionLogsPanel
            language={language}
            t={t}
            runLogs={runLogs}
            agentRunRecords={agentRunRecords}
            logDisplayLimit={logDisplayLimit}
            expandedTraceRunIds={expandedTraceRunIds}
            schedulerRunning={schedulerRunning}
            schedulerSummary={schedulerSummary}
            schedulerAgentDetails={schedulerAgentDetails}
            onLogDisplayLimitChange={setLogDisplayLimit}
            onOpenPolicy={() => setTab('approvals')}
            onClearTraceLogs={clearTraceLogs}
            onDeleteTraceRun={deleteRunLog}
            onToggleTraceRunExpanded={(runId) => setExpandedTraceRunIds(ids => (
              ids.includes(runId) ? ids.filter(id => id !== runId) : [...ids, runId]
            ))}
            onRunScheduler={runSchedulerNow}
            onClearAgentRunRecords={clearAgentRunRecords}
            onDeleteAgentRunRecord={deleteAgentRunRecord}
          />
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
