import { RefObject, useEffect } from 'react';
import type { UnifiedCommunicationConversation } from './inboxModel';

interface UseLiveChatInboxSessionArgs {
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  liveChatMessages: Record<string, any[]>;
  liveChatSocketStatus: string;
  liveChatEndRef: RefObject<HTMLDivElement | null>;
  connectLiveChatSocket: () => void | Promise<void>;
  joinLiveChatSocketSession: (sessionId: string) => void | Promise<void>;
  fetchLiveChatMessages: (sessionId: string) => void | Promise<void>;
  patchUnifiedConversation: (
    conversation: UnifiedCommunicationConversation,
    updates: Record<string, any>
  ) => Promise<UnifiedCommunicationConversation>;
  refreshUnifiedConversationData: () => void | Promise<void>;
}

export function useLiveChatInboxSession({
  selectedLiveChatConversation,
  liveChatMessages,
  liveChatSocketStatus,
  liveChatEndRef,
  connectLiveChatSocket,
  joinLiveChatSocketSession,
  fetchLiveChatMessages,
  patchUnifiedConversation,
  refreshUnifiedConversationData,
}: UseLiveChatInboxSessionArgs) {
  useEffect(() => {
    void connectLiveChatSocket();
  }, [connectLiveChatSocket]);

  useEffect(() => {
    if (!selectedLiveChatConversation) return;
    const sessionId = selectedLiveChatConversation.source_id;
    joinLiveChatSocketSession(sessionId);
    void fetchLiveChatMessages(sessionId);
    if (!selectedLiveChatConversation.read) {
      void patchUnifiedConversation(selectedLiveChatConversation, { read: true })
        .then(() => refreshUnifiedConversationData())
        .catch(() => undefined);
    }
    const interval = window.setInterval(
      () => void fetchLiveChatMessages(sessionId),
      liveChatSocketStatus === 'connected' ? 45000 : 8000
    );
    return () => window.clearInterval(interval);
  }, [
    selectedLiveChatConversation?.id,
    selectedLiveChatConversation?.source_id,
    selectedLiveChatConversation?.read,
    fetchLiveChatMessages,
    joinLiveChatSocketSession,
    liveChatSocketStatus,
  ]);

  useEffect(() => {
    if (!selectedLiveChatConversation) return;
    const frame = window.requestAnimationFrame(() => {
      liveChatEndRef.current?.scrollIntoView({ block: 'end' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    selectedLiveChatConversation?.id,
    liveChatMessages[selectedLiveChatConversation?.source_id || '']?.length,
  ]);
}
