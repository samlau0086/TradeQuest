import React, { useState } from 'react';
import { useStore, KnowledgeItem } from '../store';
import { useAuthStore } from '../authStore';
import { Book, Plus, Trash2, Edit2, Save, X, FileUp, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

import { useTranslation } from '../lib/i18n';
import { UploadDocModal } from './UploadDocModal';

export function KnowledgeBaseManager({ clientId = null }: { clientId?: string | null }) {
  const { knowledgeBase, addKnowledgeItem, updateKnowledgeItem, deleteKnowledgeItem, language, notify } = useStore();
  const t = useTranslation(language);
  const token = useAuthStore(s => s.token);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const relevantKbs = knowledgeBase.filter(kb => kb.clientId === clientId);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<KnowledgeItem>>({});

  const handleCreate = () => {
    addKnowledgeItem({ clientId, title: 'New Knowledge Topic', content: 'Enter the knowledge contents here...' });
  };
  
  const handleFileUploads = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        const formDataObj = new FormData();
        formDataObj.append('file', file);
        
        const res = await fetch('/api/knowledge-base/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formDataObj
        });
        const data = await res.json();
        
        if (data.success) {
          if (editingId && files.length === 1) {
            setFormData(prev => ({ ...prev, content: (prev.content ? prev.content + '\n\n' : '') + data.text }));
          } else {
            addKnowledgeItem({ clientId, title: file.name, content: data.text });
          }
        } else {
          console.error(`Failed to upload document ${file.name}: ${data.error}`);
        }
      }
    } catch (err) {
      console.error('Upload error', err);
      notify('One or more files failed to upload.', 'error');
    } finally {
      setIsUploading(false);
      setShowUploadModal(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Book className="w-4 h-4" /> {clientId ? t('clientRag') : t('globalRag')}
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowUploadModal(true)} 
            disabled={isUploading}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 flex items-center gap-1 rounded transition-colors disabled:opacity-50" 
            title={t('uploadDoc')}
          >
            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
            {t('uploadDoc')}
          </button>
          <button onClick={handleCreate} className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 flex items-center gap-1 rounded transition-colors" title="Add Topic">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {relevantKbs.length === 0 && (
          <div className="text-sm text-slate-500 italic">{t('noKnowledgeStr')}</div>
        )}
        {relevantKbs.map(kb => (
          <div key={kb.id} className="bg-slate-800/80 p-4 rounded-lg border border-slate-700 space-y-3">
            {editingId === kb.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
                  placeholder={t('topicTitle')}
                />
                <textarea
                  value={formData.content || ''}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500 min-h-[100px] resize-y"
                  placeholder={t('ragContent')}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-2 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      updateKnowledgeItem(kb.id, formData);
                      setEditingId(null);
                    }}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-cyan-400">{kb.title}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingId(kb.id); setFormData(kb); }}
                      className="p-1 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteKnowledgeItem(kb.id)}
                      className="p-1 hover:bg-rose-900/50 text-rose-400 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">{kb.content}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {showUploadModal && (
        <UploadDocModal 
          onClose={() => !isUploading && setShowUploadModal(false)}
          onUpload={handleFileUploads}
          isUploading={isUploading}
        />
      )}
    </div>
  );
}
