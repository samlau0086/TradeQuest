import React from 'react';
import {
  CalendarClock,
  FileText,
  FolderOpen,
  Keyboard,
  Languages,
  Loader2,
  Paperclip,
  Send,
  Smile,
  Sparkles,
  X,
} from 'lucide-react';
import { MediaItem } from '../store';
import { ConversationContextRail } from './inbox-ui/ConversationContextRail';
import { ConversationSectionCard, ConversationSectionHeader } from './inbox-ui/ConversationSectionCard';
import { ConversationToolbarPill } from './inbox-ui/ConversationToolbar';

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
  language,
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
  const isZh = language === 'zh';

  const translateTitle = isZh ? '\u53d1\u9001\u524d\u7ffb\u8bd1' : 'Translate Before Send';
  const translateDescription = isZh
    ? '\u4e3a\u5f53\u524d WhatsApp \u53f7\u7801\u4fdd\u5b58\u76ee\u6807\u8bed\u8a00\u4e0e\u53d1\u9001\u524d\u7ffb\u8bd1\u8bbe\u7f6e\uff1b\u539f\u6587\u4ec5\u4fdd\u7559\u5728 CRM \u5185\u90e8\u3002'
    : 'Save target language and translate-before-send for this WhatsApp number; originals remain inside CRM.';
  const targetLabel = isZh ? '\u76ee\u6807\u8bed\u8a00' : 'Target';
  const savePreferredLanguageHint = hasActiveClient
    ? isZh
      ? '\u4fee\u6539\u8fd9\u91cc\u4f1a\u540c\u6b65\u4fdd\u5b58\u5ba2\u6237\u504f\u597d\u8bed\u8a00'
      : 'Changing this saves the client preferred language'
    : isZh
      ? '\u8bf7\u5148\u5173\u8054\u5ba2\u6237\uff0c\u518d\u4fdd\u5b58\u504f\u597d\u8bed\u8a00'
      : 'Link a client before saving preferred language';

  const workspaceTitle = isZh ? 'WhatsApp \u56de\u590d\u5de5\u4f5c\u533a' : 'WhatsApp reply workspace';
  const workspaceDescription = customerServiceAgentEnabled
    ? isZh
      ? '\u5f53\u524d\u4e3a Agent \u6a21\u5f0f\u3002\u4f60\u53ef\u4ee5\u8f93\u5165\u6307\u5bfc\u8bed\uff0c\u6216\u7559\u7a7a\u8ba9\u7cfb\u7edf\u57fa\u4e8e\u4e0a\u4e0b\u6587\u81ea\u52a8\u56de\u590d\u3002'
      : 'Agent mode is on. Add guidance, or leave it blank and let the system reply from context.'
    : isZh
      ? '\u652f\u6301\u9644\u4ef6\u3001\u5a92\u4f53\u7d20\u6750\u3001\u8868\u60c5\u548c\u5b9a\u65f6\u53d1\u9001\uff0c\u7edf\u4e00\u4ece\u8fd9\u91cc\u5b8c\u6210 WhatsApp \u8ddf\u8fdb\u3002'
      : 'Use attachments, media library, emoji, and scheduled send from one unified WhatsApp follow-up composer.';

  const placeholder = customerServiceAgentEnabled
    ? isZh
      ? 'Agent \u6a21\u5f0f\uff1a\u53ef\u8f93\u5165\u6307\u5bfc\u8bed\uff0c\u6216\u7559\u7a7a\u8ba9\u7cfb\u7edf\u57fa\u4e8e\u4e0a\u4e0b\u6587\u81ea\u52a8\u56de\u590d\u3002'
      : 'Agent mode: optional guidance, or leave blank to auto-reply from context.'
    : typeMessageLabel;

  const helperText = customerServiceAgentEnabled
    ? isZh
      ? 'Agent \u6a21\u5f0f\u4e0b\uff0c\u7cfb\u7edf\u4f1a\u7ed3\u5408\u5ba2\u6237\u4e0a\u4e0b\u6587\u3001\u4ea7\u54c1\u4fe1\u606f\u4e0e\u5386\u53f2\u6c9f\u901a\u6765\u51b3\u5b9a\u6700\u7ec8\u53d1\u9001\u5185\u5bb9\u3002'
      : 'In Agent mode, the system uses customer context, product information, and prior communication to determine the final reply.'
    : isZh
      ? '\u53d1\u9001\u524d\u8bf7\u786e\u8ba4\u8bed\u6c14\u3001\u8bed\u8a00\u548c\u5ba2\u6237\u4e0a\u4e0b\u6587\u5df2\u7ecf\u5bf9\u9f50\u3002'
      : 'Before sending, confirm tone, language, and customer context are aligned.';

  const sendCta = translatingOutbound
    ? isZh
      ? '\u7ffb\u8bd1\u4e2d'
      : 'Translating'
    : customerServiceAgentEnabled
      ? scheduleEnabled
        ? isZh
          ? 'Agent \u5b9a\u65f6\u53d1\u9001'
          : 'Agent Schedule'
        : isZh
          ? 'Agent \u53d1\u9001'
          : 'Agent Send'
      : scheduleEnabled
        ? scheduleLabel
        : sendLabel;

  return (
    <div className="space-y-3 border-t border-slate-200/80 bg-white/96 p-4">
      {(selectedFile || selectedMedia) && (
        <div className="grid gap-2 md:grid-cols-2">
          {selectedFile && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="flex min-w-0 items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-emerald-500" />
                <span className="truncate">{selectedFile.name}</span>
              </span>
              <button type="button" onClick={onClearSelectedFile} className="text-slate-400 hover:text-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {selectedMedia && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="flex min-w-0 items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-violet-500" />
                <span className="truncate">{selectedMedia.name}</span>
              </span>
              <button type="button" onClick={onClearSelectedMedia} className="text-slate-400 hover:text-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {showEmoji && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
          {emojiOptions.map(emoji => (
            <button key={emoji} type="button" onClick={() => onPickEmoji(emoji)} className="rounded p-1 text-xl hover:bg-white">
              {emoji}
            </button>
          ))}
        </div>
      )}

      {scheduleEnabled && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <CalendarClock className="h-4 w-4 text-amber-600" />
          <span className="text-slate-700">{sendLaterLabel}</span>
          <input
            type="datetime-local"
            value={scheduleDateTime}
            min={new Date().toISOString().slice(0, 16)}
            onChange={event => onScheduleDateTimeChange(event.target.value)}
            className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-slate-700 outline-none focus:border-amber-500"
          />
          <span className="text-xs text-slate-500">{retryHintLabel}</span>
        </div>
      )}

      <ConversationContextRail
        variant="panel"
        title={translateTitle}
        description={translateDescription}
        collapsible
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Languages className="h-4 w-4 text-cyan-500" />
            <span className="font-bold text-slate-800">{translateTitle}</span>
            <label className="flex items-center gap-1">
              <span>{targetLabel}</span>
              <select
                value={outboundAutoTranslateLanguage}
                disabled={!hasActiveClient}
                onChange={event => onTargetLanguageChange(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                title={savePreferredLanguageHint}
              >
                {outboundLanguageOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={onToggleOutboundAutoTranslate}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
              outboundAutoTranslateEnabled ? 'border-cyan-200 bg-cyan-100' : 'border-slate-200 bg-white'
            }`}
            title={isZh ? `\u4e3a ${displayPhone} \u4fdd\u5b58\u53d1\u9001\u524d\u7ffb\u8bd1\u8bbe\u7f6e` : `Save translate-before-send for ${displayPhone}`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                outboundAutoTranslateEnabled ? 'translate-x-5 border border-cyan-200' : 'translate-x-0 border border-slate-200'
              }`}
            />
          </button>
        </div>
      </ConversationContextRail>

      <ConversationSectionCard className="overflow-hidden">
        <ConversationSectionHeader
          title={workspaceTitle}
          icon={<Send className="h-4 w-4 text-emerald-500" />}
          description={workspaceDescription}
          actions={(
            <div className="flex flex-wrap items-center gap-1.5">
              <ConversationToolbarPill tone="success">
                {customerServiceAgentEnabled ? (isZh ? 'Agent \u6a21\u5f0f' : 'Agent mode') : (isZh ? '\u624b\u52a8\u53d1\u9001' : 'Manual send')}
              </ConversationToolbarPill>
              <ConversationToolbarPill tone="default">
                <Keyboard className="h-3 w-3" />
                {isZh ? 'Enter \u53d1\u9001' : 'Enter to send'}
              </ConversationToolbarPill>
            </div>
          )}
        />

        <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm">
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

              <button
                type="button"
                onClick={onOpenMediaSelector}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                title={selectFromMediaLibraryLabel}
              >
                <FolderOpen className="h-5 w-5" />
              </button>

              <button type="button" onClick={onToggleEmoji} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
                <Smile className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={onToggleSchedule}
                className={`rounded-lg p-2 ${
                  scheduleEnabled ? 'bg-amber-500 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title={scheduleMessageLabel}
              >
                <CalendarClock className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={onGenerate}
                disabled={generating || !canGenerate}
                className="rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-cyan-600 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                title={generateWithAiLabel}
              >
                {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <textarea
                value={body}
                onChange={event => onBodyChange(event.target.value)}
                placeholder={placeholder}
                className="min-h-[132px] flex-1 resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-emerald-500"
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (canSend) onSend();
                  }
                }}
              />

              <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[11px] leading-5 text-slate-500">{helperText}</div>

                <button
                  type="button"
                  onClick={onSend}
                  disabled={!canSend}
                  className="self-end rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
                >
                  <span className="inline-flex items-center gap-2">
                    {sending || translatingOutbound ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sendCta}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </ConversationSectionCard>
    </div>
  );
}
