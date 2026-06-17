import React from 'react';
import { Link2, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CommentItem } from '../CommentItem';
import { ConversationSectionCard, ConversationSectionHeader } from './ConversationSectionCard';
import { ConversationToolbarPill } from './ConversationToolbar';

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
    badge: 'sky' as const,
  },
  violet: {
    icon: 'text-violet-500',
    focus: 'focus:border-violet-500 focus:ring-violet-100',
    button: 'bg-violet-600 hover:bg-violet-500',
    badge: 'violet' as const,
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
          <div className="flex flex-wrap items-center gap-1.5">
            <ConversationToolbarPill tone={colors.badge}>
              {comments.length} {isZh ? '条备注' : comments.length === 1 ? 'note' : 'notes'}
            </ConversationToolbarPill>
            <ConversationToolbarPill tone={isLinked ? 'success' : 'default'}>
              <Link2 className="h-3 w-3" />
              {isLinked ? (isZh ? '写入客户档案' : 'Saved to client') : (isZh ? '保留在当前会话' : 'Saved to conversation')}
            </ConversationToolbarPill>
          </div>
        )}
      />

      <div className="mb-5 space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500">
            {isZh ? '还没有内部备注。' : 'No internal notes yet.'}
          </div>
        ) : (
          comments.slice(-5).map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={(commentId, content, attachments) => onReply(commentId, content, attachments)}
            />
          ))
        )}
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '新增内部备注' : 'New internal note'}
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-500">
              {isZh
                ? '记录团队判断、风险提示或下一步建议，让这条对话的交接更顺。'
                : 'Capture team judgement, risks, and next-step guidance so handoff stays clean.'}
            </div>
          </div>
          <ConversationToolbarPill tone={colors.badge}>
            {commentText.trim()
              ? (isZh ? '正在编辑中' : 'Drafting note')
              : (isZh ? '等待输入' : 'Ready for note')}
          </ConversationToolbarPill>
        </div>

        <textarea
          value={commentText}
          onChange={event => onCommentTextChange(event.target.value)}
          placeholder={isZh ? '添加一条内部备注...' : 'Add an internal note...'}
          className={cn(
            'min-h-[92px] w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2',
            colors.focus,
          )}
        />

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!commentText.trim()}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition disabled:bg-slate-200 disabled:text-slate-500',
              colors.button,
            )}
          >
            {isZh ? '保存备注' : 'Save note'}
          </button>
        </div>
      </div>
    </ConversationSectionCard>
  );
}
