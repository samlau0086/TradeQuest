import React from 'react';
import {
  CheckCircle2,
  Clock,
  Database,
  Download,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  MousePointerClick,
  Paperclip,
  PenLine,
  Radar,
  Reply,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { CommentItem } from '../CommentItem';
import { AgentContextSuggestions } from '../AgentContextSuggestions';
import { ConversationSectionCard, ConversationSectionHeader } from './ConversationSectionCard';
import { ConversationToolbarButton, ConversationToolbarPill } from './ConversationToolbar';

interface EmailAttachment {
  name: string;
  url: string;
}

interface EmailBodyPanelProps {
  subject: string;
  body?: string;
  language?: 'en' | 'zh';
}

export function EmailBodyPanel({ subject, body, language = 'en' }: EmailBodyPanelProps) {
  const isZh = language === 'zh';
  const cleanedBody = (body || '').replace(/<img[^>]*\/api\/track\/open\/[^>]*>/g, '');

  return (
    <ConversationSectionCard bodyClassName="p-6">
      <ConversationSectionHeader
        title={isZh ? '\u90ae\u4ef6\u6b63\u6587' : 'Email body'}
        icon={<FileText className="h-4 w-4 text-slate-400" />}
        description={
          isZh
            ? '\u5728\u8fd9\u91cc\u67e5\u770b\u5f53\u524d\u90ae\u4ef6\u6b63\u6587\uff0c\u786e\u8ba4\u5ba2\u6237\u8bed\u6c14\u3001\u9700\u6c42\u548c\u4e0a\u4e0b\u6587\uff0c\u518d\u51b3\u5b9a\u56de\u590d\u3001\u8f6c\u4efb\u52a1\u6216\u6c89\u6dc0\u77e5\u8bc6\u3002'
            : 'Review the latest email content, tone, and context here before replying, creating follow-up work, or saving knowledge.'
        }
        actions={(
          <ConversationToolbarPill tone="default">
            {cleanedBody ? (isZh ? '\u6b63\u6587\u5df2\u52a0\u8f7d' : 'Body loaded') : (isZh ? '\u65e0\u6b63\u6587' : 'No body')}
          </ConversationToolbarPill>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(240px,0.45fr)]">
        <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {isZh ? '\u4e3b\u9898' : 'Subject'}
          </div>
          <h2 className="text-[28px] font-semibold tracking-tight text-slate-950">
            {subject || (isZh ? '\u65e0\u4e3b\u9898' : 'No subject')}
          </h2>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {isZh ? '阅读建议' : 'Reading tip'}
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            {isZh
              ? '先确认客户意图、语气和具体需求，再决定是直接回复、转成待跟进，还是沉淀到知识库。'
              : 'Confirm customer intent, tone, and concrete asks before replying, creating follow-up work, or saving knowledge.'}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200/80 px-5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {isZh ? '渲染内容' : 'Rendered message'}
          </div>
        </div>
        <div
          className="overflow-x-auto p-6 text-sm leading-7 text-slate-900 shadow-inner shadow-slate-100/70"
          dangerouslySetInnerHTML={{ __html: cleanedBody }}
        />
      </div>
    </ConversationSectionCard>
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
  language?: 'en' | 'zh';
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
  language = 'en',
  isLinked,
  isInbound,
  senderIp,
  senderCountry,
  cc,
  bcc,
  onCreateLead,
  onAddToExistingClient,
}: EmailHeaderMetaProps) {
  const isZh = language === 'zh';

  return (
    <>
      {!isLinked && (
        <>
          <ConversationToolbarButton tone="info" compact onClick={onCreateLead}>
            <UserPlus className="h-3 w-3" />
            {isZh ? '\u65b0\u5efa\u7ebf\u7d22' : 'New Lead'}
          </ConversationToolbarButton>
          <ConversationToolbarButton tone="success" compact onClick={onAddToExistingClient}>
            <User className="h-3 w-3" />
            {isZh ? '\u5173\u8054\u73b0\u6709\u5ba2\u6237' : 'Add to Existing Client'}
          </ConversationToolbarButton>
        </>
      )}
      {isInbound && senderIp && <ConversationToolbarPill>IP: {senderIp}</ConversationToolbarPill>}
      {isInbound && senderCountry && <ConversationToolbarPill tone="success">{senderCountry}</ConversationToolbarPill>}
      {cc && <ConversationToolbarPill>Cc: {cc}</ConversationToolbarPill>}
      {bcc && <ConversationToolbarPill>Bcc: {bcc}</ConversationToolbarPill>}
    </>
  );
}

interface EmailHeaderActionsProps {
  language?: 'en' | 'zh';
  isDraft: boolean;
  hasClient: boolean;
  isAddingToRag: boolean;
  isAddedToRag: boolean;
  onEditDraft: () => void;
  onReply: () => void;
  onAddToRag: () => void;
}

export function EmailHeaderActions({
  language = 'en',
  isDraft,
  hasClient,
  isAddingToRag,
  isAddedToRag,
  onEditDraft,
  onReply,
  onAddToRag,
}: EmailHeaderActionsProps) {
  const isZh = language === 'zh';

  return (
    <>
      {isDraft ? (
        <ConversationToolbarButton onClick={onEditDraft} compact title={isZh ? '\u7f16\u8f91\u8349\u7a3f' : 'Edit Draft'}>
          <PenLine className="h-4 w-4" />
          <span>{isZh ? '\u7f16\u8f91\u8349\u7a3f' : 'Edit Draft'}</span>
        </ConversationToolbarButton>
      ) : (
        <ConversationToolbarButton onClick={onReply} compact title={isZh ? '\u56de\u590d\u90ae\u4ef6' : 'Reply'}>
          <Reply className="h-4 w-4" />
          <span>{isZh ? '\u56de\u590d' : 'Reply'}</span>
        </ConversationToolbarButton>
      )}
      {hasClient && (
        <ConversationToolbarButton
          onClick={onAddToRag}
          disabled={isAddingToRag}
          tone="violet"
          compact
          title={isZh ? '\u52a0\u5165\u77e5\u8bc6\u5e93\uff08RAG\uff09' : 'Add to Knowledge Base (RAG)'}
        >
          {isAddingToRag ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAddedToRag ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          <span>{isAddedToRag ? (isZh ? '\u5df2\u4fdd\u5b58\u5230 RAG' : 'Saved to RAG') : (isZh ? '\u52a0\u5165 RAG' : 'Add to RAG')}</span>
        </ConversationToolbarButton>
      )}
    </>
  );
}

interface EmailAttachmentsPanelProps {
  attachments?: EmailAttachment[];
  language?: 'en' | 'zh';
}

export function EmailAttachmentsPanel({
  attachments,
  language = 'en',
}: EmailAttachmentsPanelProps) {
  if (!attachments || attachments.length === 0) return null;
  const isZh = language === 'zh';

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        title={isZh ? '\u9644\u4ef6' : 'Attachments'}
        icon={<Paperclip className="h-4 w-4 text-slate-400" />}
        description={
          isZh
            ? '\u67e5\u770b\u6b64\u90ae\u4ef6\u9644\u5e26\u7684\u6587\u4ef6\uff0c\u4fbf\u4e8e\u4e0b\u8f7d\u3001\u8f6c\u53d1\uff0c\u6216\u4f5c\u4e3a\u540e\u7eed\u62a5\u4ef7\u4e0e\u8ddf\u8fdb\u4f9d\u636e\u3002'
            : 'Review attached files for download, forwarding, or use in follow-ups and quoting.'
        }
        actions={(
          <ConversationToolbarPill tone="info">
            {attachments.length} {isZh ? '\u4e2a\u6587\u4ef6' : attachments.length === 1 ? 'file' : 'files'}
          </ConversationToolbarPill>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {attachments.map((attachment, index) => (
          <a
            href={attachment.url}
            key={`${attachment.url}:${index}`}
            className="group rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 text-slate-700 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isZh ? '\u9644\u4ef6\u6587\u4ef6' : 'Attachment'}
                </div>
                <div className="mt-2 break-all text-sm font-semibold leading-6 text-slate-900">
                  {attachment.name}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition group-hover:border-slate-300 group-hover:text-slate-700">
                <Download className="h-4 w-4" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </ConversationSectionCard>
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
  const isZh = language === 'zh';
  const openCount = events.filter(event => event.type === 'open').length;
  const clickCount = events.filter(event => event.type === 'click').length;

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        title={isZh ? '\u4ea4\u4e92\u8ddf\u8e2a\u6d3b\u52a8' : 'Interaction Tracking Activity'}
        icon={<Radar className="h-4 w-4 text-emerald-500" />}
        description={
          isZh
            ? '\u67e5\u770b\u6b64\u90ae\u4ef6\u7684\u6253\u5f00\u3001\u70b9\u51fb\u548c\u5730\u7406\u4f4d\u7f6e\u6d3b\u52a8\uff0c\u7528\u4e8e\u5224\u65ad\u5ba2\u6237\u53c2\u4e0e\u5ea6\u4e0e\u8ddf\u8fdb\u8282\u594f\u3002'
            : 'See opens, clicks, and location activity for this email to understand customer engagement.'
        }
        actions={(
          <div className="flex flex-wrap items-center gap-1.5">
            <ConversationToolbarPill tone="success">
              {isZh ? '\u6253\u5f00' : 'Opens'} {openCount}
            </ConversationToolbarPill>
            <ConversationToolbarPill tone="violet">
              {isZh ? '\u70b9\u51fb' : 'Clicks'} {clickCount}
            </ConversationToolbarPill>
            <ConversationToolbarPill tone="default">
              {events.length} {isZh ? '\u6761\u4e8b\u4ef6' : events.length === 1 ? 'event' : 'events'}
            </ConversationToolbarPill>
          </div>
        )}
      />

      {events.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500">
          {isZh ? '\u6682\u65f6\u8fd8\u6ca1\u6709\u8ddf\u8e2a\u8bb0\u5f55\u3002' : 'No tracking events have been recorded yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-cyan-200 bg-cyan-50 px-4 py-3 text-cyan-900 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                {isZh ? '总打开次数' : 'Total opens'}
              </div>
              <div className="mt-1 text-xl font-semibold">{openCount}</div>
            </div>
            <div className="rounded-[20px] border border-violet-200 bg-violet-50 px-4 py-3 text-violet-900 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                {isZh ? '总点击次数' : 'Total clicks'}
              </div>
              <div className="mt-1 text-xl font-semibold">{clickCount}</div>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                {isZh ? '跟踪事件' : 'Tracked events'}
              </div>
              <div className="mt-1 text-xl font-semibold">{events.length}</div>
            </div>
          </div>

          <div className="space-y-3">
          {visibleEvents.map((event, index) => (
            <div
              key={`${event.created_at || index}-${event.type || 'event'}`}
              className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4"
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex min-w-[130px] items-center gap-2">
                  {event.type === 'open' ? (
                    <Eye className="h-4 w-4 text-cyan-500" />
                  ) : (
                    <MousePointerClick className="h-4 w-4 text-fuchsia-500" />
                  )}
                  <span className="text-sm font-semibold capitalize text-slate-900">{event.type}</span>
                </div>

                <div className="flex min-w-[160px] items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(event.created_at).toLocaleString()}
                </div>

                {(event.location?.country || event.location?.city) && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
                    {event.location.city ? `${event.location.city}, ` : ''}
                    {event.location.region ? `${event.location.region}, ` : ''}
                    {event.location.country}
                  </div>
                )}

                {event.ip_address && (
                  <div
                    className="ml-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-500"
                    title={event.user_agent}
                  >
                    {event.ip_address}
                  </div>
                )}
              </div>

              {event.type === 'click' && event.url && (
                <div className="mt-3 rounded-2xl border border-fuchsia-100 bg-white px-3 py-3 text-xs leading-6">
                  <span className="mr-2 font-semibold text-slate-500">
                    {isZh ? '\u70b9\u51fb\u94fe\u63a5\uff1a' : 'Link clicked:'}
                  </span>
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-fuchsia-600 underline hover:text-fuchsia-500"
                  >
                    {event.url}
                  </a>
                </div>
              )}
            </div>
          ))}
          </div>

          {events.length > 3 && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-500"
            >
              {isExpanded
                ? (isZh ? '\u6536\u8d77' : 'Show Less')
                : (isZh ? `\u663e\u793a\u5168\u90e8\uff08${events.length}\uff09` : `Show More (${events.length})`)}
            </button>
          )}
        </div>
      )}
    </ConversationSectionCard>
  );
}

interface EmailCommentsPanelProps {
  comments: any[];
  commentText: string;
  attachments: File[];
  language?: 'en' | 'zh';
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
  language = 'en',
  onCommentTextChange,
  onAttachClick,
  onRemoveAttachment,
  onSubmit,
  onReply,
}: EmailCommentsPanelProps) {
  const isZh = language === 'zh';

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        title={isZh ? '\u5185\u90e8\u8bc4\u8bba\u4e0e\u5907\u6ce8' : 'Comments & Notes'}
        icon={<MessageSquare className="h-4 w-4 text-slate-400" />}
        description={
          isZh
            ? '\u628a\u5185\u90e8\u534f\u4f5c\u3001\u5224\u65ad\u548c\u4e0b\u4e00\u6b65\u5907\u6ce8\u96c6\u4e2d\u7559\u5728\u5f53\u524d\u90ae\u4ef6\u7ebf\u7a0b\u65c1\u8fb9\uff0c\u907f\u514d\u4e0a\u4e0b\u6587\u5206\u6563\u3002'
            : 'Keep internal coordination, decisions, and next-step notes together with the email thread.'
        }
        actions={(
          <ConversationToolbarPill tone={comments.length > 0 ? 'violet' : 'default'}>
            {comments.length} {isZh ? '\u6761\u8bc4\u8bba' : comments.length === 1 ? 'comment' : 'comments'}
          </ConversationToolbarPill>
        )}
      />

      <div className="mb-5 space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500">
            {isZh ? '\u8fd8\u6ca1\u6709\u5185\u90e8\u8bc4\u8bba\u3002' : 'No internal comments yet.'}
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={(commentId, content, replyAttachments) => onReply(commentId, content, replyAttachments)}
            />
          ))
        )}
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isZh ? '\u65b0\u589e\u5185\u90e8\u5907\u6ce8' : 'New internal note'}
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-500">
              {isZh
                ? '记录团队判断、风险提醒或下一步建议，方便销售和支持接手。'
                : 'Capture team judgement, risks, and next-step guidance so handoff stays clean.'}
            </div>
          </div>
          <ConversationToolbarPill tone="info">
            {attachments.length > 0
              ? (isZh ? `${attachments.length} 个附件待提交` : `${attachments.length} attachments pending`)
              : (isZh ? '仅文本备注' : 'Text note only')}
          </ConversationToolbarPill>
        </div>

        <textarea
          value={commentText}
          onChange={event => onCommentTextChange(event.target.value)}
          className="min-h-[92px] w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-100"
          placeholder={isZh ? '\u7ed9\u8fd9\u5c01\u90ae\u4ef6\u6dfb\u52a0\u5185\u90e8\u8bc4\u8bba...' : 'Add a comment to this email...'}
        />

        {attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}:${index}`}
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white"
              >
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center break-words p-1 text-center text-[10px] text-slate-500">
                    <Paperclip className="mb-1 h-3 w-3" />
                    <span className="line-clamp-2 w-full truncate">{file.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(index)}
                  className="absolute right-0 top-0 rounded-bl bg-rose-500/85 p-0.5 text-white opacity-0 transition-opacity hover:bg-rose-500 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onAttachClick}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            title={isZh ? '\u6dfb\u52a0\u9644\u4ef6' : 'Attach Files'}
          >
            <Paperclip className="h-4 w-4" />
            {isZh ? '\u6dfb\u52a0\u9644\u4ef6' : 'Attach files'}
            {attachments.length > 0 && (
              <span className="rounded-full bg-cyan-600 px-1.5 py-0.5 text-[10px] text-white">
                {attachments.length}
              </span>
            )}
          </button>

          <ConversationToolbarButton
            onClick={onSubmit}
            disabled={!commentText.trim() && attachments.length === 0}
            tone="info"
          >
            {isZh ? '\u53d1\u5e03\u8bc4\u8bba' : 'Post Comment'}
          </ConversationToolbarButton>
        </div>
      </div>
    </ConversationSectionCard>
  );
}
