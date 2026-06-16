import React from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ConversationMessageTranslation } from './inboxModel';

type ConversationMessageChannel = 'telegram' | 'live_chat';

interface ConversationMessageListProps {
  channel: ConversationMessageChannel;
  language: 'en' | 'zh';
  messages: any[];
  isLoading?: boolean;
  translateEnabled: boolean;
  translations: Record<string, ConversationMessageTranslation>;
  translatingIds: Set<string>;
}

const channelAccent = {
  telegram: {
    outboundBorder: 'border-sky-200',
    outboundBg: 'bg-sky-50',
    outboundText: 'text-sky-950',
    loadingText: 'Loading Telegram messages...',
    emptyText: 'No Telegram messages saved yet.',
  },
  live_chat: {
    outboundBorder: 'border-violet-200',
    outboundBg: 'bg-violet-50',
    outboundText: 'text-violet-950',
    loadingText: 'Loading Live Chat messages...',
    emptyText: 'No Live Chat messages saved yet.',
  },
} as const;

function getMessageId(channel: ConversationMessageChannel, message: any, index: number) {
  return String(message.id || message.sourceId || `${channel}_${message.createdAt || message.source_created_at || message.sourceCreatedAt || index}`);
}

function isOutboundMessage(channel: ConversationMessageChannel, message: any) {
  if (channel === 'telegram') return message.direction === 'outbound';
  return message.role === 'operator' || message.role === 'agent';
}

function getSenderLabel(channel: ConversationMessageChannel, message: any, outbound: boolean) {
  if (channel === 'telegram') return message.sender || message.senderName || (outbound ? 'Operator' : 'Telegram');
  return message.senderName || (outbound ? 'Operator' : 'Visitor');
}

function getTypeLabel(channel: ConversationMessageChannel, message: any) {
  if (channel === 'telegram') return message.message_type || message.messageType || 'message';
  return message.role || 'message';
}

function getBodyText(channel: ConversationMessageChannel, message: any) {
  if (channel === 'telegram') return message.body || '[media]';
  return message.body || '';
}

function getCreatedAt(channel: ConversationMessageChannel, message: any) {
  if (channel === 'telegram') return message.source_created_at || message.sourceCreatedAt;
  return message.createdAt;
}

export function ConversationMessageList({
  channel,
  language,
  messages,
  isLoading = false,
  translateEnabled,
  translations,
  translatingIds,
}: ConversationMessageListProps) {
  const accent = channelAccent[channel];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500 shadow-sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {accent.loadingText}
      </div>
    );
  }

  if (messages.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm italic text-slate-500 shadow-sm">{accent.emptyText}</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          {channel === 'telegram' ? 'Telegram Thread' : 'Live Chat Thread'}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </div>
      </div>

      {messages.map((message, index) => {
        const id = getMessageId(channel, message, index);
        const outbound = isOutboundMessage(channel, message);
        const translation = translations[id] || message.payload?.translation || message.metadata?.translation;
        const isTranslating = translatingIds.has(`${channel}:${id}`);
        const createdAt = getCreatedAt(channel, message);

        return (
          <div key={id} className={cn('mb-4 flex last:mb-0', outbound ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[78%] rounded-2xl border px-4 py-3 text-sm shadow-sm',
                outbound
                  ? `${accent.outboundBorder} ${accent.outboundBg} ${accent.outboundText}`
                  : 'border-slate-200 bg-slate-50 text-slate-900'
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                <span>{getSenderLabel(channel, message, outbound)}</span>
                <span>{getTypeLabel(channel, message)}</span>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{getBodyText(channel, message)}</div>
              {!outbound && ((translateEnabled && isTranslating) || translation?.text) && (
                <div className="mt-3 border-t border-slate-200 pt-2 text-xs leading-relaxed text-slate-700">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-600">
                    <Languages className="h-3 w-3" />
                    {language === 'zh' ? '缈昏瘧' : 'Translation'}
                    {isTranslating && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                  <div className="whitespace-pre-wrap">
                    {translation?.text || (language === 'zh' ? '缈昏瘧涓?..' : 'Translating...')}
                  </div>
                </div>
              )}
              <div className="mt-2 text-[10px] text-slate-400">
                {createdAt ? new Date(createdAt).toLocaleString() : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
