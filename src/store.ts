import { create } from 'zustand';

export type ViewMode = 'kanban' | 'map' | 'inbox' | 'dashboard' | 'dormant' | 'leads' | 'followups' | 'settings';

export type ClientStatus = 'Leads' | 'Contacted' | 'Sample Sent' | 'Negotiating' | 'Closed Won';

export interface ContactMethod {
  type: 'email' | 'whatsapp' | 'messenger' | 'telegram' | 'phone';
  value: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'other';
  url: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
  replies?: Comment[];
}

export interface ExpLog {
  id: string;
  amount: number;
  reason: string;
  date: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  country: string;
  status: ClientStatus;
  tags: string[];
  lastContact: string;
  isDormant?: boolean;
  contactMethods?: ContactMethod[];
  comments?: Comment[];
}

export interface Log {
  id: string;
  clientId: string;
  date: string;
  content: string;
}

export interface EmailMessage {
  id: string;
  clientId?: string; 
  sender: string; 
  senderName?: string;
  recipient: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  type: 'inbox' | 'sent' | 'scheduled';
  tags?: string[];
  comments?: Comment[];
  scheduledAt?: string;
  attachments?: Attachment[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  expReward: number;
  completed: boolean;
  skippedUntil?: string;
}

export interface DormantClientAnalysis {
  clientId: string;
  reason: string;
  suggestedAction: string;
}

export interface InboxConfig {
  id: string;
  name: string;
  type: 'imap' | 'pop3';
  host: string;
  port: string;
  username: string;
  password: string; // usually should be stored securely but we will keep here for preview
  secure: boolean;
}

export interface OutboxConfig {
  id: string;
  name: string;
  type: 'smtp' | 'resend';
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  apiKey?: string; // used for resend
  secure?: boolean;
  fromEmail: string;
  fromName: string;
}

export interface LLMConfig {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'custom_openai';
  apiKey: string;
  model: string;
  baseURL?: string;
}

export interface StoreState {
  llmConfigs: LLMConfig[];
  addLLMConfig: (config: Omit<LLMConfig, 'id'>) => void;
  updateLLMConfig: (id: string, updates: Partial<LLMConfig>) => void;
  deleteLLMConfig: (id: string) => void;
  llmMappings: Record<string, string | null>;
  setLLMMapping: (module: string, id: string | null) => void;
  activeLLMId: string | null; // Keep for legacy/fallback
  setActiveLLMId: (id: string | null) => void;

  inboxConfigs: InboxConfig[];
  addInboxConfig: (config: Omit<InboxConfig, 'id'>) => void;
  updateInboxConfig: (id: string, updates: Partial<InboxConfig>) => void;
  deleteInboxConfig: (id: string) => void;

  outboxConfigs: OutboxConfig[];
  addOutboxConfig: (config: Omit<OutboxConfig, 'id'>) => void;
  updateOutboxConfig: (id: string, updates: Partial<OutboxConfig>) => void;
  deleteOutboxConfig: (id: string) => void;
  
  view: ViewMode;
  setView: (view: ViewMode) => void;
  
  kanbanSearch: string;
  setKanbanSearch: (search: string) => void;
  
  dormantAnalysisList: DormantClientAnalysis[] | null;
  setDormantAnalysisList: (analysisList: DormantClientAnalysis[]) => void;
  
  leadsAnalysisList: DormantClientAnalysis[] | null;
  setLeadsAnalysisList: (analysisList: DormantClientAnalysis[]) => void;

  followupsAnalysisList: DormantClientAnalysis[] | null;
  setFollowupsAnalysisList: (analysisList: DormantClientAnalysis[]) => void;
  
  userExp: number;
  userLevel: number;
  userTitle: string;
  currentStreak: number;
  expLogs: ExpLog[];
  addExp: (amount: number, reason?: string) => void;
  
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => string;
  editClient: (id: string, updates: Partial<Omit<Client, 'id'>>) => void;
  deleteClient: (id: string) => void;
  updateClientStatus: (id: string, status: ClientStatus) => void;
  
  addComment: (clientId: string, content: string, attachments?: Attachment[]) => void;
  addReply: (clientId: string, commentId: string, content: string, attachments?: Attachment[]) => void;

  logs: Log[];
  addLog: (clientId: string, content: string) => void;

  emails: EmailMessage[];
  addEmail: (email: Omit<EmailMessage, 'id' | 'date'>) => void;
  editEmail: (id: string, updates: Partial<EmailMessage>) => void;
  markEmailRead: (id: string) => void;
  addEmailComment: (emailId: string, content: string, attachments?: Attachment[]) => void;
  addEmailReply: (emailId: string, commentId: string, content: string, attachments?: Attachment[]) => void;
  checkScheduledEmails: () => void;

  selectedClientId: string | null;
  selectClient: (id: string | null) => void;

  dailyQuests: Quest[];
  addQuest: (quest: Omit<Quest, 'id' | 'completed'>) => void;
  completeQuest: (id: string) => void;
  skipQuest: (id: string, days: number) => void;

  broadcasts: { id: string, message: string }[];
  addBroadcast: (message: string) => void;

  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

  language: 'en' | 'zh';
  setLanguage: (lang: 'en' | 'zh') => void;

  fetchInitialData: () => Promise<void>;
}

const INITIAL_CLIENTS: Client[] = [];

const INITIAL_LOGS: Log[] = [];

const INITIAL_EMAILS: EmailMessage[] = [];

export const useStore = create<StoreState>((set, get) => ({
  llmConfigs: [],
  addLLMConfig: (config) => set((state) => ({ llmConfigs: [...state.llmConfigs, { ...config, id: `llm_${Date.now()}` }] })),
  updateLLMConfig: (id, updates) => set((state) => ({ llmConfigs: state.llmConfigs.map(a => a.id === id ? { ...a, ...updates } : a) })),
  deleteLLMConfig: (id) => set((state) => {
    const newMappings = { ...state.llmMappings };
    Object.keys(newMappings).forEach(key => {
      if (newMappings[key] === id) newMappings[key] = null;
    });
    return { 
      llmConfigs: state.llmConfigs.filter(a => a.id !== id),
      activeLLMId: state.activeLLMId === id ? null : state.activeLLMId,
      llmMappings: newMappings
    };
  }),
  llmMappings: {
    magic: null,
    drafting: null,
    analysis: null
  },
  setLLMMapping: (module, id) => set((state) => ({
    llmMappings: { ...state.llmMappings, [module]: id }
  })),
  activeLLMId: null,
  setActiveLLMId: (id) => set({ activeLLMId: id }),

  inboxConfigs: [],
  addInboxConfig: (config) => set((state) => ({ inboxConfigs: [...state.inboxConfigs, { ...config, id: `inbox_${Date.now()}` }] })),
  updateInboxConfig: (id, updates) => set((state) => ({ inboxConfigs: state.inboxConfigs.map(a => a.id === id ? { ...a, ...updates } : a) })),
  deleteInboxConfig: (id) => set((state) => ({ inboxConfigs: state.inboxConfigs.filter(a => a.id !== id) })),

  outboxConfigs: [],
  addOutboxConfig: (config) => set((state) => ({ outboxConfigs: [...state.outboxConfigs, { ...config, id: `outbox_${Date.now()}` }] })),
  updateOutboxConfig: (id, updates) => set((state) => ({ outboxConfigs: state.outboxConfigs.map(a => a.id === id ? { ...a, ...updates } : a) })),
  deleteOutboxConfig: (id) => set((state) => ({ outboxConfigs: state.outboxConfigs.filter(a => a.id !== id) })),

  view: 'kanban',
  setView: (view) => set({ view }),

  kanbanSearch: '',
  setKanbanSearch: (search) => set({ kanbanSearch: search }),

  dormantAnalysisList: null,
  setDormantAnalysisList: (analysisList) => set({ dormantAnalysisList: analysisList }),

  leadsAnalysisList: null,
  setLeadsAnalysisList: (analysisList) => set({ leadsAnalysisList: analysisList }),

  followupsAnalysisList: null,
  setFollowupsAnalysisList: (analysisList) => set({ followupsAnalysisList: analysisList }),

  userExp: 240,
  userLevel: 3,
  userTitle: "Junior SOHO",
  currentStreak: 4,
  expLogs: [],
  addExp: (amount, reason) => set((state) => {
    let newExp = state.userExp + amount;
    let newLevel = state.userLevel;
    let newTitle = state.userTitle;
    
    if (newExp >= 500) {
      newLevel += 1;
      newExp -= 500;
      if (newLevel >= 5) newTitle = "Elite Hunter";
      else if (newLevel >= 10) newTitle = "Trade Master";
    }
    
    const newLog: ExpLog = {
      id: `exp_${Date.now()}`,
      amount,
      reason: reason || 'Task Completed',
      date: new Date().toISOString()
    };
    
    return { userExp: newExp, userLevel: newLevel, userTitle: newTitle, expLogs: [newLog, ...state.expLogs] };
  }),

  clients: INITIAL_CLIENTS,
  addClient: (client) => {
    const id = `c${Date.now()}`;
    const newClient = { ...client, id };
    
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newClient)
      }).catch(console.error);
    }
    
    set((state) => ({
      clients: [...state.clients, newClient]
    }));
    return id;
  },
  editClient: (id, updates) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      }).catch(console.error);
    }
    return { clients: state.clients.map(c => c.id === id ? { ...c, ...updates } : c) };
  }),
  deleteClient: (id) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }
    return {
      clients: state.clients.filter(c => c.id !== id),
      selectedClientId: state.selectedClientId === id ? null : state.selectedClientId
    };
  }),
  updateClientStatus: (id, status) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status, isDormant: false })
      }).catch(console.error);
    }
    return { clients: state.clients.map(c => c.id === id ? { ...c, status, isDormant: false } : c) };
  }),
  
  addComment: (clientId, content, attachments) => set((state) => {
    const newComment: Comment = {
      id: `cmt${Date.now()}`,
      author: state.userTitle,
      content,
      createdAt: new Date().toISOString(),
      attachments,
      replies: []
    };
    
    const token = localStorage.getItem('token');
    const client = state.clients.find(c => c.id === clientId);
    if (client && token) {
      fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ comments: [...(client.comments || []), newComment] })
      }).catch(console.error);
    }
    
    return {
      clients: state.clients.map(c => {
        if (c.id === clientId) {
          return { ...c, comments: [...(c.comments || []), newComment] };
        }
        return c;
      })
    };
  }),

  addReply: (clientId, commentId, content, attachments) => set((state) => {
    const addReplyRecursive = (comments: Comment[], targetId: string, reply: Comment): Comment[] => {
      return comments.map(c => {
        if (c.id === targetId) {
          return { ...c, replies: [...(c.replies || []), reply] };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: addReplyRecursive(c.replies, targetId, reply) };
        }
        return c;
      });
    };

    return {
      clients: state.clients.map(c => {
        if (c.id === clientId) {
          const newReply: Comment = {
            id: `rep${Date.now()}`,
            author: state.userTitle,
            content,
            createdAt: new Date().toISOString(),
            attachments,
            replies: []
          };
          const updatedComments = addReplyRecursive(c.comments || [], commentId, newReply);
          return { ...c, comments: updatedComments };
        }
        return c;
      })
    };
  }),

  logs: INITIAL_LOGS,
  addLog: (clientId, content) => {
    set((state) => {
      const client = state.clients.find(c => c.id === clientId);
      if (client && client.isDormant) {
         setTimeout(() => get().completeQuest('q1'), 0);
      }
      const newLog = { id: `log_${Date.now()}`, clientId, date: new Date().toISOString(), content };
      
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newLog)
        }).catch(console.error);
      }
      
      return {
        logs: [newLog, ...state.logs]
      };
    });
  },

  emails: INITIAL_EMAILS,
  addEmail: (email) => {
    set((state) => {
      if (email.type === 'sent') {
         setTimeout(() => get().completeQuest('q2'), 0);
      }
      const client = state.clients.find(c => c.id === email.clientId);
      if (client && client.isDormant) {
         setTimeout(() => get().completeQuest('q1'), 0);
      }
      
      const newEmail = { ...email, id: `e${Date.now()}`, date: new Date().toISOString() } as EmailMessage;
      
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newEmail)
        }).catch(console.error);
      }
      
      return {
        emails: [newEmail, ...state.emails]
      };
    });
  },
  editEmail: (id, updates) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/emails/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      }).catch(console.error);
    }
    return { emails: state.emails.map(e => e.id === id ? { ...e, ...updates } : e) };
  }),
  markEmailRead: (id) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/emails/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ read: true })
      }).catch(console.error);
    }
    return { emails: state.emails.map(e => e.id === id ? { ...e, read: true } : e) };
  }),
  addEmailComment: (emailId, content, attachments) => set((state) => ({
    emails: state.emails.map(e => {
      if (e.id === emailId) {
        const newComment: Comment = {
          id: `cmt${Date.now()}`,
          author: state.userTitle,
          content,
          createdAt: new Date().toISOString(),
          attachments,
          replies: []
        };
        return { ...e, comments: [...(e.comments || []), newComment] };
      }
      return e;
    })
  })),
  addEmailReply: (emailId, commentId, content, attachments) => set((state) => {
    const addReplyRecursive = (comments: Comment[], targetId: string, reply: Comment): Comment[] => {
      return comments.map(c => {
        if (c.id === targetId) {
          return { ...c, replies: [...(c.replies || []), reply] };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: addReplyRecursive(c.replies, targetId, reply) };
        }
        return c;
      });
    };

    return {
      emails: state.emails.map(e => {
        if (e.id === emailId) {
          const newReply: Comment = {
            id: `rep${Date.now()}`,
            author: state.userTitle,
            content,
            createdAt: new Date().toISOString(),
            attachments,
            replies: []
          };
          const updatedComments = addReplyRecursive(e.comments || [], commentId, newReply);
          return { ...e, comments: updatedComments };
        }
        return e;
      })
    };
  }),
  checkScheduledEmails: () => set((state) => {
    const now = Date.now();
    let changed = false;
    const emails = state.emails.map(e => {
      if (e.type === 'scheduled' && e.scheduledAt && new Date(e.scheduledAt).getTime() <= now) {
        changed = true;
        return { ...e, type: 'sent', date: new Date().toISOString() } as EmailMessage;
      }
      return e;
    });
    if (changed) {
      return { emails };
    }
    return state;
  }),

  selectedClientId: null,
  selectClient: (id) => set({ selectedClientId: id }),

  dailyQuests: [
    { id: 'q1', title: 'Wake up Dormant Clients', description: 'Contact 1 client inactive for >30 days.', expReward: 50, completed: false },
    { id: 'q2', title: 'First Blood', description: 'Send out the first development email of the day.', expReward: 20, completed: false },
    { id: 'q3', title: 'Follow Up Master', description: 'Complete scheduled follow-ups.', expReward: 80, completed: false }
  ],
  addQuest: (quest) => set((state) => ({
    dailyQuests: [...state.dailyQuests, { ...quest, id: `q${Date.now()}`, completed: false }]
  })),
  completeQuest: (id) => set((state) => {
    const quest = state.dailyQuests.find(q => q.id === id);
    if (quest && !quest.completed) {
      setTimeout(() => state.addExp(quest.expReward, `Completed quest: ${quest.title}`), 0);
      return {
        dailyQuests: state.dailyQuests.map(q => q.id === id ? { ...q, completed: true } : q)
      };
    }
    return state;
  }),
  skipQuest: (id, days) => set((state) => {
    const skipUntil = new Date(Date.now() + days * 86400000).toISOString();
    return {
      dailyQuests: state.dailyQuests.map(q => q.id === id ? { ...q, skippedUntil: skipUntil } : q)
    };
  }),

  broadcasts: [
    { id: 'b1', message: '🎉 Sam just closed a Brazil deal! Global 2x EXP for 1hr!' }
  ],
  addBroadcast: (message) => set((state) => ({
    broadcasts: [{ id: Date.now().toString(), message }, ...state.broadcasts].slice(0, 3)
  })),
  
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  },
  
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  fetchInitialData: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [clientsRes, logsRes, emailsRes] = await Promise.all([
        fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/logs', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/emails', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const clients = clientsRes.ok ? await clientsRes.json() : [];
      const logs = logsRes.ok ? await logsRes.json() : [];
      const emails = emailsRes.ok ? await emailsRes.json() : [];

      set({ clients, logs, emails });
    } catch (e) {
      console.error("Failed to fetch initial data", e);
    }
  }
}));
