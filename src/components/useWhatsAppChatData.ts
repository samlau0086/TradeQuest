import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  isWhatsAppChatId,
  mapUnifiedWhatsAppMessage,
  readCachedWhatsAppMessages,
  readCachedWhatsAppTranslations,
  simpleHash,
  writeCachedWhatsAppMessages,
  writeCachedWhatsAppTranslations,
  type WhatsAppConversation,
  type WhatsAppHubClient,
  type WhatsAppHubMessage,
  type WhatsAppTranslation,
} from './whatsappMessageModel';

const WHATSAPP_ACTIVE_CHAT_POLL_MS = 12_000;

interface UseWhatsAppChatDataOptions {
  targetPhone: string;
  messageLookupTarget: string;
  language: 'en' | 'zh';
  initialConversation?: WhatsAppConversation | null;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  setSelectedClientId: (value: string) => void;
  setTranslations: Dispatch<SetStateAction<Record<string, WhatsAppTranslation>>>;
}

export function useWhatsAppChatData({
  targetPhone,
  messageLookupTarget,
  language,
  initialConversation,
  notify,
  setSelectedClientId,
  setTranslations,
}: UseWhatsAppChatDataOptions) {
  const [hubClients, setHubClients] = useState<WhatsAppHubClient[]>([]);
  const [messages, setMessages] = useState<WhatsAppHubMessage[]>(() => readCachedWhatsAppMessages(targetPhone));
  const [conversation, setConversation] = useState<WhatsAppConversation | null>(initialConversation || null);
  const [loading, setLoading] = useState(false);
  const syncInFlightRef = useRef(false);
  const loadRequestRef = useRef(0);

  const loadCachedMessages = useCallback(async (options: { notifyErrors?: boolean; requestId?: number } = {}) => {
    const requestId = options.requestId ?? loadRequestRef.current;
    const expectedTargetPhone = targetPhone;
    const expectedLookupTarget = messageLookupTarget;
    if (!expectedTargetPhone) return;
    try {
      const messageQuery = isWhatsAppChatId(expectedLookupTarget)
        ? `chatId=${encodeURIComponent(expectedLookupTarget)}&language=${encodeURIComponent(language)}`
        : `targetPhone=${encodeURIComponent(expectedLookupTarget)}&language=${encodeURIComponent(language)}`;
      const unifiedId = conversation?.unifiedId;
      const [clientsRes, messagesRes] = await Promise.all([
        fetch('/api/whatsapp-hub/clients', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        unifiedId
          ? fetch(`/api/conversations/${encodeURIComponent(unifiedId)}/messages`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
          : fetch(`/api/whatsapp-hub/messages?${messageQuery}&limit=200`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const clientsData = await clientsRes.json();
      const messagesData = await messagesRes.json();
      if (!clientsRes.ok) throw new Error(clientsData.error || 'Failed to load WhatsApp clients');
      if (!messagesRes.ok) throw new Error(messagesData.error || 'Failed to load WhatsApp messages');
      if (requestId !== loadRequestRef.current || expectedTargetPhone !== targetPhone || expectedLookupTarget !== messageLookupTarget) return;
      setHubClients(clientsData.clients || []);
      const nextMessages = unifiedId
        ? (messagesData.messages || []).map(mapUnifiedWhatsAppMessage)
        : (messagesData.messages || []).slice().reverse();
      setMessages(nextMessages);
      writeCachedWhatsAppMessages(expectedTargetPhone, nextMessages);
      const cachedTranslations = readCachedWhatsAppTranslations(expectedTargetPhone, language);
      const mergedTranslations = nextMessages.reduce((acc: Record<string, WhatsAppTranslation>, message: WhatsAppHubMessage) => {
        const bodyHash = simpleHash(String(message.body || '').trim());
        const cached = cachedTranslations[message.id];
        if (cached?.bodyHash === bodyHash) {
          acc[message.id] = cached;
        } else if (message.translation?.bodyHash === bodyHash) {
          acc[message.id] = message.translation;
        }
        return acc;
      }, {});
      setTranslations(mergedTranslations);
      writeCachedWhatsAppTranslations(expectedTargetPhone, language, mergedTranslations);
      const sticky = nextMessages.find((message: WhatsAppHubMessage) => message.direction === 'outbound' && message.client_id)?.client_id;
      if (sticky) setSelectedClientId(sticky);
      if (!unifiedId) {
        const conversationsRes = await fetch(`/api/whatsapp-hub/conversations?search=${encodeURIComponent(expectedLookupTarget)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        const conversationsData = await conversationsRes.json();
        if (requestId !== loadRequestRef.current || expectedTargetPhone !== targetPhone || expectedLookupTarget !== messageLookupTarget) return;
        if (conversationsRes.ok) {
          const matched = (conversationsData.conversations || []).find((item: WhatsAppConversation) => (
            item.targetPhone === expectedLookupTarget || item.contactPhone === expectedLookupTarget || item.rawChatId === expectedTargetPhone || item.conversationKey === expectedLookupTarget
          ));
          if (matched) setConversation(matched);
        }
      }
    } catch (error: any) {
      if (options.notifyErrors !== false) {
        notify(error.message || 'WhatsApp Actor Hub is not configured.', 'error');
      }
      throw error;
    }
  }, [conversation?.unifiedId, language, messageLookupTarget, notify, setSelectedClientId, setTranslations, targetPhone]);

  const syncLatestMessages = useCallback(async (requestId = loadRequestRef.current) => {
    const expectedLookupTarget = messageLookupTarget;
    if (!targetPhone || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      const syncRes = await fetch('/api/whatsapp-hub/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(isWhatsAppChatId(expectedLookupTarget)
          ? { chatId: expectedLookupTarget, limit: 500 }
          : { targetPhone: expectedLookupTarget, limit: 500 })
      });
      if (syncRes.ok && requestId === loadRequestRef.current && expectedLookupTarget === messageLookupTarget) {
        await loadCachedMessages({ notifyErrors: false, requestId });
      }
    } catch (error) {
      console.warn('WhatsApp background sync unavailable in chat modal', error);
    } finally {
      syncInFlightRef.current = false;
    }
  }, [loadCachedMessages, messageLookupTarget, targetPhone]);

  const loadData = useCallback(async (options: { sync?: boolean } = {}) => {
    const requestId = loadRequestRef.current;
    if (!targetPhone) return;
    setLoading(true);
    try {
      await loadCachedMessages({ notifyErrors: true, requestId });
      if (options.sync !== false && requestId === loadRequestRef.current) {
        void syncLatestMessages(requestId);
      }
    } catch {
      // loadCachedMessages already surfaced a user-facing notification.
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [loadCachedMessages, syncLatestMessages, targetPhone]);

  useEffect(() => {
    loadRequestRef.current += 1;
    syncInFlightRef.current = false;
    setMessages(readCachedWhatsAppMessages(targetPhone));
    setConversation(initialConversation || null);
    setSelectedClientId('');
    setTranslations(readCachedWhatsAppTranslations(targetPhone, language));
    void loadData();
  }, [targetPhone, initialConversation?.id, language]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void syncLatestMessages();
    }, WHATSAPP_ACTIVE_CHAT_POLL_MS);
    const handleFocus = () => {
      void syncLatestMessages();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncLatestMessages]);

  return {
    hubClients,
    messages,
    setMessages,
    conversation,
    setConversation,
    loading,
    loadData,
    syncLatestMessages,
  };
}
