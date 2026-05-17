import React, { useState, useRef } from 'react';
import { useStore, ClientStatus, Client } from '../store';
import { cn } from '../lib/utils';
import { Mail, Clock, CheckCircle, Search, Target, MessageCircle, Send, Phone, X, Plus, LayoutGrid, List as ListIcon, Download, Upload, Map as MapIcon, Edit2 } from 'lucide-react';
import { PipelineList } from './PipelineList';
import { DealFormModal } from './DealFormModal';
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
  const { clients, deals, selectClient, updateDeal, kanbanSearch, setKanbanSearch, addClient, addDeal } = useStore();
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'map'>('board');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-cyan-500/50', 'bg-cyan-950/10', 'column-drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-cyan-500/50', 'bg-cyan-950/10', 'column-drag-over');
  };

  const handleDrop = (e: React.DragEvent, status: ClientStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-cyan-500/50', 'bg-cyan-950/10', 'column-drag-over');
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) {
      updateDeal(dealId, { status });
    }
  };

  // Build deal view models
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
    if (!kanbanSearch) return true;
    const term = kanbanSearch.toLowerCase();
    const searchable = `${deal.name} ${client?.name} ${client?.company} ${client?.country} ${client?.tags.join(' ')}`.toLowerCase();
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
      complete: async (results) => {
        for (const row of results.data as any[]) {
          if (row.Name) {
             const clientId = await addClient({
               name: row.Name,
               company: row.Company || 'Unknown',
               country: row.Country || 'Unknown',
               status: 'Leads',
               tags: row.Tags ? row.Tags.split(',').map((t: string) => t.trim()) : [],
               contactMethods: row.ContactMethodValue ? [{ type: (row.ContactMethodType || 'email') as any, value: row.ContactMethodValue }] : [],
               lastContact: new Date().toISOString()
             });
             if (clientId) {
               addDeal({
                 clientId,
                 name: row.Company ? `${row.Company} Lead` : `${row.Name} Lead`,
                 value: parseFloat(row.Value) || 0,
                 status: (COLUMNS.includes(row.Status) ? row.Status : 'Leads') as ClientStatus,
               });
             }
          }
        }
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
        <div className="flex-1 overflow-x-auto px-6 pt-6 pb-2 flex gap-4 overflow-y-hidden">
          {COLUMNS.map(col => {
            const columnDeals = filteredDeals.filter(d => d.deal.status === col);
            
            return (
            <div 
              key={col} 
              className="group w-72 shrink-0 flex flex-col h-full bg-slate-800/30 rounded-xl border border-slate-800 p-3 transition-colors"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-bold text-slate-300 text-sm">{col}</h3>
                <span className="text-xs bg-slate-700 text-slate-300 py-0.5 px-2 rounded-full font-medium">
                  {columnDeals.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-3 overflow-y-auto pb-2 scrollbar-thin flex-1">
                {columnDeals.map(({ deal, client }) => (
                  <DealCard key={deal.id} deal={deal} client={client!} onClick={() => selectClient(client!.id)} />
                ))}
                <div className={cn(
                  "h-28 border-2 border-dashed border-cyan-500/50 rounded-lg items-center justify-center text-cyan-500/50 text-xs font-medium pointer-events-none transition-all duration-200 bg-cyan-950/10",
                  columnDeals.length === 0 ? "flex h-24 border-slate-700/50 text-slate-500 bg-transparent group-[.column-drag-over]:border-cyan-500/50 group-[.column-drag-over]:text-cyan-500/50 group-[.column-drag-over]:bg-cyan-950/10" : "hidden group-[.column-drag-over]:flex opacity-0 group-[.column-drag-over]:opacity-100"
                )}>
                  Drop here
                </div>
              </div>
            </div>
          );
        })}
        </div>
      ) : viewMode === 'list' ? (
        <PipelineList />
      ) : (
        <WorldMap onCountryClick={(country) => {
          setKanbanSearch(country);
          setViewMode('list');
        }} />
      )}

      {showAddModal && <DealFormModal onClose={() => setShowAddModal(false)} />}
      
      {showUploadModal && <UploadCSVModal onClose={() => setShowUploadModal(false)} onUpload={handleCSVUpload} />}
    </div>
  );
}

function DealCard({ deal, client, onClick }: { key?: string | number, deal: any, client: Client, onClick: () => void }) {
  const { editClient, updateDeal, addClient } = useStore();
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showEditDeal, setShowEditDeal] = useState(false);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !client.tags.includes(newTag.trim())) {
      let finalTag = newTag.trim();
      if (!finalTag.startsWith('#')) {
        finalTag = '#' + finalTag;
      }
      if (client.id) {
        editClient(client.id, { tags: [...client.tags, finalTag] });
      } else {
        const newTags = [...(deal.contactInfo?.tags || []), finalTag];
        updateDeal(deal.id, { contactInfo: { ...deal.contactInfo, tags: newTags } });
      }
    }
    setNewTag('');
    setIsEditingTags(false);
  };

  const handleRemoveTag = (e: React.MouseEvent, tagToRemove: string) => {
    e.stopPropagation();
    if (client.id) {
      editClient(client.id, { tags: client.tags.filter(t => t !== tagToRemove) });
    } else {
      const newTags = deal.contactInfo?.tags.filter((t: string) => t !== tagToRemove) || [];
      updateDeal(deal.id, { contactInfo: { ...deal.contactInfo, tags: newTags } });
    }
  };

  const convertToContact = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deal.contactInfo) {
      try {
        const clientId = await addClient({
          name: deal.contactInfo.name,
          company: deal.contactInfo.company,
          country: deal.contactInfo.country,
          status: deal.status,
          tags: deal.contactInfo.tags || [],
          contactMethods: deal.contactInfo.contactMethods || [],
          lastContact: new Date().toISOString()
        });
        // Update the deal to link to this new client
        if (clientId) {
          updateDeal(deal.id, { clientId });
        } else {
          window.alert("Failed to convert: A client with this contact method may already exist.");
        }
      } catch (err) {
        window.alert("Error converting lead to contact.");
      }
    }
  };

  return (
    <>
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('dealId', deal.id);
        setTimeout(() => {
          (e.target as HTMLElement).classList.add('opacity-50');
        }, 0);
      }}
      onDragEnd={(e) => {
        (e.target as HTMLElement).classList.remove('opacity-50');
      }}
      onClick={onClick}
      className={cn(
        "bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-cyan-500/50 cursor-pointer transition-all shadow-sm group relative",
        client.isDormant && "border-orange-500/30 bg-orange-950/10"
      )}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); setShowEditDeal(true); }}
        className="absolute top-2 right-2 p-1.5 bg-slate-900 border border-slate-700 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-cyan-400 hover:border-cyan-500/50 z-10"
      >
        <Edit2 className="w-3 h-3" />
      </button>

      <div className="flex items-start justify-between mb-2 pr-8">
        <div>
          <h4 className="font-bold text-slate-200 text-sm group-hover:text-cyan-400 transition-colors pr-2">{deal.name}</h4>
          <p className="text-xs text-slate-500 truncate max-w-[140px]">{client.name} - {client.company}</p>
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
        
        {/* Contact Methods / Convert */}
        <div className="flex items-center justify-between mt-1">
          {!client.id ? (
            <button 
              onClick={convertToContact}
              className="text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded transition-colors shadow-sm"
            >
              Convert to Contact
            </button>
          ) : (
            <div />
          )}
          
          {client.contactMethods && client.contactMethods.length > 0 && (
            <div className="flex items-center gap-1 text-slate-500 justify-end flex-1">
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
    </div>
    {showEditDeal && <DealFormModal dealId={deal.id} onClose={() => setShowEditDeal(false)} />}
    </>
  );
}
