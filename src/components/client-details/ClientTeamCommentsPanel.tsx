import React from 'react';
import { MessageSquare, Paperclip, Send } from 'lucide-react';
import { Attachment, Comment } from '../../store';
import { CommentItem } from '../CommentItem';
import { EmptyState, SectionHeader } from '../ui';

interface ClientTeamCommentsPanelProps {
  comments: Comment[];
  commentText: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onCommentTextChange: (value: string) => void;
  onSubmitComment: () => void;
  onReply: (commentId: string, content: string, attachments?: Attachment[]) => void;
  onDelete: (commentId: string) => void;
}

export function ClientTeamCommentsPanel({
  comments,
  commentText,
  fileInputRef,
  onCommentTextChange,
  onSubmitComment,
  onReply,
  onDelete,
}: ClientTeamCommentsPanelProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 pb-20 pt-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <SectionHeader icon={<MessageSquare className="w-4 h-4" />} className="mb-4">Team Comments</SectionHeader>

      <div className="space-y-4 mb-6">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} onReply={onReply} onDelete={onDelete} />
        ))}
        {comments.length === 0 && (
          <EmptyState tone="subtle" className="py-4 text-center text-xs italic">No comments yet.</EmptyState>
        )}
      </div>

      <div className="sticky bottom-0 mt-4 border-t border-slate-100 bg-white pt-3">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 shadow-sm">
          <textarea
            value={commentText}
            onChange={(event) => onCommentTextChange(event.target.value)}
            placeholder="Add a comment..."
            className="scrollbar-thin max-h-24 w-full resize-none bg-transparent p-1 text-sm leading-snug text-slate-700 focus:outline-none"
            rows={1}
            onInput={(event) => {
              const target = event.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
            }}
          />
          <div className="flex items-center gap-1 shrink-0 pb-1">
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
            <button onClick={() => fileInputRef.current?.click()} className="rounded-md p-1.5 text-slate-400 transition-colors hover:text-cyan-600" title="Attach Files">
              <Paperclip className="w-4 h-4" />
            </button>
            <button onClick={onSubmitComment} disabled={!commentText.trim()} className="rounded-md bg-cyan-600 p-1.5 text-white shadow-sm transition-colors hover:bg-cyan-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
