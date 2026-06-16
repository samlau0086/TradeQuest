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
    <div className="border-t border-slate-800 pt-6 pb-20">
      <SectionHeader icon={<MessageSquare className="w-4 h-4" />} className="mb-4">Team Comments</SectionHeader>

      <div className="space-y-4 mb-6">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} onReply={onReply} onDelete={onDelete} />
        ))}
        {comments.length === 0 && (
          <EmptyState tone="subtle" className="py-4 text-center text-xs italic">No comments yet.</EmptyState>
        )}
      </div>

      <div className="sticky bottom-0 bg-slate-900 pt-2 border-t border-slate-800/50 mt-4">
        <div className="flex items-end gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
          <textarea
            value={commentText}
            onChange={(event) => onCommentTextChange(event.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-transparent text-sm resize-none focus:outline-none text-slate-200 max-h-24 leading-snug p-1 scrollbar-thin"
            rows={1}
            onInput={(event) => {
              const target = event.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
            }}
          />
          <div className="flex items-center gap-1 shrink-0 pb-1">
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-md transition-colors" title="Attach Files">
              <Paperclip className="w-4 h-4" />
            </button>
            <button onClick={onSubmitComment} disabled={!commentText.trim()} className="bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white p-1.5 rounded-md hover:bg-cyan-500 transition-colors shadow-sm disabled:shadow-none">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
