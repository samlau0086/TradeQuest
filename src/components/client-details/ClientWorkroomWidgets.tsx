import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Loader2, Mail, Quote, Sparkles, Users, Workflow } from 'lucide-react';
import { useStore } from '../../store';
import { useTranslation } from '../../lib/i18n';
import { ConversationSectionCard, ConversationSectionHeader } from '../inbox-ui/ConversationSectionCard';
import { ConversationToolbarButton, ConversationToolbarGroup, ConversationToolbarPill } from '../inbox-ui/ConversationToolbar';

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

function useLocalLabel() {
  const { language } = useStore();
  const t = useTranslation(language);
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);
  return { language, t, label };
}

const getMetricCards = (
  quoteCount: number,
  contactMethodCount: number,
  ragCount: number,
  todoCount: number,
  label: (zh: string, en: string) => string,
) => [
  {
    id: 'quotes',
    label: label('报价', 'Quotes'),
    value: quoteCount,
    icon: Quote,
    tone: 'primary' as const,
  },
  {
    id: 'contacts',
    label: label('联系方式', 'Contact methods'),
    value: contactMethodCount,
    icon: Users,
    tone: 'info' as const,
  },
  {
    id: 'rag',
    label: label('RAG 依据', 'RAG evidence'),
    value: ragCount,
    icon: BookOpen,
    tone: 'violet' as const,
  },
  {
    id: 'todo',
    label: label('待处理', 'Open work'),
    value: todoCount,
    icon: CheckCircle2,
    tone: 'warning' as const,
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
  const { label } = useLocalLabel();
  const metrics = getMetricCards(quoteCount, contactMethodCount, ragCount, todoCount, label);

  return (
    <ConversationSectionCard className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#fff7f1_100%)]">
      <ConversationSectionHeader
        icon={<Sparkles className="h-4 w-4 text-[#ff7a59]" />}
        title={label('客户 / Lead 作战室', 'Client / Lead Workroom')}
        description={label(
          '把客户计划、知识依据、待跟进事项和跨渠道历史放在一个工作区里，让销售从判断直接走到执行。',
          'Keep account plan, knowledge evidence, open work, and cross-channel history in one workspace so sales can move from judgment into execution.',
        )}
        actions={
          <ConversationToolbarGroup>
            {metrics.map(card => {
              const Icon = card.icon;
              return (
                <ConversationToolbarPill key={card.id} tone={card.tone}>
                  <Icon className="h-3.5 w-3.5" />
                  {card.label}: {card.value}
                </ConversationToolbarPill>
              );
            })}
          </ConversationToolbarGroup>
        }
      />

      <div className="rounded-[24px] border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4fff9_100%)] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {label('推荐下一步', 'Recommended next move')}
            </div>
            <div className="mt-3 max-w-4xl text-xl font-semibold leading-8 text-slate-950">
              {primaryNextStep}
            </div>
            <div className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              {primarySummary}
            </div>
          </div>

          <ConversationToolbarButton
            tone="success"
            onClick={onRefreshAiRecommendation}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? label('刷新中...', 'Refreshing...') : label('刷新 AI 建议', 'Refresh AI')}
          </ConversationToolbarButton>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <ConversationToolbarButton tone="info" onClick={onOpenCommunication}>
            <Mail className="h-3.5 w-3.5" />
            {label('打开沟通记录', 'Open conversations')}
          </ConversationToolbarButton>
          <ConversationToolbarButton tone="violet" onClick={onOpenAgentHub}>
            <Workflow className="h-3.5 w-3.5" />
            {label('智能体任务', 'Agent tasks')}
          </ConversationToolbarButton>
          <ConversationToolbarButton tone="default" onClick={onOpenKnowledgeBase}>
            <BookOpen className="h-3.5 w-3.5" />
            {label('打开 RAG', 'Open RAG')}
          </ConversationToolbarButton>
        </div>
      </div>
    </ConversationSectionCard>
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
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500">{meta}</div>
      <ConversationToolbarButton
        type="button"
        tone="default"
        className="mt-3"
        onClick={onClick}
      >
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </ConversationToolbarButton>
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
  const { label } = useLocalLabel();
  const followUpMeta = pendingFollowUpCount > 0
    ? label(
      `下一次待跟进时间：${nextFollowUpAt ? new Date(nextFollowUpAt).toLocaleString() : '即将到期'}。`,
      `Next due ${nextFollowUpAt ? new Date(nextFollowUpAt).toLocaleString() : 'soon'}.`,
    )
    : label('当前没有已安排的待跟进提醒。', 'No scheduled follow-up reminders right now.');
  const taskMeta = activeTaskCount > 0
    ? label(
      `${runningTaskCount} 个正在运行，${Math.max(activeTaskCount - runningTaskCount, 0)} 个在队列中等待。`,
      `${runningTaskCount} running, ${Math.max(activeTaskCount - runningTaskCount, 0)} waiting in queue.`,
    )
    : label('当前记录没有进行中的智能体任务。', 'No active agent tasks on this record.');
  const approvalMeta = approvalCount > 0
    ? label(
      `其中包含 ${pendingCommentDeleteCount} 条评论删除审核。`,
      `${pendingCommentDeleteCount} comment delete review${pendingCommentDeleteCount === 1 ? '' : 's'} included.`,
    )
    : label('当前记录没有待审核事项。', 'No approvals blocking this record.');
  const commentMeta = commentCount > 0
    ? label(
      `当前记录已有 ${commentCount} 条内部备注。`,
      `${commentCount} internal note${commentCount === 1 ? '' : 's'} on this record.`,
    )
    : label('当前还没有团队备注。', 'No team notes have been added yet.');

  return (
    <ConversationSectionCard className="border-slate-200 bg-[#f8fbfd]">
      <ConversationSectionHeader
        icon={<Workflow className="h-4 w-4 text-slate-500" />}
        title={label('执行层', 'Operating layer')}
        description={label(
          '把推荐建议落到待跟进、任务队列、审批和内部协作上。',
          'Move from recommendation into follow-up, queue triage, approvals, and internal collaboration.',
        )}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OperationsCard
          label={label('待跟进', 'Follow-ups')}
          value={pendingFollowUpCount}
          meta={followUpMeta}
          actionLabel={label('打开收件箱', 'Open inbox')}
          onClick={onOpenCommunication}
        />
        <OperationsCard
          label={label('智能体任务', 'Agent tasks')}
          value={activeTaskCount}
          meta={taskMeta}
          actionLabel={label('打开任务队列', 'Open task queue')}
          onClick={onOpenAgentHub}
        />
        <OperationsCard
          label={label('审批', 'Approvals')}
          value={approvalCount}
          meta={approvalMeta}
          actionLabel={label('打开审批', 'Open approvals')}
          onClick={onOpenApprovals}
        />
        <OperationsCard
          label={label('备注', 'Notes')}
          value={commentCount}
          meta={commentMeta}
          actionLabel={label('查看备注', 'Review notes')}
          onClick={onOpenComments}
        />
      </div>
    </ConversationSectionCard>
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
  const { label } = useLocalLabel();

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        icon={<CheckCircle2 className="h-4 w-4 text-amber-600" />}
        title={label('待处理事项', 'Open work queue')}
        actions={<ConversationToolbarPill tone="warning">{todoCount}</ConversationToolbarPill>}
      />
      <div className="space-y-2">
        {todoItems.slice(0, 4).map(item => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50/70 p-3 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40"
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
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            {label('当前没有待跟进或待处理的智能体任务。', 'No follow-ups or agent tasks are waiting right now.')}
          </div>
        )}
      </div>
    </ConversationSectionCard>
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
  const { label } = useLocalLabel();

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.9fr)]">
      <ConversationSectionCard className="border-cyan-200 bg-[#f8fbff]">
        <ConversationSectionHeader
          icon={<Users className="h-4 w-4 text-cyan-700" />}
          title={label('客户级情报', 'Customer intelligence')}
        />
        <div className="text-sm leading-7 text-slate-600">
          {clientSummaryText || label('尚未生成客户级摘要。', 'No customer summary has been generated yet.')}
        </div>
        <div className="mt-4 rounded-[20px] border border-cyan-100 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
            {label('客户级下一步', 'Customer next step')}
          </div>
          <div className="mt-2 text-sm font-medium leading-6 text-slate-800">
            {clientNextStepText || label('回看账户级关系历史和最近渠道互动，再决定下一次推进动作。', 'Review account-level relationship history and recent channel activity.')}
          </div>
        </div>
      </ConversationSectionCard>

      <ConversationSectionCard className="border-violet-200 bg-[#fbf8ff]">
        <ConversationSectionHeader
          icon={<Quote className="h-4 w-4 text-violet-700" />}
          title={label('Lead 级情报', 'Lead intelligence')}
        />
        <div className="text-sm leading-7 text-slate-600">
          {hasLeadRecord
            ? (leadSummaryText || label('尚未生成 Lead 级摘要。', 'No lead summary has been generated yet.'))
            : label('选择一个具体 Lead 后，这里会显示该 Lead 的采购意图、产品匹配、评分和下一步动作。', 'Select a specific lead to show lead-level intent, product fit, score, and the next move.')}
        </div>
        <div className="mt-4 rounded-[20px] border border-violet-100 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">
            {label('Lead 级下一步', 'Lead next step')}
          </div>
          <div className="mt-2 text-sm font-medium leading-6 text-slate-800">
            {hasLeadRecord
              ? (leadNextStepText || label('运行 Lead 分析并定义下一次转化动作。', 'Run lead analysis and define the next conversion action.'))
              : label('选择一个 Lead 以解锁该 Lead 的专属跟进建议。', 'Choose a lead to unlock lead-specific follow-up guidance.')}
          </div>
        </div>
      </ConversationSectionCard>

      <ConversationSectionCard className="bg-slate-50/90">
        <ConversationSectionHeader
          icon={<BookOpen className="h-4 w-4 text-slate-500" />}
          title={label('RAG 依据', 'RAG evidence')}
          actions={
            <ConversationToolbarButton tone="default" compact onClick={onOpenKnowledgeBase}>
              {label('打开', 'Open')}
            </ConversationToolbarButton>
          }
        />
        <div className="space-y-2">
          {ragItems.slice(0, 3).map(item => (
            <div key={item.id} className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-sm font-semibold text-slate-800">{item.title}</div>
              <div className="mt-1 text-xs leading-6 text-slate-500">{shortText(item.content, 120)}</div>
            </div>
          ))}
          {ragItems.length === 0 && (
            <div className="rounded-[20px] border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              {label('当前还没有客户级 RAG 依据。', 'No client-specific RAG evidence yet.')}
            </div>
          )}
        </div>
      </ConversationSectionCard>
    </section>
  );
}

interface ClientWorkroomHistoryProps {
  channelHighlights: WorkroomChannelHighlight[];
}

export function ClientWorkroomHistory({
  channelHighlights,
}: ClientWorkroomHistoryProps) {
  const { label } = useLocalLabel();

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        icon={<Mail className="h-4 w-4 text-slate-500" />}
        title={label('全渠道历史', 'Cross-channel history')}
        actions={<ConversationToolbarPill tone="default">Email / WhatsApp / Live Chat / CRM</ConversationToolbarPill>}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {channelHighlights.slice(0, 4).map(item => {
          const Wrapper = item.onClick ? 'button' : 'div';
          return (
            <Wrapper
              key={item.id}
              onClick={item.onClick}
              className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/30"
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
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-4">
            {label('当前记录还没有可用的跨渠道历史。', 'No linked cross-channel history is available for this record yet.')}
          </div>
        )}
      </div>
    </ConversationSectionCard>
  );
}
