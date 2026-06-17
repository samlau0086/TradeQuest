import type { ReactNode } from 'react';

interface ClientSidebarSectionProps {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function ClientSidebarSection({
  eyebrow,
  title,
  description,
  children,
}: ClientSidebarSectionProps) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</div>
        <h3 className="mt-1 text-sm font-semibold text-slate-800">{title}</h3>
        {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
