import React from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';

interface WhatsAppContactOptionView {
  key: string;
  clientId: string;
  clientName: string;
  clientCompany?: string;
  contactName: string;
  contactTitle?: string;
  phone: string;
}

interface StartWhatsAppConversationPaneProps {
  phone: string;
  contactOptions: WhatsAppContactOptionView[];
  onPhoneChange: (value: string) => void;
  onPhoneFocus: () => void;
  onSelectContact: (option: WhatsAppContactOptionView) => void;
  onStart: () => void;
  onCancel: () => void;
}

export function StartWhatsAppConversationPane({
  phone,
  contactOptions,
  onPhoneChange,
  onPhoneFocus,
  onSelectContact,
  onStart,
  onCancel,
}: StartWhatsAppConversationPaneProps) {
  const hasContactSearch = phone.includes('@');
  const canStart = Boolean(phone.replace(/[^0-9]/g, ''));

  return (
    <div className="flex-1 flex flex-col bg-slate-950/50">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/80">
        <button onClick={onCancel} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-green-950/50 border border-green-900/60 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <div className="font-bold text-white text-sm">New WhatsApp Message</div>
          <div className="text-[10px] text-slate-500">Start a WhatsApp conversation from Inbox</div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="relative">
            <label className="text-xs font-bold text-slate-500 uppercase">Phone Number or @Contact</label>
            <input
              value={phone}
              onChange={e => onPhoneChange(e.target.value)}
              onFocus={onPhoneFocus}
              onKeyDown={e => {
                if (e.key === 'Enter') onStart();
              }}
              placeholder="+1 555 000 0000 or @customer"
              className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-green-500"
              autoFocus
            />
            <div className="mt-2 text-[11px] text-slate-500">
              Type <span className="text-green-300">@</span> to choose a saved customer/contact WhatsApp number.
            </div>
            {contactOptions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 top-full mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
                {contactOptions.map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => onSelectContact(option)}
                    className="w-full text-left px-3 py-2.5 hover:bg-green-500/10 border-b border-slate-800 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-200 truncate">
                          {option.contactName}
                          {option.contactName !== option.clientName && (
                            <span className="ml-2 text-xs font-normal text-slate-500">({option.clientName})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {[option.contactTitle, option.clientCompany].filter(Boolean).join(' / ') || option.clientName}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-green-300 font-mono">{option.phone}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {hasContactSearch && contactOptions.length === 0 && (
              <div className="absolute z-30 left-0 right-0 top-full mt-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-xs text-slate-500 shadow-2xl">
                No saved WhatsApp contacts matched.
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={onStart}
              disabled={!canStart}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-sm font-bold text-white flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Start Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
