import React from 'react';
import { ArrowLeft, Mail, MessageCircle, MessageSquare, Send, Tag, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CONVERSATION_STAGES } from './constants';

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
  const Icon = channel === 'whatsapp' ? MessageCircle : channel === 'live_chat' ? MessageSquare : channel === 'telegram' ? Send : Mail;
  const accent = channel === 'whatsapp'
    ? 'border-green-200 bg-green-50 text-green-600'
    : channel === 'live_chat'
      ? 'border-violet-200 bg-violet-50 text-violet-600'
      : channel === 'telegram'
        ? 'border-sky-200 bg-sky-50 text-sky-600'
        : 'border-cyan-200 bg-cyan-50 text-cyan-600';
  const badge = channel === 'whatsapp'
    ? 'border-green-200 bg-green-50 text-green-700'
    : channel === 'live_chat'
      ? 'border-violet-200 bg-violet-50 text-violet-700'
      : channel === 'telegram'
        ? 'border-sky-200 bg-sky-50 text-sky-700'
        : 'border-cyan-200 bg-cyan-50 text-cyan-700';
  const label = channel === 'whatsapp'
    ? 'WhatsApp'
    : channel === 'live_chat'
      ? 'Live Chat'
      : channel === 'telegram'
        ? 'Telegram'
        : 'Email';

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
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
              <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', badge)}>
                {label}
              </span>
              {clientId && (
                <button
                  type="button"
                  onClick={onClientClick}
                  className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  {clientName || (language === 'zh' ? '已关联客户' : 'Linked client')}
                </button>
              )}
            </div>

            {subtitle && <div className="mt-1 truncate text-xs text-slate-500">{subtitle}</div>}
            {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">{meta}</div>}

            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.slice(0, 8).map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={ownerId || ''}
                onChange={event => onOwnerChange?.(event.target.value || null)}
                disabled={!onOwnerChange}
                className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                title={language === 'zh' ? '负责人' : 'Owner'}
              >
                <option value="">{language === 'zh' ? '负责人：未分配' : 'Owner: Unassigned'}</option>
                {currentUser && <option value={currentUser.id}>{language === 'zh' ? '负责人：我' : 'Owner: Me'}</option>}
              </select>
              <select
                value={stage || ''}
                onChange={event => onStageChange?.(event.target.value || null)}
                disabled={!onStageChange}
                className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                title={language === 'zh' ? '阶段' : 'Stage'}
              >
                <option value="">{language === 'zh' ? '阶段：未设置' : 'Stage: None'}</option>
                {CONVERSATION_STAGES.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded-md border border-slate-200 p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              title={language === 'zh' ? '删除' : 'Delete'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
