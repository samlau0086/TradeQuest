import { Edit3, Mail, MessageCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InboxWorkspaceHeaderProps {
  language: string;
  conversationCount: number;
  followUpCount: number;
  selectedCount: number;
  isSyncing: boolean;
  onSync: () => void;
  onComposeEmail: () => void;
  onStartWhatsApp: () => void;
}

interface MetricCardProps {
  label: string;
  value: string;
  accentClassName: string;
  description: string;
}

function MetricCard({
  label,
  value,
  accentClassName,
  description,
}: MetricCardProps) {
  return (
    <div className="min-w-[170px] rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${accentClassName}`}>
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
    </div>
  );
}

export function InboxWorkspaceHeader({
  language,
  conversationCount,
  followUpCount,
  selectedCount,
  isSyncing,
  onSync,
  onComposeEmail,
  onStartWhatsApp,
}: InboxWorkspaceHeaderProps) {
  const isZh = language === 'zh';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-5 rounded-[30px] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#fbfdff_58%,#f2f8ff_100%)] px-6 py-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)] lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ffd7cd] bg-[#fff3ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d85a3a]">
            <Mail className="h-3.5 w-3.5" />
            {isZh ? '统一收件箱' : 'Unified Inbox'}
          </div>
          <div className="text-3xl font-semibold tracking-tight text-slate-950">
            {isZh ? '对话工作台' : 'Conversation workspace'}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {isZh
              ? '把 Email、WhatsApp、Live Chat 和 Telegram 放进同一个运营工作台处理，让跟进、标签、任务和客户上下文始终留在同一界面。'
              : 'Work Email, WhatsApp, Live Chat, and Telegram from one operator workspace, with follow-ups, tags, tasks, and customer context kept in the same view.'}
          </p>
        </div>

        <div className="flex min-w-[280px] flex-col gap-3 lg:items-end">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
            <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
            {isZh
              ? (isSyncing ? '队列同步中' : '队列同步就绪')
              : (isSyncing ? 'Queue syncing' : 'Queue sync ready')}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={isSyncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {isZh ? '刷新队列' : 'Refresh queue'}
            </button>
            <button
              type="button"
              onClick={onComposeEmail}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#ff7a59] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#f25f3a]"
            >
              <Edit3 className="h-4 w-4" />
              {isZh ? '写邮件' : 'Compose email'}
            </button>
            <button
              type="button"
              onClick={onStartWhatsApp}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
            >
              <MessageCircle className="h-4 w-4" />
              {isZh ? '新建 WhatsApp' : 'Start WhatsApp'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          label={isZh ? '当前会话' : 'Active conversations'}
          value={String(conversationCount)}
          accentClassName="text-slate-950"
          description={isZh ? '当前进入运营队列、可直接处理的全部会话。' : 'All actionable conversations currently in the queue.'}
        />
        <MetricCard
          label={isZh ? '待跟进' : 'Follow-up needed'}
          value={String(followUpCount)}
          accentClassName="text-amber-600"
          description={isZh ? '建议尽快推进的会话与客户动作。' : 'Conversations and customer actions that need attention next.'}
        />
        <MetricCard
          label={isZh ? '已选项目' : 'Selected in queue'}
          value={String(selectedCount)}
          accentClassName="text-[#ff7a59]"
          description={isZh ? '当前用于批量处理与队列编排的记录数。' : 'Items currently staged for bulk action or routing work.'}
        />
      </div>
    </div>
  );
}
