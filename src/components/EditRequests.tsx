import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../authStore';
import { CheckCircle, XCircle, Search, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { ClientEditRequest, useStore } from '../store';
import { useTranslation } from '../lib/i18n';

export function EditRequests() {
  const { profile } = useAuthStore();
  const { language } = useStore();
  const t = useTranslation(language);
  const [requests, setRequests] = useState<ClientEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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
        setSelectedIds(new Set());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    useStore.setState({ globalLoading: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/client-edit-requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        useStore.getState().fetchEmails();
        useStore.getState().fetchDeals();
        await fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json())
          .then(clients => useStore.setState({ clients }));
      } else {
        alert("Failed to process request");
      }
    } catch (e) {
      console.error(e);
    } finally {
      useStore.setState({ globalLoading: false });
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    
    // Optimistically update some state or just show loading
    useStore.setState({ globalLoading: true });
    const token = localStorage.getItem('token');
    
    try {
      const promises = Array.from(selectedIds).map(id => 
        fetch(`/api/admin/client-edit-requests/${id}/${action}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );
      
      const results = await Promise.allSettled(promises);
      const successfulIds = new Set<number>();
      
      results.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value.ok) {
          successfulIds.add(Array.from(selectedIds)[index]);
        }
      });
      
      setRequests(prev => prev.filter(r => !successfulIds.has(r.id)));
      setSelectedIds(prev => {
        const next = new Set(prev);
        successfulIds.forEach(id => next.delete(id));
        return next;
      });
      
      useStore.getState().fetchEmails();
      useStore.getState().fetchDeals();
      await fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(clients => useStore.setState({ clients }));
        
      if (successfulIds.size !== selectedIds.size) {
        alert("Some requests failed to process.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during bulk action.");
    } finally {
      useStore.setState({ globalLoading: false });
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)));
    }
  };

  if (profile?.role !== 'superadmin') {
    return <div className="p-8 text-center text-slate-400">Access Denied</div>;
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-950 p-6 text-slate-200">
      <div className="max-w-4xl max-w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              {t('pendingEdit') || 'Pending Review Edits'}
            </h1>
            <p className="text-slate-400 mt-1">{t('pendingEditDesc') || 'Changes to client records submitted by users that require your approval.'}</p>
          </div>
          
          {requests.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">{selectedIds.size} selected</span>
              <button 
                disabled={selectedIds.size === 0}
                onClick={() => handleBulkAction('approve')}
                className="flex items-center gap-1 bg-green-900/30 text-green-400 hover:bg-green-900/50 hover:text-green-300 px-3 py-2 rounded text-sm font-medium transition-colors border border-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" /> Approve Selected
              </button>
              <button 
                disabled={selectedIds.size === 0}
                onClick={() => handleBulkAction('reject')}
                className="flex items-center gap-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 px-3 py-2 rounded text-sm font-medium transition-colors border border-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" /> Reject Selected
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><AlertCircle className="w-6 h-6 animate-pulse text-slate-500" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center p-12 bg-slate-900 border border-slate-800 rounded-lg text-slate-500">
            {t('noPendingEdit') || 'No pending edits'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                {selectedIds.size === requests.length && requests.length > 0 ? (
                  <CheckSquare className="w-5 h-5 text-cyan-400" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                Select All
              </button>
            </div>
            
            {requests.map(req => {
              const prev = typeof req.original_data === 'string' ? JSON.parse(req.original_data) : req.original_data;
              const next = typeof req.requested_data === 'string' ? JSON.parse(req.requested_data) : req.requested_data;
              const isSelected = selectedIds.has(req.id);

              return (
                <div key={req.id} className={`bg-slate-900 border rounded-lg p-5 transition-colors ${isSelected ? 'border-cyan-500/50 bg-slate-800/40' : 'border-slate-800'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <button onClick={() => toggleSelection(req.id)} className="mt-1 flex-shrink-0 text-slate-500 hover:text-cyan-400 transition-colors">
                        {isSelected ? <CheckSquare className="w-5 h-5 text-cyan-400" /> : <Square className="w-5 h-5" />}
                      </button>
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {next.action === 'delete_deal' ? `Deal: ${next.name || prev.name}` : req.current_client_name || 'Unknown Client'}
                          <span className="text-sm font-normal text-slate-500">
                            {next.action === 'delete_deal' ? `Deal ID: ${next.deal_id}` : `ID: ${req.client_id}`}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{t('requestedBy') || 'Requested by'} <span className="font-medium text-slate-300">{req.requester_name}</span> at {new Date(req.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(req.id, 'approve')} className="flex items-center gap-1 bg-green-900/30 text-green-400 hover:bg-green-900/50 hover:text-green-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-green-900/50">
                        <CheckCircle className="w-4 h-4" /> {t('approve') || 'Approve'}
                      </button>
                      <button onClick={() => handleAction(req.id, 'reject')} className="flex items-center gap-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-red-900/50">
                        <XCircle className="w-4 h-4" /> {t('reject') || 'Reject'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 ml-9">
                    <div className="bg-slate-950 p-4 rounded border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-800 pb-2">{t('originalData') || 'Original Data'}</h4>
                      <pre className="text-[11px] text-slate-400 font-mono overflow-auto max-h-60 scrollbar-thin">
                        {next.action === 'delete_email' ? JSON.stringify({
                          email_id: prev.id,
                          subject: prev.subject,
                          sender: prev.sender,
                          recipient: prev.recipient,
                          date: prev.date
                        }, null, 2) : next.action === 'delete_deal' ? JSON.stringify({
                          deal_id: prev.id,
                          name: prev.name,
                          value: prev.value,
                          status: prev.status
                        }, null, 2) : JSON.stringify({ 
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
                      <h4 className="text-xs font-bold text-cyan-500 uppercase mb-3 border-b border-cyan-900/30 pb-2">{t('requestedChanges') || 'Requested Changes'}</h4>
                      <pre className="text-[11px] text-slate-300 font-mono overflow-auto max-h-60 scrollbar-thin">
                        {next.action === 'delete_email' ? JSON.stringify({
                          action: 'DELETE EMAIL PERMANENTLY'
                        }, null, 2) : next.action === 'delete_deal' ? JSON.stringify({
                          action: 'DELETE DEAL PERMANENTLY'
                        }, null, 2) : JSON.stringify({ 
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
