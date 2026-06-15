import { Dispatch, SetStateAction } from 'react';
import { InboxWhatsAppConversation, UnifiedCommunicationConversation } from './inboxModel';

interface UseUnifiedConversationActionsArgs {
  language: string;
  unifiedConversationSource: UnifiedCommunicationConversation[];
  setUnifiedConversations: Dispatch<SetStateAction<UnifiedCommunicationConversation[]>>;
  fetchUnifiedConversations: () => Promise<UnifiedCommunicationConversation[]>;
  fetchEmails: () => Promise<any>;
  fetchLiveChatSessions: () => Promise<any>;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useUnifiedConversationActions({
  language,
  unifiedConversationSource,
  setUnifiedConversations,
  fetchUnifiedConversations,
  fetchEmails,
  fetchLiveChatSessions,
  notify,
}: UseUnifiedConversationActionsArgs) {
  const addWhatsAppConversationComment = async (conversation: InboxWhatsAppConversation, content: string) => {
    const res = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to add WhatsApp comment.');
    return data.comments || [...(conversation.comments || []), data.comment].filter(Boolean);
  };

  const patchUnifiedConversation = async (conversation: UnifiedCommunicationConversation, updates: any) => {
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update conversation.');
    return data.conversation || { ...conversation, ...updates };
  };

  const deleteUnifiedConversation = async (conversation: UnifiedCommunicationConversation) => {
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to delete conversation.');
    return data.conversation || { ...conversation, deleted_at: new Date().toISOString() };
  };

  const applyUnifiedConversationUpdate = (conversation: UnifiedCommunicationConversation, updates: Partial<UnifiedCommunicationConversation>) => {
    setUnifiedConversations(prev => {
      const exists = prev.some(item => item.id === conversation.id);
      return exists
        ? prev.map(item => item.id === conversation.id ? { ...item, ...updates } : item)
        : [{ ...conversation, ...updates }, ...prev];
    });
  };

  const updateConversationOwnerStage = async (
    conversation: UnifiedCommunicationConversation,
    updates: { ownerId?: string | null; stage?: string | null }
  ) => {
    const patched = await patchUnifiedConversation(conversation, updates);
    applyUnifiedConversationUpdate(conversation, {
      owner_id: patched.owner_id,
      stage: patched.stage,
    });
    notify(language === 'zh' ? '会话状态已更新。' : 'Conversation status updated.', 'success');
  };

  const findEmailUnifiedConversation = (emailId: string) => (
    unifiedConversationSource.find(conversation => conversation.channel === 'email' && conversation.source_id === emailId)
  );

  const refreshUnifiedConversationData = async () => {
    await fetchUnifiedConversations();
    void fetchEmails();
    void fetchLiveChatSessions();
  };

  return {
    addWhatsAppConversationComment,
    patchUnifiedConversation,
    deleteUnifiedConversation,
    applyUnifiedConversationUpdate,
    updateConversationOwnerStage,
    findEmailUnifiedConversation,
    refreshUnifiedConversationData,
  };
}
