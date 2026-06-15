import React from 'react';
import { Loader2, Settings, Sparkles, Workflow } from 'lucide-react';

interface ClientFollowUpAgentWidgetProps {
  enabled?: boolean;
  mode?: 'manual' | 'auto_email';
  summary?: string;
  nextStep?: string;
  loading: boolean;
  onOpenSettings: () => void;
  onRunAgent: () => void;
}

export function ClientFollowUpAgentWidget({
  enabled,
  mode,
  summary,
  nextStep,
  loading,
  onOpenSettings,
  onRunAgent,
}: ClientFollowUpAgentWidgetProps) {
  return (
    <div className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-indigo-900/50 rounded-xl p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Settings className="w-24 h-24 text-indigo-400" />
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> AI Follow-Up Agent
        </h3>
        <button
          onClick={onOpenSettings}
          className="text-slate-400 hover:text-white transition-colors p-1"
          title="Agent Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 relative z-10">
        {!enabled ? (
          <div className="text-center py-4">
            <p className="text-slate-400 text-xs mb-3">Automate follow-ups and analyze client journey using AI.</p>
            <button
              onClick={onOpenSettings}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-2 transition-colors font-medium border border-indigo-500 shadow-lg shadow-indigo-900/20"
            >
              <Workflow className="w-3 h-3" /> Enable Agent
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-xs font-medium text-indigo-300">Agent Active</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Mode: {mode === 'auto_email' ? 'Auto Email' : 'Prompt Only'}
              </span>
            </div>

            <div className="space-y-3">
              {summary && (
                <div className="bg-slate-900/80 rounded-lg p-3 border border-indigo-900/30">
                  <h4 className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Long-term summary</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{summary}</p>
                </div>
              )}

              {nextStep && (
                <div className="bg-indigo-900/20 rounded-lg p-3 border border-indigo-500/20">
                  <h4 className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Suggested Next Step</h4>
                  <p className="text-sm font-medium text-white">{nextStep}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={onRunAgent}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded font-medium flex items-center gap-2 transition-colors shadow shadow-indigo-900/20"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                  Run Agent
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
