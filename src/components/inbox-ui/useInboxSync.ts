import { Dispatch, SetStateAction, useRef, useState } from 'react';
import { useStore } from '../../store';
import {
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
  mapUnifiedWhatsAppConversation,
  normalizeTagSearchTerm,
  readCachedWhatsAppConversations,
  writeCachedWhatsAppConversations,
} from './inboxModel';

interface UseInboxSyncArgs {
  search: string;
  searchTags: string[];
  fetchEmails: () => Promise<any> | any;
  fetchLiveChatSessions: () => Promise<any> | any;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  setUnifiedConversations: Dispatch<SetStateAction<UnifiedCommunicationConversation[]>>;
}

export function useInboxSync({
  search,
  searchTags,
  fetchEmails,
  fetchLiveChatSessions,
  notify,
  setUnifiedConversations,
}: UseInboxSyncArgs) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isUnifiedConversationLoading, setIsUnifiedConversationLoading] = useState(false);
  const [whatsappConversations, setWhatsappConversations] = useState<InboxWhatsAppConversation[]>(() => readCachedWhatsAppConversations());
  const [isWhatsAppBackgroundSyncing, setIsWhatsAppBackgroundSyncing] = useState(false);
  const syncInFlightRef = useRef(false);
  const whatsappSyncInFlightRef = useRef(false);

  const updateWhatsAppConversationState = (conversations: InboxWhatsAppConversation[]) => {
    setWhatsappConversations(conversations);
    writeCachedWhatsAppConversations(conversations);
  };

  const fetchUnifiedConversations = async (activeSearch = search, activeTags = searchTags) => {
    setIsUnifiedConversationLoading(true);
    try {
      const params = new URLSearchParams({ limit: '300' });
      const textTerms = [
        activeSearch.trim(),
        ...activeTags.filter(tag => !tag.trim().startsWith('#')).map(tag => tag.trim()),
      ].filter(Boolean);
      const tagTerms = activeTags
        .filter(tag => tag.trim().startsWith('#'))
        .map(normalizeTagSearchTerm)
        .filter(Boolean);
      if (textTerms.length > 0) params.set('search', textTerms.join(' '));
      if (tagTerms.length > 0) params.set('tags', tagTerms.join(','));
      const res = await fetch(`/api/conversations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load unified conversations.');
      const conversations = Array.isArray(data.conversations) ? data.conversations : [];
      setUnifiedConversations(conversations);
      const unifiedWhatsApp = conversations
        .filter((conversation: UnifiedCommunicationConversation) => conversation.channel === 'whatsapp')
        .map(mapUnifiedWhatsAppConversation);
      if (unifiedWhatsApp.length > 0) updateWhatsAppConversationState(unifiedWhatsApp);
      return conversations;
    } catch (error) {
      console.warn('Unified conversations unavailable in inbox', error);
      return [];
    } finally {
      setIsUnifiedConversationLoading(false);
    }
  };

  const fetchCachedWhatsAppConversations = async () => {
    try {
      const unified = await fetchUnifiedConversations();
      const unifiedWhatsApp = unified
        .filter((conversation: UnifiedCommunicationConversation) => conversation.channel === 'whatsapp')
        .map(mapUnifiedWhatsAppConversation);
      if (unifiedWhatsApp.length > 0) {
        updateWhatsAppConversationState(unifiedWhatsApp);
        return;
      }
      updateWhatsAppConversationState([]);
    } catch (error) {
      console.warn('WhatsApp conversations unavailable in unified inbox', error);
    }
  };

  const syncWhatsAppConversations = async (activeSearch = search) => {
    if (whatsappSyncInFlightRef.current) return;
    whatsappSyncInFlightRef.current = true;
    setIsWhatsAppBackgroundSyncing(true);
    try {
      const res = await fetch('/api/whatsapp-hub/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ limit: 500 }),
      });
      if (res.ok) {
        await fetchCachedWhatsAppConversations();
      }
    } catch (error) {
      console.warn('WhatsApp background sync unavailable in unified inbox', error);
    } finally {
      setIsWhatsAppBackgroundSyncing(false);
      whatsappSyncInFlightRef.current = false;
    }
  };

  const loadWhatsAppConversations = async () => {
    await fetchCachedWhatsAppConversations();
    void syncWhatsAppConversations(search);
  };

  const handleSync = async (options: { silent?: boolean } = {}) => {
    if (syncInFlightRef.current) return;
    const configs = useStore.getState().inboxConfigs;
    if (!configs || configs.length === 0) {
      if (!options.silent) notify('No Inbox configurations found. Please add one in Settings.', 'warning');
      return;
    }

    syncInFlightRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
    let totalSynced = 0;
    let totalLinked = 0;
    try {
      const token = localStorage.getItem('token');
      for (const config of configs) {
        if (config.type !== 'imap' && config.type !== 'pop3') continue;
        const res = await fetch('/api/sync-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(config),
        });
        if (res.ok) {
          const data = await res.json();
          totalSynced += data.count || 0;
          totalLinked += data.linkedExistingEmails || 0;
        } else if (!options.silent) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to sync emails.');
        }
      }
      if (totalSynced > 0 || totalLinked > 0) {
        await fetchEmails();
      } else if (!options.silent) {
        await fetchEmails();
      }
      void loadWhatsAppConversations();
      setLastSyncAt(new Date().toISOString());
      if (!options.silent) notify(`Sync complete. Fetched ${totalSynced} new email(s), linked ${totalLinked} existing email(s).`, 'success');
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Error syncing emails.';
      setSyncError(message);
      if (!options.silent) notify(message, 'error');
    } finally {
      setIsSyncing(false);
      syncInFlightRef.current = false;
    }
  };

  const refreshConversationSideData = async () => {
    await fetchUnifiedConversations();
    void fetchEmails();
    void fetchLiveChatSessions();
  };

  return {
    isSyncing,
    lastSyncAt,
    syncError,
    isUnifiedConversationLoading,
    whatsappConversations,
    setWhatsappConversations,
    isWhatsAppBackgroundSyncing,
    updateWhatsAppConversationState,
    fetchUnifiedConversations,
    fetchCachedWhatsAppConversations,
    syncWhatsAppConversations,
    loadWhatsAppConversations,
    handleSync,
    refreshConversationSideData,
  };
}
