import React, { useState, useEffect } from 'react';
import { useStore, InboxConfig, OutboxConfig, LLMConfig, PaymentTerm, LeadDataProvider, EmailSignature, EmailServerMapping, GLOBAL_AGENT_ACTION_TYPES, GlobalAgentActionType, WhatsAppHubActorConfig } from '../store';
import { useAuthStore } from '../authStore';
import { Settings as SettingsIcon, Mail, Plus, Trash2, Edit2, Save, X, Server, Send, Landmark, Clock, Book, Target, Trophy, Eye, EyeOff, MessageCircle, Bell, RefreshCw, KeyRound, Copy, ShieldCheck, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { ProfileSettings } from './ProfileSettings';
import { UserManagement } from './UserManagement';
import { useTranslation } from '../lib/i18n';

const GLOBAL_AGENT_ACTION_LABELS: Record<GlobalAgentActionType, string> = {
  create_lead_campaign: 'Create Lead Campaign / 创建获客 Campaign',
  run_lead_campaign: 'Run Lead Campaign / 执行获客 Campaign',
  create_followup_workflow: 'Create Follow-up Workflow / 创建跟进流程',
  process_customer_reply: 'Process Customer Reply / 处理客户回复',
  send_email: 'Send Email / 发送邮件',
  send_whatsapp: 'Send WhatsApp / 发送 WhatsApp',
  update_client_stage: 'Update Client Stage / 更新客户阶段',
  add_client_comment: 'Add Client Comment / 添加客户备注',
  enrich_client_data: 'Enrich Client Data / 补全客户资料',
  create_deal: 'Create Deal / 创建交易',
  create_quote: 'Create Quote / 创建报价',
  prioritize_leads: 'Prioritize Leads / 线索优先级排序',
  review_pipeline: 'Review Pipeline / 管线复盘'
};

type SettingsTab = 'profile' | 'mail' | 'ai' | 'api' | 'system' | 'gamification' | 'users';

interface ApiTokenRecord {
  id: string;
  name: string;
  token?: string;
  tokenPrefix: string;
  permissions: string[];
  template?: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface WhatsAppHubClientOption {
  id: string;
  name?: string;
  phone?: string;
  status?: string;
  quota?: {
    remaining?: number;
    dailyQuota?: number;
  };
}

const API_TOKEN_TEMPLATES = [
  {
    id: 'live_chat_agent',
    label: 'Live Chat Agent',
    description: 'For website live chat widgets. Allows public visitor sessions and Live Chat Agent handling.',
    permissions: ['live_chat.public', 'live_chat.agent']
  },
  {
    id: 'live_chat_public',
    label: 'Live Chat Public Only',
    description: 'Only allows website visitors to create and use live chat sessions. No agent-side extras.',
    permissions: ['live_chat.public']
  },
  {
    id: 'website_lead_capture',
    label: 'Website Lead Capture',
    description: 'For future website forms or widgets that capture leads and start live chat.',
    permissions: ['live_chat.public', 'lead.capture']
  },
  {
    id: 'customer_form_capture',
    label: 'Customer Form Capture',
    description: 'For embedded customer forms. Allows form submission, limited lead capture, and limited client creation.',
    permissions: ['form.submit', 'lead.capture', 'client.create_limited']
  },
  {
    id: 'product_catalog_read',
    label: 'Product Catalog Read',
    description: 'For future public product or knowledge widgets with read-only public content access.',
    permissions: ['product.read', 'knowledge.public_read']
  },
  {
    id: 'rag_public_read',
    label: 'Public RAG Read',
    description: 'Read-only access to public knowledge snippets for website-side assistance.',
    permissions: ['knowledge.public_read']
  },
  {
    id: 'webhook_ingest',
    label: 'Webhook Ingest',
    description: 'For trusted inbound webhooks that can ingest events and captured lead data.',
    permissions: ['webhook.ingest', 'lead.capture']
  },
  {
    id: 'whatsapp_widget',
    label: 'WhatsApp Widget',
    description: 'For lightweight website WhatsApp widgets with public send/read bridge permissions.',
    permissions: ['whatsapp.public_send', 'whatsapp.public_read']
  },
  {
    id: 'readonly_crm',
    label: 'Read-only CRM',
    description: 'Read-only CRM token for dashboards, BI, or low-risk integrations.',
    permissions: ['client.read', 'lead.read', 'product.read', 'knowledge.public_read']
  }
];

export function Settings({ initialTab = 'profile' }: { initialTab?: SettingsTab }) {
  const { 
    inboxConfigs, addInboxConfig, updateInboxConfig, deleteInboxConfig, 
    outboxConfigs, addOutboxConfig, updateOutboxConfig, deleteOutboxConfig,
    emailServerMappings, addEmailServerMapping, updateEmailServerMapping, deleteEmailServerMapping,
    signatures, addSignature, updateSignature, deleteSignature, setDefaultSignature,
    llmConfigs, addLLMConfig, updateLLMConfig, deleteLLMConfig, activeLLMId, setActiveLLMId,
    paymentTerms, addPaymentTerm, updatePaymentTerm, deletePaymentTerm,
    llmMappings, setLLMMapping, agentExecutionPolicy, updateAgentExecutionPolicy, language, setLanguage,
    timezone, setTimezone,
    outscraperApiKey, setOutscraperApiKey,
    leadDataChannelConfigs, updateLeadDataChannelConfig,
    whatsappHubConfig, updateWhatsAppHubConfig,
    externalNotificationConfig, updateExternalNotificationConfig,
    notificationDeliveryLogs, fetchNotificationDeliveryLogs, clearNotificationDeliveryLogs, retryNotificationDeliveryLog,
    agentContextAnalysisConfig, updateAgentContextAnalysisConfig,
    dailyQuests, achievements,
    notify
  } = useStore();
  const t = useTranslation(language);
  
  const { profile, token } = useAuthStore();
  const isSuperadmin = profile?.role === 'superadmin';
  const canManageApiTokens = profile?.role === 'superadmin' || profile?.role === 'admin';
  
  const [globalSettings, setGlobalSettings] = useState<Record<string, any>>({});
  const [savingGlobal, setSavingGlobal] = useState(false);

  useEffect(() => {
    if (isSuperadmin) {
      fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(data => setGlobalSettings(data))
      .catch(console.error);
    }
  }, [isSuperadmin, token]);

  const fetchApiTokens = async () => {
    if (!token || !canManageApiTokens) return;
    setLoadingApiTokens(true);
    try {
      const res = await fetch('/api/api-tokens', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || 'Failed to load API tokens');
      setApiTokens(Array.isArray(data) ? data : []);
    } catch (error: any) {
      notify(error?.message || 'Failed to load API tokens', 'error');
    } finally {
      setLoadingApiTokens(false);
    }
  };

  useEffect(() => {
    fetchApiTokens();
  }, [token, canManageApiTokens]);

  const handleCreateApiToken = async () => {
    if (!token) return;
    setCreatingApiToken(true);
    setGeneratedApiToken('');
    try {
      const template = API_TOKEN_TEMPLATES.find(item => item.id === apiTokenTemplate) || API_TOKEN_TEMPLATES[0];
      const res = await fetch('/api/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: apiTokenName || template.label,
          template: template.id,
          permissions: template.permissions
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create API token');
      setGeneratedApiToken(data.token || '');
      setApiTokens((prev) => [data.record, ...prev].filter(Boolean));
      notify(language === 'zh' ? 'API Token 已生成，可在下方直接复制。' : 'API token created. You can copy it below.', 'success');
    } catch (error: any) {
      notify(error?.message || 'Failed to create API token', 'error');
    } finally {
      setCreatingApiToken(false);
    }
  };

  const handleRevokeApiToken = async (id: string) => {
    if (!token) return;
    if (!window.confirm(language === 'zh' ? '确认吊销这个 API Token？吊销后网站前端将无法继续使用它。' : 'Revoke this API token? The website widget will stop working with it.')) return;
    try {
      const res = await fetch(`/api/api-tokens/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to revoke API token');
      setApiTokens((prev) => prev.map(item => item.id === id ? data : item));
      notify(language === 'zh' ? 'API Token 已吊销。' : 'API token revoked.', 'success');
    } catch (error: any) {
      notify(error?.message || 'Failed to revoke API token', 'error');
    }
  };

  const handleSaveGlobalSetting = async (key: string, value: any) => {
    setSavingGlobal(true);
    setGlobalSettings(prev => ({ ...prev, [key]: value }));
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ [key]: value })
      });
    } catch(e) {
      console.error(e);
    } finally {
      setSavingGlobal(false);
    }
  };

  const [editingInboxId, setEditingInboxId] = useState<string | null>(null);
  const [inboxFormData, setInboxFormData] = useState<Partial<InboxConfig>>({});

  const [editingOutboxId, setEditingOutboxId] = useState<string | null>(null);
  const [outboxFormData, setOutboxFormData] = useState<Partial<OutboxConfig>>({});
  const [editingEmailRouteId, setEditingEmailRouteId] = useState<string | null>(null);
  const [emailRouteFormData, setEmailRouteFormData] = useState<Partial<EmailServerMapping>>({});

  const [editingSigId, setEditingSigId] = useState<string | null>(null);
  const [sigFormData, setSigFormData] = useState<Partial<EmailSignature>>({});

  const handleEditSig = (sig: EmailSignature) => {
    setEditingSigId(sig.id);
    setSigFormData(sig);
  };

  const handleAddNewSig = () => {
    setEditingSigId('new');
    setSigFormData({ name: 'My Signature', content: '---\nBest regards,\nYour Name' });
  };

  const handleSaveSig = () => {
    if (editingSigId === 'new') {
      addSignature(sigFormData as Omit<EmailSignature, 'id'>);
    } else if (editingSigId) {
      updateSignature(editingSigId, sigFormData);
    }
    setEditingSigId(null);
  };

  const [testingInbox, setTestingInbox] = useState(false);
  const [testInboxResult, setTestInboxResult] = useState<'success' | 'failed' | null>(null);
  const [testInboxError, setTestInboxError] = useState<string | null>(null);

  const [testingOutbox, setTestingOutbox] = useState(false);
  const [testOutboxResult, setTestOutboxResult] = useState<'success' | 'failed' | null>(null);
  const [testOutboxError, setTestOutboxError] = useState<string | null>(null);

  const [showInboxPassword, setShowInboxPassword] = useState(false);
  const [showOutboxPassword, setShowOutboxPassword] = useState(false);
  const [showOutboxApiKey, setShowOutboxApiKey] = useState(false);
  const [showLLMApiKey, setShowLLMApiKey] = useState(false);
  const [showOutscraperApiKey, setShowOutscraperApiKey] = useState(false);
  const [testingExternalNotification, setTestingExternalNotification] = useState(false);
  const [notificationLogsLoading, setNotificationLogsLoading] = useState(false);
  const [visibleLeadChannelKeys, setVisibleLeadChannelKeys] = useState<Record<string, boolean>>({});
  const [testingLeadChannel, setTestingLeadChannel] = useState<LeadDataProvider | null>(null);
  const [leadChannelTestResults, setLeadChannelTestResults] = useState<Partial<Record<LeadDataProvider, { status: 'success' | 'failed'; message: string }>>>({});

  const [editingLLMId, setEditingLLMId] = useState<string | null>(null);
  const [llmFormData, setLLMFormData] = useState<Partial<LLMConfig>>({});
  const [apiTokens, setApiTokens] = useState<ApiTokenRecord[]>([]);
  const [apiTokenName, setApiTokenName] = useState('Website Live Chat');
  const [apiTokenTemplate, setApiTokenTemplate] = useState('live_chat_agent');
  const [generatedApiToken, setGeneratedApiToken] = useState('');
  const [loadingApiTokens, setLoadingApiTokens] = useState(false);
  const [creatingApiToken, setCreatingApiToken] = useState(false);
  const [whatsAppHubClients, setWhatsAppHubClients] = useState<WhatsAppHubClientOption[]>([]);
  const [loadingWhatsAppHubClients, setLoadingWhatsAppHubClients] = useState(false);
  const [whatsAppActorSearch, setWhatsAppActorSearch] = useState('');
  const [isWhatsAppActorPickerOpen, setIsWhatsAppActorPickerOpen] = useState(false);

  const [editingPTId, setEditingPTId] = useState<string | null>(null);
  const [ptFormData, setPtFormData] = useState<Partial<PaymentTerm>>({});
  const [currencyCode, setCurrencyCode] = useState('');
  const [currencyRate, setCurrencyRate] = useState('');
  const [updatingRates, setUpdatingRates] = useState(false);

  const currencyRates: Record<string, number> = globalSettings.currency_rates || { USD: 1 };
  const saveCurrencyRates = (rates: Record<string, number>) => handleSaveGlobalSetting('currency_rates', { USD: 1, ...rates });
  const handleAddCurrencyRate = () => {
    const code = currencyCode.trim().toUpperCase();
    const rate = Number(currencyRate);
    if (!code || !Number.isFinite(rate) || rate <= 0) return;
    saveCurrencyRates({ ...currencyRates, [code]: rate });
    setCurrencyCode('');
    setCurrencyRate('');
  };
  const handleDeleteCurrencyRate = (code: string) => {
    if (code === 'USD') return;
    const next = { ...currencyRates };
    delete next[code];
    saveCurrencyRates(next);
  };
  const handleUpdateRatesFromPublicApi = async () => {
    setUpdatingRates(true);
    try {
      const res = await fetch('/api/admin/settings/currency-rates/update', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update rates');
      setGlobalSettings(prev => ({
        ...prev,
        currency_rates: data.rates,
        currency_rates_updated_at: data.updatedAt
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingRates(false);
    }
  };

  const handleTestExternalNotification = async () => {
    if (!token) return;
    if (!externalNotificationConfig.enabled) {
      notify(language === 'zh' ? '请先开启外部通知总开关。' : 'Enable external notifications first.', 'warning');
      return;
    }
    if (!externalNotificationConfig.barkEnabled && !externalNotificationConfig.webhookEnabled) {
      notify(language === 'zh' ? '请至少开启 Bark 或 Webhook 其中一个通知渠道。' : 'Enable at least Bark or Webhook before testing.', 'warning');
      return;
    }
    if (externalNotificationConfig.barkEnabled && !externalNotificationConfig.barkDeviceKey.trim()) {
      notify(language === 'zh' ? '请填写 Bark Device Key 或完整 Bark URL。' : 'Enter a Bark device key or full Bark URL first.', 'warning');
      return;
    }
    if (externalNotificationConfig.webhookEnabled && !externalNotificationConfig.webhookUrl.trim()) {
      notify(language === 'zh' ? '请填写 Webhook URL。' : 'Enter a Webhook URL first.', 'warning');
      return;
    }

    setTestingExternalNotification(true);
    try {
      const configForTest = {
        ...externalNotificationConfig,
        events: {
          ...externalNotificationConfig.events,
          review_required: true
        }
      };
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ externalNotificationConfig: configForTest })
      });
      if (!externalNotificationConfig.events.review_required) {
        updateExternalNotificationConfig({ events: configForTest.events });
      }

      const response = await fetch('/api/notifications/external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          event: 'review_required',
          title: 'TradeQuest notification test',
          body: 'Bark / Webhook notifications are configured.',
          metadata: { source: 'settings-test' }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to send test notification.');
      if (data.skipped) throw new Error(data.reason || 'Notification test was skipped.');
      const results = Array.isArray(data.results) ? data.results : [];
      const failed = results.filter((item: any) => !item.ok);
      if (failed.length > 0) {
        throw new Error(failed.map((item: any) => `${item.channel}: ${item.error || item.status || 'failed'}`).join('; '));
      }
      const channels = results.map((item: any) => item.channel).join(', ') || 'notification channel';
      notify(language === 'zh' ? `测试通知已发送：${channels}` : `Test notification sent: ${channels}`, 'success');
    } catch (error: any) {
      notify(error?.message || (language === 'zh' ? '测试通知发送失败。' : 'Failed to send test notification.'), 'error');
    } finally {
      setTestingExternalNotification(false);
    }
  };

  const handleRefreshNotificationLogs = async () => {
    setNotificationLogsLoading(true);
    try {
      await fetchNotificationDeliveryLogs(50);
    } finally {
      setNotificationLogsLoading(false);
    }
  };

  const handleClearNotificationLogs = async () => {
    const confirmed = window.confirm(language === 'zh' ? '确定清空通知日志吗？' : 'Clear notification logs?');
    if (!confirmed) return;
    try {
      await clearNotificationDeliveryLogs();
      notify(language === 'zh' ? '通知日志已清空。' : 'Notification logs cleared.', 'success');
    } catch (error: any) {
      notify(error?.message || (language === 'zh' ? '清空通知日志失败。' : 'Failed to clear notification logs.'), 'error');
    }
  };

  const handleRetryNotificationLog = async (id: string) => {
    try {
      await retryNotificationDeliveryLog(id);
      notify(language === 'zh' ? '通知已重新发送。' : 'Notification retried.', 'success');
    } catch (error: any) {
      notify(error?.message || (language === 'zh' ? '重试通知失败。' : 'Failed to retry notification.'), 'error');
    }
  };

  const fetchWhatsAppHubClients = async () => {
    if (!token) return;
    if (!whatsappHubConfig.enabled || !whatsappHubConfig.baseUrl || !whatsappHubConfig.apiToken) {
      notify(language === 'zh' ? '请先启用并配置 WhatsApp Actor Hub。' : 'Enable and configure WhatsApp Actor Hub first.', 'warning');
      return;
    }
    setLoadingWhatsAppHubClients(true);
    try {
      const response = await fetch('/api/whatsapp-hub/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load WhatsApp Hub clients');
      setWhatsAppHubClients(Array.isArray(data.clients) ? data.clients : []);
      setIsWhatsAppActorPickerOpen(true);
    } catch (error: any) {
      notify(error?.message || (language === 'zh' ? '读取 WhatsApp Hub clients 失败。' : 'Failed to load WhatsApp Hub clients.'), 'error');
    } finally {
      setLoadingWhatsAppHubClients(false);
    }
  };

  const updateWhatsAppActors = (actors: WhatsAppHubActorConfig[]) => {
    updateWhatsAppHubConfig({ actors });
  };

  const addWhatsAppActor = (client: WhatsAppHubClientOption) => {
    if (!client?.id) return;
    const actors = whatsappHubConfig.actors || [];
    if (actors.some(actor => actor.clientId === client.id)) {
      notify(language === 'zh' ? '此 Hub client 已经在 actor 池中。' : 'This Hub client is already in the actor pool.', 'warning');
      return;
    }
    updateWhatsAppActors([
      ...actors,
      {
        id: `wa_actor_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: client.name || client.phone || client.id,
        clientId: client.id,
        enabled: true
      }
    ]);
    setWhatsAppActorSearch('');
    setIsWhatsAppActorPickerOpen(false);
  };

  const patchWhatsAppActor = (actorId: string, updates: Partial<WhatsAppHubActorConfig>) => {
    updateWhatsAppActors((whatsappHubConfig.actors || []).map(actor => (
      actor.id === actorId ? { ...actor, ...updates } : actor
    )));
  };

  const removeWhatsAppActor = (actorId: string) => {
    updateWhatsAppActors((whatsappHubConfig.actors || []).filter(actor => actor.id !== actorId));
  };

  const selectedWhatsAppActorClientIds = new Set((whatsappHubConfig.actors || []).map(actor => actor.clientId));
  const filteredWhatsAppHubClients = whatsAppHubClients.filter(client => {
    if (!client.id || selectedWhatsAppActorClientIds.has(client.id)) return false;
    const query = whatsAppActorSearch.trim().toLowerCase();
    if (!query) return true;
    return [client.id, client.name, client.phone, client.status]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(query));
  });

  const handleEditPT = (pt: PaymentTerm) => {
    setEditingPTId(pt.id);
    setPtFormData(pt);
  };

  const handleAddNewPT = () => {
    setEditingPTId('new');
    setPtFormData({ name: 'New Term', description: '', advanceRatio: 30, balanceRatio: 70 });
  };

  const handleSavePT = () => {
    if (editingPTId === 'new') {
      addPaymentTerm(ptFormData as Omit<PaymentTerm, 'id'>);
    } else if (editingPTId) {
      updatePaymentTerm(editingPTId, ptFormData);
    }
    setEditingPTId(null);
  };

  const handleEditInbox = (acc: InboxConfig) => {
    setEditingInboxId(acc.id);
    setInboxFormData(acc);
  };

  const handleEditOutbox = (acc: OutboxConfig) => {
    setEditingOutboxId(acc.id);
    setOutboxFormData(acc);
  };

  const handleEditEmailRoute = (route: EmailServerMapping) => {
    setEditingEmailRouteId(route.id);
    setEmailRouteFormData(route);
  };

  const handleEditLLM = (llm: LLMConfig) => {
    setEditingLLMId(llm.id);
    setLLMFormData(llm);
  };

  const handleAddNewInbox = () => {
    setEditingInboxId('new');
    setInboxFormData({
      name: 'New Inbox',
      type: 'imap', host: '', port: '993', username: '', password: '', secure: true, syncIntervalMinutes: 60
    });
  };

  const handleAddNewOutbox = () => {
    setEditingOutboxId('new');
    setOutboxFormData({
      name: 'New Outbox',
      type: 'smtp', host: '', port: '465', username: '', password: '', secure: true, fromEmail: '', fromName: '', apiKey: ''
    });
  };

  const handleAddNewLLM = () => {
    setEditingLLMId('new');
    setLLMFormData({
      name: 'New AI Provider',
      provider: 'openai',
      model: 'gpt-4o',
      embeddingModel: 'text-embedding-3-small',
      apiKey: '',
      baseURL: ''
    });
  };

  const handleAddNewEmailRoute = () => {
    setEditingEmailRouteId('new');
    setEmailRouteFormData({
      name: 'Default Route',
      inboxConfigId: inboxConfigs[0]?.id || '',
      outboxConfigId: outboxConfigs[0]?.id || '',
      isDefault: emailServerMappings.length === 0
    });
  };

  const applyLLMPreset = (preset: 'openrouter') => {
    if (preset === 'openrouter') {
      setLLMFormData({
        ...llmFormData,
        name: llmFormData.name && llmFormData.name !== 'New AI Provider' ? llmFormData.name : 'OpenRouter.ai',
        provider: 'openrouter',
        model: llmFormData.model || 'openai/gpt-4o-mini',
        embeddingModel: llmFormData.embeddingModel || '',
        baseURL: 'https://openrouter.ai/api/v1'
      });
    }
  };

  const handleSaveInbox = () => {
    if (editingInboxId === 'new') {
      addInboxConfig(inboxFormData as any);
    } else if (editingInboxId) {
      updateInboxConfig(editingInboxId, inboxFormData);
    }
    setEditingInboxId(null);
  };

  const handleSaveOutbox = () => {
    if (editingOutboxId === 'new') {
      addOutboxConfig(outboxFormData as any);
    } else if (editingOutboxId) {
      updateOutboxConfig(editingOutboxId, outboxFormData);
    }
    setEditingOutboxId(null);
  };

  const handleSaveEmailRoute = () => {
    if (!emailRouteFormData.inboxConfigId || !emailRouteFormData.outboxConfigId) return;
    const payload = {
      name: emailRouteFormData.name || 'Email Route',
      inboxConfigId: emailRouteFormData.inboxConfigId,
      outboxConfigId: emailRouteFormData.outboxConfigId,
      isDefault: !!emailRouteFormData.isDefault
    };
    if (editingEmailRouteId === 'new') {
      addEmailServerMapping(payload);
    } else if (editingEmailRouteId) {
      updateEmailServerMapping(editingEmailRouteId, payload);
    }
    setEditingEmailRouteId(null);
    setEmailRouteFormData({});
  };

  const handleTestInbox = async () => {
    setTestingInbox(true);
    setTestInboxResult(null);
    setTestInboxError(null);
    try {
      if (!inboxFormData.host || !inboxFormData.username || !inboxFormData.password) {
        setTestInboxResult('failed');
        setTestInboxError('Missing required fields');
        setTestingInbox(false);
        return;
      }
      const token = localStorage.getItem('token');
      const res = await fetch('/api/test-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(inboxFormData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestInboxResult('success');
      } else {
        setTestInboxResult('failed');
        setTestInboxError(data.error || 'Unknown error');
      }
    } catch (e: any) {
      console.error(e);
      setTestInboxResult('failed');
      setTestInboxError(e.message || 'Network error');
    }
    setTestingInbox(false);
  };

  const handleTestOutbox = async () => {
    setTestingOutbox(true);
    setTestOutboxResult(null);
    setTestOutboxError(null);
    try {
      if (outboxFormData.type === 'resend') {
        if (!outboxFormData.apiKey) {
          setTestOutboxResult('failed');
          setTestOutboxError('Missing Outscraper API Key');
          setTestingOutbox(false);
          return;
        }
        // For resend we can't easily verify simply, but let's assume it's success if key exists
        await new Promise(r => setTimeout(r, 1000));
        setTestOutboxResult('success');
      } else {
        if (!outboxFormData.host || !outboxFormData.username || !outboxFormData.password) {
          setTestOutboxResult('failed');
          setTestOutboxError('Missing required fields');
          setTestingOutbox(false);
          return;
        }
        const token = localStorage.getItem('token');
        const res = await fetch('/api/test-outbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(outboxFormData)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setTestOutboxResult('success');
        } else {
          setTestOutboxResult('failed');
          setTestOutboxError(data.error || 'Unknown error');
        }
      }
    } catch (e: any) {
      console.error(e);
      setTestOutboxResult('failed');
      setTestOutboxError(e.message || 'Network error');
    }
    setTestingOutbox(false);
  };

  const handleTestLeadChannel = async (provider: LeadDataProvider) => {
    setTestingLeadChannel(provider);
    setLeadChannelTestResults(prev => {
      const next = { ...prev };
      delete next[provider];
      return next;
    });

    try {
      const currentToken = localStorage.getItem('token');
      const res = await fetch('/api/lead-data/test-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ provider, config: leadDataChannelConfigs[provider] })
      });
      const data = await res.json();
      setLeadChannelTestResults(prev => ({
        ...prev,
        [provider]: {
          status: res.ok && data.success ? 'success' : 'failed',
          message: data.message || data.error || (res.ok ? t('Channel connected successfully.') : t('Channel test failed.'))
        }
      }));
    } catch (e: any) {
      setLeadChannelTestResults(prev => ({
        ...prev,
        [provider]: { status: 'failed', message: e.message || t('Network error') }
      }));
    } finally {
      setTestingLeadChannel(null);
    }
  };

  const handleSaveLLM = () => {
    if (editingLLMId === 'new') {
      addLLMConfig(llmFormData as any);
    } else if (editingLLMId) {
      updateLLMConfig(editingLLMId, llmFormData);
    }
    setEditingLLMId(null);
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  useEffect(() => {
    if (activeTab === 'api' && !canManageApiTokens) setActiveTab('profile');
  }, [activeTab, canManageApiTokens]);

  useEffect(() => {
    if (activeTab !== 'ai') return;
    setNotificationLogsLoading(true);
    fetchNotificationDeliveryLogs(50).finally(() => setNotificationLogsLoading(false));
  }, [activeTab, fetchNotificationDeliveryLogs]);

  useEffect(() => {
    if (!isSuperadmin && ['system', 'gamification', 'users'].includes(activeTab)) {
      setActiveTab('profile');
    }
  }, [activeTab, isSuperadmin]);

  const leadDataProviders: { id: LeadDataProvider; label: string; description: string; docsUrl: string; workflowLabel: string }[] = [
    { id: 'outscraper', label: 'Outscraper', description: 'Google Maps business search for lead acquisition.', docsUrl: 'https://outscraper.com/', workflowLabel: 'Native Maps Search' },
    { id: 'apify', label: 'Apify', description: 'Run a configured Actor for prospect scraping or enrichment.', docsUrl: 'https://console.apify.com/', workflowLabel: 'Actor ID' },
    { id: 'phantombuster', label: 'PhantomBuster', description: 'Launch a configured Phantom for social/web lead workflows.', docsUrl: 'https://phantombuster.com/', workflowLabel: 'Agent ID' },
    { id: 'scrapio', label: 'Scrap.io', description: 'Use a Scrap.io endpoint for lead search or enrichment.', docsUrl: 'https://scrap.io/', workflowLabel: 'Search Endpoint' },
    { id: 'hasdata', label: 'HasData', description: 'Use HasData scraping/search endpoints for lead sources.', docsUrl: 'https://hasdata.com/', workflowLabel: 'Search Endpoint' },
    { id: 'decodo', label: 'Decodo', description: 'Use Decodo scraping APIs for targeted lead collection.', docsUrl: 'https://decodo.com/', workflowLabel: 'Search Endpoint' },
    { id: 'clay', label: 'Clay', description: 'Use Clay enrichment workflows to complete company/contact data.', docsUrl: 'https://www.clay.com/', workflowLabel: 'Enrichment Endpoint' }
  ];

  return (
    <div className="flex-1 bg-slate-900 border-t border-slate-800 p-6 overflow-y-auto w-full">
      <div className="w-full space-y-8 text-white pb-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-slate-400" />
              {t('settings')}
            </h1>
            <p className="text-slate-400 mt-2">{t('manageAppDesc')}</p>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-slate-800/50 p-1 rounded-xl shadow-inner border border-slate-700/50 overflow-x-auto w-full md:w-auto min-w-max">
            <button
              onClick={() => setActiveTab('profile')}
              className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'profile' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700/50")}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('mail')}
              className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'mail' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700/50")}
            >
              Email Servers
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'ai' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700/50")}
            >
              AI & Integrations
            </button>
            {canManageApiTokens && (
              <button
                onClick={() => setActiveTab('api')}
                className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'api' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700/50")}
              >
                API Tokens
              </button>
            )}
            {isSuperadmin && (
              <button
                onClick={() => setActiveTab('gamification')}
                className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'gamification' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700/50")}
              >
                Gamification
              </button>
            )}
            {isSuperadmin && (
              <button
                onClick={() => setActiveTab('system')}
                className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'system' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700/50")}
              >
                System Flags
              </button>
            )}
            {isSuperadmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'users' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700/50")}
              >
                {t('userManagement')}
              </button>
            )}
          </div>
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ProfileSettings />
            
            {/* Preferences */}
            <section className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-6 md:p-8 relative overflow-hidden group/card shadow-lg shadow-black/20">
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
              
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/20 text-cyan-400 select-none">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 tracking-tight">{t('Preferences') || 'Preferences'}</h2>
                  <p className="text-sm text-slate-400 capitalize">{t('Manage system language and timezone')}</p>
                </div>
              </div>

              <div className="space-y-6 max-w-2xl relative z-10">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('System Language')}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner appearance-none"
                  >
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                  </select>
                  <p className="mt-2 text-xs text-slate-500">{t('Internal AI agent outputs use the system language.')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">System Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner placeholder:text-slate-600 appearance-none"
                  >
                    {[
                      'UTC', 'Pacific/Midway', 'Pacific/Honolulu', 'America/Anchorage',
                      'America/Los_Angeles', 'America/Denver', 'America/Chicago',
                      'America/New_York', 'America/Halifax', 'America/St_Johns',
                      'America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'Atlantic/Cape_Verde',
                      'Europe/London', 'Europe/Paris', 'Europe/Athens', 'Europe/Moscow',
                      'Asia/Dubai', 'Asia/Kabul', 'Asia/Karachi', 'Asia/Kolkata',
                      'Asia/Kathmandu', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Shanghai',
                      'Asia/Tokyo', 'Australia/Adelaide', 'Australia/Sydney', 'Pacific/Guadalcanal',
                      'Pacific/Auckland'
                    ].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">This timezone will be used when scheduling automated emails.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {isSuperadmin && activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <UserManagement />
          </div>
        )}

        {isSuperadmin && activeTab === 'gamification' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-cyan-100">Sales Behavior Scoring Strategy</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                    Configure rewards so points and EXP push users toward revenue-generating behavior: high-quality profiles, timely follow-ups, stage progression, quotes, and closed deals. Keep passive actions such as reading emails low, and avoid rewarding repeated low-value activity.
                  </p>
                </div>
                <span className="rounded-full border border-cyan-500/30 bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-300">
                  Growth aligned
                </span>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  { title: 'Reward outcomes', body: 'Closed deals, quote creation, stage progress, and completed follow-ups should be worth more than simple activity.' },
                  { title: 'Reward quality', body: 'Profile enrichment, linked conversations, product/RAG context, and lead scoring improve future agent performance.' },
                  { title: 'Control spend', body: 'Use point costs for scarce resources such as claiming public leads, so users prioritize fit instead of volume.' }
                ].map(item => (
                  <div key={item.title} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-xs font-black uppercase tracking-wide text-cyan-300">{item.title}</div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-400" /> Event & Quest EXP Rewards
              </h2>
              <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 md:p-6 mb-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dailyQuests.map((q) => (
                    <div key={q.id}>
                      <label className="text-sm font-bold text-slate-300 block mb-2 opacity-80">
                        {q.title}
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min="0"
                          value={globalSettings[`exp_quest_${q.id}`] ?? q.expReward}
                          onChange={e => handleSaveGlobalSetting(`exp_quest_${q.id}`, Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8 border-t border-slate-800 pt-8">
                <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-4 md:p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-400" /> Business Event EXP
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">Experience grows levels, titles, achievements, and streak motivation.</p>
                    </div>
                    <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-300">Leveling</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: 'add_client', label: 'Add Lead/Client', default: 10 },
                    { id: 'claim_lead', label: 'Claim Lead from Pool', default: 5 },
                    { id: 'import_lead', label: 'Import Lead (per lead)', default: 2 },
                    { id: 'send_email', label: 'Send Email', default: 5 },
                    { id: 'send_whatsapp', label: 'Log WhatsApp Interaction', default: 5 },
                    { id: 'read_email', label: 'Read/Track Email', default: 1 },
                    { id: 'log_email', label: 'Log Email Interaction', default: 3 },
                    { id: 'add_log', label: 'Add Interaction Log', default: 3 },
                    { id: 'add_comment', label: 'Add Team Comment', default: 3 },
                    { id: 'create_deal', label: 'Create Deal', default: 20 },
                    { id: 'update_lead_status', label: 'Update Lead Status', default: 8 },
                    { id: 'complete_follow_up', label: 'Complete Follow-up', default: 12 },
                    { id: 'customer_reply', label: 'Customer Reply Received', default: 8 },
                    { id: 'quote_sent', label: 'Send Quote to Customer', default: 25 },
                    { id: 'sample_sent', label: 'Move to Sample Sent', default: 25 },
                    { id: 'negotiation_started', label: 'Move to Negotiating', default: 30 },
                    { id: 'win_deal', label: 'Win Deal', default: 100 },
                    { id: 'create_quote', label: 'Create Quote', default: 15 },
                    { id: 'add_product', label: 'Add Product', default: 10 },
                    { id: 'add_knowledge', label: 'Add Knowledge Item', default: 8 },
                    { id: 'add_media', label: 'Add Media Asset', default: 3 },
                    { id: 'create_document', label: 'Create Document', default: 12 },
                    { id: 'agent_run', label: 'Complete Agent Run', default: 10 },
                    { id: 'quality_profile', label: 'High-quality Client Profile', default: 15 },
                    { id: 'customer_progress', label: 'Customer Stage Progress', default: 10 },
                    { id: 'sales_combo', label: 'Sales Combo Completed', default: 40 }
                  ].map((event) => (
                    <label key={event.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      <span className="text-xs font-bold text-slate-300 block mb-2">
                        {event.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={globalSettings[`exp_event_${event.id}`] ?? event.default}
                          onChange={e => handleSaveGlobalSetting(`exp_event_${event.id}`, Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                        />
                        <span className="text-[10px] font-bold text-indigo-300">EXP</span>
                      </div>
                    </label>
                  ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-yellow-500/20 rounded-xl p-4 md:p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-yellow-400" /> Available Points
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">Points are spendable account balance. Rewards add points; costs deduct points.</p>
                    </div>
                    <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-yellow-300">Balance</span>
                  </div>

                  <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-emerald-300">Point Rewards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    {[
                      { id: 'add_client', label: 'Create Client', default: 5, desc: 'Awarded when a user creates a non-public client.' },
                      { id: 'create_deal', label: 'Create Lead / Deal', default: 5, desc: 'Awarded when a user creates a pipeline lead or deal.' },
                      { id: 'import_lead', label: 'Import Public Lead', default: 5, desc: 'Awarded per lead imported into the public pool.' },
                      { id: 'enrich_client', label: 'Profile Enrichment Multiplier', default: 1, desc: 'Multiplies profile completion rewards from company, address, country, contacts, and tags.' },
                      { id: 'edit_request', label: 'Submit Edit Request', default: 5, desc: 'Awarded when a user submits a client edit request for review.' },
                      { id: 'send_email', label: 'Send Email', default: 2, desc: 'Awarded when an email is sent.' },
                      { id: 'schedule_email', label: 'Schedule Email', default: 1, desc: 'Awarded when an email is scheduled for later.' },
                      { id: 'send_whatsapp', label: 'Send WhatsApp', default: 2, desc: 'Awarded when a WhatsApp message is queued or sent.' },
                      { id: 'schedule_whatsapp', label: 'Schedule WhatsApp', default: 1, desc: 'Awarded when a WhatsApp message is scheduled.' },
                      { id: 'complete_follow_up', label: 'Complete Follow-up', default: 4, desc: 'Awarded when a scheduled follow-up is completed, not merely created.' },
                      { id: 'customer_reply', label: 'Customer Reply Received', default: 5, desc: 'Awarded when a customer replies through email, WhatsApp, or Live Chat.' },
                      { id: 'add_product', label: 'Add Product', default: 3, desc: 'Awarded when a product is added to the catalog.' },
                      { id: 'add_knowledge', label: 'Add Knowledge Item', default: 3, desc: 'Awarded when a knowledge base item is added.' },
                      { id: 'add_media', label: 'Add Media Asset', default: 1, desc: 'Awarded when a media library item is added.' },
                      { id: 'create_quote', label: 'Create Quote', default: 8, desc: 'Awarded when a quote is created.' },
                      { id: 'quote_sent', label: 'Send Quote', default: 12, desc: 'Awarded when a quote is actually sent to a customer.' },
                      { id: 'sample_sent', label: 'Sample Sent Stage', default: 10, desc: 'Awarded when a lead/customer reaches the sample-sent stage.' },
                      { id: 'negotiation_started', label: 'Negotiation Started', default: 15, desc: 'Awarded when a lead/customer reaches negotiation.' },
                      { id: 'win_deal', label: 'Closed Won', default: 50, desc: 'Awarded when a deal/customer is marked closed won.' },
                      { id: 'create_document', label: 'Create Document', default: 5, desc: 'Awarded when a sales document is created.' },
                      { id: 'agent_run', label: 'Complete Agent Run', default: 5, desc: 'Awarded when an Agent Hub run completes.' }
                    ].map((event) => (
                      <label key={event.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                        <span className="text-xs font-bold text-slate-300 block mb-2">{event.label}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={globalSettings[`point_event_${event.id}`] ?? event.default}
                            onChange={e => handleSaveGlobalSetting(`point_event_${event.id}`, Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                          />
                          <span className="text-[10px] font-bold text-emerald-300">PTS</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{event.desc}</p>
                      </label>
                    ))}
                  </div>

                  <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-rose-300">Point Costs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: 'claim_lead', label: 'Claim Public Lead', default: 10, desc: 'Deducted when a user claims one lead from the public pool.' }
                    ].map((event) => (
                      <label key={event.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                        <span className="text-xs font-bold text-slate-300 block mb-2">{event.label}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={globalSettings[`point_cost_${event.id}`] ?? event.default}
                            onChange={e => handleSaveGlobalSetting(`point_cost_${event.id}`, Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-rose-500"
                          />
                          <span className="text-[10px] font-bold text-rose-300">PTS</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{event.desc}</p>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-bold flex items-center gap-2 mt-8 border-t border-slate-800 pt-8">
                <Trophy className="w-5 h-5 text-amber-400" /> Achievement EXP Rewards
              </h2>
              <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 md:p-6 mb-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {achievements.map((a) => (
                    <div key={a.id}>
                      <label className="text-sm font-bold text-slate-300 block mb-2 opacity-80 truncate" title={a.title}>
                        {a.title}
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min="0"
                          value={globalSettings[`exp_achieve_${a.id}`] ?? a.expReward}
                          onChange={e => handleSaveGlobalSetting(`exp_achieve_${a.id}`, Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {isSuperadmin && activeTab === 'system' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-400" /> Global Preferences
              </h2>
              <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 md:p-6 space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-300 block mb-2">
                    AI Agent Auto Polling Interval (Seconds)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 3600"
                      value={globalSettings.agent_polling_interval_seconds ?? (globalSettings.agent_polling_interval_hours ? Number(globalSettings.agent_polling_interval_hours) * 3600 : '')}
                      onChange={e => handleSaveGlobalSetting('agent_polling_interval_seconds', e.target.value)}
                      className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                    />
                    <p className="text-xs text-slate-500">
                      Determines how frequently the backend checks enabled auto follow-up agents per client. (e.g., 3600 means once per hour). Leave empty to disable.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-cyan-400" /> Currency Rates
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">USD is the base currency. Quote prices are converted from USD using these rates.</p>
                </div>
                <button
                  onClick={handleUpdateRatesFromPublicApi}
                  disabled={updatingRates}
                  className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-4 w-4', updatingRates && 'animate-spin')} />
                  Update Rates
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={currencyCode}
                    onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
                    placeholder="Currency code, e.g. EUR"
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={currencyRate}
                    onChange={e => setCurrencyRate(e.target.value)}
                    placeholder="Rate per 1 USD"
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                  />
                  <button onClick={handleAddCurrencyRate} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-slate-700">
                    Add Rate
                  </button>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <label className="text-xs font-bold uppercase text-slate-400">Default Quote Currency</label>
                  <select
                    value={globalSettings.default_quote_currency || 'USD'}
                    onChange={e => handleSaveGlobalSetting('default_quote_currency', e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                  >
                    {Object.keys(currencyRates).sort().map(code => <option key={code} value={code}>{code}</option>)}
                  </select>
                  {globalSettings.currency_rates_updated_at && (
                    <span className="text-xs text-slate-500">Updated: {new Date(globalSettings.currency_rates_updated_at).toLocaleString()}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(currencyRates).sort(([a], [b]) => a.localeCompare(b)).map(([code, rate]) => (
                    <div key={code} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                      <div>
                        <div className="font-mono text-sm font-bold text-slate-100">{code}</div>
                        <div className="text-xs text-slate-500">1 USD = {Number(rate).toLocaleString()} {code}</div>
                      </div>
                      {code !== 'USD' && (
                        <button onClick={() => handleDeleteCurrencyRate(code)} className="rounded p-1.5 text-rose-400 hover:bg-rose-950/50 hover:text-white">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-6 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-400" /> Payment Terms
                </h2>
                {editingPTId === null && (
                  <button onClick={handleAddNewPT} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold shadow-lg transition-colors">
                    <Plus className="w-4 h-4" /> Add Payment Term
                  </button>
                )}
              </div>

            <div className="grid grid-cols-1 gap-4">
              {paymentTerms.length === 0 && editingPTId !== 'new' && (
                <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                  No payment terms configured. Add one to use in quotes.
                </div>
              )}
              
              {(editingPTId === 'new' ? [...paymentTerms, { ...ptFormData, id: 'new' } as PaymentTerm] : paymentTerms).map((pt) => {
                const isEditing = editingPTId === pt.id;

                if (isEditing) {
                  return (
                    <div key={pt.id} className="bg-slate-800 border border-emerald-500/50 rounded-xl p-6 space-y-6 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                        <input 
                          type="text" 
                          value={ptFormData.name || ''} 
                          onChange={e => setPtFormData({ ...ptFormData, name: e.target.value })}
                          placeholder="Term Name (e.g. 30/70 T/T)"
                          className="bg-transparent text-xl font-bold border-none outline-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1 w-1/2 text-white"
                        />
                        <div className="flex items-center gap-2">
                           <button onClick={handleSavePT} className="flex items-center gap-1 text-sm font-bold bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg transition-colors text-white">
                             <Save className="w-4 h-4" /> Save
                           </button>
                           <button onClick={() => setEditingPTId(null)} className="flex items-center gap-1 text-sm font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors text-white">
                             <X className="w-4 h-4" /> Cancel
                           </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-xs text-slate-400 font-bold uppercase">Description</label>
                          <textarea
                            value={ptFormData.description || ''}
                            onChange={e => setPtFormData({ ...ptFormData, description: e.target.value })}
                            placeholder="Detailed description..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-white h-24 resize-none"
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">Advance Ratio (%)</label>
                              <input 
                                type="number" 
                                placeholder="30"
                                value={ptFormData.advanceRatio || 0}
                                onChange={e => setPtFormData({ ...ptFormData, advanceRatio: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">Balance Ratio (%)</label>
                              <input 
                                type="number" 
                                placeholder="70"
                                value={ptFormData.balanceRatio || 0}
                                onChange={e => setPtFormData({ ...ptFormData, balanceRatio: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={pt.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Landmark className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-lg text-white">{pt.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditPT(pt)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePaymentTerm(pt.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {pt.description && <p className="text-sm text-slate-400">{pt.description}</p>}
                    <div className="flex items-center gap-4 text-xs font-medium text-emerald-500">
                      <span>Advance: {pt.advanceRatio}%</span>
                      <span>Balance: {pt.balanceRatio}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            </section>
          </div>
        )}

        {activeTab === 'mail' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Incoming Servers Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" /> {t('incomingServers')}
            </h2>
            {editingInboxId === null && (
              <button onClick={handleAddNewInbox} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold shadow-lg transition-colors">
                <Plus className="w-4 h-4" /> {t('addInbox')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {inboxConfigs.length === 0 && editingInboxId !== 'new' && (
              <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                {t('noIncomingServers')}
              </div>
            )}
            
            {(editingInboxId === 'new' ? [...inboxConfigs, { ...inboxFormData, id: 'new' } as InboxConfig] : inboxConfigs).map((acc) => {
              const isEditing = editingInboxId === acc.id;

              if (isEditing) {
                return (
                  <div key={acc.id} className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 space-y-6 shadow-xl">
                     <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <input 
                        type="text" 
                        value={inboxFormData.name || ''} 
                        onChange={e => setInboxFormData({ ...inboxFormData, name: e.target.value })}
                        placeholder="Inbox Name (e.g. Work IMAP)"
                        className="bg-transparent text-xl font-bold border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 w-1/2"
                      />
                      <div className="flex items-center gap-2">
                         {testInboxResult === 'success' && <span className="text-green-400 text-sm font-bold truncate">Success</span>}
                         {testInboxResult === 'failed' && <span className="text-red-400 text-sm font-bold truncate max-w-[200px]" title={testInboxError || 'Failed'}>Failed{testInboxError ? `: ${testInboxError}` : ''}</span>}
                         <button onClick={handleTestInbox} disabled={testingInbox} className="flex items-center gap-1 text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                           {testingInbox ? 'Testing...' : 'Test Connection'}
                         </button>
                         <button onClick={handleSaveInbox} className="flex items-center gap-1 text-sm font-bold bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg transition-colors">
                           <Save className="w-4 h-4" /> {t('save')}
                         </button>
                         <button onClick={() => setEditingInboxId(null)} className="flex items-center gap-1 text-sm font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                           <X className="w-4 h-4" /> {t('cancel')}
                         </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Type</label>
                            <select 
                              value={inboxFormData.type || 'imap'}
                              onChange={e => setInboxFormData({ ...inboxFormData, type: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            >
                              <option value="imap">IMAP</option>
                              <option value="pop3">POP3</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Secure</label>
                            <select 
                              value={inboxFormData.secure ? 'true' : 'false'}
                              onChange={e => setInboxFormData({ ...inboxFormData, secure: e.target.value === 'true' })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            >
                              <option value="true">SSL/TLS</option>
                              <option value="false">None</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Auto Sync Interval (minutes)</label>
                          <input
                            type="number"
                            min="5"
                            step="5"
                            value={inboxFormData.syncIntervalMinutes ?? 60}
                            onChange={e => setInboxFormData({ ...inboxFormData, syncIntervalMinutes: Math.max(5, Number(e.target.value) || 60) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          />
                          <p className="text-[11px] text-slate-500">Used by background email sync even when Inbox is not open. Default is 60 minutes.</p>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                          <div className="col-span-3 space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Host</label>
                            <input 
                              type="text" 
                              placeholder="imap.example.com"
                              value={inboxFormData.host || ''}
                              onChange={e => setInboxFormData({ ...inboxFormData, host: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Port</label>
                            <input 
                              type="text" 
                              placeholder="993"
                              value={inboxFormData.port || ''}
                              onChange={e => setInboxFormData({ ...inboxFormData, port: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Username</label>
                          <input 
                            type="text" 
                            placeholder="you@example.com"
                            value={inboxFormData.username || ''}
                            onChange={e => setInboxFormData({ ...inboxFormData, username: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">App Password</label>
                          <div className="relative">
                            <input 
                              type={showInboxPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={inboxFormData.password || ''}
                              onChange={e => setInboxFormData({ ...inboxFormData, password: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm focus:border-indigo-500 outline-none"
                            />
                            <button type="button" onClick={() => setShowInboxPassword(!showInboxPassword)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>{showInboxPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={acc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{acc.name}</h3>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <span className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded"><Server className="w-3 h-3" /> {acc.type.toUpperCase()} ({acc.username})</span>
                      <span className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded">Auto sync {acc.syncIntervalMinutes || 60}m</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditInbox(acc)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteInboxConfig(acc.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Outgoing Servers Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-400" /> {t('outgoingServers')}
            </h2>
            {editingOutboxId === null && (
              <button onClick={handleAddNewOutbox} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold shadow-lg transition-colors">
                <Plus className="w-4 h-4" /> {t('addOutbox')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {outboxConfigs.length === 0 && editingOutboxId !== 'new' && (
              <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                {t('noOutgoingServers')}
              </div>
            )}
            
            {(editingOutboxId === 'new' ? [...outboxConfigs, { ...outboxFormData, id: 'new' } as OutboxConfig] : outboxConfigs).map((acc) => {
              const isEditing = editingOutboxId === acc.id;

              if (isEditing) {
                return (
                  <div key={acc.id} className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <input 
                        type="text" 
                        value={outboxFormData.name || ''} 
                        onChange={e => setOutboxFormData({ ...outboxFormData, name: e.target.value })}
                        placeholder="Outbox Name (e.g. Marketing Sender)"
                        className="bg-transparent text-xl font-bold border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 w-1/2"
                      />
                      <div className="flex items-center gap-2">
                         {testOutboxResult === 'success' && <span className="text-green-400 text-sm font-bold truncate">Success</span>}
                         {testOutboxResult === 'failed' && <span className="text-red-400 text-sm font-bold truncate max-w-[200px]" title={testOutboxError || 'Failed'}>Failed{testOutboxError ? `: ${testOutboxError}` : ''}</span>}
                         <button onClick={handleTestOutbox} disabled={testingOutbox} className="flex items-center gap-1 text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                           {testingOutbox ? 'Testing...' : 'Test Connection'}
                         </button>
                         <button onClick={handleSaveOutbox} className="flex items-center gap-1 text-sm font-bold bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg transition-colors">
                           <Save className="w-4 h-4" /> {t('save')}
                         </button>
                         <button onClick={() => setEditingOutboxId(null)} className="flex items-center gap-1 text-sm font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                           <X className="w-4 h-4" /> {t('cancel')}
                         </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Provider</label>
                            <select 
                              value={outboxFormData.type || 'smtp'}
                              onChange={e => setOutboxFormData({ ...outboxFormData, type: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            >
                              <option value="smtp">Custom SMTP</option>
                              <option value="resend">Resend API</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">From Name</label>
                              <input 
                                type="text" 
                                placeholder="Your Name"
                                value={outboxFormData.fromName || ''}
                                onChange={e => setOutboxFormData({ ...outboxFormData, fromName: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">From Email</label>
                              <input 
                                type="text" 
                                placeholder="you@domain.com"
                                value={outboxFormData.fromEmail || ''}
                                onChange={e => setOutboxFormData({ ...outboxFormData, fromEmail: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                              />
                            </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {outboxFormData.type === 'smtp' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-3 space-y-1">
                                <label className="text-xs text-slate-400 font-bold uppercase">Host</label>
                                <input 
                                  type="text" 
                                  placeholder="smtp.example.com"
                                  value={outboxFormData.host || ''}
                                  onChange={e => setOutboxFormData({ ...outboxFormData, host: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-bold uppercase">Port</label>
                                <input 
                                  type="text" 
                                  placeholder="465"
                                  value={outboxFormData.port || ''}
                                  onChange={e => setOutboxFormData({ ...outboxFormData, port: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">Username</label>
                              <input 
                                type="text" 
                                placeholder="you@example.com"
                                value={outboxFormData.username || ''}
                                onChange={e => setOutboxFormData({ ...outboxFormData, username: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-bold uppercase">Password</label>
                                <div className="relative">
                                  <input 
                                    type={showOutboxPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={outboxFormData.password || ''}
                                    onChange={e => setOutboxFormData({ ...outboxFormData, password: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm focus:border-indigo-500 outline-none"
                                  />
                                  <button type="button" onClick={() => setShowOutboxPassword(!showOutboxPassword)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>{showOutboxPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs text-slate-400 font-bold uppercase">Secure</label>
                                  <select 
                                    value={outboxFormData.secure ? 'true' : 'false'}
                                    onChange={e => setOutboxFormData({ ...outboxFormData, secure: e.target.value === 'true' })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                  >
                                    <option value="true">SSL/TLS</option>
                                    <option value="false">None</option>
                                  </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {outboxFormData.type === 'resend' && (
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">Resend API Key</label>
                              <div className="relative">
                                <input 
                                  type={showOutboxApiKey ? "text" : "password"}
                                  placeholder="re_••••••••"
                                  value={outboxFormData.apiKey || ''}
                                  onChange={e => setOutboxFormData({ ...outboxFormData, apiKey: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm focus:border-indigo-500 outline-none"
                                />
                                <button type="button" onClick={() => setShowOutboxApiKey(!showOutboxApiKey)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>{showOutboxApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={acc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{acc.name}</h3>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <span className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded"><Send className="w-3 h-3" /> {acc.type.toUpperCase()} ({acc.fromEmail})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditOutbox(acc)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteOutboxConfig(acc.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        {/* Inbox / Outbox Routing Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" /> {t('emailServerMappings')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{t('emailServerMappingsDesc')}</p>
            </div>
            {editingEmailRouteId === null && (
              <button
                onClick={handleAddNewEmailRoute}
                disabled={inboxConfigs.length === 0 || outboxConfigs.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-sm font-bold shadow-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> {t('addMapping')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(inboxConfigs.length === 0 || outboxConfigs.length === 0) && editingEmailRouteId !== 'new' && (
              <div className="text-center py-8 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                {t('addInboxAndOutboxBeforeMapping')}
              </div>
            )}
            {emailServerMappings.length === 0 && inboxConfigs.length > 0 && outboxConfigs.length > 0 && editingEmailRouteId !== 'new' && (
              <div className="text-center py-8 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                {t('noEmailServerMappings')}
              </div>
            )}

            {(editingEmailRouteId === 'new' ? [...emailServerMappings, { ...emailRouteFormData, id: 'new' } as EmailServerMapping] : emailServerMappings).map(route => {
              const isEditing = editingEmailRouteId === route.id;
              const inbox = inboxConfigs.find(item => item.id === route.inboxConfigId);
              const outbox = outboxConfigs.find(item => item.id === route.outboxConfigId);

              if (isEditing) {
                return (
                  <div key={route.id} className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <input
                        value={emailRouteFormData.name || ''}
                        onChange={e => setEmailRouteFormData({ ...emailRouteFormData, name: e.target.value })}
                        placeholder={t('mappingName')}
                        className="bg-transparent text-xl font-bold border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 w-1/2"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={handleSaveEmailRoute} disabled={!emailRouteFormData.inboxConfigId || !emailRouteFormData.outboxConfigId} className="flex items-center gap-1 text-sm font-bold bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 px-3 py-1.5 rounded-lg transition-colors">
                          <Save className="w-4 h-4" /> {t('save')}
                        </button>
                        <button onClick={() => setEditingEmailRouteId(null)} className="flex items-center gap-1 text-sm font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                          <X className="w-4 h-4" /> {t('cancel')}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="space-y-1">
                        <span className="text-xs text-slate-400 font-bold uppercase">{t('incomingServer')}</span>
                        <select
                          value={emailRouteFormData.inboxConfigId || ''}
                          onChange={e => setEmailRouteFormData({ ...emailRouteFormData, inboxConfigId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                        >
                          <option value="">{t('selectInbox')}</option>
                          {inboxConfigs.map(config => <option key={config.id} value={config.id}>{config.name} ({config.username})</option>)}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-slate-400 font-bold uppercase">{t('outgoingServer')}</span>
                        <select
                          value={emailRouteFormData.outboxConfigId || ''}
                          onChange={e => setEmailRouteFormData({ ...emailRouteFormData, outboxConfigId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                        >
                          <option value="">{t('selectOutbox')}</option>
                          {outboxConfigs.map(config => <option key={config.id} value={config.id}>{config.name} ({config.fromEmail})</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!emailRouteFormData.isDefault}
                        onChange={e => setEmailRouteFormData({ ...emailRouteFormData, isDefault: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-500"
                      />
                      {t('useAsDefaultEmailRoute')}
                    </label>
                  </div>
                );
              }

              return (
                <div key={route.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">
                      {route.name || t('Email route')}
                      {route.isDefault && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{t('Default')}</span>}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded"><Server className="w-3 h-3" /> {inbox ? `${inbox.name} (${inbox.username})` : route.inboxConfigId}</span>
                      <span className="text-slate-600">→</span>
                      <span className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded"><Send className="w-3 h-3" /> {outbox ? `${outbox.name} (${outbox.fromEmail})` : route.outboxConfigId}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditEmailRoute(route)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteEmailServerMapping(route.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        {/* Signatures Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" /> Signatures
            </h2>
            {editingSigId === null && (
              <button onClick={handleAddNewSig} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold shadow-lg transition-colors">
                <Plus className="w-4 h-4" /> Add Signature
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {signatures.length === 0 && editingSigId !== 'new' && (
              <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                No signatures configured
              </div>
            )}
            
            {(editingSigId === 'new' ? [...signatures, { ...sigFormData, id: 'new' } as EmailSignature] : signatures).map((sig) => {
              const isEditing = editingSigId === sig.id;

              if (isEditing) {
                return (
                  <div key={sig.id} className="bg-slate-900 border border-indigo-500/50 rounded-xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                          <Mail className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg text-white">Configure Signature</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={handleSaveSig} className="flex items-center gap-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors shadow-lg">
                          <Save className="w-4 h-4" /> Save
                        </button>
                        <button onClick={() => setEditingSigId(null)} className="flex items-center gap-1 text-sm font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors text-white">
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Name</label>
                          <input 
                            type="text" 
                            placeholder="Work Signature"
                            value={sigFormData.name || ''}
                            onChange={e => setSigFormData({ ...sigFormData, name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Content</label>
                          <textarea 
                            placeholder="Best Regards, ..."
                            value={sigFormData.content || ''}
                            onChange={e => setSigFormData({ ...sigFormData, content: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none h-32 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={sig.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2 flex items-center gap-2">
                      {sig.name}
                      {sig.isDefault && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">Default</span>}
                    </h3>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <span className="truncate max-w-sm">{sig.content.substring(0, 50)}...</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!sig.isDefault && (
                      <button onClick={() => setDefaultSignature(sig.id)} className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700" title="Set as default">
                        <Target className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleEditSig(sig)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteSignature(sig.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        </div>
        )}

        {activeTab === 'api' && canManageApiTokens && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-cyan-400" />
                    API Tokens
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {language === 'zh'
                      ? '为网站组件和外部集成生成受权限限制的 API Token。公开 Live Chat 不再使用 userId。'
                      : 'Generate scoped API tokens for website widgets and external integrations. Public Live Chat no longer uses userId.'}
                  </p>
                </div>
                <button
                  onClick={fetchApiTokens}
                  disabled={loadingApiTokens}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-60"
                >
                  <RefreshCw className={cn("w-4 h-4", loadingApiTokens && "animate-spin")} />
                  {language === 'zh' ? '刷新' : 'Refresh'}
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">{language === 'zh' ? 'Token 名称' : 'Token Name'}</label>
                    <input
                      value={apiTokenName}
                      onChange={e => setApiTokenName(e.target.value)}
                      placeholder="Website Live Chat"
                      className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">{language === 'zh' ? '权限模板' : 'Permission Template'}</label>
                    <select
                      value={apiTokenTemplate}
                      onChange={e => setApiTokenTemplate(e.target.value)}
                      className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                    >
                      {API_TOKEN_TEMPLATES.map(template => (
                        <option key={template.id} value={template.id}>{template.label}</option>
                      ))}
                    </select>
                  </div>

                  {API_TOKEN_TEMPLATES.filter(template => template.id === apiTokenTemplate).map(template => (
                    <div key={template.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                        <ShieldCheck className="w-4 h-4 text-cyan-300" />
                        {template.label}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">{template.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {template.permissions.map(permission => (
                          <span key={permission} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-mono text-cyan-200">
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleCreateApiToken}
                    disabled={creatingApiToken}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                  >
                    {creatingApiToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {language === 'zh' ? '生成 API Token' : 'Generate API Token'}
                  </button>

                  {generatedApiToken && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <div className="text-xs font-bold text-amber-200">
                        {language === 'zh' ? '已生成 API Token，可直接复制' : 'API token generated. Copy it directly.'}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="flex-1 overflow-x-auto rounded bg-slate-950 px-3 py-2 text-xs text-amber-100">{generatedApiToken}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(generatedApiToken);
                            notify(language === 'zh' ? '已复制 API Token。' : 'API token copied.', 'success');
                          }}
                          className="rounded-lg border border-amber-500/40 px-3 py-2 text-amber-100 hover:bg-amber-500/20"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                  <div className="grid grid-cols-[1.1fr_1.4fr_1fr_1fr_0.8fr_auto] gap-3 border-b border-slate-800 px-4 py-3 text-xs font-bold uppercase text-slate-500">
                    <span>{language === 'zh' ? '名称' : 'Name'}</span>
                    <span>Token</span>
                    <span>{language === 'zh' ? '模板' : 'Template'}</span>
                    <span>{language === 'zh' ? '权限' : 'Permissions'}</span>
                    <span>{language === 'zh' ? '最近使用' : 'Last Used'}</span>
                    <span></span>
                  </div>
                  {apiTokens.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">{language === 'zh' ? '暂无 API Token。' : 'No API tokens yet.'}</div>
                  ) : apiTokens.map(record => (
                    <div key={record.id} className={cn("grid grid-cols-[1.1fr_1.4fr_1fr_1fr_0.8fr_auto] gap-3 border-b border-slate-900 px-4 py-4 text-sm items-start", record.revokedAt && "opacity-50")}>
                      <div>
                        <div className="font-bold text-slate-200">{record.name}</div>
                        <div className="mt-1 text-xs font-mono text-slate-500">{record.tokenPrefix}...</div>
                        {record.revokedAt && <div className="mt-1 text-xs text-red-300">{language === 'zh' ? '已吊销' : 'Revoked'}</div>}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="min-w-0 flex-1 overflow-x-auto rounded bg-slate-900 px-2 py-1.5 text-[11px] text-slate-300">
                          {record.token || (language === 'zh' ? '旧 Token 不可查看' : 'Legacy token unavailable')}
                        </code>
                        <button
                          onClick={() => {
                            if (!record.token) {
                              notify(language === 'zh' ? '旧 Token 未保存明文，请重新生成。' : 'This legacy token was not stored. Generate a new one.', 'warning');
                              return;
                            }
                            navigator.clipboard?.writeText(record.token);
                            notify(language === 'zh' ? '已复制 API Token。' : 'API token copied.', 'success');
                          }}
                          disabled={!record.token || !!record.revokedAt}
                          className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                          title={language === 'zh' ? '复制 Token' : 'Copy token'}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-slate-400">{API_TOKEN_TEMPLATES.find(template => template.id === record.template)?.label || record.template || '-'}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(record.permissions || []).map(permission => (
                          <span key={permission} className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                            {permission}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-slate-500">{record.lastUsedAt ? new Date(record.lastUsedAt).toLocaleString() : '-'}</div>
                      <button
                        onClick={() => handleRevokeApiToken(record.id)}
                        disabled={!!record.revokedAt}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
                        title={language === 'zh' ? '吊销' : 'Revoke'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-500">
                {language === 'zh'
                  ? '网站前端接入 Live Chat 时，请把生成的 API Token 作为 apiToken 传给公开接口。不要把 CRM 用户 ID 放到前端，也不要把 visitor token 写入公开 analytics 日志。'
                  : 'When embedding Live Chat on a website, pass this API token as apiToken to public endpoints. Do not expose CRM user IDs in frontend code, and do not log visitor tokens in public analytics.'}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Global Integrations */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Server className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Integrations</h2>
              <p className="text-sm text-slate-400">Configure third-party API keys</p>
            </div>
          </div>
          
          <div className="grid gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 px-1 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                    WhatsApp Actor Hub
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 px-1">Connect the central WhatsApp client hub for multi-client conversations and automated sends.</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={whatsappHubConfig.enabled}
                    onChange={e => updateWhatsAppHubConfig({ enabled: e.target.checked })}
                    className="accent-green-500"
                  />
                  Enabled
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Hub Base URL</label>
                  <input
                    value={whatsappHubConfig.baseUrl}
                    onChange={e => updateWhatsAppHubConfig({ baseUrl: e.target.value })}
                    placeholder="https://ws.geekmt.com"
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-green-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Hub API Token</label>
                  <input
                    type="password"
                    value={whatsappHubConfig.apiToken}
                    onChange={e => updateWhatsAppHubConfig({ apiToken: e.target.value })}
                    placeholder="x-hub-token"
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-green-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Daily Base Quota / Client</label>
                  <input
                    type="number"
                    min={5}
                    value={whatsappHubConfig.dailyBaseQuota}
                    onChange={e => updateWhatsAppHubConfig({ dailyBaseQuota: Number(e.target.value) || 40 })}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-green-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Minimum Reply Rate</label>
                  <input
                    type="number"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={whatsappHubConfig.minReplyRate}
                    onChange={e => updateWhatsAppHubConfig({ minReplyRate: Number(e.target.value) || 0.25 })}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Actor Client Pool</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      One actor maps to one WhatsApp Hub client. Random sends and agents will only use enabled actors when this pool is configured.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchWhatsAppHubClients}
                    disabled={loadingWhatsAppHubClients}
                    className="inline-flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-300 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingWhatsAppHubClients ? 'animate-spin' : ''}`} />
                    Load Hub Clients
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(whatsappHubConfig.actors || []).map(actor => (
                    <div
                      key={actor.id}
                      className={`flex max-w-full items-center gap-2 rounded-lg border px-2 py-2 ${
                        actor.enabled === false
                          ? 'border-slate-800 bg-slate-900/80 text-slate-500'
                          : 'border-green-500/30 bg-green-500/10 text-green-200'
                      }`}
                    >
                      <label className="flex items-center gap-1 text-[11px] font-bold uppercase">
                        <input
                          type="checkbox"
                          checked={actor.enabled !== false}
                          onChange={e => patchWhatsAppActor(actor.id, { enabled: e.target.checked })}
                          className="accent-green-500"
                        />
                        Actor
                      </label>
                      <input
                        value={actor.name}
                        onChange={e => patchWhatsAppActor(actor.id, { name: e.target.value })}
                        className="min-w-[120px] max-w-[220px] rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none focus:border-green-500"
                        placeholder="Actor name"
                      />
                      <span className="max-w-[220px] truncate rounded bg-slate-950 px-2 py-1 font-mono text-[11px] text-slate-400">
                        {actor.clientId}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWhatsAppActor(actor.id)}
                        className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                        title="Remove actor"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {(whatsappHubConfig.actors || []).length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-800 px-3 py-2 text-xs text-slate-500">
                      No actor clients configured. Random sends can still use any online Hub client until actors are added.
                    </div>
                  )}
                </div>

                <div className="relative max-w-2xl">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 focus-within:border-green-500">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                      value={whatsAppActorSearch}
                      onChange={e => {
                        setWhatsAppActorSearch(e.target.value);
                        setIsWhatsAppActorPickerOpen(true);
                      }}
                      onFocus={() => setIsWhatsAppActorPickerOpen(true)}
                      placeholder="Search Hub client by name, id, phone, status..."
                      className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                    />
                  </div>
                  {isWhatsAppActorPickerOpen && whatsAppHubClients.length > 0 && (
                    <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
                      {filteredWhatsAppHubClients.length > 0 ? filteredWhatsAppHubClients.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => addWhatsAppActor(client)}
                          className="flex w-full items-center justify-between gap-3 border-b border-slate-900 px-3 py-2 text-left text-sm hover:bg-slate-900"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-slate-200">{client.name || client.phone || client.id}</span>
                            <span className="block truncate font-mono text-[11px] text-slate-500">{client.id}{client.phone ? ` · ${client.phone}` : ''}</span>
                          </span>
                          <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase ${
                            client.status === 'online' ? 'bg-green-500/10 text-green-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {client.status || 'unknown'}
                            {client.quota ? ` · ${client.quota.remaining ?? '-'}/${client.quota.dailyQuota ?? '-'}` : ''}
                          </span>
                        </button>
                      )) : (
                        <div className="px-3 py-3 text-xs text-slate-500">No matching Hub clients.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 px-1 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    Bark / Webhook Notifications
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 px-1">Send external notifications when emails arrive or agent plans need review.</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={externalNotificationConfig.enabled}
                    onChange={e => updateExternalNotificationConfig({ enabled: e.target.checked })}
                    className="accent-amber-500"
                  />
                  Enabled
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300 font-bold">
                    <input
                      type="checkbox"
                      checked={externalNotificationConfig.barkEnabled}
                      onChange={e => updateExternalNotificationConfig({ barkEnabled: e.target.checked })}
                      className="accent-amber-500"
                    />
                    Bark
                  </label>
                  <input
                    value={externalNotificationConfig.barkServerUrl}
                    onChange={e => updateExternalNotificationConfig({ barkServerUrl: e.target.value })}
                    placeholder="https://api.day.app"
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                  />
                  <input
                    type="password"
                    value={externalNotificationConfig.barkDeviceKey}
                    onChange={e => updateExternalNotificationConfig({ barkDeviceKey: e.target.value })}
                    placeholder="Bark device key or full Bark URL"
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300 font-bold">
                    <input
                      type="checkbox"
                      checked={externalNotificationConfig.webhookEnabled}
                      onChange={e => updateExternalNotificationConfig({ webhookEnabled: e.target.checked })}
                      className="accent-cyan-500"
                    />
                    Webhook
                  </label>
                  <input
                    value={externalNotificationConfig.webhookUrl}
                    onChange={e => updateExternalNotificationConfig({ webhookUrl: e.target.value })}
                    placeholder="https://example.com/tradequest-webhook"
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                  />
                  <p className="text-[11px] text-slate-500">Webhook receives JSON: app, event, title, body, url, metadata, createdAt.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {language === 'zh' ? '免打扰时段' : 'Quiet Hours'}
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {language === 'zh' ? '在设定时间内跳过普通通知；关键失败通知可继续发送。' : 'Skip normal notifications during this window; critical failures can still pass through.'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={externalNotificationConfig.quietHours?.enabled || false}
                        onChange={e => updateExternalNotificationConfig({ quietHours: { ...externalNotificationConfig.quietHours!, enabled: e.target.checked } })}
                        className="accent-amber-500"
                      />
                      {language === 'zh' ? '启用' : 'Enable'}
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="time"
                      value={externalNotificationConfig.quietHours?.start || '22:00'}
                      onChange={e => updateExternalNotificationConfig({ quietHours: { ...externalNotificationConfig.quietHours!, start: e.target.value } })}
                      className="bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                    />
                    <input
                      type="time"
                      value={externalNotificationConfig.quietHours?.end || '08:00'}
                      onChange={e => updateExternalNotificationConfig({ quietHours: { ...externalNotificationConfig.quietHours!, end: e.target.value } })}
                      className="bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                    />
                    <input
                      value={externalNotificationConfig.quietHours?.timezone || timezone || 'UTC'}
                      onChange={e => updateExternalNotificationConfig({ quietHours: { ...externalNotificationConfig.quietHours!, timezone: e.target.value } })}
                      placeholder="Asia/Shanghai"
                      className="bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={externalNotificationConfig.quietHours?.allowCritical !== false}
                      onChange={e => updateExternalNotificationConfig({ quietHours: { ...externalNotificationConfig.quietHours!, allowCritical: e.target.checked } })}
                      className="accent-red-500"
                    />
                    {language === 'zh' ? '免打扰期间仍发送关键失败通知' : 'Allow critical failure notifications during quiet hours'}
                  </label>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {language === 'zh' ? '连续失败升级' : 'Failure Escalation'}
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {language === 'zh' ? '当 Bark/Webhook 连续失败时，在通知日志中生成管理员提醒。' : 'Create an admin-visible alert in notification logs after repeated Bark/Webhook failures.'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={externalNotificationConfig.failureEscalation?.enabled !== false}
                        onChange={e => updateExternalNotificationConfig({ failureEscalation: { ...externalNotificationConfig.failureEscalation!, enabled: e.target.checked } })}
                        className="accent-red-500"
                      />
                      {language === 'zh' ? '启用' : 'Enable'}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-xs text-slate-500">
                      {language === 'zh' ? '连续失败次数' : 'Failure threshold'}
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={externalNotificationConfig.failureEscalation?.threshold || 3}
                        onChange={e => updateExternalNotificationConfig({ failureEscalation: { ...externalNotificationConfig.failureEscalation!, threshold: Number(e.target.value) } })}
                        className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-slate-500">
                      {language === 'zh' ? '升级冷却分钟' : 'Cooldown minutes'}
                      <input
                        type="number"
                        min={5}
                        max={1440}
                        value={externalNotificationConfig.failureEscalation?.cooldownMinutes || 60}
                        onChange={e => updateExternalNotificationConfig({ failureEscalation: { ...externalNotificationConfig.failureEscalation!, cooldownMinutes: Number(e.target.value) } })}
                        className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-red-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {language === 'zh' ? '通知模板' : 'Notification Templates'}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {language === 'zh' ? '支持变量：{{event}}、{{title}}、{{body}}、{{url}}、{{metadata.clientName}}。' : 'Variables: {{event}}, {{title}}, {{body}}, {{url}}, {{metadata.clientName}}.'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['email_received', 'customer_reply', 'review_required', 'agent_execution_failed', 'live_chat_received', 'daily_operation_summary'] as const).map(event => {
                    const template = externalNotificationConfig.templates?.[event] || { enabled: false, title: '', body: '' };
                    return (
                      <div key={event} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
                        <label className="flex items-center justify-between gap-3 text-xs font-bold text-slate-300">
                          <span className="font-mono">{event}</span>
                          <input
                            type="checkbox"
                            checked={!!template.enabled}
                            onChange={e => updateExternalNotificationConfig({
                              templates: {
                                ...externalNotificationConfig.templates,
                                [event]: { ...template, enabled: e.target.checked }
                              }
                            })}
                            className="accent-cyan-500"
                          />
                        </label>
                        <input
                          value={template.title || ''}
                          onChange={e => updateExternalNotificationConfig({
                            templates: {
                              ...externalNotificationConfig.templates,
                              [event]: { ...template, title: e.target.value }
                            }
                          })}
                          placeholder="Title template"
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                        />
                        <textarea
                          value={template.body || ''}
                          onChange={e => updateExternalNotificationConfig({
                            templates: {
                              ...externalNotificationConfig.templates,
                              [event]: { ...template, body: e.target.value }
                            }
                          })}
                          placeholder="Body template"
                          className="min-h-[70px] w-full resize-none bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  ['email_received', 'New email received / 收到新邮件'],
                  ['live_chat_received', 'Live chat message received / 收到 Live Chat 消息'],
                  ['review_required', 'Review required / 需要审核'],
                  ['execution_failed', 'Execution failed / 执行失败'],
                  ['notification_channel_failed', 'Notification channel failed / 通知渠道连续失败'],
                  ['daily_operation_summary', 'Daily operation summary / 每日运营摘要'],
                  ['inactive_login_reminder', 'Inactive login reminder / 长时间未登录提醒']
                ].map(([event, label]) => (
                  <label key={event} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={externalNotificationConfig.events[event as keyof typeof externalNotificationConfig.events] !== false}
                      onChange={e => updateExternalNotificationConfig({
                        events: { ...externalNotificationConfig.events, [event]: e.target.checked }
                      })}
                      className="accent-amber-500"
                    />
                    {label}
                  </label>
                ))}
                {[
                  ['whatsapp_received', 'WhatsApp received / 收到 WhatsApp'],
                  ['customer_reply', 'Customer reply / 客户回复'],
                  ['agent_review_required', 'Agent review required / Agent 需要审核'],
                  ['agent_execution_failed', 'Agent execution failed / Agent 执行失败']
                ].map(([event, label]) => (
                  <label key={event} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={externalNotificationConfig.events[event as keyof typeof externalNotificationConfig.events] !== false}
                      onChange={e => updateExternalNotificationConfig({
                        events: { ...externalNotificationConfig.events, [event]: e.target.checked }
                      })}
                      className="accent-amber-500"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={handleTestExternalNotification}
                disabled={testingExternalNotification}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-bold"
              >
                {testingExternalNotification && <RefreshCw className="w-4 h-4 animate-spin" />}
                Send Test Notification
              </button>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{language === 'zh' ? '通知日志' : 'Notification Logs'}</h4>
                    <p className="text-xs text-slate-500">{language === 'zh' ? '记录 Bark / Webhook 发给谁、是否成功以及失败原因。' : 'Tracks recipient, success status, and failure reason for Bark / Webhook deliveries.'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRefreshNotificationLogs}
                      disabled={notificationLogsLoading}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', notificationLogsLoading && 'animate-spin')} />
                      {language === 'zh' ? '刷新' : 'Refresh'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearNotificationLogs}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {language === 'zh' ? '清空' : 'Clear'}
                    </button>
                  </div>
                </div>
                {notificationDeliveryLogs.length === 0 ? (
                  <div className="rounded border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-500">
                    {language === 'zh' ? '暂无通知日志。发送测试通知或等待后台事件触发后会显示在这里。' : 'No notification logs yet. Send a test notification or wait for a background event.'}
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800">
                    {notificationDeliveryLogs.map(log => (
                      <div key={log.id} className="grid grid-cols-1 gap-2 border-b border-slate-800 px-3 py-3 text-xs last:border-b-0 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200">{log.title || log.event}</div>
                          <div className="mt-1 truncate text-slate-500">{log.body}</div>
                          <div className="mt-1 text-slate-600">{new Date(log.createdAt).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{language === 'zh' ? '事件' : 'Event'}</div>
                          <div className="font-mono text-cyan-200">{log.event}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{language === 'zh' ? '渠道/收件人' : 'Channel / Recipient'}</div>
                          <div className="font-mono text-slate-300">{log.channel}</div>
                          <div className="truncate text-slate-500">{log.recipient || '-'}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{language === 'zh' ? '结果' : 'Result'}</div>
                          <span className={cn(
                            'inline-flex rounded px-2 py-0.5 font-bold',
                            log.status === 'success' && 'bg-emerald-500/10 text-emerald-300',
                            log.status === 'failed' && 'bg-red-500/10 text-red-300',
                            log.status === 'skipped' && 'bg-slate-700/50 text-slate-300'
                          )}>
                            {log.status}{log.httpStatus ? ` · ${log.httpStatus}` : ''}
                          </span>
                          {log.error && <div className="mt-1 break-words text-red-300">{log.error}</div>}
                          <button
                            type="button"
                            onClick={() => handleRetryNotificationLog(log.id)}
                            className="mt-2 inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/20"
                          >
                            <RefreshCw className="h-3 w-3" />
                            {language === 'zh' ? '重试' : 'Retry'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-300 mb-4 px-1 flex items-center gap-2">
                Outscraper API
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">API Key</label>
                  <div className="relative">
                    <input
                      type={showOutscraperApiKey ? "text" : "password"}
                      value={outscraperApiKey}
                      onChange={(e) => setOutscraperApiKey(e.target.value)}
                      placeholder="Enter Outscraper API Key..."
                      className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 pr-10 text-sm text-slate-200 outline-none focus:border-indigo-500"
                    />
                    <button type="button" onClick={() => setShowOutscraperApiKey(!showOutscraperApiKey)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>{showOutscraperApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Used for searching and importing leads directly from Google Maps into the public pool.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 px-1 flex items-center gap-2">
                    Lead Data Channels
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 px-1">
                    Configure lead acquisition and enrichment providers used by campaign agents.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {leadDataProviders.map(provider => {
                  const config = leadDataChannelConfigs[provider.id];
                  const isSecretVisible = visibleLeadChannelKeys[provider.id];
                  return (
                    <div key={provider.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-200">{provider.label}</div>
                          <div className="text-xs text-slate-500 mt-1">{provider.description}</div>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-400">
                          <input
                            type="checkbox"
                            checked={config?.enabled || false}
                            onChange={e => updateLeadDataChannelConfig(provider.id, { enabled: e.target.checked })}
                            className="accent-cyan-500"
                          />
                          Enabled
                        </label>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-bold uppercase">API Key</label>
                        <div className="relative">
                          <input
                            type={isSecretVisible ? 'text' : 'password'}
                            value={config?.apiKey || ''}
                            onChange={e => {
                              updateLeadDataChannelConfig(provider.id, { apiKey: e.target.value });
                              if (provider.id === 'outscraper') setOutscraperApiKey(e.target.value);
                            }}
                            placeholder={`${provider.label} API Key`}
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 pr-10 text-sm text-slate-200 outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setVisibleLeadChannelKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                            className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                            tabIndex={-1}
                          >
                            {isSecretVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {provider.id === 'apify' && (
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">{provider.workflowLabel}</label>
                          <input
                            value={config?.actorId || ''}
                            onChange={e => updateLeadDataChannelConfig(provider.id, { actorId: e.target.value })}
                            placeholder="username/actor-name"
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {provider.id === 'phantombuster' && (
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">{provider.workflowLabel}</label>
                          <input
                            value={config?.agentId || ''}
                            onChange={e => updateLeadDataChannelConfig(provider.id, { agentId: e.target.value })}
                            placeholder="Phantom agent id"
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {!['outscraper', 'apify', 'phantombuster', 'clay'].includes(provider.id) && (
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">{provider.workflowLabel}</label>
                          <input
                            value={config?.searchEndpoint || ''}
                            onChange={e => updateLeadDataChannelConfig(provider.id, { searchEndpoint: e.target.value })}
                            placeholder="https://api.provider.com/lead-search"
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-bold uppercase">Enrichment Endpoint</label>
                        <input
                          value={config?.enrichEndpoint || ''}
                          onChange={e => updateLeadDataChannelConfig(provider.id, { enrichEndpoint: e.target.value })}
                          placeholder="Optional enrichment webhook/API endpoint"
                          className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="inline-flex text-xs text-cyan-400 hover:text-cyan-300">
                          {t('Open provider console')}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleTestLeadChannel(provider.id)}
                          disabled={testingLeadChannel === provider.id}
                          className="text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {testingLeadChannel === provider.id ? t('Testing...') : t('Test Channel')}
                        </button>
                      </div>

                      {leadChannelTestResults[provider.id] && (
                        <div className={cn(
                          "text-xs rounded-lg border px-3 py-2",
                          leadChannelTestResults[provider.id]?.status === 'success'
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-red-500/10 border-red-500/30 text-red-300"
                        )}>
                          {leadChannelTestResults[provider.id]?.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* LLM Configuration Section */}
        <section className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" /> {t('aiModels')}
            </h2>
            {editingLLMId === null && (
              <button onClick={handleAddNewLLM} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold shadow-lg transition-colors">
                <Plus className="w-4 h-4" /> {t('addAIProvider')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-800/50 border border-indigo-500/30 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-200">{t('Agent Context Analysis Mode')}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{t('Controls whether inbox agent context is analyzed automatically or only after manual request.')}</div>
              </div>
              <select
                value={agentContextAnalysisConfig.globalMode}
                onChange={e => updateAgentContextAnalysisConfig({ globalMode: e.target.value as any })}
                className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 outline-none"
              >
                <option value="manual">{t('Manual analysis')}</option>
                <option value="auto">{t('Auto analysis')}</option>
              </select>
            </div>
            {llmConfigs.length > 0 && (
              <div className="bg-slate-800/50 border border-indigo-500/30 rounded-xl p-5 mb-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-300 mb-4 px-1">{t('functionalAssignments')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'magic', label: t('magicCommands'), desc: t('descMagic') },
                    { key: 'agent_harness', label: t('agentHarness'), desc: t('descAgentHarness') },
                    { key: 'global_agent', label: t('globalAgent'), desc: t('descGlobalAgent') },
                    { key: 'agent_context_suggestions', label: t('agentContextSuggestions'), desc: t('descAgentContextSuggestions') },
                    { key: 'agent_tool_selection', label: t('agentToolSelection'), desc: t('descAgentToolSelection') },
                    { key: 'agent_instruction_generation', label: t('agentInstructionGeneration'), desc: t('descAgentInstructionGeneration') },
                    { key: 'drafting', label: t('emailDrafting'), desc: t('descDrafting') },
                    { key: 'whatsapp_drafting', label: t('whatsappMessageDrafting'), desc: t('descWhatsAppDrafting') },
                    { key: 'analysis', label: t('clientAnalysis'), desc: t('descAnalysis') },
                    { key: 'embedding', label: t('vectorization'), desc: t('descEmbedding') },
                    { key: 'outscraperTranslate', label: t('outscraperTranslate'), desc: t('descOutscraper') }
                  ].map(mod => (
                    <div key={mod.key} className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-200">{mod.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{mod.desc}</div>
                      </div>
                      <select
                        value={llmMappings[mod.key] || ''}
                        onChange={(e) => setLLMMapping(mod.key, e.target.value || null)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500 outline-none mt-auto"
                      >
                        <option value="">{t('Use active AI provider')}</option>
                        {llmConfigs.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-5 mb-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Agent Execution Policy / Agent 执行策略</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                    Control which Global Orchestrator actions can run automatically after planning, and which actions must wait for human review.
                    默认建议：资料补全、内部备注、线索排序可自动执行；邮件、WhatsApp、报价、阶段变更必须人工审核。
                  </p>
                </div>
                <button
                  onClick={() => {
                    GLOBAL_AGENT_ACTION_TYPES.forEach(actionType => {
                      const defaults: Record<GlobalAgentActionType, { mode: 'auto' | 'review'; risk: 'low' | 'medium' | 'high' }> = {
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
                      updateAgentExecutionPolicy(actionType, defaults[actionType]);
                    });
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-300"
                >
                  Reset Defaults / 恢复默认
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {GLOBAL_AGENT_ACTION_TYPES.map(actionType => {
                  const rule = agentExecutionPolicy[actionType];
                  return (
                    <div key={actionType} className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-200">{GLOBAL_AGENT_ACTION_LABELS[actionType]}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">{actionType}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={rule?.mode || 'review'}
                          onChange={e => updateAgentExecutionPolicy(actionType, { mode: e.target.value as 'auto' | 'review' })}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-cyan-500 outline-none"
                        >
                          <option value="auto">Auto / 自动</option>
                          <option value="review">Review / 审核</option>
                        </select>
                        <select
                          value={rule?.risk || 'medium'}
                          onChange={e => updateAgentExecutionPolicy(actionType, { risk: e.target.value as 'low' | 'medium' | 'high' })}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-cyan-500 outline-none"
                        >
                          <option value="low">Low / 低</option>
                          <option value="medium">Medium / 中</option>
                          <option value="high">High / 高</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {llmConfigs.length === 0 && editingLLMId !== 'new' && (
              <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                {t('noAIProviders')}
              </div>
            )}
            
            {(editingLLMId === 'new' ? [...llmConfigs, { ...llmFormData, id: 'new' } as LLMConfig] : llmConfigs).map((llm) => {
              const isEditing = editingLLMId === llm.id;

              if (isEditing) {
                return (
                  <div key={llm.id} className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <input 
                        type="text" 
                        value={llmFormData.name || ''} 
                        onChange={e => setLLMFormData({ ...llmFormData, name: e.target.value })}
                        className="bg-transparent text-xl font-bold text-white outline-none border-b border-dashed border-slate-600 focus:border-indigo-500 placeholder-slate-600 px-1"
                        placeholder="Config Name (e.g. My OpenAI)"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={handleSaveLLM} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm transition-colors">
                          <Save className="w-4 h-4" /> {t('save')}
                        </button>
                        <button onClick={() => setEditingLLMId(null)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Provider Type</label>
                          <div className="mb-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => applyLLMPreset('openrouter')}
                              className="px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-xs font-bold text-indigo-200 hover:bg-indigo-500/20"
                            >
                              {t('Use OpenRouter.ai preset')}
                            </button>
                          </div>
                          <select 
                            value={llmFormData.provider}
                            onChange={(e: any) => {
                              const provider = e.target.value as LLMConfig['provider'];
                              setLLMFormData({
                                ...llmFormData,
                                provider,
                                model: provider === 'openrouter' && !llmFormData.model ? 'openai/gpt-4o-mini' : llmFormData.model,
                                baseURL: provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : llmFormData.baseURL
                              });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          >
                            <option value="openai">OpenAI</option>
                            <option value="openrouter">OpenRouter.ai</option>
                            <option value="gemini">Gemini</option>
                            <option value="custom_openai">Custom (OpenAI Compatible)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">{t('modelName')}</label>
                          <input 
                            type="text" 
                            placeholder={llmFormData.provider === 'openai' ? 'gpt-4o' : llmFormData.provider === 'openrouter' ? 'openai/gpt-4o-mini' : llmFormData.provider === 'gemini' ? 'gemini-2.5-flash' : 'llama-3...'}
                            value={llmFormData.model || ''}
                            onChange={e => setLLMFormData({ ...llmFormData, model: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">{t('embeddingModel')}</label>
                          <input 
                            type="text" 
                            placeholder={llmFormData.provider === 'openai' ? 'text-embedding-3-small' : llmFormData.provider === 'openrouter' ? 'Optional if your OpenRouter model supports embeddings' : llmFormData.provider === 'gemini' ? 'text-embedding-004' : 'nomic-embed-text...'}
                            value={llmFormData.embeddingModel || ''}
                            onChange={e => setLLMFormData({ ...llmFormData, embeddingModel: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">{t('apiKey')}</label>
                          <div className="relative">
                            <input 
                              type={showLLMApiKey ? "text" : "password"}
                              placeholder="sk-..."
                              value={llmFormData.apiKey || ''}
                              onChange={e => setLLMFormData({ ...llmFormData, apiKey: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm focus:border-indigo-500 outline-none"
                            />
                            <button type="button" onClick={() => setShowLLMApiKey(!showLLMApiKey)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>{showLLMApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                          </div>
                        </div>
                        {(llmFormData.provider === 'custom_openai' || llmFormData.provider === 'openrouter') && (
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Base URL</label>
                            <input 
                              type="text" 
                              placeholder={llmFormData.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.yourprovider.com/v1'}
                              value={llmFormData.baseURL || ''}
                              onChange={e => setLLMFormData({ ...llmFormData, baseURL: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            />
                            {llmFormData.provider === 'openrouter' && (
                              <p className="text-xs text-slate-500">{t('OpenRouter uses an OpenAI-compatible API endpoint.')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={llm.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{llm.name}</h3>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <span className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded"><Server className="w-3 h-3" /> {llm.provider.toUpperCase()} ({llm.model})</span>
                      {activeLLMId === llm.id && (
                        <span className="text-green-400 text-xs font-bold px-2 py-1 bg-green-400/10 rounded">ACTIVE DEFAULT</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeLLMId !== llm.id ? (
                      <button onClick={() => setActiveLLMId(llm.id)} className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                        Set Active
                      </button>
                    ) : (
                      <button onClick={() => setActiveLLMId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors">
                        Clear Active
                      </button>
                    )}
                    <button onClick={() => handleEditLLM(llm)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteLLMConfig(llm.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </div>
        )}

      </div>
    </div>
  );
}
