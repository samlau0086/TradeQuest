import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { type WhatsAppConversation } from './whatsappMessageModel';

export const WHATSAPP_FOLLOW_UP_MARKER = '__FOLLOW_UP__';

interface UseWhatsAppConversationMetaOptions {
  conversation: WhatsAppConversation | null;
  setConversation: Dispatch<SetStateAction<WhatsAppConversation | null>>;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useWhatsAppConversationMeta({
  conversation,
  setConversation,
  notify,
}: UseWhatsAppConversationMetaOptions) {
  const [tagInput, setTagInput] = useState('');
  const [commentInput, setCommentInput] = useState('');

  const visibleConversationComments = useMemo(() => (
    (conversation?.comments || []).filter(comment => !String(comment.content || '').startsWith(WHATSAPP_FOLLOW_UP_MARKER))
  ), [conversation?.comments]);

  const whatsappFollowUp = useMemo(() => {
    const marker = [...(conversation?.comments || [])].reverse().find(comment => String(comment.content || '').startsWith(WHATSAPP_FOLLOW_UP_MARKER));
    if (!marker) return null;
    try {
      const parsed = JSON.parse(String(marker.content).slice(WHATSAPP_FOLLOW_UP_MARKER.length));
      return parsed?.status === 'open' ? { dueAt: parsed.dueAt as string, note: parsed.note as string } : null;
    } catch {
      return null;
    }
  }, [conversation?.comments]);

  const resetConversationMetaInputs = useCallback(() => {
    setTagInput('');
    setCommentInput('');
  }, []);

  const updateConversationTags = async (nextTags: string[]) => {
    if (!conversation?.id) return;
    const unifiedId = conversation.unifiedId;
    const response = await fetch(unifiedId ? `/api/conversations/${unifiedId}` : `/api/whatsapp-hub/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ tags: nextTags })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to update WhatsApp tags');
    setConversation(prev => prev ? { ...prev, tags: nextTags } : prev);
  };

  const addTag = async () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (!tag || !conversation) return;
    const nextTags = Array.from(new Set([...(conversation.tags || []), tag]));
    try {
      await updateConversationTags(nextTags);
      setTagInput('');
    } catch (error: any) {
      notify(error.message || 'Failed to update WhatsApp tags.', 'error');
    }
  };

  const removeTag = async (tag: string) => {
    if (!conversation) return;
    try {
      await updateConversationTags((conversation.tags || []).filter(item => item !== tag));
    } catch (error: any) {
      notify(error.message || 'Failed to update WhatsApp tags.', 'error');
    }
  };

  const addConversationComment = async (content = commentInput) => {
    if (!conversation?.id || !content.trim()) return;
    try {
      const comment = { id: `uc_${Date.now()}_${Math.floor(Math.random() * 1000)}`, author: 'User', content: content.trim(), createdAt: new Date().toISOString(), replies: [] };
      if (conversation.unifiedId) {
        const nextComments = [...(conversation.comments || []), comment];
        const response = await fetch(`/api/conversations/${conversation.unifiedId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ comments: nextComments })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to add WhatsApp comment');
        setConversation(prev => prev ? { ...prev, comments: data.conversation?.comments || nextComments } : prev);
        if (content === commentInput) setCommentInput('');
        return;
      }
      const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add WhatsApp comment');
      setConversation(prev => prev ? { ...prev, comments: data.comments || [...(prev.comments || []), data.comment] } : prev);
      if (content === commentInput) setCommentInput('');
    } catch (error: any) {
      notify(error.message || 'Failed to add WhatsApp comment.', 'error');
    }
  };

  const deleteConversationComment = async (commentId: string) => {
    if (!conversation?.id) return;
    try {
      if (conversation.unifiedId) {
        const nextComments = (conversation.comments || []).filter(comment => comment.id !== commentId);
        const response = await fetch(`/api/conversations/${conversation.unifiedId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ comments: nextComments })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to delete WhatsApp comment');
        setConversation(prev => prev ? { ...prev, comments: data.conversation?.comments || nextComments } : prev);
        return;
      }
      const response = await fetch(`/api/whatsapp-hub/conversations/${conversation.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete WhatsApp comment');
      setConversation(prev => prev ? { ...prev, comments: data.comments || (prev.comments || []).filter(comment => comment.id !== commentId) } : prev);
    } catch (error: any) {
      notify(error.message || 'Failed to delete WhatsApp comment.', 'error');
    }
  };

  return {
    tagInput,
    setTagInput,
    commentInput,
    setCommentInput,
    visibleConversationComments,
    whatsappFollowUp,
    resetConversationMetaInputs,
    addTag,
    removeTag,
    addConversationComment,
    deleteConversationComment,
  };
}
