import React, { useState } from 'react';
import { useStore, Product } from '../store';
import { useAuthStore } from '../authStore';
import { useTranslation } from '../lib/i18n';
import { X, Plus, Trash2, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { MediaSelectorModal } from './MediaSelectorModal';

interface ProductFormModalProps {
  onClose: () => void;
  productId?: string;
  initialData?: Partial<Product>;
  onSave?: (id: string) => void;
}

export function ProductFormModal({ onClose, productId, initialData, onSave }: ProductFormModalProps) {
  const { products, addProduct, updateProduct, language, notify, llmConfigs, llmMappings, activeLLMId, incrementAgentHubTaskCount } = useStore();
  const t = useTranslation(language);
  const existingProduct = productId ? products.find(p => p.id === productId) : null;

  const [sku, setSku] = useState(existingProduct?.sku || initialData?.sku || '');
  const [name, setName] = useState(existingProduct?.name || initialData?.name || '');
  const [description, setDescription] = useState(existingProduct?.description || initialData?.description || '');
  const [salesPoints, setSalesPoints] = useState(existingProduct?.salesPoints || initialData?.salesPoints || '');
  const [imageUrl, setImageUrl] = useState(existingProduct?.imageUrl || initialData?.imageUrl || '');
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [generatingSalesPoints, setGeneratingSalesPoints] = useState(false);
  const [bulkPrices, setBulkPrices] = useState<{minQuantity: number, price: number}[]>(
    existingProduct?.bulkPrices || initialData?.bulkPrices || [{ minQuantity: 1, price: 0 }]
  );

  const handleSubmit = async () => {
    if (!name) {
      notify('Product name is required.', 'warning');
      return;
    }

    const productData = {
      sku,
      name,
      description,
      salesPoints,
      imageUrl,
      bulkPrices,
      comments: existingProduct?.comments || [],
    };

    if (existingProduct) {
      updateProduct(existingProduct.id, productData);
      onSave?.(existingProduct.id);
    } else {
      addProduct(productData);
      // Hack to notify list of new item, since we don't return ID from store's sync function, but it triggers state update anyway
      onSave?.('');
    }
    onClose();
  };

  const addBulkPrice = () => {
    setBulkPrices([...bulkPrices, { minQuantity: 1, price: 0 }]);
  };

  const updateBulkPrice = (index: number, field: keyof {minQuantity: number, price: number}, value: number) => {
    const newPrices = [...bulkPrices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    setBulkPrices(newPrices);
  };

  const removeBulkPrice = (index: number) => {
    const newPrices = [...bulkPrices];
    newPrices.splice(index, 1);
    setBulkPrices(newPrices);
  };

  const handleGenerateSalesPoints = async () => {
    if (!name.trim() && !description.trim()) {
      notify(language === 'zh' ? '请先填写产品名称或描述。' : 'Please enter a product name or description first.', 'warning');
      return;
    }
    const llmId = llmMappings.agent_context_suggestions || llmMappings.drafting || activeLLMId;
    const llmConfig = llmId ? llmConfigs.find(config => config.id === llmId) : null;
    if (!llmConfig) {
      notify(language === 'zh' ? '请先在 AI & Integrations 配置可用模型。' : 'Please configure an AI model in AI & Integrations first.', 'warning');
      return;
    }

    setGeneratingSalesPoints(true);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          command: `Generate concise product selling points for this product catalog item. Output language: ${language === 'zh' ? 'Chinese' : 'English'}.
Rules:
- Use only the provided product facts. Do not invent certifications, specs, prices, delivery promises, or performance claims.
- Focus on practical customer value, target use cases, buying reasons, and differentiators implied by the description.
- Return 4-6 bullet points, one per line, without markdown heading.`,
          context: {
            systemLanguage: language,
            product: {
              sku,
              name,
              description,
              bulkPrices
            }
          },
          llmConfig,
          skipKnowledgeBase: true
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to generate sales points.');
      setSalesPoints(String(data.result || '').trim());
      incrementAgentHubTaskCount('context_suggestion_agent');
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : 'Failed to generate sales points.', 'error');
    } finally {
      setGeneratingSalesPoints(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-lg font-bold text-white">
            {existingProduct ? t('editProduct') : t('newProduct')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('productName')}</label>
              <input value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="e.g. Wireless Mouse" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('sku')}</label>
              <input value={sku} onChange={e => setSku(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="e.g. WM-01" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t('description')}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Product details..."></textarea>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('salesPoints') || 'Sales Points'}</label>
              <button
                type="button"
                onClick={handleGenerateSalesPoints}
                disabled={generatingSalesPoints}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingSalesPoints ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {t('aiGenerate') || 'AI Generate'}
              </button>
            </div>
            <textarea
              value={salesPoints}
              onChange={e => setSalesPoints(e.target.value)}
              rows={5}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder={language === 'zh' ? '例如：适合光伏电站远程监控；帮助降低巡检成本...' : 'e.g. Ideal for remote solar plant monitoring; helps reduce inspection cost...'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">{t('imageUrl')}</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input 
                  value={imageUrl} 
                  onChange={e => setImageUrl(e.target.value)} 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" 
                  placeholder="https://example.com/image.png" 
                />
              </div>
              <button 
                type="button"
                onClick={() => setShowMediaSelector(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium text-slate-200 transition-colors whitespace-nowrap"
              >
                Media Library
              </button>
            </div>
            {imageUrl && (
              <div className="mt-2 flex justify-start">
                <img src={imageUrl} alt="Preview" className="h-16 w-16 object-cover rounded border border-slate-700" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">{t('bulkPricing')}</label>
            {bulkPrices.map((bp, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg flex items-center px-3">
                  <span className="text-slate-500 text-sm border-r border-slate-700 pr-2 mr-2">≥</span>
                  <input 
                    type="number" 
                    value={bp.minQuantity} 
                    onChange={e => updateBulkPrice(idx, 'minQuantity', parseInt(e.target.value) || 0)}
                    className="w-full bg-transparent border-none py-2 text-sm text-slate-200 focus:outline-none" 
                    placeholder="Min Qty"
                  />
                </div>
                <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg flex items-center px-3">
                  <span className="text-slate-500 text-sm border-r border-slate-700 pr-2 mr-2">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={bp.price} 
                    onChange={e => updateBulkPrice(idx, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent border-none py-2 text-sm text-slate-200 focus:outline-none" 
                    placeholder="Price"
                  />
                </div>
                <button 
                  onClick={() => removeBulkPrice(idx)}
                  className="p-2 bg-rose-950 hover:bg-rose-900 border border-rose-900 text-rose-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button 
              onClick={addBulkPrice}
              className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors mt-2"
            >
              <Plus className="w-3 h-3" /> {t('addPriceTier')}
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40"
          >
            {existingProduct ? t('saveChanges') : t('createProduct')}
          </button>
        </div>
      </div>

      {showMediaSelector && (
        <MediaSelectorModal 
          onSelect={(url) => setImageUrl(url)}
          onClose={() => setShowMediaSelector(false)}
          allowedTypes={['image']}
        />
      )}
    </div>
  );
}
