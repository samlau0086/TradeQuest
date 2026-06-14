import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore, KnowledgeItem } from '../store';
import { useAuthStore } from '../authStore';
import { Book, Plus, Trash2, Edit2, Save, X, FileUp, Loader2, FolderDown, Search } from 'lucide-react';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pagedKbs, setPagedKbs] = useState<KnowledgeItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(false);
  
  const relevantKbs = pagedKbs;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedKbs = relevantKbs;
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<KnowledgeItem>>({});
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const pageIds = useMemo(() => paginatedKbs.map(kb => kb.id), [paginatedKbs]);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedSet.has(id));
  const somePageSelected = pageIds.some(id => selectedSet.has(id));

  const fetchKnowledgePage = useCallback(async () => {
    if (!token) return;
    setIsPageLoading(true);
    try {
      const params = new URLSearchParams({
        paginated: 'true',
        page: String(page),
        pageSize: String(pageSize),
        clientId: clientId || 'null'
      });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/knowledge-base?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to fetch knowledge base');
      setPagedKbs(Array.isArray(data.items) ? data.items : []);
      setTotalItems(Number(data.total || 0));
    } catch (error) {
      console.error(error);
      notify(language === 'zh' ? '加载知识库失败。' : 'Failed to load knowledge base.', 'error');
    } finally {
      setIsPageLoading(false);
    }
  }, [clientId, language, notify, page, pageSize, search, token]);

  useEffect(() => {
    fetchKnowledgePage();
  }, [fetchKnowledgePage]);

  useEffect(() => {
    setPage(1);
  }, [clientId, pageSize, search]);

  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => pagedKbs.some(kb => kb.id === id)));
  }, [pagedKbs]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleCreate = () => {
    addKnowledgeItem({ clientId, title: 'New Knowledge Topic', content: 'Enter the knowledge contents here...' });
    window.setTimeout(fetchKnowledgePage, 500);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleSelectPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return Array.from(next);
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      language === 'zh'
        ? `确认删除选中的 ${selectedIds.length} 条知识库吗？此操作会同时删除对应 embedding。`
        : `Delete ${selectedIds.length} selected knowledge item(s)? This also deletes their embeddings.`
    );
    if (!confirmed) return;
    selectedIds.forEach(id => deleteKnowledgeItem(id));
    setSelectedIds([]);
    setEditingId(null);
    window.setTimeout(fetchKnowledgePage, 300);
    notify(
      language === 'zh' ? `已删除 ${selectedIds.length} 条知识库。` : `Deleted ${selectedIds.length} knowledge item(s).`,
      'success'
    );
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
      fetchKnowledgePage();
      notify(
        language === 'zh'
          ? `服务器文件夹同步完成：新增 ${data.imported || 0}，更新 ${data.updated || 0}，未变 ${data.unchanged || 0}，删除 ${data.deleted || 0}，跳过 ${data.skipped || 0}，失败 ${data.failed || 0}。${data.deleteSyncSkipped ? ' 删除同步因达到文件上限而跳过。' : ''}`
          : `Folder sync complete: ${data.imported || 0} created, ${data.updated || 0} updated, ${data.unchanged || 0} unchanged, ${data.deleted || 0} deleted, ${data.skipped || 0} skipped, ${data.failed || 0} failed.${data.deleteSyncSkipped ? ' Delete sync skipped because maxFiles was reached.' : ''}`,
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

      <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={language === 'zh' ? '搜索标题、内容或来源路径...' : 'Search title, content, or source path...'}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-cyan-500"
          />
        </div>
        <button
          onClick={fetchKnowledgePage}
          disabled={isPageLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          {isPageLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {language === 'zh' ? '刷新' : 'Refresh'}
        </button>
      </div>

      {totalItems > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={allPageSelected}
                ref={element => {
                  if (element) element.indeterminate = !allPageSelected && somePageSelected;
                }}
                onChange={toggleSelectPage}
                className="accent-cyan-500"
              />
              {language === 'zh' ? '全选本页' : 'Select page'}
            </label>
            <div className="text-xs text-slate-400">
              {language === 'zh'
                ? `共 ${relevantKbs.length} 条知识库 · 第 ${currentPage} / ${totalPages} 页 · 已选 ${selectedIds.length}`
                : `${relevantKbs.length} knowledge items · Page ${currentPage} of ${totalPages} · ${selectedIds.length} selected`}
            </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  {language === 'zh' ? '取消选择' : 'Clear'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {language === 'zh' ? '批量删除' : 'Delete selected'}
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              {language === 'zh' ? '每页' : 'Per page'}
              <select
                value={pageSize}
                onChange={event => setPageSize(Number(event.target.value))}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
              >
                {[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {language === 'zh' ? '上一页' : 'Prev'}
            </button>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {language === 'zh' ? '下一页' : 'Next'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {relevantKbs.length === 0 && (
          <div className="text-sm text-slate-500 italic">{t('noKnowledgeStr')}</div>
        )}
        {paginatedKbs.map(kb => (
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
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(kb.id)}
                      onChange={() => toggleSelect(kb.id)}
                      className="mt-1 accent-cyan-500"
                      aria-label={language === 'zh' ? `选择 ${kb.title}` : `Select ${kb.title}`}
                    />
                    <div className="min-w-0">
                      <h4 className="font-medium text-cyan-400">{kb.title}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                        <span className={cn(
                          'rounded border px-1.5 py-0.5 font-bold uppercase',
                          kb.clientId ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-slate-700 bg-slate-900 text-slate-400'
                        )}>
                          {kb.clientId ? (language === 'zh' ? '客户知识' : 'Client RAG') : (language === 'zh' ? '全局知识' : 'Global RAG')}
                        </span>
                        <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 uppercase">
                          {kb.sourceType || 'manual'}
                        </span>
                        {kb.sourcePath && (
                          <span className="max-w-[420px] truncate rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-200" title={kb.sourcePath}>
                            {kb.sourcePath}
                          </span>
                        )}
                        {kb.updatedAt && <span>{new Date(kb.updatedAt).toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
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
