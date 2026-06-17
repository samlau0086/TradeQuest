import React from 'react';
import { FileText, MessageSquare, Workflow } from 'lucide-react';
import { Client, ClientStatus, Deal, useStore } from '../../store';
import { ConversationToolbarPill } from '../inbox-ui/ConversationToolbar';

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
  const { language } = useStore();
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <>
      <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            {label('待审核', 'Pending Approval')}
          </div>
          <ConversationToolbarPill tone="warning">
            {client.pendingEditRequest ? label('待处理', 'Review') : label('空', 'Clear')}
          </ConversationToolbarPill>
        </div>
        {client.pendingEditRequest ? (
          <div className="rounded-[20px] border border-amber-200 bg-white p-4 text-sm text-amber-800">
            {label('客户资料更新正在等待人工审核。', 'Client profile update is waiting for review.')}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-amber-200 bg-white/70 p-4 text-sm text-amber-700/80">
            {label('当前没有待审核事项。', 'No pending approval items.')}
          </div>
        )}
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <Workflow className="h-4 w-4" /> {label('管线阶段', 'Pipeline Stage')}
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

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label('资料备注', 'Record Notes')}
        </h3>
        <div className="space-y-3">
          <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              {label('CRM 上下文', 'CRM Context')}
            </div>
            <div className="text-sm leading-relaxed text-slate-700">
              {client.agentContext || summaryText || label('当前还没有内部上下文。', 'No internal context yet.')}
            </div>
          </div>
          {leadRecord?.leadNotes && (
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <FileText className="h-4 w-4 text-slate-400" />
                {label('Lead 备注', 'Lead Notes')}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{leadRecord.leadNotes}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
