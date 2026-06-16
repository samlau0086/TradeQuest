import { useCallback, useEffect, useState } from 'react';
import { type MediaItem } from '../store';

interface UseWhatsAppComposerStateOptions {
  initialMessage: string;
  resetKey: string;
}

const defaultScheduleDateTime = () => {
  const date = new Date(Date.now() + 15 * 60 * 1000);
  date.setSeconds(0, 0);
  return date.toISOString().slice(0, 16);
};

export const WHATSAPP_EMOJI_OPTIONS = ['🙂', '😊', '👍', '🙏', '🔥', '🎉', '✅', '📦', '💬', '🤝', '📄', '🚀'];

export function useWhatsAppComposerState({ initialMessage, resetKey }: UseWhatsAppComposerStateOptions) {
  const [body, setBody] = useState(initialMessage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  useEffect(() => {
    setBody(initialMessage);
    setSelectedFile(null);
    setSelectedMedia(null);
  }, [initialMessage, resetKey]);

  const clearSelectedFile = useCallback(() => setSelectedFile(null), []);
  const clearSelectedMedia = useCallback(() => setSelectedMedia(null), []);
  const openMediaSelector = useCallback(() => setShowMediaSelector(true), []);
  const closeMediaSelector = useCallback(() => setShowMediaSelector(false), []);
  const toggleEmoji = useCallback(() => setShowEmoji(prev => !prev), []);
  const pickEmoji = useCallback((emoji: string) => setBody(prev => `${prev}${emoji}`), []);
  const selectFile = useCallback((file: File | null) => {
    setSelectedFile(file);
    setSelectedMedia(null);
  }, []);
  const selectMedia = useCallback((media: MediaItem) => {
    setSelectedMedia(media);
    setSelectedFile(null);
  }, []);
  const toggleSchedule = useCallback(() => {
    setScheduleEnabled(prev => {
      const next = !prev;
      if (next && !scheduleDateTime) setScheduleDateTime(defaultScheduleDateTime());
      return next;
    });
  }, [scheduleDateTime]);

  return {
    body,
    setBody,
    selectedFile,
    setSelectedFile,
    selectedMedia,
    setSelectedMedia,
    showMediaSelector,
    setShowMediaSelector,
    showEmoji,
    setShowEmoji,
    scheduleEnabled,
    setScheduleEnabled,
    scheduleDateTime,
    setScheduleDateTime,
    emojiOptions: WHATSAPP_EMOJI_OPTIONS,
    clearSelectedFile,
    clearSelectedMedia,
    openMediaSelector,
    closeMediaSelector,
    toggleEmoji,
    pickEmoji,
    selectFile,
    selectMedia,
    toggleSchedule,
  };
}
