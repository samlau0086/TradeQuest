import { ClientFormModal } from '../ClientFormModal';
import type { Client, Deal } from '../../store';
import { ClientAgentSettingsModal } from './ClientAgentSettingsModal';
import { ClientDeleteConfirmDialog } from './ClientDeleteConfirmDialog';
import { ClientEmailComposeOverlay } from './ClientEmailComposeOverlay';

interface ClientDetailsOverlaysProps {
  client: Client;
  leadRecord: Deal | null;
  language: string;
  showEditModal: boolean;
  agentSettingsOpen: boolean;
  confirmDeleteTarget: boolean;
  showEmailCompose: boolean;
  composeRecipient: string;
  composeInitialBody: string;
  onCloseEditModal: () => void;
  onCloseAgentSettings: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onOpenEmailComposeInInbox: () => void;
  onCloseEmailCompose: () => void;
}

export function ClientDetailsOverlays({
  client,
  leadRecord,
  language,
  showEditModal,
  agentSettingsOpen,
  confirmDeleteTarget,
  showEmailCompose,
  composeRecipient,
  composeInitialBody,
  onCloseEditModal,
  onCloseAgentSettings,
  onCancelDelete,
  onConfirmDelete,
  onOpenEmailComposeInInbox,
  onCloseEmailCompose,
}: ClientDetailsOverlaysProps) {
  return (
    <>
      {showEditModal && <ClientFormModal clientId={client.id} onClose={onCloseEditModal} />}

      {agentSettingsOpen && <ClientAgentSettingsModal client={client} onClose={onCloseAgentSettings} />}

      {confirmDeleteTarget && (
        <ClientDeleteConfirmDialog
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      )}

      {showEmailCompose && (
        <ClientEmailComposeOverlay
          language={language}
          recipient={composeRecipient}
          subject={leadRecord ? `Follow up: ${leadRecord.name}` : `Follow up from ${client.company || client.name}`}
          initialBody={composeInitialBody}
          onOpenInInbox={onOpenEmailComposeInInbox}
          onClose={onCloseEmailCompose}
        />
      )}
    </>
  );
}
