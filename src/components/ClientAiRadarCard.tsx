import React from 'react';
import { Loader2, Send, Sparkles, Thermometer } from 'lucide-react';
import { cn } from '../lib/utils';

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
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <Thermometer className="w-4 h-4" /> AI Radar
        </h3>
        {!loading && (
          <button onClick={() => onAnalyze(!!visibleAiData)} className="text-[10px] bg-cyan-900/40 text-cyan-400 hover:bg-cyan-900 px-2 py-1 rounded">
            {visibleAiData ? 'Refresh' : 'Analyze'}
          </button>
        )}
        {loading && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
      </div>

      {visibleAiData ? (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-slate-900 rounded-lg p-3 border border-cyan-500/20">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-cyan-400 font-bold uppercase">Lead Score</span>
                <span className="text-lg font-bold text-white">{Number(visibleAiData.leadScore ?? visibleAiData.temperature ?? 0)}/100</span>
              </div>
            </div>
            {(visibleAiData.leadSummary || summaryText) && (
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <span className="text-[10px] text-slate-500 font-bold uppercase">{hasLeadRecord ? 'Lead Summary' : 'Customer Summary'}</span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{visibleAiData.leadSummary || summaryText}</p>
              </div>
            )}
            {(visibleAiData.leadNextStep || nextStepText) && (
              <div className="bg-cyan-950/30 rounded-lg p-3 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 font-bold uppercase">Best Next Step</span>
                <p className="text-sm text-white mt-1 font-medium">{visibleAiData.leadNextStep || nextStepText}</p>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className={visibleAiData.sentiment === 'COLD' ? 'text-blue-400' : 'text-slate-400'}>Cold</span>
              <span className={visibleAiData.sentiment === 'HOT' ? 'text-orange-400' : 'text-slate-400'}>Hot</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  visibleAiData.temperature > 70 ? "bg-orange-500 shadow-[0_0_10px_orange]" :
                  visibleAiData.temperature > 30 ? "bg-amber-400" : "bg-blue-400"
                )}
                style={{ width: `${visibleAiData.temperature}%` }}
              />
            </div>
          </div>

          {visibleAiData.icebreaker && (
            <div className="bg-slate-900 rounded-lg p-3 relative">
              <Sparkles className="w-4 h-4 text-amber-400 absolute top-3 left-3" />
              <p className="text-xs text-slate-300 pl-6 leading-relaxed">
                <span className="font-bold text-slate-500 block mb-1">Generated Icebreaker:</span>
                "{visibleAiData.icebreaker}"
              </p>
              <div className="mt-2 flex justify-end">
                <button onClick={onInsertIcebreaker} className="text-[10px] flex items-center gap-1 bg-cyan-600 text-white px-2 py-1 rounded hover:bg-cyan-500 transition-colors">
                  <Send className="w-3 h-3" /> Insert
                </button>
              </div>
            </div>
          )}

          <div>
            <span className="font-bold text-[10px] text-slate-500 block mb-1 uppercase">AI Intelligence</span>
            <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-slate-700 pl-2">
              {visibleAiData.summary}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500 text-sm">
          {leadScore !== undefined ? (
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 font-bold uppercase">Lead Score</span>
                <span className="text-lg font-bold text-white">{leadScore}/100</span>
              </div>
              {summaryText && <p className="text-xs text-slate-300 leading-relaxed">{summaryText}</p>}
              {nextStepText && <p className="text-sm text-white font-medium">Next: {nextStepText}</p>}
            </div>
          ) : 'AI analysis requires target scan.'}
        </div>
      )}
    </div>
  );
}
