import React from 'react';
import { Loader2, Send, Sparkles, Thermometer } from 'lucide-react';
import { cn } from '../../lib/utils';

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
  const score = Number(visibleAiData?.leadScore ?? visibleAiData?.temperature ?? leadScore ?? 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
          <Thermometer className="h-4 w-4" /> AI Radar
        </h3>
        {!loading && (
          <button
            onClick={() => onAnalyze(!!visibleAiData)}
            className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
          >
            {visibleAiData ? 'Refresh' : 'Analyze'}
          </button>
        )}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />}
      </div>

      {visibleAiData ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-cyan-100 bg-[#f8fbff] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Lead score</span>
              <span className="text-2xl font-bold text-slate-950">{score}/100</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className={visibleAiData.sentiment === 'COLD' ? 'text-blue-600' : 'text-slate-400'}>Cold</span>
                <span className={visibleAiData.sentiment === 'HOT' ? 'text-orange-500' : 'text-slate-400'}>Hot</span>
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {hasLeadRecord ? 'Lead summary' : 'Customer summary'}
              </span>
              <p className="mt-2 text-sm leading-7 text-slate-700">{visibleAiData.leadSummary || summaryText}</p>
            </div>
          )}

          {(visibleAiData.leadNextStep || nextStepText) && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Best next step</span>
              <p className="mt-2 text-sm font-medium leading-7 text-slate-800">{visibleAiData.leadNextStep || nextStepText}</p>
            </div>
          )}

          {visibleAiData.icebreaker && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Suggested opener</div>
                  <p className="mt-2 text-sm leading-7 text-slate-700">"{visibleAiData.icebreaker}"</p>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={onInsertIcebreaker}
                      className="inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Insert
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">AI intelligence</span>
            <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm italic leading-7 text-slate-600">
              {visibleAiData.summary}
            </p>
          </div>
        </div>
      ) : (
        <div className="py-4 text-sm text-slate-500">
          {leadScore !== undefined ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-cyan-100 bg-[#f8fbff] p-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Lead score</span>
                <span className="text-2xl font-bold text-slate-950">{leadScore}/100</span>
              </div>
              {summaryText && <p className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">{summaryText}</p>}
              {nextStepText && <p className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-medium leading-7 text-slate-800">{nextStepText}</p>}
            </div>
          ) : 'AI analysis requires target scan.'}
        </div>
      )}
    </div>
  );
}
