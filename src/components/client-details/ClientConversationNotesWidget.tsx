import React from 'react';
import { Tag } from 'lucide-react';
import { useStore } from '../../store';
import { ConversationSectionHeader, ConversationSectionCard } from '../inbox-ui/ConversationSectionCard';

interface ClientConversationNotesWidgetProps {
  tags?: string[];
}

export function ClientConversationNotesWidget({ tags = [] }: ClientConversationNotesWidgetProps) {
  const { language } = useStore();
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <ConversationSectionCard className="shadow-sm">
      <ConversationSectionHeader
        icon={<Tag className="h-4 w-4 text-slate-500" />}
        title={label('会话标签', 'Conversation Notes')}
        className="mb-4"
      />
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">{tag}</span>
        ))}
        {tags.length === 0 && (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            {label('当前还没有标签。', 'No tags yet.')}
          </div>
        )}
      </div>
    </ConversationSectionCard>
  );
}
