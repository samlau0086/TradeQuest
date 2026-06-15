import React from 'react';
import { BadgeDollarSign, Building2, FileText, MapPin, MessageSquare, Workflow } from 'lucide-react';
import { Client, ClientStatus, Deal } from '../store';

interface ClientProfileSidebarWidgetsProps {
  client: Client;
  leadRecord?: Deal | null;
  summaryText?: string;
  onStatusChange: (status: ClientStatus) => void;
}

const PIPELINE_STAGES: ClientStatus[] = ['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'];

export function ClientProfileSidebarWidgets({
  client,
  leadRecord,
  summaryText,
  onStatusChange,
}: ClientProfileSidebarWidgetsProps) {
  return (
    <>
      <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-5">
        <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-3">Pending Approval</div>
        {client.pendingEditRequest ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Client profile update is waiting for review.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-500">
            No pending approval items.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Workflow className="w-4 h-4" /> Pipeline Stage
        </h3>
        <select
          value={leadRecord?.status || client.status}
          onChange={(event) => onStatusChange(event.target.value as ClientStatus)}
          className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg p-2 focus:ring-2 ring-cyan-500 outline-none"
        >
          {PIPELINE_STAGES.map(stage => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Profile Notes</h3>
        <div className="divide-y divide-slate-800">
          <div className="py-3 flex gap-3">
            <Building2 className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <div className="text-[11px] text-slate-500 uppercase">Company</div>
              <div className="text-sm text-slate-200">{client.company || 'Not set'}</div>
            </div>
          </div>
          <div className="py-3 flex gap-3">
            <BadgeDollarSign className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <div className="text-[11px] text-slate-500 uppercase">Potential Value</div>
              <div className="text-sm text-slate-200">{leadRecord ? `$${leadRecord.value.toLocaleString()}` : 'Not set'}</div>
            </div>
          </div>
          <div className="py-3 flex gap-3">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <div className="text-[11px] text-slate-500 uppercase">Address</div>
              <div className="text-sm text-slate-200">{[client.address, client.city, client.state, client.country].filter(Boolean).join(', ') || 'Not set'}</div>
            </div>
          </div>
          <div className="py-3 flex gap-3">
            <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <div className="text-[11px] text-slate-500 uppercase">Source</div>
              <div className="text-sm text-slate-200">{leadRecord?.sourceLabel || client.sourceLabel || 'Not set'}</div>
              {(leadRecord?.sourceId || client.sourceId) && (
                <div className="mt-1 font-mono text-[11px] text-slate-500">ID: {leadRecord?.sourceId || client.sourceId}</div>
              )}
            </div>
          </div>
          <div className="py-3 flex gap-3">
            <MessageSquare className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <div className="text-[11px] text-slate-500 uppercase">Description</div>
              <div className="text-sm text-slate-300 leading-relaxed">{client.agentContext || summaryText || 'No description yet.'}</div>
            </div>
          </div>
          {leadRecord?.leadNotes && (
            <div className="py-3 flex gap-3">
              <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <div className="text-[11px] text-slate-500 uppercase">Lead Notes</div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{leadRecord.leadNotes}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
