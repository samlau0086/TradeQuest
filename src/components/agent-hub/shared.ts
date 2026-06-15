import {
  AgentHubAgent,
  AgentHubEventTrigger,
  AgentHubGuardrail,
  AgentHubStatus,
  AgentTask,
  GlobalAgentActionType
} from '../../store';

export const ACTION_LABELS: Record<GlobalAgentActionType, string> = {
  create_lead_campaign: 'Create Lead Campaign',
  run_lead_campaign: 'Run Lead Campaign',
  create_followup_workflow: 'Create Follow-up Workflow',
  process_customer_reply: 'Process Customer Reply',
  send_email: 'Send Email',
  send_whatsapp: 'Send WhatsApp',
  update_client_stage: 'Update Client Stage',
  add_client_comment: 'Add Client Comment',
  enrich_client_data: 'Enrich Client Data',
  create_deal: 'Create Deal',
  create_quote: 'Create Quote',
  prioritize_leads: 'Prioritize Leads',
  review_pipeline: 'Review Pipeline'
};

export type AgentHubTab = 'fleet' | 'approvals' | 'opportunities' | 'runs' | 'chat' | 'health';
export type AgentQueueFilter = 'system' | 'custom';
export type AgentTaskQueueFilter = 'active' | 'open' | 'approval_required' | 'running' | 'completed' | 'failed' | 'ignored' | 'all';

export function agentTaskSourceLabel(triggerType?: string, source?: string, language?: string) {
  const isZh = language === 'zh';
  const normalized = (triggerType || source || '').toLowerCase();
  if (normalized === 'signal' || source === 'signal_scanner') return isZh ? 'Signal Scanner' : 'Signal Scanner';
  if (normalized === 'event' || source === 'agent_event') return isZh ? '事件触发' : 'Event Trigger';
  if (normalized === 'schedule' || source === 'agent_schedule') return isZh ? '定时触发' : 'Scheduled Trigger';
  if (normalized === 'manual') return isZh ? '用户手动' : 'Manual';
  if (normalized === 'console') return isZh ? 'Agent Chat 辅助' : 'Agent Chat Helper';
  if (normalized === 'system') return isZh ? '系统任务' : 'System';
  return isZh ? '未知来源' : 'Unknown source';
}

export function agentFixSuggestions(text: string, language?: string) {
  const isZh = language === 'zh';
  const lower = text.toLowerCase();
  const suggestions: string[] = [];
  const add = (zh: string, en: string) => suggestions.push(isZh ? zh : en);

  if (/(not configured|missing|api key|credential|channel|server|smtp|imap|pop3|whatsapp hub|outscraper|apify|phantombuster|hasdata|decodo|clay|未配置|缺少|密钥|凭证|服务器)/i.test(lower)) {
    add('检查 Settings → AI & Integrations / Email Servers / WhatsApp Actor Hub / Lead 数据渠道，补齐 API Key、服务器或渠道配置后重试。', 'Check Settings → AI & Integrations / Email Servers / WhatsApp Actor Hub / Lead data channels, then add the missing API key, server, or channel config and retry.');
  }
  if (/(no linked|not linked|client\/lead|linked entity|subject mode|entity subject|未关联|客户\/线索|事件主体|主体模式)/i.test(lower)) {
    add('先把邮件、WhatsApp、Live Chat 或事件关联到客户/Lead；如果确实要全局扫描，请把该 Agent 的事件作用范围改为全局。', 'Link the message/event to a client or lead first. If this agent should scan globally, change its event trigger scope to global.');
  }
  if (/(permission|forbidden|unauthorized|403|401|not allowed|权限|未授权|禁止)/i.test(lower)) {
    add('检查 Agent 工具权限、用户角色权限和高风险动作审批策略，确认该 Agent 有权执行对应工具。', 'Review the agent tool permissions, user role permissions, and high-risk approval policy before retrying.');
  }
  if (/(approval|review|required|pending_review|human|审批|审核|人工)/i.test(lower)) {
    add('到 Agent Hub → 审批处理该动作；批准后会进入执行链路，拒绝时可填写原因并保留审计记录。', 'Handle it in Agent Hub → Approvals. Approved items continue into execution; rejected items keep the audit trail.');
  }
  if (/(idempot|duplicate|dedupe|skip window|same day|重复|去重|幂等|窗口)/i.test(lower)) {
    add('这是幂等/去重保护。若需要再次执行，请确认客户状态或输入确有变化，或在任务中重新打开后重试。', 'This is idempotency/dedupe protection. Retry only after the customer state or input has changed, or reopen the task intentionally.');
  }
  if (/(quota|offline|not online|client offline|rate limit|429|限额|离线|不在线|频率)/i.test(lower)) {
    add('检查 WhatsApp actor/client 在线状态、发送 quota 和限流设置；恢复在线或额度后重新派发。', 'Check WhatsApp actor/client online status, send quota, and rate limits; retry after capacity is available.');
  }
  if (/(failed|error|exception|失败|错误|异常)/i.test(lower) && suggestions.length === 0) {
    add('打开该运行记录的步骤详情，优先确认输入主体、工具权限、渠道配置和最近一次代码/部署变更。', 'Open the run step details and check the linked entity, tool permissions, channel config, and the latest deployment changes.');
  }

  return Array.from(new Set(suggestions)).slice(0, 4);
}

export interface AgentHubPendingItem {
  kind: 'harness' | 'global' | 'client_edit';
  id: string;
  title: string;
  agent: string;
  body: string;
  createdAt: string;
}

export const emptyAgent = (): Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'> => ({
  name: '',
  instructions: '',
  guardrail: 'review',
  status: 'idle',
  tools: [],
  scheduleEnabled: false,
  scheduleIntervalMinutes: 1440,
  scheduleIntervalValue: 1,
  scheduleIntervalUnit: 'day',
  scheduleDayOfMonth: 1,
  scheduleMaxRuns: null,
  scheduleRunCount: 0,
  eventTriggers: [],
  eventTriggerScope: 'subject',
  contextSuggestionMode: 'manual',
  soul: '',
  evolutionLog: [],
  builtIn: false
});

export function formatChatRunResult(result: any, language: string) {
  const execution = result?.executionResult || result?.result || result;
  if (!execution) return language === 'zh' ? '已创建执行任务。' : 'Run created.';
  const details = Array.isArray(execution.details) ? execution.details.filter(Boolean).slice(0, 3).join(' ') : '';
  const counts = [
    typeof execution.scanned === 'number' ? `${language === 'zh' ? '扫描' : 'scanned'} ${execution.scanned}` : '',
    typeof execution.acted === 'number' ? `${language === 'zh' ? '处理' : 'acted'} ${execution.acted}` : '',
    typeof execution.skipped === 'number' ? `${language === 'zh' ? '跳过' : 'skipped'} ${execution.skipped}` : '',
    typeof execution.failed === 'number' ? `${language === 'zh' ? '失败' : 'failed'} ${execution.failed}` : ''
  ].filter(Boolean).join(', ');
  if (counts || details) return [counts, details].filter(Boolean).join('. ');
  if (typeof execution === 'string') return execution;
  return JSON.stringify(execution);
}

export const AGENT_EVENT_TRIGGER_OPTIONS: { id: AgentHubEventTrigger; label: string; description: string }[] = [
  { id: 'email_received', label: 'Email received', description: 'Run when new inbound email is synced.' },
  { id: 'whatsapp_received', label: 'WhatsApp received', description: 'Run when a WhatsApp inbound message is saved.' },
  { id: 'live_chat_received', label: 'Live chat received', description: 'Run when a website live chat visitor sends a message.' },
  { id: 'telegram_received', label: 'Telegram received', description: 'Run when a Telegram Bot inbound message is saved.' },
  { id: 'review_required', label: 'Review required', description: 'Run when a human approval item is created.' },
  { id: 'execution_failed', label: 'Execution failed', description: 'Run when an agent or workflow execution fails.' },
  { id: 'client_created', label: 'Client created', description: 'Run when a new client record is created.' },
  { id: 'lead_created', label: 'Lead created', description: 'Run when a new lead/deal is created.' },
  { id: 'client_updated', label: 'Client updated', description: 'Run when a client profile or stage changes.' }
];

export function eventTriggerLabel(trigger: AgentHubEventTrigger, language?: string) {
  const zh: Record<AgentHubEventTrigger, string> = {
    email_received: '收到邮件',
    whatsapp_received: '收到 WhatsApp',
    live_chat_received: '收到 Live Chat',
    telegram_received: '收到 Telegram',
    review_required: '需要审核',
    execution_failed: '执行失败',
    client_created: '创建客户',
    lead_created: '创建线索',
    client_updated: '客户更新'
  };
  return language === 'zh' ? zh[trigger] : (AGENT_EVENT_TRIGGER_OPTIONS.find(item => item.id === trigger)?.label || trigger);
}

export function statusClass(status: AgentHubStatus) {
  if (status === 'active') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  if (status === 'paused') return 'border-slate-500/40 bg-slate-500/10 text-slate-300';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
}

export function guardrailLabel(guardrail: AgentHubGuardrail) {
  if (guardrail === 'auto') return 'Auto';
  if (guardrail === 'human_loop') return 'Human-in-the-loop';
  return 'Review required';
}

export function scheduleLabel(agent: AgentHubAgent, t: (key: string) => string) {
  if (!agent.scheduleEnabled) return t('Schedule off');
  const unit = agent.scheduleIntervalUnit || 'minute';
  const value = agent.scheduleIntervalValue || agent.scheduleIntervalMinutes || 1;
  const runs = agent.scheduleMaxRuns ? ` · ${t('Runs')} ${agent.scheduleRunCount || 0}/${agent.scheduleMaxRuns}` : '';
  if (unit === 'month_day') return `${t('Monthly on day')} ${agent.scheduleDayOfMonth || 1}${runs}`;
  return `${t('Every')} ${value} ${t(unit)}${value === 1 ? '' : t('s')}${runs}`;
}

export function riskClass(risk: string) {
  if (risk === 'high') return 'border-red-500/40 bg-red-500/10 text-red-300';
  if (risk === 'medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
}

export function opportunityStatusLabel(status: string, language: string) {
  if (status === 'approval_required') return language === 'zh' ? '待审核' : 'Approval required';
  if (status === 'skipped') return language === 'zh' ? '已跳过' : 'Skipped';
  const zh: Record<string, string> = {
    open: '待派发',
    queued: '已入队',
    pending_review: '待审核',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
    ignored: '已忽略'
  };
  const en: Record<string, string> = {
    open: 'Open',
    queued: 'Queued',
    pending_review: 'Pending review',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    ignored: 'Ignored'
  };
  return language === 'zh' ? (zh[status] || status) : (en[status] || status);
}

export function opportunityStatusClass(status: string) {
  if (status === 'completed') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  if (status === 'failed') return 'border-red-500/40 bg-red-500/10 text-red-300';
  if (status === 'pending_review' || status === 'approval_required') return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
  if (status === 'running' || status === 'queued') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  return 'border-neutral-700 bg-neutral-900 text-slate-300';
}

export function taskFromOpportunityForView(opportunity: any): AgentTask {
  const status = opportunity.status === 'pending_review'
    ? 'approval_required'
    : opportunity.status === 'ignored'
      ? 'ignored'
      : (opportunity.status || 'open');
  const triggerType = opportunity.source === 'agent_schedule'
    ? 'schedule'
    : opportunity.source === 'agent_event'
      ? 'event'
      : opportunity.source === 'signal_scanner'
        ? 'signal'
        : 'system';
  return {
    id: `task_${opportunity.id}`,
    title: opportunity.title,
    description: opportunity.description,
    objective: opportunity.objective,
    source: opportunity.source || 'opportunity',
    triggerType,
    entityType: opportunity.targetType,
    entityId: opportunity.targetId,
    agentId: opportunity.recommendedAgentId,
    agentName: opportunity.recommendedAgentName,
    status,
    risk: opportunity.risk || 'medium',
    dedupeKey: opportunity.dedupeKey,
    approvalStatus: status === 'approval_required' ? 'pending' : (opportunity.relatedRunId ? 'approved' : 'not_required'),
    runId: opportunity.relatedRunId || null,
    runType: opportunity.relatedRunType || null,
    retryCount: 0,
    sourceRefType: 'opportunity',
    sourceRefId: opportunity.id,
    resultSummary: opportunity.resultSummary,
    metadata: opportunity.metadata,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    completedAt: opportunity.completedAt
  } as AgentTask;
}

export function linkedOpportunityIdFromTask(task: AgentTask) {
  if (task.sourceRefType === 'opportunity' && task.sourceRefId) return task.sourceRefId;
  return task.id.startsWith('task_opp_') ? task.id.slice(5) : null;
}
