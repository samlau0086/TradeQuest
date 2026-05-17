import { create } from 'zustand';
import { useAuthStore } from './authStore';

export type ViewMode = 'kanban' | 'map' | 'inbox' | 'dashboard' | 'dormant' | 'leads' | 'followups' | 'settings' | 'user-management' | 'clients' | 'public-pool' | 'edit-requests' | 'list';

export type ClientStatus = 'Leads' | 'Contacted' | 'Sample Sent' | 'Negotiating' | 'Closed Won'; // Kept for legacy compatibility if needed, better to rename to DealStage but will keep for now.

export interface Deal {
  id: string;
  clientId: string | null;
  name: string;
  value: number;
  status: ClientStatus;
  contactInfo?: {
    name: string;
    company: string;
    country: string;
    tags: string[];
    contactMethods: ContactMethod[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContactMethod {
  type: 'email' | 'whatsapp' | 'messenger' | 'telegram' | 'phone' | 'wechat';
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
  pendingEditRequest?: boolean;
  deletedBy?: string;
}

export interface ClientEditRequest {
  id: number;
  client_id: string;
  user_id: string;
  original_data: any;
  requested_data: any;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  current_client_name?: string;
  requester_name?: string;
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

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  expReward: number;
  unlockedAt: number | null;
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
  addClient: (client: Omit<Client, 'id'>) => Promise<string | null>;
  editClient: (id: string, updates: Partial<Omit<Client, 'id'>>) => void;
  submitClientEditRequest: (id: string, requestedData: Partial<Omit<Client, 'id'>>) => void;
  deleteClient: (id: string) => void;
  updateClientStatus: (id: string, status: ClientStatus) => void;

  deals: Deal[];
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  fetchDeals: () => void;
  
  publicClients: Client[];
  fetchPublicClients: () => void;
  claimClient: (id: string) => void;
  importPublicLeads: (leads: any[]) => Promise<void>;
  
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

  achievements: Achievement[];
  checkAchievements: () => void;

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

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_client', title: 'First Contact', description: 'Add your first client to the CRM.', icon: 'UserPlus', expReward: 100, unlockedAt: null },
  { id: 'networking', title: 'Networker', description: 'Grow your list to 10 clients.', icon: 'Users', expReward: 250, unlockedAt: null },
  { id: 'close_deal', title: 'The Closer', description: 'Successfully win your first deal.', icon: 'Handshake', expReward: 500, unlockedAt: null },
  { id: 'global_reach', title: 'Global Reach', description: 'Have clients from at least 3 different countries.', icon: 'Globe', expReward: 300, unlockedAt: null },
  { id: 'world_domination', title: 'World Domination', description: 'Have clients from 10 different countries.', icon: 'Earth', expReward: 1500, unlockedAt: null },
  { id: 'level_5', title: 'Elite Hunter', description: 'Reach Level 5.', icon: 'Swords', expReward: 200, unlockedAt: null },
  { id: 'level_10', title: 'Trade Master', description: 'Reach Level 10.', icon: 'Crown', expReward: 1000, unlockedAt: null },
  { id: 'veteran', title: 'Veteran', description: 'Reach Level 20.', icon: '🎖️', expReward: 3000, unlockedAt: null },
  { id: 'inbox_zero', title: 'Inbox Zero', description: 'Clear all unread emails in your inbox.', icon: 'MailCheck', expReward: 150, unlockedAt: null },
  { id: 'rich_history', title: 'Historian', description: 'Log 50 interactions or events.', icon: 'BookOpen', expReward: 400, unlockedAt: null },
  { id: 'quest_master', title: 'Quest Master', description: 'Complete a daily quest.', icon: 'Target', expReward: 100, unlockedAt: null },
  { id: 'early_bird', title: 'Early Bird', description: 'Send out an email before 8 AM.', icon: '🌅', expReward: 150, unlockedAt: null },
  { id: 'night_owl', title: 'Night Owl', description: 'Log an interaction after 10 PM.', icon: '🦉', expReward: 150, unlockedAt: null },
  { id: 'deal_maker', title: 'Deal Maker', description: 'Close 5 deals.', icon: '🤝', expReward: 600, unlockedAt: null },
  { id: 'sales_legend', title: 'Sales Legend', description: 'Close 20 deals.', icon: '👑', expReward: 2000, unlockedAt: null },
  { id: 'sample_sender', title: 'Sample Sender', description: 'Send samples to 10 clients.', icon: '📦', expReward: 500, unlockedAt: null },
  { id: 'persistent', title: 'Persistent', description: 'Follow up 5 times with a single client.', icon: '🔥', expReward: 300, unlockedAt: null },
  { id: 'social_butterfly', title: 'Social Butterfly', description: 'Add 3 different contact methods for a client.', icon: '🦋', expReward: 200, unlockedAt: null },
  { id: 'data_driven', title: 'Data Driven', description: 'Categorize clients with 5 tags.', icon: '📊', expReward: 250, unlockedAt: null },
  { id: 'unstoppable', title: 'Unstoppable', description: 'Achieve a 10-day streak.', icon: '⚡', expReward: 1000, unlockedAt: null }
];

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

  userExp: 0,
  userLevel: 1,
  userTitle: "Junior SOHO",
  currentStreak: 0,
  expLogs: [],
  addExp: (amount, reason) => set((state) => {
    let newExp = state.userExp + amount;
    let newLevel = state.userLevel;
    let newTitle = state.userTitle;
    
    while (newExp >= 500) {
      newLevel += 1;
      newExp -= 500;
    }
    
    while (newExp < 0 && newLevel > 1) {
      newLevel -= 1;
      newExp += 500;
    }
    
    if (newExp < 0 && newLevel === 1) {
      newExp = 0;
    }
    
    if (newLevel >= 20) newTitle = "Veteran";
    else if (newLevel >= 10) newTitle = "Trade Master";
    else if (newLevel >= 5) newTitle = "Elite Hunter";
    else newTitle = "Junior SOHO";
    
    const newLog: ExpLog = {
      id: `exp_${Date.now()}`,
      amount,
      reason: reason || 'Task Completed',
      date: new Date().toISOString()
    };
    
    return { userExp: newExp, userLevel: newLevel, userTitle: newTitle, expLogs: [newLog, ...state.expLogs] };
  }),

  clients: INITIAL_CLIENTS,
  deals: [],

  fetchDeals: () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/deals', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(deals => set({ deals }))
        .catch(console.error);
    }
  },

  addDeal: (deal) => {
    const id = `d${Date.now()}`;
    const newDeal: Deal = {
      ...deal,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    set((state) => ({ deals: [...state.deals, newDeal] }));

    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newDeal)
      }).then(res => {
        if (!res.ok) {
          set((state) => ({ deals: state.deals.filter(d => d.id !== id) }));
        }
      }).catch(console.error);
    }
  },

  updateDeal: (id, updates) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      }).catch(console.error);
    }
    return { deals: state.deals.map(d => d.id === id ? { ...d, ...updates } : d) };
  }),

  deleteDeal: (id) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/deals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }
    return { deals: state.deals.filter(d => d.id !== id) };
  }),

  addClient: async (client) => {
    const id = `c${Date.now()}`;
    const newClient = { ...client, id };
    
    set((state) => ({
      clients: [...state.clients, newClient]
    }));

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newClient)
        });
        const data = await res.json();
        if (res.status === 409 && data.skipped) {
          console.warn('Duplicate contact method found. Lead not added.');
          // rollback
          set((state) => ({
            clients: state.clients.filter(c => c.id !== id)
          }));
          return data.existingId || null;
        } else if (!res.ok) {
          console.error('Failed to add client:', data.error);
          set((state) => ({
            clients: state.clients.filter(c => c.id !== id)
          }));
          return null;
        } else if (res.ok && data.pointsAdded) {
          console.log(`Lead added successfully! You earned ${data.pointsAdded} points.`);
          useAuthStore.getState().fetchProfile();
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    return id;
  },
  editClient: (id, updates) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      }).then(res => res.json()).then(data => {
        if (data.pointsAdded) {
          alert(`Enriched client! You earned ${data.pointsAdded} points.`);
          useAuthStore.getState().fetchProfile();
        }
      }).catch(console.error);
    }
    return { clients: state.clients.map(c => c.id === id ? { ...c, ...updates } : c) };
  }),
  submitClientEditRequest: (id, requestedData) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/clients/${id}/edit-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(requestedData)
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          alert(`Edit request submitted! You earned ${data.pointsAdded || 0} points.`);
          useAuthStore.getState().fetchProfile();
          // We need to fetch the updated state, but we can optimistically set the pendingEditRequest flag
        }
      }).catch(console.error);
    }
    return { clients: state.clients.map(c => c.id === id ? { ...c, pendingEditRequest: true } : c) };
  }),
  deleteClient: (id) => set((state) => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()).then(data => {
        if (!data.permanent && data.softDeleted) {
          alert('Client successfully discarded to public pool.');
        } else if (data.permanent) {
          alert('Client deleted permanently.');
        }
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
  
  publicClients: [],
  fetchPublicClients: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await fetch('/api/public-leads', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const publicClients = await res.json();
          set({ publicClients });
        }
      } catch(e) {
        console.error(e);
      }
    }
  },
  claimClient: async (id) => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await fetch(`/api/public-leads/${id}/claim`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          // Re-fetch both lists
          get().fetchPublicClients();
          
          fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(clients => set({ clients }))
            .catch(console.error);
        }
      } catch(e) {
        console.error(e);
      }
    }
  },
  importPublicLeads: async (leads) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/public-leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ leads })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pointsAdded > 0) {
          console.log(`Import successful. Added ${data.count} leads. You earned ${data.pointsAdded} points!`);
          useAuthStore.getState().fetchProfile();
        } else {
          console.log(`Import successful. ${data.count} leads added. (Duplicates skipped)`);
        }
        get().fetchPublicClients();
      } else {
        console.error("Import failed. Check permissions.");
      }
    } catch(e) {
      console.error(e);
      alert("Error importing public leads");
    }
  },
  
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
    const quest = state.dailyQuests.find(q => q.id === id);
    if (quest) {
      const penalty = Math.floor(quest.expReward * 0.1 * days);
      setTimeout(() => state.addExp(-penalty, `Skipped quest: ${quest.title} (-${10 * days}% EXP)`), 0);
    }
    return {
      dailyQuests: state.dailyQuests.map(q => q.id === id ? { ...q, skippedUntil: skipUntil } : q)
    };
  }),

  achievements: INITIAL_ACHIEVEMENTS,
  checkAchievements: () => set((state) => {
    const { clients, userLevel, emails, logs, dailyQuests, achievements, addExp, addBroadcast } = state;
    
    let changed = false;
    const newAchievements = [...achievements];
    
    const unlock = (id: string) => {
      const index = newAchievements.findIndex(a => a.id === id);
      if (index !== -1 && !newAchievements[index].unlockedAt) {
        newAchievements[index] = { ...newAchievements[index], unlockedAt: Date.now() };
        changed = true;
        
        // Give exp immediately and add a broadcast/notification that can be shown globally
        setTimeout(() => {
          addExp(newAchievements[index].expReward, `Achievement Unlocked: ${newAchievements[index].title}`);
          addBroadcast(`🏆 Achievement Unlocked: ${newAchievements[index].title}`);
        }, 0);
      }
    };

    if (clients.length > 0) unlock('first_client');
    if (clients.length >= 10) unlock('networking');
    
    const countries = new Set(clients.map(c => c.country).filter(Boolean));
    if (countries.size >= 3) unlock('global_reach');
    if (countries.size >= 10) unlock('world_domination');
    
    if (clients.some(c => c.status === 'Closed Won')) unlock('close_deal');
    if (clients.filter(c => c.status === 'Closed Won').length >= 5) unlock('deal_maker');
    if (clients.filter(c => c.status === 'Closed Won').length >= 20) unlock('sales_legend');
    if (clients.filter(c => c.status === 'Sample Sent').length >= 10) unlock('sample_sender');
    if (clients.some(c => (c.contactMethods?.length || 0) >= 3)) unlock('social_butterfly');
    if (clients.some(c => c.tags.length >= 5)) unlock('data_driven');
    
    if (userLevel >= 5) unlock('level_5');
    if (userLevel >= 10) unlock('level_10');
    if (userLevel >= 20) unlock('veteran');
    
    if (state.currentStreak >= 10) unlock('unstoppable');
    
    if (emails.length > 0 && emails.filter(e => !e.read && e.type === 'inbox').length === 0) unlock('inbox_zero');
    
    if (logs.length >= 50) unlock('rich_history');
    const logsAfter10pm = logs.some(l => new Date(l.date).getHours() >= 22);
    if (logsAfter10pm) unlock('night_owl');
    
    const emailsBefore8am = emails.some(e => new Date(e.date).getHours() < 8 && e.type === 'sent');
    if (emailsBefore8am) unlock('early_bird');
    
    // Persistent: follow up 5 times with a single client. Just check logs per client.
    const logsPerClient = logs.reduce((acc, l) => {
      acc[l.clientId] = (acc[l.clientId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    if (Object.values(logsPerClient).some(v => v >= 5)) unlock('persistent');
    
    if (dailyQuests.some(q => q.completed)) unlock('quest_master');

    if (changed) {
      return { achievements: newAchievements };
    }
    return state;
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
      const [clientsRes, logsRes, emailsRes, dealsRes] = await Promise.all([
        fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/logs', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/emails', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/deals', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const clients = clientsRes.ok ? await clientsRes.json() : [];
      const logs = logsRes.ok ? await logsRes.json() : [];
      const emails = emailsRes.ok ? await emailsRes.json() : [];
      const deals = dealsRes.ok ? await dealsRes.json() : [];

      set({ clients, logs, emails, deals });
      // After setting initial data, check achievements once
      get().checkAchievements();
    } catch (e) {
      console.error("Failed to fetch initial data", e);
    }
  }
}));

// Setup automatic achievement checking on state changes
useStore.subscribe((state, prevState) => {
  if (
    state.clients !== prevState.clients ||
    state.userLevel !== prevState.userLevel ||
    state.emails !== prevState.emails ||
    state.logs !== prevState.logs ||
    state.dailyQuests !== prevState.dailyQuests
  ) {
    state.checkAchievements();
  }
});
