import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface DataTableColumn {
  key: string;
  header: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: DataTableColumn[];
  rows: T[];
  getRowKey: (row: T) => string;
  renderCell: (row: T, column: DataTableColumn) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
  rowClassName?: string | ((row: T) => string);
}

const alignClasses: Record<NonNullable<DataTableColumn['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  renderCell,
  emptyState,
  className,
  rowClassName,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-800 bg-slate-950', className)}>
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="border-b border-slate-800 bg-slate-900/50 text-xs uppercase text-slate-400">
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                className={cn('px-4 py-3 font-medium', alignClasses[column.align || 'left'], column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map(row => (
            <tr
              key={getRowKey(row)}
              className={cn(
                'transition-colors hover:bg-slate-800/30',
                typeof rowClassName === 'function' ? rowClassName(row) : rowClassName
              )}
            >
              {columns.map(column => (
                <td
                  key={column.key}
                  className={cn('px-4 py-3', alignClasses[column.align || 'left'], column.className)}
                >
                  {renderCell(row, column)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && emptyState && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                {emptyState}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
