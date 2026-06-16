import { InboxEmailDetailContainer } from './InboxEmailDetailContainer';
import { InboxLiveChatDetailContainer } from './InboxLiveChatDetailContainer';
import { InboxTelegramDetailContainer } from './InboxTelegramDetailContainer';
import { InboxWhatsAppDetailContainer } from './InboxWhatsAppDetailContainer';
import type { InboxSelectedDetailPanelProps } from './InboxContentPanelTypes';

export function InboxSelectedDetailPanel(props: InboxSelectedDetailPanelProps) {
  if (props.selectedTelegramConversation) {
    return <InboxTelegramDetailContainer {...props} />;
  }

  if (props.selectedLiveChatConversation) {
    return <InboxLiveChatDetailContainer {...props} />;
  }

  if (props.selectedWhatsAppPhone) {
    return <InboxWhatsAppDetailContainer {...props} />;
  }

  if (props.selectedEmail) {
    return <InboxEmailDetailContainer {...props} />;
  }

  return null;
}
