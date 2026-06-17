import React from 'react';
import {
  CalendarClock,
  Mail,
  MailOpen,
  MessageCircle,
  MessageSquare,
  Send,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { EmailMessage } from '../../store';
import { cn } from '../../lib/utils';
import { CONVERSATION_STAGES } from './constants';
import type { InboxMailFilter } from './InboxConversationSidebarTypes';
import type {
  InboxQueueDensity,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
} from './inboxModel';

interface InboxConversationListItemProps {
  language: string;
  conversation: UnifiedCommunicationConversation;
  email?: EmailMessage | null;
  clientName?: string;
  filter: InboxMailFilter;
  density: InboxQueueDensity;
  isSelected: boolean;
  isChecked: boolean;
  currentUser?: { id: string } | null;
  whatsappConversation?: InboxWhatsAppConversation | null;
  onSelect: () => void;
  onToggleSelection: (event: React.MouseEvent) => void;
  onDeleteWhatsApp?: () => void;
  onOwnerStageChange: (
    updates: { ownerId?: string | null; stage?: string | null },
  ) => void;
}

function formatConversationTimestamp(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function InboxConversationListItem({
  language,
  conversation,
  email,
  clientName,
  filter,
  density,
  isSelected,
  isChecked,
  currentUser,
  whatsappConversation,
  onSelect,
  onToggleSelection,
  onDeleteWhatsApp,
  onOwnerStageChange,
}: InboxConversationListItemProps) {
  const isZh = language === 'zh';
  const isEmail = conversation.channel === 'email';
  const isWhatsApp = conversation.channel === 'whatsapp';
  const isLiveChat = conversation.channel === 'live_chat';
  const isTelegram = conversation.channel === 'telegram';
  const isUnreadEmail = isEmail && !conversation.read && filter === 'inbox';
  const hasImportant = Boolean(
    conversation.is_important || (conversation.tags || []).includes('important'),
  );
  const isOutbound = conversation.direction === 'outbound';
  const isCompact = density === 'compact';

  const Icon = isWhatsApp
    ? MessageCircle
    : isLiveChat
      ? MessageSquare
      : isTelegram
        ? Send
        : conversation.read
          ? MailOpen
          : Mail;

  const accent = isWhatsApp
    ? {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: 'border-emerald-200 bg-emerald-50 text-emerald-600',
        selected:
          'border-emerald-200 bg-emerald-50/70 shadow-[0_10px_30px_rgba(34,197,94,0.08)]',
        activeLine: 'before:bg-emerald-500',
      }
    : isLiveChat
      ? {
          badge: 'border-violet-200 bg-violet-50 text-violet-700',
          icon: 'border-violet-200 bg-violet-50 text-violet-600',
          selected:
            'border-violet-200 bg-violet-50/70 shadow-[0_10px_30px_rgba(139,92,246,0.08)]',
          activeLine: 'before:bg-violet-500',
        }
      : isTelegram
        ? {
            badge: 'border-sky-200 bg-sky-50 text-sky-700',
            icon: 'border-sky-200 bg-sky-50 text-sky-600',
            selected:
              'border-sky-200 bg-sky-50/70 shadow-[0_10px_30px_rgba(14,165,233,0.08)]',
            activeLine: 'before:bg-sky-500',
          }
        : {
            badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
            icon: 'border-cyan-200 bg-cyan-50 text-cyan-600',
            selected:
              'border-cyan-200 bg-cyan-50/70 shadow-[0_10px_30px_rgba(6,182,212,0.08)]',
            activeLine: 'before:bg-[#ff7a59]',
          };

  const channelLabel = isWhatsApp
    ? (isOutbound ? 'WhatsApp sent' : 'WhatsApp inbox')
    : isLiveChat
      ? 'Live Chat'
      : isTelegram
        ? 'Telegram'
        : email?.type === 'draft'
          ? (isZh ? '邮件草稿' : 'Draft')
          : email?.type === 'scheduled'
            ? (isZh ? '定时邮件' : 'Scheduled email')
            : isOutbound
              ? (isZh ? '邮件已发' : 'Email sent')
              : (isZh ? '邮件收件' : 'Email inbox');

  const title = isEmail
    ? filter === 'inbox'
      ? email?.senderName
        || conversation.contact_name
        || conversation.contact_address
        || 'Email'
      : conversation.contact_address || conversation.contact_name || 'Email'
    : clientName
      || conversation.client_name
      || conversation.title
      || conversation.contact_name
      || conversation.contact_address
      || (isWhatsApp
        ? 'WhatsApp'
        : isTelegram
          ? 'Telegram'
          : 'Live Chat');

  const subtitle = isEmail
    ? conversation.subject || conversation.title || (isZh ? '无主题' : 'No subject')
    : conversation.contact_address || conversation.client_company || '';

  const timeLabel = formatConversationTimestamp(conversation.last_message_at);
  const followUpLabel = conversation.todo_at
    ? `${isZh ? '待跟进' : 'Follow-up'} ${formatConversationTimestamp(conversation.todo_at)}`
    : '';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative mx-3 my-2 cursor-pointer rounded-2xl border bg-white transition-all duration-150 before:absolute before:bottom-3 before:left-0 before:top-3 before:w-1 before:rounded-r-full before:opacity-0',
        isCompact ? 'px-3 py-3' : 'px-4 py-4',
        isSelected
          ? cn('before:opacity-100', accent.selected, accent.activeLine)
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm',
        isUnreadEmail && !isSelected && 'border-l-4 border-l-[#ff7a59]',
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'pt-0.5 transition-opacity',
            isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          onClick={onToggleSelection}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            className={cn(
              'rounded border-slate-300 bg-white focus:ring-cyan-500',
              isWhatsApp
                ? 'text-emerald-500'
                : isLiveChat
                  ? 'text-violet-500'
                  : isTelegram
                    ? 'text-sky-500'
                    : 'text-cyan-500',
            )}
          />
        </div>

        <div className="shrink-0 pt-0.5">
          <div
            className={cn(
              'flex items-center justify-center rounded-2xl border shadow-sm',
              isCompact ? 'h-9 w-9' : 'h-10 w-10',
              accent.icon,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'truncate text-sm font-semibold',
                    isUnreadEmail ? 'text-slate-950' : 'text-slate-800',
                  )}
                >
                  {title}
                </span>
                {isUnreadEmail && (
                  <span className="rounded-full bg-[#fff4f1] px-2 py-0.5 text-[10px] font-semibold text-[#d54e2d]">
                    {isZh ? '未读' : 'Unread'}
                  </span>
                )}
                {hasImportant && (
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                )}
              </div>
              {subtitle && (
                <div
                  className={cn(
                    'mt-1 truncate text-xs',
                    isUnreadEmail
                      ? 'font-medium text-slate-700'
                      : 'text-slate-500',
                  )}
                >
                  {subtitle}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {timeLabel && (
                <span className="text-[11px] font-medium text-slate-400">
                  {timeLabel}
                </span>
              )}
              {isWhatsApp && whatsappConversation && onDeleteWhatsApp && (
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    onDeleteWhatsApp();
                  }}
                  className="rounded-lg p-1 text-slate-400 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                  title={
                    isZh
                      ? '删除 WhatsApp 对话'
                      : 'Delete WhatsApp conversation'
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div
            className={cn(
              'flex flex-wrap items-center gap-2',
              isCompact ? 'mt-2.5' : 'mt-3',
            )}
          >
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                accent.badge,
              )}
            >
              {channelLabel}
            </span>
            {followUpLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                <CalendarClock className="h-3 w-3" />
                {followUpLabel}
              </span>
            )}
            {conversation.stage && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                {conversation.stage}
              </span>
            )}
            {conversation.owner_id && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                <UserRound className="h-3 w-3" />
                {isZh ? '已分配' : 'Assigned'}
              </span>
            )}
          </div>

          {conversation.last_message_preview && (
            <div
              className={cn(
                'text-xs leading-5 text-slate-500',
                isCompact ? 'mt-2 line-clamp-1' : 'mt-3 line-clamp-2',
              )}
            >
              {conversation.last_message_preview}
            </div>
          )}

          {!isCompact && conversation.tags && conversation.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {conversation.tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div
            className={cn(
              'overflow-hidden transition-all duration-150',
              isCompact ? 'mt-3' : 'mt-4',
              isSelected
                ? 'max-h-32 opacity-100'
                : 'max-h-0 opacity-0 group-hover:max-h-32 group-hover:opacity-100',
            )}
            onClick={event => event.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200">
              <div className="rounded-xl bg-white px-2.5 py-2 ring-1 ring-slate-200">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {isZh ? '负责人' : 'Owner'}
                </div>
                <select
                  value={conversation.owner_id || ''}
                  onChange={event =>
                    onOwnerStageChange({ ownerId: event.target.value || null })
                  }
                  className="w-full min-w-0 bg-transparent text-[11px] font-semibold text-slate-700 outline-none"
                  title={isZh ? '负责人' : 'Owner'}
                >
                  <option value="">
                    {isZh ? '未分配' : 'Unassigned'}
                  </option>
                  {currentUser && (
                    <option value={currentUser.id}>
                      {isZh ? '我负责' : 'Me'}
                    </option>
                  )}
                </select>
              </div>

              <div className="rounded-xl bg-white px-2.5 py-2 ring-1 ring-slate-200">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {isZh ? '阶段' : 'Stage'}
                </div>
                <select
                  value={conversation.stage || ''}
                  onChange={event =>
                    onOwnerStageChange({ stage: event.target.value || null })
                  }
                  className="w-full min-w-0 bg-transparent text-[11px] font-semibold text-slate-700 outline-none"
                  title={isZh ? '阶段' : 'Stage'}
                >
                  <option value="">
                    {isZh ? '未设置阶段' : 'No stage'}
                  </option>
                  {CONVERSATION_STAGES.map(stage => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
