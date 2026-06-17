import { useMemo } from 'react';
import type { InboxContentPanelProps } from './InboxContentPanelTypes';

interface UseInboxContentPanelPropsParams {
  compose: Pick<
    InboxContentPanelProps,
    | 'isComposing'
    | 'composeDefaults'
    | 'setIsComposing'
    | 'isStartingWhatsApp'
    | 'setIsStartingWhatsApp'
    | 'newWhatsAppPhone'
    | 'visibleWhatsAppContactOptions'
    | 'setNewWhatsAppPhone'
    | 'setShowWhatsAppContactPicker'
    | 'selectedWhatsAppClientId'
    | 'setSelectedWhatsAppClientId'
    | 'selectWhatsAppContactOption'
    | 'startNewWhatsApp'
  >;
  telegram: Pick<
    InboxContentPanelProps,
    | 'selectedTelegramConversation'
    | 'activeTelegramClient'
    | 'activeTelegramContactMethod'
    | 'activeTelegramDisplayName'
    | 'activeTelegramTranslateEnabled'
    | 'activeTelegramTranslations'
    | 'activeTelegramAgentContext'
    | 'telegramMessages'
    | 'isTelegramMessagesLoading'
    | 'telegramReply'
    | 'isSendingTelegramReply'
    | 'setSelectedTelegramConversation'
    | 'setTelegramMessages'
    | 'toggleTelegramHumanTakeover'
    | 'draftTelegramReply'
    | 'setTelegramReply'
    | 'sendTelegramReply'
  >;
  liveChat: Pick<
    InboxContentPanelProps,
    | 'selectedLiveChatConversation'
    | 'activeLiveChatClient'
    | 'activeLiveChatContactMethod'
    | 'activeLiveChatSession'
    | 'activeLiveChatTranslateEnabled'
    | 'activeLiveChatTranslations'
    | 'activeLiveChatVisitorInfo'
    | 'activeLiveChatEvidenceItems'
    | 'activeLiveChatAgentContext'
    | 'visibleLiveChatMessages'
    | 'liveChatReply'
    | 'isSendingLiveChatReply'
    | 'isRunningLiveChatAgent'
    | 'latestLiveChatVisitorMessage'
    | 'liveChatEndRef'
    | 'setSelectedLiveChatConversation'
    | 'toggleLiveChatHumanTakeover'
    | 'runSelectedLiveChatAgent'
    | 'setLiveChatReply'
    | 'sendLiveChatReply'
  >;
  whatsapp: Pick<
    InboxContentPanelProps,
    | 'selectedWhatsAppPhone'
    | 'setSelectedWhatsAppPhone'
    | 'activeWhatsAppConversation'
    | 'activeWhatsAppClient'
    | 'handleDeleteWhatsAppConversation'
    | 'loadWhatsAppConversations'
  >;
  email: Pick<
    InboxContentPanelProps,
    | 'selectedEmail'
    | 'clients'
    | 'isInboundCustomerEmail'
    | 'addingToRag'
    | 'addedToRagId'
    | 'selectedTrackingEvents'
    | 'visibleTrackingEvents'
    | 'isTrackingExpanded'
    | 'selectedEmailAgentContext'
    | 'latestInboundEmailForSelectedClient'
    | 'selectEmail'
    | 'setComposeDefaults'
    | 'handleAddToRag'
    | 'toggleTrackingExpanded'
    | 'editEmail'
  >;
  shared: Pick<
    InboxContentPanelProps,
    | 'language'
    | 'currentUser'
    | 'translatingConversationMessageIds'
    | 'activeConversationComments'
    | 'commentText'
    | 'activeFollowUpAt'
    | 'activeFollowUpNote'
    | 'selectClient'
    | 'updateConversationOwnerStage'
    | 'setConfirmDialog'
    | 'deleteUnifiedConversation'
    | 'refreshUnifiedConversationData'
    | 'setConversationAutoTranslateEnabled'
    | 'handleCreateLead'
    | 'setIsAddingContactToClient'
    | 'patchUnifiedConversation'
    | 'applyUnifiedConversationUpdate'
    | 'appendActiveConversationComment'
    | 'updateActiveConversationFollowUp'
    | 'setCommentText'
    | 'replyActiveConversationComment'
    | 'activeUnifiedConversation'
    | 'commentAttachments'
    | 'setShowCommentAttachmentModal'
    | 'setCommentAttachments'
  >;
}

export function useInboxContentPanelProps({
  compose,
  telegram,
  liveChat,
  whatsapp,
  email,
  shared,
}: UseInboxContentPanelPropsParams): InboxContentPanelProps {
  return useMemo(() => ({
    ...compose,
    ...telegram,
    ...liveChat,
    ...whatsapp,
    ...email,
    ...shared,
  }), [compose, email, liveChat, shared, telegram, whatsapp]);
}
