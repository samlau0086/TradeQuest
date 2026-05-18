import React, { useState } from 'react';
import { useStore, Product } from '../store';
import { useTranslation } from '../lib/i18n';
import { X, Plus, Trash2 } from 'lucide-react';

interface ProductFormModalProps {
  onClose: () => void;
  productId?: string;
  initialData?: Partial<Product>;
  onSave?: (id: string) => void;
}

export function ProductFormModal({ onClose, productId, initialData, onSave }: ProductFormModalProps) {
  const { products, addProduct, updateProduct, language } = useStore();
  const t = useTranslation(language);
  const existingProduct = productId ? products.find(p => p.id === productId) : null;

  const [sku, setSku] = useState(existingProduct?.sku || initialData?.sku || '');
  const [name, setName] = useState(existingProduct?.name || initialData?.name || '');
  const [description, setDescription] = useState(existingProduct?.description || initialData?.description || '');
  const [imageUrl, setImageUrl] = useState(existingProduct?.imageUrl || initialData?.imageUrl || '');
  const [bulkPrices, setBulkPrices] = useState<{minQuantity: number, price: number}[]>(
    existingProduct?.bulkPrices || initialData?.bulkPrices || [{ minQuantity: 1, price: 0 }]
  );

  const handleSubmit = async () => {
    if (!name) {
      alert("Name is required");
      return;
    }

    const productData = {
      sku,
      name,
      description,
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-lg font-bold text-white">
            {existingProduct ? 'Edit Product' : 'New Product'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Product Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="e.g. Wireless Mouse" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">SKU</label>
              <input value={sku} onChange={e => setSku(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="e.g. WM-01" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Product details..."></textarea>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Image URL</label>
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="https://example.com/image.png" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Bulk Pricing</label>
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
              <Plus className="w-3 h-3" /> Add Price Tier
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
            {existingProduct ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
