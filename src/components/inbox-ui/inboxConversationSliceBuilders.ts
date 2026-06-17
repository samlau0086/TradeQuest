import type {
  ActiveConversationStateSlice,
  CommentsStateSlice,
  FollowUpStateSlice,
  SelectedEmailStateSlice,
  TranslationStateSlice,
  UseInboxConversationSlicesOptions,
} from './useInboxConversationSliceTypes';

export function buildSelectedEmailStateSlice(options: UseInboxConversationSlicesOptions): SelectedEmailStateSlice {
  return {
    selectedEmail: options.selectedEmail,
    selectedEmailIsInbound: options.selectedEmailIsInbound,
    selectedEmailContactAddress: options.selectedEmailContactAddress,
    selectedEmailClient: options.selectedEmailClient,
    latestInboundEmailForSelectedClient: options.latestInboundEmailForSelectedClient,
    selectedEmailAgentContext: options.selectedEmailAgentContext,
    selectedTrackingEvents: options.selectedTrackingEvents,
    isTrackingExpanded: options.isTrackingExpanded,
    visibleTrackingEvents: options.visibleTrackingEvents,
    toggleTrackingExpanded: options.toggleTrackingExpanded,
  };
}

export function buildActiveConversationStateSlice(options: UseInboxConversationSlicesOptions): ActiveConversationStateSlice {
  return {
    activeWhatsAppConversation: options.activeWhatsAppConversation,
    activeWhatsAppClient: options.activeWhatsAppClient,
    activeWhatsAppFollowUp: options.activeWhatsAppFollowUp,
    activeTelegramClient: options.activeTelegramClient,
    activeTelegramContactMethod: options.activeTelegramContactMethod,
    activeTelegramDisplayName: options.activeTelegramDisplayName,
    activeTelegramTranslateEnabled: options.activeTelegramTranslateEnabled,
    activeTelegramTranslations: options.activeTelegramTranslations,
    activeTelegramAgentContext: options.activeTelegramAgentContext,
    activeLiveChatSession: options.activeLiveChatSession,
    activeLiveChatMessages: options.activeLiveChatMessages,
    activeLiveChatTranslateEnabled: options.activeLiveChatTranslateEnabled,
    activeLiveChatTranslations: options.activeLiveChatTranslations,
    visibleLiveChatMessages: options.visibleLiveChatMessages,
    activeLiveChatClient: options.activeLiveChatClient,
    activeLiveChatVisitorInfo: options.activeLiveChatVisitorInfo,
    latestLiveChatVisitorMessage: options.latestLiveChatVisitorMessage,
    activeLiveChatEvidenceItems: options.activeLiveChatEvidenceItems,
    activeLiveChatContactMethod: options.activeLiveChatContactMethod,
    activeLiveChatDisplayName: options.activeLiveChatDisplayName,
    activeLiveChatAgentContext: options.activeLiveChatAgentContext,
    activeLinkableContactMethod: options.activeLinkableContactMethod,
    activeLinkableDisplayName: options.activeLinkableDisplayName,
    activeUnifiedConversation: options.activeUnifiedConversation,
  };
}

export function buildCommentsStateSlice(options: UseInboxConversationSlicesOptions): CommentsStateSlice {
  return {
    activeConversationComments: options.activeConversationComments,
    appendActiveConversationComment: options.appendActiveConversationComment,
    replyActiveConversationComment: options.replyActiveConversationComment,
  };
}

export function buildFollowUpStateSlice(options: UseInboxConversationSlicesOptions): FollowUpStateSlice {
  return {
    activeFollowUpAt: options.activeFollowUpAt,
    activeFollowUpNote: options.activeFollowUpNote,
    updateActiveConversationFollowUp: options.updateActiveConversationFollowUp,
  };
}

export function buildTranslationStateSlice(options: UseInboxConversationSlicesOptions): TranslationStateSlice {
  return {
    conversationAutoTranslateConfig: options.conversationAutoTranslateConfig,
    conversationTranslations: options.conversationTranslations,
    translatingConversationMessageIds: options.translatingConversationMessageIds,
    setConversationAutoTranslateEnabled: options.setConversationAutoTranslateEnabled,
  };
}
