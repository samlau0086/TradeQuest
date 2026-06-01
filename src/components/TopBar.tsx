import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useAuthStore } from '../authStore';
import { Terminal, Sparkles, Send, Loader2, LogOut, User, X, RefreshCw } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

interface PointTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  source?: string;
  referenceId?: string;
  createdAt: string;
}

export function TopBar() {
  const { broadcasts, language } = useStore();
  const t = useTranslation(language);
  const { profile, signOut, token } = useAuthStore();
  const latestBroadcast = broadcasts[0];
  const [showPointHistory, setShowPointHistory] = useState(false);

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
      <div className="flex-1 flex items-center space-x-4">
        {/* Real-time Broadcast left side */}
        <div className="flex bg-slate-800/80 rounded-full pl-3 pr-4 py-1.5 items-center gap-2 border border-slate-700/50 shadow-sm w-fit">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-slate-300 truncate max-w-[200px] md:max-w-md">
            {latestBroadcast?.message || t('allSystemsOnline')}
          </span>
        </div>
      </div>
      
      <div className="flex-1 max-w-2xl mx-6">
        <MagicCommand />
      </div>

      {/* User Actions */}
      <div className="flex-1 flex items-center justify-end gap-4">
        {profile?.points !== undefined && (
          <button
            type="button"
            onClick={() => setShowPointHistory(true)}
            className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-yellow-500/20 hover:border-yellow-500/40 transition-colors"
            title={language === 'zh' ? '查看可用积分记录' : 'View available point history'}
          >
            <Sparkles className="w-3 h-3" />
            {profile.points} {t('availablePoints')}
          </button>
        )}
        <div className="flex items-center gap-2">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <div className="hidden md:block text-xs">
            <div className="font-bold text-slate-200">{profile?.displayName || 'User'}</div>
            <div className="text-slate-500 capitalize">{profile?.role}</div>
          </div>
        </div>
        <button 
          onClick={() => signOut()}
          title={t('signOut')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      {showPointHistory && (
        <PointHistoryModal
          token={token}
          language={language}
          balance={profile?.points || 0}
          onClose={() => setShowPointHistory(false)}
        />
      )}
    </header>
  );
}

function PointHistoryModal({ token, language, balance, onClose }: { token: string | null; language: 'en' | 'zh'; balance: number; onClose: () => void }) {
  const [items, setItems] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/points/history?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || 'Failed to load point history');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load point history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [token]);

  const title = language === 'zh' ? '可用积分记录' : 'Available Point History';
  const balanceLabel = language === 'zh' ? '当前余额' : 'Current balance';
  const emptyLabel = language === 'zh' ? '暂无积分记录。之后的加分和扣分会显示在这里。' : 'No point history yet. Future point gains and spending will appear here.';

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-sm flex items-start justify-end p-4 pt-16" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[78vh] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-white">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{balanceLabel}: <span className="text-yellow-400 font-bold">{balance}</span></p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={loadHistory} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white" title={language === 'zh' ? '刷新' : 'Refresh'}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white" title={language === 'zh' ? '关闭' : 'Close'}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-3 custom-scrollbar">
          {loading && items.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">{language === 'zh' ? '正在加载...' : 'Loading...'}</div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">{emptyLabel}</div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">{item.reason}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {new Date(item.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : undefined)}
                        {item.source ? ` · ${item.source}` : ''}
                      </div>
                    </div>
                    <div className={`text-sm font-black ${item.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.amount > 0 ? '+' : ''}{item.amount}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {language === 'zh' ? '变动后余额' : 'Balance after'}: {item.balanceAfter}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MagicCommand() {
  const { clients, llmConfigs, activeLLMId, llmMappings, language } = useStore();
  const t = useTranslation(language);
  const activeLLMConfig = llmConfigs.find(l => l.id === (llmMappings['magic'] || activeLLMId)) || null;
  const embeddingLlmConfig = llmConfigs.find(l => l.id === (llmMappings['embedding'] || activeLLMId)) || null;
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Autocomplete state
  const [showMenu, setShowMenu] = useState(false);
  const [filteredItems, setFilteredItems] = useState<{ type: string; text: string; desc: string; action?: () => void }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const SYSTEM_COMMANDS = [
    { label: '/home', desc: t('commandDashboard'), action: () => useStore.getState().setView('dashboard') },
    { label: '/clients', desc: t('commandClients'), action: () => useStore.getState().setView('clients') },
    { label: '/kanban', desc: t('commandKanban'), action: () => useStore.getState().setView('kanban') },
    { label: '/pipeline', desc: t('commandPipeline'), action: () => useStore.getState().setView('list') },
    { label: '/inbox', desc: t('commandInbox'), action: () => { useStore.getState().setView('inbox'); useStore.getState().selectEmail(null); } },
    { label: '/products', desc: t('commandProducts'), action: () => useStore.getState().setView('products') },
    { label: '/quotes', desc: t('commandQuotes'), action: () => useStore.getState().setView('quotes') },
    { label: '/knowledge', desc: t('commandKnowledge'), action: () => useStore.getState().setView('knowledge-base') },
    { label: '/media', desc: t('commandMedia'), action: () => useStore.getState().setView('media-library') },
    { label: '/settings', desc: t('commandSettings'), action: () => useStore.getState().setView('settings') },
  ];

  const updateFilteredItems = (val: string) => {
    const term = val.trim().toLowerCase();
    
    if (!term) {
      setFilteredItems(SYSTEM_COMMANDS.map(m => ({ type: 'command', text: m.label, desc: m.desc, action: m.action })));
      setShowMenu(true);
      setActiveIndex(0);
      return;
    }

    const items: { type: string; text: string; desc: string; action?: () => void }[] = [];

    // Filter commands
    if (term.startsWith('/')) {
      const matches = SYSTEM_COMMANDS.filter(c => c.label.startsWith(term));
      items.push(...matches.map(m => ({ type: 'command', text: m.label, desc: m.desc, action: m.action })));
    } else if (term.startsWith('@')) {
      const name = term.slice(1);
      const matches = clients.filter(c => c.name.toLowerCase().includes(name));
      items.push(...matches.map(m => ({
        type: 'client', 
        text: `@${m.name.replace(/\s+/g, '')}`, 
        desc: m.company,
        action: () => { useStore.getState().selectClient(m.id); useStore.getState().setView('clients'); }
      })));
    } else {
      // General search over commands and clients
      const commandMatches = SYSTEM_COMMANDS.filter(c => c.label.includes(term) || c.desc.toLowerCase().includes(term));
      const clientMatches = clients.filter(c => c.name.toLowerCase().includes(term) || c.company.toLowerCase().includes(term));
      
      items.push(...commandMatches.map(m => ({ type: 'command', text: m.label, desc: m.desc, action: m.action })));
      items.push(...clientMatches.map(m => ({
        type: 'client', 
        text: m.name, 
        desc: m.company,
        action: () => { useStore.getState().selectClient(m.id); useStore.getState().setView('clients'); }
      })));
      
      items.push({ type: 'ai', text: term, desc: `${t('askAiAssistant')}: "${term}"`, action: () => { executeAskAi(val); } });
    }

    setFilteredItems(items);
    setShowMenu(items.length > 0);
    setActiveIndex(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    updateFilteredItems(val);
  };

  const handleFocus = () => {
    updateFilteredItems(input);
  };

  const executeAskAi = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setInput('');
    setShowMenu(false);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}` 
        },
        body: JSON.stringify({ command: query, context: {}, llmConfig: activeLLMConfig, embeddingLlmConfig })
      });
      const data = await res.json();
      setOutput(data.result);
    } catch(err) {
      setOutput(t('commandFailed'));
    } finally {
      setLoading(false);
    }
  };

  const insertSuggestion = (item: { text: string; action?: () => void }) => {
    if (item.action) {
      item.action();
      setInput('');
      setShowMenu(false);
      inputRef.current?.blur();
    } else {
      setInput(item.text);
      inputRef.current?.focus();
    }
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMenu) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      insertSuggestion(filteredItems[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowMenu(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showMenu) return; // Handled by handleKeyDown
    if (!input.trim()) return;
    executeAskAi(input);
  };

  return (
    <div className="relative w-full z-50">
      <div className="bg-slate-950/50 border border-slate-700/50 focus-within:border-cyan-500/50 focus-within:bg-slate-900 focus-within:shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)] transition-all duration-300 rounded-lg overflow-visible relative">
        <form onSubmit={handleSubmit} className="flex items-center px-3 py-1.5 gap-2">
          <Terminal className="w-4 h-4 text-cyan-400/70" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder={t('searchCommandsPlaceholder')}
            className="flex-1 bg-transparent text-slate-200 focus:outline-none placeholder:text-slate-500 text-sm py-1"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
          ) : (
            <div className="flex items-center gap-1 border border-slate-700/50 bg-slate-800/50 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
              <span className="text-cyan-500/50">⌘</span>K
            </div>
          )}
        </form>

        {showMenu && (
          <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden py-2 z-50 backdrop-blur-xl">
            {filteredItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertSuggestion(item); }}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                  idx === activeIndex ? 'bg-slate-800/80' : 'hover:bg-slate-800/40'
                }`}
              >
                <span className={`text-sm font-medium ${item.type === 'command' ? 'text-indigo-400' : item.type === 'ai' ? 'text-cyan-400' : 'text-orange-400'}`}>
                  {item.type === 'ai' ? <Sparkles className="w-3 h-3 inline mr-1" /> : null}
                  {item.text}
                </span>
                <span className="text-xs text-slate-500">
                  {item.desc}
                </span>
              </button>
            ))}
          </div>
        )}

        {output && (
          <div className="absolute top-full left-0 w-full mt-2 p-5 bg-slate-900 border border-slate-700/80 shadow-2xl rounded-xl z-50 backdrop-blur-xl">
            <div className="font-mono text-xs text-cyan-500/70 mb-3 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> {t('aiOutputDraft')}
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">{output}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setOutput('')} className="px-3 py-1.5 rounded-lg font-medium text-xs text-slate-400 hover:text-slate-200 transition-colors">
                {t('dismiss')}
              </button>
              <button onClick={() => setOutput('')} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg font-medium text-xs transition-colors shadow-lg shadow-cyan-600/20">
                <Send className="w-3 h-3" /> {t('execute')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
