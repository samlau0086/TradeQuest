import React from 'react';
import { UploadAttachmentModal } from '../UploadAttachmentModal';
import { EmailTagDialog, EmailTodoDialog, InboxConfirmDialog, InboxNotificationDialog } from './InboxDialogs';

interface InboxAuxiliaryDialogsProps {
  confirmDialog: { message: string; onConfirm: () => void } | null;
  alertDialog: string | null;
  showCommentAttachmentModal: boolean;
  tagModalEmail: string | null;
  tagInput: string;
  todoModalEmail: string | null;
  todoAt: string;
  todoNote: string;
  onCloseConfirm: () => void;
  onCloseAlert: () => void;
  onCloseAttachment: () => void;
  onUploadAttachments: (files: File[]) => void;
  onTagInputChange: (value: string) => void;
  onSubmitTag: () => void | Promise<void>;
  onCloseTag: () => void;
  onTodoAtChange: (value: string) => void;
  onTodoNoteChange: (value: string) => void;
  onSubmitTodo: () => void | Promise<void>;
  onCloseTodo: () => void;
}

export function InboxAuxiliaryDialogs({
  confirmDialog,
  alertDialog,
  showCommentAttachmentModal,
  tagModalEmail,
  tagInput,
  todoModalEmail,
  todoAt,
  todoNote,
  onCloseConfirm,
  onCloseAlert,
  onCloseAttachment,
  onUploadAttachments,
  onTagInputChange,
  onSubmitTag,
  onCloseTag,
  onTodoAtChange,
  onTodoNoteChange,
  onSubmitTodo,
  onCloseTodo,
}: InboxAuxiliaryDialogsProps) {
  return (
    <>
      {confirmDialog && (
        <InboxConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={onCloseConfirm}
        />
      )}

      {alertDialog && (
        <InboxNotificationDialog
          message={alertDialog}
          onClose={onCloseAlert}
        />
      )}

      {showCommentAttachmentModal && (
        <UploadAttachmentModal
          onClose={onCloseAttachment}
          onUpload={onUploadAttachments}
        />
      )}

      {tagModalEmail && (
        <EmailTagDialog
          tagInput={tagInput}
          onTagInputChange={onTagInputChange}
          onSubmit={onSubmitTag}
          onClose={onCloseTag}
        />
      )}

      {todoModalEmail && (
        <EmailTodoDialog
          todoAt={todoAt}
          todoNote={todoNote}
          onTodoAtChange={onTodoAtChange}
          onTodoNoteChange={onTodoNoteChange}
          onSubmit={onSubmitTodo}
          onClose={onCloseTodo}
        />
      )}
    </>
  );
}
