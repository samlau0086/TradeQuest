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
    icon: 'text-sky-300',
    focus: 'focus:border-sky-500',
    button: 'bg-sky-600 hover:bg-sky-500',
  },
  violet: {
    icon: 'text-violet-300',
    focus: 'focus:border-violet-500',
    button: 'bg-violet-600 hover:bg-violet-500',
  },
};

export function ConversationInternalNotesPanel({
  language,
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <MessageSquare className={cn('h-4 w-4', colors.icon)} />
            {language === 'zh' ? '内部备注' : 'Internal Notes'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {isLinked ? linkedDescription : unlinkedDescription}
          </div>
        </div>
      </div>
      <div className="mb-3 space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">
            {language === 'zh' ? '暂无内部备注。' : 'No internal notes yet.'}
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
          placeholder={language === 'zh' ? '添加内部备注...' : 'Add an internal note...'}
          className={cn(
            'min-h-[64px] flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600',
            colors.focus
          )}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!commentText.trim()}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-bold text-white disabled:bg-slate-800 disabled:text-slate-500',
            colors.button
          )}
        >
          {language === 'zh' ? '添加' : 'Add'}
        </button>
      </div>
    </div>
  );
}
