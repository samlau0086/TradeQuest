import React, { useEffect, useRef } from 'react';
import { AgentHubAgent, useStore } from './store';
import { useAuthStore } from './authStore';
import { Sidebar } from './components/Sidebar';
import { TopBar, MagicCommand } from './components/TopBar';
import { Kanban } from './components/Kanban';
import { ClientDetails } from './components/ClientDetails';
import { Inbox } from './components/Inbox';
import { Dashboard } from './components/Dashboard';
import { ActionableClients } from './components/ActionableClients';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { PublicPool } from './components/PublicPool';
import { PipelineList } from './components/PipelineList';
import { ClientsList } from './components/ClientsList';
import { EditRequests } from './components/EditRequests';
import { KnowledgeBaseManager } from './components/KnowledgeBaseManager';
import { AuthPage } from './components/AuthPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { Loader2 } from 'lucide-react';
import { translateLiteral, useTranslation } from './lib/i18n';

import { ProductsList } from './components/ProductsList';
import { QuotesList } from './components/QuotesList';
import { MediaLibrary } from './components/MediaLibrary';
import { NotificationCenter } from './components/NotificationCenter';
import { AgentHub } from './components/AgentHub';
import { getViewForPath, syncViewToUrl } from './lib/viewRoutes';
import { getCustomerOutputLanguage } from './lib/language';
import { buildLeadScoringSignature, hasLeadScoringResult } from './lib/leadScoring';
import { buildAgentInputSignature } from './lib/agentIdempotency';

function getAgentScheduleIntervalMs(agent: AgentHubAgent) {
  const value = Math.max(1, Number(agent.scheduleIntervalValue || agent.scheduleIntervalMinutes || 1));
  const unit = agent.scheduleIntervalUnit || 'minute';
  if (unit === 'second') return value * 1000;
  if (unit === 'minute') return value * 60 * 1000;
  if (unit === 'hour') return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isAgentScheduleDue(agent: AgentHubAgent, now: number) {
  if (agent.scheduleMaxRuns != null && (agent.scheduleRunCount || 0) >= agent.scheduleMaxRuns) return false;
  const unit = agent.scheduleIntervalUnit || 'minute';
  const lastRun = agent.lastRunAt ? new Date(agent.lastRunAt) : null;
  if (unit === 'month_day') {
    const current = new Date(now);
    const requestedDay = Math.min(31, Math.max(1, Number(agent.scheduleDayOfMonth || 1)));
    const lastDayOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    const runDay = Math.min(requestedDay, lastDayOfMonth);
    if (current.getDate() !== runDay) return false;
    return !lastRun || !isSameMonth(lastRun, current);
  }
  if (!lastRun) return true;
  return now - lastRun.getTime() >= getAgentScheduleIntervalMs(agent);
}

function getLLMConfigForModule(module: string) {
  const state = useStore.getState();
  const id = state.llmMappings[module] || state.activeLLMId;
  return state.llmConfigs.find(config => config.id === id) || state.llmConfigs[0];
}

async function executeLeadScoringAgentRun(agent: AgentHubAgent) {
  const state = useStore.getState();
  const candidates = state.clients.filter(client => client.status !== 'Closed Won');
  let skipped = 0;
  let scored = 0;
  let failed = 0;
  const maxPerRun = 10;
  const nowIso = new Date().toISOString();

  for (const client of candidates) {
    const signature = buildLeadScoringSignature(client, state.logs, state.emails);
    if (hasLeadScoringResult(client) && (client.leadScoringSignature === signature || !client.leadScoringSignature)) {
      skipped += 1;
      if (!client.leadScoringSignature) {
        state.editClient(client.id, {
          leadScoringSignature: signature,
          leadScoringAnalyzedAt: client.leadScoringAnalyzedAt || nowIso
        });
      }
      continue;
    }
    const idempotencyInput = {
      agentId: agent.id,
      tool: 'lead.score',
      targetType: 'client',
      targetId: client.id,
      inputSignature: buildAgentInputSignature({ signature })
    };
    if (state.findAgentIdempotencyRecord(idempotencyInput)) {
      skipped += 1;
      continue;
    }
    if (scored >= maxPerRun) {
      skipped += 1;
      continue;
    }

    const clientLogs = state.logs
      .filter(log => log.clientId === client.id)
      .slice(0, 20)
      .map(log => ({ date: log.date, type: log.type, content: log.content }));
    const clientEmails = state.emails
      .filter(email => email.clientId === client.id)
      .slice(0, 10)
      .map(email => ({ date: email.date, type: email.type, subject: email.subject, body: email.body?.slice(0, 800) }));
    const latestCustomerEmail = clientEmails.find(email => email.type === 'inbox' || email.type === 'inbound') || clientEmails[0];

    try {
      const res = await fetch('/api/chat/icebreaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          client,
          logs: clientLogs,
          emails: clientEmails,
          llmConfig: getLLMConfigForModule('analysis'),
          embeddingLlmConfig: getLLMConfigForModule('embedding'),
          systemLanguage: state.language === 'zh' ? 'Chinese' : 'English',
          outboundLanguage: getCustomerOutputLanguage({
            lastCommunicationText: latestCustomerEmail?.body,
            preferredLanguage: client.preferredLanguage,
            country: client.country
          })
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lead scoring failed');
      const score = Number(data.leadScore ?? data.temperature ?? 0);
      const fallbackSummary = [client.company || client.name, client.country, client.status, client.tags?.length ? `Tags: ${client.tags.join(', ')}` : ''].filter(Boolean).join(' / ');
      const leadSummary = data.leadSummary || data.summary || fallbackSummary || 'Lead profile requires more interaction data.';
      const leadNextStep = data.leadNextStep || data.nextStep || client.agentNextStep || 'Review the lead profile and choose the next follow-up action.';
      state.editClient(client.id, {
        leadScore: score,
        leadSummary,
        leadNextStep,
        leadScoringSignature: signature,
        leadScoringAnalyzedAt: new Date().toISOString(),
        agentSummary: leadSummary || client.agentSummary,
        agentNextStep: leadNextStep || client.agentNextStep
      });
      state.addLog(
        client.id,
        `Lead Scoring Agent analyzed lead: score ${score}/100. Next step: ${leadNextStep}`,
        undefined,
        'general',
        { source: 'lead_scoring_agent', score, summary: leadSummary }
      );
      state.recordAgentIdempotency({
        ...idempotencyInput,
        status: 'completed',
        resultRef: `client:${client.id}`
      });
      scored += 1;
    } catch (error) {
      console.error('Lead scoring agent failed for client', client.id, error);
      failed += 1;
    }
  }

  return { scanned: candidates.length, skipped, scored, failed };
}

export default function App() {
  const { view, setView, selectedClientId, checkScheduledEmails, fetchInitialData, language, globalLoading, inboxConfigs, fetchEmails } = useStore();
  const t = useTranslation(language);
  const { token, isInitializing } = useAuthStore();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: 'app-layout' });
  const emailSyncStateRef = useRef<Record<string, { lastAttempt: number; inFlight: boolean }>>({});
  const agentRunInFlightRef = useRef(false);

  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('resetToken');

  if (resetToken) {
    return <ResetPasswordPage resetToken={resetToken} />;
  }

  useEffect(() => {
    const viewFromUrl = getViewForPath(window.location.pathname);
    if (viewFromUrl) {
      setView(viewFromUrl, { replace: true, skipUrl: true });
    } else {
      syncViewToUrl(view, { replace: true });
    }

    const handlePopState = () => {
      const nextView = getViewForPath(window.location.pathname);
      if (nextView) setView(nextView, { skipUrl: true });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (token) {
      fetchInitialData();
    }
  }, [token, fetchInitialData]);

  useEffect(() => {
    // Check for scheduled emails every 10 seconds
    const interval = setInterval(checkScheduledEmails, 10000);
    return () => clearInterval(interval);
  }, [checkScheduledEmails]);

  useEffect(() => {
    if (!token) return;

    const runDueAgents = async () => {
      if (agentRunInFlightRef.current) return;
      agentRunInFlightRef.current = true;
      const state = useStore.getState();
      const now = Date.now();
      const dueAgents = state.agentHubAgents.filter(agent => agent.scheduleEnabled && agent.status !== 'paused');
      try {
        for (const agent of dueAgents) {
          if (!isAgentScheduleDue(agent, now)) continue;
          if (agent.id === 'follow_up_agent') {
            const scoringAgent = state.agentHubAgents.find(item => item.id === 'lead_scoring_agent');
            const scoringIsDue = !!scoringAgent && scoringAgent.status !== 'paused' && !!scoringAgent.scheduleEnabled && isAgentScheduleDue(scoringAgent, now);
            if (scoringIsDue) continue;
          }

          const reviewStatus = agent.guardrail === 'auto' ? 'approved' : 'pending_review';
          const isZh = state.language === 'zh';
          const objective = agent.id === 'follow_up_agent'
            ? `Scheduled run for ${agent.name}: ${agent.instructions}. Use Lead Scoring Agent outputs when available and do not repeat lead scoring or lead summaries.`
            : `Scheduled run for ${agent.name}: ${agent.instructions}`;
          const expectedResult = agent.id === 'global_agent'
            ? (isZh ? '创建或更新全局 Agent 转化协同计划。' : 'Create or update a Global Agent plan for conversion coordination.')
            : agent.id === 'lead_scoring_agent'
              ? (isZh ? '扫描符合条件的线索，跳过未变化线索，并在需要时更新评分、摘要和最佳下一步。' : 'Scan eligible leads, skip unchanged leads, and update score/summary/next step when needed.')
              : (isZh
                ? `审核通过后执行 ${agent.name} 的配置工作流：读取符合条件的客户上下文，检查幂等和风险规则，生成适合渠道的外发内容，执行已授权工具（${agent.tools.join(', ') || 'agent tools'}），更新 CRM 日志/状态，并汇总扫描、执行、跳过、失败数量。`
                : `Run the configured ${agent.name} workflow after approval: read eligible customer context, check idempotency and risk rules, generate channel-appropriate outbound content, execute permitted tools (${agent.tools.join(', ') || 'agent tools'}), update CRM logs/status, and report scanned/acted/skipped/failed counts.`);
          const runRecordId = state.addAgentRunRecord({
            agentId: agent.id,
            agentName: agent.name,
            trigger: 'scheduled',
            status: 'running',
            plan: objective,
            expectedResult,
            actualResult: 'Scheduled agent run started.'
          });
          let relatedRunId = '';
          let relatedRunType: 'harness' | 'global' = 'harness';
          try {
            if (agent.id === 'global_agent') {
              relatedRunId = state.addGlobalAgentPlan({
                objective,
                summary: `Scheduled Global Agent run: ${agent.name}`,
                status: reviewStatus,
                steps: [{
                  id: `step_${Date.now()}_${agent.id}`,
                  title: 'Scheduled Global Agent review',
                  description: agent.instructions,
                  actionType: 'review_pipeline',
                  status: 'pending',
                  payload: { source: 'agent-hub-schedule', agentId: agent.id, tools: agent.tools }
                }]
              });
              relatedRunType = 'global';
            } else {
              relatedRunId = state.addAgentHarnessRun({
                objective,
                summary: `Scheduled Agent Hub run: ${agent.name}`,
                status: reviewStatus,
                steps: [{
                  id: `hstep_${Date.now()}_${agent.id}`,
                  agentId: agent.id,
                  title: `Run ${agent.name}`,
                  description: agent.instructions,
                  tool: agent.tools[0] || 'agent.run',
                  risk: agent.guardrail === 'auto' ? 'low' : 'medium',
                  status: 'pending',
                  payload: { source: 'agent-hub-schedule', agentId: agent.id, tools: agent.tools }
                }]
              });
            }
            let actualResult = reviewStatus === 'approved'
              ? (isZh ? '定期运行已根据护栏策略自动批准。' : 'Scheduled run was auto-approved according to guardrail policy.')
              : (isZh ? '定期运行已创建，正在等待人工审核。' : 'Scheduled run created and waiting for human approval.');

            if (agent.id === 'lead_scoring_agent' && reviewStatus === 'approved') {
              const result = await executeLeadScoringAgentRun(agent);
              actualResult = isZh
                ? `线索评分已扫描 ${result.scanned} 个线索，评分 ${result.scored} 个，跳过 ${result.skipped} 个，失败 ${result.failed} 个。`
                : `Lead scoring scanned ${result.scanned} lead(s), scored ${result.scored}, skipped ${result.skipped}, failed ${result.failed}.`;
            }

            state.updateAgentRunRecord(runRecordId, {
              status: agent.id === 'lead_scoring_agent' && reviewStatus === 'approved' ? 'completed' : reviewStatus,
              actualResult,
              relatedRunId,
              relatedRunType,
              completedAt: new Date().toISOString()
            });
            const nextRunCount = (agent.scheduleRunCount || 0) + 1;
            state.updateAgentHubAgent(agent.id, {
              lastRunAt: new Date(now).toISOString(),
              scheduleRunCount: nextRunCount,
              scheduleEnabled: agent.scheduleMaxRuns != null && nextRunCount >= agent.scheduleMaxRuns ? false : agent.scheduleEnabled,
              tasksCompleted: agent.tasksCompleted + 1
            });
            state.notify(`${agent.name} scheduled run created.`, 'info');
          } catch (error) {
            state.updateAgentRunRecord(runRecordId, {
              status: 'failed',
              actualResult: error instanceof Error ? error.message : 'Scheduled agent run failed.',
              completedAt: new Date().toISOString()
            });
            state.notify(`${agent.name} scheduled run failed.`, 'error');
          }
        }
      } finally {
        agentRunInFlightRef.current = false;
      }
    };

    runDueAgents();
    const agentInterval = window.setInterval(runDueAgents, 5 * 1000);

    const syncDueInboxConfigs = async () => {
      const currentConfigs = useStore.getState().inboxConfigs.filter(config => config.type === 'imap' || config.type === 'pop3');
      if (currentConfigs.length === 0) return;
      const now = Date.now();
      let didSync = false;

      await Promise.all(currentConfigs.map(async (config) => {
        const intervalMinutes = Math.max(5, Number(config.syncIntervalMinutes || 60));
        const state = emailSyncStateRef.current[config.id] || { lastAttempt: 0, inFlight: false };
        const isDue = !state.lastAttempt || now - state.lastAttempt >= intervalMinutes * 60 * 1000;
        if (!isDue || state.inFlight) return;

        emailSyncStateRef.current[config.id] = { ...state, lastAttempt: now, inFlight: true };
        try {
          const res = await fetch('/api/sync-emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(config)
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            didSync = didSync || (data.count || 0) > 0;
          } else {
            console.warn(`Background email sync failed for ${config.name || config.username}: ${res.status}`);
          }
        } catch (error) {
          console.warn(`Background email sync failed for ${config.name || config.username}`, error);
        } finally {
          emailSyncStateRef.current[config.id] = {
            ...(emailSyncStateRef.current[config.id] || state),
            inFlight: false
          };
        }
      }));

      if (didSync) {
        fetchEmails();
      }
    };

    syncDueInboxConfigs();
    const interval = window.setInterval(syncDueInboxConfigs, 60 * 1000);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(agentInterval);
    };
  }, [token, inboxConfigs, fetchEmails]);

  useEffect(() => {
    const localizeNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const next = translateLiteral(node.textContent, language);
        if (next !== node.textContent) node.textContent = next;
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      for (const attr of ['placeholder', 'title', 'aria-label']) {
        const value = element.getAttribute(attr);
        if (!value) continue;
        const next = translateLiteral(value, language);
        if (next !== value) element.setAttribute(attr, next);
      }
      element.childNodes.forEach(localizeNode);
    };

    localizeNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(localizeNode);
        if (mutation.type === 'characterData') localizeNode(mutation.target);
        if (mutation.type === 'attributes') localizeNode(mutation.target);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    });
    return () => observer.disconnect();
  }, [language]);

  if (isInitializing) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center text-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!token) {
    return <AuthPage />;
  }

  return (
    <>
      <PanelGroup id="app-layout" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} orientation="horizontal" className="absolute inset-0 flex bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
        <Panel id="sidebar" defaultSize={260} minSize={200} maxSize={400}>
          <Sidebar />
        </Panel>
        <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors" />
        <Panel id="main-content" className="flex-1 flex flex-col relative overflow-hidden">
          <TopBar />
          
          {view === 'kanban' ? <Kanban /> : 
           view === 'list' ? <PipelineList /> :
           view === 'products' ? <ProductsList /> :
           view === 'quotes' ? <QuotesList /> :
           view === 'agent-hub' ? <AgentHub /> :
           view === 'clients' ? <ClientsList /> :
           view === 'public-pool' ? <PublicPool /> :
           view === 'edit-requests' ? <EditRequests /> :
           view === 'inbox' ? <Inbox /> : 
           view === 'settings' ? <Settings /> : 
           view === 'knowledge-base' ? <div className="flex-1 bg-slate-900 border-t border-slate-800 p-6 overflow-y-auto"><div className="w-full text-white"><KnowledgeBaseManager /></div></div> :
           view === 'media-library' ? <MediaLibrary /> :
           view === 'user-management' ? <div className="flex-1 bg-slate-900 overflow-y-auto p-6"><div className="w-full text-white"><UserManagement /></div></div> :
           (view === 'dormant' || view === 'leads' || view === 'followups') ? <ActionableClients /> : 
           <Dashboard />}
        </Panel>
        
      </PanelGroup>

      {selectedClientId && <ClientDetails />}

      {globalLoading && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center text-slate-200">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mb-4" />
          <p className="text-sm font-medium animate-pulse text-cyan-400">{t('processing')}</p>
        </div>
      )}
      <NotificationCenter />
    </>
  );
}

