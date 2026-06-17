import React from 'react';
import { Download, FileText, ImageIcon, Languages, Loader2, MessageCircle, Video } from 'lucide-react';
import { ConversationSectionCard, ConversationSectionHeader } from './inbox-ui/ConversationSectionCard';
import { ConversationToolbarPill } from './inbox-ui/ConversationToolbar';
import { getWhatsAppMessageMedia, type WhatsAppHubMessage, type WhatsAppTranslation } from './whatsappMessageModel';

interface WhatsAppMessageListProps {
  messages: WhatsAppHubMessage[];
  loading: boolean;
  embedded: boolean;
  cardSurface?: boolean;
  hubBaseUrl?: string;
  translations: Record<string, WhatsAppTranslation>;
  translatingIds: Set<string>;
  autoTranslateEnabled: boolean;
  language: 'en' | 'zh';
  noMessagesLabel: string;
  mediaMessageLabel: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onMediaLoaded?: () => void;
}

export function WhatsAppMessageList({
  messages,
  loading,
  embedded,
  cardSurface,
  hubBaseUrl,
  translations,
  translatingIds,
  autoTranslateEnabled,
  language,
  noMessagesLabel,
  mediaMessageLabel,
  messagesEndRef,
  onMediaLoaded,
}: WhatsAppMessageListProps) {
  const useWorkroomSurface = cardSurface ?? embedded;
  const isZh = language === 'zh';
  const inboundCount = messages.filter(message => message.direction !== 'outbound').length;
  const outboundCount = Math.max(0, messages.length - inboundCount);

  return (
    <ConversationSectionCard bodyClassName={useWorkroomSurface ? 'p-5 lg:p-6' : undefined}>
      {useWorkroomSurface && (
        <ConversationSectionHeader
          title={isZh ? 'WhatsApp \u5bf9\u8bdd\u65f6\u95f4\u7ebf' : 'WhatsApp timeline'}
          icon={<MessageCircle className="h-4 w-4 text-emerald-500" />}
          description={
            isZh
              ? '\u96c6\u4e2d\u67e5\u770b\u5ba2\u6237\u6765\u4fe1\u3001\u6211\u65b9\u56de\u590d\u3001\u5a92\u4f53\u6d88\u606f\u4e0e\u7ffb\u8bd1\u5185\u5bb9\uff0c\u4fdd\u6301 WhatsApp \u8ddf\u8fdb\u4e0a\u4e0b\u6587\u8fde\u7eed\u3002'
              : 'Review inbound messages, outbound replies, media, and translations in one continuous WhatsApp follow-up timeline.'
          }
          actions={(
            <div className="flex flex-wrap items-center gap-1.5">
              <ConversationToolbarPill tone="success">
                {messages.length} {isZh ? '\u6761\u6d88\u606f' : messages.length === 1 ? 'message' : 'messages'}
              </ConversationToolbarPill>
              <ConversationToolbarPill tone="default">
                {isZh ? '\u5165\u7ad9' : 'Inbound'} {inboundCount}
              </ConversationToolbarPill>
              <ConversationToolbarPill tone="default">
                {isZh ? '\u51fa\u7ad9' : 'Outbound'} {outboundCount}
              </ConversationToolbarPill>
            </div>
          )}
        />
      )}

      {loading && (
        <div className="mb-4 flex items-center justify-center rounded-[20px] border border-slate-200 bg-slate-50 py-12 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isZh ? '\u6b63\u5728\u52a0\u8f7d WhatsApp \u6d88\u606f...' : 'Loading WhatsApp messages...'}
        </div>
      )}

      {messages.length === 0 && !loading && (
        <div
          className={
            useWorkroomSurface
              ? 'rounded-[20px] border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm text-slate-500'
              : 'py-10 text-center text-sm text-slate-500'
          }
        >
          {noMessagesLabel}
        </div>
      )}

      <div className={useWorkroomSurface ? 'rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#f9fbfd_0%,#f3f6fa_100%)] p-4 lg:p-5' : ''}>
        <div className="relative pl-2">
          <div className="absolute bottom-0 left-[11px] top-2 w-px bg-slate-200" />

          {messages.map(message => {
            const media = getWhatsAppMessageMedia(message, hubBaseUrl);
            const translation = translations[message.id];
            const isTranslating = translatingIds.has(message.id);
            const outboundOriginal =
              message.direction === 'outbound' && translation?.kind === 'outbound_original'
                ? translation
                : undefined;
            const inboundTranslation =
              message.direction !== 'outbound' && translation?.kind !== 'outbound_original'
                ? translation
                : undefined;
            const outbound = message.direction === 'outbound';

            return (
              <div key={message.id} className={`relative mb-4 flex last:mb-0 ${outbound ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex w-full max-w-[84%] gap-3 ${outbound ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="relative flex shrink-0 flex-col items-center">
                    <div
                      className={`relative z-[1] mt-2 h-3 w-3 rounded-full border-2 bg-white shadow-sm ${
                        outbound ? 'border-emerald-400 text-emerald-400' : 'border-slate-300 text-slate-300'
                      }`}
                    />
                  </div>

                  <div
                    className={`flex-1 rounded-[22px] border px-4 py-3.5 shadow-sm ${
                      outbound
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-900'
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {outbound ? (isZh ? '\u6211\u65b9\u53d1\u9001' : 'Outbound') : (isZh ? '\u5ba2\u6237\u6d88\u606f' : 'Inbound')}
                      </div>
                      <ConversationToolbarPill tone={outbound ? 'success' : 'default'}>
                        {message.message_type || (isZh ? '\u6d88\u606f' : 'message')}
                      </ConversationToolbarPill>
                      {media.hasMedia && (
                        <ConversationToolbarPill tone="info">
                          {media.isImage ? (
                            <>
                              <ImageIcon className="h-3 w-3" />
                              {isZh ? '\u56fe\u7247' : 'Image'}
                            </>
                          ) : media.isVideo ? (
                            <>
                              <Video className="h-3 w-3" />
                              {isZh ? '\u89c6\u9891' : 'Video'}
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3" />
                              {isZh ? '\u6587\u4ef6' : 'File'}
                            </>
                          )}
                        </ConversationToolbarPill>
                      )}
                    </div>

                    {media.hasMedia && (
                      <div className="mb-3">
                        {media.url && media.isImage ? (
                          <a
                            href={media.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-xl border border-slate-200 bg-white"
                          >
                            <img
                              src={media.url}
                              alt={media.name}
                              className="max-h-72 w-full max-w-sm object-contain"
                              loading="lazy"
                              onLoad={() => {
                                if (!embedded) onMediaLoaded?.();
                              }}
                            />
                          </a>
                        ) : media.url && media.isVideo ? (
                          <video
                            src={media.url}
                            controls
                            className="max-h-72 w-full max-w-sm rounded-xl border border-slate-200 bg-white"
                            onLoadedMetadata={() => {
                              if (!embedded) onMediaLoaded?.();
                            }}
                          />
                        ) : media.url ? (
                          <a
                            href={media.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{media.name}</span>
                            <Download className="h-4 w-4 shrink-0 opacity-80" />
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FileText className="h-3 w-3" />
                            {media.name || mediaMessageLabel}
                          </div>
                        )}
                      </div>
                    )}

                    {message.body && <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</div>}

                    {message.direction !== 'outbound' && ((autoTranslateEnabled && isTranslating) || inboundTranslation?.text) && (
                      <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/70 px-3 py-3 text-xs leading-6 text-slate-700">
                        <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                          {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                          {isZh ? '\u81ea\u52a8\u7ffb\u8bd1' : 'Translation'}
                          {inboundTranslation?.sourceLanguage && (
                            <span className="font-normal normal-case text-slate-400">({inboundTranslation.sourceLanguage})</span>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap break-words">
                          {inboundTranslation?.text || (isZh ? '\u6b63\u5728\u7ffb\u8bd1...' : 'Translating...')}
                        </div>
                      </div>
                    )}

                    {outboundOriginal?.text && (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-100/50 px-3 py-3 text-xs leading-6 text-emerald-900">
                        <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          <Languages className="h-3 w-3" />
                          {isZh ? '\u539f\u6587' : 'Original'}
                          {outboundOriginal.targetLanguage && (
                            <span className="font-normal normal-case text-emerald-600">&gt; {outboundOriginal.targetLanguage}</span>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{outboundOriginal.text}</div>
                      </div>
                    )}

                    <div className="mt-3 text-[10px] text-slate-400">
                      {message.client_id} {'\u00b7'} {new Date(message.created_at || message.received_at || Date.now()).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={messagesEndRef} />
    </ConversationSectionCard>
  );
}
