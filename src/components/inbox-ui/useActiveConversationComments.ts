interface UseActiveConversationCommentsArgs {
  selectedTelegramConversation: any;
  activeTelegramClient: any;
  selectedLiveChatConversation: any;
  activeLiveChatClient: any;
  activeUnifiedConversation: any;
  selectedEmail: any;
  activeWhatsAppConversation: any;
  whatsappConversations: any[];
  editClient: (id: string, updates: any) => void;
  addEmailComment: (emailId: string, content: string, attachments?: any[]) => void;
  addEmailReply: (emailId: string, commentId: string, content: string, attachments?: any[]) => void;
  patchUnifiedConversation: (conversation: any, updates: any) => Promise<any>;
  refreshUnifiedConversationData: () => Promise<void>;
  addWhatsAppConversationComment: (conversation: any, content: string) => Promise<any[]>;
  updateWhatsAppConversationState: (conversations: any[]) => void;
}

const createConversationComment = (prefix: string, content: string, attachments?: any[]) => ({
  id: `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  author: 'User',
  content,
  createdAt: new Date().toISOString(),
  attachments,
  replies: [],
});

export function useActiveConversationComments({
  selectedTelegramConversation,
  activeTelegramClient,
  selectedLiveChatConversation,
  activeLiveChatClient,
  activeUnifiedConversation,
  selectedEmail,
  activeWhatsAppConversation,
  whatsappConversations,
  editClient,
  addEmailComment,
  addEmailReply,
  patchUnifiedConversation,
  refreshUnifiedConversationData,
  addWhatsAppConversationComment,
  updateWhatsAppConversationState,
}: UseActiveConversationCommentsArgs) {
  const activeConversationComments = (selectedTelegramConversation && activeTelegramClient)
    ? (activeTelegramClient.comments || [])
    : (selectedLiveChatConversation && activeLiveChatClient)
      ? (activeLiveChatClient.comments || [])
      : (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback)
        ? (activeUnifiedConversation.comments || [])
        : (selectedEmail?.comments || []);

  const appendActiveConversationComment = async (content: string, attachments?: any[]) => {
    const comment = createConversationComment('uc', content, attachments);

    if ((selectedTelegramConversation && activeTelegramClient) || (selectedLiveChatConversation && activeLiveChatClient)) {
      const client = activeTelegramClient || activeLiveChatClient;
      const sourceLabel = selectedTelegramConversation ? 'Telegram' : 'Live Chat';
      editClient(client.id, {
        comments: [...(client.comments || []), {
          ...comment,
          content: `[${sourceLabel}] ${content}`,
        }],
      });
      await refreshUnifiedConversationData();
    } else if (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback) {
      await patchUnifiedConversation(activeUnifiedConversation, {
        comments: [...(activeUnifiedConversation.comments || []), comment],
      });
      await refreshUnifiedConversationData();
    } else if (selectedEmail) {
      addEmailComment(selectedEmail.id, content, attachments);
    } else if (activeWhatsAppConversation) {
      const comments = await addWhatsAppConversationComment(activeWhatsAppConversation, content);
      updateWhatsAppConversationState(whatsappConversations.map(item => (
        item.id === activeWhatsAppConversation.id ? { ...item, comments } : item
      )));
    }
  };

  const replyActiveConversationComment = async (commentId: string, content: string, attachments?: any[]) => {
    const reply = createConversationComment('ucr', content, attachments);

    if ((selectedTelegramConversation && activeTelegramClient) || (selectedLiveChatConversation && activeLiveChatClient)) {
      const client = activeTelegramClient || activeLiveChatClient;
      const comments = (client.comments || []).map((comment: any) => (
        comment.id === commentId
          ? { ...comment, replies: [...(comment.replies || []), reply] }
          : comment
      ));
      editClient(client.id, { comments });
    } else if (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback) {
      const comments = (activeUnifiedConversation.comments || []).map((comment: any) => (
        comment.id === commentId
          ? { ...comment, replies: [...(comment.replies || []), reply] }
          : comment
      ));
      await patchUnifiedConversation(activeUnifiedConversation, { comments });
      await refreshUnifiedConversationData();
    } else if (selectedEmail) {
      addEmailReply(selectedEmail.id, commentId, content, attachments);
    }
  };

  return {
    activeConversationComments,
    appendActiveConversationComment,
    replyActiveConversationComment,
  };
}
