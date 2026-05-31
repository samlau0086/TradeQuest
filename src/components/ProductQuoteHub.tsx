import React, { useState } from 'react';
import { FileText, Package } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { cn } from '../lib/utils';
import { ProductsList } from './ProductsList';
import { QuotesList } from './QuotesList';

interface ProductQuoteHubProps {
  initialTab?: 'products' | 'quotes';
}

export function ProductQuoteHub({ initialTab = 'products' }: ProductQuoteHubProps) {
  const { language } = useStore();
  const t = useTranslation(language);
  const [tab, setTab] = useState<'products' | 'quotes'>(initialTab);

  const tabButton = (id: 'products' | 'quotes', label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors',
        tab === id
          ? 'bg-slate-800 text-white shadow-sm'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 p-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('productQuotes') || (language === 'zh' ? '产品与报价' : 'Products & Quotes')}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {language === 'zh' ? '集中管理产品目录、阶梯价格和销售报价。' : 'Manage product catalog, bulk pricing, and sales quotes in one place.'}
          </p>
        </div>
        <div className="flex w-full rounded-lg border border-slate-800 bg-slate-950 p-1 sm:w-auto">
          {tabButton('products', t('products'), <Package className="h-4 w-4" />)}
          {tabButton('quotes', t('quotes'), <FileText className="h-4 w-4" />)}
        </div>
      </div>

      {tab === 'products' ? <ProductsList embedded /> : <QuotesList embedded />}
    </div>
  );
}
