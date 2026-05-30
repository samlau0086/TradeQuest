import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useStore, Client } from '../store';
import { useAuthStore } from '../authStore';
import { useTranslation } from '../lib/i18n';
import { Globe, Search, ArrowRight, Loader2, Clock, Upload, List as ListIcon, Tags as TagsIcon, LayoutGrid, Map as MapIcon, Plus, ArrowUpFromLine, Trash2, MapPin, Bot } from 'lucide-react';
import { cn } from '../lib/utils';
import Papa from 'papaparse';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { UploadCSVModal } from './UploadCSVModal';
import { ClientFormModal } from './ClientFormModal';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COUNTRY_COORDS: Record<string, [number, number]> = {
  'USA': [-95.7129, 37.0902],
  'United States': [-95.7129, 37.0902],
  'United States of America': [-95.7129, 37.0902],
  'Brazil': [-51.9253, -14.2350],
  'Japan': [138.2529, 36.2048],
  'Germany': [10.4515, 51.1657],
  'China': [104.1954, 35.8617],
  'India': [78.9629, 20.5937],
  'UK': [-3.4359, 55.3781],
  'United Kingdom': [-3.4359, 55.3781],
  'Australia': [133.7751, -25.2744],
};

type ViewMode = 'grid' | 'list' | 'map' | 'tags';

import { OutscraperSearchModal } from './OutscraperSearchModal';
import { LeadCampaignModal } from './LeadCampaignModal';

export function PublicPool() {
  const { publicClients, fetchPublicClients, claimClient, deletePublicLead, importPublicLeads, language } = useStore();
  const { profile } = useAuthStore();
  const t = useTranslation(language);
  const [search, setSearch] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [confirmClaimId, setConfirmClaimId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOutscraperModal, setShowOutscraperModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPublicClients();
  }, [fetchPublicClients]);

  const handleAdminAction = async (id: string, action: 'restore' | 'delete') => {
    try {
      const token = localStorage.getItem('token');
      if (action === 'delete') {
        await fetch(`/api/clients/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      } else if (action === 'restore') {
        await fetch(`/api/clients/${id}/restore`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      }
      fetchPublicClients();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = publicClients.filter(c => {
    if (!search) return true;
    let term = search.toLowerCase();
    if (term === 'usa') term = 'united states';
    if (term === 'uk') term = 'united kingdom';
    
    return `${c.name} ${c.company} ${c.country} ${c.tags.join(' ')}`.toLowerCase().includes(term);
  });

  const executeClaim = async () => {
    if (confirmClaimId) {
      setClaimingId(confirmClaimId);
      await claimClient(confirmClaimId);
      setClaimingId(null);
      setConfirmClaimId(null);
    }
  };

  const executeAdminDelete = async () => {
    if (confirmDeleteId) {
      await deletePublicLead(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleCSVUpload = (file: File) => {
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const leads: any[] = [];
          for (const row of results.data as any[]) {
            // Outscraper Google Maps / B2B Export Format
            if (row.name !== undefined && (row.query !== undefined || row.type !== undefined)) {
               const contactMethods = [];
               if (row.emails) {
                 const emails = row.emails.split(',');
                 if (emails[0]) contactMethods.push({ type: 'email', value: emails[0].trim() });
               }
               if (row.phones) {
                 const phones = row.phones.split(',');
                 if (phones[0]) contactMethods.push({ type: 'phone', value: phones[0].trim() });
               }
               leads.push({
                 name: row.name,
                 company: row.name,
                 address: row.full_address || '',
                 city: row.city || '',
                 state: row.state || '',
                 country: row.country || 'Unknown',
                 tags: row.category ? row.category.split(',').map((t: string) => t.trim()) : [],
                 contactMethods: contactMethods.length > 0 ? contactMethods : undefined
               });
            } else if (row.Name) {
              // Default App CSV Format
              leads.push({
                name: row.Name,
                company: row.Company || 'Unknown',
                country: row.Country || 'Unknown',
                tags: row.Tags ? row.Tags.split(',').map((t: string) => t.trim()) : []
              });
            }
          }
          if (leads.length > 0) {
            await importPublicLeads(leads);
          }
          setShowUploadModal(false);
        }
      });
    }
  };

  const countryMarkers = useMemo(() => {
    const groups: Record<string, { count: number; coordinates: [number, number] }> = {};
    filtered.forEach(client => {
      const coordinates = COUNTRY_COORDS[client.country];
      if (coordinates) {
        if (!groups[client.country]) {
          groups[client.country] = { count: 1, coordinates };
        } else {
          groups[client.country].count++;
        }
      }
    });
    return Object.entries(groups).map(([country, data]) => ({
      country,
      ...data
    }));
  }, [filtered]);

  const tagsGroup = useMemo(() => {
    const groups: Record<string, typeof publicClients> = { 'Untagged': [] };
    filtered.forEach(client => {
      if (client.tags.length === 0) {
        groups['Untagged'].push(client);
      } else {
        client.tags.forEach(tag => {
          if (!groups[tag]) groups[tag] = [];
          if (!groups[tag].find(c => c.id === client.id)) {
            groups[tag].push(client);
          }
        });
      }
    });
    return groups;
  }, [filtered]);

  const renderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map(client => (
        <div key={client.id} className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 flex flex-col gap-4 relative group hover:border-cyan-500/50 transition-colors">
          <div className="absolute top-4 right-4 text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-400 flex items-center gap-1">
             <Clock className="w-3 h-3" />
             {new Date(client.lastContact || new Date()).toLocaleDateString()}
          </div>
          
          <div>
            <h3 className="font-bold text-lg text-white mb-1 truncate pr-16">{client.name}</h3>
            <p className="text-sm text-slate-400 flex items-center gap-2 truncate">
              {client.company} <span className="opacity-50">· {[client.city, client.state, client.country].filter(Boolean).join(', ') || '-'}</span>
            </p>
          </div>

          {client.tags.length > 0 && (
             <div className="flex flex-wrap gap-1 mt-auto pt-2">
               {client.tags.slice(0, 3).map(tag => (
                 <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded">
                   {tag}
                 </span>
               ))}
               {client.tags.length > 3 && (
                 <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">+{client.tags.length - 3}</span>
               )}
             </div>
          )}

          {client.deletedBy && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded p-2 mt-2 font-medium">
              Discarded Lead (By user: {client.deletedBy})
            </div>
          )}

          <div className="w-full mt-2 flex gap-2">
            <button
              onClick={() => setConfirmClaimId(client.id)}
              disabled={claimingId === client.id}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-cyan-600 text-white py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {claimingId === client.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {t('claim')}
            </button>
            <button
              onClick={() => setConfirmDeleteId(client.id)}
              className="p-2 bg-slate-800 hover:bg-rose-600 text-white rounded-lg transition-colors"
              title={t('deleteClientButton')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {profile?.role === 'superadmin' && client.deletedBy && (
              <>
               <button
                 onClick={() => handleAdminAction(client.id, 'restore')}
                 className="p-2 bg-slate-800 hover:bg-green-600 text-white rounded-lg transition-colors"
                 title="Restore"
               >
                 <ArrowUpFromLine className="w-4 h-4" />
               </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderList = () => (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-900/80 text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Tags</th>
            <th className="px-4 py-3 font-medium">Last Active</th>
            <th className="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
          {filtered.map(client => (
            <tr key={client.id} className="hover:bg-slate-800/50">
              <td className="px-4 py-4 text-white font-medium">
                {client.name}
                {client.deletedBy && <span className="ml-2 px-1.5 py-0.5 rounded bg-red-950/50 text-red-400 text-[10px] font-bold">Discarded</span>}
              </td>
              <td className="px-4 py-4 text-slate-300">{client.company}</td>
              <td className="px-4 py-4 text-slate-300">{[client.city, client.state, client.country].filter(Boolean).join(', ')}</td>
              <td className="px-4 py-4">
                <div className="flex gap-1">
                  {client.tags.slice(0, 2).map((t: string) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 text-xs">{t}</span>
                  ))}
                  {client.tags.length > 2 && <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">+{client.tags.length - 2}</span>}
                </div>
              </td>
              <td className="px-4 py-4 text-slate-400">{new Date(client.lastContact || new Date()).toLocaleDateString()}</td>
              <td className="px-4 py-4 text-right flex justify-end gap-2">
                {profile?.role === 'superadmin' && client.deletedBy && (
                  <>
                   <button onClick={() => handleAdminAction(client.id, 'restore')} className="p-1.5 bg-slate-800 hover:bg-green-600 text-white rounded transition-colors" title="Restore">
                     <ArrowUpFromLine className="w-4 h-4" />
                   </button>
                  </>
                )}
                <button onClick={() => setConfirmDeleteId(client.id)} className="p-1.5 bg-slate-800 hover:bg-rose-600 text-white rounded transition-colors" title={t('deleteClientButton')}>
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmClaimId(client.id)}
                  disabled={claimingId === client.id}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-cyan-600 text-white rounded font-medium disabled:opacity-50 transition-colors inline-block cursor-pointer"
                >
                  {claimingId === client.id ? '...' : t('claim')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMap = () => (
    <div className="w-full bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden relative" style={{ height: '500px' }}>
      <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: "100%" }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const geoName = geo.properties.name;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth={0.5}
                  onClick={() => {
                    const mappedName = geoName === 'United States of America' ? 'United States' : geoName;
                    setSearch(mappedName);
                    setViewMode('list');
                  }}
                  className="cursor-pointer"
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#475569", outline: "none" },
                    pressed: { fill: "#1e293b", outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
        {countryMarkers.map(({ country, count, coordinates }) => (
          <Marker 
            key={country} 
            coordinates={coordinates} 
            onClick={() => {
              setSearch(country);
              setViewMode('list');
            }} 
            className="cursor-pointer outline-none group transition-opacity"
          >
            {/* Invisible hit area to prevent hover flickering */}
            <circle r={24} fill="transparent" />
            <circle 
              r={12} 
              fill="#22d3ee" 
              className="opacity-40 animate-ping group-hover:opacity-0 transition-opacity" 
            />
            <circle 
              r={8} 
              fill="#22d3ee" 
              stroke="#0f172a" 
              strokeWidth={1.5} 
              className="group-hover:scale-125 transition-transform"
              style={{ transformOrigin: "0px 0px" }}
            />
            <text textAnchor="middle" y={-18} style={{ fontFamily: 'var(--font-sans)', fontSize: "12px", fill: "#f1f5f9", fontWeight: 700 }}>
              {country}
            </text>
            <text 
              textAnchor="middle" 
              y={3} 
              style={{ fontFamily: 'var(--font-sans)', fontSize: "9px", fill: "#0f172a", fontWeight: 800, transformOrigin: "0px -3px" }} 
              className="group-hover:scale-125 transition-transform"
            >
              {count}
            </text>
            <text textAnchor="middle" y={20} style={{ fontFamily: 'var(--font-sans)', fontSize: "10px", fill: "#38bdf8", fontWeight: 600 }} className="opacity-0 group-hover:opacity-100 transition-opacity">
              View Leads
            </text>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );

  const renderTags = () => (
    <div className="flex overflow-x-auto gap-6 pb-4">
      {Object.entries(tagsGroup).map(([tag, clients]) => clients.length > 0 && (
        <div key={tag} className="w-80 shrink-0 bg-slate-900 rounded-xl border border-slate-800 flex flex-col max-h-[600px]">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-xl sticky top-0 z-10">
            <h3 className="font-bold flex items-center gap-2 text-slate-200">
              <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
              {tag}
            </h3>
            <span className="text-xs bg-slate-800 px-2 py-1 rounded-full text-slate-400 font-bold">{clients.length}</span>
          </div>
          <div className="p-4 overflow-y-auto flex flex-col gap-3">
            {clients.map(client => (
              <div key={client.id} className="bg-slate-800 p-4 rounded border border-slate-700/50 hover:border-cyan-500/30">
                <div className="font-medium text-slate-200">{client.name}</div>
                <div className="text-xs text-slate-400 mt-1">{client.company}</div>
                <button
                  onClick={() => setConfirmClaimId(client.id)}
                  disabled={claimingId === client.id}
                  className="w-full mt-3 py-1.5 text-xs bg-slate-900 hover:bg-cyan-600 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {claimingId === client.id ? '...' : t('claim')}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(client.id)}
                  className="w-full mt-2 py-1.5 text-xs bg-slate-900 hover:bg-rose-600 rounded text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('deleteClientButton')}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex-1 overflow-auto bg-slate-900 p-6 flex flex-col">
      <div className="w-full flex-1 flex flex-col space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Globe className="w-8 h-8 text-cyan-400" />
              {t('publicPool')}
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Leads that have been inactive are automatically returned here. Claim them to start engaging.</p>
          </div>
          <div className="flex items-center gap-3">
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  {t('newClientTarget') || 'Add Lead'}
                </button>
                <button 
                  onClick={() => setShowCampaignModal(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Bot className="w-4 h-4" />
                  Acquisition Agent
                </button>
                <button 
                  onClick={() => setShowOutscraperModal(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer border border-slate-700 whitespace-nowrap"
                >
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  Search Maps
                </button>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-4 h-4" />
                  Import Leads (CSV)
                </button>
              </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl flex flex-col min-h-[500px] flex-1">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder={t('searchInList')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-1">
              {(['grid', 'list', 'map', 'tags'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn("p-1.5 rounded-md transition-colors cursor-pointer text-slate-400 hover:text-white capitalize", viewMode === mode && "bg-slate-800 text-cyan-400")}
                  title={`View as ${mode}`}
                >
                  {mode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : 
                   mode === 'list' ? <ListIcon className="w-4 h-4" /> : 
                   mode === 'map' ? <MapIcon className="w-4 h-4" /> : <TagsIcon className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 bg-slate-950/30">
            {filtered.length === 0 ? (
              <div className="py-20 text-center text-slate-500 flex flex-col items-center">
                <Globe className="w-12 h-12 mb-4 opacity-20" />
                <p>{t('noPublicLeads')}</p>
              </div>
            ) : (
              viewMode === 'grid' ? renderGrid() :
              viewMode === 'list' ? renderList() :
              viewMode === 'map' ? renderMap() :
              renderTags()
            )}
          </div>
        </div>
      </div>
      {showUploadModal && <UploadCSVModal onClose={() => setShowUploadModal(false)} onUpload={handleCSVUpload} />}
      {showOutscraperModal && <OutscraperSearchModal onClose={() => setShowOutscraperModal(false)} />}
      {showCampaignModal && <LeadCampaignModal onClose={() => setShowCampaignModal(false)} />}
      {showAddModal && <ClientFormModal isPublicPool onClose={() => setShowAddModal(false)} />}
      
      {confirmClaimId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Claim Lead?</h3>
            <p className="text-slate-400 mb-6 text-sm">Are you sure you want to claim this lead? It will cost 10 points.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmClaimId(null)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
              <button onClick={executeClaim} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow font-medium transition-colors">Claim Lead</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Permanent Delete?</h3>
            <p className="text-slate-400 mb-6 text-sm">Are you sure you want to permanently delete this lead? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
              <button onClick={executeAdminDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
