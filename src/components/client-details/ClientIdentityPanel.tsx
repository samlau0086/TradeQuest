import React from 'react';
import {
  Building2,
  Globe2,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  Tags,
  User2,
} from 'lucide-react';
import { Client, ClientContact, ContactMethod, Deal } from '../../store';
import { useStore } from '../../store';

const CONTACT_ICON_MAP: Record<ContactMethod['type'], React.ComponentType<{ className?: string }>> = {
  email: Mail,
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  telegram: Send,
  phone: Phone,
  wechat: MessageCircle,
  website: Globe2,
};

const panelClass = 'rounded-[28px] border border-slate-200 bg-white shadow-sm';
const innerCardClass = 'rounded-2xl border border-slate-200 bg-slate-50/85 p-4';

const getInitials = (name: string | undefined | null) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || 'C').toUpperCase();
};

const formatLastContact = (value?: string) => {
  if (!value) return 'No recent touchpoint';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

interface ClientIdentityPanelProps {
  client: Client;
  leadRecord?: Deal | null;
  contacts: ClientContact[];
}

function PropertyCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={innerCardClass}>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

export function ClientIdentityPanel({
  client,
  leadRecord,
  contacts,
}: ClientIdentityPanelProps) {
  const products = useStore((state) => state.products);

  const allProductIds = Array.from(
    new Set([...(client.productIds || []), ...(leadRecord?.productIds || [])]),
  );

  const relatedProducts = allProductIds
    .map((productId) => products.find((item) => item.id === productId))
    .filter(Boolean);

  const allMethods = contacts.flatMap((contact) => contact.contactMethods || []);
  const primaryContact = contacts.find((contact) => contact.isPrimary) || contacts[0];
  const status = leadRecord?.status || client.status;
  const location = [client.city, client.state, client.country].filter(Boolean).join(', ');
  const sourceLabel = leadRecord?.sourceLabel || client.sourceLabel || 'Manual';
  const sourceId = leadRecord?.sourceId || client.sourceId;
  const recordValue = leadRecord ? `$${leadRecord.value.toLocaleString()}` : '—';
  const leadScore = leadRecord?.leadScore ?? client.leadScore;

  return (
    <div className="space-y-4">
      <section className={`overflow-hidden ${panelClass}`}>
        <div className="border-b border-slate-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm font-semibold uppercase text-slate-500 shadow-sm">
              {primaryContact?.avatarUrl ? (
                <img
                  src={primaryContact.avatarUrl}
                  alt={primaryContact.name || client.name}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{getInitials(primaryContact?.name || client.name)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  {leadRecord ? 'Lead Record' : 'Client Record'}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                  {status}
                </span>
              </div>

              <h2 className="truncate text-[28px] font-semibold tracking-tight text-slate-950">
                {primaryContact?.name || client.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {client.company || 'No company on file'}
                </span>
                {primaryContact?.title && (
                  <span className="inline-flex items-center gap-1.5">
                    <User2 className="h-4 w-4 text-slate-400" />
                    {primaryContact.title}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Contact Methods</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{allMethods.length}</div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Linked Products</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{relatedProducts.length}</div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Potential Value</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{recordValue}</div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Last Touchpoint</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{formatLastContact(client.lastContact)}</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Company & Record Properties
          </div>
          <div className="space-y-3">
            <PropertyCard icon={MapPin} label="Location" value={location || 'Not set'} />
            <PropertyCard icon={Languages} label="Preferred Language" value={client.preferredLanguage || 'Not set'} />
            <PropertyCard
              icon={Send}
              label="Source"
              value={(
                <div className="space-y-1">
                  <div>{sourceLabel}</div>
                  {sourceId && <div className="font-mono text-[11px] text-slate-500">ID: {sourceId}</div>}
                </div>
              )}
            />
            <PropertyCard
              icon={Sparkles}
              label="Lead Score"
              value={leadScore != null ? `${leadScore}/100` : 'Not analyzed'}
            />
            <PropertyCard
              icon={Tags}
              label="Tags"
              value={client.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : 'No tags yet'}
            />
          </div>
        </div>
      </section>

      <section className={`${panelClass} p-5`}>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Contacts
        </div>
        <div className="space-y-3">
          {contacts.slice(0, 3).map((contact) => (
            <div key={contact.id} className={innerCardClass}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {contact.name || client.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {contact.title || contact.department || (contact.isPrimary ? 'Key Contact' : 'Contact')}
                  </div>
                </div>
                {contact.isPrimary && (
                  <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                    Key
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {(contact.contactMethods || []).slice(0, 3).map((method, index) => {
                  const Icon = CONTACT_ICON_MAP[method.type] || Mail;
                  return (
                    <div key={`${contact.id}-${method.type}-${index}`} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{method.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${panelClass} p-5`}>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Product Focus
        </div>
        {relatedProducts.length > 0 ? (
          <div className="space-y-3">
            {relatedProducts.slice(0, 4).map((product) => (
              <div key={product!.id} className={innerCardClass}>
                <div className="text-sm font-semibold text-slate-900">{product!.name}</div>
                {product!.salesPoints && (
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {product!.salesPoints}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
            No linked products yet.
          </div>
        )}
      </section>
    </div>
  );
}
