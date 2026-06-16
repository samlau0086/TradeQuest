import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { type Client, type MediaItem } from '../store';
import {
  simpleHash,
  writeCachedWhatsAppTranslations,
  type WhatsAppTranslation
} from './whatsappMessageModel';

type OutboundOriginalRecord = {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  changed: boolean;
  modelId: string | null;
};

interface UseWhatsAppSendingOptions {
  body: string;
  setBody: Dispatch<SetStateAction<string>>;
  selectedFile: File | null;
  setSelectedFile: Dispatch<SetStateAction<File | null>>;
  selectedMedia: MediaItem | null;
  setSelectedMedia: Dispatch<SetStateAction<MediaItem | null>>;
  selectedClientId: string;
  setSelectedClientId: Dispatch<SetStateAction<string>>;
  scheduleEnabled: boolean;
  setScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  scheduleDateTime: string;
  setScheduleDateTime: Dispatch<SetStateAction<string>>;
  displayPhone: string;
  targetPhone: string;
  language: 'en' | 'zh';
  activeClient: Client | null;
  customerServiceAgentEnabled: boolean;
  outboundAutoTranslateEnabled: boolean;
  translateOutboundMessageText: (text: string) => Promise<OutboundOriginalRecord>;
  generateWhatsAppMessageText: (seedPrompt: string, mode?: 'draft' | 'customer_service') => Promise<string>;
  incrementAgentHubTaskCount: (agentId: string) => void;
  addLog: (clientId: string, content: string, relatedEmailId?: string, type?: 'general' | 'whatsapp' | 'email', metadata?: any) => void;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  loadData: (options?: { sync?: boolean }) => Promise<void>;
  setTranslations: Dispatch<SetStateAction<Record<string, WhatsAppTranslation>>>;
}

const isInlineMedia = (mimeType: string) => mimeType.startsWith('image/') || mimeType.startsWith('video/');

const dataUrlToFile = async (dataUrl: string, name: string, mimeType: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: mimeType || blob.type || 'application/octet-stream' });
};

export function useWhatsAppSending({
  body,
  setBody,
  selectedFile,
  setSelectedFile,
  selectedMedia,
  setSelectedMedia,
  selectedClientId,
  setSelectedClientId,
  scheduleEnabled,
  setScheduleEnabled,
  scheduleDateTime,
  setScheduleDateTime,
  displayPhone,
  targetPhone,
  language,
  activeClient,
  customerServiceAgentEnabled,
  outboundAutoTranslateEnabled,
  translateOutboundMessageText,
  generateWhatsAppMessageText,
  incrementAgentHubTaskCount,
  addLog,
  notify,
  loadData,
  setTranslations,
}: UseWhatsAppSendingOptions) {
  const [sending, setSending] = useState(false);

  const uploadFileToHub = useCallback(async (fileToUpload: File) => {
    const form = new FormData();
    form.append('file', fileToUpload);
    const uploadResponse = await fetch('/api/whatsapp-hub/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: form
    });
    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(uploadData.error || 'Failed to upload WhatsApp media');
    const file = uploadData.file;
    return {
      url: file.url,
      originalName: file.originalName || fileToUpload.name,
      mimeType: file.mimeType || fileToUpload.type,
      sendAsDocument: !isInlineMedia(file.mimeType || fileToUpload.type)
    };
  }, []);

  const resolveMediaPayload = useCallback(async () => {
    if (selectedFile) return uploadFileToHub(selectedFile);
    if (!selectedMedia) return undefined;
    if (selectedMedia.url.startsWith('data:')) {
      const file = await dataUrlToFile(selectedMedia.url, selectedMedia.name, selectedMedia.type);
      return uploadFileToHub(file);
    }
    return {
      url: selectedMedia.url,
      originalName: selectedMedia.name,
      mimeType: selectedMedia.type,
      sendAsDocument: !isInlineMedia(selectedMedia.type)
    };
  }, [selectedFile, selectedMedia, uploadFileToHub]);

  const saveOutboundOriginal = useCallback(async (messageId: string, messageBody: string, outboundOriginalRecord: OutboundOriginalRecord) => {
    const originalTranslation: WhatsAppTranslation = {
      language,
      kind: 'outbound_original',
      text: outboundOriginalRecord.originalText,
      sourceLanguage: outboundOriginalRecord.sourceLanguage,
      targetLanguage: outboundOriginalRecord.targetLanguage,
      bodyHash: simpleHash(messageBody),
      skipped: false,
      modelId: outboundOriginalRecord.modelId
    };
    const saveOriginalResponse = await fetch(`/api/whatsapp-hub/messages/${encodeURIComponent(messageId)}/translation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        language,
        kind: 'outbound_original',
        translatedText: outboundOriginalRecord.originalText,
        sourceLanguage: outboundOriginalRecord.sourceLanguage,
        targetLanguage: outboundOriginalRecord.targetLanguage,
        bodyHash: simpleHash(messageBody),
        skipped: false,
        modelId: outboundOriginalRecord.modelId
      })
    });
    const savedOriginalData = await saveOriginalResponse.json().catch(() => ({}));
    if (saveOriginalResponse.ok) {
      setTranslations(prev => {
        const next = { ...prev, [messageId]: savedOriginalData.translation || originalTranslation };
        writeCachedWhatsAppTranslations(targetPhone, language, next);
        return next;
      });
    } else {
      console.warn('Failed to save outbound WhatsApp original text', savedOriginalData.error);
    }
  }, [language, setTranslations, targetPhone]);

  const sendMessage = useCallback(async () => {
    if ((!body.trim() && !selectedFile && !selectedMedia && !customerServiceAgentEnabled) || !displayPhone) return;
    setSending(true);
    try {
      let messageBody = body.trim();
      let outboundOriginalRecord: OutboundOriginalRecord | null = null;
      if (customerServiceAgentEnabled) {
        const generated = await generateWhatsAppMessageText(messageBody, 'customer_service');
        if (!generated) throw new Error('WhatsApp Customer Service Agent did not generate a message.');
        messageBody = generated;
        setBody(generated);
        incrementAgentHubTaskCount('whatsapp_customer_service_agent');
      }
      if (outboundAutoTranslateEnabled && messageBody) {
        outboundOriginalRecord = await translateOutboundMessageText(messageBody);
        messageBody = outboundOriginalRecord.translatedText;
        setBody(messageBody);
      }
      const media = await resolveMediaPayload();
      const response = await fetch('/api/whatsapp-hub/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: displayPhone,
          body: messageBody,
          media,
          clientId: selectedClientId || undefined,
          scheduledAt: scheduleEnabled && scheduleDateTime ? new Date(scheduleDateTime).toISOString() : undefined,
          metadata: { clientId: activeClient?.id, hasMedia: !!media, agentMode: customerServiceAgentEnabled ? 'whatsapp_customer_service_agent' : undefined }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send WhatsApp message');
      setSelectedClientId(data.selectedClientId || selectedClientId);
      if (outboundOriginalRecord?.changed && data.messageId) {
        await saveOutboundOriginal(data.messageId, messageBody, outboundOriginalRecord);
      }
      if (activeClient) {
        addLog(
          activeClient.id,
          data.scheduled
            ? `WhatsApp Hub message scheduled for ${new Date(data.scheduledAt).toLocaleString()}: ${messageBody.slice(0, 120)}`
            : `WhatsApp Hub message sent: ${messageBody.slice(0, 120)}`,
          undefined,
          'whatsapp',
          data
        );
      }
      setBody('');
      setSelectedFile(null);
      setSelectedMedia(null);
      if (data.scheduled) {
        setScheduleEnabled(false);
        setScheduleDateTime('');
      }
      notify(data.scheduled ? 'WhatsApp message scheduled.' : 'WhatsApp message queued.', 'success');
      await loadData({ sync: false });
    } catch (error: any) {
      notify(error.message || 'Failed to send WhatsApp message.', 'error');
    } finally {
      setSending(false);
    }
  }, [
    activeClient,
    addLog,
    body,
    customerServiceAgentEnabled,
    displayPhone,
    generateWhatsAppMessageText,
    incrementAgentHubTaskCount,
    loadData,
    notify,
    outboundAutoTranslateEnabled,
    resolveMediaPayload,
    saveOutboundOriginal,
    scheduleDateTime,
    scheduleEnabled,
    selectedClientId,
    selectedFile,
    selectedMedia,
    setBody,
    setScheduleDateTime,
    setScheduleEnabled,
    setSelectedClientId,
    setSelectedFile,
    setSelectedMedia,
    translateOutboundMessageText,
  ]);

  return {
    sending,
    sendMessage,
  };
}
