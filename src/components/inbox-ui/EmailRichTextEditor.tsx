import React, { useEffect, useRef, useState } from 'react';
import { Bold, Image as ImageIcon, Italic, Link2, List, Loader2, Sparkles } from 'lucide-react';
import { Quote } from '../../store';
import { cn } from '../../lib/utils';
import { MediaSelectorModal } from '../MediaSelectorModal';

export const escapeEmailHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const plainTextToEmailHtml = (value: string) => escapeEmailHtml(value)
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .split(/\n{2,}/)
  .map(part => `<p>${part.replace(/\n/g, '<br>') || '<br>'}</p>`)
  .join('');

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

export const normalizeEmailEditorHtml = (value: string) => {
  if (!value?.trim()) return '';
  return looksLikeHtml(value) ? value : plainTextToEmailHtml(value);
};

export const emailHtmlToText = (value: string) => value
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ')
  .trim();

export const emailHtmlHasContent = (value: string) => !!emailHtmlToText(value) || /<img\b/i.test(value || '');

interface EmailRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  originalEmailBody?: string;
  quotes: Quote[];
  onOptimize: () => void;
  onInlineAI: (prompt: string, currentHtml: string) => Promise<string>;
}

export function EmailRichTextEditor({
  value,
  onChange,
  loading,
  originalEmailBody,
  quotes,
  onOptimize,
  onInlineAI
}: EmailRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showQuoteMenu, setShowQuoteMenu] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [runningInlineAI, setRunningInlineAI] = useState(false);

  useEffect(() => {
    if (!editorRef.current || document.activeElement === editorRef.current) return;
    if (editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value || '';
  }, [value]);

  const syncEditor = () => onChange(editorRef.current?.innerHTML || '');

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncEditor();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    syncEditor();
  };

  const insertImage = (url: string, alt = '') => {
    insertHtml(`<p><img src="${escapeEmailHtml(url)}" alt="${escapeEmailHtml(alt)}" style="max-width:100%;height:auto;border-radius:6px;" /></p>`);
  };

  const findAiCommandNode = () => {
    if (!editorRef.current) return null;
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes.reverse()) {
      const match = node.data.match(/\/ai:([^\n\r<]*)/);
      if (match) {
        return { node, matchText: match[0], prompt: match[1].trim(), index: match.index || 0 };
      }
    }
    return null;
  };

  const runInlineAI = async () => {
    const command = findAiCommandNode();
    if (!command || !command.prompt || runningInlineAI) return;
    setRunningInlineAI(true);
    try {
      const result = await onInlineAI(command.prompt, editorRef.current?.innerHTML || '');
      const range = document.createRange();
      range.setStart(command.node, command.index);
      range.setEnd(command.node, command.index + command.matchText.length);
      range.deleteContents();
      range.insertNode(range.createContextualFragment(normalizeEmailEditorHtml(result)));
      syncEditor();
      editorRef.current?.focus();
    } finally {
      setRunningInlineAI(false);
    }
  };

  const handleLocalImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => insertImage(String(reader.result || ''), file.name);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    runCommand('createLink', url);
    setLinkUrl('');
    setShowLinkForm(false);
  };

  const filteredQuotes = quotes
    .filter(quote => quote.quoteNumber.toLowerCase().includes(quoteSearch.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-slate-800 bg-slate-950/70 px-2 py-2">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => runCommand('bold')} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => runCommand('italic')} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => runCommand('insertUnorderedList')} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="List">
          <List className="w-4 h-4" />
        </button>
        <div className="h-6 w-px bg-slate-800 mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowLinkForm(prev => !prev)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="Insert link">
          <Link2 className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" title="Insert image">
          <ImageIcon className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowMediaSelector(true)} className="px-2.5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white">
          Media
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowQuoteMenu(prev => !prev)} className="px-2.5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white">
          Quote
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={runInlineAI} disabled={loading || runningInlineAI} className="px-2.5 py-2 rounded-lg text-xs font-bold text-cyan-300 hover:bg-cyan-950/40 disabled:text-slate-600">
          {runningInlineAI ? 'Generating...' : '/ai'}
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onOptimize}
            disabled={loading || !emailHtmlHasContent(value)}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.35)]"
            title="Optimize Content with AI"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLocalImage} className="hidden" />
      </div>

      {showLinkForm && (
        <div className="flex items-center gap-2 border-x border-slate-800 bg-slate-950 px-3 py-2">
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink(); }}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
            placeholder="https://example.com"
          />
          <button type="button" onClick={applyLink} className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-xs font-bold text-white">Apply</button>
          <button type="button" onClick={() => setShowLinkForm(false)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300">Cancel</button>
        </div>
      )}

      {showQuoteMenu && (
        <div className="border-x border-slate-800 bg-slate-950 px-3 py-2 space-y-2">
          <input
            value={quoteSearch}
            onChange={e => setQuoteSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
            placeholder="Search quote number..."
          />
          <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-800">
            {filteredQuotes.map(quote => (
              <button
                key={quote.id}
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/quote/${quote.id}`;
                  insertHtml(`<a href="${escapeEmailHtml(link)}">${escapeEmailHtml(quote.quoteNumber)}</a>`);
                  setShowQuoteMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-cyan-950/50 hover:text-cyan-300 flex items-center justify-between"
              >
                <span className="font-mono">{quote.quoteNumber}</span>
                <span className="text-slate-500">{quote.status}</span>
              </button>
            ))}
            {filteredQuotes.length === 0 && <div className="px-3 py-2 text-xs text-slate-500 text-center">No matching quotes</div>}
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncEditor}
        onBlur={syncEditor}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && findAiCommandNode()) {
            e.preventDefault();
            void runInlineAI();
          }
        }}
        className={cn(
          "email-rich-editor flex-1 min-h-[220px] overflow-y-auto rounded-b-xl border-x border-b border-slate-800 bg-slate-950/30 px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 leading-relaxed",
          !value && "before:content-['Write_your_email_here...'] before:text-slate-600"
        )}
      />

      {originalEmailBody && (
        <div className="mt-4 pt-4 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-500 mb-2 font-medium">Original Message</div>
          <div
            className="text-sm text-slate-400 pl-3 border-l-2 border-slate-700 py-1"
            dangerouslySetInnerHTML={{ __html: originalEmailBody }}
          />
        </div>
      )}

      {showMediaSelector && (
        <MediaSelectorModal
          onClose={() => setShowMediaSelector(false)}
          onSelect={(url, media) => {
            insertImage(url, media.name);
            setShowMediaSelector(false);
          }}
          allowedTypes={['image']}
        />
      )}
    </div>
  );
}
