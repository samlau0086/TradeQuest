import React, { useState } from 'react';
import { KanbanSquare, Users, Globe } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { cn } from '../lib/utils';
import { ClientsList } from './ClientsList';
import { PublicPool } from './PublicPool';
import { Kanban } from './Kanban';

type ClientLeadHubTab = 'clients' | 'kanban' | 'public-pool';

export function ClientLeadHub({ initialTab = 'clients' }: { initialTab?: ClientLeadHubTab }) {
  const { language } = useStore();
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState<ClientLeadHubTab>(initialTab);

  const tabClass = (tab: ClientLeadHubTab) => cn(
    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors',
    activeTab === tab
      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
  );

  return (
    <div className="flex-1 min-h-0 bg-slate-900 border-t border-slate-800 flex flex-col">
      <div className="shrink-0 border-b border-slate-800 bg-slate-950/40 px-6 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
              <Users className="h-7 w-7 text-cyan-400" />
              {language === 'zh' ? '客户与线索' : 'Clients & Leads'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {language === 'zh' ? '在同一工作区管理客户、线索看板和可领取的公海线索。' : 'Manage clients, lead board, and claimable public leads in one workspace.'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <button type="button" onClick={() => setActiveTab('clients')} className={tabClass('clients')}>
              <Users className="h-4 w-4" />
              {t('clientsMenu')}
            </button>
            <button type="button" onClick={() => setActiveTab('kanban')} className={tabClass('kanban')}>
              <KanbanSquare className="h-4 w-4" />
              {language === 'zh' ? '线索看板' : 'Lead Board'}
            </button>
            <button type="button" onClick={() => setActiveTab('public-pool')} className={tabClass('public-pool')}>
              <Globe className="h-4 w-4" />
              {t('publicPool')}
            </button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'clients' ? <ClientsList /> : activeTab === 'kanban' ? <Kanban /> : <PublicPool />}
      </div>
    </div>
  );
}
