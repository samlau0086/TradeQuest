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
  return (
    <div className="p-3 px-4 border-b border-slate-800 bg-slate-900/70 text-xs text-slate-400 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={input => {
              if (input) input.indeterminate = someVisibleSelected && !allVisibleSelected;
            }}
            onChange={onToggleSelectAll}
            className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
          />
          <span>{language === 'zh' ? '全选' : 'Select All'}</span>
        </label>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span>{language === 'zh' ? `已选 ${selectedCount}` : `Selected ${selectedCount}`}</span>
            <button onClick={onClearSelection} className="text-slate-300 hover:text-white">
              {language === 'zh' ? '取消选择' : 'Clear'}
            </button>
          </div>
        )}
      </div>
      {selectedCount > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2 space-y-2">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex gap-2">
              <input
                value={bulkTagInput}
                onChange={event => onBulkTagInputChange(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') void onAddTag(); }}
                placeholder={language === 'zh' ? '标签' : 'Tag'}
                className="min-w-0 flex-1 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
              />
              <button onClick={onAddTag} disabled={!bulkTagInput.trim()} className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1.5 font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:border-slate-700 disabled:text-slate-500">
                <Tag className="h-3.5 w-3.5" /> {language === 'zh' ? '添加标签' : 'Add Tag'}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={bulkNoteInput}
                onChange={event => onBulkNoteInputChange(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') void onAddComment(); }}
                placeholder={language === 'zh' ? '内部备注' : 'Internal note'}
                className="min-w-0 flex-1 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
              />
              <button onClick={onAddComment} disabled={!bulkNoteInput.trim()} className="inline-flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/10 px-2 py-1.5 font-bold text-blue-200 hover:bg-blue-500/20 disabled:border-slate-700 disabled:text-slate-500">
                <MessageSquare className="h-3.5 w-3.5" /> {language === 'zh' ? '备注' : 'Note'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={bulkOwnerId}
                onChange={event => onBulkOwnerIdChange(event.target.value)}
                className="min-w-[140px] flex-1 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="">{language === 'zh' ? '负责人：未分配' : 'Owner: Unassigned'}</option>
                {currentUser && (
                  <option value={currentUser.id}>{language === 'zh' ? '负责人：我' : 'Owner: Me'}</option>
                )}
              </select>
              <button onClick={onAssignOwner} className="inline-flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/10 px-2 py-1.5 font-bold text-blue-200 hover:bg-blue-500/20">
                <User className="h-3.5 w-3.5" /> {language === 'zh' ? '分配' : 'Assign'}
              </button>
              <select
                value={bulkStage}
                onChange={event => onBulkStageChange(event.target.value)}
                className="min-w-[140px] flex-1 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500"
              >
                <option value="">{language === 'zh' ? '选择阶段' : 'Select stage'}</option>
                {CONVERSATION_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
              </select>
              <button onClick={onSetStage} disabled={!bulkStage} className="inline-flex items-center gap-1 rounded border border-purple-500/40 bg-purple-500/10 px-2 py-1.5 font-bold text-purple-200 hover:bg-purple-500/20 disabled:border-slate-700 disabled:text-slate-500">
                <Activity className="h-3.5 w-3.5" /> {language === 'zh' ? '阶段' : 'Stage'}
              </button>
              <input
                type="datetime-local"
                value={bulkFollowUpAt}
                min={new Date().toISOString().slice(0, 16)}
                onChange={event => onBulkFollowUpAtChange(event.target.value)}
                className="min-w-[170px] flex-1 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
              />
              <button onClick={onSetFollowUp} disabled={!bulkFollowUpAt} className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:border-slate-700 disabled:text-slate-500">
                <CalendarClock className="h-3.5 w-3.5" /> {language === 'zh' ? '待跟进' : 'Follow-up'}
              </button>
              <button onClick={onMarkImportant} className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 font-bold text-amber-200 hover:bg-amber-500/20">
                <Star className="h-3.5 w-3.5" /> {language === 'zh' ? '重要' : 'Important'}
              </button>
              <button onClick={onDeleteSelected} className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 font-bold text-red-200 hover:bg-red-500/20">
                <Trash2 className="h-3.5 w-3.5" /> {language === 'zh' ? '删除' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
