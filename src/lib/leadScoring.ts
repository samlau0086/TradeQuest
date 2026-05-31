import { Client, EmailMessage, Log } from '../store';

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

export function buildLeadScoringSignature(client: Client, logs: Log[], emails: EmailMessage[]) {
  const relevantLogs = logs
    .filter(log => (
      log.clientId === client.id &&
      log.metadata?.source !== 'lead_scoring_agent' &&
      !log.content.startsWith('Lead Scoring Agent analyzed lead:') &&
      !log.content.startsWith('线索评分智能体已分析线索：') &&
      !log.content.startsWith('Enriched profile / updated client details:') &&
      !log.content.startsWith('已补全资料/更新客户详情：')
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
      subject: email.subject,
      body: (email.body || '').slice(0, 800)
    }));

  return stableStringify({
    client: {
      name: client.name,
      company: client.company,
      country: client.country,
      status: client.status,
      tags: client.tags || [],
      contactMethods: client.contactMethods || [],
      preferredLanguage: client.preferredLanguage,
      preferredTimeRange: client.preferredTimeRange,
      agentContext: client.agentContext
    },
    logs: relevantLogs,
    emails: relevantEmails
  });
}

export function hasLeadScoringResult(client: Client) {
  return client.leadScore !== undefined && !!client.leadSummary && !!client.leadNextStep;
}
