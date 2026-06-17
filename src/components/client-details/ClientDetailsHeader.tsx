import React from 'react';
import { ArrowLeft, Building2, Edit, MapPin, Sparkles, Trash2 } from 'lucide-react';
import { Client, Deal, useStore } from '../../store';
import { LocalTime } from '../LocalTime';
import { ActionButton, IconButton } from '../ui';
import { ConversationToolbarGroup, ConversationToolbarPill } from '../inbox-ui/ConversationToolbar';

interface ClientDetailsHeaderProps {
  client: Client;
  leadRecord?: Deal | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClientDetailsHeader({ client, leadRecord, onClose, onEdit, onDelete }: ClientDetailsHeaderProps) {
  const { language } = useStore();
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const recordType = leadRecord ? label('Lead 记录', 'Lead Record') : label('客户记录', 'Client Record');
  const status = leadRecord?.status || client.status || label('未设置', 'Unset');
  const company = client.company || label('未填写公司', 'No company on file');
  const location = [client.city, client.state, client.country].filter(Boolean).join(', ') || label('未填写地区', 'No location');
  const sourceLabel = leadRecord?.sourceLabel || client.sourceLabel || label('手动录入', 'Manual');
  const score = leadRecord?.leadScore ?? client.leadScore;
  const recordName = leadRecord?.name || client.name;

  return (
    <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#f8fbfd_0%,#eef4f8_100%)] px-5 py-5 backdrop-blur lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <IconButton
              icon={<ArrowLeft className="h-5 w-5" />}
              label={label('关闭详情', 'Close details')}
              onClick={onClose}
              className="mt-1 border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            />

            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                <Sparkles className="h-3.5 w-3.5" />
                {label('销售作战室', 'Sales Workroom')}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h2 className="truncate text-3xl font-semibold tracking-tight text-slate-950">{recordName}</h2>
                <ConversationToolbarPill tone="sky">{recordType}</ConversationToolbarPill>
                <ConversationToolbarPill tone="default">{status}</ConversationToolbarPill>
                {score != null && <ConversationToolbarPill tone="warning">{label('评分', 'Score')}: {score}/100</ConversationToolbarPill>}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {company}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {location}
                </span>
                <LocalTime country={client.country} />
              </div>

              <ConversationToolbarGroup className="mt-4">
                <ConversationToolbarPill tone="default">{label('来源', 'Source')}: {sourceLabel}</ConversationToolbarPill>
                {client.preferredLanguage && (
                  <ConversationToolbarPill tone="info">{label('偏好语言', 'Preferred language')}: {client.preferredLanguage}</ConversationToolbarPill>
                )}
                {client.lastContact && (
                  <ConversationToolbarPill tone="default">
                    {label('最近互动', 'Last touch')}: {new Date(client.lastContact).toLocaleString()}
                  </ConversationToolbarPill>
                )}
              </ConversationToolbarGroup>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ActionButton
              icon={<Edit className="h-4 w-4" />}
              onClick={onEdit}
              tone="secondary"
              className="rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            >
              {label('编辑记录', 'Edit record')}
            </ActionButton>
            <IconButton
              icon={<Trash2 className="h-4 w-4" />}
              label={label('删除客户', 'Delete client')}
              tone="danger"
              size="md"
              onClick={onDelete}
              className="border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
