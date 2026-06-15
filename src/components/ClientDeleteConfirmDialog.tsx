import React from 'react';

interface ClientDeleteConfirmDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClientDeleteConfirmDialog({ onCancel, onConfirm }: ClientDeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
        <h3 className="text-lg font-bold text-white mb-2">Delete Client & Leads?</h3>
        <p className="text-slate-400 mb-6 text-sm">Are you sure you want to delete this client? All associated leads and data will be lost. This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow font-medium transition-colors">Delete Client</button>
        </div>
      </div>
    </div>
  );
}
