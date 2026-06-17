import React, { useMemo, useState } from 'react';
import { Mail, MessageCircle, MessageSquare, Send, Sparkles } from 'lucide-react';
import type { InboxMailFilter } from './InboxConversationSidebarTypes';
import type {
  InboxChannelFilter,
  InboxQueueDensity,
  InboxQueueOwnerFilter,
  InboxQueueSortMode,
  InboxSavedView,
} from './inboxModel';
import {
  InboxSidebarCurrentViewSection,
  InboxSidebarQueueSetupSection,
  InboxSidebarSavedViewsSection,
  InboxSidebarSearchSection,
  type InboxSidebarControlsCopy,
} from './InboxSidebarControlSections';

interface InboxSidebarControlsProps {
  language: string;
  filter: InboxMailFilter;
  channelFilter: InboxChannelFilter;
  search: string;
  searchTags: string[];
  tagSuggestions: string[];
  followUpOnly: boolean;
  queueSortMode: InboxQueueSortMode;
  queueOwnerFilter: InboxQueueOwnerFilter;
  queueDensity: InboxQueueDensity;
  savedViews: InboxSavedView[];
  activeSavedViewId: string | null;
  currentQueueViewDirty: boolean;
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
  onQueueSortModeChange: (value: InboxQueueSortMode) => void;
  onQueueOwnerFilterChange: (value: InboxQueueOwnerFilter) => void;
  onQueueDensityChange: (value: InboxQueueDensity) => void;
  onApplySavedView: (view: InboxSavedView) => void;
  onSaveSavedView: (name?: string) => void;
  onDeleteSavedView: (viewId: string) => void;
  onSetDefaultSavedView: (viewId: string) => void;
  onResetQueueView: () => void;
  onSync: () => void;
  onComposeEmail: () => void;
  onStartWhatsApp: () => void;
}

function formatLastSync(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InboxSidebarControls({
  language,
  filter,
  channelFilter,
  search,
  searchTags,
  tagSuggestions,
  followUpOnly,
  queueSortMode,
  queueOwnerFilter,
  queueDensity,
  savedViews,
  activeSavedViewId,
  currentQueueViewDirty,
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
  onQueueSortModeChange,
  onQueueOwnerFilterChange,
  onQueueDensityChange,
  onApplySavedView,
  onSaveSavedView,
  onDeleteSavedView,
  onSetDefaultSavedView,
  onResetQueueView,
  onSync,
  onComposeEmail,
  onStartWhatsApp,
}: InboxSidebarControlsProps) {
  const isZh = language === 'zh';
  const [tagDraft, setTagDraft] = useState('');
  const [savedViewName, setSavedViewName] = useState('');

  const copy: InboxSidebarControlsCopy = {
    currentView: isZh ? '当前视图' : 'Current view',
    searchAndTags: isZh ? '搜索与标签' : 'Search & tags',
    queueSetup: isZh ? '队列设置' : 'Queue setup',
    savedViews: isZh ? '已保存视图' : 'Saved views',
    channelLabel: isZh ? '渠道' : 'Channel',
    sortLabel: isZh ? '排序' : 'Sort',
    ownerLabel: isZh ? '负责人' : 'Owner',
    densityLabel: isZh ? '密度' : 'Density',
    followUpOnly: isZh ? '仅看待跟进' : 'Follow-up only',
    followUpOpen: isZh ? '待跟进进行中' : 'Follow-up active',
    queueStatus: isZh ? '队列状态' : 'Queue status',
    searchPlaceholder: isZh
      ? '搜索会话、客户或关键词'
      : 'Search conversations, clients, or keywords',
    tagPlaceholder: isZh ? '输入标签后回车' : 'Press Enter to add a tag',
    saveViewPlaceholder: isZh ? '输入视图名称' : 'Name this view',
    saveView: isZh ? '保存视图' : 'Save view',
    updateView: isZh ? '更新视图' : 'Update view',
    deleteView: isZh ? '删除' : 'Delete',
    setDefault: isZh ? '设为默认' : 'Set default',
    resetQueue: isZh ? '重置当前视图' : 'Reset current view',
    syncNow: isZh ? '立即同步' : 'Sync now',
    composeEmail: isZh ? '写邮件' : 'Compose email',
    startWhatsApp: isZh ? '新建 WhatsApp' : 'Start WhatsApp',
    noSavedViews: isZh ? '还没有保存的视图。' : 'No saved views yet.',
    defaultBadge: isZh ? '默认' : 'Default',
    unsavedBadge: isZh ? '未保存修改' : 'Unsaved changes',
    lastSync: isZh ? '上次同步' : 'Last sync',
    conversations: isZh ? '会话' : 'conversations',
    followUps: isZh ? '待跟进' : 'follow-ups',
    searchTagsCount: isZh ? '个标签' : 'tags',
    workingView: isZh ? '临时工作视图' : 'Working view',
    clearSearch: isZh ? '清空搜索' : 'Clear search',
  };

  const mailFilters: Array<{ value: InboxMailFilter; label: string }> = [
    { value: 'inbox', label: isZh ? '收件箱' : 'Inbox' },
    { value: 'sent', label: isZh ? '已发送' : 'Sent' },
    { value: 'scheduled', label: isZh ? '定时发送' : 'Scheduled' },
    { value: 'drafts', label: isZh ? '草稿' : 'Drafts' },
  ];

  const channelOptions = [
    { value: 'all', label: isZh ? '全部' : 'All', icon: Sparkles },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'live_chat', label: 'Live Chat', icon: MessageSquare },
    { value: 'telegram', label: 'Telegram', icon: Send },
  ] as const;

  const sortOptions: Array<{ value: InboxQueueSortMode; label: string }> = [
    { value: 'recent', label: isZh ? '最近优先' : 'Newest first' },
    { value: 'oldest', label: isZh ? '最早优先' : 'Oldest first' },
    { value: 'follow_up', label: isZh ? '待跟进优先' : 'Follow-up first' },
    { value: 'unread', label: isZh ? '未读优先' : 'Unread first' },
  ];

  const ownerOptions: Array<{ value: InboxQueueOwnerFilter; label: string }> = [
    { value: 'all', label: isZh ? '全部负责人' : 'All owners' },
    { value: 'mine', label: isZh ? '仅我的' : 'Mine only' },
    { value: 'assigned', label: isZh ? '已分配' : 'Assigned' },
    { value: 'unassigned', label: isZh ? '未分配' : 'Unassigned' },
  ];

  const densityOptions: Array<{ value: InboxQueueDensity; label: string }> = [
    { value: 'comfortable', label: isZh ? '舒适' : 'Comfortable' },
    { value: 'compact', label: isZh ? '紧凑' : 'Compact' },
  ];

  const activeSavedView = savedViews.find(view => view.id === activeSavedViewId) || null;

  const syncText = isSyncing
    ? (isZh ? '正在同步邮件...' : 'Syncing email...')
    : isWhatsAppBackgroundSyncing
      ? (isZh ? '正在刷新 WhatsApp...' : 'Refreshing WhatsApp...')
      : syncError
        ? (isZh ? `后台同步已暂停：${syncError}` : `Background sync paused: ${syncError}`)
        : (isZh ? '后台自动同步已启用' : 'Background auto sync is enabled');

  const currentViewTokens = useMemo(() => {
    const tokens = [
      mailFilters.find(item => item.value === filter)?.label ?? filter,
      channelOptions.find(item => item.value === channelFilter)?.label ?? channelFilter,
      ownerOptions.find(item => item.value === queueOwnerFilter)?.label ?? queueOwnerFilter,
      sortOptions.find(item => item.value === queueSortMode)?.label ?? queueSortMode,
      densityOptions.find(item => item.value === queueDensity)?.label ?? queueDensity,
    ];
    if (followUpOnly) tokens.push(copy.followUpOpen);
    if (search.trim()) {
      tokens.push(isZh ? `搜索: ${search}` : `Search: ${search}`);
    }
    if (searchTags.length > 0) {
      tokens.push(`${searchTags.length} ${copy.searchTagsCount}`);
    }
    return tokens;
  }, [
    channelFilter,
    copy.followUpOpen,
    copy.searchTagsCount,
    densityOptions,
    filter,
    followUpOnly,
    isZh,
    ownerOptions,
    queueDensity,
    queueOwnerFilter,
    queueSortMode,
    search,
    searchTags.length,
    sortOptions,
  ]);

  const addTag = (rawValue: string) => {
    const tag = rawValue.trim().replace(/^#/, '');
    if (!tag || searchTags.includes(tag)) return;
    onSearchTagsChange([...searchTags, tag]);
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    onSearchTagsChange(searchTags.filter(item => item !== tag));
  };

  const handleSaveView = () => {
    const nextName = savedViewName.trim();
    onSaveSavedView(nextName || undefined);
    if (nextName) setSavedViewName('');
  };

  return (
    <div className="space-y-0">
      <InboxSidebarCurrentViewSection
        copy={copy}
        activeViewName={activeSavedView?.name || copy.workingView}
        currentQueueViewDirty={currentQueueViewDirty}
        currentViewTokens={currentViewTokens}
        totalConversations={totalConversations}
        visibleFollowUpCount={visibleFollowUpCount}
        syncText={syncText}
        lastSyncAtText={lastSyncAt ? formatLastSync(lastSyncAt) : ''}
        isSyncing={isSyncing}
        isWhatsAppBackgroundSyncing={isWhatsAppBackgroundSyncing}
        onSync={onSync}
        onComposeEmail={onComposeEmail}
        onStartWhatsApp={onStartWhatsApp}
      />

      <InboxSidebarSearchSection
        copy={copy}
        search={search}
        searchTags={searchTags}
        tagDraft={tagDraft}
        tagSuggestions={tagSuggestions}
        onSearchChange={onSearchChange}
        onTagDraftChange={setTagDraft}
        onAddTag={addTag}
        onRemoveTag={removeTag}
      />

      <InboxSidebarQueueSetupSection
        copy={copy}
        filter={filter}
        channelFilter={channelFilter}
        queueSortMode={queueSortMode}
        queueOwnerFilter={queueOwnerFilter}
        queueDensity={queueDensity}
        followUpOnly={followUpOnly}
        mailFilters={mailFilters}
        channelOptions={channelOptions}
        sortOptions={sortOptions}
        ownerOptions={ownerOptions}
        densityOptions={densityOptions}
        onFilterChange={onFilterChange}
        onChannelFilterChange={onChannelFilterChange}
        onQueueSortModeChange={onQueueSortModeChange}
        onQueueOwnerFilterChange={onQueueOwnerFilterChange}
        onQueueDensityChange={onQueueDensityChange}
        onToggleFollowUpOnly={onToggleFollowUpOnly}
        onClearFollowUpOnly={onClearFollowUpOnly}
        onResetQueueView={onResetQueueView}
      />

      <InboxSidebarSavedViewsSection
        copy={copy}
        savedViewName={savedViewName}
        activeSavedViewId={activeSavedViewId}
        savedViews={savedViews}
        activeSavedView={activeSavedView}
        mailFilters={mailFilters}
        channelOptions={channelOptions}
        onSavedViewNameChange={setSavedViewName}
        onSaveView={handleSaveView}
        onApplySavedView={onApplySavedView}
        onSetDefaultSavedView={onSetDefaultSavedView}
        onDeleteSavedView={onDeleteSavedView}
      />
    </div>
  );
}
