import { ComposeEmail } from './ComposeEmail';
import { InboxSelectedDetailPanel } from './InboxSelectedDetailPanel';
import { InboxWorkspaceEmptyState } from './InboxWorkspaceEmptyState';
import { StartWhatsAppConversationPane } from './StartWhatsAppConversationPane';
import type { InboxContentPanelProps } from './InboxContentPanelTypes';

export function InboxContentPanel(props: InboxContentPanelProps) {
  const {
    isComposing,
    composeDefaults,
    setIsComposing,
    isStartingWhatsApp,
    setIsStartingWhatsApp,
    newWhatsAppPhone,
    visibleWhatsAppContactOptions,
    setNewWhatsAppPhone,
    setShowWhatsAppContactPicker,
    selectedWhatsAppClientId,
    setSelectedWhatsAppClientId,
    selectWhatsAppContactOption,
    startNewWhatsApp,
    selectedTelegramConversation,
    selectedLiveChatConversation,
    selectedWhatsAppPhone,
    selectedEmail,
    language,
  } = props;

  if (isComposing) {
    return (
      <ComposeEmail
        onClose={() => setIsComposing(false)}
        initialRecipient={composeDefaults?.recipient}
        initialSubject={composeDefaults?.subject}
        initialBody={composeDefaults?.initialBody}
        originalEmailBody={composeDefaults?.originalEmailBody}
        draftId={composeDefaults?.draftId}
        replyToEmailId={composeDefaults?.replyToEmailId}
        initialOutboxId={composeDefaults?.initialOutboxId}
      />
    );
  }

  if (isStartingWhatsApp) {
    return (
      <StartWhatsAppConversationPane
        phone={newWhatsAppPhone}
        contactOptions={visibleWhatsAppContactOptions}
        onPhoneChange={(value) => {
          setNewWhatsAppPhone(value);
          if (value.includes('@')) setShowWhatsAppContactPicker(true);
          if (selectedWhatsAppClientId && value.replace(/[^0-9]/g, '') !== newWhatsAppPhone.replace(/[^0-9]/g, '')) {
            setSelectedWhatsAppClientId(null);
          }
        }}
        onPhoneFocus={() => setShowWhatsAppContactPicker(newWhatsAppPhone.includes('@'))}
        onSelectContact={selectWhatsAppContactOption}
        onStart={startNewWhatsApp}
        onCancel={() => {
          setIsStartingWhatsApp(false);
          setShowWhatsAppContactPicker(false);
        }}
      />
    );
  }

  if (selectedTelegramConversation || selectedLiveChatConversation || selectedWhatsAppPhone || selectedEmail) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <InboxSelectedDetailPanel {...props} />
      </div>
    );
  }

  return <InboxWorkspaceEmptyState language={language} />;
}
