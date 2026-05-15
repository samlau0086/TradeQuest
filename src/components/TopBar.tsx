import React, { useState } from 'react';
import { useStore } from '../store';
import { useAuthStore } from '../authStore';
import { Terminal, Sparkles, Send, Loader2, LogOut, User } from 'lucide-react';

export function TopBar() {
  const { broadcasts } = useStore();
  const { profile, signOut } = useAuthStore();
  const latestBroadcast = broadcasts[0];

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
      <div className="flex-1 flex items-center space-x-4">
        {/* Real-time Broadcast left side */}
        <div className="flex bg-slate-800/80 rounded-full pl-3 pr-4 py-1.5 items-center gap-2 border border-slate-700/50 shadow-sm w-fit">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-slate-300 truncate max-w-[200px] md:max-w-md">
            {latestBroadcast?.message || "All systems online"}
          </span>
        </div>
      </div>
      
      {/* User Actions */}
      <div className="flex items-center gap-4">
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
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

export function MagicCommand() {
  const { clients, llmConfigs, activeLLMId, llmMappings } = useStore();
  const activeLLMConfig = llmConfigs.find(l => l.id === (llmMappings['magic'] || activeLLMId)) || null;
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Autocomplete state
  const [showMenu, setShowMenu] = useState(false);
  const [filteredItems, setFilteredItems] = useState<{ type: string; text: string; desc: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const COMMANDS = [
    { label: '/followup', desc: 'Draft a follow-up email' },
    { label: '/icebreaker', desc: 'Generate a personalized icebreaker' },
    { label: '/summarize', desc: 'Summarize recent logs' },
    { label: '/schedule', desc: 'Set a reminder for next contact' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    const words = val.split(' ');
    const lastWord = words[words.length - 1];

    if (val.trim() === '') {
      setFilteredItems(COMMANDS.map(m => ({ type: 'command', text: m.label, desc: m.desc })));
      setShowMenu(true);
      setActiveIndex(0);
    } else if (lastWord.startsWith('/')) {
      const term = lastWord.toLowerCase();
      const matches = COMMANDS.filter(c => c.label.startsWith(term));
      setFilteredItems(matches.map(m => ({ type: 'command', text: m.label, desc: m.desc })));
      setShowMenu(matches.length > 0);
      setActiveIndex(0);
    } else if (lastWord.startsWith('@')) {
      const term = lastWord.slice(1).toLowerCase();
      const matches = clients.filter(c => c.name.toLowerCase().includes(term));
      setFilteredItems(matches.map(m => ({ type: 'client', text: `@${m.name.replace(/\s+/g, '')}`, desc: m.company })));
      setShowMenu(matches.length > 0);
      setActiveIndex(0);
    } else {
      setShowMenu(false);
    }
  };

  const handleFocus = () => {
    if (input.trim() === '') {
      setFilteredItems(COMMANDS.map(m => ({ type: 'command', text: m.label, desc: m.desc })));
      setShowMenu(true);
      setActiveIndex(0);
    } else {
      // Re-trigger the logic
      handleInputChange({ target: { value: input } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const insertSuggestion = (item: { text: string }) => {
    const words = input.split(' ');
    words.pop();
    words.push(item.text);
    setInput(words.join(' ') + ' ');
    setShowMenu(false);
    inputRef.current?.focus();
  };

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

    setLoading(true);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: input, context: {}, llmConfig: activeLLMConfig })
      });
      const data = await res.json();
      setOutput(data.result);
    } catch(err) {
      setOutput("Command failed. Please try again.");
    } finally {
      setLoading(false);
      setInput('');
      setShowMenu(false);
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 pointer-events-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] shadow-cyan-500/10 overflow-visible pointer-events-auto relative">
        <form onSubmit={handleSubmit} className="flex items-center px-4 py-3 gap-3">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <input 
            ref={inputRef}
            autoFocus
            type="text" 
            placeholder="Type /followup @name, or any magic command..."
            className="flex-1 bg-transparent text-slate-200 focus:outline-none placeholder:text-slate-600 text-sm"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-slate-500" />
          )}
        </form>

        {showMenu && (
          <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden py-2 z-40">
            {filteredItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => insertSuggestion(item)}
                className={`w-full text-left px-4 py-2 flex items-center justify-between transition-colors ${
                  idx === activeIndex ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                }`}
              >
                <span className={`text-sm font-medium ${item.type === 'command' ? 'text-cyan-400' : 'text-orange-400'}`}>
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
          <div className="p-4 bg-slate-800/50 text-sm text-slate-300 border-t border-slate-800/50">
            <div className="font-mono text-xs text-slate-500 mb-2">AI Output Draft</div>
            <p className="whitespace-pre-wrap">{output}</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setOutput('')} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg font-medium text-xs transition-colors shadow-lg shadow-cyan-600/20">
                <Send className="w-3 h-3" /> Execute
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
