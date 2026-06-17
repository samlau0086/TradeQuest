import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../authStore';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';
import { getCustomerOutputLanguage } from '../../lib/language';
import { UploadAttachmentModal } from '../UploadAttachmentModal';
import {
  ComposeEmailAttachmentGallery,
  ComposeEmailFooter,
  ComposeEmailHeader,
  ComposeEmailRecipientSection,
} from './ComposeEmailSections';
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
      const subjectMatch = cleaned.match(/(?:^|\n)\s*Subject\s*:\s*(.+)/i);
      const bodyWithoutSubject = subjectMatch
        ? cleaned.replace(subjectMatch[0], '').replace(/^\s*Body\s*:\s*/i, '').trim()
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
      notify('Please enter a subject, body, or email purpose first.', 'warning');
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
      const nextSubject = String(data.result || '').replace(/^["']|["']$/g, '').replace(/^Subject\s*:\s*/i, '').trim();
      if (nextSubject) {
        setSubject(nextSubject);
        incrementAgentHubTaskCount('email_draft_agent');
      }
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : 'Failed to generate email subject.', 'error');
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
      <ComposeEmailHeader onClose={onClose} />
      <ComposeEmailRecipientSection
        recipient={recipient}
        onRecipientChange={setRecipient}
        matchedClientName={matchedClient?.name}
        showCcBcc={showCcBcc}
        onToggleCcBcc={() => setShowCcBcc(!showCcBcc)}
        cc={cc}
        onCcChange={setCc}
        bcc={bcc}
        onBccChange={setBcc}
        outboxConfigs={outboxConfigs}
        selectedOutboxId={selectedOutboxId}
        onSelectedOutboxIdChange={setSelectedOutboxId}
        signatures={signatures}
        selectedSignatureId={selectedSignatureId}
        onSelectedSignatureIdChange={setSelectedSignatureId}
        subject={subject}
        onSubjectChange={setSubject}
        onOptimizeSubject={handleOptimizeSubject}
        loadingSubject={loadingSubject}
        language={language}
      />
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
        <ComposeEmailAttachmentGallery
          attachments={attachments}
          onRemove={(index) => setAttachments(prev => prev.filter((_, i) => i !== index))}
        />
      </div>
      <ComposeEmailFooter
        purpose={purpose}
        onPurposeChange={setPurpose}
        onGeneratePurpose={handleGeneratePurpose}
        loadingPurpose={loadingPurpose}
        hasMatchedClient={!!matchedClient}
        onMagicDraft={handleMagicDraft}
        loadingDraft={loading}
        hasRecipient={!!recipient}
        onOpenAttachmentModal={() => setShowAttachmentModal(true)}
        trackEmail={trackEmail}
        onToggleTrackEmail={() => setTrackEmail(!trackEmail)}
        showSchedule={showSchedule}
        onToggleSchedule={() => setShowSchedule(!showSchedule)}
        canSchedule={!!recipient && emailHtmlHasContent(body)}
        scheduleDateTime={scheduleDateTime}
        onScheduleDateTimeChange={setScheduleDateTime}
        timezone={timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
        onCancelSchedule={() => setShowSchedule(false)}
        onConfirmSchedule={doSchedule}
        onSaveDraft={handleSaveDraft}
        onSend={handleSend}
        canSend={!!recipient && emailHtmlHasContent(body)}
      />
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

