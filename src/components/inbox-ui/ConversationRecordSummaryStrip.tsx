import React from 'react';
import { Building2, Clock3, Link2, MessageSquareText, Tags } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  ConversationToolbarGroup,
  ConversationToolbarPill,
  type ToolbarTone,
} from './ConversationToolbar';

interface ConversationRecordSummaryItem {
  label: string;
  value: string;
  tone?: 'default' | 'info' | 'success' | 'warning' | 'violet' | 'sky';
}

interface ConversationRecordSummaryBadge {
  label: string;
  tone?: ToolbarTone;
}

interface ConversationRecordSummaryStripProps {
  language: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  linkedLabel?: string;
  linkedValue?: string;
  activityLabel?: string;
  activityValue?: string;
  tagsCount?: number;
  followUpAt?: string | null;
  primaryTitle?: string;
  primaryDescription?: string;
  primaryTone?: ToolbarTone;
  primaryMeta?: string;
  primaryActions?: React.ReactNode;
  statusBadges?: ConversationRecordSummaryBadge[];
  items?: ConversationRecordSummaryItem[];
}

const toneClasses: Record<NonNullable<ConversationRecordSummaryItem['tone']>, string> = {
  default: 'border-slate-200 bg-slate-50 text-slate-700',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
};

const heroToneClasses: Record<ToolbarTone, string> = {
  default: 'border-slate-200 bg-white text-slate-900',
  primary: 'border-[#ffd9cd] bg-[#fff7f4] text-slate-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  violet: 'border-violet-200 bg-violet-50 text-violet-900',
  sky: 'border-sky-200 bg-sky-50 text-sky-900',
};

export function ConversationRecordSummaryStrip({
  language,
  eyebrow,
  title,
  subtitle,
  linkedLabel,
  linkedValue,
  activityLabel,
  activityValue,
  tagsCount,
  followUpAt,
  primaryTitle,
  primaryDescription,
  primaryTone = 'primary',
  primaryMeta,
  primaryActions,
  statusBadges = [],
  items = [],
}: ConversationRecordSummaryStripProps) {
  const isZh = language === 'zh';
  const visibleItems = items.slice(0, 4);

  return (
    <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(242,246,251,0.94)_100%)] px-4 py-3 backdrop-blur-sm md:px-5">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {isZh ? '\u64cd\u4f5c\u6458\u8981' : 'Action summary'}
          </div>
          <ConversationToolbarGroup className="gap-1.5">
            {statusBadges.map(badge => (
              <ConversationToolbarPill key={`${badge.label}:${badge.tone || 'default'}`} tone={badge.tone || 'default'}>
                {badge.label}
              </ConversationToolbarPill>
            ))}
            {followUpAt && (
              <ConversationToolbarPill tone="warning">
                <Clock3 className="h-3 w-3" />
                {isZh ? '\u5f85\u8ddf\u8fdb' : 'Follow-up open'}
              </ConversationToolbarPill>
            )}
            {typeof tagsCount === 'number' && (
              <ConversationToolbarPill>
                <Tags className="h-3 w-3" />
                {isZh ? `${tagsCount} \u4e2a\u6807\u7b7e` : `${tagsCount} tags`}
              </ConversationToolbarPill>
            )}
            {linkedValue && (
              <ConversationToolbarPill tone="info">
                <Link2 className="h-3 w-3" />
                {isZh ? '\u5df2\u5173\u8054 CRM \u8bb0\u5f55' : 'Linked CRM record'}
              </ConversationToolbarPill>
            )}
          </ConversationToolbarGroup>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(320px,0.58fr)]">
          <div className="flex min-h-full flex-col gap-4">
            {primaryTitle && (
              <div className={cn('rounded-[24px] border px-5 py-5 shadow-sm', heroToneClasses[primaryTone])}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">
                      {eyebrow || (isZh ? '\u4e0b\u4e00\u6b65\u884c\u52a8' : 'Next action')}
                    </div>
                    <div className="mt-1 text-xl font-semibold tracking-tight">{primaryTitle}</div>
                    {primaryDescription && (
                      <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        {primaryDescription}
                      </div>
                    )}
                  </div>

                  {(primaryMeta || primaryActions) && (
                    <div className="flex min-w-0 flex-col items-start gap-2 xl:max-w-[340px] xl:items-end">
                      {primaryMeta && (
                        <ConversationToolbarPill tone={primaryTone}>
                          {primaryMeta}
                        </ConversationToolbarPill>
                      )}
                      {primaryActions && (
                        <ConversationToolbarGroup className="justify-end">
                          {primaryActions}
                        </ConversationToolbarGroup>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-5 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {title || (isZh ? '\u8bb0\u5f55\u6458\u8981' : 'Record summary')}
              </div>
              {subtitle ? (
                <div className="mt-2 text-sm font-medium leading-6 text-slate-700">{subtitle}</div>
              ) : (
                <div className="mt-2 text-sm leading-6 text-slate-500">
                  {isZh
                    ? '\u96c6\u4e2d\u67e5\u770b\u5173\u8054\u8bb0\u5f55\u3001\u6700\u8fd1\u52a8\u6001\u548c\u5173\u952e\u6307\u6807\uff0c\u518d\u51b3\u5b9a\u662f\u7acb\u5373\u56de\u590d\u3001\u8bbe\u7f6e\u5f85\u8ddf\u8fdb\uff0c\u8fd8\u662f\u7ee7\u7eed\u8865\u5145\u4e0a\u4e0b\u6587\u3002'
                    : 'Review linked record context, recent activity, and key indicators before deciding on reply, follow-up, or context enrichment.'}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 content-start">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '\u5feb\u7167\u89c6\u56fe' : 'Snapshot'}
            </div>
            {linkedValue && (
              <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                  {linkedLabel || (isZh ? '\u5173\u8054\u8bb0\u5f55' : 'Linked record')}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{linkedValue}</div>
              </div>
            )}

            {activityValue && (
              <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  {activityLabel || (isZh ? '\u6700\u8fd1\u52a8\u6001' : 'Recent activity')}
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-900">{activityValue}</div>
              </div>
            )}

            {visibleItems.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                {visibleItems.map(item => (
                  <div
                    key={`${item.label}:${item.value}`}
                    className={cn(
                      'rounded-[18px] border px-4 py-3 shadow-sm',
                      toneClasses[item.tone || 'default'],
                    )}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-6">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
