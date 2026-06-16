import React from 'react';
import { FileText } from 'lucide-react';
import { Deal, Quote } from '../../store';
import { formatCurrency } from '../../lib/currency';
import { SectionHeader } from '../ui';

interface ClientQuotesWidgetProps {
  quotes: Quote[];
  leadRecord?: Deal | null;
  currencyRates: Record<string, number>;
  onOpenQuote: (quoteId: string) => void;
}

export function ClientQuotesWidget({ quotes, leadRecord, currencyRates, onOpenQuote }: ClientQuotesWidgetProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
      <SectionHeader icon={<FileText className="w-4 h-4" />} className="mb-4">Quotes</SectionHeader>
      <div className="space-y-2">
        {quotes.map(quote => {
          const subtotal = quote.items.reduce((sum, item) => sum + (item.total || item.quantity * item.unitPrice || 0), 0);
          const feesTotal = quote.fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
          return (
            <button
              key={quote.id}
              type="button"
              onClick={() => onOpenQuote(quote.id)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-left transition-colors hover:border-indigo-500/50 hover:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-bold text-slate-100">{quote.quoteNumber}</span>
                <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                  {quote.status}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  {quote.leadId && leadRecord ? leadRecord.name : (leadRecord ? 'Client quote' : 'Client quote')}
                </span>
                <span className="font-bold text-indigo-300">
                  {formatCurrency(subtotal + feesTotal, quote.currency || 'USD', currencyRates)}
                </span>
              </div>
            </button>
          );
        })}
        {quotes.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-500">
            {leadRecord ? 'No quotes linked to this lead yet.' : 'No quotes linked to this client yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
