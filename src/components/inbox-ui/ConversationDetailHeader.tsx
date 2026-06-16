import React from 'react';
import { ArrowLeft, Mail, MessageCircle, MessageSquare, Send, Tag, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CONVERSATION_STAGES } from './constants';
import {
  ConversationToolbarButton,
  ConversationToolbarField,
  ConversationToolbarGroup,
  ConversationToolbarPill,
  type ToolbarTone,
} from './ConversationToolbar';

export type InboxConversationChannel = 'email' | 'whatsapp' | 'live_chat' | 'telegram';

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
  onBack: () => void;
  onClientClick?: () => void;
  onOwnerChange?: (ownerId: string | null) => void;
  onStageChange?: (stage: string | null) => void;
  onDelete?: () => void;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

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
  onBack,
  onClientClick,
  onOwnerChange,
  onStageChange,
  onDelete,
  actions,
  meta,
}: ConversationDetailHeaderProps) {
  const isZh = language === 'zh';
  const Icon =
    channel === 'whatsapp'
      ? MessageCircle
      : channel === 'live_chat'
        ? MessageSquare
        : channel === 'telegram'
          ? Send
          : Mail;
  const accent =
    channel === 'whatsapp'
      ? 'border-green-200 bg-green-50 text-green-600'
      : channel === 'live_chat'
        ? 'border-violet-200 bg-violet-50 text-violet-600'
        : channel === 'telegram'
          ? 'border-sky-200 bg-sky-50 text-sky-600'
          : 'border-cyan-200 bg-cyan-50 text-cyan-600';
  const badgeTone: ToolbarTone =
    channel === 'whatsapp'
      ? 'success'
      : channel === 'live_chat'
        ? 'violet'
        : channel === 'telegram'
          ? 'sky'
          : 'info';
  const label =
    channel === 'whatsapp'
      ? 'WhatsApp'
      : channel === 'live_chat'
        ? 'Live Chat'
        : channel === 'telegram'
          ? 'Telegram'
          : 'Email';

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            onClick={onBack}
            className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm', accent)}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold tracking-tight text-slate-950">{title}</h2>
              <ConversationToolbarPill tone={badgeTone}>{label}</ConversationToolbarPill>
              {clientId && (
                <button
                  type="button"
                  onClick={onClientClick}
                  className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  {clientName || (isZh ? '已关联客户' : 'Linked client')}
                </button>
              )}
            </div>

            {subtitle && <div className="mt-1 truncate text-xs text-slate-500">{subtitle}</div>}
            {meta && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">{meta}</div>}

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

            <ConversationToolbarGroup className="mt-4">
              <ConversationToolbarField
                label={isZh ? '负责人' : 'Owner'}
                className="min-w-[180px] flex-1"
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
                className="min-w-[180px] flex-1"
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
            </ConversationToolbarGroup>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 xl:max-w-[38%]">
          {actions}
          {onDelete && (
            <ConversationToolbarButton
              onClick={onDelete}
              tone="danger"
              compact
              title={isZh ? '删除' : 'Delete'}
            >
              <Trash2 className="h-4 w-4" />
            </ConversationToolbarButton>
          )}
        </div>
      </div>
    </div>
  );
}
