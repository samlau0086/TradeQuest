import React, { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Circle, Hand, Loader2, MessageSquare, PauseCircle, PlayCircle, RefreshCw, Search, Send, Tag, UserRound } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';

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
    fetchLiveChatSessions,
    fetchLiveChatMessages,
    sendLiveChatOperatorMessage,
    updateLiveChatSession,
    runLiveChatAgent,
    clients,
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

  useEffect(() => {
    fetchLiveChatSessions();
    const interval = window.setInterval(fetchLiveChatSessions, 15000);
    return () => window.clearInterval(interval);
  }, [fetchLiveChatSessions]);

  useEffect(() => {
    if (!selectedId && liveChatSessions[0]) setSelectedId(liveChatSessions[0].id);
  }, [liveChatSessions, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    fetchLiveChatMessages(selectedId);
    const interval = window.setInterval(() => fetchLiveChatMessages(selectedId), 8000);
    return () => window.clearInterval(interval);
  }, [selectedId, fetchLiveChatMessages]);

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
  const linkedClient = selectedSession?.clientId ? clients.find(client => client.id === selectedSession.clientId) : null;

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
    const tags = Array.from(new Set([...(selectedSession.tags || []), tagDraft.trim()]));
    setTagDraft('');
    await updateLiveChatSession(selectedSession.id, { tags });
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
                <div>
                  <div className="flex items-center gap-2">
                    <UserRound className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold">{selectedSession.visitorName || selectedSession.visitorEmail || 'Website Visitor'}</h2>
                    {linkedClient && <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-200">{linkedClient.company || linkedClient.name}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {selectedSession.visitorEmail && <span>{selectedSession.visitorEmail}</span>}
                    {selectedSession.visitorPhone && <span>{selectedSession.visitorPhone}</span>}
                    {selectedSession.pageUrl && <span className="max-w-xl truncate">{selectedSession.pageUrl}</span>}
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
                {(selectedSession.tags || []).map(tag => (
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
              {selectedMessages.filter(message => message.role !== 'system').map(message => {
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
                  placeholder={language === 'zh' ? '输入座席回复。发送后会自动进入人工接管模式。' : 'Write an operator reply. Sending will enable human takeover.'}
                  className="w-full resize-none bg-transparent p-4 text-sm outline-none"
                />
                <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                  <div className="text-xs text-slate-500">
                    {selectedSession.humanTakeover
                      ? (language === 'zh' ? 'AI 已暂停，当前由人工座席处理。' : 'AI is paused while human takeover is active.')
                      : (language === 'zh' ? 'AI 可自动处理；发送人工回复会接管会话。' : 'AI can respond automatically; sending an operator reply takes over.')}
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
    </div>
  );
}
