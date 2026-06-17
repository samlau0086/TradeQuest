import type { ReactNode } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { cn } from '../../lib/utils';
import { THREE_PANE_WORKSPACE_STYLES } from '../ui';

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
      className={cn(
        THREE_PANE_WORKSPACE_STYLES.root,
        'h-full rounded-[30px] border border-slate-200/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.08)] overflow-hidden',
      )}
    >
      <Panel
        id="inbox-list"
        defaultSize={360}
        minSize={280}
        maxSize={540}
        className={cn(
          THREE_PANE_WORKSPACE_STYLES.left,
          'relative z-10 flex flex-col border-r border-slate-200 bg-[#f8fafc] transition-transform',
          sidebarHidden && 'hidden md:flex',
        )}
      >
        {sidebar}
      </Panel>

      <PanelResizeHandle className="hidden w-1 cursor-col-resize bg-slate-100 transition-colors hover:bg-[#ff7a59] md:block" />

      <Panel
        id="inbox-content"
        className={cn(
          THREE_PANE_WORKSPACE_STYLES.middle,
          'relative flex flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)]',
          contentHidden && 'hidden md:flex',
        )}
      >
        {content}
      </Panel>

      {children}
    </PanelGroup>
  );
}
