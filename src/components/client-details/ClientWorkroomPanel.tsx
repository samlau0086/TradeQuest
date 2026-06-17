import React from 'react';
import {
  ClientWorkroomHistory,
  ClientWorkroomIntelligence,
  ClientWorkroomOverview,
  ClientWorkroomOperationsStrip,
  ClientWorkroomTaskPanel,
  WorkroomChannelHighlight,
  WorkroomKnowledgeItem,
  WorkroomTodoItem,
} from './ClientWorkroomWidgets';

interface ClientWorkroomPanelProps {
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
  todoItems: WorkroomTodoItem[];
  ragItems: WorkroomKnowledgeItem[];
  channelHighlights: WorkroomChannelHighlight[];
  onRefreshAiRecommendation: () => void;
  onOpenCommunication: () => void;
  onOpenAgentHub: () => void;
  onOpenApprovals: () => void;
  onOpenComments: () => void;
  onOpenKnowledgeBase: () => void;
}

export function ClientWorkroomPanel({
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
  onRefreshAiRecommendation,
  onOpenCommunication,
  onOpenAgentHub,
  onOpenApprovals,
  onOpenComments,
  onOpenKnowledgeBase,
}: ClientWorkroomPanelProps) {
  return (
    <div className="space-y-5">
      <ClientWorkroomOverview
        quoteCount={quoteCount}
        contactMethodCount={contactMethodCount}
        ragCount={ragCount}
        todoCount={todoCount}
        loading={loading}
        primaryNextStep={primaryNextStep}
        primarySummary={primarySummary}
        onRefreshAiRecommendation={onRefreshAiRecommendation}
        onOpenCommunication={onOpenCommunication}
        onOpenAgentHub={onOpenAgentHub}
        onOpenKnowledgeBase={onOpenKnowledgeBase}
      />

      <ClientWorkroomOperationsStrip
        pendingFollowUpCount={pendingFollowUpCount}
        nextFollowUpAt={nextFollowUpAt}
        activeTaskCount={agentTaskCount}
        runningTaskCount={runningTaskCount}
        approvalCount={approvalCount}
        pendingCommentDeleteCount={pendingCommentDeleteCount}
        commentCount={commentCount}
        onOpenCommunication={onOpenCommunication}
        onOpenAgentHub={onOpenAgentHub}
        onOpenApprovals={onOpenApprovals}
        onOpenComments={onOpenComments}
      />

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <ClientWorkroomIntelligence
          clientSummaryText={clientSummaryText}
          clientNextStepText={clientNextStepText}
          leadSummaryText={leadSummaryText}
          leadNextStepText={leadNextStepText}
          hasLeadRecord={hasLeadRecord}
          ragItems={ragItems}
          onOpenKnowledgeBase={onOpenKnowledgeBase}
        />
        <ClientWorkroomTaskPanel
          todoCount={todoCount}
          todoItems={todoItems}
        />
      </div>

      <ClientWorkroomHistory channelHighlights={channelHighlights} />
    </div>
  );
}
