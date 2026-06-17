import { useMemo } from 'react';
import type { InboxContentPanelProps } from './InboxContentPanelTypes';
import type { InboxConversationSidebarProps } from './InboxConversationSidebar';
import type { InboxDialogLayerProps } from './InboxDialogLayer';
import { useInboxContentPanelProps } from './useInboxContentPanelProps';
import { useInboxDialogLayerProps } from './useInboxDialogLayerProps';
import { useInboxPageVisibility } from './useInboxPageVisibility';
import { useInboxSidebarProps } from './useInboxSidebarProps';

interface UseInboxPageShellAssemblyOptions {
  contentPanel: Parameters<typeof useInboxContentPanelProps>[0];
  sidebar: Parameters<typeof useInboxSidebarProps>[0];
  dialogLayer: Parameters<typeof useInboxDialogLayerProps>[0];
  visibility: Parameters<typeof useInboxPageVisibility>[0];
}

interface UseInboxPageShellAssemblyResult {
  sidebarHidden: boolean;
  contentHidden: boolean;
  sidebarProps: InboxConversationSidebarProps;
  contentPanelProps: InboxContentPanelProps;
  dialogLayerProps: InboxDialogLayerProps;
}

export function useInboxPageShellAssembly({
  contentPanel,
  sidebar,
  dialogLayer,
  visibility,
}: UseInboxPageShellAssemblyOptions): UseInboxPageShellAssemblyResult {
  const contentPanelProps = useInboxContentPanelProps(contentPanel);
  const sidebarProps = useInboxSidebarProps(sidebar);
  const dialogLayerProps = useInboxDialogLayerProps(dialogLayer);
  const { sidebarHidden, contentHidden } = useInboxPageVisibility(visibility);

  return useMemo(() => ({
    sidebarHidden,
    contentHidden,
    sidebarProps,
    contentPanelProps,
    dialogLayerProps,
  }), [
    contentHidden,
    contentPanelProps,
    dialogLayerProps,
    sidebarHidden,
    sidebarProps,
  ]);
}
