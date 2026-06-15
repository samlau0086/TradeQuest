import React, { useState } from 'react';
import { useStore } from '../store';
import { useAuthStore } from '../authStore';
import { ClientFormModal } from './ClientFormModal';

import {
  ClientAgentSettingsModal,
  ClientAiRadarCard,
  ClientContactActionBox,
  ClientContactsWidget,
  ClientConversationNotesWidget,
  ClientDeleteConfirmDialog,
  ClientDetailsHeader,
  ClientEmailComposeOverlay,
  ClientEventPanel,
  ClientFollowUpAgentWidget,
  ClientProfileSidebarWidgets,
  ClientQuotesWidget,
  ClientTeamCommentsPanel,
  ClientWorkroomPanel,
} from './client-details';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';
import { useClientAiAnalysis, useClientComments, useClientDetailsData } from '../hooks/client-details';

const INBOX_OPEN_REQUEST_KEY = 'tradequest:inbox-open-request:v1';

const requestInboxOpen = (payload: any) => {
  localStorage.setItem(INBOX_OPEN_REQUEST_KEY, JSON.stringify({ ...payload, requestedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('tradequest:open-inbox-request'));
};

export function ClientDetails() {
  const { clients, deals, selectedClientId, selectedDealId, selectClient, selectDeal, updateClientStatus, updateDeal, deleteClient, deleteLog, setView, selectEmail, logs, emails, language, currencyRates } = useStore();
  
  const [showEditModal, setShowEditModal] = useState(false);

  const [expandedContactIdx, setExpandedContactIdx] = useState<string | null>(null);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeInitialBody, setComposeInitialBody] = useState('');

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(false);
  const [eventView, setEventView] = useState<'timeline' | 'list' | 'growth'>('timeline');
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [eventListExpanded, setEventListExpanded] = useState(false);
  const [growthLogsExpanded, setGrowthLogsExpanded] = useState(false);

  // Agent State
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);

  const client = clients.find(c => c.id === selectedClientId);
  const selectedDeal = selectedDealId
    ? deals.find(deal => deal.id === selectedDealId && (!selectedClientId || deal.clientId === selectedClientId))
    : undefined;
  const leadRecord = selectedDeal || null;
  const {
    comments: leadComments,
    commentText,
    setCommentText,
    fileInputRef,
    handleAddComment,
    handleAddReply,
    handleRequestCommentDelete,
  } = useClientComments({ client, leadRecord });
  const leadLogs = logs.filter(log => {
    if (!client || log.clientId !== client.id) return false;
    if (!leadRecord) return true;
    return log.metadata?.leadId === leadRecord.id || log.metadata?.dealId === leadRecord.id;
  });
  const displayContacts = client
    ? ((client.contacts && client.contacts.length > 0)
        ? client.contacts
        : [{
            id: client.primaryContactId || 'primary',
            name: client.name,
            title: 'Key Contact',
            avatarUrl: undefined,
            isPrimary: true,
            contactMethods: client.contactMethods || []
          }])
    : [];
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
  const openQuote = (quoteId: string) => {
    localStorage.setItem('tradequest:openQuoteId', quoteId);
    selectDeal(null);
    selectClient(null);
    setView('quotes');
  };
  const openEmailInInbox = (emailId: string | null | undefined) => {
    selectEmail(emailId || null);
    selectDeal(null);
    selectClient(null);
    setView('inbox');
  };
  const openAgentHub = () => setView('agent-hub');
  const openLiveChat = () => setView('live-chat');
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
  const openEmailComposeInInbox = () => {
    requestInboxOpen({
      type: 'composeEmail',
      recipient: composeRecipient,
      subject: leadRecord ? `Follow up: ${leadRecord.name}` : `Follow up from ${client.company || client.name}`,
      initialBody: composeInitialBody
    });
    setShowEmailCompose(false);
    setComposeInitialBody('');
    selectDeal(null);
    selectClient(null);
    setView('inbox');
  };

  const closeDetails = () => {
    selectDeal(null);
    selectClient(null);
  };

  const handleRunAgent = async () => {
    if (!client.agentEnabled) return;
    setAgentLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/run-agent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          llmConfig: getLLMConfig('analysis'),
          systemLanguage: useStore.getState().language === 'zh' ? 'Chinese' : 'English',
        })
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically update local store or refetch clients
        useAuthStore.getState().fetchProfile(); // Not the best way to refetch clients, but no dedicated fetchClients exists in store. Let's just rely on global update if any, or reload. We should ideally update the local client object in the store.
        useStore.getState().editClient(client.id, { 
          agentSummary: data.summary, 
          agentNextStep: data.nextStep 
        });
      }
    } catch(err) {
      console.error(err);
    } finally {
      setAgentLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070b] text-slate-100 overflow-hidden pointer-events-auto">
      <ClientDetailsHeader
        client={client}
        leadRecord={leadRecord}
        onClose={closeDetails}
        onEdit={() => setShowEditModal(true)}
        onDelete={() => setConfirmDeleteTarget(true)}
      />

      <div className="h-[calc(100dvh-93px)] overflow-y-auto px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-[1800px] space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.85fr)] gap-6">
            <div className="space-y-6 min-w-0">
              <ClientWorkroomPanel
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
                channelHighlights={channelHighlights.map(({ action, ...item }) => ({ ...item, onClick: action }))}
                onRefreshAiRecommendation={() => handleAnalyze(true)}
                onOpenCommunication={() => openEmailInInbox(relatedEmails[0]?.id)}
                onOpenAgentHub={() => setView('agent-hub')}
                onOpenKnowledgeBase={() => setView('knowledge-base')}
              />

              <ClientEventPanel
                eventView={eventView}
                onEventViewChange={setEventView}
                sortedLogs={sortedLeadLogs}
                visibleTimelineLogs={visibleTimelineLogs}
                visibleEventListLogs={visibleEventListLogs}
                visibleGrowthLogs={visibleGrowthLogs}
                growthLogs={growthLogs}
                isDormant={!!client.isDormant}
                timelineExpanded={timelineExpanded}
                eventListExpanded={eventListExpanded}
                growthLogsExpanded={growthLogsExpanded}
                onToggleTimelineExpanded={() => setTimelineExpanded(prev => !prev)}
                onToggleEventListExpanded={() => setEventListExpanded(prev => !prev)}
                onToggleGrowthLogsExpanded={() => setGrowthLogsExpanded(prev => !prev)}
                onDeleteGrowthLog={deleteLog}
                onOpenEmail={openEmailInInbox}
              />
            </div>

            <div className="space-y-6 min-w-0">
              <ClientProfileSidebarWidgets
                client={client}
                leadRecord={leadRecord}
                summaryText={summaryText}
                onStatusChange={(status) => {
                  if (leadRecord) updateDeal(leadRecord.id, { status });
                  else updateClientStatus(client.id, status);
                }}
              />

              <ClientQuotesWidget
                quotes={relatedQuotes}
                leadRecord={leadRecord}
                currencyRates={currencyRates}
                onOpenQuote={openQuote}
              />

              <ClientAiRadarCard
                visibleAiData={visibleAiData}
                loading={loading}
                leadScore={leadScore}
                summaryText={summaryText}
                nextStepText={nextStepText}
                hasLeadRecord={!!leadRecord}
                onAnalyze={handleAnalyze}
                onInsertIcebreaker={handleInsertIcebreaker}
              />

              {/* Contacts */}
              <ClientContactsWidget
                client={client}
                contacts={displayContacts}
                expandedContactIdx={expandedContactIdx}
                onExpandedContactChange={setExpandedContactIdx}
                renderContactAction={(method, closeContactAction) => (
                  <ClientContactActionBox
                    method={method}
                    client={client}
                    onClose={closeContactAction}
                    onOpenEmailCompose={(email) => {
                      setComposeRecipient(email);
                      setShowEmailCompose(true);
                      closeContactAction();
                    }}
                  />
                )}
              />

              <ClientFollowUpAgentWidget
                enabled={client.agentEnabled}
                mode={client.agentMode}
                summary={client.agentSummary}
                nextStep={client.agentNextStep}
                loading={agentLoading}
                onOpenSettings={() => setAgentSettingsOpen(true)}
                onRunAgent={handleRunAgent}
              />

              <ClientConversationNotesWidget tags={client.tags || []} />

        {/* Client Knowledge Base */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <KnowledgeBaseManager clientId={client.id} />
        </div>
            </div>
          </div>

        <ClientTeamCommentsPanel
          comments={leadComments}
          commentText={commentText}
          fileInputRef={fileInputRef}
          onCommentTextChange={setCommentText}
          onSubmitComment={handleAddComment}
          onReply={handleAddReply}
          onDelete={handleRequestCommentDelete}
        />

      </div>
        </div>
      {showEditModal && <ClientFormModal clientId={client.id} onClose={() => setShowEditModal(false)} />}
      
      {agentSettingsOpen && <ClientAgentSettingsModal client={client} onClose={() => setAgentSettingsOpen(false)} />}

      {confirmDeleteTarget && (
        <ClientDeleteConfirmDialog
          onCancel={() => setConfirmDeleteTarget(false)}
          onConfirm={() => {
            deleteClient(client.id);
            setConfirmDeleteTarget(false);
          }}
        />
      )}

      {/* Gmail-style sticky Compose block in corner */}
      {showEmailCompose && (
        <ClientEmailComposeOverlay
          language={language}
          recipient={composeRecipient}
          subject={leadRecord ? `Follow up: ${leadRecord.name}` : `Follow up from ${client.company || client.name}`}
          initialBody={composeInitialBody}
          onOpenInInbox={openEmailComposeInInbox}
          onClose={() => {
            setShowEmailCompose(false);
            setComposeInitialBody('');
          }}
        />
      )}
    </div>
  );
}
