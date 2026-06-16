import React, { useMemo, useState } from 'react';
import { Client, useStore, ContactMethod } from '../store';
import { cn } from '../lib/utils';
import { Mail, Phone, MessageCircle, Send, Edit2, Trash2, Plus, Download, Upload, List as ListIcon, Map as MapIcon, X } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { ClientFormModal } from './ClientFormModal';
import { UploadCSVModal } from './UploadCSVModal';
import { WorldMap } from './WorldMap';
import { ActionButton, ConfirmDialog, DataTable, DataTableColumn, IconButton, PageHeader, TagSearchInput, Toolbar } from './ui';

type ViewMode = 'list' | 'map';
type SortColumn = 'leadScore' | 'recentEvent';
type SortDirection = 'desc' | 'asc';

const CONTACT_ICONS: any = {
  email: Mail,
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  telegram: Send,
  phone: Phone,
};

const getLeadScoreVisual = (score?: number) => {
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));
  if (normalizedScore >= 81) return { level: 'Lv.5', label: '爆发', icon: '⚡', className: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' };
  if (normalizedScore >= 61) return { level: 'Lv.4', label: '炽热', icon: '🔥', className: 'border-orange-500/40 bg-orange-500/10 text-orange-300' };
  if (normalizedScore >= 41) return { level: 'Lv.3', label: '温热', icon: '🫧', className: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' };
  if (normalizedScore >= 21) return { level: 'Lv.2', label: '初冷', icon: '💧', className: 'border-blue-500/40 bg-blue-500/10 text-blue-300' };
  return { level: 'Lv.1', label: '极冷', icon: '❄️', className: 'border-slate-500/40 bg-slate-500/10 text-slate-300' };
};

  import Papa from 'papaparse';

  export function ClientsList() {
    const { clients, logs, selectClient, deleteClient, addClient, language } = useStore();
    const t = useTranslation(language);
    const [search, setSearch] = useState('');
    const [searchTags, setSearchTags] = useState<string[]>([]);
    const [countryFilter, setCountryFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortColumn, setSortColumn] = useState<SortColumn>('leadScore');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleCSVUpload = (file: File) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          for (const row of results.data as any[]) {
            // Outscraper format
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
               await addClient({
                 name: row.name,
                 company: row.name,
                 address: row.full_address || '',
                 city: row.city || '',
                 state: row.state || '',
                 country: row.country || 'Unknown',
                 status: 'Leads',
                 tags: row.category ? row.category.split(',').map((t: string) => t.trim()) : [],
                 contactMethods,
                 lastContact: new Date().toISOString()
               });
            } else if (row.Name) {
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
    let match = true;
    if (countryFilter && c.country?.toLowerCase() !== countryFilter.toLowerCase()) {
      match = false;
    }
    
    const termsToMatch = [...searchTags];
    if (search.trim()) {
      termsToMatch.push(...search.trim().toLowerCase().split(/\s+/));
    }

    if (termsToMatch.length > 0 && match) {
      const searchable = `${c.name} ${c.company} ${c.city} ${c.state} ${c.country} ${c.sourceLabel || ''} ${c.sourceId || ''} ${c.tags.join(' ')} ${(c.contactMethods || []).map(cm => cm.value).join(' ')}`.toLowerCase();
      match = termsToMatch.every(term => searchable.includes(term.toLowerCase()));
    }
    return match;
  });

  const latestEventByClient = useMemo(() => {
    const latest: Record<string, { date: string; content: string }> = {};
    logs.forEach(log => {
      if (!log.clientId || !log.date) return;
      const currentTime = latest[log.clientId] ? new Date(latest[log.clientId].date).getTime() : 0;
      const nextTime = new Date(log.date).getTime();
      if (Number.isFinite(nextTime) && nextTime > currentTime) {
        latest[log.clientId] = { date: log.date, content: log.content || '' };
      }
    });
    return latest;
  }, [logs]);

  const getRecentEventTime = (client: typeof clients[number]) => {
    const rawDate = latestEventByClient[client.id]?.date || client.lastContact;
    const time = rawDate ? new Date(rawDate).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  };

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(current => current === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortColumn(column);
    setSortDirection('desc');
  };

  const sortedClients = useMemo(() => (
    [...filteredClients].sort((a, b) => {
      let result = 0;
      if (sortColumn === 'recentEvent') {
        result = getRecentEventTime(a) - getRecentEventTime(b);
      } else {
        const aScore = Number(a.leadScore) || 0;
        const bScore = Number(b.leadScore) || 0;
        result = aScore - bScore;
      }
      if (result === 0) result = a.name.localeCompare(b.name);
      return sortDirection === 'desc' ? -result : result;
    })
  ), [filteredClients, latestEventByClient, sortColumn, sortDirection]);

  const leadScoreHeaderLabel = language === 'zh' ? '线索分值' : 'Lead Score';

  const recentEventHeaderLabel = language === 'zh' ? '最近事件时间' : 'Recent Event';

  const clientColumns: DataTableColumn[] = [
    { key: 'name', header: t('name') },
    { key: 'company', header: t('company') },
    { key: 'location', header: t('location') },
    { key: 'contact', header: t('contactMethod') },
    {
      key: 'leadScore',
      header: (
        <button
          type="button"
          onClick={() => toggleSort('leadScore')}
          className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-left font-bold text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
          title={language === 'zh' ? '按线索分值排序' : 'Sort by lead score'}
        >
          {leadScoreHeaderLabel}
          <span className="text-[10px] text-cyan-400">{sortColumn === 'leadScore' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}</span>
        </button>
      )
    },
    {
      key: 'recentEvent',
      header: (
        <button
          type="button"
          onClick={() => toggleSort('recentEvent')}
          className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-left font-bold text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
          title={language === 'zh' ? '按最近事件时间排序' : 'Sort by recent event time'}
        >
          {recentEventHeaderLabel}
          <span className="text-[10px] text-cyan-400">{sortColumn === 'recentEvent' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}</span>
        </button>
      )
    },
    { key: 'source', header: language === 'zh' ? '来源' : 'Source' },
    { key: 'tags', header: t('tagsLabel').split(' ')[0] },
    { key: 'actions', header: t('actions'), align: 'right' }
  ];

  const renderClientCell = (client: Client, column: DataTableColumn) => {
    const contactMethods = client.contactMethods || [];
    const scoreVisual = getLeadScoreVisual(client.leadScore);
    const leadScore = Math.max(0, Math.min(100, Number(client.leadScore) || 0));
    const recentEvent = latestEventByClient[client.id];
    const recentEventDate = recentEvent?.date || client.lastContact;
    const recentEventTime = recentEventDate ? new Date(recentEventDate) : null;
    const recentEventIsValid = !!recentEventTime && Number.isFinite(recentEventTime.getTime());

    switch (column.key) {
      case 'name':
        return (
          <button onClick={() => selectClient(client.id)} className="hover:text-cyan-400 hover:underline text-left font-bold text-slate-200">
            {client.name}
          </button>
        );
      case 'company':
        return <span className="text-slate-400">{client.company}</span>;
      case 'location':
        return <span className="capitalize text-slate-400">{[client.city, client.state, client.country].filter(Boolean).join(', ') || '-'}</span>;
      case 'contact':
        return contactMethods.length > 0 ? (
          <span className="flex items-center gap-1 text-slate-400">
            {React.createElement(CONTACT_ICONS[contactMethods[0].type] || Mail, { className: 'w-3 h-3' })}
            {contactMethods[0].value}
            {contactMethods.length > 1 && <span className="text-[10px] bg-slate-700 px-1 rounded">+{contactMethods.length - 1}</span>}
          </span>
        ) : null;
      case 'leadScore':
        return (
          <div className="flex items-center gap-3 min-w-[150px]">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-bold whitespace-nowrap', scoreVisual.className)}>
              <span>{scoreVisual.icon}</span>
              <span>{scoreVisual.level}</span>
              <span>{scoreVisual.label}</span>
            </span>
            <div className="min-w-[48px] text-right">
              <div className="text-sm font-black text-slate-100">{leadScore}</div>
              <div className="mt-1 h-1.5 w-12 overflow-hidden rounded-full bg-slate-800">
                <div className={cn('h-full rounded-full', leadScore >= 81 ? 'bg-yellow-400' : leadScore >= 61 ? 'bg-orange-400' : leadScore >= 41 ? 'bg-cyan-400' : leadScore >= 21 ? 'bg-blue-400' : 'bg-slate-500')} style={{ width: `${leadScore}%` }} />
              </div>
            </div>
          </div>
        );
      case 'recentEvent':
        return recentEventIsValid ? (
          <div className="min-w-[170px] text-slate-400">
            <div className="text-xs font-bold text-slate-200">
              {recentEventTime.toLocaleString()}
            </div>
            <div className="mt-1 max-w-[220px] truncate text-[11px] text-slate-500" title={recentEvent?.content || ''}>
              {recentEvent?.content || (language === 'zh' ? '最近联系' : 'Last contact')}
            </div>
          </div>
        ) : (
          <span className="text-slate-600">-</span>
        );
      case 'source':
        return client.sourceLabel ? (
          <span className="inline-flex max-w-[220px] items-center rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[11px] font-bold text-cyan-200" title={client.sourceLabel}>
            <span className="truncate">{client.sourceLabel}</span>
          </span>
        ) : (
          <span className="text-slate-600">-</span>
        );
      case 'tags':
        return (
          <div className="flex gap-1 flex-wrap">
            {client.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
            {client.tags.length > 2 && (
              <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                +{client.tags.length - 2}
              </span>
            )}
          </div>
        );
      case 'actions':
        return (
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => selectClient(client.id)} className="p-1 hover:text-cyan-400 hover:bg-cyan-950/50 rounded transition-colors" title="Edit/View Details">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => setDeleteClientId(client.id)} className="p-1 hover:text-red-400 hover:bg-red-950/50 rounded transition-colors" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border-l border-slate-800">
      <PageHeader
        className="border-b border-slate-800 bg-slate-900/50 p-4"
        title={t('clientsMenu')}
        description={`${sortedClients.length} ${language === 'zh' ? '个客户' : 'clients'}`}
        actions={(
          <Toolbar className="flex-wrap justify-end">
          <div className="mr-2 flex rounded-lg border border-slate-800 bg-slate-950 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-slate-800 text-cyan-400" : "text-slate-500 hover:text-slate-300")}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === 'map' ? "bg-slate-800 text-cyan-400" : "text-slate-500 hover:text-slate-300")}
              title="Map View"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
          <TagSearchInput
            tags={searchTags}
            onRemoveTag={(index) => setSearchTags(tags => tags.filter((_, tagIndex) => tagIndex !== index))}
            leadingChips={countryFilter && (
              <span className="flex items-center gap-1 bg-indigo-950 text-indigo-400 text-xs px-2 py-0.5 rounded border border-indigo-800/50">
                <MapIcon className="w-3 h-3" />
                {countryFilter}
                <button onClick={() => setCountryFilter('')} className="hover:text-indigo-200 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            placeholder={(countryFilter || searchTags.length > 0) ? "Search more..." : t('search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  if (search.trim()) {
                    setSearchTags([...searchTags, search.trim()]);
                    setSearch('');
                  }
                } else if (e.key === 'Backspace' && !search && searchTags.length > 0) {
                  setSearchTags(searchTags.slice(0, -1));
                }
            }}
          />
          <IconButton icon={<Upload className="w-4 h-4" />} label="Upload CSV" onClick={() => setShowUploadModal(true)} />
          <IconButton icon={<Download className="w-4 h-4" />} label="Export CSV" onClick={() => {}} />
          <ActionButton tone="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            {t('addClient')}
          </ActionButton>
          </Toolbar>
        )}
      />

      <div className="flex-1 p-6 flex flex-col min-h-0 overflow-hidden">
        {viewMode === 'list' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-auto shadow-xl flex-1">
            <DataTable
              columns={clientColumns}
              rows={sortedClients}
              getRowKey={client => client.id}
              renderCell={renderClientCell}
              className="min-w-[1100px] rounded-lg border-0 bg-slate-900"
              tableClassName="text-sm"
              headClassName="sticky top-0 bg-slate-950"
              bodyClassName="divide-y divide-slate-800/50"
              rowClassName="group"
              emptyState={<span className="text-slate-500">{t('noClientsFound')}</span>}
            />

          </div>
        ) : (
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
            <WorldMap onCountryClick={(country) => {
              setCountryFilter(country);
              setViewMode('list');
            }} />
          </div>
        )}
      </div>

      {showAddModal && <ClientFormModal onClose={() => setShowAddModal(false)} />}
      {showUploadModal && <UploadCSVModal onClose={() => setShowUploadModal(false)} onUpload={handleCSVUpload} />}

      {deleteClientId && (
        <ConfirmDialog
          title={t('deleteClientTitle')}
          message={t('deleteClientContent')}
          confirmLabel={t('deleteClientButton')}
          cancelLabel={t('cancel')}
          tone="danger"
          onCancel={() => setDeleteClientId(null)}
          onConfirm={() => { deleteClient(deleteClientId); setDeleteClientId(null); }}
        />
      )}
    </div>
  );
}
