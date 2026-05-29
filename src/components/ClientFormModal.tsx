import React, { useState, useEffect } from 'react';
import { useStore, Client, ClientStatus, ContactMethod, ClientContact } from '../store';
import { X, Plus, Trash2, ChevronDown, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Côte d'Ivoire", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
].sort();

interface ClientFormModalProps {
  onClose: () => void;
  clientId?: string; // If provided, we are editing
  initialData?: Partial<Client>;
  onSave?: (id: string) => void;
  isPublicPool?: boolean;
}

export function ClientFormModal({ onClose, clientId, initialData, onSave, isPublicPool }: ClientFormModalProps) {
  const { clients, addClient, editClient, importPublicLeads, language } = useStore();
  const t = useTranslation(language);
  const existingClient = clientId ? clients.find(c => c.id === clientId) : null;

  const [name, setName] = useState(existingClient?.name || initialData?.name || '');
  const [company, setCompany] = useState(existingClient?.company || initialData?.company || '');
  const [address, setAddress] = useState(existingClient?.address || initialData?.address || '');
  const [state, setState] = useState(existingClient?.state || initialData?.state || '');
  const [city, setCity] = useState(existingClient?.city || initialData?.city || '');
  const [country, setCountry] = useState(existingClient?.country || initialData?.country || '');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const [status, setStatus] = useState<ClientStatus>(existingClient?.status || initialData?.status || 'Leads');
  const [tags, setTags] = useState<string>(existingClient?.tags.join(', ') || initialData?.tags?.join(', ') || '');
  const [preferredLanguage, setPreferredLanguage] = useState(existingClient?.preferredLanguage || initialData?.preferredLanguage || '');
  const [preferredTimeRange, setPreferredTimeRange] = useState(existingClient?.preferredTimeRange || initialData?.preferredTimeRange || '');
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>(existingClient?.contactMethods || initialData?.contactMethods || [{ type: 'email', value: '' }]);
  const buildInitialContacts = (): ClientContact[] => {
    const sourceContacts = existingClient?.contacts || initialData?.contacts || [];
    if (sourceContacts.length > 0) {
      return sourceContacts.map((contact, index) => ({
        ...contact,
        id: contact.id || `contact_${Date.now()}_${index}`,
        isPrimary: contact.id === (existingClient?.primaryContactId || initialData?.primaryContactId) || contact.isPrimary || index === 0,
        contactMethods: contact.contactMethods?.length ? contact.contactMethods : []
      }));
    }
    return [{
      id: existingClient?.primaryContactId || initialData?.primaryContactId || `contact_${Date.now()}`,
      name: existingClient?.name || initialData?.name || '',
      title: '',
      isPrimary: true,
      contactMethods: existingClient?.contactMethods || initialData?.contactMethods || [{ type: 'email', value: '' }]
    }];
  };
  const [contacts, setContacts] = useState<ClientContact[]>(buildInitialContacts);

  const [isApplyMode, setIsApplyMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'preferences' | 'contacts'>('basic');

  useEffect(() => {
    setContacts(prev => {
      const next = prev.length ? [...prev] : [{ id: `contact_${Date.now()}`, name, isPrimary: true, contactMethods: [] }];
      const primaryIndex = Math.max(0, next.findIndex(contact => contact.isPrimary));
      next[primaryIndex] = { ...next[primaryIndex], name, isPrimary: true };
      return next.map((contact, index) => ({ ...contact, isPrimary: index === primaryIndex }));
    });
  }, [name]);

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setIsCountryOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    const normalizedContacts = contacts.map((contact, index) => ({
      ...contact,
      id: contact.id || `contact_${Date.now()}_${index}`,
      name: (contact.isPrimary ? name : contact.name).trim(),
      isPrimary: !!contact.isPrimary,
      contactMethods: (contact.contactMethods || []).filter(cm => cm.value.trim() !== '')
    })).filter(contact => contact.name || contact.contactMethods.length > 0);
    const primaryContact = normalizedContacts.find(contact => contact.isPrimary) || normalizedContacts[0];
    const contactsWithPrimary = normalizedContacts.map(contact => ({ ...contact, isPrimary: contact.id === primaryContact?.id }));
    const validContactMethods = primaryContact?.contactMethods || contactMethods.filter(cm => cm.value.trim() !== '');

    const clientData = {
      name,
      company,
      address,
      state,
      city,
      country,
      status: isPublicPool ? 'Leads' : status,
      tags: parsedTags,
      preferredLanguage,
      preferredTimeRange: preferredTimeRange || '09:00 - 17:00',
      lastContact: existingClient?.lastContact || new Date().toISOString().split('T')[0],
      isDormant: existingClient?.isDormant || false,
      contactMethods: validContactMethods,
      contacts: contactsWithPrimary,
      primaryContactId: primaryContact?.id,
    };

    if (existingClient) {
      if (isApplyMode) {
        useStore.getState().submitClientEditRequest(existingClient.id, clientData);
      } else {
        editClient(existingClient.id, clientData);
      }
      onSave?.(existingClient.id);
    } else {
      if (isPublicPool) {
        await importPublicLeads([clientData]);
        onSave?.('');
      } else {
        const newId = await addClient(clientData);
        if (newId) {
          onSave?.(newId);
        }
      }
    }
    onClose();
  };

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

  const isLocked = (val: string | undefined) => !!existingClient && !!val && !isApplyMode;
  const isMethodLocked = (index: number) => !!existingClient && index < (existingClient.contactMethods?.length || 0) && !isApplyMode;

  const addContact = () => {
    setContacts(prev => [...prev, { id: `contact_${Date.now()}`, name: '', title: '', contactMethods: [{ type: 'email', value: '' }] }]);
  };

  const updateContact = (contactId: string, updates: Partial<ClientContact>) => {
    setContacts(prev => prev.map(contact => contact.id === contactId ? { ...contact, ...updates } : contact));
  };

  const removeContact = (contactId: string) => {
    setContacts(prev => prev.filter(contact => contact.id !== contactId || contact.isPrimary));
  };

  const addContactMethodToContact = (contactId: string) => {
    setContacts(prev => prev.map(contact => contact.id === contactId ? { ...contact, contactMethods: [...(contact.contactMethods || []), { type: 'email', value: '' }] } : contact));
  };

  const updateContactMethodInContact = (contactId: string, methodIndex: number, field: keyof ContactMethod, value: string) => {
    setContacts(prev => prev.map(contact => {
      if (contact.id !== contactId) return contact;
      const nextMethods = [...(contact.contactMethods || [])];
      nextMethods[methodIndex] = { ...nextMethods[methodIndex], [field]: value };
      return { ...contact, contactMethods: nextMethods };
    }));
  };

  const removeContactMethodFromContact = (contactId: string, methodIndex: number) => {
    setContacts(prev => prev.map(contact => contact.id === contactId ? { ...contact, contactMethods: (contact.contactMethods || []).filter((_, index) => index !== methodIndex) } : contact));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/30">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">{existingClient ? t('editClientTitle') : t('newClientTarget')}</h2>
            {existingClient?.pendingEditRequest && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">Pending Review</span>
            )}
            {existingClient && !isApplyMode && !existingClient?.pendingEditRequest && (
              <button type="button" onClick={() => setIsApplyMode(true)} className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold text-cyan-400 border border-cyan-400/50 rounded hover:bg-cyan-950 transition-colors">
                Apply Edit
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex max-h-[76vh] flex-col">
          <div className="border-b border-slate-800 bg-slate-950/30 px-4 py-3">
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'preferences', label: 'Preferences' },
                { id: 'contacts', label: 'Contacts' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                    activeTab === tab.id ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
          {isApplyMode && (
             <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-xs text-yellow-500 font-medium">
               You are applying for modifications. Your changes will need superadmin approval before taking effect.
             </div>
          )}
          {activeTab === 'basic' && (
            <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t('name')} {isLocked(existingClient?.name) && <span className="text-[10px] text-slate-500 ml-1">(Locked)</span>}</label>
            <input required disabled={isLocked(existingClient?.name)} value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" placeholder="e.g. John Doe" />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t('company')} {isLocked(existingClient?.company) && <span className="text-[10px] text-slate-500 ml-1">(Locked)</span>}</label>
            <input required disabled={isLocked(existingClient?.company)} value={company} onChange={e => setCompany(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" placeholder="e.g. Global Tech LLC" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Address {isLocked(existingClient?.address) && <span className="text-[10px] text-slate-500 ml-1">(Locked)</span>}</label>
            <textarea disabled={isLocked(existingClient?.address)} value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 resize-none min-h-[60px]" placeholder="e.g. 123 Business St, Building 4" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">City {isLocked(existingClient?.city) && <span className="text-[10px] text-slate-500 ml-1">(Locked)</span>}</label>
              <input disabled={isLocked(existingClient?.city)} value={city} onChange={e => setCity(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" placeholder="e.g. Shenzhen" />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">State/Province {isLocked(existingClient?.state) && <span className="text-[10px] text-slate-500 ml-1">(Locked)</span>}</label>
              <input disabled={isLocked(existingClient?.state)} value={state} onChange={e => setState(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" placeholder="e.g. Guangdong" />
            </div>
          </div>

          <div className={`grid ${isPublicPool ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <div className="space-y-1 relative" onClick={e => e.stopPropagation()}>
              <label className="text-xs font-bold text-slate-400 uppercase">{t('country')} {isLocked(existingClient?.country) && <span className="text-[10px] text-slate-500 ml-1">(Locked)</span>}</label>
              <div 
                className={`w-full bg-slate-950 border ${isCountryOpen ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-sm text-slate-200 flex items-center justify-between ${isLocked(existingClient?.country) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => {
                  if (isLocked(existingClient?.country)) return;
                  if (!isCountryOpen) {
                    setCountrySearch('');
                  }
                  setIsCountryOpen(!isCountryOpen);
                }}
              >
                <input 
                  disabled={isLocked(existingClient?.country)}
                  type="text"
                  className="bg-transparent border-none outline-none w-full cursor-pointer placeholder-slate-500 disabled:cursor-not-allowed"
                  value={isCountryOpen ? countrySearch : country}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    if (!isCountryOpen) setIsCountryOpen(true);
                  }}
                  placeholder={isCountryOpen ? t('searchCountry') : t('selectCountry')}
                  required={!country}
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
                      {t('useCustom')}"{countrySearch}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
          {!isPublicPool && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('stage')}</label>
              <select value={status} onChange={e => setStatus(e.target.value as ClientStatus)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                <option value="Leads">{t('status.lead')}</option>
                <option value="Contacted">{t('status.contacted')}</option>
                <option value="Sample Sent">{t('status.sample')}</option>
                <option value="Negotiating">{t('status.negotiating')}</option>
                <option value="Closed Won">{t('status.closed')}</option>
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('tagsLabel')}</label>
              <input value={tags} onChange={e => setTags(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="#HighValue, #CantonFair" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Preferred Language {isLocked(existingClient?.preferredLanguage) && <span className="text-[10px] text-slate-500 ml-1">(Locked)</span>}</label>
              <input disabled={isLocked(existingClient?.preferredLanguage)} value={preferredLanguage} onChange={e => setPreferredLanguage(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" placeholder="e.g. Spanish" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Pref. Comm. Time {isLocked(existingClient?.preferredTimeRange) && <span className="text-[10px] text-slate-500 ml-1">(Locked)</span>}</label>
              <div className="flex items-center gap-2 relative">
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input disabled={isLocked(existingClient?.preferredTimeRange)} value={preferredTimeRange.split('-')[0]?.trim() || '09:00'} onChange={e => {
                    const end = preferredTimeRange.split('-')[1]?.trim() || '17:00';
                    setPreferredTimeRange(`${e.target.value || '09:00'} - ${end}`);
                  }} type="time" className="w-[120px] bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" />
                </div>
                <span className="text-slate-500">-</span>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input disabled={isLocked(existingClient?.preferredTimeRange)} value={preferredTimeRange.split('-')[1]?.trim() || '17:00'} onChange={e => {
                    const start = preferredTimeRange.split('-')[0]?.trim() || '09:00';
                    setPreferredTimeRange(`${start} - ${e.target.value || '17:00'}`);
                  }} type="time" className="w-[120px] bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" />
                </div>
              </div>
            </div>
          </div>
            </div>
          )}

          {activeTab === 'contacts' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase">Contacts</label>
              <button type="button" onClick={addContact} className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium py-1">
                <Plus className="w-3 h-3" /> Add Contact
              </button>
            </div>
            <p className="text-[11px] text-slate-500">The client name is linked to the key contact. Each contact can have multiple contact methods.</p>
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input
                    disabled={contact.isPrimary || (!isApplyMode && !!existingClient)}
                    value={contact.isPrimary ? name : contact.name}
                    onChange={e => updateContact(contact.id, { name: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                    placeholder="Contact name"
                  />
                  <input
                    disabled={!isApplyMode && !!existingClient}
                    value={contact.title || ''}
                    onChange={e => updateContact(contact.id, { title: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                    placeholder="Title / role"
                  />
                  <div className="flex items-center gap-2">
                    {contact.isPrimary && <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">Key</span>}
                    {!contact.isPrimary && (!existingClient || isApplyMode) && (
                      <button type="button" onClick={() => removeContact(contact.id)} className="p-2 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {(contact.contactMethods || []).map((cm, idx) => (
                    <div key={`${contact.id}_${idx}`} className="flex items-center gap-2">
                      <select
                        disabled={!isApplyMode && !!existingClient}
                        value={cm.type}
                        onChange={e => updateContactMethodInContact(contact.id, idx, 'type', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="messenger">Messenger</option>
                        <option value="telegram">Telegram</option>
                        <option value="phone">Phone</option>
                        <option value="wechat">WeChat</option>
                      </select>
                      <input
                        disabled={!isApplyMode && !!existingClient}
                        value={cm.value}
                        onChange={e => updateContactMethodInContact(contact.id, idx, 'value', e.target.value)}
                        type="text"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                        placeholder="Value..."
                      />
                      {(!existingClient || isApplyMode) && (
                        <button type="button" onClick={() => removeContactMethodFromContact(contact.id, idx)} className="p-2 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!existingClient || isApplyMode) && (
                    <button type="button" onClick={() => addContactMethodToContact(contact.id)} className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium py-1">
                      <Plus className="w-3 h-3" /> {t('addContactMethod')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
          </div>
          
          <div className="border-t border-slate-800 bg-slate-900 px-4 py-3 flex justify-between gap-3">
            <div className="text-xs text-slate-500 self-center">
              {activeTab === 'basic' ? 'Company and location' : activeTab === 'preferences' ? 'Stage, tags, and communication preferences' : 'People and contact methods'}
            </div>
            <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">{t('cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-bold bg-cyan-600 text-white hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-600/20 transition-colors">
              {existingClient ? t('saveChanges') : t('createTarget')}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
