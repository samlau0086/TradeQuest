import React from 'react';
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Paperclip,
  Radar,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AddressInput } from '../AddressInput';

interface ComposeEmailHeaderProps {
  onClose: () => void;
}

export function ComposeEmailHeader({ onClose }: ComposeEmailHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/30 p-4">
      <h3 className="text-sm font-bold text-white">New Message</h3>
      <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );
}

interface ComposeEmailRecipientSectionProps {
  recipient: string;
  onRecipientChange: (value: string) => void;
  matchedClientName?: string;
  showCcBcc: boolean;
  onToggleCcBcc: () => void;
  cc: string;
  onCcChange: (value: string) => void;
  bcc: string;
  onBccChange: (value: string) => void;
  outboxConfigs: Array<{ id: string; name: string; fromEmail: string }>;
  selectedOutboxId: string;
  onSelectedOutboxIdChange: (value: string) => void;
  signatures: Array<{ id: string; name: string }>;
  selectedSignatureId: string;
  onSelectedSignatureIdChange: (value: string) => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  onOptimizeSubject: () => void;
  loadingSubject: boolean;
  language: 'en' | 'zh';
}

export function ComposeEmailRecipientSection({
  recipient,
  onRecipientChange,
  matchedClientName,
  showCcBcc,
  onToggleCcBcc,
  cc,
  onCcChange,
  bcc,
  onBccChange,
  outboxConfigs,
  selectedOutboxId,
  onSelectedOutboxIdChange,
  signatures,
  selectedSignatureId,
  onSelectedSignatureIdChange,
  subject,
  onSubjectChange,
  onOptimizeSubject,
  loadingSubject,
  language,
}: ComposeEmailRecipientSectionProps) {
  return (
    <div className="space-y-2 border-b border-slate-800 p-4">
      <div className="flex w-full items-start gap-3">
        <div className="w-full flex-1">
          <AddressInput
            label="To:"
            value={recipient}
            onChange={onRecipientChange}
            placeholder="Type email or @name"
            autoFocus
          />
        </div>
        <div className="shrink-0 flex items-center gap-2 pt-1.5">
          {matchedClientName && (
            <span className="whitespace-nowrap rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-cyan-400">
              Matched: {matchedClientName}
            </span>
          )}
          <button
            onClick={onToggleCcBcc}
            className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-white"
          >
            Cc/Bcc {showCcBcc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {showCcBcc && (
        <>
          <div className="w-full flex-1">
            <AddressInput
              label="Cc:"
              value={cc}
              onChange={onCcChange}
              placeholder="Type email or @name"
            />
          </div>
          <div className="w-full flex-1">
            <AddressInput
              label="Bcc:"
              value={bcc}
              onChange={onBccChange}
              placeholder="Type email or @name"
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3 border-t border-transparent pt-1 focus-within:border-indigo-500/30">
        <label className="w-12 text-right text-xs font-bold text-slate-500">From:</label>
        <select
          value={selectedOutboxId}
          onChange={(e) => onSelectedOutboxIdChange(e.target.value)}
          className="w-full flex-1 truncate bg-transparent pb-1 text-sm text-slate-200 focus:outline-none focus:ring-0"
        >
          {outboxConfigs.map((config) => (
            <option key={config.id} value={config.id} className="bg-slate-900">
              {config.name} ({config.fromEmail})
            </option>
          ))}
          {outboxConfigs.length === 0 && (
            <option value="" className="bg-slate-900">
              Default Backend Sender (me@soho.com)
            </option>
          )}
        </select>
      </div>

      <div className="flex items-center gap-3 border-t border-transparent pt-1 focus-within:border-indigo-500/30">
        <label className="w-12 text-right text-xs font-bold text-slate-500">Sign:</label>
        <select
          value={selectedSignatureId}
          onChange={(e) => onSelectedSignatureIdChange(e.target.value)}
          className="w-full flex-1 truncate bg-transparent pb-1 text-sm text-slate-200 focus:outline-none focus:ring-0"
        >
          <option value="" className="bg-slate-900">
            None
          </option>
          {signatures.map((signature) => (
            <option key={signature.id} value={signature.id} className="bg-slate-900">
              {signature.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 border-t border-transparent pt-1 focus-within:border-indigo-500/30">
        <label className="w-12 text-right text-xs font-bold text-slate-500">Subject:</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="flex-1 bg-transparent pb-1 text-sm font-medium text-slate-200 placeholder:text-slate-600 focus:outline-none"
          placeholder="Enter subject here..."
        />
        <button
          type="button"
          onClick={onOptimizeSubject}
          disabled={loadingSubject}
          className="rounded-md border border-blue-500/30 bg-blue-500/10 p-1.5 text-blue-300 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          title={language === 'zh' ? 'AI 鐢熸垚/浼樺寲涓婚' : 'Generate or improve subject with AI'}
        >
          {loadingSubject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

interface ComposeEmailAttachmentGalleryProps {
  attachments: File[];
  onRemove: (index: number) => void;
}

export function ComposeEmailAttachmentGallery({
  attachments,
  onRemove,
}: ComposeEmailAttachmentGalleryProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {attachments.map((attachment, index) => (
        <div
          key={`${attachment.name}-${attachment.size}-${index}`}
          className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-slate-800"
        >
          {attachment.type.startsWith('image/') ? (
            <img src={URL.createObjectURL(attachment)} alt={attachment.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-xs break-words text-slate-400">
              <Paperclip className="mb-2 h-5 w-5 text-slate-500" />
              <span className="line-clamp-2 w-full truncate">{attachment.name}</span>
              <span className="mt-1 text-[10px] text-slate-500">{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}
          <button
            onClick={() => onRemove(index)}
            className="absolute right-0 top-0 rounded-bl bg-red-500/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

interface ComposeEmailFooterProps {
  purpose: string;
  onPurposeChange: (value: string) => void;
  onGeneratePurpose: () => void;
  loadingPurpose: boolean;
  hasMatchedClient: boolean;
  onMagicDraft: () => void;
  loadingDraft: boolean;
  hasRecipient: boolean;
  onOpenAttachmentModal: () => void;
  trackEmail: boolean;
  onToggleTrackEmail: () => void;
  showSchedule: boolean;
  onToggleSchedule: () => void;
  canSchedule: boolean;
  scheduleDateTime: string;
  onScheduleDateTimeChange: (value: string) => void;
  timezone: string;
  onCancelSchedule: () => void;
  onConfirmSchedule: () => void;
  onSaveDraft: () => void;
  onSend: () => void;
  canSend: boolean;
}

export function ComposeEmailFooter({
  purpose,
  onPurposeChange,
  onGeneratePurpose,
  loadingPurpose,
  hasMatchedClient,
  onMagicDraft,
  loadingDraft,
  hasRecipient,
  onOpenAttachmentModal,
  trackEmail,
  onToggleTrackEmail,
  showSchedule,
  onToggleSchedule,
  canSchedule,
  scheduleDateTime,
  onScheduleDateTimeChange,
  timezone,
  onCancelSchedule,
  onConfirmSchedule,
  onSaveDraft,
  onSend,
  canSend,
}: ComposeEmailFooterProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-800 bg-slate-900 px-4 py-2">
      <div className="flex items-center justify-between pl-14">
        <label className="text-[10px] font-bold uppercase text-slate-500">Follow-up Purpose</label>
        <button
          onClick={onGeneratePurpose}
          disabled={loadingPurpose || !hasMatchedClient}
          className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
        >
          {loadingPurpose ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Auto-detect
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label className="w-12 text-right text-xs font-bold text-slate-500">Draft:</label>
        <input
          type="text"
          value={purpose}
          onChange={(e) => onPurposeChange(e.target.value)}
          className="flex-1 rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          placeholder="AI follow-up purpose (e.g., 'Remind them about the sample pricing')"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onMagicDraft}
            disabled={loadingDraft || !hasRecipient}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-cyan-400 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {loadingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI Draft Full Email
          </button>

          <button
            onClick={onOpenAttachmentModal}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            <span className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Attach
            </span>
          </button>

          <button
            onClick={onToggleTrackEmail}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              trackEmail
                ? 'border-emerald-800 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/50'
                : 'border-slate-700 bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-400',
            )}
            title={trackEmail ? 'Email tracking enabled' : 'Email tracking disabled'}
          >
            <Radar className="h-3.5 w-3.5" />
            Track
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={onToggleSchedule}
              disabled={!canSchedule}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 shadow-lg transition-colors hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
              title="Schedule Send"
            >
              <CalendarClock className="h-4 w-4" />
            </button>
            {showSchedule && (
              <div className="absolute bottom-full right-0 z-20 mb-2 flex w-64 flex-col gap-2 rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400">Select Date & Time</label>
                  <span
                    className="overflow-hidden text-ellipsis whitespace-nowrap pl-2 text-right text-[10px] text-slate-500"
                    title={timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  >
                    {timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => onScheduleDateTimeChange(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none [color-scheme:dark]"
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                />
                <div className="mt-1 flex gap-2">
                  <button onClick={onCancelSchedule} className="flex-1 py-1 text-xs text-slate-400 transition-colors hover:text-white">
                    Cancel
                  </button>
                  <button
                    onClick={onConfirmSchedule}
                    disabled={!scheduleDateTime}
                    className="flex-1 rounded bg-cyan-600 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onSaveDraft}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={onSend}
            disabled={!canSend}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-600/20 transition-colors hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500"
          >
            <Send className="h-4 w-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
