import React, { useMemo, useState } from 'react';
import { Bot, Database, Loader2, Play, Plus, Search, Trash2, X } from 'lucide-react';
import { useStore, LeadCampaign, LeadCampaignMode, LeadDataProvider } from '../store';
import { useAuthStore } from '../authStore';
import { cn } from '../lib/utils';

export function LeadCampaignModal({ onClose }: { onClose: () => void }) {
  const {
    leadCampaigns,
    addLeadCampaign,
    updateLeadCampaign,
    deleteLeadCampaign,
    outscraperApiKey,
    leadDataChannelConfigs,
    importPublicLeads,
    fetchPublicClients,
    llmMappings,
    activeLLMId,
    llmConfigs,
    notify
  } = useStore();
  const { token } = useAuthStore();
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [limit, setLimit] = useState(10);
  const [mode, setMode] = useState<LeadCampaignMode>('manual');
  const [provider, setProvider] = useState<LeadDataProvider>('outscraper');
  const [enrichBeforeImport, setEnrichBeforeImport] = useState(false);
  const [enrichmentProvider, setEnrichmentProvider] = useState<LeadDataProvider>('clay');
  const [runningId, setRunningId] = useState<string | null>(null);

  const canSave = keywords.trim() && industry.trim() && country.trim() && limit > 0;
  const suggestedName = useMemo(() => {
    const parts = [industry, country].filter(Boolean);
    return parts.length ? parts.join(' - ') : 'New Lead Campaign';
  }, [industry, country]);

  const buildQuery = (campaign: Pick<LeadCampaign, 'keywords' | 'industry' | 'country'>) => (
    [campaign.keywords, campaign.industry, `in ${campaign.country}`]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const providerOptions: { id: LeadDataProvider; label: string; kind: string }[] = [
    { id: 'outscraper', label: 'Outscraper', kind: 'Maps search' },
    { id: 'apify', label: 'Apify', kind: 'Actor' },
    { id: 'phantombuster', label: 'PhantomBuster', kind: 'Agent' },
    { id: 'scrapio', label: 'Scrap.io', kind: 'Search API' },
    { id: 'hasdata', label: 'HasData', kind: 'Search API' },
    { id: 'decodo', label: 'Decodo', kind: 'Scraping API' },
    { id: 'clay', label: 'Clay', kind: 'Enrichment' }
  ];

  const getProviderConfig = (providerId: LeadDataProvider) => {
    if (providerId === 'outscraper') {
      return { ...leadDataChannelConfigs.outscraper, apiKey: leadDataChannelConfigs.outscraper?.apiKey || outscraperApiKey };
    }
    return leadDataChannelConfigs[providerId];
  };

  const normalizeRows = (rows: any[], campaign: LeadCampaign) => {
    const leads: any[] = [];
    for (const row of rows) {
      if (!row?.name) continue;
      const contactMethods = [];
      if (row.emails) {
        const emails = Array.isArray(row.emails) ? row.emails : String(row.emails).split(',');
        if (emails[0]) contactMethods.push({ type: 'email', value: String(emails[0]).trim() });
      }
      if (row.phones) {
        const phones = Array.isArray(row.phones) ? row.phones : String(row.phones).split(',');
        if (phones[0]) contactMethods.push({ type: 'phone', value: String(phones[0]).trim() });
      }
      leads.push({
        name: row.name,
        company: row.name,
        address: row.full_address || '',
        city: row.city || '',
        state: row.state || '',
        country: row.country || campaign.country || 'Unknown',
        tags: [row.type || row.category || campaign.industry, 'Campaign'].filter(Boolean),
        contactMethods: contactMethods.length > 0 ? contactMethods : undefined
      });
    }
    return leads;
  };

  const runCampaign = async (campaign: LeadCampaign) => {
    const providerConfig = getProviderConfig(campaign.provider || 'outscraper');
    if (!providerConfig?.enabled || !providerConfig?.apiKey) {
      notify(`Configure ${campaign.provider || 'outscraper'} before running acquisition campaigns.`, 'warning');
      return;
    }
    if (!token) return;

    setRunningId(campaign.id);
    updateLeadCampaign(campaign.id, { status: 'running', lastError: undefined });

    try {
      let query = buildQuery(campaign);

      if (campaign.mode === 'agent') {
        const translateLlmId = llmMappings['outscraperTranslate'] || activeLLMId;
        const llmConfig = translateLlmId ? llmConfigs.find(c => c.id === translateLlmId) : undefined;
        const prompt = `Find B2B prospects for keywords "${campaign.keywords}" in industry "${campaign.industry}" located in "${campaign.country}". Return one concise Google Maps search query only.`;
        const response = await fetch('/api/outscraper/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ query: prompt, llmConfig })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.result) query = data.result;
        }
      }

      const searchResponse = await fetch('/api/lead-data/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: campaign.provider || 'outscraper',
          query,
          keywords: campaign.keywords,
          industry: campaign.industry,
          country: campaign.country,
          limit: campaign.limit,
          config: providerConfig
        })
      });

      if (!searchResponse.ok) throw new Error('Lead search failed');
      const data = await searchResponse.json();
      const rows = data.leads || (data.data && data.data.length > 0 ? data.data[0] || [] : []);
      let leads = normalizeRows(rows, campaign);

      if (campaign.enrichBeforeImport && campaign.enrichmentProvider) {
        const enrichmentConfig = getProviderConfig(campaign.enrichmentProvider);
        if (enrichmentConfig?.apiKey || enrichmentConfig?.enrichEndpoint) {
          const enrichResponse = await fetch('/api/lead-data/enrich', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              provider: campaign.enrichmentProvider,
              leads,
              config: enrichmentConfig
            })
          });
          if (enrichResponse.ok) {
            const enriched = await enrichResponse.json();
            if (Array.isArray(enriched.leads)) leads = enriched.leads;
          }
        }
      }

      if (leads.length === 0) {
        updateLeadCampaign(campaign.id, {
          status: 'completed',
          query,
          importedCount: 0,
          lastRunAt: new Date().toISOString()
        });
        notify('Campaign finished, but no matching leads were found.', 'info');
        return;
      }

      await importPublicLeads(leads);
      fetchPublicClients();
      updateLeadCampaign(campaign.id, {
        status: 'completed',
        query,
        importedCount: leads.length,
        lastRunAt: new Date().toISOString()
      });
      notify(`Campaign complete. Imported ${leads.length} leads to the public pool.`, 'success');
    } catch (error: any) {
      console.error(error);
      updateLeadCampaign(campaign.id, {
        status: 'failed',
        lastError: error?.message || 'Campaign failed',
        lastRunAt: new Date().toISOString()
      });
      notify('Campaign failed. Please check the settings and try again.', 'error');
    } finally {
      setRunningId(null);
    }
  };

  const handleSave = async (runNow: boolean) => {
    if (!canSave) {
      notify('Please set keywords, industry, country, and lead count.', 'warning');
      return;
    }

    const id = addLeadCampaign({
      name: name.trim() || suggestedName,
      keywords: keywords.trim(),
      industry: industry.trim(),
      country: country.trim(),
      limit,
      mode,
      provider,
      enrichBeforeImport,
      enrichmentProvider,
      query: buildQuery({ keywords, industry, country })
    });
    const campaign = useStore.getState().leadCampaigns.find(c => c.id === id);
    notify(runNow ? 'Campaign created. Agent is starting lead acquisition.' : 'Campaign saved.', runNow ? 'info' : 'success');

    setName('');
    setKeywords('');
    setIndustry('');
    setCountry('');
    setLimit(10);
    setMode('manual');
    setProvider('outscraper');
    setEnrichBeforeImport(false);
    setEnrichmentProvider('clay');

    if (runNow && campaign) await runCampaign(campaign);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            Lead Acquisition Agent
          </h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {!getProviderConfig(provider)?.apiKey && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-lg text-sm">
              Configure this data channel in Settings before running campaigns.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Campaign Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={suggestedName}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Mode</label>
                  <div className="grid grid-cols-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
                    {(['manual', 'agent'] as const).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setMode(option)}
                        className={cn(
                          'rounded-md px-3 py-1.5 text-sm font-bold capitalize transition-colors',
                          mode === option ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        )}
                      >
                        {option === 'manual' ? 'Manual' : 'Agent'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Lead Channel</label>
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value as LeadDataProvider)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    {providerOptions.filter(option => option.id !== 'clay').map(option => (
                      <option key={option.id} value={option.id}>{option.label} - {option.kind}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Enrichment</label>
                  <button
                    type="button"
                    onClick={() => setEnrichBeforeImport(!enrichBeforeImport)}
                    className={cn(
                      'w-full rounded-lg border px-4 py-2 text-left text-sm font-bold transition-colors',
                      enrichBeforeImport ? 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    )}
                  >
                    {enrichBeforeImport ? 'Enrich before import' : 'Import without enrichment'}
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Enrichment Channel</label>
                  <select
                    value={enrichmentProvider}
                    onChange={e => setEnrichmentProvider(e.target.value as LeadDataProvider)}
                    disabled={!enrichBeforeImport}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-cyan-500 disabled:opacity-50"
                  >
                    {providerOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Keywords</label>
                  <input
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                    placeholder="e.g. distributor, importer, wholesaler"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Industry</label>
                  <input
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="e.g. medical supplies"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Country</label>
                  <input
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="e.g. Germany"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Lead Count</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={limit}
                    onChange={e => setLimit(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleSave(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Save Campaign
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={!getProviderConfig(provider)?.enabled || !getProviderConfig(provider)?.apiKey || !canSave || !!runningId}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                  >
                    {runningId ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'agent' ? <Bot className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                    Create & Run
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-400 space-y-3">
              <div className="text-slate-200 font-bold">How it works</div>
              <p>Manual campaigns use your selected channel with the exact keywords, industry, country, and lead count.</p>
              <p>Agent campaigns refine the search query first, then import found businesses into the public pool by default.</p>
              <p>Optional enrichment runs before import when the selected enrichment channel is configured.</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Saved Campaigns</h3>
            {leadCampaigns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 py-10 text-center text-sm text-slate-500">
                No acquisition campaigns yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leadCampaigns.map(campaign => (
                  <div key={campaign.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                    <div className={cn(
                      'mt-1 h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                      campaign.mode === 'agent' ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-800 text-slate-300'
                    )}>
                      {campaign.mode === 'agent' ? <Bot className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-200 truncate">{campaign.name}</div>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{campaign.status}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {campaign.provider || 'outscraper'} / {campaign.keywords} / {campaign.industry} / {campaign.country} / {campaign.limit}
                      </div>
                      {campaign.query && (
                        <div className="text-xs text-slate-600 mt-1 truncate">Query: {campaign.query}</div>
                      )}
                      {campaign.importedCount !== undefined && (
                        <div className="text-xs text-cyan-400 mt-2 flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {campaign.importedCount} imported to public pool
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => runCampaign(campaign)}
                        disabled={!getProviderConfig(campaign.provider || 'outscraper')?.enabled || !getProviderConfig(campaign.provider || 'outscraper')?.apiKey || runningId === campaign.id}
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-cyan-600 hover:text-white disabled:opacity-50 transition-colors"
                        title="Run Campaign"
                      >
                        {runningId === campaign.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteLeadCampaign(campaign.id)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-rose-900 hover:text-white transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
