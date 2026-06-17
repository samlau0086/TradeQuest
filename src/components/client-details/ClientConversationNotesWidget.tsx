import React from 'react';
import { Tag } from 'lucide-react';
import { EmptyState, SectionHeader } from '../ui';

interface ClientConversationNotesWidgetProps {
  tags?: string[];
}

export function ClientConversationNotesWidget({ tags = [] }: ClientConversationNotesWidgetProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader icon={<Tag className="w-4 h-4" />} className="mb-4">Conversation Notes</SectionHeader>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">{tag}</span>
        ))}
        {tags.length === 0 && <EmptyState tone="subtle" size="compact">No tags yet.</EmptyState>}
      </div>
    </div>
  );
}
