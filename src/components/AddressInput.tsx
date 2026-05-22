import React, { useState, useRef, useEffect } from 'react';
import { useStore, Client } from '../store';
import { Mail, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function AddressInput({ label, value, onChange, placeholder, autoFocus }: AddressInputProps) {
  const { clients } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lastKeyRef = useRef<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredClients]);

  const tokens = value.split(',').map(t => t.trim()).filter(Boolean);

  const addToken = (email: string) => {
    const newTokens = [...tokens, email];
    onChange(newTokens.join(', '));
    setInputValue('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeToken = (idx: number) => {
    const newTokens = [...tokens];
    newTokens.splice(idx, 1);
    onChange(newTokens.join(', '));
  };

  useEffect(() => {
    if (inputValue.includes('@')) {
      const parts = inputValue.split('@');
      const query = parts[parts.length - 1].toLowerCase();
      
      const matched = clients.filter(c => 
        c.contactMethods?.some(cm => cm.type === 'email') &&
        (c.name.toLowerCase().includes(query) || 
         c.company.toLowerCase().includes(query) ||
         c.contactMethods.some(cm => cm.value.toLowerCase().includes(query)))
      );
      
      if (query && matched.length > 0 && lastKeyRef.current !== 'Backspace') {
        setFilteredClients(matched);
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    } else {
      setShowDropdown(false);
    }
  }, [inputValue, clients]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    lastKeyRef.current = e.key;

    if (showDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredClients.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredClients.length) % filteredClients.length);
        return;
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const client = filteredClients[selectedIndex];
        if (client) {
          const email = client.contactMethods?.find(cm => cm.type === 'email')?.value;
          if (email) {
            addToken(email);
          }
        }
        return;
      } else if (e.key === 'Backspace') {
        setShowDropdown(false);
      }
    }

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (showDropdown && filteredClients[selectedIndex] && e.key === 'Enter') {
        const client = filteredClients[selectedIndex];
        const email = client.contactMethods?.find(cm => cm.type === 'email')?.value;
        if (email) {
           addToken(email);
           return;
        }
      }
      if (inputValue.trim()) {
        const email = inputValue.trim().replace(/,/g, '');
        if (email) {
          addToken(email);
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && tokens.length > 0) {
      removeToken(tokens.length - 1);
    }
  };

  return (
    <div className="flex items-start gap-3 relative" ref={containerRef}>
      <label className="text-xs font-bold text-slate-500 w-12 text-right mt-1.5">{label}</label>
      <div className="flex-1 flex flex-wrap gap-1.5 min-h-[32px] items-center text-sm border-b border-transparent focus-within:border-indigo-500/30 pb-1">
        {tokens.map((token, idx) => (
          <span key={idx} className="bg-slate-800 text-slate-200 border border-slate-700 rounded-md px-2 py-0.5 flex items-center gap-1 text-xs">
            {token}
            <button onClick={() => removeToken(idx)} className="hover:text-red-400">
               <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input 
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 200);
          }}
          className="flex-1 bg-transparent text-slate-200 focus:outline-none placeholder:text-slate-600 min-w-[120px]" 
          placeholder={tokens.length === 0 ? placeholder : ''}
          autoFocus={autoFocus}
        />
      </div>

      {showDropdown && (
        <div className="absolute left-16 top-full mt-1 w-64 bg-slate-800 border border-slate-700 shadow-xl rounded-lg z-50 max-h-48 overflow-y-auto">
          {filteredClients.map((c, idx) => {
            const emails = c.contactMethods?.filter(cm => cm.type === 'email') || [];
            if (emails.length === 0) return null;
            return (
              <div 
                key={c.id} 
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input onBlur from firing immediately
                  addToken(emails[0].value);
                }}
                className={cn(
                  "p-2 hover:bg-slate-700 cursor-pointer flex flex-col gap-0.5 border-b border-slate-700/50 last:border-0",
                  selectedIndex === idx && "bg-slate-700"
                )}
              >
                <div className="text-sm font-medium text-white">{c.name} <span className="text-xs text-slate-400">({c.company})</span></div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {emails[0].value}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
