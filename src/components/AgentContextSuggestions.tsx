import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CalendarClock, CornerDownRight, Loader2, MessageSquare, ShieldCheck, Sparkles, Trash2, UserPlus, Zap } from 'lucide-react';
import { AgentContextAnalysisMode, AgentContextSuggestionInsight, useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { cn } from '../lib/utils';

interface SuggestionOption {
  id: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'success';
}

interface AgentContextSuggestionsProps {
  channel: 'email' | 'whatsapp';
  subject?: string;
  body?: string;
  additionalContext?: string;
  cacheKey: string;
  clientId?: string;
  emailAddress?: string;
  whatsappNumber?: string;
  defaultAnalysisMode?: AgentContextAnalysisMode;
  persistedInsight?: AgentContextSuggestionInsight;
  persistedInsightKey?: string;
  clientName?: string;
  hasClient?: boolean;
  hasKnowledge?: boolean;
  hasCustomerMessage?: boolean;
  onDraftReply: () => void | Promise<void>;
  onAddComment?: () => void | Promise<void>;
  onCreateLead?: () => void | Promise<void>;
  onAddToKnowledge?: () => void | Promise<void>;
  onDeleteItem?: () => void | Promise<void>;
  onMarkFollowUp?: () => void | Promise<void>;
  autoScrollOnOpen?: boolean;
  onSaveAnalysis?: (key: string, insight: AgentContextSuggestionInsight) => void | Promise<void>;
}

const inferIntent = (text: string) => {
  const lower = text.toLowerCase();
  if (/(spam|junk|phishing|unsubscribe|casino|lottery|seo service|crypto|垃圾|骚扰|退订|博彩|中奖|钓鱼|广告群发)/.test(lower)) return 'Spam';
  if (/(price|pricing|quote|quotation|discount|moq|bulk|order|报价|价格|折扣|起订量|询价)/.test(lower)) return 'Inquiry';
  if (/(issue|problem|delay|refund|complaint|support|问题|延迟|投诉|退款)/.test(lower)) return 'Support';
  if (/(sample|catalog|brochure|规格|样品|目录|参数)/.test(lower)) return 'Product request';
  return 'Follow-up';
};

const parseSuggestionJson = (raw: string) => {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned) as {
    intent?: string;
    customerContext?: string;
    knowledgeContext?: string;
  };
};

export function AgentContextSuggestions({
  channel,
  subject = '',
  body = '',
  additionalContext = '',
  cacheKey,
  clientId,
  emailAddress,
  whatsappNumber,
  defaultAnalysisMode,
  persistedInsight,
  persistedInsightKey,
  clientName,
  hasClient,
  hasKnowledge,
  hasCustomerMessage,
  onDraftReply,
  onAddComment,
  onCreateLead,
  onAddToKnowledge,
  onDeleteItem,
  onMarkFollowUp,
  autoScrollOnOpen,
  onSaveAnalysis
}: AgentContextSuggestionsProps) {
  const {
    language,
    agentHubAgents,
    addAgentRunRecord,
    llmConfigs,
    llmMappings,
    activeLLMId,
    agentContextAnalysisConfig,
    updateAgentContextAnalysisConfig,
    incrementAgentHubTaskCount,
    notify
  } = useStore();
  const t = useTranslation(language);
  const [aiInsight, setAiInsight] = useState<{ intent: string; customerContext: string; knowledgeContext: string } | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [runningOptionId, setRunningOptionId] = useState<string | null>(null);
  const [optionStatus, setOptionStatus] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const agent = useMemo(() => {
    const preferredId = channel === 'whatsapp' ? 'whatsapp_agent' : 'follow_up_agent';
    return agentHubAgents.find(item => item.id === preferredId)
      || agentHubAgents.find(item => item.tools.some(tool => tool.startsWith(channel) || tool.includes('send')));
  }, [agentHubAgents, channel]);

  const customerMessageAvailable = hasCustomerMessage !== false;
  const text = `${subject} ${body} ${additionalContext}`.trim();
  const fallbackIntent = inferIntent(text);
  const intent = aiInsight?.intent || fallbackIntent;
  const normalizedIntent = String(intent || '').toLowerCase();
  const spamLike = normalizedIntent.includes('spam')
    || normalizedIntent.includes('junk')
    || normalizedIntent.includes('垃圾')
    || /(spam|junk|phishing|unsubscribe|casino|lottery|seo service|crypto|垃圾|骚扰|退订|博彩|中奖|钓鱼|广告群发)/i.test(text);
  const automationReady = agent?.contextSuggestionMode === 'auto';
  const canAutoExecute = automationReady && agent.guardrail === 'auto';
  const executionLabel = canAutoExecute ? t('Auto-ready') : automationReady ? t('Review-gated automation') : t('Manual options');
  const llmConfig = llmConfigs.find(llm => llm.id === (llmMappings.agent_context_suggestions || activeLLMId)) || null;
  const cachedInsight = customerMessageAvailable && persistedInsightKey === cacheKey ? persistedInsight : undefined;
  const resolvedAnalysisMode: AgentContextAnalysisMode =
    (clientId && agentContextAnalysisConfig.clientModes[clientId])
    || (emailAddress && agentContextAnalysisConfig.emailModes[emailAddress.toLowerCase()])
    || (whatsappNumber && agentContextAnalysisConfig.whatsappModes[whatsappNumber])
    || defaultAnalysisMode
    || agentContextAnalysisConfig.globalMode
    || 'manual';

  useEffect(() => {
    if (!autoScrollOnOpen || !cacheKey) return;
    const scrollToPanel = () => panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    const frame = window.requestAnimationFrame(scrollToPanel);
    const shortTimer = window.setTimeout(scrollToPanel, 140);
    const finalTimer = window.setTimeout(scrollToPanel, 420);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(shortTimer);
      window.clearTimeout(finalTimer);
    };
  }, [autoScrollOnOpen, cacheKey]);

  const setCurrentAnalysisMode = (mode: AgentContextAnalysisMode) => {
    if (clientId) {
      updateAgentContextAnalysisConfig({
        clientModes: { ...agentContextAnalysisConfig.clientModes, [clientId]: mode }
      });
      return;
    }
    if (emailAddress) {
      updateAgentContextAnalysisConfig({
        emailModes: { ...agentContextAnalysisConfig.emailModes, [emailAddress.toLowerCase()]: mode }
      });
      return;
    }
    if (whatsappNumber) {
      updateAgentContextAnalysisConfig({
        whatsappModes: { ...agentContextAnalysisConfig.whatsappModes, [whatsappNumber]: mode }
      });
    }
  };

  const buildNoCustomerMessageInsight = (): AgentContextSuggestionInsight => ({
    intent: language === 'zh' ? '等待客户回复' : 'Awaiting customer reply',
    customerContext: language === 'zh'
      ? '客户尚未发送入站消息，不能基于我方已发送内容判断客户意图。'
      : 'No inbound customer message has been received, so our outbound messages are not treated as customer intent.',
    knowledgeContext: language === 'zh'
      ? '当前只能参考客户档案、产品和知识库；建议等待客户回复，或发送低压跟进。'
      : 'Only CRM, product, and knowledge context are available; wait for a customer reply or send a light follow-up.',
    analyzedAt: new Date().toISOString(),
    modelId: llmConfig?.id
  });

  const runAnalysis = (signal?: AbortSignal) => {
    if (!customerMessageAvailable) {
      setAiInsight(buildNoCustomerMessageInsight());
      setLoadingInsight(false);
      return Promise.resolve();
    }
    if (!llmConfig || !text || !cacheKey) {
      setAiInsight(null);
      return Promise.resolve();
    }
    setLoadingInsight(true);
    return fetch('/api/chat/magic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      signal,
      body: JSON.stringify({
        command: `Analyze this ${channel} conversation for a CRM agent context panel. Return only JSON with keys: intent, customerContext, knowledgeContext. Keep each value short and actionable. Use ${language === 'zh' ? 'Chinese' : 'English'}.

Important direction rule:
- Infer customer intent only from inbound customer messages.
- Outbound messages sent by our team are background context only.
- If there is no inbound customer message, say the customer intent is unknown and do not treat our outbound text as a customer request.
- Use CRM profile, AI summaries, best next step, comments, activity logs, products, RAG, and other-channel history only to enrich customerContext and knowledgeContext.

Subject/contact: ${subject || clientName || 'N/A'}
Message:
${body || 'N/A'}

Broader CRM/customer context:
${additionalContext || 'N/A'}`,
        context: { channel, subject, body, additionalContext, clientName, hasClient, hasKnowledge },
        llmConfig,
        skipKnowledgeBase: false
      })
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to analyze context suggestions');
        const parsed = parseSuggestionJson(data.result || '');
        const insight = {
          intent: parsed.intent || fallbackIntent,
          customerContext: parsed.customerContext || '',
          knowledgeContext: parsed.knowledgeContext || '',
          analyzedAt: new Date().toISOString(),
          modelId: llmConfig.id
        };
        await onSaveAnalysis?.(cacheKey, insight);
        setAiInsight(insight);
        incrementAgentHubTaskCount('context_suggestion_agent');
      })
      .catch(error => {
        if (error?.name !== 'AbortError') setAiInsight(null);
      })
      .finally(() => {
        if (!signal?.aborted) setLoadingInsight(false);
      });
  };

  useEffect(() => {
    if (!customerMessageAvailable) {
      setAiInsight(buildNoCustomerMessageInsight());
      setLoadingInsight(false);
      return;
    }
    if (cachedInsight) {
      setAiInsight(cachedInsight);
      setLoadingInsight(false);
      return;
    }
    if (resolvedAnalysisMode !== 'auto' || !llmConfig || !text) {
      setAiInsight(null);
      setLoadingInsight(false);
      return;
    }
    const controller = new AbortController();
    void runAnalysis(controller.signal);
    return () => controller.abort();
  }, [cacheKey, cachedInsight, resolvedAnalysisMode, llmConfig?.id, text, channel, subject, body, additionalContext, clientName, hasClient, hasKnowledge, hasCustomerMessage, language, fallbackIntent]);

  const recordOption = async (optionId: string, label: string, run: () => void | Promise<void>) => {
    if (runningOptionId) return;
    setRunningOptionId(optionId);
    setOptionStatus(language === 'zh' ? `正在执行：${label}...` : `Running: ${label}...`);
    if (agent) {
      incrementAgentHubTaskCount(agent.id);
      addAgentRunRecord({
        agentId: agent.id,
        agentName: agent.name,
        trigger: canAutoExecute ? 'system' : 'manual',
        status: canAutoExecute ? 'completed' : 'planned',
        plan: `${label} from ${channel} context suggestions.`,
        expectedResult: 'Use conversation context to move the customer toward the next best action.',
        actualResult: canAutoExecute ? 'Option executed from the context suggestion panel.' : 'Manual option selected from the context suggestion panel.'
      });
    }
    try {
      await Promise.resolve(run());
      setOptionStatus(language === 'zh' ? `${label} 已完成。` : `${label} completed.`);
      notify(language === 'zh' ? `${label} 已完成。` : `${label} completed.`, 'success');
      window.setTimeout(() => setOptionStatus(null), 2500);
    } catch (error: any) {
      const message = error?.message || (language === 'zh' ? `${label} 执行失败。` : `${label} failed.`);
      setOptionStatus(message);
      notify(message, 'error');
    } finally {
      setRunningOptionId(null);
    }
  };

  const label = (zh: string, en: string) => language === 'zh' ? zh : en;
  const deleteLabel = channel === 'email' ? label('删除邮件', 'Delete Email') : label('删除对话', 'Delete Conversation');
  const options: SuggestionOption[] = [];

  if (spamLike && onDeleteItem) {
    options.push({
      id: 'delete_spam',
      label: deleteLabel,
      description: label('将明显无效或垃圾内容从收件箱移除。', 'Remove clearly irrelevant or spam content from the inbox.'),
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger',
      onClick: () => recordOption('delete_spam', deleteLabel, onDeleteItem)
    });
  }

  if (!spamLike) {
    options.push({
      id: 'draft_reply',
      label: t('Draft AI Reply'),
      description: t('Generate a reply using the current message, client context, and RAG.'),
      icon: <Sparkles className="w-4 h-4" />,
      onClick: () => recordOption('draft_reply', t('Draft AI Reply'), onDraftReply)
    });
  }

  if (onMarkFollowUp && !spamLike) {
    options.push({
      id: 'mark_follow_up',
      label: label('设为待跟进', 'Set Follow-up'),
      description: label('创建一个后续处理提醒，避免客户请求遗漏。', 'Create a follow-up reminder so this customer request is not missed.'),
      icon: <CalendarClock className="w-4 h-4" />,
      variant: 'success',
      onClick: () => recordOption('mark_follow_up', label('设为待跟进', 'Set Follow-up'), onMarkFollowUp)
    });
  }

  if (onAddComment) {
    options.push({
      id: 'add_comment',
      label: t('Add Internal Comment'),
      description: t('Create an internal note with the detected intent and suggested next step.'),
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: () => recordOption('add_comment', t('Add Internal Comment'), onAddComment)
    });
  }

  if (!hasClient && onCreateLead && !spamLike) {
    options.push({
      id: 'create_lead',
      label: t('Create Lead'),
      description: t('Create or link a customer record before follow-up.'),
      icon: <UserPlus className="w-4 h-4" />,
      onClick: () => recordOption('create_lead', t('Create Lead'), onCreateLead)
    });
  }

  if (onAddToKnowledge && !spamLike) {
    options.push({
      id: 'add_knowledge',
      label: t('Add to RAG'),
      description: t('Save this conversation as reusable customer context.'),
      icon: <Bot className="w-4 h-4" />,
      disabled: hasKnowledge,
      onClick: () => recordOption('add_knowledge', t('Add to RAG'), onAddToKnowledge)
    });
  }

  if (!spamLike && onDeleteItem) {
    options.push({
      id: 'delete_low_value',
      label: deleteLabel,
      description: label('人工确认此内容无需保留时，可直接移除。', 'Remove this item when you decide it does not need to be retained.'),
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger',
      onClick: () => recordOption('delete_low_value', deleteLabel, onDeleteItem)
    });
  }

  return (
    <section ref={panelRef} className="mt-6 rounded-lg border border-blue-500/30 bg-blue-950/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300">
          <Bot className="w-4 h-4" />
          {t('Agent Context & Suggestions')} <span className="text-blue-400">&amp; {options.length} {t('Options')}</span>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-bold uppercase',
          canAutoExecute ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : automationReady ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-slate-600 bg-slate-900 text-slate-400'
        )}>
          {canAutoExecute ? <Zap className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
          {executionLabel}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={resolvedAnalysisMode}
          onChange={e => setCurrentAnalysisMode(e.target.value as AgentContextAnalysisMode)}
          className="bg-slate-950 border border-blue-500/30 rounded-md px-2 py-1.5 text-xs text-slate-300 outline-none"
          title={t('Analysis Mode')}
        >
          <option value="manual">{t('Manual analysis')}</option>
          <option value="auto">{t('Auto analysis')}</option>
        </select>
        {resolvedAnalysisMode === 'manual' && (
          <button
            onClick={() => void runAnalysis()}
            disabled={loadingInsight || !llmConfig}
            className="inline-flex items-center gap-2 rounded-md border border-blue-500/40 bg-blue-600/10 px-2.5 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-600/20 disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
          >
            {loadingInsight ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {cachedInsight ? t('Analyze again') : t('Analyze')}
          </button>
        )}
        {cachedInsight && (
          <span className="text-[10px] text-slate-500">{t('Cached analysis')}: {new Date(cachedInsight.analyzedAt).toLocaleString()}</span>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <div className="flex items-start gap-2">
          <CornerDownRight className="mt-0.5 w-4 h-4 text-blue-400" />
          <span>{t('Intent analyzed as')} <span className="font-bold text-blue-200">{t(intent)}</span>. {loadingInsight && <Loader2 className="ml-1 inline w-3 h-3 animate-spin text-blue-300" />}</span>
        </div>
        <div className="flex items-start gap-2">
          <CornerDownRight className="mt-0.5 w-4 h-4 text-blue-400" />
          <span>{aiInsight?.customerContext || (clientName ? `${t('Related customer')}: ${clientName}` : t('No linked customer yet.'))}</span>
        </div>
        <div className="flex items-start gap-2">
          <CornerDownRight className="mt-0.5 w-4 h-4 text-blue-400" />
          <span>{aiInsight?.knowledgeContext || (hasKnowledge ? t('Relevant CRM/RAG context is available.') : t('No RAG snippet found yet; consider saving this context.'))}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-blue-500/20 pt-4 flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.id}
            onClick={option.onClick}
            disabled={option.disabled || !!runningOptionId}
            title={option.description}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition-colors disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500",
              option.variant === 'danger'
                ? "border-red-500/40 bg-red-600/10 text-red-200 hover:bg-red-600/20"
                : option.variant === 'success'
                  ? "border-emerald-500/40 bg-emerald-600/10 text-emerald-200 hover:bg-emerald-600/20"
                  : "border-blue-500/40 bg-blue-600/10 text-blue-200 hover:bg-blue-600/20"
            )}
          >
            {runningOptionId === option.id ? <Loader2 className="w-4 h-4 animate-spin" /> : option.icon}
            {option.label}
          </button>
        ))}
      </div>
      {optionStatus && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-blue-500/20 bg-slate-950/70 px-3 py-2 text-xs text-blue-100">
          {runningOptionId ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-300" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />}
          {optionStatus}
        </div>
      )}
    </section>
  );
}
