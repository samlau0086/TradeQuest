import type { ReactNode } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { cn } from '../../lib/utils';

interface InboxWorkspaceLayoutProps {
  sidebarHidden: boolean;
  contentHidden: boolean;
  sidebar: ReactNode;
  content: ReactNode;
  children?: ReactNode;
}

export function InboxWorkspaceLayout({
  sidebarHidden,
  contentHidden,
  sidebar,
  content,
  children,
}: InboxWorkspaceLayoutProps) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: 'inbox-layout' });

  return (
    <PanelGroup
      id="inbox-layout"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      orientation="horizontal"
      className="flex-1 overflow-hidden bg-slate-900 border-t border-slate-800"
    >
      <Panel
        id="inbox-list"
        defaultSize={320}
        minSize={250}
        maxSize={500}
        className={cn('flex flex-col transition-transform relative z-10', sidebarHidden && 'hidden md:flex')}
      >
        {sidebar}
      </Panel>

      <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-cyan-500 cursor-col-resize transition-colors hidden md:block" />

      <Panel
        id="inbox-content"
        className={cn('flex flex-col bg-slate-950/50 relative', contentHidden && 'hidden md:flex')}
      >
        {content}
      </Panel>

      {children}
    </PanelGroup>
  );
}
