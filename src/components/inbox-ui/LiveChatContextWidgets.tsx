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
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800 shadow-sm">
      {summary && (
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">AI Customer Summary</div>
          <div className="mt-1 leading-relaxed">{summary}</div>
        </div>
      )}
      {nextStep && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Best Next Step</div>
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
    <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">
            {'Visitor Context Evidence'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {'These facts are used as context for Live Chat Agent suggestions.'}
          </div>
        </div>
        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase text-violet-700">
          {items.length} {language === 'zh' ? 'facts' : 'facts'}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(item => (
          <div key={`${item.label}:${item.value}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</div>
            <div className="mt-1 break-words text-xs text-slate-800">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
