import React from 'react';
import type { Client, EmailMessage } from '../../store';
import { InboxBulkActionsPanel } from './InboxBulkActionsPanel';
import { InboxConversationListItem } from './InboxConversationListItem';
import { InboxSidebarControls } from './InboxSidebarControls';
import {
  InboxChannelFilter,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
  mapUnifiedWhatsAppConversation,
} from './inboxModel';

type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';

export interface InboxConversationSidebarProps {
  language: string;
  filter: InboxMailFilter;
  channelFilter: InboxChannelFilter;
  search: string;
  searchTags: string[];
  tagSuggestions: string[];
  followUpOnly: boolean;
  visibleFollowUpCount: number;
  unifiedConversationList: UnifiedCommunicationConversation[];
  selectableVisibleCount: number;
  totalVisibleCount: number;
  isUnifiedConversationLoading: boolean;
  isSyncing: boolean;
  isWhatsAppBackgroundSyncing: boolean;
  syncError?: string | null;
  lastSyncAt?: string | null;
  selectedEmailId: string | null;
  selectedWhatsAppPhone: string | null;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  selectedConversationIds: Set<string>;
  emails: EmailMessage[];
  clients: Client[];
  currentUser?: { id: string } | null;
  selectedCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  bulkTagInput: string;
  bulkNoteInput: string;
  bulkOwnerId: string;
  bulkStage: string;
  bulkFollowUpAt: string;
  onFilterChange: (filter: InboxMailFilter) => void;
  onChannelFilterChange: (filter: InboxChannelFilter) => void;
  onSearchChange: (value: string) => void;
  onSearchTagsChange: (tags: string[]) => void;
  onToggleFollowUpOnly: () => void;
  onClearFollowUpOnly: () => void;
  onSync: () => void;
  onComposeEmail: () => void;
  onStartWhatsApp: () => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkTagInputChange: (value: string) => void;
  onBulkNoteInputChange: (value: string) => void;
  onBulkOwnerIdChange: (value: string) => void;
  onBulkStageChange: (value: string) => void;
  onBulkFollowUpAtChange: (value: string) => void;
  onAddTag: () => void | Promise<void>;
  onAddComment: () => void | Promise<void>;
  onAssignOwner: () => void | Promise<void>;
  onSetStage: () => void | Promise<void>;
  onSetFollowUp: () => void | Promise<void>;
  onMarkImportant: () => void | Promise<void>;
  onDeleteSelected: () => void;
  onSelectConversation: (conversation: UnifiedCommunicationConversation) => void;
  onToggleConversationSelection: (event: React.MouseEvent, conversation: UnifiedCommunicationConversation) => void;
  onDeleteWhatsAppConversation: (conversation: InboxWhatsAppConversation) => void;
  onOwnerStageChange: (conversation: UnifiedCommunicationConversation, updates: { ownerId?: string | null; stage?: string | null }) => void;
}

export function InboxConversationSidebar({
  language,
  filter,
  channelFilter,
  search,
  searchTags,
  tagSuggestions,
  followUpOnly,
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
  return (
    <>
      <InboxSidebarControls
        language={language}
        filter={filter}
        channelFilter={channelFilter}
        search={search}
        searchTags={searchTags}
        tagSuggestions={tagSuggestions}
        followUpOnly={followUpOnly}
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
        onSync={onSync}
        onComposeEmail={onComposeEmail}
        onStartWhatsApp={onStartWhatsApp}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin pb-48">
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
          <div className="p-8 text-center text-sm text-slate-500 italic">
            {isUnifiedConversationLoading ? 'Loading conversations...' : 'No conversations found.'}
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
              ? selectedWhatsAppPhone === (conversation.metadata?.targetPhone || conversation.contact_address || conversation.source_id)
              : isTelegram
                ? selectedTelegramConversation?.id === conversation.id
                : isLiveChat
                  ? selectedLiveChatConversation?.id === conversation.id
                  : false;
          const email = isEmail ? emails.find(item => item.id === conversation.source_id) : null;
          const whatsappConversation = isWhatsApp ? mapUnifiedWhatsAppConversation(conversation) : null;
          const client = conversation.client_id ? clients.find(c => c.id === conversation.client_id) : null;

          return (
            <InboxConversationListItem
              key={`${conversation.channel}_${conversation.source_id}`}
              language={language}
              conversation={conversation}
              email={email}
              clientName={client?.name}
              filter={filter}
              isSelected={isSelected}
              isChecked={selectedConversationIds.has(conversation.id)}
              currentUser={currentUser}
              whatsappConversation={whatsappConversation}
              onSelect={() => onSelectConversation(conversation)}
              onToggleSelection={(event) => onToggleConversationSelection(event, conversation)}
              onDeleteWhatsApp={whatsappConversation ? () => onDeleteWhatsAppConversation(whatsappConversation) : undefined}
              onOwnerStageChange={(updates) => onOwnerStageChange(conversation, updates)}
            />
          );
        })}
      </div>
    </>
  );
}
