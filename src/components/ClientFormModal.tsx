import React, { useState, useEffect } from 'react';
import { useStore, Client, ClientStatus, ContactMethod } from '../store';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
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
  const [country, setCountry] = useState(existingClient?.country || initialData?.country || '');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const [status, setStatus] = useState<ClientStatus>(existingClient?.status || initialData?.status || 'Leads');
  const [tags, setTags] = useState<string>(existingClient?.tags.join(', ') || initialData?.tags?.join(', ') || '');
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>(existingClient?.contactMethods || initialData?.contactMethods || [{ type: 'email', value: '' }]);

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setIsCountryOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    const validContactMethods = contactMethods.filter(cm => cm.value.trim() !== '');

    const clientData = {
      name,
      company,
      country,
      status: isPublicPool ? 'Leads' : status,
      tags: parsedTags,
      lastContact: existingClient?.lastContact || new Date().toISOString().split('T')[0],
      isDormant: existingClient?.isDormant || false,
      contactMethods: validContactMethods,
    };

    if (existingClient) {
      editClient(existingClient.id, clientData);
      onSave?.(existingClient.id);
    } else {
      if (isPublicPool) {
        await importPublicLeads([clientData]);
        onSave?.('');
      } else {
        const newId = addClient(clientData);
        onSave?.(newId);
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

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/30">
          <h2 className="text-lg font-bold text-white">{existingClient ? t('editClientTitle') : t('newClientTarget')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t('name')}</label>
            <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="e.g. John Doe" />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t('company')}</label>
            <input required value={company} onChange={e => setCompany(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="e.g. Global Tech LLC" />
          </div>

          <div className={`grid ${isPublicPool ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <div className="space-y-1 relative" onClick={e => e.stopPropagation()}>
              <label className="text-xs font-bold text-slate-400 uppercase">{t('country')}</label>
              <div 
                className={`w-full bg-slate-950 border ${isCountryOpen ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-sm text-slate-200 flex items-center justify-between cursor-pointer`}
                onClick={() => {
                  if (!isCountryOpen) {
                    setCountrySearch('');
                  }
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
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t('tagsLabel')}</label>
            <input value={tags} onChange={e => setTags(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="#HighValue, #CantonFair" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">{t('contactMethods')}</label>
            {contactMethods.map((cm, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={cm.type} onChange={e => updateContactMethod(idx, 'type', e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="messenger">Messenger</option>
                  <option value="telegram">Telegram</option>
                  <option value="phone">Phone</option>
                  <option value="wechat">WeChat</option>
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
          
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">{t('cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-bold bg-cyan-600 text-white hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-600/20 transition-colors">
              {existingClient ? t('saveChanges') : t('createTarget')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
