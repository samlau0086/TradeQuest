import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Trophy, Star, History, Flame, ArrowUpCircle, Award, Target, CheckCircle2, ChevronDown, Clock, Mail, Users, DollarSign, BarChart3, Activity, Send, MessageCircle, Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';
import { useAuthStore } from '../authStore';

const PIPELINE_STAGES = ['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'];

type DashboardDailySummary = {
  date: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  generatedAt: string;
  fallback?: boolean;
};

type WhatsAppLoadStats = {
  conversations: number;
  inbound: number;
  outbound: number;
  unlinked: number;
};

type DashboardConversation = {
  id: string;
  channel: 'email' | 'whatsapp' | 'live_chat';
  source_id?: string;
  client_id?: string;
  title?: string;
  subject?: string;
  contact_name?: string;
  contact_address?: string;
  last_message_preview?: string;
  todo_at?: string | null;
  todo_note?: string | null;
  deleted_at?: string | null;
};

type DashboardTodoItem = {
  id: string;
  channel: 'email' | 'whatsapp' | 'live_chat';
  sourceId?: string;
  subject: string;
  contact?: string;
  todoAt: string;
  todoNote?: string | null;
  clientId?: string;
};

function MetricCard({ icon, label, value, subtext, tone = 'cyan' }: { icon: React.ReactNode; label: string; value: string | number; subtext?: string; tone?: 'cyan' | 'emerald' | 'amber' | 'rose' }) {
  const toneClass = {
    cyan: 'text-cyan-400 bg-cyan-950/30 border-cyan-900/40',
    emerald: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40',
    amber: 'text-amber-400 bg-amber-950/30 border-amber-900/40',
    rose: 'text-rose-400 bg-rose-950/30 border-rose-900/40'
  }[tone];

  return (
    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 shadow-sm min-h-[112px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500 uppercase font-bold">{label}</div>
          <div className="text-2xl font-black text-white mt-2">{value}</div>
        </div>
        <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center shrink-0', toneClass)}>
          {icon}
        </div>
      </div>
      {subtext && <div className="text-xs text-slate-500 mt-3 truncate">{subtext}</div>}
    </div>
  );
}

function HoverTooltip({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-20 hidden -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-2xl group-hover:block">
      {children}
      <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-slate-700 bg-slate-950" />
    </div>
  );
}

function BarListChart({ rows, emptyLabel }: { rows: { label: string; value: number; color: string }[]; emptyLabel: string }) {
  const maxValue = Math.max(1, ...rows.map(row => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const hasData = rows.some(row => row.value > 0);

  if (!hasData) {
    return <div className="h-48 flex items-center justify-center text-sm text-slate-500">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-4">
      {rows.map(row => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">{row.label}</span>
            <span className="font-bold text-slate-200">{row.value}</span>
          </div>
          <div className="group relative h-2.5 bg-slate-900 rounded-full border border-slate-800">
            <HoverTooltip>
              <div className="font-bold">{row.label}</div>
              <div className="text-slate-400">
                {row.value} · {total > 0 ? Math.round((row.value / total) * 100) : 0}%
              </div>
            </HoverTooltip>
            <div className={cn('h-full rounded-full transition-all duration-700', row.color)} style={{ width: `${Math.max(4, (row.value / maxValue) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelBarChart({ rows, emptyLabel }: { rows: { label: string; value: number; color: string; rate?: number }[]; emptyLabel: string }) {
  const maxValue = Math.max(1, ...rows.map(row => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const hasData = rows.some(row => row.value > 0);

  if (!hasData) {
    return <div className="h-48 flex items-center justify-center text-sm text-slate-500">{emptyLabel}</div>;
  }

  const displayWidths = rows.map(row => row.value > 0 ? Math.max(16, (row.value / maxValue) * 100) : 10);

  return (
    <div className="space-y-1 py-2">
      {rows.map((row, index) => {
        const widthPercent = displayWidths[index];
        const nextWidth = displayWidths[index + 1] ?? Math.max(10, widthPercent * 0.72);
        const bottomInset = Math.max(0, ((widthPercent - nextWidth) / widthPercent) * 50);
        const share = row.rate ?? Math.round((row.value / maxValue) * 100);
        return (
          <div key={row.label} className="group relative flex justify-center">
            <div
              className={cn(
                'relative h-12 min-w-[92px] border border-slate-950/40 shadow-sm transition-all duration-700 group-hover:brightness-110',
                row.color
              )}
              style={{
                width: `${widthPercent}%`,
                clipPath: `polygon(0 0, 100% 0, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-black/15" />
              <div className="absolute inset-0 flex items-center justify-between gap-3 px-5 text-xs text-white">
                <div className="min-w-0">
                  <div className="truncate font-bold drop-shadow">{row.label}</div>
                  <div className="text-[10px] text-white/75">{share}%</div>
                </div>
                <div className="shrink-0 text-sm font-black drop-shadow">{row.value}</div>
              </div>
            </div>
            <HoverTooltip>
              <div className="font-bold">{row.label}</div>
              <div className="text-slate-400">{row.value} deals</div>
              <div className="text-slate-500">{share}% of top funnel</div>
            </HoverTooltip>
          </div>
        );
      })}
    </div>
  );
}

function SparklineChart({ points, color = 'stroke-cyan-400', valueLabel = 'events' }: { points: { label: string; value: number; meta?: string }[]; color?: string; valueLabel?: string }) {
  const width = 320;
  const height = 120;
  const paddingX = 16;
  const plotWidth = width - paddingX * 2;
  const max = Math.max(1, ...points.map(point => point.value));
  const step = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;
  const chartPoints = points.map((point, index) => {
    const x = paddingX + index * step;
    const y = height - (point.value / max) * (height - 14) - 7;
    return { ...point, x, y };
  });
  const path = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');

  return (
    <div className="h-40">
      <div className="relative h-32">
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-32 overflow-visible">
          <path d={path} fill="none" className={cn(color, 'stroke-[3]')} strokeLinecap="round" strokeLinejoin="round" />
          {chartPoints.map((point, index) => (
            <g key={`${point.meta || point.label}-${index}`} className="group">
              <circle cx={point.x} cy={point.y} r="10" className="fill-transparent" />
              <circle cx={point.x} cy={point.y} r="3.5" className="fill-slate-950 stroke-cyan-400 stroke-2" />
              <foreignObject x={Math.min(Math.max(point.x - 52, 0), width - 104)} y={Math.max(point.y - 58, 0)} width="104" height="52" className="pointer-events-none overflow-visible opacity-0 group-hover:opacity-100">
                <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-2xl">
                  <div className="font-bold">{point.label}</div>
                  <div className="text-slate-400">{point.value} {valueLabel}</div>
                  {point.meta && <div className="text-slate-500">{point.meta}</div>}
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-7 text-[10px] text-slate-500">
        {points.map((point, index) => <span key={point.label} className="text-center">{index === points.length - 1 ? point.label : `-${points.length - 1 - index}d`}</span>)}
      </div>
    </div>
  );
}

function DonutChart({ rows, emptyLabel }: { rows: { label: string; value: number; color: string }[]; emptyLabel: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<{ row: { label: string; value: number; color: string }; x: number; y: number } | null>(null);

  if (total === 0) {
    return <div className="h-48 flex items-center justify-center text-sm text-slate-500">{emptyLabel}</div>;
  }

  const handleSegmentMove = (event: React.MouseEvent<SVGCircleElement>, row: { label: string; value: number; color: string }) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredSegment({
      row,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  };

  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <div ref={chartRef} className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
          <circle cx="60" cy="60" r="42" className="fill-none stroke-slate-900" strokeWidth="16" />
          {rows.map(row => {
            const dash = (row.value / total) * 263.89;
            const circle = (
              <circle
                key={row.label}
                cx="60"
                cy="60"
                r="42"
                className={cn('fill-none cursor-pointer transition-opacity hover:opacity-80', row.color)}
                strokeWidth="16"
                strokeDasharray={`${dash} 263.89`}
                strokeDashoffset={-offset}
                onMouseEnter={event => handleSegmentMove(event, row)}
                onMouseMove={event => handleSegmentMove(event, row)}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            );
            offset += dash;
            return circle;
          })}
        </svg>
        {hoveredSegment && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-2xl"
            style={{ left: hoveredSegment.x, top: hoveredSegment.y }}
          >
            <div className="font-bold">{hoveredSegment.row.label}</div>
            <div className="text-slate-400">
              {hoveredSegment.row.value} · {Math.round((hoveredSegment.row.value / total) * 100)}%
            </div>
            <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-slate-700 bg-slate-950" />
          </div>
        )}
      </div>
      <div className="space-y-3 min-w-0 flex-1">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 flex items-center gap-2 min-w-0">
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', row.color.replace('stroke-', 'bg-'))} />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="font-bold text-slate-200">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseDailySummary(raw: string, date: string): DashboardDailySummary | null {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    return {
      date,
      summary: String(parsed.summary || '').trim(),
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map((item: unknown) => String(item)).filter(Boolean).slice(0, 4) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map((item: unknown) => String(item)).filter(Boolean).slice(0, 5) : [],
      generatedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function ContributionHeatmap({
  days,
  total,
  t
}: {
  days: { date: Date; key: string; count: number; inRange: boolean }[];
  total: number;
  t: (key: string) => string;
}) {
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => days.slice(weekIndex * 7, weekIndex * 7 + 7));
  const maxCount = Math.max(1, ...days.map(day => day.count));
  const monthLabels = weeks.map((week, index) => {
    const firstVisibleDay = week.find(day => day.inRange);
    if (!firstVisibleDay || firstVisibleDay.date.getDate() > 7) return null;
    return { index, label: firstVisibleDay.date.toLocaleString(undefined, { month: 'short' }) };
  }).filter(Boolean) as { index: number; label: string }[];

  const levelClass = (count: number, inRange: boolean) => {
    if (!inRange) return 'bg-slate-950/40 border-slate-900/70';
    if (count === 0) return 'bg-slate-900 border-slate-800';
    const ratio = count / maxCount;
    if (ratio >= 0.75) return 'bg-emerald-400 border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.25)]';
    if (ratio >= 0.45) return 'bg-emerald-500 border-emerald-400';
    if (ratio >= 0.2) return 'bg-emerald-700 border-emerald-600';
    return 'bg-emerald-950 border-emerald-800';
  };

  return (
    <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> {t('User Event Contributions')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{t('Logs, emails, deals, quotes, campaigns, and EXP events by day.')}</p>
        </div>
        <div className="text-sm text-slate-300">
          <span className="font-bold text-white">{total}</span> {t('events in the last year')}
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px] w-full">
          <div className="relative h-5 ml-10 mb-1">
            {monthLabels.map(month => (
              <span
                key={`${month.label}-${month.index}`}
                className="absolute text-xs text-slate-400"
                style={{ left: `${(month.index / Math.max(weeks.length - 1, 1)) * 100}%` }}
              >
                {month.label}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="grid grid-rows-7 gap-[3px] pt-[1px] w-8 shrink-0 text-[10px] text-slate-400">
              <span />
              <span>{t('Mon')}</span>
              <span />
              <span>{t('Wed')}</span>
              <span />
              <span>{t('Fri')}</span>
              <span />
            </div>
            <div
              className="grid flex-1 gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
            >
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-rows-7 gap-[3px]">
                  {week.map(day => (
                    <div
                      key={day.key}
                      title={`${day.count} ${t('events')} · ${day.date.toLocaleDateString()}`}
                      className={cn('aspect-square w-full rounded-[3px] border transition-transform hover:scale-125', levelClass(day.count, day.inRange))}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 ml-10 flex items-center justify-between gap-4 text-xs text-slate-500">
            <span>{t('User activity intensity across the last 365 days.')}</span>
            <div className="flex items-center gap-2">
              <span>{t('Less')}</span>
              {[0, 1, 2, 3, 4].map(level => (
                <span
                  key={level}
                  className={cn(
                    'w-3 h-3 rounded-[3px] border',
                    level === 0 && 'bg-slate-900 border-slate-800',
                    level === 1 && 'bg-emerald-950 border-emerald-800',
                    level === 2 && 'bg-emerald-700 border-emerald-600',
                    level === 3 && 'bg-emerald-500 border-emerald-400',
                    level === 4 && 'bg-emerald-400 border-emerald-300'
                  )}
                />
              ))}
              <span>{t('More')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { userExp, userLevel, userTitle, currentStreak, dailyQuests, expLogs, setView, openInboxFollowUps, skipQuest, language, emails, clients, deals, quotes, logs, publicClients, fetchPublicClients, llmConfigs, activeLLMId, llmMappings, notify } = useStore();
  const { profile, token } = useAuthStore();
  const t = useTranslation(language);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dailySummary, setDailySummary] = useState<DashboardDailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [whatsAppLoad, setWhatsAppLoad] = useState<WhatsAppLoadStats>({ conversations: 0, inbound: 0, outbound: 0, unlinked: 0 });
  const [communicationConversations, setCommunicationConversations] = useState<DashboardConversation[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchPublicClients();
  }, [fetchPublicClients]);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return;
    const loadCommunicationConversations = async () => {
      try {
        const res = await fetch('/api/conversations?limit=500', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setCommunicationConversations(Array.isArray(data.conversations) ? data.conversations : []);
        }
      } catch {
        if (!cancelled) setCommunicationConversations([]);
      }
    };
    const loadWhatsAppStats = async () => {
      try {
        const statsRes = await fetch('/api/whatsapp-hub/stats', { headers: { Authorization: `Bearer ${token}` } });
        const statsData = await statsRes.json().catch(() => ({}));
        if (!statsRes.ok) throw new Error(statsData.error || 'Failed to load WhatsApp stats');
        if (cancelled) return;
        setWhatsAppLoad({
          conversations: Number(statsData.conversations || 0),
          inbound: Number(statsData.inbound || 0),
          outbound: Number(statsData.outbound || 0),
          unlinked: Number(statsData.unlinked || 0)
        });
      } catch {
        if (!cancelled) setWhatsAppLoad({ conversations: 0, inbound: 0, outbound: 0, unlinked: 0 });
      }
    };
    loadCommunicationConversations();
    loadWhatsAppStats();
    const interval = window.setInterval(() => {
      loadCommunicationConversations();
      loadWhatsAppStats();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const expToNextLevel = 500;
  const progressPercent = (userExp / expToNextLevel) * 100;

  const visibleQuests = dailyQuests.filter(q => {
    if (!q.skippedUntil) return true;
    return new Date(q.skippedUntil).getTime() < Date.now();
  });

  const now = Date.now();
  const allFollowUpTodos = useMemo<DashboardTodoItem[]>(() => {
    const unifiedTodos = communicationConversations
      .filter(conversation => conversation.todo_at && !conversation.deleted_at)
      .map(conversation => ({
        id: `conversation:${conversation.id}`,
        channel: conversation.channel,
        sourceId: conversation.source_id,
        subject: conversation.title || conversation.subject || conversation.contact_name || conversation.contact_address || 'Conversation',
        contact: conversation.contact_name || conversation.contact_address,
        todoAt: conversation.todo_at!,
        todoNote: conversation.todo_note,
        clientId: conversation.client_id
      }));

    const unifiedEmailSourceIds = new Set(
      unifiedTodos
        .filter(todo => todo.channel === 'email' && todo.sourceId)
        .map(todo => todo.sourceId)
    );

    const legacyEmailTodos = emails
      .filter(email => email.todoAt && !email.pendingDelete && !unifiedEmailSourceIds.has(email.id))
      .map(email => ({
        id: `email:${email.id}`,
        channel: 'email' as const,
        sourceId: email.id,
        subject: email.subject || '(No Subject)',
        contact: email.sender || email.recipient,
        todoAt: email.todoAt!,
        todoNote: email.todoNote,
        clientId: email.clientId
      }));

    return [...unifiedTodos, ...legacyEmailTodos]
      .filter(todo => !Number.isNaN(new Date(todo.todoAt).getTime()))
      .sort((a, b) => new Date(a.todoAt).getTime() - new Date(b.todoAt).getTime());
  }, [communicationConversations, emails]);

  const upcomingTodos = allFollowUpTodos.filter(todo => {
    const todoTime = new Date(todo.todoAt).getTime();
    // approaching = past due or within next 24 hours
    return todoTime - now < 24 * 60 * 60 * 1000;
  });

  const operations = useMemo(() => {
    const today = new Date();
    const dayKeys = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });

    const clientStageRows = PIPELINE_STAGES.map((stage, index) => ({
      label: t(stage),
      value: clients.filter(client => client.status === stage).length,
      color: ['bg-sky-500', 'bg-cyan-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-emerald-500'][index]
    }));

    const dealStageRows = PIPELINE_STAGES.map((stage, index) => ({
      label: t(stage),
      value: deals.filter(deal => deal.status === stage).length,
      color: ['bg-sky-500', 'bg-cyan-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-emerald-500'][index]
    }));

    const dealFunnelBase = deals.length || 1;
    const dealFunnelRows = PIPELINE_STAGES.map((stage, index) => {
      const includedStages = PIPELINE_STAGES.slice(index);
      const value = deals.filter(deal => includedStages.includes(deal.status)).length;
      return {
        label: t(stage),
        value,
        rate: Math.round((value / dealFunnelBase) * 100),
        color: ['bg-sky-500', 'bg-cyan-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-emerald-500'][index]
      };
    });

    const activityTrend = dayKeys.map((key, index) => {
      const date = new Date(`${key}T00:00:00`);
      return {
        label: index === dayKeys.length - 1 ? t('Today') : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        meta: key,
        value: logs.filter(log => log.date.slice(0, 10) === key).length +
          emails.filter(email => email.date.slice(0, 10) === key).length
      };
    });

    const contributionEvents = [
      ...logs.map(log => log.date),
      ...emails.map(email => email.date),
      ...deals.map(deal => deal.createdAt),
      ...quotes.map(quote => quote.createdAt),
      ...expLogs.map(log => log.date)
    ].filter(Boolean);

    const todayStart = startOfDay(new Date());
    const yearStart = addDays(todayStart, -364);
    const firstGridDay = addDays(yearStart, -yearStart.getDay());
    const contributionCounts = contributionEvents.reduce<Record<string, number>>((acc, rawDate) => {
      const date = startOfDay(new Date(rawDate));
      if (Number.isNaN(date.getTime()) || date < yearStart || date > todayStart) return acc;
      const key = formatDateKey(date);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const contributionDays = Array.from({ length: 53 * 7 }, (_, index) => {
      const date = addDays(firstGridDay, index);
      const key = formatDateKey(date);
      const inRange = date >= yearStart && date <= todayStart;
      return {
        date,
        key,
        inRange,
        count: inRange ? contributionCounts[key] || 0 : 0
      };
    });

    const contributionTotal = Object.values(contributionCounts).reduce((sum, count) => sum + count, 0);

    const emailRows = [
      { label: t('Unread'), value: emails.filter(email => !email.read && (email.type === 'inbox' || email.type === 'inbound')).length, color: 'stroke-rose-400' },
      { label: t('Inbound'), value: emails.filter(email => email.type === 'inbox' || email.type === 'inbound').length, color: 'stroke-cyan-400' },
      { label: t('Sent'), value: emails.filter(email => email.type === 'sent' || email.type === 'outbound').length, color: 'stroke-emerald-400' },
      { label: t('Scheduled'), value: emails.filter(email => email.type === 'scheduled').length, color: 'stroke-amber-400' }
    ];

    const whatsappRows = [
      { label: language === 'zh' ? '会话' : 'Conversations', value: whatsAppLoad.conversations, color: 'stroke-emerald-400' },
      { label: t('Inbound'), value: whatsAppLoad.inbound, color: 'stroke-cyan-400' },
      { label: t('Sent'), value: whatsAppLoad.outbound, color: 'stroke-green-400' },
      { label: language === 'zh' ? '未关联' : 'Unlinked', value: whatsAppLoad.unlinked, color: 'stroke-amber-400' }
    ];

    const dealValue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
    const wonValue = deals.filter(deal => deal.status === 'Closed Won').reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
    const openTodos = allFollowUpTodos.length;
    const quoteDrafts = quotes.filter(quote => String(quote.status).toLowerCase() === 'draft').length;
    const conversionRate = clients.length > 0 ? Math.round((clients.filter(client => client.status === 'Closed Won').length / clients.length) * 100) : 0;

    return {
      clientStageRows,
      dealStageRows,
      dealFunnelRows,
      activityTrend,
      emailRows,
      whatsappRows,
      dealValue,
      wonValue,
      openTodos,
      quoteDrafts,
      conversionRate,
      contributionDays,
      contributionTotal
    };
  }, [allFollowUpTodos.length, clients, deals, emails, expLogs, language, logs, publicClients, quotes, t, whatsAppLoad]);

  const todayKey = formatDateKey(new Date());
  const summaryCacheKey = `tradequest:dashboard-daily-summary:${profile?.id || profile?.email || 'local'}:${language}:${todayKey}`;
  const summaryLLMId = llmMappings.analysis || activeLLMId;
  const summaryLLMConfig = summaryLLMId ? llmConfigs.find(config => config.id === summaryLLMId) : undefined;

  const summaryInput = useMemo(() => ({
    date: todayKey,
    metrics: {
      totalClients: clients.length,
      publicPoolLeads: publicClients.length,
      totalDeals: deals.length,
      totalQuotes: quotes.length,
      pipelineValue: operations.dealValue,
      wonValue: operations.wonValue,
      conversionRate: operations.conversionRate,
      unreadEmails: operations.emailRows[0]?.value || 0,
      openFollowUpTodos: operations.openTodos,
      quoteDrafts: operations.quoteDrafts,
      contributionEventsLastYear: operations.contributionTotal
    },
    pipeline: operations.clientStageRows.map(row => ({ stage: row.label, count: row.value })),
    dealPipeline: operations.dealStageRows.map(row => ({ stage: row.label, count: row.value })),
    activityTrend: operations.activityTrend.map(point => ({ date: point.meta, events: point.value })),
    whatsapp: operations.whatsappRows.map(row => ({ label: row.label, value: row.value })),
    upcomingTodos: upcomingTodos.slice(0, 5).map(todo => ({
      channel: todo.channel,
      subject: todo.subject,
      contact: todo.contact,
      todoAt: todo.todoAt
    })),
    recentSignals: [
      ...logs.slice(-8).map(log => ({ type: 'log', date: log.date, text: log.content })),
      ...emails.slice(-8).map(email => ({ type: email.type, date: email.date, text: email.subject }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
  }), [clients.length, deals.length, emails, logs, operations, publicClients.length, quotes.length, todayKey, upcomingTodos]);

  const buildFallbackSummary = (date: string): DashboardDailySummary => {
    const unreadEmails = operations.emailRows[0]?.value || 0;
    const recommendations = [
      unreadEmails > 0
        ? t('Prioritize unread inbound messages and clear urgent replies first.')
        : t('Keep monitoring inbound channels and prepare proactive follow-ups.'),
      operations.openTodos > 0
        ? t('Complete due follow-up todos before starting new outreach.')
        : t('Create next-step tasks for high-fit clients to keep momentum visible.'),
      publicClients.length > 0
        ? t('Review public pool leads and claim or enrich the highest-fit records.')
        : t('Run lead acquisition or enrichment to keep the top of funnel healthy.')
    ];

    return {
      date,
      summary: t('Today operations are stable. Review the key workload, pipeline, and acquisition signals below before planning outreach.'),
      highlights: [
        t('{count} total clients').replace('{count}', String(clients.length)),
        t('{count} unread emails').replace('{count}', String(unreadEmails)),
        t('{count} public pool leads').replace('{count}', String(publicClients.length)),
        t('{count}% conversion rate').replace('{count}', String(operations.conversionRate))
      ],
      recommendations,
      generatedAt: new Date().toISOString(),
      fallback: true
    };
  };

  const generateDailySummary = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem(summaryCacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as DashboardDailySummary;
          if (parsed.date === todayKey) {
            setDailySummary(parsed);
            return;
          }
        } catch {
          localStorage.removeItem(summaryCacheKey);
        }
      }
    }

    setSummaryLoading(true);
    try {
      let nextSummary: DashboardDailySummary | null = null;
      if (summaryLLMConfig && token) {
        const res = await fetch('/api/chat/magic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            command: [
              'Generate a concise daily CRM operations summary and improvement recommendations for the current user.',
              `Internal output language: ${language === 'zh' ? 'Chinese' : 'English'}.`,
              'Use the provided metrics only. Do not invent numbers.',
              'Return ONLY JSON with this shape: {"summary":"...","highlights":["..."],"recommendations":["..."]}.',
              'Keep summary to 1-2 sentences. Provide 3-5 practical recommendations.'
            ].join('\n'),
            context: {
              systemLanguage: language,
              dashboardMetrics: summaryInput
            },
            llmConfig: summaryLLMConfig,
            skipKnowledgeBase: true
          })
        });
        const data = await res.json();
        if (res.ok && data?.result) {
          nextSummary = parseDailySummary(String(data.result), todayKey);
        }
      }

      if (!nextSummary || !nextSummary.summary) {
        nextSummary = buildFallbackSummary(todayKey);
      }

      localStorage.setItem(summaryCacheKey, JSON.stringify(nextSummary));
      setDailySummary(nextSummary);
      if (force) notify(t('Daily operating summary regenerated.'), 'success');
    } catch {
      const fallback = buildFallbackSummary(todayKey);
      localStorage.setItem(summaryCacheKey, JSON.stringify(fallback));
      setDailySummary(fallback);
      if (force) notify(t('AI summary failed. A safe local summary was generated.'), 'warning');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    generateDailySummary(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryCacheKey]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-900 border-t border-slate-800 p-6">
      <div className="w-full space-y-8 flex flex-col min-h-full">
        
        {/* Header/Banner */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('Agent Dashboard')}</h1>
            <p className="text-slate-400">{t('Track your progress and complete daily tasks to level up.')}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm font-bold text-cyan-400 uppercase tracking-wider">{userTitle}</div>
              <div className="text-3xl font-black text-white">LVL {userLevel}</div>
            </div>
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center border-4 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Trophy className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
        </div>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" /> {t('Operations Monitor')}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{t('Lead acquisition, pipeline health, communication load, and conversion signals.')}</p>
            </div>
            <button
              onClick={() => setView('agent-hub')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-bold text-slate-200"
            >
              {t('Open Global Agent')}
            </button>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-6 border border-cyan-900/40 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> {t('Daily Operating Summary')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {dailySummary
                    ? t('Generated once per day. Last updated: {time}').replace('{time}', new Date(dailySummary.generatedAt).toLocaleString())
                    : t('Preparing today summary...')}
                </p>
              </div>
              <button
                onClick={() => generateDailySummary(true)}
                disabled={summaryLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-bold text-slate-200 shrink-0"
              >
                <RefreshCw className={cn('w-4 h-4 text-cyan-400', summaryLoading && 'animate-spin')} />
                {summaryLoading ? t('Generating...') : t('Regenerate')}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="text-xs uppercase font-bold text-cyan-400 mb-2">{t('Summary')}</div>
                <p className="text-sm leading-6 text-slate-200">
                  {dailySummary?.summary || t('Preparing today summary...')}
                </p>
                {!!dailySummary?.highlights.length && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {dailySummary.highlights.map((item, index) => (
                      <span key={`${item}-${index}`} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="text-xs uppercase font-bold text-emerald-400 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> {t('Improvement Recommendations')}
                </div>
                <div className="space-y-3">
                  {(dailySummary?.recommendations.length ? dailySummary.recommendations : [t('Preparing today recommendations...')]).map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="mt-1 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-800 text-[10px] font-black text-emerald-300 flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="leading-6">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard icon={<Users className="w-5 h-5" />} label={t('Total Clients')} value={clients.length} subtext={t('{count}% closed-won conversion').replace('{count}', String(operations.conversionRate))} tone="cyan" />
            <MetricCard icon={<DollarSign className="w-5 h-5" />} label={t('Pipeline Value')} value={`$${operations.dealValue.toLocaleString()}`} subtext={t('Won: {value}').replace('{value}', `$${operations.wonValue.toLocaleString()}`)} tone="emerald" />
            <MetricCard icon={<Mail className="w-5 h-5" />} label={t('Unread Emails')} value={operations.emailRows[0].value} subtext={t('{count} open follow-up todos').replace('{count}', String(operations.openTodos))} tone={operations.emailRows[0].value > 0 ? 'amber' : 'cyan'} />
            <MetricCard icon={<Users className="w-5 h-5" />} label={t('Public Pool')} value={publicClients.length} subtext={t('{count} public pool leads').replace('{count}', String(publicClients.length))} tone="rose" />
          </div>

          <button
            type="button"
            onClick={openInboxFollowUps}
            className="w-full rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-left shadow-sm transition-colors hover:border-emerald-500/50 hover:bg-emerald-950/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-900/40 bg-emerald-950/40 text-emerald-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-100">{language === 'zh' ? '待跟进入口' : 'Follow-up Inbox'}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {language === 'zh' ? '查看所有已设置待跟进的邮件和 WhatsApp 对话。' : 'Open all email and WhatsApp conversations with follow-up reminders.'}
                  </div>
                </div>
              </div>
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-200">
                {operations.openTodos} {language === 'zh' ? '待跟进项' : 'follow-up todos'}
              </div>
            </div>
          </button>

          <ContributionHeatmap days={operations.contributionDays} total={operations.contributionTotal} t={t} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-400" /> {language === 'zh' ? 'Deals 漏斗' : 'Deals Funnel'}
                </h3>
                <button onClick={() => setView('kanban')} className="text-xs text-cyan-400 hover:text-cyan-300 font-bold">{t('View Kanban')}</button>
              </div>
              <FunnelBarChart rows={operations.dealFunnelRows} emptyLabel={language === 'zh' ? '暂无 Deals 数据。' : 'No deals data yet.'} />
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> {t('Activity Trend')}
                </h3>
                <span className="text-xs text-slate-500">{t('Last 7 days')}</span>
              </div>
              <SparklineChart points={operations.activityTrend} valueLabel={t('events')} />
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" /> {t('Email Load')}
                </h3>
                <button onClick={() => setView('inbox')} className="text-xs text-cyan-400 hover:text-cyan-300 font-bold">{t('Open Inbox')}</button>
              </div>
              <DonutChart rows={operations.emailRows} emptyLabel={t('No email activity yet.')} />
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" /> {language === 'zh' ? 'WhatsApp 负载' : 'WhatsApp Load'}
                </h3>
                <button onClick={() => setView('inbox')} className="text-xs text-cyan-400 hover:text-cyan-300 font-bold">{t('Open Inbox')}</button>
              </div>
              <DonutChart rows={operations.whatsappRows} emptyLabel={language === 'zh' ? '暂无 WhatsApp 活动。' : 'No WhatsApp activity yet.'} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 pb-8">
          
          {/* Main Experience Progress Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" /> {t('Level Progress')}
              </h2>
              <div className="mb-4 flex justify-between text-sm font-medium">
                <span className="text-slate-300">{t('level')} {userLevel}</span>
                <span className="text-cyan-400">{userExp} / {expToNextLevel} {t('experienceUnit')}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner mb-6">
                <div 
                  className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{currentStreak}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">{t('Day Streak')}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <Target className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">
                    {visibleQuests.filter(q => q.completed).length} / {visibleQuests.length}
                  </div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">{t('questsDone')}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <ArrowUpCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">
                    {expLogs.reduce((sum, log) => {
                      const today = new Date().toISOString().split('T')[0];
                      return log.date.startsWith(today) ? sum + log.amount : sum;
                    }, 0)}
                  </div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">{t('EXP Today')}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-colors">
                  <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{expLogs.length}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">{t('Lifetime Events')}</div>
                </div>
              </div>
            </div>

            {/* Daily Quests List */}
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" /> {t('quests')}
              </h2>
              <div className="space-y-3" ref={dropdownRef}>
                {visibleQuests.map((quest) => (
                  <div 
                    key={quest.id} 
                    className={cn(
                      "flex flex-col p-4 rounded-xl border transition-all duration-300",
                      quest.completed ? "bg-green-950/20 border-green-900/50" : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border",
                          quest.completed ? "bg-green-500/20 border-green-500/50 text-green-400" : "bg-slate-800 border-slate-700 text-slate-500"
                        )}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className={cn("font-bold text-sm", quest.completed ? "text-green-400" : "text-white")}>{t(quest.title)}</div>
                          <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{t(quest.description)}</div>
                          {quest.description.includes('Agent drafted instructions') && (
                            <button 
                              onClick={() => {
                                const match = quest.description.match(/"([^]+)"/);
                                if (match) navigator.clipboard.writeText(match[1]);
                              }}
                              className="mt-2 text-[10px] bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded"
                            >
                              Copy Draft
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-bold text-cyan-400 bg-cyan-950/30 px-3 py-1 rounded-full text-sm">
                          +{quest.expReward} {t('experienceUnit')}
                        </div>
                        {!quest.completed ? (
                          <div className="flex gap-2">
                            {(quest.id === 'q1' || quest.id === 'q2' || quest.id === 'q3' || quest.id.startsWith('weekly_')) && (
                              <button
                                 onClick={() => {
                                   if (quest.id === 'q1') setView('dormant');
                                   if (quest.id === 'q2') setView('leads');
                                   if (quest.id === 'q3') setView('followups');
                                   if (quest.id === 'weekly_quality_profiles') setView('clients');
                                   if (quest.id === 'weekly_pipeline_motion') setView('kanban');
                                   if (quest.id === 'weekly_agent_operator') setView('agent-hub');
                                 }}
                                 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
                              >
                                 {t('viewClients')}
                              </button>
                            )}
                            <button
                               onClick={() => setActiveDropdown(activeDropdown === quest.id ? null : quest.id)}
                               className={cn(
                                 "px-4 py-2 hover:bg-slate-700 text-sm font-bold text-slate-200 rounded-lg transition-colors border border-slate-700 cursor-pointer outline-none flex items-center gap-1 min-w-[72px] justify-center",
                                 activeDropdown === quest.id ? "bg-slate-700" : "bg-slate-800"
                               )}
                            >
                               {t('skip')} <ChevronDown className={cn("w-4 h-4 ml-1 opacity-70 transition-transform", activeDropdown === quest.id ? "rotate-180" : "")} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 uppercase px-4 py-2">{t('done')}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Skip Options */}
                    {!quest.completed && activeDropdown === quest.id && (
                      <div className="mt-4 pt-4 border-t border-slate-800/80 animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">{t('skip')}</h4>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 1, label: t('skip1') },
                            { value: 3, label: t('skip3') },
                            { value: 5, label: t('skip5') },
                            { value: 7, label: t('skip7') },
                            { value: 15, label: t('skip15') },
                            { value: 30, label: t('skip30') }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                skipQuest(quest.id, option.value);
                                setActiveDropdown(null);
                              }}
                              className="flex-1 min-w-[100px] flex flex-col items-center justify-center p-2 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-cyan-500/50 transition-colors whitespace-nowrap"
                            >
                              <span className="text-sm font-bold text-slate-200">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Todos */}
            {upcomingTodos.length > 0 && (
              <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 shadow-sm mt-8">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" /> {t('Upcoming Todos')}
                </h2>
                <div className="space-y-3">
                  {upcomingTodos.map((todo) => {
                    const dueTime = new Date(todo.todoAt).getTime();
                    const isPastDue = dueTime < now;
                    const TodoIcon = todo.channel === 'whatsapp' ? MessageCircle : Mail;
                    return (
                      <div 
                        key={todo.id} 
                        className={cn(
                          "flex flex-col p-4 rounded-xl border transition-all duration-300",
                          isPastDue ? "bg-red-950/20 border-red-900/50" : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4 items-start">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex shrink-0 items-center justify-center border mt-0.5",
                              isPastDue ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-slate-800 border-slate-700 text-slate-500"
                            )}>
                              <TodoIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={cn("font-bold text-sm truncate", isPastDue ? "text-red-400" : "text-white")}>{todo.subject}</div>
                              {todo.contact && <div className="text-xs text-slate-500 mt-1 truncate">{todo.contact}</div>}
                              {todo.todoNote && <div className="text-xs text-slate-400 mt-1">{todo.todoNote}</div>}
                              <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3" />
                                <span className={isPastDue ? "text-red-400" : ""}>
                                  {isPastDue ? t('Past Due: ') : t('Due: ')}
                                  {new Date(todo.todoAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                             onClick={openInboxFollowUps}
                             className="shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-cyan-500 text-xs font-bold text-slate-300 rounded-lg transition-colors border shadow-sm"
                          >
                             {t('View')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Logs */}
          <div className="bg-slate-950/50 rounded-2xl border border-slate-800 shadow-sm flex flex-col h-full min-h-[500px]">
             <div className="p-6 border-b border-slate-800 shrink-0">
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <History className="w-5 h-5 text-indigo-400" /> {t('expHistory')}
               </h2>
             </div>
             <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
               <div className="space-y-3">
                 {expLogs.length === 0 ? (
                   <div className="text-center text-slate-500 py-12 text-sm" dangerouslySetInnerHTML={{__html: t('noExp')}}>
                   </div>
                 ) : (
                   expLogs.map(log => (
                     <div key={log.id} className="flex gap-4 p-3 rounded-lg hover:bg-slate-900/80 transition-colors group">
                       <div className="pt-1">
                         <div className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-900/50 flex items-center justify-center shadow-inner group-hover:bg-cyan-900 transition-colors">
                           <ArrowUpCircle className="w-4 h-4 text-cyan-400" />
                         </div>
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="font-medium text-sm text-slate-200 truncate">{log.reason}</div>
                         <div className="text-xs text-slate-500 mt-1">
                           {new Date(log.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                         </div>
                       </div>
                       <div className="font-bold text-cyan-400 text-sm whitespace-nowrap">
                         +{log.amount} {t('experienceUnit')}
                       </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
