import React, { useState } from 'react';
import { useStore, ContactMethod } from '../store';
import { cn } from '../lib/utils';
import { Mail, Phone, MessageCircle, Send, Edit2, Trash2, Plus, Download, Upload } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { ClientFormModal } from './ClientFormModal';
import { UploadCSVModal } from './UploadCSVModal';

const CONTACT_ICONS: any = {
  email: Mail,
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  telegram: Send,
  phone: Phone,
};

  import Papa from 'papaparse';

  export function ClientsList() {
    const { clients, selectClient, deleteClient, addClient, language } = useStore();
    const t = useTranslation(language);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const handleCSVUpload = (file: File) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          for (const row of results.data as any[]) {
            if (row.Name) {
              await addClient({
                name: row.Name,
                company: row.Company || 'Unknown',
                country: row.Country || 'Unknown',
                status: 'Leads',
                tags: row.Tags ? row.Tags.split(',').map((t: string) => t.trim()) : [],
                contactMethods: row.ContactMethodValue ? [{ type: (row.ContactMethodType || 'email') as any, value: row.ContactMethodValue }] : [],
                lastContact: new Date().toISOString()
              });
            }
          }
          setShowUploadModal(false);
        }
      });
    };

  const filteredClients = clients.filter(c => {
    if (!search) return true;
    const term = search.toLowerCase();
    const searchable = `${c.name} ${c.company} ${c.country} ${c.tags.join(' ')}`.toLowerCase();
    return searchable.includes(term);
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border-l border-slate-800">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <h2 className="font-bold text-slate-200">{t('clientsMenu')}</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder={t('search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-64"
          />
          <button onClick={() => setShowUploadModal(true)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400" title="Upload CSV">
            <Upload className="w-4 h-4" />
          </button>
          <button onClick={() => {}} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400" title="Export CSV">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            {t('addClient')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 bg-slate-950 uppercase border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Contact Method</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <button onClick={() => selectClient(client.id)} className="hover:text-cyan-400 hover:underline text-left font-bold text-slate-200">
                      {client.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{client.company}</td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{client.country || '-'}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {client.contactMethods.length > 0 && (
                      <span className="flex items-center gap-1">
                        {React.createElement(CONTACT_ICONS[client.contactMethods[0].type] || Mail, { className: 'w-3 h-3' })}
                        {client.contactMethods[0].value}
                        {client.contactMethods.length > 1 && <span className="text-[10px] bg-slate-700 px-1 rounded">+{client.contactMethods.length - 1}</span>}
                      </span>
                    )}
                  </td>
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
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <ClientFormModal onClose={() => setShowAddModal(false)} />}
      {showUploadModal && <UploadCSVModal onClose={() => setShowUploadModal(false)} onUpload={handleCSVUpload} />}
    </div>
  );
}
