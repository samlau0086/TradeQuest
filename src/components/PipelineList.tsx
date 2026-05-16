import React, { useState, useRef, useEffect } from 'react';
import { useStore, Client, ClientStatus } from '../store';
import { Edit2, MoreHorizontal, Trash2, Mail, LayoutGrid, List as ListIcon, Download, Upload, Plus, Search, Columns } from 'lucide-react';
import { ClientFormModal } from './ClientFormModal';
import Papa from 'papaparse';
import { cn } from '../lib/utils';

export function PipelineList() {
  const { clients, selectClient, deleteClient, updateClientStatus, kanbanSearch, setKanbanSearch, addClient } = useStore();
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
  
  const filteredClients = clients.filter(c => {
    const term = (localSearch || kanbanSearch).toLowerCase();
    if (!term) return true;
    const searchable = `${c.name} ${c.company} ${c.country} ${c.tags.join(' ')}`.toLowerCase();
    return searchable.includes(term);
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Close column filter on click outside
  useEffect(() => {
    const handleClick = () => setShowColumnFilter(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map(c => c.id)));
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
    if (confirm(`Are you sure you want to delete ${selectedIds.size} clients?`)) {
      selectedIds.forEach(id => deleteClient(id));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="flex-1 overflow-hidden bg-slate-900 border-t border-slate-800 text-slate-200 flex flex-col">
      <div className="px-6 pt-6 pb-2 shrink-0">
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm text-cyan-400 font-medium">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> Delete Selected
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search in list..."
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
              <Columns className="w-4 h-4" /> Fields
            </button>
            
            {showColumnFilter && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 py-2">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase">Visible Columns</div>
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
                    checked={selectedIds.size > 0 && selectedIds.size === filteredClients.length}
                    ref={input => {
                      if (input) {
                        input.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredClients.length;
                      }
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>
                {visibleColumns.name && <th className="px-4 py-3">Name</th>}
                {visibleColumns.company && <th className="px-4 py-3">Company</th>}
                {visibleColumns.country && <th className="px-4 py-3">Country</th>}
                {visibleColumns.contact && <th className="px-4 py-3">Contact</th>}
                {visibleColumns.status && <th className="px-4 py-3">Status</th>}
                {visibleColumns.tags && <th className="px-4 py-3">Tags</th>}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20 opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
                      checked={selectedIds.has(client.id)}
                      onChange={() => toggleSelect(client.id)}
                    />
                  </td>
                  {visibleColumns.name && (
                    <td className="px-4 py-3 font-medium text-slate-200">
                      <button onClick={() => selectClient(client.id)} className="hover:text-cyan-400 hover:underline text-left">
                        {client.name}
                      </button>
                    </td>
                  )}
                  {visibleColumns.company && <td className="px-4 py-3 text-slate-400">{client.company}</td>}
                  {visibleColumns.country && <td className="px-4 py-3 text-slate-400 capitalize">{client.country || '-'}</td>}
                  {visibleColumns.contact && (
                    <td className="px-4 py-3 text-slate-400">
                      {client.contactMethods.length > 0 && (
                        <span className="flex items-center gap-1">
                          {client.contactMethods[0].value}
                          {client.contactMethods.length > 1 && <span className="text-[10px] bg-slate-700 px-1 rounded">+{client.contactMethods.length - 1}</span>}
                        </span>
                      )}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-4 py-3">
                      <select 
                        value={client.status} 
                      onChange={e => updateClientStatus(client.id, e.target.value as ClientStatus)}
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded border-0 outline-none cursor-pointer",
                        client.status === 'Leads' && "bg-slate-700 text-slate-300",
                        client.status === 'Contacted' && "bg-blue-500/20 text-blue-400",
                        client.status === 'Sample Sent' && "bg-purple-500/20 text-purple-400",
                        client.status === 'Negotiating' && "bg-orange-500/20 text-orange-400",
                        client.status === 'Closed Won' && "bg-green-500/20 text-green-400"
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
                        {client.tags.slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                        {client.tags.length > 2 && (
                          <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                            +{client.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => selectClient(client.id)} className="p-1 hover:text-cyan-400 hover:bg-cyan-950/50 rounded transition-colors" title="Edit/View Details">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if(confirm('Delete client?')) deleteClient(client.id); }} className="p-1 hover:text-red-400 hover:bg-red-950/50 rounded transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
