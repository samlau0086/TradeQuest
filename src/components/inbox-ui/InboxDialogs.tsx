import React from 'react';

interface InboxConfirmDialogProps {
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function InboxConfirmDialog({ message, onConfirm, onCancel }: InboxConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-4">Confirm Action</h3>
        <p className="text-slate-300 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-500 rounded transition-colors shadow shadow-red-600/20"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

interface InboxNotificationDialogProps {
  message: string;
  onClose: () => void;
}

export function InboxNotificationDialog({ message, onClose }: InboxNotificationDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-bold text-cyan-400 mb-4">Notification</h3>
        <p className="text-slate-300 text-sm mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-cyan-600 text-white hover:bg-cyan-500 rounded transition-colors shadow shadow-cyan-600/20"
          >
            OK
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-white mb-4">Add Tag</h3>
        <input
          type="text"
          value={tagInput}
          onChange={e => onTagInputChange(e.target.value)}
          placeholder="e.g. VIP, Urgent"
          className="w-full bg-slate-800 border-slate-700 text-white rounded p-2 mb-4"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') onSubmit();
            else if (e.key === 'Escape') onClose();
          }}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
          <button onClick={onSubmit} disabled={!tagInput.trim()} className="px-4 py-2 bg-cyan-600 text-white rounded-md disabled:opacity-50">Add</button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-white mb-4">Add Email to Todo</h3>
        <label className="text-xs text-slate-400 block mb-1">Due Date & Time</label>
        <input
          type="datetime-local"
          value={todoAt}
          onChange={e => onTodoAtChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 mb-4"
        />
        <label className="text-xs text-slate-400 block mb-1">Note (Optional)</label>
        <textarea
          value={todoNote}
          onChange={e => onTodoNoteChange(e.target.value)}
          placeholder="E.g. Follow up with a proposal..."
          className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 mb-4 min-h-[80px]"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
          <button onClick={onSubmit} disabled={!todoAt} className="px-4 py-2 bg-cyan-600 text-white rounded-md disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  );
}
