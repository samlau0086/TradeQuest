import React from 'react';
import { useStore } from '../store';
import { Trophy, Star, History, Flame, ArrowUpCircle, Award, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function Dashboard() {
  const { userExp, userLevel, userTitle, currentStreak, dailyQuests, expLogs, completeQuest, setView } = useStore();

  const expToNextLevel = 500;
  const progressPercent = (userExp / expToNextLevel) * 100;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-900 border-t border-slate-800 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header/Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Agent Dashboard</h1>
            <p className="text-slate-400">Track your progress and complete daily tasks to level up.</p>
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
                <Star className="w-5 h-5 text-yellow-500" /> Level Progress
              </h2>
              <div className="mb-4 flex justify-between text-sm font-medium">
                <span className="text-slate-300">Level {userLevel}</span>
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
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">Day Streak</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <Target className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">
                    {dailyQuests.filter(q => q.completed).length} / {dailyQuests.length}
                  </div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">Quests Done</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <ArrowUpCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">
                    {expLogs.reduce((sum, log) => {
                      const today = new Date().toISOString().split('T')[0];
                      return log.date.startsWith(today) ? sum + log.amount : sum;
                    }, 0)}
                  </div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">EXP Today</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{expLogs.length}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">Lifetime Events</div>
                </div>
              </div>
            </div>

            {/* Daily Quests List */}
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" /> Daily Quests
              </h2>
              <div className="space-y-3">
                {dailyQuests.map((quest) => (
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
                        <div className={cn("font-bold text-sm", quest.completed ? "text-green-400" : "text-white")}>{quest.title}</div>
                        <div className="text-xs text-slate-400 mt-1">{quest.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-bold text-cyan-400 bg-cyan-950/30 px-3 py-1 rounded-full text-sm">
                        +{quest.expReward} EXP
                      </div>
                      {!quest.completed ? (
                        <div className="flex gap-2">
                          {quest.id === 'q1' && (
                            <button
                               onClick={() => setView('dormant')}
                               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
                            >
                               View Clients
                            </button>
                          )}
                          <button 
                            onClick={() => completeQuest(quest.id)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 rounded-lg transition-colors border border-slate-700"
                          >
                            Manual Complete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 uppercase px-4 py-2">Done</span>
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
