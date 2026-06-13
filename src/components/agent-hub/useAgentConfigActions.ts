import { AgentHubAgent, AgentHubStatus, useStore } from '../../store';
import { AgentConfigValue } from './AgentConfigPanel';

interface UseAgentConfigActionsOptions {
  language: string;
  token: string | null;
  t: (key: string) => string;
  setDraftAgent: (agent: null) => void;
  setSelectedAgentId: (agentId: string | null) => void;
}

export function useAgentConfigActions({
  language,
  token,
  t,
  setDraftAgent,
  setSelectedAgentId
}: UseAgentConfigActionsOptions) {
  const {
    agentHubAgents,
    addAgentHubAgent,
    updateAgentHubAgent,
    resetAgentHubAgentToDefault,
    deleteAgentHubAgent,
    notify
  } = useStore();

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

  const saveAgent = (agent: AgentConfigValue) => {
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

  return {
    deleteSelectedAgent,
    persistAgentHubState,
    resetSystemAgent,
    saveAgent
  };
}
