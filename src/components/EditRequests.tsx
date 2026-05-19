import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../authStore';
import { CheckCircle, XCircle, Search, AlertCircle } from 'lucide-react';
import { ClientEditRequest } from '../store';

export function EditRequests() {
  const { profile } = useAuthStore();
  const [requests, setRequests] = useState<ClientEditRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      fetchRequests();
    }
  }, [profile]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/client-edit-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/client-edit-requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setRequests(requests.filter(r => r.id !== id));
      } else {
        alert("Failed to process request");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (profile?.role !== 'superadmin') {
    return <div className="p-8 text-center text-slate-400">Access Denied</div>;
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-950 p-6 text-slate-200">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            Pending Edit Requests
          </h1>
          <p className="text-slate-400 mt-1">Review and approve changes to important client data submitted by users.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><AlertCircle className="w-6 h-6 animate-pulse text-slate-500" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center p-12 bg-slate-900 border border-slate-800 rounded-lg text-slate-500">
            No pending edit requests.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => {
              const prev = typeof req.original_data === 'string' ? JSON.parse(req.original_data) : req.original_data;
              const next = typeof req.requested_data === 'string' ? JSON.parse(req.requested_data) : req.requested_data;

              return (
                <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{req.current_client_name} <span className="text-sm font-normal text-slate-500 ml-2">ID: {req.client_id}</span></h3>
                      <p className="text-xs text-slate-400 mt-1">Requested by: <span className="font-medium text-slate-300">{req.requester_name}</span> at {new Date(req.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(req.id, 'approve')} className="flex items-center gap-1 bg-green-900/30 text-green-400 hover:bg-green-900/50 hover:text-green-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-green-900/50">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleAction(req.id, 'reject')} className="flex items-center gap-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-red-900/50">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-4 rounded border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-800 pb-2">Original Data</h4>
                      <pre className="text-[11px] text-slate-400 font-mono overflow-auto max-h-60 scrollbar-thin">
                        {JSON.stringify({ 
                           name: prev.name, 
                           company: prev.company, 
                           city: prev.city,
                           state: prev.state,
                           country: prev.country, 
                           contactMethods: prev.contactMethods || prev.contact_methods 
                        }, null, 2)}
                      </pre>
                    </div>
                    <div className="bg-slate-950 p-4 rounded border border-cyan-900/30 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]">
                      <h4 className="text-xs font-bold text-cyan-500 uppercase mb-3 border-b border-cyan-900/30 pb-2">Requested Changes</h4>
                      <pre className="text-[11px] text-slate-300 font-mono overflow-auto max-h-60 scrollbar-thin">
                        {JSON.stringify({ 
                           name: next.name, 
                           company: next.company, 
                           city: next.city,
                           state: next.state,
                           country: next.country, 
                           contactMethods: next.contactMethods 
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
