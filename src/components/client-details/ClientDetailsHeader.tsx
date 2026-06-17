import React from 'react';
import { ArrowLeft, Building2, Edit, MapPin, Sparkles, Trash2 } from 'lucide-react';
import { Client, Deal } from '../../store';
import { LocalTime } from '../LocalTime';
import { ActionButton, IconButton, StatusBadge } from '../ui';

interface ClientDetailsHeaderProps {
  client: Client;
  leadRecord?: Deal | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClientDetailsHeader({ client, leadRecord, onClose, onEdit, onDelete }: ClientDetailsHeaderProps) {
  return (
    <div className="border-b border-slate-200/80 bg-[#eef3f8]/95 px-5 py-5 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-[1800px] items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <IconButton
            icon={<ArrowLeft className="w-5 h-5" />}
            label="Close details"
            onClick={onClose}
            className="mt-1 border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          />
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
              <Sparkles className="h-3.5 w-3.5" />
              Sales Workroom
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="truncate text-3xl font-semibold tracking-tight text-slate-950">{leadRecord?.name || client.name}</h2>
              <StatusBadge tone="purple" size="sm">{leadRecord ? 'Lead' : 'Client'}</StatusBadge>
              <StatusBadge tone="cyan" size="sm">{leadRecord?.status || client.status}</StatusBadge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{client.company || 'No company'}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{[client.city, client.state, client.country].filter(Boolean).join(', ') || 'No location'}</span>
              <LocalTime country={client.country} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ActionButton
            icon={<Edit className="w-4 h-4" />}
            onClick={onEdit}
            tone="secondary"
            className="rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          >
            Edit record
          </ActionButton>
          <IconButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete client"
            tone="danger"
            size="md"
            onClick={onDelete}
            className="border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
          />
        </div>
      </div>
    </div>
  );
}
