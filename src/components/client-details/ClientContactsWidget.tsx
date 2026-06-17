import React from 'react';
import { Globe2, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { Client, ClientContact, ContactMethod } from '../../store';
import { cn } from '../../lib/utils';
import { SectionHeader, StatusBadge } from '../ui';

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
  if (contacts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader className="mb-2">Contacts</SectionHeader>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
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
                    {contact.isPrimary && <StatusBadge tone="cyan">Key</StatusBadge>}
                  </div>
                  {contact.title && <div className="text-[11px] text-slate-500 mt-0.5">{contact.title}</div>}
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
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("p-1.5 rounded-md shrink-0", method.type === 'whatsapp' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500')}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="truncate text-sm font-medium text-slate-700">{method.value}</span>
                      </div>
                      <span className="ml-2 shrink-0 text-xs font-medium text-cyan-700">
                        {isExpanded ? 'Close' : method.type === 'whatsapp' ? 'Chat' : 'Action'}
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
    </div>
  );
}
