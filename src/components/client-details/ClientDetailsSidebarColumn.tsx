import type { Client, ClientContact, ClientStatus, Deal, Quote } from '../../store';
import { KnowledgeBaseManager } from '../KnowledgeBaseManager';
import { ClientAiRadarCard, type ClientAiRadarData } from './ClientAiRadarCard';
import { ClientContactActionBox } from './ClientContactActionBox';
import { ClientContactsWidget } from './ClientContactsWidget';
import { ClientConversationNotesWidget } from './ClientConversationNotesWidget';
import { ClientFollowUpAgentWidget } from './ClientFollowUpAgentWidget';
import { ClientProfileSidebarWidgets } from './ClientProfileSidebarWidgets';
import { ClientQuotesWidget } from './ClientQuotesWidget';
import { WidgetRail } from '../ui';

interface ClientDetailsSidebarColumnProps {
  client: Client;
  leadRecord: Deal | null;
  summaryText: string;
  relatedQuotes: Quote[];
  currencyRates: Record<string, number>;
  visibleAiData: ClientAiRadarData | null;
  loading: boolean;
  leadScore?: number;
  nextStepText: string;
  contacts: ClientContact[];
  expandedContactIdx: string | null;
  agentLoading: boolean;
  onStatusChange: (status: ClientStatus) => void;
  onOpenQuote: (quoteId: string) => void;
  onAnalyze: (refresh: boolean) => void;
  onInsertIcebreaker: () => void;
  onExpandedContactChange: (key: string | null) => void;
  onOpenEmailCompose: (email: string) => void;
  onOpenAgentSettings: () => void;
  onRunAgent: () => void;
}

export function ClientDetailsSidebarColumn({
  client,
  leadRecord,
  summaryText,
  relatedQuotes,
  currencyRates,
  visibleAiData,
  loading,
  leadScore,
  nextStepText,
  contacts,
  expandedContactIdx,
  agentLoading,
  onStatusChange,
  onOpenQuote,
  onAnalyze,
  onInsertIcebreaker,
  onExpandedContactChange,
  onOpenEmailCompose,
  onOpenAgentSettings,
  onRunAgent,
}: ClientDetailsSidebarColumnProps) {
  return (
    <WidgetRail>
      <ClientProfileSidebarWidgets
        client={client}
        leadRecord={leadRecord}
        summaryText={summaryText}
        onStatusChange={onStatusChange}
      />

      <ClientQuotesWidget
        quotes={relatedQuotes}
        leadRecord={leadRecord}
        currencyRates={currencyRates}
        onOpenQuote={onOpenQuote}
      />

      <ClientAiRadarCard
        visibleAiData={visibleAiData}
        loading={loading}
        leadScore={leadScore}
        summaryText={summaryText}
        nextStepText={nextStepText}
        hasLeadRecord={!!leadRecord}
        onAnalyze={onAnalyze}
        onInsertIcebreaker={onInsertIcebreaker}
      />

      <ClientContactsWidget
        client={client}
        contacts={contacts}
        expandedContactIdx={expandedContactIdx}
        onExpandedContactChange={onExpandedContactChange}
        renderContactAction={(method, closeContactAction) => (
          <ClientContactActionBox
            method={method}
            client={client}
            onClose={closeContactAction}
            onOpenEmailCompose={(email) => {
              onOpenEmailCompose(email);
              closeContactAction();
            }}
          />
        )}
      />

      <ClientFollowUpAgentWidget
        enabled={client.agentEnabled}
        mode={client.agentMode}
        summary={client.agentSummary}
        nextStep={client.agentNextStep}
        loading={agentLoading}
        onOpenSettings={onOpenAgentSettings}
        onRunAgent={onRunAgent}
      />

      <ClientConversationNotesWidget tags={client.tags || []} />

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <KnowledgeBaseManager clientId={client.id} />
      </div>
    </WidgetRail>
  );
}
