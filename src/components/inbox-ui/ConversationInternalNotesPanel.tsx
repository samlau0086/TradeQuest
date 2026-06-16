import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CommentItem } from '../CommentItem';

interface ConversationInternalNotesPanelProps {
  language: 'en' | 'zh';
  comments: any[];
  commentText: string;
  accent: 'sky' | 'violet';
  linkedDescription: string;
  unlinkedDescription: string;
  isLinked: boolean;
  onCommentTextChange: (value: string) => void;
  onSubmit: () => void;
  onReply: (commentId: string, content: string, attachments?: any[]) => void;
}

const accentClasses = {
  sky: {
    icon: 'text-sky-500',
    focus: 'focus:border-sky-500',
    button: 'bg-sky-600 hover:bg-sky-500',
  },
  violet: {
    icon: 'text-violet-500',
    focus: 'focus:border-violet-500',
    button: 'bg-violet-600 hover:bg-violet-500',
  },
} as const;

export function ConversationInternalNotesPanel({
  comments,
  commentText,
  accent,
  linkedDescription,
  unlinkedDescription,
  isLinked,
  onCommentTextChange,
  onSubmit,
  onReply,
}: ConversationInternalNotesPanelProps) {
  const colors = accentClasses[accent];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <MessageSquare className={cn('h-4 w-4', colors.icon)} />
            {'Internal Notes'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {isLinked ? linkedDescription : unlinkedDescription}
          </div>
        </div>
      </div>

      <div className="mb-3 space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
            {'No internal notes yet.'}
          </div>
        ) : comments.slice(-5).map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={(commentId, content, attachments) => onReply(commentId, content, attachments)}
          />
        ))}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={commentText}
          onChange={event => onCommentTextChange(event.target.value)}
          placeholder="Add an internal note..."
          className={cn(
            'min-h-[72px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400',
            colors.focus
          )}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!commentText.trim()}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500',
            colors.button
          )}
        >
          {'Add'}
        </button>
      </div>
    </div>
  );
}
