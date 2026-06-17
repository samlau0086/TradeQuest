import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, PencilLine, XCircle } from 'lucide-react';
import {
  ConversationToolbarButton,
  ConversationToolbarField,
  ConversationToolbarGroup,
  ConversationToolbarPill,
  type ToolbarTone,
} from './ConversationToolbar';

interface ConversationFollowUpStripProps {
  language: string;
  dueAt?: string | null;
  note?: string | null;
  disabled?: boolean;
  actions?: React.ReactNode;
  onSet?: (dueAt: string, note: string) => void | Promise<void>;
  onClear?: () => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
}

export function ConversationFollowUpStrip({
  language,
  dueAt,
  note,
  disabled,
  actions,
  onSet,
  onClear,
  onComplete,
}: ConversationFollowUpStripProps) {
  const isZh = language === 'zh';
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
    setDraftAt(
      toLocalValue(dueAt) ||
        toLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()),
    );
    setDraftNote(note || '');
    setEditing(true);
  };

  const dueTone: ToolbarTone = dueAt ? (isPastDue ? 'danger' : 'success') : 'default';
  const dueLabel = dueAt
    ? `${isZh ? '\u5f85\u8ddf\u8fdb' : 'Follow-up'}: ${new Date(dueAt).toLocaleString()}`
    : (isZh ? '\u5f53\u524d\u4f1a\u8bdd\u5c1a\u672a\u8bbe\u7f6e\u5f85\u8ddf\u8fdb\u3002' : 'No follow-up reminder is set for this conversation.');

  return (
    <div className="border-b border-slate-200/80 bg-[#f6f8fb]/96 px-4 pb-3 backdrop-blur-sm md:px-5">
      <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {isZh ? '\u6267\u884c\u8282\u594f' : 'Execution rhythm'}
              </div>
              <ConversationToolbarGroup className="gap-2">
                <ConversationToolbarPill tone={dueTone}>
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>{dueLabel}</span>
                </ConversationToolbarPill>
                {dueAt && (
                  <ConversationToolbarPill tone={isPastDue ? 'danger' : 'success'}>
                    {isPastDue ? (isZh ? '\u5df2\u903e\u671f' : 'Overdue') : (isZh ? '\u8fdb\u884c\u4e2d' : 'Open')}
                  </ConversationToolbarPill>
                )}
                {note && (
                  <ConversationToolbarPill>
                    <span>{note}</span>
                  </ConversationToolbarPill>
                )}
              </ConversationToolbarGroup>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ConversationToolbarButton
                type="button"
                onClick={openEditor}
                disabled={disabled || !onSet}
                tone={dueAt ? 'info' : 'success'}
                compact
              >
                <PencilLine className="h-3.5 w-3.5" />
                <span>{dueAt ? (isZh ? '\u4fee\u6539\u8ddf\u8fdb' : 'Edit follow-up') : (isZh ? '\u8bbe\u4e3a\u5f85\u8ddf\u8fdb' : 'Set follow-up')}</span>
              </ConversationToolbarButton>

              {dueAt && (
                <>
                  <ConversationToolbarButton
                    type="button"
                    onClick={() => void onComplete?.()}
                    disabled={disabled || !onComplete}
                    tone="info"
                    compact
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isZh ? '\u5b8c\u6210' : 'Complete'}</span>
                  </ConversationToolbarButton>
                  <ConversationToolbarButton
                    type="button"
                    onClick={() => void onClear?.()}
                    disabled={disabled || !onClear}
                    tone="default"
                    compact
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{isZh ? '\u6e05\u9664' : 'Clear'}</span>
                  </ConversationToolbarButton>
                </>
              )}

              {actions}
            </div>
          </div>

          {editing && (
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {isZh ? '\u7f16\u8f91\u5f85\u8ddf\u8fdb' : 'Edit follow-up'}
              </div>
              <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_auto_auto]">
                <ConversationToolbarField
                  label={isZh ? '\u65f6\u95f4' : 'Due at'}
                  className="min-w-0 bg-white"
                >
                  <input
                    type="datetime-local"
                    value={draftAt}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={event => setDraftAt(event.target.value)}
                    className="w-full min-w-0 bg-transparent text-xs font-semibold text-slate-700 outline-none"
                  />
                </ConversationToolbarField>
                <ConversationToolbarField
                  label={isZh ? '\u5907\u6ce8' : 'Note'}
                  className="min-w-0 bg-white"
                >
                  <input
                    value={draftNote}
                    onChange={event => setDraftNote(event.target.value)}
                    placeholder={isZh ? '\u8ddf\u8fdb\u5907\u6ce8' : 'Follow-up note'}
                    className="w-full min-w-0 bg-transparent text-xs font-semibold text-slate-700 outline-none"
                  />
                </ConversationToolbarField>
                <div className="flex items-end">
                  <ConversationToolbarButton
                    type="button"
                    onClick={async () => {
                      if (!draftAt || !onSet) return;
                      await onSet(new Date(draftAt).toISOString(), draftNote);
                      setEditing(false);
                    }}
                    tone="success"
                    className="w-full justify-center xl:w-auto"
                  >
                    <Clock3 className="h-4 w-4" />
                    <span>{isZh ? '\u4fdd\u5b58' : 'Save'}</span>
                  </ConversationToolbarButton>
                </div>
                <div className="flex items-end">
                  <ConversationToolbarButton
                    type="button"
                    onClick={() => setEditing(false)}
                    tone="default"
                    className="w-full justify-center xl:w-auto"
                  >
                    <span>{isZh ? '\u5173\u95ed' : 'Close'}</span>
                  </ConversationToolbarButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
