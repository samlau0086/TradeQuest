import { Client, Deal, EmailMessage, Log, useStore } from '../../store';

interface UseClientDetailsDataArgs {
  client?: Client | null;
  leadRecord?: Deal | null;
  leadLogs: Log[];
  displayContacts: NonNullable<Client['contacts']>;
  timelineExpanded: boolean;
  eventListExpanded: boolean;
  growthLogsExpanded: boolean;
  onOpenEmail: (emailId: string | null | undefined) => void;
  onOpenLiveChat: () => void;
  onOpenAgentHub: () => void;
}

const shortText = (value: string | undefined | null, max = 120) => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

export function useClientDetailsData({
  client,
  leadRecord,
  leadLogs,
  displayContacts,
  timelineExpanded,
  eventListExpanded,
  growthLogsExpanded,
  onOpenEmail,
  onOpenLiveChat,
  onOpenAgentHub,
}: UseClientDetailsDataArgs) {
  const { quotes, emails, knowledgeBase, agentTasks, liveChatSessions } = useStore();

  const sortedLeadLogs = [...leadLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const growthLogs = leadLogs.filter(log => {
    if (log.content.startsWith('Saved Draft:')) return false;
    if (log.relatedEmailId) {
      const relatedEmail = emails.find(email => email.id === log.relatedEmailId);
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
  const relatedEmails = client
    ? emails
        .filter(email => email.clientId === client.id && !email.pendingDelete)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];
  const pendingFollowUps = relatedEmails
    .filter(email => email.todoAt)
    .sort((a, b) => new Date(a.todoAt || a.date).getTime() - new Date(b.todoAt || b.date).getTime());
  const relatedAgentTasks = client
    ? agentTasks
        .filter(task => {
          if (!['open', 'queued', 'approval_required', 'running'].includes(task.status)) return false;
          if (task.entityType === 'client' && task.entityId === client.id) return true;
          if (leadRecord && task.entityType === 'lead' && task.entityId === leadRecord.id) return true;
          return task.affectedRecords?.some(record => (
            (record.type === 'client' && record.id === client.id) ||
            (leadRecord && record.type === 'lead' && record.id === leadRecord.id)
          ));
        })
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    : [];
  const clientKnowledge = client
    ? knowledgeBase
        .filter(item => item.clientId === client.id && item.importState !== 'deleted')
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    : [];
  const clientLiveChatSessions = client
    ? liveChatSessions
        .filter(session => session.clientId === client.id)
        .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime())
    : [];

  const channelHighlights = [
    ...relatedEmails.slice(0, 6).map((email: EmailMessage) => ({
      id: `email_${email.id}`,
      channel: email.type === 'sent' || email.type === 'outbound' ? 'Email sent' : email.type === 'draft' ? 'Email draft' : 'Email inbox',
      title: email.subject || '(No subject)',
      body: shortText(email.body, 110),
      date: email.date,
      action: () => onOpenEmail(email.id)
    })),
    ...sortedLeadLogs.slice(0, 6).map(log => ({
      id: `log_${log.id}`,
      channel: log.type === 'whatsapp' ? 'WhatsApp' : log.type === 'email' ? 'Email activity' : 'CRM event',
      title: log.content,
      body: '',
      date: log.date,
      action: log.relatedEmailId ? () => onOpenEmail(log.relatedEmailId) : undefined
    })),
    ...clientLiveChatSessions.slice(0, 4).map(session => ({
      id: `live_${session.id}`,
      channel: 'Live Chat',
      title: session.lastMessage?.body || session.visitorName || session.visitorEmail || 'Live chat session',
      body: session.pageUrl || '',
      date: session.lastMessageAt || session.updatedAt || session.createdAt,
      action: onOpenLiveChat
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  const clientSummaryText = client?.agentSummary || client?.leadSummary || client?.agentContext || '';
  const clientNextStepText = client?.agentNextStep || client?.leadNextStep || '';
  const leadSummaryText = leadRecord?.leadSummary || '';
  const leadNextStepText = leadRecord?.leadNextStep || '';
  const primaryNextStep = leadNextStepText || clientNextStepText || '检查最近互动、确认采购背景，然后选择下一步跟进动作。';
  const primarySummary = leadSummaryText || clientSummaryText || '暂未生成AI摘要，可运行AI Radar或等待Signal Scanner分析此客户/Lead。';
  const contactMethodCount = displayContacts.reduce((sum, contact) => sum + (contact.contactMethods || []).length, 0);
  const workroomTodoItems = [
    ...pendingFollowUps.slice(0, 3).map(email => ({
      id: `todo_${email.id}`,
      label: email.todoNote || email.subject || '待跟进邮件',
      meta: email.todoAt ? new Date(email.todoAt).toLocaleString() : '未设置时间',
      onClick: () => onOpenEmail(email.id)
    })),
    ...relatedAgentTasks.slice(0, 3).map(task => ({
      id: `task_${task.id}`,
      label: task.title,
      meta: `${task.status} · ${task.risk}`,
      onClick: onOpenAgentHub
    }))
  ].slice(0, 4);

  return {
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
  };
}
