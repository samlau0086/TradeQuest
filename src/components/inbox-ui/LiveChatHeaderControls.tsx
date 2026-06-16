import React from 'react';
import { Languages, Loader2, Sparkles, User, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConversationToolbarButton, ConversationToolbarPill } from './ConversationToolbar';

interface LiveChatHeaderActionsProps {
  language: 'en' | 'zh';
  humanTakeover?: boolean;
  isRunningAgent: boolean;
  onToggleHumanTakeover: () => void;
  onRunAgent: () => void | Promise<void>;
}

export function LiveChatHeaderActions({
  humanTakeover,
  isRunningAgent,
  onToggleHumanTakeover,
  onRunAgent,
}: LiveChatHeaderActionsProps) {
  return (
    <>
      <ConversationToolbarButton
        type="button"
        onClick={onToggleHumanTakeover}
        tone={humanTakeover ? 'warning' : 'violet'}
        compact
      >
        {humanTakeover ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {humanTakeover ? 'Human Takeover' : 'Agent Auto'}
      </ConversationToolbarButton>
      <ConversationToolbarButton
        type="button"
        onClick={() => void onRunAgent()}
        disabled={isRunningAgent}
        tone="info"
        compact
      >
        {isRunningAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {'Run Agent'}
      </ConversationToolbarButton>
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
      <ConversationToolbarButton
        type="button"
        onClick={onToggleTranslate}
        tone={translateEnabled ? 'info' : 'default'}
        compact
      >
        <Languages className="h-3 w-3" />
        {'Auto Translate'}
        <span className={cn('h-1.5 w-1.5 rounded-full', translateEnabled ? 'bg-cyan-400' : 'bg-slate-300')} />
      </ConversationToolbarButton>
      {!isLinked && hasContactMethod && (
        <>
          <ConversationToolbarButton tone="info" compact onClick={onCreateLead}>
            <UserPlus className="h-3 w-3" /> New Lead
          </ConversationToolbarButton>
          <ConversationToolbarButton tone="success" compact onClick={onAddToExistingClient}>
            <User className="h-3 w-3" /> Add to Existing Client
          </ConversationToolbarButton>
        </>
      )}
      {visitorEmail && <ConversationToolbarPill>email: {visitorEmail}</ConversationToolbarPill>}
      {visitorPhone && <ConversationToolbarPill>phone: {visitorPhone}</ConversationToolbarPill>}
      {pageUrl && <ConversationToolbarPill className="max-w-[360px] truncate">page: {pageUrl}</ConversationToolbarPill>}
      {visitorInfo.ip && <ConversationToolbarPill>IP: {visitorInfo.ip}</ConversationToolbarPill>}
      {browserLabel && <ConversationToolbarPill>{browserLabel}</ConversationToolbarPill>}
      {visitorInfo.os && <ConversationToolbarPill>{visitorInfo.os}</ConversationToolbarPill>}
    </>
  );
}
