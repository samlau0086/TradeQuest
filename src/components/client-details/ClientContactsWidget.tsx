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
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
      <SectionHeader className="mb-2">Contacts</SectionHeader>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-xs font-bold uppercase text-slate-400">
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
                  <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
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
                  <div key={expandKey} className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden transition-all">
                    <button
                      onClick={() => onExpandedContactChange(isExpanded ? null : expandKey)}
                      className="w-full flex items-center justify-between p-2 hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("p-1.5 rounded-md shrink-0", method.type === 'whatsapp' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300')}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-slate-300 font-medium truncate">{method.value}</span>
                      </div>
                      <span className="text-xs font-medium text-cyan-400 shrink-0 ml-2">
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
