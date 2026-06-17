import React from 'react';
import { Languages, Loader2, MessageSquareText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConversationSectionCard, ConversationSectionHeader } from './ConversationSectionCard';
import { ConversationToolbarPill } from './ConversationToolbar';
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
    inboundBorder: 'border-slate-200',
    inboundBg: 'bg-white',
    inboundText: 'text-slate-900',
    heading: 'Telegram thread',
    headingZh: 'Telegram 对话',
    description: 'Review Telegram messages and operator replies in one continuous timeline.',
    descriptionZh: '在同一条连续时间线里查看 Telegram 消息与我方回复。',
    loadingText: 'Loading Telegram messages...',
    loadingTextZh: '正在加载 Telegram 消息...',
    emptyText: 'No Telegram messages saved yet.',
    emptyTextZh: '还没有保存任何 Telegram 消息。',
    accentTone: 'sky' as const,
    outboundDot: 'text-sky-400',
  },
  live_chat: {
    outboundBorder: 'border-violet-200',
    outboundBg: 'bg-violet-50',
    outboundText: 'text-violet-950',
    inboundBorder: 'border-slate-200',
    inboundBg: 'bg-white',
    inboundText: 'text-slate-900',
    heading: 'Live Chat thread',
    headingZh: 'Live Chat 对话',
    description: 'Track the visitor conversation and operator replies in one place.',
    descriptionZh: '在一个工作区里集中查看访客对话与我方回复。',
    loadingText: 'Loading Live Chat messages...',
    loadingTextZh: '正在加载 Live Chat 消息...',
    emptyText: 'No Live Chat messages saved yet.',
    emptyTextZh: '还没有保存任何 Live Chat 消息。',
    accentTone: 'violet' as const,
    outboundDot: 'text-violet-400',
  },
} as const;

function getMessageId(channel: ConversationMessageChannel, message: any, index: number) {
  return String(
    message.id ||
      message.sourceId ||
      `${channel}_${message.createdAt || message.source_created_at || message.sourceCreatedAt || index}`,
  );
}

function isOutboundMessage(channel: ConversationMessageChannel, message: any) {
  if (channel === 'telegram') return message.direction === 'outbound';
  return message.role === 'operator' || message.role === 'agent';
}

function getSenderLabel(channel: ConversationMessageChannel, message: any, outbound: boolean, language: 'en' | 'zh') {
  if (channel === 'telegram') {
    return (
      message.sender ||
      message.senderName ||
      (outbound ? (language === 'zh' ? '操作员' : 'Operator') : 'Telegram')
    );
  }
  return (
    message.senderName ||
    (outbound ? (language === 'zh' ? '操作员' : 'Operator') : (language === 'zh' ? '访客' : 'Visitor'))
  );
}

function getTypeLabel(channel: ConversationMessageChannel, message: any, language: 'en' | 'zh') {
  if (channel === 'telegram') return message.message_type || message.messageType || (language === 'zh' ? '消息' : 'message');
  return message.role || (language === 'zh' ? '消息' : 'message');
}

function getBodyText(channel: ConversationMessageChannel, message: any, language: 'en' | 'zh') {
  if (channel === 'telegram') return message.body || (language === 'zh' ? '[媒体消息]' : '[media]');
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
  const isZh = language === 'zh';
  const inboundCount = messages.filter(message => !isOutboundMessage(channel, message)).length;
  const outboundCount = Math.max(0, messages.length - inboundCount);

  return (
    <ConversationSectionCard>
      <ConversationSectionHeader
        title={isZh ? accent.headingZh : accent.heading}
        icon={<MessageSquareText className="h-4 w-4 text-slate-400" />}
        description={isZh ? accent.descriptionZh : accent.description}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <ConversationToolbarPill tone={accent.accentTone}>
              {messages.length} {isZh ? '条消息' : messages.length === 1 ? 'message' : 'messages'}
            </ConversationToolbarPill>
            <ConversationToolbarPill tone="default">
              {isZh ? '入站' : 'Inbound'} {inboundCount}
            </ConversationToolbarPill>
            <ConversationToolbarPill tone="default">
              {isZh ? '出站' : 'Outbound'} {outboundCount}
            </ConversationToolbarPill>
          </div>
        )}
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-[22px] border border-slate-200 bg-slate-50 py-16 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isZh ? accent.loadingTextZh : accent.loadingText}
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 py-16 text-center text-sm italic text-slate-500">
          {isZh ? accent.emptyTextZh : accent.emptyText}
        </div>
      ) : (
        <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#f9fbfd_0%,#f3f6fa_100%)] p-4 lg:p-5">
          <div className="relative pl-2">
            <div className="absolute bottom-0 left-[11px] top-2 w-px bg-slate-200" />
            <div className="space-y-4">
              {messages.map((message, index) => {
                const id = getMessageId(channel, message, index);
                const outbound = isOutboundMessage(channel, message);
                const translation = translations[id] || message.payload?.translation || message.metadata?.translation;
                const isTranslating = translatingIds.has(`${channel}:${id}`);
                const createdAt = getCreatedAt(channel, message);

                return (
                  <div key={id} className={cn('relative flex', outbound ? 'justify-end' : 'justify-start')}>
                    <div className={cn('flex w-full max-w-[86%] gap-3', outbound ? 'flex-row-reverse' : 'flex-row')}>
                      <div className="relative flex shrink-0 flex-col items-center">
                        <div
                          className={cn(
                            'relative z-[1] mt-2 h-3 w-3 rounded-full border-2 bg-white shadow-sm',
                            outbound ? `border-current ${accent.outboundDot}` : 'border-current text-slate-300',
                          )}
                        />
                      </div>

                      <div
                        className={cn(
                          'flex-1 rounded-[22px] border px-4 py-3.5 shadow-sm',
                          outbound
                            ? `${accent.outboundBorder} ${accent.outboundBg} ${accent.outboundText}`
                            : `${accent.inboundBorder} ${accent.inboundBg} ${accent.inboundText}`,
                        )}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {getSenderLabel(channel, message, outbound, language)}
                          </div>
                          <ConversationToolbarPill tone={outbound ? accent.accentTone : 'default'}>
                            {getTypeLabel(channel, message, language)}
                          </ConversationToolbarPill>
                          <ConversationToolbarPill tone={outbound ? accent.accentTone : 'default'}>
                            {outbound ? (isZh ? '我方发送' : 'Outbound') : (isZh ? '客户消息' : 'Inbound')}
                          </ConversationToolbarPill>
                        </div>

                        <div className="whitespace-pre-wrap text-sm leading-6">
                          {getBodyText(channel, message, language)}
                        </div>

                        {!outbound && ((translateEnabled && isTranslating) || translation?.text) && (
                          <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-3 py-3 text-xs leading-6 text-slate-700">
                            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">
                              <Languages className="h-3 w-3" />
                              {isZh ? '自动翻译' : 'Translation'}
                              {isTranslating && <Loader2 className="h-3 w-3 animate-spin" />}
                            </div>
                            <div className="whitespace-pre-wrap">
                              {translation?.text || (isZh ? '正在翻译...' : 'Translating...')}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 text-[10px] text-slate-400">
                          {createdAt ? new Date(createdAt).toLocaleString() : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ConversationSectionCard>
  );
}
