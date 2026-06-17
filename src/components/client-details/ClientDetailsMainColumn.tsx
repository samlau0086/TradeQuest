import type { Client, ClientContact, Deal, Log } from '../../store';
import type { ClientEventView } from '../../hooks/client-details';
import { ClientIdentityPanel } from './ClientIdentityPanel';
import { ClientEventPanel } from './ClientEventPanel';
import { ClientWorkroomPanel } from './ClientWorkroomPanel';

interface ClientDetailsMainColumnProps {
  client: Client;
  leadRecord?: Deal | null;
  contacts: ClientContact[];
  quoteCount: number;
  contactMethodCount: number;
  ragCount: number;
  todoCount: number;
  pendingFollowUpCount: number;
  agentTaskCount: number;
  nextFollowUpAt?: string | null;
  approvalCount: number;
  commentCount: number;
  pendingCommentDeleteCount: number;
  runningTaskCount: number;
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
  onOpenApprovals: () => void;
  onOpenComments: () => void;
  onOpenKnowledgeBase: () => void;
  onEventViewChange: (view: ClientEventView) => void;
  onToggleTimelineExpanded: () => void;
  onToggleEventListExpanded: () => void;
  onToggleGrowthLogsExpanded: () => void;
  onDeleteGrowthLog: (logId: string) => void;
  onOpenEmail: (emailId: string) => void;
}

export function ClientDetailsMainColumn({
  client,
  leadRecord,
  contacts,
  quoteCount,
  contactMethodCount,
  ragCount,
  todoCount,
  pendingFollowUpCount,
  agentTaskCount,
  nextFollowUpAt,
  approvalCount,
  commentCount,
  pendingCommentDeleteCount,
  runningTaskCount,
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
  onOpenApprovals,
  onOpenComments,
  onOpenKnowledgeBase,
  onEventViewChange,
  onToggleTimelineExpanded,
  onToggleEventListExpanded,
  onToggleGrowthLogsExpanded,
  onDeleteGrowthLog,
  onOpenEmail,
}: ClientDetailsMainColumnProps) {
  return (
    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="min-w-0">
        <ClientIdentityPanel
          client={client}
          leadRecord={leadRecord}
          contacts={contacts}
        />
      </div>

      <div className="min-w-0 space-y-6">
        <ClientWorkroomPanel
          quoteCount={quoteCount}
          contactMethodCount={contactMethodCount}
          ragCount={ragCount}
          todoCount={todoCount}
          pendingFollowUpCount={pendingFollowUpCount}
          agentTaskCount={agentTaskCount}
          nextFollowUpAt={nextFollowUpAt}
          approvalCount={approvalCount}
          commentCount={commentCount}
          pendingCommentDeleteCount={pendingCommentDeleteCount}
          runningTaskCount={runningTaskCount}
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
          onOpenApprovals={onOpenApprovals}
          onOpenComments={onOpenComments}
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
      </div>
    </div>
  );
}
