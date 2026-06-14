import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'sales' | 'support' | 'agent-only' | 'user';
  displayName?: string;
  avatarUrl?: string;
  points?: number;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  token: string | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitializing: boolean;
  setToken: (token: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  profile: null,
  isLoading: false,
  isInitializing: true,
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },
  setProfile: (profile) => set({ profile }),
  fetchProfile: async () => {
    const { token } = get();
    if (!token) {
      set({ profile: null, isInitializing: false });
      return;
    }
    
    try {
      const res = await fetch(`/api/auth/me`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const profile = await res.json();
        set({ profile, isInitializing: false });
      } else {
        localStorage.removeItem('token');
        set({ token: null, profile: null, isInitializing: false });
      }
    } catch (e) {
      localStorage.removeItem('token');
      set({ token: null, profile: null, isInitializing: false });
    }
  },
  signOut: async () => {
    localStorage.removeItem('token');
    set({ token: null, profile: null });
  }
}));

// Initialize
useAuthStore.getState().fetchProfile();

