import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { FileText, Plus, Search, Download, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils'; // if needed
import { QuoteFormModal } from './QuoteFormModal';
import { generateQuotePDF } from '../lib/pdf';
import { formatCurrency } from '../lib/currency';

interface QuotesListProps {
  embedded?: boolean;
}

export function QuotesList({ embedded = false }: QuotesListProps) {
  const { quotes, clients, products, deleteQuote, language, currencyRates } = useStore();
  const t = useTranslation(language);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editQuoteId, setEditQuoteId] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredQuotes = quotes.filter(q => 
    q.quoteNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (id: string) => {
    setEditQuoteId(id);
    setShowModal(true);
  };

  useEffect(() => {
    const quoteId = localStorage.getItem('tradequest:openQuoteId');
    if (quoteId && quotes.some(quote => quote.id === quoteId)) {
      localStorage.removeItem('tradequest:openQuoteId');
      handleEdit(quoteId);
    }
  }, [quotes]);

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteQuote(deleteId);
      setDeleteId(null);
    }
  };

  const handleDownload = async (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    const client = clients.find(c => c.id === quote.clientId);
    await generateQuotePDF(quote, client, products);
  };

  return (
    <div className={embedded ? "space-y-6" : "flex-1 bg-slate-900 overflow-y-auto p-6"}>
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('quotesList')}</h1>
              <p className="text-sm text-slate-400">{filteredQuotes.length} {t('quoteCount')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={t('searchQuotes')} 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button 
              onClick={() => { setEditQuoteId(undefined); setShowModal(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('newQuote')}
            </button>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">{t('quoteNo')}</th>
                <th className="px-4 py-3 font-medium">{t('date')}</th>
                <th className="px-4 py-3 font-medium">{t('client')}</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">{t('stage')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredQuotes.map(quote => {
                const client = clients.find(c => c.id === quote.clientId);
                const subtotal = quote.items.reduce((sum, item) => sum + (item.total || item.quantity * item.unitPrice || 0), 0);
                const fees = quote.fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
                return (
                  <tr key={quote.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-200">
                      {quote.quoteNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-200">{formatCurrency(subtotal + fees, quote.currency || 'USD', currencyRates)}</div>
                      <div className="text-[10px] text-slate-500">{quote.currency || 'USD'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {quote.createdAt ? format(new Date(quote.createdAt), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {client ? (
                        <div>
                          <div className="font-medium text-slate-200">{client.name}</div>
                          {client.company && <div className="text-xs text-slate-400">{client.company}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">{t('generalNoClient')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 pl-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max",
                        quote.status === 'Draft' ? "bg-slate-800 text-slate-400" :
                        quote.status === 'Sent' ? "bg-indigo-950 text-indigo-400" :
                        quote.status === 'Accepted' ? "bg-emerald-950 text-emerald-400" :
                        "bg-rose-950 text-rose-400"
                      )}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(quote.id)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title={t('viewEdit')}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownload(quote.id)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title={t('downloadPdf')}>
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(quote.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded transition-colors" title={t('deleteClientButton')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-400 mb-1">{t('noQuotes')}</h3>
                    <p className="text-slate-500">{t('createFirstQuote')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <QuoteFormModal 
          onClose={() => setShowModal(false)}
          quoteId={editQuoteId}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">{t('deleteQuoteTitle')}</h3>
            <p className="text-slate-400 mb-6 text-sm">{t('deleteQuoteContent')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">{t('cancel')}</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow font-medium transition-colors">{t('deleteClientButton')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
