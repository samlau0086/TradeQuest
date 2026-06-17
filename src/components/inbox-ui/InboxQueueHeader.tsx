import React from 'react';
import {
  CalendarClock,
  MailOpen,
  RotateCcw,
  UserRound,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { InboxMailFilter } from './InboxConversationSidebarTypes';
import type {
  InboxChannelFilter,
  InboxQueueOwnerFilter,
  InboxQueueSortMode,
  InboxSavedView,
} from './inboxModel';

interface InboxQueueHeaderProps {
  language: string;
  filter: InboxMailFilter;
  channelFilter: InboxChannelFilter;
  search: string;
  searchTags: string[];
  followUpOnly: boolean;
  queueSortMode: InboxQueueSortMode;
  queueOwnerFilter: InboxQueueOwnerFilter;
  activeSavedViewId: string | null;
  currentQueueViewDirty: boolean;
  savedViews: InboxSavedView[];
  totalVisibleCount: number;
  selectedCount: number;
  visibleFollowUpCount: number;
  unreadVisibleCount: number;
  assignedVisibleCount: number;
  unassignedVisibleCount: number;
  onQueueOwnerFilterChange: (value: InboxQueueOwnerFilter) => void;
  onQueueSortModeChange: (value: InboxQueueSortMode) => void;
  onToggleFollowUpOnly: () => void;
  onClearFollowUpOnly: () => void;
  onResetQueueView: () => void;
}

export function InboxQueueHeader({
  language,
  filter,
  channelFilter,
  search,
  searchTags,
  followUpOnly,
  queueSortMode,
  queueOwnerFilter,
  activeSavedViewId,
  currentQueueViewDirty,
  savedViews,
  totalVisibleCount,
  selectedCount,
  visibleFollowUpCount,
  unreadVisibleCount,
  assignedVisibleCount,
  unassignedVisibleCount,
  onQueueOwnerFilterChange,
  onQueueSortModeChange,
  onToggleFollowUpOnly,
  onClearFollowUpOnly,
  onResetQueueView,
}: InboxQueueHeaderProps) {
  const isZh = language === 'zh';
  const activeSavedView = savedViews.find(view => view.id === activeSavedViewId) || null;

  const pills: string[] = [];
  pills.push(activeSavedView?.name || (isZh ? '临时视图' : 'Ad hoc view'));
  if (filter !== 'inbox') pills.push(filter);
  if (channelFilter !== 'all') pills.push(channelFilter);
  if (queueOwnerFilter !== 'all') pills.push(queueOwnerFilter);
  if (queueSortMode !== 'recent') pills.push(queueSortMode);
  if (followUpOnly) pills.push(isZh ? '待跟进' : 'Follow-up');
  if (search.trim()) pills.push(isZh ? `搜索: ${search}` : `Search: ${search}`);
  searchTags.forEach(tag => pills.push(`#${tag}`));
  if (currentQueueViewDirty) pills.push(isZh ? '未保存' : 'Unsaved');

  const quickButtons = [
    {
      key: 'mine',
      label: isZh ? '我的' : 'Mine',
      icon: UserRound,
      active: queueOwnerFilter === 'mine',
      onClick: () =>
        onQueueOwnerFilterChange(queueOwnerFilter === 'mine' ? 'all' : 'mine'),
      meta: assignedVisibleCount,
    },
    {
      key: 'unassigned',
      label: isZh ? '未分配' : 'Unassigned',
      icon: Users,
      active: queueOwnerFilter === 'unassigned',
      onClick: () =>
        onQueueOwnerFilterChange(
          queueOwnerFilter === 'unassigned' ? 'all' : 'unassigned',
        ),
      meta: unassignedVisibleCount,
    },
    {
      key: 'unread',
      label: isZh ? '未读优先' : 'Unread first',
      icon: MailOpen,
      active: queueSortMode === 'unread',
      onClick: () =>
        onQueueSortModeChange(queueSortMode === 'unread' ? 'recent' : 'unread'),
      meta: unreadVisibleCount,
    },
    {
      key: 'followup',
      label: isZh ? '待跟进' : 'Follow-up',
      icon: CalendarClock,
      active: followUpOnly,
      onClick: () =>
        (followUpOnly ? onClearFollowUpOnly() : onToggleFollowUpOnly()),
      meta: visibleFollowUpCount,
    },
  ] as const;

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/96 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {isZh ? '队列结果' : 'Queue results'}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-slate-950">
              {totalVisibleCount}
            </span>
            <span className="text-xs text-slate-500">
              {isZh ? '条可见会话' : 'visible conversations'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetQueueView}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {isZh ? '重置队列' : 'Reset queue'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { label: isZh ? '已选中' : 'Selected', value: selectedCount, tone: 'violet' },
          { label: isZh ? '未读' : 'Unread', value: unreadVisibleCount, tone: 'cyan' },
          { label: isZh ? '待跟进' : 'Follow-up', value: visibleFollowUpCount, tone: 'amber' },
        ].map(item => (
          <span
            key={item.label}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
              item.tone === 'violet'
                && 'border-violet-200 bg-violet-50 text-violet-700',
              item.tone === 'cyan'
                && 'border-cyan-200 bg-cyan-50 text-cyan-700',
              item.tone === 'amber'
                && 'border-amber-200 bg-amber-50 text-amber-700',
            )}
          >
            {item.label}: {item.value}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pills.map(chip => (
          <span
            key={chip}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quickButtons.map(button => {
          const Icon = button.icon;
          return (
            <button
              key={button.key}
              type="button"
              onClick={button.onClick}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition',
                button.active
                  ? 'border-[#253858] bg-[#253858] text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{button.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px]',
                  button.active
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-200 text-slate-600',
                )}
              >
                {button.meta}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
