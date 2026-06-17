import type { Client, EmailMessage } from '../../store';
import type {
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
} from './inboxModel';
import { useInboxBulkActions } from './useInboxBulkActions';
import { useInboxSelection } from './useInboxSelection';

interface UseInboxQueueWorkspaceArgs {
  unifiedConversationList: UnifiedCommunicationConversation[];
  emails: EmailMessage[];
  whatsappConversations: InboxWhatsAppConversation[];
  unifiedConversations: UnifiedCommunicationConversation[];
  language: string;
  selectedEmailId: string | null;
  activeWhatsAppConversation: InboxWhatsAppConversation | null;
  clients: Client[];
  bulkTagInput: string;
  bulkNoteInput: string;
  bulkFollowUpAt: string;
  bulkOwnerId: string;
  bulkStage: string;
  setBulkTagInput: (value: string) => void;
  setBulkNoteInput: (value: string) => void;
  setBulkFollowUpAt: (value: string) => void;
  setBulkOwnerId: (value: string) => void;
  setBulkStage: (value: string) => void;
  setConfirmDialog: (dialog: any) => void;
  setSelectedWhatsAppPhone: (phone: string | null) => void;
  selectEmail: (id: string | null) => void;
  editClient: (id: string, updates: Partial<Client>) => void;
  notify: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
  ) => void;
  patchUnifiedConversation: (
    conversation: UnifiedCommunicationConversation,
    updates: any,
  ) => Promise<any>;
  deleteUnifiedConversation: (
    conversation: UnifiedCommunicationConversation,
  ) => Promise<any>;
  applyUnifiedConversationUpdate: (
    conversation: UnifiedCommunicationConversation,
    updates: Partial<UnifiedCommunicationConversation>,
  ) => void;
  refreshUnifiedConversationData: () => Promise<void>;
  updateWhatsAppConversationState: (
    conversations: InboxWhatsAppConversation[],
  ) => void;
}

export function useInboxQueueWorkspace({
  unifiedConversationList,
  emails,
  whatsappConversations,
  unifiedConversations,
  language,
  selectedEmailId,
  activeWhatsAppConversation,
  clients,
  bulkTagInput,
  bulkNoteInput,
  bulkFollowUpAt,
  bulkOwnerId,
  bulkStage,
  setBulkTagInput,
  setBulkNoteInput,
  setBulkFollowUpAt,
  setBulkOwnerId,
  setBulkStage,
  setConfirmDialog,
  setSelectedWhatsAppPhone,
  selectEmail,
  editClient,
  notify,
  patchUnifiedConversation,
  deleteUnifiedConversation,
  applyUnifiedConversationUpdate,
  refreshUnifiedConversationData,
  updateWhatsAppConversationState,
}: UseInboxQueueWorkspaceArgs) {
  const selection = useInboxSelection({
    unifiedConversationList,
    emails,
    whatsappConversations,
    unifiedConversations,
  });

  const bulkActions = useInboxBulkActions({
    language,
    selectedCount: selection.selectedCount,
    selectedUnifiedConversations: selection.selectedUnifiedConversations,
    selectedIds: selection.selectedIds,
    selectedWhatsAppIds: selection.selectedWhatsAppIds,
    selectedEmailId,
    activeWhatsAppConversation,
    whatsappConversations,
    clients,
    bulkTagInput,
    bulkNoteInput,
    bulkFollowUpAt,
    bulkOwnerId,
    bulkStage,
    setBulkTagInput,
    setBulkNoteInput,
    setBulkFollowUpAt,
    setBulkOwnerId,
    setBulkStage,
    setConfirmDialog,
    setSelectedWhatsAppPhone,
    selectEmail,
    clearBulkSelection: selection.clearBulkSelection,
    editClient,
    notify,
    patchUnifiedConversation,
    deleteUnifiedConversation,
    applyUnifiedConversationUpdate,
    refreshUnifiedConversationData,
    updateWhatsAppConversationState,
  });

  return {
    ...selection,
    ...bulkActions,
  };
}
