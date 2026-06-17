import type React from 'react';
import type { UserProfile } from '../../authStore';
import type { Client, EmailMessage, LiveChatSession } from '../../store';
import type { ComposeDefaults, ConfirmDialogState, WhatsAppContactOptionView } from './InboxContentPanelTypes';
import type { InboxMailFilter } from './InboxConversationSidebarTypes';
import type {
  InboxChannelFilter,
  InboxQueueDensity,
  InboxQueueOwnerFilter,
  InboxQueueSortMode,
  InboxSavedView,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
} from './inboxModel';
import type { useInboxPageShellAssembly } from './useInboxPageShellAssembly';
import type {
  ActiveConversationStateSlice,
  CommentsStateSlice,
  FollowUpStateSlice,
  SelectedEmailStateSlice,
  TranslationStateSlice,
} from './useInboxConversationSlices';

export type { InboxMailFilter } from './InboxConversationSidebarTypes';

export interface UseInboxPageShellInputsOptions {
  language: 'en' | 'zh';
  currentUser?: UserProfile | null;
  clients: Client[];
  emails: EmailMessage[];
  filter: InboxMailFilter;
  channelFilter: InboxChannelFilter;
  search: string;
  searchTags: string[];
  followUpOnly: boolean;
  queueSortMode: InboxQueueSortMode;
  queueOwnerFilter: InboxQueueOwnerFilter;
  queueDensity: InboxQueueDensity;
  savedViews: InboxSavedView[];
  activeSavedViewId: string | null;
  currentQueueViewDirty: boolean;
  visibleFollowUpCount: number;
  queueConversationList: UnifiedCommunicationConversation[];
  selectableVisibleCount: number;
  totalVisibleCount: number;
  isUnifiedConversationLoading: boolean;
  isSyncing: boolean;
  isWhatsAppBackgroundSyncing: boolean;
  syncError?: string | null;
  lastSyncAt?: string | null;
  selectedEmailId: string | null;
  selectedWhatsAppPhone: string | null;
  selectedWhatsAppClientId: string | null;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  selectedConversationIds: Set<string>;
  selectedCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  isComposing: boolean;
  setIsComposing: React.Dispatch<React.SetStateAction<boolean>>;
  composeDefaults: ComposeDefaults | null;
  setComposeDefaults: React.Dispatch<React.SetStateAction<ComposeDefaults | null>>;
  isStartingWhatsApp: boolean;
  setIsStartingWhatsApp: React.Dispatch<React.SetStateAction<boolean>>;
  newWhatsAppPhone: string;
  visibleWhatsAppContactOptions: WhatsAppContactOptionView[];
  setNewWhatsAppPhone: React.Dispatch<React.SetStateAction<string>>;
  setShowWhatsAppContactPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedWhatsAppPhone: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedWhatsAppClientId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTelegramConversation: React.Dispatch<React.SetStateAction<UnifiedCommunicationConversation | null>>;
  setTelegramMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedLiveChatConversation: React.Dispatch<React.SetStateAction<UnifiedCommunicationConversation | null>>;
  setIsCreatingLead: React.Dispatch<React.SetStateAction<boolean>>;
  isCreatingLead: boolean;
  setIsAddingContactToClient: React.Dispatch<React.SetStateAction<boolean>>;
  isAddingContactToClient: boolean;
  commentText: string;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  commentAttachments: File[];
  setCommentAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  showCommentAttachmentModal: boolean;
  setShowCommentAttachmentModal: React.Dispatch<React.SetStateAction<boolean>>;
  bulkTagInput: string;
  setBulkTagInput: React.Dispatch<React.SetStateAction<string>>;
  bulkNoteInput: string;
  setBulkNoteInput: React.Dispatch<React.SetStateAction<string>>;
  bulkOwnerId: string;
  setBulkOwnerId: React.Dispatch<React.SetStateAction<string>>;
  bulkStage: string;
  setBulkStage: React.Dispatch<React.SetStateAction<string>>;
  bulkFollowUpAt: string;
  setBulkFollowUpAt: React.Dispatch<React.SetStateAction<string>>;
  confirmDialog: ConfirmDialogState | null;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState | null>>;
  alertDialog: string | null;
  setAlertDialog: React.Dispatch<React.SetStateAction<string | null>>;
  tagModalEmail: string | null;
  setTagModalEmail: React.Dispatch<React.SetStateAction<string | null>>;
  tagInput: string;
  setTagInput: React.Dispatch<React.SetStateAction<string>>;
  todoModalEmail: string | null;
  setTodoModalEmail: React.Dispatch<React.SetStateAction<string | null>>;
  todoAt: string;
  setTodoAt: React.Dispatch<React.SetStateAction<string>>;
  todoNote: string;
  setTodoNote: React.Dispatch<React.SetStateAction<string>>;
  telegramMessages: any[];
  isTelegramMessagesLoading: boolean;
  telegramReply: string;
  isSendingTelegramReply: boolean;
  setTelegramReply: React.Dispatch<React.SetStateAction<string>>;
  toggleTelegramHumanTakeover: () => void | Promise<void>;
  draftTelegramReply: () => void | Promise<void>;
  sendTelegramReply: () => void | Promise<void>;
  liveChatReply: string;
  isSendingLiveChatReply: boolean;
  isRunningLiveChatAgent: boolean;
  liveChatEndRef: React.RefObject<HTMLDivElement | null>;
  setLiveChatReply: React.Dispatch<React.SetStateAction<string>>;
  toggleLiveChatHumanTakeover: () => void | Promise<void>;
  runSelectedLiveChatAgent: () => void | Promise<void>;
  sendLiveChatReply: () => void | Promise<void>;
  selectedEmailState: SelectedEmailStateSlice;
  activeConversationState: ActiveConversationStateSlice;
  commentsState: CommentsStateSlice;
  followUpState: FollowUpStateSlice;
  translationState: TranslationStateSlice;
  addingToRag: boolean;
  addedToRagId: string | null;
  handleAddToRag: () => void | Promise<void>;
  submitTag: () => void | Promise<void>;
  submitTodo: () => void | Promise<void>;
  editEmail: (id: string, updates: Partial<EmailMessage>) => void;
  handleSync: () => void | Promise<void>;
  loadWhatsAppConversations: () => void | Promise<void>;
  applySavedView: (view: InboxSavedView) => void;
  saveCurrentQueueView: (name?: string) => void;
  deleteSavedQueueView: (viewId: string) => void;
  setDefaultSavedQueueView: (viewId: string) => void;
  resetQueueView: () => void;
  handleFilterChange: (filter: InboxMailFilter) => void;
  handleChannelFilterChange: (filter: InboxChannelFilter) => void;
  handleToggleFollowUpOnly: () => void;
  handleClearFollowUpOnly: () => void;
  handleComposeEmail: () => void;
  handleStartWhatsApp: () => void;
  handleBulkAddTag: () => void | Promise<void>;
  handleBulkAddComment: () => void | Promise<void>;
  handleBulkAssignOwner: () => void | Promise<void>;
  handleBulkSetStage: () => void | Promise<void>;
  handleBulkSetFollowUp: () => void | Promise<void>;
  handleBulkMarkImportant: () => void | Promise<void>;
  handleDeleteSelected: () => void;
  handleSelectUnifiedConversation: (conversation: UnifiedCommunicationConversation) => void;
  toggleUnifiedSelection: (event: React.MouseEvent, conversation: UnifiedCommunicationConversation) => void;
  handleDeleteWhatsAppConversation: (conversation: InboxWhatsAppConversation) => void | Promise<void>;
  selectWhatsAppContactOption: (option: WhatsAppContactOptionView) => void;
  startNewWhatsApp: () => void | Promise<void>;
  handleCreateLead: () => void;
  selectEmail: (id: string | null) => void;
  toggleSelectAll: () => void;
  clearBulkSelection: () => void;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setSearchTags: React.Dispatch<React.SetStateAction<string[]>>;
  setQueueSortMode: React.Dispatch<React.SetStateAction<InboxQueueSortMode>>;
  setQueueOwnerFilter: React.Dispatch<React.SetStateAction<InboxQueueOwnerFilter>>;
  setQueueDensity: React.Dispatch<React.SetStateAction<InboxQueueDensity>>;
  updateConversationOwnerStage: (conversation: UnifiedCommunicationConversation, updates: { ownerId?: string | null; stage?: string | null }) => void | Promise<void>;
  patchUnifiedConversation: (conversation: UnifiedCommunicationConversation, updates: Record<string, any>) => Promise<UnifiedCommunicationConversation>;
  deleteUnifiedConversation: (conversation: UnifiedCommunicationConversation) => Promise<void>;
  applyUnifiedConversationUpdate: (conversation: UnifiedCommunicationConversation, updates: Partial<UnifiedCommunicationConversation>) => void;
  refreshUnifiedConversationData: () => void | Promise<void>;
  setConversationAutoTranslateEnabled: (channel: 'live_chat' | 'telegram', conversationKey: string, enabled: boolean) => void;
  appendActiveConversationComment: (content: string, attachments?: any[]) => void | Promise<void>;
  updateActiveConversationFollowUp: (dueAt: string | null, note: string | null, status: 'open' | 'canceled' | 'completed') => void | Promise<void>;
  replyActiveConversationComment: (commentId: string, content: string, attachments?: any[]) => void | Promise<void>;
  updateLiveChatSession: (sessionId: string, updates: Partial<LiveChatSession>) => Promise<any> | void;
  fetchLiveChatSessions: () => Promise<any> | void;
  selectClient: (clientId: string) => void;
}

export type InboxPageShellAssemblyInputs = Parameters<typeof useInboxPageShellAssembly>[0];
