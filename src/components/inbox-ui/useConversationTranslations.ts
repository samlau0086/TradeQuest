import { useEffect, useState } from 'react';
import {
  CONVERSATION_AUTO_TRANSLATE_KEY,
  ConversationMessageTranslation,
  UnifiedCommunicationConversation,
  conversationAutoTranslateId,
  conversationTranslationBucketId,
  readCachedConversationTranslations,
  readConversationAutoTranslateConfig,
  simpleHash,
  writeCachedConversationTranslations,
} from './inboxModel';

type TranslatableConversationChannel = 'live_chat' | 'telegram';

interface UseConversationTranslationsArgs {
  language: string;
  llmConfigs: any[];
  activeLLMId?: string | null;
  llmMappings: Record<string, string | undefined>;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  telegramMessages: any[];
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  liveChatMessages: Record<string, any[]>;
}

export function useConversationTranslations({
  language,
  llmConfigs,
  activeLLMId,
  llmMappings,
  selectedTelegramConversation,
  telegramMessages,
  selectedLiveChatConversation,
  liveChatMessages,
}: UseConversationTranslationsArgs) {
  const [conversationAutoTranslateConfig, setConversationAutoTranslateConfig] = useState<Record<string, boolean>>(() => readConversationAutoTranslateConfig());
  const [conversationTranslations, setConversationTranslations] = useState<Record<string, Record<string, ConversationMessageTranslation>>>({});
  const [translatingConversationMessageIds, setTranslatingConversationMessageIds] = useState<Set<string>>(new Set());

  const setConversationAutoTranslateEnabled = (channel: TranslatableConversationChannel, conversationKey: string, enabled: boolean) => {
    if (!conversationKey) return;
    const key = conversationAutoTranslateId(channel, conversationKey);
    setConversationAutoTranslateConfig(prev => {
      const next = { ...prev, [key]: enabled };
      localStorage.setItem(CONVERSATION_AUTO_TRANSLATE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getConversationTranslationLLMConfig = () => {
    const id = llmMappings.agent_context_suggestions || llmMappings.whatsapp_drafting || llmMappings.drafting || activeLLMId;
    return llmConfigs.find(config => config.id === id) || null;
  };

  const mergeConversationTranslations = (
    channel: TranslatableConversationChannel,
    conversationKey: string,
    messageTranslations: Record<string, ConversationMessageTranslation>
  ) => {
    if (!conversationKey) return;
    const bucketId = conversationTranslationBucketId(channel, conversationKey, language);
    setConversationTranslations(prev => {
      const cached = readCachedConversationTranslations(channel, conversationKey, language);
      const nextBucket = { ...cached, ...(prev[bucketId] || {}), ...messageTranslations };
      writeCachedConversationTranslations(channel, conversationKey, language, nextBucket);
      return { ...prev, [bucketId]: nextBucket };
    });
  };

  const saveConversationTranslation = async (
    channel: TranslatableConversationChannel,
    messageId: string,
    translation: ConversationMessageTranslation
  ) => {
    const url = channel === 'telegram'
      ? `/api/conversations/messages/${encodeURIComponent(messageId)}/translation`
      : `/api/live-chat/messages/${encodeURIComponent(messageId)}/translation`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        language,
        translatedText: translation.text,
        sourceLanguage: translation.sourceLanguage,
        targetLanguage: translation.targetLanguage,
        bodyHash: translation.bodyHash,
        skipped: translation.skipped,
        modelId: translation.modelId
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to save translation');
    return data.translation || translation;
  };

  const translateConversationMessage = async (
    channel: TranslatableConversationChannel,
    conversationKey: string,
    messageId: string,
    body: string,
    signal?: AbortSignal
  ) => {
    const bodyText = String(body || '').trim();
    if (!conversationKey || !messageId || !bodyText) return;
    const bucketId = conversationTranslationBucketId(channel, conversationKey, language);
    const bodyHash = simpleHash(bodyText);
    const existing = (conversationTranslations[bucketId] || {})[messageId];
    if (existing && existing.bodyHash === bodyHash) return;
    const translatingKey = `${channel}:${messageId}`;
    if (translatingConversationMessageIds.has(translatingKey)) return;
    const llmConfig = getConversationTranslationLLMConfig();
    if (!llmConfig) return;
    setTranslatingConversationMessageIds(prev => new Set(prev).add(translatingKey));
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
          command: `You are translating an inbound ${channel === 'telegram' ? 'Telegram' : 'Live Chat'} customer message for an internal CRM user.
Target system language: ${targetLanguage}.
If the message is already in ${targetLanguage}, return JSON with alreadyTargetLanguage true and translatedText empty.
Otherwise translate faithfully into ${targetLanguage}. Keep names, numbers, product names, URLs, and line breaks. Do not add commentary.
Return only valid JSON: {"alreadyTargetLanguage": boolean, "sourceLanguage": string, "translatedText": string}.

Message:
${bodyText}`,
          context: {
            channel,
            messageId,
            direction: 'inbound',
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
      const nextTranslation: ConversationMessageTranslation = {
        language,
        text: parsed.alreadyTargetLanguage ? '' : String(parsed.translatedText || '').trim(),
        sourceLanguage: parsed.sourceLanguage || '',
        targetLanguage,
        bodyHash,
        skipped: !!parsed.alreadyTargetLanguage,
        modelId: llmConfig.id
      };
      const savedTranslation = await saveConversationTranslation(channel, messageId, nextTranslation).catch(() => nextTranslation);
      setConversationTranslations(prev => {
        const nextBucket = { ...(prev[bucketId] || {}), [messageId]: savedTranslation };
        writeCachedConversationTranslations(channel, conversationKey, language, nextBucket);
        return { ...prev, [bucketId]: nextBucket };
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.warn(`${channel} translation failed`, error);
    } finally {
      setTranslatingConversationMessageIds(prev => {
        const next = new Set(prev);
        next.delete(translatingKey);
        return next;
      });
    }
  };

  useEffect(() => {
    if (!selectedTelegramConversation?.id) return;
    const messageTranslations: Record<string, ConversationMessageTranslation> = {};
    telegramMessages.forEach(message => {
      const translation = message.payload?.translation;
      if (translation && (!translation.language || translation.language === language)) {
        messageTranslations[message.id] = translation;
      }
    });
    mergeConversationTranslations('telegram', selectedTelegramConversation.id, messageTranslations);
  }, [selectedTelegramConversation?.id, telegramMessages, language]);

  useEffect(() => {
    if (!selectedLiveChatConversation?.source_id) return;
    const messages = liveChatMessages[selectedLiveChatConversation.source_id] || [];
    const messageTranslations: Record<string, ConversationMessageTranslation> = {};
    messages.forEach(message => {
      const translation = message.metadata?.translation;
      if (translation && (!translation.language || translation.language === language)) {
        messageTranslations[message.id] = translation;
      }
    });
    mergeConversationTranslations('live_chat', selectedLiveChatConversation.source_id, messageTranslations);
  }, [selectedLiveChatConversation?.source_id, liveChatMessages[selectedLiveChatConversation?.source_id || '']?.length, language]);

  useEffect(() => {
    if (!selectedTelegramConversation?.id) return;
    const autoKey = conversationAutoTranslateId('telegram', selectedTelegramConversation.id);
    if (!conversationAutoTranslateConfig[autoKey]) return;
    const controller = new AbortController();
    telegramMessages
      .filter(message => message.direction === 'inbound')
      .forEach(message => {
        const saved = message.payload?.translation;
        const bodyHash = simpleHash(String(message.body || '').trim());
        if (saved && (!saved.language || saved.language === language) && saved.bodyHash === bodyHash) return;
        void translateConversationMessage('telegram', selectedTelegramConversation.id, message.id, message.body || '', controller.signal);
      });
    return () => controller.abort();
  }, [selectedTelegramConversation?.id, telegramMessages, language, conversationAutoTranslateConfig]);

  useEffect(() => {
    if (!selectedLiveChatConversation?.source_id) return;
    const autoKey = conversationAutoTranslateId('live_chat', selectedLiveChatConversation.source_id);
    if (!conversationAutoTranslateConfig[autoKey]) return;
    const controller = new AbortController();
    (liveChatMessages[selectedLiveChatConversation.source_id] || [])
      .filter(message => message.role === 'visitor')
      .forEach(message => {
        const saved = message.metadata?.translation;
        const bodyHash = simpleHash(String(message.body || '').trim());
        if (saved && (!saved.language || saved.language === language) && saved.bodyHash === bodyHash) return;
        void translateConversationMessage('live_chat', selectedLiveChatConversation.source_id, message.id, message.body || '', controller.signal);
      });
    return () => controller.abort();
  }, [selectedLiveChatConversation?.source_id, liveChatMessages[selectedLiveChatConversation?.source_id || '']?.length, language, conversationAutoTranslateConfig]);

  return {
    conversationAutoTranslateConfig,
    conversationTranslations,
    translatingConversationMessageIds,
    setConversationAutoTranslateEnabled,
  };
}
