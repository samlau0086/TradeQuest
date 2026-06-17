import React from 'react';
import { Keyboard, Loader2, Send, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConversationToolbarPill } from './ConversationToolbar';

interface ConversationReplyComposerProps {
  language: 'en' | 'zh';
  value: string;
  isSending: boolean;
  placeholder: string;
  helperText: string;
  accent: 'sky' | 'violet';
  onChange: (value: string) => void;
  onSend: () => void | Promise<void>;
}

const accentClasses = {
  sky: {
    focus: 'focus:border-sky-500 focus:ring-sky-100',
    button: 'bg-sky-600 hover:bg-sky-500',
    surface: 'border-sky-100 bg-sky-50/55',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    pill: 'sky' as const,
  },
  violet: {
    focus: 'focus:border-violet-500 focus:ring-violet-100',
    button: 'bg-violet-600 hover:bg-violet-500',
    surface: 'border-violet-100 bg-violet-50/55',
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    pill: 'violet' as const,
  },
} as const;

export function ConversationReplyComposer({
  language,
  value,
  isSending,
  placeholder,
  helperText,
  accent,
  onChange,
  onSend,
}: ConversationReplyComposerProps) {
  const colors = accentClasses[accent];
  const isZh = language === 'zh';

  return (
    <div className="bg-transparent px-5 pb-5 pt-3">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/96 p-4 shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {isZh ? '回复工作区' : 'Reply workspace'}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {isZh ? '准备下一条外发消息' : 'Prepare the next outbound message'}
            </div>
            <div className="mt-1 max-w-3xl text-xs leading-6 text-slate-500">
              {helperText}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <ConversationToolbarPill tone={colors.pill}>
              <Sparkles className="h-3 w-3" />
              {isZh ? '统一回复器' : 'Unified composer'}
            </ConversationToolbarPill>
            <div className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold', colors.badge)}>
              <Keyboard className="h-3 w-3" />
              {isZh ? 'Ctrl / Cmd + Enter 发送' : 'Ctrl / Cmd + Enter to send'}
            </div>
          </div>
        </div>

        <div className={cn('rounded-[24px] border p-4', colors.surface)}>
          <textarea
            value={value}
            onChange={event => onChange(event.target.value)}
            onKeyDown={event => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                void onSend();
              }
            }}
            placeholder={placeholder}
            className={cn(
              'min-h-[144px] w-full resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2',
              colors.focus,
            )}
          />

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] leading-5 text-slate-500">
              {isZh
                ? '发送前请确认语气、语言和客户上下文已经对齐。'
                : 'Before sending, confirm tone, language, and customer context are aligned.'}
            </div>

            <button
              type="button"
              onClick={() => void onSend()}
              disabled={isSending || !value.trim()}
              className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition disabled:bg-slate-200 disabled:text-slate-500 sm:min-w-[152px]',
                colors.button,
              )}
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isZh ? '发送回复' : 'Send reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
