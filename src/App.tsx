import React, { useEffect } from 'react';
import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { TopBar, MagicCommand } from './components/TopBar';
import { Kanban } from './components/Kanban';
import { WorldMap } from './components/WorldMap';
import { ClientDetails } from './components/ClientDetails';
import { Inbox } from './components/Inbox';
import { Dashboard } from './components/Dashboard';
import { DormantClients } from './components/DormantClients';

export default function App() {
  const { view, selectedClientId, checkScheduledEmails } = useStore();

  useEffect(() => {
    // Check for scheduled emails every 10 seconds
    const interval = setInterval(checkScheduledEmails, 10000);
    return () => clearInterval(interval);
  }, [checkScheduledEmails]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopBar />
        <MagicCommand />
        
        {view === 'kanban' ? <Kanban /> : view === 'map' ? <WorldMap /> : view === 'inbox' ? <Inbox /> : view === 'dormant' ? <DormantClients /> : <Dashboard />}
        
        {selectedClientId && <ClientDetails />}
      </div>
    </div>
  );
}

