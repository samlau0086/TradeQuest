import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Loader2, Mail, Quote, Sparkles, Users, Workflow } from 'lucide-react';

export interface WorkroomTodoItem {
  id: string;
  label: string;
  meta: string;
  onClick: () => void;
}

export interface WorkroomKnowledgeItem {
  id: string;
  title: string;
  content: string;
}

export interface WorkroomChannelHighlight {
  id: string;
  channel: string;
  title: string;
  body?: string;
  date: string;
  onClick?: () => void;
}

interface OperationsCardProps {
  label: string;
  value: number | string;
  meta: string;
  actionLabel: string;
  onClick: () => void;
}

const shortText = (value: string | undefined | null, max = 120) => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const metricCards = (
  quoteCount: number,
  contactMethodCount: number,
  ragCount: number,
  todoCount: number,
) => [
  {
    id: 'quotes',
    label: 'Quotes',
    value: quoteCount,
    icon: Quote,
    tone: 'border-[#ffcfbf] bg-[#fff7f4] text-[#d54e2d]',
  },
  {
    id: 'contacts',
    label: 'Contact methods',
    value: contactMethodCount,
    icon: Users,
    tone: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  {
    id: 'rag',
    label: 'RAG evidence',
    value: ragCount,
    icon: BookOpen,
    tone: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  {
    id: 'todo',
    label: 'Open work',
    value: todoCount,
    icon: CheckCircle2,
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
  },
];

interface ClientWorkroomOverviewProps {
  quoteCount: number;
  contactMethodCount: number;
  ragCount: number;
  todoCount: number;
  loading: boolean;
  primaryNextStep: string;
  primarySummary: string;
  onRefreshAiRecommendation: () => void;
  onOpenCommunication: () => void;
  onOpenAgentHub: () => void;
  onOpenKnowledgeBase: () => void;
}

export function ClientWorkroomOverview({
  quoteCount,
  contactMethodCount,
  ragCount,
  todoCount,
  loading,
  primaryNextStep,
  primarySummary,
  onRefreshAiRecommendation,
  onOpenCommunication,
  onOpenAgentHub,
  onOpenKnowledgeBase,
}: ClientWorkroomOverviewProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_56%,#fff8f4_100%)] px-6 py-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ffcfbf] bg-[#fff4f1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d54e2d]">
                <Sparkles className="h-3.5 w-3.5" />
                Client / Lead Workroom
              </div>
              <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Next Best Action</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Keep the account plan, linked knowledge, active follow-ups, and cross-channel history in one place so sales can move from insight to action without leaving the record.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {metricCards(quoteCount, contactMethodCount, ragCount, todoCount).map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.id} className={`min-w-[150px] rounded-2xl border px-4 py-3 shadow-sm ${card.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">{card.label}</div>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="mt-2 text-2xl font-bold">{card.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f5fffa_100%)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Recommended next move
              </div>
              <button
                onClick={onRefreshAiRecommendation}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {loading ? 'Refreshing...' : 'Refresh AI'}
              </button>
            </div>

            <div className="mt-4 text-xl font-semibold leading-8 text-slate-950">
              {primaryNextStep}
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-600">
              {primarySummary}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={onOpenCommunication}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
              >
                <Mail className="h-3.5 w-3.5" />
                Open conversations
              </button>
              <button
                onClick={onOpenAgentHub}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                <Workflow className="h-3.5 w-3.5" />
                Agent tasks
              </button>
              <button
                onClick={onOpenKnowledgeBase}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Open RAG
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OperationsCard({
  label,
  value,
  meta,
  actionLabel,
  onClick,
}: OperationsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500">{meta}</div>
      <button
        type="button"
        onClick={onClick}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
      >
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface ClientWorkroomOperationsStripProps {
  pendingFollowUpCount: number;
  nextFollowUpAt?: string | null;
  activeTaskCount: number;
  runningTaskCount: number;
  approvalCount: number;
  pendingCommentDeleteCount: number;
  commentCount: number;
  onOpenCommunication: () => void;
  onOpenAgentHub: () => void;
  onOpenApprovals: () => void;
  onOpenComments: () => void;
}

export function ClientWorkroomOperationsStrip({
  pendingFollowUpCount,
  nextFollowUpAt,
  activeTaskCount,
  runningTaskCount,
  approvalCount,
  pendingCommentDeleteCount,
  commentCount,
  onOpenCommunication,
  onOpenAgentHub,
  onOpenApprovals,
  onOpenComments,
}: ClientWorkroomOperationsStripProps) {
  const followUpMeta = pendingFollowUpCount > 0
    ? `Next due ${nextFollowUpAt ? new Date(nextFollowUpAt).toLocaleString() : 'soon'}.`
    : 'No scheduled follow-up reminders right now.';
  const taskMeta = activeTaskCount > 0
    ? `${runningTaskCount} running, ${Math.max(activeTaskCount - runningTaskCount, 0)} waiting in queue.`
    : 'No active agent tasks on this record.';
  const approvalMeta = approvalCount > 0
    ? `${pendingCommentDeleteCount} comment delete review${pendingCommentDeleteCount === 1 ? '' : 's'} included.`
    : 'No approvals blocking this record.';
  const commentMeta = commentCount > 0
    ? `${commentCount} internal note${commentCount === 1 ? '' : 's'} on this record.`
    : 'No team notes have been added yet.';

  return (
    <section className="rounded-3xl border border-slate-200 bg-[#f8fbfd] p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Operating layer</div>
        <div className="mt-1 text-sm text-slate-600">
          Move from recommendation into follow-up, queue triage, approvals, and internal notes.
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OperationsCard
          label="Follow-ups"
          value={pendingFollowUpCount}
          meta={followUpMeta}
          actionLabel="Open inbox"
          onClick={onOpenCommunication}
        />
        <OperationsCard
          label="Agent tasks"
          value={activeTaskCount}
          meta={taskMeta}
          actionLabel="Open task queue"
          onClick={onOpenAgentHub}
        />
        <OperationsCard
          label="Approvals"
          value={approvalCount}
          meta={approvalMeta}
          actionLabel="Open approvals"
          onClick={onOpenApprovals}
        />
        <OperationsCard
          label="Notes"
          value={commentCount}
          meta={commentMeta}
          actionLabel="Review notes"
          onClick={onOpenComments}
        />
      </div>
    </section>
  );
}

interface ClientWorkroomTaskPanelProps {
  todoCount: number;
  todoItems: WorkroomTodoItem[];
}

export function ClientWorkroomTaskPanel({
  todoCount,
  todoItems,
}: ClientWorkroomTaskPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Open work queue</h4>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{todoCount}</span>
      </div>
      <div className="space-y-2">
        {todoItems.slice(0, 4).map(item => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">{shortText(item.label, 76)}</div>
                <div className="mt-1 text-xs text-slate-500">{item.meta}</div>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            </div>
          </button>
        ))}
        {todoItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No follow-ups or agent tasks are waiting right now.
          </div>
        )}
      </div>
    </section>
  );
}

interface ClientWorkroomIntelligenceProps {
  clientSummaryText: string;
  clientNextStepText: string;
  leadSummaryText: string;
  leadNextStepText: string;
  hasLeadRecord: boolean;
  ragItems: WorkroomKnowledgeItem[];
  onOpenKnowledgeBase: () => void;
}

export function ClientWorkroomIntelligence({
  clientSummaryText,
  clientNextStepText,
  leadSummaryText,
  leadNextStepText,
  hasLeadRecord,
  ragItems,
  onOpenKnowledgeBase,
}: ClientWorkroomIntelligenceProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.9fr)]">
      <div className="rounded-3xl border border-slate-200 bg-[#f8fbff] p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">Customer intelligence</div>
        <div className="mt-3 text-sm leading-7 text-slate-600">
          {clientSummaryText || 'No customer summary has been generated yet.'}
        </div>
        <div className="mt-4 rounded-2xl border border-cyan-100 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Customer next step</div>
          <div className="mt-2 text-sm font-medium leading-6 text-slate-800">
            {clientNextStepText || 'Review account-level relationship history and recent channel activity.'}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-[#fbf8ff] p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Lead intelligence</div>
        <div className="mt-3 text-sm leading-7 text-slate-600">
          {hasLeadRecord
            ? (leadSummaryText || 'No lead summary has been generated yet.')
            : 'Select a specific lead to show lead-level intent, product fit, score, and the next move.'}
        </div>
        <div className="mt-4 rounded-2xl border border-violet-100 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">Lead next step</div>
          <div className="mt-2 text-sm font-medium leading-6 text-slate-800">
            {hasLeadRecord
              ? (leadNextStepText || 'Run lead analysis and define the next conversion action.')
              : 'Choose a lead to unlock lead-specific follow-up guidance.'}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">RAG evidence</h4>
          <button type="button" onClick={onOpenKnowledgeBase} className="text-xs font-semibold text-cyan-700 hover:text-cyan-600">Open</button>
        </div>
        <div className="space-y-2">
          {ragItems.slice(0, 3).map(item => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-sm font-semibold text-slate-800">{item.title}</div>
              <div className="mt-1 text-xs leading-6 text-slate-500">{shortText(item.content, 120)}</div>
            </div>
          ))}
          {ragItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              No client-specific RAG evidence yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface ClientWorkroomHistoryProps {
  channelHighlights: WorkroomChannelHighlight[];
}

export function ClientWorkroomHistory({
  channelHighlights,
}: ClientWorkroomHistoryProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cross-channel history</h4>
        <span className="text-xs text-slate-500">Email / WhatsApp / Live Chat / CRM</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {channelHighlights.slice(0, 4).map(item => {
          const Wrapper = item.onClick ? 'button' : 'div';
          return (
            <Wrapper
              key={item.id}
              onClick={item.onClick}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/30"
            >
              <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold uppercase tracking-[0.16em] text-cyan-700">{item.channel}</span>
                <span className="text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
              </div>
              <div className="text-sm font-semibold text-slate-800">{shortText(item.title, 76)}</div>
              {item.body && <div className="mt-1 text-xs leading-6 text-slate-500">{item.body}</div>}
            </Wrapper>
          );
        })}
        {channelHighlights.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-4">
            No linked cross-channel history is available for this record yet.
          </div>
        )}
      </div>
    </section>
  );
}
