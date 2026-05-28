import React, { useEffect, useRef } from 'react';
import { useStore } from './store';
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

export default function App() {
  const { view, setView, selectedClientId, checkScheduledEmails, fetchInitialData, language, globalLoading, inboxConfigs, fetchEmails } = useStore();
  const t = useTranslation(language);
  const { token, isInitializing } = useAuthStore();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: 'app-layout' });
  const emailSyncStateRef = useRef<Record<string, { lastAttempt: number; inFlight: boolean }>>({});

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

    const runDueAgents = () => {
      const state = useStore.getState();
      const now = Date.now();
      state.agentHubAgents
        .filter(agent => agent.status === 'active' && agent.scheduleEnabled)
        .forEach(agent => {
          const intervalMs = Math.max(15, Number(agent.scheduleIntervalMinutes || 1440)) * 60 * 1000;
          const lastRun = agent.lastRunAt ? new Date(agent.lastRunAt).getTime() : 0;
          if (lastRun && now - lastRun < intervalMs) return;
          if (agent.id === 'follow_up_agent') {
            const scoringAgent = state.agentHubAgents.find(item => item.id === 'lead_scoring_agent');
            const scoringIntervalMs = Math.max(15, Number(scoringAgent?.scheduleIntervalMinutes || 240)) * 60 * 1000;
            const scoringLastRun = scoringAgent?.lastRunAt ? new Date(scoringAgent.lastRunAt).getTime() : 0;
            const scoringIsDue = scoringAgent?.status === 'active' && scoringAgent.scheduleEnabled && (!scoringLastRun || now - scoringLastRun >= scoringIntervalMs);
            if (scoringIsDue) return;
          }

          const reviewStatus = agent.guardrail === 'auto' ? 'approved' : 'pending_review';
          const objective = agent.id === 'follow_up_agent'
            ? `Scheduled run for ${agent.name}: ${agent.instructions}. Use Lead Scoring Agent outputs when available and do not repeat lead scoring or lead summaries.`
            : `Scheduled run for ${agent.name}: ${agent.instructions}`;
          let relatedRunId = '';
          let relatedRunType: 'harness' | 'global' = 'harness';
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
          state.addAgentRunRecord({
            agentId: agent.id,
            agentName: agent.name,
            trigger: 'scheduled',
            status: reviewStatus,
            plan: objective,
            expectedResult: agent.id === 'global_agent'
              ? 'Create or update a Global Agent plan for conversion coordination.'
              : 'Create an Agent Harness run with the configured agent tools and guardrails.',
            actualResult: reviewStatus === 'approved'
              ? 'Scheduled run was auto-approved according to guardrail policy.'
              : 'Scheduled run created and waiting for human approval.',
            relatedRunId,
            relatedRunType
          });
          state.updateAgentHubAgent(agent.id, {
            lastRunAt: new Date(now).toISOString(),
            tasksCompleted: agent.tasksCompleted + (agent.guardrail === 'auto' ? 1 : 0)
          });
          state.notify(`${agent.name} scheduled run created.`, 'info');
        });
    };

    runDueAgents();
    const agentInterval = window.setInterval(runDueAgents, 60 * 1000);

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
        
        {selectedClientId && (
          <>
            <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors" />
            <Panel id="client-details" defaultSize={384} minSize={300} maxSize={600}>
              <ClientDetails />
            </Panel>
          </>
        )}
      </PanelGroup>

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

