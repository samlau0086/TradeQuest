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
    <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.94)_0%,rgba(241,245,249,0.88)_100%)] px-4 py-3 backdrop-blur-sm md:px-5">
      <div className="rounded-[30px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {isZh ? '作战摘要' : 'Action summary'}
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
                {isZh ? '待跟进' : 'Follow-up open'}
              </ConversationToolbarPill>
            )}
            {typeof tagsCount === 'number' && (
              <ConversationToolbarPill>
                <Tags className="h-3 w-3" />
                {isZh ? `${tagsCount} 个标签` : `${tagsCount} tags`}
              </ConversationToolbarPill>
            )}
            {linkedValue && (
              <ConversationToolbarPill tone="info">
                <Link2 className="h-3 w-3" />
                {isZh ? '已关联 CRM 记录' : 'Linked CRM record'}
              </ConversationToolbarPill>
            )}
          </ConversationToolbarGroup>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.48fr)_minmax(320px,0.52fr)]">
          <div className="flex min-h-full flex-col gap-4">
            {primaryTitle && (
              <div className={cn('rounded-[26px] border px-5 py-5 shadow-sm', heroToneClasses[primaryTone])}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">
                      {eyebrow || (isZh ? '下一步行动' : 'Next action')}
                    </div>
                    <div className="mt-1 text-[22px] font-semibold tracking-tight">{primaryTitle}</div>
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
                {title || (isZh ? '记录摘要' : 'Record summary')}
              </div>
              {subtitle ? (
                <div className="mt-2 text-sm font-medium leading-6 text-slate-700">{subtitle}</div>
              ) : (
                <div className="mt-2 text-sm leading-6 text-slate-500">
                  {isZh
                    ? '集中查看关联记录、最近动态和关键指标，再决定是立即回复、设置待跟进，还是继续补充上下文。'
                    : 'Review linked record context, recent activity, and key indicators before deciding on reply, follow-up, or context enrichment.'}
                </div>
              )}
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '快照视图' : 'Snapshot'}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {linkedValue && (
                <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <Building2 className="h-3.5 w-3.5" />
                    {linkedLabel || (isZh ? '关联记录' : 'Linked record')}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{linkedValue}</div>
                </div>
              )}

              {activityValue && (
                <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <MessageSquareText className="h-3.5 w-3.5" />
                    {activityLabel || (isZh ? '最近动态' : 'Recent activity')}
                  </div>
                  <div className="mt-2 text-sm font-semibold leading-6 text-slate-900">{activityValue}</div>
                </div>
              )}
            </div>

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
