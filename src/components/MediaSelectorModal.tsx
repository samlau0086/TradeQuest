import React, { useState } from 'react';
import { X, Image as ImageIcon, File, PlaySquare, Upload, CheckCircle2 } from 'lucide-react';
import { useStore, MediaItem } from '../store';
import { useTranslation } from '../lib/i18n';
import { cn } from '../lib/utils';
import { UploadMediaModal } from './UploadMediaModal';

interface MediaSelectorModalProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  allowedTypes?: string[]; // e.g. ['image']
}

export function MediaSelectorModal({ onSelect, onClose, allowedTypes = ['image'] }: MediaSelectorModalProps) {
  const { mediaLibrary, language } = useStore();
  const t = useTranslation(language);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filteredMedia = mediaLibrary.filter(m => {
    if (allowedTypes.length === 0) return true;
    return allowedTypes.some(type => m.type.startsWith(type));
  });

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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
              Select Media
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload New
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
          {filteredMedia.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="w-10 h-10 opacity-50" />
              </div>
              <p className="text-lg font-medium">No suitable media found</p>
              <p className="text-sm mt-1">Upload files to access them globally.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredMedia.map(media => (
                <div 
                  key={media.id} 
                  className="group relative bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    onSelect(media.url);
                    onClose();
                  }}
                >
                  <div className="aspect-square w-full overflow-hidden relative bg-slate-900">
                    {renderPreview(media)}
                    
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                      <div className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-lg">
                        Select
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <p className="text-sm font-medium text-slate-200 truncate" title={media.name}>
                      {media.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showUploadModal && <UploadMediaModal onClose={() => setShowUploadModal(false)} />}
    </div>
  );
}
