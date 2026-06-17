import { useState } from 'react';
import type { ComposeDefaults } from './InboxContentPanelTypes';
import type {
  InboxChannelFilter,
  InboxQueueDensity,
  InboxQueueOwnerFilter,
  InboxQueueSortMode,
  UnifiedCommunicationConversation,
} from './inboxModel';

type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';
type EmailListMode = 'list' | 'conversation';

export function useInboxUiState() {
  const [filter, setFilter] = useState<InboxMailFilter>('inbox');
  const [channelFilter, setChannelFilter] = useState<InboxChannelFilter>('all');
  const [emailListMode, setEmailListMode] = useState<EmailListMode>('list');
  const [search, setSearch] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [queueSortMode, setQueueSortMode] = useState<InboxQueueSortMode>('recent');
  const [queueOwnerFilter, setQueueOwnerFilter] = useState<InboxQueueOwnerFilter>('all');
  const [queueDensity, setQueueDensity] = useState<InboxQueueDensity>('comfortable');
  const [isComposing, setIsComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<ComposeDefaults | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [showCommentAttachmentModal, setShowCommentAttachmentModal] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isAddingContactToClient, setIsAddingContactToClient] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkNoteInput, setBulkNoteInput] = useState('');
  const [bulkFollowUpAt, setBulkFollowUpAt] = useState('');
  const [bulkOwnerId, setBulkOwnerId] = useState('');
  const [bulkStage, setBulkStage] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [todoModalEmail, setTodoModalEmail] = useState<string | null>(null);
  const [todoAt, setTodoAt] = useState('');
  const [todoNote, setTodoNote] = useState('');
  const [tagModalEmail, setTagModalEmail] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [unifiedConversations, setUnifiedConversations] = useState<UnifiedCommunicationConversation[]>([]);
  const [selectedWhatsAppPhone, setSelectedWhatsAppPhone] = useState<string | null>(null);
  const [selectedWhatsAppClientId, setSelectedWhatsAppClientId] = useState<string | null>(null);
  const [selectedTelegramConversation, setSelectedTelegramConversation] = useState<UnifiedCommunicationConversation | null>(null);
  const [telegramMessages, setTelegramMessages] = useState<any[]>([]);
  const [selectedLiveChatConversation, setSelectedLiveChatConversation] = useState<UnifiedCommunicationConversation | null>(null);
  const [isStartingWhatsApp, setIsStartingWhatsApp] = useState(false);
  const [newWhatsAppPhone, setNewWhatsAppPhone] = useState('');
  const [showWhatsAppContactPicker, setShowWhatsAppContactPicker] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [alertDialog, setAlertDialog] = useState<string | null>(null);

  return {
    filter,
    setFilter,
    channelFilter,
    setChannelFilter,
    emailListMode,
    setEmailListMode,
    search,
    setSearch,
    searchTags,
    setSearchTags,
    followUpOnly,
    setFollowUpOnly,
    queueSortMode,
    setQueueSortMode,
    queueOwnerFilter,
    setQueueOwnerFilter,
    queueDensity,
    setQueueDensity,
    isComposing,
    setIsComposing,
    composeDefaults,
    setComposeDefaults,
    commentText,
    setCommentText,
    commentAttachments,
    setCommentAttachments,
    showCommentAttachmentModal,
    setShowCommentAttachmentModal,
    isCreatingLead,
    setIsCreatingLead,
    isAddingContactToClient,
    setIsAddingContactToClient,
    bulkTagInput,
    setBulkTagInput,
    bulkNoteInput,
    setBulkNoteInput,
    bulkFollowUpAt,
    setBulkFollowUpAt,
    bulkOwnerId,
    setBulkOwnerId,
    bulkStage,
    setBulkStage,
    activeMenu,
    setActiveMenu,
    todoModalEmail,
    setTodoModalEmail,
    todoAt,
    setTodoAt,
    todoNote,
    setTodoNote,
    tagModalEmail,
    setTagModalEmail,
    tagInput,
    setTagInput,
    unifiedConversations,
    setUnifiedConversations,
    selectedWhatsAppPhone,
    setSelectedWhatsAppPhone,
    selectedWhatsAppClientId,
    setSelectedWhatsAppClientId,
    selectedTelegramConversation,
    setSelectedTelegramConversation,
    telegramMessages,
    setTelegramMessages,
    selectedLiveChatConversation,
    setSelectedLiveChatConversation,
    isStartingWhatsApp,
    setIsStartingWhatsApp,
    newWhatsAppPhone,
    setNewWhatsAppPhone,
    showWhatsAppContactPicker,
    setShowWhatsAppContactPicker,
    confirmDialog,
    setConfirmDialog,
    alertDialog,
    setAlertDialog,
  };
}
