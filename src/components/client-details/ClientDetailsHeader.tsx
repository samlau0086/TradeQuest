import React from 'react';
import { ArrowLeft, Building2, Edit, MapPin, Trash2 } from 'lucide-react';
import { Client, Deal } from '../../store';
import { LocalTime } from '../LocalTime';
import { IconButton, StatusBadge } from '../ui';

interface ClientDetailsHeaderProps {
  client: Client;
  leadRecord?: Deal | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClientDetailsHeader({ client, leadRecord, onClose, onEdit, onDelete }: ClientDetailsHeaderProps) {
  return (
    <div className="px-5 py-5 lg:px-8 border-b border-slate-900/80 bg-black/40">
      <div className="mx-auto max-w-[1800px] flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <IconButton
            icon={<ArrowLeft className="w-5 h-5" />}
            label="Close details"
            onClick={onClose}
            className="mt-1"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-white truncate">{leadRecord?.name || client.name}</h2>
              <StatusBadge tone="purple" size="sm">{leadRecord ? 'Lead' : 'Client'}</StatusBadge>
              <StatusBadge tone="cyan" size="sm">{leadRecord?.status || client.status}</StatusBadge>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{client.company || 'No company'}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{[client.city, client.state, client.country].filter(Boolean).join(', ') || 'No location'}</span>
              <LocalTime country={client.country} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors">
            <Edit className="w-4 h-4" /> Edit Info
          </button>
          <IconButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete client"
            tone="danger"
            size="md"
            onClick={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
