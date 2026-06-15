import React from 'react';

interface LiveChatCustomerInsightCardProps {
  client?: {
    agentSummary?: string;
    leadSummary?: string;
    agentNextStep?: string;
    leadNextStep?: string;
  } | null;
}

export function LiveChatCustomerInsightCard({ client }: LiveChatCustomerInsightCardProps) {
  if (!client) return null;

  const summary = client.agentSummary || client.leadSummary;
  const nextStep = client.agentNextStep || client.leadNextStep;
  if (!summary && !nextStep) return null;

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 text-sm text-slate-200">
      {summary && (
        <div className="mb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300">AI Customer Summary</div>
          <div className="mt-1 leading-relaxed">{summary}</div>
        </div>
      )}
      {nextStep && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Best Next Step</div>
          <div className="mt-1 leading-relaxed">{nextStep}</div>
        </div>
      )}
    </div>
  );
}

interface LiveChatEvidenceItem {
  label: string;
  value: string;
}

interface LiveChatEvidencePanelProps {
  language: 'en' | 'zh';
  items: LiveChatEvidenceItem[];
}

export function LiveChatEvidencePanel({ language, items }: LiveChatEvidencePanelProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-200">
            {language === 'zh' ? '访客上下文证据' : 'Visitor Context Evidence'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {language === 'zh'
              ? '这些信息会作为 Live Chat Agent 建议的上下文依据。'
              : 'These facts are used as context for Live Chat Agent suggestions.'}
          </div>
        </div>
        <span className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-bold uppercase text-violet-200">
          {items.length} {language === 'zh' ? '项' : 'facts'}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(item => (
          <div key={`${item.label}:${item.value}`} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</div>
            <div className="mt-1 break-words text-xs text-slate-200">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
