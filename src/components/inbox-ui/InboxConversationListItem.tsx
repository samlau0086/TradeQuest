import React from 'react';
import { Mail, MailOpen, MessageCircle, MessageSquare, Send, Star, Trash2 } from 'lucide-react';
import { EmailMessage } from '../../store';
import { cn } from '../../lib/utils';
import { CONVERSATION_STAGES } from './constants';
import { InboxWhatsAppConversation, UnifiedCommunicationConversation } from './inboxModel';

type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';

interface InboxConversationListItemProps {
  language: string;
  conversation: UnifiedCommunicationConversation;
  email?: EmailMessage | null;
  clientName?: string;
  filter: InboxMailFilter;
  isSelected: boolean;
  isChecked: boolean;
  currentUser?: { id: string } | null;
  whatsappConversation?: InboxWhatsAppConversation | null;
  onSelect: () => void;
  onToggleSelection: (event: React.MouseEvent) => void;
  onDeleteWhatsApp?: () => void;
  onOwnerStageChange: (updates: { ownerId?: string | null; stage?: string | null }) => void;
}

export function InboxConversationListItem({
  language,
  conversation,
  email,
  clientName,
  filter,
  isSelected,
  isChecked,
  currentUser,
  whatsappConversation,
  onSelect,
  onToggleSelection,
  onDeleteWhatsApp,
  onOwnerStageChange,
}: InboxConversationListItemProps) {
  const isEmail = conversation.channel === 'email';
  const isWhatsApp = conversation.channel === 'whatsapp';
  const isLiveChat = conversation.channel === 'live_chat';
  const isTelegram = conversation.channel === 'telegram';
  const Icon = isWhatsApp ? MessageCircle : isLiveChat ? MessageSquare : isTelegram ? Send : conversation.read ? MailOpen : Mail;
  const iconColor = isWhatsApp ? 'text-green-500' : isLiveChat ? 'text-violet-500' : isTelegram ? 'text-sky-500' : conversation.read ? 'text-slate-500' : 'text-cyan-500';
  const iconBg = isWhatsApp ? 'bg-green-50 border-green-200' : isLiveChat ? 'bg-violet-50 border-violet-200' : isTelegram ? 'bg-sky-50 border-sky-200' : 'bg-cyan-50 border-cyan-200';
  const channelLabel = isWhatsApp
    ? `WhatsApp ${conversation.direction === 'outbound' ? 'sent' : 'inbox'}`
    : isLiveChat
      ? `Live Chat ${conversation.status || 'open'}`
      : isTelegram
        ? `Telegram ${conversation.status || 'open'}`
        : email?.type === 'draft'
          ? 'Draft'
          : email?.type === 'scheduled'
            ? 'Scheduled Email'
            : conversation.direction === 'outbound'
              ? 'Email sent'
              : 'Email inbox';
  const title = isEmail
    ? filter === 'inbox'
      ? email?.senderName || conversation.contact_name || conversation.contact_address || 'Email'
      : conversation.contact_address || conversation.contact_name || 'Email'
    : clientName || conversation.client_name || conversation.title || conversation.contact_name || conversation.contact_address || (isWhatsApp ? 'WhatsApp' : isTelegram ? 'Telegram' : 'Live Chat');
  const subtitle = isEmail ? conversation.subject || conversation.title || '(No Subject)' : conversation.contact_address || conversation.client_company || '';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative mx-3 my-2 flex cursor-pointer gap-3 rounded-lg border p-4 transition-all',
        isSelected
          ? isWhatsApp
            ? 'border-green-200 bg-green-50 shadow-sm'
            : isLiveChat
              ? 'border-violet-200 bg-violet-50 shadow-sm'
              : isTelegram
                ? 'border-sky-200 bg-sky-50 shadow-sm'
                : 'border-cyan-200 bg-cyan-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm',
        isEmail && !conversation.read && filter === 'inbox' && !isSelected && 'border-l-4 border-l-[#ff7a59]'
      )}
    >
      <div
        className={cn('pt-0.5 transition-opacity', isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
        onClick={onToggleSelection}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => {}}
          className={cn(
            'rounded border-slate-300 bg-white focus:ring-cyan-500',
            isWhatsApp ? 'text-green-500' : isLiveChat ? 'text-violet-500' : isTelegram ? 'text-sky-500' : 'text-cyan-500'
          )}
        />
      </div>

      <div className="shrink-0 pt-0.5">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className={cn('truncate text-sm font-bold', isEmail && !conversation.read && filter === 'inbox' ? 'text-slate-950' : 'text-slate-800')}>
            {title}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-[10px] text-slate-400">
              {conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : channelLabel}
            </span>
            {(conversation.is_important || (conversation.tags || []).includes('important')) && (
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            )}
            {isWhatsApp && whatsappConversation && onDeleteWhatsApp && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteWhatsApp();
                }}
                className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                title="Delete WhatsApp conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div
          className={cn(
            'mb-1 text-[10px] font-bold uppercase',
            isWhatsApp ? 'text-green-500' : isLiveChat ? 'text-violet-500' : isTelegram ? 'text-sky-500' : 'text-cyan-500'
          )}
        >
          {channelLabel}
        </div>

        {subtitle && (
          <div className={cn('mb-1 truncate text-xs font-medium', isEmail && !conversation.read && filter === 'inbox' ? 'text-slate-700' : 'text-slate-500')}>
            {subtitle}
          </div>
        )}

        {conversation.last_message_preview && (
          <div className="line-clamp-2 text-xs text-slate-500">
            {conversation.last_message_preview}
          </div>
        )}

        {conversation.tags && conversation.tags.length > 0 && (
          <div className="mt-2 flex gap-1 overflow-x-auto scrollbar-hide">
            {conversation.tags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className={cn(
                  'whitespace-nowrap rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold',
                  isWhatsApp ? 'text-green-700' : isLiveChat ? 'text-violet-700' : isTelegram ? 'text-sky-700' : 'text-slate-600'
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2" onClick={event => event.stopPropagation()}>
          <select
            value={conversation.owner_id || ''}
            onChange={event => onOwnerStageChange({ ownerId: event.target.value || null })}
            className="min-w-0 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 outline-none hover:border-slate-300 focus:border-blue-500"
            title={language === 'zh' ? '负责人' : 'Owner'}
          >
            <option value="">{language === 'zh' ? '未分配' : 'Unassigned'}</option>
            {currentUser && (
              <option value={currentUser.id}>{language === 'zh' ? '我负责' : 'Owner: Me'}</option>
            )}
          </select>
          <select
            value={conversation.stage || ''}
            onChange={event => onOwnerStageChange({ stage: event.target.value || null })}
            className="min-w-0 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 outline-none hover:border-slate-300 focus:border-purple-500"
            title={language === 'zh' ? '阶段' : 'Stage'}
          >
            <option value="">{language === 'zh' ? '未设阶段' : 'No stage'}</option>
            {CONVERSATION_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
