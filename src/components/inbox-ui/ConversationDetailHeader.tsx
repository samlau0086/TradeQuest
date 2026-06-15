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
  meta
}: ConversationDetailHeaderProps) {
  const Icon = channel === 'whatsapp' ? MessageCircle : channel === 'live_chat' ? MessageSquare : channel === 'telegram' ? Send : Mail;
  const accent = channel === 'whatsapp'
    ? 'text-green-400 bg-green-950/50 border-green-900/60'
    : channel === 'live_chat'
      ? 'text-violet-300 bg-violet-950/50 border-violet-900/60'
      : channel === 'telegram'
        ? 'text-sky-300 bg-sky-950/50 border-sky-900/60'
        : 'text-cyan-400 bg-cyan-950/50 border-cyan-900/60';
  const label = channel === 'whatsapp'
    ? 'WhatsApp'
    : channel === 'live_chat'
      ? 'Live Chat'
      : channel === 'telegram'
        ? 'Telegram'
        : 'Email';

  return (
    <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 sticky top-0 md:static backdrop-blur-sm z-10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className={cn("w-10 h-10 rounded-full border flex items-center justify-center shrink-0", accent)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-bold text-white text-sm truncate">{title}</div>
              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                {label}
              </span>
              {clientId && (
                <button
                  type="button"
                  onClick={onClientClick}
                  className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-900/40"
                >
                  {clientName || (language === 'zh' ? '已关联客户' : 'Linked client')}
                </button>
              )}
            </div>
            {subtitle && <div className="mt-1 truncate text-[10px] text-slate-500">{subtitle}</div>}
            {meta && <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">{meta}</div>}
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.slice(0, 8).map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300">
                    <Tag className="h-3 w-3" /> {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={ownerId || ''}
                onChange={event => onOwnerChange?.(event.target.value || null)}
                disabled={!onOwnerChange}
                className="min-w-0 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400 outline-none hover:border-slate-700 focus:border-blue-500 disabled:opacity-50"
                title={language === 'zh' ? '负责人' : 'Owner'}
              >
                <option value="">{language === 'zh' ? '未分配负责人' : 'Owner: Unassigned'}</option>
                {currentUser && <option value={currentUser.id}>{language === 'zh' ? '负责人：我' : 'Owner: Me'}</option>}
              </select>
              <select
                value={stage || ''}
                onChange={event => onStageChange?.(event.target.value || null)}
                disabled={!onStageChange}
                className="min-w-0 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400 outline-none hover:border-slate-700 focus:border-purple-500 disabled:opacity-50"
                title={language === 'zh' ? '阶段' : 'Stage'}
              >
                <option value="">{language === 'zh' ? '未设置阶段' : 'No stage'}</option>
                {CONVERSATION_STAGES.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onDelete && (
            <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
