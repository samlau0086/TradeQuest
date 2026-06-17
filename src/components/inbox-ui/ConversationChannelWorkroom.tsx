import React, { type ReactNode } from 'react';
import { ConversationDetailWorkroom } from './ConversationDetailWorkroom';
import { ConversationInternalNotesPanel } from './ConversationInternalNotesPanel';
import { ConversationMessageList } from './ConversationMessageList';
import { ConversationReplyComposer } from './ConversationReplyComposer';
import type { ConversationMessageTranslation } from './inboxModel';

interface ConversationChannelWorkroomProps {
  header: ReactNode;
  summary: ReactNode;
  followUp: ReactNode;
  channel: 'live_chat' | 'telegram';
  language: 'en' | 'zh';
  messages: any[];
  isLoading?: boolean;
  translateEnabled: boolean;
  translations: Record<string, ConversationMessageTranslation>;
  translatingIds: Set<string>;
  comments: any[];
  commentText: string;
  accent: 'violet' | 'sky';
  isLinked: boolean;
  linkedDescription: string;
  unlinkedDescription: string;
  onCommentTextChange: (value: string) => void;
  onReplyComment: (commentId: string, content: string, attachments?: any[]) => void;
  onSubmitComment: () => void;
  afterNotes?: ReactNode;
  rail: ReactNode;
  composerValue: string;
  composerSending: boolean;
  composerAccent: 'violet' | 'sky';
  composerPlaceholder: string;
  composerHelperText: string;
  onComposerChange: (value: string) => void;
  onComposerSend: () => void | Promise<void>;
  composerClassName?: string;
}

export function ConversationChannelWorkroom({
  header,
  summary,
  followUp,
  channel,
  language,
  messages,
  isLoading,
  translateEnabled,
  translations,
  translatingIds,
  comments,
  commentText,
  accent,
  isLinked,
  linkedDescription,
  unlinkedDescription,
  onCommentTextChange,
  onReplyComment,
  onSubmitComment,
  afterNotes,
  rail,
  composerValue,
  composerSending,
  composerAccent,
  composerPlaceholder,
  composerHelperText,
  onComposerChange,
  onComposerSend,
  composerClassName = 'border-t-0 bg-transparent',
}: ConversationChannelWorkroomProps) {
  return (
    <ConversationDetailWorkroom
      header={header}
      summary={summary}
      followUp={followUp}
      main={(
        <>
          <ConversationMessageList
            channel={channel}
            language={language}
            messages={messages}
            isLoading={isLoading}
            translateEnabled={translateEnabled}
            translations={translations}
            translatingIds={translatingIds}
          />
          <ConversationInternalNotesPanel
            language={language}
            comments={comments}
            commentText={commentText}
            accent={accent}
            isLinked={isLinked}
            linkedDescription={linkedDescription}
            unlinkedDescription={unlinkedDescription}
            onCommentTextChange={onCommentTextChange}
            onReply={onReplyComment}
            onSubmit={onSubmitComment}
          />
          {afterNotes}
        </>
      )}
      rail={rail}
      composer={(
        <ConversationReplyComposer
          language={language}
          value={composerValue}
          isSending={composerSending}
          accent={composerAccent}
          placeholder={composerPlaceholder}
          helperText={composerHelperText}
          onChange={onComposerChange}
          onSend={onComposerSend}
        />
      )}
      composerClassName={composerClassName}
    />
  );
}
