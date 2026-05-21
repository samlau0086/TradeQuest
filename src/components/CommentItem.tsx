import React, { useState } from 'react';
import { useStore, Comment, Attachment } from '../store';
import { cn } from '../lib/utils';
import { Paperclip, Send, X } from 'lucide-react';
import { UploadAttachmentModal } from './UploadAttachmentModal';

export function CommentItem({ comment, onReply }: { comment: Comment; onReply: (commentId: string, content: string, attachments?: Attachment[]) => void }) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

  const handleReply = () => {
    if (!replyText.trim() && replyAttachments.length === 0) return;

    const attachments = replyAttachments.length > 0 
      ? replyAttachments.map(f => ({
          id: `file${Date.now()}_${Math.random()}`,
          name: f.name,
          type: (f.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
          url: URL.createObjectURL(f)
        })) 
      : undefined;

    if (replyText.trim() || attachments) {
      onReply(comment.id, replyText || 'Uploaded attachment(s)', attachments);
    }
    setReplyText('');
    setReplyAttachments([]);
    setIsReplying(false);
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-cyan-400">{comment.author}</span>
        <span className="text-[10px] text-slate-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
      </div>
      <p className="text-sm text-slate-300 whitespace-pre-wrap">{comment.content}</p>

      {/* Embedded Attachments */}
      {comment.attachments && comment.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {comment.attachments.map(att => (
            <div key={att.id} className="relative group overflow-hidden border border-slate-700 rounded-md bg-slate-900 w-20 h-20 shrink-0">
              {att.type === 'image' ? (
                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
              ) : (
                <a href={att.url} target="_blank" rel="noreferrer" className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 p-2 text-center hover:text-cyan-400 break-words">
                  <Paperclip className="w-4 h-4 mb-1" />
                  <span className="truncate w-full line-clamp-2">{att.name}</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-slate-700 space-y-3">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} />
          ))}
        </div>
      )}

      {/* Reply Input */}
      <div className="mt-2">
        {isReplying ? (
          <div className="mt-2 bg-slate-800/60 p-2 rounded-lg border border-slate-700">
            <textarea 
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="w-full bg-transparent text-xs resize-none focus:outline-none text-slate-200 max-h-24 leading-snug p-1 scrollbar-thin"
              rows={2}
            />
            {replyAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 mb-2">
                {replyAttachments.map((f, idx) => (
                  <div key={idx} className="relative group overflow-hidden border border-slate-700 rounded-md bg-slate-900 w-16 h-16 shrink-0">
                    {f.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 p-1 text-center break-words">
                        <Paperclip className="w-3 h-3 mb-1" />
                        <span className="truncate w-full line-clamp-2">{f.name}</span>
                      </div>
                    )}
                    <button 
                      onClick={() => setReplyAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/80">
              <div className="flex items-center gap-2 shrink-0 pb-1">
                <button onClick={() => setShowAttachmentModal(true)} className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-md transition-colors flex items-center gap-1" title="Attach Files">
                  <Paperclip className="w-3 h-3" />
                  {replyAttachments.length > 0 && <span className="text-[10px] bg-cyan-600 text-white px-1.5 py-0.5 rounded-full">{replyAttachments.length}</span>}
                </button>
              </div>
               <div className="flex items-center gap-2">
                  <button onClick={() => setIsReplying(false)} className="text-[10px] text-slate-500 hover:text-slate-300">Cancel</button>
                  <button onClick={handleReply} disabled={!replyText.trim() && replyAttachments.length === 0} className="bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white p-1 rounded-md hover:bg-cyan-500 transition-colors shadow-sm disabled:shadow-none flex items-center gap-1 px-2 text-[10px] font-bold">
                    <Send className="w-3 h-3" /> Reply
                  </button>
               </div>
            </div>
            
            {showAttachmentModal && (
              <UploadAttachmentModal 
                onClose={() => setShowAttachmentModal(false)}
                onUpload={(files) => {
                  setReplyAttachments(prev => [...prev, ...files]);
                  setShowAttachmentModal(false);
                }}
              />
            )}
          </div>
        ) : (
          <button onClick={() => setIsReplying(true)} className="text-[10px] text-slate-500 hover:text-cyan-400 font-medium">
            Reply
          </button>
        )}
      </div>
    </div>
  );
}
