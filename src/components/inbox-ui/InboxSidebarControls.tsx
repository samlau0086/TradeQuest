import React from 'react';
import { CalendarClock, Database, Edit3, Mail, MessageCircle, MessageSquare, RefreshCw, Search, Send, Timer, X } from 'lucide-react';
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
  const mailFilters: Array<{ value: InboxMailFilter; label: string }> = [
    { value: 'inbox', label: language === 'zh' ? '收件箱' : 'Inbox' },
    { value: 'sent', label: language === 'zh' ? '已发送' : 'Sent' },
    { value: 'scheduled', label: language === 'zh' ? '定时' : 'Scheduled' },
    { value: 'drafts', label: language === 'zh' ? '草稿' : 'Drafts' },
  ];
  const channelOptions = [
    { value: 'all', label: language === 'zh' ? '全部' : 'All', icon: null },
    { value: 'email', label: language === 'zh' ? '邮件' : 'Email', icon: Mail },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'live_chat', label: language === 'zh' ? '在线' : 'Live', icon: MessageSquare },
    { value: 'telegram', label: 'Telegram', icon: Send }
  ] as const;

  const syncText = isSyncing
    ? (language === 'zh' ? '正在同步邮件...' : 'Syncing emails...')
    : isWhatsAppBackgroundSyncing
      ? (language === 'zh' ? '正在后台刷新 WhatsApp...' : 'Refreshing WhatsApp...')
      : syncError
        ? (language === 'zh' ? `同步等待中：${syncError}` : `Auto sync waiting: ${syncError}`)
        : (language === 'zh' ? '后台自动同步已启用' : 'Background auto sync is enabled');

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-950">
            {language === 'zh' ? '会话队列' : 'Conversation queue'}
          </h2>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {language === 'zh' ? '按渠道、标签和跟进状态处理沟通。' : 'Prioritize by channel, tags, and follow-up state.'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={cn('rounded-md border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800', isSyncing && 'opacity-50')}
            title={language === 'zh' ? '同步' : 'Sync'}
          >
            <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
          </button>
          <button
            onClick={onComposeEmail}
            className="rounded-md bg-[#ff7a59] p-2 text-white shadow-sm transition hover:bg-[#f25f3a]"
            title={language === 'zh' ? '写邮件' : 'Compose Email'}
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={onStartWhatsApp}
            className="rounded-md bg-emerald-600 p-2 text-white shadow-sm transition hover:bg-emerald-500"
            title={language === 'zh' ? '新建 WhatsApp 消息' : 'New WhatsApp Message'}
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {mailFilters.map(item => (
          <button
            key={item.value}
            onClick={() => onFilterChange(item.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              filter === item.value
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {channelOptions.map(option => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChannelFilterChange(option.value)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors',
                channelFilter === option.value
                  ? 'bg-[#253858] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'h-3.5 w-3.5',
                    option.value === 'whatsapp'
                      ? 'text-green-400'
                      : option.value === 'live_chat'
                        ? 'text-violet-400'
                        : option.value === 'telegram'
                          ? 'text-sky-400'
                          : 'text-cyan-500',
                  )}
                />
              )}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-[38px] flex-wrap items-center rounded-md border border-slate-200 bg-white px-2 shadow-sm transition-colors focus-within:border-[#ff7a59] focus-within:ring-2 focus-within:ring-[#ff7a59]/10">
        <Search className="mr-2 h-3.5 w-3.5 text-slate-400" />
        {searchTags.map((tag, i) => (
          <span key={i} className="mr-1 my-1 flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {tag}
            <button onClick={() => onSearchTagsChange(searchTags.filter((_, index) => index !== i))} className="ml-1 hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder={searchTags.length > 0 ? 'Search...' : 'Search or add #tag...'}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Tab' || e.key === 'Enter') {
              e.preventDefault();
              if (search.trim()) {
                onSearchTagsChange([...searchTags, search.trim()]);
                onSearchChange('');
              }
            } else if (e.key === 'Backspace' && !search && searchTags.length > 0) {
              onSearchTagsChange(searchTags.slice(0, -1));
            }
          }}
          list="inbox-tag-suggestions"
          className="min-w-[100px] flex-1 bg-transparent py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        <datalist id="inbox-tag-suggestions">
          {tagSuggestions.map(t => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleFollowUpOnly}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
            followUpOnly
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-700',
          )}
          title="Filter conversations with follow-up reminders"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {language === 'zh' ? '待跟进' : 'Follow-up'}
          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', followUpOnly ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
            {visibleFollowUpCount}
          </span>
        </button>
        {followUpOnly && (
          <button
            type="button"
            onClick={onClearFollowUpOnly}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
          >
            <X className="h-3 w-3" />
            {language === 'zh' ? '清除筛选' : 'Clear'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
          <Database className="h-3 w-3 text-[#ff7a59]" />
          {language === 'zh' ? '统一会话视图' : 'Unified conversations'}
        </div>
        <span className="text-[10px] text-slate-500">
          {totalConversations} {language === 'zh' ? '条' : 'items'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Timer className={cn('h-3 w-3 shrink-0', isSyncing ? 'text-[#ff7a59]' : syncError ? 'text-rose-500' : 'text-slate-400')} />
          <span className="truncate">{syncText}</span>
        </span>
        {lastSyncAt && (
          <span className="shrink-0">
            Last {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
