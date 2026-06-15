import React from 'react';
import { Languages, Sparkles, User, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TelegramHeaderActionsProps {
  language: 'en' | 'zh';
  humanTakeover?: boolean;
  onToggleHumanTakeover: () => void;
}

export function TelegramHeaderActions({
  language,
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
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
          : 'border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20'
      )}
      title={humanTakeover ? 'Human takeover is active' : 'Telegram Agent auto-reply is enabled when the agent is active'}
    >
      {humanTakeover ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      {humanTakeover
        ? (language === 'zh' ? '人工接管' : 'Human Takeover')
        : (language === 'zh' ? 'Agent 自动' : 'Agent Auto')}
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
  language,
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
          'text-xs flex items-center gap-1 rounded border px-1.5 py-0.5',
          translateEnabled
            ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
            : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200'
        )}
      >
        <Languages className="w-3 h-3" />
        {language === 'zh' ? '自动翻译' : 'Auto Translate'}
        <span className={cn('h-1.5 w-1.5 rounded-full', translateEnabled ? 'bg-cyan-300' : 'bg-slate-600')} />
      </button>
      {!isLinked && hasContactMethod && (
        <>
          <button onClick={onCreateLead} className="text-cyan-500 flex items-center gap-1 hover:text-cyan-400 bg-slate-800/50 rounded px-1.5 py-0.5">
            <UserPlus className="w-3 h-3" /> New Lead
          </button>
          <button onClick={onAddToExistingClient} className="text-emerald-400 flex items-center gap-1 hover:text-emerald-300 bg-slate-800/50 rounded px-1.5 py-0.5">
            <User className="w-3 h-3" /> Add to Existing Client
          </button>
        </>
      )}
      {chatId && (
        <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">chat: {chatId}</span>
      )}
      {userId && (
        <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">user: {userId}</span>
      )}
      {humanTakeover && (
        <span className="bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-700/40 text-amber-200">
          {language === 'zh' ? 'Agent 已暂停' : 'Agent paused'}
        </span>
      )}
    </>
  );
}
