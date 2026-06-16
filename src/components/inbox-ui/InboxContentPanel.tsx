import React from 'react';
import { Mail } from 'lucide-react';
import type { Client, ContactMethod, EmailMessage, LiveChatSession } from '../../store';
import { useStore } from '../../store';
import type { UserProfile } from '../../authStore';
import { ComposeEmail } from './ComposeEmail';
import { EmailConversationPane } from './EmailConversationPane';
import { LiveChatConversationPane } from './LiveChatConversationPane';
import { StartWhatsAppConversationPane } from './StartWhatsAppConversationPane';
import { TelegramConversationPane } from './TelegramConversationPane';
import { WhatsAppConversationPane } from './WhatsAppConversationPane';
import type { ConversationMessageTranslation, InboxWhatsAppConversation, UnifiedCommunicationConversation } from './inboxModel';

interface WhatsAppContactOptionView {
  key: string;
  clientId: string;
  clientName: string;
  clientCompany?: string;
  contactName: string;
  contactTitle?: string;
  phone: string;
}

interface ComposeDefaults {
  recipient?: string;
  subject?: string;
  originalEmailBody?: string;
  initialBody?: string;
  draftId?: string;
  replyToEmailId?: string;
  initialOutboxId?: string;
}

interface ConfirmDialogState {
  message: string;
  onConfirm: () => void;
}

interface AgentContextShape {
  cacheKey: string;
  body: string;
  additionalContext: string;
  hasCustomerMessage: boolean;
  latestInbound?: { body?: string };
}

interface InboxContentPanelProps {
  isComposing: boolean;
  composeDefaults: ComposeDefaults | null;
  setIsComposing: React.Dispatch<React.SetStateAction<boolean>>;
  isStartingWhatsApp: boolean;
  setIsStartingWhatsApp: React.Dispatch<React.SetStateAction<boolean>>;
  newWhatsAppPhone: string;
  visibleWhatsAppContactOptions: WhatsAppContactOptionView[];
  setNewWhatsAppPhone: React.Dispatch<React.SetStateAction<string>>;
  setShowWhatsAppContactPicker: React.Dispatch<React.SetStateAction<boolean>>;
  selectedWhatsAppClientId: string | null;
  setSelectedWhatsAppClientId: React.Dispatch<React.SetStateAction<string | null>>;
  selectWhatsAppContactOption: (option: WhatsAppContactOptionView) => void;
  startNewWhatsApp: () => void | Promise<void>;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  language: 'en' | 'zh';
  activeTelegramClient?: Client | null;
  activeTelegramContactMethod?: ContactMethod | null;
  activeTelegramDisplayName: string;
  activeTelegramTranslateEnabled: boolean;
  activeTelegramTranslations: Record<string, ConversationMessageTranslation>;
  activeTelegramAgentContext: AgentContextShape;
  currentUser?: UserProfile | null;
  telegramMessages: any[];
  isTelegramMessagesLoading: boolean;
  translatingConversationMessageIds: Set<string>;
  activeConversationComments: any[];
  commentText: string;
  telegramReply: string;
  isSendingTelegramReply: boolean;
  activeFollowUpAt?: string | null;
  activeFollowUpNote?: string | null;
  setSelectedTelegramConversation: React.Dispatch<React.SetStateAction<UnifiedCommunicationConversation | null>>;
  setTelegramMessages: React.Dispatch<React.SetStateAction<any[]>>;
  selectClient: (clientId: string) => void;
  updateConversationOwnerStage: (conversation: UnifiedCommunicationConversation, updates: Record<string, any>) => void | Promise<void>;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState | null>>;
  deleteUnifiedConversation: (conversation: UnifiedCommunicationConversation) => Promise<void>;
  refreshUnifiedConversationData: () => void | Promise<void>;
  toggleTelegramHumanTakeover: () => void | Promise<void>;
  setConversationAutoTranslateEnabled: (channel: 'live_chat' | 'telegram', conversationKey: string, enabled: boolean) => void;
  handleCreateLead: () => void;
  setIsAddingContactToClient: React.Dispatch<React.SetStateAction<boolean>>;
  patchUnifiedConversation: (conversation: UnifiedCommunicationConversation, updates: Record<string, any>) => Promise<UnifiedCommunicationConversation>;
  applyUnifiedConversationUpdate: (conversation: UnifiedCommunicationConversation, updates: Partial<UnifiedCommunicationConversation>) => void;
  draftTelegramReply: () => void | Promise<void>;
  appendActiveConversationComment: (content: string, attachments?: any[]) => void | Promise<void>;
  updateActiveConversationFollowUp: (dueAt: string | null, note: string | null, status: 'open' | 'canceled' | 'completed') => void | Promise<void>;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  replyActiveConversationComment: (commentId: string, content: string, attachments?: any[]) => void | Promise<void>;
  setTelegramReply: React.Dispatch<React.SetStateAction<string>>;
  sendTelegramReply: () => void | Promise<void>;
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  activeLiveChatClient?: Client | null;
  activeLiveChatContactMethod?: ContactMethod | null;
  activeLiveChatSession?: LiveChatSession | null;
  activeLiveChatTranslateEnabled: boolean;
  activeLiveChatTranslations: Record<string, ConversationMessageTranslation>;
  activeLiveChatVisitorInfo?: any;
  activeLiveChatEvidenceItems: Array<{ label: string; value: string }>;
  activeLiveChatAgentContext: AgentContextShape;
  activeUnifiedConversation?: UnifiedCommunicationConversation | null;
  visibleLiveChatMessages: any[];
  liveChatReply: string;
  isSendingLiveChatReply: boolean;
  isRunningLiveChatAgent: boolean;
  latestLiveChatVisitorMessage?: { body?: string } | null;
  liveChatEndRef: React.RefObject<HTMLDivElement | null>;
  setSelectedLiveChatConversation: React.Dispatch<React.SetStateAction<UnifiedCommunicationConversation | null>>;
  toggleLiveChatHumanTakeover: () => void | Promise<void>;
  runSelectedLiveChatAgent: () => void | Promise<void>;
  setLiveChatReply: React.Dispatch<React.SetStateAction<string>>;
  sendLiveChatReply: () => void | Promise<void>;
  selectedWhatsAppPhone: string | null;
  setSelectedWhatsAppPhone: React.Dispatch<React.SetStateAction<string | null>>;
  activeWhatsAppConversation?: InboxWhatsAppConversation | null;
  activeWhatsAppClient?: Client | null;
  handleDeleteWhatsAppConversation: (conversation: InboxWhatsAppConversation) => void | Promise<void>;
  loadWhatsAppConversations: () => void | Promise<void>;
  selectedEmail?: EmailMessage;
  clients: Client[];
  isInboundCustomerEmail: (email: EmailMessage) => boolean;
  addingToRag: boolean;
  addedToRagId: string | null;
  selectedTrackingEvents: any[];
  visibleTrackingEvents: any[];
  isTrackingExpanded: boolean;
  selectedEmailAgentContext: AgentContextShape;
  latestInboundEmailForSelectedClient?: EmailMessage;
  commentAttachments: File[];
  selectEmail: (id: string | null) => void;
  setComposeDefaults: React.Dispatch<React.SetStateAction<ComposeDefaults | null>>;
  handleAddToRag: () => void | Promise<void>;
  toggleTrackingExpanded: (id: string) => void;
  editEmail: (id: string, updates: Partial<EmailMessage>) => void;
  setShowCommentAttachmentModal: React.Dispatch<React.SetStateAction<boolean>>;
  setCommentAttachments: React.Dispatch<React.SetStateAction<File[]>>;
}

export function InboxContentPanel({
  isComposing,
  composeDefaults,
  setIsComposing,
  isStartingWhatsApp,
  setIsStartingWhatsApp,
  newWhatsAppPhone,
  visibleWhatsAppContactOptions,
  setNewWhatsAppPhone,
  setShowWhatsAppContactPicker,
  selectedWhatsAppClientId,
  setSelectedWhatsAppClientId,
  selectWhatsAppContactOption,
  startNewWhatsApp,
  selectedTelegramConversation,
  language,
  activeTelegramClient,
  activeTelegramContactMethod,
  activeTelegramDisplayName,
  activeTelegramTranslateEnabled,
  activeTelegramTranslations,
  activeTelegramAgentContext,
  currentUser,
  telegramMessages,
  isTelegramMessagesLoading,
  translatingConversationMessageIds,
  activeConversationComments,
  commentText,
  telegramReply,
  isSendingTelegramReply,
  activeFollowUpAt,
  activeFollowUpNote,
  setSelectedTelegramConversation,
  setTelegramMessages,
  selectClient,
  updateConversationOwnerStage,
  setConfirmDialog,
  deleteUnifiedConversation,
  refreshUnifiedConversationData,
  toggleTelegramHumanTakeover,
  setConversationAutoTranslateEnabled,
  handleCreateLead,
  setIsAddingContactToClient,
  patchUnifiedConversation,
  applyUnifiedConversationUpdate,
  draftTelegramReply,
  appendActiveConversationComment,
  updateActiveConversationFollowUp,
  setCommentText,
  replyActiveConversationComment,
  setTelegramReply,
  sendTelegramReply,
  selectedLiveChatConversation,
  activeLiveChatClient,
  activeLiveChatContactMethod,
  activeLiveChatSession,
  activeLiveChatTranslateEnabled,
  activeLiveChatTranslations,
  activeLiveChatVisitorInfo,
  activeLiveChatEvidenceItems,
  activeLiveChatAgentContext,
  activeUnifiedConversation,
  visibleLiveChatMessages,
  liveChatReply,
  isSendingLiveChatReply,
  isRunningLiveChatAgent,
  latestLiveChatVisitorMessage,
  liveChatEndRef,
  setSelectedLiveChatConversation,
  toggleLiveChatHumanTakeover,
  runSelectedLiveChatAgent,
  setLiveChatReply,
  sendLiveChatReply,
  selectedWhatsAppPhone,
  setSelectedWhatsAppPhone,
  activeWhatsAppConversation,
  activeWhatsAppClient,
  handleDeleteWhatsAppConversation,
  loadWhatsAppConversations,
  selectedEmail,
  clients,
  isInboundCustomerEmail,
  addingToRag,
  addedToRagId,
  selectedTrackingEvents,
  visibleTrackingEvents,
  isTrackingExpanded,
  selectedEmailAgentContext,
  latestInboundEmailForSelectedClient,
  commentAttachments,
  selectEmail,
  setComposeDefaults,
  handleAddToRag,
  toggleTrackingExpanded,
  editEmail,
  setShowCommentAttachmentModal,
  setCommentAttachments,
}: InboxContentPanelProps) {
  if (isComposing) {
    return (
      <ComposeEmail
        onClose={() => setIsComposing(false)}
        initialRecipient={composeDefaults?.recipient}
        initialSubject={composeDefaults?.subject}
        initialBody={composeDefaults?.initialBody}
        originalEmailBody={composeDefaults?.originalEmailBody}
        draftId={composeDefaults?.draftId}
        replyToEmailId={composeDefaults?.replyToEmailId}
        initialOutboxId={composeDefaults?.initialOutboxId}
      />
    );
  }

  if (isStartingWhatsApp) {
    return (
      <StartWhatsAppConversationPane
        phone={newWhatsAppPhone}
        contactOptions={visibleWhatsAppContactOptions}
        onPhoneChange={(value) => {
          setNewWhatsAppPhone(value);
          if (value.includes('@')) setShowWhatsAppContactPicker(true);
          if (selectedWhatsAppClientId && value.replace(/[^0-9]/g, '') !== newWhatsAppPhone.replace(/[^0-9]/g, '')) {
            setSelectedWhatsAppClientId(null);
          }
        }}
        onPhoneFocus={() => setShowWhatsAppContactPicker(newWhatsAppPhone.includes('@'))}
        onSelectContact={selectWhatsAppContactOption}
        onStart={startNewWhatsApp}
        onCancel={() => {
          setIsStartingWhatsApp(false);
          setShowWhatsAppContactPicker(false);
        }}
      />
    );
  }

  if (selectedTelegramConversation) {
    return (
      <TelegramConversationPane
        language={language}
        selectedTelegramConversation={selectedTelegramConversation}
        activeTelegramClient={activeTelegramClient}
        activeTelegramContactMethod={activeTelegramContactMethod}
        activeTelegramDisplayName={activeTelegramDisplayName}
        activeTelegramTranslateEnabled={activeTelegramTranslateEnabled}
        activeTelegramTranslations={activeTelegramTranslations}
        activeTelegramAgentContext={activeTelegramAgentContext}
        currentUser={currentUser}
        telegramMessages={telegramMessages}
        isTelegramMessagesLoading={isTelegramMessagesLoading}
        translatingConversationMessageIds={translatingConversationMessageIds}
        activeConversationComments={activeConversationComments}
        commentText={commentText}
        telegramReply={telegramReply}
        isSendingTelegramReply={isSendingTelegramReply}
        activeFollowUpAt={activeFollowUpAt}
        activeFollowUpNote={activeFollowUpNote}
        onBack={() => { setSelectedTelegramConversation(null); setTelegramMessages([]); }}
        onClientClick={() => {
          const id = activeTelegramClient?.id || selectedTelegramConversation.client_id;
          if (id) selectClient(id);
        }}
        onOwnerChange={(ownerId) => {
          updateConversationOwnerStage(selectedTelegramConversation, { ownerId });
          setSelectedTelegramConversation(prev => prev ? { ...prev, owner_id: ownerId || undefined } : prev);
        }}
        onStageChange={(stage) => {
          updateConversationOwnerStage(selectedTelegramConversation, { stage });
          setSelectedTelegramConversation(prev => prev ? { ...prev, stage: stage || undefined } : prev);
        }}
        onDeleteConversation={() => {
          setConfirmDialog({
            message: 'Are you sure you want to delete this Telegram conversation from CRM?',
            onConfirm: async () => {
              await deleteUnifiedConversation(selectedTelegramConversation);
              setSelectedTelegramConversation(null);
              setTelegramMessages([]);
              await refreshUnifiedConversationData();
              setConfirmDialog(null);
            }
          });
        }}
        onToggleHumanTakeover={toggleTelegramHumanTakeover}
        onToggleTranslate={() => setConversationAutoTranslateEnabled('telegram', selectedTelegramConversation.id, !activeTelegramTranslateEnabled)}
        onCreateLead={!activeTelegramClient && !selectedTelegramConversation.client_id ? handleCreateLead : undefined}
        onAddToExistingClient={() => setIsAddingContactToClient(true)}
        onSetConversationFollowUp={async (dueAt, note) => {
          const patched = await patchUnifiedConversation(selectedTelegramConversation, { todoAt: dueAt, todoNote: note });
          setSelectedTelegramConversation(patched);
          await refreshUnifiedConversationData();
        }}
        onClearConversationFollowUp={async () => {
          const patched = await patchUnifiedConversation(selectedTelegramConversation, { todoAt: null, todoNote: null });
          setSelectedTelegramConversation(patched);
          await refreshUnifiedConversationData();
        }}
        onCompleteConversationFollowUp={async () => {
          const patched = await patchUnifiedConversation(selectedTelegramConversation, { todoAt: null, todoNote: null, status: 'completed' });
          setSelectedTelegramConversation(patched);
          await refreshUnifiedConversationData();
        }}
        onDraftReply={draftTelegramReply}
        onAddSuggestionComment={async () => appendActiveConversationComment(`Telegram note: ${activeTelegramAgentContext.latestInbound?.body || selectedTelegramConversation.title || 'Follow up this Telegram conversation'}`)}
        onSetAgentFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note || `Follow up Telegram conversation with ${activeTelegramDisplayName}.`, 'open')}
        onClearAgentFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
        onCompleteAgentFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
        onSaveAnalysis={async (key, insight) => {
          const patched = await patchUnifiedConversation(selectedTelegramConversation, {
            agentContextAnalysis: insight,
            agentContextAnalysisKey: key
          });
          setSelectedTelegramConversation(prev => prev ? {
            ...prev,
            agent_context_analysis: patched.agent_context_analysis || insight,
            agent_context_analysis_key: patched.agent_context_analysis_key || key
          } : prev);
          applyUnifiedConversationUpdate(selectedTelegramConversation, {
            agent_context_analysis: patched.agent_context_analysis || insight,
            agent_context_analysis_key: patched.agent_context_analysis_key || key
          });
        }}
        onCommentTextChange={setCommentText}
        onReplyComment={(commentId, content, attachments) => void replyActiveConversationComment(commentId, content, attachments)}
        onSubmitComment={() => {
          if (!commentText.trim()) return;
          void (async () => {
            await appendActiveConversationComment(commentText.trim());
            setCommentText('');
          })();
        }}
        onTelegramReplyChange={setTelegramReply}
        onSendTelegramReply={sendTelegramReply}
      />
    );
  }

  if (selectedLiveChatConversation) {
    return (
      <LiveChatConversationPane
        language={language}
        selectedLiveChatConversation={selectedLiveChatConversation}
        activeLiveChatClient={activeLiveChatClient}
        activeLiveChatContactMethod={activeLiveChatContactMethod}
        activeLiveChatSession={activeLiveChatSession}
        activeLiveChatTranslateEnabled={activeLiveChatTranslateEnabled}
        activeLiveChatTranslations={activeLiveChatTranslations}
        activeLiveChatVisitorInfo={activeLiveChatVisitorInfo}
        activeLiveChatEvidenceItems={activeLiveChatEvidenceItems}
        activeLiveChatAgentContext={activeLiveChatAgentContext}
        activeUnifiedConversation={activeUnifiedConversation}
        currentUser={currentUser}
        visibleLiveChatMessages={visibleLiveChatMessages}
        translatingConversationMessageIds={translatingConversationMessageIds}
        activeConversationComments={activeConversationComments}
        commentText={commentText}
        liveChatReply={liveChatReply}
        isSendingLiveChatReply={isSendingLiveChatReply}
        isRunningLiveChatAgent={isRunningLiveChatAgent}
        latestLiveChatVisitorMessage={latestLiveChatVisitorMessage}
        liveChatEndRef={liveChatEndRef}
        activeFollowUpAt={activeFollowUpAt}
        activeFollowUpNote={activeFollowUpNote}
        onBack={() => setSelectedLiveChatConversation(null)}
        onClientClick={() => {
          const id = activeLiveChatClient?.id || selectedLiveChatConversation.client_id;
          if (id) selectClient(id);
        }}
        onOwnerChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (ownerId) => {
          updateConversationOwnerStage(activeUnifiedConversation, { ownerId });
        } : undefined}
        onStageChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (stage) => {
          updateConversationOwnerStage(activeUnifiedConversation, { stage });
        } : undefined}
        onDeleteConversation={() => {
          setConfirmDialog({
            message: 'Are you sure you want to delete this Live Chat conversation? It may require approval before records are removed.',
            onConfirm: async () => {
              await deleteUnifiedConversation(selectedLiveChatConversation);
              setSelectedLiveChatConversation(null);
              await refreshUnifiedConversationData();
              setConfirmDialog(null);
            }
          });
        }}
        onToggleHumanTakeover={toggleLiveChatHumanTakeover}
        onRunAgent={runSelectedLiveChatAgent}
        onToggleTranslate={() => setConversationAutoTranslateEnabled('live_chat', selectedLiveChatConversation.source_id, !activeLiveChatTranslateEnabled)}
        onCreateLead={handleCreateLead}
        onAddToExistingClient={() => setIsAddingContactToClient(true)}
        onSetConversationFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note, 'open')}
        onClearConversationFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
        onCompleteConversationFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
        onAddSuggestionComment={async () => appendActiveConversationComment(`Live Chat note: ${latestLiveChatVisitorMessage?.body || selectedLiveChatConversation.title || 'Follow up this visitor'}`)}
        onSetAgentFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note || `Follow up Live Chat: ${selectedLiveChatConversation.title || selectedLiveChatConversation.contact_address || selectedLiveChatConversation.source_id}`, 'open')}
        onClearAgentFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
        onCompleteAgentFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
        onSaveAnalysis={async (key, insight) => {
          const patched = await patchUnifiedConversation(selectedLiveChatConversation, {
            agentContextAnalysis: insight,
            agentContextAnalysisKey: key
          });
          setSelectedLiveChatConversation(prev => prev ? {
            ...prev,
            agent_context_analysis: patched.agent_context_analysis || insight,
            agent_context_analysis_key: patched.agent_context_analysis_key || key
          } : prev);
          applyUnifiedConversationUpdate(selectedLiveChatConversation, {
            agent_context_analysis: patched.agent_context_analysis || insight,
            agent_context_analysis_key: patched.agent_context_analysis_key || key
          });
        }}
        onCommentTextChange={setCommentText}
        onReplyComment={(commentId, content, attachments) => void replyActiveConversationComment(commentId, content, attachments)}
        onSubmitComment={() => {
          if (!commentText.trim()) return;
          void (async () => {
            await appendActiveConversationComment(commentText.trim());
            setCommentText('');
          })();
        }}
        onLiveChatReplyChange={setLiveChatReply}
        onSendLiveChatReply={sendLiveChatReply}
      />
    );
  }

  if (selectedWhatsAppPhone) {
    return (
      <WhatsAppConversationPane
        language={language}
        selectedWhatsAppPhone={selectedWhatsAppPhone}
        activeWhatsAppConversation={activeWhatsAppConversation}
        activeWhatsAppClient={activeWhatsAppClient}
        activeUnifiedConversation={activeUnifiedConversation}
        currentUser={currentUser}
        activeFollowUpAt={activeFollowUpAt}
        activeFollowUpNote={activeFollowUpNote}
        onBack={() => { setSelectedWhatsAppPhone(null); setSelectedWhatsAppClientId(null); }}
        onClientClick={() => {
          const id = activeWhatsAppClient?.id || activeWhatsAppConversation?.clientId;
          if (id) selectClient(id);
        }}
        onOwnerChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (ownerId) => {
          updateConversationOwnerStage(activeUnifiedConversation, { ownerId });
        } : undefined}
        onStageChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (stage) => {
          updateConversationOwnerStage(activeUnifiedConversation, { stage });
        } : undefined}
        onDeleteConversation={handleDeleteWhatsAppConversation}
        onSetFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note, 'open')}
        onClearFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
        onCompleteFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
        onCloseChat={() => {
          setSelectedWhatsAppPhone(null);
          setSelectedWhatsAppClientId(null);
          loadWhatsAppConversations();
        }}
      />
    );
  }

  if (selectedEmail) {
    return (
      <EmailConversationPane
        language={language}
        selectedEmail={selectedEmail}
        clientName={selectedEmail.clientId ? clients.find(c => c.id === selectedEmail.clientId)?.name : undefined}
        activeUnifiedConversation={activeUnifiedConversation}
        currentUser={currentUser}
        isInboundCustomerEmail={isInboundCustomerEmail}
        addingToRag={addingToRag}
        addedToRagId={addedToRagId}
        selectedTrackingEvents={selectedTrackingEvents}
        visibleTrackingEvents={visibleTrackingEvents}
        isTrackingExpanded={isTrackingExpanded}
        selectedEmailAgentContext={selectedEmailAgentContext}
        latestInboundEmailForSelectedClient={latestInboundEmailForSelectedClient}
        activeFollowUpAt={activeFollowUpAt}
        activeFollowUpNote={activeFollowUpNote}
        activeConversationComments={activeConversationComments}
        commentText={commentText}
        commentAttachments={commentAttachments}
        onBack={() => selectEmail(null)}
        onClientClick={() => selectedEmail.clientId && selectClient(selectedEmail.clientId)}
        onOwnerChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (ownerId) => {
          updateConversationOwnerStage(activeUnifiedConversation, { ownerId });
        } : undefined}
        onStageChange={activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback ? (stage) => {
          updateConversationOwnerStage(activeUnifiedConversation, { stage });
        } : undefined}
        onDeleteEmail={() => {
          setConfirmDialog({
            message: 'Are you sure you want to delete this email? Emails associated with a client will be soft-deleted pending admin review.',
            onConfirm: async () => {
              const conversation = activeUnifiedConversation;
              selectEmail(null);
              if (conversation && !conversation.metadata?.localFallback) await deleteUnifiedConversation(conversation);
              else await useStore.getState().deleteEmails([selectedEmail.id]);
              await refreshUnifiedConversationData();
              setConfirmDialog(null);
            }
          });
        }}
        onEditDraft={() => {
          setComposeDefaults({
            recipient: selectedEmail.recipient,
            subject: selectedEmail.subject,
            initialBody: selectedEmail.body,
            draftId: selectedEmail.id,
            initialOutboxId: selectedEmail.outboxConfigId
          });
          setIsComposing(true);
        }}
        onReply={() => {
          setComposeDefaults({
            recipient: selectedEmail.sender,
            subject: `Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`,
            originalEmailBody: `On ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.senderName || selectedEmail.sender} wrote:<br>${selectedEmail.body || ''}`,
            replyToEmailId: selectedEmail.id
          });
          setIsComposing(true);
        }}
        onAddToRag={handleAddToRag}
        onToggleTrackingExpanded={() => toggleTrackingExpanded(selectedEmail.id)}
        onDraftAgentReply={() => {
          const replySourceEmail = isInboundCustomerEmail(selectedEmail)
            ? selectedEmail
            : latestInboundEmailForSelectedClient || selectedEmail;
          setComposeDefaults({
            recipient: isInboundCustomerEmail(replySourceEmail) ? replySourceEmail.sender : selectedEmail.recipient,
            subject: `Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`,
            originalEmailBody: isInboundCustomerEmail(replySourceEmail)
              ? `On ${new Date(replySourceEmail.date).toLocaleString()}, ${replySourceEmail.senderName || replySourceEmail.sender} wrote:<br>${replySourceEmail.body || ''}`
              : '',
            initialBody: '',
            replyToEmailId: replySourceEmail.id
          });
          setIsComposing(true);
        }}
        onAddAgentComment={async () => {
          const content = `Agent suggestion: ${selectedEmail.subject || 'Follow up this conversation'}`;
          await appendActiveConversationComment(content);
        }}
        onCreateLead={!selectedEmail.clientId ? handleCreateLead : undefined}
        onAddToExistingClient={() => setIsAddingContactToClient(true)}
        onSetFollowUp={(dueAt, note) => updateActiveConversationFollowUp(dueAt, note || `Follow up: ${selectedEmail.subject || selectedEmail.sender}`, 'open')}
        onClearFollowUp={() => updateActiveConversationFollowUp(null, null, 'canceled')}
        onCompleteFollowUp={() => updateActiveConversationFollowUp(null, null, 'completed')}
        onSaveAnalysis={(key, insight) => editEmail(selectedEmail.id, {
          agentContextAnalysis: insight,
          agentContextAnalysisKey: key
        })}
        onCommentTextChange={setCommentText}
        onAttachClick={() => setShowCommentAttachmentModal(true)}
        onRemoveAttachment={(index) => setCommentAttachments(prev => prev.filter((_, i) => i !== index))}
        onReplyComment={(commentId, content, attachments) => void replyActiveConversationComment(commentId, content, attachments)}
        onSubmitComment={() => {
          if (commentText.trim() || commentAttachments.length > 0) {
            const attsPayload = commentAttachments.length > 0
              ? commentAttachments.map(file => ({
                  id: `file${Date.now()}_${Math.random()}`,
                  name: file.name,
                  type: (file.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
                  url: URL.createObjectURL(file)
                }))
              : undefined;
            if (commentText.trim() || attsPayload) {
              void appendActiveConversationComment(commentText || 'Uploaded attachment(s)', attsPayload);
            }
            setCommentText('');
            setCommentAttachments([]);
          }
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
      <Mail className="w-12 h-12 mb-4 opacity-20" />
      <p className="text-sm">Select an email to read or create a new one.</p>
    </div>
  );
}
