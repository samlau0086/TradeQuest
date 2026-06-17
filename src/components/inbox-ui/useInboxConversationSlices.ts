import { useMemo } from 'react';
import {
  buildActiveConversationStateSlice,
  buildCommentsStateSlice,
  buildFollowUpStateSlice,
  buildSelectedEmailStateSlice,
  buildTranslationStateSlice,
} from './inboxConversationSliceBuilders';
import type {
  UseInboxConversationSlicesOptions,
  UseInboxConversationSlicesResult,
} from './useInboxConversationSliceTypes';

export type {
  ActiveConversationStateSlice,
  CommentsStateSlice,
  FollowUpStateSlice,
  SelectedEmailStateSlice,
  TranslationStateSlice,
  UseInboxConversationSlicesOptions,
  UseInboxConversationSlicesResult,
} from './useInboxConversationSliceTypes';

export function useInboxConversationSlices(
  options: UseInboxConversationSlicesOptions,
): UseInboxConversationSlicesResult {
  const selectedEmailState = useMemo(() => buildSelectedEmailStateSlice(options), [
    options.isTrackingExpanded,
    options.latestInboundEmailForSelectedClient,
    options.selectedEmail,
    options.selectedEmailAgentContext,
    options.selectedEmailClient,
    options.selectedEmailContactAddress,
    options.selectedEmailIsInbound,
    options.selectedTrackingEvents,
    options.toggleTrackingExpanded,
    options.visibleTrackingEvents,
  ]);

  const activeConversationState = useMemo(() => buildActiveConversationStateSlice(options), [
    options.activeLinkableContactMethod,
    options.activeLinkableDisplayName,
    options.activeLiveChatAgentContext,
    options.activeLiveChatClient,
    options.activeLiveChatContactMethod,
    options.activeLiveChatDisplayName,
    options.activeLiveChatEvidenceItems,
    options.activeLiveChatMessages,
    options.activeLiveChatSession,
    options.activeLiveChatTranslateEnabled,
    options.activeLiveChatTranslations,
    options.activeLiveChatVisitorInfo,
    options.activeTelegramAgentContext,
    options.activeTelegramClient,
    options.activeTelegramContactMethod,
    options.activeTelegramDisplayName,
    options.activeTelegramTranslateEnabled,
    options.activeTelegramTranslations,
    options.activeUnifiedConversation,
    options.activeWhatsAppClient,
    options.activeWhatsAppConversation,
    options.activeWhatsAppFollowUp,
    options.latestLiveChatVisitorMessage,
    options.visibleLiveChatMessages,
  ]);

  const commentsState = useMemo(() => buildCommentsStateSlice(options), [
    options.activeConversationComments,
    options.appendActiveConversationComment,
    options.replyActiveConversationComment,
  ]);

  const followUpState = useMemo(() => buildFollowUpStateSlice(options), [
    options.activeFollowUpAt,
    options.activeFollowUpNote,
    options.updateActiveConversationFollowUp,
  ]);

  const translationState = useMemo(() => buildTranslationStateSlice(options), [
    options.conversationAutoTranslateConfig,
    options.conversationTranslations,
    options.setConversationAutoTranslateEnabled,
    options.translatingConversationMessageIds,
  ]);

  return useMemo(() => ({
    selectedEmailState,
    activeConversationState,
    commentsState,
    followUpState,
    translationState,
  }), [
    activeConversationState,
    commentsState,
    followUpState,
    selectedEmailState,
    translationState,
  ]);
}
