import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import {
  type Client,
  type Deal,
  type EmailMessage,
  type KnowledgeItem,
  type LLMConfig,
  type Log,
  type Product
} from '../store';
import { type WhatsAppConversation, type WhatsAppHubMessage } from './whatsappMessageModel';

type WhatsAppDraftMode = 'draft' | 'customer_service';

interface UseWhatsAppDraftingOptions {
  body: string;
  setBody: Dispatch<SetStateAction<string>>;
  messages: WhatsAppHubMessage[];
  activeClient: Client | null;
  conversation: WhatsAppConversation | null;
  relatedDeals: Deal[];
  knowledgeBase: KnowledgeItem[];
  products: Product[];
  logs: Log[];
  emails: EmailMessage[];
  latestInboundMessage?: WhatsAppHubMessage;
  latestOutboundMessage?: WhatsAppHubMessage;
  displayPhone: string;
  outboundLanguage: string;
  language: 'en' | 'zh';
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  translate: (key: string) => string;
  getLLMConfig: (module: string) => LLMConfig | null;
  incrementAgentHubTaskCount: (agentId: string) => void;
}

export function useWhatsAppDrafting({
  body,
  setBody,
  messages,
  activeClient,
  conversation,
  relatedDeals,
  knowledgeBase,
  products,
  logs,
  emails,
  latestInboundMessage,
  latestOutboundMessage,
  displayPhone,
  outboundLanguage,
  language,
  notify,
  translate,
  getLLMConfig,
  incrementAgentHubTaskCount
}: UseWhatsAppDraftingOptions) {
  const [generating, setGenerating] = useState(false);

  const generateWhatsAppMessageText = useCallback(async (seedPrompt: string, mode: WhatsAppDraftMode = 'draft') => {
    const prompt = seedPrompt.trim() || (mode === 'customer_service'
      ? 'Generate the best next WhatsApp customer-service reply based on the latest inbound customer message, CRM context, products, and RAG.'
      : '');
    if (!prompt) {
      notify(translate('typePromptFirst'), 'warning');
      return '';
    }

    const llmConfig = getLLMConfig('whatsapp_drafting') || getLLMConfig('drafting');
    if (!llmConfig) {
      notify(translate('configureWhatsAppDraftingModel'), 'warning');
      return '';
    }

    const recentMessages = messages.slice(-12).map(message => ({
      direction: message.direction,
      body: message.body,
      at: message.created_at || message.received_at
    }));
    const clientLogs = activeClient
      ? logs
          .filter(log => log.clientId === activeClient.id)
          .slice(0, 20)
          .map(log => ({ date: log.date, type: log.type, content: log.content }))
      : [];
    const clientEmails = activeClient
      ? emails
          .filter(email => email.clientId === activeClient.id)
          .slice(0, 8)
          .map(email => ({
            date: email.date,
            type: email.type,
            subject: email.subject,
            bodyPreview: email.body?.slice(0, 600)
          }))
      : [];
    const localKnowledgeSnippets = activeClient
      ? knowledgeBase
          .filter(item => !item.clientId || item.clientId === activeClient.id)
          .slice(0, 8)
          .map(item => ({ title: item.title, content: item.content?.slice(0, 900) }))
      : knowledgeBase.slice(0, 5).map(item => ({ title: item.title, content: item.content?.slice(0, 900) }));
    const productSnippets = products.slice(0, 12).map(product => ({
      name: product.name,
      sku: product.sku,
      description: product.description?.slice(0, 700),
      salesPoints: product.salesPoints?.slice(0, 700),
      bulkPrices: product.bulkPrices || []
    }));

    const response = await fetch('/api/chat/magic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        command: `${mode === 'customer_service' ? 'You are WhatsApp Customer Service Agent. Generate the next customer-service WhatsApp reply using this operator guidance or blank instruction' : 'Draft an outbound WhatsApp message using this user instruction as the prompt'}: ${prompt}

Write in a WhatsApp style: concise, natural, conversational, easy to reply to, and not formatted like an email. Customer-facing output language: ${outboundLanguage}. This language was resolved by priority: last customer communication language > client preferred language > official country/region language > English. Adapt tone, timing, offer details, and next step to the customer profile, preferences, prior communication, CRM records, recent WhatsApp chat, and relevant knowledge base context.
Critical direction rule: inbound messages are customer messages; outbound messages are our team's messages. Never treat our outbound messages as if the customer said them. If the latest message is outbound, draft a follow-up based on the latest inbound customer message and prior outreach context.
Before drafting, use the provided AI Customer Summary, AI next step, lead summaries, deal context, local RAG snippets, and product sales points. If those conflict with the raw chat, prioritize the latest inbound customer message and then CRM AI analysis.
If compressed WhatsApp memory is provided, use it as durable long-conversation memory and avoid re-reading old turns unless the latest inbound message changes the context.
${mode === 'customer_service' ? 'If there is no inbound customer message, do not pretend the customer asked a question. Send a low-pressure service follow-up or request clarification only when appropriate.' : ''}
Return only the message text.`,
        context: {
          channel: 'whatsapp',
          userInstruction: prompt,
          directionPolicy: 'Only inbound WhatsApp messages are customer messages. Outbound messages were sent by our team and must be used only as prior outreach context, never as customer requests to answer.',
          client: activeClient,
          clientId: activeClient?.id || conversation?.clientId || null,
          aiCustomerSummary: activeClient?.agentSummary || activeClient?.leadSummary || '',
          aiCustomerNextStep: activeClient?.agentNextStep || activeClient?.leadNextStep || '',
          aiCustomerScore: activeClient?.leadScore ?? null,
          compressedWhatsAppMemory: {
            summary: conversation?.whatsappSummary || '',
            keyPoints: conversation?.whatsappSummaryKeyPoints || [],
            nextStep: conversation?.whatsappSummaryNextStep || '',
            updatedAt: conversation?.whatsappSummaryUpdatedAt || null
          },
          relatedLeads: relatedDeals.map(deal => ({
            id: deal.id,
            name: deal.name,
            status: deal.status,
            value: deal.value,
            leadScore: deal.leadScore,
            leadSummary: deal.leadSummary,
            leadNextStep: deal.leadNextStep,
            comments: (deal.comments || []).slice(-5)
          })),
          localKnowledgeSnippets,
          productSnippets,
          clientPreferences: {
            preferredLanguage: activeClient?.preferredLanguage,
            preferredTimeRange: activeClient?.preferredTimeRange,
            country: activeClient?.country,
            tags: activeClient?.tags || []
          },
          clientComments: activeClient?.comments || [],
          clientLogs,
          relatedEmails: clientEmails,
          conversation,
          recentWhatsAppMessages: recentMessages,
          latestInboundCustomerMessage: latestInboundMessage?.body || '',
          latestOutboundOurMessage: latestOutboundMessage?.body || '',
          targetPhone: displayPhone,
          outboundLanguage,
          clientPreferredLanguage: activeClient?.preferredLanguage || null,
          systemLanguage: language === 'zh' ? 'Chinese' : 'English'
        },
        llmConfig,
        embeddingLlmConfig: getLLMConfig('embedding'),
        skipKnowledgeBase: false
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to generate WhatsApp message');
    return (data.result || '').trim();
  }, [
    activeClient,
    conversation,
    displayPhone,
    emails,
    getLLMConfig,
    knowledgeBase,
    language,
    latestInboundMessage,
    latestOutboundMessage,
    logs,
    messages,
    notify,
    outboundLanguage,
    products,
    relatedDeals,
    translate
  ]);

  const generateWhatsAppMessage = useCallback(async (seedPrompt = body.trim()) => {
    setGenerating(true);
    try {
      const text = await generateWhatsAppMessageText(seedPrompt, 'draft');
      if (!text) return;
      setBody(text);
      incrementAgentHubTaskCount('whatsapp_draft_agent');
      notify('WhatsApp message drafted with AI.', 'success');
    } catch (error: any) {
      notify(error.message || 'Failed to generate WhatsApp message.', 'error');
    } finally {
      setGenerating(false);
    }
  }, [body, generateWhatsAppMessageText, incrementAgentHubTaskCount, notify, setBody]);

  return {
    generating,
    generateWhatsAppMessageText,
    generateWhatsAppMessage,
  };
}
