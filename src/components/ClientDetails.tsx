import React from 'react';
import { useStore } from '../store';

import {
  ClientDetailsLayout,
  ClientDetailsMainColumn,
  ClientDetailsOverlays,
  ClientDetailsSidebarColumn,
  ClientDetailsHeader,
  ClientTeamCommentsPanel,
} from './client-details';
import { useClientAiAnalysis, useClientComments, useClientDetailsActions, useClientDetailsData, useClientDetailsSelection, useClientDetailsUiState } from '../hooks/client-details';

export function ClientDetails() {
  const { clients, deals, selectedClientId, selectedDealId, selectClient, selectDeal, updateClientStatus, updateDeal, deleteClient, deleteLog, setView, selectEmail, logs, emails, language, currencyRates } = useStore();
  
  const {
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
  } = useClientDetailsUiState();

  const { client, leadRecord, leadLogs, displayContacts } = useClientDetailsSelection({
    clients,
    deals,
    logs,
    selectedClientId,
    selectedDealId,
  });
  const {
    comments: leadComments,
    commentText,
    setCommentText,
    fileInputRef,
    handleAddComment,
    handleAddReply,
    handleRequestCommentDelete,
  } = useClientComments({ client, leadRecord });
  const {
    loading,
    leadScore,
    summaryText,
    nextStepText,
    visibleAiData,
    handleAnalyze,
    handleInsertIcebreaker,
    getLLMConfig,
  } = useClientAiAnalysis({
    client,
    leadRecord,
    leadLogs,
    displayContacts,
    onOpenEmailDraft: (email, body) => {
      setComposeRecipient(email);
      setComposeInitialBody(body);
      setShowEmailCompose(true);
    }
  });
  const {
    openQuote,
    openEmailInInbox,
    openAgentHub,
    openLiveChat,
    openKnowledgeBase,
    openEmailComposeInInbox,
    closeDetails,
    runAgent,
  } = useClientDetailsActions({
    client,
    leadRecord,
    composeRecipient,
    composeInitialBody,
    setComposeInitialBody,
    setShowEmailCompose,
    setAgentLoading,
    selectClient,
    selectDeal,
    selectEmail,
    setView,
    getLLMConfig,
  });
  const {
    sortedLeadLogs,
    growthLogs,
    visibleTimelineLogs,
    visibleEventListLogs,
    visibleGrowthLogs,
    relatedQuotes,
    relatedEmails,
    pendingFollowUps,
    relatedAgentTasks,
    clientKnowledge,
    channelHighlights,
    clientSummaryText,
    clientNextStepText,
    leadSummaryText,
    leadNextStepText,
    primaryNextStep,
    primarySummary,
    contactMethodCount,
    workroomTodoItems,
  } = useClientDetailsData({
    client,
    leadRecord,
    leadLogs,
    displayContacts,
    timelineExpanded,
    eventListExpanded,
    growthLogsExpanded,
    onOpenEmail: openEmailInInbox,
    onOpenLiveChat: openLiveChat,
    onOpenAgentHub: openAgentHub,
  });

  if (!client) return null;

  const header = (
    <ClientDetailsHeader
      client={client}
      leadRecord={leadRecord}
      onClose={closeDetails}
      onEdit={() => setShowEditModal(true)}
      onDelete={() => setConfirmDeleteTarget(true)}
    />
  );

  const mainColumn = (
    <ClientDetailsMainColumn
      quoteCount={relatedQuotes.length}
      contactMethodCount={contactMethodCount}
      ragCount={clientKnowledge.length}
      todoCount={pendingFollowUps.length + relatedAgentTasks.length}
      loading={loading}
      primaryNextStep={primaryNextStep}
      primarySummary={primarySummary}
      clientSummaryText={clientSummaryText}
      clientNextStepText={clientNextStepText}
      leadSummaryText={leadSummaryText}
      leadNextStepText={leadNextStepText}
      hasLeadRecord={!!leadRecord}
      todoItems={workroomTodoItems}
      ragItems={clientKnowledge}
      channelHighlights={channelHighlights}
      eventView={eventView}
      sortedLogs={sortedLeadLogs}
      visibleTimelineLogs={visibleTimelineLogs}
      visibleEventListLogs={visibleEventListLogs}
      visibleGrowthLogs={visibleGrowthLogs}
      growthLogs={growthLogs}
      isDormant={!!client.isDormant}
      timelineExpanded={timelineExpanded}
      eventListExpanded={eventListExpanded}
      growthLogsExpanded={growthLogsExpanded}
      onRefreshAiRecommendation={() => handleAnalyze(true)}
      onOpenCommunication={() => openEmailInInbox(relatedEmails[0]?.id)}
      onOpenAgentHub={openAgentHub}
      onOpenKnowledgeBase={openKnowledgeBase}
      onEventViewChange={setEventView}
      onToggleTimelineExpanded={() => setTimelineExpanded(prev => !prev)}
      onToggleEventListExpanded={() => setEventListExpanded(prev => !prev)}
      onToggleGrowthLogsExpanded={() => setGrowthLogsExpanded(prev => !prev)}
      onDeleteGrowthLog={deleteLog}
      onOpenEmail={openEmailInInbox}
    />
  );

  const sidebarColumn = (
    <ClientDetailsSidebarColumn
      client={client}
      leadRecord={leadRecord}
      summaryText={summaryText}
      relatedQuotes={relatedQuotes}
      currencyRates={currencyRates}
      visibleAiData={visibleAiData}
      loading={loading}
      leadScore={leadScore}
      nextStepText={nextStepText}
      contacts={displayContacts}
      expandedContactIdx={expandedContactIdx}
      agentLoading={agentLoading}
      onStatusChange={(status) => {
        if (leadRecord) updateDeal(leadRecord.id, { status });
        else updateClientStatus(client.id, status);
      }}
      onOpenQuote={openQuote}
      onAnalyze={handleAnalyze}
      onInsertIcebreaker={handleInsertIcebreaker}
      onExpandedContactChange={setExpandedContactIdx}
      onOpenEmailCompose={(email) => {
        setComposeRecipient(email);
        setShowEmailCompose(true);
      }}
      onOpenAgentSettings={() => setAgentSettingsOpen(true)}
      onRunAgent={runAgent}
    />
  );

  const comments = (
    <ClientTeamCommentsPanel
      comments={leadComments}
      commentText={commentText}
      fileInputRef={fileInputRef}
      onCommentTextChange={setCommentText}
      onSubmitComment={handleAddComment}
      onReply={handleAddReply}
      onDelete={handleRequestCommentDelete}
    />
  );

  const overlays = (
    <ClientDetailsOverlays
      client={client}
      leadRecord={leadRecord}
      language={language}
      showEditModal={showEditModal}
      agentSettingsOpen={agentSettingsOpen}
      confirmDeleteTarget={confirmDeleteTarget}
      showEmailCompose={showEmailCompose}
      composeRecipient={composeRecipient}
      composeInitialBody={composeInitialBody}
      onCloseEditModal={() => setShowEditModal(false)}
      onCloseAgentSettings={() => setAgentSettingsOpen(false)}
      onCancelDelete={() => setConfirmDeleteTarget(false)}
      onConfirmDelete={() => {
        deleteClient(client.id);
        setConfirmDeleteTarget(false);
      }}
      onOpenEmailComposeInInbox={openEmailComposeInInbox}
      onCloseEmailCompose={() => {
        setShowEmailCompose(false);
        setComposeInitialBody('');
      }}
    />
  );

  return (
    <ClientDetailsLayout
      header={header}
      mainColumn={mainColumn}
      sidebarColumn={sidebarColumn}
      comments={comments}
      overlays={overlays}
    />
  );
}
