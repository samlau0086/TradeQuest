import React from 'react';
import { CheckCircle2, Clock, Database, Eye, Loader2, MessageSquare, MousePointerClick, Paperclip, PenLine, Radar, Reply, User, UserPlus, X } from 'lucide-react';
import { CommentItem } from '../CommentItem';
import { AgentContextSuggestions } from '../AgentContextSuggestions';

interface EmailAttachment {
  name: string;
  url: string;
}

interface EmailBodyPanelProps {
  subject: string;
  body?: string;
}

export function EmailBodyPanel({ subject, body }: EmailBodyPanelProps) {
  return (
    <>
      <h2 className="text-xl font-bold text-slate-200 mb-6">{subject}</h2>
      <div
        className="text-sm bg-white text-black p-6 rounded-lg leading-relaxed overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: (body || '').replace(/<img[^>]*\/api\/track\/open\/[^>]*>/g, '') }}
      />
    </>
  );
}

interface EmailAgentSuggestionsPanelProps {
  cacheKey: string;
  contextLookup?: { conversationId?: string };
  clientId?: string;
  emailAddress: string;
  defaultAnalysisMode?: any;
  persistedInsight?: any;
  persistedInsightKey?: string;
  subject: string;
  body: string;
  additionalContext: string;
  clientName?: string;
  hasClient: boolean;
  hasKnowledge: boolean;
  hasCustomerMessage: boolean;
  followUpAt?: string | null;
  followUpNote?: string | null;
  onDraftReply: () => void | Promise<void>;
  onAddComment: () => void | Promise<void>;
  onCreateLead?: () => void | Promise<void>;
  onAddToKnowledge?: () => void | Promise<void>;
  onSetFollowUp: (dueAt: string, note: string) => void | Promise<void>;
  onClearFollowUp: () => void | Promise<void>;
  onCompleteFollowUp: () => void | Promise<void>;
  onDeleteItem: () => void | Promise<void>;
  onSaveAnalysis: (key: string, insight: any) => void | Promise<void>;
}

export function EmailAgentSuggestionsPanel({
  cacheKey,
  contextLookup,
  clientId,
  emailAddress,
  defaultAnalysisMode,
  persistedInsight,
  persistedInsightKey,
  subject,
  body,
  additionalContext,
  clientName,
  hasClient,
  hasKnowledge,
  hasCustomerMessage,
  followUpAt,
  followUpNote,
  onDraftReply,
  onAddComment,
  onCreateLead,
  onAddToKnowledge,
  onSetFollowUp,
  onClearFollowUp,
  onCompleteFollowUp,
  onDeleteItem,
  onSaveAnalysis,
}: EmailAgentSuggestionsPanelProps) {
  return (
    <AgentContextSuggestions
      channel="email"
      cacheKey={cacheKey}
      contextLookup={contextLookup}
      clientId={clientId}
      emailAddress={emailAddress}
      defaultAnalysisMode={defaultAnalysisMode}
      persistedInsight={persistedInsight}
      persistedInsightKey={persistedInsightKey}
      subject={subject}
      body={body}
      additionalContext={additionalContext}
      clientName={clientName}
      hasClient={hasClient}
      hasKnowledge={hasKnowledge}
      hasCustomerMessage={hasCustomerMessage}
      autoScrollOnOpen
      onDraftReply={onDraftReply}
      onAddComment={onAddComment}
      onCreateLead={onCreateLead}
      onAddToKnowledge={onAddToKnowledge}
      followUpAt={followUpAt}
      followUpNote={followUpNote}
      onSetFollowUp={onSetFollowUp}
      onClearFollowUp={onClearFollowUp}
      onCompleteFollowUp={onCompleteFollowUp}
      onDeleteItem={onDeleteItem}
      onSaveAnalysis={onSaveAnalysis}
    />
  );
}

interface EmailHeaderMetaProps {
  isLinked: boolean;
  isInbound: boolean;
  senderIp?: string;
  senderCountry?: string;
  cc?: string;
  bcc?: string;
  onCreateLead: () => void;
  onAddToExistingClient: () => void;
}

export function EmailHeaderMeta({
  isLinked,
  isInbound,
  senderIp,
  senderCountry,
  cc,
  bcc,
  onCreateLead,
  onAddToExistingClient,
}: EmailHeaderMetaProps) {
  return (
    <>
      {!isLinked && (
        <>
          <button onClick={onCreateLead} className="text-cyan-500 flex items-center gap-1 hover:text-cyan-400 bg-slate-800/50 rounded px-1.5 py-0.5">
            <UserPlus className="w-3 h-3" /> New Lead
          </button>
          <button onClick={onAddToExistingClient} className="text-emerald-400 flex items-center gap-1 hover:text-emerald-300 bg-slate-800/50 rounded px-1.5 py-0.5">
            <User className="w-3 h-3" /> Add to Existing Client
          </button>
        </>
      )}
      {isInbound && senderIp && (
        <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">IP: {senderIp}</span>
      )}
      {isInbound && senderCountry && (
        <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70 text-emerald-300">{senderCountry}</span>
      )}
      {cc && <span>Cc: {cc}</span>}
      {bcc && <span>Bcc: {bcc}</span>}
    </>
  );
}

interface EmailHeaderActionsProps {
  isDraft: boolean;
  hasClient: boolean;
  isAddingToRag: boolean;
  isAddedToRag: boolean;
  onEditDraft: () => void;
  onReply: () => void;
  onAddToRag: () => void;
}

export function EmailHeaderActions({
  isDraft,
  hasClient,
  isAddingToRag,
  isAddedToRag,
  onEditDraft,
  onReply,
  onAddToRag,
}: EmailHeaderActionsProps) {
  return (
    <>
      {isDraft ? (
        <button
          onClick={onEditDraft}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Edit Draft"
        >
          <PenLine className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onReply}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Reply"
        >
          <Reply className="w-4 h-4" />
        </button>
      )}
      {hasClient && (
        <button
          onClick={onAddToRag}
          disabled={isAddingToRag}
          className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded transition-colors flex items-center gap-1"
          title="Add to Knowledge Base (RAG)"
        >
          {isAddingToRag ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isAddedToRag ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Database className="w-4 h-4" />
          )}
        </button>
      )}
    </>
  );
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

interface EmailTrackingPanelProps {
  language: 'en' | 'zh';
  enabled: boolean;
  events: any[];
  visibleEvents: any[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function EmailTrackingPanel({
  language,
  enabled,
  events,
  visibleEvents,
  isExpanded,
  onToggleExpanded,
}: EmailTrackingPanelProps) {
  if (!enabled) return null;

  return (
    <div className="mb-6 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
        <Radar className="w-4 h-4 text-emerald-400" /> Interaction Tracking Activity
      </div>
      {events.length === 0 ? (
        <div className="text-sm text-slate-500 py-2">No tracking events have been recorded yet.</div>
      ) : (
        <div className="space-y-3">
          {visibleEvents.map((event, index) => (
            <div
              key={`${event.created_at || index}-${event.type || 'event'}`}
              className="flex flex-wrap items-center gap-4 text-sm bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50"
            >
              <div className="flex items-center gap-2 min-w-[100px]">
                {event.type === 'open' ? (
                  <Eye className="w-4 h-4 text-cyan-500" />
                ) : (
                  <MousePointerClick className="w-4 h-4 text-fuchsia-500" />
                )}
                <span className="text-white font-medium capitalize">{event.type}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs min-w-[140px]">
                <Clock className="w-3.5 h-3.5" />
                {new Date(event.created_at).toLocaleString()}
              </div>
              {(event.location?.country || event.location?.city) && (
                <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                  {event.location.city ? `${event.location.city}, ` : ''}
                  {event.location.region ? `${event.location.region}, ` : ''}
                  {event.location.country}
                </div>
              )}
              <div className="text-slate-500 text-xs ml-auto font-mono bg-slate-800 px-2 py-0.5 rounded" title={event.user_agent}>
                {event.ip_address}
              </div>
              {event.type === 'click' && event.url && (
                <div className="w-full mt-1.5 text-xs">
                  <span className="text-slate-500 mr-2">Link Clicked:</span>
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 hover:text-fuchsia-300 underline break-all">
                    {event.url}
                  </a>
                </div>
              )}
            </div>
          ))}
          {events.length > 3 && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="text-xs font-bold text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              {isExpanded
                ? (language === 'zh' ? '收起' : 'Show Less')
                : (language === 'zh' ? `显示全部 ${events.length} 条记录` : `Show More (${events.length})`)}
            </button>
          )}
        </div>
      )}
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
