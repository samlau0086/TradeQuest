import React, { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Circle, Edit2, Hand, Link2, Loader2, MessageSquare, PauseCircle, Plus, RefreshCw, Save, Search, Send, Tag, Unlink, UserPlus, UserRound, X } from 'lucide-react';
import { ContactMethod, useStore } from '../store';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';
import { AddContactToClientModal } from './AddContactToClientModal';

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString();
}

function statusLabel(status: string, language: string) {
  if (language === 'zh') {
    return status === 'closed' ? '已关闭' : status === 'pending' ? '待处理' : '进行中';
  }
  return status === 'closed' ? 'Closed' : status === 'pending' ? 'Pending' : 'Open';
}

export function LiveChat() {
  const {
    liveChatSessions,
    liveChatMessages,
    liveChatSocketStatus,
    connectLiveChatSocket,
    joinLiveChatSocketSession,
    fetchLiveChatSessions,
    fetchLiveChatMessages,
    sendLiveChatOperatorMessage,
    updateLiveChatSession,
    runLiveChatAgent,
    clients,
    addClient,
    editClient,
    addDeal,
    selectClient,
    language,
    notify
  } = useStore();
  const t = useTranslation(language);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [identityEditing, setIdentityEditing] = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identityDraft, setIdentityDraft] = useState({ visitorName: '', visitorEmail: '', visitorPhone: '', pageUrl: '' });
  const [addContactMethod, setAddContactMethod] = useState<ContactMethod | null>(null);

  useEffect(() => {
    connectLiveChatSocket();
  }, [connectLiveChatSocket]);

  useEffect(() => {
    fetchLiveChatSessions();
    const interval = window.setInterval(fetchLiveChatSessions, liveChatSocketStatus === 'connected' ? 60000 : 15000);
    return () => window.clearInterval(interval);
  }, [fetchLiveChatSessions, liveChatSocketStatus]);

  useEffect(() => {
    if (!selectedId && liveChatSessions[0]) setSelectedId(liveChatSessions[0].id);
  }, [liveChatSessions, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    joinLiveChatSocketSession(selectedId);
    fetchLiveChatMessages(selectedId);
    const interval = window.setInterval(() => fetchLiveChatMessages(selectedId), liveChatSocketStatus === 'connected' ? 45000 : 8000);
    return () => window.clearInterval(interval);
  }, [selectedId, fetchLiveChatMessages, joinLiveChatSocketSession, liveChatSocketStatus]);

  const filteredSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return liveChatSessions;
    return liveChatSessions.filter(session => [
      session.visitorName,
      session.visitorEmail,
      session.visitorPhone,
      session.pageUrl,
      session.lastMessage?.body,
      ...(session.tags || [])
    ].filter(Boolean).join(' ').toLowerCase().includes(normalized));
  }, [liveChatSessions, query]);

  const selectedSession = liveChatSessions.find(session => session.id === selectedId) || null;
  const selectedMessages = selectedId ? (liveChatMessages[selectedId] || []) : [];
  const visibleMessages = selectedMessages.filter(message => message.role !== 'system').slice(-200);
  const linkedClient = selectedSession?.clientId ? clients.find(client => client.id === selectedSession.clientId) : null;
  const displayedTags = linkedClient ? (linkedClient.tags || []) : (selectedSession?.tags || []);
  const primaryContactMethod: ContactMethod | null = selectedSession?.visitorEmail
    ? { type: 'email', value: selectedSession.visitorEmail }
    : selectedSession?.visitorPhone
      ? { type: 'phone', value: selectedSession.visitorPhone }
      : null;

  useEffect(() => {
    if (!selectedSession) return;
    setIdentityDraft({
      visitorName: selectedSession.visitorName || '',
      visitorEmail: selectedSession.visitorEmail || '',
      visitorPhone: selectedSession.visitorPhone || '',
      pageUrl: selectedSession.pageUrl || ''
    });
    setIdentityEditing(false);
  }, [selectedSession?.id]);

  const handleSend = async () => {
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    try {
      await sendLiveChatOperatorMessage(selectedId, reply.trim());
      setReply('');
      fetchLiveChatSessions();
    } catch (error: any) {
      notify(error?.message || t('Failed to send message'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAgentReply = async () => {
    if (!selectedId) return;
    setAgentBusy(true);
    try {
      await runLiveChatAgent(selectedId);
      fetchLiveChatSessions();
    } catch (error: any) {
      notify(error?.message || t('Failed to run Live Chat Agent'), 'error');
    } finally {
      setAgentBusy(false);
    }
  };

  const handleAddTag = async () => {
    if (!selectedSession || !tagDraft.trim()) return;
    const tags = Array.from(new Set([...(displayedTags || []), tagDraft.trim()]));
    setTagDraft('');
    if (linkedClient) {
      editClient(linkedClient.id, { tags });
      notify(language === 'zh' ? '客户标签已更新。' : 'Client tags updated.', 'success');
    } else {
      await updateLiveChatSession(selectedSession.id, { tags });
    }
  };

  const handleSaveIdentity = async () => {
    if (!selectedSession) return;
    setIdentitySaving(true);
    try {
      await updateLiveChatSession(selectedSession.id, {
        visitorName: identityDraft.visitorName.trim(),
        visitorEmail: identityDraft.visitorEmail.trim(),
        visitorPhone: identityDraft.visitorPhone.trim(),
        pageUrl: identityDraft.pageUrl.trim()
      });
      setIdentityEditing(false);
      notify(language === 'zh' ? '访客联系方式已更新。' : 'Visitor contact details updated.', 'success');
    } catch (error: any) {
      notify(error?.message || (language === 'zh' ? '更新访客信息失败。' : 'Failed to update visitor details.'), 'error');
    } finally {
      setIdentitySaving(false);
    }
  };

  const createClientFromSession = async () => {
    if (!selectedSession) return null;
    const contactMethods: ContactMethod[] = [
      selectedSession.visitorEmail ? { type: 'email', value: selectedSession.visitorEmail } as ContactMethod : null,
      selectedSession.visitorPhone ? { type: 'phone', value: selectedSession.visitorPhone } as ContactMethod : null,
      selectedSession.pageUrl ? { type: 'website', value: selectedSession.pageUrl } as ContactMethod : null
    ].filter(Boolean) as ContactMethod[];
    const name = selectedSession.visitorName || selectedSession.visitorEmail || selectedSession.visitorPhone || 'Website Visitor';
    const now = new Date().toISOString();
    const contactId = `contact_${Date.now()}`;
    const clientId = await addClient({
      name,
      company: '',
      country: '',
      status: 'Leads',
      tags: Array.from(new Set([...(selectedSession.tags || []), 'live-chat'])),
      lastContact: now,
      contactMethods,
      contacts: [{
        id: contactId,
        name,
        isPrimary: true,
        contactMethods
      }],
      primaryContactId: contactId,
      comments: []
    });
    if (clientId) {
      await updateLiveChatSession(selectedSession.id, { clientId });
      selectClient(clientId);
      notify(language === 'zh' ? '已创建客户并关联 Live Chat。' : 'Client created and linked to Live Chat.', 'success');
    }
    return clientId;
  };

  const handleCreateLead = async () => {
    if (!selectedSession) return;
    let clientId = selectedSession.clientId || linkedClient?.id || null;
    if (!clientId) clientId = await createClientFromSession();
    if (!clientId) return;
    const leadName = selectedSession.visitorName || selectedSession.visitorEmail || selectedSession.visitorPhone || 'Live Chat Lead';
    addDeal({
      clientId,
      name: leadName,
      value: 0,
      status: 'Leads',
      comments: [],
      contactInfo: {
        name: leadName,
        company: linkedClient?.company || '',
        country: linkedClient?.country || '',
        tags: ['live-chat'],
        contactMethods: [
          selectedSession.visitorEmail ? { type: 'email', value: selectedSession.visitorEmail } as ContactMethod : null,
          selectedSession.visitorPhone ? { type: 'phone', value: selectedSession.visitorPhone } as ContactMethod : null
        ].filter(Boolean) as ContactMethod[]
      }
    });
    selectClient(clientId);
    notify(language === 'zh' ? '已创建 Lead。' : 'Lead created.', 'success');
  };

  return (
    <div className="flex-1 min-h-0 bg-slate-950 text-slate-100 border-t border-slate-800 flex">
      <aside className="w-[360px] min-w-[300px] border-r border-slate-800 bg-slate-900/80 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                {language === 'zh' ? 'Live Chat 座席' : 'Live Chat Desk'}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {language === 'zh' ? '接收网站访客消息，支持 AI 回复与人工接管。' : 'Handle website visitor chats with AI assist and human takeover.'}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-400">
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  liveChatSocketStatus === 'connected' ? 'bg-emerald-400' : liveChatSocketStatus === 'connecting' ? 'bg-amber-400' : 'bg-slate-500'
                )} />
                {liveChatSocketStatus === 'connected'
                  ? (language === 'zh' ? '实时连接' : 'Realtime')
                  : liveChatSocketStatus === 'connecting'
                    ? (language === 'zh' ? '连接中' : 'Connecting')
                    : (language === 'zh' ? 'REST 备用模式' : 'REST fallback')}
              </div>
            </div>
            <button
              onClick={fetchLiveChatSessions}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
              title={t('Refresh')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={language === 'zh' ? '搜索访客、邮箱、页面或标签...' : 'Search visitor, email, page, or tags...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{language === 'zh' ? '暂无 Live Chat 会话。' : 'No live chat sessions yet.'}</div>
          ) : filteredSessions.map(session => (
            <button
              key={session.id}
              onClick={() => setSelectedId(session.id)}
              className={cn(
                'w-full text-left p-4 border-b border-slate-800 hover:bg-slate-800/60 transition-colors',
                selectedId === session.id && 'bg-cyan-950/30 border-l-4 border-l-cyan-400'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-100 truncate">{session.visitorName || session.visitorEmail || session.visitorPhone || 'Website Visitor'}</div>
                  <div className="mt-1 text-xs text-slate-500 truncate">{session.pageUrl || session.visitorEmail || session.id}</div>
                </div>
                <span className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                  session.status === 'closed' ? 'border-slate-700 text-slate-400' : session.priority === 'high' ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' : 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                )}>
                  {statusLabel(session.status, language)}
                </span>
              </div>
              <div className="mt-3 text-sm text-slate-300 line-clamp-2">{session.lastMessage?.body || (language === 'zh' ? '会话已创建' : 'Session created')}</div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  {session.humanTakeover ? <Hand className="w-3 h-3 text-blue-300" /> : <Bot className="w-3 h-3 text-cyan-300" />}
                  {session.humanTakeover ? (language === 'zh' ? '人工接管' : 'Human') : (language === 'zh' ? 'AI 接待' : 'AI')}
                </span>
                <span>{formatTime(session.lastMessageAt || session.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            {language === 'zh' ? '选择一个 Live Chat 会话开始处理。' : 'Select a live chat session to begin.'}
          </div>
        ) : (
          <>
            <header className="p-5 border-b border-slate-800 bg-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <UserRound className="w-5 h-5 text-cyan-400" />
                    {linkedClient ? (
                      <button
                        onClick={() => selectClient(linkedClient.id)}
                        className="text-lg font-bold text-cyan-200 hover:text-cyan-100 hover:underline"
                      >
                        {linkedClient.name || selectedSession.visitorName || selectedSession.visitorEmail || 'Website Visitor'}
                      </button>
                    ) : (
                      <h2 className="text-lg font-bold">{selectedSession.visitorName || selectedSession.visitorEmail || 'Website Visitor'}</h2>
                    )}
                    {linkedClient && (
                      <button
                        onClick={() => selectClient(linkedClient.id)}
                        className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-200 hover:bg-blue-500/20"
                      >
                        {linkedClient.company || linkedClient.name}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {identityEditing ? (
                      <>
                        <input value={identityDraft.visitorName} onChange={event => setIdentityDraft(prev => ({ ...prev, visitorName: event.target.value }))} placeholder={language === 'zh' ? '访客姓名' : 'Visitor name'} className="w-36 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 outline-none focus:border-cyan-500" />
                        <input value={identityDraft.visitorEmail} onChange={event => setIdentityDraft(prev => ({ ...prev, visitorEmail: event.target.value }))} placeholder="Email" className="w-48 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 outline-none focus:border-cyan-500" />
                        <input value={identityDraft.visitorPhone} onChange={event => setIdentityDraft(prev => ({ ...prev, visitorPhone: event.target.value }))} placeholder={language === 'zh' ? '手机号/电话' : 'Phone'} className="w-36 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 outline-none focus:border-cyan-500" />
                        <input value={identityDraft.pageUrl} onChange={event => setIdentityDraft(prev => ({ ...prev, pageUrl: event.target.value }))} placeholder="Page URL" className="w-64 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 outline-none focus:border-cyan-500" />
                        <button onClick={handleSaveIdentity} disabled={identitySaving} className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50">
                          {identitySaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          {language === 'zh' ? '保存' : 'Save'}
                        </button>
                        <button onClick={() => setIdentityEditing(false)} className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-slate-400 hover:text-white">
                          <X className="w-3 h-3" />
                          {language === 'zh' ? '取消' : 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <>
                        {selectedSession.visitorEmail && <span>{selectedSession.visitorEmail}</span>}
                        {selectedSession.visitorPhone && <span>{selectedSession.visitorPhone}</span>}
                        {selectedSession.pageUrl && <span className="max-w-xl truncate">{selectedSession.pageUrl}</span>}
                        <button onClick={() => setIdentityEditing(true)} className="inline-flex items-center gap-1 rounded bg-slate-800/70 px-2 py-0.5 text-slate-300 hover:bg-slate-700 hover:text-white">
                          <Edit2 className="w-3 h-3" />
                          {language === 'zh' ? '修改联系方式' : 'Edit contact'}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {linkedClient ? (
                      <>
                        <button onClick={() => selectClient(linkedClient.id)} className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20">
                          <Link2 className="w-3 h-3" />
                          {language === 'zh' ? '查看客户' : 'Open client'}
                        </button>
                        <button onClick={() => updateLiveChatSession(selectedSession.id, { clientId: null })} className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/20">
                          <Unlink className="w-3 h-3" />
                          {language === 'zh' ? '取消关联' : 'Unlink'}
                        </button>
                        <button onClick={handleCreateLead} className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20">
                          <Plus className="w-3 h-3" />
                          {language === 'zh' ? '创建 Lead' : 'Create Lead'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={createClientFromSession} className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20">
                          <UserPlus className="w-3 h-3" />
                          {language === 'zh' ? '创建客户' : 'New Client'}
                        </button>
                        {primaryContactMethod && (
                          <button onClick={() => setAddContactMethod(primaryContactMethod)} className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-200 hover:bg-blue-500/20">
                            <Link2 className="w-3 h-3" />
                            {language === 'zh' ? '添加到已有客户' : 'Add to Existing Client'}
                          </button>
                        )}
                        <button onClick={handleCreateLead} className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20">
                          <Plus className="w-3 h-3" />
                          {language === 'zh' ? '创建客户+Lead' : 'New Client + Lead'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => updateLiveChatSession(selectedSession.id, { humanTakeover: !selectedSession.humanTakeover })}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold',
                      selectedSession.humanTakeover ? 'border-blue-500/40 bg-blue-500/10 text-blue-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                    )}
                  >
                    {selectedSession.humanTakeover ? <PauseCircle className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
                    {selectedSession.humanTakeover ? (language === 'zh' ? '人工接管中' : 'Human takeover') : (language === 'zh' ? '接管' : 'Take over')}
                  </button>
                  <button
                    onClick={handleAgentReply}
                    disabled={agentBusy}
                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
                  >
                    {agentBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    {language === 'zh' ? '运行 Agent' : 'Run Agent'}
                  </button>
                  <button
                    onClick={() => updateLiveChatSession(selectedSession.id, { status: selectedSession.status === 'closed' ? 'open' : 'closed' })}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300 hover:text-white"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedSession.status === 'closed' ? (language === 'zh' ? '重新打开' : 'Reopen') : (language === 'zh' ? '关闭' : 'Close')}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {displayedTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
                    <Tag className="w-3 h-3" /> {tag}
                  </span>
                ))}
                <input
                  value={tagDraft}
                  onChange={event => setTagDraft(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') handleAddTag(); }}
                  placeholder={language === 'zh' ? '添加标签...' : 'Add tag...'}
                  className="min-w-[180px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-cyan-500"
                />
                <button onClick={handleAddTag} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white">
                  {language === 'zh' ? '添加' : 'Add'}
                </button>
              </div>
            </header>

            <section className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950">
              {visibleMessages.map(message => {
                const outbound = message.role === 'agent' || message.role === 'operator';
                return (
                  <div key={message.id} className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[72%] rounded-2xl px-4 py-3 border text-sm leading-relaxed',
                      outbound ? 'bg-cyan-600 text-white border-cyan-500/50' : 'bg-slate-900 text-slate-100 border-slate-800'
                    )}>
                      <div className={cn('mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide', outbound ? 'text-cyan-100' : 'text-slate-500')}>
                        {message.role === 'agent' ? <Bot className="w-3 h-3" /> : message.role === 'operator' ? <Hand className="w-3 h-3" /> : <Circle className="w-2.5 h-2.5" />}
                        {message.senderName || message.role}
                      </div>
                      <div className="whitespace-pre-wrap">{message.body}</div>
                      <div className={cn('mt-2 text-[11px]', outbound ? 'text-cyan-100/80' : 'text-slate-500')}>{formatTime(message.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </section>

            <footer className="p-5 border-t border-slate-800 bg-slate-900">
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                <textarea
                  value={reply}
                  onChange={event => setReply(event.target.value)}
                  rows={4}
                  placeholder={language === 'zh' ? '输入座席回复。点击接管才会暂停 AI。' : 'Write an operator reply. Use Take over to pause AI.'}
                  className="w-full resize-none bg-transparent p-4 text-sm outline-none"
                />
                <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                  <div className="text-xs text-slate-500">
                    {selectedSession.humanTakeover
                      ? (language === 'zh' ? 'AI 已暂停，当前由人工座席处理。' : 'AI is paused while human takeover is active.')
                      : (language === 'zh' ? 'AI 会自动回复访客消息；点击接管才会暂停 AI。' : 'AI replies automatically; use Take over to pause AI.')}
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={busy || !reply.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {language === 'zh' ? '发送回复' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}
      </main>
      {addContactMethod && selectedSession && (
        <AddContactToClientModal
          contactMethod={addContactMethod}
          displayName={selectedSession.visitorName || selectedSession.visitorEmail || selectedSession.visitorPhone || 'Website Visitor'}
          onClose={() => setAddContactMethod(null)}
          onLinked={async (clientId) => {
            await updateLiveChatSession(selectedSession.id, { clientId });
            setAddContactMethod(null);
          }}
        />
      )}
    </div>
  );
}
