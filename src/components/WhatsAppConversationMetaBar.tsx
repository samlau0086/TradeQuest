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
    <div className="p-3 border-b border-slate-800 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 bg-slate-900">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => onRemoveTag(tag)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-red-950/40 text-xs text-cyan-300 hover:text-red-300 border border-slate-700"
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
            className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
          />
          <button onClick={onAddTag} className="px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="max-h-20 overflow-y-auto space-y-1">
          {comments.slice(-3).map(comment => (
            <div key={comment.id} className="group flex items-start gap-2 text-[11px] bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400">
              <div className="min-w-0 flex-1">
                <span className="text-slate-300 break-words">{comment.content}</span>
                <span className="ml-2 text-slate-600">{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <button
                onClick={() => onDeleteComment(comment.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-300 transition-opacity"
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
            className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
          />
          <button onClick={onAddComment} className="px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
