import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, Download } from 'lucide-react';

import { useTranslation } from '../lib/i18n';
import { useStore } from '../store';

interface UploadCSVModalProps {
  onClose: () => void;
  onUpload: (file: File) => void;
}

export function UploadCSVModal({ onClose, onUpload }: UploadCSVModalProps) {
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
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        onUpload(file);
      } else {
        notify('Please upload a valid CSV file.', 'warning');
      }
    }
  }, [onUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onUpload(file);
    }
  };

  const handleDownloadExample = () => {
    const exampleCSV = `Name,Company,Country,Status,Tags,Email
John Doe,Tech Corp,USA,Leads,VIP,john@techcorp.com
Jane Smith,Global Inc,UK,Contacted,Follow Up,jane@globalinc.com`;
    const blob = new Blob([exampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'example_pipeline.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            {t('importLeads')}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
              isDragging ? 'border-cyan-500 bg-cyan-950/20' : 'border-slate-700 hover:border-slate-500 bg-slate-950/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
            />
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-200 mb-1">
              {t('clickUpload')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('csvOnly')}
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <button 
              onClick={handleDownloadExample}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors group"
            >
              <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
              {t('downloadExample')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
