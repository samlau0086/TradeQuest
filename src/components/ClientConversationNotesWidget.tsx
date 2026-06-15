import React from 'react';
import { Tag } from 'lucide-react';

interface ClientConversationNotesWidgetProps {
  tags?: string[];
}

export function ClientConversationNotesWidget({ tags = [] }: ClientConversationNotesWidgetProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Tag className="w-4 h-4" /> Conversation Notes
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">{tag}</span>
        ))}
        {tags.length === 0 && <span className="text-sm text-slate-500">No tags yet.</span>}
      </div>
    </div>
  );
}
