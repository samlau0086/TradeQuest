import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../authStore';
import { Attachment, Client, Comment, Deal, useStore } from '../../store';

interface UseClientCommentsArgs {
  client?: Client | null;
  leadRecord?: Deal | null;
}

const markCommentPendingDelete = (comments: Comment[], commentId: string): Comment[] => comments.map(comment => {
  if (comment.id === commentId) {
    return { ...comment, pendingDelete: true, pendingDeleteRequestedAt: new Date().toISOString() };
  }
  return comment.replies?.length
    ? { ...comment, replies: markCommentPendingDelete(comment.replies, commentId) }
    : comment;
});

const collectPendingDeleteCommentIds = (comments: Comment[]): string[] => {
  const ids: string[] = [];
  const walk = (items: Comment[]) => {
    items.forEach(comment => {
      if (comment.pendingDelete) ids.push(comment.id);
      if (comment.replies?.length) walk(comment.replies);
    });
  };
  walk(comments);
  return ids;
};

export function useClientComments({ client, leadRecord }: UseClientCommentsArgs) {
  const { updateDeal, editClient, addComment, addReply, notify } = useStore();
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reconciledPendingCommentDeletesRef = useRef<Set<string>>(new Set());
  const comments = leadRecord ? (leadRecord.comments || []) : (client?.comments || []);

  const submitCommentDeleteApprovalRequest = async (commentId: string) => {
    if (!client) throw new Error('Client is required.');
    const token = useAuthStore.getState().token || localStorage.getItem('token');
    if (!token) throw new Error('Authentication is required.');
    const payload = leadRecord
      ? { action: 'delete_deal_comment', deal_id: leadRecord.id, comment_id: commentId, lead_name: leadRecord.name }
      : { action: 'delete_client_comment', comment_id: commentId };
    const response = await fetch(`/api/clients/${client.id}/edit-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to create approval request.');
    return data;
  };

  useEffect(() => {
    if (!client) return;
    const pendingIds = collectPendingDeleteCommentIds(comments);
    pendingIds.forEach(commentId => {
      const key = `${leadRecord ? 'lead' : 'client'}:${leadRecord?.id || client.id}:${commentId}`;
      if (reconciledPendingCommentDeletesRef.current.has(key)) return;
      reconciledPendingCommentDeletesRef.current.add(key);
      submitCommentDeleteApprovalRequest(commentId).catch(error => {
        console.warn('Failed to reconcile pending comment delete request', error);
      });
    });
  }, [client?.id, leadRecord?.id, comments]);

  const handleAddComment = () => {
    if (!client || !commentText.trim()) return;

    const attachments = fileInputRef.current?.files && fileInputRef.current.files.length > 0
      ? Array.from(fileInputRef.current.files).map(f => ({
          id: `file${Date.now()}`,
          name: f.name,
          type: (f.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
          url: URL.createObjectURL(f)
        }))
      : undefined;

    if (leadRecord) {
      const newComment: Comment = {
        id: `cmt${Date.now()}`,
        author: useStore.getState().userTitle,
        content: commentText,
        createdAt: new Date().toISOString(),
        attachments,
        replies: []
      };
      updateDeal(leadRecord.id, { comments: [...(leadRecord.comments || []), newComment] });
    } else {
      addComment(client.id, commentText, attachments);
    }
    setCommentText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddReply = (commentId: string, content: string, attachments?: Attachment[]) => {
    if (!client) return;
    if (!leadRecord) {
      addReply(client.id, commentId, content, attachments);
      return;
    }
    const addReplyRecursive = (items: Comment[]): Comment[] => items.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [
            ...(comment.replies || []),
            {
              id: `rep${Date.now()}`,
              author: useStore.getState().userTitle,
              content,
              createdAt: new Date().toISOString(),
              attachments,
              replies: []
            }
          ]
        };
      }
      return comment.replies?.length
        ? { ...comment, replies: addReplyRecursive(comment.replies) }
        : comment;
    });
    updateDeal(leadRecord.id, { comments: addReplyRecursive(leadRecord.comments || []) });
  };

  const handleRequestCommentDelete = async (commentId: string) => {
    if (!client) return;
    try {
      if (leadRecord) {
        const previousComments = leadRecord.comments || [];
        const nextComments = markCommentPendingDelete(leadRecord.comments || [], commentId);
        updateDeal(leadRecord.id, { comments: nextComments });
        try {
          await submitCommentDeleteApprovalRequest(commentId);
        } catch (error) {
          updateDeal(leadRecord.id, { comments: previousComments });
          throw error;
        }
      } else {
        const previousComments = client.comments || [];
        const nextComments = markCommentPendingDelete(client.comments || [], commentId);
        editClient(client.id, { comments: nextComments });
        try {
          await submitCommentDeleteApprovalRequest(commentId);
        } catch (error) {
          editClient(client.id, { comments: previousComments });
          throw error;
        }
      }
      notify(useStore.getState().language === 'zh' ? '评论删除请求已提交，等待审批。' : 'Comment delete request submitted for approval.', 'success');
    } catch (error) {
      console.error(error);
      notify(useStore.getState().language === 'zh' ? '提交评论删除请求失败。' : 'Failed to request comment deletion.', 'error');
    }
  };

  return {
    comments,
    commentText,
    setCommentText,
    fileInputRef,
    handleAddComment,
    handleAddReply,
    handleRequestCommentDelete,
  };
}
