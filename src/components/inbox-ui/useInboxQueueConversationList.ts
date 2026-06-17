import { useMemo } from 'react';
import type {
  InboxQueueOwnerFilter,
  InboxQueueSortMode,
  UnifiedCommunicationConversation,
} from './inboxModel';

interface UseInboxQueueConversationListParams {
  unifiedConversationList: UnifiedCommunicationConversation[];
  currentUserId?: string | null;
  queueOwnerFilter: InboxQueueOwnerFilter;
  queueSortMode: InboxQueueSortMode;
}

const timestampOf = (value?: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useInboxQueueConversationList({
  unifiedConversationList,
  currentUserId,
  queueOwnerFilter,
  queueSortMode,
}: UseInboxQueueConversationListParams) {
  return useMemo(() => {
    const items = [...unifiedConversationList].filter(conversation => {
      if (queueOwnerFilter === 'all') return true;
      if (queueOwnerFilter === 'mine') return Boolean(currentUserId) && conversation.owner_id === currentUserId;
      if (queueOwnerFilter === 'assigned') return Boolean(conversation.owner_id);
      if (queueOwnerFilter === 'unassigned') return !conversation.owner_id;
      return true;
    });

    items.sort((left, right) => {
      if (queueSortMode === 'follow_up') {
        const leftFollowUp = left.todo_at ? timestampOf(left.todo_at) : Number.MAX_SAFE_INTEGER;
        const rightFollowUp = right.todo_at ? timestampOf(right.todo_at) : Number.MAX_SAFE_INTEGER;
        if (leftFollowUp !== rightFollowUp) return leftFollowUp - rightFollowUp;
      }

      if (queueSortMode === 'unread') {
        const leftUnread = left.read === false ? 1 : 0;
        const rightUnread = right.read === false ? 1 : 0;
        if (leftUnread !== rightUnread) return rightUnread - leftUnread;
      }

      const delta = timestampOf(right.last_message_at) - timestampOf(left.last_message_at);
      if (queueSortMode === 'oldest') return -delta;
      return delta;
    });

    return items;
  }, [currentUserId, queueOwnerFilter, queueSortMode, unifiedConversationList]);
}
