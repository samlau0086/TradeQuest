import React, { useEffect, useState } from 'react';
import { useStore, Deal, ClientStatus, ContactMethod } from '../store';
import { X, Trash2, Plus, ChevronDown, Package, Search } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { COUNTRIES } from './ClientFormModal';

interface DealFormModalProps {
  onClose: () => void;
  dealId?: string;
  initialData?: Partial<Deal>;
}

export function DealFormModal({ onClose, dealId, initialData }: DealFormModalProps) {
  const { clients, deals, products, fetchProducts, addDeal, updateDeal, deleteDeal, language } = useStore();
  const t = useTranslation(language);
  const existingDeal = dealId ? deals.find(d => d.id === dealId) : null;

  const [clientId, setClientId] = useState(existingDeal?.clientId || initialData?.clientId || '');
  const [name, setName] = useState(existingDeal?.name || initialData?.name || '');
  const [value, setValue] = useState(existingDeal?.value?.toString() || initialData?.value?.toString() || '');
  const [status, setStatus] = useState<ClientStatus>(existingDeal?.status || initialData?.status || 'Leads');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(existingDeal?.productIds || initialData?.productIds || []);
  const [productSearch, setProductSearch] = useState('');
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  
  // Contact Info states
  const [contactName, setContactName] = useState(existingDeal?.contactInfo?.name || initialData?.contactInfo?.name || '');
  const [company, setCompany] = useState(existingDeal?.contactInfo?.company || initialData?.contactInfo?.company || '');
  const [country, setCountry] = useState(existingDeal?.contactInfo?.country || initialData?.contactInfo?.country || '');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>(existingDeal?.contactInfo?.contactMethods || initialData?.contactInfo?.contactMethods || [{ type: 'email', value: '' }]);

  const [linkExisting, setLinkExisting] = useState<boolean>(
    !!existingDeal?.clientId || !!initialData?.clientId || (!initialData?.contactInfo && clients.length > 0 && !existingDeal)
  );
  const selectedProducts = products.filter(product => selectedProductIds.includes(product.id));
  const productSearchTerm = productSearch.trim().toLowerCase();
  const filteredProducts = products
    .filter(product => !selectedProductIds.includes(product.id))
    .filter(product => {
      if (!productSearchTerm) return true;
      return [product.name, product.sku, product.description, product.salesPoints]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(productSearchTerm));
    })
    .slice(0, 8);

  useEffect(() => {
    if (products.length === 0) fetchProducts();
  }, [products.length, fetchProducts]);

  useEffect(() => {
    const handleClick = () => {
      setIsCountryOpen(false);
      setIsProductSearchOpen(false);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const addContactMethod = () => {
    setContactMethods([...contactMethods, { type: 'email', value: '' }]);
  };

  const updateContactMethod = (index: number, field: keyof ContactMethod, value: string) => {
    const newMethods = [...contactMethods];
    newMethods[index] = { ...newMethods[index], [field]: value };
    setContactMethods(newMethods);
  };

  const removeContactMethod = (index: number) => {
    setContactMethods(contactMethods.filter((_, i) => i !== index));
  };

  const addProduct = (productId: string) => {
    setSelectedProductIds(prev => prev.includes(productId) ? prev : [...prev, productId]);
    setProductSearch('');
    setIsProductSearchOpen(false);
  };

  const removeProduct = (productId: string) => {
    setSelectedProductIds(prev => prev.filter(id => id !== productId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dealData: any = {
      clientId: linkExisting ? clientId : null,
      name,
      value: parseFloat(value) || 0,
      status,
      productIds: selectedProductIds,
    };

    if (!linkExisting) {
      const validContactMethods = contactMethods.filter(cm => cm.value.trim() !== '');
      dealData.contactInfo = {
        name: contactName,
        company,
        country,
        tags: [],
        contactMethods: validContactMethods
      };
    }

    if (existingDeal) {
      updateDeal(existingDeal.id, dealData);
    } else {
      addDeal(dealData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/30">
          <h2 className="text-lg font-bold text-white">{existingDeal ? 'Edit Deal' : 'New Deal (Lead)'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Deal Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="e.g. Q3 Software License" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={linkExisting} onChange={() => setLinkExisting(true)} className="form-radio text-cyan-500 bg-slate-900 border-slate-700" />
                Link Existing Contact
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!linkExisting} onChange={() => setLinkExisting(false)} className="form-radio text-cyan-500 bg-slate-900 border-slate-700" />
                New Contact Information
              </label>
            </div>
            
            {linkExisting ? (
              clients.length === 0 ? (
                <div className="text-sm text-red-400 p-2 bg-red-400/10 rounded border border-red-400/20">
                  You have no contacts in your list. Create a new contact information below.
                </div>
              ) : (
                <select required value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                  <option value="" disabled>Select a contact</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                  ))}
                </select>
              )
            ) : (
              <div className="space-y-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Contact Name</label>
                    <input required={!linkExisting} value={contactName} onChange={e => setContactName(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Contact Name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Company</label>
                    <input value={company} onChange={e => setCompany(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Company" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1 relative" onClick={e => e.stopPropagation()}>
                    <label className="text-xs font-bold text-slate-400 uppercase">Country</label>
                    <div 
                      className={`w-full bg-slate-950 border ${isCountryOpen ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-sm text-slate-200 flex items-center justify-between cursor-pointer`}
                      onClick={() => {
                        if (!isCountryOpen) setCountrySearch('');
                        setIsCountryOpen(!isCountryOpen);
                      }}
                    >
                      <input 
                        type="text"
                        className="bg-transparent border-none outline-none w-full cursor-pointer placeholder-slate-500"
                        value={isCountryOpen ? countrySearch : country}
                        onChange={(e) => {
                          setCountrySearch(e.target.value);
                          if (!isCountryOpen) setIsCountryOpen(true);
                        }}
                        placeholder={isCountryOpen ? t('searchCountry') || 'Search Country...' : t('selectCountry') || 'Select a country...'}
                      />
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    </div>
                    {isCountryOpen && (
                      <div className="absolute top-[105%] left-0 w-full max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                        {COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                          <button 
                            key={c}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 text-slate-200"
                            onClick={() => {
                              setCountry(c);
                              setIsCountryOpen(false);
                            }}
                          >
                            {c}
                          </button>
                        ))}
                        {countrySearch && !COUNTRIES.some(c => c.toLowerCase() === countrySearch.toLowerCase()) && (
                          <button 
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-cyan-900/40 text-cyan-400 border-t border-slate-700/50 mt-1"
                            onClick={() => {
                              setCountry(countrySearch);
                              setIsCountryOpen(false);
                            }}
                          >
                            Use "{countrySearch}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">{t('contactMethods') || 'Contact Methods'}</label>
                    {contactMethods.map((cm, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select value={cm.type} onChange={e => updateContactMethod(idx, 'type', e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                          <option value="email">Email</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="messenger">Messenger</option>
                          <option value="telegram">Telegram</option>
                          <option value="phone">Phone</option>
                          <option value="wechat">WeChat</option>
                          <option value="website">Website</option>
                        </select>
                        <input value={cm.value} onChange={e => updateContactMethod(idx, 'value', e.target.value)} type="text" className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" placeholder="Value..." />
                        <button type="button" onClick={() => removeContactMethod(idx)} className="p-2 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addContactMethod} className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium py-1">
                      <Plus className="w-3 h-3" /> {t('addContactMethod')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Deal Value ($)</label>
            <input value={value} onChange={e => setValue(e.target.value)} type="number" step="0.01" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="e.g. 5000" />
          </div>

          <div className="space-y-1 relative" onClick={e => e.stopPropagation()}>
            <label className="text-xs font-bold text-slate-400 uppercase">{language === 'zh' ? '关联产品' : 'Related Products'}</label>
            <div className="min-h-[42px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500">
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedProducts.map(product => (
                  <span key={product.id} className="inline-flex max-w-full items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-200">
                    <Package className="h-3 w-3 shrink-0" />
                    <span className="truncate">{product.name}</span>
                    <button type="button" onClick={() => removeProduct(product.id)} className="text-cyan-300 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <div className="relative min-w-[160px] flex-1">
                  <Search className="pointer-events-none absolute left-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    value={productSearch}
                    onChange={e => {
                      setProductSearch(e.target.value);
                      setIsProductSearchOpen(true);
                    }}
                    onFocus={() => setIsProductSearchOpen(true)}
                    className="w-full bg-transparent py-1 pl-6 pr-2 text-sm text-slate-200 outline-none placeholder-slate-500"
                    placeholder={selectedProductIds.length ? (language === 'zh' ? '继续搜索产品...' : 'Search more products...') : (language === 'zh' ? '搜索并选择多个产品...' : 'Search and select products...')}
                  />
                </div>
              </div>
            </div>
            {isProductSearchOpen && (
              <div className="absolute z-[70] mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-2xl">
                {filteredProducts.length > 0 ? filteredProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product.id)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-700"
                  >
                    <Package className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-100">{product.name}</span>
                      <span className="block truncate text-xs text-slate-400">{product.sku || product.salesPoints || product.description || 'No SKU'}</span>
                    </span>
                  </button>
                )) : (
                  <div className="px-3 py-2 text-xs text-slate-500">{language === 'zh' ? '没有匹配的产品' : 'No matching products'}</div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Stage</label>
            <select value={status} onChange={e => setStatus(e.target.value as ClientStatus)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
              <option value="Leads">Leads</option>
              <option value="Contacted">Contacted</option>
              <option value="Sample Sent">Sample Sent</option>
              <option value="Negotiating">Negotiating</option>
              <option value="Closed Won">Closed Won</option>
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            {existingDeal && (
              <button 
                type="button" 
                onClick={() => {
                  deleteDeal(existingDeal.id);
                  onClose();
                }} 
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg text-sm font-medium transition-colors border border-rose-600/30"
              >
                Delete Deal
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={linkExisting && clients.length === 0} className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
              {existingDeal ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
