import type { ViewMode } from '../store';

const viewToPath: Record<ViewMode, string> = {
  dashboard: '/home',
  inbox: '/inbox',
  'live-chat': '/live-chat',
  'customer-forms': '/customer-forms',
  'agent-hub': '/agent-hub',
  clients: '/clients',
  kanban: '/kanban',
  list: '/pipeline',
  products: '/products',
  quotes: '/quotes',
  'public-pool': '/public-pool',
  'edit-requests': '/edit-requests',
  'audit-logs': '/audit-logs',
  'knowledge-base': '/knowledge',
  'media-library': '/media',
  settings: '/settings',
  'user-management': '/user-management',
  dormant: '/dormant',
  leads: '/leads',
  followups: '/followups',
  map: '/map'
};

const pathToView = Object.entries(viewToPath).reduce<Record<string, ViewMode>>((acc, [view, path]) => {
  acc[path] = view as ViewMode;
  return acc;
}, {
  '/dashboard': 'dashboard',
  '/': 'kanban'
});

export function getPathForView(view: ViewMode) {
  return viewToPath[view] || '/kanban';
}

export function getViewForPath(pathname: string): ViewMode | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return pathToView[normalized] || null;
}

export function syncViewToUrl(view: ViewMode, options: { replace?: boolean } = {}) {
  if (typeof window === 'undefined') return;
  const path = getPathForView(view);
  if (window.location.pathname === path) return;
  const method = options.replace ? 'replaceState' : 'pushState';
  window.history[method]({ view }, '', path);
}
