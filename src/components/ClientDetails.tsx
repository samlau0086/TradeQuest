import React, { useEffect, useRef, useState } from 'react';
import { useStore, ContactMethod, Comment } from '../store';
import { useAuthStore } from '../authStore';
import { cn } from '../lib/utils';
import { ClientFormModal } from './ClientFormModal';

import { User } from 'lucide-react';

import { ClientAgentSettingsModal } from './ClientAgentSettingsModal';
import { ClientAiRadarCard } from './ClientAiRadarCard';
import { ClientContactActionBox } from './ClientContactActionBox';
import { ClientContactsWidget } from './ClientContactsWidget';
import { ClientDeleteConfirmDialog } from './ClientDeleteConfirmDialog';
import { ClientDetailsHeader } from './ClientDetailsHeader';
import { ClientConversationNotesWidget } from './ClientConversationNotesWidget';
import { ClientEmailComposeOverlay } from './ClientEmailComposeOverlay';
import { ClientEventPanel } from './ClientEventPanel';
import { ClientFollowUpAgentWidget } from './ClientFollowUpAgentWidget';
import { ClientProfileSidebarWidgets } from './ClientProfileSidebarWidgets';
import { ClientQuotesWidget } from './ClientQuotesWidget';
import { ClientTeamCommentsPanel } from './ClientTeamCommentsPanel';
import { ClientWorkroomPanel } from './ClientWorkroomPanel';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';
import { buildLeadScoringSignature } from '../lib/leadScoring';

const INBOX_OPEN_REQUEST_KEY = 'tradequest:inbox-open-request:v1';

const requestInboxOpen = (payload: any) => {
  localStorage.setItem(INBOX_OPEN_REQUEST_KEY, JSON.stringify({ ...payload, requestedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('tradequest:open-inbox-request'));
};

const shortText = (value: string | undefined | null, max = 120) => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const hasCjkText = (value: string | undefined | null) => /[\u3400-\u9fff]/.test(value || '');

const internalTextMatchesSystemLanguage = (value: string | undefined | null, language: string) => {
  const text = String(value || '').trim();
  if (!text) return true;
  return language === 'zh' ? hasCjkText(text) : !hasCjkText(text);
};

export function ClientDetails() {
  const { clients, deals, quotes, selectedClientId, selectedDealId, selectClient, selectDeal, updateClientStatus, updateDeal, deleteClient, editClient, addComment, addReply, deleteLog, llmConfigs, activeLLMId, llmMappings, setView, selectEmail, logs, emails, incrementAgentHubTaskCount, notify, language, currencyRates, knowledgeBase, agentTasks, liveChatSessions } = useStore();
  
  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(c => c.id === id) || llmConfigs[0];
  };

  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<{
    sentiment: string;
    temperature: number;
    icebreaker: string;
    summary: string;
    leadScore?: number;
    leadSummary?: string;
    leadNextStep?: string;
    nextStep?: string;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [expandedContactIdx, setExpandedContactIdx] = useState<string | null>(null);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeInitialBody, setComposeInitialBody] = useState('');

  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reconciledPendingCommentDeletesRef = useRef<Set<string>>(new Set());

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(false);
  const [eventView, setEventView] = useState<'timeline' | 'list' | 'growth'>('timeline');
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [eventListExpanded, setEventListExpanded] = useState(false);
  const [growthLogsExpanded, setGrowthLogsExpanded] = useState(false);

  // Agent State
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);

  const client = clients.find(c => c.id === selectedClientId);
  const selectedDeal = selectedDealId
    ? deals.find(deal => deal.id === selectedDealId && (!selectedClientId || deal.clientId === selectedClientId))
    : undefined;
  const leadRecord = selectedDeal || null;
  const leadComments = leadRecord ? (leadRecord.comments || []) : (client?.comments || []);
  const leadLogs = logs.filter(log => {
    if (!client || log.clientId !== client.id) return false;
    if (!leadRecord) return true;
    return log.metadata?.leadId === leadRecord.id || log.metadata?.dealId === leadRecord.id;
  });
  const sortedLeadLogs = [...leadLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const growthLogs = leadLogs.filter(l => {
    if (l.content.startsWith('Saved Draft:')) return false;
    if (l.relatedEmailId) {
      const relatedEmail = emails.find(e => e.id === l.relatedEmailId);
      if (relatedEmail && relatedEmail.type === 'draft') return false;
    }
    return true;
  });
  const visibleTimelineLogs = timelineExpanded ? sortedLeadLogs : sortedLeadLogs.slice(0, 10);
  const visibleEventListLogs = eventListExpanded ? sortedLeadLogs : sortedLeadLogs.slice(0, 20);
  const visibleGrowthLogs = growthLogsExpanded ? growthLogs : growthLogs.slice(0, 10);
  const leadScore = leadRecord ? leadRecord.leadScore : client?.leadScore;
  const relatedQuotes = client
    ? quotes.filter(quote => leadRecord ? quote.leadId === leadRecord.id : quote.clientId === client.id)
    : [];
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
  const summaryText = leadRecord
    ? leadRecord.leadSummary
    : (client?.agentSummary || client?.leadSummary);
  const nextStepText = leadRecord
    ? leadRecord.leadNextStep
    : (client?.agentNextStep || client?.leadNextStep);

  useEffect(() => {
    if (!client) return;
    const pendingIds = collectPendingDeleteCommentIds(leadComments);
    pendingIds.forEach(commentId => {
      const key = `${leadRecord ? 'lead' : 'client'}:${leadRecord?.id || client.id}:${commentId}`;
      if (reconciledPendingCommentDeletesRef.current.has(key)) return;
      reconciledPendingCommentDeletesRef.current.add(key);
      submitCommentDeleteApprovalRequest(commentId).catch(error => {
        console.warn('Failed to reconcile pending comment delete request', error);
      });
    });
  }, [client?.id, leadRecord?.id, leadComments]);

  if (!client) return null;
  const displayContacts = (client.contacts && client.contacts.length > 0)
    ? client.contacts
    : [{
        id: client.primaryContactId || 'primary',
        name: client.name,
        title: 'Key Contact',
        avatarUrl: undefined,
        isPrimary: true,
        contactMethods: client.contactMethods || []
      }];
  const clientSummaryText = client.agentSummary || client.leadSummary || client.agentContext || '';
  const clientNextStepText = client.agentNextStep || client.leadNextStep || '';
  const leadSummaryText = leadRecord?.leadSummary || '';
  const leadNextStepText = leadRecord?.leadNextStep || '';
  const relatedEmails = emails
    .filter(email => email.clientId === client.id && !email.pendingDelete)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const pendingFollowUps = relatedEmails
    .filter(email => email.todoAt)
    .sort((a, b) => new Date(a.todoAt || a.date).getTime() - new Date(b.todoAt || b.date).getTime());
  const relatedAgentTasks = agentTasks
    .filter(task => {
      if (!['open', 'queued', 'approval_required', 'running'].includes(task.status)) return false;
      if (task.entityType === 'client' && task.entityId === client.id) return true;
      if (leadRecord && task.entityType === 'lead' && task.entityId === leadRecord.id) return true;
      return task.affectedRecords?.some(record => (
        (record.type === 'client' && record.id === client.id) ||
        (leadRecord && record.type === 'lead' && record.id === leadRecord.id)
      ));
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  const clientKnowledge = knowledgeBase
    .filter(item => item.clientId === client.id && item.importState !== 'deleted')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  const clientLiveChatSessions = liveChatSessions
    .filter(session => session.clientId === client.id)
    .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime());
  const channelHighlights = [
    ...relatedEmails.slice(0, 6).map(email => ({
      id: `email_${email.id}`,
      channel: email.type === 'sent' || email.type === 'outbound' ? 'Email sent' : email.type === 'draft' ? 'Email draft' : 'Email inbox',
      title: email.subject || '(No subject)',
      body: shortText(email.body, 110),
      date: email.date,
      action: () => openEmailInInbox(email.id)
    })),
    ...sortedLeadLogs.slice(0, 6).map(log => ({
      id: `log_${log.id}`,
      channel: log.type === 'whatsapp' ? 'WhatsApp' : log.type === 'email' ? 'Email activity' : 'CRM event',
      title: log.content,
      body: '',
      date: log.date,
      action: log.relatedEmailId ? () => openEmailInInbox(log.relatedEmailId) : undefined
    })),
    ...clientLiveChatSessions.slice(0, 4).map(session => ({
      id: `live_${session.id}`,
      channel: 'Live Chat',
      title: session.lastMessage?.body || session.visitorName || session.visitorEmail || 'Live chat session',
      body: session.pageUrl || '',
      date: session.lastMessageAt || session.updatedAt || session.createdAt,
      action: () => setView('live-chat')
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  const primaryNextStep = leadNextStepText || clientNextStepText || '检查最近互动、确认采购背景，然后选择下一步跟进动作。';
  const primarySummary = leadSummaryText || clientSummaryText || '暂未生成AI摘要，可运行AI Radar或等待Signal Scanner分析此客户/Lead。';
  const contactMethodCount = displayContacts.reduce((sum, contact) => sum + (contact.contactMethods || []).length, 0);
  const workroomTodoItems = [
    ...pendingFollowUps.slice(0, 3).map(email => ({
      id: `todo_${email.id}`,
      label: email.todoNote || email.subject || '待跟进邮件',
      meta: email.todoAt ? new Date(email.todoAt).toLocaleString() : '未设置时间',
      onClick: () => openEmailInInbox(email.id)
    })),
    ...relatedAgentTasks.slice(0, 3).map(task => ({
      id: `task_${task.id}`,
      label: task.title,
      meta: `${task.status} · ${task.risk}`,
      onClick: () => setView('agent-hub')
    }))
  ].slice(0, 4);
  const buildCurrentAnalysisSignature = () => `${buildLeadScoringSignature(client, leadRecord ? leadLogs : logs, emails, {
    lead: leadRecord || deals
      .filter(deal => deal.clientId === client.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null,
    workflows: useStore.getState().agentWorkflows,
    now: new Date()
  })}:lang:${language}`;
  const existingAnalysisResult = () => {
    const score = leadRecord ? leadRecord.leadScore : client.leadScore;
    const summary = leadRecord ? leadRecord.leadSummary : (client.agentSummary || client.leadSummary);
    const nextStep = leadRecord ? leadRecord.leadNextStep : (client.agentNextStep || client.leadNextStep);
    const icebreaker = leadRecord ? leadRecord.leadIcebreaker : client.leadIcebreaker;
    if (score === undefined || !summary || !nextStep) return null;
    if (!internalTextMatchesSystemLanguage(summary, language) || !internalTextMatchesSystemLanguage(nextStep, language)) return null;
    return {
      sentiment: Number(score) >= 70 ? 'HOT' : Number(score) >= 35 ? 'WARM' : 'COLD',
      temperature: Number(score) || 0,
      icebreaker: icebreaker || '',
      summary,
      leadScore: Number(score) || 0,
      leadSummary: summary,
      leadNextStep: nextStep
    };
  };

  const findPreferredContactValue = (types: ContactMethod['type'][]) => {
    const methods = [
      ...(client.contactMethods || []),
      ...displayContacts.flatMap(contact => contact.contactMethods || [])
    ];
    return methods.find(method => types.includes(method.type) && method.value)?.value || '';
  };

  const handleInsertIcebreaker = async () => {
    const icebreaker = String((aiData || existingAnalysisResult())?.icebreaker || '').trim();
    if (!icebreaker) {
      notify(language === 'zh' ? '暂无可插入的破冰话术。' : 'No icebreaker is available to insert.', 'warning');
      return;
    }
    const email = findPreferredContactValue(['email']);
    if (email) {
      setComposeRecipient(email);
      setComposeInitialBody(icebreaker);
      setShowEmailCompose(true);
      notify(language === 'zh' ? '已插入到邮件草稿。' : 'Inserted into an email draft.', 'success');
      return;
    }
    await navigator.clipboard.writeText(icebreaker).catch(() => undefined);
    notify(
      findPreferredContactValue(['whatsapp', 'phone'])
        ? (language === 'zh' ? '客户没有邮箱，已复制话术，可粘贴到 WhatsApp。' : 'No email found. Copied the icebreaker for WhatsApp.')
        : (language === 'zh' ? '未找到可用联系方式，已复制话术。' : 'No usable contact found. Copied the icebreaker.'),
      'info'
    );
  };

  const openEmailComposeInInbox = () => {
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

  const handleRunAgent = async () => {
    if (!client.agentEnabled) return;
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
        // Optimistically update local store or refetch clients
        useAuthStore.getState().fetchProfile(); // Not the best way to refetch clients, but no dedicated fetchClients exists in store. Let's just rely on global update if any, or reload. We should ideally update the local client object in the store.
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

  const handleAnalyze = async (forceRefresh = false) => {
    const signature = buildCurrentAnalysisSignature();
    const existingResult = existingAnalysisResult();
    const previousSignature = leadRecord ? leadRecord.leadScoringSignature : client.leadScoringSignature;
    if (!forceRefresh && existingResult && previousSignature === signature) {
      setAiData(existingResult);
      notify(
        language === 'zh'
          ? '客户/Lead 信息没有变化，已复用上次 AI 分析结果。'
          : 'No client/lead changes detected. Reused the previous AI analysis.',
        'info'
      );
      return;
    }
    setLoading(true);
    const clientLogs = leadLogs
      .slice(0, 20)
      .map(log => ({ date: log.date, type: log.type, content: log.content }));
    const clientEmails = emails
      .filter(email => email.clientId === client.id)
      .slice(0, 10)
      .map(email => ({ date: email.date, type: email.type, subject: email.subject, body: email.body?.slice(0, 800) }));
    try {
      const res = await fetch('/api/chat/icebreaker', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          client, 
          lead: leadRecord,
          logs: clientLogs,
          emails: clientEmails,
          llmConfig: getLLMConfig('analysis'),
          embeddingLlmConfig: getLLMConfig('embedding'),
          systemLanguage: useStore.getState().language === 'zh' ? 'Chinese' : 'English',
        })
      });
      const data = await res.json();
      const score = Number(data.leadScore ?? data.temperature ?? 0);
      const fallbackSummary = [
        leadRecord?.name || client.company || client.name,
        client.country,
        leadRecord?.status || client.status,
        client.tags?.length ? `Tags: ${client.tags.join(', ')}` : ''
      ].filter(Boolean).join(' / ');
      const analyzedLeadSummary = data.leadSummary || data.summary || fallbackSummary || (language === 'zh' ? '线索资料还需要更多互动数据。' : 'Lead profile requires more interaction data.');
      const analyzedLeadNextStep = data.leadNextStep || data.nextStep || (leadRecord ? leadRecord.leadNextStep : client.agentNextStep) || (language === 'zh' ? '检查线索资料并选择下一步跟进动作。' : 'Review the lead profile and choose the next follow-up action.');
      const analyzedIcebreaker = String(data.icebreaker || '').trim();
      const normalizedData = { ...data, leadScore: score, leadSummary: analyzedLeadSummary, leadNextStep: analyzedLeadNextStep, icebreaker: analyzedIcebreaker };
      setAiData(normalizedData);
      if (leadRecord) {
        updateDeal(leadRecord.id, {
          leadScore: score,
          leadSummary: analyzedLeadSummary,
          leadNextStep: analyzedLeadNextStep,
          leadIcebreaker: analyzedIcebreaker,
          leadScoringSignature: signature,
          leadScoringAnalyzedAt: new Date().toISOString()
        });
      } else {
        useStore.getState().editClient(client.id, {
          leadScore: score,
          agentSummary: analyzedLeadSummary,
          agentNextStep: analyzedLeadNextStep,
          leadIcebreaker: analyzedIcebreaker,
          leadScoringSignature: signature,
          leadScoringAnalyzedAt: new Date().toISOString()
        });
      }
      useStore.getState().addLog(
        client.id,
        language === 'zh'
          ? `线索评分智能体已分析线索：评分 ${score}/100。下一步：${analyzedLeadNextStep}`
          : `Lead Scoring Agent analyzed lead: score ${score}/100. Next step: ${analyzedLeadNextStep}`,
        undefined,
        'general',
        { source: 'lead_scoring_agent', score, summary: analyzedLeadSummary, leadId: leadRecord?.id, dealId: leadRecord?.id }
      );
      incrementAgentHubTaskCount('lead_scoring_agent');
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    
    // Determine if attachments exist based on file input files.
    const attachments = fileInputRef.current?.files && fileInputRef.current.files.length > 0 
      ? Array.from(fileInputRef.current.files).map(f => ({
          id: `file${Date.now()}`,
          name: f.name,
          type: (f.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
          url: URL.createObjectURL(f)
        })) 
      : undefined;

    if (leadRecord) {
      const newComment: Comment = {
        id: `cmt${Date.now()}`,
        author: useStore.getState().userTitle,
        content: commentText,
        createdAt: new Date().toISOString(),
        attachments,
        replies: []
      };
      updateDeal(leadRecord.id, { comments: [...(leadRecord.comments || []), newComment] });
    } else {
      addComment(client.id, commentText, attachments);
    }
    setCommentText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLeadReply = (commentId: string, content: string, attachments?: any[]) => {
    if (!leadRecord) {
      addReply(client.id, commentId, content, attachments);
      return;
    }
    const addReplyRecursive = (comments: Comment[]): Comment[] => comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [
            ...(comment.replies || []),
            {
              id: `rep${Date.now()}`,
              author: useStore.getState().userTitle,
              content,
              createdAt: new Date().toISOString(),
              attachments,
              replies: []
            }
          ]
        };
      }
      return comment.replies?.length
        ? { ...comment, replies: addReplyRecursive(comment.replies) }
        : comment;
    });
    updateDeal(leadRecord.id, { comments: addReplyRecursive(leadRecord.comments || []) });
  };

  const markCommentPendingDelete = (comments: Comment[], commentId: string): Comment[] => comments.map(comment => {
    if (comment.id === commentId) {
      return { ...comment, pendingDelete: true, pendingDeleteRequestedAt: new Date().toISOString() };
    }
    return comment.replies?.length
      ? { ...comment, replies: markCommentPendingDelete(comment.replies, commentId) }
      : comment;
  });

  const collectPendingDeleteCommentIds = (comments: Comment[]): string[] => {
    const ids: string[] = [];
    const walk = (items: Comment[]) => {
      items.forEach(comment => {
        if (comment.pendingDelete) ids.push(comment.id);
        if (comment.replies?.length) walk(comment.replies);
      });
    };
    walk(comments);
    return ids;
  };

  const submitCommentDeleteApprovalRequest = async (commentId: string) => {
    const token = useAuthStore.getState().token || localStorage.getItem('token');
    if (!token) throw new Error('Authentication is required.');
    const payload = leadRecord
      ? { action: 'delete_deal_comment', deal_id: leadRecord.id, comment_id: commentId, lead_name: leadRecord.name }
      : { action: 'delete_client_comment', comment_id: commentId };
    const response = await fetch(`/api/clients/${client.id}/edit-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to create approval request.');
    return data;
  };

  const handleRequestCommentDelete = async (commentId: string) => {
    try {
      if (leadRecord) {
        const previousComments = leadRecord.comments || [];
        const nextComments = markCommentPendingDelete(leadRecord.comments || [], commentId);
        updateDeal(leadRecord.id, { comments: nextComments });
        try {
          await submitCommentDeleteApprovalRequest(commentId);
        } catch (error) {
          updateDeal(leadRecord.id, { comments: previousComments });
          throw error;
        }
      } else {
        const previousComments = client.comments || [];
        const nextComments = markCommentPendingDelete(client.comments || [], commentId);
        editClient(client.id, { comments: nextComments });
        try {
          await submitCommentDeleteApprovalRequest(commentId);
        } catch (error) {
          editClient(client.id, { comments: previousComments });
          throw error;
        }
      }
      notify(useStore.getState().language === 'zh' ? '评论删除请求已提交，等待审批。' : 'Comment delete request submitted for approval.', 'success');
    } catch (error) {
      console.error(error);
      notify(useStore.getState().language === 'zh' ? '提交评论删除请求失败。' : 'Failed to request comment deletion.', 'error');
    }
  };

  const visibleAiData = aiData || existingAnalysisResult();

  return (
    <div className="fixed inset-0 z-50 bg-[#05070b] text-slate-100 overflow-hidden pointer-events-auto">
      <ClientDetailsHeader
        client={client}
        leadRecord={leadRecord}
        onClose={closeDetails}
        onEdit={() => setShowEditModal(true)}
        onDelete={() => setConfirmDeleteTarget(true)}
      />

      <div className="h-[calc(100dvh-93px)] overflow-y-auto px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-[1800px] space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.85fr)] gap-6">
            <div className="space-y-6 min-w-0">
              <ClientWorkroomPanel
                quoteCount={relatedQuotes.length}
                contactMethodCount={contactMethodCount}
                ragCount={clientKnowledge.length}
                todoCount={pendingFollowUps.length + relatedAgentTasks.length}
                loading={loading}
                primaryNextStep={primaryNextStep}
                primarySummary={primarySummary}
                clientSummaryText={clientSummaryText}
                clientNextStepText={clientNextStepText}
                leadSummaryText={leadSummaryText}
                leadNextStepText={leadNextStepText}
                hasLeadRecord={!!leadRecord}
                todoItems={workroomTodoItems}
                ragItems={clientKnowledge}
                channelHighlights={channelHighlights.map(({ action, ...item }) => ({ ...item, onClick: action }))}
                onRefreshAiRecommendation={() => handleAnalyze(true)}
                onOpenCommunication={() => openEmailInInbox(relatedEmails[0]?.id)}
                onOpenAgentHub={() => setView('agent-hub')}
                onOpenKnowledgeBase={() => setView('knowledge-base')}
              />

              <ClientEventPanel
                eventView={eventView}
                onEventViewChange={setEventView}
                sortedLogs={sortedLeadLogs}
                visibleTimelineLogs={visibleTimelineLogs}
                visibleEventListLogs={visibleEventListLogs}
                visibleGrowthLogs={visibleGrowthLogs}
                growthLogs={growthLogs}
                isDormant={!!client.isDormant}
                timelineExpanded={timelineExpanded}
                eventListExpanded={eventListExpanded}
                growthLogsExpanded={growthLogsExpanded}
                onToggleTimelineExpanded={() => setTimelineExpanded(prev => !prev)}
                onToggleEventListExpanded={() => setEventListExpanded(prev => !prev)}
                onToggleGrowthLogsExpanded={() => setGrowthLogsExpanded(prev => !prev)}
                onDeleteGrowthLog={deleteLog}
                onOpenEmail={openEmailInInbox}
              />
            </div>

            <div className="space-y-6 min-w-0">
              <ClientProfileSidebarWidgets
                client={client}
                leadRecord={leadRecord}
                summaryText={summaryText}
                onStatusChange={(status) => {
                  if (leadRecord) updateDeal(leadRecord.id, { status });
                  else updateClientStatus(client.id, status);
                }}
              />

              <ClientQuotesWidget
                quotes={relatedQuotes}
                leadRecord={leadRecord}
                currencyRates={currencyRates}
                onOpenQuote={openQuote}
              />

              <ClientAiRadarCard
                visibleAiData={visibleAiData}
                loading={loading}
                leadScore={leadScore}
                summaryText={summaryText}
                nextStepText={nextStepText}
                hasLeadRecord={!!leadRecord}
                onAnalyze={handleAnalyze}
                onInsertIcebreaker={handleInsertIcebreaker}
              />

              {/* Contacts */}
              <ClientContactsWidget
                client={client}
                contacts={displayContacts}
                expandedContactIdx={expandedContactIdx}
                onExpandedContactChange={setExpandedContactIdx}
                renderContactAction={(method, closeContactAction) => (
                  <ClientContactActionBox
                    method={method}
                    client={client}
                    onClose={closeContactAction}
                    onOpenEmailCompose={(email) => {
                      setComposeRecipient(email);
                      setShowEmailCompose(true);
                      closeContactAction();
                    }}
                  />
                )}
              />

              <ClientFollowUpAgentWidget
                enabled={client.agentEnabled}
                mode={client.agentMode}
                summary={client.agentSummary}
                nextStep={client.agentNextStep}
                loading={agentLoading}
                onOpenSettings={() => setAgentSettingsOpen(true)}
                onRunAgent={handleRunAgent}
              />

              <ClientConversationNotesWidget tags={client.tags || []} />

        {/* Client Knowledge Base */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <KnowledgeBaseManager clientId={client.id} />
        </div>
            </div>
          </div>

        <ClientTeamCommentsPanel
          comments={leadComments}
          commentText={commentText}
          fileInputRef={fileInputRef}
          onCommentTextChange={setCommentText}
          onSubmitComment={handleAddComment}
          onReply={handleAddLeadReply}
          onDelete={handleRequestCommentDelete}
        />

      </div>
        </div>
      {showEditModal && <ClientFormModal clientId={client.id} onClose={() => setShowEditModal(false)} />}
      
      {agentSettingsOpen && <ClientAgentSettingsModal client={client} onClose={() => setAgentSettingsOpen(false)} />}

      {confirmDeleteTarget && (
        <ClientDeleteConfirmDialog
          onCancel={() => setConfirmDeleteTarget(false)}
          onConfirm={() => {
            deleteClient(client.id);
            setConfirmDeleteTarget(false);
          }}
        />
      )}

      {/* Gmail-style sticky Compose block in corner */}
      {showEmailCompose && (
        <ClientEmailComposeOverlay
          language={language}
          recipient={composeRecipient}
          subject={leadRecord ? `Follow up: ${leadRecord.name}` : `Follow up from ${client.company || client.name}`}
          initialBody={composeInitialBody}
          onOpenInInbox={openEmailComposeInInbox}
          onClose={() => {
            setShowEmailCompose(false);
            setComposeInitialBody('');
          }}
        />
      )}
    </div>
  );
}
