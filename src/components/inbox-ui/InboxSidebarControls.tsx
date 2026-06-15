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
    { value: 'inbox', label: 'Inbox' },
    { value: 'sent', label: 'Sent' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'drafts', label: 'Drafts' },
  ];
  const channelOptions = [
    { value: 'all', label: 'All', icon: null },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'live_chat', label: 'Live Chat', icon: MessageSquare },
    { value: 'telegram', label: 'Telegram', icon: Send }
  ] as const;

  return (
    <div className="p-4 border-b border-slate-800 flex flex-col gap-3 bg-slate-900">
      <div className="flex justify-between items-center bg-slate-900">
        <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
          {mailFilters.map(item => (
            <button
              key={item.value}
              onClick={() => onFilterChange(item.value)}
              className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", filter === item.value ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={cn("p-1.5 bg-slate-800 text-slate-300 rounded-md hover:bg-slate-700 transition-colors border border-slate-700", isSyncing && "opacity-50")}
            title="Sync Emails"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
          </button>
          <button
            onClick={onComposeEmail}
            className="p-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
            title="Compose Email"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onStartWhatsApp}
            className="p-1.5 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors shadow-lg shadow-green-600/20"
            title="New WhatsApp Message"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
        {channelOptions.map(option => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChannelFilterChange(option.value)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors",
                channelFilter === option.value
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
              )}
            >
              {Icon && <Icon className={cn("h-3.5 w-3.5", option.value === 'whatsapp' ? 'text-green-400' : option.value === 'live_chat' ? 'text-violet-400' : option.value === 'telegram' ? 'text-sky-400' : 'text-cyan-400')} />}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-wrap items-center bg-slate-950 border border-slate-800 rounded px-2 min-h-[36px] focus-within:border-cyan-500 transition-colors">
          <Search className="w-3 h-3 text-slate-500 mr-2" />
          {searchTags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 mr-1 my-1">
              {tag}
              <button onClick={() => onSearchTagsChange(searchTags.filter((_, index) => index !== i))} className="hover:text-red-400 ml-1">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder={searchTags.length > 0 ? "Search..." : "Search or add #tag..."}
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
            className="flex-1 min-w-[100px] bg-transparent text-xs text-slate-200 py-1.5 focus:outline-none"
          />
          <datalist id="inbox-tag-suggestions">
            {tagSuggestions.map(t => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleFollowUpOnly}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
            followUpOnly
              ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
              : "border-slate-700 bg-slate-950 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-200"
          )}
          title="Filter conversations with follow-up reminders"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {language === 'zh' ? '待跟进' : 'Follow-up'}
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", followUpOnly ? "bg-emerald-500/20 text-emerald-100" : "bg-slate-800 text-slate-500")}>
            {visibleFollowUpCount}
          </span>
        </button>
        {followUpOnly && (
          <button
            type="button"
            onClick={onClearFollowUpOnly}
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-300"
          >
            <X className="h-3 w-3" />
            {language === 'zh' ? '清除筛选' : 'Clear'}
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400">
          <Database className="h-3 w-3 text-cyan-400" />
          {language === 'zh' ? '统一会话视图' : 'Unified conversations'}
        </div>
        <span className="text-[10px] text-slate-500">
          {totalConversations} {language === 'zh' ? '条' : 'items'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Timer className={cn("w-3 h-3 shrink-0", isSyncing ? "text-cyan-400" : syncError ? "text-rose-400" : "text-slate-500")} />
          <span className="truncate">
            {isSyncing
              ? 'Auto syncing emails...'
              : isWhatsAppBackgroundSyncing
                ? 'Refreshing WhatsApp in background...'
                : syncError
                  ? `Auto sync waiting: ${syncError}`
                  : 'Background auto sync is enabled'}
          </span>
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
