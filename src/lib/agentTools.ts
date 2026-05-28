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
  { id: 'lead.acquire', label: 'Acquire leads', description: 'Search and retrieve external lead data from configured lead channels; does not create CRM records by itself.', category: 'Lead Data', risk: 'medium', reviewRequired: false },
  { id: 'lead.create', label: 'Create lead', description: 'Create a single CRM lead or client record from validated lead data.', category: 'Lead Data', risk: 'medium', reviewRequired: false },
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

const TOOL_INFERENCE_KEYWORDS: Record<string, string[]> = {
  'global_agent.plan': ['global', 'manager', 'orchestrate', 'plan', 'strategy', 'approval', '统筹', '全局', '规划', '计划', '审核', '管理'],
  'lead.acquire': ['acquire', 'prospect', 'campaign', 'keyword', 'industry', 'country', 'lead generation', '获客', '线索获取', '开发客户', 'campaign', '关键词', '行业', '国家'],
  'lead.create': ['create lead', 'create client', 'new lead', 'new client', 'crm record', '创建线索', '创建客户', '新增线索', '新增客户', '客户记录'],
  'lead.enrich': ['enrich', 'data enrichment', 'company data', 'contact data', 'append', '补全', '丰富', '客户数据', '线索数据', '资料完善'],
  'public_pool.import': ['public pool', 'pool', 'import leads', '公海', '导入公海', '公海池'],
  'client.dedupe': ['dedupe', 'duplicate', 'merge', '去重', '重复', '合并'],
  'data.normalize': ['normalize', 'clean', 'standardize', 'format', '清洗', '标准化', '格式化'],
  'lead.analyze': ['analyze', 'analysis', 'intent', 'qualification', 'radar', '分析', '意图', '资质', '画像', '雷达'],
  'lead.score': ['score', 'scoring', 'grade', 'priority', '评分', '打分', '评级', '优先级'],
  'client.summarize': ['summary', 'summarize', 'profile', 'brief', '摘要', '总结', '客户摘要', '概况'],
  'next_step.recommend': ['next step', 'recommend', 'suggest', 'follow-up recommendation', '下一步', '建议', '推荐', '跟进建议'],
  'email.send': ['email', 'mail', 'inbox', 'reply', 'outbound email', '邮件', '收件箱', '回邮件', '发邮件', '邮件跟进'],
  'whatsapp.read': ['whatsapp read', 'chat history', 'conversation history', '读取whatsapp', '聊天记录', '对话记录'],
  'whatsapp.send': ['whatsapp', 'wa', 'message', 'chat', 'send message', 'whatsapp消息', '发whatsapp', '发送消息', '聊天'],
  'conversation.tag': ['tag conversation', 'conversation tag', 'label conversation', '对话标签', '打标签', '标签'],
  'conversation.comment': ['conversation comment', 'internal note', 'comment on conversation', '对话备注', '内部备注', '评论'],
  'client.comment': ['client comment', 'crm note', 'customer note', '客户备注', '客户评论', '跟进记录'],
  'client.stage': ['stage', 'pipeline', 'status', 'kanban', '阶段', '状态', '看板', '客户阶段', '推进'],
  'client.update': ['update client', 'customer profile', 'contact method', 'crm update', '更新客户', '客户资料', '联系方式'],
  'quote.create': ['quote', 'quotation', 'pricing', 'proposal', 'offer', '报价', '报价单', '方案', '价格', '提案']
};

export function inferAgentToolsFromPrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return [];

  const scores = AGENT_TOOL_REGISTRY.map(tool => {
    const keywords = TOOL_INFERENCE_KEYWORDS[tool.id] || [];
    const directToolMatch = normalized.includes(tool.id.toLowerCase()) ? 6 : 0;
    const registryText = `${tool.label} ${tool.description} ${tool.category}`.toLowerCase();
    const registryScore = registryText.split(/\W+/).filter(word => word.length > 3 && normalized.includes(word)).length;
    const keywordScore = keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword.toLowerCase()) ? 3 : 0), 0);
    return { tool, score: directToolMatch + registryScore + keywordScore };
  });

  const selected = scores
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.id.localeCompare(b.tool.id))
    .map(item => item.tool.id);

  if (/(follow.?up|跟进|回复|reply|客户转化|conversion)/i.test(normalized)) {
    selected.push('lead.analyze', 'next_step.recommend', 'client.comment', 'client.stage');
  }
  if (/(lead|client|customer|线索|客户)/i.test(normalized)) {
    selected.push('lead.analyze', 'client.summarize');
  }

  return Array.from(new Set(selected));
}
