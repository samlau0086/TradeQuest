import React from 'react';
import { Link2 } from 'lucide-react';
import type { Client } from '../../store';
import { WhatsAppChatModal } from '../WhatsAppChatModal';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { ConversationFollowUpStrip } from './ConversationFollowUpStrip';
import { ConversationRecordSummaryStrip } from './ConversationRecordSummaryStrip';
import { ConversationToolbarButton } from './ConversationToolbar';
import type { InboxWhatsAppConversation, UnifiedCommunicationConversation } from './inboxModel';

interface WhatsAppConversationPaneProps {
  language: string;
  selectedWhatsAppPhone: string;
  activeWhatsAppConversation?: InboxWhatsAppConversation | null;
  activeWhatsAppClient?: Client | null;
  activeUnifiedConversation?: UnifiedCommunicationConversation | null;
  currentUser?: { id: string } | null;
  activeFollowUpAt?: string | null;
  activeFollowUpNote?: string | null;
  onBack: () => void;
  onClientClick: () => void;
  onOwnerChange?: (ownerId: string | null) => void;
  onStageChange?: (stage: string | null) => void;
  onDeleteConversation: (conversation: InboxWhatsAppConversation) => void;
  onSetFollowUp: (dueAt: string, note: string) => void | Promise<void>;
  onClearFollowUp: () => void | Promise<void>;
  onCompleteFollowUp: () => void | Promise<void>;
  onCloseChat: () => void;
}

export function WhatsAppConversationPane({
  language,
  selectedWhatsAppPhone,
  activeWhatsAppConversation,
  activeWhatsAppClient,
  activeUnifiedConversation,
  currentUser,
  activeFollowUpAt,
  activeFollowUpNote,
  onBack,
  onClientClick,
  onOwnerChange,
  onStageChange,
  onDeleteConversation,
  onSetFollowUp,
  onClearFollowUp,
  onCompleteFollowUp,
  onCloseChat,
}: WhatsAppConversationPaneProps) {
  const isZh = language === 'zh';
  const hasMapping = Boolean(
    activeWhatsAppConversation?.rawChatId &&
      activeWhatsAppConversation.rawChatId !== activeWhatsAppConversation.targetPhone,
  );

  const recordHeader = activeWhatsAppConversation ? (
    <ConversationDetailHeader
      language={language}
      channel="whatsapp"
      title={
        activeWhatsAppClient?.name ||
        activeWhatsAppConversation.clientName ||
        activeWhatsAppConversation.targetPhone
      }
      subtitle={
        activeWhatsAppConversation.contactPhone || activeWhatsAppConversation.targetPhone
      }
      clientId={activeWhatsAppClient?.id || activeWhatsAppConversation.clientId}
      clientName={activeWhatsAppClient?.name || activeWhatsAppConversation.clientName}
      tags={activeUnifiedConversation?.tags || activeWhatsAppConversation.tags || []}
      ownerId={activeUnifiedConversation?.owner_id}
      stage={activeUnifiedConversation?.stage}
      currentUser={currentUser}
      statusBadges={[
        {
          label:
            activeWhatsAppConversation.lastDirection === 'inbound'
              ? (isZh ? '\u5ba2\u6237\u6765\u4fe1' : 'Inbound')
              : activeWhatsAppConversation.lastDirection === 'outbound'
                ? (isZh ? '\u6211\u65b9\u5916\u53d1' : 'Outbound')
                : (isZh ? '\u65b9\u5411\u672a\u77e5' : 'Unknown direction'),
          tone: activeWhatsAppConversation.lastDirection === 'inbound' ? 'success' : 'default',
        },
        {
          label: activeWhatsAppConversation.clientId
            ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client')
            : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
          tone: activeWhatsAppConversation.clientId ? 'success' : 'default',
        },
      ]}
      onBack={onBack}
      onClientClick={onClientClick}
      onOwnerChange={onOwnerChange}
      onStageChange={onStageChange}
      onDelete={() => onDeleteConversation(activeWhatsAppConversation)}
      meta={
        hasMapping ? (
          <span>
            {activeWhatsAppConversation.rawChatId} -&gt; {activeWhatsAppConversation.targetPhone}
          </span>
        ) : undefined
      }
    />
  ) : undefined;

  const recordSummary = activeWhatsAppConversation ? (
    <ConversationRecordSummaryStrip
      language={language}
      eyebrow={isZh ? '\u4e0b\u4e00\u6b65\u884c\u52a8' : 'Next action'}
      statusBadges={[
        {
          label:
            activeWhatsAppConversation.lastDirection === 'inbound'
              ? (isZh ? '\u5ba2\u6237\u6765\u4fe1' : 'Inbound')
              : activeWhatsAppConversation.lastDirection === 'outbound'
                ? (isZh ? '\u6211\u65b9\u5916\u53d1' : 'Outbound')
                : (isZh ? '\u65b9\u5411\u672a\u77e5' : 'Unknown direction'),
          tone: activeWhatsAppConversation.lastDirection === 'inbound' ? 'success' : 'default',
        },
        {
          label: activeWhatsAppConversation.clientId
            ? (isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked client')
            : (isZh ? '\u672a\u5173\u8054' : 'Unlinked'),
          tone: activeWhatsAppConversation.clientId ? 'success' : 'default',
        },
        {
          label: hasMapping
            ? (isZh ? 'chatId \u5df2\u6620\u5c04' : 'chatId mapped')
            : (isZh ? '\u76f4\u63a5\u53f7\u7801\u4f1a\u8bdd' : 'Direct phone thread'),
          tone: hasMapping ? 'violet' : 'default',
        },
      ]}
      primaryTitle={
        activeWhatsAppConversation.lastDirection === 'inbound'
          ? (isZh
            ? '\u4f18\u5148\u5904\u7406\u8fd9\u6761\u5ba2\u6237 WhatsApp \u6d88\u606f'
            : 'Review and respond to this WhatsApp message')
          : (isZh
            ? '\u7ee7\u7eed\u63a8\u8fdb\u8fd9\u6bb5 WhatsApp \u8ddf\u8fdb'
            : 'Keep this WhatsApp follow-up moving')
      }
      primaryDescription={
        activeWhatsAppConversation.lastDirection === 'inbound'
          ? (
              isZh
                ? '\u5148\u786e\u8ba4\u5ba2\u6237\u610f\u56fe\u3001\u5ba2\u6237\u5173\u8054\u548c\u5f85\u8ddf\u8fdb\u72b6\u6001\uff0c\u518d\u51b3\u5b9a\u662f\u7acb\u5373\u56de\u590d\u3001\u8bbe\u4e3a\u5f85\u8ddf\u8fdb\uff0c\u8fd8\u662f\u8865\u5145\u5ba2\u6237\u8d44\u6599\u3002'
                : 'Confirm customer intent, CRM linking, and follow-up status before deciding whether to reply, schedule follow-up, or enrich the record.'
            )
          : (
              isZh
                ? '\u7ed3\u5408\u6700\u8fd1\u5f80\u6765\u3001\u5ba2\u6237\u72b6\u6001\u548c\u6620\u5c04\u72b6\u6001\uff0c\u51b3\u5b9a\u662f\u5426\u7ee7\u7eed\u5bf9\u8bdd\u3001\u8865\u5145\u5173\u8054\uff0c\u6216\u8f6c\u6210\u540e\u7eed\u4efb\u52a1\u3002'
                : 'Use the latest conversation, customer state, and mapping status to decide whether to continue the thread, link it, or turn it into follow-up work.'
            )
      }
      primaryTone={activeWhatsAppConversation.lastDirection === 'inbound' ? 'success' : 'primary'}
      primaryMeta={
        hasMapping
          ? (isZh ? 'chatId \u6620\u5c04\u751f\u6548\u4e2d' : 'chatId mapping active')
          : (isZh ? '\u5185\u5d4c\u5f0f\u5bf9\u8bdd\u5de5\u4f5c\u533a' : 'Embedded conversation workspace')
      }
      primaryActions={
        activeWhatsAppConversation.clientId ? (
          <ConversationToolbarButton tone="success" compact onClick={onClientClick}>
            <Link2 className="h-3.5 w-3.5" />
            {isZh ? '\u6253\u5f00\u5ba2\u6237' : 'Open customer'}
          </ConversationToolbarButton>
        ) : undefined
      }
      linkedLabel={isZh ? '\u5df2\u5173\u8054\u5ba2\u6237' : 'Linked customer'}
      linkedValue={activeWhatsAppClient?.name || activeWhatsAppConversation.clientName}
      activityLabel={isZh ? '\u6700\u8fd1\u52a8\u6001' : 'Latest activity'}
      activityValue={
        activeWhatsAppConversation.lastBody ||
        (isZh ? '\u6682\u65e0\u6d88\u606f\u9884\u89c8' : 'No preview')
      }
      tagsCount={(activeUnifiedConversation?.tags || activeWhatsAppConversation.tags || []).length}
      followUpAt={activeFollowUpAt}
      items={[
        {
          label: isZh ? '\u53f7\u7801' : 'Phone',
          value: activeWhatsAppConversation.targetPhone,
          tone: 'success',
        },
        {
          label: isZh ? '\u65b9\u5411' : 'Direction',
          value:
            activeWhatsAppConversation.lastDirection === 'inbound'
              ? (isZh ? '\u5ba2\u6237\u6765\u4fe1' : 'Inbound')
              : activeWhatsAppConversation.lastDirection === 'outbound'
                ? (isZh ? '\u6211\u65b9\u5916\u53d1' : 'Outbound')
                : (isZh ? '\u672a\u77e5' : 'Unknown'),
          tone: activeWhatsAppConversation.lastDirection === 'inbound' ? 'info' : 'default',
        },
        ...(hasMapping
          ? [
              {
                label: isZh ? '\u6620\u5c04' : 'Mapping',
                value: 'chatId -> phone',
                tone: 'violet' as const,
              },
            ]
          : []),
      ]}
    />
  ) : undefined;

  const followUpStrip = (
    <ConversationFollowUpStrip
      language={language}
      dueAt={activeFollowUpAt}
      note={activeFollowUpNote}
      onSet={onSetFollowUp}
      onClear={onClearFollowUp}
      onComplete={onCompleteFollowUp}
    />
  );

  return (
    <WhatsAppChatModal
      key={activeWhatsAppConversation?.id || selectedWhatsAppPhone}
      embedded
      phone={selectedWhatsAppPhone}
      client={activeWhatsAppClient || undefined}
      conversation={activeWhatsAppConversation || undefined}
      onClose={onCloseChat}
      workroomChrome={{
        header: recordHeader,
        summary: recordSummary,
        followUp: followUpStrip,
      }}
    />
  );
}
