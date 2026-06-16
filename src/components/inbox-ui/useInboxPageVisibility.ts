import type { UnifiedCommunicationConversation } from './inboxModel';

interface UseInboxPageVisibilityOptions {
  selectedEmailId: string | null;
  selectedWhatsAppPhone: string | null;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  isComposing: boolean;
  isStartingWhatsApp: boolean;
}

export function useInboxPageVisibility({
  selectedEmailId,
  selectedWhatsAppPhone,
  selectedTelegramConversation,
  selectedLiveChatConversation,
  isComposing,
  isStartingWhatsApp,
}: UseInboxPageVisibilityOptions) {
  const hasActiveConversation = !!(
    selectedEmailId
    || selectedWhatsAppPhone
    || selectedTelegramConversation
    || selectedLiveChatConversation
  );

  return {
    sidebarHidden: hasActiveConversation || isStartingWhatsApp,
    contentHidden: !hasActiveConversation && !isComposing && !isStartingWhatsApp,
  };
}
