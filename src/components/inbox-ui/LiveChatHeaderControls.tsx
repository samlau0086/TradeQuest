import React from 'react';
import { Languages, Loader2, Sparkles, User, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LiveChatHeaderActionsProps {
  language: 'en' | 'zh';
  humanTakeover?: boolean;
  isRunningAgent: boolean;
  onToggleHumanTakeover: () => void;
  onRunAgent: () => void | Promise<void>;
}

export function LiveChatHeaderActions({
  language,
  humanTakeover,
  isRunningAgent,
  onToggleHumanTakeover,
  onRunAgent,
}: LiveChatHeaderActionsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleHumanTakeover}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
          humanTakeover
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
            : 'border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20'
        )}
      >
        {humanTakeover ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {humanTakeover
          ? (language === 'zh' ? '人工接管' : 'Human Takeover')
          : (language === 'zh' ? 'Agent 自动' : 'Agent Auto')}
      </button>
      <button
        type="button"
        onClick={() => void onRunAgent()}
        disabled={isRunningAgent}
        className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
      >
        {isRunningAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {language === 'zh' ? '运行 Agent' : 'Run Agent'}
      </button>
    </>
  );
}

interface LiveChatHeaderMetaProps {
  language: 'en' | 'zh';
  isLinked: boolean;
  hasContactMethod: boolean;
  translateEnabled: boolean;
  visitorEmail?: string;
  visitorPhone?: string;
  pageUrl?: string;
  visitorInfo?: {
    ip?: string;
    browserName?: string;
    browserVersion?: string;
    os?: string;
  };
  onToggleTranslate: () => void;
  onCreateLead: () => void;
  onAddToExistingClient: () => void;
}

export function LiveChatHeaderMeta({
  language,
  isLinked,
  hasContactMethod,
  translateEnabled,
  visitorEmail,
  visitorPhone,
  pageUrl,
  visitorInfo = {},
  onToggleTranslate,
  onCreateLead,
  onAddToExistingClient,
}: LiveChatHeaderMetaProps) {
  const browserLabel = [visitorInfo.browserName, visitorInfo.browserVersion].filter(Boolean).join(' ');

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
      {visitorEmail && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">email: {visitorEmail}</span>}
      {visitorPhone && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">phone: {visitorPhone}</span>}
      {pageUrl && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70 truncate max-w-[360px]">page: {pageUrl}</span>}
      {visitorInfo.ip && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">IP: {visitorInfo.ip}</span>}
      {browserLabel && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">{browserLabel}</span>}
      {visitorInfo.os && <span className="bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700/70">{visitorInfo.os}</span>}
    </>
  );
}
