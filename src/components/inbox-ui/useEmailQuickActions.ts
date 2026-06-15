import { useState } from 'react';
import { EmailMessage } from '../../store';
import { useAuthStore } from '../../authStore';
import { fallbackEmailKnowledgeSummary, extractLatestEmailText, UnifiedCommunicationConversation } from './inboxModel';

interface UseEmailQuickActionsArgs {
  selectedEmail: EmailMessage | undefined;
  emails: EmailMessage[];
  todoModalEmail: string | null;
  todoAt: string;
  todoNote: string;
  tagModalEmail: string | null;
  tagInput: string;
  language: string;
  llmMappings: Record<string, string>;
  activeLLMId?: string | null;
  llmConfigs: any[];
  setTodoModalEmail: (value: string | null) => void;
  setTodoAt: (value: string) => void;
  setTodoNote: (value: string) => void;
  setTagModalEmail: (value: string | null) => void;
  setTagInput: (value: string) => void;
  setActiveMenu: (value: string | null) => void;
  editEmail: (id: string, updates: Partial<EmailMessage>) => void;
  addKnowledgeItem: (item: any) => void;
  findEmailUnifiedConversation: (emailId: string) => UnifiedCommunicationConversation | undefined;
  patchUnifiedConversation: (conversation: UnifiedCommunicationConversation, updates: any) => Promise<any>;
  refreshUnifiedConversationData: () => Promise<void>;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useEmailQuickActions({
  selectedEmail,
  emails,
  todoModalEmail,
  todoAt,
  todoNote,
  tagModalEmail,
  tagInput,
  language,
  llmMappings,
  activeLLMId,
  llmConfigs,
  setTodoModalEmail,
  setTodoAt,
  setTodoNote,
  setTagModalEmail,
  setTagInput,
  setActiveMenu,
  editEmail,
  addKnowledgeItem,
  findEmailUnifiedConversation,
  patchUnifiedConversation,
  refreshUnifiedConversationData,
  notify,
}: UseEmailQuickActionsArgs) {
  const [addingToRag, setAddingToRag] = useState(false);
  const [addedToRagId, setAddedToRagId] = useState<string | null>(null);

  const submitTodo = async () => {
    if (!todoModalEmail || !todoAt) return;
    const conversation = findEmailUnifiedConversation(todoModalEmail);
    if (conversation && !conversation.metadata?.localFallback) {
      await patchUnifiedConversation(conversation, { todoAt, todoNote });
      await refreshUnifiedConversationData();
    } else {
      editEmail(todoModalEmail, { todoAt, todoNote });
    }
    setTodoModalEmail(null);
    setTodoAt('');
    setTodoNote('');
    setActiveMenu(null);
  };

  const submitTag = async () => {
    if (!tagModalEmail || !tagInput.trim()) return;
    const email = emails.find(item => item.id === tagModalEmail);
    if (!email) return;
    let tag = tagInput.trim();
    if (!tag.startsWith('#')) tag = `#${tag}`;
    const currentTags = email.tags || [];
    if (!currentTags.includes(tag)) {
      const tags = [...currentTags, tag];
      const conversation = findEmailUnifiedConversation(email.id);
      if (conversation && !conversation.metadata?.localFallback) {
        await patchUnifiedConversation(conversation, { tags });
        await refreshUnifiedConversationData();
      } else {
        editEmail(email.id, { tags });
      }
    }
    setTagModalEmail(null);
    setTagInput('');
    setActiveMenu(null);
  };

  const toggleImportant = async (email: EmailMessage) => {
    const conversation = findEmailUnifiedConversation(email.id);
    const nextImportant = !email.isImportant;
    if (conversation && !conversation.metadata?.localFallback) {
      await patchUnifiedConversation(conversation, { isImportant: nextImportant });
      await refreshUnifiedConversationData();
    } else {
      editEmail(email.id, { isImportant: nextImportant });
    }
    setActiveMenu(null);
  };

  const handleAddToRag = async () => {
    if (!selectedEmail || !selectedEmail.clientId) return;
    setAddingToRag(true);
    try {
      const latestText = extractLatestEmailText(selectedEmail.body || '');
      if (!latestText) {
        notify('No readable email text found to add to the knowledge base.', 'warning');
        return;
      }

      let summary = '';
      const llmId = llmMappings.analysis || llmMappings.agent_context_suggestions || activeLLMId;
      const llmConfig = llmId ? llmConfigs.find(config => config.id === llmId) : null;
      if (llmConfig) {
        try {
          const res = await fetch('/api/chat/magic', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${useAuthStore.getState().token}`,
            },
            body: JSON.stringify({
              command: `Summarize the latest email message into a concise CRM knowledge-base note. Use ${language === 'zh' ? 'Chinese' : 'English'} for internal users. Extract only stable facts, customer needs, objections, preferences, requirements, deadlines, quoted terms, and recommended follow-up context. Do not include HTML, quoted previous emails, signatures, greetings, tracking text, or markdown fences.`,
              context: {
                clientId: selectedEmail.clientId,
                systemLanguage: language,
                subject: selectedEmail.subject,
                sender: selectedEmail.sender,
                recipient: selectedEmail.recipient,
                latestEmailText: latestText,
              },
              llmConfig,
              skipKnowledgeBase: true,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.result) summary = String(data.result).trim();
        } catch (error) {
          console.warn('Email knowledge summarization failed, using cleaned text fallback.', error);
        }
      }

      const content = [
        `Date: ${new Date(selectedEmail.date).toLocaleString()}`,
        `From: ${selectedEmail.sender}`,
        `To: ${selectedEmail.recipient}`,
        '',
        summary || fallbackEmailKnowledgeSummary(latestText),
      ].join('\n');

      addKnowledgeItem({
        clientId: selectedEmail.clientId,
        title: `Email Summary: ${selectedEmail.subject}`,
        content,
      });
      setAddedToRagId(selectedEmail.id);
      setTimeout(() => setAddedToRagId(null), 2000);
      notify(language === 'zh' ? '已将邮件摘要添加到知识库。' : 'Email summary added to knowledge base.', 'success');
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : 'Failed to add email to knowledge base.', 'error');
    } finally {
      setAddingToRag(false);
    }
  };

  return {
    addingToRag,
    addedToRagId,
    submitTodo,
    submitTag,
    toggleImportant,
    handleAddToRag,
  };
}
