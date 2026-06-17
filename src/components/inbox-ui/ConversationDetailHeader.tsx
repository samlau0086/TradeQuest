import React from 'react';
import { ArrowLeft, Mail, MessageCircle, MessageSquare, Send, ShieldCheck, Tag, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CONVERSATION_STAGES } from './constants';
import {
  ConversationToolbarButton,
  ConversationToolbarField,
  ConversationToolbarPill,
  type ToolbarTone,
} from './ConversationToolbar';

export type InboxConversationChannel = 'email' | 'whatsapp' | 'live_chat' | 'telegram';

interface ConversationDetailHeaderStatusBadge {
  label: string;
  tone?: ToolbarTone;
}

interface ConversationDetailHeaderProps {
  language: string;
  channel: InboxConversationChannel;
  title: string;
  subtitle?: string;
  clientId?: string;
  clientName?: string;
  tags?: string[];
  ownerId?: string;
  stage?: string;
  currentUser?: { id: string } | null;
  statusBadges?: ConversationDetailHeaderStatusBadge[];
  onBack: () => void;
  onClientClick?: () => void;
  onOwnerChange?: (ownerId: string | null) => void;
  onStageChange?: (stage: string | null) => void;
  onDelete?: () => void;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

const channelConfig: Record<
  InboxConversationChannel,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    accent: string;
    badgeTone: ToolbarTone;
    eyebrowZh: string;
    eyebrowEn: string;
  }
> = {
  email: {
    icon: Mail,
    label: 'Email',
    accent: 'border-cyan-200 bg-cyan-50 text-cyan-600',
    badgeTone: 'info',
    eyebrowZh: '邮件工作区',
    eyebrowEn: 'Email workspace',
  },
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    badgeTone: 'success',
    eyebrowZh: 'WhatsApp 工作区',
    eyebrowEn: 'WhatsApp workspace',
  },
  live_chat: {
    icon: MessageSquare,
    label: 'Live Chat',
    accent: 'border-violet-200 bg-violet-50 text-violet-600',
    badgeTone: 'violet',
    eyebrowZh: '在线聊天工作区',
    eyebrowEn: 'Live chat workspace',
  },
  telegram: {
    icon: Send,
    label: 'Telegram',
    accent: 'border-sky-200 bg-sky-50 text-sky-600',
    badgeTone: 'sky',
    eyebrowZh: 'Telegram 工作区',
    eyebrowEn: 'Telegram workspace',
  },
};

export function ConversationDetailHeader({
  language,
  channel,
  title,
  subtitle,
  clientId,
  clientName,
  tags = [],
  ownerId,
  stage,
  currentUser,
  statusBadges = [],
  onBack,
  onClientClick,
  onOwnerChange,
  onStageChange,
  onDelete,
  actions,
  meta,
}: ConversationDetailHeaderProps) {
  const isZh = language === 'zh';
  const config = channelConfig[channel];
  const Icon = config.icon;

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.94)_0%,rgba(241,245,249,0.88)_100%)] px-4 py-3 backdrop-blur-sm md:px-5">
      <div className="rounded-[30px] border border-slate-200/80 bg-white/96 px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.07)] md:px-5 md:py-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                title={isZh ? '返回列表' : 'Back to list'}
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>

              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm',
                  config.accent,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {isZh ? config.eyebrowZh : config.eyebrowEn}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ConversationToolbarPill tone={config.badgeTone}>{config.label}</ConversationToolbarPill>
                  {clientId && (
                    <button
                      type="button"
                      onClick={onClientClick}
                      className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      {clientName || (isZh ? '已关联客户' : 'Linked customer')}
                    </button>
                  )}
                  {tags.length > 0 && (
                    <ConversationToolbarPill>
                      <Tag className="h-3 w-3" />
                      {isZh ? `${tags.length} 个标签` : `${tags.length} tags`}
                    </ConversationToolbarPill>
                  )}
                </div>

                <h2 className="mt-3 truncate text-[28px] font-semibold tracking-tight text-slate-950">{title}</h2>
                {subtitle && <div className="mt-1 truncate text-sm text-slate-500">{subtitle}</div>}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 xl:max-w-[42%]">
              {actions}
              {onDelete && (
                <ConversationToolbarButton
                  onClick={onDelete}
                  tone="danger"
                  compact
                  title={isZh ? '删除会话' : 'Delete conversation'}
                >
                  <Trash2 className="h-4 w-4" />
                </ConversationToolbarButton>
              )}
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.4fr)_minmax(220px,0.4fr)]">
            <div className="min-w-0 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isZh ? '会话概况' : 'Conversation overview'}
              </div>

              {statusBadges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {statusBadges.map(badge => (
                    <ConversationToolbarPill key={`${badge.label}:${badge.tone || 'default'}`} tone={badge.tone || 'default'}>
                      {badge.label}
                    </ConversationToolbarPill>
                  ))}
                </div>
              )}

              {meta && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {meta}
                </div>
              )}

              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.slice(0, 8).map(tag => (
                    <ConversationToolbarPill key={tag}>
                      <Tag className="h-3 w-3" />
                      {tag}
                    </ConversationToolbarPill>
                  ))}
                </div>
              )}
            </div>

            <ConversationToolbarField
              label={isZh ? '负责人' : 'Owner'}
              className="rounded-[24px] border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-sm"
            >
              <select
                value={ownerId || ''}
                onChange={event => onOwnerChange?.(event.target.value || null)}
                disabled={!onOwnerChange}
                className="w-full min-w-0 bg-transparent text-xs font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                title={isZh ? '负责人' : 'Owner'}
              >
                <option value="">{isZh ? '未分配' : 'Unassigned'}</option>
                {currentUser && <option value={currentUser.id}>{isZh ? '我负责' : 'Owner: Me'}</option>}
              </select>
            </ConversationToolbarField>

            <ConversationToolbarField
              label={isZh ? '阶段' : 'Stage'}
              className="rounded-[24px] border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-sm"
            >
              <select
                value={stage || ''}
                onChange={event => onStageChange?.(event.target.value || null)}
                disabled={!onStageChange}
                className="w-full min-w-0 bg-transparent text-xs font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                title={isZh ? '阶段' : 'Stage'}
              >
                <option value="">{isZh ? '未设置' : 'None'}</option>
                {CONVERSATION_STAGES.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </ConversationToolbarField>
          </div>
        </div>
      </div>
    </div>
  );
}
