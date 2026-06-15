import React, { useState } from 'react';
import { useStore } from '../store';
import { useAuthStore } from '../authStore';
import { cn } from '../lib/utils';
import { ClientFormModal } from './ClientFormModal';

import { User } from 'lucide-react';

import { ClientAgentSettingsModal } from './ClientAgentSettingsModal';
import { ClientAiRadarCard } from './ClientAiRadarCard';
import { ClientContactActionBox } from './ClientContactActionBox';
import { ClientContactsWidget } from './ClientContactsWidget';
import { ClientDeleteConfirmDialog } from './ClientDeleteConfirmDialog';
import { ClientDetailsHeader } from './ClientDetailsHeader';
import { ClientConversationNotesWidget } from './ClientConversationNotesWidget';
import { ClientEmailComposeOverlay } from './ClientEmailComposeOverlay';
import { ClientEventPanel } from './ClientEventPanel';
import { ClientFollowUpAgentWidget } from './ClientFollowUpAgentWidget';
import { ClientProfileSidebarWidgets } from './ClientProfileSidebarWidgets';
import { ClientQuotesWidget } from './ClientQuotesWidget';
import { ClientTeamCommentsPanel } from './ClientTeamCommentsPanel';
import { ClientWorkroomPanel } from './ClientWorkroomPanel';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';
import { useClientAiAnalysis } from '../hooks/useClientAiAnalysis';
import { useClientComments } from '../hooks/useClientComments';

const INBOX_OPEN_REQUEST_KEY = 'tradequest:inbox-open-request:v1';

const requestInboxOpen = (payload: any) => {
  localStorage.setItem(INBOX_OPEN_REQUEST_KEY, JSON.stringify({ ...payload, requestedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('tradequest:open-inbox-request'));
};

const shortText = (value: string | undefined | null, max = 120) => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

export function ClientDetails() {
  const { clients, deals, quotes, selectedClientId, selectedDealId, selectClient, selectDeal, updateClientStatus, updateDeal, deleteClient, deleteLog, setView, selectEmail, logs, emails, language, currencyRates, knowledgeBase, agentTasks, liveChatSessions } = useStore();
  
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
  const sortedLeadLogs = [...leadLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const growthLogs = leadLogs.filter(l => {
    if (l.content.startsWith('Saved Draft:')) return false;
    if (l.relatedEmailId) {
      const relatedEmail = emails.find(e => e.id === l.relatedEmailId);
      if (relatedEmail && relatedEmail.type === 'draft') return false;
    }
    return true;
  });
  const visibleTimelineLogs = timelineExpanded ? sortedLeadLogs : sortedLeadLogs.slice(0, 10);
  const visibleEventListLogs = eventListExpanded ? sortedLeadLogs : sortedLeadLogs.slice(0, 20);
  const visibleGrowthLogs = growthLogsExpanded ? growthLogs : growthLogs.slice(0, 10);
  const relatedQuotes = client
    ? quotes.filter(quote => leadRecord ? quote.leadId === leadRecord.id : quote.clientId === client.id)
    : [];
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

  if (!client) return null;
  const clientSummaryText = client.agentSummary || client.leadSummary || client.agentContext || '';
  const clientNextStepText = client.agentNextStep || client.leadNextStep || '';
  const leadSummaryText = leadRecord?.leadSummary || '';
  const leadNextStepText = leadRecord?.leadNextStep || '';
  const relatedEmails = emails
    .filter(email => email.clientId === client.id && !email.pendingDelete)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const pendingFollowUps = relatedEmails
    .filter(email => email.todoAt)
    .sort((a, b) => new Date(a.todoAt || a.date).getTime() - new Date(b.todoAt || b.date).getTime());
  const relatedAgentTasks = agentTasks
    .filter(task => {
      if (!['open', 'queued', 'approval_required', 'running'].includes(task.status)) return false;
      if (task.entityType === 'client' && task.entityId === client.id) return true;
      if (leadRecord && task.entityType === 'lead' && task.entityId === leadRecord.id) return true;
      return task.affectedRecords?.some(record => (
        (record.type === 'client' && record.id === client.id) ||
        (leadRecord && record.type === 'lead' && record.id === leadRecord.id)
      ));
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  const clientKnowledge = knowledgeBase
    .filter(item => item.clientId === client.id && item.importState !== 'deleted')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  const clientLiveChatSessions = liveChatSessions
    .filter(session => session.clientId === client.id)
    .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime());
  const channelHighlights = [
    ...relatedEmails.slice(0, 6).map(email => ({
      id: `email_${email.id}`,
      channel: email.type === 'sent' || email.type === 'outbound' ? 'Email sent' : email.type === 'draft' ? 'Email draft' : 'Email inbox',
      title: email.subject || '(No subject)',
      body: shortText(email.body, 110),
      date: email.date,
      action: () => openEmailInInbox(email.id)
    })),
    ...sortedLeadLogs.slice(0, 6).map(log => ({
      id: `log_${log.id}`,
      channel: log.type === 'whatsapp' ? 'WhatsApp' : log.type === 'email' ? 'Email activity' : 'CRM event',
      title: log.content,
      body: '',
      date: log.date,
      action: log.relatedEmailId ? () => openEmailInInbox(log.relatedEmailId) : undefined
    })),
    ...clientLiveChatSessions.slice(0, 4).map(session => ({
      id: `live_${session.id}`,
      channel: 'Live Chat',
      title: session.lastMessage?.body || session.visitorName || session.visitorEmail || 'Live chat session',
      body: session.pageUrl || '',
      date: session.lastMessageAt || session.updatedAt || session.createdAt,
      action: () => setView('live-chat')
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  const primaryNextStep = leadNextStepText || clientNextStepText || '检查最近互动、确认采购背景，然后选择下一步跟进动作。';
  const primarySummary = leadSummaryText || clientSummaryText || '暂未生成AI摘要，可运行AI Radar或等待Signal Scanner分析此客户/Lead。';
  const contactMethodCount = displayContacts.reduce((sum, contact) => sum + (contact.contactMethods || []).length, 0);
  const workroomTodoItems = [
    ...pendingFollowUps.slice(0, 3).map(email => ({
      id: `todo_${email.id}`,
      label: email.todoNote || email.subject || '待跟进邮件',
      meta: email.todoAt ? new Date(email.todoAt).toLocaleString() : '未设置时间',
      onClick: () => openEmailInInbox(email.id)
    })),
    ...relatedAgentTasks.slice(0, 3).map(task => ({
      id: `task_${task.id}`,
      label: task.title,
      meta: `${task.status} · ${task.risk}`,
      onClick: () => setView('agent-hub')
    }))
  ].slice(0, 4);
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
