import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CommentItem } from '../CommentItem';
import { ConversationSectionCard, ConversationSectionHeader } from './ConversationSectionCard';

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
    focus: 'focus:border-sky-500 focus:ring-sky-100',
    button: 'bg-sky-600 hover:bg-sky-500',
  },
  violet: {
    icon: 'text-violet-500',
    focus: 'focus:border-violet-500 focus:ring-violet-100',
    button: 'bg-violet-600 hover:bg-violet-500',
  },
} as const;

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
  const isZh = language === 'zh';

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        title={isZh ? '内部备注' : 'Internal notes'}
        icon={<MessageSquare className={cn('h-4 w-4', colors.icon)} />}
        description={isLinked ? linkedDescription : unlinkedDescription}
        actions={(
          <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            {comments.length} {isZh ? '条备注' : comments.length === 1 ? 'note' : 'notes'}
          </div>
        )}
      />

      <div className="mb-4 space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
            {isZh ? '还没有内部备注。' : 'No internal notes yet.'}
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
          placeholder={isZh ? '添加内部备注...' : 'Add an internal note...'}
          className={cn(
            'min-h-[84px] flex-1 resize-none rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2',
            colors.focus,
          )}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!commentText.trim()}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-500',
            colors.button,
          )}
        >
          {isZh ? '添加' : 'Add'}
        </button>
      </div>
    </ConversationSectionCard>
  );
}
