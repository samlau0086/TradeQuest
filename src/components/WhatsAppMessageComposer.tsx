import React from 'react';
import { CalendarClock, FileText, FolderOpen, Languages, Loader2, Paperclip, Send, Smile, Sparkles, X } from 'lucide-react';
import { MediaItem } from '../store';
import { ConversationContextRail } from './inbox-ui/ConversationContextRail';

interface WhatsAppMessageComposerProps {
  language: 'en' | 'zh';
  displayPhone: string;
  selectedFile: File | null;
  selectedMedia: MediaItem | null;
  showEmoji: boolean;
  emojiOptions: string[];
  scheduleEnabled: boolean;
  scheduleDateTime: string;
  outboundAutoTranslateLanguage: string;
  outboundLanguageOptions: string[];
  hasActiveClient: boolean;
  outboundAutoTranslateEnabled: boolean;
  body: string;
  customerServiceAgentEnabled: boolean;
  generating: boolean;
  sending: boolean;
  translatingOutbound: boolean;
  canSend: boolean;
  canGenerate: boolean;
  sendLaterLabel: string;
  retryHintLabel: string;
  selectFromMediaLibraryLabel: string;
  scheduleMessageLabel: string;
  generateWithAiLabel: string;
  typeMessageLabel: string;
  scheduleLabel: string;
  sendLabel: string;
  onClearSelectedFile: () => void;
  onClearSelectedMedia: () => void;
  onFileSelected: (file: File | null) => void;
  onOpenMediaSelector: () => void;
  onToggleEmoji: () => void;
  onPickEmoji: (emoji: string) => void;
  onToggleSchedule: () => void;
  onScheduleDateTimeChange: (value: string) => void;
  onTargetLanguageChange: (value: string) => void;
  onToggleOutboundAutoTranslate: () => void;
  onBodyChange: (value: string) => void;
  onGenerate: () => void;
  onSend: () => void;
}

export function WhatsAppMessageComposer({
  displayPhone,
  selectedFile,
  selectedMedia,
  showEmoji,
  emojiOptions,
  scheduleEnabled,
  scheduleDateTime,
  outboundAutoTranslateLanguage,
  outboundLanguageOptions,
  hasActiveClient,
  outboundAutoTranslateEnabled,
  body,
  customerServiceAgentEnabled,
  generating,
  sending,
  translatingOutbound,
  canSend,
  canGenerate,
  sendLaterLabel,
  retryHintLabel,
  selectFromMediaLibraryLabel,
  scheduleMessageLabel,
  generateWithAiLabel,
  typeMessageLabel,
  scheduleLabel,
  sendLabel,
  onClearSelectedFile,
  onClearSelectedMedia,
  onFileSelected,
  onOpenMediaSelector,
  onToggleEmoji,
  onPickEmoji,
  onToggleSchedule,
  onScheduleDateTimeChange,
  onTargetLanguageChange,
  onToggleOutboundAutoTranslate,
  onBodyChange,
  onGenerate,
  onSend,
}: WhatsAppMessageComposerProps) {
  return (
    <div className="space-y-3 border-t border-slate-200 bg-white p-4">
      {selectedFile && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="flex truncate items-center gap-2">
            <FileText className="h-4 w-4 text-green-500" />
            {selectedFile.name}
          </span>
          <button onClick={onClearSelectedFile} className="text-slate-400 hover:text-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {selectedMedia && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="flex truncate items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" />
            {selectedMedia.name}
          </span>
          <button onClick={onClearSelectedMedia} className="text-slate-400 hover:text-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showEmoji && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
          {emojiOptions.map(emoji => (
            <button key={emoji} onClick={() => onPickEmoji(emoji)} className="rounded p-1 text-xl hover:bg-white">
              {emoji}
            </button>
          ))}
        </div>
      )}

      {scheduleEnabled && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <CalendarClock className="h-4 w-4 text-amber-500" />
          <span className="text-slate-500">{sendLaterLabel}</span>
          <input
            type="datetime-local"
            value={scheduleDateTime}
            min={new Date().toISOString().slice(0, 16)}
            onChange={event => onScheduleDateTimeChange(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 outline-none focus:border-amber-500"
          />
          <span className="text-xs text-slate-500">{retryHintLabel}</span>
        </div>
      )}

      <ConversationContextRail
        variant="panel"
        title="Translate Before Send"
        description="Save target language and translate-before-send for this WhatsApp number; originals stay inside CRM."
        collapsible
      >
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Languages className="h-4 w-4 text-cyan-500" />
            <span className="font-bold text-slate-800">Translate before send</span>
            <label className="flex items-center gap-1">
              <span>Target</span>
              <select
                value={outboundAutoTranslateLanguage}
                disabled={!hasActiveClient}
                onChange={event => onTargetLanguageChange(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                title={hasActiveClient ? 'Changing this saves the client preferred language' : 'Link a client before saving preferred language'}
              >
                {outboundLanguageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={onToggleOutboundAutoTranslate}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
              outboundAutoTranslateEnabled
                ? 'border-cyan-200 bg-cyan-100'
                : 'border-slate-200 bg-white'
            }`}
            title={`Save translate-before-send for ${displayPhone}`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${outboundAutoTranslateEnabled ? 'translate-x-5 border border-cyan-200' : 'translate-x-0 border border-slate-200'}`} />
          </button>
        </div>
      </ConversationContextRail>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        <div className="flex gap-3">
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <Paperclip className="h-5 w-5" />
              <input
                type="file"
                className="hidden"
                onChange={event => onFileSelected(event.target.files?.[0] || null)}
              />
            </label>
            <button onClick={onOpenMediaSelector} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" title={selectFromMediaLibraryLabel}>
              <FolderOpen className="h-5 w-5" />
            </button>
            <button onClick={onToggleEmoji} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <Smile className="h-5 w-5" />
            </button>
            <button
              onClick={onToggleSchedule}
              className={`rounded-lg p-2 ${scheduleEnabled ? 'bg-amber-500 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              title={scheduleMessageLabel}
            >
              <CalendarClock className="h-5 w-5" />
            </button>
            <button
              onClick={onGenerate}
              disabled={generating || !canGenerate}
              className="rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-cyan-600 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              title={generateWithAiLabel}
            >
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            </button>
          </div>

          <textarea
            value={body}
            onChange={event => onBodyChange(event.target.value)}
            placeholder={customerServiceAgentEnabled ? 'Agent mode: optional guidance, or leave blank to auto-reply from context.' : typeMessageLabel}
            className="min-h-20 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-500"
          />

          <button
            onClick={onSend}
            disabled={!canSend}
            className="self-end rounded-xl bg-green-600 px-4 py-2 font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
          >
            <span className="inline-flex items-center gap-2">
              {(sending || translatingOutbound) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {translatingOutbound ? 'Translating' : customerServiceAgentEnabled ? (scheduleEnabled ? 'Agent Schedule' : 'Agent Send') : (scheduleEnabled ? scheduleLabel : sendLabel)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
