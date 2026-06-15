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
  const Icon = isWhatsApp ? MessageCircle : isLiveChat ? MessageSquare : isTelegram ? Send : (conversation.read ? MailOpen : Mail);
  const iconColor = isWhatsApp ? 'text-green-400' : isLiveChat ? 'text-violet-300' : isTelegram ? 'text-sky-300' : conversation.read ? 'text-slate-500' : 'text-cyan-400';
  const iconBg = isWhatsApp ? 'bg-green-950/50 border-green-900/60' : isLiveChat ? 'bg-violet-950/50 border-violet-900/60' : isTelegram ? 'bg-sky-950/50 border-sky-900/60' : 'bg-cyan-950/50 border-cyan-900/60';
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
    ? (filter === 'inbox' ? (email?.senderName || conversation.contact_name || conversation.contact_address || 'Email') : (conversation.contact_address || conversation.contact_name || 'Email'))
    : clientName || conversation.client_name || conversation.title || conversation.contact_name || conversation.contact_address || (isWhatsApp ? 'WhatsApp' : isTelegram ? 'Telegram' : 'Live Chat');
  const subtitle = isEmail ? (conversation.subject || conversation.title || '(No Subject)') : (conversation.contact_address || conversation.client_company || '');

  return (
    <div
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-b border-slate-800/50 p-4 transition-colors flex gap-3 group relative",
        isSelected ? (isWhatsApp ? "bg-green-950/20" : isLiveChat ? "bg-violet-950/20" : isTelegram ? "bg-sky-950/20" : "bg-cyan-950/20") : "hover:bg-slate-800/30",
        isEmail && !conversation.read && filter === 'inbox' && "bg-slate-800/40"
      )}
    >
      <div
        className={cn("pt-0.5 transition-opacity", isChecked ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
        onClick={onToggleSelection}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => {}}
          className={cn("rounded border-slate-700 bg-slate-800 focus:ring-cyan-500", isWhatsApp ? "text-green-500" : isLiveChat ? "text-violet-500" : isTelegram ? "text-sky-500" : "text-cyan-500")}
        />
      </div>
      <div className="pt-0.5 flex-shrink-0">
        <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className={cn("text-sm font-bold truncate", isEmail && !conversation.read && filter === 'inbox' ? "text-white" : "text-slate-200")}>
            {title}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-slate-500">
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
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition-opacity"
                title="Delete WhatsApp conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className={cn(
          "text-[10px] font-bold uppercase mb-1",
          isWhatsApp ? 'text-green-400' : isLiveChat ? 'text-violet-300' : isTelegram ? 'text-sky-300' : 'text-cyan-400'
        )}>
          {channelLabel}
        </div>
        {subtitle && (
          <div className={cn("text-xs font-medium mb-1 truncate", isEmail && !conversation.read && filter === 'inbox' ? "text-slate-200" : "text-slate-400")}>
            {subtitle}
          </div>
        )}
        {conversation.last_message_preview && (
          <div className="text-xs text-slate-500 line-clamp-2">
            {conversation.last_message_preview}
          </div>
        )}
        {conversation.tags && conversation.tags.length > 0 && (
          <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-hide">
            {conversation.tags.slice(0, 4).map(tag => (
              <span key={tag} className={cn(
                "text-[9px] bg-slate-800 px-1.5 py-0.5 rounded-full whitespace-nowrap",
                isWhatsApp ? 'text-green-300' : isLiveChat ? 'text-violet-200' : isTelegram ? 'text-sky-200' : 'text-slate-400'
              )}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2" onClick={event => event.stopPropagation()}>
          <select
            value={conversation.owner_id || ''}
            onChange={event => onOwnerStageChange({ ownerId: event.target.value || null })}
            className="min-w-0 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400 outline-none hover:border-slate-700 focus:border-blue-500"
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
            className="min-w-0 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400 outline-none hover:border-slate-700 focus:border-purple-500"
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
