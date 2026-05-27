import React, { useMemo } from 'react';
import { Bot, CornerDownRight, MessageSquare, ShieldCheck, Sparkles, UserPlus, Zap } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { cn } from '../lib/utils';

interface SuggestionOption {
  id: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface AgentContextSuggestionsProps {
  channel: 'email' | 'whatsapp';
  subject?: string;
  body?: string;
  clientName?: string;
  hasClient?: boolean;
  hasKnowledge?: boolean;
  onDraftReply: () => void;
  onAddComment?: () => void;
  onCreateLead?: () => void;
  onAddToKnowledge?: () => void;
}

const inferIntent = (text: string) => {
  const lower = text.toLowerCase();
  if (/(price|pricing|quote|quotation|discount|moq|bulk|order|报价|价格|折扣|起订量|询价)/.test(lower)) return 'Inquiry';
  if (/(issue|problem|delay|refund|complaint|support|问题|延迟|投诉|退款)/.test(lower)) return 'Support';
  if (/(sample|catalog|brochure|规格|样品|目录|参数)/.test(lower)) return 'Product request';
  return 'Follow-up';
};

export function AgentContextSuggestions({
  channel,
  subject = '',
  body = '',
  clientName,
  hasClient,
  hasKnowledge,
  onDraftReply,
  onAddComment,
  onCreateLead,
  onAddToKnowledge
}: AgentContextSuggestionsProps) {
  const { language, agentHubAgents, addAgentRunRecord } = useStore();
  const t = useTranslation(language);
  const agent = useMemo(() => {
    const preferredId = channel === 'whatsapp' ? 'whatsapp_agent' : 'follow_up_agent';
    return agentHubAgents.find(item => item.id === preferredId)
      || agentHubAgents.find(item => item.tools.some(tool => tool.startsWith(channel) || tool.includes('send')));
  }, [agentHubAgents, channel]);

  const text = `${subject} ${body}`.trim();
  const intent = inferIntent(text);
  const automationReady = agent?.contextSuggestionMode === 'auto';
  const canAutoExecute = automationReady && agent.guardrail === 'auto';
  const executionLabel = canAutoExecute ? t('Auto-ready') : automationReady ? t('Review-gated automation') : t('Manual options');

  const recordOption = (label: string, run: () => void) => {
    if (agent) {
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
    run();
  };

  const options: SuggestionOption[] = [
    {
      id: 'draft_reply',
      label: t('Draft AI Reply'),
      description: t('Generate a reply using the current message, client context, and RAG.'),
      icon: <Sparkles className="w-4 h-4" />,
      onClick: () => recordOption('Draft AI Reply', onDraftReply)
    }
  ];

  if (onAddComment) {
    options.push({
      id: 'add_comment',
      label: t('Add Internal Comment'),
      description: t('Create an internal note with the detected intent and suggested next step.'),
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: () => recordOption('Add Internal Comment', onAddComment)
    });
  }

  if (!hasClient && onCreateLead) {
    options.push({
      id: 'create_lead',
      label: t('Create Lead'),
      description: t('Create or link a customer record before follow-up.'),
      icon: <UserPlus className="w-4 h-4" />,
      onClick: () => recordOption('Create Lead', onCreateLead)
    });
  }

  if (onAddToKnowledge) {
    options.push({
      id: 'add_knowledge',
      label: t('Add to RAG'),
      description: t('Save this conversation as reusable customer context.'),
      icon: <Bot className="w-4 h-4" />,
      disabled: hasKnowledge,
      onClick: () => recordOption('Add to RAG', onAddToKnowledge)
    });
  }

  return (
    <section className="mt-6 rounded-lg border border-blue-500/30 bg-blue-950/20 p-4">
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

      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <div className="flex items-start gap-2">
          <CornerDownRight className="mt-0.5 w-4 h-4 text-blue-400" />
          <span>{t('Intent analyzed as')} <span className="font-bold text-blue-200">{t(intent)}</span>.</span>
        </div>
        <div className="flex items-start gap-2">
          <CornerDownRight className="mt-0.5 w-4 h-4 text-blue-400" />
          <span>{clientName ? `${t('Related customer')}: ${clientName}` : t('No linked customer yet.')}</span>
        </div>
        <div className="flex items-start gap-2">
          <CornerDownRight className="mt-0.5 w-4 h-4 text-blue-400" />
          <span>{hasKnowledge ? t('Relevant CRM/RAG context is available.') : t('No RAG snippet found yet; consider saving this context.')}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-blue-500/20 pt-4 flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.id}
            onClick={option.onClick}
            disabled={option.disabled}
            title={option.description}
            className="inline-flex items-center gap-2 rounded-md border border-blue-500/40 bg-blue-600/10 px-3 py-2 text-sm font-bold text-blue-200 hover:bg-blue-600/20 disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
