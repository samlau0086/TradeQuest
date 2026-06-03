import React, { useState, useEffect, useMemo } from 'react';
import { useStore, Quote, QuoteItem, QuoteFee } from '../store';
import { useTranslation } from '../lib/i18n';
import { X, Plus, Trash2, Search, ChevronDown } from 'lucide-react';
import { formatCurrency, normalizeCurrency } from '../lib/currency';

interface QuoteFormModalProps {
  onClose: () => void;
  quoteId?: string;
  initialData?: Partial<Quote>;
  onSave?: (id: string) => void;
}

function SearchSelect({
  label,
  value,
  options,
  placeholder,
  emptyLabel,
  onChange
}: {
  label: string;
  value: string;
  options: { id: string; label: string; sublabel?: string }[];
  placeholder: string;
  emptyLabel: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter(option => `${option.label} ${option.sublabel || ''}`.toLowerCase().includes(q)).slice(0, 8);
  }, [options, query]);

  return (
    <div className="space-y-1 relative">
      <label className="text-xs font-bold text-slate-400 uppercase">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-left text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 flex items-center justify-between gap-2"
      >
        <span className={selected ? 'truncate' : 'truncate text-slate-500'}>{selected?.label || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden">
          <div className="relative border-b border-slate-800">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent py-2 pl-9 pr-3 text-sm text-slate-200 outline-none"
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onChange('');
              setQuery('');
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-900"
          >
            {emptyLabel}
          </button>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setQuery('');
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-900"
              >
                <div className="truncate text-sm font-medium text-slate-200">{option.label}</div>
                {option.sublabel && <div className="truncate text-xs text-slate-500">{option.sublabel}</div>}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-3 text-center text-xs text-slate-500">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export function QuoteFormModal({ onClose, quoteId, initialData, onSave }: QuoteFormModalProps) {
  const { quotes, clients, deals, products, addQuote, updateQuote, language, paymentTerms: configuredPaymentTerms, notify, currencyRates, defaultQuoteCurrency } = useStore();
  const t = useTranslation(language);
  const existingQuote = quoteId ? quotes.find(q => q.id === quoteId) : null;

  const [quoteNumber, setQuoteNumber] = useState(existingQuote?.quoteNumber || initialData?.quoteNumber || '');
  const [clientId, setClientId] = useState(existingQuote?.clientId || initialData?.clientId || '');
  const [leadId, setLeadId] = useState(existingQuote?.leadId || initialData?.leadId || '');
  const [paymentTerms, setPaymentTerms] = useState(existingQuote?.paymentTerms || initialData?.paymentTerms || '');
  const [paymentTermId, setPaymentTermId] = useState(existingQuote?.paymentTermId || initialData?.paymentTermId || '');
  const [advanceRatio, setAdvanceRatio] = useState(existingQuote?.advanceRatio || initialData?.advanceRatio || 0);
  const [balanceRatio, setBalanceRatio] = useState(existingQuote?.balanceRatio || initialData?.balanceRatio || 0);
  const [status, setStatus] = useState(existingQuote?.status || initialData?.status || 'Draft');
  const [currency, setCurrency] = useState(normalizeCurrency(existingQuote?.currency || initialData?.currency || defaultQuoteCurrency || 'USD'));
  
  const [items, setItems] = useState<QuoteItem[]>(
    existingQuote?.items || initialData?.items || []
  );
  const [fees, setFees] = useState<QuoteFee[]>(
    existingQuote?.fees || initialData?.fees || []
  );

  const clientOptions = useMemo(() => clients.map(c => ({
    id: c.id,
    label: c.company || c.name,
    sublabel: [c.name !== (c.company || c.name) ? c.name : '', c.country].filter(Boolean).join(' · ')
  })), [clients]);
  const leadOptions = useMemo(() => deals.map(deal => {
    const client = clients.find(c => c.id === deal.clientId);
    return {
      id: deal.id,
      label: deal.name || `${client?.company || client?.name || 'Lead'} - ${deal.status}`,
      sublabel: [client?.company || client?.name, deal.status, deal.value ? formatCurrency(Number(deal.value), currency, currencyRates) : ''].filter(Boolean).join(' · ')
    };
  }), [clients, currency, currencyRates, deals]);

  const handleLeadChange = (nextLeadId: string) => {
    setLeadId(nextLeadId);
    const selectedLead = deals.find(deal => deal.id === nextLeadId);
    if (selectedLead?.clientId) setClientId(selectedLead.clientId);
  };

  useEffect(() => {
    if (!existingQuote && !quoteNumber) {
      // Fetch next quote number
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/quotes-next-number', { headers: { 'Authorization': `Bearer ${token}` }})
          .then(res => res.json())
          .then(data => {
            if (data.nextNumber) setQuoteNumber(data.nextNumber);
          });
      }
    }
  }, [existingQuote, quoteNumber]);

  const handleSubmit = async () => {
    if (!quoteNumber) {
      notify('Quote number is required.', 'warning');
      return;
    }

    const quoteData = {
      quoteNumber,
      clientId: clientId || null,
      leadId: leadId || null,
      currency,
      paymentTerms,
      paymentTermId,
      advanceRatio,
      balanceRatio,
      status,
      items,
      fees,
      comments: existingQuote?.comments || [],
    };

    if (existingQuote) {
      updateQuote(existingQuote.id, quoteData);
      onSave?.(existingQuote.id);
    } else {
      addQuote(quoteData);
      onSave?.('');
    }
    onClose();
  };

  const addItem = () => {
    setItems([...items, { productId: '', name: '', quantity: 1, unitPrice: 0, total: 0, notes: '' }]);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'unitPrice') {
      item.isManualPrice = true;
    }
    
    if (field === 'quantity' && item.productId && !item.isManualPrice) {
      const matchedProduct = products.find(p => p.id === item.productId);
      if (matchedProduct && matchedProduct.bulkPrices?.length) {
         const newQty = value as number;
         const applicableTiers = matchedProduct.bulkPrices.filter(bp => newQty >= bp.minQuantity);
         if (applicableTiers.length > 0) {
           applicableTiers.sort((a, b) => b.minQuantity - a.minQuantity);
           item.unitPrice = applicableTiers[0].price;
         }
      }
    }
    
    item.total = item.quantity * item.unitPrice;
    newItems[index] = item;
    setItems(newItems);
  };

  const handleProductSelect = (index: number, nameValue: string) => {
    const newItems = [...items];
    const item = { ...newItems[index], name: nameValue };
    
    const matchedProduct = products.find(p => p.name === nameValue);
    if (matchedProduct) {
      item.productId = matchedProduct.id;
      item.isManualPrice = false;
      item.description = matchedProduct.description;
      item.imageUrl = matchedProduct.imageUrl;
      let priceToSet = matchedProduct.bulkPrices?.[0]?.price || 0;
      if (item.quantity) {
        const applicableTiers = (matchedProduct.bulkPrices || []).filter(bp => item.quantity >= bp.minQuantity);
        if (applicableTiers.length > 0) {
          applicableTiers.sort((a, b) => b.minQuantity - a.minQuantity);
          priceToSet = applicableTiers[0].price;
        }
      }
      item.unitPrice = priceToSet;
    } else {
      item.productId = '';
    }
    
    item.total = item.quantity * item.unitPrice;
    newItems[index] = item;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const addFee = () => {
    setFees([...fees, { name: '', amount: 0 }]);
  };

  const updateFee = (index: number, field: keyof QuoteFee, value: any) => {
    const newFees = [...fees];
    newFees[index] = { ...newFees[index], [field]: value };
    setFees(newFees);
  };

  const removeFee = (index: number) => {
    const newFees = [...fees];
    newFees.splice(index, 1);
    setFees(newFees);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.total || (item.quantity * item.unitPrice) || 0), 0);
  const totalFees = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const totalAmount = subtotal + totalFees;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-lg font-bold text-white">
            {existingQuote ? t('editQuote') : t('newQuote')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('quoteNoReq')}</label>
              <input value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <SearchSelect
              label={language === 'zh' ? '关联 Lead' : 'Related Lead'}
              value={leadId}
              options={leadOptions}
              placeholder={language === 'zh' ? '搜索 Lead...' : 'Search leads...'}
              emptyLabel={language === 'zh' ? '不关联 Lead' : 'No related lead'}
              onChange={handleLeadChange}
            />
            <SearchSelect
              label={t('client')}
              value={clientId}
              options={clientOptions}
              placeholder={language === 'zh' ? '搜索客户...' : 'Search clients...'}
              emptyLabel={t('generalQuote')}
              onChange={(nextClientId) => {
                setClientId(nextClientId);
                if (!nextClientId) setLeadId('');
                const selectedLead = deals.find(deal => deal.id === leadId);
                if (selectedLead && selectedLead.clientId !== nextClientId) setLeadId('');
              }}
            />
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Currency</label>
              <select value={currency} onChange={e => setCurrency(normalizeCurrency(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                {Object.keys(currencyRates).sort().map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <div className="text-[10px] text-slate-500">Base prices are stored in USD.</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('paymentTerms')}</label>
              {configuredPaymentTerms.length > 0 && (
                <select 
                  value={paymentTermId} 
                  onChange={e => {
                    const termId = e.target.value;
                    setPaymentTermId(termId);
                    if (!termId) {
                      setPaymentTerms('');
                      setAdvanceRatio(0);
                      setBalanceRatio(0);
                      return;
                    }
                    const t = configuredPaymentTerms.find(p => p.id === termId);
                    if (t) {
                      setPaymentTerms(t.name + (t.description ? ` - ${t.description}` : ''));
                      setAdvanceRatio(Number(t.advanceRatio));
                      setBalanceRatio(Number(t.balanceRatio));
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">{t('customTerms')}</option>
                  {configuredPaymentTerms.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
              {(!configuredPaymentTerms.length || !paymentTermId) && (
                <input 
                  value={paymentTerms} 
                  onChange={e => setPaymentTerms(e.target.value)} 
                  type="text" 
                  className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${configuredPaymentTerms.length > 0 ? 'mt-2' : ''}`} 
                  placeholder="T/T 30%..." 
                />
              )}
              {paymentTermId && advanceRatio > 0 && (
                <div className="text-xs text-emerald-500 mt-1">
                  {t('advance')}: {advanceRatio}% | {t('balance')}: {balanceRatio}%
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-300">{t('lineItems')}</h3>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-medium">
                  <tr>
                    <th className="px-3 py-2">{t('productName')}</th>
                    <th className="px-3 py-2 w-24">{t('qty')}</th>
                    <th className="px-3 py-2 w-36">{t('unitPrice')} (USD)</th>
                    <th className="px-3 py-2 w-24">{t('total')}</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt="" className="w-10 h-10 object-cover rounded bg-slate-900 border border-slate-700" />
                          )}
                          <div className="flex-1 space-y-1">
                            <input 
                              list={`products-list-${idx}`}
                              value={item.name || ''} 
                              onChange={e => handleProductSelect(idx, e.target.value)} 
                              placeholder="Product Name" 
                              className="w-full bg-transparent border-none text-slate-200 focus:outline-none focus:ring-1 px-2 py-1 rounded" 
                            />
                            <datalist id={`products-list-${idx}`}>
                              {products.map(p => (
                                <option key={p.id} value={p.name} />
                              ))}
                            </datalist>
                            <input
                              value={item.description || ''}
                              onChange={e => updateItem(idx, 'description', e.target.value)}
                              placeholder="Item description"
                              className="w-full bg-transparent border-none text-slate-400 text-xs focus:outline-none focus:ring-1 px-2 py-1 rounded"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-full bg-transparent border-none text-slate-200 focus:outline-none focus:ring-1 px-2 py-1 rounded" />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center">
                          <span className="text-slate-500 mr-1">$</span>
                          <input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-none text-slate-200 focus:outline-none focus:ring-1 px-2 py-1 rounded" />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        <div>{formatCurrency(item.total || (item.quantity * item.unitPrice) || 0, currency, currencyRates)}</div>
                        {currency !== 'USD' && <div className="text-[10px] text-slate-500">${(item.total || (item.quantity * item.unitPrice) || 0).toFixed(2)}</div>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeItem(idx)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4 mx-auto" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300">
              <Plus className="w-3 h-3" /> {t('addItem')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300">{t('additionalFees')}</h3>
              {fees.map((fee, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input value={fee.name} onChange={e => updateFee(idx, 'name', e.target.value)} placeholder={t('shippingFob')} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none" />
                  <div className="w-32 bg-slate-950 border border-slate-700 rounded-lg flex items-center px-3">
                    <span className="text-slate-500 mr-1">$</span>
                    <input type="number" step="0.01" value={fee.amount} onChange={e => updateFee(idx, 'amount', parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-none py-2 text-sm text-slate-200 focus:outline-none" />
                  </div>
                  <button onClick={() => removeFee(idx)} className="p-2 bg-rose-950 text-rose-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={addFee} className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300">
                <Plus className="w-3 h-3" /> {t('addFee')}
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-end space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>{t('subtotal')}</span>
                <span>{formatCurrency(subtotal, currency, currencyRates)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400 border-b border-slate-800 pb-2">
                <span>{t('feesAndAdjustments')}</span>
                <span>{formatCurrency(totalFees, currency, currencyRates)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-white pt-2">
                <span>{t('total')}</span>
                <span>{formatCurrency(totalAmount, currency, currencyRates)}</span>
              </div>
              {currency !== 'USD' && (
                <div className="text-right text-[11px] text-slate-500">
                  USD base total: ${totalAmount.toFixed(2)} · 1 USD = {currencyRates[currency]} {currency}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40"
          >
            {existingQuote ? t('saveChanges') : t('createQuote')}
          </button>
        </div>
      </div>
    </div>
  );
}
