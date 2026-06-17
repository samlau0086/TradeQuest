import type { Client, ClientContact, ClientStatus, Deal, Quote } from '../../store';
import { KnowledgeBaseManager } from '../KnowledgeBaseManager';
import { ClientAiRadarCard, type ClientAiRadarData } from './ClientAiRadarCard';
import { ClientContactActionBox } from './ClientContactActionBox';
import { ClientContactsWidget } from './ClientContactsWidget';
import { ClientConversationNotesWidget } from './ClientConversationNotesWidget';
import { ClientFollowUpAgentWidget } from './ClientFollowUpAgentWidget';
import { ClientProfileSidebarWidgets } from './ClientProfileSidebarWidgets';
import { ClientQuotesWidget } from './ClientQuotesWidget';
import { ClientSidebarSection } from './ClientSidebarSection';
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
    <WidgetRail className="rounded-[28px] border border-slate-800 bg-[#07111f] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
      <ClientSidebarSection
        eyebrow="Record"
        title="Controls & Notes"
        description="Stage controls, pending approvals, and record-specific internal context."
      >
        <ClientProfileSidebarWidgets
          client={client}
          leadRecord={leadRecord}
          summaryText={summaryText}
          onStatusChange={onStatusChange}
        />
      </ClientSidebarSection>

      <ClientSidebarSection
        eyebrow="AI"
        title="Signals & Automation"
        description="AI analysis, follow-up automation, and next actions."
      >
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

        <ClientFollowUpAgentWidget
          enabled={client.agentEnabled}
          mode={client.agentMode}
          summary={client.agentSummary}
          nextStep={client.agentNextStep}
          loading={agentLoading}
          onOpenSettings={onOpenAgentSettings}
          onRunAgent={onRunAgent}
        />
      </ClientSidebarSection>

      <ClientSidebarSection
        eyebrow="Revenue"
        title="Quotes & Commercial"
        description="Keep pricing conversations and open commercial work visible."
      >
        <ClientQuotesWidget
          quotes={relatedQuotes}
          leadRecord={leadRecord}
          currencyRates={currencyRates}
          onOpenQuote={onOpenQuote}
        />
      </ClientSidebarSection>

      <ClientSidebarSection
        eyebrow="Relationship"
        title="People & Context"
        description="Contacts, communication methods, and shared conversation cues."
      >
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

        <ClientConversationNotesWidget tags={client.tags || []} />
      </ClientSidebarSection>

      <ClientSidebarSection
        eyebrow="Knowledge"
        title="RAG & Memory"
        description="Customer-specific knowledge, snippets, and reusable memory."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <KnowledgeBaseManager clientId={client.id} />
        </div>
      </ClientSidebarSection>
    </WidgetRail>
  );
}
