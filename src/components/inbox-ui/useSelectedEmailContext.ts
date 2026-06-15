import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Client, Deal, EmailMessage, KnowledgeItem, Product } from '../../store';
import { buildUnifiedAgentContext, extractLatestMessageText } from '../../lib/agentContext';
import { getInboxFilterForEmail } from './inboxModel';

type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';

interface UseSelectedEmailContextArgs {
  selectedEmailId: string | null;
  emails: EmailMessage[];
  clients: Client[];
  logs: any[];
  deals: Deal[];
  knowledgeBase: KnowledgeItem[];
  products: Product[];
  filter: InboxMailFilter;
  setFilter: Dispatch<SetStateAction<InboxMailFilter>>;
}

export function useSelectedEmailContext({
  selectedEmailId,
  emails,
  clients,
  logs,
  deals,
  knowledgeBase,
  products,
  filter,
  setFilter,
}: UseSelectedEmailContextArgs) {
  const [expandedTrackingEmailIds, setExpandedTrackingEmailIds] = useState<Set<string>>(new Set());

  const selectedEmail = emails.find(email => email.id === selectedEmailId);
  const selectedEmailIsInbound = selectedEmail ? ['inbox', 'inbound'].includes(selectedEmail.type) : false;
  const selectedEmailContactAddress = selectedEmail
    ? (selectedEmailIsInbound ? selectedEmail.sender : selectedEmail.recipient)
    : '';
  const selectedEmailClient = selectedEmail?.clientId ? clients.find(client => client.id === selectedEmail.clientId) : null;
  const latestInboundEmailForSelectedClient = selectedEmailClient
    ? emails
        .filter(email => email.clientId === selectedEmailClient.id && ['inbox', 'inbound'].includes(email.type))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const selectedEmailAgentContext = selectedEmail
    ? buildUnifiedAgentContext({
        channel: 'email',
        subject: selectedEmail.subject,
        contactLabel: selectedEmailContactAddress,
        client: selectedEmailClient,
        messages: [
          latestInboundEmailForSelectedClient && latestInboundEmailForSelectedClient.id !== selectedEmail.id ? {
            id: latestInboundEmailForSelectedClient.id,
            direction: 'inbound',
            subject: latestInboundEmailForSelectedClient.subject,
            body: extractLatestMessageText(latestInboundEmailForSelectedClient.body || ''),
            createdAt: latestInboundEmailForSelectedClient.date,
            channel: 'email',
            sender: latestInboundEmailForSelectedClient.senderName || latestInboundEmailForSelectedClient.sender,
          } : null,
          {
            id: selectedEmail.id,
            direction: selectedEmailIsInbound ? 'inbound' : 'outbound',
            subject: selectedEmail.subject,
            body: extractLatestMessageText(selectedEmail.body || ''),
            createdAt: selectedEmail.date,
            channel: 'email',
            sender: selectedEmailIsInbound ? (selectedEmail.senderName || selectedEmail.sender) : selectedEmail.sender,
          },
        ].filter(Boolean) as any,
        emails,
        logs,
        deals,
        knowledgeBase,
        products,
        currentMessageId: selectedEmail.id,
        extraFacts: [
          selectedEmail.senderIp ? `Sender IP: ${selectedEmail.senderIp}` : '',
          selectedEmail.senderCountry ? `Sender country: ${selectedEmail.senderCountry}` : '',
        ],
      })
    : { cacheKey: '', body: '', additionalContext: '', hasCustomerMessage: false };

  useEffect(() => {
    if (!selectedEmail) return;
    const nextFilter = getInboxFilterForEmail(selectedEmail);
    if (filter !== nextFilter) setFilter(nextFilter);
  }, [selectedEmail?.id, selectedEmail?.type, filter, setFilter]);

  const selectedTrackingEvents = [...(selectedEmail?.trackingEvents || [])].sort((a: any, b: any) => (
    new Date(b.created_at || b.createdAt || b.date || 0).getTime() - new Date(a.created_at || a.createdAt || a.date || 0).getTime()
  ));
  const isTrackingExpanded = selectedEmail ? expandedTrackingEmailIds.has(selectedEmail.id) : false;
  const visibleTrackingEvents = isTrackingExpanded ? selectedTrackingEvents : selectedTrackingEvents.slice(0, 3);

  const toggleTrackingExpanded = (emailId: string) => {
    setExpandedTrackingEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) next.delete(emailId);
      else next.add(emailId);
      return next;
    });
  };

  return {
    selectedEmail,
    selectedEmailIsInbound,
    selectedEmailContactAddress,
    selectedEmailClient,
    latestInboundEmailForSelectedClient,
    selectedEmailAgentContext,
    selectedTrackingEvents,
    isTrackingExpanded,
    visibleTrackingEvents,
    toggleTrackingExpanded,
  };
}
