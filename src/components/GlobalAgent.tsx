import React, { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, ClipboardCheck, Loader2, Play, ShieldCheck, Sparkles, Target, XCircle } from 'lucide-react';
import { useAuthStore } from '../authStore';
import { AgentExecutionMode, AgentExecutionRisk, ClientStatus, GlobalAgentPlan, GlobalAgentPlanStep, LeadCampaign, LeadDataProvider, useStore } from '../store';
import { buildAgentInputSignature } from '../lib/agentIdempotency';
import { buildLanguagePolicy, getCustomerOutputLanguage } from '../lib/language';

const DEFAULT_OBJECTIVES = {
  en: 'Acquire high-quality leads and create an execution plan from public-pool claiming through first touch and ongoing conversion.',
  zh: '获取高质量 lead，并制定从公海认领到首次跟进、持续转化的执行计划。'
};

const CLIENT_STATUSES: ClientStatus[] = ['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'];
const ENRICHMENT_PROVIDERS: LeadDataProvider[] = ['clay', 'apify', 'phantombuster', 'scrapio', 'hasdata', 'decodo', 'outscraper'];
const SEARCH_PROVIDERS: LeadDataProvider[] = ['outscraper', 'apify', 'phantombuster', 'scrapio', 'hasdata', 'decodo'];

function fallbackPlan(objective: string, language: 'en' | 'zh'): Omit<GlobalAgentPlan, 'id' | 'createdAt' | 'updatedAt'> {
  const isZh = language === 'zh';
  return {
    objective,
    summary: isZh
      ? '创建公海获客计划，在渠道已配置时执行补全，并建立后续转化 workflow。'
      : 'Acquire new public-pool leads, enrich them when configured, then create a follow-up workflow for conversion.',
    status: 'pending_review',
    steps: [
      {
        id: `step_${Date.now()}_1`,
        title: isZh ? '创建获客 Campaign' : 'Create lead acquisition campaign',
        description: isZh
          ? '创建 agent 模式的获客 Campaign，面向高质量 B2B 潜客，结果默认进入公海。'
          : 'Create an agent-mode campaign targeting qualified B2B prospects and defaulting results into the public pool.',
        actionType: 'create_lead_campaign',
        status: 'pending',
        payload: {
          name: 'Global Agent Prospecting',
          keywords: 'distributor importer wholesaler',
          industry: 'target industry',
          country: 'United States',
          limit: 10,
          mode: 'agent',
          provider: 'outscraper',
          enrichBeforeImport: false,
          enrichmentProvider: 'clay'
        }
      },
      {
        id: `step_${Date.now()}_2`,
        title: isZh ? '执行 Campaign 并导入线索' : 'Run campaign and import leads',
        description: isZh
          ? '执行获客 Campaign，将获取到的线索导入公海，供后续认领和转化。'
          : 'Execute the campaign and import found leads into the public pool for claiming.',
        actionType: 'run_lead_campaign',
        status: 'pending',
        payload: { usePreviousCampaign: true }
      },
      {
        id: `step_${Date.now()}_3`,
        title: isZh ? '处理未读客户回复' : 'Process customer replies',
        description: isZh
          ? '读取一个未处理的客户回复，标记为已读，并在客户 comments 中记录处理摘要。'
          : 'Read one unhandled customer reply, mark it as read, and record a handling summary in client comments.',
        actionType: 'process_customer_reply',
        status: 'pending',
        payload: {
          comment: isZh ? 'Global Agent 已处理客户回复，并记录后续跟进行动。' : 'Global Agent processed the customer reply and recorded the follow-up action.'
        }
      },
      {
        id: `step_${Date.now()}_4`,
        title: isZh ? '更新客户跟进阶段' : 'Update client follow-up stage',
        description: isZh
          ? '根据客户互动状态将客户推进到合适阶段，便于后续转化管理。'
          : 'Move the client to the appropriate stage based on engagement so conversion can continue.',
        actionType: 'update_client_stage',
        status: 'pending',
        payload: { status: 'Contacted' }
      },
      {
        id: `step_${Date.now()}_5`,
        title: isZh ? '补全客户资料' : 'Enrich client data',
        description: isZh
          ? '使用已配置的数据渠道补全客户公司、联系方式、地址和标签等资料。'
          : 'Use configured data channels to enrich company, contact, address, and tag data for a client.',
        actionType: 'enrich_client_data',
        status: 'pending',
        payload: { provider: 'clay', fields: ['company', 'contactMethods', 'address', 'tags'] }
      },
      {
        id: `step_${Date.now()}_6`,
        title: isZh ? '创建报价草稿' : 'Create quote draft',
        description: isZh
          ? '在客户有明确需求时创建报价草稿，供销售继续完善和发送。'
          : 'Create a quote draft when the client has a clear buying need so sales can refine and send it.',
        actionType: 'create_quote',
        status: 'pending',
        payload: {
          status: 'Draft',
          items: [{ name: 'Product / solution to confirm', quantity: 1, unitPrice: 0, notes: 'Global Agent draft item' }]
        }
      },
      {
        id: `step_${Date.now()}_7`,
        title: isZh ? '创建转化 Workflow' : 'Create conversion workflow',
        description: isZh
          ? '为新线索创建跟进 workflow，包含邮件、电话任务提示，并在收到有效回复后停止后续动作。'
          : 'Create a follow-up workflow for new leads with email, WhatsApp/call task prompts, and stop-on-reply behavior.',
        actionType: 'create_followup_workflow',
        status: 'pending',
        payload: {
          name: 'Global Agent Lead Conversion',
          description: 'Follow up newly acquired leads with a concise qualification and value-proposition sequence.',
          steps: [
            { type: 'email', delayDays: 0, sendTime: '09:00', templatePrompt: 'Draft a concise first-touch email tailored to the lead industry and country.' },
            { type: 'call', delayDays: 2, sendTime: '10:00', templatePrompt: 'Create a call task to qualify demand, purchasing role, and next step.' },
            { type: 'email', delayDays: 4, sendTime: '09:30', templatePrompt: 'Draft a polite follow-up referencing the original value proposition.' }
          ]
        }
      },
      {
        id: `step_${Date.now()}_8`,
        title: isZh ? '记录转化备注' : 'Add conversion comment',
        description: isZh
          ? '将全局 Agent 的处理摘要写入客户 comments，方便人工接手。'
          : 'Write the Global Agent handling summary into client comments so a human can pick up cleanly.',
        actionType: 'add_client_comment',
        status: 'pending',
        payload: {
          content: isZh ? 'Global Agent：已完成获客与转化计划编排，等待销售跟进关键客户。' : 'Global Agent: acquisition and conversion plan has been coordinated; sales should follow up key accounts.'
        }
      }
    ]
  };
}

export function GlobalAgent() {
  const {
    clients,
    publicClients,
    deals,
    quotes,
    emails,
    leadCampaigns,
    leadDataChannelConfigs,
    outscraperApiKey,
    llmConfigs,
    llmMappings,
    activeLLMId,
    language,
    outboxConfigs,
    addGlobalAgentPlan,
    updateGlobalAgentPlan,
    updateGlobalAgentPlanStep,
    globalAgentPlans,
    agentExecutionPolicy,
    addLeadCampaign,
    updateLeadCampaign,
    importPublicLeads,
    fetchPublicClients,
    addAgentWorkflow,
    fetchEmails,
    markEmailRead,
    editClient,
    updateClientStatus,
    addComment,
    addDeal,
    addQuote,
    setView,
    notify,
    sendExternalNotification,
    findAgentIdempotencyRecord,
    recordAgentIdempotency,
    incrementAgentHubTaskCount
  } = useStore();
  const { token } = useAuthStore();
  const defaultObjective = DEFAULT_OBJECTIVES[language];
  const [objective, setObjective] = useState(defaultObjective);
  const [planning, setPlanning] = useState(false);
  const [executingPlanId, setExecutingPlanId] = useState<string | null>(null);

  const activePlan = globalAgentPlans[0] || null;
  const globalAgentLLMId = llmMappings['global_agent'] || activeLLMId;
  const activeLLMConfig = llmConfigs.find(l => l.id === globalAgentLLMId) || null;

  useEffect(() => {
    setObjective(prev => (
      prev === DEFAULT_OBJECTIVES.en || prev === DEFAULT_OBJECTIVES.zh ? defaultObjective : prev
    ));
  }, [defaultObjective]);

  const context = useMemo(() => ({
    clients: clients.length,
    publicLeads: publicClients.length,
    deals: deals.length,
    quotes: quotes.length,
    unreadEmails: emails.filter(e => !e.read && (e.type === 'inbox' || e.type === 'inbound')).length,
    replyCandidates: emails
      .filter(e => !e.read && (e.type === 'inbox' || e.type === 'inbound'))
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        clientId: e.clientId,
        sender: e.sender,
        subject: e.subject,
        receivedAt: e.date
      })),
    activeClients: clients.slice(0, 8).map(c => ({
      id: c.id,
      name: c.name,
      company: c.company,
      status: c.status,
      country: c.country,
      preferredLanguage: c.preferredLanguage,
      customerOutputLanguage: getCustomerOutputLanguage({
        lastCommunicationText: emails
          .filter(e => e.clientId === c.id && (e.type === 'inbox' || e.type === 'inbound'))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.body,
        preferredLanguage: c.preferredLanguage,
        country: c.country
      }),
      tags: c.tags,
      contactMethods: c.contactMethods
    })),
    availableActions: [
      'create_lead_campaign',
      'run_lead_campaign',
      'create_followup_workflow',
      'process_customer_reply',
      'send_email',
      'send_whatsapp',
      'update_client_stage',
      'add_client_comment',
      'enrich_client_data',
      'create_deal',
      'create_quote',
      'prioritize_leads',
      'review_pipeline'
    ],
    configuredChannels: Object.entries(leadDataChannelConfigs).filter(([, cfg]) => cfg.enabled && cfg.apiKey).map(([provider]) => provider),
    existingCampaigns: leadCampaigns.length
  }), [clients, publicClients, deals, quotes, emails, leadDataChannelConfigs, leadCampaigns]);

  const withExecutionPolicy = <T extends Omit<GlobalAgentPlan, 'id' | 'createdAt' | 'updatedAt'>>(plan: T): T => ({
    ...plan,
    steps: plan.steps.map(step => {
      const rule = agentExecutionPolicy[step.actionType] || { mode: 'review' as AgentExecutionMode, risk: 'medium' as AgentExecutionRisk };
      return {
        ...step,
        executionMode: rule.mode,
        risk: rule.risk
      };
    })
  });

  const parsePlan = (text: string) => {
    try {
      const cleaned = text
        .replace(/```json|```/g, '')
        .trim();
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      const jsonText = cleaned.startsWith('{')
        ? cleaned
        : jsonStart >= 0 && jsonEnd > jsonStart
          ? cleaned.slice(jsonStart, jsonEnd + 1)
          : '';
      if (!jsonText) throw new Error('Missing JSON object');
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed.steps)) throw new Error('Missing steps');
      const parsedPlan = {
        objective,
        summary: parsed.summary || (language === 'zh' ? '全局 Agent 已生成待审核计划。' : 'Global agent plan generated for review.'),
        status: 'pending_review' as const,
        steps: parsed.steps.map((step: any, index: number) => ({
          id: `step_${Date.now()}_${index}`,
          title: step.title || `Step ${index + 1}`,
          description: step.description || '',
          actionType: step.actionType || 'review_pipeline',
          status: 'pending' as const,
          payload: step.payload || {}
        }))
      };
      return withExecutionPolicy(parsedPlan);
    } catch (error) {
      console.error('Global Agent plan parse failed:', error, text);
      throw error;
    }
  };

  const generatePlan = async () => {
    setPlanning(true);
    try {
      const prompt = `You are the Global Agent for a CRM. Your core goal is acquiring leads and converting leads.
You may plan across all system functions, but execution must wait for human approval.
Language rules:
${buildLanguagePolicy({ systemLanguage: language })}
- Internal planning fields include summary, step title, description, comments, and CRM notes.
- Outbound customer-facing payload fields include email body, WhatsApp body, email subject, quote/proposal text, and customer-visible attachments or notes.
- When a payload targets a known client, use that client's customerOutputLanguage from context.
Return JSON only:
{
  "summary": "short summary",
  "steps": [
    {
      "title": "short step title",
      "description": "what will happen",
      "actionType": "create_lead_campaign | run_lead_campaign | create_followup_workflow | process_customer_reply | send_email | send_whatsapp | update_client_stage | add_client_comment | enrich_client_data | create_deal | create_quote | prioritize_leads | review_pipeline",
      "payload": {}
    }
  ]
}

Action payload guidance:
- process_customer_reply: { "emailId": "optional", "clientId": "optional", "comment": "summary to add" }
- send_email: { "clientId": "optional", "replyToEmailId": "optional", "recipient": "optional", "subject": "...", "body": "...", "scheduledAt": "optional ISO string" }
- send_whatsapp: { "clientId": "optional CRM client id", "hubClientId": "optional WhatsApp Actor Hub client id", "to": "optional phone", "body": "message body", "scheduledAt": "optional ISO date string" }
- update_client_stage: { "clientId": "optional", "status": "Leads | Contacted | Sample Sent | Negotiating | Closed Won" }
- add_client_comment: { "clientId": "optional", "content": "comment text" }
- enrich_client_data: { "clientId": "optional", "provider": "optional enrichment provider", "fields": ["company", "contactMethods", "address", "tags"] }
- create_deal: { "clientId": "optional", "name": "deal name", "value": 0, "status": "Leads | Contacted | Sample Sent | Negotiating | Closed Won" }
- create_quote: { "clientId": "optional", "quoteNumber": "optional", "status": "Draft", "items": [{ "name": "...", "quantity": 1, "unitPrice": 0, "notes": "..." }] }

Do not limit yourself to acquisition. Include any conversion-improving action that the CRM can execute, especially customer data enrichment, reply handling, WhatsApp outreach, stage changes, comments, deals, quotes, follow-up workflows, and scheduled emails.

Available context:
${JSON.stringify(context, null, 2)}

User objective:
${objective}`;

      const res = await fetch('/api/global-agent/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, context, llmConfig: activeLLMConfig })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'AI planner request failed');
      incrementAgentHubTaskCount('global_agent');
      const text = data?.result || data?.response || '';
      const plan = parsePlan(text);
      const planId = addGlobalAgentPlan(plan);
      void executePolicyAutoSteps({ ...plan, id: planId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      notify('Global Agent plan is ready for human review.', 'info');
      void sendExternalNotification({
        event: 'review_required',
        title: 'Global Agent plan needs review',
        body: plan.summary,
        metadata: { planId, source: 'global-agent' }
      });
    } catch (error) {
      console.error(error);
      const plan = withExecutionPolicy(fallbackPlan(objective, language));
      const planId = addGlobalAgentPlan(plan);
      notify('Global Agent AI planning failed. Check the Global Agent provider in AI & Integrations; a safe default plan was created for review.', 'warning');
      void sendExternalNotification({
        event: 'review_required',
        title: 'Global Agent fallback plan needs review',
        body: plan.summary,
        metadata: { planId, source: 'global-agent', fallback: true }
      });
    } finally {
      setPlanning(false);
    }
  };

  const normalizeRows = (rows: any[], campaign: LeadCampaign) => rows.filter(Boolean).map((row: any) => {
    const contactMethods = [];
    const addMethod = (type: string, value: any) => {
      const normalized = String(value || '').trim();
      if (normalized && !contactMethods.some((method: any) => method.type === type && method.value === normalized)) {
        contactMethods.push({ type, value: normalized });
      }
    };
    for (const method of row.contactMethods || []) addMethod(method.type, method.value);
    const emails = row.emails || row.email;
    const phones = row.phones || row.phone;
    const emailList = Array.isArray(emails) ? emails : emails ? String(emails).split(',') : [];
    const phoneList = Array.isArray(phones) ? phones : phones ? String(phones).split(',') : [];
    emailList.forEach((email: any) => addMethod('email', email));
    phoneList.forEach((phone: any) => addMethod('phone', phone));
    [row.email_address, row.email_1, row.email_2, row.email_3].filter(Boolean).forEach(email => addMethod('email', email));
    [row.phone_number, row.phone_1, row.phone_2, row.phone_3, row.mobile].filter(Boolean).forEach(phone => addMethod('phone', phone));
    [row.site, row.website, row.domain, row.url, row.business_url].filter(Boolean).forEach(site => addMethod('website', site));
    return {
      name: row.name || row.company || row.title,
      company: row.company || row.name || row.title || '',
      address: row.address || row.full_address || row.formatted_address || '',
      city: row.city || row.municipality || '',
      state: row.state || row.region || row.province || '',
      country: row.country || campaign.country || 'Unknown',
      tags: Array.from(new Set([...(row.tags || []), row.type, row.category, campaign.industry, 'Global Agent'].filter(Boolean))),
      contactMethods: contactMethods.length ? contactMethods : undefined,
      comments: row.comments || []
    };
  }).filter((lead: any) => lead.name);

  const runCampaign = async (campaign: LeadCampaign) => {
    const preferredProvider = campaign.provider || 'outscraper';
    const provider = SEARCH_PROVIDERS.find(providerId => {
      const cfg = providerId === 'outscraper'
        ? { ...leadDataChannelConfigs.outscraper, apiKey: leadDataChannelConfigs.outscraper?.apiKey || outscraperApiKey }
        : leadDataChannelConfigs[providerId];
      return providerId === preferredProvider && cfg?.enabled && cfg?.apiKey;
    }) || SEARCH_PROVIDERS.find(providerId => {
      const cfg = providerId === 'outscraper'
        ? { ...leadDataChannelConfigs.outscraper, apiKey: leadDataChannelConfigs.outscraper?.apiKey || outscraperApiKey }
        : leadDataChannelConfigs[providerId];
      return cfg?.enabled && cfg?.apiKey;
    }) || preferredProvider;
    const config = provider === 'outscraper'
      ? { ...leadDataChannelConfigs.outscraper, apiKey: leadDataChannelConfigs.outscraper?.apiKey || outscraperApiKey }
      : leadDataChannelConfigs[provider];
    if (!config?.enabled || !config?.apiKey) throw new Error(`Data channel ${provider} is not configured`);

    const query = campaign.query || [campaign.keywords, campaign.industry, `in ${campaign.country}`].join(' ');
    const response = await fetch('/api/lead-data/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        provider,
        query,
        keywords: campaign.keywords,
        industry: campaign.industry,
        country: campaign.country,
        limit: campaign.limit,
        config
      })
    });
    if (!response.ok) throw new Error('Lead search failed');
    const data = await response.json();
    const leads = normalizeRows(data.leads || [], campaign);
    if (leads.length > 0) await importPublicLeads(leads);
    fetchPublicClients();
    updateLeadCampaign(campaign.id, {
      status: 'completed',
      provider,
      importedCount: leads.length,
      lastRunAt: new Date().toISOString()
    });
    return `${leads.length} leads imported to public pool`;
  };

  const getEnrichmentConfig = (provider: LeadDataProvider) => {
    if (provider === 'outscraper') {
      return { ...leadDataChannelConfigs.outscraper, apiKey: leadDataChannelConfigs.outscraper?.apiKey || outscraperApiKey };
    }
    return leadDataChannelConfigs[provider];
  };

  const findTargetClient = (payload: any = {}) => {
    const state = useStore.getState();
    if (payload.clientId) {
      const byId = state.clients.find(c => c.id === payload.clientId);
      if (byId) return byId;
    }
    if (payload.emailId || payload.replyToEmailId) {
      const email = state.emails.find(e => e.id === (payload.emailId || payload.replyToEmailId));
      if (email?.clientId) {
        const byEmail = state.clients.find(c => c.id === email.clientId);
        if (byEmail) return byEmail;
      }
    }
    return state.clients[0] || null;
  };

  const findTargetReply = (payload: any = {}) => {
    const state = useStore.getState();
    if (payload.emailId || payload.replyToEmailId) {
      const byId = state.emails.find(e => e.id === (payload.emailId || payload.replyToEmailId));
      if (byId) return byId;
    }
    return state.emails.find(e => !e.read && (e.type === 'inbox' || e.type === 'inbound')) || null;
  };

  const getClientEmail = (client: ReturnType<typeof findTargetClient>) => {
    if (!client?.contactMethods) return '';
    return client.contactMethods.find(method => method.type === 'email')?.value || '';
  };

  const getClientWhatsApp = (client: ReturnType<typeof findTargetClient>) => {
    if (!client?.contactMethods) return '';
    return client.contactMethods.find(method => ['whatsapp', 'phone'].includes(method.type))?.value || '';
  };

  const enrichClientData = async (payload: any = {}) => {
    const client = findTargetClient(payload);
    if (!client) throw new Error('No client available for data enrichment');
    const provider = ENRICHMENT_PROVIDERS.includes(payload.provider)
      ? payload.provider
      : (context.configuredChannels.find(provider => ENRICHMENT_PROVIDERS.includes(provider as LeadDataProvider)) as LeadDataProvider) || 'clay';
    const config = getEnrichmentConfig(provider);
    if (!config?.enabled || !config?.apiKey) throw new Error(`Data enrichment channel ${provider} is not configured`);

    const response = await fetch('/api/lead-data/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        provider,
        config,
        leads: [{
          id: client.id,
          name: client.name,
          company: client.company,
          address: client.address,
          city: client.city,
          state: client.state,
          country: client.country,
          tags: client.tags,
          contactMethods: client.contactMethods
        }]
      })
    });
    if (!response.ok) throw new Error('Client data enrichment failed');
    const data = await response.json();
    const enriched = data.leads?.[0] || {};
    const updates: any = {};
    for (const field of ['name', 'company', 'address', 'city', 'state', 'country', 'tags', 'contactMethods']) {
      if (enriched[field] !== undefined && enriched[field] !== null) updates[field] = enriched[field];
    }
    if (Object.keys(updates).length) editClient(client.id, updates);
    addComment(client.id, payload.comment || `Global Agent enriched client data via ${provider}.`);
    return `${client.name} enriched via ${provider}`;
  };

  const getStepTarget = (actionType: string, payload: any = {}) => {
    const client = findTargetClient(payload);
    if (client) return { targetType: 'client', targetId: client.id };
    if (payload.replyToEmailId || payload.emailId) return { targetType: 'email', targetId: payload.replyToEmailId || payload.emailId };
    if (payload.campaignId) return { targetType: 'campaign', targetId: payload.campaignId };
    if (payload.to) return { targetType: 'whatsapp', targetId: String(payload.to).replace(/[^0-9]/g, '') || payload.to };
    if (payload.recipient) return { targetType: 'email_address', targetId: String(payload.recipient).toLowerCase() };
    return { targetType: 'global_plan', targetId: actionType };
  };

  const runOnce = async (
    plan: GlobalAgentPlan,
    step: GlobalAgentPlanStep,
    payload: any,
    target: { targetType: string; targetId: string },
    action: () => Promise<string | void> | string | void
  ) => {
    const inputSignature = buildAgentInputSignature({
      actionType: step.actionType,
      payload,
      target
    });
    const key = {
      agentId: 'global_agent',
      tool: step.actionType,
      targetType: target.targetType,
      targetId: target.targetId,
      inputSignature
    };
    const existing = findAgentIdempotencyRecord(key);
    if (existing) {
      const result = `Skipped duplicate ${step.actionType}; already completed at ${new Date(existing.createdAt).toLocaleString()}.`;
      updateGlobalAgentPlanStep(plan.id, step.id, { status: 'skipped', result });
      return { skipped: true, result };
    }
    const resultRef = await action();
    recordAgentIdempotency({
      ...key,
      status: 'completed',
      resultRef: typeof resultRef === 'string' ? resultRef : undefined
    });
    return { skipped: false, result: resultRef };
  };

  const executeStep = async (plan: GlobalAgentPlan, step: GlobalAgentPlanStep, previousCampaignId?: string) => {
    updateGlobalAgentPlanStep(plan.id, step.id, { status: 'running', error: undefined });
    try {
      const payload = step.payload || {};

      if (step.actionType === 'create_lead_campaign') {
        const id = addLeadCampaign({
          name: payload.name || 'Global Agent Campaign',
          keywords: payload.keywords || 'distributor importer',
          industry: payload.industry || 'target industry',
          country: payload.country || 'United States',
          limit: Number(payload.limit) || 10,
          mode: payload.mode || 'agent',
          provider: payload.provider || 'outscraper',
          enrichBeforeImport: Boolean(payload.enrichBeforeImport),
          enrichmentProvider: payload.enrichmentProvider || 'clay',
          query: payload.query || ''
        });
        updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: `Campaign created: ${id}` });
        return id;
      }

      if (step.actionType === 'run_lead_campaign') {
        const campaignId = step.payload?.campaignId || previousCampaignId || leadCampaigns[0]?.id;
        const campaign = useStore.getState().leadCampaigns.find(c => c.id === campaignId);
        if (!campaign) throw new Error('No campaign available to run');
        const result = await runCampaign(campaign);
        updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result });
        return previousCampaignId;
      }

      if (step.actionType === 'process_customer_reply') {
        const email = findTargetReply(payload);
        if (!email) {
          updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: 'No unread customer reply found' });
          return previousCampaignId;
        }
        const once = await runOnce(plan, step, { ...payload, emailId: email.id, subject: email.subject }, { targetType: 'email', targetId: email.id }, async () => {
          markEmailRead(email.id);
          const client = findTargetClient({ ...payload, emailId: email.id });
          if (client) {
            addComment(
              client.id,
              payload.comment || `Global Agent processed customer reply: ${email.subject || '(no subject)'}`
            );
          }
          return `email:${email.id}`;
        });
        if (!once.skipped) updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: `Reply processed: ${email.subject || email.id}` });
        return previousCampaignId;
      }

      if (step.actionType === 'send_email') {
        const reply = findTargetReply(payload);
        const client = findTargetClient(payload);
        const recipient = payload.recipient || reply?.sender || getClientEmail(client);
        if (!recipient) throw new Error('No recipient available for email');
        const selectedOutbox = outboxConfigs.find(config => config.id === payload.outboxConfigId)
          || outboxConfigs.find(config => config.fromEmail === payload.sender)
          || outboxConfigs[0];
        if (!selectedOutbox) {
          throw new Error('No outbox configured. Configure an SMTP or Resend outbox before sending email.');
        }
        const normalizedPayload = {
          clientId: payload.clientId || reply?.clientId || client?.id,
          recipient,
          subject: payload.subject || (reply ? `Re: ${reply.subject}` : 'Following up'),
          body: payload.body || payload.content || '',
          scheduledAt: payload.scheduledAt || '',
          outboxConfigId: selectedOutbox?.id || payload.outboxConfigId || ''
        };
        const once = await runOnce(plan, step, normalizedPayload, client ? { targetType: 'client', targetId: client.id } : { targetType: 'email_address', targetId: recipient.toLowerCase() }, async () => {
          const emailId = `e${Date.now()}${Math.floor(Math.random() * 1000)}`;
          const emailPayload = {
            id: emailId,
            clientId: normalizedPayload.clientId,
            sender: selectedOutbox?.fromEmail || payload.sender || 'Global Agent',
            senderName: selectedOutbox?.fromName || payload.senderName || 'Global Agent',
            recipient,
            subject: normalizedPayload.subject,
            body: normalizedPayload.body,
            read: true,
            type: payload.scheduledAt ? 'scheduled' : (payload.type || 'sent'),
            scheduledAt: payload.scheduledAt,
            outboxConfigId: normalizedPayload.outboxConfigId || undefined
          };
          const response = await fetch('/api/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(emailPayload)
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'Email send failed');
          await fetchEmails();
          if (client) {
            addComment(client.id, payload.comment || `Global Agent ${payload.scheduledAt ? 'scheduled' : 'sent'} email: ${payload.subject || 'Following up'}`);
          }
          return `email:${emailId}`;
        });
        if (!once.skipped) {
          updateGlobalAgentPlanStep(plan.id, step.id, {
            status: 'completed',
            result: `${payload.scheduledAt ? 'Email scheduled' : 'Email sent'}: ${String(once.result || '').replace('email:', '')}`
          });
        }
        return previousCampaignId;
      }

      if (step.actionType === 'send_whatsapp') {
        const client = findTargetClient(payload);
        const to = payload.to || getClientWhatsApp(client);
        if (!to) throw new Error('No WhatsApp phone available for client');
        const normalizedPayload = {
          to: String(to).replace(/[^0-9]/g, '') || to,
          body: payload.body || payload.content || 'Following up.',
          scheduledAt: payload.scheduledAt || '',
          hubClientId: payload.hubClientId || ''
        };
        const once = await runOnce(plan, step, normalizedPayload, client ? { targetType: 'client', targetId: client.id } : { targetType: 'whatsapp', targetId: normalizedPayload.to }, async () => {
          const response = await fetch('/api/whatsapp-hub/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
            to,
            body: normalizedPayload.body,
            clientId: payload.hubClientId,
            scheduledAt: payload.scheduledAt,
            metadata: { clientId: client?.id, source: 'global-agent' }
            })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'WhatsApp send failed');
          if (client) addComment(client.id, `Global Agent queued WhatsApp message via ${data.selectedClientId || 'Actor Hub'}.`);
          return `whatsapp:${data.task?.id || data.selectedClientId || to}`;
        });
        if (!once.skipped) updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: `WhatsApp queued: ${String(once.result || '').replace('whatsapp:', '')}` });
        return previousCampaignId;
      }

      if (step.actionType === 'update_client_stage') {
        const client = findTargetClient(payload);
        if (!client) throw new Error('No client available for stage update');
        const status = CLIENT_STATUSES.includes(payload.status) ? payload.status : 'Contacted';
        updateClientStatus(client.id, status);
        updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: `${client.name} moved to ${status}` });
        return previousCampaignId;
      }

      if (step.actionType === 'add_client_comment') {
        const client = findTargetClient(payload);
        if (!client) throw new Error('No client available for comment');
        const content = payload.content || payload.comment || 'Global Agent added a follow-up note.';
        const once = await runOnce(plan, step, { content }, { targetType: 'client', targetId: client.id }, async () => {
          addComment(client.id, content);
          return `client_comment:${client.id}`;
        });
        if (!once.skipped) updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: `Comment added to ${client.name}` });
        return previousCampaignId;
      }

      if (step.actionType === 'enrich_client_data') {
        const client = findTargetClient(payload);
        const once = await runOnce(plan, step, { provider: payload.provider, fields: payload.fields || [] }, client ? { targetType: 'client', targetId: client.id } : getStepTarget(step.actionType, payload), async () => {
          return await enrichClientData(payload);
        });
        if (!once.skipped) updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: String(once.result || 'Client enriched') });
        return previousCampaignId;
      }

      if (step.actionType === 'create_deal') {
        const client = findTargetClient(payload);
        if (!client) throw new Error('No client available for deal creation');
        const status = CLIENT_STATUSES.includes(payload.status) ? payload.status : client.status;
        const dealName = payload.name || `${client.company || client.name} opportunity`;
        const once = await runOnce(plan, step, { name: dealName, value: Number(payload.value) || 0, status }, { targetType: 'client', targetId: client.id }, async () => {
          addDeal({
            clientId: client.id,
            name: dealName,
            value: Number(payload.value) || 0,
            status,
            contactInfo: {
              name: client.name,
              company: client.company,
              country: client.country,
              tags: client.tags,
              contactMethods: client.contactMethods || []
            }
          });
          addComment(client.id, payload.comment || `Global Agent created a deal: ${dealName}.`);
          return `deal:${client.id}:${dealName}`;
        });
        if (!once.skipped) updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: `Deal created for ${client.name}` });
        return previousCampaignId;
      }

      if (step.actionType === 'create_quote') {
        const client = findTargetClient(payload);
        const quoteNumber = payload.quoteNumber || `GA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
        const quotePayload = {
          clientId: payload.clientId || client?.id || null,
          paymentTerms: payload.paymentTerms || '',
          paymentTermId: payload.paymentTermId || '',
          advanceRatio: Number(payload.advanceRatio) || 0,
          balanceRatio: Number(payload.balanceRatio) || 0,
          status: payload.status || 'Draft',
          items: Array.isArray(payload.items) && payload.items.length ? payload.items : [{ name: 'Product / service', quantity: 1, unitPrice: 0, total: 0, notes: 'Global Agent draft item' }]
        };
        const once = await runOnce(plan, step, quotePayload, client ? { targetType: 'client', targetId: client.id } : { targetType: 'quote_context', targetId: quoteNumber }, async () => {
          addQuote({
            quoteNumber,
            clientId: quotePayload.clientId,
            paymentTerms: quotePayload.paymentTerms,
            paymentTermId: quotePayload.paymentTermId,
            advanceRatio: quotePayload.advanceRatio,
            balanceRatio: quotePayload.balanceRatio,
            status: quotePayload.status,
            items: quotePayload.items.map((item: any) => ({
                productId: item.productId || '',
                name: item.name || item.description || 'Product / service',
                description: item.description || '',
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.unitPrice) || 0,
                total: Number(item.total) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
                notes: item.notes || '',
                isManualPrice: true
              })),
            fees: Array.isArray(payload.fees) ? payload.fees : [],
            comments: []
          });
          if (client) addComment(client.id, `Global Agent created quote draft ${quoteNumber}.`);
          return `quote:${quoteNumber}`;
        });
        if (!once.skipped) updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: `Quote created: ${String(once.result || quoteNumber).replace('quote:', '')}` });
        return previousCampaignId;
      }

      if (step.actionType === 'create_followup_workflow') {
        addAgentWorkflow({
          name: payload.name || 'Global Agent Conversion Workflow',
          description: payload.description || 'Global agent follow-up workflow for newly acquired leads.',
          stopOnMeaningfulReply: true,
          steps: (payload.steps || []).map((s: any, index: number) => ({
            id: `wf_step_${Date.now()}_${index}`,
            type: s.type || 'email',
            delayDays: Number(s.delayDays) || 0,
            sendTime: s.sendTime || '',
            templatePrompt: s.templatePrompt || 'Draft a concise follow-up message.'
          }))
        });
        updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: 'Follow-up workflow created' });
        return previousCampaignId;
      }

      updateGlobalAgentPlanStep(plan.id, step.id, { status: 'completed', result: 'Reviewed and queued for operator attention' });
      return previousCampaignId;
    } catch (error: any) {
      updateGlobalAgentPlanStep(plan.id, step.id, { status: 'failed', error: error?.message || 'Step failed' });
      throw error;
    }
  };

  const executePolicyAutoSteps = async (plan: GlobalAgentPlan) => {
    const autoSteps = plan.steps.filter(step => step.executionMode === 'auto' && step.status === 'pending');
    if (autoSteps.length === 0) return;

    const reviewStepsRemain = plan.steps.some(step => step.executionMode !== 'auto' && !['completed', 'skipped'].includes(step.status));
    setExecutingPlanId(plan.id);
    updateGlobalAgentPlan(plan.id, { status: 'running' });

    let campaignId = plan.steps
      .filter(step => step.actionType === 'create_lead_campaign' && step.result?.startsWith('Campaign created: '))
      .map(step => step.result?.replace('Campaign created: ', '').trim())
      .filter(Boolean)
      .at(-1);

    try {
      for (const step of autoSteps) {
        campaignId = await executeStep(plan, step, campaignId) || campaignId;
      }
      updateGlobalAgentPlan(plan.id, {
        status: reviewStepsRemain ? 'pending_review' : 'completed',
        ...(reviewStepsRemain ? {} : { completedAt: new Date().toISOString() })
      });
      notify(
        reviewStepsRemain
          ? 'Low-risk Global Agent steps ran automatically. Remaining steps are waiting for review.'
          : 'Global Agent plan completed automatically under the execution policy.',
        'success'
      );
    } catch (error) {
      console.error(error);
      updateGlobalAgentPlan(plan.id, { status: 'failed' });
      notify('Automatic Global Agent step failed. Review the failed step before continuing.', 'error');
      void sendExternalNotification({
        event: 'execution_failed',
        title: 'Global Agent automatic step failed',
        body: error instanceof Error ? error.message : 'Review the failed Global Agent step before continuing.',
        metadata: { planId: plan.id, source: 'global-agent-auto' }
      });
    } finally {
      setExecutingPlanId(null);
    }
  };

  const approveAndExecute = async (plan: GlobalAgentPlan) => {
    setExecutingPlanId(plan.id);
    const executableSteps = plan.steps.map(step => (
      step.status === 'failed' || step.status === 'running'
        ? { ...step, status: 'pending' as const, error: undefined }
        : step
    ));
    updateGlobalAgentPlan(plan.id, {
      status: 'running',
      approvedAt: new Date().toISOString(),
      steps: executableSteps
    });
    let campaignId = plan.steps
      .filter(step => step.actionType === 'create_lead_campaign' && step.result?.startsWith('Campaign created: '))
      .map(step => step.result?.replace('Campaign created: ', '').trim())
      .filter(Boolean)
      .at(-1);
    try {
      for (const step of executableSteps) {
        if (step.status === 'completed' || step.status === 'skipped') continue;
        campaignId = await executeStep(plan, step, campaignId) || campaignId;
      }
      updateGlobalAgentPlan(plan.id, { status: 'completed', completedAt: new Date().toISOString() });
      notify('Global Agent plan completed.', 'success');
    } catch (error) {
      console.error(error);
      updateGlobalAgentPlan(plan.id, { status: 'failed' });
      notify('Global Agent execution stopped. Review the failed step.', 'error');
      void sendExternalNotification({
        event: 'execution_failed',
        title: 'Global Agent execution stopped',
        body: error instanceof Error ? error.message : 'Review the failed Global Agent step.',
        metadata: { planId: plan.id, source: 'global-agent' }
      });
    } finally {
      setExecutingPlanId(null);
    }
  };

  const resetPlanForReview = (plan: GlobalAgentPlan) => {
    updateGlobalAgentPlan(plan.id, {
      status: 'pending_review',
      steps: plan.steps.map(step => (
        step.status === 'failed' || step.status === 'running'
          ? { ...step, status: 'pending' as const, error: undefined }
          : step
      ))
    });
    notify('Global Agent plan is ready for human review.', 'info');
  };

  const rejectPlan = (plan: GlobalAgentPlan) => {
    updateGlobalAgentPlan(plan.id, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedReason: 'Rejected by human reviewer',
      steps: plan.steps.map(step => step.status === 'pending' ? { ...step, status: 'skipped' as const } : step)
    });
    notify('Global Agent plan rejected. Nothing was executed.', 'info');
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-rose-400" />;
    if (status === 'running') return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
    return <ClipboardCheck className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 border-t border-slate-800 p-6">
      <div className="w-full space-y-6 text-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bot className="w-8 h-8 text-cyan-400" />
              Global Agent
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl">
              Full-system planning agent for lead acquisition, enrichment, email handling, client stage updates, comments, quotes, and conversion coordination. Every plan requires human approval before execution.
            </p>
          </div>
          <button
            onClick={() => setView('public-pool')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-bold"
          >
            Public Pool
          </button>
        </div>

        <section className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-300 uppercase tracking-wider">
            <Target className="w-4 h-4 text-cyan-400" />
            Objective
          </div>
          <textarea
            value={objective}
            onChange={e => setObjective(e.target.value)}
            className="w-full min-h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-cyan-500 resize-none"
          />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              ['Clients', context.clients],
              ['Public Leads', context.publicLeads],
              ['Deals', context.deals],
              ['Quotes', context.quotes],
              ['Unread Emails', context.unreadEmails],
              ['Channels', context.configuredChannels.length]
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="text-xl font-black text-slate-100">{value}</div>
              </div>
            ))}
          </div>
          <button
            onClick={generatePlan}
            disabled={planning || !objective.trim()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg font-bold flex items-center gap-2"
          >
            {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Plan for Review
          </button>
          <div className="text-xs text-slate-500">
            AI Planner: {activeLLMConfig?.name || 'Default internal AI'}
          </div>
          {activePlan?.status === 'failed' && activePlan.steps.some(step => step.error?.includes('Data channel')) && (
            <button
              onClick={() => setView('settings')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold"
            >
              Configure Data Channels
            </button>
          )}
        </section>

        {activePlan && (
          <section className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase tracking-wider px-2 py-1 rounded bg-slate-800 text-cyan-300 font-bold">{activePlan.status}</span>
                  {activePlan.status === 'pending_review' && (
                    <span className="text-xs text-amber-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Review-required steps are waiting for approval
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-white">{activePlan.summary}</h2>
                <p className="text-sm text-slate-400 mt-1">{activePlan.objective}</p>
              </div>
              {(activePlan.status === 'pending_review' || activePlan.status === 'failed') && (
                <div className="flex gap-2 shrink-0">
                  {activePlan.status === 'failed' && (
                    <button
                      onClick={() => resetPlanForReview(activePlan)}
                      disabled={executingPlanId === activePlan.id}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500 border border-slate-700 rounded-lg font-bold flex items-center gap-2"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      Review Again
                    </button>
                  )}
                  {activePlan.status === 'pending_review' && (
                  <button
                    onClick={() => rejectPlan(activePlan)}
                    disabled={executingPlanId === activePlan.id}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500 border border-slate-700 rounded-lg font-bold flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  )}
                <button
                  onClick={() => approveAndExecute(activePlan)}
                  disabled={executingPlanId === activePlan.id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 rounded-lg font-bold flex items-center gap-2 shrink-0"
                >
                  {executingPlanId === activePlan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {activePlan.status === 'failed' ? 'Retry Failed Steps' : 'Approve & Execute'}
                </button>
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-800">
              {activePlan.steps.map((step, index) => (
                <div key={step.id} className="p-5 flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-slate-400 shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {statusIcon(step.status)}
                      <h3 className="font-bold text-slate-100">{step.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        step.executionMode === 'auto'
                          ? 'bg-emerald-950/40 border-emerald-900 text-emerald-300'
                          : 'bg-amber-950/40 border-amber-900 text-amber-300'
                      }`}>
                        {step.executionMode === 'auto' ? 'Auto' : 'Review'}
                      </span>
                      {step.risk && (
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          step.risk === 'high'
                            ? 'bg-rose-950/40 border-rose-900 text-rose-300'
                            : step.risk === 'medium'
                              ? 'bg-amber-950/40 border-amber-900 text-amber-300'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}>
                          {step.risk} risk
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                    <div className="mt-3 text-xs text-slate-500 font-mono bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-x-auto">
                      {JSON.stringify(step.payload || {}, null, 2)}
                    </div>
                    {step.result && <div className="text-xs text-emerald-400 mt-2">{step.result}</div>}
                    {step.error && <div className="text-xs text-rose-400 mt-2">{step.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
