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
import { Client, ClientContact, ContactMethod, Deal, useStore } from '../../store';
import { ConversationSectionCard, ConversationSectionHeader } from '../inbox-ui/ConversationSectionCard';
import { ConversationToolbarPill } from '../inbox-ui/ConversationToolbar';

const CONTACT_ICON_MAP: Record<ContactMethod['type'], React.ComponentType<{ className?: string }>> = {
  email: Mail,
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  telegram: Send,
  phone: Phone,
  wechat: MessageCircle,
  website: Globe2,
};

const getInitials = (name: string | undefined | null) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || 'C').toUpperCase();
};

const formatLastContact = (value?: string, emptyText = 'No recent touchpoint') => {
  if (!value) return emptyText;
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
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/85 p-4">
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
  const { products, language } = useStore();
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);

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
  const sourceLabel = leadRecord?.sourceLabel || client.sourceLabel || label('手动录入', 'Manual');
  const sourceId = leadRecord?.sourceId || client.sourceId;
  const recordValue = leadRecord ? `$${leadRecord.value.toLocaleString()}` : label('未设置', '—');
  const leadScore = leadRecord?.leadScore ?? client.leadScore;

  return (
    <div className="space-y-4">
      <ConversationSectionCard className="overflow-hidden">
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
                <ConversationToolbarPill tone="sky">
                  {leadRecord ? label('Lead 记录', 'Lead Record') : label('客户记录', 'Client Record')}
                </ConversationToolbarPill>
                <ConversationToolbarPill tone="default">{status}</ConversationToolbarPill>
              </div>

              <h2 className="truncate text-[28px] font-semibold tracking-tight text-slate-950">
                {primaryContact?.name || client.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {client.company || label('未填写公司', 'No company on file')}
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
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label('联系方式', 'Contact Methods')}</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{allMethods.length}</div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label('关联产品', 'Linked Products')}</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{relatedProducts.length}</div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label('潜在价值', 'Potential Value')}</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{recordValue}</div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label('最近触点', 'Last Touchpoint')}</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{formatLastContact(client.lastContact, label('暂无近期互动', 'No recent touchpoint'))}</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <ConversationSectionHeader
            icon={<Building2 className="h-4 w-4 text-slate-500" />}
            title={label('公司与记录属性', 'Company & Record Properties')}
            className="mb-4"
          />
          <div className="space-y-3">
            <PropertyCard icon={MapPin} label={label('地区', 'Location')} value={location || label('未设置', 'Not set')} />
            <PropertyCard icon={Languages} label={label('偏好语言', 'Preferred Language')} value={client.preferredLanguage || label('未设置', 'Not set')} />
            <PropertyCard
              icon={Send}
              label={label('来源', 'Source')}
              value={(
                <div className="space-y-1">
                  <div>{sourceLabel}</div>
                  {sourceId && <div className="font-mono text-[11px] text-slate-500">ID: {sourceId}</div>}
                </div>
              )}
            />
            <PropertyCard
              icon={Sparkles}
              label={label('线索评分', 'Lead Score')}
              value={leadScore != null ? `${leadScore}/100` : label('未分析', 'Not analyzed')}
            />
            <PropertyCard
              icon={Tags}
              label={label('标签', 'Tags')}
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
              ) : label('当前还没有标签', 'No tags yet')}
            />
          </div>
        </div>
      </ConversationSectionCard>

      <ConversationSectionCard>
        <ConversationSectionHeader
          icon={<User2 className="h-4 w-4 text-slate-500" />}
          title={label('联系人快照', 'Contacts Snapshot')}
          className="mb-3"
        />
        <div className="space-y-3">
          {contacts.slice(0, 3).map((contact) => (
            <div key={contact.id} className="rounded-[20px] border border-slate-200 bg-slate-50/85 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {contact.name || client.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {contact.title || contact.department || (contact.isPrimary ? label('关键联系人', 'Key Contact') : label('联系人', 'Contact'))}
                  </div>
                </div>
                {contact.isPrimary && (
                  <ConversationToolbarPill tone="sky">{label('关键', 'Key')}</ConversationToolbarPill>
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
      </ConversationSectionCard>

      <ConversationSectionCard>
        <ConversationSectionHeader
          icon={<Sparkles className="h-4 w-4 text-slate-500" />}
          title={label('产品关注点', 'Product Focus')}
          className="mb-3"
        />
        {relatedProducts.length > 0 ? (
          <div className="space-y-3">
            {relatedProducts.slice(0, 4).map((product) => (
              <div key={product!.id} className="rounded-[20px] border border-slate-200 bg-slate-50/85 p-4">
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
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
            {label('当前还没有关联产品。', 'No linked products yet.')}
          </div>
        )}
      </ConversationSectionCard>
    </div>
  );
}
