import React, { useState } from 'react';
import { useStore } from '../store';
import { useAuthStore } from '../authStore';
import { Terminal, Sparkles, Send, Loader2, LogOut, User } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

export function TopBar() {
  const { broadcasts, language } = useStore();
  const t = useTranslation(language);
  const { profile, signOut } = useAuthStore();
  const latestBroadcast = broadcasts[0];

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
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {profile.points} {t('availablePoints')}
          </div>
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
    </header>
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
