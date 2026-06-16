import type { Log } from '../../store';
import type { ClientEventView } from '../../hooks/client-details';
import { ClientEventPanel } from './ClientEventPanel';
import { ClientWorkroomPanel } from './ClientWorkroomPanel';

interface ClientDetailsMainColumnProps {
  quoteCount: number;
  contactMethodCount: number;
  ragCount: number;
  todoCount: number;
  loading: boolean;
  primaryNextStep: string;
  primarySummary: string;
  clientSummaryText: string;
  clientNextStepText: string;
  leadSummaryText: string;
  leadNextStepText: string;
  hasLeadRecord: boolean;
  todoItems: any[];
  ragItems: any[];
  channelHighlights: any[];
  eventView: ClientEventView;
  sortedLogs: Log[];
  visibleTimelineLogs: Log[];
  visibleEventListLogs: Log[];
  visibleGrowthLogs: Log[];
  growthLogs: Log[];
  isDormant: boolean;
  timelineExpanded: boolean;
  eventListExpanded: boolean;
  growthLogsExpanded: boolean;
  onRefreshAiRecommendation: () => void;
  onOpenCommunication: () => void;
  onOpenAgentHub: () => void;
  onOpenKnowledgeBase: () => void;
  onEventViewChange: (view: ClientEventView) => void;
  onToggleTimelineExpanded: () => void;
  onToggleEventListExpanded: () => void;
  onToggleGrowthLogsExpanded: () => void;
  onDeleteGrowthLog: (logId: string) => void;
  onOpenEmail: (emailId: string) => void;
}

export function ClientDetailsMainColumn({
  quoteCount,
  contactMethodCount,
  ragCount,
  todoCount,
  loading,
  primaryNextStep,
  primarySummary,
  clientSummaryText,
  clientNextStepText,
  leadSummaryText,
  leadNextStepText,
  hasLeadRecord,
  todoItems,
  ragItems,
  channelHighlights,
  eventView,
  sortedLogs,
  visibleTimelineLogs,
  visibleEventListLogs,
  visibleGrowthLogs,
  growthLogs,
  isDormant,
  timelineExpanded,
  eventListExpanded,
  growthLogsExpanded,
  onRefreshAiRecommendation,
  onOpenCommunication,
  onOpenAgentHub,
  onOpenKnowledgeBase,
  onEventViewChange,
  onToggleTimelineExpanded,
  onToggleEventListExpanded,
  onToggleGrowthLogsExpanded,
  onDeleteGrowthLog,
  onOpenEmail,
}: ClientDetailsMainColumnProps) {
  return (
    <>
      <ClientWorkroomPanel
        quoteCount={quoteCount}
        contactMethodCount={contactMethodCount}
        ragCount={ragCount}
        todoCount={todoCount}
        loading={loading}
        primaryNextStep={primaryNextStep}
        primarySummary={primarySummary}
        clientSummaryText={clientSummaryText}
        clientNextStepText={clientNextStepText}
        leadSummaryText={leadSummaryText}
        leadNextStepText={leadNextStepText}
        hasLeadRecord={hasLeadRecord}
        todoItems={todoItems}
        ragItems={ragItems}
        channelHighlights={channelHighlights.map(({ action, ...item }) => ({ ...item, onClick: action }))}
        onRefreshAiRecommendation={onRefreshAiRecommendation}
        onOpenCommunication={onOpenCommunication}
        onOpenAgentHub={onOpenAgentHub}
        onOpenKnowledgeBase={onOpenKnowledgeBase}
      />

      <ClientEventPanel
        eventView={eventView}
        onEventViewChange={onEventViewChange}
        sortedLogs={sortedLogs}
        visibleTimelineLogs={visibleTimelineLogs}
        visibleEventListLogs={visibleEventListLogs}
        visibleGrowthLogs={visibleGrowthLogs}
        growthLogs={growthLogs}
        isDormant={isDormant}
        timelineExpanded={timelineExpanded}
        eventListExpanded={eventListExpanded}
        growthLogsExpanded={growthLogsExpanded}
        onToggleTimelineExpanded={onToggleTimelineExpanded}
        onToggleEventListExpanded={onToggleEventListExpanded}
        onToggleGrowthLogsExpanded={onToggleGrowthLogsExpanded}
        onDeleteGrowthLog={onDeleteGrowthLog}
        onOpenEmail={onOpenEmail}
      />
    </>
  );
}
