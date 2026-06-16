import { useEffect, useRef } from 'react';
import { type WhatsAppHubMessage } from './whatsappMessageModel';

interface UseWhatsAppMessageScrollOptions {
  embedded: boolean;
  targetPhone: string;
  messages: WhatsAppHubMessage[];
}

export function useWhatsAppMessageScroll({
  embedded,
  targetPhone,
  messages,
}: UseWhatsAppMessageScrollOptions) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const latestMessageId = messages[messages.length - 1]?.id || '';

  const scrollMessagesToBottom = (behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior });
  };

  useEffect(() => {
    if (embedded) return;
    if (!targetPhone || messages.length === 0) return;
    const frame = window.requestAnimationFrame(() => scrollMessagesToBottom('auto'));
    const shortTimer = window.setTimeout(() => scrollMessagesToBottom('auto'), 80);
    const mediaTimer = window.setTimeout(() => scrollMessagesToBottom('auto'), 300);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(shortTimer);
      window.clearTimeout(mediaTimer);
    };
  }, [embedded, targetPhone, latestMessageId, messages.length]);

  return {
    messagesEndRef,
    latestMessageId,
    scrollMessagesToBottom,
  };
}
