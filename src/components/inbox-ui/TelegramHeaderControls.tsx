import React from 'react';
import { Languages, Sparkles, User, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConversationToolbarButton, ConversationToolbarPill } from './ConversationToolbar';

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
    <ConversationToolbarButton
      type="button"
      onClick={onToggleHumanTakeover}
      tone={humanTakeover ? 'warning' : 'sky'}
      compact
      title={humanTakeover ? 'Human takeover is active' : 'Telegram Agent auto-reply is enabled when the agent is active'}
    >
      {humanTakeover ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      {humanTakeover ? 'Human Takeover' : 'Agent Auto'}
    </ConversationToolbarButton>
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
      {chatId && <ConversationToolbarPill>chat: {chatId}</ConversationToolbarPill>}
      {userId && <ConversationToolbarPill>user: {userId}</ConversationToolbarPill>}
      {humanTakeover && (
        <ConversationToolbarPill tone="warning">
          {'Agent paused'}
        </ConversationToolbarPill>
      )}
    </>
  );
}
