import { useStore } from '../../store';
import { useAuthStore } from '../../authStore';

export function useInboxWorkspaceData() {
  const workspace = useStore();
  const currentUser = useAuthStore(state => state.profile);

  return {
    ...workspace,
    currentUser,
  };
}
