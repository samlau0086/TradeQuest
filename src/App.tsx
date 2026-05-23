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
import { KnowledgeBaseManager } from './components/KnowledgeBaseManager';
import { AuthPage } from './components/AuthPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { Loader2 } from 'lucide-react';
import { translateLiteral, useTranslation } from './lib/i18n';

import { ProductsList } from './components/ProductsList';
import { QuotesList } from './components/QuotesList';
import { MediaLibrary } from './components/MediaLibrary';
import { NotificationCenter } from './components/NotificationCenter';
import { GlobalAgent } from './components/GlobalAgent';

export default function App() {
  const { view, selectedClientId, checkScheduledEmails, fetchInitialData, language, globalLoading } = useStore();
  const t = useTranslation(language);
  const { token, isInitializing } = useAuthStore();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: 'app-layout' });

  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('resetToken');

  if (resetToken) {
    return <ResetPasswordPage resetToken={resetToken} />;
  }

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

  useEffect(() => {
    const localizeNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const next = translateLiteral(node.textContent, language);
        if (next !== node.textContent) node.textContent = next;
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      for (const attr of ['placeholder', 'title', 'aria-label']) {
        const value = element.getAttribute(attr);
        if (!value) continue;
        const next = translateLiteral(value, language);
        if (next !== value) element.setAttribute(attr, next);
      }
      element.childNodes.forEach(localizeNode);
    };

    localizeNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(localizeNode);
        if (mutation.type === 'characterData') localizeNode(mutation.target);
        if (mutation.type === 'attributes') localizeNode(mutation.target);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    });
    return () => observer.disconnect();
  }, [language]);

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
    <>
      <PanelGroup id="app-layout" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} orientation="horizontal" className="absolute inset-0 flex bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
        <Panel id="sidebar" defaultSize={260} minSize={200} maxSize={400}>
          <Sidebar />
        </Panel>
        <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors" />
        <Panel id="main-content" className="flex-1 flex flex-col relative overflow-hidden">
          <TopBar />
          
          {view === 'kanban' ? <Kanban /> : 
           view === 'list' ? <PipelineList /> :
           view === 'products' ? <ProductsList /> :
           view === 'quotes' ? <QuotesList /> :
           view === 'global-agent' ? <GlobalAgent /> :
           view === 'clients' ? <ClientsList /> :
           view === 'public-pool' ? <PublicPool /> :
           view === 'edit-requests' ? <EditRequests /> :
           view === 'inbox' ? <Inbox /> : 
           view === 'settings' ? <Settings /> : 
           view === 'knowledge-base' ? <div className="flex-1 bg-slate-900 border-t border-slate-800 p-6 overflow-y-auto"><div className="w-full text-white"><KnowledgeBaseManager /></div></div> :
           view === 'media-library' ? <MediaLibrary /> :
           view === 'user-management' ? <div className="flex-1 bg-slate-900 overflow-y-auto p-6"><div className="w-full text-white"><UserManagement /></div></div> :
           (view === 'dormant' || view === 'leads' || view === 'followups') ? <ActionableClients /> : 
           <Dashboard />}
        </Panel>
        
        {selectedClientId && (
          <>
            <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors" />
            <Panel id="client-details" defaultSize={384} minSize={300} maxSize={600}>
              <ClientDetails />
            </Panel>
          </>
        )}
      </PanelGroup>

      {globalLoading && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center text-slate-200">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mb-4" />
          <p className="text-sm font-medium animate-pulse text-cyan-400">{t('processing')}</p>
        </div>
      )}
      <NotificationCenter />
    </>
  );
}

