import React, { useState } from 'react';
import { useStore } from '../store';
import { X, List, Clock, Trophy, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function ExpHistoryModal({ onClose }: { onClose: () => void }) {
  const { expLogs, userLevel, userExp } = useStore();
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  // Sort logs by newest first
  const sortedLogs = [...expLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Experience History
            </h2>
            <div className="text-sm text-slate-400 mt-1">Level {userLevel} • {userExp} / 500 EXP</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-1.5 rounded-md text-sm transition-colors", viewMode === 'list' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('timeline')}
                className={cn("p-1.5 rounded-md text-sm transition-colors", viewMode === 'timeline' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}
                title="Timeline View"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {sortedLogs.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              No experience points earned yet. Start completing quests!
            </div>
          ) : (
            viewMode === 'list' ? (
              <div className="space-y-3">
                {sortedLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div>
                      <div className="font-medium text-slate-200">{log.reason}</div>
                      <div className="text-xs text-slate-500 mt-1">{formatDate(log.date)}</div>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-cyan-400 text-lg">
                      +{log.amount} <span className="text-xs text-cyan-500 font-medium">EXP</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-700 before:to-transparent py-4">
                {sortedLogs.map((log, i) => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-slate-900 bg-cyan-900 text-cyan-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute -left-10 md:static">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    
                    <div className="w-full md:w-[calc(50%-2rem)] bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 shadow-sm hover:border-cyan-500/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-cyan-400">+{log.amount} EXP</div>
                        <div className="text-[10px] text-slate-500 font-medium px-2 py-0.5 bg-slate-900 rounded">{formatShortDate(log.date)}</div>
                      </div>
                      <div className="text-sm font-medium text-slate-200">{log.reason}</div>
                      <div className="text-xs text-slate-500 mt-1">{formatTime(log.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
