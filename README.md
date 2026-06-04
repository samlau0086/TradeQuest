# Foreign Trade CRM (AI-Powered)

English | Chinese

## English

Foreign Trade CRM is an AI-powered CRM for foreign trade teams. It combines client and lead management, unified email and WhatsApp communication, product and quote workflows, knowledge-base RAG, lead acquisition, enrichment, gamification, dashboards, and an Agent Hub that can discover, route, review, and execute CRM work.

## Current System Overview

### Dashboard

- Shows pipeline health, acquisition funnel, email load, activity trend, user contribution heatmap, daily quests, level progress, EXP, and user activity.
- Includes a daily operating summary and improvement recommendations for the current user.
- The daily summary is generated once per day per user and system language. It uses the AI model mapped to the `analysis` module, with a local fallback summary if AI is unavailable.
- Chart hover data is available on activity trend points, email load segments, pipeline bars, and acquisition funnel bars.

### Clients, Leads, and Public Pool

- Clients, public lead pool, and lead board are grouped under the customer workspace.
- A customer can have multiple leads. Customer-level summaries and lead-level summaries are treated separately.
- Leads can have their own score, summary, next step, team comments, growth logs, stage, tags, and timeline.
- Leads and clients can be associated with multiple products through a searchable tag selector. This product context is used by lead acquisition, scoring, recommendations, quotes, and agent work.
- Contacts are first-class records under clients/leads. A customer can have multiple contacts, and contacts can have multiple communication methods.
- Key contact can be selected or changed.
- When an email address or WhatsApp number is not matched to an existing client, users can either create a New Lead or add the contact method to an existing client.
- Adding to an existing client supports three targets: key contact, another existing contact, or a newly created contact under that client.
- Client/lead details include two event views: Event Timeline for a vertical chronological timeline and Event List for a card-style event list.
- Public lead pool supports import, claim, delete, and superadmin bulk delete.
- Lead acquisition channels normalize imported fields such as country, city, state, email, phone, website, and company where the source provides them.
- Outscraper country aliases such as `United States of America` are normalized to `United States`.

### Unified Inbox

- Email and WhatsApp messages are integrated into one inbox.
- Inbox supports inbox, sent, drafts, scheduled messages, conversational view, customer grouping, tags, comments, and channel icons.
- Unmatched email senders/recipients and WhatsApp numbers provide both `New Lead` and `Add to Existing Client` actions.
- `Add to Existing Client` adds the current email/WhatsApp contact method to the selected client and the selected contact target, then links the message or conversation to that client.
- WhatsApp conversations are persisted in the CRM database and loaded incrementally.
- Deleted WhatsApp conversations/messages stay deleted locally and should not reappear unless new messages arrive or a new outbound message is sent.
- WhatsApp conversation identity is deduplicated across phone numbers and Hub chat IDs such as `@lid`, `@c.us`, and mapped chatId -> phone records, so the same conversation does not appear as multiple inbox items after sync.
- Clicking a WhatsApp item in the embedded inbox view scrolls directly to Agent Context & Suggestions instead of first jumping to the bottom of the chat.
- Email sync runs in the background even when the user is not inside the inbox. Default sync interval is 1 hour and can be configured per email server.
- Replying to an email uses the matching outbox mapping or the last used outbox server when available.
- Email composer uses a WYSIWYG editor, keeps line breaks, supports inserted images, and appends signatures at send time instead of placing signatures inside the draft body.
- Email tracking events are shown in reverse chronological order.
- Emails can be added to the knowledge base by extracting and summarizing the latest message text instead of storing raw HTML or quoted thread history.

### Live Chat Desk

- Live Chat Desk is a dedicated backend operator interface for website live chat conversations.
- Website visitors use public live-chat session APIs through a scoped API token. They can only create a session, send visitor messages, and read messages for that same session with a visitor token.
- CRM operators use authenticated APIs to view all live chat sessions, reply, tag sessions, close/reopen sessions, link sessions to clients, and trigger or pause the Live Chat Agent.
- Human takeover can be enabled per conversation. When takeover is active, the Live Chat Agent stops auto-replying until an operator releases or manually runs the agent again.
- Live Chat Agent is a built-in system agent. It can answer visitors with public-safe product/company context, collect contact information, qualify intent, and escalate sensitive or high-risk conversations to human operators.
- Live Chat Desk shows visitor basics such as IP, browser, language, operating system, timezone, and local time when the website widget provides or the server can infer them.
- When a live chat session is linked to a client, the conversation header shows the client's AI Customer Summary and Best Next Step below the tags.
- Incoming visitor messages can trigger Bark/Webhook notifications through the `Live chat message received` notification event.
- Security boundary: external visitors must never receive backend data, internal CRM notes, hidden prompts, API keys, database structure, other customer information, or private agent configuration.
- Website API tokens are generated and revoked in Settings -> API Tokens. Token templates include Live Chat Agent, Live Chat Public Only, Website Lead Capture, and Product Catalog Read.

### WhatsApp Actor Hub

- WhatsApp Actor Hub is integrated into the unified inbox instead of a separate navigation module.
- Supports multiple WhatsApp clients.
- CRM stores WhatsApp messages locally and uses WhatsApp Actor Hub as the sync source for new or recovered messages.
- Hub history recovery on client reconnect is supported by CRM overlap sync: CRM looks back from the latest local message before syncing, requests up to 500 Hub messages, and relies on upsert/deduplication to avoid duplicates.
- The default recovery lookback window is 30 days and can be configured with `WHATSAPP_HISTORY_RECOVERY_LOOKBACK_HOURS`.
- ChatId-to-phone mapping is supported for Hub conversations that arrive as chat IDs. In the WhatsApp message header, users can inline-edit the displayed chat ID into a phone number and confirm the mapping; CRM then calls the Hub mapping API and stores the resolved identity locally.
- Outbound local echoes and later Hub-synced copies are deduplicated by identity keys, client, body/media, and a short time window to prevent duplicate sent bubbles after switching conversations.
- Sending can use a selected client or a random client. After one message is sent to a customer, that customer is sticky to the last used client unless manually changed.
- Supports text, emoji, media, files, scheduled sending, and retry when the selected client is unavailable.
- Media messages preserve media metadata locally and render image/video previews when a usable media URL is available.
- Scheduled WhatsApp messages send immediately when a usable client becomes available after the scheduled time.
- AI agents can use WhatsApp tools according to the same client selection and quota rules.
- Automated WhatsApp outreach should consider send quota, reply rate, and account safety.
- WhatsApp inbound auto-translation is per WhatsApp number and defaults off. CRM checks browser cache first, then saved database translations, and only calls AI when no cached or persisted translation exists.
- WhatsApp outbound "Translate before send" is also per WhatsApp number. The target language is editable in the composer and is saved to the linked client's preferred language. Only the translated message is sent to WhatsApp Actor Hub; the original draft is stored inside CRM for display and audit.

### Products, Quotes, and Currency

- Products and quotes share one module with tabs.
- Product records support SKU, description, product images/files, pricing, tier pricing, inventory, and Sales Points.
- Product descriptions and Sales Points can be generated by AI.
- Quote workflows support product selection, payment terms, PDF generation, and customer-facing quote drafts.
- Client/lead forms and quote forms can select related products with a searchable multi-select control. When a quote is linked to a lead, the related client is resolved from that lead.
- Quotes support currency switching. USD is the default base currency.
- Settings can define currency exchange rates, add/delete currency rates, and update rates through a public exchange-rate API.
- Product tier pricing can be AI-assisted to optimize commercial value.

### Knowledge Base and RAG

- Knowledge base items store title, content, optional client association, and embedding vectors.
- RAG search uses global knowledge plus client-specific knowledge when a client context is available.
- Deleting a knowledge item hard-deletes both the content and the stored embedding from the same `knowledge_base` table.
- After deletion, future RAG searches will not retrieve that item.
- If knowledge update embedding generation fails, the content can update while the old embedding may remain; deleting does not have this issue.

### AI and Language Policy

- System language is configured in Settings.
- Internal AI outputs for CRM users should follow the system language.
- Customer-facing outputs such as email, WhatsApp, quotes, proposals, and external comments should follow this priority:
  1. Last communication language.
  2. Customer preferred language.
  3. Official language of the customer's country.
  4. English.
- AI model providers are configured in Settings -> AI & Integrations.
- Supported provider presets include OpenAI, OpenRouter, Gemini, and custom OpenAI-compatible endpoints.
- Functional modules can use different models, such as drafting, analysis, embedding, Agent Harness, prompt building, tool selection, context suggestions, WhatsApp drafting, and Global Agent.
- Default options avoid hard-coded Gemini assumptions when Gemini is not configured.
- Agent Context & Suggestions analyzes the current customer inbound message plus broader CRM context, including AI summaries, best next step, score, comments, activity logs, other-channel communication history, products, and RAG snippets.
- Outbound messages sent by the team are treated as background context only and are not used as evidence of customer intent.

## Agent Hub

Agent Hub is the central place for agent chat, agent fleet configuration, opportunity tasks, approvals, execution traces, and global coordination.

### System Agents

System agents are built-in, cannot be deleted, and have fixed names because the name represents the system role.

- Global Conversion Agent: coordinates acquisition and conversion across the CRM.
- Signal Scanner Agent: scans CRM signals and creates actionable opportunity tasks.
- Lead Data Agent: acquires, imports, enriches, deduplicates, and normalizes leads using product and knowledge context.
- Lead Scoring Agent: scores leads, generates lead summaries, and recommends best next steps.
- AI Follow-Up Agent: handles account-level follow-up recommendations and drafts.
- WhatsApp Inbox Agent: reads WhatsApp conversation context and suggests next actions.
- Context Suggestion Agent: analyzes email/WhatsApp context and suggests actions.
- Email Draft Agent: drafts customer-facing emails using CRM, product, and RAG context.
- WhatsApp Draft Agent: drafts WhatsApp-style messages using CRM, product, and RAG context.
- Live Chat Agent: handles website visitor live chat using public-safe context and hands off to human operators when needed.
- Agent Prompt Builder Agent: generates agent instructions from user goals, products, knowledge base, available tools, guardrails, and language policy.
- Agent Tool Selection Agent: selects tools for an agent from the tool registry based on the agent name and prompt.

System agents can be restored to default best-practice configuration from Agent Hub.

### Custom Agents

- Users can create, edit, activate, pause, and delete custom agents.
- Custom agents have instructions, tools, guardrails, schedule, event triggers, event scope, and execution policy.
- Tools are selected with a tool picker instead of free-form comma strings.
- AI can generate prompts and auto-select tools. Both operations are performed by system agents and increase their handled task counts.
- Agent names define role and purpose. Instructions define how the agent should behave, which context to inspect, idempotency rules, risk rules, and output format.

### Agent Chat

- Agent Hub opens to Agent Chat by default.
- Click an agent in the left list to chat with it.
- The chat panel shows user-friendly usage guidance for the selected agent instead of raw prompt text.
- `@` is used to reference customers/leads in the chat, not to select agents.
- Chat messages are persisted, ordered chronologically, and can be deleted or cleared.
- Agents can execute allowed tools from chat, show loading state while executing, return execution results in the chat, and display approval buttons inline when human review is required.

## Three-Layer Agent Mechanism

The system uses a three-layer mechanism to avoid requiring users to manually tell agents what to do every time.

### Layer 1: Signal Scanner

Signal Scanner Agent periodically scans CRM signals, such as:

- Unread inbound emails.
- Missing best next steps.
- Leads missing score or analysis.
- Long-inactive clients.
- High email tracking activity without follow-up.
- Failed or pending agent work.

It creates deduplicated opportunity tasks and recommends the responsible agent.

### Layer 2: Opportunity Inbox and Routing Policy

Opportunity tasks are collected in Agent Hub -> Opportunity Inbox.

Routing policy decides whether each opportunity should:

- Stay open for manual dispatch.
- Auto-dispatch.
- Enter human review.
- Auto-execute if risk and guardrails allow it.

Opportunity dedupe uses `dedupeKey`.

- Active opportunities with the same `dedupeKey` are not duplicated.
- Failed opportunities are reused instead of recreated.
- Completed or ignored opportunities are suppressed for 30 days, so the same customer/email thread does not keep creating repeated opportunity tasks.

### Layer 3: Execution Harness

Execution Harness executes the selected agent's workflow with traceable steps.

It records:

- Plan.
- Expected result.
- Actual result.
- Tool steps.
- Risk.
- Approval status.
- Execution time and completion time.

Execution output is shown as a timeline. By default only part of long step lists is shown, with a show-all option.

### How This Relates to Global Agent and Agent Harness

- Global Conversion Agent is the high-level strategist and coordinator.
- Signal Scanner discovers work.
- Opportunity Inbox queues and routes work.
- Execution Harness executes traceable workflows and approval-gated actions.
- Individual agents do the specialist work.

Older direct scheduled agent execution has been optimized to route through the opportunity mechanism first. This avoids conflicting execution paths and keeps scheduled work, event-triggered work, and manual work in one governance model.

## Agent Schedules and Event Triggers

Agents can be configured to run periodically:

- Every X seconds.
- Every X minutes.
- Every X hours.
- Every X days.
- Monthly on day X.
- Optional execution count limit.

Agents can also be triggered by events. Event trigger scope can be:

- Event subject only: operate only on the customer/lead/message that triggered the event. This is the default.
- Global: scan or operate across eligible records.

Background scheduled execution is handled by the backend scheduler. It does not require the browser page to stay open after the server is running.

## Idempotency and Duplicate Prevention

Many agent operations should not repeat when nothing changed.

- Lead scoring and lead analysis compare signatures of relevant lead/client state, comments, contacts, related emails, deals, workflow due state, and follow-up timing.
- Follow-up actions check recent CRM log markers and skip repeated work inside the idempotency window.
- Opportunity tasks suppress duplicate `dedupeKey` items while active and for 30 days after completed/ignored.
- Customer-facing send actions should avoid sending identical or near-identical content.
- Internal summaries and next steps are saved to the database so page refreshes do not revert AI-generated output.

## Agent Execution Policy

Agent Execution Policy controls what can auto-run and what requires review.

Recommended defaults:

- Auto: internal enrichment, internal comments, lead prioritization, pipeline review, low-risk summaries.
- Review: customer-facing email, WhatsApp, quotes, proposals, stage updates, campaign execution, customer reply handling, and high-risk actions.

If AI planning fails, safe fallback plans are generated for review and are not auto-executed.

## Agent Tool Reference

Use these tool identifiers when configuring agents in Agent Hub.

| Tool | Description |
| --- | --- |
| `global_agent.plan` | Generate cross-system acquisition and conversion plans. |
| `signal.scan` | Scan CRM signals and create opportunity tasks. |
| `opportunity.create` | Create an Agent Hub opportunity task. |
| `opportunity.dispatch` | Dispatch an opportunity to the recommended agent. |
| `lead.acquire` | Retrieve external lead data from configured channels. |
| `lead.read` | Read lead profile, score, comments, logs, and activity. |
| `lead.create` | Create a CRM lead. |
| `lead.update` | Update lead fields, score, summary, next step, tags, or stage. |
| `lead.delete` | Delete or archive a lead. |
| `lead.comment` | Add lead-level internal comments. |
| `lead.log` | Add lead-level growth logs or timeline events. |
| `lead.stage` | Move a lead through the lead pipeline. |
| `lead.tag` | Add, update, or remove lead tags. |
| `lead.enrich` | Enrich lead data from configured channels. |
| `lead.analyze` | Analyze a lead or client using CRM, messages, products, and RAG. |
| `lead.score` | Score lead quality and conversion potential. |
| `public_pool.import` | Import acquired leads into the public pool. |
| `public_pool.delete` | Delete public pool leads. |
| `client.read` | Read client profile, contacts, preferences, comments, and activity. |
| `client.create` | Create a client or convert a qualified lead into a client. |
| `client.update` | Update client fields, contacts, preferences, ownership, or tags. |
| `client.delete` | Delete, archive, or move a client out of active CRM. |
| `client.comment` | Add client-level internal comments. |
| `client.log` | Add client-level growth logs or timeline events. |
| `client.stage` | Update client pipeline stage. |
| `client.tag` | Add, update, or remove client tags. |
| `client.dedupe` | Detect duplicate clients or leads. |
| `contact.read` | Read contacts and communication methods. |
| `contact.create` | Create contacts under a client or lead. |
| `contact.update` | Update contact details or key-contact status. |
| `contact.delete` | Delete contacts or contact methods. |
| `data.normalize` | Normalize imported lead data, countries, contact methods, and tags. |
| `client.summarize` | Generate or update internal client summaries. |
| `next_step.recommend` | Recommend the best next action. |
| `email.read` | Read inbox, sent, scheduled, draft, and thread emails. |
| `email.draft` | Create or update an email draft. |
| `email.subject` | Generate or optimize an email subject. |
| `email.schedule` | Schedule an email send. |
| `email.send` | Send an email through configured outbox rules. |
| `email.delete` | Delete or archive email records. |
| `email.tag` | Add, update, or remove email tags. |
| `email.comment` | Add internal comments to emails. |
| `email.reply` | Draft, schedule, or send replies in an email thread. |
| `whatsapp.read` | Read WhatsApp conversation history. |
| `whatsapp.draft` | Draft WhatsApp-style messages. |
| `whatsapp.send` | Send or schedule WhatsApp messages through Actor Hub. |
| `conversation.tag` | Add or update conversation tags. |
| `conversation.comment` | Add conversation comments. |
| `live_chat.read` | Read website live chat sessions and messages. |
| `live_chat.reply` | Reply to a live chat visitor using public-safe context. |
| `live_chat.escalate` | Mark a live chat for human takeover or priority review. |
| `live_chat.tag` | Add or update live chat session tags. |
| `product.read` | Read products, SKUs, descriptions, Sales Points, prices, and tiers. |
| `product.create` | Create product catalog items. |
| `product.update` | Update product catalog items, prices, media, or tiers. |
| `product.delete` | Delete product catalog items. |
| `product.describe` | Generate or improve product descriptions. |
| `product.sales_points` | Generate product Sales Points. |
| `product.pricing` | Generate or optimize tier pricing. |
| `knowledge.search` | Search global or client-specific knowledge for RAG. |
| `knowledge.read` | Read knowledge base items. |
| `knowledge.create` | Create knowledge base items. |
| `knowledge.update` | Update knowledge base items and embeddings. |
| `knowledge.delete` | Delete knowledge base items and embeddings. |
| `quote.create` | Create quote drafts for review. |
| `quote.update` | Update quote details, products, payment terms, or currency. |
| `quote.delete` | Delete quote drafts. |
| `quote.currency` | Convert quote currency using configured exchange rates. |
| `media.read` | Read media library assets. |
| `media.attach` | Attach media/files to WhatsApp or email drafts. |
| `comment.delete_request` | Request deletion of team comments through approval. |
| `growth_log.delete` | Delete lead/client growth logs when permitted. |

Global Agent action types used by Agent Execution Policy:

`create_lead_campaign`, `run_lead_campaign`, `create_followup_workflow`, `process_customer_reply`, `send_email`, `send_whatsapp`, `update_client_stage`, `add_client_comment`, `enrich_client_data`, `create_deal`, `create_quote`, `prioritize_leads`, `review_pipeline`.

## Agent Tool Executor Roadmap

Agent Harness now has concrete backend executors for non-delete write tools such as `email.tag`, `email.comment`, `product.create`, `product.update`, `knowledge.create`, `knowledge.update`, `client.create`, `client.tag`, `lead.create`, and `lead.tag`.

The main remaining executor gaps are destructive delete/archive tools:

- `email.delete`.
- `product.delete`.
- `knowledge.delete`.
- `client.delete`.
- `lead.delete`.

These delete actions should be connected gradually with explicit risk checks, approval policy support, audit logs, and recovery or rollback rules.

Additional roadmap items:

- Telegram Bot intelligent customer service: integrate Telegram Bot as a customer-service channel, support AI-powered auto-replies, conversation history, customer/lead linking, and human takeover so an operator can pause AI handling and continue the conversation manually.

## Lead Acquisition and Enrichment Channels

The system can be configured to use these channels:

- Apify.
- PhantomBuster.
- Scrap.io.
- HasData.
- Decodo.
- Clay.
- Outscraper.

Each channel can be tested from settings where supported. Lead acquisition should use product data, knowledge base content, and historical customer profiles to choose target industries, roles, countries, and keywords.

## Notifications

The system supports user-friendly notifications instead of blocking browser alerts.

Notification channels can include:

- In-app notifications.
- Bark.
- Webhook.

Typical notification events:

- New email received.
- New WhatsApp message received.
- New Live Chat visitor message received.
- Agent action requires review.
- Agent execution fails.
- Scheduled send is delayed or resumed.
- Daily operating summary.
- Long inactive login reminder.

## Public Live Chat API

The public live chat API is intentionally narrow so a website visitor cannot access CRM backend data. Public endpoints do not accept CRM auth tokens and do not expose clients, logs, internal notes, prompts, or settings.

Before embedding the widget, create a scoped website API token in Settings -> API Tokens. Use the `Live Chat Agent` template for normal AI-powered live chat. The website frontend sends this value as `apiToken`; it should never send a CRM `userId`.

Recommended website widget flow:

1. Create a session when the visitor opens the chat widget.
2. Store the returned `session.id` and `token` in browser storage for that visitor.
3. Connect Socket.IO with `session.id` and the visitor `token` for realtime messaging.
4. Send visitor messages over Socket.IO. Keep REST send/read endpoints as fallback if the socket is unavailable.
5. If the visitor refreshes the website, reuse the stored `session.id` and `token`.

### Create Public Session

`POST /api/live-chat/public/sessions`

Request:

```json
{
  "apiToken": "tq_generated_website_api_token",
  "visitorName": "Alex Chen",
  "visitorEmail": "alex@example.com",
  "visitorPhone": "+1 555 0100",
  "pageUrl": "https://example.com/products/solar-monitoring",
  "metadata": {
    "source": "website-widget",
    "utmCampaign": "solar-demo",
    "browserLanguage": "en-US",
    "timezone": "America/Los_Angeles",
    "localTime": "2026-06-04T03:00:00-07:00"
  }
}
```

Response:

```json
{
  "session": {
    "id": "lc_1780000000000_12345",
    "clientId": null,
    "visitorName": "Alex Chen",
    "visitorEmail": "alex@example.com",
    "visitorPhone": "+1 555 0100",
    "pageUrl": "https://example.com/products/solar-monitoring",
    "status": "open",
    "priority": "normal",
    "humanTakeover": false,
    "assignedAgentId": "live_chat_agent",
    "tags": [],
    "lastMessageAt": "2026-06-04T10:00:00.000Z",
    "createdAt": "2026-06-04T10:00:00.000Z",
    "updatedAt": "2026-06-04T10:00:00.000Z",
    "lastMessage": null
  },
  "token": "visitor-session-token"
}
```

Notes:

- `apiToken` identifies the CRM owner and the allowed public permissions. Use a token generated in Settings -> API Tokens.
- The token must include `live_chat.public`. The `Live Chat Agent` template includes `live_chat.public` and `live_chat.agent`.
- Do not expose CRM user IDs in website code.
- `token` is the visitor session token returned by this endpoint. The website widget must store it locally and send it with future requests or Socket.IO auth.
- If `visitorEmail` matches an existing client contact, CRM may link the session to that client internally, but public responses still do not reveal client details.
- CRM stores visitor environment details in `session.metadata.visitorInfo`. The server infers IP, User-Agent, browser, and operating system from request headers where possible. The website widget can also send browser language, timezone, and local time in `metadata`.
- When a visitor sends a live chat message through REST or Socket.IO, CRM can send Bark/Webhook notifications if `Live chat message received` is enabled in Settings -> Bark / Webhook Notifications.

### Realtime Socket.IO Transport

The recommended realtime transport is Socket.IO at `/socket.io`. REST remains available for session creation, history reload, and fallback delivery.

Visitor auth:

```js
import { io } from "socket.io-client";

const socket = io("https://crm.example.com", {
  path: "/socket.io",
  transports: ["websocket", "polling"]
});

socket.emit("live_chat:visitor_auth", {
  sessionId: "lc_1780000000000_12345",
  visitorToken: "visitor-session-token"
}, (response) => {
  if (!response.ok) console.error(response.error);
});
```

Visitor sends a message:

```js
socket.emit("live_chat:visitor_message", {
  body: "Hi, do you support solar plant monitoring for multiple sites?"
}, (response) => {
  console.log(response.message, response.agentMessage);
});
```

Receive realtime messages and session updates:

```js
socket.on("live_chat:message", (message) => {
  // Append by message.id to avoid duplicates.
});

socket.on("live_chat:session_updated", (session) => {
  // Refresh status, priority, humanTakeover, tags, and lastMessage.
});
```

Operator socket auth uses the CRM login JWT:

```js
socket.emit("live_chat:operator_auth", { token: crmJwt });
socket.emit("live_chat:join_session", { sessionId: "lc_1780000000000_12345" });
socket.emit("live_chat:operator_message", {
  sessionId: "lc_1780000000000_12345",
  body: "Thanks, I can help with that."
});
```

### Send Visitor Message

`POST /api/live-chat/public/sessions/:id/messages`

Request:

```json
{
  "token": "visitor-session-token",
  "senderName": "Alex Chen",
  "body": "Hi, do you support solar plant monitoring for multiple sites?"
}
```

Response:

```json
{
  "message": {
    "id": "lcm_1780000001000_10001",
    "sessionId": "lc_1780000000000_12345",
    "role": "visitor",
    "senderName": "Alex Chen",
    "body": "Hi, do you support solar plant monitoring for multiple sites?",
    "metadata": {},
    "createdAt": "2026-06-04T10:00:01.000Z"
  },
  "agentMessage": {
    "id": "lcm_1780000002000_10002",
    "sessionId": "lc_1780000000000_12345",
    "role": "agent",
    "senderName": "Live Chat Agent",
    "body": "Yes. Our team can help with multi-site solar monitoring. Could you share the number of sites and whether you need device-level or plant-level reporting?",
    "metadata": {
      "source": "live_chat_agent",
      "escalate": false,
      "reason": ""
    },
    "createdAt": "2026-06-04T10:00:02.000Z"
  }
}
```

Notes:

- When `humanTakeover` is active or the session is closed, `agentMessage` may be `null`.
- The Live Chat Agent uses only public-safe company/product context for visitor-facing replies.
- Sensitive requests should be escalated to an operator instead of answered with internal CRM data.

### Read Public Session Messages

`GET /api/live-chat/public/sessions/:id/messages?token=visitor-session-token`

Response:

```json
[
  {
    "id": "lcm_1780000001000_10001",
    "sessionId": "lc_1780000000000_12345",
    "role": "visitor",
    "senderName": "Alex Chen",
    "body": "Hi, do you support solar plant monitoring for multiple sites?",
    "metadata": {},
    "createdAt": "2026-06-04T10:00:01.000Z"
  },
  {
    "id": "lcm_1780000002000_10002",
    "sessionId": "lc_1780000000000_12345",
    "role": "agent",
    "senderName": "Live Chat Agent",
    "body": "Yes. Our team can help with multi-site solar monitoring...",
    "metadata": {
      "source": "live_chat_agent",
      "escalate": false
    },
    "createdAt": "2026-06-04T10:00:02.000Z"
  }
]
```

### Authenticated Operator APIs

These endpoints require `Authorization: Bearer <crm-token>`.

List sessions:

```http
GET /api/live-chat/sessions
Authorization: Bearer <crm-token>
```

Read one session:

```http
GET /api/live-chat/sessions/lc_1780000000000_12345/messages
Authorization: Bearer <crm-token>
```

Send an operator reply and automatically enter human takeover:

```http
POST /api/live-chat/sessions/lc_1780000000000_12345/messages
Authorization: Bearer <crm-token>
Content-Type: application/json
```

```json
{
  "body": "Thanks Alex, I can help. How many PV sites are you managing now?"
}
```

Update session status, tags, priority, linked client, or human takeover:

```http
PATCH /api/live-chat/sessions/lc_1780000000000_12345
Authorization: Bearer <crm-token>
Content-Type: application/json
```

```json
{
  "status": "open",
  "priority": "high",
  "humanTakeover": true,
  "clientId": "c1779272244237",
  "tags": ["demo-request", "solar"]
}
```

Manually release takeover and ask the Live Chat Agent to reply:

```http
POST /api/live-chat/sessions/lc_1780000000000_12345/agent-reply
Authorization: Bearer <crm-token>
```

Response:

```json
{
  "message": {
    "id": "lcm_1780000003000_10003",
    "sessionId": "lc_1780000000000_12345",
    "role": "agent",
    "senderName": "Live Chat Agent",
    "body": "Could you share your target deployment country and monitoring requirements?",
    "metadata": {
      "source": "live_chat_agent",
      "escalate": false
    },
    "createdAt": "2026-06-04T10:00:03.000Z"
  }
}
```

### Security Boundary

- Public endpoints are CORS-enabled only for the live chat path and require the visitor session token.
- Public session creation requires a scoped API token with `live_chat.public`.
- API tokens keep a server-side hash for authentication and are also shown in Settings -> API Tokens so operators can copy active integration keys when needed.
- Visitor tokens must be treated like session secrets and should not be logged in public analytics.
- Public responses never include CRM clients, internal comments, growth logs, RAG raw documents, agent prompts, API keys, or settings.
- Operator APIs require CRM authentication and should be used only inside the Live Chat Desk.

## Recent Functional Notes / 近期功能说明

### English

- Event records in client/lead details support two tabs: `Event Timeline` and `Event List`.
- `Event Timeline` shows events as a vertical time axis. `Event List` keeps the card/list-style view.
- Unmatched email addresses and WhatsApp numbers support both `New Lead` and `Add to Existing Client`.
- `Add to Existing Client` can add the contact method to the key contact, a selected existing contact, or a newly created contact under the selected client.
- WhatsApp messages are persisted in the CRM database. WhatsApp Actor Hub is used as the sync source, including recovered history after a client reconnects.
- CRM sync uses a recovery lookback window and upsert/deduplication so recovered Hub messages can be imported without duplicating existing local messages.
- Hub chat IDs such as `@lid` and `@c.us` are kept as chat IDs until an explicit chatId -> phone mapping exists. Once mapped, inbox sync and conversation rendering resolve the conversation to the phone identity.
- WhatsApp sent-message duplicates are suppressed across local optimistic messages and later Hub-synced messages by comparing contact identity, client, body/media metadata, and a short time window.
- WhatsApp inbound auto-translation is scoped by WhatsApp number and uses browser cache -> database -> AI fallback.
- WhatsApp outbound pre-send translation is scoped by WhatsApp number. The translated text is sent to Hub, while the original draft is stored only in CRM as an outbound-original translation record.
- The embedded inbox WhatsApp view scrolls directly to Agent Context & Suggestions when a conversation is opened. Standalone WhatsApp chat views can still auto-scroll to the latest message.
- Leads, clients, public-pool imports, deals, and agent-created leads can persist related product IDs, so product context can flow into scoring, acquisition, quotes, and AI recommendations.
- Agent Context & Suggestions reads the current inbound message together with customer profile, AI summary, best next step, score, comments, logs, other-channel history, products, and RAG context.
- Team outbound messages are only background context. They should not be interpreted as customer intent.

### 中文

- 客户/线索详情中的事件记录支持两个 Tab：`Event Timeline` 和 `Event List`。
- `Event Timeline` 使用纵向时间轴展示事件；`Event List` 保留卡片式列表视图。
- 未匹配到客户的邮箱地址或 WhatsApp 号码，同时支持 `New Lead` 和 `Add to Existing Client`。
- `Add to Existing Client` 可以把当前联系方式添加到 Key Contact、某个已有联系人，或在选定客户下新建联系人。
- WhatsApp 消息会保存到 CRM 数据库；WhatsApp Actor Hub 作为同步来源，包括 client 恢复连接后补拉的历史消息。
- CRM 同步会使用恢复回看窗口，并通过 upsert/去重避免恢复消息重复入库。
- 对于 `@lid`、`@c.us` 等 Hub chatId，系统会先保留为 chatId；只有在明确建立 chatId -> 手机号映射后，收件箱同步和对话展示才会解析到手机号身份。
- WhatsApp 已发送消息会在本地乐观消息和 Hub 后续同步消息之间做去重，去重依据包括联系人身份、发送 client、正文/媒体信息和短时间窗口。
- WhatsApp 入站自动翻译按 WhatsApp 号码独立配置，读取顺序为浏览器缓存 -> 数据库 -> AI 兜底生成。
- WhatsApp 发送前翻译也按 WhatsApp 号码独立配置。发送给 Hub 的只有翻译后的内容，用户原始输入只保存在 CRM 内部，作为 outbound original 翻译记录展示和审计。
- 收件箱内嵌 WhatsApp 视图打开对话时会直接跳到“智能体上下文与建议”；独立 WhatsApp 聊天窗口仍可自动滚动到最新消息。
- Lead、客户、公海导入、Deal 和 Agent 创建的线索都可以持久化关联产品 ID，让产品上下文进入评分、获客、报价和 AI 推荐流程。
- 智能体上下文与建议会读取当前客户入站消息，同时结合客户资料、AI 摘要、最佳下一步、评分、评论、日志、其他渠道沟通历史、产品和 RAG 上下文。
- 我方发送的 outbound 消息只作为背景上下文，不应被解释为客户意图。

## Deployment

### Local Development

Install dependencies:

```bash
npm install --legacy-peer-deps
```

Run type check:

```bash
npm run lint
```

Start development server:

```bash
npm run dev
```

### Docker / VPS Deployment

The project includes Docker-based deployment support.

The deployment workflow:

1. Checks out the repository.
2. Syncs files to the VPS.
3. Runs `docker compose down`.
4. Runs `docker compose up -d --build`.

If Docker build fails with a snapshot/parent layer error, it is usually a Docker/buildkit cache issue on the VPS rather than a TypeScript build error. Clean Docker builder/cache on the server and rerun deployment.

### Database

The backend initializes required PostgreSQL tables and migrations on startup where implemented.

Important tables include:

- `users`
- `clients`
- `deals`
- `emails`
- `email_tracking`
- `logs`
- `knowledge_base`
- `products`
- `quotes`
- WhatsApp-related message/conversation tables
- Settings/state stored in user settings

Recent schema/state additions:

- `clients.product_ids`: JSON array of related product IDs for client/lead product context.
- `deals.product_ids`: JSON array of related product IDs for quote/deal product context.
- `whatsapp_message_translations.kind`: distinguishes inbound translations from outbound original-message records.
- `whatsapp_message_translations.target_language`: stores the customer-facing language used for outbound pre-send translation.
- `live_chat_sessions`: website live chat conversations, visitor identity, client link, status, tags, and human takeover state.
- `live_chat_messages`: visitor, agent, operator, and system messages for live chat sessions.
- `api_tokens`: hashed website/API integration tokens with scoped permissions, token templates, revoke state, and last-used tracking.
- User settings include WhatsApp-only translation state such as `whatsappAutoTranslateConfig` and `whatsappOutboundAutoTranslateConfig`.

For a fresh server, deployment should start the app and initialize schema, but production migration should still include database backups and verification.

## Technology Stack

- Frontend: React, TypeScript, Tailwind CSS, Zustand, Lucide Icons.
- Backend: Express.js, PostgreSQL, JWT, bcrypt.
- AI: OpenAI-compatible API, OpenRouter, Gemini, embeddings, RAG.
- Communication: Email servers, WhatsApp Actor Hub.
- Build: Vite, esbuild, Docker.

---

## 中文

Foreign Trade CRM 是一套面向外贸团队的 AI CRM。系统把客户/线索管理、统一邮件和 WhatsApp 收件箱、产品与报价、知识库 RAG、获客、数据富集、积分激励、仪表盘和 Agent Hub 整合在一起，用来帮助团队持续发现机会、跟进客户并提升转化。

## 当前系统概览

### 仪表盘

- 展示客户管线、获客漏斗、邮件负载、活动趋势、用户贡献图、每日任务、等级进度、EXP 和用户活动情况。
- 提供当前用户的每日运营摘要和提升建议。
- 每个用户、每种系统语言每天只生成一次摘要。优先使用 `analysis` 模块绑定的 AI 模型；如果 AI 不可用，则生成安全的本地摘要。
- 图表支持鼠标悬停数据，包括活动趋势点、邮件负载区块、管线条形图和获客漏斗。

### 客户、线索与公海

- 客户、公海线索池和线索看板整合在客户工作区，通过 Tab 切换。
- 一个客户可以有多个 leads。客户级摘要和 lead 级摘要分开处理。
- Lead 拥有独立的评分、摘要、最佳下一步、团队评论、Growth Logs、阶段、标签和时间线。
- Lead 和客户可以通过可搜索的标签选择器关联多个产品。该产品上下文会用于获客、评分、推荐、报价和 Agent 执行。
- 联系人是独立模块。一个客户可以有多个联系人，一个联系人可以有多种联系方式。
- Key Contact 可以手动指定或修改。
- 公海线索池支持导入、认领、删除，超级管理员支持批量删除。
- 获客渠道导入时会尽量标准化国家、城市、省份、邮箱、电话、网址、公司名等字段。
- Outscraper 导入的 `United States of America` 会标准化为 `United States`。

### 统一收件箱

- 邮件和 WhatsApp 消息整合在同一个收件箱。
- 支持收件、已发送、草稿、定时发送、会话视图、按客户分组、标签、评论和渠道图标。
- WhatsApp 对话会固化到 CRM 数据库，并增量同步。
- 已删除的 WhatsApp 对话/消息不会因为重新进入收件箱而恢复；除非收到新消息或再次主动发消息。
- WhatsApp 会按手机号、Hub chatId（如 `@lid`、`@c.us`）以及已建立的 chatId -> 手机号映射做会话身份去重，避免同步后同一会话变成多个收件箱条目。
- 在收件箱内嵌 WhatsApp 视图中点击会话时，会直接跳转到“智能体上下文与建议”，不会先跳到聊天底部。
- 邮件会在后台定期同步，即使用户没有打开 Inbox。默认每 1 小时同步一次，可在 Email Servers 中为每个邮箱配置同步间隔。
- 回复邮件时会优先使用收发服务器映射或该会话上次使用的发件服务器。
- 写邮件使用 WYSIWYG 编辑器，保留换行，支持插入图片；邮件签名在发送时拼接，避免 AI 覆盖或重复生成签名。
- 邮件追踪记录按时间倒序显示。
- 邮件添加到知识库时，只提取并总结最新邮件文本，不保存原始 HTML 或历史引用邮件。

### Live Chat 座席

- Live Chat Desk 是独立的后台座席界面，用来处理网站前端 live chat 会话。
- 网站访客通过受限 API Token 使用公开 live chat session API：创建会话、发送访客消息，以及通过 visitor token 读取自己会话内的消息。
- CRM 座席使用登录后的受保护 API 查看全部 live chat 会话、回复、打标签、关闭/重新打开会话、关联客户，以及触发或暂停 Live Chat Agent。
- 每个会话都支持人工接管。人工接管开启后，Live Chat Agent 会停止自动回复，直到座席释放接管或手动运行 Agent。
- Live Chat Agent 是系统级内置 Agent，可使用对外安全的产品/公司上下文回答访客问题、收集联系方式、判断意向，并把敏感或高风险会话升级给人工座席。
- Live Chat Desk 会展示访客基础信息，例如 IP、浏览器、语言、操作系统、时区和当地时间；这些信息可由网站组件传入，也可由服务端从请求头推断。
- 如果 live chat 会话已关联客户，会话顶部会在标签下方显示该客户的 AI Customer Summary 和 Best Next Step。
- 收到访客 live chat 消息时，可通过 `收到 Live Chat 消息` 通知事件触发 Bark/Webhook 通知。
- 安全边界：外部访客不能获取后端数据、内部 CRM 备注、隐藏 Prompt、API Key、数据库结构、其他客户信息或私有 Agent 配置。
- 网站 API Token 可在 Settings -> API Tokens 中生成和吊销。权限模板包括 Live Chat Agent、Live Chat Public Only、Website Lead Capture 和 Product Catalog Read。

### WhatsApp Actor Hub

- WhatsApp Actor Hub 已整合到统一收件箱，不再作为独立导航模块。
- 支持多 WhatsApp client。
- CRM 会保存 WhatsApp 消息，并将 WhatsApp Actor Hub 作为新增消息和恢复消息的同步来源。
- 当 Hub 会话以 chatId 形式出现时，支持 chatId -> 手机号映射。用户可在 WhatsApp 消息框顶部双击 chatId 进行 inline edit，确认后 CRM 会调用 Hub 映射接口并在本地保存解析后的身份。
- 本地发送后的乐观消息和 Hub 后续同步回来的同一条消息会按身份、client、正文/媒体和短时间窗口去重，避免切换会话后出现重复气泡。
- 发送时可以选择指定 client 或随机 client。首次向客户发送后，该客户默认固定使用最后一次发送所用 client，除非手动切换。
- 支持文本、emoji、媒体、文件、定时发送，以及 client 不可用时的延迟重试。
- 媒体消息会在本地保留媒体元数据，并在有可用媒体 URL 时显示图片/视频预览。
- 定时 WhatsApp 如果到点无可用 client，会在后续有可用 client 或指定 client 上线时立即发送。
- AI Agent 可以按照同样的 client 选择和 quota 规则调用 WhatsApp。
- 自动化 WhatsApp 触达需要考虑发送配额、回复率和账号安全。
- WhatsApp 入站自动翻译按 WhatsApp 号码独立配置，默认关闭。系统会先查浏览器缓存，再查数据库翻译记录，仍没有时才调用 AI。
- WhatsApp 发送前翻译同样按 WhatsApp 号码独立配置。目标语言可在消息框中修改，并同步保存到已关联客户的 Preferred Language。发送给 WhatsApp Actor Hub 的只有翻译后的内容，原始输入仅保存在 CRM 内用于展示和审计。

### 产品、报价与货币

- 产品和报价合并到同一个模块，通过 Tab 切换。
- 产品支持 SKU、描述、图片/文件、价格、阶梯价格、库存和 Sales Points。
- 产品描述和 Sales Points 可由 AI 生成。
- 报价支持产品选择、付款条款、PDF 生成和客户可见报价草稿。
- 客户/Lead 表单和报价表单支持通过可搜索多选控件关联产品。报价关联 Lead 时，会自动解析并关联该 Lead 所属客户。
- 报价支持货币切换，默认以美元为基础货币。
- Settings 中可以配置汇率，添加/删除货币，并通过公共汇率接口更新。
- 产品阶梯价格可通过 AI 辅助生成，以优化商业价值。

### 知识库与 RAG

- 知识库条目包含标题、内容、可选客户关联和 embedding 向量。
- RAG 会检索全局知识库；有客户上下文时也会检索客户专属知识。
- 删除知识库条目时，会从同一张 `knowledge_base` 表中硬删除内容和 embedding。
- 删除后，后续 RAG 不会再检索到该条知识。
- 如果更新知识库时 embedding 生成失败，正文可能已更新但旧 embedding 仍保留；删除操作没有这个问题。

### AI 与语言策略

- 系统语言在 Settings 中配置。
- 面向内部 CRM 用户的 AI 输出应使用系统语言。
- 面向客户的内容，例如邮件、WhatsApp、报价、方案和外部备注，应按以下优先级选择语言：
  1. 最近一次沟通语言。
  2. 客户 preferred language。
  3. 客户所在国家官方语言。
  4. 英文。
- AI Provider 在 Settings -> AI & Integrations 中配置。
- 支持 OpenAI、OpenRouter、Gemini 和自定义 OpenAI-compatible endpoint。
- 不同功能模块可以指定不同模型，例如 drafting、analysis、embedding、Agent Harness、Prompt Builder、Tool Selection、Context Suggestions、WhatsApp Drafting 和 Global Agent。
- 默认选项不会强制依赖 Gemini。

## Agent Hub

Agent Hub 是系统的智能体中心，负责 Agent Chat、Agent 队列配置、机会任务、人工审核、运行记录和全局协同。

### 系统 Agent

系统 Agent 内置且不可删除，名称不可修改，因为名称代表系统角色定位。

- Global Conversion Agent：统筹 CRM 获客与转化。
- Signal Scanner Agent：扫描 CRM 信号并创建机会任务。
- Lead Data Agent：基于产品、知识库和客户画像获取、导入、富集、去重和标准化线索。
- Lead Scoring Agent：为 lead 评分，生成 lead 摘要和最佳下一步。
- AI Follow-Up Agent：生成客户跟进建议和邮件/WhatsApp 草稿。
- WhatsApp Inbox Agent：读取 WhatsApp 对话上下文并建议下一步。
- Context Suggestion Agent：分析邮件/WhatsApp 上下文并给出建议。
- Email Draft Agent：结合 CRM、产品和 RAG 起草邮件。
- WhatsApp Draft Agent：结合 CRM、产品和 RAG 起草 WhatsApp 风格消息。
- Live Chat Agent：处理网站访客 live chat，并在需要时转交人工座席。
- Agent Prompt Builder Agent：根据用户目标、产品、知识库、工具、护栏和语言策略生成 Agent 指令。
- Agent Tool Selection Agent：根据 Agent 名称和 Prompt 从工具注册表中选择工具。

系统 Agent 支持一键恢复默认最佳实践配置。

### 自定义 Agent

- 用户可以创建、编辑、启动、暂停和删除自定义 Agent。
- 自定义 Agent 包含指令、工具、护栏、定期运行、事件触发、事件作用范围和执行策略。
- 工具通过工具选择器配置，不再手动输入逗号字符串。
- AI 可以生成 Prompt，也可以自动选择工具。这两个动作由系统 Agent 完成，并会增加对应系统 Agent 的已处理任务数。
- Agent 名称定义角色，Prompt/指令定义行为、上下文检查、幂等规则、风险规则和输出格式。

### Agent Chat

- Agent Hub 默认打开 Agent Chat。
- 点击左侧 Agent 即可与该 Agent 对话。
- 聊天窗口会显示该 Agent 的用户友好使用说明，而不是直接展示原始 Prompt。
- `@` 用于引用客户/线索，不用于选择 Agent。
- 聊天记录会持久化，按时间顺序显示，并支持删除和清空。
- Agent 可以在聊天中调用自己有权限的工具，执行时显示 loading，完成后在聊天中反馈结果；如需审核，会在对应聊天窗口内显示审核按钮。

## 三层 Agent 机制

系统使用三层机制，让 Agent 能主动发现任务，而不是每次都等用户手动下指令。

### 第一层：Signal Scanner

Signal Scanner Agent 会定期扫描 CRM 信号，例如：

- 未读入站邮件。
- 缺少最佳下一步。
- Lead 缺少评分或分析。
- 长期未跟进客户。
- 多次邮件打开/点击但未跟进。
- 失败或待处理的 Agent 工作。

它会创建去重后的机会任务，并推荐负责 Agent。

### 第二层：机会任务与路由策略

机会任务集中在 Agent Hub -> 机会任务中。

路由策略决定每个机会任务：

- 保留为手动派发。
- 自动派发。
- 进入人工审核。
- 在风险和护栏允许时自动执行。

机会任务通过 `dedupeKey` 去重。

- 活跃机会任务不会重复创建。
- 失败机会任务会复用，不再新建副本。
- 已完成或已忽略的机会任务 30 天内不会重新创建，避免同一个客户/邮件线程每小时重复派发。

### 第三层：Execution Harness

Execution Harness 负责执行 Agent 工作流，并记录完整追踪。

它记录：

- 计划。
- 预期结果。
- 实际结果。
- 工具步骤。
- 风险等级。
- 审核状态。
- 执行时间和完成时间。

执行输出以 timeline 显示。长步骤默认只显示部分步骤，可点击显示全部。

### 与 Global Agent 和 Agent Harness 的关系

- Global Conversion Agent 是高层策略与统筹者。
- Signal Scanner 负责发现任务。
- 机会任务队列负责排队和路由。
- Execution Harness 负责可追踪执行和人工审核。
- 各个专业 Agent 负责执行具体工作。

旧的直接定时执行逻辑已经优化为先进入机会任务机制，避免定时执行、事件触发和手动执行互相冲突。

## Agent 定期运行与事件触发

Agent 可以配置定期运行：

- 每隔 X 秒。
- 每隔 X 分钟。
- 每隔 X 小时。
- 每隔 X 天。
- 每月第 X 日。
- 可选执行次数上限。

Agent 也可以配置事件触发。事件作用范围包括：

- 仅针对事件主体：只处理触发事件关联的客户/lead/消息。默认使用此模式。
- 全局：跨符合条件的记录扫描或执行。

后台定期执行由后端调度器处理。只要服务器在运行，不需要一直打开浏览器页面。

## 幂等与重复执行防护

很多 Agent 操作不应该在数据没有变化时重复执行。

- Lead scoring / lead analysis 会对 lead、客户、评论、联系人、相关邮件、交易、workflow 到期状态和跟进时间生成签名，未变化则跳过。
- Follow-up 操作会检查近期 CRM log marker，在幂等窗口内跳过重复工作。
- 机会任务会按 `dedupeKey` 去重，活跃状态不重复，完成/忽略后 30 天内不重复。
- 面向客户的发送动作应避免发送相同或近似相同内容。
- 内部摘要和下一步建议会保存到数据库，刷新页面不会恢复成旧内容。

## Agent 执行策略

Agent Execution Policy 控制哪些动作可以自动执行，哪些必须审核。

推荐默认策略：

- 自动执行：内部数据富集、内部评论、线索优先级、管线检查、低风险摘要。
- 需要审核：邮件、WhatsApp、报价、方案、阶段变更、campaign 执行、客户回复处理和高风险动作。

如果 AI 规划失败，系统会生成安全默认计划供审核，不会自动执行。

## Agent 工具清单

在 Agent Hub 配置 Agent 时可使用以下工具标识：

| 工具 | 说明 |
| --- | --- |
| `global_agent.plan` | 生成跨系统获客与转化计划。 |
| `signal.scan` | 扫描 CRM 信号并创建机会任务。 |
| `opportunity.create` | 创建 Agent Hub 机会任务。 |
| `opportunity.dispatch` | 将机会任务派发给推荐 Agent。 |
| `lead.acquire` | 从配置的数据渠道获取外部线索数据。 |
| `lead.read` | 读取 lead 资料、评分、评论、日志和活动。 |
| `lead.create` | 创建 CRM lead。 |
| `lead.update` | 更新 lead 字段、评分、摘要、下一步、标签或阶段。 |
| `lead.delete` | 删除或归档 lead。 |
| `lead.comment` | 添加 lead 内部评论。 |
| `lead.log` | 添加 lead Growth Logs 或时间线事件。 |
| `lead.stage` | 移动 lead 管线阶段。 |
| `lead.tag` | 添加、更新或移除 lead 标签。 |
| `lead.enrich` | 通过配置渠道富集 lead 数据。 |
| `lead.analyze` | 基于 CRM、消息、产品和 RAG 分析 lead 或客户。 |
| `lead.score` | 评估 lead 质量和转化潜力。 |
| `public_pool.import` | 将获取到的线索导入公海。 |
| `public_pool.delete` | 删除公海线索。 |
| `client.read` | 读取客户资料、联系人、偏好、评论和活动。 |
| `client.create` | 创建客户或将合格 lead 转为客户。 |
| `client.update` | 更新客户字段、联系人、偏好、归属或标签。 |
| `client.delete` | 删除、归档或移出活跃客户。 |
| `client.comment` | 添加客户内部评论。 |
| `client.log` | 添加客户 Growth Logs 或时间线事件。 |
| `client.stage` | 更新客户管线阶段。 |
| `client.tag` | 添加、更新或移除客户标签。 |
| `client.dedupe` | 检测重复客户或 lead。 |
| `contact.read` | 读取联系人和联系方式。 |
| `contact.create` | 在客户或 lead 下创建联系人。 |
| `contact.update` | 更新联系人或 key contact 状态。 |
| `contact.delete` | 删除联系人或联系方式。 |
| `data.normalize` | 标准化导入字段、国家、联系方式和标签。 |
| `client.summarize` | 生成或更新客户内部摘要。 |
| `next_step.recommend` | 推荐最佳下一步动作。 |
| `email.read` | 读取收件、已发送、定时、草稿和邮件线程。 |
| `email.draft` | 创建或更新邮件草稿。 |
| `email.subject` | 生成或优化邮件主题。 |
| `email.schedule` | 定时发送邮件。 |
| `email.send` | 通过配置的发件规则发送邮件。 |
| `email.delete` | 删除或归档邮件。 |
| `email.tag` | 添加、更新或移除邮件标签。 |
| `email.comment` | 添加邮件内部评论。 |
| `email.reply` | 在线程中起草、定时或发送回复。 |
| `whatsapp.read` | 读取 WhatsApp 对话历史。 |
| `whatsapp.draft` | 起草 WhatsApp 风格消息。 |
| `whatsapp.send` | 通过 Actor Hub 发送或定时 WhatsApp 消息。 |
| `conversation.tag` | 添加或更新对话标签。 |
| `conversation.comment` | 添加对话评论。 |
| `live_chat.read` | 读取网站 live chat 会话和消息。 |
| `live_chat.reply` | 使用对外安全上下文回复 live chat 访客。 |
| `live_chat.escalate` | 将 live chat 标记为人工接管或高优先级审核。 |
| `live_chat.tag` | 添加或更新 live chat 会话标签。 |
| `product.read` | 读取产品、SKU、描述、Sales Points、价格和阶梯价格。 |
| `product.create` | 创建产品。 |
| `product.update` | 更新产品、价格、媒体或阶梯价格。 |
| `product.delete` | 删除产品。 |
| `product.describe` | 生成或优化产品描述。 |
| `product.sales_points` | 生成产品 Sales Points。 |
| `product.pricing` | 生成或优化阶梯价格。 |
| `knowledge.search` | 搜索全局或客户专属知识库作为 RAG。 |
| `knowledge.read` | 读取知识库。 |
| `knowledge.create` | 创建知识库。 |
| `knowledge.update` | 更新知识库和 embedding。 |
| `knowledge.delete` | 删除知识库和 embedding。 |
| `quote.create` | 创建报价草稿。 |
| `quote.update` | 更新报价、产品、付款条款或货币。 |
| `quote.delete` | 删除报价草稿。 |
| `quote.currency` | 使用配置汇率转换报价货币。 |
| `media.read` | 读取媒体素材库。 |
| `media.attach` | 将媒体/文件附加到 WhatsApp 或邮件草稿。 |
| `comment.delete_request` | 通过审批请求删除团队评论。 |
| `growth_log.delete` | 在权限允许时删除 Growth Logs。 |

Agent Execution Policy 使用的 Global Agent action type：

`create_lead_campaign`, `run_lead_campaign`, `create_followup_workflow`, `process_customer_reply`, `send_email`, `send_whatsapp`, `update_client_stage`, `add_client_comment`, `enrich_client_data`, `create_deal`, `create_quote`, `prioritize_leads`, `review_pipeline`。

## Agent 工具执行器路线图

Agent Harness 目前已经为非删除类写入工具补充了具体后端执行器，包括 `email.tag`、`email.comment`、`product.create`、`product.update`、`knowledge.create`、`knowledge.update`、`client.create`、`client.tag`、`lead.create` 和 `lead.tag`。

当前主要待补完整执行器为破坏性删除/归档类工具：

- `email.delete`。
- `product.delete`。
- `knowledge.delete`。
- `client.delete`。
- `lead.delete`。

这些删除动作后续应按风险和审批策略逐步接入，并配套审核策略、审计日志以及恢复或回滚规则。

其他路线图事项：

- Telegram Bot 智能客服：接入 Telegram Bot 作为客户服务渠道，支持 AI 自动回复、会话记录、客户/Lead 关联，以及人工接管；人工接管后可暂停 AI 处理，由运营人员手动继续对话。

## 获客与数据富集渠道

系统可配置以下渠道：

- Apify。
- PhantomBuster。
- Scrap.io。
- HasData。
- Decodo。
- Clay。
- Outscraper。

支持的渠道可在设置中测试连接。获客 Agent 应结合产品资料、知识库和历史成交客户画像来选择行业、角色、国家和关键词。

## 通知

系统使用用户友好的 notification，不使用阻塞式浏览器 alert。

通知渠道可包括：

- 系统内通知。
- Bark。
- Webhook。

典型通知事件：

- 收到新邮件。
- 收到新 WhatsApp 消息。
- 收到新的 Live Chat 访客消息。
- Agent 动作需要审核。
- Agent 执行失败。
- 定时发送延迟或恢复发送。
- 每日运营摘要。
- 长时间未登录提醒。

## Public Live Chat API

公开 live chat API 会刻意保持很窄，避免网站访客访问 CRM 后台数据。公开接口不接受 CRM 登录 token，也不会返回客户资料、内部日志、内部备注、Prompt、设置等后台信息。

在网站嵌入组件前，需要先在 Settings -> API Tokens 生成一个受限的网站 API Token。普通 AI 客服场景建议选择 `Live Chat Agent` 模板。网站前端把这个值作为 `apiToken` 传给公开接口，不再传 CRM `userId`。

推荐的网站 widget 流程：

1. 访客打开聊天组件时创建 session。
2. 前端保存返回的 `session.id` 和 `token`。
3. 使用 `session.id` 和访客 `token` 连接 Socket.IO，实现实时消息。
4. 访客消息优先通过 Socket.IO 发送；REST 发送/读取接口保留为 fallback。
5. 访客刷新网站后，继续复用本地保存的 `session.id` 和 `token`。

### 创建公开会话

`POST /api/live-chat/public/sessions`

Request：

```json
{
  "apiToken": "tq_generated_website_api_token",
  "visitorName": "Alex Chen",
  "visitorEmail": "alex@example.com",
  "visitorPhone": "+1 555 0100",
  "pageUrl": "https://example.com/products/solar-monitoring",
  "metadata": {
    "source": "website-widget",
    "utmCampaign": "solar-demo"
  }
}
```

Response：

```json
{
  "session": {
    "id": "lc_1780000000000_12345",
    "clientId": null,
    "visitorName": "Alex Chen",
    "visitorEmail": "alex@example.com",
    "visitorPhone": "+1 555 0100",
    "pageUrl": "https://example.com/products/solar-monitoring",
    "status": "open",
    "priority": "normal",
    "humanTakeover": false,
    "assignedAgentId": "live_chat_agent",
    "tags": [],
    "lastMessageAt": "2026-06-04T10:00:00.000Z",
    "createdAt": "2026-06-04T10:00:00.000Z",
    "updatedAt": "2026-06-04T10:00:00.000Z",
    "lastMessage": null
  },
  "token": "visitor-session-token"
}
```

说明：

- `apiToken` 用来识别 CRM 所属用户和允许的公开权限。请使用 Settings -> API Tokens 生成的 token。
- token 必须包含 `live_chat.public` 权限。`Live Chat Agent` 模板包含 `live_chat.public` 和 `live_chat.agent`。
- 不要在网站前端暴露 CRM 用户 ID。
- `token` 是此接口返回的访客 session token，网站前端需要保存它，并在后续 REST 请求或 Socket.IO 鉴权中携带。
- 如果 `visitorEmail` 匹配到已有客户联系人，CRM 内部可以把会话关联到客户，但公开响应仍不会暴露客户详情。

### 实时 Socket.IO 通道

推荐的实时传输方式是 Socket.IO，路径为 `/socket.io`。REST 仍用于创建 session、重新加载历史记录，以及 socket 不可用时的 fallback。

访客鉴权：

```js
import { io } from "socket.io-client";

const socket = io("https://crm.example.com", {
  path: "/socket.io",
  transports: ["websocket", "polling"]
});

socket.emit("live_chat:visitor_auth", {
  sessionId: "lc_1780000000000_12345",
  visitorToken: "visitor-session-token"
}, (response) => {
  if (!response.ok) console.error(response.error);
});
```

访客发送消息：

```js
socket.emit("live_chat:visitor_message", {
  body: "Hi, do you support solar plant monitoring for multiple sites?"
}, (response) => {
  console.log(response.message, response.agentMessage);
});
```

接收实时消息和会话状态：

```js
socket.on("live_chat:message", (message) => {
  // 按 message.id 追加，避免重复。
});

socket.on("live_chat:session_updated", (session) => {
  // 刷新状态、优先级、人工接管、标签和最后一条消息。
});
```

后台座席使用 CRM 登录 JWT 鉴权：

```js
socket.emit("live_chat:operator_auth", { token: crmJwt });
socket.emit("live_chat:join_session", { sessionId: "lc_1780000000000_12345" });
socket.emit("live_chat:operator_message", {
  sessionId: "lc_1780000000000_12345",
  body: "Thanks, I can help with that."
});
```

### 访客发送消息

`POST /api/live-chat/public/sessions/:id/messages`

Request：

```json
{
  "token": "visitor-session-token",
  "senderName": "Alex Chen",
  "body": "Hi, do you support solar plant monitoring for multiple sites?"
}
```

Response：

```json
{
  "message": {
    "id": "lcm_1780000001000_10001",
    "sessionId": "lc_1780000000000_12345",
    "role": "visitor",
    "senderName": "Alex Chen",
    "body": "Hi, do you support solar plant monitoring for multiple sites?",
    "metadata": {},
    "createdAt": "2026-06-04T10:00:01.000Z"
  },
  "agentMessage": {
    "id": "lcm_1780000002000_10002",
    "sessionId": "lc_1780000000000_12345",
    "role": "agent",
    "senderName": "Live Chat Agent",
    "body": "Yes. Our team can help with multi-site solar monitoring. Could you share the number of sites and whether you need device-level or plant-level reporting?",
    "metadata": {
      "source": "live_chat_agent",
      "escalate": false,
      "reason": ""
    },
    "createdAt": "2026-06-04T10:00:02.000Z"
  }
}
```

说明：

- 如果该会话已被人工接管，或者会话已关闭，`agentMessage` 可能为 `null`。
- Live Chat Agent 只使用对外安全的公司/产品上下文回复访客。
- 涉及敏感问题、投诉、合同、价格承诺或需要内部资料的问题，应转交人工座席。

### 读取公开会话消息

`GET /api/live-chat/public/sessions/:id/messages?token=visitor-session-token`

Response：

```json
[
  {
    "id": "lcm_1780000001000_10001",
    "sessionId": "lc_1780000000000_12345",
    "role": "visitor",
    "senderName": "Alex Chen",
    "body": "Hi, do you support solar plant monitoring for multiple sites?",
    "metadata": {},
    "createdAt": "2026-06-04T10:00:01.000Z"
  },
  {
    "id": "lcm_1780000002000_10002",
    "sessionId": "lc_1780000000000_12345",
    "role": "agent",
    "senderName": "Live Chat Agent",
    "body": "Yes. Our team can help with multi-site solar monitoring...",
    "metadata": {
      "source": "live_chat_agent",
      "escalate": false
    },
    "createdAt": "2026-06-04T10:00:02.000Z"
  }
]
```

### 登录后的座席 API

以下接口需要 `Authorization: Bearer <crm-token>`。

获取会话列表：

```http
GET /api/live-chat/sessions
Authorization: Bearer <crm-token>
```

读取单个会话消息：

```http
GET /api/live-chat/sessions/lc_1780000000000_12345/messages
Authorization: Bearer <crm-token>
```

座席发送回复，并自动进入人工接管：

```http
POST /api/live-chat/sessions/lc_1780000000000_12345/messages
Authorization: Bearer <crm-token>
Content-Type: application/json
```

```json
{
  "body": "Thanks Alex, I can help. How many PV sites are you managing now?"
}
```

更新会话状态、标签、优先级、关联客户或人工接管状态：

```http
PATCH /api/live-chat/sessions/lc_1780000000000_12345
Authorization: Bearer <crm-token>
Content-Type: application/json
```

```json
{
  "status": "open",
  "priority": "high",
  "humanTakeover": true,
  "clientId": "c1779272244237",
  "tags": ["demo-request", "solar"]
}
```

释放人工接管并让 Live Chat Agent 手动回复：

```http
POST /api/live-chat/sessions/lc_1780000000000_12345/agent-reply
Authorization: Bearer <crm-token>
```

Response：

```json
{
  "message": {
    "id": "lcm_1780000003000_10003",
    "sessionId": "lc_1780000000000_12345",
    "role": "agent",
    "senderName": "Live Chat Agent",
    "body": "Could you share your target deployment country and monitoring requirements?",
    "metadata": {
      "source": "live_chat_agent",
      "escalate": false
    },
    "createdAt": "2026-06-04T10:00:03.000Z"
  }
}
```

### 安全边界

- 公开接口只对 live chat 路径开放 CORS，并且必须携带 visitor session token。
- 创建公开 session 需要携带拥有 `live_chat.public` 权限的 API Token。
- API Token 会保留服务端 hash 用于鉴权，同时也会在 Settings -> API Tokens 中展示，方便运营人员随时复制仍有效的集成 key。
- visitor token 应视为会话密钥，不应写入公开 analytics 日志。
- 公开响应不会包含 CRM 客户资料、内部 comments、Growth Logs、RAG 原始文档、Agent Prompt、API Key 或系统设置。
- 座席 API 必须在 CRM 登录状态下使用，只应该由 Live Chat Desk 后台调用。

## 部署

### 本地开发

安装依赖：

```bash
npm install --legacy-peer-deps
```

类型检查：

```bash
npm run lint
```

启动开发服务：

```bash
npm run dev
```

### Docker / VPS 部署

项目支持 Docker 部署。

部署流程：

1. 拉取仓库代码。
2. 同步文件到 VPS。
3. 执行 `docker compose down`。
4. 执行 `docker compose up -d --build`。

如果 Docker build 出现 snapshot/parent layer 错误，通常是 VPS 上 Docker/buildkit 缓存问题，不是 TypeScript 构建错误。清理服务器 Docker builder/cache 后重新部署。

### 数据库

后端启动时会初始化已实现的 PostgreSQL 表和迁移。

主要表包括：

- `users`
- `clients`
- `deals`
- `emails`
- `email_tracking`
- `logs`
- `knowledge_base`
- `products`
- `quotes`
- WhatsApp 消息/对话相关表
- 用户设置中保存的系统状态

近期新增的数据结构/状态：

- `clients.product_ids`：客户/Lead 关联产品 ID 的 JSON 数组。
- `deals.product_ids`：报价/Deal 关联产品 ID 的 JSON 数组。
- `whatsapp_message_translations.kind`：区分入站翻译和出站原文记录。
- `whatsapp_message_translations.target_language`：保存发送前翻译所使用的客户侧目标语言。
- `live_chat_sessions`：网站 live chat 会话、访客身份、客户关联、状态、标签和人工接管状态。
- `live_chat_messages`：live chat 会话中的访客、Agent、座席和系统消息。
- `api_tokens`：网站/API 集成 token 的 hash、权限范围、权限模板、吊销状态和最近使用时间。
- 用户设置中包含 WhatsApp 专用翻译状态，例如 `whatsappAutoTranslateConfig` 和 `whatsappOutboundAutoTranslateConfig`。

全新服务器理论上可以通过部署脚本启动并初始化结构，但生产迁移仍建议先备份数据库并验证迁移结果。

## 技术栈

- 前端：React、TypeScript、Tailwind CSS、Zustand、Lucide Icons。
- 后端：Express.js、PostgreSQL、JWT、bcrypt。
- AI：OpenAI-compatible API、OpenRouter、Gemini、Embeddings、RAG。
- 通信：Email Servers、WhatsApp Actor Hub。
- 构建：Vite、esbuild、Docker。

---

Maximize outreach, keep the pipeline clean, and let AI agents discover and execute the right CRM work with review where it matters.

最大化客户触达效率，保持管线清晰，让 AI Agent 主动发现并执行正确的 CRM 工作，同时在关键动作上保留人工审核。
