import React, { useState } from 'react';
import { Bot, CheckCircle2, ClipboardCheck, Cpu, ShieldCheck, XCircle } from 'lucide-react';
import {
  AgentExecutionPolicy,
  AgentExecutionPolicyRule,
  GLOBAL_AGENT_ACTION_TYPES,
  GlobalAgentActionType
} from '../../store';
import { ACTION_LABELS, AgentHubPendingItem, AgentHubTab } from './shared';

interface ApprovalCenterPanelProps {
  language: string;
  pendingItems: AgentHubPendingItem[];
  agentExecutionPolicy: AgentExecutionPolicy;
  t: (key: string) => string;
  onApprove: (item: AgentHubPendingItem, reason?: string) => void | Promise<void>;
  onReject: (item: AgentHubPendingItem, reason?: string) => void;
  onTabChange: (tab: AgentHubTab) => void;
  onUpdatePolicy: (actionType: GlobalAgentActionType, updates: Partial<AgentExecutionPolicyRule>) => void;
}

export function ApprovalCenterPanel({
  language,
  pendingItems,
  agentExecutionPolicy,
  t,
  onApprove,
  onReject,
  onTabChange,
  onUpdatePolicy
}: ApprovalCenterPanelProps) {
  const isZh = language === 'zh';
  const [reviewDialog, setReviewDialog] = useState<{
    item: AgentHubPendingItem;
    action: 'approve' | 'reject';
    reason: string;
  } | null>(null);

  const submitReview = async () => {
    if (!reviewDialog) return;
    const reason = reviewDialog.reason.trim();
    if (reviewDialog.action === 'approve') {
      await onApprove(reviewDialog.item, reason);
    } else {
      onReject(reviewDialog.item, reason);
    }
    setReviewDialog(null);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
          <ClipboardCheck className="w-4 h-4" /> {isZh ? '审批中心' : 'Approval Center'}
        </div>
        <p className="mb-5 text-xs leading-relaxed text-slate-500">
          {isZh
            ? '需要人工确认的智能体动作统一在这里处理，不需要到不同智能体页面分别找审核按钮。'
            : 'All human-reviewed agent actions are handled here. You no longer need to hunt for approval buttons across agent pages.'}
        </p>
        <div className="space-y-4">
          {pendingItems.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">{t('No approvals waiting.')}</div>}
          {pendingItems.map(item => (
            <div key={`${item.kind}-${item.id}`} className="bg-slate-950 border border-blue-500/30 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-blue-300 mb-3">
                    <span className="px-2 py-1 rounded bg-blue-600/20 border border-blue-500/40 uppercase font-bold">{t('Requires Approval')}</span>
                    <Bot className="w-3 h-3" /> {item.agent}
                  </div>
                  <h3 className="font-bold text-slate-100">{item.title}</h3>
                </div>
                <span className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div className="mt-4 bg-black border border-neutral-800 rounded-md p-4 text-sm text-slate-300 whitespace-pre-wrap">{item.body}</div>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setReviewDialog({ item, action: 'reject', reason: '' })} className="px-4 py-2 text-red-300 hover:bg-red-500/10 rounded-md text-sm font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> {t('Reject')}
                </button>
                <button onClick={() => setReviewDialog({ item, action: 'approve', reason: '' })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-white text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {t('Approve')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-neutral-900/80 border border-neutral-700 rounded-lg p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
          <ShieldCheck className="w-4 h-4" /> {isZh ? '执行策略与引擎' : 'Execution Policy & Engine'}
        </div>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-black border border-neutral-800 rounded-md p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Cpu className="w-4 h-4 text-blue-300" /> Execution Engine
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {isZh
                ? 'Agent Harness 已收束为执行引擎：检查工具权限、应用执行策略、创建审核项并记录 trace，不再作为独立业务智能体。'
                : 'The former Agent Harness is now the execution engine: it checks tool permissions, applies policy, creates review items, and records traces. It is no longer a standalone business agent.'}
            </p>
          </div>
          <button onClick={() => onTabChange('opportunities')} className="bg-black border border-neutral-800 rounded-md p-4 text-left hover:border-blue-500/50 transition-colors">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Bot className="w-4 h-4 text-blue-300" /> Global Orchestrator
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {isZh
                ? '负责拆解目标、分派任务和协调优先级；具体执行仍进入任务队列和审批策略。'
                : 'Breaks goals into tasks and coordinates priority. Actual execution still flows through task queue and policy.'}
            </p>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {GLOBAL_AGENT_ACTION_TYPES.map(actionType => {
            const rule = agentExecutionPolicy[actionType];
            return (
              <div key={actionType} className="bg-black border border-neutral-800 rounded-md p-3">
                <div className="text-xs font-bold text-slate-200 mb-2">{t(ACTION_LABELS[actionType])}</div>
                <div className="flex gap-2">
                  <select
                    value={rule.mode}
                    onChange={event => onUpdatePolicy(actionType, { mode: event.target.value as AgentExecutionPolicyRule['mode'] })}
                    className="min-w-0 flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="auto">{t('Auto')}</option>
                    <option value="review">{t('Review')}</option>
                  </select>
                  <select
                    value={rule.risk}
                    onChange={event => onUpdatePolicy(actionType, { risk: event.target.value as AgentExecutionPolicyRule['risk'] })}
                    className="min-w-0 flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="low">{t('Low')}</option>
                    <option value="medium">{t('Medium')}</option>
                    <option value="high">{t('High')}</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {reviewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="border-b border-slate-800 p-5">
              <h3 className="text-lg font-bold text-white">
                {reviewDialog.action === 'approve'
                  ? (isZh ? '批准并执行' : 'Approve and Execute')
                  : (isZh ? '拒绝执行' : 'Reject Execution')}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {isZh
                  ? '填写原因会写入任务与运行记录，方便之后审计和复盘。'
                  : 'The reason will be written into task and run history for audit and review.'}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-slate-800 bg-black p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{reviewDialog.item.agent}</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{reviewDialog.item.title}</div>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {isZh ? '审批原因' : 'Review Reason'}
                </span>
                <textarea
                  value={reviewDialog.reason}
                  onChange={event => setReviewDialog({ ...reviewDialog, reason: event.target.value })}
                  rows={4}
                  placeholder={isZh ? '例如：内容风险可控，允许按计划执行。' : 'e.g. Risk reviewed; approved to execute as planned.'}
                  className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition-colors focus:border-blue-500"
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={() => setReviewDialog(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-800"
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void submitReview()}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors ${
                  reviewDialog.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {reviewDialog.action === 'approve'
                  ? (isZh ? '确认批准' : 'Confirm Approval')
                  : (isZh ? '确认拒绝' : 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
