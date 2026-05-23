import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileUp, Loader2 } from 'lucide-react';

import { useTranslation } from '../lib/i18n';
import { useStore } from '../store';

interface UploadDocModalProps {
  onClose: () => void;
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
}

export function UploadDocModal({ onClose, onUpload, isUploading }: UploadDocModalProps) {
  const { language, notify } = useStore();
  const t = useTranslation(language);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(file => 
        file.name.endsWith('.pdf') || 
        file.name.endsWith('.txt') || 
        file.name.endsWith('.doc') || 
        file.name.endsWith('.docx')
      );
      if (validFiles.length > 0) {
        onUpload(validFiles);
      } else {
        notify('Please upload a valid document (.pdf, .txt, .doc, .docx).', 'warning');
      }
    }
  }, [onUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onUpload(files);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={!isUploading ? onClose : undefined}>
      <div 
        className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            {t('uploadDoc')}
          </h2>
          <button 
            onClick={onClose} 
            disabled={isUploading}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-700 hover:border-slate-500 bg-slate-950/50'
            } ${!isUploading ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
            onDragOver={!isUploading ? handleDragOver : undefined}
            onDragLeave={!isUploading ? handleDragLeave : undefined}
            onDrop={!isUploading ? handleDrop : undefined}
            onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
          >
            <input 
              type="file" 
              accept=".pdf,.txt,.doc,.docx" 
              multiple
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
            />
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              {isUploading ? <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /> : <FileUp className="w-6 h-6 text-indigo-400" />}
            </div>
            <h3 className="text-sm font-medium text-slate-200 mb-1">
              {t('clickOrDragDoc')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('supportsDocs')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
