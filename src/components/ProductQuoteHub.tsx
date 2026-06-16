import { useState } from 'react';
import { FileText, Package } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { ProductsList } from './ProductsList';
import { QuotesList } from './QuotesList';
import { CRMWorkspaceLayout, PageHeader, SegmentedControl } from './ui';

interface ProductQuoteHubProps {
  initialTab?: 'products' | 'quotes';
}

export function ProductQuoteHub({ initialTab = 'products' }: ProductQuoteHubProps) {
  const { language } = useStore();
  const t = useTranslation(language);
  const [tab, setTab] = useState<'products' | 'quotes'>(initialTab);

  return (
    <CRMWorkspaceLayout
      className="p-6"
      header={(
        <PageHeader
          icon={<Package className="h-5 w-5 text-cyan-400" />}
          title={t('productQuotes') || (language === 'zh' ? '产品与报价' : 'Products & Quotes')}
          description={language === 'zh' ? '集中管理产品目录、阶梯价格和销售报价。' : 'Manage product catalog, bulk pricing, and sales quotes in one place.'}
          actions={(
            <SegmentedControl<'products' | 'quotes'>
              value={tab}
              onChange={setTab}
              className="w-full sm:w-auto"
              options={[
                { value: 'products', label: t('products'), icon: <Package className="h-4 w-4" /> },
                { value: 'quotes', label: t('quotes'), icon: <FileText className="h-4 w-4" /> },
              ]}
            />
          )}
        />
      )}
    >
      {tab === 'products' ? <ProductsList embedded /> : <QuotesList embedded />}
    </CRMWorkspaceLayout>
  );
}
