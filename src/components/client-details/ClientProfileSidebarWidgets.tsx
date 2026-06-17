import React from 'react';
import { FileText, MessageSquare, Workflow } from 'lucide-react';
import { Client, ClientStatus, Deal } from '../../store';
import { EmptyState } from '../ui';

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
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Pending Approval</div>
        {client.pendingEditRequest ? (
          <div className="rounded-2xl border border-amber-200 bg-white p-4 text-sm text-amber-800">
            Client profile update is waiting for review.
          </div>
        ) : (
          <EmptyState>No pending approval items.</EmptyState>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <Workflow className="w-4 h-4" /> Pipeline Stage
        </h3>
        <select
          value={leadRecord?.status || client.status}
          onChange={(event) => onStatusChange(event.target.value as ClientStatus)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 outline-none ring-cyan-500 focus:ring-2"
        >
          {PIPELINE_STAGES.map(stage => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Record Notes</h3>
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              CRM Context
            </div>
            <div className="text-sm leading-relaxed text-slate-700">
              {client.agentContext || summaryText || 'No internal context yet.'}
            </div>
          </div>
          {leadRecord?.leadNotes && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <FileText className="w-4 h-4 text-slate-400" />
                Lead Notes
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{leadRecord.leadNotes}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
