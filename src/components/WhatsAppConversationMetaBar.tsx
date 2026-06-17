import React from 'react';
import { MessageSquareText, Plus, Tag, X } from 'lucide-react';
import { Comment } from '../store';
import { ConversationSectionCard, ConversationSectionHeader } from './inbox-ui/ConversationSectionCard';
import { ConversationToolbarPill } from './inbox-ui/ConversationToolbar';

interface WhatsAppConversationMetaBarProps {
  language: 'en' | 'zh';
  tags: string[];
  comments: Comment[];
  tagInput: string;
  commentInput: string;
  addTagLabel: string;
  addCommentLabel: string;
  deleteCommentLabel: string;
  onTagInputChange: (value: string) => void;
  onCommentInputChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onAddComment: () => void;
  onDeleteComment: (commentId: string) => void;
}

export function WhatsAppConversationMetaBar({
  language,
  tags,
  comments,
  tagInput,
  commentInput,
  addTagLabel,
  addCommentLabel,
  deleteCommentLabel,
  onTagInputChange,
  onCommentInputChange,
  onAddTag,
  onRemoveTag,
  onAddComment,
  onDeleteComment,
}: WhatsAppConversationMetaBarProps) {
  const isZh = language === 'zh';

  return (
    <div className="border-b border-slate-200 bg-[#f3f6fb] px-5 py-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_1fr]">
        <ConversationSectionCard className="rounded-[22px] shadow-[0_10px_28px_rgba(15,23,42,0.05)]" bodyClassName="p-4">
          <ConversationSectionHeader
            title={isZh ? '对话标签' : 'Conversation tags'}
            icon={<Tag className="h-4 w-4 text-slate-400" />}
            description={
              isZh
                ? '用标签快速整理会话主题、优先级和来源，让队列判断更高效。'
                : 'Use tags to organize topic, priority, and source at a glance.'
            }
            actions={<ConversationToolbarPill tone="default">{tags.length} {isZh ? '个标签' : tags.length === 1 ? 'tag' : 'tags'}</ConversationToolbarPill>}
            className="mb-3"
          />

          <div className="space-y-3">
            <div className="flex min-h-[32px] flex-wrap gap-1.5">
              {tags.length === 0 ? (
                <div className="text-xs text-slate-400">
                  {isZh ? '暂时还没有标签。' : 'No tags yet.'}
                </div>
              ) : (
                tags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <X className="h-3 w-3" />
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={event => onTagInputChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') onAddTag();
                }}
                placeholder={addTagLabel}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={onAddTag}
                className="rounded-xl border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50"
                title={isZh ? '添加标签' : 'Add tag'}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </ConversationSectionCard>

        <ConversationSectionCard className="rounded-[22px] shadow-[0_10px_28px_rgba(15,23,42,0.05)]" bodyClassName="p-4">
          <ConversationSectionHeader
            title={isZh ? '内部备注' : 'Internal notes'}
            icon={<MessageSquareText className="h-4 w-4 text-slate-400" />}
            description={
              isZh
                ? '仅团队内部可见，用于记录跟进判断、客户线索和协作说明。'
                : 'Visible only to the team for follow-up reasoning, customer clues, and internal coordination.'
            }
            actions={<ConversationToolbarPill tone={comments.length > 0 ? 'violet' : 'default'}>{comments.length} {isZh ? '条备注' : comments.length === 1 ? 'note' : 'notes'}</ConversationToolbarPill>}
            className="mb-3"
          />

          <div className="space-y-3">
            <div className="max-h-28 space-y-2 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-xs text-slate-400">
                  {isZh ? '暂时还没有内部备注。' : 'No internal notes yet.'}
                </div>
              ) : (
                comments.slice(-3).map(comment => (
                  <div key={comment.id} className="group flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                    <div className="min-w-0 flex-1">
                      <span className="break-words text-slate-700">{comment.content}</span>
                      <span className="ml-2 text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteComment(comment.id)}
                      className="text-slate-400 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                      title={deleteCommentLabel}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={commentInput}
                onChange={event => onCommentInputChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') onAddComment();
                }}
                placeholder={addCommentLabel}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={onAddComment}
                className="rounded-xl border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50"
                title={isZh ? '添加备注' : 'Add note'}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </ConversationSectionCard>
      </div>
    </div>
  );
}
