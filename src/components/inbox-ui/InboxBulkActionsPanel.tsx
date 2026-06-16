import React from 'react';
import { Activity, CalendarClock, MessageSquare, Star, Tag, Trash2, User } from 'lucide-react';
import { CONVERSATION_STAGES } from './constants';

interface InboxBulkActionsPanelProps {
  language: string;
  selectedCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  currentUser?: { id: string } | null;
  bulkTagInput: string;
  bulkNoteInput: string;
  bulkOwnerId: string;
  bulkStage: string;
  bulkFollowUpAt: string;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkTagInputChange: (value: string) => void;
  onBulkNoteInputChange: (value: string) => void;
  onBulkOwnerIdChange: (value: string) => void;
  onBulkStageChange: (value: string) => void;
  onBulkFollowUpAtChange: (value: string) => void;
  onAddTag: () => void | Promise<void>;
  onAddComment: () => void | Promise<void>;
  onAssignOwner: () => void | Promise<void>;
  onSetStage: () => void | Promise<void>;
  onSetFollowUp: () => void | Promise<void>;
  onMarkImportant: () => void | Promise<void>;
  onDeleteSelected: () => void;
}

export function InboxBulkActionsPanel({
  language,
  selectedCount,
  allVisibleSelected,
  someVisibleSelected,
  currentUser,
  bulkTagInput,
  bulkNoteInput,
  bulkOwnerId,
  bulkStage,
  bulkFollowUpAt,
  onToggleSelectAll,
  onClearSelection,
  onBulkTagInputChange,
  onBulkNoteInputChange,
  onBulkOwnerIdChange,
  onBulkStageChange,
  onBulkFollowUpAtChange,
  onAddTag,
  onAddComment,
  onAssignOwner,
  onSetStage,
  onSetFollowUp,
  onMarkImportant,
  onDeleteSelected,
}: InboxBulkActionsPanelProps) {
  const isZh = language === 'zh';

  return (
    <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={input => {
                if (input) input.indeterminate = someVisibleSelected && !allVisibleSelected;
              }}
              onChange={onToggleSelectAll}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span>{isZh ? '全选当前视图' : 'Select current view'}</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {isZh ? `已选 ${selectedCount}` : `${selectedCount} selected`}
            </span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[11px] font-medium text-slate-500 transition hover:text-slate-800"
              >
                {isZh ? '取消选择' : 'Clear selection'}
              </button>
            )}
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {isZh ? '标签与备注' : 'Tags & Notes'}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={bulkTagInput}
                      onChange={event => onBulkTagInputChange(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          void onAddTag();
                        }
                      }}
                      placeholder={isZh ? '输入标签' : 'Add tag'}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={onAddTag}
                      disabled={!bulkTagInput.trim()}
                      className="inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {isZh ? '添加标签' : 'Add Tag'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={bulkNoteInput}
                      onChange={event => onBulkNoteInputChange(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          void onAddComment();
                        }
                      }}
                      placeholder={isZh ? '输入内部备注' : 'Add internal note'}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={onAddComment}
                      disabled={!bulkNoteInput.trim()}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {isZh ? '添加备注' : 'Add Note'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {isZh ? '负责人与阶段' : 'Owner & Stage'}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={bulkOwnerId}
                      onChange={event => onBulkOwnerIdChange(event.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                    >
                      <option value="">{isZh ? '未分配负责人' : 'Owner: Unassigned'}</option>
                      {currentUser && <option value={currentUser.id}>{isZh ? '分配给我' : 'Assign to me'}</option>}
                    </select>
                    <button
                      type="button"
                      onClick={onAssignOwner}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      <User className="h-3.5 w-3.5" />
                      {isZh ? '分配' : 'Assign'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={bulkStage}
                      onChange={event => onBulkStageChange(event.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-500"
                    >
                      <option value="">{isZh ? '选择阶段' : 'Select stage'}</option>
                      {CONVERSATION_STAGES.map(stage => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={onSetStage}
                      disabled={!bulkStage}
                      className="inline-flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      {isZh ? '更新阶段' : 'Set Stage'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {isZh ? '跟进与处置' : 'Follow-up & Actions'}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="datetime-local"
                  value={bulkFollowUpAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={event => onBulkFollowUpAtChange(event.target.value)}
                  className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={onSetFollowUp}
                  disabled={!bulkFollowUpAt}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {isZh ? '设为待跟进' : 'Set Follow-up'}
                </button>
                <button
                  type="button"
                  onClick={onMarkImportant}
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  <Star className="h-3.5 w-3.5" />
                  {isZh ? '标记重要' : 'Mark Important'}
                </button>
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isZh ? '删除' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
