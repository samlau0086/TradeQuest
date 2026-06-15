import { Client } from '../../store';
import { InboxWhatsAppConversation, UnifiedCommunicationConversation } from './inboxModel';

interface UseInboxBulkActionsArgs {
  language: string;
  selectedCount: number;
  selectedUnifiedConversations: UnifiedCommunicationConversation[];
  selectedIds: Set<string>;
  selectedWhatsAppIds: Set<string>;
  selectedEmailId: string | null;
  activeWhatsAppConversation: InboxWhatsAppConversation | null;
  whatsappConversations: InboxWhatsAppConversation[];
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
  clearBulkSelection: () => void;
  editClient: (id: string, updates: Partial<Client>) => void;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  patchUnifiedConversation: (conversation: UnifiedCommunicationConversation, updates: any) => Promise<any>;
  deleteUnifiedConversation: (conversation: UnifiedCommunicationConversation) => Promise<any>;
  applyUnifiedConversationUpdate: (conversation: UnifiedCommunicationConversation, updates: Partial<UnifiedCommunicationConversation>) => void;
  refreshUnifiedConversationData: () => Promise<void>;
  updateWhatsAppConversationState: (conversations: InboxWhatsAppConversation[]) => void;
}

export function useInboxBulkActions({
  language,
  selectedCount,
  selectedUnifiedConversations,
  selectedIds,
  selectedWhatsAppIds,
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
  clearBulkSelection,
  editClient,
  notify,
  patchUnifiedConversation,
  deleteUnifiedConversation,
  applyUnifiedConversationUpdate,
  refreshUnifiedConversationData,
  updateWhatsAppConversationState,
}: UseInboxBulkActionsArgs) {
  const handleDeleteSelected = () => {
    if (selectedCount === 0) return;
    setConfirmDialog({
      message: `Are you sure you want to delete/archive ${selectedCount} selected conversation(s)? Emails associated with a client will be soft-deleted pending admin review; Live Chat sessions will be closed.`,
      onConfirm: async () => {
        for (const conversation of selectedUnifiedConversations) await deleteUnifiedConversation(conversation);
        updateWhatsAppConversationState(whatsappConversations.filter(conversation => !selectedWhatsAppIds.has(conversation.id)));
        clearBulkSelection();
        if (selectedEmailId && selectedIds.has(selectedEmailId)) selectEmail(null);
        if (activeWhatsAppConversation && selectedWhatsAppIds.has(activeWhatsAppConversation.id)) setSelectedWhatsAppPhone(null);
        await refreshUnifiedConversationData();
        setConfirmDialog(null);
        notify('Selected conversations updated.', 'success');
      },
    });
  };

  const handleBulkAddTag = async () => {
    const tag = bulkTagInput.trim().replace(/^#/, '');
    if (!tag || selectedCount === 0) return;
    const normalizedTag = `#${tag}`;
    for (const conversation of selectedUnifiedConversations) {
      const tagToApply = conversation.channel === 'email' ? normalizedTag : tag;
      const tags = Array.from(new Set([...(conversation.tags || []), tagToApply]));
      if ((conversation.channel === 'live_chat' || conversation.channel === 'telegram') && conversation.client_id) {
        const client = clients.find(item => item.id === conversation.client_id);
        if (client) {
          editClient(client.id, {
            tags: Array.from(new Set([...(client.tags || []), tagToApply])),
          });
        }
      }
      await patchUnifiedConversation(conversation, { tags });
    }
    await refreshUnifiedConversationData();
    setBulkTagInput('');
    notify('Tag added to selected items.', 'success');
  };

  const handleBulkMarkImportant = async () => {
    if (selectedCount === 0) return;
    for (const conversation of selectedUnifiedConversations) {
      await patchUnifiedConversation(conversation, { isImportant: true });
    }
    await refreshUnifiedConversationData();
    notify('Selected items marked important.', 'success');
  };

  const handleBulkAddComment = async () => {
    const content = bulkNoteInput.trim();
    if (!content || selectedCount === 0) return;
    for (const conversation of selectedUnifiedConversations) {
      const comment = {
        id: `uc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        author: 'User',
        content,
        createdAt: new Date().toISOString(),
        replies: [],
      };
      if ((conversation.channel === 'live_chat' || conversation.channel === 'telegram') && conversation.client_id) {
        const client = clients.find(item => item.id === conversation.client_id);
        if (client) {
          editClient(client.id, {
            comments: [...(client.comments || []), {
              ...comment,
              content: `[${conversation.channel === 'telegram' ? 'Telegram' : 'Live Chat'}] ${content}`,
            }],
          });
          continue;
        }
      }
      const comments = [...(conversation.comments || []), comment];
      await patchUnifiedConversation(conversation, { comments });
    }
    await refreshUnifiedConversationData();
    setBulkNoteInput('');
    notify('Internal comment added to selected items.', 'success');
  };

  const handleBulkSetFollowUp = async () => {
    if (!bulkFollowUpAt || selectedCount === 0) return;
    const dueAt = new Date(bulkFollowUpAt).toISOString();
    for (const conversation of selectedUnifiedConversations) {
      const note = bulkNoteInput.trim() || `Follow up: ${conversation.title || conversation.subject || conversation.contact_address || conversation.source_id}`;
      await patchUnifiedConversation(conversation, { todoAt: dueAt, todoNote: note });
    }
    await refreshUnifiedConversationData();
    setBulkFollowUpAt('');
    notify('Follow-up reminder set for selected items.', 'success');
  };

  const handleBulkAssignOwner = async () => {
    if (selectedCount === 0) return;
    const ownerId = bulkOwnerId || null;
    for (const conversation of selectedUnifiedConversations) {
      await patchUnifiedConversation(conversation, { ownerId });
      applyUnifiedConversationUpdate(conversation, { owner_id: ownerId || undefined });
    }
    setBulkOwnerId('');
    await refreshUnifiedConversationData();
    notify(language === 'zh' ? '负责人已批量更新。' : 'Owner updated for selected conversations.', 'success');
  };

  const handleBulkSetStage = async () => {
    if (selectedCount === 0 || !bulkStage) return;
    for (const conversation of selectedUnifiedConversations) {
      await patchUnifiedConversation(conversation, { stage: bulkStage });
      applyUnifiedConversationUpdate(conversation, { stage: bulkStage });
    }
    setBulkStage('');
    await refreshUnifiedConversationData();
    notify(language === 'zh' ? '阶段已批量更新。' : 'Stage updated for selected conversations.', 'success');
  };

  return {
    handleDeleteSelected,
    handleBulkAddTag,
    handleBulkMarkImportant,
    handleBulkAddComment,
    handleBulkSetFollowUp,
    handleBulkAssignOwner,
    handleBulkSetStage,
  };
}
