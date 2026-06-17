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

  const translateTitle = isZh ? '发送前翻译' : 'Translate Before Send';
  const translateDescription = isZh
    ? '为当前 WhatsApp 号码保存目标语言与发送前翻译设置；原文仅保留在 CRM 内部。'
    : 'Save target language and translate-before-send for this WhatsApp number; originals remain inside CRM.';
  const targetLabel = isZh ? '目标语言' : 'Target';
  const savePreferredLanguageHint = hasActiveClient
    ? isZh
      ? '修改这里会同步保存客户偏好语言'
      : 'Changing this saves the client preferred language'
    : isZh
      ? '请先关联客户，再保存偏好语言'
      : 'Link a client before saving preferred language';

  const workspaceTitle = isZh ? 'WhatsApp 回复工作区' : 'WhatsApp reply workspace';
  const workspaceDescription = customerServiceAgentEnabled
    ? isZh
      ? '当前为 Agent 模式。你可以输入指导语，或留空让系统基于上下文自动回复。'
      : 'Agent mode is on. Add guidance, or leave it blank and let the system reply from context.'
    : isZh
      ? '支持附件、媒体素材、表情和定时发送，统一从这里完成 WhatsApp 跟进。'
      : 'Use attachments, media library, emoji, and scheduled send from one unified WhatsApp follow-up composer.';

  const placeholder = customerServiceAgentEnabled
    ? isZh
      ? 'Agent 模式：可输入指导语，或留空让系统基于上下文自动回复。'
      : 'Agent mode: optional guidance, or leave blank to auto-reply from context.'
    : typeMessageLabel;

  const helperText = customerServiceAgentEnabled
    ? isZh
      ? 'Agent 模式下，系统会结合客户上下文、产品信息与历史沟通来决定最终发送内容。'
      : 'In Agent mode, the system uses customer context, product information, and prior communication to determine the final reply.'
    : isZh
      ? '发送前请确认语气、语言和客户上下文已经对齐。'
      : 'Before sending, confirm tone, language, and customer context are aligned.';

  const sendCta = translatingOutbound
    ? (isZh ? '翻译中' : 'Translating')
    : customerServiceAgentEnabled
      ? scheduleEnabled
        ? (isZh ? 'Agent 定时发送' : 'Agent Schedule')
        : (isZh ? 'Agent 发送' : 'Agent Send')
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
            title={isZh ? `为 ${displayPhone} 保存发送前翻译设置` : `Save translate-before-send for ${displayPhone}`}
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
                {customerServiceAgentEnabled ? (isZh ? 'Agent 模式' : 'Agent mode') : (isZh ? '手动发送' : 'Manual send')}
              </ConversationToolbarPill>
              <ConversationToolbarPill tone="default">
                <Keyboard className="h-3 w-3" />
                {isZh ? 'Enter 发送' : 'Enter to send'}
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

              <button
                type="button"
                onClick={onToggleEmoji}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              >
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
