import type React from 'react';
import type { Attachment, Comment } from '../../store';
import { ClientTeamCommentsPanel } from './ClientTeamCommentsPanel';

interface ClientDetailsCommentsSectionProps {
  comments: Comment[];
  commentText: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onCommentTextChange: (value: string) => void;
  onSubmitComment: () => void;
  onReply: (commentId: string, content: string, attachments?: Attachment[]) => void;
  onDelete: (commentId: string) => void;
}

export function ClientDetailsCommentsSection({
  comments,
  commentText,
  fileInputRef,
  onCommentTextChange,
  onSubmitComment,
  onReply,
  onDelete,
}: ClientDetailsCommentsSectionProps) {
  return (
    <div id="client-team-comments">
      <ClientTeamCommentsPanel
        comments={comments}
        commentText={commentText}
        fileInputRef={fileInputRef}
        onCommentTextChange={onCommentTextChange}
        onSubmitComment={onSubmitComment}
        onReply={onReply}
        onDelete={onDelete}
      />
    </div>
  );
}
