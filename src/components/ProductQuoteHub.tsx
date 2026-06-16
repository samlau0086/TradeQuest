import React, { useState } from 'react';
import { FileText, Package } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { ProductsList } from './ProductsList';
import { QuotesList } from './QuotesList';
import { SegmentedControl } from './ui';

interface ProductQuoteHubProps {
  initialTab?: 'products' | 'quotes';
}

export function ProductQuoteHub({ initialTab = 'products' }: ProductQuoteHubProps) {
  const { language } = useStore();
  const t = useTranslation(language);
  const [tab, setTab] = useState<'products' | 'quotes'>(initialTab);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 p-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('productQuotes') || (language === 'zh' ? '产品与报价' : 'Products & Quotes')}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {language === 'zh' ? '集中管理产品目录、阶梯价格和销售报价。' : 'Manage product catalog, bulk pricing, and sales quotes in one place.'}
          </p>
        </div>
        <SegmentedControl<'products' | 'quotes'>
          value={tab}
          onChange={setTab}
          className="w-full sm:w-auto"
          options={[
            { value: 'products', label: t('products'), icon: <Package className="h-4 w-4" /> },
            { value: 'quotes', label: t('quotes'), icon: <FileText className="h-4 w-4" /> }
          ]}
        />
      </div>

      {tab === 'products' ? <ProductsList embedded /> : <QuotesList embedded />}
    </div>
  );
}
