import React from 'react';
import { FileText } from 'lucide-react';
import { Deal, Quote, useStore } from '../../store';
import { formatCurrency } from '../../lib/currency';
import { ConversationSectionHeader } from '../inbox-ui/ConversationSectionCard';
import { ConversationToolbarPill } from '../inbox-ui/ConversationToolbar';

interface ClientQuotesWidgetProps {
  quotes: Quote[];
  leadRecord?: Deal | null;
  currencyRates: Record<string, number>;
  onOpenQuote: (quoteId: string) => void;
}

export function ClientQuotesWidget({ quotes, leadRecord, currencyRates, onOpenQuote }: ClientQuotesWidgetProps) {
  const { language } = useStore();
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <ConversationSectionHeader
        icon={<FileText className="h-4 w-4 text-slate-500" />}
        title={label('报价', 'Quotes')}
        className="mb-4"
      />
      <div className="space-y-2">
        {quotes.map(quote => {
          const subtotal = quote.items.reduce((sum, item) => sum + (item.total || item.quantity * item.unitPrice || 0), 0);
          const feesTotal = quote.fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
          return (
            <button
              key={quote.id}
              type="button"
              onClick={() => onOpenQuote(quote.id)}
              className="w-full rounded-[20px] border border-slate-200 bg-slate-50/80 p-3 text-left shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-bold text-slate-800">{quote.quoteNumber}</span>
                <ConversationToolbarPill tone="default">{quote.status}</ConversationToolbarPill>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  {quote.leadId && leadRecord ? leadRecord.name : label('客户报价', 'Client quote')}
                </span>
                <span className="font-bold text-indigo-700">
                  {formatCurrency(subtotal + feesTotal, quote.currency || 'USD', currencyRates)}
                </span>
              </div>
            </button>
          );
        })}
        {quotes.length === 0 && (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            {leadRecord ? label('该 Lead 还没有关联报价。', 'No quotes linked to this lead yet.') : label('该客户还没有关联报价。', 'No quotes linked to this client yet.')}
          </div>
        )}
      </div>
    </div>
  );
}
