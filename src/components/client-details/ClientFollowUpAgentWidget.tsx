import React from 'react';
import { Loader2, Settings, Sparkles, Workflow } from 'lucide-react';
import { ActionButton } from '../ui';

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
          <Sparkles className="w-4 h-4" /> AI Follow-Up Agent
        </h3>
        <button
          onClick={onOpenSettings}
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Agent Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {!enabled ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center">
            <p className="mb-3 text-xs text-slate-500">Automate follow-ups and analyze client journey using AI.</p>
            <ActionButton
              onClick={onOpenSettings}
              tone="indigo"
              size="sm"
              icon={<Workflow className="w-3 h-3" />}
            >
              Enable Agent
            </ActionButton>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
                </span>
                <span className="text-xs font-medium text-indigo-700">Agent Active</span>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                Mode: {mode === 'auto_email' ? 'Auto Email' : 'Prompt Only'}
              </span>
            </div>

            <div className="space-y-3">
              {summary && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <h4 className="mb-1 text-[10px] font-bold uppercase text-slate-500">Long-term summary</h4>
                  <p className="text-xs leading-relaxed text-slate-700">{summary}</p>
                </div>
              )}

              {nextStep && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                  <h4 className="mb-1 text-[10px] font-bold uppercase text-indigo-700">Suggested Next Step</h4>
                  <p className="text-sm font-medium text-slate-800">{nextStep}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <ActionButton
                  onClick={onRunAgent}
                  disabled={loading}
                  tone="indigo"
                  size="sm"
                  icon={loading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                >
                  Run Agent
                </ActionButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
