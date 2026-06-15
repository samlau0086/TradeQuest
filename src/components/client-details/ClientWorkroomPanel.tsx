import React from 'react';
import { CheckCircle2, Loader2, Mail, Sparkles, Workflow } from 'lucide-react';

interface WorkroomTodoItem {
  id: string;
  label: string;
  meta: string;
  onClick: () => void;
}

interface WorkroomKnowledgeItem {
  id: string;
  title: string;
  content: string;
}

interface WorkroomChannelHighlight {
  id: string;
  channel: string;
  title: string;
  body?: string;
  date: string;
  onClick?: () => void;
}

interface ClientWorkroomPanelProps {
  quoteCount: number;
  contactMethodCount: number;
  ragCount: number;
  todoCount: number;
  loading: boolean;
  primaryNextStep: string;
  primarySummary: string;
  clientSummaryText: string;
  clientNextStepText: string;
  leadSummaryText: string;
  leadNextStepText: string;
  hasLeadRecord: boolean;
  todoItems: WorkroomTodoItem[];
  ragItems: WorkroomKnowledgeItem[];
  channelHighlights: WorkroomChannelHighlight[];
  onRefreshAiRecommendation: () => void;
  onOpenCommunication: () => void;
  onOpenAgentHub: () => void;
  onOpenKnowledgeBase: () => void;
}

const shortText = (value: string | undefined | null, max = 120) => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

export function ClientWorkroomPanel({
  quoteCount,
  contactMethodCount,
  ragCount,
  todoCount,
  loading,
  primaryNextStep,
  primarySummary,
  clientSummaryText,
  clientNextStepText,
  leadSummaryText,
  leadNextStepText,
  hasLeadRecord,
  todoItems,
  ragItems,
  channelHighlights,
  onRefreshAiRecommendation,
  onOpenCommunication,
  onOpenAgentHub,
  onOpenKnowledgeBase,
}: ClientWorkroomPanelProps) {
  return (
    <section className="rounded-xl border border-cyan-500/25 bg-slate-950/70 overflow-hidden shadow-[0_0_40px_rgba(14,165,233,0.06)]">
      <div className="border-b border-slate-800 bg-cyan-950/10 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> 客户/Lead 作战室
            </div>
            <h3 className="mt-1 text-xl font-bold text-white">下一步作战入口</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-300">{quoteCount} 报价</span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-300">{contactMethodCount} 联系方式</span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-300">{ragCount} RAG</span>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200">{todoCount} 待处理</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> 推荐下一步
            </div>
            <p className="text-base font-medium leading-relaxed text-white">{primaryNextStep}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{primarySummary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={onRefreshAiRecommendation}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {loading ? '分析中...' : '刷新AI建议'}
              </button>
              <button
                onClick={onOpenCommunication}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200 transition-colors hover:bg-blue-500/20"
              >
                <Mail className="h-3.5 w-3.5" /> 打开沟通记录
              </button>
              <button
                onClick={onOpenAgentHub}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-200 transition-colors hover:bg-indigo-500/20"
              >
                <Workflow className="h-3.5 w-3.5" /> 智能体任务
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-300">客户级情报</div>
              <p className="text-sm leading-relaxed text-slate-200">
                {clientSummaryText || '暂未生成客户级摘要。'}
              </p>
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-cyan-300">客户级下一步</span>
                {clientNextStepText || '查看账户关系与最近全渠道互动。'}
              </div>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-950/15 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-purple-300">Lead级情报</div>
              <p className="text-sm leading-relaxed text-slate-200">
                {hasLeadRecord ? (leadSummaryText || '暂未生成Lead级摘要。') : '打开某个Lead后，这里会显示该Lead的采购意向、产品、评分与下一步。'}
              </p>
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-purple-300">Lead级下一步</span>
                {hasLeadRecord ? (leadNextStepText || '分析此Lead并明确下一步成交动作。') : '选择Lead后显示Lead专属下一步。'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">待处理事项</h4>
              <span className="text-[11px] text-slate-500">{todoCount}</span>
            </div>
            <div className="space-y-2">
              {todoItems.slice(0, 4).map(item => (
                <button key={item.id} onClick={item.onClick} className="w-full rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-left transition-colors hover:border-cyan-500/40 hover:bg-slate-950">
                  <div className="text-sm font-medium text-slate-200">{shortText(item.label, 72)}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{item.meta}</div>
                </button>
              ))}
              {todoItems.length === 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-500">暂无待跟进事项或智能体任务。</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">RAG依据</h4>
              <button type="button" onClick={onOpenKnowledgeBase} className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200">打开</button>
            </div>
            <div className="space-y-2">
              {ragItems.slice(0, 3).map(item => (
                <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-sm font-medium text-slate-200">{item.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-500">{shortText(item.content, 100)}</div>
                </div>
              ))}
              {ragItems.length === 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-500">暂无客户专属RAG依据。</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">全渠道历史</h4>
          <span className="text-[11px] text-slate-500">Email · WhatsApp · Live Chat · CRM</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {channelHighlights.slice(0, 4).map(item => {
            const Wrapper = item.onClick ? 'button' : 'div';
            return (
              <Wrapper
                key={item.id}
                onClick={item.onClick}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-left transition-colors hover:border-cyan-500/40 hover:bg-slate-900"
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-cyan-300">{item.channel}</span>
                  <span className="text-slate-500">{new Date(item.date).toLocaleDateString()}</span>
                </div>
                <div className="text-sm font-medium text-slate-200">{shortText(item.title, 76)}</div>
                {item.body && <div className="mt-1 text-xs leading-relaxed text-slate-500">{item.body}</div>}
              </Wrapper>
            );
          })}
          {channelHighlights.length === 0 && (
            <div className="md:col-span-2 xl:col-span-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-500">
              暂无已关联到此客户的全渠道历史。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
