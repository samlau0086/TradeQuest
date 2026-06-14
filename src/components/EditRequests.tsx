import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../authStore';
import { CheckCircle, XCircle, AlertCircle, CheckSquare, Square, RotateCcw, History } from 'lucide-react';
import { ClientEditRequest, useStore } from '../store';
import { useTranslation } from '../lib/i18n';

export function EditRequests() {
  const { profile } = useAuthStore();
  const { language, notify } = useStore();
  const t = useTranslation(language);
  const [requests, setRequests] = useState<ClientEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{
    ids: number[];
    action: 'approve' | 'reject' | 'rollback';
    title: string;
    message: string;
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (profile?.role === 'superadmin' || profile?.role === 'admin') {
      fetchRequests();
    }
  }, [profile, showHistory]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/client-edit-requests?status=${showHistory ? 'all' : 'pending'}`, {
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

  const processAction = async (id: number, action: 'approve' | 'reject', reason = '') => {
    useStore.setState({ globalLoading: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/client-edit-requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        notify(action === 'approve' ? 'Request approved.' : 'Request rejected.', 'success');
        await fetchRequests();
        useStore.getState().fetchEmails();
        useStore.getState().fetchDeals();
        await fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json())
          .then(clients => useStore.setState({ clients }));
      } else {
        notify('Failed to process request.', 'error');
      }
    } catch (e) {
      console.error(e);
    } finally {
      useStore.setState({ globalLoading: false });
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    const isApprove = action === 'approve';
    setReviewDialog({
      ids: [id],
      action,
      title: isApprove ? 'Approve request' : 'Reject request',
      message: isApprove
        ? 'Add an approval reason. It will be saved to the audit log.'
        : 'Add a rejection reason so the requester understands the decision.',
      reason: ''
    });
  };

  const processRollback = async (id: number, reason = '') => {
    useStore.setState({ globalLoading: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/client-edit-requests/${id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        notify('Request rolled back.', 'success');
        await fetchRequests();
        useStore.getState().fetchEmails();
        useStore.getState().fetchDeals();
        await fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json())
          .then(clients => useStore.setState({ clients }));
      } else {
        const data = await res.json().catch(() => ({}));
        notify(data.error || 'Failed to roll back request.', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Failed to roll back request.', 'error');
    } finally {
      useStore.setState({ globalLoading: false });
    }
  };

  const handleRollback = async (id: number) => {
    setReviewDialog({
      ids: [id],
      action: 'rollback',
      title: 'Roll back approved action',
      message: 'Explain why this high-risk action should be rolled back. The reason will be audited.',
      reason: ''
    });
  };

  const processBulkAction = async (action: 'approve' | 'reject', reason = '') => {
    if (selectedIds.size === 0) return;
    
    // Optimistically update some state or just show loading
    useStore.setState({ globalLoading: true });
    const token = localStorage.getItem('token');
    
    try {
      const promises = Array.from(selectedIds).map(id => 
        fetch(`/api/admin/client-edit-requests/${id}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ reason })
        })
      );
      
      const results = await Promise.allSettled(promises);
      const successfulIds = new Set<number>();
      
      results.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value.ok) {
          successfulIds.add(Array.from(selectedIds)[index]);
        }
      });
      
      await fetchRequests();
      
      useStore.getState().fetchEmails();
      useStore.getState().fetchDeals();
      await fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(clients => useStore.setState({ clients }));
        
      if (successfulIds.size !== selectedIds.size) {
        notify('Some requests failed to process.', 'warning');
      }
    } catch (e) {
      console.error(e);
      notify('An error occurred during bulk action.', 'error');
    } finally {
      useStore.setState({ globalLoading: false });
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    const isApprove = action === 'approve';
    setReviewDialog({
      ids: Array.from(selectedIds),
      action,
      title: isApprove ? 'Approve selected requests' : 'Reject selected requests',
      message: isApprove
        ? 'Add one approval reason for all selected requests.'
        : 'Add one rejection reason for all selected requests.',
      reason: ''
    });
  };

  const submitReviewDialog = async () => {
    if (!reviewDialog) return;
    const { ids, action, reason } = reviewDialog;
    setReviewDialog(null);
    if (action === 'rollback') {
      await processRollback(ids[0], reason);
      return;
    }
    if (ids.length === 1) {
      await processAction(ids[0], action, reason);
      return;
    }
    await processBulkAction(action, reason);
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

  if (profile?.role !== 'superadmin' && profile?.role !== 'admin') {
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
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(prev => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded border border-slate-700 bg-slate-900 text-sm text-slate-300 hover:text-white hover:border-cyan-500/60"
            >
              <History className="w-4 h-4" />
              {showHistory ? 'Pending Only' : 'Review History'}
            </button>
          {requests.length > 0 && !showHistory && (
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
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><AlertCircle className="w-6 h-6 animate-pulse text-slate-500" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center p-12 bg-slate-900 border border-slate-800 rounded-lg text-slate-500">
            {t('noPendingEdit') || 'No pending edits'}
          </div>
        ) : (
          <div className="space-y-4">
            {!showHistory && (
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
            )}
            
            {requests.map(req => {
              const prev = typeof req.original_data === 'string' ? JSON.parse(req.original_data) : req.original_data;
              const next = typeof req.requested_data === 'string' ? JSON.parse(req.requested_data) : req.requested_data;
              const audit = typeof req.audit_metadata === 'string' ? JSON.parse(req.audit_metadata || '{}') : (req.audit_metadata || {});
              const isSelected = selectedIds.has(req.id);
              const canReview = req.status === 'pending';
              const canRollback = req.status === 'approved' && !req.rolled_back_at;

              return (
                <div key={req.id} className={`bg-slate-900 border rounded-lg p-5 transition-colors ${isSelected ? 'border-cyan-500/50 bg-slate-800/40' : 'border-slate-800'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <button onClick={() => toggleSelection(req.id)} className="mt-1 flex-shrink-0 text-slate-500 hover:text-cyan-400 transition-colors">
                        {isSelected ? <CheckSquare className="w-5 h-5 text-cyan-400" /> : <Square className="w-5 h-5" />}
                      </button>
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {next.action === 'delete_deal'
                            ? `Deal: ${next.name || prev.name}`
                            : next.action === 'delete_deal_comment'
                              ? `Lead Comment: ${next.lead_name || next.deal_id}`
                              : next.action === 'delete_client_comment'
                                ? `Client Comment: ${req.current_client_name || 'Unknown Client'}`
                                : next.action === 'delete_live_chat_session'
                                  ? `Live Chat: ${next.visitor || prev.visitorName || prev.visitorEmail || prev.id}`
                                  : req.current_client_name || 'Unknown Client'}
                          <span className="text-sm font-normal text-slate-500">
                            {next.action === 'delete_deal' || next.action === 'delete_deal_comment'
                              ? `Deal ID: ${next.deal_id}`
                              : next.action === 'delete_live_chat_session'
                                ? `Session ID: ${next.live_chat_session_id}`
                                : `ID: ${req.client_id}`}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{t('requestedBy') || 'Requested by'} <span className="font-medium text-slate-300">{req.requester_name}</span> at {new Date(req.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canRollback && (
                        <button onClick={() => handleRollback(req.id)} className="flex items-center gap-1 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-amber-900/50">
                          <RotateCcw className="w-4 h-4" /> Rollback
                        </button>
                      )}
                      {canReview && (
                        <>
                      <button onClick={() => handleAction(req.id, 'approve')} className="flex items-center gap-1 bg-green-900/30 text-green-400 hover:bg-green-900/50 hover:text-green-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-green-900/50">
                        <CheckCircle className="w-4 h-4" /> {t('approve') || 'Approve'}
                      </button>
                      <button onClick={() => handleAction(req.id, 'reject')} className="flex items-center gap-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-red-900/50">
                        <XCircle className="w-4 h-4" /> {t('reject') || 'Reject'}
                      </button>
                        </>
                      )}
                    </div>
                  </div>

                  {req.status !== 'pending' && (
                    <div className="ml-9 mb-4 rounded border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
                      Status: <span className="text-slate-200">{req.status}</span>
                      {req.processor_name && <> · Processed by <span className="text-slate-200">{req.processor_name}</span></>}
                      {req.processed_at && <> at {new Date(req.processed_at).toLocaleString()}</>}
                      {req.rollbacker_name && <> · Rolled back by <span className="text-amber-200">{req.rollbacker_name}</span></>}
                      {req.rolled_back_at && <> at {new Date(req.rolled_back_at).toLocaleString()}</>}
                      {audit.reason && (
                        <div className="mt-2 rounded border border-slate-800 bg-slate-900/80 px-2 py-1 text-slate-300">
                          Reason: {audit.reason}
                        </div>
                      )}
                    </div>
                  )}

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
                        }, null, 2) : next.action === 'delete_client_comment' || next.action === 'delete_deal_comment' ? JSON.stringify({
                          target: next.action === 'delete_deal_comment' ? 'lead comment' : 'client comment',
                          comment_id: next.comment_id,
                          client_id: req.client_id,
                          deal_id: next.deal_id
                        }, null, 2) : next.action === 'delete_live_chat_session' ? JSON.stringify({
                          session_id: prev.id,
                          visitor: prev.visitorName || prev.visitorEmail || prev.visitorPhone || next.visitor,
                          page_url: prev.pageUrl,
                          status: prev.status,
                          client_id: prev.clientId,
                          last_message_at: prev.lastMessageAt
                        }, null, 2) : JSON.stringify({ 
                           name: prev.name, 
                           company: prev.company, 
                           city: prev.city,
                           state: prev.state,
                           country: prev.country, 
                           contactMethods: prev.contactMethods || prev.contact_methods,
                           contacts: prev.contacts || [],
                           primaryContactId: prev.primaryContactId || prev.primary_contact_id
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
                        }, null, 2) : next.action === 'delete_client_comment' || next.action === 'delete_deal_comment' ? JSON.stringify({
                          action: 'DELETE COMMENT AFTER APPROVAL',
                          comment_id: next.comment_id
                        }, null, 2) : next.action === 'delete_live_chat_session' ? JSON.stringify({
                          action: 'DELETE LIVE CHAT SESSION AFTER APPROVAL',
                          session_id: next.live_chat_session_id,
                          conversation_id: next.conversation_id,
                          related_records: ['live_chat_sessions', 'live_chat_messages', 'communication_conversations', 'communication_messages']
                        }, null, 2) : JSON.stringify({ 
                           name: next.name, 
                           company: next.company, 
                           city: next.city,
                           state: next.state,
                           country: next.country, 
                           contactMethods: next.contactMethods,
                           contacts: next.contacts || [],
                           primaryContactId: next.primaryContactId
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
      {reviewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="border-b border-slate-800 px-5 py-4">
              <h3 className="text-lg font-bold text-white">{reviewDialog.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{reviewDialog.message}</p>
            </div>
            <div className="p-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Review reason
              </label>
              <textarea
                value={reviewDialog.reason}
                onChange={event => setReviewDialog({ ...reviewDialog, reason: event.target.value })}
                placeholder="e.g. Approved because the requested deletion is valid and linked records were reviewed."
                className="min-h-[120px] w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
              />
              <div className="mt-2 text-xs text-slate-500">
                This reason is saved into approval metadata and the independent audit log.
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-800 px-5 py-4">
              <button
                onClick={() => setReviewDialog(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={submitReviewDialog}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${
                  reviewDialog.action === 'reject'
                    ? 'bg-red-600 hover:bg-red-500'
                    : reviewDialog.action === 'rollback'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
