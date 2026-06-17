import React from 'react';
import { Clock3, History, Mail, Snowflake, Trash2 } from 'lucide-react';
import { Log } from '../../store';

type ClientEventView = 'timeline' | 'list' | 'growth';

interface ClientEventPanelProps {
  eventView: ClientEventView;
  onEventViewChange: (view: ClientEventView) => void;
  sortedLogs: Log[];
  visibleTimelineLogs: Log[];
  visibleEventListLogs: Log[];
  visibleGrowthLogs: Log[];
  growthLogs: Log[];
  isDormant: boolean;
  timelineExpanded: boolean;
  eventListExpanded: boolean;
  growthLogsExpanded: boolean;
  onToggleTimelineExpanded: () => void;
  onToggleEventListExpanded: () => void;
  onToggleGrowthLogsExpanded: () => void;
  onDeleteGrowthLog: (logId: string) => void;
  onOpenEmail: (emailId: string) => void;
}

const tabs: Array<{ id: ClientEventView; label: string }> = [
  { id: 'timeline', label: 'Event Timeline' },
  { id: 'list', label: 'Event List' },
  { id: 'growth', label: 'Growth Logs' },
];

export function ClientEventPanel({
  eventView,
  onEventViewChange,
  sortedLogs,
  visibleTimelineLogs,
  visibleEventListLogs,
  visibleGrowthLogs,
  growthLogs,
  isDormant,
  timelineExpanded,
  eventListExpanded,
  growthLogsExpanded,
  onToggleTimelineExpanded,
  onToggleEventListExpanded,
  onToggleGrowthLogsExpanded,
  onDeleteGrowthLog,
  onOpenEmail,
}: ClientEventPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <History className="h-4 w-4" />
            Activity history
          </div>
          <h3 className="mt-2 text-xl font-bold text-slate-950">Timeline and record changes</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onEventViewChange(tab.id)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  eventView === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
            {sortedLogs.length} events
          </span>
        </div>
      </div>

      {eventView === 'timeline' ? (
        <div className="relative pl-7">
          <div className="absolute bottom-2 left-[11px] top-2 w-px bg-slate-200" />
          <div className="space-y-4">
            {visibleTimelineLogs.map((log, index) => (
              <div key={log.id} className="relative">
                <div className={`absolute -left-[27px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border ${
                  index === 0 ? 'border-cyan-200 bg-cyan-50' : 'border-slate-200 bg-white'
                }`}>
                  <div className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-cyan-500' : 'bg-slate-300'}`} />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{new Date(log.date).toLocaleString()}</span>
                    {log.type && (
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {log.type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-7 text-slate-700">{log.content}</p>
                </div>
              </div>
            ))}
            {sortedLogs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No timeline events yet.
              </div>
            )}
            {sortedLogs.length > 10 && (
              <button
                type="button"
                onClick={onToggleTimelineExpanded}
                className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
              >
                {timelineExpanded ? 'Show less' : `Expand to more (${sortedLogs.length - 10})`}
              </button>
            )}
          </div>
        </div>
      ) : eventView === 'list' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleEventListLogs.map(log => (
            <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {new Date(log.date).toLocaleString()}
                {log.type && (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {log.type}
                  </span>
                )}
              </div>
              <p className="text-sm leading-7 text-slate-700">{log.content}</p>
            </div>
          ))}
          {sortedLogs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 md:col-span-2">
              No events yet.
            </div>
          )}
          {sortedLogs.length > 20 && (
            <button
              type="button"
              onClick={onToggleEventListExpanded}
              className="w-max rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 md:col-span-2"
            >
              {eventListExpanded ? 'Show less' : `Expand to more (${sortedLogs.length - 20})`}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleGrowthLogs.map(log => (
            <div key={log.id} className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-3">
                <time className="text-[11px] font-medium text-slate-500">
                  {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
                <button
                  type="button"
                  onClick={() => onDeleteGrowthLog(log.id)}
                  title="Delete"
                  className="rounded-md p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-sm text-slate-700">
                {log.relatedEmailId ? (
                  <button
                    onClick={() => onOpenEmail(log.relatedEmailId || '')}
                    className="flex items-center gap-1 text-left text-cyan-700 hover:text-cyan-600 hover:underline"
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    <span>{log.content}</span>
                  </button>
                ) : (
                  log.content
                )}
              </div>
            </div>
          ))}
          {isDormant && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              <Snowflake className="mr-2 inline h-4 w-4" />
              Status changed to Dormant
            </div>
          )}
          {growthLogs.length === 0 && !isDormant && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No growth logs yet.
            </div>
          )}
          {growthLogs.length > 10 && (
            <button
              type="button"
              onClick={onToggleGrowthLogsExpanded}
              className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
            >
              {growthLogsExpanded ? 'Show less' : `Expand to more (${growthLogs.length - 10})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
