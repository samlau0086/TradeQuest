import { useMemo } from 'react';
import {
  buildInboxContentPanelInputs,
  buildInboxDialogLayerInputs,
  buildInboxSidebarInputs,
  buildInboxVisibilityInputs,
} from './inboxPageShellInputBuilders';
import type { UseInboxPageShellInputsOptions } from './useInboxPageShellInputTypes';
import type { useInboxPageShellAssembly } from './useInboxPageShellAssembly';

export function useInboxPageShellInputs(
  options: UseInboxPageShellInputsOptions,
): Parameters<typeof useInboxPageShellAssembly>[0] {
  return useMemo(
    () => ({
      contentPanel: buildInboxContentPanelInputs(options),
      sidebar: buildInboxSidebarInputs(options),
      dialogLayer: buildInboxDialogLayerInputs(options),
      visibility: buildInboxVisibilityInputs(options),
    }),
    [options],
  );
}
