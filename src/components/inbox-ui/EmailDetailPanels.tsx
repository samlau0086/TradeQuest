import React from 'react';
import { MessageSquare, Paperclip, X } from 'lucide-react';
import { CommentItem } from '../CommentItem';

interface EmailAttachment {
  name: string;
  url: string;
}

interface EmailAttachmentsPanelProps {
  attachments?: EmailAttachment[];
}

export function EmailAttachmentsPanel({ attachments }: EmailAttachmentsPanelProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-8 border-t border-slate-800/50 pt-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3">
        <Paperclip className="w-4 h-4" /> Attachments
      </div>
      <div className="flex flex-wrap gap-3">
        {attachments.map((attachment, index) => (
          <a
            href={attachment.url}
            key={`${attachment.url}:${index}`}
            className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 px-3 py-2 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <Paperclip className="w-3.5 h-3.5 text-slate-500" />
            <span>{attachment.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

interface EmailCommentsPanelProps {
  comments: any[];
  commentText: string;
  attachments: File[];
  onCommentTextChange: (value: string) => void;
  onAttachClick: () => void;
  onRemoveAttachment: (index: number) => void;
  onSubmit: () => void;
  onReply: (commentId: string, content: string, attachments?: any[]) => void;
}

export function EmailCommentsPanel({
  comments,
  commentText,
  attachments,
  onCommentTextChange,
  onAttachClick,
  onRemoveAttachment,
  onSubmit,
  onReply,
}: EmailCommentsPanelProps) {
  return (
    <div className="mt-12 border-t border-slate-800 pt-6">
      <h3 className="text-sm border-b border-slate-800 pb-2 font-bold flex items-center text-slate-400 mb-4">
        <MessageSquare className="w-4 h-4 mr-2" /> Comments & Notes
      </h3>
      <div className="space-y-4 mb-4">
        {comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={(commentId, content, replyAttachments) => onReply(commentId, content, replyAttachments)}
          />
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
        <textarea
          value={commentText}
          onChange={event => onCommentTextChange(event.target.value)}
          className="w-full bg-transparent text-sm resize-none focus:outline-none text-slate-300 placeholder-slate-600 p-1 min-h-[60px]"
          placeholder="Add a comment to this email..."
        />
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 mb-2">
            {attachments.map((file, index) => (
              <div key={`${file.name}:${index}`} className="relative group overflow-hidden border border-slate-700 rounded-md bg-slate-900 w-16 h-16 shrink-0">
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 p-1 text-center break-words">
                    <Paperclip className="w-3 h-3 mb-1" />
                    <span className="truncate w-full line-clamp-2">{file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => onRemoveAttachment(index)}
                  className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-2 shrink-0 pb-1">
            <button onClick={onAttachClick} className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-md transition-colors flex items-center gap-1" title="Attach Files">
              <Paperclip className="w-4 h-4" />
              {attachments.length > 0 && <span className="text-xs bg-cyan-600 text-white px-1.5 py-0.5 rounded-full">{attachments.length}</span>}
            </button>
          </div>
          <button
            onClick={onSubmit}
            disabled={!commentText.trim() && attachments.length === 0}
            className="bg-slate-800 disabled:opacity-50 text-slate-300 px-3 py-1 text-xs rounded hover:text-white"
          >
            Post Comment
          </button>
        </div>
      </div>
    </div>
  );
}
