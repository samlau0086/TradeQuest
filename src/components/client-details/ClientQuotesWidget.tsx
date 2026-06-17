import React from 'react';
import { FileText } from 'lucide-react';
import { Deal, Quote } from '../../store';
import { formatCurrency } from '../../lib/currency';
import { EmptyState, SectionHeader, StatusBadge } from '../ui';

interface ClientQuotesWidgetProps {
  quotes: Quote[];
  leadRecord?: Deal | null;
  currencyRates: Record<string, number>;
  onOpenQuote: (quoteId: string) => void;
}

export function ClientQuotesWidget({ quotes, leadRecord, currencyRates, onOpenQuote }: ClientQuotesWidgetProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-left shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-bold text-slate-800">{quote.quoteNumber}</span>
                <StatusBadge>{quote.status}</StatusBadge>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  {quote.leadId && leadRecord ? leadRecord.name : (leadRecord ? 'Client quote' : 'Client quote')}
                </span>
                <span className="font-bold text-indigo-700">
                  {formatCurrency(subtotal + feesTotal, quote.currency || 'USD', currencyRates)}
                </span>
              </div>
            </button>
          );
        })}
        {quotes.length === 0 && (
          <EmptyState>{leadRecord ? 'No quotes linked to this lead yet.' : 'No quotes linked to this client yet.'}</EmptyState>
        )}
      </div>
    </div>
  );
}
