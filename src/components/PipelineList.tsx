import React, { useState, useRef, useEffect } from 'react';
import { useStore, Client, ClientStatus } from '../store';
import { Edit2, MoreHorizontal, Trash2, Mail, LayoutGrid, List as ListIcon, Download, Upload, Plus, Search, Columns, UserPlus } from 'lucide-react';
import { ClientFormModal } from './ClientFormModal';
import Papa from 'papaparse';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';

import { DealFormModal } from './DealFormModal';

export function PipelineList() {
  const { clients, deals, selectClient, deleteDeal, updateDeal, kanbanSearch, setKanbanSearch, addClient, addDeal, language } = useStore();
  const t = useTranslation(language);
  const [localSearch, setLocalSearch] = useState('');
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    company: true,
    country: true,
    contact: true,
    status: true,
    tags: true,
  });

  const dealViewModels = React.useMemo(() => {
    return deals.map(deal => {
      let client = clients.find(c => c.id === deal.clientId);
      if (!client && deal.contactInfo) {
        client = {
          id: '',
          name: deal.contactInfo.name,
          company: deal.contactInfo.company,
          country: deal.contactInfo.country,
          contactMethods: deal.contactInfo.contactMethods || [],
          tags: deal.contactInfo.tags || [],
          status: 'Leads',
          isDormant: false,
          lastContact: deal.createdAt,
          comments: []
        };
      }
      return { deal, client };
    }).filter(d => d.client);
  }, [deals, clients]);
  
  const filteredDeals = dealViewModels.filter(({ deal, client }) => {
    const term = (localSearch || kanbanSearch).toLowerCase();
    if (!term) return true;
    const searchable = `${deal.name} ${client?.name} ${client?.company} ${client?.country} ${client?.tags.join(' ')}`.toLowerCase();
    return searchable.includes(term);
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [deleteDealId, setDeleteDealId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Close column filter on click outside
  useEffect(() => {
    const handleClick = () => setShowColumnFilter(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDeals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDeals.map(d => d.deal.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    setConfirmBulkDelete(true);
  };

  const executeBulkDelete = () => {
    selectedIds.forEach(id => deleteDeal(id));
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  };

  return (
    <div className="flex-1 overflow-hidden bg-slate-900 border-t border-slate-800 text-slate-200 flex flex-col">
      <div className="px-6 pt-6 pb-2 shrink-0">
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm text-cyan-400 font-medium">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> {t('deleteSelected')}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder={t('searchInList')}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowColumnFilter(!showColumnFilter)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Columns className="w-4 h-4" /> {t('fields')}
            </button>
            
            {showColumnFilter && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 py-2">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase">{t('visibleColumns')}</div>
                {Object.entries(visibleColumns).map(([key, isVisible]) => (
                  <label key={key} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-700/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-600 bg-slate-950 text-cyan-500"
                      checked={isVisible}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof visibleColumns] }))}
                    />
                    <span className="text-sm text-slate-200 capitalize">{key}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-800/30 rounded-xl border border-slate-800 relative mx-6 mb-2">
          <table className="w-full text-left text-sm relative">
            <thead className="bg-slate-800 text-slate-400 text-xs uppercase font-medium border-b border-slate-700/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredDeals.length}
                    ref={input => {
                      if (input) {
                        input.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredDeals.length;
                      }
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>
                {visibleColumns.name && <th className="px-4 py-3">{t('name')}</th>}
                {visibleColumns.company && <th className="px-4 py-3">{t('company')}</th>}
                {visibleColumns.country && <th className="px-4 py-3">{t('country')}</th>}
                {visibleColumns.contact && <th className="px-4 py-3">Contact</th>}
                {visibleColumns.status && <th className="px-4 py-3">{t('stage')}</th>}
                {visibleColumns.tags && <th className="px-4 py-3">Tags</th>}
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredDeals.map(({ deal, client }) => (
                <tr key={deal.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20 opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
                      checked={selectedIds.has(deal.id)}
                      onChange={() => toggleSelect(deal.id)}
                    />
                  </td>
                  {visibleColumns.name && (
                    <td className="px-4 py-3 font-medium text-slate-200">
                      <button onClick={() => { if(client!.id) selectClient(client!.id); else setEditingDealId(deal.id); }} className="hover:text-cyan-400 hover:underline text-left inline-block">
                        <span className="block font-bold text-cyan-500 mb-0.5">{deal.name}</span>
                        <span className="block text-xs text-slate-400">{client!.id ? client!.name : `${client!.name} (Unlinked)`}</span>
                      </button>
                    </td>
                  )}
                  {visibleColumns.company && <td className="px-4 py-3 text-slate-400">{client!.company}</td>}
                  {visibleColumns.country && <td className="px-4 py-3 text-slate-400 capitalize">{client!.country || '-'}</td>}
                  {visibleColumns.contact && (
                    <td className="px-4 py-3 text-slate-400">
                      {client!.contactMethods.length > 0 && (
                        <span className="flex items-center gap-1">
                          {client!.contactMethods[0].value}
                          {client!.contactMethods.length > 1 && <span className="text-[10px] bg-slate-700 px-1 rounded">+{client!.contactMethods.length - 1}</span>}
                        </span>
                      )}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-4 py-3">
                      <select 
                        value={deal.status} 
                      onChange={e => updateDeal(deal.id, { status: e.target.value as ClientStatus })}
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded border-0 outline-none cursor-pointer",
                        deal.status === 'Leads' && "bg-slate-700 text-slate-300",
                        deal.status === 'Contacted' && "bg-blue-500/20 text-blue-400",
                        deal.status === 'Sample Sent' && "bg-purple-500/20 text-purple-400",
                        deal.status === 'Negotiating' && "bg-orange-500/20 text-orange-400",
                        deal.status === 'Closed Won' && "bg-green-500/20 text-green-400"
                      )}
                    >
                      {['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'].map(s => (
                        <option key={s} value={s} className="bg-slate-800 text-slate-200">{s}</option>
                      ))}
                    </select>
                    </td>
                  )}
                  {visibleColumns.tags && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {client!.tags.slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                        {client!.tags.length > 2 && (
                          <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                            +{client!.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!client!.id && deal.contactInfo && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const newClientId = await addClient({
                                name: deal.contactInfo!.name,
                                company: deal.contactInfo!.company,
                                country: deal.contactInfo!.country,
                                status: deal.status,
                                tags: deal.contactInfo!.tags || [],
                                contactMethods: deal.contactInfo!.contactMethods || [],
                                lastContact: new Date().toISOString()
                              });
                              if (newClientId) {
                                updateDeal(deal.id, { clientId: newClientId });
                              } else {
                                window.alert("Failed to convert: A client with this contact info may already exist.");
                              }
                            } catch (err) {
                              window.alert("Error converting lead to contact.");
                            }
                          }} 
                          className="p-1 hover:text-green-400 hover:bg-green-950/50 rounded transition-colors text-slate-400" 
                          title="Convert to Contact"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setEditingDealId(deal.id)} className="p-1 hover:text-cyan-400 hover:bg-cyan-950/50 rounded transition-colors" title="Edit Deal">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteDealId(deal.id)} className="p-1 hover:text-red-400 hover:bg-red-950/50 rounded transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDeals.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    {t('noClientsFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editingDealId && <DealFormModal dealId={editingDealId} onClose={() => setEditingDealId(null)} />}

        {deleteDealId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
              <h3 className="text-lg font-bold text-white mb-2">Delete Deal?</h3>
              <p className="text-slate-400 mb-6 text-sm">Are you sure you want to delete this deal? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteDealId(null)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => { deleteDeal(deleteDealId); setDeleteDealId(null); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow font-medium transition-colors">Delete</button>
              </div>
            </div>
          </div>
        )}

        {confirmBulkDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
              <h3 className="text-lg font-bold text-white mb-2">Delete Selected Deals?</h3>
              <p className="text-slate-400 mb-6 text-sm">Are you sure you want to delete {selectedIds.size} deals? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmBulkDelete(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
                <button onClick={executeBulkDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow font-medium transition-colors">Delete All</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
