import React from 'react';
import {
  CalendarClock,
  Database,
  Edit3,
  Mail,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Timer,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { InboxChannelFilter } from './inboxModel';

type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';

interface InboxSidebarControlsProps {
  language: string;
  filter: InboxMailFilter;
  channelFilter: InboxChannelFilter;
  search: string;
  searchTags: string[];
  tagSuggestions: string[];
  followUpOnly: boolean;
  visibleFollowUpCount: number;
  totalConversations: number;
  isSyncing: boolean;
  isWhatsAppBackgroundSyncing: boolean;
  syncError?: string | null;
  lastSyncAt?: string | null;
  onFilterChange: (filter: InboxMailFilter) => void;
  onChannelFilterChange: (filter: InboxChannelFilter) => void;
  onSearchChange: (value: string) => void;
  onSearchTagsChange: (tags: string[]) => void;
  onToggleFollowUpOnly: () => void;
  onClearFollowUpOnly: () => void;
  onSync: () => void;
  onComposeEmail: () => void;
  onStartWhatsApp: () => void;
}

export function InboxSidebarControls({
  language,
  filter,
  channelFilter,
  search,
  searchTags,
  tagSuggestions,
  followUpOnly,
  visibleFollowUpCount,
  totalConversations,
  isSyncing,
  isWhatsAppBackgroundSyncing,
  syncError,
  lastSyncAt,
  onFilterChange,
  onChannelFilterChange,
  onSearchChange,
  onSearchTagsChange,
  onToggleFollowUpOnly,
  onClearFollowUpOnly,
  onSync,
  onComposeEmail,
  onStartWhatsApp,
}: InboxSidebarControlsProps) {
  const isZh = language === 'zh';

  const mailFilters: Array<{ value: InboxMailFilter; label: string; shortLabel: string }> = [
    { value: 'inbox', label: isZh ? '收件箱' : 'Inbox', shortLabel: isZh ? '收件' : 'Inbox' },
    { value: 'sent', label: isZh ? '已发送' : 'Sent', shortLabel: isZh ? '已发' : 'Sent' },
    { value: 'scheduled', label: isZh ? '定时发送' : 'Scheduled', shortLabel: isZh ? '定时' : 'Scheduled' },
    { value: 'drafts', label: isZh ? '草稿' : 'Drafts', shortLabel: isZh ? '草稿' : 'Drafts' },
  ];

  const channelOptions = [
    { value: 'all', label: isZh ? '全部' : 'All', icon: null },
    { value: 'email', label: isZh ? '邮件' : 'Email', icon: Mail },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'live_chat', label: isZh ? '在线聊天' : 'Live Chat', icon: MessageSquare },
    { value: 'telegram', label: 'Telegram', icon: Send },
  ] as const;

  const syncText = isSyncing
    ? (isZh ? '正在同步邮件…' : 'Syncing emails...')
    : isWhatsAppBackgroundSyncing
      ? (isZh ? '正在刷新 WhatsApp…' : 'Refreshing WhatsApp...')
      : syncError
        ? (isZh ? `后台同步等待中：${syncError}` : `Auto sync waiting: ${syncError}`)
        : (isZh ? '已启用后台自动同步' : 'Background auto sync is enabled');

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">
                {isZh ? '统一收件箱' : 'Unified Inbox'}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {totalConversations}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isZh ? '按视图、渠道和待跟进状态来处理会话。' : 'Work conversations by view, channel, and follow-up state.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onSync}
              disabled={isSyncing}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800',
                isSyncing && 'cursor-not-allowed opacity-60',
              )}
              title={isZh ? '同步' : 'Sync'}
            >
              <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
            </button>
            <button
              onClick={onComposeEmail}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff7a59] text-white shadow-sm transition hover:bg-[#f25f3a]"
              title={isZh ? '写邮件' : 'Compose Email'}
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={onStartWhatsApp}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-500"
              title={isZh ? '新建 WhatsApp 消息' : 'New WhatsApp Message'}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '当前视图' : 'Current View'}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {mailFilters.find(item => item.value === filter)?.label}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '渠道' : 'Channel'}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {channelOptions.find(item => item.value === channelFilter)?.label}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '待跟进' : 'Follow-up'}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {visibleFollowUpCount}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '模式' : 'Mode'}
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Database className="h-3.5 w-3.5 text-cyan-600" />
              {isZh ? '统一会话' : 'Unified'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '视图' : 'Views'}
            </span>
            <span className="text-[11px] text-slate-400">
              {isZh ? '快速切换' : 'Quick switch'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {mailFilters.map(item => (
              <button
                key={item.value}
                type="button"
                onClick={() => onFilterChange(item.value)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-left transition',
                  filter === item.value
                    ? 'border-[#ff7a59]/30 bg-white text-slate-950 shadow-sm'
                    : 'border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900',
                )}
              >
                <div className="text-sm font-semibold">{item.shortLabel}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">{item.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '渠道筛选' : 'Channel Filter'}
            </span>
            <span className="text-[11px] text-slate-400">
              {isZh ? '统一队列' : 'Shared queue'}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {channelOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChannelFilterChange(option.value)}
                  className={cn(
                    'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center transition',
                    channelFilter === option.value
                      ? 'border-[#253858] bg-[#253858] text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-900',
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        channelFilter === option.value
                          ? 'text-white'
                          : option.value === 'whatsapp'
                            ? 'text-emerald-500'
                            : option.value === 'live_chat'
                              ? 'text-violet-500'
                              : option.value === 'telegram'
                                ? 'text-sky-500'
                                : 'text-cyan-600',
                      )}
                    />
                  )}
                  <span className="text-[11px] font-semibold leading-tight">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '搜索与标签' : 'Search & Tags'}
            </span>
            {searchTags.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSearchTagsChange([]);
                  onSearchChange('');
                }}
                className="text-[11px] font-medium text-slate-400 transition hover:text-slate-700"
              >
                {isZh ? '清空' : 'Reset'}
              </button>
            )}
          </div>
          <div className="flex min-h-[44px] flex-wrap items-center rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#ff7a59] focus-within:ring-2 focus-within:ring-[#ff7a59]/10">
            <Search className="mr-2 h-4 w-4 text-slate-400" />
            {searchTags.map((tag, index) => (
              <span
                key={`${tag}_${index}`}
                className="my-1 mr-1 inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => onSearchTagsChange(searchTags.filter((_, itemIndex) => itemIndex !== index))}
                  className="text-cyan-500 transition hover:text-rose-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder={isZh ? '搜索或输入标签…' : 'Search or add tags...'}
              value={search}
              onChange={event => onSearchChange(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Tab' || event.key === 'Enter') {
                  event.preventDefault();
                  if (search.trim()) {
                    onSearchTagsChange([...searchTags, search.trim()]);
                    onSearchChange('');
                  }
                } else if (event.key === 'Backspace' && !search && searchTags.length > 0) {
                  onSearchTagsChange(searchTags.slice(0, -1));
                }
              }}
              list="inbox-tag-suggestions"
              className="min-w-[120px] flex-1 bg-transparent py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <datalist id="inbox-tag-suggestions">
              {tagSuggestions.map(tag => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleFollowUpOnly}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              followUpOnly
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700',
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            <span>{isZh ? '待跟进' : 'Follow-up'}</span>
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px]',
              followUpOnly ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
            )}>
              {visibleFollowUpCount}
            </span>
          </button>
          {followUpOnly && (
            <button
              type="button"
              onClick={onClearFollowUpOnly}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 transition hover:text-slate-800"
            >
              <X className="h-3 w-3" />
              {isZh ? '清除筛选' : 'Clear filter'}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <div className="inline-flex min-w-0 items-center gap-1.5">
            <Timer
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                isSyncing ? 'text-[#ff7a59]' : syncError ? 'text-rose-500' : 'text-slate-400',
              )}
            />
            <span className="truncate">{syncText}</span>
          </div>
          {lastSyncAt && (
            <span className="shrink-0">
              {isZh ? '最近 ' : 'Last '}
              {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
