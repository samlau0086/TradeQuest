import type { InboxPageShellAssemblyInputs, UseInboxPageShellInputsOptions } from './useInboxPageShellInputTypes';

export function buildInboxVisibilityInputs(
  options: UseInboxPageShellInputsOptions,
): InboxPageShellAssemblyInputs['visibility'] {
  return {
    selectedEmailId: options.selectedEmailId,
    selectedWhatsAppPhone: options.selectedWhatsAppPhone,
    selectedTelegramConversation: options.selectedTelegramConversation,
    selectedLiveChatConversation: options.selectedLiveChatConversation,
    isComposing: options.isComposing,
    isStartingWhatsApp: options.isStartingWhatsApp,
  };
}
