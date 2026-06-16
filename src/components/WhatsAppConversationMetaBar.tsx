import React from 'react';
import { Plus, Tag, X } from 'lucide-react';
import { Comment } from '../store';

interface WhatsAppConversationMetaBarProps {
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
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-white px-5 py-3 md:grid-cols-[1fr_1fr]">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => onRemoveTag(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <Tag className="w-3 h-3" />
              {tag}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={event => onTagInputChange(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') onAddTag(); }}
            placeholder={addTagLabel}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-900 outline-none"
          />
          <button onClick={onAddTag} className="rounded-lg border border-slate-200 bg-white px-2 text-slate-600 hover:bg-slate-50">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="max-h-20 overflow-y-auto space-y-1">
          {comments.slice(-3).map(comment => (
            <div key={comment.id} className="group flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
              <div className="min-w-0 flex-1">
                <span className="break-words text-slate-700">{comment.content}</span>
                <span className="ml-2 text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <button
                onClick={() => onDeleteComment(comment.id)}
                className="text-slate-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                title={deleteCommentLabel}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={commentInput}
            onChange={event => onCommentInputChange(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') onAddComment(); }}
            placeholder={addCommentLabel}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-900 outline-none"
          />
          <button onClick={onAddComment} className="rounded-lg border border-slate-200 bg-white px-2 text-slate-600 hover:bg-slate-50">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
