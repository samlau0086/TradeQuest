import { useState } from 'react';

export type ClientEventView = 'timeline' | 'list' | 'growth';

export function useClientDetailsUiState() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedContactIdx, setExpandedContactIdx] = useState<string | null>(null);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeInitialBody, setComposeInitialBody] = useState('');
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(false);
  const [eventView, setEventView] = useState<ClientEventView>('timeline');
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [eventListExpanded, setEventListExpanded] = useState(false);
  const [growthLogsExpanded, setGrowthLogsExpanded] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);

  return {
    showEditModal,
    setShowEditModal,
    expandedContactIdx,
    setExpandedContactIdx,
    showEmailCompose,
    setShowEmailCompose,
    composeRecipient,
    setComposeRecipient,
    composeInitialBody,
    setComposeInitialBody,
    confirmDeleteTarget,
    setConfirmDeleteTarget,
    eventView,
    setEventView,
    timelineExpanded,
    setTimelineExpanded,
    eventListExpanded,
    setEventListExpanded,
    growthLogsExpanded,
    setGrowthLogsExpanded,
    agentLoading,
    setAgentLoading,
    agentSettingsOpen,
    setAgentSettingsOpen,
  };
}
