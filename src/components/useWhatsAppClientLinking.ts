import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { type Client } from '../store';
import { type WhatsAppConversation } from './whatsappMessageModel';

interface UseWhatsAppClientLinkingOptions {
  clients: Client[];
  conversation: WhatsAppConversation | null;
  displayPhone: string;
  setConversation: Dispatch<SetStateAction<WhatsAppConversation | null>>;
  selectClient: (id: string | null) => void;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useWhatsAppClientLinking({
  clients,
  conversation,
  displayPhone,
  setConversation,
  selectClient,
  notify,
}: UseWhatsAppClientLinkingOptions) {
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isAddingContactToClient, setIsAddingContactToClient] = useState(false);

  const openCreateLead = useCallback(() => setIsCreatingLead(true), []);
  const closeCreateLead = useCallback(() => setIsCreatingLead(false), []);
  const openAddToExistingClient = useCallback(() => setIsAddingContactToClient(true), []);
  const closeAddToExistingClient = useCallback(() => setIsAddingContactToClient(false), []);

  const newLeadInitialData = useMemo<Partial<Client>>(() => ({
    name: conversation?.clientName || displayPhone,
    company: conversation?.clientCompany || 'Unknown',
    country: 'Unknown',
    status: 'Leads',
    tags: ['whatsapp'],
    contactMethods: [{ type: 'whatsapp', value: displayPhone }],
    contacts: [{
      id: `contact_${Date.now()}`,
      name: conversation?.clientName || displayPhone,
      title: '',
      isPrimary: true,
      contactMethods: [{ type: 'whatsapp', value: displayPhone }]
    }]
  }), [conversation?.clientCompany, conversation?.clientName, displayPhone]);

  const linkConversationToClient = useCallback(async (clientId: string) => {
    const linkedClient = clients.find(item => item.id === clientId);
    if (conversation?.id) {
      try {
        const response = await fetch(conversation.unifiedId ? `/api/conversations/${conversation.unifiedId}` : `/api/whatsapp-hub/conversations/${conversation.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            clientId,
            clientName: linkedClient?.name || displayPhone,
            clientCompany: linkedClient?.company || ''
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to link WhatsApp conversation');
      } catch (error: any) {
        notify(error.message || 'Failed to link WhatsApp conversation.', 'warning');
      }
    }
    setConversation(prev => prev ? {
      ...prev,
      clientId,
      clientName: linkedClient?.name || displayPhone,
      clientCompany: linkedClient?.company || ''
    } : prev);
    selectClient(clientId);
  }, [clients, conversation?.id, conversation?.unifiedId, displayPhone, notify, selectClient, setConversation]);

  const handleLeadCreated = useCallback(async (newClientId: string) => {
    await linkConversationToClient(newClientId);
    closeCreateLead();
  }, [closeCreateLead, linkConversationToClient]);

  const handleExistingClientLinked = useCallback(async (clientId: string) => {
    await linkConversationToClient(clientId);
  }, [linkConversationToClient]);

  return {
    isCreatingLead,
    isAddingContactToClient,
    openCreateLead,
    closeCreateLead,
    openAddToExistingClient,
    closeAddToExistingClient,
    newLeadInitialData,
    linkConversationToClient,
    handleLeadCreated,
    handleExistingClientLinked,
  };
}
