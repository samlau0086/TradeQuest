import React, { useEffect, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronUp, Languages, Loader2, Paperclip, Radar, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../../authStore';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';
import { getCustomerOutputLanguage } from '../../lib/language';
import { AddressInput } from '../AddressInput';
import { UploadAttachmentModal } from '../UploadAttachmentModal';
import {
  EmailRichTextEditor,
  emailHtmlHasContent,
  emailHtmlToText,
  normalizeEmailEditorHtml,
  plainTextToEmailHtml,
} from './EmailRichTextEditor';

function decodeEmailHtmlEntities(value: string) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function htmlEmailToPlainText(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || '', 'text/html');
  doc.querySelectorAll([
    'script',
    'style',
    'meta',
    'link',
    'img[src*="/api/track/open/"]',
    'blockquote',
    '.gmail_quote',
    '.gmail_attr',
    '.yahoo_quoted',
    '.moz-cite-prefix',
    '.protonmail_quote',
    '.OutlookMessageHeader',
    '[type="cite"]'
  ].join(',')).forEach(node => node.remove());
  const htmlWithBreaks = doc.body.innerHTML
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ');
  return decodeEmailHtmlEntities(htmlWithBreaks.replace(/<[^>]+>/g, ' '))
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractLatestEmailTextForDraft(htmlOrText: string) {
  const text = htmlEmailToPlainText(htmlOrText);
  const separators = [
    /\n\s*On\s.+?\bwrote:\s*\n/i,
    /\n\s*-{2,}\s*Original Message\s*-{2,}\s*\n/i,
    /\n\s*From:\s.+\n\s*(Sent|Date):\s.+\n/i,
    /\n\s*_{6,}\s*\n/
  ];
  const cutAt = separators
    .map(pattern => pattern.exec(text)?.index ?? -1)
    .filter(index => index > 0)
    .sort((a, b) => a - b)[0];
  const latest = cutAt ? text.slice(0, cutAt) : text;
  return latest
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function ComposeEmail({ onClose, initialRecipient = '', initialSubject = '', initialBody = '', originalEmailBody = '', draftId, replyToEmailId, initialOutboxId, className = '' }: { onClose: () => void, initialRecipient?: string, initialSubject?: string, initialBody?: string, originalEmailBody?: string, draftId?: string, replyToEmailId?: string, initialOutboxId?: string, className?: string }) {
  const { clients, emails, logs, addEmail, editEmail, deleteEmails, addLog, outboxConfigs, inboxConfigs, emailServerMappings, signatures, timezone, notify, incrementAgentHubTaskCount } = useStore();
  const resolvePreferredOutboxId = () => {
    if (initialOutboxId && outboxConfigs.some(config => config.id === initialOutboxId)) return initialOutboxId;
    if (draftId) {
      const draft = emails.find(email => email.id === draftId);
      if (draft?.outboxConfigId && outboxConfigs.some(config => config.id === draft.outboxConfigId)) return draft.outboxConfigId;
    }
    const replyEmail = replyToEmailId ? emails.find(email => email.id === replyToEmailId) : null;
    if (replyEmail) {
      const relatedSent = emails
        .filter(email => ['sent', 'scheduled', 'outbound'].includes(email.type) && email.outboxConfigId)
        .filter(email => {
          if (replyEmail.clientId && email.clientId === replyEmail.clientId) return true;
          const target = (replyEmail.sender || '').toLowerCase();
          const recipients = `${email.recipient || ''},${email.cc || ''},${email.bcc || ''}`.toLowerCase();
          return !!target && recipients.includes(target);
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastOutboxId = relatedSent[0]?.outboxConfigId;
      if (lastOutboxId && outboxConfigs.some(config => config.id === lastOutboxId)) return lastOutboxId;

      const mappedByInbox = emailServerMappings.find(route => route.inboxConfigId === replyEmail.inboxConfigId);
      if (mappedByInbox?.outboxConfigId && outboxConfigs.some(config => config.id === mappedByInbox.outboxConfigId)) return mappedByInbox.outboxConfigId;

      const receivedBy = `${replyEmail.recipient || ''}`.toLowerCase();
      const matchedInbox = inboxConfigs.find(config => receivedBy.includes((config.username || '').toLowerCase()));
      const mappedByRecipient = matchedInbox ? emailServerMappings.find(route => route.inboxConfigId === matchedInbox.id) : null;
      if (mappedByRecipient?.outboxConfigId && outboxConfigs.some(config => config.id === mappedByRecipient.outboxConfigId)) return mappedByRecipient.outboxConfigId;
    }
    const defaultRoute = emailServerMappings.find(route => route.isDefault) || emailServerMappings[0];
    if (defaultRoute?.outboxConfigId && outboxConfigs.some(config => config.id === defaultRoute.outboxConfigId)) return defaultRoute.outboxConfigId;
    return outboxConfigs?.[0]?.id || '';
  };
  const [selectedOutboxId, setSelectedOutboxId] = useState<string>(() => resolvePreferredOutboxId());
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>(
    signatures?.find(s => s.isDefault)?.id || signatures?.[0]?.id || ''
  );
  
  const [recipient, setRecipient] = useState(initialRecipient);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(() => normalizeEmailEditorHtml(initialBody));
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPurpose, setLoadingPurpose] = useState(false);
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [trackEmail, setTrackEmail] = useState(true);

  const { quotes, products, knowledgeBase } = useStore();

  useEffect(() => {
    const preferredOutboxId = resolvePreferredOutboxId();
    if (preferredOutboxId && (!selectedOutboxId || !outboxConfigs.some(config => config.id === selectedOutboxId))) {
      setSelectedOutboxId(preferredOutboxId);
    }
  }, [replyToEmailId, initialOutboxId, draftId, outboxConfigs, emailServerMappings, inboxConfigs, emails]);

  // Auto-associate client if recipient matches the first given recipient
  const firstRecipient = recipient.split(',')[0]?.trim() || '';
  const matchedClient = clients.find(c => 
    c.contactMethods?.some(m => m.type === 'email' && m.value.toLowerCase() === firstRecipient.toLowerCase())
  );
  const latestCustomerEmail = matchedClient
    ? emails
      .filter(email => email.clientId === matchedClient.id && (email.type === 'inbox' || email.type === 'inbound'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : undefined;
  const outboundLanguage = getCustomerOutputLanguage({
    lastCommunicationText: latestCustomerEmail?.body,
    preferredLanguage: matchedClient?.preferredLanguage,
    country: matchedClient?.country
  });

  const { llmConfigs, activeLLMId, llmMappings, language } = useStore();
  
  const getLLMConfig = (module: string) => {
    const id = llmMappings[module] || activeLLMId;
    return llmConfigs.find(l => l.id === id) || null;
  };

  const handleGeneratePurpose = async () => {
    if (!matchedClient) return;
    setLoadingPurpose(true);
    const clientLogs = logs.filter(l => l.clientId === matchedClient.id).map(l => `[${new Date(l.date).toLocaleDateString()}] ${l.content}`);
    const clientEmails = emails.filter(e => e.clientId === matchedClient.id).map(e => `[${e.type} - ${new Date(e.date).toLocaleDateString()}] ${e.subject}\n${e.body}`);

    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Suggest a single, short sentence internal purpose for follow-up with this lead based on communication history. Output language: ${language === 'zh' ? 'Chinese' : 'English'}.`, 
          context: { 
             clientLogs: clientLogs.join('\n'), 
             recentEmails: clientEmails.join('\n\n'),
             userLanguagePreference: language === 'zh' ? 'Chinese' : 'English'
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
      if (data.result) incrementAgentHubTaskCount('follow_up_agent');
      setPurpose(data.result.replace(/["']/g, '').trim());
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingPurpose(false);
    }
  };

  const senderConfig = outboxConfigs.find(c => c.id === selectedOutboxId);
  const senderEmail = senderConfig?.fromEmail || 'me@soho.com';
  const senderName = senderConfig?.fromName || 'Alex.W';
  const selectedSignature = signatures.find(s => s.id === selectedSignatureId);

  const stripTrailingConfiguredSignature = (value: string) => {
    let next = value.trimEnd();
    signatures.forEach(sig => {
      if (!sig.content?.trim()) return;
      const escaped = sig.content.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      next = next.replace(new RegExp(`(?:\\s|<br\\s*/?>)*${escaped}\\s*$`, 'i'), '').trimEnd();
    });
    return next;
  };

  const buildEmailBodyForDelivery = () => {
    const cleanBody = stripTrailingConfiguredSignature(body);
    const signatureBlock = selectedSignature?.content?.trim() ? `<br><br>${plainTextToEmailHtml(selectedSignature.content.trim())}` : '';
    const bodyWithSignature = `${cleanBody}${signatureBlock}`;
    return originalEmailBody
      ? `${bodyWithSignature}<br><br><div class="gmail_quote" dir="ltr"><blockquote style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">${originalEmailBody}</blockquote></div>`
      : bodyWithSignature;
  };

  const parseAiEmailDraft = (raw: string) => {
    const cleaned = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return {
        subject: String(parsed.subject || parsed.emailSubject || '').trim(),
        body: String(parsed.body || parsed.emailBody || parsed.content || '').trim()
      };
    } catch {
      const subjectMatch = cleaned.match(/(?:^|\n)\s*(?:Subject|主题)\s*:\s*(.+)/i);
      const bodyWithoutSubject = subjectMatch
        ? cleaned.replace(subjectMatch[0], '').replace(/^\s*(?:Body|正文)\s*:\s*/i, '').trim()
        : cleaned;
      return {
        subject: subjectMatch?.[1]?.trim() || '',
        body: bodyWithoutSubject
      };
    }
  };

  const doSchedule = () => {
    if (!recipient || !subject || !scheduleDateTime) return;
    
    // Parse the local datetime string into UTC, treating it as if it was in `timezone`
    // scheduleDateTime format: "YYYY-MM-DDTHH:mm"
    let scheduledAt = new Date(scheduleDateTime).toISOString();
    try {
      if (timezone && timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone) {
        // We have a custom timezone. We need to find the offset of `timezone` at the given time.
        // A simple trick is to format the date in the target timezone and calculate the offset.
        const dt = new Date(scheduleDateTime);
        const invTzDateStr = dt.toLocaleString('en-US', { timeZone: timezone });
        const invTzDate = new Date(invTzDateStr);
        const diff = dt.getTime() - invTzDate.getTime();
        scheduledAt = new Date(dt.getTime() + diff).toISOString();
      }
    } catch(e) {
      console.warn("Timezone parsing failed", e);
    }
    
    // We add attachments if any
    const attachmentsPayload = attachments.map(a => ({
      id: `att_${Date.now()}_${Math.random()}`,
      name: a.name,
      type: (a.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
      url: URL.createObjectURL(a)
    }));

    const finalBody = buildEmailBodyForDelivery();

    const newEmailId = addEmail({
      recipient,
      cc: cc || undefined,
      bcc: bcc || undefined,
      sender: senderEmail,
      senderName: senderName,
      subject,
      body: finalBody,
      read: true,
      type: 'scheduled',
      clientId: matchedClient?.id,
      scheduledAt,
      attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
      enableTracking: trackEmail,
      outboxConfigId: selectedOutboxId || undefined
    });
    if (matchedClient) {
      addLog(matchedClient.id, `Scheduled Email: ${subject} for ${new Date(scheduledAt).toLocaleString()}${purpose ? ` (Purpose: ${purpose})` : ''}`, newEmailId);
    }
    setShowSchedule(false);
    setScheduleDateTime('');
    onClose();
  };

  const handleSaveDraft = () => {
    if (!recipient && !subject && !emailHtmlHasContent(body)) {
      onClose();
      return;
    }

    const attachmentsPayload = attachments.map(a => ({
      id: `att_${Date.now()}_${Math.random()}`,
      name: a.name,
      type: (a.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
      url: URL.createObjectURL(a)
    }));

    const emailPayload = {
      recipient,
      cc: cc || undefined,
      bcc: bcc || undefined,
      sender: senderEmail,
      senderName: senderName,
      subject: subject || 'No Subject',
      body,
      read: true,
      type: 'draft' as const,
      clientId: matchedClient?.id,
      attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
      enableTracking: trackEmail,
      outboxConfigId: selectedOutboxId || undefined
    };

    if (draftId) {
      editEmail(draftId, emailPayload);
    } else {
      addEmail(emailPayload);
      // Removed addLog for drafts
    }
    
    onClose();
  };

  const handleSend = () => {
    if (!recipient || !subject) return;

    const attachmentsPayload = attachments.map(a => ({
      id: `att_${Date.now()}_${Math.random()}`,
      name: a.name,
      type: (a.type.includes('image') ? 'image' : 'document') as 'image' | 'document' | 'other',
      url: URL.createObjectURL(a)
    }));

    const finalBody = buildEmailBodyForDelivery();

    const newEmailId = addEmail({
      recipient,
      cc: cc || undefined,
      bcc: bcc || undefined,
      sender: senderEmail,
      senderName: senderName,
      subject,
      body: finalBody,
      read: true,
      type: 'sent',
      clientId: matchedClient?.id,
      attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
      enableTracking: trackEmail,
      outboxConfigId: selectedOutboxId || undefined
    });
    
    if (draftId) {
       deleteEmails([draftId]);
    }
    
    if (matchedClient) {
      addLog(matchedClient.id, `Sent Email: ${subject}${purpose ? ` (Purpose: ${purpose})` : ''}`, newEmailId);
    }
    onClose();
  };

  const handleOptimizeBody = async () => {
    if (!emailHtmlHasContent(body)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Please politely optimize the following outbound email draft for clarity, professional tone, and grammatical correctness. Do not include any email signature, sign-off block, sender name, company footer, or quoted original email. Output ONLY the resulting optimized email body, nothing else. Customer-facing output language: ${outboundLanguage}.\n\n${emailHtmlToText(stripTrailingConfiguredSignature(body))}`,
          context: { 
             outboundLanguage,
             clientPreferredLanguage: matchedClient?.preferredLanguage || null
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
      if (data.result) {
        incrementAgentHubTaskCount('email_draft_agent');
        setBody(normalizeEmailEditorHtml(stripTrailingConfiguredSignature(data.result)));
      }
    } catch (e) {
      console.error(e);
      notify('Failed to optimize email body.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeSubject = async () => {
    if (!subject.trim() && !emailHtmlHasContent(body) && !purpose.trim()) {
      notify(language === 'zh' ? '请先输入主题、正文或邮件目的。' : 'Please enter a subject, body, or email purpose first.', 'warning');
      return;
    }
    setLoadingSubject(true);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          command: `Generate or improve one concise outbound email subject.
Rules:
- Return only the subject line, no quotes, no markdown, no labels.
- Keep it natural, specific, and professional.
- Do not add misleading urgency, discounts, promises, or claims that are not supported by the context.
- Customer-facing output language: ${outboundLanguage}.`,
          context: {
            currentSubject: subject,
            emailPurpose: purpose,
            bodyPreview: emailHtmlToText(stripTrailingConfiguredSignature(body)).slice(0, 1600),
            originalEmailPreview: emailHtmlToText(originalEmailBody).slice(0, 1000),
            client: matchedClient ? {
              id: matchedClient.id,
              name: matchedClient.name,
              company: matchedClient.company,
              country: matchedClient.country,
              preferredLanguage: matchedClient.preferredLanguage,
              tags: matchedClient.tags,
              leadSummary: matchedClient.leadSummary,
              leadNextStep: matchedClient.leadNextStep
            } : null,
            outboundLanguage
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to generate subject.');
      const nextSubject = String(data.result || '').replace(/^["']|["']$/g, '').replace(/^(Subject|主题)\s*:\s*/i, '').trim();
      if (nextSubject) {
        setSubject(nextSubject);
        incrementAgentHubTaskCount('email_draft_agent');
      }
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : (language === 'zh' ? '生成邮件主题失败。' : 'Failed to generate email subject.'), 'error');
    } finally {
      setLoadingSubject(false);
    }
  };

  const handleInlineAICommand = async (prompt: string, currentHtml: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Write an outbound email snippet or sentence based on this instruction: ${prompt}. Do not include any email signature, sign-off block, sender name, company footer, or quoted original email. Customer-facing output language: ${outboundLanguage}.`,
          context: { 
             currentEmailBodyPreview: emailHtmlToText(currentHtml).replace(`/ai:${prompt}`, '[Generate Here]'),
             outboundLanguage,
             clientPreferredLanguage: matchedClient?.preferredLanguage || null
          },
          llmConfig: getLLMConfig('drafting')
        })
      });
      const data = await res.json();
      if (data.result) incrementAgentHubTaskCount('email_draft_agent');
      return stripTrailingConfiguredSignature(data.result || '');
    } catch(err) {
      console.error(err);
      notify('Failed to process magic command', 'error');
      return '';
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleMagicDraft = async () => {
    if (!recipient || !matchedClient) {
      notify('Enter a recipient email that matches a lead before using AI drafting.', 'warning');
      return;
    }
    setLoading(true);
    
    const clientLogs = logs.filter(l => l.clientId === matchedClient.id).map(l => l.content).join('\\n');
    const clientEmails = emails
      .filter(e => e.clientId === matchedClient.id)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12)
      .map(e => {
        const direction = ['inbox', 'inbound'].includes(e.type) ? 'CUSTOMER_TO_US' : 'OUR_TEAM_TO_CUSTOMER';
        return `[${direction} - ${new Date(e.date).toLocaleDateString()}] ${e.subject}\n${extractLatestEmailTextForDraft(e.body || '').slice(0, 1200)}`;
      })
      .join('\n\n');
    const lastEmailReceived = emails.filter(e => e.clientId === matchedClient.id && ['inbox', 'inbound'].includes(e.type)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const productContext = products
      .slice(0, 30)
      .map(product => {
        const prices = (product.bulkPrices || []).map(price => `${price.minQuantity}+ ${price.price}`).join(', ');
        return `${product.name}${product.sku ? ` (${product.sku})` : ''}: ${product.description || 'No description'}${product.salesPoints ? ` | Sales points: ${product.salesPoints}` : ''}${prices ? ` | Bulk prices: ${prices}` : ''}`;
      })
      .join('\n');
    const knowledgeContext = knowledgeBase
      .filter(item => !item.clientId || item.clientId === matchedClient.id)
      .slice(0, 12)
      .map(item => `[${item.title}]\n${item.content?.slice(0, 1200)}`)
      .join('\n\n');
    const relatedDeals = useStore.getState().deals
      .filter(deal => deal.clientId === matchedClient.id)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5)
      .map(deal => ({
        id: deal.id,
        name: deal.name,
        status: deal.status,
        value: deal.value,
        leadScore: deal.leadScore,
        leadSummary: deal.leadSummary,
        leadNextStep: deal.leadNextStep,
        comments: (deal.comments || []).slice(-5)
      }));

    try {
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ 
          command: `Draft a complete outbound email reply using CRM context, RAG, and product catalog.
Return JSON only with exactly these keys: "subject" and "body".
Subject seed: ${subject || "Follow up"}.
Purpose for this email: ${purpose || 'General follow up'}.
Use relevant product facts and knowledge base snippets when they help answer the customer or move the deal forward.
Only treat emails marked CUSTOMER_TO_US and lastReceivedEmailBody as customer intent. Emails marked OUR_TEAM_TO_CUSTOMER are prior outreach context and must never be interpreted as customer requests.
Before drafting, use the provided AI Customer Summary, AI next step, lead summaries, deal context, local RAG snippets, and product sales points. If those conflict with the raw email history, prioritize the latest inbound customer message and then CRM AI analysis.
Do not invent product specs, prices, delivery promises, compliance claims, or discounts not present in the provided context.
Do not include any email signature, sign-off block, sender name, company footer, or quoted original email. The app will append the selected signature and original email separately when sending.
Customer-facing output language: ${outboundLanguage}. This language was resolved by priority: last customer communication language > client preferred language > official country/region language > English.`,
          context: { 
            client: matchedClient,
            clientId: matchedClient.id,
            aiCustomerSummary: matchedClient.agentSummary || matchedClient.leadSummary || '',
            aiCustomerNextStep: matchedClient.agentNextStep || matchedClient.leadNextStep || '',
            aiCustomerScore: matchedClient.leadScore ?? null,
            relatedLeads: relatedDeals,
            outboundLanguage,
            clientPreferredLanguage: matchedClient.preferredLanguage || null,
            historicalFollowUpLogs: clientLogs,
            recentEmails: clientEmails,
            lastReceivedEmailBody: lastEmailReceived?.body || 'No previous received emails',
            productCatalog: productContext || 'No products configured',
            localKnowledgeBaseContext: knowledgeContext || 'No local knowledge snippets loaded'
          },
          llmConfig: getLLMConfig('drafting'),
          embeddingLlmConfig: getLLMConfig('agent_context_suggestions') || getLLMConfig('drafting'),
          skipKnowledgeBase: false
        })
      });
      const data = await res.json();
      if (data.result) incrementAgentHubTaskCount('email_draft_agent');
      const draft = parseAiEmailDraft(data.result || '');
      if (draft.subject) setSubject(draft.subject);
      else if (!subject) setSubject('Follow up');
      setBody(normalizeEmailEditorHtml(stripTrailingConfiguredSignature(draft.body || data.result || '')));
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex-1 flex flex-col bg-slate-900 animate-in fade-in duration-200", className)}>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
        <h3 className="font-bold text-white text-sm">New Message</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 border-b border-slate-800 space-y-2">
        <div className="flex items-start gap-3 w-full">
          <div className="flex-1 w-full">
            <AddressInput 
              label="To:" 
              value={recipient} 
              onChange={setRecipient} 
              placeholder="Type email or @name" 
              autoFocus 
            />
          </div>
          <div className="flex items-center gap-2 pt-1.5 shrink-0">
            {matchedClient && (
              <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                Matched: {matchedClient.name}
              </span>
            )}
            <button 
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-0.5"
            >
              Cc/Bcc {showCcBcc ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
          </div>
        </div>

        {showCcBcc && (
          <>
            <div className="flex-1 w-full">
              <AddressInput 
                label="Cc:" 
                value={cc} 
                onChange={setCc} 
                placeholder="Type email or @name" 
              />
            </div>
            <div className="flex-1 w-full">
              <AddressInput 
                label="Bcc:" 
                value={bcc} 
                onChange={setBcc} 
                placeholder="Type email or @name" 
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-3 pt-1 border-t border-transparent focus-within:border-indigo-500/30">
          <label className="text-xs font-bold text-slate-500 w-12 text-right">From:</label>
          <select 
            value={selectedOutboxId}
            onChange={(e) => setSelectedOutboxId(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none focus:ring-0 pb-1 w-full truncate"
          >
            {outboxConfigs.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.name} ({c.fromEmail})</option>
            ))}
            {outboxConfigs.length === 0 && <option value="" className="bg-slate-900">Default Backend Sender (me@soho.com)</option>}
          </select>
        </div>
        <div className="flex items-center gap-3 pt-1 border-t border-transparent focus-within:border-indigo-500/30">
          <label className="text-xs font-bold text-slate-500 w-12 text-right">Sign:</label>
          <select 
            value={selectedSignatureId}
            onChange={(e) => setSelectedSignatureId(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none focus:ring-0 pb-1 w-full truncate"
          >
            <option value="" className="bg-slate-900">None</option>
            {signatures.map(s => (
              <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 pt-1 border-t border-transparent focus-within:border-indigo-500/30">
          <label className="text-xs font-bold text-slate-500 w-12 text-right">Subject:</label>
          <input 
            type="text" 
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-600 font-medium pb-1" 
            placeholder="Enter subject here..." 
          />
          <button
            type="button"
            onClick={handleOptimizeSubject}
            disabled={loadingSubject}
            className="rounded-md border border-blue-500/30 bg-blue-500/10 p-1.5 text-blue-300 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            title={language === 'zh' ? 'AI 生成/优化主题' : 'Generate or improve subject with AI'}
          >
            {loadingSubject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col p-4 relative overflow-y-auto">
        <EmailRichTextEditor
          value={body}
          onChange={setBody}
          loading={loading}
          originalEmailBody={originalEmailBody}
          quotes={quotes}
          onOptimize={handleOptimizeBody}
          onInlineAI={handleInlineAICommand}
        />
        {attachments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group overflow-hidden border border-slate-700 rounded-md bg-slate-800 w-24 h-24 shrink-0 flex items-center justify-center">
                {att.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(att)} alt={att.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 p-2 text-center break-words">
                    <Paperclip className="w-5 h-5 mb-2 text-slate-500" />
                    <span className="truncate w-full line-clamp-2">{att.name}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{(att.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}
                <button 
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between pl-14">
          <label className="text-[10px] text-slate-500 uppercase font-bold">Follow-up Purpose</label>
          <button onClick={handleGeneratePurpose} disabled={loadingPurpose || !matchedClient} className="text-[10px] flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50">
             {loadingPurpose ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
             Auto-detect
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 w-12 text-right">Draft:</label>
          <input 
            type="text" 
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500" 
            placeholder="AI follow-up purpose (e.g., 'Remind them about the sample pricing')" 
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleMagicDraft} 
              disabled={loading || !recipient}
              className="text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors font-medium"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
              AI Draft Full Email
            </button>
            
            <button 
              onClick={() => setShowAttachmentModal(true)}
              className="text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors font-medium cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5"/>
              Attach
            </button>

            <button
              onClick={() => setTrackEmail(!trackEmail)}
              className={cn(
                "text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-medium",
                trackEmail 
                  ? "bg-emerald-950/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50" 
                  : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400 hover:bg-slate-700"
              )}
              title={trackEmail ? "Email tracking enabled" : "Email tracking disabled"}
            >
              <Radar className="w-3.5 h-3.5" />
              Track
            </button>
          </div>

          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowSchedule(!showSchedule)}
                disabled={!recipient || !emailHtmlHasContent(body)}
                className="text-sm bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500 text-slate-300 px-3 py-2 rounded-lg flex items-center shadow-lg transition-colors"
                title="Schedule Send"
              >
                <CalendarClock className="w-4 h-4" />
              </button>
              {showSchedule && (
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400">Select Date & Time</label>
                    <span className="text-[10px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap pl-2 text-right" title={timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}>
                      {timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={e => setScheduleDateTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setShowSchedule(false)} className="flex-1 text-xs py-1 text-slate-400 hover:text-white transition-colors">Cancel</button>
                    <button onClick={doSchedule} disabled={!scheduleDateTime} className="flex-1 text-xs py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-white font-medium transition-colors">Confirm</button>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={handleSaveDraft}
              className="text-sm border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-lg transition-colors"
            >
              Save Draft
            </button>
            <button 
              onClick={handleSend}
              disabled={!recipient || !emailHtmlHasContent(body)}
              className="text-sm font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-colors"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      </div>
      {showAttachmentModal && (
        <UploadAttachmentModal 
          onClose={() => setShowAttachmentModal(false)}
          onUpload={(files) => {
            setAttachments(prev => [...prev, ...files]);
            setShowAttachmentModal(false);
          }}
        />
      )}
    </div>
  );
}
