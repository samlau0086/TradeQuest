import React from 'react';
import { Languages, Loader2, Maximize2, MessageCircle, Sparkles, User, UserPlus, X } from 'lucide-react';
import { Client } from '../store';

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
  return (
    <>
      <div className={embedded ? "flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4" : "flex items-center justify-between border-b border-slate-800 p-4"}>
        <div className="flex items-center gap-3">
          <div className={embedded ? "flex h-11 w-11 items-center justify-center rounded-xl border border-green-200 bg-green-50 shadow-sm" : ""}>
            <MessageCircle className={embedded ? "h-5 w-5 text-green-600" : "w-5 h-5 text-green-400"} />
          </div>
          <div>
            {activeClient ? (
              <button
                onClick={() => onSelectClient(activeClient.id)}
                className={embedded ? "flex items-center gap-1 font-bold text-slate-950 transition hover:text-cyan-700 hover:underline" : "font-bold text-white hover:text-cyan-300 hover:underline flex items-center gap-1"}
              >
                <User className="w-3.5 h-3.5" />
                {activeClient.name}
              </button>
            ) : (
              <div className={embedded ? "font-bold text-slate-950" : "font-bold text-white"}>{conversationClientName || displayPhone}</div>
            )}
            <div className={embedded ? "flex flex-wrap items-center gap-2 text-xs text-slate-500" : "flex flex-wrap items-center gap-2 text-xs text-slate-500"}>
              <span>{displayPhone}</span>
              {!activeClient && (
                <>
                  <button
                    type="button"
                    onClick={onCreateLead}
                    className={embedded ? "inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 font-bold text-cyan-700 transition hover:bg-cyan-100" : "inline-flex items-center gap-1 rounded bg-slate-800/70 px-1.5 py-0.5 font-bold text-cyan-400 hover:bg-slate-700 hover:text-cyan-300"}
                  >
                    <UserPlus className="w-3 h-3" />
                    New Lead
                  </button>
                  <button
                    type="button"
                    onClick={onAddToExistingClient}
                    className={embedded ? "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-bold text-emerald-700 transition hover:bg-emerald-100" : "inline-flex items-center gap-1 rounded bg-slate-800/70 px-1.5 py-0.5 font-bold text-emerald-400 hover:bg-slate-700 hover:text-emerald-300"}
                  >
                    <User className="w-3 h-3" />
                    Add to Existing Client
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!embedded && onOpenInInbox && (
            <button
              type="button"
              onClick={onOpenInInbox}
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg"
              title={language === 'zh' ? '在收件箱中打开' : 'Open in inbox'}
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={onClose} className={embedded ? "rounded-md border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-800" : "p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {rawChatId && (
        <div className={embedded ? "border-b border-slate-200 bg-white px-5 py-2" : "px-4 py-2 border-b border-slate-800 bg-slate-950/70"}>
          {mappingEdit ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-slate-500 truncate max-w-[220px]" title={mappingEdit.chatId}>
                {mappingEdit.chatId}
              </span>
              <span className="text-slate-600">-&gt;</span>
              <input
                value={mappingEdit.phone}
                onChange={event => onChangeMappingPhone(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') onConfirmMapping();
                  if (event.key === 'Escape') onCancelMapping();
                }}
                placeholder="Enter mobile number"
                className={embedded ? "min-w-[180px] flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-green-500" : "min-w-[180px] flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-green-400"}
                autoFocus
              />
              <button
                type="button"
                onClick={onConfirmMapping}
                disabled={mappingEdit.saving || !canConfirmMapping}
                className={embedded ? "rounded bg-green-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-green-500 disabled:bg-slate-200 disabled:text-slate-500" : "rounded bg-green-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500"}
              >
                {mappingEdit.saving ? 'Saving' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={onCancelMapping}
                className={embedded ? "rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50" : "rounded bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700"}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onDoubleClick={() => onStartMapping(rawChatId, mappedPhone || '')}
              title="Double-click to edit chatId to mobile mapping"
              className={embedded ? "block max-w-full truncate rounded px-1 py-1 text-left text-[11px] font-mono text-slate-500 hover:bg-slate-50 hover:text-slate-700" : "block max-w-full truncate rounded px-1 py-1 text-left text-[11px] font-mono text-slate-500 hover:bg-slate-900 hover:text-slate-300"}
            >
              {mappedPhone ? `${mappedPhone} (${rawChatId} -> ${mappedPhone})` : rawChatId}
            </button>
          )}
        </div>
      )}

      <div className={embedded ? "flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3" : "p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3"}>
        <div className="flex items-center gap-3 min-w-0">
          <select
            value={selectedClientId}
            onChange={event => onSelectedClientChange(event.target.value)}
            className={embedded ? "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300" : "bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"}
          >
            <option value="">{randomStickyClientLabel}</option>
            {selectableHubClients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name || client.id} ({client.status}) {client.quota ? `quota ${client.quota.remaining}/${client.quota.dailyQuota}` : ''}
              </option>
            ))}
          </select>
          {loading && <Loader2 className={embedded ? "h-4 w-4 animate-spin text-slate-400" : "w-4 h-4 animate-spin text-slate-400"} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleAutoTranslate}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
              autoTranslateEnabled
                ? embedded ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                : embedded ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800' : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
            title={language === 'zh' ? `仅为 ${displayPhone} 自动翻译客户 WhatsApp 消息` : `Auto-translate customer WhatsApp messages for ${displayPhone}`}
          >
            <Languages className="h-4 w-4" />
            <span>{language === 'zh' ? '自动翻译' : 'Auto Translate'}</span>
            <span className={`h-2 w-2 rounded-full ${autoTranslateEnabled ? 'bg-cyan-400' : embedded ? 'bg-slate-300' : 'bg-slate-600'}`} />
          </button>
          <button
            type="button"
            onClick={onToggleCustomerServiceAgent}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
              customerServiceAgentEnabled
                ? embedded ? 'border-green-200 bg-green-50 text-green-700' : 'border-green-500/40 bg-green-500/15 text-green-300'
                : embedded ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800' : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
            title="WhatsApp Customer Service Agent"
          >
            <Sparkles className="h-4 w-4" />
            <span>Agent Mode</span>
            <span className={`h-2 w-2 rounded-full ${customerServiceAgentEnabled ? 'bg-green-400' : embedded ? 'bg-slate-300' : 'bg-slate-600'}`} />
          </button>
        </div>
      </div>
    </>
  );
}
