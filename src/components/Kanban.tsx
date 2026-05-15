import React, { useState, useRef } from 'react';
import { useStore, ClientStatus, Client } from '../store';
import { cn } from '../lib/utils';
import { Mail, Clock, CheckCircle, Search, Target, MessageCircle, Send, Phone, X, Plus, LayoutGrid, List as ListIcon, Download, Upload, Map as MapIcon } from 'lucide-react';
import { PipelineList } from './PipelineList';
import { ClientFormModal } from './ClientFormModal';
import { WorldMap } from './WorldMap';
import { UploadCSVModal } from './UploadCSVModal';
import Papa from 'papaparse';

const CONTACT_ICONS: any = {
  email: Mail,
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  telegram: Send,
  phone: Phone,
};

const COLUMNS: ClientStatus[] = ['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'];

export function Kanban() {
  const { clients, selectClient, updateClientStatus, kanbanSearch, setKanbanSearch, addClient } = useStore();
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'map'>('board');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-cyan-500/50', 'bg-cyan-950/10');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-cyan-500/50', 'bg-cyan-950/10');
  };

  const handleDrop = (e: React.DragEvent, status: ClientStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-cyan-500/50', 'bg-cyan-950/10');
    const clientId = e.dataTransfer.getData('clientId');
    if (clientId) {
      updateClientStatus(clientId, status);
    }
  };

  const filteredClients = clients.filter(c => {
    if (!kanbanSearch) return true;
    const term = kanbanSearch.toLowerCase();
    const searchable = `${c.name} ${c.company} ${c.country} ${c.tags.join(' ')}`.toLowerCase();
    return searchable.includes(term);
  });

  const exportCSV = () => {
    const csvData = clients.map(c => ({
      Name: c.name,
      Company: c.company,
      Country: c.country,
      Status: c.status,
      Tags: c.tags.join(','),
      ContactMethodType: c.contactMethods[0]?.type || '',
      ContactMethodValue: c.contactMethods[0]?.value || ''
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'pipeline.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row: any) => {
          if (row.Name) {
             addClient({
               name: row.Name,
               company: row.Company || 'Unknown',
               country: row.Country || 'Unknown',
               status: (COLUMNS.includes(row.Status) ? row.Status : 'Leads') as ClientStatus,
               tags: row.Tags ? row.Tags.split(',').map((t: string) => t.trim()) : [],
               contactMethods: row.ContactMethodValue ? [{ type: (row.ContactMethodType || 'email') as any, value: row.ContactMethodValue }] : [],
               lastContact: new Date().toISOString()
             });
          }
        });
        setShowUploadModal(false);
      }
    });
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative text-slate-100">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-200">Pipeline</h2>
          <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800">
            <button 
              onClick={() => setViewMode('board')} 
              className={cn("px-2.5 py-1 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors", viewMode === 'board' ? "bg-slate-800 text-cyan-400" : "text-slate-500 hover:text-slate-300")}
            >
              <LayoutGrid className="w-4 h-4" /> Board
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={cn("px-2.5 py-1 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors", viewMode === 'list' ? "bg-slate-800 text-cyan-400" : "text-slate-500 hover:text-slate-300")}
            >
              <ListIcon className="w-4 h-4" /> List
            </button>
            <button 
              onClick={() => setViewMode('map')} 
              className={cn("px-2.5 py-1 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors", viewMode === 'map' ? "bg-slate-800 text-cyan-400" : "text-slate-500 hover:text-slate-300")}
            >
              <MapIcon className="w-4 h-4" /> Map
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-medium transition-colors border border-slate-700">
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-medium transition-colors border border-slate-700">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
          </button>
          <div className="w-px h-6 bg-slate-700 mx-1"></div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)] rounded text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Lead
          </button>
        </div>
      </div>

      {kanbanSearch && (
        <div className="px-6 py-3 border-b border-slate-800 flex items-center bg-slate-900/50 shrink-0">
          <span className="text-sm text-slate-400 mr-2 flex items-center gap-2">
            <Search className="w-4 h-4" /> 
            Filtered by:
          </span>
          <span className="bg-cyan-900/30 text-cyan-400 px-3 py-1 rounded-full text-sm font-medium border border-cyan-800/50 flex items-center gap-2">
            {kanbanSearch}
            <button onClick={() => setKanbanSearch('')} className="hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {viewMode === 'board' ? (
        <div className="flex-1 overflow-x-auto p-6 flex gap-4 overflow-y-hidden">
          {COLUMNS.map(col => {
            const columnClients = filteredClients.filter(c => c.status === col);
            
            return (
            <div 
              key={col} 
              className="w-72 shrink-0 flex flex-col h-full bg-slate-800/30 rounded-xl border border-slate-800 p-3 transition-colors"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-bold text-slate-300 text-sm">{col}</h3>
                <span className="text-xs bg-slate-700 text-slate-300 py-0.5 px-2 rounded-full font-medium">
                  {columnClients.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-3 overflow-y-auto pb-2 scrollbar-thin flex-1">
                {columnClients.map(client => (
                  <ClientCard key={client.id} client={client} onClick={() => selectClient(client.id)} />
                ))}
                {columnClients.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-slate-700/50 rounded-lg flex items-center justify-center text-slate-500 text-xs font-medium pointer-events-none">
                    Drop target
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      ) : viewMode === 'list' ? (
        <PipelineList />
      ) : (
        <WorldMap />
      )}

      {showAddModal && <ClientFormModal onClose={() => setShowAddModal(false)} onSave={(id) => selectClient(id)} />}
      
      {showUploadModal && <UploadCSVModal onClose={() => setShowUploadModal(false)} onUpload={handleCSVUpload} />}
    </div>
  );
}

function ClientCard({ client, onClick }: { key?: string | number, client: Client, onClick: () => void }) {
  const { editClient } = useStore();
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !client.tags.includes(newTag.trim())) {
      let finalTag = newTag.trim();
      if (!finalTag.startsWith('#')) {
        finalTag = '#' + finalTag;
      }
      editClient(client.id, { tags: [...client.tags, finalTag] });
    }
    setNewTag('');
    setIsEditingTags(false);
  };

  const handleRemoveTag = (e: React.MouseEvent, tagToRemove: string) => {
    e.stopPropagation();
    editClient(client.id, { tags: client.tags.filter(t => t !== tagToRemove) });
  };

  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('clientId', client.id);
        setTimeout(() => {
          (e.target as HTMLElement).classList.add('opacity-50');
        }, 0);
      }}
      onDragEnd={(e) => {
        (e.target as HTMLElement).classList.remove('opacity-50');
      }}
      onClick={onClick}
      className={cn(
        "bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-cyan-500/50 cursor-pointer transition-all shadow-sm group",
        client.isDormant && "border-orange-500/30 bg-orange-950/10"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-bold text-slate-200 text-sm group-hover:text-cyan-400 transition-colors">{client.name}</h4>
          <p className="text-xs text-slate-500 truncate max-w-[140px]">{client.company}</p>
        </div>
        {client.isDormant ? (
          <div className="bg-orange-500/20 text-orange-400 p-1 rounded-md" title="Dormant">
            <Clock className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="bg-slate-700 text-slate-400 p-1 rounded-md">
            <Target className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-3">
        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap items-center">
          {client.tags.map(t => (
            <span key={t} className="group/tag inline-flex items-center text-[10px] font-medium bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded pr-1">
              {t}
              <button 
                onClick={(e) => handleRemoveTag(e, t)}
                className="ml-1 opacity-0 group-hover/tag:opacity-100 hover:text-red-400 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {isEditingTags ? (
            <form onSubmit={handleAddTag} onClick={e => e.stopPropagation()} className="inline-flex">
              <input 
                type="text" 
                autoFocus
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onBlur={handleAddTag}
                placeholder="tag..."
                className="w-16 bg-slate-950 border border-indigo-500/50 text-[10px] px-1.5 py-0.5 rounded text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </form>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditingTags(true); }}
              className="text-[10px] font-medium bg-slate-800 border border-dashed border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400 px-1 py-0.5 rounded flex items-center transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {/* Contact Methods */}
        {client.contactMethods && client.contactMethods.length > 0 && (
          <div className="flex items-center gap-1 text-slate-500 justify-end w-full">
            {client.contactMethods.map((cm, idx) => {
              const Icon = CONTACT_ICONS[cm.type] || Mail;
              return (
                <span key={idx} title={`${cm.type}: ${cm.value}`} className="flex items-center">
                  <Icon className={cn("w-3.5 h-3.5", cm.type === 'whatsapp' && 'text-green-500')} />
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
