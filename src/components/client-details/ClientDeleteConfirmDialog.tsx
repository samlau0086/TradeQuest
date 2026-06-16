import React from 'react';
import { ConfirmDialog } from '../ui';

interface ClientDeleteConfirmDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClientDeleteConfirmDialog({ onCancel, onConfirm }: ClientDeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      title="Delete Client & Leads?"
      message="Are you sure you want to delete this client? All associated leads and data will be lost. This cannot be undone."
      confirmLabel="Delete Client"
      tone="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
