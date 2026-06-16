import type { ReactNode } from 'react';
import { RecordPageLayout } from '../ui';

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
    <RecordPageLayout
      header={header}
      mainColumn={mainColumn}
      sidebarColumn={sidebarColumn}
      footer={comments}
      overlays={overlays}
    />
  );
}
