import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { type WhatsAppConversation } from './whatsappMessageModel';

interface UseWhatsAppConversationSummaryOptions {
  conversation: WhatsAppConversation | null;
  messageCount: number;
  latestMessageId: string;
  setConversation: Dispatch<SetStateAction<WhatsAppConversation | null>>;
}

export function useWhatsAppConversationSummary({
  conversation,
  messageCount,
  latestMessageId,
  setConversation,
}: UseWhatsAppConversationSummaryOptions) {
  const summaryRequestRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!conversation?.id || messageCount <= 30 || !latestMessageId) return;
    if (conversation.whatsappSummaryMessageId === latestMessageId) return;
    const requestKey = `${conversation.id}:${latestMessageId}`;
    if (summaryRequestRef.current.has(requestKey)) return;
    summaryRequestRef.current.add(requestKey);
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/whatsapp-hub/conversations/${encodeURIComponent(conversation.id)}/summarize`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          signal: controller.signal
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to summarize WhatsApp conversation');
        if (data.conversation) {
          setConversation(prev => prev && prev.id === data.conversation.id ? { ...prev, ...data.conversation } : prev);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('WhatsApp conversation summarization skipped', error);
        }
      }
    })();
    return () => controller.abort();
  }, [conversation?.id, conversation?.whatsappSummaryMessageId, latestMessageId, messageCount, setConversation]);
}
