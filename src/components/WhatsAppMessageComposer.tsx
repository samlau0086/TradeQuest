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
  return (
    <div className="p-4 border-t border-slate-800 space-y-3">
      {selectedFile && (
        <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
          <span className="truncate flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-400" />
            {selectedFile.name}
          </span>
          <button onClick={onClearSelectedFile} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectedMedia && (
        <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
          <span className="truncate flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            {selectedMedia.name}
          </span>
          <button onClick={onClearSelectedMedia} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showEmoji && (
        <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-700 rounded-lg p-2">
          {emojiOptions.map(emoji => (
            <button key={emoji} onClick={() => onPickEmoji(emoji)} className="text-xl hover:bg-slate-800 rounded p-1">
              {emoji}
            </button>
          ))}
        </div>
      )}

      {scheduleEnabled && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm">
          <CalendarClock className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400">{sendLaterLabel}</span>
          <input
            type="datetime-local"
            value={scheduleDateTime}
            min={new Date().toISOString().slice(0, 16)}
            onChange={event => onScheduleDateTimeChange(event.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 outline-none focus:border-amber-500"
          />
          <span className="text-xs text-slate-500">{retryHintLabel}</span>
        </div>
      )}

      <ConversationContextRail
        variant="rail"
        title={language === 'zh' ? '发送前翻译' : 'Translate Before Send'}
        description={language === 'zh'
          ? '按当前 WhatsApp 号码保存目标语言和发送前翻译开关，原文仅保存在 CRM 内。'
          : 'Save target language and translate-before-send for this WhatsApp number; originals stay inside CRM.'}
        collapsible
      >
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Languages className="h-4 w-4 text-cyan-300" />
            <span className="font-bold text-slate-200">{language === 'zh' ? '发送前翻译' : 'Translate before send'}</span>
            <label className="flex items-center gap-1">
              <span>{language === 'zh' ? '目标语言' : 'Target'}</span>
              <select
                value={outboundAutoTranslateLanguage}
                disabled={!hasActiveClient}
                onChange={event => onTargetLanguageChange(event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                title={hasActiveClient ? (language === 'zh' ? '修改后会同步保存为客户偏好语言' : 'Changing this saves the client preferred language') : (language === 'zh' ? '请先关联客户后再保存偏好语言' : 'Link a client before saving preferred language')}
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
                ? 'border-cyan-500/50 bg-cyan-500/30'
                : 'border-slate-700 bg-slate-900'
            }`}
            title={language === 'zh' ? `仅为 ${displayPhone} 保存发送前翻译开关` : `Save translate-before-send for ${displayPhone}`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${outboundAutoTranslateEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </ConversationContextRail>

      <div className="flex gap-3">
        <div className="flex flex-col gap-2">
          <label className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer">
            <Paperclip className="w-5 h-5" />
            <input
              type="file"
              className="hidden"
              onChange={event => onFileSelected(event.target.files?.[0] || null)}
            />
          </label>
          <button onClick={onOpenMediaSelector} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg" title={selectFromMediaLibraryLabel}>
            <FolderOpen className="w-5 h-5" />
          </button>
          <button onClick={onToggleEmoji} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">
            <Smile className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleSchedule}
            className={`p-2 rounded-lg ${scheduleEnabled ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
            title={scheduleMessageLabel}
          >
            <CalendarClock className="w-5 h-5" />
          </button>
          <button
            onClick={onGenerate}
            disabled={generating || !canGenerate}
            className="p-2 bg-cyan-900/50 hover:bg-cyan-800 disabled:bg-slate-800 disabled:text-slate-600 text-cyan-300 rounded-lg"
            title={generateWithAiLabel}
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          </button>
        </div>
        <textarea
          value={body}
          onChange={event => onBodyChange(event.target.value)}
          placeholder={customerServiceAgentEnabled ? 'Agent mode: optional guidance, or leave blank to auto-reply from context.' : typeMessageLabel}
          className="flex-1 min-h-16 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none resize-none focus:border-green-500"
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold text-white flex items-center gap-2 self-end"
        >
          {(sending || translatingOutbound) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {translatingOutbound
            ? (language === 'zh' ? '翻译中' : 'Translating')
            : customerServiceAgentEnabled ? (scheduleEnabled ? 'Agent Schedule' : 'Agent Send') : (scheduleEnabled ? scheduleLabel : sendLabel)}
        </button>
      </div>
    </div>
  );
}
