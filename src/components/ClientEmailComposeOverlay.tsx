import React from 'react';
import { Maximize2 } from 'lucide-react';
import { ComposeEmail } from './Inbox';

interface ClientEmailComposeOverlayProps {
  language: string;
  recipient: string;
  subject: string;
  initialBody: string;
  onClose: () => void;
  onOpenInInbox: () => void;
}

export function ClientEmailComposeOverlay({
  language,
  recipient,
  subject,
  initialBody,
  onClose,
  onOpenInInbox
}: ClientEmailComposeOverlayProps) {
  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-0 md:right-8 w-full md:max-w-[550px] h-[100dvh] md:h-[600px] shadow-2xl z-50 md:rounded-t-xl overflow-hidden md:border-t md:border-l md:border-r border-slate-700 bg-slate-900 flex flex-col">
      <button
        type="button"
        onClick={onOpenInInbox}
        className="absolute right-12 top-2 z-10 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
        title={language === 'zh' ? '在收件箱中打开' : 'Open in inbox'}
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <ComposeEmail
        onClose={onClose}
        initialRecipient={recipient}
        initialSubject={subject}
        initialBody={initialBody}
        className="rounded-none border-none shadow-none h-full"
      />
    </div>
  );
}
