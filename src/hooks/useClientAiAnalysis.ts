import { useState } from 'react';
import { useAuthStore } from '../authStore';
import { Client, ClientContact, ContactMethod, Deal, Log, useStore } from '../store';
import { buildLeadScoringSignature } from '../lib/leadScoring';

export interface ClientAiAnalysisData {
  sentiment: string;
  temperature: number;
  icebreaker: string;
  summary: string;
  leadScore?: number;
  leadSummary?: string;
  leadNextStep?: string;
  nextStep?: string;
}

interface UseClientAiAnalysisArgs {
  client?: Client | null;
  leadRecord?: Deal | null;
  leadLogs: Log[];
  displayContacts: ClientContact[];
  onOpenEmailDraft: (email: string, body: string) => void;
}

const hasCjkText = (value: string | undefined | null) => /[\u3400-\u9fff]/.test(value || '');

const internalTextMatchesSystemLanguage = (value: string | undefined | null, language: string) => {
  const text = String(value || '').trim();
  if (!text) return true;
  return language === 'zh' ? hasCjkText(text) : !hasCjkText(text);
};

export function useClientAiAnalysis({
  client,
  leadRecord,
  leadLogs,
  displayContacts,
  onOpenEmailDraft,
}: UseClientAiAnalysisArgs) {
  const { deals, logs, emails, llmConfigs, activeLLMId, llmMappings, updateDeal, notify, language, incrementAgentHubTaskCount } = useStore();
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<ClientAiAnalysisData | null>(null);

  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(c => c.id === id) || llmConfigs[0];
  };

  const leadScore = leadRecord ? leadRecord.leadScore : client?.leadScore;
  const summaryText = leadRecord
    ? leadRecord.leadSummary
    : (client?.agentSummary || client?.leadSummary);
  const nextStepText = leadRecord
    ? leadRecord.leadNextStep
    : (client?.agentNextStep || client?.leadNextStep);

  const buildCurrentAnalysisSignature = () => {
    if (!client) return '';
    return `${buildLeadScoringSignature(client, leadRecord ? leadLogs : logs, emails, {
      lead: leadRecord || deals
        .filter(deal => deal.clientId === client.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null,
      workflows: useStore.getState().agentWorkflows,
      now: new Date()
    })}:lang:${language}`;
  };

  const existingAnalysisResult = (): ClientAiAnalysisData | null => {
    if (!client) return null;
    const score = leadRecord ? leadRecord.leadScore : client.leadScore;
    const summary = leadRecord ? leadRecord.leadSummary : (client.agentSummary || client.leadSummary);
    const nextStep = leadRecord ? leadRecord.leadNextStep : (client.agentNextStep || client.leadNextStep);
    const icebreaker = leadRecord ? leadRecord.leadIcebreaker : client.leadIcebreaker;
    if (score === undefined || !summary || !nextStep) return null;
    if (!internalTextMatchesSystemLanguage(summary, language) || !internalTextMatchesSystemLanguage(nextStep, language)) return null;
    return {
      sentiment: Number(score) >= 70 ? 'HOT' : Number(score) >= 35 ? 'WARM' : 'COLD',
      temperature: Number(score) || 0,
      icebreaker: icebreaker || '',
      summary,
      leadScore: Number(score) || 0,
      leadSummary: summary,
      leadNextStep: nextStep
    };
  };

  const findPreferredContactValue = (types: ContactMethod['type'][]) => {
    if (!client) return '';
    const methods = [
      ...(client.contactMethods || []),
      ...displayContacts.flatMap(contact => contact.contactMethods || [])
    ];
    return methods.find(method => types.includes(method.type) && method.value)?.value || '';
  };

  const handleInsertIcebreaker = async () => {
    if (!client) return;
    const icebreaker = String((aiData || existingAnalysisResult())?.icebreaker || '').trim();
    if (!icebreaker) {
      notify(language === 'zh' ? '暂无可插入的破冰话术。' : 'No icebreaker is available to insert.', 'warning');
      return;
    }
    const email = findPreferredContactValue(['email']);
    if (email) {
      onOpenEmailDraft(email, icebreaker);
      notify(language === 'zh' ? '已插入到邮件草稿。' : 'Inserted into an email draft.', 'success');
      return;
    }
    await navigator.clipboard.writeText(icebreaker).catch(() => undefined);
    notify(
      findPreferredContactValue(['whatsapp', 'phone'])
        ? (language === 'zh' ? '客户没有邮箱，已复制话术，可粘贴到 WhatsApp。' : 'No email found. Copied the icebreaker for WhatsApp.')
        : (language === 'zh' ? '未找到可用联系方式，已复制话术。' : 'No usable contact found. Copied the icebreaker.'),
      'info'
    );
  };

  const handleAnalyze = async (forceRefresh = false) => {
    if (!client) return;
    const signature = buildCurrentAnalysisSignature();
    const existingResult = existingAnalysisResult();
    const previousSignature = leadRecord ? leadRecord.leadScoringSignature : client.leadScoringSignature;
    if (!forceRefresh && existingResult && previousSignature === signature) {
      setAiData(existingResult);
      notify(
        language === 'zh'
          ? '客户/Lead 信息没有变化，已复用上次 AI 分析结果。'
          : 'No client/lead changes detected. Reused the previous AI analysis.',
        'info'
      );
      return;
    }
    setLoading(true);
    const clientLogs = leadLogs
      .slice(0, 20)
      .map(log => ({ date: log.date, type: log.type, content: log.content }));
    const clientEmails = emails
      .filter(email => email.clientId === client.id)
      .slice(0, 10)
      .map(email => ({ date: email.date, type: email.type, subject: email.subject, body: email.body?.slice(0, 800) }));
    try {
      const res = await fetch('/api/chat/icebreaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          client,
          lead: leadRecord,
          logs: clientLogs,
          emails: clientEmails,
          llmConfig: getLLMConfig('analysis'),
          embeddingLlmConfig: getLLMConfig('embedding'),
          systemLanguage: useStore.getState().language === 'zh' ? 'Chinese' : 'English',
        })
      });
      const data = await res.json();
      const score = Number(data.leadScore ?? data.temperature ?? 0);
      const fallbackSummary = [
        leadRecord?.name || client.company || client.name,
        client.country,
        leadRecord?.status || client.status,
        client.tags?.length ? `Tags: ${client.tags.join(', ')}` : ''
      ].filter(Boolean).join(' / ');
      const analyzedLeadSummary = data.leadSummary || data.summary || fallbackSummary || (language === 'zh' ? '线索资料还需要更多互动数据。' : 'Lead profile requires more interaction data.');
      const analyzedLeadNextStep = data.leadNextStep || data.nextStep || (leadRecord ? leadRecord.leadNextStep : client.agentNextStep) || (language === 'zh' ? '检查线索资料并选择下一步跟进动作。' : 'Review the lead profile and choose the next follow-up action.');
      const analyzedIcebreaker = String(data.icebreaker || '').trim();
      const normalizedData = { ...data, leadScore: score, leadSummary: analyzedLeadSummary, leadNextStep: analyzedLeadNextStep, icebreaker: analyzedIcebreaker };
      setAiData(normalizedData);
      if (leadRecord) {
        updateDeal(leadRecord.id, {
          leadScore: score,
          leadSummary: analyzedLeadSummary,
          leadNextStep: analyzedLeadNextStep,
          leadIcebreaker: analyzedIcebreaker,
          leadScoringSignature: signature,
          leadScoringAnalyzedAt: new Date().toISOString()
        });
      } else {
        useStore.getState().editClient(client.id, {
          leadScore: score,
          agentSummary: analyzedLeadSummary,
          agentNextStep: analyzedLeadNextStep,
          leadIcebreaker: analyzedIcebreaker,
          leadScoringSignature: signature,
          leadScoringAnalyzedAt: new Date().toISOString()
        });
      }
      useStore.getState().addLog(
        client.id,
        language === 'zh'
          ? `线索评分智能体已分析线索：评分 ${score}/100。下一步：${analyzedLeadNextStep}`
          : `Lead Scoring Agent analyzed lead: score ${score}/100. Next step: ${analyzedLeadNextStep}`,
        undefined,
        'general',
        { source: 'lead_scoring_agent', score, summary: analyzedLeadSummary, leadId: leadRecord?.id, dealId: leadRecord?.id }
      );
      incrementAgentHubTaskCount('lead_scoring_agent');
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const visibleAiData = aiData || existingAnalysisResult();

  return {
    loading,
    leadScore,
    summaryText,
    nextStepText,
    visibleAiData,
    handleAnalyze,
    handleInsertIcebreaker,
    getLLMConfig,
  };
}
