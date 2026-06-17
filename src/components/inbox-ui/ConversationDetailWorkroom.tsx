import React, { type ReactNode } from 'react';
import { ConversationSplitPane } from './ConversationSplitPane';
import { ConversationWorkspaceShell } from './ConversationWorkspaceShell';

interface ConversationDetailWorkroomProps {
  header: ReactNode;
  summary: ReactNode;
  followUp: ReactNode;
  main: ReactNode;
  rail: ReactNode;
  composer?: ReactNode;
  mainClassName?: string;
  composerClassName?: string;
}

export function ConversationDetailWorkroom({
  header,
  summary,
  followUp,
  main,
  rail,
  composer,
  mainClassName,
  composerClassName,
}: ConversationDetailWorkroomProps) {
  return (
    <ConversationWorkspaceShell
      header={header}
      summary={summary}
      followUp={followUp}
      content={(
        <ConversationSplitPane
          mainClassName={mainClassName}
          main={main}
          rail={rail}
        />
      )}
      composer={composer}
      composerClassName={composerClassName}
    />
  );
}
