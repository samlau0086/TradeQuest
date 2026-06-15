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
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4" /> Event Timeline
        </h3>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => onEventViewChange('timeline')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${eventView === 'timeline' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Event Timeline
            </button>
            <button
              type="button"
              onClick={() => onEventViewChange('list')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${eventView === 'list' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Event List
            </button>
            <button
              type="button"
              onClick={() => onEventViewChange('growth')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${eventView === 'growth' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Growth Logs
            </button>
          </div>
          <span className="text-xs text-slate-500">{sortedLogs.length} events</span>
        </div>
      </div>

      {eventView === 'timeline' ? (
        <div className="relative pl-6">
          <div className="absolute bottom-2 left-[9px] top-2 w-px bg-slate-800" />
          <div className="space-y-4">
            {visibleTimelineLogs.map((log, index) => (
              <div key={log.id} className="relative">
                <div className={`absolute -left-[23px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border ${index === 0 ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-700 bg-slate-950'}`}>
                  <div className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-cyan-300' : 'bg-slate-500'}`} />
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{new Date(log.date).toLocaleString()}</span>
                    {log.type && (
                      <span className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 uppercase tracking-wide text-slate-400">
                        {log.type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{log.content}</p>
                </div>
              </div>
            ))}
            {sortedLogs.length === 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
                No timeline events yet.
              </div>
            )}
            {sortedLogs.length > 10 && (
              <button
                type="button"
                onClick={onToggleTimelineExpanded}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
              >
                {timelineExpanded ? 'Show less' : `Expand to more (${sortedLogs.length - 10})`}
              </button>
            )}
          </div>
        </div>
      ) : eventView === 'list' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleEventListLogs.map(log => (
            <div key={log.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mb-2">
                <Clock3 className="w-3.5 h-3.5" />
                {new Date(log.date).toLocaleString()}
                {log.type && (
                  <span className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 uppercase tracking-wide text-slate-400">
                    {log.type}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{log.content}</p>
            </div>
          ))}
          {sortedLogs.length === 0 && (
            <div className="md:col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
              No events yet.
            </div>
          )}
          {sortedLogs.length > 20 && (
            <button
              type="button"
              onClick={onToggleEventListExpanded}
              className="md:col-span-2 w-max rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
            >
              {eventListExpanded ? 'Show less' : `Expand to more (${sortedLogs.length - 20})`}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleGrowthLogs.map(log => (
            <div key={log.id} className="group rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <time className="text-[11px] font-medium text-slate-500">
                  {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
                <button
                  type="button"
                  onClick={() => onDeleteGrowthLog(log.id)}
                  title="Delete"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-xs text-slate-300">
                {log.relatedEmailId ? (
                  <button
                    onClick={() => onOpenEmail(log.relatedEmailId || '')}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 text-left"
                  >
                    <Mail className="w-3 h-3 shrink-0" />
                    <span>{log.content}</span>
                  </button>
                ) : (
                  log.content
                )}
              </div>
            </div>
          ))}
          {isDormant && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-950/20 p-4 text-xs font-bold text-orange-400">
              <Snowflake className="mr-2 inline h-3.5 w-3.5" />
              Status changed to Dormant
            </div>
          )}
          {growthLogs.length === 0 && !isDormant && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
              No growth logs yet.
            </div>
          )}
          {growthLogs.length > 10 && (
            <button
              type="button"
              onClick={onToggleGrowthLogsExpanded}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
            >
              {growthLogsExpanded ? 'Show less' : `Expand to more (${growthLogs.length - 10})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
