import React, { useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { X, Search, MapPin, Loader2, Database, Sparkles } from 'lucide-react';
import { useAuthStore } from '../authStore';

export function OutscraperSearchModal({ onClose }: { onClose: () => void }) {
  const { outscraperApiKey, importPublicLeads, language } = useStore();
  const t = useTranslation(language);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const { token } = useAuthStore();
  const { llmMappings, activeLLMId, llmConfigs } = useStore();

  const handleAITranslate = async () => {
    if (!query) return;
    setLoadingAI(true);
    try {
      const translateLlmId = llmMappings['outscraperTranslate'] || activeLLMId;
      const llmConfig = translateLlmId ? llmConfigs.find(c => c.id === translateLlmId) : undefined;

      const response = await fetch('/api/outscraper/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, llmConfig })
      });

      if (!response.ok) throw new Error('API Request Failed');
      const data = await response.json();
      if (data.result) {
        setQuery(data.result);
      }
    } catch (e) {
      console.error(e);
      // Fallback: continue without strictly failing UI
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSearch = async () => {
    if (!outscraperApiKey) {
      setError('Please set your Outscraper API key in Settings > Integrations');
      return;
    }
    if (!query) {
      setError('Please enter a search query');
      return;
    }
    setError('');
    setLoading(true);
    setResults([]);
    setImported(false);

    try {
      const response = await fetch('/api/outscraper/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query,
          limit,
          apiKey: outscraperApiKey
        })
      });

      if (!response.ok) {
        throw new Error('API Request Failed');
      }

      const data = await response.json();
      if (data.data && data.data.length > 0 && data.data[0]) {
        setResults(data.data[0]);
      } else {
        setResults([]);
        setError('No results found for this query');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data from Outscraper');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (results.length === 0) return;
    
    setLoading(true);
    try {
      const leads: any[] = [];
      for (const row of results) {
         if (row.name) {
           const contactMethods = [];
           const addMethod = (type: string, value: any) => {
             const normalized = String(value || '').trim();
             if (normalized && !contactMethods.some((method: any) => method.type === type && method.value === normalized)) {
               contactMethods.push({ type, value: normalized });
             }
           };
           for (const method of row.contactMethods || []) addMethod(method.type, method.value);
           if (row.emails) {
             const emails = Array.isArray(row.emails) ? row.emails : row.emails.split(',');
             emails.forEach((email: any) => addMethod('email', email));
           }
           if (row.phones) {
             const phones = Array.isArray(row.phones) ? row.phones : row.phones.split(',');
             phones.forEach((phone: any) => addMethod('phone', phone));
           }
           [row.email, row.email_address, row.email_1, row.email_2, row.email_3].filter(Boolean).forEach(email => addMethod('email', email));
           [row.phone, row.phone_number, row.phone_1, row.phone_2, row.phone_3, row.mobile].filter(Boolean).forEach(phone => addMethod('phone', phone));
           [row.site, row.website, row.domain, row.url, row.business_url].filter(Boolean).forEach(site => addMethod('website', site));
           leads.push({
             name: row.name,
             company: row.company || row.companyName || row.organization_name || row.business_name || row.name,
             address: row.address || row.full_address || row.formatted_address || '',
             city: row.city || row.municipality || '',
             state: row.state || row.region || row.province || '',
             country: row.country || 'Unknown',
             tags: Array.from(new Set([...(row.tags || []), row.type, row.category, 'Outscraper'].filter(Boolean))),
             contactMethods: contactMethods.length > 0 ? contactMethods : undefined,
             comments: row.comments || []
           });
         }
      }
      
      if (leads.length > 0) {
        await importPublicLeads(leads);
        setImported(true);
      }
    } catch (e) {
      setError('Failed to import leads');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            Outscraper Maps Search
          </h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {!outscraperApiKey && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg text-sm">
              You need to configure your Outscraper API Key in Settings to use this feature.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Search Query</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g. plumbers in London"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-10 py-2 text-slate-200 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAITranslate}
                  disabled={loadingAI || !query}
                  title={t('outscraperTranslate') || "Translate to Target Region Language"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded-md transition-colors disabled:text-slate-600 disabled:hover:bg-transparent"
                >
                  {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Limit</label>
              <input 
                type="number" 
                value={limit}
                onChange={e => setLimit(parseInt(e.target.value) || 1)}
                min="1"
                max="50"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSearch}
              disabled={loading || !outscraperApiKey || imported}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              {loading && !results.length ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
            {error && <span className="text-sm text-rose-400">{error}</span>}
          </div>

          {results.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-300">Found {results.length} businesses</h3>
                <button
                  onClick={handleImport}
                  disabled={loading || imported}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800/50 disabled:text-cyan-300/50 text-white rounded-lg font-bold transition-colors flex items-center gap-2 text-sm"
                >
                  {loading && results.length ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {imported ? 'Imported successfully' : `Import to Public Pool`}
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto p-4 space-y-3">
                  {results.slice(0, 10).map((r: any, i: number) => (
                    <div key={i} className="flex flex-col gap-1 text-sm border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                      <div className="font-bold text-slate-200">{r.name}</div>
                      <div className="text-slate-400 text-xs">{r.full_address || r.city}</div>
                      {((r.emails || r.phones) && (
                        <div className="text-slate-500 text-xs truncate">
                          {r.emails && String(r.emails)} {r.phones && String(r.phones)}
                        </div>
                      ))}
                    </div>
                  ))}
                  {results.length > 10 && (
                    <div className="text-center text-xs text-slate-500 pt-2 font-medium">
                      + {results.length - 10} more items
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
