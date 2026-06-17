import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { useAuthStore } from '../authStore';
import {
  AgentQueueFilter,
  AgentHubTab,
  AgentTaskQueueFilter,
  emptyAgent
} from './agent-hub/shared';
import { AgentHubHeader } from './agent-hub/AgentHubHeader';
import { AgentConsolePanel } from './agent-hub/AgentConsolePanel';
import { AgentFleetPanel } from './agent-hub/AgentFleetPanel';
import { AgentTaskQueuePanel } from './agent-hub/AgentTaskQueuePanel';
import { ApprovalCenterPanel } from './agent-hub/ApprovalCenterPanel';
import { ExecutionLogsPanel } from './agent-hub/ExecutionLogsPanel';
import { SystemHealthPanel } from './agent-hub/SystemHealthPanel';
import { useAgentChat, useAgentConfigActions, useAgentHubData, useAgentOperations } from './agent-hub/hooks';

const AGENT_HUB_TAB_REQUEST_KEY = 'tradequest:agent-hub-open-tab:v1';

export function AgentHub() {
  const {
    language,
    agentHubAgents,
    agentRunRecords,
    agentOpportunityRoutingPolicy,
    updateAgentOpportunityRoutingPolicy,
    updateAgentOpportunity,
    clients,
    deleteAgentRunRecord,
    agentExecutionPolicy,
    updateAgentExecutionPolicy,
    fetchUserSettings
  } = useStore();
  const { token } = useAuthStore();
  const t = useTranslation(language);
  const [tab, setTab] = useState<AgentHubTab>('opportunities');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentHubAgents[0]?.id || null);
  const [draftAgent, setDraftAgent] = useState<ReturnType<typeof emptyAgent> | null>(null);
  const [logDisplayLimit, setLogDisplayLimit] = useState(30);
  const [agentQueueFilter, setAgentQueueFilter] = useState<AgentQueueFilter>('system');
  const [taskStatusFilter, setTaskStatusFilter] = useState<AgentTaskQueueFilter>('active');

  useEffect(() => {
    const applyRequestedTab = () => {
      const raw = localStorage.getItem(AGENT_HUB_TAB_REQUEST_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { tab?: AgentHubTab };
        if (parsed?.tab) setTab(parsed.tab);
      } catch {
        // ignore malformed tab request
      }
      localStorage.removeItem(AGENT_HUB_TAB_REQUEST_KEY);
    };

    applyRequestedTab();
    window.addEventListener('tradequest:open-agent-hub-tab', applyRequestedTab);
    return () => window.removeEventListener('tradequest:open-agent-hub-tab', applyRequestedTab);
  }, []);

  useEffect(() => {
    if (tab === 'fleet') return;
    const interval = window.setInterval(() => {
      void fetchUserSettings();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [fetchUserSettings, tab]);

  const {
    activeAgents,
    activeQueueMeta,
    customAgents,
    dispatchableTasks,
    eventTriggeredAgents,
    globalAgent,
    pendingItems,
    reviewRequiredCount,
    runLogs,
    scheduledAgents,
    selectedAgent,
    systemAgents,
    visibleQueueAgents,
    visibleTasks
  } = useAgentHubData({
    language,
    agentQueueFilter,
    selectedAgentId,
    draftAgent
  });
  useEffect(() => {
    if (draftAgent || tab !== 'fleet') return;
    const selectedVisible = visibleQueueAgents.some(agent => agent.id === selectedAgentId);
    if (!selectedVisible) {
      setSelectedAgentId(visibleQueueAgents[0]?.id || null);
    }
  }, [draftAgent, selectedAgentId, tab, visibleQueueAgents]);
  const {
    deleteSelectedAgent,
    resetSystemAgent,
    saveAgent
  } = useAgentConfigActions({
    language,
    token,
    t,
    setDraftAgent,
    setSelectedAgentId
  });
  const {
    schedulerRunning,
    runningAgentId,
    dispatchingOpportunityId,
    schedulerSummary,
    schedulerAgentDetails,
    expandedTraceRunIds,
    approveItem,
    clearAgentRunRecords,
    clearTraceLogs,
    deleteRunLog,
    deleteTaskAndLinkedOpportunity,
    dispatchTask,
    rejectItem,
    runAgentNow,
    runAllDispatchableOpportunities,
    runSchedulerNow,
    toggleTraceRunExpanded,
    updateTaskAndLinkedOpportunity
  } = useAgentOperations({
    language,
    token,
    t,
    setTab,
    pendingItems,
    dispatchableTasks,
    runLogs
  });

  const {
    activeChatAgent,
    chatAgents,
    chatAgentId,
    chatInput,
    chatRunningAgentId,
    chatSending,
    visibleChatMessages,
    buildAgentChatUsage,
    clearActiveAgentChat,
    deleteChatMessage,
    handleChatApproval,
    sendAgentChat,
    setChatAgentId,
    setChatInput
  } = useAgentChat({
    language,
    agentHubAgents,
    globalAgent,
    pendingItems,
    runAgentNow,
    approveItem,
    rejectItem
  });
  const activeTaskCount = visibleTasks.filter(task => !['completed', 'ignored'].includes(task.status)).length;

  return (
    <div className="flex-1 bg-black text-slate-100 overflow-y-auto">
      <div className="p-8 space-y-8">
        <AgentHubHeader
          language={language}
          tab={tab}
          t={t}
          taskCount={activeTaskCount}
          pendingCount={pendingItems.length}
          runCount={runLogs.length}
          activeAgentCount={activeAgents}
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
          <AgentFleetPanel
            language={language}
            t={t}
            activeAgents={activeAgents}
            scheduledAgents={scheduledAgents}
            eventTriggeredAgents={eventTriggeredAgents}
            reviewRequiredCount={reviewRequiredCount}
            systemAgents={systemAgents}
            customAgents={customAgents}
            visibleQueueAgents={visibleQueueAgents}
            agentRunRecords={agentRunRecords}
            activeQueueMeta={activeQueueMeta}
            agentQueueFilter={agentQueueFilter}
            selectedAgentId={selectedAgentId}
            draftAgent={draftAgent}
            selectedAgent={selectedAgent}
            runningAgentId={runningAgentId}
            onQueueFilterChange={(filter) => {
              setAgentQueueFilter(filter);
              setDraftAgent(null);
            }}
            onSelectAgent={(agentId) => {
              setSelectedAgentId(agentId);
              setDraftAgent(null);
            }}
            onRunAgent={runAgentNow}
            onSaveAgent={saveAgent}
            onResetAgent={resetSystemAgent}
            onDeleteAgent={deleteSelectedAgent}
          />
        )}

        {tab === 'opportunities' && (
          <AgentTaskQueuePanel
            language={language}
            visibleTasks={visibleTasks}
            dispatchableTasks={dispatchableTasks}
            allAgents={agentHubAgents}
            taskStatusFilter={taskStatusFilter}
            pendingCount={pendingItems.length}
            schedulerRunning={schedulerRunning}
            dispatchingOpportunityId={dispatchingOpportunityId}
            agentOpportunityRoutingPolicy={agentOpportunityRoutingPolicy}
            onTaskStatusFilterChange={setTaskStatusFilter}
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
            onToggleTraceRunExpanded={toggleTraceRunExpanded}
            onRunScheduler={runSchedulerNow}
            onClearAgentRunRecords={clearAgentRunRecords}
            onDeleteAgentRunRecord={deleteAgentRunRecord}
          />
        )}

        {tab === 'health' && (
          <SystemHealthPanel language={language} />
        )}

      </div>

    </div>
  );
}
