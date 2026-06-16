import { WhatsAppConversationPane } from './WhatsAppConversationPane';
import type { InboxSelectedDetailPanelProps } from './InboxContentPanelTypes';

export function InboxWhatsAppDetailContainer({
  language,
  currentUser,
  selectedWhatsAppPhone,
  setSelectedWhatsAppPhone,
  selectedWhatsAppClientId,
  setSelectedWhatsAppClientId,
  activeWhatsAppConversation,
  activeWhatsAppClient,
  activeUnifiedConversation,
  activeFollowUpAt,
  activeFollowUpNote,
  selectClient,
  updateConversationOwnerStage,
  updateActiveConversationFollowUp,
  handleDeleteWhatsAppConversation,
  loadWhatsAppConversations,
}: InboxSelectedDetailPanelProps) {
  if (!selectedWhatsAppPhone) return null;

  return (
    <WhatsAppConversationPane
      language={language}
      selectedWhatsAppPhone={selectedWhatsAppPhone}
      activeWhatsAppConversation={activeWhatsAppConversation}
      activeWhatsAppClient={activeWhatsAppClient}
      activeUnifiedConversation={activeUnifiedConversation}
      currentUser={currentUser}
      activeFollowUpAt={activeFollowUpAt}
      activeFollowUpNote={activeFollowUpNote}
      onBack={() => { setSelectedWhatsAppPhone(null); setSelectedWhatsAppClientId(null); }}
      onClientClick={() => {
        const id = activeWhatsAppClient?.id || activeWhatsAppConversation?.clientId;
        if (id) selectClient(id);
      }}
      onOwnerChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (ownerId) => {
        updateConversationOwnerStage(activeUnifiedConversation, { ownerId });
      } : undefined}
      onStageChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (stage) => {
        updateConversationOwnerStage(activeUnifiedConversation, { stage });
      } : undefined}
      onDeleteConversation={handleDeleteWhatsAppConversation}
      onSetFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note, 'open')}
      onClearFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
      onCompleteFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
      onCloseChat={() => {
        setSelectedWhatsAppPhone(null);
        setSelectedWhatsAppClientId(null);
        loadWhatsAppConversations();
      }}
    />
  );
}
