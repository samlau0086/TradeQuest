import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { cleanWhatsAppPhone, type WhatsAppConversation } from './whatsappMessageModel';

export interface WhatsAppChatMappingEdit {
  chatId: string;
  phone: string;
  saving?: boolean;
}

interface UseWhatsAppChatMappingOptions {
  conversation: WhatsAppConversation | null;
  activeClientId?: string;
  hubClientId: string;
  resetKey: string;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  setConversation: Dispatch<SetStateAction<WhatsAppConversation | null>>;
  reloadConversation: () => Promise<void>;
}

export function useWhatsAppChatMapping({
  conversation,
  activeClientId,
  hubClientId,
  resetKey,
  notify,
  setConversation,
  reloadConversation,
}: UseWhatsAppChatMappingOptions) {
  const [mappingEdit, setMappingEdit] = useState<WhatsAppChatMappingEdit | null>(null);

  useEffect(() => {
    setMappingEdit(null);
  }, [resetKey]);

  const startMapping = useCallback((chatId: string, phone: string) => {
    setMappingEdit({ chatId, phone });
  }, []);

  const changeMappingPhone = useCallback((phone: string) => {
    setMappingEdit(prev => prev ? { ...prev, phone } : prev);
  }, []);

  const cancelMapping = useCallback(() => {
    setMappingEdit(null);
  }, []);

  const canConfirmMapping = useMemo(() => Boolean(mappingEdit && cleanWhatsAppPhone(mappingEdit.phone)), [mappingEdit]);

  const confirmMapping = useCallback(async () => {
    if (!mappingEdit?.chatId) return;
    const phone = cleanWhatsAppPhone(mappingEdit.phone);
    if (!phone) {
      notify('Phone is required to map this WhatsApp chatId.', 'warning');
      return;
    }
    if (!hubClientId) {
      notify('Please select or connect a WhatsApp Hub client before confirming this mapping.', 'warning');
      return;
    }
    setMappingEdit(prev => prev ? { ...prev, saving: true } : prev);
    try {
      const response = await fetch('/api/whatsapp-hub/contact-mappings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          conversationId: conversation?.id,
          chatId: mappingEdit.chatId,
          phone,
          hubClientId,
          crmClientId: activeClientId
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update WhatsApp chatId mapping.');
      if (data.conversation) setConversation(data.conversation);
      setMappingEdit(null);
      notify('WhatsApp chatId mapping updated.', 'success');
      await reloadConversation();
    } catch (error: any) {
      notify(error.message || 'Failed to update WhatsApp chatId mapping.', 'error');
      setMappingEdit(prev => prev ? { ...prev, saving: false } : prev);
    }
  }, [activeClientId, conversation?.id, hubClientId, mappingEdit, notify, reloadConversation, setConversation]);

  return {
    mappingEdit,
    canConfirmMapping,
    startMapping,
    changeMappingPhone,
    cancelMapping,
    confirmMapping,
  };
}
