import React, { useState } from 'react';
import { useStore, KnowledgeItem } from '../store';
import { useAuthStore } from '../authStore';
import { Book, Plus, Trash2, Edit2, Save, X, FileUp, Loader2, FolderDown } from 'lucide-react';
import { cn } from '../lib/utils';

import { useTranslation } from '../lib/i18n';
import { UploadDocModal } from './UploadDocModal';

export function KnowledgeBaseManager({ clientId = null }: { clientId?: string | null }) {
  const { knowledgeBase, addKnowledgeItem, updateKnowledgeItem, deleteKnowledgeItem, fetchKnowledgeBase, language, notify, llmConfigs, activeLLMId, llmMappings } = useStore();
  const t = useTranslation(language);
  const token = useAuthStore(s => s.token);
  const [isUploading, setIsUploading] = useState(false);
  const [isImportingFolder, setIsImportingFolder] = useState(false);
  const [folderImportPath, setFolderImportPath] = useState('');
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

  const handleImportFolder = async () => {
    if (!token) return;
    setIsImportingFolder(true);
    try {
      const embeddingLlmId = llmMappings['embedding'] || activeLLMId;
      const llmConfig = embeddingLlmId ? llmConfigs.find(config => config.id === embeddingLlmId) : undefined;
      const response = await fetch('/api/knowledge-base/import-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          folder: folderImportPath.trim(),
          clientId,
          maxFiles: 300,
          llmConfig
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to import knowledge folder');
      fetchKnowledgeBase();
      notify(
        language === 'zh'
          ? `已导入服务器文件夹：新增 ${data.imported || 0}，更新 ${data.updated || 0}，跳过 ${data.skipped || 0}，失败 ${data.failed || 0}。`
          : `Folder import complete: ${data.imported || 0} created, ${data.updated || 0} updated, ${data.skipped || 0} skipped, ${data.failed || 0} failed.`,
        data.failed ? 'warning' : 'success'
      );
    } catch (error: any) {
      notify(error?.message || (language === 'zh' ? '导入服务器文件夹失败。' : 'Failed to import server folder.'), 'error');
    } finally {
      setIsImportingFolder(false);
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

      {!clientId && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {language === 'zh' ? '服务器知识库文件夹' : 'Server Knowledge Folder'}
              </label>
              <input
                value={folderImportPath}
                onChange={event => setFolderImportPath(event.target.value)}
                placeholder={language === 'zh' ? '留空扫描配置根目录，或输入相对路径，如 products/solar' : 'Blank for configured root, or a relative path like products/solar'}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                {language === 'zh'
                  ? '服务端需配置 KNOWLEDGE_IMPORT_DIR 或 RAG_IMPORT_DIR；前端只能导入该目录下的文件。'
                  : 'Server must set KNOWLEDGE_IMPORT_DIR or RAG_IMPORT_DIR. Only files under that root can be imported.'}
              </p>
            </div>
            <button
              onClick={handleImportFolder}
              disabled={isImportingFolder}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {isImportingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderDown className="h-4 w-4" />}
              {language === 'zh' ? '导入文件夹' : 'Import Folder'}
            </button>
          </div>
        </div>
      )}

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
