import React from 'react';
import { Loader2, Send, Sparkles, Thermometer } from 'lucide-react';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';
import { ConversationSectionCard, ConversationSectionHeader } from '../inbox-ui/ConversationSectionCard';
import { ConversationToolbarButton, ConversationToolbarPill } from '../inbox-ui/ConversationToolbar';

export interface ClientAiRadarData {
  sentiment: string;
  temperature: number;
  icebreaker: string;
  summary: string;
  leadScore?: number;
  leadSummary?: string;
  leadNextStep?: string;
  nextStep?: string;
}

interface ClientAiRadarCardProps {
  visibleAiData: ClientAiRadarData | null;
  loading: boolean;
  leadScore?: number;
  summaryText: string;
  nextStepText: string;
  hasLeadRecord: boolean;
  onAnalyze: (refresh: boolean) => void;
  onInsertIcebreaker: () => void;
}

export function ClientAiRadarCard({
  visibleAiData,
  loading,
  leadScore,
  summaryText,
  nextStepText,
  hasLeadRecord,
  onAnalyze,
  onInsertIcebreaker,
}: ClientAiRadarCardProps) {
  const { language } = useStore();
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const score = Number(visibleAiData?.leadScore ?? visibleAiData?.temperature ?? leadScore ?? 0);

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        icon={<Thermometer className="h-4 w-4 text-cyan-700" />}
        title="AI Radar"
        description={label(
          '把评分、摘要、推荐下一步和可直接使用的破冰话术放在一个决策卡里。',
          'Keep score, summary, best next step, and a usable opener in one decision card.',
        )}
        actions={
          loading ? (
            <ConversationToolbarPill tone="info">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {label('分析中', 'Analyzing')}
            </ConversationToolbarPill>
          ) : (
            <ConversationToolbarButton
              tone="info"
              compact
              onClick={() => onAnalyze(!!visibleAiData)}
            >
              {visibleAiData ? label('刷新', 'Refresh') : label('分析', 'Analyze')}
            </ConversationToolbarButton>
          )
        }
      />

      {visibleAiData ? (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-cyan-100 bg-[#f8fbff] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                {label('线索评分', 'Lead score')}
              </span>
              <span className="text-2xl font-bold text-slate-950">{score}/100</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className={visibleAiData.sentiment === 'COLD' ? 'text-blue-600' : 'text-slate-400'}>
                  {label('冷', 'Cold')}
                </span>
                <span className={visibleAiData.sentiment === 'HOT' ? 'text-orange-500' : 'text-slate-400'}>
                  {label('热', 'Hot')}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    score > 70 ? 'bg-orange-500' : score > 30 ? 'bg-amber-400' : 'bg-blue-500',
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </div>

          {(visibleAiData.leadSummary || summaryText) && (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {hasLeadRecord ? label('Lead 摘要', 'Lead summary') : label('客户摘要', 'Customer summary')}
              </span>
              <p className="mt-2 text-sm leading-7 text-slate-700">{visibleAiData.leadSummary || summaryText}</p>
            </div>
          )}

          {(visibleAiData.leadNextStep || nextStepText) && (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                {label('推荐下一步', 'Best next step')}
              </span>
              <p className="mt-2 text-sm font-medium leading-7 text-slate-800">{visibleAiData.leadNextStep || nextStepText}</p>
            </div>
          )}

          {visibleAiData.icebreaker && (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                    {label('建议破冰话术', 'Suggested opener')}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-700">"{visibleAiData.icebreaker}"</p>
                  <div className="mt-3 flex justify-end">
                    <ConversationToolbarButton tone="info" compact onClick={onInsertIcebreaker}>
                      <Send className="h-3.5 w-3.5" />
                      {label('插入', 'Insert')}
                    </ConversationToolbarButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {label('AI 情报', 'AI intelligence')}
            </span>
            <p className="mt-2 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600">
              {visibleAiData.summary}
            </p>
          </div>
        </div>
      ) : (
        <div className="py-2 text-sm text-slate-500">
          {leadScore !== undefined ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-[24px] border border-cyan-100 bg-[#f8fbff] p-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  {label('线索评分', 'Lead score')}
                </span>
                <span className="text-2xl font-bold text-slate-950">{leadScore}/100</span>
              </div>
              {summaryText && <p className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">{summaryText}</p>}
              {nextStepText && <p className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-medium leading-7 text-slate-800">{nextStepText}</p>}
            </div>
          ) : (
            label('需要先运行目标扫描或线索分析。', 'AI analysis requires target scan.')
          )}
        </div>
      )}
    </ConversationSectionCard>
  );
}
