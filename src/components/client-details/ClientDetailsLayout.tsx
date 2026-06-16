import type { ReactNode } from 'react';

interface ClientDetailsLayoutProps {
  header: ReactNode;
  mainColumn: ReactNode;
  sidebarColumn: ReactNode;
  comments: ReactNode;
  overlays?: ReactNode;
}

export function ClientDetailsLayout({
  header,
  mainColumn,
  sidebarColumn,
  comments,
  overlays,
}: ClientDetailsLayoutProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#05070b] text-slate-100 overflow-hidden pointer-events-auto">
      {header}

      <div className="h-[calc(100dvh-93px)] overflow-y-auto px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-[1800px] space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.85fr)] gap-6">
            <div className="space-y-6 min-w-0">
              {mainColumn}
            </div>
            <div className="space-y-6 min-w-0">
              {sidebarColumn}
            </div>
          </div>

          {comments}
        </div>
      </div>

      {overlays}
    </div>
  );
}
