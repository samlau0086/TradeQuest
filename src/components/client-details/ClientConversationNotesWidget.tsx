import React from 'react';
import { Tag } from 'lucide-react';
import { SectionHeader } from '../ui';

interface ClientConversationNotesWidgetProps {
  tags?: string[];
}

export function ClientConversationNotesWidget({ tags = [] }: ClientConversationNotesWidgetProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
      <SectionHeader icon={<Tag className="w-4 h-4" />} className="mb-4">Conversation Notes</SectionHeader>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">{tag}</span>
        ))}
        {tags.length === 0 && <span className="text-sm text-slate-500">No tags yet.</span>}
      </div>
    </div>
  );
}
