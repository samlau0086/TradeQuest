import React, { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConversationFollowUpStripProps {
  language: string;
  dueAt?: string | null;
  note?: string | null;
  disabled?: boolean;
  onSet?: (dueAt: string, note: string) => void | Promise<void>;
  onClear?: () => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
}

export function ConversationFollowUpStrip({
  language,
  dueAt,
  note,
  disabled,
  onSet,
  onClear,
  onComplete
}: ConversationFollowUpStripProps) {
  const [editing, setEditing] = useState(false);
  const [draftAt, setDraftAt] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const isPastDue = dueAt ? new Date(dueAt).getTime() < Date.now() : false;
  const toLocalValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };
  const openEditor = () => {
    setDraftAt(toLocalValue(dueAt) || toLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()));
    setDraftNote(note || '');
    setEditing(true);
  };

  return (
    <div className="border-b border-slate-800 bg-slate-950/70 px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <CalendarClock className={cn("h-4 w-4", dueAt ? (isPastDue ? 'text-red-300' : 'text-emerald-300') : 'text-slate-500')} />
          {dueAt ? (
            <div className="min-w-0">
              <span className={cn("font-bold", isPastDue ? 'text-red-300' : 'text-emerald-300')}>
                {language === 'zh' ? '待跟进' : 'Follow-up'}: {new Date(dueAt).toLocaleString()}
              </span>
              {note && <span className="ml-2 text-slate-500">{note}</span>}
            </div>
          ) : (
            <span className="text-slate-500">{language === 'zh' ? '当前会话未设置待跟进。' : 'No follow-up reminder is set for this conversation.'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openEditor}
            disabled={disabled || !onSet}
            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {dueAt ? (language === 'zh' ? '修改' : 'Edit') : (language === 'zh' ? '设为待跟进' : 'Set follow-up')}
          </button>
          {dueAt && (
            <>
              <button
                type="button"
                onClick={() => onComplete?.()}
                disabled={disabled || !onComplete}
                className="rounded border border-blue-500/30 px-2 py-1 text-[10px] font-bold text-blue-200 hover:bg-blue-500/10 disabled:opacity-50"
              >
                {language === 'zh' ? '完成' : 'Complete'}
              </button>
              <button
                type="button"
                onClick={() => onClear?.()}
                disabled={disabled || !onClear}
                className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 disabled:opacity-50"
              >
                {language === 'zh' ? '取消' : 'Clear'}
              </button>
            </>
          )}
        </div>
      </div>
      {editing && (
        <div className="mt-2 grid gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2 sm:grid-cols-[180px_1fr_auto_auto]">
          <input
            type="datetime-local"
            value={draftAt}
            min={new Date().toISOString().slice(0, 16)}
            onChange={event => setDraftAt(event.target.value)}
            className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
          />
          <input
            value={draftNote}
            onChange={event => setDraftNote(event.target.value)}
            placeholder={language === 'zh' ? '跟进备注' : 'Follow-up note'}
            className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={async () => {
              if (!draftAt || !onSet) return;
              await onSet(new Date(draftAt).toISOString(), draftNote);
              setEditing(false);
            }}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
          >
            {language === 'zh' ? '保存' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200"
          >
            {language === 'zh' ? '关闭' : 'Close'}
          </button>
        </div>
      )}
    </div>
  );
}
