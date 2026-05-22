import React, { useState } from 'react';
import { Upload, File, Image as ImageIcon, Trash2, Copy, PlaySquare, CheckCircle2 } from 'lucide-react';
import { useStore, MediaItem } from '../store';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';
import { UploadMediaModal } from './UploadMediaModal';

export function MediaLibrary() {
  const { mediaLibrary, deleteMedia, language } = useStore();
  const t = useTranslation(language);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderPreview = (media: MediaItem) => {
    if (media.type.startsWith('image/')) {
      return (
        <img 
          src={media.url} 
          alt={media.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      );
    } else if (media.type.startsWith('video/')) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
          <PlaySquare className="w-12 h-12 opacity-50" />
        </div>
      );
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
          <File className="w-12 h-12 opacity-50" />
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm z-10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-400" /> 
            {t('mediaLibrary') || 'Media Library'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage all your uploaded media assets centrally.</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {t('uploadDoc') || 'Upload Media'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
        {mediaLibrary.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-10 h-10 opacity-50" />
            </div>
            <p className="text-lg font-medium">No media files found</p>
            <p className="text-sm mt-1">Upload files to access them globally.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {mediaLibrary.map(media => (
              <div key={media.id} className="group relative bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all duration-300">
                <div className="aspect-square w-full overflow-hidden relative bg-slate-900">
                  {renderPreview(media)}
                  
                  {/* Action Overlay */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                    <button 
                      onClick={() => copyToClipboard(media.url, media.id)}
                      className="p-2 bg-slate-800 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                      title="Copy Link"
                    >
                      {copiedId === media.id ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => deleteMedia(media.id)}
                      className="p-2 bg-slate-800 hover:bg-red-600 text-white rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-200 truncate" title={media.name}>
                    {media.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-500 uppercase">
                      {media.type.split('/')[1] || media.type}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatSize(media.size)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUploadModal && (
        <UploadMediaModal onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  );
}
