import type { Client, EmailMessage, LiveChatSession } from '../../store';
import type {
  ConversationMessageTranslation,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
} from './inboxModel';

export interface SelectedEmailStateSlice {
  [key: string]: any;
  selectedEmail?: EmailMessage;
  latestInboundEmailForSelectedClient?: EmailMessage;
  selectedEmailAgentContext: any;
  selectedTrackingEvents: any[];
  isTrackingExpanded: boolean;
  visibleTrackingEvents: any[];
  toggleTrackingExpanded: (id: string) => void;
}

export interface ActiveConversationStateSlice {
  [key: string]: any;
  activeWhatsAppConversation?: InboxWhatsAppConversation | null;
  activeWhatsAppClient?: Client | null;
  activeTelegramClient?: Client | null;
  activeTelegramContactMethod?: any;
  activeTelegramDisplayName: string;
  activeTelegramTranslateEnabled: boolean;
  activeTelegramTranslations: Record<string, ConversationMessageTranslation>;
  activeTelegramAgentContext: any;
  activeLiveChatSession?: LiveChatSession | null;
  activeLiveChatTranslateEnabled: boolean;
  activeLiveChatTranslations: Record<string, ConversationMessageTranslation>;
  visibleLiveChatMessages: any[];
  activeLiveChatClient?: Client | null;
  activeLiveChatVisitorInfo?: any;
  latestLiveChatVisitorMessage?: { body?: string } | null;
  activeLiveChatEvidenceItems: Array<{ label: string; value: string }>;
  activeLiveChatContactMethod?: any;
  activeLiveChatDisplayName: string;
  activeLiveChatAgentContext: any;
  activeLinkableContactMethod?: any;
  activeLinkableDisplayName: string;
  activeUnifiedConversation?: UnifiedCommunicationConversation | null;
}

export interface CommentsStateSlice {
  [key: string]: any;
  activeConversationComments: any[];
}

export interface FollowUpStateSlice {
  [key: string]: any;
  activeFollowUpAt?: string | null;
  activeFollowUpNote?: string | null;
}

export interface TranslationStateSlice {
  [key: string]: any;
  translatingConversationMessageIds: Set<string>;
}

export interface UseInboxConversationSlicesOptions {
  selectedEmail: EmailMessage | undefined;
  selectedEmailIsInbound: boolean;
  selectedEmailContactAddress: string | null;
  selectedEmailClient: Client | null;
  latestInboundEmailForSelectedClient: EmailMessage | undefined;
  selectedEmailAgentContext: any;
  selectedTrackingEvents: any[];
  isTrackingExpanded: boolean;
  visibleTrackingEvents: any[];
  toggleTrackingExpanded: (id: string) => void;
  activeWhatsAppConversation: InboxWhatsAppConversation | null;
  activeWhatsAppClient: Client | null;
  activeWhatsAppFollowUp: any;
  activeTelegramClient: Client | null;
  activeTelegramContactMethod: any;
  activeTelegramDisplayName: string;
  activeTelegramTranslateEnabled: boolean;
  activeTelegramTranslations: Record<string, ConversationMessageTranslation>;
  activeTelegramAgentContext: any;
  activeLiveChatSession: LiveChatSession | null;
  activeLiveChatMessages: any[];
  activeLiveChatTranslateEnabled: boolean;
  activeLiveChatTranslations: Record<string, ConversationMessageTranslation>;
  visibleLiveChatMessages: any[];
  activeLiveChatClient: Client | null;
  activeLiveChatVisitorInfo: any;
  latestLiveChatVisitorMessage: { body?: string } | null;
  activeLiveChatEvidenceItems: Array<{ label: string; value: string }>;
  activeLiveChatContactMethod: any;
  activeLiveChatDisplayName: string;
  activeLiveChatAgentContext: any;
  activeLinkableContactMethod: any;
  activeLinkableDisplayName: string;
  activeUnifiedConversation: UnifiedCommunicationConversation | null;
  activeConversationComments: any[];
  appendActiveConversationComment: (content: string, attachments?: any[]) => void | Promise<void>;
  replyActiveConversationComment: (commentId: string, content: string, attachments?: any[]) => void | Promise<void>;
  activeFollowUpAt: string | null;
  activeFollowUpNote: string | null;
  updateActiveConversationFollowUp: (
    dueAt: string | null,
    note: string | null,
    status: 'open' | 'canceled' | 'completed',
  ) => void | Promise<void>;
  conversationAutoTranslateConfig: any;
  conversationTranslations: any;
  translatingConversationMessageIds: Set<string>;
  setConversationAutoTranslateEnabled: (
    channel: 'live_chat' | 'telegram',
    conversationKey: string,
    enabled: boolean,
  ) => void;
}

export interface UseInboxConversationSlicesResult {
  selectedEmailState: SelectedEmailStateSlice;
  activeConversationState: ActiveConversationStateSlice;
  commentsState: CommentsStateSlice;
  followUpState: FollowUpStateSlice;
  translationState: TranslationStateSlice;
}
