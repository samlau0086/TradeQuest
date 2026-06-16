import React from 'react';
import { Languages, Sparkles, User, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TelegramHeaderActionsProps {
  language: 'en' | 'zh';
  humanTakeover?: boolean;
  onToggleHumanTakeover: () => void;
}

export function TelegramHeaderActions({
  humanTakeover,
  onToggleHumanTakeover,
}: TelegramHeaderActionsProps) {
  return (
    <button
      type="button"
      onClick={onToggleHumanTakeover}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
        humanTakeover
          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
      )}
      title={humanTakeover ? 'Human takeover is active' : 'Telegram Agent auto-reply is enabled when the agent is active'}
    >
      {humanTakeover ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      {humanTakeover ? 'Human Takeover' : 'Agent Auto'}
    </button>
  );
}

interface TelegramHeaderMetaProps {
  language: 'en' | 'zh';
  isLinked: boolean;
  hasContactMethod: boolean;
  translateEnabled: boolean;
  humanTakeover?: boolean;
  chatId?: string;
  userId?: string;
  onToggleTranslate: () => void;
  onCreateLead: () => void;
  onAddToExistingClient: () => void;
}

export function TelegramHeaderMeta({
  isLinked,
  hasContactMethod,
  translateEnabled,
  humanTakeover,
  chatId,
  userId,
  onToggleTranslate,
  onCreateLead,
  onAddToExistingClient,
}: TelegramHeaderMetaProps) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleTranslate}
        className={cn(
          'flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold',
          translateEnabled
            ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
        )}
      >
        <Languages className="h-3 w-3" />
        {'Auto Translate'}
        <span className={cn('h-1.5 w-1.5 rounded-full', translateEnabled ? 'bg-cyan-400' : 'bg-slate-300')} />
      </button>
      {!isLinked && hasContactMethod && (
        <>
          <button onClick={onCreateLead} className="flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-cyan-700 transition hover:bg-cyan-100">
            <UserPlus className="h-3 w-3" /> New Lead
          </button>
          <button onClick={onAddToExistingClient} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 transition hover:bg-emerald-100">
            <User className="h-3 w-3" /> Add to Existing Client
          </button>
        </>
      )}
      {chatId && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">chat: {chatId}</span>}
      {userId && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">user: {userId}</span>}
      {humanTakeover && (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
          {'Agent paused'}
        </span>
      )}
    </>
  );
}
