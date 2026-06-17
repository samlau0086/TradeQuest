import React from 'react';
import { Clock3, History, Mail, Snowflake, Trash2 } from 'lucide-react';
import { Log, useStore } from '../../store';
import type { ClientEventView } from '../../hooks/client-details';
import { ConversationSectionCard, ConversationSectionHeader } from '../inbox-ui/ConversationSectionCard';
import { ConversationToolbarButton, ConversationToolbarGroup, ConversationToolbarPill } from '../inbox-ui/ConversationToolbar';

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
  const { language } = useStore();
  const label = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const tabs: Array<{ id: ClientEventView; label: string }> = [
    { id: 'timeline', label: label('事件时间线', 'Event Timeline') },
    { id: 'list', label: label('事件列表', 'Event List') },
    { id: 'growth', label: label('成长日志', 'Growth Logs') },
  ];

  const renderExpandButton = (expanded: boolean, hiddenCount: number, onClick: () => void) => {
    if (hiddenCount <= 0) return null;
    return (
      <ConversationToolbarButton type="button" tone="info" onClick={onClick}>
        {expanded ? label('收起', 'Show less') : `${label('展开更多', 'Expand to more')} (${hiddenCount})`}
      </ConversationToolbarButton>
    );
  };

  return (
    <ConversationSectionCard className="shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <ConversationSectionHeader
        icon={<History className="h-4 w-4 text-slate-500" />}
        title={label('活动历史', 'Activity history')}
        description={label(
          '把互动时间线、记录变更和成长日志放在一个活动工作区里，方便销售快速回看上下文。',
          'Keep interaction timeline, record changes, and growth logs in one activity workspace so sales can quickly revisit context.',
        )}
        actions={
          <ConversationToolbarGroup>
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
            <ConversationToolbarPill tone="default">
              {sortedLogs.length} {label('条事件', 'events')}
            </ConversationToolbarPill>
          </ConversationToolbarGroup>
        }
      />

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
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{new Date(log.date).toLocaleString()}</span>
                    {log.type && (
                      <ConversationToolbarPill tone="default">{log.type}</ConversationToolbarPill>
                    )}
                  </div>
                  <p className="text-sm leading-7 text-slate-700">{log.content}</p>
                </div>
              </div>
            ))}
            {sortedLogs.length === 0 && (
              <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                {label('当前还没有时间线事件。', 'No timeline events yet.')}
              </div>
            )}
            {renderExpandButton(timelineExpanded, Math.max(sortedLogs.length - 10, 0), onToggleTimelineExpanded)}
          </div>
        </div>
      ) : eventView === 'list' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleEventListLogs.map(log => (
            <div key={log.id} className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {new Date(log.date).toLocaleString()}
                {log.type && (
                  <ConversationToolbarPill tone="default">{log.type}</ConversationToolbarPill>
                )}
              </div>
              <p className="text-sm leading-7 text-slate-700">{log.content}</p>
            </div>
          ))}
          {sortedLogs.length === 0 && (
            <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 md:col-span-2">
              {label('当前还没有事件。', 'No events yet.')}
            </div>
          )}
          {sortedLogs.length > 20 && (
            <div className="md:col-span-2">
              {renderExpandButton(eventListExpanded, Math.max(sortedLogs.length - 20, 0), onToggleEventListExpanded)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleGrowthLogs.map(log => (
            <div key={log.id} className="group rounded-[20px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-3">
                <time className="text-[11px] font-medium text-slate-500">
                  {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
                <button
                  type="button"
                  onClick={() => onDeleteGrowthLog(log.id)}
                  title={label('删除', 'Delete')}
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
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              <Snowflake className="mr-2 inline h-4 w-4" />
              {label('状态已变更为休眠。', 'Status changed to Dormant')}
            </div>
          )}
          {growthLogs.length === 0 && !isDormant && (
            <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              {label('当前还没有成长日志。', 'No growth logs yet.')}
            </div>
          )}
          {renderExpandButton(growthLogsExpanded, Math.max(growthLogs.length - 10, 0), onToggleGrowthLogsExpanded)}
        </div>
      )}
    </ConversationSectionCard>
  );
}
