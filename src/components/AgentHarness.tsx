import React, { useMemo, useState } from 'react';
import { Bot, CheckCircle2, ClipboardCheck, Cpu, Loader2, Play, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { useAuthStore } from '../authStore';
import { AgentHarnessRun, AgentHarnessStep, useStore } from '../store';
import { useTranslation } from '../lib/i18n';

const AGENTS = [
  {
    id: 'global_agent',
    name: 'Global Conversion Agent',
    goal: 'Plan and coordinate CRM-wide lead acquisition, enrichment, follow-up, quotes, and conversion.',
    tools: ['global_agent.plan', 'lead.acquire', 'lead.enrich', 'email.send', 'whatsapp.send', 'quote.create', 'client.update']
  },
  {
    id: 'follow_up_agent',
    name: 'AI Follow-Up Agent',
    goal: 'Run account-level email and WhatsApp follow-up decisions using client history and workflow rules.',
    tools: ['email.send', 'whatsapp.send', 'client.comment', 'client.stage']
  },
  {
    id: 'whatsapp_agent',
    name: 'WhatsApp Inbox Agent',
    goal: 'Read WhatsApp conversation context, classify replies, add notes, and suggest next actions.',
    tools: ['whatsapp.read', 'whatsapp.send', 'conversation.tag', 'conversation.comment']
  },
  {
    id: 'lead_scoring_agent',
    name: 'Lead Scoring Agent',
    goal: 'Analyze lead quality, score conversion potential, summarize the account, and recommend the best next step.',
    tools: ['lead.analyze', 'lead.score', 'client.summarize', 'next_step.recommend']
  },
  {
    id: 'lead_data_agent',
    name: 'Lead Data Agent',
    goal: 'Acquire, import, enrich, deduplicate, and normalize lead data across configured data channels.',
    tools: ['lead.acquire', 'lead.enrich', 'public_pool.import', 'client.dedupe', 'data.normalize']
  }
];

const DEFAULT_OBJECTIVE = 'Coordinate the CRM agents to acquire qualified leads, enrich the best opportunities, follow up across email and WhatsApp, and move active buyers toward quotes and closed deals.';

function fallbackRun(objective: string): Omit<AgentHarnessRun, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    objective,
    summary: 'Safe default harness run created for review.',
    status: 'pending_review',
    steps: [
      {
        id: `hstep_${Date.now()}_1`,
        agentId: 'lead_data_agent',
        title: 'Audit lead sources',
        description: 'Check configured acquisition and enrichment channels before any outbound action.',
        tool: 'lead.acquire',
        risk: 'low',
        status: 'pending',
        payload: { requireConfiguredChannels: true }
      },
      {
        id: `hstep_${Date.now()}_2`,
        agentId: 'global_agent',
        title: 'Create human-reviewed conversion plan',
        description: 'Hand off to Global Agent to generate a detailed CRM execution plan requiring human approval.',
        tool: 'global_agent.plan',
        risk: 'medium',
        status: 'pending',
        payload: { objective }
      },
      {
        id: `hstep_${Date.now()}_3`,
        agentId: 'follow_up_agent',
        title: 'Prepare follow-up automation',
        description: 'Validate that follow-up workflows can send email and WhatsApp only within configured guardrails.',
        tool: 'followup.validate',
        risk: 'medium',
        status: 'pending',
        payload: { requireHumanApprovalForNewSequences: true }
      }
    ]
  };
}

export function AgentHarness() {
  const {
    clients,
    emails,
    leadCampaigns,
    leadDataChannelConfigs,
    whatsappHubConfig,
    llmConfigs,
    llmMappings,
    activeLLMId,
    language,
    agentHarnessRuns,
    addAgentHarnessRun,
    updateAgentHarnessRun,
    updateAgentHarnessStep,
    addGlobalAgentPlan,
    setView,
    notify,
    sendExternalNotification
  } = useStore();
  const { token } = useAuthStore();
  const t = useTranslation(language);
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [planning, setPlanning] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const activeRun = agentHarnessRuns[0] || null;
  const plannerConfig = llmConfigs.find(config => config.id === (llmMappings.agent_harness || activeLLMId)) || null;

  const context = useMemo(() => ({
    clients: clients.length,
    unreadEmails: emails.filter(email => !email.read && (email.type === 'inbox' || email.type === 'inbound')).length,
    campaigns: leadCampaigns.length,
    whatsappEnabled: whatsappHubConfig.enabled,
    enabledLeadChannels: Object.entries(leadDataChannelConfigs).filter(([, cfg]) => cfg.enabled && cfg.apiKey).map(([id]) => id),
    agents: AGENTS.map(agent => ({ id: agent.id, name: agent.name, tools: agent.tools }))
  }), [clients, emails, leadCampaigns, whatsappHubConfig, leadDataChannelConfigs]);

  const parseRun = (raw: string): Omit<AgentHarnessRun, 'id' | 'createdAt' | 'updatedAt'> => {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
    if (!Array.isArray(parsed.steps)) throw new Error('Harness plan is missing steps');
    return {
      objective,
      summary: parsed.summary || 'Agent Harness run generated for review.',
      status: 'pending_review',
      steps: parsed.steps.map((step: any, index: number) => ({
        id: `hstep_${Date.now()}_${index}`,
        agentId: step.agentId || 'global_agent',
        title: step.title || `Harness step ${index + 1}`,
        description: step.description || '',
        tool: step.tool || 'global_agent.plan',
        risk: ['low', 'medium', 'high'].includes(step.risk) ? step.risk : 'medium',
        status: 'pending',
        payload: step.payload || {}
      }))
    };
  };

  const generateRun = async () => {
    setPlanning(true);
    try {
      const prompt = `You are an AI Agent Harness planner for a foreign trade CRM.
Your job is to coordinate specialized agents, choose tools, assess risk, and produce a human-reviewable run plan.
The harness must not execute anything before approval.

Return JSON only:
{
  "summary": "short run summary",
  "steps": [
    {
      "agentId": "global_agent | follow_up_agent | whatsapp_agent | lead_scoring_agent | lead_data_agent",
      "title": "step title",
      "description": "operator-readable description",
      "tool": "one tool from the selected agent",
      "risk": "low | medium | high",
      "payload": {}
    }
  ]
}

Available agents and tools:
${JSON.stringify(AGENTS, null, 2)}

CRM context:
${JSON.stringify(context, null, 2)}

Objective:
${objective}`;

      const response = await fetch('/api/agent-harness/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, context, llmConfig: plannerConfig })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Agent Harness planning failed');
      const run = parseRun(data.result || '');
      const runId = addAgentHarnessRun(run);
      notify('Agent Harness run is ready for human review.', 'info');
      void sendExternalNotification({
        event: 'review_required',
        title: 'Agent Harness run needs review',
        body: run.summary,
        metadata: { runId, source: 'agent-harness' }
      });
    } catch (error) {
      console.error(error);
      const run = fallbackRun(objective);
      const runId = addAgentHarnessRun(run);
      notify('Agent Harness AI planning failed. A safe default run was created for review.', 'warning');
      void sendExternalNotification({
        event: 'review_required',
        title: 'Agent Harness fallback run needs review',
        body: run.summary,
        metadata: { runId, source: 'agent-harness', fallback: true }
      });
    } finally {
      setPlanning(false);
    }
  };

  const executeStep = async (run: AgentHarnessRun, step: AgentHarnessStep) => {
    updateAgentHarnessStep(run.id, step.id, { status: 'running', error: undefined });
    await new Promise(resolve => window.setTimeout(resolve, 350));

    if (step.tool === 'global_agent.plan') {
      addGlobalAgentPlan({
        objective: step.payload?.objective || run.objective,
        summary: `Harness handoff: ${step.title}`,
        status: 'pending_review',
        steps: [{
          id: `step_${Date.now()}_harness`,
          title: 'Review harness handoff',
          description: step.description || 'Review and expand this harness handoff in Global Agent.',
          actionType: 'review_pipeline',
          status: 'pending',
          payload: { harnessRunId: run.id, harnessStepId: step.id, ...step.payload }
        }]
      });
      updateAgentHarnessStep(run.id, step.id, { status: 'completed', result: 'Created pending Global Agent plan for human review.' });
      return;
    }

    updateAgentHarnessStep(run.id, step.id, {
      status: 'completed',
      result: `Harness validated ${step.tool} and recorded the handoff.`
    });
  };

  const approveAndRun = async (run: AgentHarnessRun) => {
    setRunningId(run.id);
    updateAgentHarnessRun(run.id, {
      status: 'running',
      approvedAt: new Date().toISOString(),
      steps: run.steps.map(step => step.status === 'failed' || step.status === 'running' ? { ...step, status: 'pending', error: undefined } : step)
    });
    try {
      for (const step of run.steps) {
        if (step.status === 'completed' || step.status === 'skipped') continue;
        await executeStep(run, step);
      }
      updateAgentHarnessRun(run.id, { status: 'completed', completedAt: new Date().toISOString() });
      notify('Agent Harness run completed.', 'success');
    } catch (error: any) {
      updateAgentHarnessRun(run.id, { status: 'failed' });
      notify(error?.message || 'Agent Harness run failed.', 'error');
      void sendExternalNotification({
        event: 'execution_failed',
        title: 'Agent Harness run failed',
        body: error?.message || 'Review the failed Agent Harness step.',
        metadata: { runId: run.id, source: 'agent-harness' }
      });
    } finally {
      setRunningId(null);
    }
  };

  const rejectRun = (run: AgentHarnessRun) => {
    updateAgentHarnessRun(run.id, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedReason: 'Rejected by human reviewer',
      steps: run.steps.map(step => step.status === 'pending' ? { ...step, status: 'skipped' } : step)
    });
    notify('Agent Harness run rejected. Nothing was executed.', 'info');
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-rose-400" />;
    if (status === 'running') return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
    return <ClipboardCheck className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 border-t border-slate-800 p-6 text-white">
      <div className="w-full space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Cpu className="w-8 h-8 text-fuchsia-400" />
              {t('agentHarness')}
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl">
              {t('agentHarnessSubtitle')}
            </p>
          </div>
          <button onClick={() => setView('agent-hub')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-bold">
            Agent Hub
          </button>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {AGENTS.map(agent => (
            <div key={agent.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 font-bold text-slate-100">
                <Bot className="w-4 h-4 text-cyan-400" />
                {t(agent.id === 'global_agent' ? 'globalConversionAgent' : agent.id === 'follow_up_agent' ? 'aiFollowUpAgent' : agent.id === 'whatsapp_agent' ? 'whatsappInboxAgent' : 'leadDataAgent')}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{t(agent.id === 'global_agent' ? 'globalConversionAgentGoal' : agent.id === 'follow_up_agent' ? 'aiFollowUpAgentGoal' : agent.id === 'whatsapp_agent' ? 'whatsappInboxAgentGoal' : 'leadDataAgentGoal')}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {agent.tools.slice(0, 4).map(tool => (
                  <span key={tool} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">{tool}</span>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="text-sm font-bold uppercase tracking-wider text-slate-300">{t('harnessObjective')}</div>
          <textarea
            value={objective}
            onChange={e => setObjective(e.target.value)}
            className="w-full min-h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-fuchsia-500 resize-none"
          />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              [t('Clients'), context.clients],
              [t('Unread Emails'), context.unreadEmails],
              [t('campaigns'), context.campaigns],
              ['WhatsApp', context.whatsappEnabled ? 'On' : 'Off'],
              [t('leadChannels'), context.enabledLeadChannels.length]
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="text-xl font-black text-slate-100">{value}</div>
              </div>
            ))}
          </div>
          <button
            onClick={generateRun}
            disabled={planning || !objective.trim()}
            className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg font-bold flex items-center gap-2"
          >
            {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t('generateHarnessRun')}
          </button>
          <div className="text-xs text-slate-500">{t('planner')}: {plannerConfig?.name || t('defaultInternalAI')}</div>
        </section>

        {activeRun && (
          <section className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase tracking-wider px-2 py-1 rounded bg-slate-800 text-fuchsia-300 font-bold">{activeRun.status}</span>
                  {activeRun.status === 'pending_review' && (
                    <span className="text-xs text-amber-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {t('humanApprovalRequired')}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold">{activeRun.summary}</h2>
                <p className="text-sm text-slate-400 mt-1">{activeRun.objective}</p>
              </div>
              {activeRun.status === 'pending_review' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => rejectRun(activeRun)}
                    disabled={runningId === activeRun.id}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500 border border-slate-700 rounded-lg font-bold flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('Reject')}
                  </button>
                  <button
                    onClick={() => approveAndRun(activeRun)}
                    disabled={runningId === activeRun.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 rounded-lg font-bold flex items-center gap-2"
                  >
                    {runningId === activeRun.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {t('approveRun')}
                  </button>
                </div>
              )}
            </div>
            <div className="divide-y divide-slate-800">
              {activeRun.steps.map((step, index) => (
                <div key={step.id} className="p-5 flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-slate-400 shrink-0">{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusIcon(step.status)}
                      <h3 className="font-bold text-slate-100">{step.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">{step.agentId}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">{step.tool}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${step.risk === 'high' ? 'bg-rose-950/40 border-rose-900 text-rose-300' : step.risk === 'medium' ? 'bg-amber-950/40 border-amber-900 text-amber-300' : 'bg-emerald-950/40 border-emerald-900 text-emerald-300'}`}>{t(step.risk === 'high' ? 'highRisk' : step.risk === 'medium' ? 'mediumRisk' : 'lowRisk')}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                    <pre className="mt-3 text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-x-auto">{JSON.stringify(step.payload || {}, null, 2)}</pre>
                    {step.result && <div className="text-xs text-emerald-400 mt-2">{step.result}</div>}
                    {step.error && <div className="text-xs text-rose-400 mt-2">{step.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
