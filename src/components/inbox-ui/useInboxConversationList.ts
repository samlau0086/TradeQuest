import { useMemo } from 'react';
import type { Client, EmailMessage } from '../../store';
import {
  InboxChannelFilter,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
  emailToUnifiedConversation,
  hasOpenWhatsAppFollowUp,
  mapUnifiedWhatsAppConversation,
  normalizeTagSearchTerm,
  whatsappToUnifiedConversation,
} from './inboxModel';

interface WhatsAppContactOption {
  key: string;
  clientId: string;
  clientName: string;
  clientCompany?: string;
  contactName: string;
  contactTitle?: string;
  phone: string;
  label: string;
  searchText: string;
}

interface UseInboxConversationListArgs {
  filter: 'inbox' | 'sent' | 'scheduled' | 'drafts';
  channelFilter: InboxChannelFilter;
  search: string;
  searchTags: string[];
  followUpOnly: boolean;
  emails: EmailMessage[];
  clients: Client[];
  whatsappConversations: InboxWhatsAppConversation[];
  unifiedConversations: UnifiedCommunicationConversation[];
  newWhatsAppPhone: string;
  showWhatsAppContactPicker: boolean;
}

export function useInboxConversationList({
  filter,
  channelFilter,
  search,
  searchTags,
  followUpOnly,
  emails,
  clients,
  whatsappConversations,
  unifiedConversations,
  newWhatsAppPhone,
  showWhatsAppContactPicker,
}: UseInboxConversationListArgs) {
  const unifiedFallbackConversations = useMemo(() => ([
    ...emails.map(emailToUnifiedConversation),
    ...whatsappConversations.map(whatsappToUnifiedConversation),
  ]), [emails, whatsappConversations]);

  const unifiedConversationSource = unifiedConversations.length > 0
    ? unifiedConversations
    : unifiedFallbackConversations;

  const hasUnifiedOpenFollowUp = (conversation: UnifiedCommunicationConversation) => {
    if (conversation.todo_at) return true;
    if (conversation.channel !== 'whatsapp') return false;
    return hasOpenWhatsAppFollowUp(mapUnifiedWhatsAppConversation(conversation));
  };

  const unifiedConversationList = useMemo(() => {
    const termsToMatch = [...searchTags];
    if (search.trim()) termsToMatch.push(...search.trim().toLowerCase().split(/\s+/));

    const isInCurrentMailbox = (conversation: UnifiedCommunicationConversation) => {
      if (channelFilter !== 'all' && conversation.channel !== channelFilter) return false;
      const emailType = String(conversation.metadata?.emailType || conversation.status || '').toLowerCase();
      if (conversation.channel === 'email') {
        if (filter === 'inbox') return conversation.direction !== 'outbound' && !['draft', 'scheduled'].includes(emailType);
        if (filter === 'sent') return conversation.direction === 'outbound' && !['draft', 'scheduled'].includes(emailType);
        if (filter === 'scheduled') return emailType === 'scheduled' || conversation.status === 'scheduled';
        if (filter === 'drafts') return emailType === 'draft' || conversation.status === 'draft';
        return true;
      }
      return filter === 'inbox';
    };

    return unifiedConversationSource
      .filter(conversation => {
        if (!isInCurrentMailbox(conversation)) return false;
        if (followUpOnly && !hasUnifiedOpenFollowUp(conversation)) return false;
        if (termsToMatch.length === 0) return true;
        const haystack = [
          conversation.title || '',
          conversation.subject || '',
          conversation.contact_name || '',
          conversation.contact_address || '',
          conversation.client_name || '',
          conversation.client_company || '',
          conversation.last_message_preview || '',
          ...(conversation.tags || []),
        ].join(' ').toLowerCase();
        return termsToMatch.every(term => {
          const normalized = term.toLowerCase();
          return normalized.startsWith('#')
            ? (conversation.tags || []).some(tag => normalizeTagSearchTerm(tag) === normalizeTagSearchTerm(normalized))
            : haystack.includes(normalized);
        });
      })
      .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
  }, [unifiedConversationSource, channelFilter, filter, followUpOnly, search, searchTags]);

  const visibleFollowUpCount = unifiedConversationSource.filter(hasUnifiedOpenFollowUp).length;

  const whatsappContactOptions = useMemo<WhatsAppContactOption[]>(() => {
    const options: WhatsAppContactOption[] = [];
    clients.forEach(client => {
      const pushMethod = (method: any, contactName: string, contactTitle?: string, suffix = '') => {
        if (method.type !== 'whatsapp') return;
        const phone = method.value || '';
        const normalized = phone.replace(/[^0-9]/g, '');
        if (!normalized) return;
        const label = `${contactName || client.name} - ${phone}`;
        options.push({
          key: `${client.id}:${suffix}:${normalized}`,
          clientId: client.id,
          clientName: client.name,
          clientCompany: client.company,
          contactName: contactName || client.name,
          contactTitle,
          phone,
          label,
          searchText: [
            client.name,
            client.company,
            client.country,
            contactName,
            contactTitle,
            phone,
            normalized,
          ].filter(Boolean).join(' ').toLowerCase(),
        });
      };

      (client.contactMethods || []).forEach((method, index) => pushMethod(method, client.name, undefined, `client-${index}`));
      (client.contacts || []).forEach(contact => {
        (contact.contactMethods || []).forEach((method, index) => pushMethod(method, contact.name || client.name, contact.title, `${contact.id}-${index}`));
      });
    });
    return options.sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [clients]);

  const whatsappMentionQuery = (() => {
    const atIndex = newWhatsAppPhone.lastIndexOf('@');
    return atIndex >= 0 ? newWhatsAppPhone.slice(atIndex + 1).trim().toLowerCase() : '';
  })();

  const visibleWhatsAppContactOptions = showWhatsAppContactPicker || newWhatsAppPhone.includes('@')
    ? whatsappContactOptions
      .filter(option => !whatsappMentionQuery || option.searchText.includes(whatsappMentionQuery))
      .slice(0, 8)
    : [];

  return {
    unifiedConversationSource,
    unifiedConversationList,
    visibleFollowUpCount,
    visibleWhatsAppContactOptions,
  };
}
