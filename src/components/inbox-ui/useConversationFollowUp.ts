import { EmailMessage } from '../../store';
import { InboxWhatsAppConversation, UnifiedCommunicationConversation } from './inboxModel';

type FollowUpStatus = 'open' | 'completed' | 'canceled';

interface UseConversationFollowUpArgs {
  activeUnifiedConversation: UnifiedCommunicationConversation | null;
  selectedEmail: EmailMessage | null;
  activeWhatsAppConversation: InboxWhatsAppConversation | null;
  whatsappConversations: InboxWhatsAppConversation[];
  activeWhatsAppFollowUp: { dueAt?: string | null; note?: string | null } | null;
  language: string;
  editEmail: (id: string, updates: Partial<EmailMessage>) => void;
  patchUnifiedConversation: (conversation: UnifiedCommunicationConversation, updates: any) => Promise<any>;
  applyUnifiedConversationUpdate: (conversation: UnifiedCommunicationConversation, updates: Partial<UnifiedCommunicationConversation>) => void;
  addWhatsAppConversationComment: (conversation: InboxWhatsAppConversation, content: string) => Promise<any[]>;
  updateWhatsAppConversationState: (conversations: InboxWhatsAppConversation[]) => void;
  appendActiveConversationComment: (content: string, attachments?: any[]) => Promise<void>;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  whatsappFollowUpMarker: string;
}

export function useConversationFollowUp({
  activeUnifiedConversation,
  selectedEmail,
  activeWhatsAppConversation,
  whatsappConversations,
  activeWhatsAppFollowUp,
  language,
  editEmail,
  patchUnifiedConversation,
  applyUnifiedConversationUpdate,
  addWhatsAppConversationComment,
  updateWhatsAppConversationState,
  appendActiveConversationComment,
  notify,
  whatsappFollowUpMarker,
}: UseConversationFollowUpArgs) {
  const activeFollowUpAt = activeUnifiedConversation?.todo_at || selectedEmail?.todoAt || activeWhatsAppFollowUp?.dueAt || null;
  const activeFollowUpNote = activeUnifiedConversation?.todo_note || selectedEmail?.todoNote || activeWhatsAppFollowUp?.note || null;

  const updateActiveConversationFollowUp = async (
    dueAt: string | null,
    note: string | null,
    status: FollowUpStatus = 'open'
  ) => {
    if (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback) {
      await patchUnifiedConversation(activeUnifiedConversation, {
        todoAt: status === 'open' ? dueAt : null,
        todoNote: status === 'open' ? note : null,
      });
      applyUnifiedConversationUpdate(activeUnifiedConversation, {
        todo_at: status === 'open' ? dueAt || undefined : undefined,
        todo_note: status === 'open' ? note || undefined : undefined,
      });
    } else if (selectedEmail) {
      editEmail(selectedEmail.id, {
        todoAt: status === 'open' ? dueAt as any : null as any,
        todoNote: status === 'open' ? note as any : null as any,
      });
      if (status === 'completed') {
        await appendActiveConversationComment(language === 'zh' ? '跟进任务已完成。' : 'Follow-up task completed.');
      }
    } else if (activeWhatsAppConversation) {
      const markerPayload = status === 'open'
        ? {
            status: 'open',
            dueAt,
            note: note || `Follow up WhatsApp conversation with ${activeWhatsAppConversation.clientName || activeWhatsAppConversation.targetPhone}.`,
          }
        : status === 'completed'
          ? { status: 'completed', completedAt: new Date().toISOString() }
          : { status: 'canceled', canceledAt: new Date().toISOString() };
      const comments = await addWhatsAppConversationComment(activeWhatsAppConversation, `${whatsappFollowUpMarker}${JSON.stringify(markerPayload)}`);
      updateWhatsAppConversationState(whatsappConversations.map(item => (
        item.id === activeWhatsAppConversation.id ? { ...item, comments } : item
      )));
    }

    notify(
      status === 'open'
        ? (language === 'zh' ? '待跟进时间已更新。' : 'Follow-up reminder updated.')
        : status === 'completed'
          ? (language === 'zh' ? '待跟进已标记完成。' : 'Follow-up marked complete.')
          : (language === 'zh' ? '待跟进已取消。' : 'Follow-up cleared.'),
      'success'
    );
  };

  return {
    activeFollowUpAt,
    activeFollowUpNote,
    updateActiveConversationFollowUp,
  };
}
