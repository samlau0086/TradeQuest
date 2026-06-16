import React from 'react';
import { type Client, type MediaItem } from '../store';
import { AddContactToClientModal } from './AddContactToClientModal';
import { ClientFormModal } from './ClientFormModal';
import { MediaSelectorModal } from './MediaSelectorModal';

interface WhatsAppDialogLayerProps {
  showMediaSelector: boolean;
  isCreatingLead: boolean;
  isAddingContactToClient: boolean;
  displayPhone: string;
  conversationClientName?: string;
  newLeadInitialData: Partial<Client>;
  onSelectMedia: (media: MediaItem) => void;
  onCloseMediaSelector: () => void;
  onCloseCreateLead: () => void;
  onLeadCreated: (clientId: string) => void | Promise<void>;
  onCloseAddToExistingClient: () => void;
  onExistingClientLinked: (clientId: string) => void | Promise<void>;
}

export function WhatsAppDialogLayer({
  showMediaSelector,
  isCreatingLead,
  isAddingContactToClient,
  displayPhone,
  conversationClientName,
  newLeadInitialData,
  onSelectMedia,
  onCloseMediaSelector,
  onCloseCreateLead,
  onLeadCreated,
  onCloseAddToExistingClient,
  onExistingClientLinked,
}: WhatsAppDialogLayerProps) {
  return (
    <>
      {showMediaSelector && (
        <MediaSelectorModal
          onSelect={(_, media) => onSelectMedia(media)}
          onClose={onCloseMediaSelector}
          allowedTypes={[]}
        />
      )}
      {isCreatingLead && (
        <ClientFormModal
          onClose={onCloseCreateLead}
          initialData={newLeadInitialData}
          onSave={onLeadCreated}
        />
      )}
      {isAddingContactToClient && (
        <AddContactToClientModal
          contactMethod={{ type: 'whatsapp', value: displayPhone }}
          displayName={conversationClientName || displayPhone}
          onClose={onCloseAddToExistingClient}
          onLinked={onExistingClientLinked}
        />
      )}
    </>
  );
}
