export type AgentToolRisk = 'low' | 'medium' | 'high';

export interface AgentToolDefinition {
  id: string;
  label: string;
  description: string;
  category: string;
  risk: AgentToolRisk;
  reviewRequired: boolean;
}

export const AGENT_TOOL_REGISTRY: AgentToolDefinition[] = [
  { id: 'global_agent.plan', label: 'Global planning', description: 'Generate a cross-system acquisition and conversion plan for human review.', category: 'Planning', risk: 'medium', reviewRequired: true },
  { id: 'lead.acquire', label: 'Acquire leads', description: 'Acquire new leads from configured lead data channels and campaign criteria.', category: 'Lead Data', risk: 'medium', reviewRequired: false },
  { id: 'lead.enrich', label: 'Enrich lead data', description: 'Enrich lead or client data through configured enrichment providers.', category: 'Lead Data', risk: 'low', reviewRequired: false },
  { id: 'public_pool.import', label: 'Import to public pool', description: 'Import acquired leads into the public lead pool.', category: 'Lead Data', risk: 'medium', reviewRequired: false },
  { id: 'client.dedupe', label: 'Deduplicate clients', description: 'Detect and avoid duplicate client or lead records.', category: 'Data Quality', risk: 'low', reviewRequired: false },
  { id: 'data.normalize', label: 'Normalize data', description: 'Normalize imported lead fields, contact methods, country, and tags.', category: 'Data Quality', risk: 'low', reviewRequired: false },
  { id: 'lead.analyze', label: 'Analyze lead', description: 'Analyze a lead or client using CRM history, messages, and context.', category: 'Analysis', risk: 'low', reviewRequired: false },
  { id: 'lead.score', label: 'Score lead', description: 'Score lead quality and conversion potential.', category: 'Analysis', risk: 'low', reviewRequired: false },
  { id: 'client.summarize', label: 'Summarize client', description: 'Generate or update internal client summaries.', category: 'Analysis', risk: 'low', reviewRequired: false },
  { id: 'next_step.recommend', label: 'Recommend next step', description: 'Recommend the best next follow-up action.', category: 'Analysis', risk: 'low', reviewRequired: false },
  { id: 'email.send', label: 'Send email', description: 'Draft, schedule, or send email through configured outbox rules.', category: 'Outbound', risk: 'high', reviewRequired: true },
  { id: 'whatsapp.read', label: 'Read WhatsApp', description: 'Read WhatsApp conversation history from the unified inbox cache.', category: 'WhatsApp', risk: 'low', reviewRequired: false },
  { id: 'whatsapp.send', label: 'Send WhatsApp', description: 'Draft, schedule, or send WhatsApp messages through WhatsApp Actor Hub.', category: 'Outbound', risk: 'high', reviewRequired: true },
  { id: 'conversation.tag', label: 'Tag conversation', description: 'Add or update tags on WhatsApp conversations.', category: 'Conversation', risk: 'low', reviewRequired: false },
  { id: 'conversation.comment', label: 'Comment on conversation', description: 'Add internal comments to WhatsApp conversations.', category: 'Conversation', risk: 'low', reviewRequired: false },
  { id: 'client.comment', label: 'Comment on client', description: 'Add internal comments to client records.', category: 'CRM', risk: 'low', reviewRequired: false },
  { id: 'client.stage', label: 'Update client stage', description: 'Update client pipeline stage.', category: 'CRM', risk: 'medium', reviewRequired: false },
  { id: 'client.update', label: 'Update client', description: 'Update client profile fields and contact methods.', category: 'CRM', risk: 'medium', reviewRequired: false },
  { id: 'quote.create', label: 'Create quote', description: 'Create quote drafts for operator review and sending.', category: 'Sales', risk: 'high', reviewRequired: true }
];

export const AGENT_TOOL_IDS = AGENT_TOOL_REGISTRY.map(tool => tool.id);

export function getAgentToolDefinition(id: string) {
  return AGENT_TOOL_REGISTRY.find(tool => tool.id === id);
}
