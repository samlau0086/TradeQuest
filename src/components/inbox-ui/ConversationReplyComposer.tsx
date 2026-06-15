import React from 'react';
import { Loader2, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

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
    focus: 'focus:border-sky-500',
    button: 'bg-sky-600 hover:bg-sky-500',
  },
  violet: {
    focus: 'focus:border-violet-500',
    button: 'bg-violet-600 hover:bg-violet-500',
  },
};

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

  return (
    <div className="border-t border-slate-800 bg-slate-900/80 p-4">
      <div className="flex items-end gap-3">
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
            'min-h-[76px] flex-1 resize-none rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600',
            colors.focus
          )}
        />
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={isSending || !value.trim()}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white disabled:bg-slate-800 disabled:text-slate-500',
            colors.button
          )}
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {language === 'zh' ? '发送' : 'Send'}
        </button>
      </div>
      <div className="mt-2 text-[11px] text-slate-500">{helperText}</div>
    </div>
  );
}
