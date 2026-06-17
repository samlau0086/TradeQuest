import React from 'react';
import {
  Languages,
  Loader2,
  Maximize2,
  MessageCircle,
  Sparkles,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { Client } from '../store';
import {
  ConversationToolbarButton,
  ConversationToolbarField,
  ConversationToolbarGroup,
  ConversationToolbarPill,
} from './inbox-ui/ConversationToolbar';

interface WhatsAppHubClientOption {
  id: string;
  name: string;
  status: string;
  quota?: { sentToday: number; dailyQuota: number; remaining: number; replyRate: number };
}

interface ChatIdMappingEdit {
  chatId: string;
  phone: string;
  saving?: boolean;
}

interface WhatsAppChatHeaderProps {
  activeClient?: Client | null;
  conversationClientName?: string;
  displayPhone: string;
  embedded: boolean;
  lightChrome?: boolean;
  language: 'en' | 'zh';
  rawChatId: string;
  mappedPhone: string;
  mappingEdit: ChatIdMappingEdit | null;
  selectableHubClients: WhatsAppHubClientOption[];
  selectedClientId: string;
  loading: boolean;
  autoTranslateEnabled: boolean;
  customerServiceAgentEnabled: boolean;
  randomStickyClientLabel: string;
  onSelectClient: (clientId: string) => void;
  onCreateLead: () => void;
  onAddToExistingClient: () => void;
  onOpenInInbox?: () => void;
  onClose: () => void;
  onStartMapping: (chatId: string, phone: string) => void;
  onChangeMappingPhone: (phone: string) => void;
  onConfirmMapping: () => void;
  onCancelMapping: () => void;
  canConfirmMapping: boolean;
  onSelectedClientChange: (clientId: string) => void;
  onToggleAutoTranslate: () => void;
  onToggleCustomerServiceAgent: () => void;
}

export function WhatsAppChatHeader({
  activeClient,
  conversationClientName,
  displayPhone,
  embedded,
  lightChrome,
  language,
  rawChatId,
  mappedPhone,
  mappingEdit,
  selectableHubClients,
  selectedClientId,
  loading,
  autoTranslateEnabled,
  customerServiceAgentEnabled,
  randomStickyClientLabel,
  onSelectClient,
  onCreateLead,
  onAddToExistingClient,
  onOpenInInbox,
  onClose,
  onStartMapping,
  onChangeMappingPhone,
  onConfirmMapping,
  onCancelMapping,
  canConfirmMapping,
  onSelectedClientChange,
  onToggleAutoTranslate,
  onToggleCustomerServiceAgent,
}: WhatsAppChatHeaderProps) {
  const isZh = language === 'zh';
  const useLightChrome = lightChrome ?? embedded;
  const frameClass = useLightChrome
    ? 'border-b border-slate-200 bg-white'
    : 'border-b border-slate-800 bg-slate-950';
  const textTitleClass = useLightChrome ? 'text-slate-950' : 'text-white';
  const textSubtleClass = useLightChrome ? 'text-slate-500' : 'text-slate-400';
  const selectClass = useLightChrome
    ? 'w-full min-w-0 bg-transparent text-sm font-semibold text-slate-700 outline-none'
    : 'w-full min-w-0 bg-transparent text-sm font-semibold text-slate-200 outline-none';

  return (
    <div className={`${frameClass} px-5 py-4`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={
              useLightChrome
                ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 shadow-sm'
                : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10'
            }
          >
            <MessageCircle
              className={useLightChrome ? 'h-5 w-5 text-green-600' : 'h-5 w-5 text-green-400'}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {activeClient ? (
                <button
                  onClick={() => onSelectClient(activeClient.id)}
                  className={`inline-flex items-center gap-1 text-lg font-bold transition hover:underline ${useLightChrome ? 'hover:text-cyan-700' : 'hover:text-cyan-300'} ${textTitleClass}`}
                >
                  <User className="h-4 w-4" />
                  {activeClient.name}
                </button>
              ) : (
                <div className={`text-lg font-bold ${textTitleClass}`}>
                  {conversationClientName || displayPhone}
                </div>
              )}

              <ConversationToolbarPill tone="success">WhatsApp</ConversationToolbarPill>

              {!activeClient && (
                <>
                  <ConversationToolbarButton tone="info" compact onClick={onCreateLead}>
                    <UserPlus className="h-3 w-3" />
                    <span>{isZh ? '\u65b0\u5efa\u7ebf\u7d22' : 'New Lead'}</span>
                  </ConversationToolbarButton>
                  <ConversationToolbarButton tone="success" compact onClick={onAddToExistingClient}>
                    <User className="h-3 w-3" />
                    <span>{isZh ? '\u5173\u8054\u73b0\u6709\u5ba2\u6237' : 'Add to Existing Client'}</span>
                  </ConversationToolbarButton>
                </>
              )}
            </div>

            <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${textSubtleClass}`}>
              <ConversationToolbarPill>{displayPhone}</ConversationToolbarPill>
              {mappedPhone && rawChatId && mappedPhone !== rawChatId && (
                <ConversationToolbarPill className="font-mono">
                  {rawChatId} -&gt; {mappedPhone}
                </ConversationToolbarPill>
              )}
            </div>

            <ConversationToolbarGroup className="mt-4">
              <ConversationToolbarField
                label={isZh ? '\u53d1\u9001\u5ba2\u6237\u7aef' : 'Sender Client'}
                className={
                  useLightChrome
                    ? 'min-w-[260px] flex-1'
                    : 'min-w-[260px] flex-1 border-slate-700 bg-slate-900/70'
                }
              >
                <div className="flex items-center gap-2">
                  <select
                    value={selectedClientId}
                    onChange={event => onSelectedClientChange(event.target.value)}
                    className={selectClass}
                  >
                    <option value="">{randomStickyClientLabel}</option>
                    {selectableHubClients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name || client.id} ({client.status}){' '}
                        {client.quota ? `quota ${client.quota.remaining}/${client.quota.dailyQuota}` : ''}
                      </option>
                    ))}
                  </select>
                  {loading && (
                    <Loader2
                      className={
                        useLightChrome
                          ? 'h-4 w-4 animate-spin text-slate-400'
                          : 'h-4 w-4 animate-spin text-slate-500'
                      }
                    />
                  )}
                </div>
              </ConversationToolbarField>

              {rawChatId && (
                <ConversationToolbarField
                  label={isZh ? 'ChatId \u6620\u5c04' : 'ChatId Mapping'}
                  className={
                    useLightChrome
                      ? 'min-w-[260px] flex-1'
                      : 'min-w-[260px] flex-1 border-slate-700 bg-slate-900/70'
                  }
                >
                  {mappingEdit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`max-w-[180px] truncate font-mono text-[11px] ${textSubtleClass}`}
                        title={mappingEdit.chatId}
                      >
                        {mappingEdit.chatId}
                      </span>
                      <span className={textSubtleClass}>-&gt;</span>
                      <input
                        value={mappingEdit.phone}
                        onChange={event => onChangeMappingPhone(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') onConfirmMapping();
                          if (event.key === 'Escape') onCancelMapping();
                        }}
                        placeholder={isZh ? '\u8f93\u5165\u624b\u673a\u53f7' : 'Enter mobile number'}
                        className={
                          useLightChrome
                            ? 'min-w-[160px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-green-500'
                            : 'min-w-[160px] flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-green-400'
                        }
                        autoFocus
                      />
                      <ConversationToolbarButton
                        type="button"
                        onClick={onConfirmMapping}
                        disabled={mappingEdit.saving || !canConfirmMapping}
                        tone="success"
                        compact
                      >
                        {mappingEdit.saving
                          ? (isZh ? '\u4fdd\u5b58\u4e2d' : 'Saving')
                          : (isZh ? '\u786e\u8ba4' : 'Confirm')}
                      </ConversationToolbarButton>
                      <ConversationToolbarButton
                        type="button"
                        onClick={onCancelMapping}
                        tone="default"
                        compact
                      >
                        {isZh ? '\u53d6\u6d88' : 'Cancel'}
                      </ConversationToolbarButton>
                    </div>
                  ) : (
                    <ConversationToolbarButton
                      type="button"
                      onDoubleClick={() => onStartMapping(rawChatId, mappedPhone || '')}
                      title={
                        isZh
                          ? '\u53cc\u51fb\u7f16\u8f91 chatId \u5230\u624b\u673a\u53f7\u6620\u5c04'
                          : 'Double-click to edit chatId to mobile mapping'
                      }
                      tone="default"
                      compact
                      className="max-w-full font-mono"
                    >
                      <span className="truncate">
                        {mappedPhone ? `${mappedPhone} (${rawChatId} -> ${mappedPhone})` : rawChatId}
                      </span>
                    </ConversationToolbarButton>
                  )}
                </ConversationToolbarField>
              )}
            </ConversationToolbarGroup>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 xl:max-w-[40%]">
          <ConversationToolbarButton
            type="button"
            onClick={onToggleAutoTranslate}
            tone={autoTranslateEnabled ? 'info' : 'default'}
            compact
            title={
              isZh
                ? `\u4ec5\u4e3a ${displayPhone} \u81ea\u52a8\u7ffb\u8bd1\u5ba2\u6237 WhatsApp \u6d88\u606f`
                : `Auto-translate customer WhatsApp messages for ${displayPhone}`
            }
          >
            <Languages className="h-4 w-4" />
            <span>{isZh ? '\u81ea\u52a8\u7ffb\u8bd1' : 'Auto Translate'}</span>
            <span
              className={`h-2 w-2 rounded-full ${autoTranslateEnabled ? 'bg-cyan-400' : useLightChrome ? 'bg-slate-300' : 'bg-slate-500'}`}
            />
          </ConversationToolbarButton>

          <ConversationToolbarButton
            type="button"
            onClick={onToggleCustomerServiceAgent}
            tone={customerServiceAgentEnabled ? 'success' : 'default'}
            compact
            title="WhatsApp Customer Service Agent"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isZh ? 'Agent \u6a21\u5f0f' : 'Agent Mode'}</span>
            <span
              className={`h-2 w-2 rounded-full ${customerServiceAgentEnabled ? 'bg-green-400' : useLightChrome ? 'bg-slate-300' : 'bg-slate-500'}`}
            />
          </ConversationToolbarButton>

          {!embedded && onOpenInInbox && (
            <ConversationToolbarButton
              type="button"
              onClick={onOpenInInbox}
              tone="default"
              compact
              title={isZh ? '\u5728\u6536\u4ef6\u7bb1\u4e2d\u6253\u5f00' : 'Open in inbox'}
            >
              <Maximize2 className="h-4 w-4" />
            </ConversationToolbarButton>
          )}

          <ConversationToolbarButton
            type="button"
            onClick={onClose}
            tone="default"
            compact
            title={isZh ? '\u5173\u95ed' : 'Close'}
          >
            <X className="h-4 w-4" />
          </ConversationToolbarButton>
        </div>
      </div>
    </div>
  );
}
