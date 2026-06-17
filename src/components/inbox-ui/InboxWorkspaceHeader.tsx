import { Edit3, Mail, MessageCircle, RefreshCw } from 'lucide-react';

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
}

function MetricCard({ label, value, accentClassName }: MetricCardProps) {
  return (
    <div className="min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${accentClassName}`}>{value}</div>
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#ffd7cd] bg-[#fff3ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d85a3a]">
            <Mail className="h-3.5 w-3.5" />
            {isZh ? '\u7edf\u4e00\u6536\u4ef6\u7bb1' : 'Unified Inbox'}
          </div>
          <div className="text-3xl font-semibold tracking-tight text-slate-950">
            {isZh ? '\u4f1a\u8bdd\u5de5\u4f5c\u53f0' : 'Conversation workspace'}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {isZh
              ? '\u628a Email\u3001WhatsApp\u3001Live Chat \u548c Telegram \u653e\u8fdb\u540c\u4e00\u4e2a\u5de5\u4f5c\u961f\u5217\u4e2d\u5904\u7406\uff0c\u8ba9\u8ddf\u8fdb\u3001\u6807\u7b7e\u3001\u5f85\u529e\u548c\u5ba2\u6237\u4e0a\u4e0b\u6587\u90fd\u56de\u5230\u540c\u4e00\u4e2a\u754c\u9762\u3002'
              : 'Work Email, WhatsApp, Live Chat, and Telegram from one operator queue, with follow-ups, tags, tasks, and customer context kept in the same workspace.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={isSyncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {isZh ? '\u5237\u65b0\u961f\u5217' : 'Refresh queue'}
          </button>
          <button
            type="button"
            onClick={onComposeEmail}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ff7a59] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#f25f3a]"
          >
            <Edit3 className="h-4 w-4" />
            {isZh ? '\u5199\u90ae\u4ef6' : 'Compose email'}
          </button>
          <button
            type="button"
            onClick={onStartWhatsApp}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
          >
            <MessageCircle className="h-4 w-4" />
            {isZh ? '\u65b0\u5efa WhatsApp' : 'Start WhatsApp'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          label={isZh ? '\u5f53\u524d\u4f1a\u8bdd' : 'Active conversations'}
          value={String(conversationCount)}
          accentClassName="text-slate-950"
        />
        <MetricCard
          label={isZh ? '\u5f85\u8ddf\u8fdb' : 'Follow-up needed'}
          value={String(followUpCount)}
          accentClassName="text-amber-600"
        />
        <MetricCard
          label={isZh ? '\u5df2\u9009\u9879\u76ee' : 'Selected in queue'}
          value={String(selectedCount)}
          accentClassName="text-[#ff7a59]"
        />
      </div>
    </div>
  );
}
