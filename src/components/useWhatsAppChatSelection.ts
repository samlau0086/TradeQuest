import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { type Client, type WhatsAppHubConfig } from '../store';
import {
  cleanWhatsAppPhone,
  isWhatsAppChatId,
  type WhatsAppConversation,
  type WhatsAppHubClient,
  type WhatsAppHubMessage
} from './whatsappMessageModel';

interface UseWhatsAppChatSelectionOptions {
  client?: Client | null;
  clients: Client[];
  conversation: WhatsAppConversation | null;
  targetPhone: string;
  hubClients: WhatsAppHubClient[];
  hubActors: WhatsAppHubConfig['actors'];
  messages: WhatsAppHubMessage[];
  selectedClientId: string;
  setSelectedClientId: Dispatch<SetStateAction<string>>;
}

export function useWhatsAppChatSelection({
  client,
  clients,
  conversation,
  targetPhone,
  hubClients,
  hubActors,
  messages,
  selectedClientId,
  setSelectedClientId,
}: UseWhatsAppChatSelectionOptions) {
  const rawChatId = conversation?.rawChatId || (isWhatsAppChatId(targetPhone) ? targetPhone : '');
  const mappedPhone = conversation?.contactPhone || (!isWhatsAppChatId(targetPhone) ? targetPhone : '');
  const displayPhone = mappedPhone || targetPhone;
  const autoTranslateKey = useMemo(() => (
    (cleanWhatsAppPhone(displayPhone) || displayPhone || targetPhone).trim().toLowerCase()
  ), [displayPhone, targetPhone]);

  const selectableHubClients = useMemo(() => {
    const actorClientIds = new Set((hubActors || [])
      .filter(actor => actor.enabled !== false && actor.clientId)
      .map(actor => actor.clientId));
    if (actorClientIds.size === 0) return hubClients;
    return hubClients.filter(hubClient => actorClientIds.has(hubClient.id));
  }, [hubActors, hubClients]);

  const activeClient = useMemo(() => {
    if (client) return client;
    if (conversation?.clientId) return clients.find(item => item.id === conversation.clientId) || null;
    return clients.find(item => item.contactMethods?.some(method => (
      mappedPhone && ['whatsapp', 'phone'].includes(method.type) && cleanWhatsAppPhone(method.value).endsWith(mappedPhone.slice(-8))
    ))) || null;
  }, [client, clients, conversation?.clientId, mappedPhone]);

  const mappingHubClientId = useMemo(() => (
    selectedClientId
    || messages.find(message => message.direction === 'outbound' && message.client_id)?.client_id
    || selectableHubClients.find(item => item.status === 'online')?.id
    || selectableHubClients[0]?.id
    || ''
  ), [messages, selectableHubClients, selectedClientId]);

  useEffect(() => {
    if (selectedClientId && selectableHubClients.length > 0 && !selectableHubClients.some(item => item.id === selectedClientId)) {
      setSelectedClientId('');
    }
  }, [selectableHubClients, selectedClientId, setSelectedClientId]);

  return {
    rawChatId,
    mappedPhone,
    displayPhone,
    autoTranslateKey,
    selectableHubClients,
    activeClient,
    mappingHubClientId,
  };
}
