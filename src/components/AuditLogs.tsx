import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock3, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../authStore';
import { useStore } from '../store';

interface AuditLogRecord {
  id: string;
  ownerUserId?: string;
  ownerEmail?: string;
  actorUserId?: string;
  actorRole?: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  risk?: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  status?: string;
  reason?: string;
  changes?: any;
  affectedRecords?: Array<{ type?: string; id?: string; action?: string; label?: string }>;
  createdAt: string;
}

const riskClass = (risk?: string) => {
  if (risk === 'high') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (risk === 'medium') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
};

const statusClass = (status?: string) => {
  if (status === 'failed') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (status === 'pending') return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
  if (status === 'rolled_back') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
};

export function AuditLogs() {
  const { profile } = useAuthStore();
  const { language, notify } = useStore();
  const isZh = language === 'zh';
  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(200);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/audit-logs?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load audit logs');
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'superadmin' || profile?.role === 'admin') fetchRecords();
  }, [profile?.role, limit]);

  if (profile?.role !== 'superadmin' && profile?.role !== 'admin') {
    return <div className="flex-1 bg-slate-950 p-8 text-center text-slate-400">Access denied</div>;
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-950 p-6 text-slate-200">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
              <ShieldCheck className="h-6 w-6 text-cyan-400" />
              {isZh ? '审计日志' : 'Audit Logs'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {isZh ? '查看谁在何时执行了什么操作，以及影响了哪些数据。' : 'See who changed what, when it happened, and which records were affected.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={event => setLimit(Number(event.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none"
            >
              {[100, 200, 500].map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            <button
              onClick={fetchRecords}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 hover:border-cyan-500/50"
            >
              <RefreshCw className="h-4 w-4" /> {isZh ? '刷新' : 'Refresh'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {isZh ? '加载审计日志...' : 'Loading audit logs...'}
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-500">
            {isZh ? '暂无审计日志。' : 'No audit logs yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(record => (
              <article key={record.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">{record.action}</span>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${riskClass(record.risk)}`}>{record.risk || 'low'}</span>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(record.status)}`}>{record.status || 'success'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" />{record.actorName || record.actorEmail || record.actorUserId || 'system'} · {record.actorRole || 'unknown'}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{new Date(record.createdAt).toLocaleString()}</span>
                      {record.ownerEmail && <span>{isZh ? '数据归属' : 'Owner'}: {record.ownerEmail}</span>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{record.targetType || 'record'}</div>
                    <div className="font-mono">{record.targetId}</div>
                  </div>
                </div>

                {record.targetLabel && <p className="mt-3 text-sm text-slate-300">{record.targetLabel}</p>}
                {record.reason && (
                  <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                    <AlertTriangle className="mr-2 inline h-4 w-4 text-cyan-300" />
                    {record.reason}
                  </div>
                )}
                {record.affectedRecords && record.affectedRecords.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {record.affectedRecords.map((item, index) => (
                      <span key={`${record.id}_${index}`} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-400">
                        {item.type}:{item.id}{item.action ? ` · ${item.action}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
