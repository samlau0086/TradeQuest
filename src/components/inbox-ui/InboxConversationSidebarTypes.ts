import type React from 'react';
import type { Client, EmailMessage } from '../../store';
import type {
  InboxChannelFilter,
  InboxQueueDensity,
  InboxQueueOwnerFilter,
  InboxQueueSortMode,
  InboxSavedView,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
} from './inboxModel';

export type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';

export interface InboxConversationSidebarProps {
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
  onToggleConversationSelection: (
    event: React.MouseEvent,
    conversation: UnifiedCommunicationConversation,
  ) => void;
  onDeleteWhatsAppConversation: (
    conversation: InboxWhatsAppConversation,
  ) => void;
  onOwnerStageChange: (
    conversation: UnifiedCommunicationConversation,
    updates: { ownerId?: string | null; stage?: string | null },
  ) => void;
}
