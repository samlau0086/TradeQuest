import { MouseEvent, useState } from 'react';
import { EmailMessage } from '../../store';
import { InboxWhatsAppConversation, UnifiedCommunicationConversation } from './inboxModel';

interface UseInboxSelectionArgs {
  unifiedConversationList: UnifiedCommunicationConversation[];
  emails: EmailMessage[];
  whatsappConversations: InboxWhatsAppConversation[];
  unifiedConversations: UnifiedCommunicationConversation[];
}

export function useInboxSelection({
  unifiedConversationList,
  emails,
  whatsappConversations,
  unifiedConversations,
}: UseInboxSelectionArgs) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedWhatsAppIds, setSelectedWhatsAppIds] = useState<Set<string>>(new Set());
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());

  const visibleEmailIds = unifiedConversationList
    .filter(conversation => conversation.channel === 'email')
    .map(conversation => conversation.source_id)
    .filter(id => emails.some(email => email.id === id));

  const visibleWhatsAppIds = unifiedConversationList
    .filter(conversation => conversation.channel === 'whatsapp')
    .map(conversation => conversation.source_id)
    .filter(id => whatsappConversations.some(conversation => conversation.id === id) || unifiedConversations.some(conversation => conversation.channel === 'whatsapp' && conversation.source_id === id));

  const visibleConversationIds = unifiedConversationList.map(conversation => conversation.id);
  const selectedUnifiedConversations = unifiedConversationList.filter(conversation => selectedConversationIds.has(conversation.id));
  const selectedCount = selectedConversationIds.size;
  const selectableVisibleCount = visibleConversationIds.length;
  const totalVisibleCount = unifiedConversationList.length;
  const allVisibleSelected = selectableVisibleCount > 0
    && visibleConversationIds.every(id => selectedConversationIds.has(id));
  const someVisibleSelected = visibleConversationIds.some(id => selectedConversationIds.has(id));
  const selectedWhatsAppConversations = whatsappConversations.filter(conversation => selectedWhatsAppIds.has(conversation.id));

  const toggleSelection = (event: MouseEvent, id: string) => {
    event.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleWhatsAppSelection = (event: MouseEvent, id: string) => {
    event.stopPropagation();
    const next = new Set(selectedWhatsAppIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedWhatsAppIds(next);
  };

  const toggleUnifiedSelection = (event: MouseEvent, conversation: UnifiedCommunicationConversation) => {
    event.stopPropagation();
    const next = new Set(selectedConversationIds);
    if (next.has(conversation.id)) next.delete(conversation.id);
    else next.add(conversation.id);
    setSelectedConversationIds(next);

    if (conversation.channel === 'email') {
      const emailSet = new Set(selectedIds);
      if (next.has(conversation.id)) emailSet.add(conversation.source_id);
      else emailSet.delete(conversation.source_id);
      setSelectedIds(emailSet);
    } else if (conversation.channel === 'whatsapp') {
      const whatsappSet = new Set(selectedWhatsAppIds);
      if (next.has(conversation.id)) whatsappSet.add(conversation.source_id);
      else whatsappSet.delete(conversation.source_id);
      setSelectedWhatsAppIds(whatsappSet);
    }
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedConversationIds(new Set());
      setSelectedIds(new Set());
      setSelectedWhatsAppIds(new Set());
    } else {
      setSelectedConversationIds(new Set(visibleConversationIds));
      setSelectedIds(new Set(visibleEmailIds));
      setSelectedWhatsAppIds(new Set(visibleWhatsAppIds));
    }
  };

  const clearBulkSelection = () => {
    setSelectedConversationIds(new Set());
    setSelectedIds(new Set());
    setSelectedWhatsAppIds(new Set());
  };

  const toggleGroupSelection = (event: MouseEvent, ids: string[]) => {
    event.stopPropagation();
    const next = new Set(selectedIds);
    const allSelected = ids.every(id => next.has(id));
    ids.forEach(id => {
      if (allSelected) next.delete(id);
      else next.add(id);
    });
    setSelectedIds(next);
  };

  return {
    selectedIds,
    selectedWhatsAppIds,
    selectedConversationIds,
    selectedUnifiedConversations,
    selectedCount,
    selectableVisibleCount,
    totalVisibleCount,
    allVisibleSelected,
    someVisibleSelected,
    selectedWhatsAppConversations,
    toggleSelection,
    toggleWhatsAppSelection,
    toggleUnifiedSelection,
    toggleSelectAll,
    clearBulkSelection,
    toggleGroupSelection,
  };
}
