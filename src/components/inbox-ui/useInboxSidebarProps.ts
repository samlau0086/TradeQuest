import type { InboxConversationSidebarProps } from './InboxConversationSidebar';

type UseInboxSidebarPropsOptions = Omit<InboxConversationSidebarProps, 'tagSuggestions' | 'onSync'> & {
  onSync: () => void | Promise<void>;
};

export function useInboxSidebarProps({
  onSync,
  emails,
  ...props
}: UseInboxSidebarPropsOptions): InboxConversationSidebarProps {
  return {
    ...props,
    emails,
    tagSuggestions: Array.from(new Set(emails.flatMap(email => email.tags || []))),
    onSync: () => {
      void onSync();
    },
  };
}
