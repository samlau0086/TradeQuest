import type { ReactNode } from 'react';
import { ActionButton } from './ActionButton';
import { ModalDialog } from './ModalDialog';

type ConfirmDialogTone = 'danger' | 'primary';

interface ConfirmDialogProps {
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <ModalDialog
      title={title}
      footer={(
        <>
          <ActionButton tone="ghost" onClick={onCancel}>{cancelLabel}</ActionButton>
          <ActionButton tone={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </ActionButton>
        </>
      )}
    >
      <p className="text-sm text-slate-400">{message}</p>
    </ModalDialog>
  );
}
