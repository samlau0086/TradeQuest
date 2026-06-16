import React from 'react';
import { Download, FileText, Languages, Loader2 } from 'lucide-react';
import { getWhatsAppMessageMedia, type WhatsAppHubMessage, type WhatsAppTranslation } from './whatsappMessageModel';

interface WhatsAppMessageListProps {
  messages: WhatsAppHubMessage[];
  loading: boolean;
  embedded: boolean;
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
  return (
    <>
      {messages.length === 0 && !loading && (
        <div className="text-center text-slate-500 text-sm py-10">{noMessagesLabel}</div>
      )}
      {messages.map(message => {
        const media = getWhatsAppMessageMedia(message, hubBaseUrl);
        const translation = translations[message.id];
        const isTranslating = translatingIds.has(message.id);
        const outboundOriginal = message.direction === 'outbound' && translation?.kind === 'outbound_original' ? translation : undefined;

        return (
          <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[78%] overflow-hidden rounded-2xl px-4 py-2 text-sm ${message.direction === 'outbound' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
              {media.hasMedia && (
                <div className="mb-2">
                  {media.url && media.isImage ? (
                    <a href={media.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/15 bg-black/20">
                      <img src={media.url} alt={media.name} className="max-h-72 w-full max-w-sm object-contain" loading="lazy" onLoad={() => { if (!embedded) onMediaLoaded?.(); }} />
                    </a>
                  ) : media.url && media.isVideo ? (
                    <video src={media.url} controls className="max-h-72 w-full max-w-sm rounded-xl border border-white/15 bg-black/40" onLoadedMetadata={() => { if (!embedded) onMediaLoaded?.(); }} />
                  ) : media.url ? (
                    <a
                      href={media.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs hover:bg-black/30"
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{media.name}</span>
                      <Download className="h-4 w-4 shrink-0 opacity-80" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-xs opacity-80">
                      <FileText className="w-3 h-3" />
                      {media.name || mediaMessageLabel}
                    </div>
                  )}
                </div>
              )}
              {message.body && <div className="whitespace-pre-wrap break-words">{message.body}</div>}
              {message.direction === 'inbound' && ((autoTranslateEnabled && isTranslating) || translation?.text) && translation?.kind !== 'outbound_original' && (
                <div className="mt-2 border-t border-slate-600/70 pt-2">
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                    {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                    {language === 'zh' ? '译文' : 'Translation'}
                    {translation?.sourceLanguage && <span className="font-normal normal-case text-slate-400">({translation.sourceLanguage})</span>}
                  </div>
                  <div className="whitespace-pre-wrap break-words text-slate-100">
                    {translation?.text || (language === 'zh' ? '正在翻译...' : 'Translating...')}
                  </div>
                </div>
              )}
              {outboundOriginal?.text && (
                <div className="mt-2 border-t border-green-300/40 pt-2">
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-green-100">
                    <Languages className="h-3 w-3" />
                    {language === 'zh' ? '原文' : 'Original'}
                    {outboundOriginal.targetLanguage && <span className="font-normal normal-case text-green-100/80">-&gt; {outboundOriginal.targetLanguage}</span>}
                  </div>
                  <div className="whitespace-pre-wrap break-words text-green-50">
                    {outboundOriginal.text}
                  </div>
                </div>
              )}
              <div className="text-[10px] opacity-70 mt-1">
                {message.client_id} - {new Date(message.created_at || message.received_at || Date.now()).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </>
  );
}
