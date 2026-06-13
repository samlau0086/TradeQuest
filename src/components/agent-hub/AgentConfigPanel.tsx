import React, { useMemo, useRef, useState } from 'react';
import { Check, Power, RefreshCw, Save, Search, Sparkles, Trash2, X } from 'lucide-react';
import { AgentHubAgent, AgentHubEventScope, AgentHubGuardrail, AgentHubScheduleUnit, useStore } from '../../store';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../lib/i18n';
import { AGENT_TOOL_REGISTRY, getAgentToolDefinition, inferAgentToolsFromPrompt } from '../../lib/agentTools';
import { useAuthStore } from '../../authStore';
import { AGENT_EVENT_TRIGGER_OPTIONS, eventTriggerLabel, riskClass } from './shared';

export type AgentConfigValue = Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'> | AgentHubAgent;

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


export function AgentConfigPanel({
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

