import React, { useMemo, useState } from 'react';
import { Check, Search, UserPlus, X } from 'lucide-react';
import { Client, ContactMethod, useStore } from '../store';
import { useTranslation } from '../lib/i18n';

interface AddContactToClientModalProps {
  contactMethod: ContactMethod;
  displayName?: string;
  onClose: () => void;
  onLinked?: (clientId: string) => void | Promise<void>;
}

const normalizeContactValue = (method: ContactMethod) => (
  method.type === 'email'
    ? method.value.trim().toLowerCase()
    : method.value.replace(/[^0-9]/g, '')
);

const methodExists = (methods: ContactMethod[] | undefined, method: ContactMethod) => {
  const nextValue = normalizeContactValue(method);
  return (methods || []).some(existing => existing.type === method.type && normalizeContactValue(existing) === nextValue);
};

export function AddContactToClientModal({ contactMethod, displayName, onClose, onLinked }: AddContactToClientModalProps) {
  const { clients, editClient, selectClient, language, notify } = useStore();
  const t = useTranslation(language);
  const [query, setQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [saving, setSaving] = useState(false);

  const visibleClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return clients
      .filter(client => {
        if (!normalized) return true;
        return [
          client.name,
          client.company,
          client.country,
          ...(client.tags || [])
        ].filter(Boolean).join(' ').toLowerCase().includes(normalized);
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);
  }, [clients, query]);

  const selectedClient = clients.find(client => client.id === selectedClientId);

  const handleSave = async () => {
    if (!selectedClient || saving) return;
    setSaving(true);
    try {
      const nextContactMethods = methodExists(selectedClient.contactMethods, contactMethod)
        ? selectedClient.contactMethods || []
        : [...(selectedClient.contactMethods || []), contactMethod];
      const contacts = selectedClient.contacts || [];
      const primaryContactId = selectedClient.primaryContactId || contacts.find(contact => contact.isPrimary)?.id || contacts[0]?.id;
      const nextContacts = contacts.length > 0
        ? contacts.map((contact, index) => {
            const shouldAttach = contact.id === primaryContactId || (!primaryContactId && index === 0);
            if (!shouldAttach || methodExists(contact.contactMethods, contactMethod)) return contact;
            return { ...contact, contactMethods: [...(contact.contactMethods || []), contactMethod] };
          })
        : [{
            id: `contact_${Date.now()}`,
            name: selectedClient.name || displayName || contactMethod.value,
            title: '',
            isPrimary: true,
            contactMethods: [contactMethod]
          }];

      editClient(selectedClient.id, {
        contactMethods: nextContactMethods,
        contacts: nextContacts,
        primaryContactId: primaryContactId || nextContacts[0]?.id
      });
      await onLinked?.(selectedClient.id);
      selectClient(selectedClient.id);
      notify(language === 'zh' ? '联系方式已添加到已有客户。' : 'Contact method added to existing client.', 'success');
      onClose();
    } catch (error: any) {
      notify(error.message || (language === 'zh' ? '添加联系方式失败。' : 'Failed to add contact method.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">{t('Add to Existing Client')}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {contactMethod.type}: <span className="text-slate-300">{contactMethod.value}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={language === 'zh' ? '搜索客户名称、公司、国家或标签...' : 'Search client name, company, country, or tags...'}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {visibleClients.map(client => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClientId(client.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
                  selectedClientId === client.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-100">{client.name}</div>
                  <div className="truncate text-xs text-slate-500">{[client.company, client.country, client.status].filter(Boolean).join(' · ')}</div>
                </div>
                {selectedClientId === client.id && <Check className="h-4 w-4 text-cyan-300" />}
              </button>
            ))}
            {visibleClients.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                {language === 'zh' ? '没有找到匹配客户。' : 'No matching clients found.'}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedClient || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500"
          >
            <UserPlus className="h-4 w-4" />
            {saving ? (language === 'zh' ? '添加中...' : 'Adding...') : t('Add to Existing Client')}
          </button>
        </div>
      </div>
    </div>
  );
}
