import React, { useEffect } from 'react';
import { useStore } from './store';
import { useAuthStore } from './authStore';
import { Sidebar } from './components/Sidebar';
import { TopBar, MagicCommand } from './components/TopBar';
import { Kanban } from './components/Kanban';
import { ClientDetails } from './components/ClientDetails';
import { Inbox } from './components/Inbox';
import { Dashboard } from './components/Dashboard';
import { ActionableClients } from './components/ActionableClients';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { PublicPool } from './components/PublicPool';
import { PipelineList } from './components/PipelineList';
import { ClientsList } from './components/ClientsList';
import { EditRequests } from './components/EditRequests';
import { AuthPage } from './components/AuthPage';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { view, selectedClientId, checkScheduledEmails, fetchInitialData } = useStore();
  const { token, isInitializing } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchInitialData();
    }
  }, [token, fetchInitialData]);

  useEffect(() => {
    // Check for scheduled emails every 10 seconds
    const interval = setInterval(checkScheduledEmails, 10000);
    return () => clearInterval(interval);
  }, [checkScheduledEmails]);

  if (isInitializing) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center text-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!token) {
    return <AuthPage />;
  }

  return (
    <PanelGroup orientation="horizontal" id="app-layout" className="absolute inset-0 flex bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      <Panel defaultSize={260} minSize={200} maxSize={400}>
        <Sidebar />
      </Panel>
      <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors" />
      <Panel className="flex-1 flex flex-col relative overflow-hidden">
        <TopBar />
        <MagicCommand />
        
        {view === 'kanban' ? <Kanban /> : 
         view === 'list' ? <PipelineList /> :
         view === 'clients' ? <ClientsList /> :
         view === 'public-pool' ? <PublicPool /> :
         view === 'edit-requests' ? <EditRequests /> :
         view === 'inbox' ? <Inbox /> : 
         view === 'settings' ? <Settings /> : 
         view === 'user-management' ? <div className="flex-1 bg-slate-900 overflow-y-auto p-8"><div className="max-w-5xl mx-auto text-white"><UserManagement /></div></div> :
         (view === 'dormant' || view === 'leads' || view === 'followups') ? <ActionableClients /> : 
         <Dashboard />}
      </Panel>
      
      {selectedClientId && (
        <>
          <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors" />
          <Panel defaultSize={384} minSize={300} maxSize={600}>
            <ClientDetails />
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}

