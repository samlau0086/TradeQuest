import React from 'react';
import {
  Bookmark,
  Mail,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
  Star,
  Timer,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { InboxMailFilter } from './InboxConversationSidebarTypes';
import type {
  InboxChannelFilter,
  InboxQueueDensity,
  InboxQueueOwnerFilter,
  InboxQueueSortMode,
  InboxSavedView,
} from './inboxModel';

export interface InboxSidebarControlsCopy {
  currentView: string;
  searchAndTags: string;
  queueSetup: string;
  savedViews: string;
  channelLabel: string;
  sortLabel: string;
  ownerLabel: string;
  densityLabel: string;
  followUpOnly: string;
  followUpOpen: string;
  queueStatus: string;
  searchPlaceholder: string;
  tagPlaceholder: string;
  saveViewPlaceholder: string;
  saveView: string;
  updateView: string;
  deleteView: string;
  setDefault: string;
  resetQueue: string;
  syncNow: string;
  composeEmail: string;
  startWhatsApp: string;
  noSavedViews: string;
  defaultBadge: string;
  unsavedBadge: string;
  lastSync: string;
  conversations: string;
  followUps: string;
  searchTagsCount: string;
  workingView: string;
  clearSearch: string;
}

interface InboxSidebarCurrentViewSectionProps {
  copy: InboxSidebarControlsCopy;
  activeViewName: string;
  currentQueueViewDirty: boolean;
  currentViewTokens: string[];
  totalConversations: number;
  visibleFollowUpCount: number;
  syncText: string;
  lastSyncAtText: string;
  isSyncing: boolean;
  isWhatsAppBackgroundSyncing: boolean;
  onSync: () => void;
  onComposeEmail: () => void;
  onStartWhatsApp: () => void;
}

export function InboxSidebarCurrentViewSection({
  copy,
  activeViewName,
  currentQueueViewDirty,
  currentViewTokens,
  totalConversations,
  visibleFollowUpCount,
  syncText,
  lastSyncAtText,
  isSyncing,
  isWhatsAppBackgroundSyncing,
  onSync,
  onComposeEmail,
  onStartWhatsApp,
}: InboxSidebarCurrentViewSectionProps) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {copy.currentView}
          </div>
          <div className="mt-1 text-base font-semibold tracking-tight text-slate-950">
            {activeViewName}
          </div>
        </div>
        {currentQueueViewDirty && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
            {copy.unsavedBadge}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {currentViewTokens.map((token) => (
          <span
            key={token}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
          >
            {token}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-2xl bg-slate-50 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {copy.queueStatus}
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-950">{totalConversations}</div>
          <div className="text-xs text-slate-500">{copy.conversations}</div>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {copy.followUpOnly}
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-950">{visibleFollowUpCount}</div>
          <div className="text-xs text-slate-500">{copy.followUps}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSync}
          className="inline-flex items-center gap-2 rounded-xl bg-[#253858] px-3.5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#1f2f4d]"
        >
          <RefreshCw
            className={cn(
              'h-4 w-4',
              (isSyncing || isWhatsAppBackgroundSyncing) && 'animate-spin',
            )}
          />
          {copy.syncNow}
        </button>
        <button
          type="button"
          onClick={onComposeEmail}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
        >
          <Sparkles className="h-4 w-4" />
          {copy.composeEmail}
        </button>
        <button
          type="button"
          onClick={onStartWhatsApp}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <MessageCircle className="h-4 w-4" />
          {copy.startWhatsApp}
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2.5">
        <div className="text-[11px] font-medium text-slate-600">{syncText}</div>
        {lastSyncAtText && (
          <div className="mt-1 text-[11px] text-slate-400">
            {copy.lastSync}: {lastSyncAtText}
          </div>
        )}
      </div>
    </div>
  );
}

interface InboxSidebarSearchSectionProps {
  copy: InboxSidebarControlsCopy;
  search: string;
  searchTags: string[];
  tagDraft: string;
  tagSuggestions: string[];
  onSearchChange: (value: string) => void;
  onTagDraftChange: (value: string) => void;
  onAddTag: (value: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function InboxSidebarSearchSection({
  copy,
  search,
  searchTags,
  tagDraft,
  tagSuggestions,
  onSearchChange,
  onTagDraftChange,
  onAddTag,
  onRemoveTag,
}: InboxSidebarSearchSectionProps) {
  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {copy.searchAndTags}
      </div>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={copy.searchPlaceholder}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-cyan-300 focus:bg-white"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
            title={copy.clearSearch}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 p-3">
        <div className="flex flex-wrap gap-2">
          {searchTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700"
            >
              #{tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className="text-cyan-600 hover:text-cyan-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={tagDraft}
            onChange={(event) => onTagDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddTag(tagDraft);
              }
            }}
            placeholder={copy.tagPlaceholder}
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-300"
          />
          <button
            type="button"
            onClick={() => onAddTag(tagDraft)}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {tagSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tagSuggestions.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onAddTag(tag)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface InboxSidebarQueueSetupSectionProps {
  copy: InboxSidebarControlsCopy;
  filter: InboxMailFilter;
  channelFilter: InboxChannelFilter;
  queueSortMode: InboxQueueSortMode;
  queueOwnerFilter: InboxQueueOwnerFilter;
  queueDensity: InboxQueueDensity;
  followUpOnly: boolean;
  mailFilters: Array<{ value: InboxMailFilter; label: string }>;
  channelOptions: ReadonlyArray<{ value: InboxChannelFilter; label: string; icon: React.ComponentType<{ className?: string }> }>;
  sortOptions: Array<{ value: InboxQueueSortMode; label: string }>;
  ownerOptions: Array<{ value: InboxQueueOwnerFilter; label: string }>;
  densityOptions: Array<{ value: InboxQueueDensity; label: string }>;
  onFilterChange: (filter: InboxMailFilter) => void;
  onChannelFilterChange: (filter: InboxChannelFilter) => void;
  onQueueSortModeChange: (value: InboxQueueSortMode) => void;
  onQueueOwnerFilterChange: (value: InboxQueueOwnerFilter) => void;
  onQueueDensityChange: (value: InboxQueueDensity) => void;
  onToggleFollowUpOnly: () => void;
  onClearFollowUpOnly: () => void;
  onResetQueueView: () => void;
}

export function InboxSidebarQueueSetupSection({
  copy,
  filter,
  channelFilter,
  queueSortMode,
  queueOwnerFilter,
  queueDensity,
  followUpOnly,
  mailFilters,
  channelOptions,
  sortOptions,
  ownerOptions,
  densityOptions,
  onFilterChange,
  onChannelFilterChange,
  onQueueSortModeChange,
  onQueueOwnerFilterChange,
  onQueueDensityChange,
  onToggleFollowUpOnly,
  onClearFollowUpOnly,
  onResetQueueView,
}: InboxSidebarQueueSetupSectionProps) {
  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {copy.queueSetup}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {mailFilters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onFilterChange(option.value)}
            className={cn(
              'rounded-2xl border px-3 py-2.5 text-sm font-semibold transition',
              filter === option.value
                ? 'border-[#253858] bg-[#253858] text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {copy.channelLabel}
          </span>
          <select
            value={channelFilter}
            onChange={(event) => onChannelFilterChange(event.target.value as InboxChannelFilter)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {copy.sortLabel}
          </span>
          <select
            value={queueSortMode}
            onChange={(event) => onQueueSortModeChange(event.target.value as InboxQueueSortMode)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {copy.ownerLabel}
          </span>
          <select
            value={queueOwnerFilter}
            onChange={(event) => onQueueOwnerFilterChange(event.target.value as InboxQueueOwnerFilter)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
          >
            {ownerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {copy.densityLabel}
          </span>
          <select
            value={queueDensity}
            onChange={(event) => onQueueDensityChange(event.target.value as InboxQueueDensity)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
          >
            {densityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={followUpOnly ? onClearFollowUpOnly : onToggleFollowUpOnly}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition',
            followUpOnly
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900',
          )}
        >
          <Timer className="h-4 w-4" />
          {copy.followUpOnly}
        </button>
        <button
          type="button"
          onClick={onResetQueueView}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
        >
          <X className="h-4 w-4" />
          {copy.resetQueue}
        </button>
      </div>
    </div>
  );
}

interface InboxSidebarSavedViewsSectionProps {
  copy: InboxSidebarControlsCopy;
  savedViewName: string;
  activeSavedViewId: string | null;
  savedViews: InboxSavedView[];
  activeSavedView: InboxSavedView | null;
  mailFilters: Array<{ value: InboxMailFilter; label: string }>;
  channelOptions: ReadonlyArray<{ value: InboxChannelFilter; label: string; icon: React.ComponentType<{ className?: string }> }>;
  onSavedViewNameChange: (value: string) => void;
  onSaveView: () => void;
  onApplySavedView: (view: InboxSavedView) => void;
  onSetDefaultSavedView: (viewId: string) => void;
  onDeleteSavedView: (viewId: string) => void;
}

export function InboxSidebarSavedViewsSection({
  copy,
  savedViewName,
  activeSavedViewId,
  savedViews,
  activeSavedView,
  mailFilters,
  channelOptions,
  onSavedViewNameChange,
  onSaveView,
  onApplySavedView,
  onSetDefaultSavedView,
  onDeleteSavedView,
}: InboxSidebarSavedViewsSectionProps) {
  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {copy.savedViews}
        </div>
        <Bookmark className="h-4 w-4 text-slate-400" />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={savedViewName}
          onChange={(event) => onSavedViewNameChange(event.target.value)}
          placeholder={copy.saveViewPlaceholder}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
        />
        <button
          type="button"
          onClick={onSaveView}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#253858] px-3 text-[12px] font-semibold text-white transition hover:bg-[#1f2f4d]"
        >
          <Save className="h-4 w-4" />
          {activeSavedView ? copy.updateView : copy.saveView}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {savedViews.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            {copy.noSavedViews}
          </div>
        )}

        {savedViews.map((view) => (
          <div
            key={view.id}
            className={cn(
              'rounded-2xl border p-3 transition',
              activeSavedViewId === view.id
                ? 'border-cyan-200 bg-cyan-50/60'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onApplySavedView(view)}
                className="min-w-0 text-left"
              >
                <div className="truncate text-sm font-semibold text-slate-900">
                  {view.name}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {view.isDefault && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {copy.defaultBadge}
                    </span>
                  )}
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {mailFilters.find((item) => item.value === view.filter)?.label ?? view.filter}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {channelOptions.find((item) => item.value === view.channelFilter)?.label ?? view.channelFilter}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSetDefaultSavedView(view.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-emerald-600"
                  title={copy.setDefault}
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      view.isDefault && 'fill-amber-400 text-amber-400',
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSavedView(view.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-rose-600"
                  title={copy.deleteView}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
