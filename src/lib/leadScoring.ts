import { AgentWorkflow, Client, Comment, Deal, EmailMessage, Log } from '../store';

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

interface LeadScoringSignatureOptions {
  lead?: Deal | null;
  workflows?: AgentWorkflow[];
  now?: Date | string | number;
}

function compactComments(comments: Comment[] = []) {
  return comments
    .filter(comment => comment.content?.trim())
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)
    .map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      pendingDelete: !!comment.pendingDelete
    }));
}

function getMs(value?: string | null) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function buildFollowUpSignal(client: Client, emails: EmailMessage[], workflows: AgentWorkflow[] = [], nowInput?: Date | string | number) {
  const workflow = workflows.find(item => item.id === client.agentWorkflowId);
  if (!workflow) {
    return {
      workflowId: client.agentWorkflowId || null,
      workflowMissing: !!client.agentWorkflowId
    };
  }

  const latestEmailMs = emails
    .filter(email => email.clientId === client.id)
    .reduce((latest, email) => Math.max(latest, getMs(email.date), getMs(email.scheduledAt)), 0);
  const anchorMs = Math.max(getMs(client.lastContact), latestEmailMs);
  const nowMs = nowInput ? new Date(nowInput).getTime() : Date.now();

  const steps = workflow.steps
    .slice()
    .sort((a, b) => a.delayDays - b.delayDays || a.id.localeCompare(b.id))
    .map(step => {
      const dueDate = new Date(anchorMs || 0);
      dueDate.setDate(dueDate.getDate() + Number(step.delayDays || 0));
      if (step.sendTime && /^\d{1,2}:\d{2}$/.test(step.sendTime)) {
        const [hours, minutes] = step.sendTime.split(':').map(Number);
        dueDate.setHours(hours, minutes, 0, 0);
      }
      return {
        id: step.id,
        type: step.type,
        delayDays: step.delayDays,
        sendTime: step.sendTime || null,
        templatePrompt: step.templatePrompt,
        dueAt: dueDate.toISOString(),
        dueState: dueDate.getTime() <= nowMs ? 'due' : 'pending'
      };
    });

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    stopOnMeaningfulReply: !!workflow.stopOnMeaningfulReply,
    anchorAt: anchorMs ? new Date(anchorMs).toISOString() : null,
    steps
  };
}

export function buildLeadScoringSignature(
  client: Client,
  logs: Log[],
  emails: EmailMessage[],
  options: LeadScoringSignatureOptions = {}
) {
  const relevantLogs = logs
    .filter(log => (
      log.clientId === client.id &&
      log.metadata?.source !== 'lead_scoring_agent' &&
      !log.content.startsWith('Lead Scoring Agent analyzed lead:') &&
      !log.content.startsWith('线索评分智能体已分析线索') &&
      !log.content.startsWith('Enriched profile / updated client details:') &&
      !log.content.startsWith('已补全资料')
    ))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)
    .map(log => ({ date: log.date, type: log.type || 'general', content: log.content }));

  const relevantEmails = emails
    .filter(email => email.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(email => ({
      date: email.date,
      type: email.type,
      scheduledAt: email.scheduledAt || null,
      subject: email.subject,
      body: (email.body || '').slice(0, 800)
    }));

  const lead = options.lead ? {
    id: options.lead.id,
    name: options.lead.name,
    value: options.lead.value,
    status: options.lead.status,
    contactInfo: options.lead.contactInfo || null,
    comments: compactComments(options.lead.comments)
  } : null;

  return stableStringify({
    client: {
      name: client.name,
      company: client.company,
      address: client.address,
      state: client.state,
      city: client.city,
      country: client.country,
      status: client.status,
      tags: client.tags || [],
      contactMethods: client.contactMethods || [],
      contacts: client.contacts || [],
      primaryContactId: client.primaryContactId || null,
      comments: compactComments(client.comments),
      lastContact: client.lastContact,
      agentEnabled: !!client.agentEnabled,
      agentMode: client.agentMode || null,
      agentWorkflowId: client.agentWorkflowId || null,
      preferredLanguage: client.preferredLanguage,
      preferredTimeRange: client.preferredTimeRange,
      agentContext: client.agentContext
    },
    lead,
    followUp: buildFollowUpSignal(client, emails, options.workflows, options.now),
    logs: relevantLogs,
    emails: relevantEmails
  });
}

export function hasLeadScoringResult(client: Pick<Client, 'leadScore' | 'leadSummary' | 'leadNextStep'>) {
  return client.leadScore !== undefined && !!client.leadSummary && !!client.leadNextStep;
}
