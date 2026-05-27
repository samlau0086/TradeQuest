import React, { useMemo, useState } from 'react';
import { Bot, CheckCircle2, ClipboardCheck, Cpu, ListChecks, Plus, Power, Save, Server, ShieldCheck, SlidersHorizontal, X, XCircle, Zap } from 'lucide-react';
import { AgentHubAgent, AgentHubGuardrail, AgentHubStatus, GLOBAL_AGENT_ACTION_TYPES, GlobalAgentActionType, useStore } from '../store';
import { cn } from '../lib/utils';

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

const emptyAgent = (): Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'> => ({
  name: '',
  instructions: '',
  guardrail: 'review',
  status: 'idle',
  tools: [],
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

function AgentModal({
  agent,
  onClose,
  onSave
}: {
  agent: Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'> | AgentHubAgent;
  onClose: () => void;
  onSave: (agent: any) => void;
}) {
  const [form, setForm] = useState(agent);
  const isEdit = 'id' in agent;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-100">{isEdit ? 'Configure Agent' : 'Create Agent'}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <label className="block">
            <span className="text-sm text-slate-200">Agent Name</span>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Objections Handler Agent"
              className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-200">Prompt / Instructions</span>
            <textarea
              value={form.instructions}
              onChange={e => setForm({ ...form, instructions: e.target.value })}
              placeholder="Describe what this agent does..."
              className="mt-2 w-full min-h-28 bg-black border border-neutral-700 rounded-md px-4 py-3 text-sm text-slate-100 outline-none resize-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-200">Harness / Guardrails</span>
            <select
              value={form.guardrail}
              onChange={e => setForm({ ...form, guardrail: e.target.value as AgentHubGuardrail })}
              className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="auto">Auto-execute (No approval needed)</option>
              <option value="review">Requires approval before execution</option>
              <option value="human_loop">Human-in-the-loop for outbound actions</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">Determines whether this agent can immediately act or must wait for approval.</p>
          </label>
          <label className="block">
            <span className="text-sm text-slate-200">Tools</span>
            <input
              value={form.tools.join(', ')}
              onChange={e => setForm({ ...form, tools: e.target.value.split(',').map(tool => tool.trim()).filter(Boolean) })}
              placeholder="email.send, whatsapp.send, lead.enrich"
              className="mt-2 w-full bg-black border border-neutral-700 rounded-md px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </label>
          {isEdit && (
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-100">Agent Status</div>
                <div className="text-xs text-slate-500">Currently: {form.status}</div>
              </div>
              <button
                onClick={() => setForm({ ...form, status: form.status === 'active' ? 'idle' : 'active' })}
                className="px-4 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center gap-2"
              >
                <Power className="w-4 h-4" />
                {form.status === 'active' ? 'Set Idle' : 'Activate Agent'}
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-5 border-t border-neutral-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
          <button
            onClick={() => form.name.trim() && onSave(form)}
            disabled={!form.name.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-md text-sm font-bold text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isEdit ? 'Save Changes' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AgentHub() {
  const {
    agentHubAgents,
    addAgentHubAgent,
    updateAgentHubAgent,
    agentHarnessRuns,
    globalAgentPlans,
    updateAgentHarnessRun,
    updateGlobalAgentPlan,
    agentExecutionPolicy,
    updateAgentExecutionPolicy,
    setView
  } = useStore();
  const [tab, setTab] = useState<'fleet' | 'harness'>('fleet');
  const [modalAgent, setModalAgent] = useState<AgentHubAgent | ReturnType<typeof emptyAgent> | null>(null);

  const pendingItems = useMemo(() => [
    ...agentHarnessRuns.filter(run => run.status === 'pending_review').map(run => ({ kind: 'harness' as const, id: run.id, title: run.summary, agent: 'Agent Harness', body: run.objective, createdAt: run.createdAt })),
    ...globalAgentPlans.filter(plan => plan.status === 'pending_review').map(plan => ({ kind: 'global' as const, id: plan.id, title: plan.summary, agent: 'Global Agent', body: plan.objective, createdAt: plan.createdAt }))
  ], [agentHarnessRuns, globalAgentPlans]);

  const runLogs = useMemo(() => [
    ...agentHarnessRuns.map(run => ({ id: run.id, title: run.summary, agent: 'Agent Harness', status: run.status, steps: run.steps.map(step => `${step.tool}: ${step.status}`), createdAt: run.createdAt })),
    ...globalAgentPlans.map(plan => ({ id: plan.id, title: plan.summary, agent: 'Global Agent', status: plan.status, steps: plan.steps.map(step => `${step.actionType}: ${step.status}`), createdAt: plan.createdAt }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8), [agentHarnessRuns, globalAgentPlans]);

  const computedAgents = agentHubAgents.map(agent => ({
    ...agent,
    tasksCompleted: agent.tasksCompleted + runLogs.filter(run => run.agent.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()) && run.status === 'completed').length
  }));

  const approveItem = (item: typeof pendingItems[number]) => {
    if (item.kind === 'harness') updateAgentHarnessRun(item.id, { status: 'approved', approvedAt: new Date().toISOString() });
    if (item.kind === 'global') updateGlobalAgentPlan(item.id, { status: 'approved', approvedAt: new Date().toISOString() });
  };

  const rejectItem = (item: typeof pendingItems[number]) => {
    if (item.kind === 'harness') updateAgentHarnessRun(item.id, { status: 'rejected', rejectedAt: new Date().toISOString(), rejectedReason: 'Rejected from Agent Hub' });
    if (item.kind === 'global') updateGlobalAgentPlan(item.id, { status: 'rejected', rejectedAt: new Date().toISOString(), rejectedReason: 'Rejected from Agent Hub' });
  };

  return (
    <div className="flex-1 bg-black text-slate-100 overflow-y-auto">
      <div className="p-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-normal">智能体中心</h1>
            <p className="text-slate-400 text-sm mt-1">Monitor workloads and manage the intelligence layer.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-neutral-900 border border-neutral-700 rounded-md p-1 flex">
              <button onClick={() => setTab('harness')} className={cn('px-4 py-2 rounded text-sm flex items-center gap-2', tab === 'harness' ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:text-white')}>
                <ShieldCheck className="w-4 h-4" /> Harness & Approvals
              </button>
              <button onClick={() => setTab('fleet')} className={cn('px-4 py-2 rounded text-sm flex items-center gap-2', tab === 'fleet' ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:text-white')}>
                <Server className="w-4 h-4" /> Agent Fleet
              </button>
            </div>
            <button onClick={() => setModalAgent(emptyAgent())} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Agent
            </button>
          </div>
        </div>

        {tab === 'fleet' ? (
          <div className="max-w-5xl bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
              <Server className="w-4 h-4" /> 智能体运行状态
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
                      <span className={cn('px-3 py-1 rounded border text-[10px] font-bold uppercase', statusClass(agent.status))}>
                        {agent.status}
                      </span>
                      <button onClick={() => setModalAgent(agent)} className="p-2 text-slate-400 hover:text-white hover:bg-neutral-800 rounded-md">
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-8 flex items-center justify-between gap-4">
                    <span className="px-3 py-1 rounded-md border border-neutral-800 bg-black text-[10px] text-slate-300 uppercase flex items-center gap-1">
                      {agent.guardrail === 'auto' ? <Zap className="w-3 h-3 text-amber-400" /> : <ShieldCheck className="w-3 h-3 text-blue-400" />}
                      {guardrailLabel(agent.guardrail)}
                    </span>
                    <span className="px-3 py-1 rounded-md border border-neutral-800 bg-black text-[10px] text-slate-300">已处理任务: {agent.tasksCompleted}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
                <ClipboardCheck className="w-4 h-4" /> Human Approvals
              </div>
              <div className="space-y-4">
                {pendingItems.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No approvals waiting.</div>}
                {pendingItems.map(item => (
                  <div key={`${item.kind}-${item.id}`} className="bg-slate-950 border border-blue-500/30 rounded-lg p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-blue-300 mb-3">
                          <span className="px-2 py-1 rounded bg-blue-600/20 border border-blue-500/40 uppercase font-bold">Requires Approval</span>
                          <Bot className="w-3 h-3" /> {item.agent}
                        </div>
                        <h3 className="font-bold text-slate-100">{item.title}</h3>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-4 bg-black border border-neutral-800 rounded-md p-4 text-sm text-slate-300 whitespace-pre-wrap">{item.body}</div>
                    <div className="mt-4 flex justify-end gap-3">
                      <button onClick={() => rejectItem(item)} className="px-4 py-2 text-red-300 hover:bg-red-500/10 rounded-md text-sm font-bold flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button onClick={() => approveItem(item)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-white text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <ListChecks className="w-4 h-4" /> Agent Runs & Trace Log
                </div>
                <button onClick={() => setView('agent-harness')} className="text-xs text-blue-300 hover:text-blue-200">Open Harness</button>
              </div>
              <div className="space-y-4">
                {runLogs.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No agent runs yet.</div>}
                {runLogs.map(run => (
                  <div key={run.id} className="bg-black border border-neutral-800 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-100">{run.title}</div>
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-1"><Cpu className="w-3 h-3" /> {run.agent}</div>
                      </div>
                      <span className="text-xs text-slate-400 capitalize">{run.status}</span>
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

              <div className="mt-6 border-t border-neutral-800 pt-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                  <ShieldCheck className="w-4 h-4" /> Harness Strategy
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {GLOBAL_AGENT_ACTION_TYPES.map(actionType => {
                    const rule = agentExecutionPolicy[actionType];
                    return (
                      <div key={actionType} className="bg-black border border-neutral-800 rounded-md p-3">
                        <div className="text-xs font-bold text-slate-200 mb-2">{ACTION_LABELS[actionType]}</div>
                        <div className="flex gap-2">
                          <select
                            value={rule.mode}
                            onChange={e => updateAgentExecutionPolicy(actionType, { mode: e.target.value as any })}
                            className="min-w-0 flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-slate-200"
                          >
                            <option value="auto">Auto</option>
                            <option value="review">Review</option>
                          </select>
                          <select
                            value={rule.risk}
                            onChange={e => updateAgentExecutionPolicy(actionType, { risk: e.target.value as any })}
                            className="min-w-0 flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-slate-200"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {modalAgent && (
        <AgentModal
          agent={modalAgent}
          onClose={() => setModalAgent(null)}
          onSave={(agent) => {
            if ('id' in agent) updateAgentHubAgent(agent.id, agent);
            else addAgentHubAgent(agent);
            setModalAgent(null);
          }}
        />
      )}
    </div>
  );
}
