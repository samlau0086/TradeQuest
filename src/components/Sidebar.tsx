import React, { useState } from 'react';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { Swords, Trophy, KanbanSquare, Tags, Flame, Plus, Mail, Settings as SettingsIcon, Sun, Moon, Shield, Globe, Users, Package, FileText, Book, Image as ImageIcon, Bot, MessageCircle } from 'lucide-react';
import { ClientFormModal } from './ClientFormModal';
import { ExpHistoryModal } from './ExpHistoryModal';
import { useAuthStore } from '../authStore';
import { useTranslation } from '../lib/i18n';

export function Sidebar() {
  const { userExp, userLevel, userTitle, currentStreak, dailyQuests, view, setView, setKanbanSearch, clients, theme, setTheme, language, setLanguage, emails } = useStore();
  const { profile } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExpHistory, setShowExpHistory] = useState(false);
  
  const t = useTranslation(language);

  const allTags = Array.from(new Set(clients.flatMap(c => c.tags)));
  const hasUnread = emails.some(e => !e.read && (e.type === 'inbox' || e.type === 'inbound'));

  return (
    <aside className="w-full h-full bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col pt-6 pb-4">
      {/* Profile / Gamer Card */}
      <div className="px-6 mb-8 cursor-pointer group flex-none" onClick={() => setShowExpHistory(true)} title={t('viewExperienceHistory')}>
        <div className="flex items-center gap-3 mb-4 relative">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
            <Swords className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight group-hover:text-cyan-400 transition-colors w-32 truncate" title={profile?.displayName || profile?.email || 'User'}>
              {profile?.displayName || profile?.email?.split('@')[0] || 'User'}
            </h2>
            <div className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">{userTitle}</div>
          </div>
          
          <div className="absolute top-0 right-0 flex gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setLanguage(language === 'en' ? 'zh' : 'en'); }}
              className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700 font-medium text-[10px]"
              title={t('toggleLanguage')}
            >
              {language === 'en' ? 'EN' : '中'}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
              className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
              title={theme === 'dark' ? t('toggleLightMode') : t('toggleDarkMode')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* EXP Bar & Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{t('level')} {userLevel}</span>
            <span>{userExp} / 500 EXP</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-cyan-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
              style={{ width: `${(userExp / 500) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-orange-400 font-medium pt-1">
            <Flame className="w-4 h-4 fill-orange-400" />
            {currentStreak} {t('dayStreakLuck')}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="px-3 mb-8 space-y-1">
        <button 
          onClick={() => setView('dashboard')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'dashboard' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <Trophy className="w-5 h-5" />
          {t('dashboard')}
        </button>
        <button 
          onClick={() => setView('inbox')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'inbox' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <div className="relative">
            <Mail className="w-5 h-5" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            )}
          </div>
          {t('inbox')}
        </button>
        <button 
          onClick={() => setView('global-agent')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'global-agent' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <Bot className="w-5 h-5 text-cyan-400" />
          {t('globalAgent')}
        </button>
        <button 
          onClick={() => setView('whatsapp-hub')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'whatsapp-hub' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <MessageCircle className="w-5 h-5 text-green-400" />
          WhatsApp Hub
        </button>
        <button 
          onClick={() => setView('clients')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'clients' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <Users className="w-5 h-5" />
          {t('clientsMenu')}
        </button>
        <button 
          onClick={() => setView('kanban')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'kanban' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <KanbanSquare className="w-5 h-5" />
          {t('kanbanView')}
        </button>
        <button 
          onClick={() => setView('products')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'products' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <Package className="w-5 h-5" />
          {t('products')}
        </button>
        <button 
          onClick={() => setView('quotes')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'quotes' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <FileText className="w-5 h-5" />
          {t('quotes')}
        </button>
        <button 
          onClick={() => setView('public-pool')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'public-pool' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <Globe className="w-5 h-5" />
          {t('publicPool')}
        </button>
        <button 
          onClick={() => setView('knowledge-base')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'knowledge-base' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <Book className="w-5 h-5" />
          {t('globalRag')}
        </button>
        <button 
          onClick={() => setView('media-library')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'media-library' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <ImageIcon className="w-5 h-5" />
          {t('mediaLibrary')}
        </button>
        <button 
          onClick={() => setView('settings')}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
            view === 'settings' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
        >
          <SettingsIcon className="w-5 h-5" />
          {t('settings')}
        </button>
        {profile?.role === 'superadmin' && (
          <button 
            onClick={() => setView('user-management')}
            className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
              view === 'user-management' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
          >
            <Shield className="w-5 h-5 text-indigo-400" />
            {t('userManagement')}
          </button>
        )}
        {profile?.role === 'superadmin' && (
          <button 
            onClick={() => setView('edit-requests')}
            className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
              view === 'edit-requests' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white")}
          >
            <Shield className="w-5 h-5 text-yellow-400" />
            {t('reviewEdits')}
          </button>
        )}
      </div>

      {/* Quick Tags / Slices */}
      <div className="px-6 mb-8 flex-1">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><Tags className="w-4 h-4" /> {t('smartViews')}</span>
        </h3>
        <div className="space-y-2 mb-6">
          {allTags.map(tag => (
            <button 
              key={tag}
              onClick={() => {
                setView('kanban');
                setKanbanSearch(tag);
              }}
              className="w-full text-left px-2 py-1.5 rounded text-sm text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 transition-colors"
            >
              {tag}
            </button>
          ))}
          <button 
            onClick={() => { setView('dormant'); }}
            className="w-full text-left px-2 py-1.5 rounded text-sm text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 transition-colors"
          >
            {t('wakeUp')}
          </button>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-sm font-bold border border-slate-700/50 shadow-sm transition-all hover:border-cyan-500/30"
        >
          <Plus className="w-4 h-4" />
          {t('addClient')}
        </button>
      </div>

      {/* Daily Quests */}
      <div className="px-6 mt-auto">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> {t('quests')}
        </h3>
        <div className="space-y-2">
          {dailyQuests.map(quest => (
            <div key={quest.id} className={cn("p-3 rounded-lg border text-sm transition-all relative overflow-hidden", 
              quest.completed ? "bg-green-950/30 border-green-900/50 text-slate-500" : "bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/50")}>
              <div className="font-medium text-slate-200 mb-1">{t(quest.title)}</div>
              <div className="text-xs text-slate-400 truncate">{t(quest.description)}</div>
              {!quest.completed && (
                <div className="text-cyan-400 text-xs font-bold mt-2">+{quest.expReward} EXP</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showAddModal && <ClientFormModal onClose={() => setShowAddModal(false)} />}
      {showExpHistory && <ExpHistoryModal onClose={() => setShowExpHistory(false)} />}
    </aside>
  );
}
