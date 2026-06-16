import type { Client, Deal, Log } from '../../store';

interface UseClientDetailsSelectionArgs {
  clients: Client[];
  deals: Deal[];
  logs: Log[];
  selectedClientId: string | null;
  selectedDealId: string | null;
}

export function useClientDetailsSelection({
  clients,
  deals,
  logs,
  selectedClientId,
  selectedDealId,
}: UseClientDetailsSelectionArgs) {
  const client = clients.find(item => item.id === selectedClientId);
  const selectedDeal = selectedDealId
    ? deals.find(deal => deal.id === selectedDealId && (!selectedClientId || deal.clientId === selectedClientId))
    : undefined;
  const leadRecord = selectedDeal || null;
  const leadLogs = logs.filter(log => {
    if (!client || log.clientId !== client.id) return false;
    if (!leadRecord) return true;
    return log.metadata?.leadId === leadRecord.id || log.metadata?.dealId === leadRecord.id;
  });
  const displayContacts = client
    ? ((client.contacts && client.contacts.length > 0)
        ? client.contacts
        : [{
            id: client.primaryContactId || 'primary',
            name: client.name,
            title: 'Key Contact',
            avatarUrl: undefined,
            isPrimary: true,
            contactMethods: client.contactMethods || []
          }])
    : [];

  return {
    client,
    leadRecord,
    leadLogs,
    displayContacts,
  };
}
