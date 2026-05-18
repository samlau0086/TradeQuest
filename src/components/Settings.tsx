import React, { useState } from 'react';
import { useStore, InboxConfig, OutboxConfig, LLMConfig, PaymentTerm } from '../store';
import { useAuthStore } from '../authStore';
import { Settings as SettingsIcon, Mail, Plus, Trash2, Edit2, Save, X, Server, Send, Landmark } from 'lucide-react';
import { cn } from '../lib/utils';
import { ProfileSettings } from './ProfileSettings';
import { useTranslation } from '../lib/i18n';

export function Settings() {
  const { 
    inboxConfigs, addInboxConfig, updateInboxConfig, deleteInboxConfig, 
    outboxConfigs, addOutboxConfig, updateOutboxConfig, deleteOutboxConfig,
    llmConfigs, addLLMConfig, updateLLMConfig, deleteLLMConfig, activeLLMId, setActiveLLMId,
    paymentTerms, addPaymentTerm, updatePaymentTerm, deletePaymentTerm,
    llmMappings, setLLMMapping, language
  } = useStore();
  const t = useTranslation(language);
  
  const { profile } = useAuthStore();
  const isSuperadmin = profile?.role === 'superadmin';
  
  const [editingInboxId, setEditingInboxId] = useState<string | null>(null);
  const [inboxFormData, setInboxFormData] = useState<Partial<InboxConfig>>({});

  const [editingOutboxId, setEditingOutboxId] = useState<string | null>(null);
  const [outboxFormData, setOutboxFormData] = useState<Partial<OutboxConfig>>({});

  const [editingLLMId, setEditingLLMId] = useState<string | null>(null);
  const [llmFormData, setLLMFormData] = useState<Partial<LLMConfig>>({});

  const [editingPTId, setEditingPTId] = useState<string | null>(null);
  const [ptFormData, setPtFormData] = useState<Partial<PaymentTerm>>({});

  const handleEditPT = (pt: PaymentTerm) => {
    setEditingPTId(pt.id);
    setPtFormData(pt);
  };

  const handleAddNewPT = () => {
    setEditingPTId('new');
    setPtFormData({ name: 'New Term', description: '', advanceRatio: 30, balanceRatio: 70 });
  };

  const handleSavePT = () => {
    if (editingPTId === 'new') {
      addPaymentTerm(ptFormData as Omit<PaymentTerm, 'id'>);
    } else if (editingPTId) {
      updatePaymentTerm(editingPTId, ptFormData);
    }
    setEditingPTId(null);
  };

  const handleEditInbox = (acc: InboxConfig) => {
    setEditingInboxId(acc.id);
    setInboxFormData(acc);
  };

  const handleEditOutbox = (acc: OutboxConfig) => {
    setEditingOutboxId(acc.id);
    setOutboxFormData(acc);
  };

  const handleEditLLM = (llm: LLMConfig) => {
    setEditingLLMId(llm.id);
    setLLMFormData(llm);
  };

  const handleAddNewInbox = () => {
    setEditingInboxId('new');
    setInboxFormData({
      name: 'New Inbox',
      type: 'imap', host: '', port: '993', username: '', password: '', secure: true
    });
  };

  const handleAddNewOutbox = () => {
    setEditingOutboxId('new');
    setOutboxFormData({
      name: 'New Outbox',
      type: 'smtp', host: '', port: '465', username: '', password: '', secure: true, fromEmail: '', fromName: '', apiKey: ''
    });
  };

  const handleAddNewLLM = () => {
    setEditingLLMId('new');
    setLLMFormData({
      name: 'New AI Provider',
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: '',
      baseURL: ''
    });
  };

  const handleSaveInbox = () => {
    if (editingInboxId === 'new') {
      addInboxConfig(inboxFormData as any);
    } else if (editingInboxId) {
      updateInboxConfig(editingInboxId, inboxFormData);
    }
    setEditingInboxId(null);
  };

  const handleSaveOutbox = () => {
    if (editingOutboxId === 'new') {
      addOutboxConfig(outboxFormData as any);
    } else if (editingOutboxId) {
      updateOutboxConfig(editingOutboxId, outboxFormData);
    }
    setEditingOutboxId(null);
  };

  const handleSaveLLM = () => {
    if (editingLLMId === 'new') {
      addLLMConfig(llmFormData as any);
    } else if (editingLLMId) {
      updateLLMConfig(editingLLMId, llmFormData);
    }
    setEditingLLMId(null);
  };

  return (
    <div className="flex-1 bg-slate-900 border-t border-slate-800 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12 text-white pb-12">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-slate-400" />
              {t('settings')}
            </h1>
            <p className="text-slate-400 mt-2">{t('manageAppDesc')}</p>
          </div>
        </div>

        <ProfileSettings />

        {/* Payment Terms Section (Super Admin only) */}
        {isSuperadmin && (
          <section className="space-y-6 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-400" /> Payment Terms
              </h2>
              {editingPTId === null && (
                <button onClick={handleAddNewPT} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold shadow-lg transition-colors">
                  <Plus className="w-4 h-4" /> Add Payment Term
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {paymentTerms.length === 0 && editingPTId !== 'new' && (
                <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                  No payment terms configured. Add one to use in quotes.
                </div>
              )}
              
              {(editingPTId === 'new' ? [...paymentTerms, { ...ptFormData, id: 'new' } as PaymentTerm] : paymentTerms).map((pt) => {
                const isEditing = editingPTId === pt.id;

                if (isEditing) {
                  return (
                    <div key={pt.id} className="bg-slate-800 border border-emerald-500/50 rounded-xl p-6 space-y-6 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                        <input 
                          type="text" 
                          value={ptFormData.name || ''} 
                          onChange={e => setPtFormData({ ...ptFormData, name: e.target.value })}
                          placeholder="Term Name (e.g. 30/70 T/T)"
                          className="bg-transparent text-xl font-bold border-none outline-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1 w-1/2 text-white"
                        />
                        <div className="flex items-center gap-2">
                           <button onClick={handleSavePT} className="flex items-center gap-1 text-sm font-bold bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg transition-colors text-white">
                             <Save className="w-4 h-4" /> Save
                           </button>
                           <button onClick={() => setEditingPTId(null)} className="flex items-center gap-1 text-sm font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors text-white">
                             <X className="w-4 h-4" /> Cancel
                           </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-xs text-slate-400 font-bold uppercase">Description</label>
                          <textarea
                            value={ptFormData.description || ''}
                            onChange={e => setPtFormData({ ...ptFormData, description: e.target.value })}
                            placeholder="Detailed description..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-white h-24 resize-none"
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">Advance Ratio (%)</label>
                              <input 
                                type="number" 
                                placeholder="30"
                                value={ptFormData.advanceRatio || 0}
                                onChange={e => setPtFormData({ ...ptFormData, advanceRatio: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">Balance Ratio (%)</label>
                              <input 
                                type="number" 
                                placeholder="70"
                                value={ptFormData.balanceRatio || 0}
                                onChange={e => setPtFormData({ ...ptFormData, balanceRatio: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={pt.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Landmark className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-lg text-white">{pt.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditPT(pt)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePaymentTerm(pt.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {pt.description && <p className="text-sm text-slate-400">{pt.description}</p>}
                    <div className="flex items-center gap-4 text-xs font-medium text-emerald-500">
                      <span>Advance: {pt.advanceRatio}%</span>
                      <span>Balance: {pt.balanceRatio}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Incoming Servers Section */}
        <section className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" /> {t('incomingServers')}
            </h2>
            {editingInboxId === null && (
              <button onClick={handleAddNewInbox} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold shadow-lg transition-colors">
                <Plus className="w-4 h-4" /> {t('addInbox')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {inboxConfigs.length === 0 && editingInboxId !== 'new' && (
              <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                {t('noIncomingServers')}
              </div>
            )}
            
            {(editingInboxId === 'new' ? [...inboxConfigs, { ...inboxFormData, id: 'new' } as InboxConfig] : inboxConfigs).map((acc) => {
              const isEditing = editingInboxId === acc.id;

              if (isEditing) {
                return (
                  <div key={acc.id} className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <input 
                        type="text" 
                        value={inboxFormData.name || ''} 
                        onChange={e => setInboxFormData({ ...inboxFormData, name: e.target.value })}
                        placeholder="Inbox Name (e.g. Work IMAP)"
                        className="bg-transparent text-xl font-bold border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 w-1/2"
                      />
                      <div className="flex items-center gap-2">
                         <button onClick={handleSaveInbox} className="flex items-center gap-1 text-sm font-bold bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg transition-colors">
                           <Save className="w-4 h-4" /> {t('save')}
                         </button>
                         <button onClick={() => setEditingInboxId(null)} className="flex items-center gap-1 text-sm font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                           <X className="w-4 h-4" /> {t('cancel')}
                         </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Type</label>
                            <select 
                              value={inboxFormData.type || 'imap'}
                              onChange={e => setInboxFormData({ ...inboxFormData, type: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            >
                              <option value="imap">IMAP</option>
                              <option value="pop3">POP3</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Secure</label>
                            <select 
                              value={inboxFormData.secure ? 'true' : 'false'}
                              onChange={e => setInboxFormData({ ...inboxFormData, secure: e.target.value === 'true' })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            >
                              <option value="true">SSL/TLS</option>
                              <option value="false">None</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                          <div className="col-span-3 space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Host</label>
                            <input 
                              type="text" 
                              placeholder="imap.example.com"
                              value={inboxFormData.host || ''}
                              onChange={e => setInboxFormData({ ...inboxFormData, host: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Port</label>
                            <input 
                              type="text" 
                              placeholder="993"
                              value={inboxFormData.port || ''}
                              onChange={e => setInboxFormData({ ...inboxFormData, port: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Username</label>
                          <input 
                            type="text" 
                            placeholder="you@example.com"
                            value={inboxFormData.username || ''}
                            onChange={e => setInboxFormData({ ...inboxFormData, username: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">App Password</label>
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            value={inboxFormData.password || ''}
                            onChange={e => setInboxFormData({ ...inboxFormData, password: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={acc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{acc.name}</h3>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <span className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded"><Server className="w-3 h-3" /> {acc.type.toUpperCase()} ({acc.username})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditInbox(acc)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteInboxConfig(acc.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Outgoing Servers Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-400" /> {t('outgoingServers')}
            </h2>
            {editingOutboxId === null && (
              <button onClick={handleAddNewOutbox} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold shadow-lg transition-colors">
                <Plus className="w-4 h-4" /> {t('addOutbox')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {outboxConfigs.length === 0 && editingOutboxId !== 'new' && (
              <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                {t('noOutgoingServers')}
              </div>
            )}
            
            {(editingOutboxId === 'new' ? [...outboxConfigs, { ...outboxFormData, id: 'new' } as OutboxConfig] : outboxConfigs).map((acc) => {
              const isEditing = editingOutboxId === acc.id;

              if (isEditing) {
                return (
                  <div key={acc.id} className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <input 
                        type="text" 
                        value={outboxFormData.name || ''} 
                        onChange={e => setOutboxFormData({ ...outboxFormData, name: e.target.value })}
                        placeholder="Outbox Name (e.g. Marketing Sender)"
                        className="bg-transparent text-xl font-bold border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 w-1/2"
                      />
                      <div className="flex items-center gap-2">
                         <button onClick={handleSaveOutbox} className="flex items-center gap-1 text-sm font-bold bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg transition-colors">
                           <Save className="w-4 h-4" /> {t('save')}
                         </button>
                         <button onClick={() => setEditingOutboxId(null)} className="flex items-center gap-1 text-sm font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                           <X className="w-4 h-4" /> {t('cancel')}
                         </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Provider</label>
                            <select 
                              value={outboxFormData.type || 'smtp'}
                              onChange={e => setOutboxFormData({ ...outboxFormData, type: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            >
                              <option value="smtp">Custom SMTP</option>
                              <option value="resend">Resend API</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">From Name</label>
                              <input 
                                type="text" 
                                placeholder="Your Name"
                                value={outboxFormData.fromName || ''}
                                onChange={e => setOutboxFormData({ ...outboxFormData, fromName: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">From Email</label>
                              <input 
                                type="text" 
                                placeholder="you@domain.com"
                                value={outboxFormData.fromEmail || ''}
                                onChange={e => setOutboxFormData({ ...outboxFormData, fromEmail: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                              />
                            </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {outboxFormData.type === 'smtp' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-3 space-y-1">
                                <label className="text-xs text-slate-400 font-bold uppercase">Host</label>
                                <input 
                                  type="text" 
                                  placeholder="smtp.example.com"
                                  value={outboxFormData.host || ''}
                                  onChange={e => setOutboxFormData({ ...outboxFormData, host: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-bold uppercase">Port</label>
                                <input 
                                  type="text" 
                                  placeholder="465"
                                  value={outboxFormData.port || ''}
                                  onChange={e => setOutboxFormData({ ...outboxFormData, port: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">Username</label>
                              <input 
                                type="text" 
                                placeholder="you@example.com"
                                value={outboxFormData.username || ''}
                                onChange={e => setOutboxFormData({ ...outboxFormData, username: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-bold uppercase">Password</label>
                                <input 
                                  type="password" 
                                  placeholder="••••••••"
                                  value={outboxFormData.password || ''}
                                  onChange={e => setOutboxFormData({ ...outboxFormData, password: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs text-slate-400 font-bold uppercase">Secure</label>
                                  <select 
                                    value={outboxFormData.secure ? 'true' : 'false'}
                                    onChange={e => setOutboxFormData({ ...outboxFormData, secure: e.target.value === 'true' })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                  >
                                    <option value="true">SSL/TLS</option>
                                    <option value="false">None</option>
                                  </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {outboxFormData.type === 'resend' && (
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400 font-bold uppercase">Resend API Key</label>
                              <input 
                                type="password" 
                                placeholder="re_••••••••"
                                value={outboxFormData.apiKey || ''}
                                onChange={e => setOutboxFormData({ ...outboxFormData, apiKey: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={acc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{acc.name}</h3>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <span className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded"><Send className="w-3 h-3" /> {acc.type.toUpperCase()} ({acc.fromEmail})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditOutbox(acc)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteOutboxConfig(acc.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* LLM Configuration Section */}
        <section className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" /> {t('aiModels')}
            </h2>
            {editingLLMId === null && (
              <button onClick={handleAddNewLLM} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold shadow-lg transition-colors">
                <Plus className="w-4 h-4" /> {t('addAIProvider')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {llmConfigs.length > 0 && (
              <div className="bg-slate-800/50 border border-indigo-500/30 rounded-xl p-5 mb-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-300 mb-4 px-1">{t('functionalAssignments')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: 'magic', label: t('magicCommands'), desc: '/icebreaker, /draft' },
                    { key: 'drafting', label: t('emailDrafting'), desc: 'Auto-detect purpose & write' },
                    { key: 'analysis', label: t('clientAnalysis'), desc: 'Icebreakers & actionables' }
                  ].map(mod => (
                    <div key={mod.key} className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-200">{mod.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{mod.desc}</div>
                      </div>
                      <select
                        value={llmMappings[mod.key] || ''}
                        onChange={(e) => setLLMMapping(mod.key, e.target.value || null)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500 outline-none mt-auto"
                      >
                        <option value="">Default (Internal Gemini)</option>
                        {llmConfigs.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {llmConfigs.length === 0 && editingLLMId !== 'new' && (
              <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-slate-800 text-slate-500">
                {t('noAIProviders')}
              </div>
            )}
            
            {(editingLLMId === 'new' ? [...llmConfigs, { ...llmFormData, id: 'new' } as LLMConfig] : llmConfigs).map((llm) => {
              const isEditing = editingLLMId === llm.id;

              if (isEditing) {
                return (
                  <div key={llm.id} className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <input 
                        type="text" 
                        value={llmFormData.name || ''} 
                        onChange={e => setLLMFormData({ ...llmFormData, name: e.target.value })}
                        className="bg-transparent text-xl font-bold text-white outline-none border-b border-dashed border-slate-600 focus:border-indigo-500 placeholder-slate-600 px-1"
                        placeholder="Config Name (e.g. My OpenAI)"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={handleSaveLLM} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm transition-colors">
                          <Save className="w-4 h-4" /> {t('save')}
                        </button>
                        <button onClick={() => setEditingLLMId(null)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Provider Type</label>
                          <select 
                            value={llmFormData.provider}
                            onChange={(e: any) => setLLMFormData({ ...llmFormData, provider: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          >
                            <option value="openai">OpenAI</option>
                            <option value="gemini">Gemini</option>
                            <option value="custom_openai">Custom (OpenAI Compatible)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Model Name</label>
                          <input 
                            type="text" 
                            placeholder={llmFormData.provider === 'openai' ? 'gpt-4o' : llmFormData.provider === 'gemini' ? 'gemini-2.5-flash' : 'llama-3...'}
                            value={llmFormData.model || ''}
                            onChange={e => setLLMFormData({ ...llmFormData, model: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">API Key</label>
                          <input 
                            type="password" 
                            placeholder="sk-..."
                            value={llmFormData.apiKey || ''}
                            onChange={e => setLLMFormData({ ...llmFormData, apiKey: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                        {llmFormData.provider === 'custom_openai' && (
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Base URL</label>
                            <input 
                              type="text" 
                              placeholder="https://api.yourprovider.com/v1"
                              value={llmFormData.baseURL || ''}
                              onChange={e => setLLMFormData({ ...llmFormData, baseURL: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={llm.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{llm.name}</h3>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <span className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded"><Server className="w-3 h-3" /> {llm.provider.toUpperCase()} ({llm.model})</span>
                      {activeLLMId === llm.id && (
                        <span className="text-green-400 text-xs font-bold px-2 py-1 bg-green-400/10 rounded">ACTIVE DEFAULT</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeLLMId !== llm.id ? (
                      <button onClick={() => setActiveLLMId(llm.id)} className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                        Set Active
                      </button>
                    ) : (
                      <button onClick={() => setActiveLLMId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors">
                        Clear Active
                      </button>
                    )}
                    <button onClick={() => handleEditLLM(llm)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteLLMConfig(llm.id)} className="p-2 text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
