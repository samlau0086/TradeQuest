import type { ReactNode } from 'react';
import { Inbox, Mail, MessageCircle, Sparkles } from 'lucide-react';
import { EmptyState } from '../ui';

interface InboxWorkspaceEmptyStateProps {
  language: 'en' | 'zh';
}

interface CapabilityCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function CapabilityCard({ icon, title, description }: CapabilityCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
        {icon}
      </div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
    </div>
  );
}

export function InboxWorkspaceEmptyState({ language }: InboxWorkspaceEmptyStateProps) {
  const isZh = language === 'zh';

  return (
    <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,122,89,0.15),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-8">
      <div className="w-full max-w-4xl rounded-[28px] border border-slate-200/90 bg-white/95 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff7a59] text-white shadow-sm">
              <Inbox className="h-7 w-7" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {isZh ? '\u5de5\u4f5c\u533a\u5df2\u5c31\u7eea' : 'Workspace ready'}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {isZh
                ? '\u4ece\u5de6\u4fa7\u961f\u5217\u9009\u62e9\u4e00\u6761\u4f1a\u8bdd\u5f00\u59cb\u5904\u7406'
                : 'Pick a conversation from the left queue'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {isZh
                ? '\u7edf\u4e00\u6536\u4ef6\u7bb1\u4f1a\u628a\u90ae\u4ef6\u3001WhatsApp\u3001Live Chat \u548c Telegram \u653e\u8fdb\u4e00\u4e2a\u5904\u7406\u53f0\u3002\u6253\u5f00\u4efb\u610f\u4f1a\u8bdd\u540e\uff0c\u5c31\u53ef\u4ee5\u7ee7\u7eed\u56de\u590d\u3001\u52a0\u6807\u7b7e\u3001\u8bbe\u5f85\u8ddf\u8fdb\u3001\u8865\u5185\u90e8\u5907\u6ce8\u548c\u67e5\u770b AI \u4e0a\u4e0b\u6587\u3002'
                : 'The unified inbox keeps email, WhatsApp, Live Chat, and Telegram in one working surface. Open any conversation to reply, tag, mark follow-up, add internal notes, and review AI context without switching tools.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{isZh ? '\u5feb\u901f\u5f00\u59cb' : 'Quick start'}</div>
            <div className="mt-1 leading-6">
              {isZh
                ? '1. \u4ece\u5de6\u4fa7\u9009\u62e9\u4f1a\u8bdd  2. \u67e5\u770b\u4e0a\u4e0b\u6587  3. \u53d1\u9001\u56de\u590d\u6216\u521b\u5efa\u5f85\u8ddf\u8fdb'
                : '1. Select a conversation  2. Review context  3. Reply or create a follow-up'}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <CapabilityCard
            icon={<Mail className="h-5 w-5 text-cyan-500" />}
            title={isZh ? '\u90ae\u4ef6\u5904\u7406' : 'Email workflows'}
            description={
              isZh
                ? '\u67e5\u770b\u6765\u5f80\u7ebf\u7a0b\u3001\u5feb\u901f\u8d77\u8349\u56de\u590d\uff0c\u5e76\u628a\u7b7e\u540d\u3001\u8ddf\u8fdb\u548c\u5ba2\u6237\u5173\u8054\u4fdd\u6301\u5728\u540c\u4e00\u6d41\u7a0b\u91cc\u3002'
                : 'Review threads, draft replies quickly, and keep signatures, follow-ups, and customer links in the same workflow.'
            }
          />
          <CapabilityCard
            icon={<MessageCircle className="h-5 w-5 text-emerald-500" />}
            title={isZh ? '\u6d88\u606f\u6e20\u9053' : 'Messaging channels'}
            description={
              isZh
                ? '\u5728\u540c\u4e00\u961f\u5217\u91cc\u5904\u7406 WhatsApp\u3001Live Chat \u548c Telegram\uff0c\u800c\u4e0d\u662f\u5728\u591a\u4e2a\u6a21\u5757\u95f4\u6765\u56de\u5207\u6362\u3002'
                : 'Handle WhatsApp, Live Chat, and Telegram in the same queue instead of bouncing between separate modules.'
            }
          />
          <CapabilityCard
            icon={<Sparkles className="h-5 w-5 text-amber-500" />}
            title={isZh ? 'AI \u4e0a\u4e0b\u6587' : 'AI context'}
            description={
              isZh
                ? '\u76f4\u63a5\u5728\u5bf9\u8bdd\u91cc\u4f7f\u7528\u5ba2\u6237\u6458\u8981\u3001RAG \u8bb0\u5fc6\u3001\u4e0b\u4e00\u6b65\u5efa\u8bae\u548c\u6e20\u9053\u5386\u53f2\u3002'
                : 'Use customer summaries, RAG memory, next-step guidance, and cross-channel history directly inside the conversation.'
            }
          />
        </div>

        <EmptyState
          theme="light"
          tone="subtle"
          className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500"
        >
          {isZh
            ? '\u4f60\u4e5f\u53ef\u4ee5\u4ece\u9876\u90e8\u76f4\u63a5\u65b0\u5efa\u90ae\u4ef6\u6216 WhatsApp \u4f1a\u8bdd\uff0c\u8ba9\u65b0\u89e6\u8fbe\u548c\u5df2\u6709\u8ddf\u8fdb\u4f7f\u7528\u540c\u4e00\u4e2a\u5de5\u4f5c\u53f0\u3002'
            : 'You can also start a new email or WhatsApp conversation from the top actions so new outreach and existing follow-up share the same workspace.'}
        </EmptyState>
      </div>
    </div>
  );
}
