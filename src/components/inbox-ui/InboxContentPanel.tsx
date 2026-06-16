import { Mail } from 'lucide-react';
import { ComposeEmail } from './ComposeEmail';
import { InboxSelectedDetailPanel } from './InboxSelectedDetailPanel';
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
    return <InboxSelectedDetailPanel {...props} />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
      <Mail className="w-12 h-12 mb-4 opacity-20" />
      <p className="text-sm">Select an email to read or create a new one.</p>
    </div>
  );
}
