import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { WHATSAPP_CONVERSATION_POLL_MS } from './inboxModel';

interface UseInboxLifecycleEffectsOptions {
  search: string;
  searchTags: string[];
  setActiveMenu: Dispatch<SetStateAction<string | null>>;
  loadWhatsAppConversations: () => void | Promise<void>;
  fetchUnifiedConversations: (search?: string, tags?: string[]) => void | Promise<void>;
  syncWhatsAppConversations: (search?: string) => void | Promise<void>;
  handleSync: (options?: { silent?: boolean }) => void | Promise<void>;
}

export function useInboxLifecycleEffects({
  search,
  searchTags,
  setActiveMenu,
  loadWhatsAppConversations,
  fetchUnifiedConversations,
  syncWhatsAppConversations,
  handleSync,
}: UseInboxLifecycleEffectsOptions) {
  const actionsRef = useRef({
    loadWhatsAppConversations,
    fetchUnifiedConversations,
    syncWhatsAppConversations,
    handleSync,
  });
  actionsRef.current = {
    loadWhatsAppConversations,
    fetchUnifiedConversations,
    syncWhatsAppConversations,
    handleSync,
  };

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [setActiveMenu]);

  useEffect(() => {
    void actionsRef.current.loadWhatsAppConversations();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void actionsRef.current.fetchUnifiedConversations(search, searchTags);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, searchTags]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void actionsRef.current.syncWhatsAppConversations(search);
    }, WHATSAPP_CONVERSATION_POLL_MS);
    const handleFocus = () => {
      void actionsRef.current.syncWhatsAppConversations(search);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', handleFocus);
    };
  }, [search]);

  useEffect(() => {
    const initialSync = window.setTimeout(() => actionsRef.current.handleSync({ silent: true }), 15000);
    return () => {
      window.clearTimeout(initialSync);
    };
  }, []);
}
