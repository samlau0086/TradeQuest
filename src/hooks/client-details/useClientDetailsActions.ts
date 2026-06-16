import { useAuthStore } from '../../authStore';
import { useStore, type Client, type Deal, type ViewMode } from '../../store';

const INBOX_OPEN_REQUEST_KEY = 'tradequest:inbox-open-request:v1';

const requestInboxOpen = (payload: Record<string, any>) => {
  localStorage.setItem(INBOX_OPEN_REQUEST_KEY, JSON.stringify({ ...payload, requestedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('tradequest:open-inbox-request'));
};

interface UseClientDetailsActionsOptions {
  client?: Client | null;
  leadRecord: Deal | null;
  composeRecipient: string;
  composeInitialBody: string;
  setComposeInitialBody: (value: string) => void;
  setShowEmailCompose: (value: boolean) => void;
  setAgentLoading: (value: boolean) => void;
  selectClient: (id: string | null) => void;
  selectDeal: (id: string | null) => void;
  selectEmail: (id: string | null) => void;
  setView: (view: ViewMode) => void;
  getLLMConfig: (module: string) => any;
}

export function useClientDetailsActions({
  client,
  leadRecord,
  composeRecipient,
  composeInitialBody,
  setComposeInitialBody,
  setShowEmailCompose,
  setAgentLoading,
  selectClient,
  selectDeal,
  selectEmail,
  setView,
  getLLMConfig,
}: UseClientDetailsActionsOptions) {
  const openQuote = (quoteId: string) => {
    localStorage.setItem('tradequest:openQuoteId', quoteId);
    selectDeal(null);
    selectClient(null);
    setView('quotes');
  };

  const openEmailInInbox = (emailId: string | null | undefined) => {
    selectEmail(emailId || null);
    selectDeal(null);
    selectClient(null);
    setView('inbox');
  };

  const openAgentHub = () => setView('agent-hub');
  const openLiveChat = () => setView('live-chat');
  const openKnowledgeBase = () => setView('knowledge-base');

  const openEmailComposeInInbox = () => {
    if (!client) return;
    requestInboxOpen({
      type: 'composeEmail',
      recipient: composeRecipient,
      subject: leadRecord ? `Follow up: ${leadRecord.name}` : `Follow up from ${client.company || client.name}`,
      initialBody: composeInitialBody
    });
    setShowEmailCompose(false);
    setComposeInitialBody('');
    selectDeal(null);
    selectClient(null);
    setView('inbox');
  };

  const closeDetails = () => {
    selectDeal(null);
    selectClient(null);
  };

  const runAgent = async () => {
    if (!client?.agentEnabled) return;
    setAgentLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/run-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          llmConfig: getLLMConfig('analysis'),
          systemLanguage: useStore.getState().language === 'zh' ? 'Chinese' : 'English',
        })
      });
      const data = await res.json();
      if (data.success) {
        useAuthStore.getState().fetchProfile();
        useStore.getState().editClient(client.id, {
          agentSummary: data.summary,
          agentNextStep: data.nextStep
        });
      }
    } catch(err) {
      console.error(err);
    } finally {
      setAgentLoading(false);
    }
  };

  return {
    openQuote,
    openEmailInInbox,
    openAgentHub,
    openLiveChat,
    openKnowledgeBase,
    openEmailComposeInInbox,
    closeDetails,
    runAgent,
  };
}
