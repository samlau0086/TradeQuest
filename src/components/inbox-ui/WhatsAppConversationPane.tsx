import React from 'react';
import type { Client } from '../../store';
import { WhatsAppChatModal } from '../WhatsAppChatModal';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { ConversationFollowUpStrip } from './ConversationFollowUpStrip';
import type { InboxWhatsAppConversation, UnifiedCommunicationConversation } from './inboxModel';

interface WhatsAppConversationPaneProps {
  language: string;
  selectedWhatsAppPhone: string;
  activeWhatsAppConversation?: InboxWhatsAppConversation | null;
  activeWhatsAppClient?: Client | null;
  activeUnifiedConversation?: UnifiedCommunicationConversation | null;
  currentUser?: { id: string } | null;
  activeFollowUpAt?: string | null;
  activeFollowUpNote?: string | null;
  onBack: () => void;
  onClientClick: () => void;
  onOwnerChange?: (ownerId: string | null) => void;
  onStageChange?: (stage: string | null) => void;
  onDeleteConversation: (conversation: InboxWhatsAppConversation) => void;
  onSetFollowUp: (dueAt: string, note: string) => void | Promise<void>;
  onClearFollowUp: () => void | Promise<void>;
  onCompleteFollowUp: () => void | Promise<void>;
  onCloseChat: () => void;
}

export function WhatsAppConversationPane({
  language,
  selectedWhatsAppPhone,
  activeWhatsAppConversation,
  activeWhatsAppClient,
  activeUnifiedConversation,
  currentUser,
  activeFollowUpAt,
  activeFollowUpNote,
  onBack,
  onClientClick,
  onOwnerChange,
  onStageChange,
  onDeleteConversation,
  onSetFollowUp,
  onClearFollowUp,
  onCompleteFollowUp,
  onCloseChat,
}: WhatsAppConversationPaneProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {activeWhatsAppConversation && (
        <ConversationDetailHeader
          language={language}
          channel="whatsapp"
          title={activeWhatsAppClient?.name || activeWhatsAppConversation.clientName || activeWhatsAppConversation.targetPhone}
          subtitle={activeWhatsAppConversation.contactPhone || activeWhatsAppConversation.targetPhone}
          clientId={activeWhatsAppClient?.id || activeWhatsAppConversation.clientId}
          clientName={activeWhatsAppClient?.name || activeWhatsAppConversation.clientName}
          tags={activeUnifiedConversation?.tags || activeWhatsAppConversation.tags || []}
          ownerId={activeUnifiedConversation?.owner_id}
          stage={activeUnifiedConversation?.stage}
          currentUser={currentUser}
          onBack={onBack}
          onClientClick={onClientClick}
          onOwnerChange={onOwnerChange}
          onStageChange={onStageChange}
          onDelete={() => onDeleteConversation(activeWhatsAppConversation)}
          meta={activeWhatsAppConversation.rawChatId && activeWhatsAppConversation.rawChatId !== activeWhatsAppConversation.targetPhone ? (
            <span>{activeWhatsAppConversation.rawChatId} -&gt; {activeWhatsAppConversation.targetPhone}</span>
          ) : undefined}
        />
      )}
      <ConversationFollowUpStrip
        language={language}
        dueAt={activeFollowUpAt}
        note={activeFollowUpNote}
        onSet={onSetFollowUp}
        onClear={onClearFollowUp}
        onComplete={onCompleteFollowUp}
      />
      <WhatsAppChatModal
        key={activeWhatsAppConversation?.id || selectedWhatsAppPhone}
        embedded
        phone={selectedWhatsAppPhone}
        client={activeWhatsAppClient || undefined}
        conversation={activeWhatsAppConversation || undefined}
        onClose={onCloseChat}
      />
    </div>
  );
}
