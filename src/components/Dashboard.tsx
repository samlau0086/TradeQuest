import React from 'react';
import { useStore } from '../store';
import { Trophy, Star, History, Flame, ArrowUpCircle, Award, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';

export function Dashboard() {
  const { userExp, userLevel, userTitle, currentStreak, dailyQuests, expLogs, setView, skipQuest, language } = useStore();
  const t = useTranslation(language);

  const expToNextLevel = 500;
  const progressPercent = (userExp / expToNextLevel) * 100;

  const visibleQuests = dailyQuests.filter(q => {
    if (!q.skippedUntil) return true;
    return new Date(q.skippedUntil).getTime() < Date.now();
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-900 border-t border-slate-800 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header/Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('Agent Dashboard')}</h1>
            <p className="text-slate-400">{t('Track your progress and complete daily tasks to level up.')}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm font-bold text-cyan-400 uppercase tracking-wider">{userTitle}</div>
              <div className="text-3xl font-black text-white">LVL {userLevel}</div>
            </div>
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center border-4 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Trophy className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main XP Progress Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" /> {t('Level Progress')}
              </h2>
              <div className="mb-4 flex justify-between text-sm font-medium">
                <span className="text-slate-300">{t('level')} {userLevel}</span>
                <span className="text-cyan-400">{userExp} / {expToNextLevel} EXP</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner mb-6">
                <div 
                  className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{currentStreak}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">{t('Day Streak')}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <Target className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">
                    {visibleQuests.filter(q => q.completed).length} / {visibleQuests.length}
                  </div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">{t('questsDone')}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <ArrowUpCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">
                    {expLogs.reduce((sum, log) => {
                      const today = new Date().toISOString().split('T')[0];
                      return log.date.startsWith(today) ? sum + log.amount : sum;
                    }, 0)}
                  </div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">{t('EXP Today')}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{expLogs.length}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">{t('Lifetime Events')}</div>
                </div>
              </div>
            </div>

            {/* Daily Quests List */}
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" /> {t('quests')}
              </h2>
              <div className="space-y-3">
                {visibleQuests.map((quest) => (
                  <div 
                    key={quest.id} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
                      quest.completed ? "bg-green-950/20 border-green-900/50" : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg"
                    )}
                  >
                    <div className="flex gap-4 items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border",
                        quest.completed ? "bg-green-500/20 border-green-500/50 text-green-400" : "bg-slate-800 border-slate-700 text-slate-500"
                      )}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={cn("font-bold text-sm", quest.completed ? "text-green-400" : "text-white")}>{t(quest.title)}</div>
                        <div className="text-xs text-slate-400 mt-1">{t(quest.description)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-bold text-cyan-400 bg-cyan-950/30 px-3 py-1 rounded-full text-sm">
                        +{quest.expReward} EXP
                      </div>
                      {!quest.completed ? (
                        <div className="flex gap-2">
                          {(quest.id === 'q1' || quest.id === 'q2' || quest.id === 'q3') && (
                            <button
                               onClick={() => {
                                 if (quest.id === 'q1') setView('dormant');
                                 if (quest.id === 'q2') setView('leads');
                                 if (quest.id === 'q3') setView('followups');
                               }}
                               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
                            >
                               {t('viewClients')}
                            </button>
                          )}
                           <select
                             onChange={(e) => {
                               if (e.target.value) {
                                 skipQuest(quest.id, parseInt(e.target.value, 10));
                                 e.target.value = "";
                               }
                             }}
                             className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 rounded-lg transition-colors border border-slate-700 cursor-pointer outline-none"
                          >
                             <option value="">{t('skip')}</option>
                             <option value="1">{t('skip1')}</option>
                             <option value="3">{t('skip3')}</option>
                             <option value="5">{t('skip5')}</option>
                             <option value="7">{t('skip7')}</option>
                             <option value="15">{t('skip15')}</option>
                             <option value="30">{t('skip30')}</option>
                          </select>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 uppercase px-4 py-2">{t('done')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column - Logs */}
          <div className="bg-slate-950/50 rounded-2xl border border-slate-800 shadow-sm flex flex-col h-[800px]">
             <div className="p-6 border-b border-slate-800">
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <History className="w-5 h-5 text-indigo-400" /> EXP History
               </h2>
             </div>
             <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
               <div className="space-y-3">
                 {expLogs.length === 0 ? (
                   <div className="text-center text-slate-500 py-12 text-sm">
                     No experience points earned yet. <br/> Complete quests to level up!
                   </div>
                 ) : (
                   expLogs.map(log => (
                     <div key={log.id} className="flex gap-4 p-3 rounded-lg hover:bg-slate-900/80 transition-colors group">
                       <div className="pt-1">
                         <div className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-900/50 flex items-center justify-center shadow-inner group-hover:bg-cyan-900 transition-colors">
                           <ArrowUpCircle className="w-4 h-4 text-cyan-400" />
                         </div>
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="font-medium text-sm text-slate-200 truncate">{log.reason}</div>
                         <div className="text-xs text-slate-500 mt-1">
                           {new Date(log.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                         </div>
                       </div>
                       <div className="font-bold text-cyan-400 text-sm whitespace-nowrap">
                         +{log.amount} EXP
                       </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
