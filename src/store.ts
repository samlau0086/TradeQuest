import { create } from 'zustand';
import { useAuthStore } from './authStore';

export type ViewMode = 'kanban' | 'map' | 'inbox' | 'dashboard' | 'agent-hub' | 'dormant' | 'leads' | 'followups' | 'settings' | 'user-management' | 'clients' | 'public-pool' | 'edit-requests' | 'list' | 'products' | 'quotes' | 'knowledge-base' | 'media-library';

export type ClientStatus = 'Leads' | 'Contacted' | 'Sample Sent' | 'Negotiating' | 'Closed Won'; // Kept for legacy compatibility if needed, better to rename to DealStage but will keep for now.

export interface Deal {
  id: string;
  clientId: string | null;
  name: string;
  value: number;
  status: ClientStatus;
  contactInfo?: {
    name: string;
    company: string;
    country: string;
    tags: string[];
    contactMethods: ContactMethod[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContactMethod {
  type: 'email' | 'whatsapp' | 'messenger' | 'telegram' | 'phone' | 'wechat';
  value: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'other';
  url: string;
}

export interface MediaItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
  replies?: Comment[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string;
  bulkPrices: { minQuantity: number; price: number }[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteFee {
  name: string;
  amount: number;
}

export interface QuoteItem {
  productId?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  total?: number;
  notes?: string;
  isManualPrice?: boolean;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string | null;
  paymentTerms: string;
  paymentTermId?: string;
  advanceRatio?: number;
  balanceRatio?: number;
  status: string;
  items: QuoteItem[];
  fees: QuoteFee[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface AppDocument {
  id: string;
  quoteId: string;
  type: string;
  documentNumber: string;
  content: any;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}


export interface ExpLog {
  id: string;
  amount: number;
  reason: string;
  date: string;
}

export type NotificationTone = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  message: string;
  tone: NotificationTone;
}

export type ExternalNotificationEvent = 'email_received' | 'review_required' | 'execution_failed';

export interface ExternalNotificationConfig {
  enabled: boolean;
  barkEnabled: boolean;
  barkServerUrl: string;
  barkDeviceKey: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  events: Record<ExternalNotificationEvent, boolean>;
}

export type AgentContextAnalysisMode = 'manual' | 'auto';

export interface AgentContextAnalysisConfig {
  globalMode: AgentContextAnalysisMode;
  clientModes: Record<string, AgentContextAnalysisMode>;
  emailModes: Record<string, AgentContextAnalysisMode>;
  whatsappModes: Record<string, AgentContextAnalysisMode>;
}

export interface AgentContextSuggestionInsight {
  intent: string;
  customerContext: string;
  knowledgeContext: string;
  analyzedAt: string;
  modelId?: string | null;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  address?: string;
  state?: string;
  city?: string;
  country: string;
  status: ClientStatus;
  tags: string[];
  lastContact: string;
  isDormant?: boolean;
  contactMethods?: ContactMethod[];
  comments?: Comment[];
  pendingEditRequest?: boolean;
  deletedBy?: string;
  agentEnabled?: boolean;
  agentMode?: 'manual' | 'auto_email';
  agentContext?: string;
  agentSummary?: string;
  agentNextStep?: string;
  leadScore?: number;
  leadSummary?: string;
  leadNextStep?: string;
  agentWorkflowId?: string;
  preferredLanguage?: string;
  preferredTimeRange?: string;
  agentContextAnalysisMode?: AgentContextAnalysisMode;
}

export interface WorkflowStep {
  id: string;
  type: 'email' | 'whatsapp' | 'call' | 'other';
  delayDays: number;
  sendTime?: string; // Format: HH:mm
  templatePrompt: string;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  stopOnMeaningfulReply?: boolean;
}

export type LeadCampaignMode = 'manual' | 'agent';
export type LeadCampaignStatus = 'draft' | 'running' | 'completed' | 'failed';
export type LeadDataProvider = 'outscraper' | 'apify' | 'phantombuster' | 'scrapio' | 'hasdata' | 'decodo' | 'clay';

export interface LeadDataChannelConfig {
  enabled: boolean;
  apiKey: string;
  searchEndpoint?: string;
  enrichEndpoint?: string;
  actorId?: string;
  agentId?: string;
  notes?: string;
}

export interface LeadCampaign {
  id: string;
  name: string;
  keywords: string;
  industry: string;
  country: string;
  limit: number;
  mode: LeadCampaignMode;
  provider: LeadDataProvider;
  status: LeadCampaignStatus;
  enrichBeforeImport?: boolean;
  enrichmentProvider?: LeadDataProvider;
  query?: string;
  importedCount?: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
}

export type GlobalAgentPlanStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'running' | 'completed' | 'failed';
export type GlobalAgentStepStatus = 'pending' | 'approved' | 'running' | 'completed' | 'failed' | 'skipped';
export type AgentExecutionMode = 'auto' | 'review';
export type AgentExecutionRisk = 'low' | 'medium' | 'high';
export type GlobalAgentActionType =
  | 'create_lead_campaign'
  | 'run_lead_campaign'
  | 'create_followup_workflow'
  | 'process_customer_reply'
  | 'send_email'
  | 'send_whatsapp'
  | 'update_client_stage'
  | 'add_client_comment'
  | 'enrich_client_data'
  | 'create_deal'
  | 'create_quote'
  | 'prioritize_leads'
  | 'review_pipeline';

export interface GlobalAgentPlanStep {
  id: string;
  title: string;
  description: string;
  actionType: GlobalAgentActionType;
  status: GlobalAgentStepStatus;
  executionMode?: AgentExecutionMode;
  risk?: AgentExecutionRisk;
  payload?: any;
  result?: string;
  error?: string;
}

export interface AgentExecutionPolicyRule {
  mode: AgentExecutionMode;
  risk: AgentExecutionRisk;
}

export type AgentExecutionPolicy = Record<GlobalAgentActionType, AgentExecutionPolicyRule>;

export interface GlobalAgentPlan {
  id: string;
  objective: string;
  summary: string;
  status: GlobalAgentPlanStatus;
  steps: GlobalAgentPlanStep[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  completedAt?: string;
}

export type AgentHarnessRunStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'running' | 'completed' | 'failed';
export type AgentHarnessStepStatus = 'pending' | 'approved' | 'running' | 'completed' | 'failed' | 'skipped';
export type AgentHarnessRisk = 'low' | 'medium' | 'high';

export interface AgentHarnessStep {
  id: string;
  agentId: string;
  title: string;
  description: string;
  tool: string;
  risk: AgentHarnessRisk;
  status: AgentHarnessStepStatus;
  payload?: any;
  result?: string;
  error?: string;
}

export interface AgentHarnessRun {
  id: string;
  objective: string;
  summary: string;
  status: AgentHarnessRunStatus;
  steps: AgentHarnessStep[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  completedAt?: string;
}

export type AgentHubStatus = 'active' | 'idle' | 'paused';
export type AgentHubGuardrail = 'auto' | 'review' | 'human_loop';
export type AgentHubContextSuggestionMode = 'manual' | 'auto';

export interface AgentHubAgent {
  id: string;
  name: string;
  instructions: string;
  guardrail: AgentHubGuardrail;
  status: AgentHubStatus;
  tools: string[];
  tasksCompleted: number;
  scheduleEnabled?: boolean;
  scheduleIntervalMinutes?: number;
  contextSuggestionMode?: AgentHubContextSuggestionMode;
  lastRunAt?: string;
  builtIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AgentHubRunStatus = 'planned' | 'pending_review' | 'approved' | 'running' | 'completed' | 'failed' | 'rejected';
export type AgentHubRunTrigger = 'scheduled' | 'manual' | 'approval' | 'system';

export interface AgentHubRunRecord {
  id: string;
  agentId: string;
  agentName: string;
  trigger: AgentHubRunTrigger;
  status: AgentHubRunStatus;
  plan: string;
  expectedResult: string;
  actualResult?: string;
  relatedRunId?: string;
  relatedRunType?: 'harness' | 'global';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ClientEditRequest {
  id: number;
  client_id: string;
  user_id: string;
  original_data: any;
  requested_data: any;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  current_client_name?: string;
  requester_name?: string;
}

export interface Log {
  id: string;
  clientId: string;
  date: string;
  content: string;
  relatedEmailId?: string;
  type?: 'general' | 'whatsapp' | 'email';
  metadata?: any;
}

export interface EmailMessage {
  id: string;
  clientId?: string; 
  sender: string; 
  senderName?: string;
  recipient: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  type: 'inbox' | 'sent' | 'scheduled' | 'inbound' | 'outbound' | 'draft';
  tags?: string[];
  comments?: Comment[];
  scheduledAt?: string;
  attachments?: Attachment[];
  pendingDelete?: boolean;
  isImportant?: boolean;
  todoAt?: string;
  todoNote?: string;
  trackingEvents?: any[];
  enableTracking?: boolean;
  agentContextAnalysisMode?: AgentContextAnalysisMode;
  agentContextAnalysis?: AgentContextSuggestionInsight;
  agentContextAnalysisKey?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  expReward: number;
  completed: boolean;
  skippedUntil?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  expReward: number;
  unlockedAt: number | null;
}

export interface DormantClientAnalysis {
  clientId: string;
  reason: string;
  suggestedAction: string;
}

export interface InboxConfig {
  id: string;
  name: string;
  type: 'imap' | 'pop3';
  host: string;
  port: string;
  username: string;
  password: string; // usually should be stored securely but we will keep here for preview
  secure: boolean;
  syncIntervalMinutes?: number;
}

export interface EmailSignature {
  id: string;
  name: string;
  content: string; // HTML or Markdown
  isDefault?: boolean;
}

export interface OutboxConfig {
  id: string;
  name: string;
  type: 'smtp' | 'resend';
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  apiKey?: string; // used for resend
  secure?: boolean;
  fromEmail: string;
  fromName: string;
}

export interface WhatsAppHubConfig {
  enabled: boolean;
  baseUrl: string;
  apiToken: string;
  dailyBaseQuota: number;
  minReplyRate: number;
}

export interface LLMConfig {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'openrouter' | 'custom_openai';
  apiKey: string;
  model: string;
  embeddingModel?: string;
  baseURL?: string;
}

export interface PaymentTerm {
  id: string;
  name: string;
  description: string;
  advanceRatio: number;
  balanceRatio: number;
}

export interface KnowledgeItem {
  id: string;
  clientId: string | null;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreState {
  agentWorkflows: AgentWorkflow[];
  fetchAgentWorkflows: () => void;
  addAgentWorkflow: (workflow: Omit<AgentWorkflow, 'id'>) => void;
  updateAgentWorkflow: (id: string, updates: Partial<AgentWorkflow>) => void;
  deleteAgentWorkflow: (id: string) => void;

  leadCampaigns: LeadCampaign[];
  leadDataChannelConfigs: Record<LeadDataProvider, LeadDataChannelConfig>;
  updateLeadDataChannelConfig: (provider: LeadDataProvider, updates: Partial<LeadDataChannelConfig>) => void;
  addLeadCampaign: (campaign: Omit<LeadCampaign, 'id' | 'createdAt' | 'updatedAt' | 'status'> & Partial<Pick<LeadCampaign, 'status'>>) => string;
  updateLeadCampaign: (id: string, updates: Partial<LeadCampaign>) => void;
  deleteLeadCampaign: (id: string) => void;

  globalAgentPlans: GlobalAgentPlan[];
  agentExecutionPolicy: AgentExecutionPolicy;
  updateAgentExecutionPolicy: (actionType: GlobalAgentActionType, updates: Partial<AgentExecutionPolicyRule>) => void;
  addGlobalAgentPlan: (plan: Omit<GlobalAgentPlan, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateGlobalAgentPlan: (id: string, updates: Partial<GlobalAgentPlan>) => void;
  deleteGlobalAgentPlan: (id: string) => void;
  updateGlobalAgentPlanStep: (planId: string, stepId: string, updates: Partial<GlobalAgentPlanStep>) => void;

  agentHarnessRuns: AgentHarnessRun[];
  addAgentHarnessRun: (run: Omit<AgentHarnessRun, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAgentHarnessRun: (id: string, updates: Partial<AgentHarnessRun>) => void;
  deleteAgentHarnessRun: (id: string) => void;
  updateAgentHarnessStep: (runId: string, stepId: string, updates: Partial<AgentHarnessStep>) => void;

  agentHubAgents: AgentHubAgent[];
  addAgentHubAgent: (agent: Omit<AgentHubAgent, 'id' | 'createdAt' | 'updatedAt' | 'tasksCompleted'> & Partial<Pick<AgentHubAgent, 'tasksCompleted'>>) => string;
  updateAgentHubAgent: (id: string, updates: Partial<AgentHubAgent>) => void;
  agentRunRecords: AgentHubRunRecord[];
  addAgentRunRecord: (record: Omit<AgentHubRunRecord, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAgentRunRecord: (id: string, updates: Partial<AgentHubRunRecord>) => void;
  deleteAgentRunRecord: (id: string) => void;

  knowledgeBase: KnowledgeItem[];
  fetchKnowledgeBase: () => void;
  addKnowledgeItem: (item: Omit<KnowledgeItem, 'id'>) => void;
  updateKnowledgeItem: (id: string, updates: Partial<KnowledgeItem>) => void;
  deleteKnowledgeItem: (id: string) => void;

  mediaLibrary: MediaItem[];
  fetchMediaLibrary: () => void;
  addMedia: (media: Omit<MediaItem, 'id' | 'createdAt'>) => void;
  deleteMedia: (id: string) => void;

  paymentTerms: PaymentTerm[];
  fetchPaymentTerms: () => void;
  addPaymentTerm: (term: Omit<PaymentTerm, 'id'>) => void;
  updatePaymentTerm: (id: string, updates: Partial<PaymentTerm>) => void;
  deletePaymentTerm: (id: string) => void;

  llmConfigs: LLMConfig[];
  addLLMConfig: (config: Omit<LLMConfig, 'id'>) => void;
  updateLLMConfig: (id: string, updates: Partial<LLMConfig>) => void;
  deleteLLMConfig: (id: string) => void;
  llmMappings: Record<string, string | null>;
  setLLMMapping: (module: string, id: string | null) => void;
  activeLLMId: string | null; // Keep for legacy/fallback
  setActiveLLMId: (id: string | null) => void;

  inboxConfigs: InboxConfig[];
  addInboxConfig: (config: Omit<InboxConfig, 'id'>) => void;
  updateInboxConfig: (id: string, updates: Partial<InboxConfig>) => void;
  deleteInboxConfig: (id: string) => void;

  signatures: EmailSignature[];
  addSignature: (signature: Omit<EmailSignature, 'id'>) => void;
  updateSignature: (id: string, updates: Partial<EmailSignature>) => void;
  deleteSignature: (id: string) => void;
  setDefaultSignature: (id: string) => void;

  outboxConfigs: OutboxConfig[];
  addOutboxConfig: (config: Omit<OutboxConfig, 'id'>) => void;
  updateOutboxConfig: (id: string, updates: Partial<OutboxConfig>) => void;
  deleteOutboxConfig: (id: string) => void;

  whatsappHubConfig: WhatsAppHubConfig;
  updateWhatsAppHubConfig: (updates: Partial<WhatsAppHubConfig>) => void;
  externalNotificationConfig: ExternalNotificationConfig;
  updateExternalNotificationConfig: (updates: Partial<ExternalNotificationConfig>) => void;
  sendExternalNotification: (payload: { event: ExternalNotificationEvent; title: string; body: string; url?: string; metadata?: any }) => Promise<void>;
  agentContextAnalysisConfig: AgentContextAnalysisConfig;
  updateAgentContextAnalysisConfig: (updates: Partial<AgentContextAnalysisConfig>) => void;
  
  view: ViewMode;
  setView: (view: ViewMode) => void;
  
  kanbanSearch: string;
  setKanbanSearch: (search: string) => void;
  
  dormantAnalysisList: DormantClientAnalysis[] | null;
  setDormantAnalysisList: (analysisList: DormantClientAnalysis[]) => void;
  
  leadsAnalysisList: DormantClientAnalysis[] | null;
  setLeadsAnalysisList: (analysisList: DormantClientAnalysis[]) => void;

  followupsAnalysisList: DormantClientAnalysis[] | null;
  setFollowupsAnalysisList: (analysisList: DormantClientAnalysis[]) => void;
  
  userExp: number;
  userLevel: number;
  userTitle: string;
  currentStreak: number;
  expLogs: ExpLog[];
  addExp: (amount: number, reason?: string) => void;
  
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => Promise<string | null>;
  editClient: (id: string, updates: Partial<Omit<Client, 'id'>>) => void;
  submitClientEditRequest: (id: string, requestedData: Partial<Omit<Client, 'id'>>) => void;
  deleteClient: (id: string) => Promise<void>;
  updateClientStatus: (id: string, status: ClientStatus) => void;

  deals: Deal[];
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  fetchDeals: () => void;
  
  products: Product[];
  fetchProducts: () => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  quotes: Quote[];
  fetchQuotes: () => void;
  addQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;

  documents: AppDocument[];
  fetchDocuments: () => void;
  addDocument: (doc: Omit<AppDocument, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDocument: (id: string, updates: Partial<AppDocument>) => void;
  deleteDocument: (id: string) => void;
  
  publicClients: Client[];
  fetchPublicClients: () => void;
  claimClient: (id: string) => void;
  importPublicLeads: (leads: any[]) => Promise<void>;
  
  addComment: (clientId: string, content: string, attachments?: Attachment[]) => void;
  addReply: (clientId: string, commentId: string, content: string, attachments?: Attachment[]) => void;

  logs: Log[];
  addLog: (clientId: string, content: string, relatedEmailId?: string, type?: 'general' | 'whatsapp' | 'email', metadata?: any) => void;

  emails: EmailMessage[];
  addEmail: (email: Omit<EmailMessage, 'id' | 'date'>) => string;
  editEmail: (id: string, updates: Partial<EmailMessage>) => void;
  markEmailRead: (id: string) => void;
  addEmailComment: (emailId: string, content: string, attachments?: Attachment[]) => void;
  addEmailReply: (emailId: string, commentId: string, content: string, attachments?: Attachment[]) => void;
  checkScheduledEmails: () => void;
  deleteEmails: (ids: string[]) => Promise<void>;

  selectedClientId: string | null;
  selectClient: (id: string | null) => void;
  
  selectedEmailId: string | null;
  selectEmail: (id: string | null) => void;

  dailyQuests: Quest[];
  addQuest: (quest: Omit<Quest, 'id' | 'completed'>) => void;
  completeQuest: (id: string) => void;
  skipQuest: (id: string, days: number) => void;

  achievements: Achievement[];
  checkAchievements: () => void;

  broadcasts: { id: string, message: string }[];
  addBroadcast: (message: string) => void;
  notifications: AppNotification[];
  notify: (message: string, tone?: NotificationTone) => void;
  removeNotification: (id: string) => void;

  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

  language: 'en' | 'zh';
  setLanguage: (lang: 'en' | 'zh') => void;

  timezone: string;
  setTimezone: (timezone: string) => void;

  outscraperApiKey: string;
  setOutscraperApiKey: (key: string) => void;

  expConfig: Record<string, number>;
  loadExpConfig: () => Promise<void>;

  fetchUserSettings: () => Promise<void>;
  fetchEmails: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  globalLoading: boolean;
  setGlobalLoading: (isLoading: boolean) => void;
}

const INITIAL_CLIENTS: Client[] = [];

const INITIAL_LOGS: Log[] = [];

const INITIAL_EMAILS: EmailMessage[] = [];

const INITIAL_AGENT_HUB_AGENTS: AgentHubAgent[] = [
  {
    id: 'global_agent',
    name: 'Global Conversion Agent',
    instructions: 'Plan and coordinate CRM-wide lead acquisition, enrichment, follow-up, quotes, and conversion.',
    guardrail: 'review',
    status: 'active',
    tools: ['global_agent.plan', 'lead.acquire', 'lead.enrich', 'email.send', 'whatsapp.send', 'quote.create', 'client.update'],
    tasksCompleted: 0,
    scheduleEnabled: false,
    scheduleIntervalMinutes: 1440,
    contextSuggestionMode: 'manual',
    builtIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'follow_up_agent',
    name: 'AI Follow-Up Agent',
    instructions: 'Run account-level email and WhatsApp follow-up decisions using client history and workflow rules.',
    guardrail: 'human_loop',
    status: 'active',
    tools: ['email.send', 'whatsapp.send', 'client.comment', 'client.stage'],
    tasksCompleted: 0,
    scheduleEnabled: false,
    scheduleIntervalMinutes: 240,
    contextSuggestionMode: 'manual',
    builtIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'whatsapp_agent',
    name: 'WhatsApp Inbox Agent',
    instructions: 'Read WhatsApp conversation context, classify replies, add notes, and suggest next actions.',
    guardrail: 'human_loop',
    status: 'idle',
    tools: ['whatsapp.read', 'whatsapp.send', 'conversation.tag', 'conversation.comment'],
    tasksCompleted: 0,
    scheduleEnabled: false,
    scheduleIntervalMinutes: 60,
    contextSuggestionMode: 'manual',
    builtIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lead_scoring_agent',
    name: 'Lead Scoring Agent',
    instructions: 'Analyze lead quality, score conversion potential, summarize the account, and recommend the best next step.',
    guardrail: 'auto',
    status: 'active',
    tools: ['lead.analyze', 'lead.score', 'client.summarize', 'next_step.recommend'],
    tasksCompleted: 0,
    scheduleEnabled: false,
    scheduleIntervalMinutes: 240,
    contextSuggestionMode: 'auto',
    builtIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lead_data_agent',
    name: 'Lead Data Agent',
    instructions: 'Acquire, import, enrich, deduplicate, and normalize lead data across configured data channels.',
    guardrail: 'auto',
    status: 'active',
    tools: ['lead.acquire', 'lead.enrich', 'public_pool.import', 'client.dedupe', 'data.normalize'],
    tasksCompleted: 0,
    scheduleEnabled: false,
    scheduleIntervalMinutes: 720,
    contextSuggestionMode: 'auto',
    builtIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_WHATSAPP_HUB_CONFIG: WhatsAppHubConfig = {
  enabled: false,
  baseUrl: '',
  apiToken: '',
  dailyBaseQuota: 40,
  minReplyRate: 0.25
};

const INITIAL_EXTERNAL_NOTIFICATION_CONFIG: ExternalNotificationConfig = {
  enabled: false,
  barkEnabled: false,
  barkServerUrl: 'https://api.day.app',
  barkDeviceKey: '',
  webhookEnabled: false,
  webhookUrl: '',
  events: {
    email_received: true,
    review_required: true,
    execution_failed: true
  }
};

const INITIAL_AGENT_CONTEXT_ANALYSIS_CONFIG: AgentContextAnalysisConfig = {
  globalMode: 'auto',
  clientModes: {},
  emailModes: {},
  whatsappModes: {}
};

const INITIAL_LEAD_DATA_CHANNEL_CONFIGS: Record<LeadDataProvider, LeadDataChannelConfig> = {
  outscraper: { enabled: true, apiKey: localStorage.getItem('outscraperApiKey') || '' },
  apify: { enabled: false, apiKey: '', actorId: '' },
  phantombuster: { enabled: false, apiKey: '', agentId: '' },
  scrapio: { enabled: false, apiKey: '', searchEndpoint: '' },
  hasdata: { enabled: false, apiKey: '', searchEndpoint: '' },
  decodo: { enabled: false, apiKey: '', searchEndpoint: '' },
  clay: { enabled: false, apiKey: '', enrichEndpoint: '' }
};

export const INITIAL_AGENT_EXECUTION_POLICY: AgentExecutionPolicy = {
  create_lead_campaign: { mode: 'review', risk: 'medium' },
  run_lead_campaign: { mode: 'review', risk: 'medium' },
  create_followup_workflow: { mode: 'review', risk: 'medium' },
  process_customer_reply: { mode: 'review', risk: 'medium' },
  send_email: { mode: 'review', risk: 'high' },
  send_whatsapp: { mode: 'review', risk: 'high' },
  update_client_stage: { mode: 'review', risk: 'high' },
  add_client_comment: { mode: 'auto', risk: 'low' },
  enrich_client_data: { mode: 'auto', risk: 'low' },
  create_deal: { mode: 'review', risk: 'medium' },
  create_quote: { mode: 'review', risk: 'high' },
  prioritize_leads: { mode: 'auto', risk: 'low' },
  review_pipeline: { mode: 'auto', risk: 'low' }
};

export const GLOBAL_AGENT_ACTION_TYPES = Object.keys(INITIAL_AGENT_EXECUTION_POLICY) as GlobalAgentActionType[];

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_client', title: 'First Contact', description: 'Add your first client to the CRM.', icon: 'UserPlus', expReward: 100, unlockedAt: null },
  { id: 'networking', title: 'Networker', description: 'Grow your list to 10 clients.', icon: 'Users', expReward: 250, unlockedAt: null },
  { id: 'close_deal', title: 'The Closer', description: 'Successfully win your first deal.', icon: 'Handshake', expReward: 500, unlockedAt: null },
  { id: 'global_reach', title: 'Global Reach', description: 'Have clients from at least 3 different countries.', icon: 'Globe', expReward: 300, unlockedAt: null },
  { id: 'world_domination', title: 'World Domination', description: 'Have clients from 10 different countries.', icon: 'Earth', expReward: 1500, unlockedAt: null },
  { id: 'level_5', title: 'Elite Hunter', description: 'Reach Level 5.', icon: 'Swords', expReward: 200, unlockedAt: null },
  { id: 'level_10', title: 'Trade Master', description: 'Reach Level 10.', icon: 'Crown', expReward: 1000, unlockedAt: null },
  { id: 'veteran', title: 'Veteran', description: 'Reach Level 20.', icon: '🎖️', expReward: 3000, unlockedAt: null },
  { id: 'inbox_zero', title: 'Inbox Zero', description: 'Clear all unread emails in your inbox.', icon: 'MailCheck', expReward: 150, unlockedAt: null },
  { id: 'rich_history', title: 'Historian', description: 'Log 50 interactions or events.', icon: 'BookOpen', expReward: 400, unlockedAt: null },
  { id: 'quest_master', title: 'Quest Master', description: 'Complete a daily quest.', icon: 'Target', expReward: 100, unlockedAt: null },
  { id: 'early_bird', title: 'Early Bird', description: 'Send out an email before 8 AM.', icon: '🌅', expReward: 150, unlockedAt: null },
  { id: 'night_owl', title: 'Night Owl', description: 'Log an interaction after 10 PM.', icon: '🦉', expReward: 150, unlockedAt: null },
  { id: 'deal_maker', title: 'Deal Maker', description: 'Close 5 deals.', icon: '🤝', expReward: 600, unlockedAt: null },
  { id: 'sales_legend', title: 'Sales Legend', description: 'Close 20 deals.', icon: '👑', expReward: 2000, unlockedAt: null },
  { id: 'sample_sender', title: 'Sample Sender', description: 'Send samples to 10 clients.', icon: '📦', expReward: 500, unlockedAt: null },
  { id: 'persistent', title: 'Persistent', description: 'Follow up 5 times with a single client.', icon: '🔥', expReward: 300, unlockedAt: null },
  { id: 'social_butterfly', title: 'Social Butterfly', description: 'Add 3 different contact methods for a client.', icon: '🦋', expReward: 200, unlockedAt: null },
  { id: 'data_driven', title: 'Data Driven', description: 'Categorize clients with 5 tags.', icon: '📊', expReward: 250, unlockedAt: null },
  { id: 'unstoppable', title: 'Unstoppable', description: 'Achieve a 10-day streak.', icon: '⚡', expReward: 1000, unlockedAt: null }
];

export const useStore = create<StoreState>((set, get) => ({
  globalLoading: false,
  setGlobalLoading: (isLoading: boolean) => set({ globalLoading: isLoading }),

  agentWorkflows: [],
  fetchAgentWorkflows: () => {
    /* Kept alive for legacy UI compat if any, but now fetched with userSettings*/ 
  },
  addAgentWorkflow: (workflow) => set((state) => {
    const newWf = { ...workflow, id: `wf_${Date.now()}` };
    const newWorkflows = [...state.agentWorkflows, newWf];
    return { agentWorkflows: newWorkflows };
  }),
  updateAgentWorkflow: (id, updates) => set((state) => {
    const newWorkflows = state.agentWorkflows.map(wf => wf.id === id ? { ...wf, ...updates } : wf);
    return { agentWorkflows: newWorkflows };
  }),
  deleteAgentWorkflow: (id) => set((state) => {
    const newWorkflows = state.agentWorkflows.filter(wf => wf.id !== id);
    return { agentWorkflows: newWorkflows };
  }),

  leadCampaigns: [],
  leadDataChannelConfigs: INITIAL_LEAD_DATA_CHANNEL_CONFIGS,
  updateLeadDataChannelConfig: (provider, updates) => set((state) => {
    const nextConfig = {
      ...(state.leadDataChannelConfigs[provider] || INITIAL_LEAD_DATA_CHANNEL_CONFIGS[provider]),
      ...updates
    };
    if (provider === 'outscraper' && updates.apiKey !== undefined) {
      localStorage.setItem('outscraperApiKey', updates.apiKey);
    }
    return {
      leadDataChannelConfigs: {
        ...state.leadDataChannelConfigs,
        [provider]: nextConfig
      },
      ...(provider === 'outscraper' && updates.apiKey !== undefined ? { outscraperApiKey: updates.apiKey } : {})
    };
  }),
  addLeadCampaign: (campaign) => {
    const now = new Date().toISOString();
    const id = `campaign_${Date.now()}`;
    const newCampaign: LeadCampaign = {
      ...campaign,
      id,
      status: campaign.status || 'draft',
      createdAt: now,
      updatedAt: now
    };
    set((state) => ({ leadCampaigns: [newCampaign, ...state.leadCampaigns] }));
    return id;
  },
  updateLeadCampaign: (id, updates) => set((state) => ({
    leadCampaigns: state.leadCampaigns.map(campaign => (
      campaign.id === id ? { ...campaign, ...updates, updatedAt: new Date().toISOString() } : campaign
    ))
  })),
  deleteLeadCampaign: (id) => set((state) => ({
    leadCampaigns: state.leadCampaigns.filter(campaign => campaign.id !== id)
  })),

  globalAgentPlans: [],
  agentExecutionPolicy: INITIAL_AGENT_EXECUTION_POLICY,
  updateAgentExecutionPolicy: (actionType, updates) => set((state) => ({
    agentExecutionPolicy: {
      ...state.agentExecutionPolicy,
      [actionType]: {
        ...(state.agentExecutionPolicy[actionType] || INITIAL_AGENT_EXECUTION_POLICY[actionType]),
        ...updates
      }
    }
  })),
  addGlobalAgentPlan: (plan) => {
    const now = new Date().toISOString();
    const id = `global_agent_${Date.now()}`;
    set((state) => ({
      globalAgentPlans: [{
        ...plan,
        id,
        createdAt: now,
        updatedAt: now
      }, ...state.globalAgentPlans]
    }));
    return id;
  },
  updateGlobalAgentPlan: (id, updates) => set((state) => ({
    globalAgentPlans: state.globalAgentPlans.map(plan => (
      plan.id === id ? { ...plan, ...updates, updatedAt: new Date().toISOString() } : plan
    ))
  })),
  deleteGlobalAgentPlan: (id) => set((state) => ({
    globalAgentPlans: state.globalAgentPlans.filter(plan => plan.id !== id),
    agentRunRecords: state.agentRunRecords.filter(record => record.relatedRunId !== id || record.relatedRunType !== 'global')
  })),
  updateGlobalAgentPlanStep: (planId, stepId, updates) => set((state) => ({
    globalAgentPlans: state.globalAgentPlans.map(plan => (
      plan.id === planId
        ? {
            ...plan,
            updatedAt: new Date().toISOString(),
            steps: plan.steps.map(step => step.id === stepId ? { ...step, ...updates } : step)
          }
        : plan
    ))
  })),

  agentHarnessRuns: [],
  addAgentHarnessRun: (run) => {
    const now = new Date().toISOString();
    const id = `agent_harness_${Date.now()}`;
    set((state) => ({
      agentHarnessRuns: [{
        ...run,
        id,
        createdAt: now,
        updatedAt: now
      }, ...state.agentHarnessRuns]
    }));
    return id;
  },
  updateAgentHarnessRun: (id, updates) => set((state) => ({
    agentHarnessRuns: state.agentHarnessRuns.map(run => (
      run.id === id ? { ...run, ...updates, updatedAt: new Date().toISOString() } : run
    ))
  })),
  deleteAgentHarnessRun: (id) => set((state) => ({
    agentHarnessRuns: state.agentHarnessRuns.filter(run => run.id !== id),
    agentRunRecords: state.agentRunRecords.filter(record => record.relatedRunId !== id || record.relatedRunType !== 'harness')
  })),
  updateAgentHarnessStep: (runId, stepId, updates) => set((state) => ({
    agentHarnessRuns: state.agentHarnessRuns.map(run => (
      run.id === runId
        ? {
            ...run,
            updatedAt: new Date().toISOString(),
            steps: run.steps.map(step => step.id === stepId ? { ...step, ...updates } : step)
          }
        : run
    ))
  })),

  agentHubAgents: INITIAL_AGENT_HUB_AGENTS,
  addAgentHubAgent: (agent) => {
    const id = `agent_${Date.now()}`;
    const now = new Date().toISOString();
    set((state) => ({
      agentHubAgents: [
        {
          ...agent,
          id,
          tasksCompleted: agent.tasksCompleted || 0,
          createdAt: now,
          updatedAt: now
        },
        ...state.agentHubAgents
      ]
    }));
    return id;
  },
  updateAgentHubAgent: (id, updates) => set((state) => ({
    agentHubAgents: state.agentHubAgents.map(agent => (
      agent.id === id ? { ...agent, ...updates, updatedAt: new Date().toISOString() } : agent
    ))
  })),
  agentRunRecords: [],
  addAgentRunRecord: (record) => {
    const id = `agent_run_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    set((state) => ({
      agentRunRecords: [{ ...record, id, createdAt: now, updatedAt: now }, ...state.agentRunRecords].slice(0, 200)
    }));
    return id;
  },
  updateAgentRunRecord: (id, updates) => set((state) => ({
    agentRunRecords: state.agentRunRecords.map(record => (
      record.id === id ? { ...record, ...updates, updatedAt: new Date().toISOString() } : record
    ))
  })),
  deleteAgentRunRecord: (id) => set((state) => ({
    agentRunRecords: state.agentRunRecords.filter(record => record.id !== id)
  })),

  knowledgeBase: [],
  fetchKnowledgeBase: () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/knowledge-base', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(knowledgeBase => set({ knowledgeBase: Array.isArray(knowledgeBase) ? knowledgeBase : [] }))
        .catch(console.error);
    }
  },
  addKnowledgeItem: (item) => {
    const token = localStorage.getItem('token');
    const newId = `kb-${Date.now()}`;
    const newItem = { ...item, id: newId };
    set((state) => {
      const embeddingLlmId = state.llmMappings['embedding'] || state.activeLLMId;
      const llmConfig = embeddingLlmId ? state.llmConfigs.find(c => c.id === embeddingLlmId) : undefined;
      
      if (token) {
        fetch('/api/knowledge-base', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ...newItem, llmConfig })
        }).catch(console.error);
      }
      return { knowledgeBase: [newItem, ...state.knowledgeBase] };
    });
  },
  updateKnowledgeItem: (id, updates) => {
    const token = localStorage.getItem('token');
    set((state) => {
      const embeddingLlmId = state.llmMappings['embedding'] || state.activeLLMId;
      const llmConfig = embeddingLlmId ? state.llmConfigs.find(c => c.id === embeddingLlmId) : undefined;

      if (token) {
        fetch(`/api/knowledge-base/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ...updates, llmConfig })
        }).catch(console.error);
      }
      
      return {
        knowledgeBase: state.knowledgeBase.map(kb => kb.id === id ? { ...kb, ...updates } : kb)
      };
    });
  },
  deleteKnowledgeItem: (id) => {
    const token = localStorage.getItem('token');
    set((state) => ({
      knowledgeBase: state.knowledgeBase.filter(kb => kb.id !== id)
    }));
    if (token) {
      fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }
  },

  mediaLibrary: [],
  fetchMediaLibrary: () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/media', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(mediaLibrary => set({ mediaLibrary: Array.isArray(mediaLibrary) ? mediaLibrary : [] }))
        .catch(console.error);
    }
  },
  addMedia: (media) => {
    const newItem = {
      ...media,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    set((state) => ({ mediaLibrary: [newItem, ...state.mediaLibrary] }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newItem)
      }).catch(console.error);
    }
  },
  deleteMedia: (id) => {
    set((state) => ({ mediaLibrary: state.mediaLibrary.filter(m => m.id !== id) }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/media/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }
  },

  paymentTerms: [],
  fetchPaymentTerms: () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/payment-terms', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(paymentTerms => set({ paymentTerms }))
        .catch(console.error);
    }
  },
  addPaymentTerm: (term) => {
    const id = `pt${Date.now()}`;
    const newTerm = { ...term, id };
    set(state => ({ paymentTerms: [...state.paymentTerms, newTerm] }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/payment-terms', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newTerm) }).catch(console.error);
    }
  },
  updatePaymentTerm: (id, updates) => {
    set(state => ({ paymentTerms: state.paymentTerms.map(pt => pt.id === id ? { ...pt, ...updates } : pt) }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/payment-terms/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(updates) }).catch(console.error);
    }
  },
  deletePaymentTerm: (id) => {
    set(state => ({ paymentTerms: state.paymentTerms.filter(pt => pt.id !== id) }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/payment-terms/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).catch(console.error);
    }
  },

  llmConfigs: [],
  addLLMConfig: (config) => set((state) => ({ llmConfigs: [...state.llmConfigs, { ...config, id: `llm_${Date.now()}` }] })),
  updateLLMConfig: (id, updates) => set((state) => ({ llmConfigs: state.llmConfigs.map(a => a.id === id ? { ...a, ...updates } : a) })),
  deleteLLMConfig: (id) => set((state) => {
    const newMappings = { ...state.llmMappings };
    Object.keys(newMappings).forEach(key => {
      if (newMappings[key] === id) newMappings[key] = null;
    });
    return { 
      llmConfigs: state.llmConfigs.filter(a => a.id !== id),
      activeLLMId: state.activeLLMId === id ? null : state.activeLLMId,
      llmMappings: newMappings
    };
  }),
  llmMappings: {
    magic: null,
    agent_harness: null,
    global_agent: null,
    agent_context_suggestions: null,
    drafting: null,
    whatsapp_drafting: null,
    analysis: null,
    embedding: null,
    outscraperTranslate: null
  },
  setLLMMapping: (module, id) => set((state) => ({
    llmMappings: { ...state.llmMappings, [module]: id }
  })),
  activeLLMId: null,
  setActiveLLMId: (id) => set({ activeLLMId: id }),

  inboxConfigs: [],
  addInboxConfig: (config) => set((state) => ({ inboxConfigs: [...state.inboxConfigs, { ...config, id: `inbox_${Date.now()}` }] })),
  updateInboxConfig: (id, updates) => set((state) => ({ inboxConfigs: state.inboxConfigs.map(a => a.id === id ? { ...a, ...updates } : a) })),
  deleteInboxConfig: (id) => set((state) => ({ inboxConfigs: state.inboxConfigs.filter(a => a.id !== id) })),

  signatures: [],
  addSignature: (signature) => set((state) => {
    const isFirst = state.signatures.length === 0;
    return { signatures: [...state.signatures, { ...signature, id: `sig_${Date.now()}`, isDefault: isFirst }] };
  }),
  updateSignature: (id, updates) => set((state) => ({ signatures: state.signatures.map(s => s.id === id ? { ...s, ...updates } : s) })),
  deleteSignature: (id) => set((state) => ({
    signatures: state.signatures.map(s => {
      if (s.id === id) return null;
      return s;
    }).filter(Boolean) as EmailSignature[]
  })),
  setDefaultSignature: (id) => set((state) => ({
    signatures: state.signatures.map(s => ({ ...s, isDefault: s.id === id }))
  })),

  outboxConfigs: [],
  addOutboxConfig: (config) => set((state) => ({ outboxConfigs: [...state.outboxConfigs, { ...config, id: `outbox_${Date.now()}` }] })),
  updateOutboxConfig: (id, updates) => set((state) => ({ outboxConfigs: state.outboxConfigs.map(a => a.id === id ? { ...a, ...updates } : a) })),
  deleteOutboxConfig: (id) => set((state) => ({ outboxConfigs: state.outboxConfigs.filter(a => a.id !== id) })),

  whatsappHubConfig: INITIAL_WHATSAPP_HUB_CONFIG,
  updateWhatsAppHubConfig: (updates) => set((state) => ({
    whatsappHubConfig: { ...state.whatsappHubConfig, ...updates }
  })),
  externalNotificationConfig: INITIAL_EXTERNAL_NOTIFICATION_CONFIG,
  updateExternalNotificationConfig: (updates) => set((state) => ({
    externalNotificationConfig: {
      ...state.externalNotificationConfig,
      ...updates,
      events: updates.events
        ? { ...state.externalNotificationConfig.events, ...updates.events }
        : state.externalNotificationConfig.events
    }
  })),
  agentContextAnalysisConfig: INITIAL_AGENT_CONTEXT_ANALYSIS_CONFIG,
  updateAgentContextAnalysisConfig: (updates) => set((state) => ({
    agentContextAnalysisConfig: {
      ...state.agentContextAnalysisConfig,
      ...updates,
      clientModes: updates.clientModes ?? state.agentContextAnalysisConfig.clientModes,
      emailModes: updates.emailModes ?? state.agentContextAnalysisConfig.emailModes,
      whatsappModes: updates.whatsappModes ?? state.agentContextAnalysisConfig.whatsappModes
    }
  })),
  sendExternalNotification: async (payload) => {
    const token = localStorage.getItem('token');
    const config = get().externalNotificationConfig;
    if (!token || !config.enabled || !config.events[payload.event]) return;
    try {
      await fetch('/api/notifications/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.warn('External notification failed', error);
    }
  },

  view: 'kanban',
  setView: (view) => set({ view }),

  kanbanSearch: '',
  setKanbanSearch: (search) => set({ kanbanSearch: search }),

  dormantAnalysisList: null,
  setDormantAnalysisList: (analysisList) => set({ dormantAnalysisList: analysisList }),

  leadsAnalysisList: null,
  setLeadsAnalysisList: (analysisList) => set({ leadsAnalysisList: analysisList }),

  followupsAnalysisList: null,
  setFollowupsAnalysisList: (analysisList) => set({ followupsAnalysisList: analysisList }),

  userExp: 0,
  userLevel: 1,
  userTitle: "Junior SOHO",
  currentStreak: 0,
  expLogs: [],
  addExp: (amount, reason) => set((state) => {
    let newExp = state.userExp + amount;
    let newLevel = state.userLevel;
    let newTitle = state.userTitle;
    
    while (newExp >= 500) {
      newLevel += 1;
      newExp -= 500;
    }
    
    while (newExp < 0 && newLevel > 1) {
      newLevel -= 1;
      newExp += 500;
    }
    
    if (newExp < 0 && newLevel === 1) {
      newExp = 0;
    }
    
    if (newLevel >= 20) newTitle = "Veteran";
    else if (newLevel >= 10) newTitle = "Trade Master";
    else if (newLevel >= 5) newTitle = "Elite Hunter";
    else newTitle = "Junior SOHO";
    
    const newLog: ExpLog = {
      id: `exp_${Date.now()}`,
      amount,
      reason: reason || 'Task Completed',
      date: new Date().toISOString()
    };
    
    return { userExp: newExp, userLevel: newLevel, userTitle: newTitle, expLogs: [newLog, ...state.expLogs] };
  }),

  clients: INITIAL_CLIENTS,
  deals: [],
  products: [],
  quotes: [],
  documents: [],

  fetchProducts: () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(products => set({ products }))
        .catch(console.error);
    }
  },
  addProduct: (product) => {
    const id = `p${Date.now()}`;
    const newProduct: Product = { ...product, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    set((state) => ({ products: [...state.products, newProduct] }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newProduct)
      }).catch(console.error);
    }
  },
  updateProduct: (id, updates) => {
    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
    }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      }).catch(console.error);
    }
  },
  deleteProduct: (id) => {
    set((state) => ({ products: state.products.filter(p => p.id !== id) }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }
  },

  fetchQuotes: () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/quotes', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(quotes => set({ quotes }))
        .catch(console.error);
    }
  },
  addQuote: (quote) => {
    setTimeout(() => get().addExp(get().expConfig['event_create_quote'] ?? 15, 'Created a quote'), 0);
    const id = `q${Date.now()}`;
    const newQuote: Quote = { ...quote, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    set((state) => ({ quotes: [...state.quotes, newQuote] }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newQuote)
      }).catch(console.error);
    }
  },
  updateQuote: (id, updates) => {
    set((state) => ({
      quotes: state.quotes.map(q => q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q)
    }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      }).catch(console.error);
    }
  },
  deleteQuote: (id) => {
    set((state) => ({ quotes: state.quotes.filter(q => q.id !== id) }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/quotes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }
  },

  fetchDocuments: () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/documents', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(documents => set({ documents }))
        .catch(console.error);
    }
  },
  addDocument: (doc) => {
    const id = `doc${Date.now()}`;
    const newDoc: AppDocument = { ...doc, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    set((state) => ({ documents: [...state.documents, newDoc] }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newDoc)
      }).catch(console.error);
    }
  },
  updateDocument: (id, updates) => {
    set((state) => ({
      documents: state.documents.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)
    }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      }).catch(console.error);
    }
  },
  deleteDocument: (id) => {
    set((state) => ({ documents: state.documents.filter(d => d.id !== id) }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }
  },

  fetchDeals: () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/deals', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(deals => set({ deals }))
        .catch(console.error);
    }
  },

  addDeal: (deal) => {
    setTimeout(() => get().addExp(get().expConfig['event_create_deal'] ?? 20, 'Created a new deal'), 0);
    const id = `d${Date.now()}`;
    const newDeal: Deal = {
      ...deal,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    get().addLog(deal.clientId, `Created new deal: ${deal.name} (Value: ${deal.value})`);
    
    set((state) => ({ deals: [...state.deals, newDeal] }));

    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newDeal)
      }).then(res => {
        if (!res.ok) {
          set((state) => ({ deals: state.deals.filter(d => d.id !== id) }));
        }
      }).catch(console.error);
    }
  },

  updateDeal: (id, updates) => {
    const deal = get().deals.find(d => d.id === id);
    if (!deal) return;

    const statusChanged = updates.status !== undefined && updates.status !== deal.status;
    const previousClient = deal.clientId ? get().clients.find(c => c.id === deal.clientId) : undefined;

    set((state) => ({
      deals: state.deals.map(d => d.id === id ? { ...d, ...updates } : d),
      clients: statusChanged && deal.clientId
        ? state.clients.map(c => c.id === deal.clientId ? { ...c, status: updates.status!, isDormant: false } : c)
        : state.clients
    }));

    const persistUpdate = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const dealRes = await fetch(`/api/deals/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updates)
          });
          if (!dealRes.ok) throw new Error('Deal update failed');

        }

        if (statusChanged) {
          get().addLog(deal.clientId, `Deal "${deal.name}" status updated to: ${updates.status}`);
          if (updates.status === 'Closed Won') {
            get().addExp(get().expConfig['event_win_deal'] ?? 100, 'Won a deal!');
          }
        } else {
          get().addLog(deal.clientId, `Deal "${deal.name}" updated: ${Object.keys(updates).join(', ')}`);
        }
      } catch (err) {
        console.error(err);
        set((state) => ({
          deals: state.deals.map(d => d.id === id ? deal : d),
          clients: previousClient
            ? state.clients.map(c => c.id === previousClient.id ? previousClient : c)
            : state.clients
        }));
        get().notify(statusChanged ? 'Deal status update failed. Please try again.' : 'Deal update failed. Please try again.', 'error');
      }
    };

    void persistUpdate();
  },

  deleteDeal: (id) => {
    const deal = get().deals.find(d => d.id === id);
    if (deal) {
      get().addLog(deal.clientId, `Deleted deal: ${deal.name}`);
    }
    
    set((state) => {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`/api/deals/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(console.error);
      }
      return { deals: state.deals.filter(d => d.id !== id) };
    });
  },

  addClient: async (client) => {
    const id = `c${Date.now()}`;
    const newClient = { ...client, id };
    
    set((state) => ({
      clients: [...state.clients, newClient],
      globalLoading: true
    }));

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newClient)
        });
        const data = await res.json();
        if (res.status === 409 && data.skipped) {
          console.warn('Duplicate contact method found. Lead not added.');
          // rollback
          set((state) => ({
            clients: state.clients.filter(c => c.id !== id)
          }));
          return data.existingId || null;
        } else if (!res.ok) {
          console.error('Failed to add client:', data.error);
          set((state) => ({
            clients: state.clients.filter(c => c.id !== id)
          }));
          return null;
        } else if (res.ok) {
          get().addLog(id, `Created lead: ${client.name}`);
          if (data.pointsAdded) {
            console.log(`Lead added successfully! You earned ${data.pointsAdded} points.`);
            useAuthStore.getState().fetchProfile();
            setTimeout(() => get().addExp(get().expConfig['event_add_client'] ?? 10, 'Added a new client'), 0);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        set({ globalLoading: false });
      }
    } else {
      get().addLog(id, `Created lead: ${client.name}`);
      set({ globalLoading: false });
    }
    
    return id;
  },
  editClient: (id, updates) => {
    get().addLog(id, `Enriched profile / updated client details: ${Object.keys(updates).join(', ')}`);
    set((state) => {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`/api/clients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(updates)
        }).then(res => res.json()).then(data => {
          if (data.pointsAdded) {
            get().notify(
              get().language === 'zh'
                ? `客户资料已更新，获得 ${data.pointsAdded} 积分。`
                : `Client profile updated. You earned ${data.pointsAdded} points.`,
              'success'
            );
            useAuthStore.getState().fetchProfile();
          }
        }).catch(console.error);
      }
      return { clients: state.clients.map(c => c.id === id ? { ...c, ...updates } : c) };
    });
  },
  submitClientEditRequest: (id, requestedData) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/clients/${id}/edit-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(requestedData)
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          get().notify(
            get().language === 'zh'
              ? `修改请求已提交，获得 ${data.pointsAdded || 0} 积分。`
              : `Edit request submitted. You earned ${data.pointsAdded || 0} points.`,
            'success'
          );
          useAuthStore.getState().fetchProfile();
          // We need to fetch the updated state, but we can optimistically set the pendingEditRequest flag
        }
      }).catch(console.error);
    }
    return { clients: state.clients.map(c => c.id === id ? { ...c, pendingEditRequest: true } : c) };
  }),
  deleteClient: async (id) => {
    set({ globalLoading: true });
    
    // Optimistic UI update
    set((state) => ({
      clients: state.clients.filter(c => c.id !== id),
      deals: state.deals.filter(d => d.clientId !== id),
      selectedClientId: state.selectedClientId === id ? null : state.selectedClientId
    }));

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await fetch(`/api/clients/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.permanent && data.softDeleted) {
          get().notify('Client moved to the public pool.', 'success');
        } else if (data.permanent) {
          get().notify('Client deleted permanently.', 'success');
        }
      } catch (err) {
        console.error(err);
      } finally {
        set({ globalLoading: false });
      }
    } else {
      set({ globalLoading: false });
    }
  },
  updateClientStatus: (id, status) => {
    get().addLog(id, `Client status changed to: ${status}`);
    set((state) => {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`/api/clients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ status, isDormant: false })
        }).catch(console.error);
      }
      return { clients: state.clients.map(c => c.id === id ? { ...c, status, isDormant: false } : c) };
    });
  },
  
  publicClients: [],
  fetchPublicClients: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await fetch('/api/public-leads', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const publicClients = await res.json();
          set({ publicClients });
        }
      } catch(e) {
        console.error(e);
      }
    }
  },
  claimClient: async (id) => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ globalLoading: true });
      try {
        const res = await fetch(`/api/public-leads/${id}/claim`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setTimeout(() => get().addExp(get().expConfig['event_claim_lead'] ?? 5, 'Claimed a lead from public pool'), 0);
          
          get().addLog(id, 'Claimed lead from public pool');
          
          // Re-fetch both lists
          get().fetchPublicClients();
          get().fetchDeals(); // Fetch deals so the new deal shows up
          useAuthStore.getState().fetchProfile();
          
          await fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(clients => set({ clients }))
            .catch(console.error);
        } else {
          try {
            const body = await res.json();
            get().notify(body.error || 'Claim failed. Please try again.', 'error');
          } catch(err) {
            get().notify('Claim failed. Please try again.', 'error');
          }
        }
      } catch(e) {
        console.error(e);
      } finally {
        set({ globalLoading: false });
      }
    }
  },
  importPublicLeads: async (leads) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    set({ globalLoading: true });
    try {
      const res = await fetch('/api/public-leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ leads })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.count > 0) {
          setTimeout(() => get().addExp((get().expConfig['event_import_lead'] ?? 2) * data.count, `Imported ${data.count} leads`), 0);
        }
        if (data.pointsAdded > 0) {
          console.log(`Import successful. Added ${data.count} leads. You earned ${data.pointsAdded} points!`);
          useAuthStore.getState().fetchProfile();
        } else {
          console.log(`Import successful. ${data.count} leads added. (Duplicates skipped)`);
        }
        get().fetchPublicClients();
      } else {
        console.error("Import failed. Check permissions.");
      }
    } catch(e) {
      console.error(e);
      get().notify('Could not import public leads. Please check the file and try again.', 'error');
    } finally {
      set({ globalLoading: false });
    }
  },
  
  addComment: (clientId, content, attachments) => set((state) => {
    const newComment: Comment = {
      id: `cmt${Date.now()}`,
      author: state.userTitle,
      content,
      createdAt: new Date().toISOString(),
      attachments,
      replies: []
    };
    
    const token = localStorage.getItem('token');
    const client = state.clients.find(c => c.id === clientId);
    if (client && token) {
      fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ comments: [...(client.comments || []), newComment] })
      }).catch(console.error);
    }
    
    return {
      clients: state.clients.map(c => {
        if (c.id === clientId) {
          return { ...c, comments: [...(c.comments || []), newComment] };
        }
        return c;
      })
    };
  }),

  addReply: (clientId, commentId, content, attachments) => set((state) => {
    const addReplyRecursive = (comments: Comment[], targetId: string, reply: Comment): Comment[] => {
      return comments.map(c => {
        if (c.id === targetId) {
          return { ...c, replies: [...(c.replies || []), reply] };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: addReplyRecursive(c.replies, targetId, reply) };
        }
        return c;
      });
    };

    return {
      clients: state.clients.map(c => {
        if (c.id === clientId) {
          const newReply: Comment = {
            id: `rep${Date.now()}`,
            author: state.userTitle,
            content,
            createdAt: new Date().toISOString(),
            attachments,
            replies: []
          };
          const updatedComments = addReplyRecursive(c.comments || [], commentId, newReply);
          return { ...c, comments: updatedComments };
        }
        return c;
      })
    };
  }),

  logs: INITIAL_LOGS,
  addLog: (clientId, content, relatedEmailId, type = 'general', metadata) => {
    set((state) => {
      const client = state.clients.find(c => c.id === clientId);
      if (client && client.isDormant) {
         setTimeout(() => get().completeQuest('q1'), 0);
      }
      const newLog = { id: `log_${Date.now()}`, clientId, date: new Date().toISOString(), content, relatedEmailId, type, metadata };
      
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newLog)
        }).catch(console.error);
      }
      
      return {
        logs: [newLog, ...state.logs]
      };
    });
  },

  emails: INITIAL_EMAILS,
  addEmail: (email) => {
    const newEmailId = `e${Date.now()}`;
    set((state) => {
      if (email.type === 'sent') {
         setTimeout(() => get().completeQuest('q2'), 0);
      }
      const client = state.clients.find(c => c.id === email.clientId);
      if (client && client.isDormant) {
         setTimeout(() => get().completeQuest('q1'), 0);
      }
      
      setTimeout(() => get().addExp(get().expConfig['event_send_email'] ?? 5, 'Sent an email'), 0);
      
      const newEmail = { ...email, id: newEmailId, date: new Date().toISOString() } as EmailMessage;
      
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newEmail)
        }).catch(console.error);
      }
      
      return {
        emails: [newEmail, ...state.emails]
      };
    });
    return newEmailId;
  },
  editEmail: (id, updates) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/emails/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      }).catch(console.error);
    }
    return { emails: state.emails.map(e => e.id === id ? { ...e, ...updates } : e) };
  }),
  markEmailRead: (id) => set((state) => {
    setTimeout(() => get().addExp(get().expConfig['event_read_email'] ?? 1, 'Read an email'), 0);
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/emails/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ read: true })
      }).catch(console.error);
    }
    return { emails: state.emails.map(e => e.id === id ? { ...e, read: true } : e) };
  }),
  addEmailComment: (emailId, content, attachments) => set((state) => ({
    emails: state.emails.map(e => {
      if (e.id === emailId) {
        const newComment: Comment = {
          id: `cmt${Date.now()}`,
          author: state.userTitle,
          content,
          createdAt: new Date().toISOString(),
          attachments,
          replies: []
        };
        return { ...e, comments: [...(e.comments || []), newComment] };
      }
      return e;
    })
  })),
  addEmailReply: (emailId, commentId, content, attachments) => set((state) => {
    const addReplyRecursive = (comments: Comment[], targetId: string, reply: Comment): Comment[] => {
      return comments.map(c => {
        if (c.id === targetId) {
          return { ...c, replies: [...(c.replies || []), reply] };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: addReplyRecursive(c.replies, targetId, reply) };
        }
        return c;
      });
    };

    return {
      emails: state.emails.map(e => {
        if (e.id === emailId) {
          const newReply: Comment = {
            id: `rep${Date.now()}`,
            author: state.userTitle,
            content,
            createdAt: new Date().toISOString(),
            attachments,
            replies: []
          };
          const updatedComments = addReplyRecursive(e.comments || [], commentId, newReply);
          return { ...e, comments: updatedComments };
        }
        return e;
      })
    };
  }),
  checkScheduledEmails: () => {
    // Relying on backend to process emails. Just trigger a fetch if we suspect changes.
    const state = get();
    const now = Date.now();
    const hasPastScheduled = state.emails.some(e => e.type === 'scheduled' && e.scheduledAt && new Date(e.scheduledAt).getTime() <= now);
    if (hasPastScheduled) {
      get().fetchEmails();
    }
  },
  deleteEmails: async (ids: string[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    set({ globalLoading: true });
    try {
      const res = await fetch('/api/emails/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          emails: state.emails.map(e => {
            if (data.pendingIds && data.pendingIds.includes(e.id)) {
              return { ...e, pendingDelete: true };
            }
            return e;
          }).filter(e => !(data.deletedIds && data.deletedIds.includes(e.id)))
        }));
      } else {
        const data = await res.json().catch(() => ({}));
        get().notify(data.error || 'Failed to delete emails.', 'error');
      }
    } catch(e) {
      console.error('Failed to delete emails', e);
    } finally {
      set({ globalLoading: false });
    }
  },

  selectedClientId: null,
  selectClient: (id) => set({ selectedClientId: id }),
  
  selectedEmailId: null,
  selectEmail: (id) => set({ selectedEmailId: id }),

  dailyQuests: [
    { id: 'q1', title: 'Wake up Dormant Clients', description: 'Contact 1 client inactive for >30 days.', expReward: 50, completed: false },
    { id: 'q2', title: 'First Blood', description: 'Send out the first development email of the day.', expReward: 20, completed: false },
    { id: 'q3', title: 'Follow Up Master', description: 'Complete scheduled follow-ups.', expReward: 80, completed: false }
  ],
  addQuest: (quest) => set((state) => ({
    dailyQuests: [...state.dailyQuests, { ...quest, id: `q${Date.now()}`, completed: false }]
  })),
  completeQuest: (id) => set((state) => {
    const quest = state.dailyQuests.find(q => q.id === id);
    if (quest && !quest.completed) {
      setTimeout(() => state.addExp(quest.expReward, `Completed quest: ${quest.title}`), 0);
      return {
        dailyQuests: state.dailyQuests.map(q => q.id === id ? { ...q, completed: true } : q)
      };
    }
    return state;
  }),
  skipQuest: (id, days) => set((state) => {
    const skipUntil = new Date(Date.now() + days * 86400000).toISOString();
    return {
      dailyQuests: state.dailyQuests.map(q => q.id === id ? { ...q, skippedUntil: skipUntil } : q)
    };
  }),

  achievements: INITIAL_ACHIEVEMENTS,
  checkAchievements: () => set((state) => {
    const { clients, userLevel, emails, logs, dailyQuests, achievements, addExp, addBroadcast } = state;
    
    let changed = false;
    const newAchievements = [...achievements];
    
    const unlock = (id: string) => {
      const index = newAchievements.findIndex(a => a.id === id);
      if (index !== -1 && !newAchievements[index].unlockedAt) {
        newAchievements[index] = { ...newAchievements[index], unlockedAt: Date.now() };
        changed = true;
        
        // Give exp immediately and add a broadcast/notification that can be shown globally
        setTimeout(() => {
          addExp(newAchievements[index].expReward, `Achievement Unlocked: ${newAchievements[index].title}`);
          addBroadcast(`🏆 Achievement Unlocked: ${newAchievements[index].title}`);
        }, 0);
      }
    };

    if (clients.length > 0) unlock('first_client');
    if (clients.length >= 10) unlock('networking');
    
    const countries = new Set(clients.map(c => c.country).filter(Boolean));
    if (countries.size >= 3) unlock('global_reach');
    if (countries.size >= 10) unlock('world_domination');
    
    if (clients.some(c => c.status === 'Closed Won')) unlock('close_deal');
    if (clients.filter(c => c.status === 'Closed Won').length >= 5) unlock('deal_maker');
    if (clients.filter(c => c.status === 'Closed Won').length >= 20) unlock('sales_legend');
    if (clients.filter(c => c.status === 'Sample Sent').length >= 10) unlock('sample_sender');
    if (clients.some(c => (c.contactMethods?.length || 0) >= 3)) unlock('social_butterfly');
    if (clients.some(c => c.tags.length >= 5)) unlock('data_driven');
    
    if (userLevel >= 5) unlock('level_5');
    if (userLevel >= 10) unlock('level_10');
    if (userLevel >= 20) unlock('veteran');
    
    if (state.currentStreak >= 10) unlock('unstoppable');
    
    if (emails.length > 0 && emails.filter(e => !e.read && e.type === 'inbox').length === 0) unlock('inbox_zero');
    
    if (logs.length >= 50) unlock('rich_history');
    
    // Use user configured timezone to determine the correct hour
    const getHourInTimezone = (dateStr: string) => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: state.timezone, hour: 'numeric', hourCycle: 'h23' });
        const hourStr = formatter.format(new Date(dateStr));
        return parseInt(hourStr, 10);
      } catch (e) {
        return new Date(dateStr).getHours();
      }
    };

    const logsAfter10pm = logs.some(l => getHourInTimezone(l.date) >= 22);
    if (logsAfter10pm) unlock('night_owl');
    
    const emailsBefore8am = emails.some(e => getHourInTimezone(e.date) < 8 && e.type === 'sent');
    if (emailsBefore8am) unlock('early_bird');
    
    // Persistent: follow up 5 times with a single client. Just check logs per client.
    const logsPerClient = logs.reduce((acc, l) => {
      acc[l.clientId] = (acc[l.clientId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    if (Object.values(logsPerClient).some(v => v >= 5)) unlock('persistent');
    
    if (dailyQuests.some(q => q.completed)) unlock('quest_master');

    if (changed) {
      return { achievements: newAchievements };
    }
    return state;
  }),

  broadcasts: [
    { id: 'b1', message: '🎉 Sam just closed a Brazil deal! Global 2x EXP for 1hr!' }
  ],
  addBroadcast: (message) => set((state) => ({
    broadcasts: [{ id: Date.now().toString(), message }, ...state.broadcasts].slice(0, 3)
  })),
  notifications: [],
  notify: (message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({
      notifications: [{ id, message, tone }, ...state.notifications].slice(0, 4)
    }));
    window.setTimeout(() => get().removeNotification(id), 4800);
  },
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(notification => notification.id !== id)
  })),
  
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  },
  
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  setTimezone: (timezone) => set({ timezone }),

  outscraperApiKey: localStorage.getItem('outscraperApiKey') || '',
  setOutscraperApiKey: (key) => {
    localStorage.setItem('outscraperApiKey', key);
    set((state) => ({
      outscraperApiKey: key,
      leadDataChannelConfigs: {
        ...state.leadDataChannelConfigs,
        outscraper: {
          ...state.leadDataChannelConfigs.outscraper,
          apiKey: key
        }
      }
    }));
  },

  expConfig: {},
  loadExpConfig: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/settings/public', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const settings = await res.json();
        const expConfig: Record<string, number> = {};
        for(const key in settings) {
          if (key.startsWith('exp_')) {
            expConfig[key.replace('exp_', '')] = Number(settings[key]);
          }
        }
        set({ expConfig });
        
        // update achievements and quests
        set((state) => ({
          achievements: state.achievements.map(a => ({
            ...a,
            expReward: expConfig[`achieve_${a.id}`] ?? a.expReward
          })),
          dailyQuests: state.dailyQuests.map(q => ({
            ...q,
            expReward: expConfig[`quest_${q.id}`] ?? q.expReward
          }))
        }));
      }
    } catch(e) {
      console.error('Failed to load exp config', e);
    }
  },

  fetchUserSettings: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/user/settings', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const settings = await res.json();
        set((state) => ({
          signatures: settings.signatures ?? state.signatures,
          inboxConfigs: settings.inboxConfigs ?? state.inboxConfigs,
          outboxConfigs: settings.outboxConfigs ?? state.outboxConfigs,
          whatsappHubConfig: settings.whatsappHubConfig
            ? { ...INITIAL_WHATSAPP_HUB_CONFIG, ...settings.whatsappHubConfig }
            : state.whatsappHubConfig,
          externalNotificationConfig: settings.externalNotificationConfig
            ? {
                ...INITIAL_EXTERNAL_NOTIFICATION_CONFIG,
                ...settings.externalNotificationConfig,
                events: { ...INITIAL_EXTERNAL_NOTIFICATION_CONFIG.events, ...(settings.externalNotificationConfig.events || {}) }
              }
            : state.externalNotificationConfig,
          agentContextAnalysisConfig: settings.agentContextAnalysisConfig
            ? {
                ...INITIAL_AGENT_CONTEXT_ANALYSIS_CONFIG,
                ...settings.agentContextAnalysisConfig,
                clientModes: settings.agentContextAnalysisConfig.clientModes || {},
                emailModes: settings.agentContextAnalysisConfig.emailModes || {},
                whatsappModes: settings.agentContextAnalysisConfig.whatsappModes || {}
              }
            : state.agentContextAnalysisConfig,
          llmConfigs: settings.llmConfigs ?? state.llmConfigs,
          llmMappings: settings.llmMappings ?? state.llmMappings,
          agentExecutionPolicy: settings.agentExecutionPolicy
            ? { ...INITIAL_AGENT_EXECUTION_POLICY, ...settings.agentExecutionPolicy }
            : state.agentExecutionPolicy,
          agentWorkflows: settings.agentWorkflows ?? state.agentWorkflows,
          agentHubAgents: settings.agentHubAgents
            ? [
                ...INITIAL_AGENT_HUB_AGENTS.filter(defaultAgent => !settings.agentHubAgents.some((agent: AgentHubAgent) => agent.id === defaultAgent.id)),
                ...settings.agentHubAgents.map((agent: AgentHubAgent) => agent.id === 'lead_data_agent'
                  ? {
                      ...agent,
                      contextSuggestionMode: agent.contextSuggestionMode || 'manual',
                      instructions: 'Acquire, import, enrich, deduplicate, and normalize lead data across configured data channels.',
                      tools: ['lead.acquire', 'lead.enrich', 'public_pool.import', 'client.dedupe', 'data.normalize']
                    }
                  : { ...agent, contextSuggestionMode: agent.contextSuggestionMode || 'manual' }
                )
              ]
            : state.agentHubAgents,
          agentRunRecords: settings.agentRunRecords ?? state.agentRunRecords,
          leadCampaigns: settings.leadCampaigns ?? state.leadCampaigns,
          globalAgentPlans: settings.globalAgentPlans ?? state.globalAgentPlans,
          agentHarnessRuns: settings.agentHarnessRuns ?? state.agentHarnessRuns,
          leadDataChannelConfigs: settings.leadDataChannelConfigs
            ? { ...INITIAL_LEAD_DATA_CHANNEL_CONFIGS, ...settings.leadDataChannelConfigs }
            : state.leadDataChannelConfigs,
          outscraperApiKey: settings.outscraperApiKey ?? state.outscraperApiKey,
          activeLLMId: settings.activeLLMId ?? state.activeLLMId,
          language: settings.language ?? state.language,
          theme: settings.theme ?? state.theme,
          timezone: settings.timezone ?? state.timezone
        }));
      }
    } catch(e) {
      console.error('Failed to load user settings', e);
    }
  },

  fetchEmails: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const emailsRes = await fetch('/api/emails', { headers: { 'Authorization': `Bearer ${token}` } });
      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        set({ emails });
      }
    } catch(e) {
      console.error('Failed to fetch emails', e);
    }
  },

  fetchInitialData: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Trigger background fetches for independent modules
    get().fetchUserSettings();
    get().loadExpConfig();
    get().fetchProducts();
    get().fetchQuotes();
    get().fetchDocuments();
    get().fetchPaymentTerms();
    get().fetchKnowledgeBase();
    get().fetchMediaLibrary();
    get().fetchAgentWorkflows();

    try {
      const [clientsRes, logsRes, emailsRes, dealsRes] = await Promise.all([
        fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/logs', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/emails', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/deals', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const clients = clientsRes.ok ? await clientsRes.json() : [];
      const logs = logsRes.ok ? await logsRes.json() : [];
      const emails = emailsRes.ok ? await emailsRes.json() : [];
      const deals = dealsRes.ok ? await dealsRes.json() : [];

      set({ clients, logs, emails, deals });
      // After setting initial data, check achievements once
      get().checkAchievements();
    } catch (e) {
      console.error("Failed to fetch initial data", e);
    }
  }
}));

// Setup automatic achievement checking on state changes
let settingsSaveTimeout: NodeJS.Timeout | null = null;

useStore.subscribe((state, prevState) => {
  if (
    state.clients !== prevState.clients ||
    state.userLevel !== prevState.userLevel ||
    state.emails !== prevState.emails ||
    state.logs !== prevState.logs ||
    state.dailyQuests !== prevState.dailyQuests
  ) {
    state.checkAchievements();
  }

  // Sync user settings on change
  if (
    state.signatures !== prevState.signatures ||
    state.inboxConfigs !== prevState.inboxConfigs ||
    state.outboxConfigs !== prevState.outboxConfigs ||
    state.whatsappHubConfig !== prevState.whatsappHubConfig ||
    state.externalNotificationConfig !== prevState.externalNotificationConfig ||
    state.agentContextAnalysisConfig !== prevState.agentContextAnalysisConfig ||
    state.llmConfigs !== prevState.llmConfigs ||
    state.llmMappings !== prevState.llmMappings ||
    state.agentExecutionPolicy !== prevState.agentExecutionPolicy ||
    state.agentWorkflows !== prevState.agentWorkflows ||
    state.agentHubAgents !== prevState.agentHubAgents ||
    state.agentRunRecords !== prevState.agentRunRecords ||
    state.leadCampaigns !== prevState.leadCampaigns ||
    state.globalAgentPlans !== prevState.globalAgentPlans ||
    state.agentHarnessRuns !== prevState.agentHarnessRuns ||
    state.leadDataChannelConfigs !== prevState.leadDataChannelConfigs ||
    state.outscraperApiKey !== prevState.outscraperApiKey ||
    state.activeLLMId !== prevState.activeLLMId ||
    state.language !== prevState.language ||
    state.theme !== prevState.theme ||
    state.timezone !== prevState.timezone
  ) {
    if (settingsSaveTimeout) {
      clearTimeout(settingsSaveTimeout);
    }
    settingsSaveTimeout = setTimeout(() => {
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/user/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            signatures: state.signatures,
            inboxConfigs: state.inboxConfigs,
            outboxConfigs: state.outboxConfigs,
            whatsappHubConfig: state.whatsappHubConfig,
            externalNotificationConfig: state.externalNotificationConfig,
            agentContextAnalysisConfig: state.agentContextAnalysisConfig,
            llmConfigs: state.llmConfigs,
            llmMappings: state.llmMappings,
            agentExecutionPolicy: state.agentExecutionPolicy,
            agentWorkflows: state.agentWorkflows,
            agentHubAgents: state.agentHubAgents,
            agentRunRecords: state.agentRunRecords,
            leadCampaigns: state.leadCampaigns,
            globalAgentPlans: state.globalAgentPlans,
            agentHarnessRuns: state.agentHarnessRuns,
            leadDataChannelConfigs: state.leadDataChannelConfigs,
            outscraperApiKey: state.outscraperApiKey,
            activeLLMId: state.activeLLMId,
            language: state.language,
            theme: state.theme,
            timezone: state.timezone
          })
        }).catch(console.error);
      }
    }, 1000);
  }
});
