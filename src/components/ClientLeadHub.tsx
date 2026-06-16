import { useState } from 'react';
import { Globe, KanbanSquare, Users } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { ClientsList } from './ClientsList';
import { PublicPool } from './PublicPool';
import { Kanban } from './Kanban';
import { CRMWorkspaceLayout, PageHeader, SegmentedControl } from './ui';

type ClientLeadHubTab = 'clients' | 'kanban' | 'public-pool';

export function ClientLeadHub({ initialTab = 'clients' }: { initialTab?: ClientLeadHubTab }) {
  const { language } = useStore();
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState<ClientLeadHubTab>(initialTab);

  return (
    <CRMWorkspaceLayout
      className="min-h-0 border-t border-slate-800"
      headerClassName="bg-slate-950/40 pb-0"
      contentClassName="pt-0"
      bodyScroll="hidden"
      scrollable={false}
      header={(
        <PageHeader
          className="px-6 py-5"
          size="lg"
          icon={<Users className="h-5 w-5 text-cyan-400" />}
          title={language === 'zh' ? '客户与线索' : 'Clients & Leads'}
          description={language === 'zh' ? '在同一工作区管理客户、线索看板和可领取的公海线索。' : 'Manage clients, lead board, and claimable public leads in one workspace.'}
          actions={(
            <SegmentedControl<ClientLeadHubTab>
              value={activeTab}
              onChange={setActiveTab}
              className="w-full bg-slate-900/80 sm:w-auto"
              options={[
                { value: 'clients', label: t('clientsMenu'), icon: <Users className="h-4 w-4" /> },
                { value: 'kanban', label: language === 'zh' ? '线索看板' : 'Lead Board', icon: <KanbanSquare className="h-4 w-4" /> },
                { value: 'public-pool', label: t('publicPool'), icon: <Globe className="h-4 w-4" /> },
              ]}
            />
          )}
        />
      )}
    >
      <div className="min-h-0 h-full overflow-hidden">
        {activeTab === 'clients' ? <ClientsList /> : activeTab === 'kanban' ? <Kanban /> : <PublicPool />}
      </div>
    </CRMWorkspaceLayout>
  );
}
