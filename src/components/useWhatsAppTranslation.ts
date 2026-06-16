import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { type Client } from '../store';
import {
  simpleHash,
  writeCachedWhatsAppTranslations,
  type WhatsAppHubMessage,
  type WhatsAppTranslation,
} from './whatsappMessageModel';

interface TranslationLLMConfig {
  id: string;
  [key: string]: any;
}

interface UseWhatsAppTranslationOptions {
  targetPhone: string;
  language: 'en' | 'zh';
  messages: WhatsAppHubMessage[];
  latestMessageId: string;
  translations: Record<string, WhatsAppTranslation>;
  setTranslations: Dispatch<SetStateAction<Record<string, WhatsAppTranslation>>>;
  inboundAutoTranslateEnabled: boolean;
  outboundAutoTranslateLanguage: string;
  activeClient?: Client | null;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  getTranslationLLMConfig: () => TranslationLLMConfig | null;
}

export function useWhatsAppTranslation({
  targetPhone,
  language,
  messages,
  latestMessageId,
  translations,
  setTranslations,
  inboundAutoTranslateEnabled,
  outboundAutoTranslateLanguage,
  activeClient,
  notify,
  getTranslationLLMConfig,
}: UseWhatsAppTranslationOptions) {
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [translatingOutbound, setTranslatingOutbound] = useState(false);

  const translateInboundMessage = useCallback(async (message: WhatsAppHubMessage, signal?: AbortSignal) => {
    const bodyText = String(message.body || '').trim();
    const bodyHash = simpleHash(bodyText);
    const cached = translations[message.id];
    if (!bodyText || (cached && cached.bodyHash === bodyHash)) return;
    const llmConfig = getTranslationLLMConfig();
    if (!llmConfig) return;
    setTranslatingIds(prev => new Set(prev).add(message.id));
    try {
      const targetLanguage = language === 'zh' ? 'Chinese' : 'English';
      const response = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        signal,
        body: JSON.stringify({
          command: `You are translating an inbound WhatsApp customer message for an internal CRM user.
Target system language: ${targetLanguage}.
If the message is already in ${targetLanguage}, return JSON with alreadyTargetLanguage true and translatedText empty.
Otherwise translate faithfully into ${targetLanguage}. Keep names, numbers, product names, URLs, and line breaks. Do not add commentary.
Return only valid JSON: {"alreadyTargetLanguage": boolean, "sourceLanguage": string, "translatedText": string}.

Message:
${bodyText}`,
          context: {
            channel: 'whatsapp',
            messageId: message.id,
            direction: message.direction,
            systemLanguage: targetLanguage
          },
          llmConfig,
          skipKnowledgeBase: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Translation failed');
      const raw = String(data.result || '').replace(/```json|```/g, '').trim();
      const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
      const parsed = JSON.parse(jsonText);
      const nextTranslation: WhatsAppTranslation = {
        language,
        text: parsed.alreadyTargetLanguage ? '' : String(parsed.translatedText || '').trim(),
        sourceLanguage: parsed.sourceLanguage || '',
        bodyHash,
        skipped: !!parsed.alreadyTargetLanguage,
        modelId: llmConfig.id
      };
      const saveResponse = await fetch(`/api/whatsapp-hub/messages/${encodeURIComponent(message.id)}/translation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          language,
          translatedText: nextTranslation.text,
          sourceLanguage: nextTranslation.sourceLanguage,
          bodyHash,
          skipped: nextTranslation.skipped,
          modelId: llmConfig.id
        })
      });
      const savedData = await saveResponse.json().catch(() => ({}));
      if (!saveResponse.ok) throw new Error(savedData.error || 'Failed to save translation');
      setTranslations(prev => {
        const next = { ...prev, [message.id]: savedData.translation || nextTranslation };
        writeCachedWhatsAppTranslations(targetPhone, language, next);
        return next;
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.warn('WhatsApp translation failed', error);
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    }
  }, [getTranslationLLMConfig, language, setTranslations, targetPhone, translations]);

  const translateOutboundMessageText = useCallback(async (text: string) => {
    const bodyText = text.trim();
    if (!bodyText) {
      return { originalText: bodyText, translatedText: bodyText, sourceLanguage: '', targetLanguage: outboundAutoTranslateLanguage || 'English', changed: false, modelId: null as string | null };
    }
    const llmConfig = getTranslationLLMConfig();
    if (!llmConfig) {
      throw new Error(language === 'zh' ? '请先在设置中配置 AI 模型后再使用发送前自动翻译。' : 'Configure an AI model in Settings before using auto-translate before sending.');
    }
    setTranslatingOutbound(true);
    try {
      const targetLanguage = outboundAutoTranslateLanguage || 'English';
      const response = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          command: `You are translating an outbound WhatsApp message before it is sent to a customer.
Target customer language: ${targetLanguage}.
If the message is already in ${targetLanguage}, return JSON with alreadyTargetLanguage true and translatedText empty.
Otherwise translate faithfully into ${targetLanguage}. Keep names, numbers, product names, URLs, emojis, and line breaks. Use a concise, natural WhatsApp style. Do not add commentary.
Return only valid JSON: {"alreadyTargetLanguage": boolean, "sourceLanguage": string, "translatedText": string}.

Message:
${bodyText}`,
          context: {
            channel: 'whatsapp',
            direction: 'outbound',
            targetLanguage,
            clientId: activeClient?.id || null,
            preferredLanguage: activeClient?.preferredLanguage || null,
            country: activeClient?.country || null
          },
          llmConfig,
          skipKnowledgeBase: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Outbound translation failed');
      const raw = String(data.result || '').replace(/```json|```/g, '').trim();
      const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
      const parsed = JSON.parse(jsonText);
      const translatedText = parsed.alreadyTargetLanguage ? bodyText : String(parsed.translatedText || '').trim() || bodyText;
      return {
        originalText: bodyText,
        translatedText,
        sourceLanguage: parsed.sourceLanguage || '',
        targetLanguage,
        changed: translatedText !== bodyText,
        modelId: llmConfig.id
      };
    } finally {
      setTranslatingOutbound(false);
    }
  }, [activeClient?.country, activeClient?.id, activeClient?.preferredLanguage, getTranslationLLMConfig, language, outboundAutoTranslateLanguage]);

  useEffect(() => {
    if (!inboundAutoTranslateEnabled || messages.length === 0) return;
    const llmConfig = getTranslationLLMConfig();
    if (!llmConfig) {
      notify(language === 'zh' ? '请先在设置中配置 AI 模型后再使用 WhatsApp 自动翻译。' : 'Configure an AI model in Settings before using WhatsApp auto-translation.', 'warning');
      return;
    }
    const controller = new AbortController();
    const pendingMessages = messages
      .filter(message => message.direction === 'inbound' && String(message.body || '').trim())
      .filter(message => {
        const bodyHash = simpleHash(String(message.body || '').trim());
        return translations[message.id]?.bodyHash !== bodyHash;
      })
      .slice(-20);
    void (async () => {
      for (const message of pendingMessages) {
        if (controller.signal.aborted) break;
        await translateInboundMessage(message, controller.signal);
      }
    })();
    return () => controller.abort();
  }, [getTranslationLLMConfig, inboundAutoTranslateEnabled, language, latestMessageId, messages, notify, translateInboundMessage, translations]);

  return {
    translatingIds,
    translatingOutbound,
    translateOutboundMessageText,
  };
}
