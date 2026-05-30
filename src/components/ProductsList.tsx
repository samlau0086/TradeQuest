import React, { useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { Package, Plus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { ProductFormModal } from './ProductFormModal';

export function ProductsList() {
  const { products, deleteProduct, language } = useStore();
  const t = useTranslation(language);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProductId, setEditProductId] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.salesPoints || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (id: string) => {
    setEditProductId(id);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteProduct(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-900 overflow-y-auto p-6">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Package className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('productsExplorer')}</h1>
              <p className="text-sm text-slate-400">{filteredProducts.length} {t('items')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={t('searchProducts')} 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <button 
              onClick={() => { setEditProductId(undefined); setShowModal(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('newProduct')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors group relative">
              <div className="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                {product.imageUrl ? (
                   <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-12 h-12 text-slate-700" />
                )}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => handleEdit(product.id)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="p-2 bg-rose-950 hover:bg-rose-900 text-rose-400 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-200 line-clamp-1">{product.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mb-3 font-mono">{product.sku}</p>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 h-10">
                  {product.description || t('noDescription')}
                </p>
                {product.salesPoints && (
                  <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-cyan-400">{t('salesPoints') || 'Sales Points'}</div>
                    <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-slate-400">{product.salesPoints}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                   {product.bulkPrices?.slice(0, 2).map((bp, i) => (
                     <span key={i} className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded">
                       {t('minQuantityPrefix')} {bp.minQuantity}: ${bp.price}
                     </span>
                   ))}
                   {(product.bulkPrices?.length || 0) > 2 && (
                     <span className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded">...</span>
                   )}
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
              <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-400 mb-1">{t('noProducts')}</h3>
              <p className="text-slate-500 text-sm">{t('noProductsDesc')}</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ProductFormModal 
          onClose={() => setShowModal(false)} 
          productId={editProductId}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">{t('deleteProductTitle')}</h3>
            <p className="text-slate-400 mb-6 text-sm">{t('deleteProductContent')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">{t('cancel')}</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow font-medium transition-colors">{t('deleteClientButton')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
