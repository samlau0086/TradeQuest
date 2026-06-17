import React from 'react';
import { Globe2, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { Client, ClientContact, ContactMethod, useStore } from '../../store';
import { cn } from '../../lib/utils';
import { ConversationSectionHeader, ConversationSectionCard } from '../inbox-ui/ConversationSectionCard';
import { ConversationToolbarPill } from '../inbox-ui/ConversationToolbar';

const CONTACT_ICONS = {
  email: Mail,
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  telegram: Send,
  phone: Phone,
  wechat: MessageCircle,
  website: Globe2
};

const contactInitials = (name: string | undefined | null) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || 'C').toUpperCase();
};

interface ClientContactsWidgetProps {
  client: Client;
  contacts: ClientContact[];
  expandedContactIdx: string | null;
  onExpandedContactChange: (key: string | null) => void;
  renderContactAction: (method: ContactMethod, onClose: () => void) => React.ReactNode;
}

export function ClientContactsWidget({
  client,
  contacts,
  expandedContactIdx,
  onExpandedContactChange,
  renderContactAction
}: ClientContactsWidgetProps) {
  const { language } = useStore();
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);

  if (contacts.length === 0) return null;

  return (
    <ConversationSectionCard className="shadow-sm">
      <ConversationSectionHeader
        title={label('联系人', 'Contacts')}
        className="mb-2"
      />
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-xs font-bold uppercase text-slate-500">
                  {contact.avatarUrl ? (
                    <img
                      src={contact.avatarUrl}
                      alt={contact.name || client.name}
                      className="h-full w-full object-cover"
                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span>{contactInitials(contact.name || client.name)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    {contact.name || client.name}
                    {contact.isPrimary && <ConversationToolbarPill tone="sky">{label('关键联系人', 'Key')}</ConversationToolbarPill>}
                  </div>
                  {contact.title && <div className="mt-0.5 text-[11px] text-slate-500">{contact.title}</div>}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {(contact.contactMethods || []).map((method, idx) => {
                const Icon = CONTACT_ICONS[method.type] || Mail;
                const expandKey = `${contact.id}_${idx}`;
                const isExpanded = expandedContactIdx === expandKey;
                return (
                  <div key={expandKey} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-all">
                    <button
                      onClick={() => onExpandedContactChange(isExpanded ? null : expandKey)}
                      className="flex w-full items-center justify-between p-2.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={cn('shrink-0 rounded-md p-1.5', method.type === 'whatsapp' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500')}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="truncate text-sm font-medium text-slate-700">{method.value}</span>
                      </div>
                      <span className="ml-2 shrink-0 text-xs font-medium text-cyan-700">
                        {isExpanded ? label('关闭', 'Close') : method.type === 'whatsapp' ? label('聊天', 'Chat') : label('操作', 'Action')}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-2 pb-2">
                        {renderContactAction(method, () => onExpandedContactChange(null))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ConversationSectionCard>
  );
}
