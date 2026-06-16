import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type SectionHeaderTone = 'default' | 'cyan' | 'indigo' | 'amber' | 'emerald' | 'blue' | 'purple';

const toneClasses: Record<SectionHeaderTone, string> = {
  default: 'text-slate-500',
  cyan: 'text-cyan-400',
  indigo: 'text-indigo-400',
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  blue: 'text-blue-300',
  purple: 'text-purple-300',
};

interface SectionHeaderProps {
  children: ReactNode;
  icon?: ReactNode;
  tone?: SectionHeaderTone;
  className?: string;
}

export function SectionHeader({
  children,
  icon,
  tone = 'default',
  className,
}: SectionHeaderProps) {
  return (
    <h3 className={cn(
      'flex items-center gap-2 text-xs font-bold uppercase tracking-wider',
      toneClasses[tone],
      className
    )}>
      {icon}
      {children}
    </h3>
  );
}
