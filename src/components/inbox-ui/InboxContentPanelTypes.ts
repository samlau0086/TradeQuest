import type React from 'react';
import type { Client, ContactMethod, EmailMessage, LiveChatSession } from '../../store';
import type { UserProfile } from '../../authStore';
import type { ConversationMessageTranslation, InboxWhatsAppConversation, UnifiedCommunicationConversation } from './inboxModel';

export interface WhatsAppContactOptionView {
  key: string;
  clientId: string;
  clientName: string;
  clientCompany?: string;
  contactName: string;
  contactTitle?: string;
  phone: string;
}

export interface ComposeDefaults {
  recipient?: string;
  subject?: string;
  originalEmailBody?: string;
  initialBody?: string;
  draftId?: string;
  replyToEmailId?: string;
  initialOutboxId?: string;
}

export interface ConfirmDialogState {
  message: string;
  onConfirm: () => void;
}

export interface AgentContextShape {
  cacheKey: string;
  body: string;
  additionalContext: string;
  hasCustomerMessage: boolean;
  latestInbound?: { body?: string };
}

export interface InboxContentPanelProps {
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

export type InboxSelectedDetailPanelProps = Omit<
  InboxContentPanelProps,
  | 'isComposing'
  | 'composeDefaults'
  | 'isStartingWhatsApp'
  | 'setIsStartingWhatsApp'
  | 'newWhatsAppPhone'
  | 'visibleWhatsAppContactOptions'
  | 'setNewWhatsAppPhone'
  | 'setShowWhatsAppContactPicker'
  | 'selectWhatsAppContactOption'
  | 'startNewWhatsApp'
>;
