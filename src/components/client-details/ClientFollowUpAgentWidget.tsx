import React from 'react';
import { Loader2, Settings, Sparkles, Workflow } from 'lucide-react';
import { useStore } from '../../store';
import { ConversationToolbarButton, ConversationToolbarPill } from '../inbox-ui/ConversationToolbar';

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
  const { language } = useStore();
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
          <Sparkles className="h-4 w-4" /> AI Follow-Up Agent
        </h3>
        <ConversationToolbarButton tone="default" compact onClick={onOpenSettings} title={label('智能体设置', 'Agent Settings')}>
          <Settings className="h-4 w-4" />
        </ConversationToolbarButton>
      </div>

      <div className="space-y-4">
        {!enabled ? (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center">
            <p className="mb-3 text-sm leading-6 text-slate-500">
              {label('使用 AI 自动分析客户旅程并推动后续跟进。', 'Automate follow-ups and analyze the customer journey using AI.')}
            </p>
            <ConversationToolbarButton tone="violet" onClick={onOpenSettings}>
              <Workflow className="h-3.5 w-3.5" />
              {label('启用智能体', 'Enable Agent')}
            </ConversationToolbarButton>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-[20px] border border-indigo-100 bg-indigo-50/70 px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
                </span>
                <span className="text-xs font-medium text-indigo-700">{label('智能体已启用', 'Agent Active')}</span>
              </div>
              <ConversationToolbarPill tone="violet">
                {label('模式', 'Mode')}: {mode === 'auto_email' ? label('自动邮件', 'Auto Email') : label('仅提示', 'Prompt Only')}
              </ConversationToolbarPill>
            </div>

            <div className="space-y-3">
              {summary && (
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                  <h4 className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {label('长期摘要', 'Long-term summary')}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-700">{summary}</p>
                </div>
              )}

              {nextStep && (
                <div className="rounded-[20px] border border-indigo-100 bg-indigo-50/70 p-4">
                  <h4 className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-700">
                    {label('建议下一步', 'Suggested Next Step')}
                  </h4>
                  <p className="text-sm font-medium text-slate-800">{nextStep}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <ConversationToolbarButton
                  onClick={onRunAgent}
                  disabled={loading}
                  tone="violet"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Sparkles className="h-3.5 w-3.5" />}
                  {label('运行智能体', 'Run Agent')}
                </ConversationToolbarButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
