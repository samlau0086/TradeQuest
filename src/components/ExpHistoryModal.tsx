import React, { useState } from 'react';
import { useStore } from '../store';
import { X, List, Clock, Trophy, ArrowUpRight, Star, UserPlus, Users, Handshake, Globe, Swords, Crown, MailCheck, BookOpen, Target, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

import { useTranslation } from '../lib/i18n';

export function ExpHistoryModal({ onClose }: { onClose: () => void }) {
  const { expLogs, userLevel, userExp, achievements, language } = useStore();
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState<'history' | 'achievements'>('history');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  // Sort logs by newest first
  const sortedLogs = [...expLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getIcon = (name: string) => {
    switch(name) {
      case 'UserPlus': return <UserPlus className="w-5 h-5" />;
      case 'Users': return <Users className="w-5 h-5" />;
      case 'Handshake': return <Handshake className="w-5 h-5" />;
      case 'Globe': return <Globe className="w-5 h-5" />;
      case 'Earth': return <Globe className="w-5 h-5" />;
      case 'Swords': return <Swords className="w-5 h-5" />;
      case 'Crown': return <Crown className="w-5 h-5" />;
      case 'MailCheck': return <MailCheck className="w-5 h-5" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5" />;
      case 'Target': return <Target className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

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

  const progressCount = achievements.filter(a => a.unlockedAt).length;

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
              {t('profileAndAwards')}
            </h2>
            <div className="text-sm text-slate-400 mt-1">{t('level')} {userLevel} • {userExp} / 500 EXP</div>
          </div>
          
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex bg-slate-800/50 p-2 border-b border-slate-800 shrink-0 mx-6 mt-4 rounded-xl">
          <button 
            onClick={() => setActiveTab('history')}
            className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", 
              activeTab === 'history' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}
          >
            {t('expHistory')}
          </button>
          <button 
            onClick={() => setActiveTab('achievements')}
            className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", 
              activeTab === 'achievements' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}
          >
            {t('achievements')} ({progressCount}/{achievements.length})
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'history' && (
            <>
              <div className="flex justify-end mb-4">
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
              </div>
              
              {sortedLogs.length === 0 ? (
                <div className="text-center text-slate-500 py-12">
                  {t('noExpYet')}
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
            </>
          )}

          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => {
                const unlocked = !!achievement.unlockedAt;
                
                return (
                  <div 
                    key={achievement.id} 
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border transition-all",
                      unlocked ? "bg-slate-800/80 border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.05)]" : "bg-slate-900/50 border-slate-800 opacity-60 grayscale hover:grayscale-0"
                    )}
                  >
                    <div className={cn(
                      "flex shrink-0 w-12 h-12 rounded-full items-center justify-center border-2",
                      unlocked ? "bg-amber-900/30 border-amber-500/50 text-amber-400" : "bg-slate-800 border-slate-700 text-slate-500"
                    )}>
                      {unlocked ? getIcon(achievement.icon) : <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className={cn("font-bold text-sm", unlocked ? "text-amber-400" : "text-slate-400")}>
                        {t(achievement.title)}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                        {t(achievement.description)}
                      </p>
                      <div className="text-xs font-bold text-cyan-500 mt-2 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> {achievement.expReward} EXP
                      </div>
                      {unlocked && achievement.unlockedAt && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          {t('unlocked')}: {formatDate(new Date(achievement.unlockedAt).toISOString())}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
