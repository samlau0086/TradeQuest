import React from 'react';
import { InboxBulkActionsPanel } from './InboxBulkActionsPanel';
import { InboxConversationListItem } from './InboxConversationListItem';
import { InboxQueueHeader } from './InboxQueueHeader';
import { InboxSidebarControls } from './InboxSidebarControls';
import { InboxSidebarSection } from './InboxSidebarSection';
import type { InboxConversationSidebarProps } from './InboxConversationSidebarTypes';
import { mapUnifiedWhatsAppConversation } from './inboxModel';

export function InboxQueueSidebarWorkspace({
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
  unifiedConversationList,
  selectableVisibleCount,
  totalVisibleCount,
  isUnifiedConversationLoading,
  isSyncing,
  isWhatsAppBackgroundSyncing,
  syncError,
  lastSyncAt,
  selectedEmailId,
  selectedWhatsAppPhone,
  selectedTelegramConversation,
  selectedLiveChatConversation,
  selectedConversationIds,
  emails,
  clients,
  currentUser,
  selectedCount,
  allVisibleSelected,
  someVisibleSelected,
  bulkTagInput,
  bulkNoteInput,
  bulkOwnerId,
  bulkStage,
  bulkFollowUpAt,
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
  onToggleSelectAll,
  onClearSelection,
  onBulkTagInputChange,
  onBulkNoteInputChange,
  onBulkOwnerIdChange,
  onBulkStageChange,
  onBulkFollowUpAtChange,
  onAddTag,
  onAddComment,
  onAssignOwner,
  onSetStage,
  onSetFollowUp,
  onMarkImportant,
  onDeleteSelected,
  onSelectConversation,
  onToggleConversationSelection,
  onDeleteWhatsAppConversation,
  onOwnerStageChange,
}: InboxConversationSidebarProps) {
  const isZh = language === 'zh';
  const unreadVisibleCount = unifiedConversationList.filter(
    conversation => conversation.read === false,
  ).length;
  const assignedVisibleCount = unifiedConversationList.filter(
    conversation => Boolean(conversation.owner_id),
  ).length;
  const unassignedVisibleCount = unifiedConversationList.filter(
    conversation => !conversation.owner_id,
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-[#f3f6fb] p-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: isZh ? '可见会话' : 'Visible',
            value: totalVisibleCount,
            tone: 'text-slate-950',
          },
          {
            label: isZh ? '待跟进' : 'Follow-up',
            value: visibleFollowUpCount,
            tone: 'text-emerald-700',
          },
          {
            label: isZh ? '未读' : 'Unread',
            value: unreadVisibleCount,
            tone: 'text-cyan-700',
          },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {item.label}
            </div>
            <div className={`mt-1 text-lg font-semibold ${item.tone}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <InboxSidebarSection
        eyebrow={isZh ? '工作区' : 'Workspace'}
        title={isZh ? '队列控制与筛选' : 'Queue controls & filters'}
        description={
          isZh
            ? '在这里切换渠道、保存视图，并整理当前统一收件箱的工作队列。'
            : 'Switch channels, save views, and shape the active unified conversation queue.'
        }
        bodyClassName="px-0 py-0"
      >
        <InboxSidebarControls
          language={language}
          filter={filter}
          channelFilter={channelFilter}
          search={search}
          searchTags={searchTags}
          tagSuggestions={tagSuggestions}
          followUpOnly={followUpOnly}
          queueSortMode={queueSortMode}
          queueOwnerFilter={queueOwnerFilter}
          queueDensity={queueDensity}
          savedViews={savedViews}
          activeSavedViewId={activeSavedViewId}
          currentQueueViewDirty={currentQueueViewDirty}
          visibleFollowUpCount={visibleFollowUpCount}
          totalConversations={unifiedConversationList.length}
          isSyncing={isSyncing}
          isWhatsAppBackgroundSyncing={isWhatsAppBackgroundSyncing}
          syncError={syncError}
          lastSyncAt={lastSyncAt}
          onFilterChange={onFilterChange}
          onChannelFilterChange={onChannelFilterChange}
          onSearchChange={onSearchChange}
          onSearchTagsChange={onSearchTagsChange}
          onToggleFollowUpOnly={onToggleFollowUpOnly}
          onClearFollowUpOnly={onClearFollowUpOnly}
          onQueueSortModeChange={onQueueSortModeChange}
          onQueueOwnerFilterChange={onQueueOwnerFilterChange}
          onQueueDensityChange={onQueueDensityChange}
          onApplySavedView={onApplySavedView}
          onSaveSavedView={onSaveSavedView}
          onDeleteSavedView={onDeleteSavedView}
          onSetDefaultSavedView={onSetDefaultSavedView}
          onResetQueueView={onResetQueueView}
          onSync={onSync}
          onComposeEmail={onComposeEmail}
          onStartWhatsApp={onStartWhatsApp}
        />
      </InboxSidebarSection>

      <InboxSidebarSection
        eyebrow={isZh ? '队列' : 'Queue'}
        title={isZh ? '统一会话队列' : 'Unified conversation queue'}
        description={
          isZh
            ? '从这里进入每一条跨渠道会话，并直接执行筛选、分配和批量处理。'
            : 'Enter any cross-channel thread here and move directly into assignment or bulk action work.'
        }
        className="min-h-0 flex-1"
        bodyClassName="min-h-0 flex flex-col"
      >
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] pb-48 scrollbar-thin">
          {totalVisibleCount > 0 && (
            <InboxQueueHeader
              language={language}
              filter={filter}
              channelFilter={channelFilter}
              search={search}
              searchTags={searchTags}
              followUpOnly={followUpOnly}
              queueSortMode={queueSortMode}
              queueOwnerFilter={queueOwnerFilter}
              activeSavedViewId={activeSavedViewId}
              currentQueueViewDirty={currentQueueViewDirty}
              savedViews={savedViews}
              totalVisibleCount={totalVisibleCount}
              selectedCount={selectedCount}
              visibleFollowUpCount={visibleFollowUpCount}
              unreadVisibleCount={unreadVisibleCount}
              assignedVisibleCount={assignedVisibleCount}
              unassignedVisibleCount={unassignedVisibleCount}
              onQueueOwnerFilterChange={onQueueOwnerFilterChange}
              onQueueSortModeChange={onQueueSortModeChange}
              onToggleFollowUpOnly={onToggleFollowUpOnly}
              onClearFollowUpOnly={onClearFollowUpOnly}
              onResetQueueView={onResetQueueView}
            />
          )}

          {selectableVisibleCount > 0 && (
            <InboxBulkActionsPanel
              language={language}
              selectedCount={selectedCount}
              allVisibleSelected={allVisibleSelected}
              someVisibleSelected={someVisibleSelected}
              currentUser={currentUser}
              bulkTagInput={bulkTagInput}
              bulkNoteInput={bulkNoteInput}
              bulkOwnerId={bulkOwnerId}
              bulkStage={bulkStage}
              bulkFollowUpAt={bulkFollowUpAt}
              onToggleSelectAll={onToggleSelectAll}
              onClearSelection={onClearSelection}
              onBulkTagInputChange={onBulkTagInputChange}
              onBulkNoteInputChange={onBulkNoteInputChange}
              onBulkOwnerIdChange={onBulkOwnerIdChange}
              onBulkStageChange={onBulkStageChange}
              onBulkFollowUpAtChange={onBulkFollowUpAtChange}
              onAddTag={onAddTag}
              onAddComment={onAddComment}
              onAssignOwner={onAssignOwner}
              onSetStage={onSetStage}
              onSetFollowUp={onSetFollowUp}
              onMarkImportant={onMarkImportant}
              onDeleteSelected={onDeleteSelected}
            />
          )}

          {totalVisibleCount === 0 && (
            <div className="m-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              {isUnifiedConversationLoading
                ? (isZh ? '正在加载会话...' : 'Loading conversations...')
                : (isZh ? '当前没有匹配的会话。' : 'No conversations found.')}
            </div>
          )}

          {unifiedConversationList.map(conversation => {
            const isEmail = conversation.channel === 'email';
            const isWhatsApp = conversation.channel === 'whatsapp';
            const isLiveChat = conversation.channel === 'live_chat';
            const isTelegram = conversation.channel === 'telegram';
            const isSelected = isEmail
              ? selectedEmailId === conversation.source_id
              : isWhatsApp
                ? selectedWhatsAppPhone
                  === (conversation.metadata?.targetPhone
                    || conversation.contact_address
                    || conversation.source_id)
                : isTelegram
                  ? selectedTelegramConversation?.id === conversation.id
                  : isLiveChat
                    ? selectedLiveChatConversation?.id === conversation.id
                    : false;
            const email = isEmail
              ? emails.find(item => item.id === conversation.source_id)
              : null;
            const whatsappConversation = isWhatsApp
              ? mapUnifiedWhatsAppConversation(conversation)
              : null;
            const client = conversation.client_id
              ? clients.find(c => c.id === conversation.client_id)
              : null;

            return (
              <InboxConversationListItem
                key={`${conversation.channel}_${conversation.source_id}`}
                language={language}
                conversation={conversation}
                email={email}
                clientName={client?.name}
                filter={filter}
                density={queueDensity}
                isSelected={isSelected}
                isChecked={selectedConversationIds.has(conversation.id)}
                currentUser={currentUser}
                whatsappConversation={whatsappConversation}
                onSelect={() => onSelectConversation(conversation)}
                onToggleSelection={event =>
                  onToggleConversationSelection(event, conversation)
                }
                onDeleteWhatsApp={
                  whatsappConversation
                    ? () => onDeleteWhatsAppConversation(whatsappConversation)
                    : undefined
                }
                onOwnerStageChange={updates =>
                  onOwnerStageChange(conversation, updates)
                }
              />
            );
          })}
        </div>
      </InboxSidebarSection>
    </div>
  );
}
