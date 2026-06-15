import React from 'react';
import { Bot, CheckCircle2, MessageSquare, RefreshCw, Send, Trash2, XCircle } from 'lucide-react';
import { AgentHubAgent, AgentHubChatMessage, Client } from '../../store';
import { cn } from '../../lib/utils';
import { AgentHubPendingItem } from './shared';

interface AgentConsolePanelProps {
  language: string;
  chatAgents: AgentHubAgent[];
  activeChatAgent: AgentHubAgent | null;
  chatRunningAgentId: string | null;
  visibleChatMessages: AgentHubChatMessage[];
  pendingItems: AgentHubPendingItem[];
  clients: Client[];
  chatInput: string;
  chatSending: boolean;
  setChatAgentId: (id: string) => void;
  clearActiveAgentChat: () => void;
  deleteChatMessage: (messageId: string) => void;
  handleChatApproval: (message: AgentHubChatMessage, approved: boolean) => void | Promise<void>;
  buildAgentChatUsage: (agent: AgentHubAgent) => string;
  setChatInput: (value: string) => void;
  sendAgentChat: () => void | Promise<void>;
}

export function AgentConsolePanel({
  language,
  chatAgents,
  activeChatAgent,
  chatRunningAgentId,
  visibleChatMessages,
  pendingItems,
  clients,
  chatInput,
  chatSending,
  setChatAgentId,
  clearActiveAgentChat,
  deleteChatMessage,
  handleChatApproval,
  buildAgentChatUsage,
  setChatInput,
  sendAgentChat
}: AgentConsolePanelProps) {
  const isZh = language === 'zh';

  return (
    <section className="min-h-[calc(100vh-220px)] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
      <div className="grid min-h-[calc(100vh-220px)] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b border-neutral-800 bg-neutral-900/80 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <MessageSquare className="w-4 h-4" /> {isZh ? '智能体控制台' : 'Agent Console'}
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            {isZh
              ? 'Console 用于询问智能体、引用客户上下文、生成任务或进化建议；正式执行仍会进入任务队列、审批中心和执行日志。'
              : 'Console is for asking agents, referencing client context, creating tasks, and proposing evolution. Formal execution still flows through the task queue, approval center, and logs.'}
          </p>
          {activeChatAgent && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-100">
              <Bot className="w-3.5 h-3.5" />
              <span className="max-w-[200px] truncate">{activeChatAgent.name}</span>
            </div>
          )}
          <div className="mt-4 space-y-1">
            {chatAgents.map(agent => {
              const selected = activeChatAgent?.id === agent.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setChatAgentId(agent.id)}
                  className={cn('w-full rounded-md border px-3 py-2.5 text-left transition-colors', selected ? 'border-blue-500/40 bg-blue-500/10' : 'border-transparent hover:border-neutral-800 hover:bg-black/40')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-100">{agent.name}</div>
                      <div className="mt-1 truncate text-[11px] text-slate-500">{agent.status} · {(agent.tools || []).length} tools</div>
                    </div>
                    {chatRunningAgentId === agent.id && <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-300" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-[540px] min-w-0 flex-col bg-black">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-100">{activeChatAgent?.name || 'Global Orchestrator'}</div>
              <div className="mt-1 text-xs text-slate-500">
                {isZh ? '对话可以生成任务；是否自动执行由执行策略和审批中心决定。' : 'Conversation can create tasks; execution is controlled by policy and approvals.'}
              </div>
            </div>
            <button
              type="button"
              onClick={clearActiveAgentChat}
              disabled={visibleChatMessages.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isZh ? '清空' : 'Clear'}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.12),transparent_34%)] p-5">
            {visibleChatMessages.length > 0 ? (
              <div className="space-y-3">
                {visibleChatMessages.map(message => (
                  <div key={message.id} className={cn('group relative rounded-md px-3 py-2 pr-9 text-sm', message.role === 'user' ? 'ml-auto max-w-[85%] bg-blue-600/20 text-blue-50' : 'mr-auto max-w-[85%] bg-neutral-900 text-slate-200')}>
                    <button
                      type="button"
                      onClick={() => deleteChatMessage(message.id)}
                      className="absolute right-2 top-2 rounded p-1 text-slate-600 opacity-0 transition-opacity hover:bg-black/30 hover:text-red-300 group-hover:opacity-100"
                      title={isZh ? '删除这条消息' : 'Delete this message'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{message.role === 'user' ? (isZh ? '你' : 'You') : message.agentName}</div>
                    <div className="flex items-start gap-2 whitespace-pre-wrap leading-relaxed">
                      {message.content === 'Running task...' || message.content === '正在执行任务...' ? <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-300" /> : null}
                      <span>{message.content}</span>
                    </div>
                    {message.action?.type === 'approval' && pendingItems.some(item => item.kind === message.action?.kind && item.id === message.action?.id) && (
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleChatApproval(message, false)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/20"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {isZh ? '拒绝' : 'Reject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleChatApproval(message, true)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-100 hover:bg-emerald-500/25"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isZh ? '批准并执行' : 'Approve & Execute'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-80 items-center justify-center text-center">
                <div className="max-w-sm">
                  <MessageSquare className="mx-auto h-10 w-10 text-slate-700" />
                  <div className="mt-3 text-sm font-bold text-slate-300">{isZh ? '打开 Agent Console' : 'Open the Agent Console'}</div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {isZh
                      ? '先在左侧选择智能体；输入 @客户名称 引用客户资料，需要执行的内容会转成任务并进入策略判断。'
                      : 'Choose an agent on the left; type @client name to reference a customer. Execution requests become policy-controlled tasks.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-800 bg-neutral-950 p-4">
            {activeChatAgent && (
              <div className="mb-3 rounded-md border border-neutral-800 bg-black/50 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-300">
                  <Bot className="h-3.5 w-3.5" />
                  {isZh ? '使用方法' : 'How to use this agent'}
                </div>
                <p className="text-xs leading-relaxed text-slate-400">{buildAgentChatUsage(activeChatAgent)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(activeChatAgent.tools || []).slice(0, 8).map(tool => (
                    <span key={tool} className="rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-slate-500">{tool}</span>
                  ))}
                  {(activeChatAgent.tools || []).length > 8 && <span className="rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-slate-500">+{(activeChatAgent.tools || []).length - 8}</span>}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendAgentChat();
                  }
                }}
                list="agent-chat-client-mentions"
                placeholder={isZh ? '例：帮我分析 @客户名称 的下一步跟进策略' : 'Example: Analyze next follow-up strategy for @Client Name'}
                className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-black px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
              />
              <datalist id="agent-chat-client-mentions">
                {clients.map(client => <option key={client.id} value={`@${client.name}`} label={[client.company, client.country].filter(Boolean).join(' · ')} />)}
              </datalist>
              <button
                type="button"
                onClick={() => void sendAgentChat()}
                disabled={chatSending || !chatInput.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-500/40 bg-blue-600/20 px-4 py-2.5 text-sm font-bold text-blue-100 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
              >
                {chatSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isZh ? '发送' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
