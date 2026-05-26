import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Trophy, Star, History, Flame, ArrowUpCircle, Award, Target, CheckCircle2, ChevronDown, Clock, Mail, Users, DollarSign, BarChart3, Activity, Send, Globe2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';

const PIPELINE_STAGES = ['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'];

function MetricCard({ icon, label, value, subtext, tone = 'cyan' }: { icon: React.ReactNode; label: string; value: string | number; subtext?: string; tone?: 'cyan' | 'emerald' | 'amber' | 'rose' }) {
  const toneClass = {
    cyan: 'text-cyan-400 bg-cyan-950/30 border-cyan-900/40',
    emerald: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40',
    amber: 'text-amber-400 bg-amber-950/30 border-amber-900/40',
    rose: 'text-rose-400 bg-rose-950/30 border-rose-900/40'
  }[tone];

  return (
    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 shadow-sm min-h-[112px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500 uppercase font-bold">{label}</div>
          <div className="text-2xl font-black text-white mt-2">{value}</div>
        </div>
        <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center shrink-0', toneClass)}>
          {icon}
        </div>
      </div>
      {subtext && <div className="text-xs text-slate-500 mt-3 truncate">{subtext}</div>}
    </div>
  );
}

function BarListChart({ rows, emptyLabel }: { rows: { label: string; value: number; color: string }[]; emptyLabel: string }) {
  const maxValue = Math.max(1, ...rows.map(row => row.value));
  const hasData = rows.some(row => row.value > 0);

  if (!hasData) {
    return <div className="h-48 flex items-center justify-center text-sm text-slate-500">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-4">
      {rows.map(row => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">{row.label}</span>
            <span className="font-bold text-slate-200">{row.value}</span>
          </div>
          <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div className={cn('h-full rounded-full transition-all duration-700', row.color)} style={{ width: `${Math.max(4, (row.value / maxValue) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SparklineChart({ points, color = 'stroke-cyan-400' }: { points: number[]; color?: string }) {
  const width = 320;
  const height = 120;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const path = points.map((value, index) => {
    const x = index * step;
    const y = height - (value / max) * (height - 14) - 7;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="h-40">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
        <path d={path} fill="none" className={cn(color, 'stroke-[3]')} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((value, index) => {
          const x = index * step;
          const y = height - (value / max) * (height - 14) - 7;
          return <circle key={index} cx={x} cy={y} r="3.5" className="fill-slate-950 stroke-cyan-400 stroke-2" />;
        })}
      </svg>
      <div className="grid grid-cols-7 text-[10px] text-slate-500">
        {points.map((_, index) => <span key={index} className="text-center">{index === points.length - 1 ? 'Today' : `-${points.length - 1 - index}d`}</span>)}
      </div>
    </div>
  );
}

function DonutChart({ rows, emptyLabel }: { rows: { label: string; value: number; color: string }[]; emptyLabel: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total === 0) {
    return <div className="h-48 flex items-center justify-center text-sm text-slate-500">{emptyLabel}</div>;
  }

  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" className="w-32 h-32 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r="42" className="fill-none stroke-slate-900" strokeWidth="16" />
        {rows.map(row => {
          const dash = (row.value / total) * 263.89;
          const circle = (
            <circle
              key={row.label}
              cx="60"
              cy="60"
              r="42"
              className={cn('fill-none', row.color)}
              strokeWidth="16"
              strokeDasharray={`${dash} 263.89`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="space-y-3 min-w-0 flex-1">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 flex items-center gap-2 min-w-0">
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', row.color.replace('stroke-', 'bg-'))} />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="font-bold text-slate-200">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { userExp, userLevel, userTitle, currentStreak, dailyQuests, expLogs, setView, skipQuest, language, emails, clients, deals, quotes, logs, leadCampaigns, publicClients } = useStore();
  const t = useTranslation(language);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const expToNextLevel = 500;
  const progressPercent = (userExp / expToNextLevel) * 100;

  const visibleQuests = dailyQuests.filter(q => {
    if (!q.skippedUntil) return true;
    return new Date(q.skippedUntil).getTime() < Date.now();
  });

  const now = Date.now();
  const upcomingTodos = emails.filter(e => {
    if (!e.todoAt) return false;
    const todoTime = new Date(e.todoAt).getTime();
    // approaching = past due or within next 24 hours
    return todoTime - now < 24 * 60 * 60 * 1000 && !e.pendingDelete;
  }).sort((a, b) => new Date(a.todoAt!).getTime() - new Date(b.todoAt!).getTime());

  const operations = useMemo(() => {
    const today = new Date();
    const dayKeys = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });

    const clientStageRows = PIPELINE_STAGES.map((stage, index) => ({
      label: t(stage),
      value: clients.filter(client => client.status === stage).length,
      color: ['bg-sky-500', 'bg-cyan-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-emerald-500'][index]
    }));

    const dealStageRows = PIPELINE_STAGES.map((stage, index) => ({
      label: t(stage),
      value: deals.filter(deal => deal.status === stage).length,
      color: ['bg-sky-500', 'bg-cyan-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-emerald-500'][index]
    }));

    const activityTrend = dayKeys.map(key => (
      logs.filter(log => log.date.slice(0, 10) === key).length +
      emails.filter(email => email.date.slice(0, 10) === key).length
    ));

    const emailRows = [
      { label: t('Unread'), value: emails.filter(email => !email.read && (email.type === 'inbox' || email.type === 'inbound')).length, color: 'stroke-rose-400' },
      { label: t('Inbound'), value: emails.filter(email => email.type === 'inbox' || email.type === 'inbound').length, color: 'stroke-cyan-400' },
      { label: t('Sent'), value: emails.filter(email => email.type === 'sent' || email.type === 'outbound').length, color: 'stroke-emerald-400' },
      { label: t('Scheduled'), value: emails.filter(email => email.type === 'scheduled').length, color: 'stroke-amber-400' }
    ];

    const campaignRows = [
      { label: t('Imported Leads'), value: leadCampaigns.reduce((sum, campaign) => sum + (campaign.importedCount || 0), 0), color: 'bg-emerald-500' },
      { label: t('Active Campaigns'), value: leadCampaigns.filter(campaign => campaign.status === 'running').length, color: 'bg-cyan-500' },
      { label: t('Saved Campaigns'), value: leadCampaigns.length, color: 'bg-violet-500' },
      { label: t('Public Pool'), value: publicClients.length, color: 'bg-amber-500' }
    ];

    const dealValue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
    const wonValue = deals.filter(deal => deal.status === 'Closed Won').reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
    const openTodos = emails.filter(email => email.todoAt && !email.pendingDelete).length;
    const quoteDrafts = quotes.filter(quote => String(quote.status).toLowerCase() === 'draft').length;
    const conversionRate = clients.length > 0 ? Math.round((clients.filter(client => client.status === 'Closed Won').length / clients.length) * 100) : 0;

    return {
      clientStageRows,
      dealStageRows,
      activityTrend,
      emailRows,
      campaignRows,
      dealValue,
      wonValue,
      openTodos,
      quoteDrafts,
      conversionRate
    };
  }, [clients, deals, emails, leadCampaigns, logs, publicClients, quotes, t]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-900 border-t border-slate-800 p-6">
      <div className="w-full space-y-8 flex flex-col min-h-full">
        
        {/* Header/Banner */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
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

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" /> {t('Operations Monitor')}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{t('Lead acquisition, pipeline health, communication load, and conversion signals.')}</p>
            </div>
            <button
              onClick={() => setView('global-agent')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-bold text-slate-200"
            >
              {t('Open Global Agent')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard icon={<Users className="w-5 h-5" />} label={t('Total Clients')} value={clients.length} subtext={t('{count}% closed-won conversion').replace('{count}', String(operations.conversionRate))} tone="cyan" />
            <MetricCard icon={<DollarSign className="w-5 h-5" />} label={t('Pipeline Value')} value={`$${operations.dealValue.toLocaleString()}`} subtext={t('Won: {value}').replace('{value}', `$${operations.wonValue.toLocaleString()}`)} tone="emerald" />
            <MetricCard icon={<Mail className="w-5 h-5" />} label={t('Unread Emails')} value={operations.emailRows[0].value} subtext={t('{count} open follow-up todos').replace('{count}', String(operations.openTodos))} tone={operations.emailRows[0].value > 0 ? 'amber' : 'cyan'} />
            <MetricCard icon={<Globe2 className="w-5 h-5" />} label={t('Public Pool')} value={publicClients.length} subtext={t('{count} saved campaigns').replace('{count}', String(leadCampaigns.length))} tone="rose" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" /> {t('Client Pipeline')}
                </h3>
                <button onClick={() => setView('kanban')} className="text-xs text-cyan-400 hover:text-cyan-300 font-bold">{t('View Kanban')}</button>
              </div>
              <BarListChart rows={operations.clientStageRows} emptyLabel={t('No client pipeline data yet.')} />
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> {t('Activity Trend')}
                </h3>
                <span className="text-xs text-slate-500">{t('Last 7 days')}</span>
              </div>
              <SparklineChart points={operations.activityTrend} />
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" /> {t('Email Load')}
                </h3>
                <button onClick={() => setView('inbox')} className="text-xs text-cyan-400 hover:text-cyan-300 font-bold">{t('Open Inbox')}</button>
              </div>
              <DonutChart rows={operations.emailRows} emptyLabel={t('No email activity yet.')} />
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-violet-400" /> {t('Acquisition Funnel')}
                </h3>
                <button onClick={() => setView('public-pool')} className="text-xs text-cyan-400 hover:text-cyan-300 font-bold">{t('Public Pool')}</button>
              </div>
              <BarListChart rows={operations.campaignRows} emptyLabel={t('No lead acquisition data yet.')} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 pb-8">
          
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
              <div className="space-y-3" ref={dropdownRef}>
                {visibleQuests.map((quest) => (
                  <div 
                    key={quest.id} 
                    className={cn(
                      "flex flex-col p-4 rounded-xl border transition-all duration-300",
                      quest.completed ? "bg-green-950/20 border-green-900/50" : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border",
                          quest.completed ? "bg-green-500/20 border-green-500/50 text-green-400" : "bg-slate-800 border-slate-700 text-slate-500"
                        )}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className={cn("font-bold text-sm", quest.completed ? "text-green-400" : "text-white")}>{t(quest.title)}</div>
                          <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{t(quest.description)}</div>
                          {quest.description.includes('Agent drafted instructions') && (
                            <button 
                              onClick={() => {
                                const match = quest.description.match(/"([^]+)"/);
                                if (match) navigator.clipboard.writeText(match[1]);
                              }}
                              className="mt-2 text-[10px] bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded"
                            >
                              Copy Draft
                            </button>
                          )}
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
                            <button
                               onClick={() => setActiveDropdown(activeDropdown === quest.id ? null : quest.id)}
                               className={cn(
                                 "px-4 py-2 hover:bg-slate-700 text-sm font-bold text-slate-200 rounded-lg transition-colors border border-slate-700 cursor-pointer outline-none flex items-center gap-1 min-w-[72px] justify-center",
                                 activeDropdown === quest.id ? "bg-slate-700" : "bg-slate-800"
                               )}
                            >
                               {t('skip')} <ChevronDown className={cn("w-4 h-4 ml-1 opacity-70 transition-transform", activeDropdown === quest.id ? "rotate-180" : "")} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 uppercase px-4 py-2">{t('done')}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Skip Options */}
                    {!quest.completed && activeDropdown === quest.id && (
                      <div className="mt-4 pt-4 border-t border-slate-800/80 animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">{t('skip')}</h4>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 1, label: t('skip1') },
                            { value: 3, label: t('skip3') },
                            { value: 5, label: t('skip5') },
                            { value: 7, label: t('skip7') },
                            { value: 15, label: t('skip15') },
                            { value: 30, label: t('skip30') }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                skipQuest(quest.id, option.value);
                                setActiveDropdown(null);
                              }}
                              className="flex-1 min-w-[100px] flex flex-col items-center justify-center p-2 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-cyan-500/50 transition-colors whitespace-nowrap"
                            >
                              <span className="text-sm font-bold text-slate-200">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Todos */}
            {upcomingTodos.length > 0 && (
              <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm mt-8">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" /> {t('Upcoming Todos')}
                </h2>
                <div className="space-y-3">
                  {upcomingTodos.map((todo) => {
                    const dueTime = new Date(todo.todoAt!).getTime();
                    const isPastDue = dueTime < now;
                    return (
                      <div 
                        key={todo.id} 
                        className={cn(
                          "flex flex-col p-4 rounded-xl border transition-all duration-300",
                          isPastDue ? "bg-red-950/20 border-red-900/50" : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4 items-start">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex shrink-0 items-center justify-center border mt-0.5",
                              isPastDue ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-slate-800 border-slate-700 text-slate-500"
                            )}>
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={cn("font-bold text-sm truncate", isPastDue ? "text-red-400" : "text-white")}>{todo.subject}</div>
                              {todo.todoNote && <div className="text-xs text-slate-400 mt-1">{todo.todoNote}</div>}
                              <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3" />
                                <span className={isPastDue ? "text-red-400" : ""}>
                                  {isPastDue ? t('Past Due: ') : t('Due: ')}
                                  {new Date(todo.todoAt!).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                             onClick={() => setView('inbox')}
                             className="shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-cyan-500 text-xs font-bold text-slate-300 rounded-lg transition-colors border shadow-sm"
                          >
                             {t('View')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Logs */}
          <div className="bg-slate-950/50 rounded-2xl border border-slate-800 shadow-sm flex flex-col h-full min-h-[500px]">
             <div className="p-6 border-b border-slate-800 shrink-0">
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <History className="w-5 h-5 text-indigo-400" /> {t('expHistory')}
               </h2>
             </div>
             <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
               <div className="space-y-3">
                 {expLogs.length === 0 ? (
                   <div className="text-center text-slate-500 py-12 text-sm" dangerouslySetInnerHTML={{__html: t('noExp')}}>
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
