import { Inbox, Mail, MessageCircle, Sparkles } from 'lucide-react';
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
    <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,122,89,0.18),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/95 p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff7a59] text-white shadow-sm">
            <Inbox className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Workspace Ready
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Select a conversation to start working
            </h2>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Review incoming email, WhatsApp, Live Chat, and Telegram conversations from one place, then move straight into drafting, tagging, follow-up, and customer context.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Mail className="mb-3 h-5 w-5 text-cyan-500" />
            <div className="text-sm font-semibold text-slate-900">Email workflows</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              Open inbox threads, draft replies, and manage follow-up actions.
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <MessageCircle className="mb-3 h-5 w-5 text-emerald-500" />
            <div className="text-sm font-semibold text-slate-900">Messaging channels</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              Handle WhatsApp, Live Chat, and Telegram inside the same queue.
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Sparkles className="mb-3 h-5 w-5 text-amber-500" />
            <div className="text-sm font-semibold text-slate-900">AI context</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              Use customer summaries, RAG memory, and next-step suggestions without leaving the conversation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
