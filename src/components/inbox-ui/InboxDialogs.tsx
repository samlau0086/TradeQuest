import { ActionButton, ConfirmDialog, ModalDialog } from '../ui';

interface InboxConfirmDialogProps {
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function InboxConfirmDialog({ message, onConfirm, onCancel }: InboxConfirmDialogProps) {
  return (
    <ConfirmDialog
      title="Confirm Action"
      message={message}
      tone="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

interface InboxNotificationDialogProps {
  message: string;
  onClose: () => void;
}

export function InboxNotificationDialog({ message, onClose }: InboxNotificationDialogProps) {
  return (
    <ModalDialog
      title="Notification"
      titleClassName="text-cyan-400"
      footer={<ActionButton tone="primary" onClick={onClose}>OK</ActionButton>}
    >
      <p className="text-sm text-slate-300">{message}</p>
    </ModalDialog>
  );
}

interface EmailTagDialogProps {
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function EmailTagDialog({ tagInput, onTagInputChange, onSubmit, onClose }: EmailTagDialogProps) {
  return (
    <ModalDialog
      title="Add Tag"
      footer={(
        <>
          <ActionButton tone="ghost" onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="primary" onClick={onSubmit} disabled={!tagInput.trim()}>Add</ActionButton>
        </>
      )}
    >
      <input
        type="text"
        value={tagInput}
        onChange={e => onTagInputChange(e.target.value)}
        placeholder="e.g. VIP, Urgent"
        className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') onSubmit();
          else if (e.key === 'Escape') onClose();
        }}
      />
    </ModalDialog>
  );
}

interface EmailTodoDialogProps {
  todoAt: string;
  todoNote: string;
  onTodoAtChange: (value: string) => void;
  onTodoNoteChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function EmailTodoDialog({
  todoAt,
  todoNote,
  onTodoAtChange,
  onTodoNoteChange,
  onSubmit,
  onClose,
}: EmailTodoDialogProps) {
  return (
    <ModalDialog
      title="Add Email to Todo"
      className="max-w-md"
      footer={(
        <>
          <ActionButton tone="ghost" onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="primary" onClick={onSubmit} disabled={!todoAt}>Save</ActionButton>
        </>
      )}
    >
      <label className="mb-1 block text-xs text-slate-400">Due Date & Time</label>
      <input
        type="datetime-local"
        value={todoAt}
        onChange={e => onTodoAtChange(e.target.value)}
        className="mb-4 w-full rounded border border-slate-700 bg-slate-800 p-2 text-white"
      />
      <label className="mb-1 block text-xs text-slate-400">Note (Optional)</label>
      <textarea
        value={todoNote}
        onChange={e => onTodoNoteChange(e.target.value)}
        placeholder="E.g. Follow up with a proposal..."
        className="min-h-[80px] w-full rounded border border-slate-700 bg-slate-800 p-2 text-white"
      />
    </ModalDialog>
  );
}
