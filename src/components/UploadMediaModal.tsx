import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileUp, Loader2 } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { useStore } from '../store';

interface UploadMediaModalProps {
  onClose: () => void;
}

export function UploadMediaModal({ onClose }: UploadMediaModalProps) {
  const { language, addMedia, notify } = useStore();
  const t = useTranslation(language);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    setProgress(0);

    let processedCount = 0;

    files.forEach((file) => {
      // Prevent huge files from crashing base64 memory limit
      if (file.size > 10 * 1024 * 1024) {
        notify(
          language === 'zh'
            ? `${file.name} 太大了，单个文件上限为 10MB。`
            : `${file.name} is too large. The limit is 10MB.`,
          'warning'
        );
        processedCount++;
        setProgress(Math.round((processedCount / files.length) * 100));
        if (processedCount === files.length) {
          setIsUploading(false);
          onClose();
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          addMedia({
            name: file.name,
            type: file.type,
            size: file.size,
            url: event.target.result as string,
          });
        }
        processedCount++;
        setProgress(Math.round((processedCount / files.length) * 100));
        if (processedCount === files.length) {
          setIsUploading(false);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={!isUploading ? onClose : undefined}>
      <div 
        className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            {t('uploadDoc') || 'Upload Media'}
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
            } ${!isUploading ? 'cursor-pointer' : 'cursor-wait'}`}
            onDragOver={!isUploading ? handleDragOver : undefined}
            onDragLeave={!isUploading ? handleDragLeave : undefined}
            onDrop={!isUploading ? handleDrop : undefined}
            onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
          >
            <input 
              type="file" 
              multiple
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
            />
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              {isUploading ? <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /> : <FileUp className="w-6 h-6 text-indigo-400" />}
            </div>
            
            {isUploading ? (
              <div className="w-full">
                <h3 className="text-sm font-medium text-slate-200 mb-2">
                  Uploading files... {progress}%
                </h3>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-medium text-slate-200 mb-1">
                  Click or drag files to upload
                </h3>
                <p className="text-xs text-slate-500">
                  Supports Images, Videos, and Documents (up to 10MB)
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
