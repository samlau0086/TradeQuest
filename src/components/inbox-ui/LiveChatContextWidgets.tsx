import React from 'react';
import { Brain, ScanSearch } from 'lucide-react';
import { ConversationSectionCard, ConversationSectionHeader } from './ConversationSectionCard';
import { ConversationToolbarPill } from './ConversationToolbar';

interface LiveChatCustomerInsightCardProps {
  language: 'en' | 'zh';
  client?: {
    agentSummary?: string;
    leadSummary?: string;
    agentNextStep?: string;
    leadNextStep?: string;
  } | null;
}

export function LiveChatCustomerInsightCard({ language, client }: LiveChatCustomerInsightCardProps) {
  if (!client) return null;

  const isZh = language === 'zh';
  const summary = client.agentSummary || client.leadSummary;
  const nextStep = client.agentNextStep || client.leadNextStep;
  if (!summary && !nextStep) return null;

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        title={isZh ? '\u5ba2\u6237\u60c5\u62a5\u6458\u8981' : 'Customer intelligence'}
        icon={<Brain className="h-4 w-4 text-cyan-500" />}
        description={
          isZh
            ? '\u628a\u5ba2\u6237\u7ea7 AI \u6458\u8981\u548c\u6700\u4f73\u4e0b\u4e00\u6b65\u96c6\u4e2d\u653e\u5728\u8fd9\u91cc\uff0c\u65b9\u4fbf\u5ea7\u5e2d\u5728\u56de\u590d\u524d\u5feb\u901f\u5224\u65ad\u3002'
            : 'Keep customer-level AI summary and best next step together before replying.'
        }
        actions={(
          <ConversationToolbarPill tone="info">
            {isZh ? '\u5ba2\u6237\u7ea7\u60c5\u62a5' : 'Customer-level'}
          </ConversationToolbarPill>
        )}
      />

      <div className="space-y-3">
        {summary && (
          <div className="rounded-[20px] border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm text-slate-800 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">
              {isZh ? 'AI \u5ba2\u6237\u6458\u8981' : 'AI Customer Summary'}
            </div>
            <div className="mt-2 leading-6">{summary}</div>
          </div>
        )}

        {nextStep && (
          <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-slate-800 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              {isZh ? '\u6700\u4f73\u4e0b\u4e00\u6b65' : 'Best Next Step'}
            </div>
            <div className="mt-2 leading-6">{nextStep}</div>
          </div>
        )}
      </div>
    </ConversationSectionCard>
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
  const isZh = language === 'zh';

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        title={isZh ? '\u8bbf\u5ba2\u8bc1\u636e\u4e0a\u4e0b\u6587' : 'Visitor evidence'}
        icon={<ScanSearch className="h-4 w-4 text-violet-500" />}
        description={
          isZh
            ? '\u8fd9\u4e9b\u8bbf\u5ba2\u4e8b\u5b9e\u4f1a\u4f5c\u4e3a Live Chat Agent \u548c\u4eba\u5de5\u56de\u590d\u5224\u65ad\u7684\u91cd\u8981\u4e0a\u4e0b\u6587\u3002'
            : 'These visitor facts are used as key context for Live Chat Agent and manual replies.'
        }
        actions={(
          <ConversationToolbarPill tone="violet">
            {items.length} {isZh ? '\u6761\u8bc1\u636e' : items.length === 1 ? 'fact' : 'facts'}
          </ConversationToolbarPill>
        )}
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {items.map(item => (
          <div key={`${item.label}:${item.value}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</div>
            <div className="mt-1 break-words text-xs leading-6 text-slate-800">{item.value}</div>
          </div>
        ))}
      </div>
    </ConversationSectionCard>
  );
}
