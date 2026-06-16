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
- Email, WhatsApp, and Live Chat now have a shared `communication_conversations` / `communication_messages` backend index. Existing channel tables remain the source of truth while the unified model powers the next CRM workspace iteration.
- Authenticated APIs expose this unified layer through `GET /api/conversations`, `GET /api/conversations/:id/messages`, `PATCH /api/conversations/:id`, and `DELETE /api/conversations/:id`.
- Inbox-level conversation actions now use the unified layer for Email, WhatsApp, and Live Chat: delete/archive, follow-up, important, tags, comments, owner/stage, and client association are written through `/api/conversations` and then synchronized back to the channel-specific records.
- Channel APIs remain responsible for channel-native actions such as sending email, sending/syncing WhatsApp messages, media upload, scheduled delivery, chatId mapping, and Live Chat visitor/operator message transport.
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
- Website API tokens are generated and revoked in Settings -> API Tokens. Token templates include Live Chat Agent, Live Chat Public Only, Website Lead Capture, Telegram Bot Webhook, and Product Catalog Read.

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
- Knowledge base items track source metadata such as `sourceType`, `sourcePath`, `sourceHash`, source modified time, import batch, and import state.
- RAG search uses global knowledge plus client-specific knowledge when a client context is available. Client-specific knowledge receives a higher retrieval weight than global knowledge, while global knowledge remains available as broad product/company context.
- Global RAG can import server-side folders. Set `KNOWLEDGE_IMPORT_DIR` or `RAG_IMPORT_DIR` on the server, place structured files under that folder, then use the Knowledge Base page to import the configured root or a relative subfolder.
- Folder import supports `.txt`, `.md`, `.markdown`, `.json`, `.csv`, `.tsv`, `.html`, `.htm`, and `.pdf`. Re-importing the same relative file path updates the same knowledge item instead of creating duplicates.
- Folder import is incremental: unchanged files are skipped by content hash, changed files are re-embedded, new files are created, and missing source files are deleted from folder-sourced RAG items so stale embeddings are cleared. Delete sync is skipped if the scan hits `maxFiles`, preventing accidental deletion from a partial scan.
- Deleting a knowledge item hard-deletes both the content and the stored embedding from the same `knowledge_base` table.
- After deletion, future RAG searches will not retrieve that item.
- AI/Agent prompts include RAG citation metadata such as scope, source path/type, and relevance score so operators can see whether an answer used client knowledge or global knowledge.
- If knowledge update embedding generation fails, the content updates and the stale embedding is cleared to avoid mismatched retrieval.

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
- Functional modules can use different models, such as drafting, analysis, embedding, Execution Engine, prompt building, tool selection, context suggestions, WhatsApp drafting, and Global Orchestrator.
- Default options avoid hard-coded Gemini assumptions when Gemini is not configured.
- Agent Context & Suggestions analyzes the current customer inbound message plus broader CRM context, including AI summaries, best next step, score, comments, activity logs, other-channel communication history, products, and RAG snippets.
- Outbound messages sent by the team are treated as background context only and are not used as evidence of customer intent.

## Agent Hub

Agent Hub is the central operating layer for agent tasks, approvals, execution traces, agent configuration, and operator-to-agent conversation.

### System Agents

System agents are built-in, cannot be deleted, and have fixed names because the name represents the system role.

- Global Orchestrator: decomposes CRM goals into queued, policy-controlled tasks and coordinates specialized agents.
- Signal Scanner Agent: scans CRM signals and creates actionable opportunity tasks.
- Lead Data Agent: acquires, imports, enriches, deduplicates, and normalizes leads using product and knowledge context.
- Lead Scoring Agent: scores leads, generates lead summaries, and recommends best next steps.
- AI Follow-Up Agent: handles account-level follow-up recommendations and drafts.
- WhatsApp Inbox Agent: reads WhatsApp conversation context and suggests next actions.
- Context Suggestion Agent: analyzes email/WhatsApp context and suggests actions.
- Email Draft Agent: drafts customer-facing emails using CRM, product, and RAG context.
- WhatsApp Draft Agent: drafts WhatsApp-style messages using CRM, product, and RAG context.
- Live Chat Agent: handles website visitor live chat using public-safe context and hands off to human operators when needed.
- Telegram Customer Service Agent: system agent for Telegram Bot customer service. It supports inbound webhook ingestion, local persistence, notifications, Agent Hub events, Bot API replies, AI auto-replies, human takeover, customer linking, tags, and execution history.
- Agent Prompt Builder Agent: generates agent instructions from user goals, products, knowledge base, available tools, guardrails, and language policy.
- Agent Tool Selection Agent: selects tools for an agent from the tool registry based on the agent name and prompt.

System agents can be restored to default best-practice configuration from Agent Hub.

### Custom Agents

- Users can create, edit, activate, pause, and delete custom agents.
- Custom agents have instructions, tools, guardrails, schedule, event triggers, event scope, and execution policy.
- Tools are selected with a tool picker instead of free-form comma strings.
- AI can generate prompts and auto-select tools. Both operations are performed by system agents and increase their handled task counts.
- Agent names define role and purpose. Instructions define how the agent should behave, which context to inspect, idempotency rules, risk rules, and output format.

### Agent Console

- Agent Hub opens to the Task Queue by default so operators first see pending work.
- Agent Console is available for asking agents questions, referencing customer/lead context, generating tasks, and improving agent instructions.
- Click an agent in the left list to chat with it.
- The console shows user-friendly usage guidance for the selected agent instead of raw prompt text.
- `@` is used to reference customers/leads in the chat, not to select agents.
- Chat messages are persisted, ordered chronologically, and can be deleted or cleared.
- Agents can execute allowed tools from the console, show loading state while executing, return execution results, and display approval buttons inline when human review is required.
- Formal execution requests still flow through Task Queue, Approval Center, Execution Policy, and Execution Logs.

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

### Layer 2: Task Queue and Routing Policy

Opportunity tasks are collected in Agent Hub -> Task Queue.

The queue is backed by a unified `Agent Task` record. Scheduled runs, Signal Scanner findings, event triggers, manual actions, and Agent Console requests should be normalized into this task shape before execution.

Core task fields include `source`, `triggerType`, `entityType`, `entityId`, `agentId`, `status`, `risk`, `dedupeKey`, `approvalStatus`, `runId`, `retryCount`, and timestamps. Legacy opportunity tasks are bridged into deterministic task IDs such as `task_<opportunityId>` so old data and new task execution stay in sync.

Task lifecycle status is normalized to exactly seven queue states: `open`, `queued`, `approval_required`, `running`, `completed`, `failed`, and `ignored`. Legacy states such as `pending_review`, `approved`, `rejected`, `complete`, or `skipped` are converted at the Agent Hub data boundary so older Harness / Global Agent records do not leak parallel lifecycle semantics into the current queue.

Each task also carries audit fields: `triggeredBy`, `triggeredAt`, `approvedBy`, `approvedAt`, `executedBy`, `executedAt`, and `affectedRecords`. The task detail drawer shows who triggered the task, who approved it, who executed it, and which CRM records were read, written, sent, imported, drafted, or otherwise affected.

Task cards and the task detail drawer show a source chain: source -> linked entity -> responsible agent -> routing result. This helps operators understand why a task exists, which record it affects, which agent owns it, and whether it is waiting for policy routing, approval, execution, completion, or ignore state.

Execution trace steps include landing metadata. Each tool call can show whether it only read/analyzed context or actually landed a write/send/create action, along with compact evidence such as draft IDs, imported lead counts, sent channels, tags, quote numbers, or updated records.

Execution trace steps also include Context Evidence when available. This shows which customer summary, best next step, RAG snippets, products, recent communications, message counts, and inbound-customer-message status were used for the run. Operators can use this evidence to understand why an agent replied a certain way, skipped execution, or chose a specific follow-up action.

Routing policy decides whether each opportunity should:

- Stay open for manual dispatch.
- Auto-dispatch.
- Enter human review.
- Auto-execute if risk and guardrails allow it.

Opportunity dedupe uses `dedupeKey`.

- Active opportunities with the same `dedupeKey` are not duplicated.
- Failed opportunities are reused instead of recreated.
- Completed or ignored opportunities are suppressed for 30 days, so the same customer/email thread does not keep creating repeated opportunity tasks.
- Removing a task from the queue marks the linked opportunity as `ignored` instead of hard-deleting it. This preserves the dedupe tombstone so the task does not come back after refresh or the next scan.

### Layer 3: Execution Engine

Execution Engine executes the selected agent's workflow with traceable steps. It is not a standalone business agent; it is the runtime layer for permissions, approval gates, tool execution, and audit trails.

It records:

- Plan.
- Expected result.
- Actual result.
- Tool steps.
- Risk.
- Approval status.
- Execution time and completion time.

Execution output is shown as a timeline. By default only part of long step lists is shown, with a show-all option.

### How This Relates to Global Orchestrator and Execution Engine

- Global Orchestrator is the high-level strategist and coordinator.
- Signal Scanner discovers work.
- Task Queue queues and routes work.
- Execution Engine executes traceable workflows and approval-gated actions.
- Individual agents do the specialist work.

Older direct scheduled agent execution has been optimized to route through the opportunity mechanism first. This avoids conflicting execution paths and keeps scheduled work, event-triggered work, and manual work in one governance model.

Legacy direct planning endpoints `/api/global-agent/plan` and `/api/agent-harness/plan` are deprecated and return a compatibility error. New planning and execution should enter through Agent Hub tasks, approvals, agent runs, and execution logs.

### Agent State Persistence

Critical Agent Hub state is gradually moving out of `users.settings` JSONB and into dedicated database tables:

- `agent_run_records`
- `agent_opportunities`
- `agent_tasks`
- `agent_harness_runs`
- `global_agent_plans`

For compatibility, `/api/user/settings` still returns these arrays. On read, database rows and legacy JSON arrays are merged by `updatedAt`, with the newest record winning. On write, incoming Agent arrays are synced back into the dedicated tables. This keeps older frontend flows working while making task, approval, and execution records more stable and queryable.

### System Health

Agent Hub includes a Health tab backed by `GET /api/system/health`. It is now a real runtime monitor instead of only a configuration checklist.

The Health tab includes a unified Worker status table for:

- Email Sync.
- WhatsApp Sync.
- Live Chat Agent.
- Signal Scanner.
- Agent Hub Scheduler.

Each Worker row shows current status, last run time, duration, success/failure counts, last error, compact run details, and next scheduled run time when available.

The same Health API also reports:

- Startup diagnostics for required environment variables, RAG import directory access, database migrations, and background worker registration.
- Email sync configuration and runtime state.
- WhatsApp Actor Hub configuration, actor pool, and sync runtime state.
- Live Chat session status and Live Chat Agent runtime state.
- Agent scheduler polling interval, scheduled agents, event-triggered agents, and Signal Scanner runtime state.
- Bark/Webhook notification configuration.
- RAG item count, embedding count, and import directory configuration.
- LLM provider and module mapping configuration.
- Agent persistence table counts.
- Agent Hub repair diagnostics for tasks that reference deleted emails, missing emails, missing clients, or missing leads. The Health tab also provides a repair action that closes those invalid tasks/runs to prevent refresh resurrection or redispatch.

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
| `telegram.read` | Read Telegram Bot conversations after the Telegram connector is enabled. |
| `telegram.reply` | Reply through Telegram Bot using public-safe context after the connector is enabled. |
| `telegram.escalate` | Mark a Telegram conversation for human takeover or priority review. |
| `telegram.tag` | Add or update Telegram conversation tags. |
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

Global Orchestrator action types used by Agent Execution Policy:

`create_lead_campaign`, `run_lead_campaign`, `create_followup_workflow`, `process_customer_reply`, `send_email`, `send_whatsapp`, `update_client_stage`, `add_client_comment`, `enrich_client_data`, `create_deal`, `create_quote`, `prioritize_leads`, `review_pipeline`.

## Agent Tool Executor Roadmap

Execution Engine now has concrete backend executors for:

- Email tools: `email.delete`, `email.tag`, and `email.comment`.
- Product tools: `product.create`, `product.update`, and `product.delete`.
- Knowledge tools: `knowledge.create`, `knowledge.update`, and `knowledge.delete`.
- Client tools: `client.create`, `client.delete`, and `client.tag`.
- Lead tools: `lead.create`, `lead.delete`, and `lead.tag`.

Each trace step includes `resultMeta` so operators can see whether the tool landed a write/delete action, stayed read-only, or skipped without changing data. Delete/archive tools remain high-risk actions and should be governed by Agent Execution Policy and approval rules.

Additional roadmap items:

- [x] Telegram Bot intelligent customer service structure: registered Telegram tools, Telegram Customer Service Agent, permissions, event trigger, notification event, and API token template.
- [x] Telegram Bot inbound connector: scoped webhook API, Telegram conversation/message persistence, unified conversation indexing, deduplication, customer linking, notifications, and Agent Hub event trigger.
- [x] Telegram Bot outbound reply layer: Settings Bot Token configuration, Bot API `sendMessage`, Inbox reply composer, outbound persistence, and unified conversation sync.
- [x] Telegram Bot automation layer: AI auto-replies, richer customer/lead linking controls, human takeover controls, and Agent Hub execution for `telegram.read`, `telegram.reply`, `telegram.tag`, and `telegram.escalate`.

## Product Roadmap

Recommended near-term roadmap:

### Phase 1: Agent Hub Clarity and Operability

- [x] Keep Task Queue, Approval Center, Execution Policy, Execution Engine, and Execution Logs as the formal execution path for scheduled, event-triggered, manual, and console-triggered work.
- [x] Reposition Agent Chat as a helper entry instead of the primary Agent Hub workflow.
- [x] Make task removal persistent by marking linked opportunities as ignored instead of hard-deleting them.
- [x] Add Task Queue filters for open, approval-required, running, completed, failed, and ignored tasks.
- [x] Add a task detail drawer showing trigger reason, linked client/lead/message, recommended agent, risk rationale, dedupe key, and execution blockers.
- [x] Add bulk task operations for ignore, reopen, dispatch, mark complete, and assign responsible agent.

### Phase 2: Agent Reliability and Diagnostics

- [x] Add Agent health cards: last run time, success rate, consecutive failures, skipped count, and next scheduled run.
- [x] Add execution log filters by agent, status, trigger, risk, and time range.
- [x] Add failure and skip aggregation, such as missing channel config, idempotency skip, no linked entity, or approval required.
- [x] Add Agent dry run / simulation mode to preview affected records and planned tool calls before execution.

### Phase 3: Data and Background Worker Hardening

- [x] Move critical Agent task, approval, and execution records from user settings JSON toward dedicated database tables.
- [x] Add a system health page for email sync, WhatsApp sync, Live Chat agent, scheduler, notification delivery, RAG indexing, and LLM provider status.
- [x] Add startup checks for required directories, environment variables, database migrations, and background workers.
- [x] Upgrade Health from configuration checks to real Worker runtime monitoring with last run, duration, success/failure, error, and next run time.
- [x] Add deployment health checks after GitHub Actions deployment.

### Phase 4: Unified Communication and CRM Workspace

- [x] Add the shared Email, WhatsApp, and Live Chat conversation/message backend index and unified read APIs.
- [x] Migrate the Inbox left conversation list to the shared conversation model. Email, WhatsApp, and Live Chat now share one list, search, channel filter, and chronological ordering; selecting an item opens the existing channel-specific detail view.
- [x] Add unified conversation write API and migrate Inbox bulk actions for tags, internal notes, important, follow-up, email delete, WhatsApp delete, and Live Chat close/archive.
- [x] Add owner and stage controls to the unified conversation UI. Inbox supports per-conversation and bulk owner/stage updates, and stage updates sync to linked client status.
- [x] Connect Dashboard follow-up workload and Agent Hub task entity typing to the unified conversation model, so email, WhatsApp, and Live Chat reminders can be surfaced consistently.
- [x] Add unified conversation search across all channels. Search now covers conversation fields, linked client fields, tags, comments, metadata, and historical message bodies.
- [x] Add a shared conversation detail header for Email and WhatsApp. The right-side detail pane now shares channel identity, linked client entry, tags, owner, stage, and primary actions while preserving each channel's existing body and send/reply behavior.
- [x] Add a shared follow-up status strip to Email and WhatsApp details. Operators can see, set, clear, and complete conversation follow-up reminders from the same location; Email remains backward-compatible with `todoAt`, and WhatsApp remains compatible with its existing follow-up marker comments.
- [x] Finish Inbox conversation action migration. Single-item and bulk delete, follow-up, important, tag, comment, and client association actions now prefer the unified conversation API across Email, WhatsApp, and Live Chat, with legacy channel stores used only as fallback for local drafts or not-yet-indexed records.
- [x] Expand client/lead workroom widgets for AI Summary, Best Next Step, Quotes, Contacts, RAG evidence, pending tasks, and channel history.
- [x] Add customer-level and lead-level AI analysis diffing so unchanged records do not repeatedly consume AI calls. Manual AI Radar and background insight agents reuse unchanged signatures and skip model calls.

### Phase 5: Governance, RAG, and Operator Experience

- [x] Add role-based permissions for agent tools, external messaging, destructive actions, and API tokens.
- [x] Add approval comments, approver identity, rollback metadata, and audit trails for sensitive actions.
- [x] Product, quote, and knowledge base create/update/delete actions write independent audit logs with actor, risk, affected records, and before/after or delete snapshots.
- [x] Add RAG source metadata, source path, update time, folder import incrementality, deletion sync, client/global retrieval weighting, and citation visibility in AI outputs.
- [x] Add notification history, quiet hours, templates, and escalation rules for daily summaries and repeated agent failures.
- [x] Tie gamification rewards to real CRM outcomes and configurable point/EXP rules.
- [x] Award configurable, idempotent points and EXP for real sales outcomes: quote sent, sample sent, negotiation started, and closed won.

## HubSpot-Inspired UI Refactor Roadmap

This roadmap tracks the gradual UI refactor inspired by HubSpot-style CRM information architecture. The goal is not to copy HubSpot visually, but to adopt a clearer CRM workspace model: object records, activity timeline, property panels, communication workspace, task/approval operations, and consistent navigation.

Maintenance rule: every future UI refactor step must update this roadmap in the same change. Use `[ ]` for not started, `[-]` for in progress, and `[x]` for complete.

### Phase 0: Refactor Foundation

- [-] Gradually split oversized page components before changing major layouts. `Inbox.tsx` is being reduced through smaller hooks and UI components.
- [x] Extract Inbox conversation sidebar, conversation list item, sidebar controls, bulk actions panel, dialogs, message list, reply composer, internal notes, follow-up strip, and channel detail header pieces.
- [x] Extract Inbox Email conversation pane so the right-side reading experience can be redesigned independently.
- [x] Extract Inbox WhatsApp conversation pane so WhatsApp header, follow-up, and embedded chat can evolve independently.
- [x] Extract Inbox Telegram conversation pane so Telegram header, messages, AI suggestions, notes, and reply composer can evolve independently.
- [x] Extract Inbox Live Chat conversation pane so visitor context, AI suggestions, notes, and reply composer can evolve independently.
- [x] Extract Inbox data/action hooks for sync, unified conversation actions, conversation list data, sidebar actions, bulk actions, navigation actions, selection state, selected email context, active conversation context, follow-up state, comments, and Telegram/Live Chat reply actions.
- [x] Extract Inbox Telegram/Live Chat translation state, cache, persistence, and auto-translate effects into a shared hook.
- [x] Extract Inbox Live Chat socket/session side effects into a shared hook and remove obsolete commented conversation-list code.
- [x] Extract Inbox create-lead and add-to-existing-client modal orchestration into a shared contact-linking component.
- [x] Extract Inbox auxiliary dialogs for confirmation, notification, attachment upload, tags, and follow-up scheduling.
- [x] Extract Inbox right-side content panel so compose, WhatsApp start, Email, WhatsApp, Live Chat, Telegram, and empty states are isolated from the page shell.
- [x] Add explicit props typing to the extracted Inbox right-side content panel to make future UI layout changes safer.
- [x] Split selected conversation detail routing into `InboxSelectedDetailPanel`, leaving `InboxContentPanel` as a thin compose/start/detail/empty-state orchestrator.
- [x] Extract the Email detail glue code into `InboxEmailDetailContainer`, keeping email-specific delete, reply, draft, RAG, follow-up, and comment actions out of the shared selected-detail router.
- [x] Extract the WhatsApp detail glue code into `InboxWhatsAppDetailContainer`, keeping WhatsApp-specific close, refresh, ownership, stage, delete, and follow-up actions isolated.
- [x] Extract WhatsApp message rendering into `WhatsAppMessageList` and move WhatsApp media/translation display helpers into a shared message model.
- [x] Extract WhatsApp chat header controls into `WhatsAppChatHeader`, isolating linked client actions, chatId mapping, Hub client selection, auto-translation, and Agent Mode toggles.
- [x] Extract WhatsApp conversation metadata into `WhatsAppConversationMetaBar`, isolating tags and internal comment controls from the chat modal.
- [x] Extract WhatsApp composer controls into `WhatsAppMessageComposer`, isolating attachments, media library, emoji, scheduling, translate-before-send, AI draft, and send controls.
- [x] Extract WhatsApp chat data loading into `useWhatsAppChatData`, isolating Hub client/message loading, local message cache hydration, background sync, focus polling, and sticky sender selection.
- [x] Extract WhatsApp translation execution into `useWhatsAppTranslation`, isolating inbound auto-translation, outbound translate-before-send, translation persistence, local translation cache writes, and translation loading state.
- [x] Extract WhatsApp conversation summarization into `useWhatsAppConversationSummary`, isolating long-thread compression, request de-duplication, and conversation summary write-back.
- [x] Extract WhatsApp chatId mapping into `useWhatsAppChatMapping`, isolating inline mapping edit state, validation, Hub mapping API calls, conversation write-back, and reload behavior.
- [x] Extract WhatsApp conversation metadata writes into `useWhatsAppConversationMeta`, isolating tag updates, internal comments, follow-up marker parsing, and comment deletion.
- [x] Extract WhatsApp AI drafting into `useWhatsAppDrafting`, isolating customer-service/draft prompt execution, CRM/RAG/product context assembly, and AI generation loading state.
- [x] Extract WhatsApp sending into `useWhatsAppSending`, isolating media upload, Agent Mode send generation, translate-before-send persistence, Hub send calls, CRM logging, and post-send cleanup.
- [x] Extract WhatsApp client linking into `useWhatsAppClientLinking`, isolating New Lead/Add to Existing Client dialog state, conversation-to-client patching, and post-create linking.
- [x] Extract WhatsApp agent context suggestions into `WhatsAppContextSuggestionsPanel`, isolating the context rail, draft/comment/follow-up actions, delete action, and persisted analysis write-back.
- [x] Extract WhatsApp composer state into `useWhatsAppComposerState`, isolating body, attachments, media selector, emoji, schedule toggles, and conversation-reset cleanup.
- [x] Extract WhatsApp chat selection state into `useWhatsAppChatSelection`, isolating display phone resolution, linked CRM client detection, selectable Hub client filtering, sticky Hub sender choice, and invalid sender reset.
- [x] Extract WhatsApp modal dialogs into `WhatsAppDialogLayer`, isolating media library, New Lead, and Add to Existing Client dialogs from the chat shell.
- [x] Extract WhatsApp agent context preparation into `useWhatsAppAgentContext`, isolating compressed memory, latest inbound/outbound detection, related deals, unified agent context, and outbound language options.
- [x] Extract WhatsApp message scroll behavior into `useWhatsAppMessageScroll`, isolating latest message id tracking, bottom sentinel ref, auto-scroll timers, and media-load scroll handling.
- [x] Extract Telegram and Live Chat detail glue code into dedicated containers so `InboxSelectedDetailPanel` is now a thin channel router.
- [x] Move the long `InboxContentPanel` prop list into a typed `contentPanelProps` object so the Inbox render layout is cleaner and ready for future workspace layout changes.
- [x] Move the long `InboxConversationSidebar` prop list into a typed `sidebarProps` object so the Inbox render tree reads like a left-list/right-detail workspace shell.
- [x] Extract the Inbox resizable workspace shell into `InboxWorkspaceLayout`, isolating PanelGroup, resize handle, and responsive sidebar/content visibility for future HubSpot-style layout changes.
- [x] Extract Inbox modal composition into `InboxDialogLayer`, keeping contact-linking and auxiliary dialogs out of the page shell.
- [x] Move the long `InboxDialogLayer` prop list into a typed `dialogLayerProps` object so the Inbox render tree is now composed from sidebar, content, and dialog slots.
- [x] Extract `InboxPageShell` to compose sidebar, content, workspace layout, and dialog layer from typed slot props.
- [x] Extract Inbox responsive sidebar/content visibility rules into `useInboxPageVisibility`.
- [x] Move Inbox local UI state declarations into `useInboxUiState` as a first step toward making `Inbox.tsx` a page orchestration layer.
- [x] Extract Dashboard/other-entry follow-up filter reset behavior into `useInboxFollowUpFilterRequest`.
- [x] Extract Inbox lifecycle side effects into `useInboxLifecycleEffects`, covering menu close, WhatsApp load/polling, search refresh, and delayed silent sync.
- [x] Extract Inbox dialog slot prop assembly into `useInboxDialogLayerProps`, keeping modal close/upload/tag/follow-up callback wiring outside the page component.
- [x] Extract Inbox sidebar slot prop assembly into `useInboxSidebarProps`, keeping filter/list/bulk-action wiring outside the page component.
- [x] Continue reducing `Inbox.tsx` toward a page orchestration layer before replacing its layout.
- [x] Apply the same gradual extraction pattern to other large record/detail pages before major redesign. `ClientDetails.tsx` is now reduced through extracted UI state, action, selection, layout, main/sidebar/comment, and overlay layers.

### Phase 1: Design System Layer

- [-] Create shared UI primitives for `PageHeader`, `SectionHeader`, `ActionBar`, `Toolbar`, `FilterBar`, `StatusBadge`, `OwnerStageControl`, `EmptyState`, `ConfirmDialog`, and `DataTable`. `PageHeader`, `SectionHeader`, `ActionBar`, `Toolbar`, `FilterBar`, `StatusBadge`, `EmptyState`, `IconButton`, `ActionButton`, `ModalDialog`, `ConfirmDialog`, and `DataTable` have initial implementations. Products and Quotes list headers now use the shared page header pattern; Knowledge Base search and bulk controls now use shared filter/action bars; Quotes and Clients lists now use the shared data table; Clients header actions and deletion now use shared header/action/confirm primitives.
- [-] Normalize spacing, typography, button hierarchy, input styling, tab styling, icon usage, and density across operational pages. Shared `SearchInput` has been introduced and is now used by Products and Quotes list searches. Shared `TagSearchInput` now powers the Clients list tag/country search field. Shared `SegmentedControl` now powers Clients List/Map and Products/Quotes switching.
- [-] Add shared layout primitives for `CRMWorkspaceLayout`, `RecordPageLayout`, `LeftListMiddleDetailRightPanelLayout`, and `WidgetRail`. `CRMWorkspaceLayout` has an initial implementation with header/body scroll controls; Product/Quote Hub and Client/Lead Hub now use it. `RecordPageLayout` has an initial implementation and Client Details now delegates to it. `WidgetRail` now wraps the Client Details sidebar widgets. `LeftListMiddleDetailRightPanelLayout` now provides a reusable three-pane shell, and Inbox's resizable workspace has started sharing its base three-pane layout styles. Inbox also has an upgraded `ConversationContextRail` wrapper for Email, WhatsApp, Telegram, and Live Chat context and agent suggestion areas, including optional title, description, actions, panel/rail variants, and collapse behavior. Email, WhatsApp, Live Chat, and Telegram context/agent suggestion areas now use the rail variant with lightweight headings and collapse controls.
- [ ] Keep the UI optimized for repeated CRM work: compact, scannable, keyboard-friendly, and not marketing-page-like.

### Phase 2: Customer and Lead Record Pages

- [ ] Rebuild client/lead details as HubSpot-like record workrooms.
- [ ] Use a clear three-zone structure: left properties/identity, center activity timeline and communication history, right widgets for AI, tasks, quotes, contacts, RAG, and pending approvals.
- [ ] Separate customer-level intelligence from lead-level intelligence in the UI.
- [ ] Make "next best action" the primary sales work entry point.
- [ ] Keep quotes, contacts, related products, RAG evidence, open tasks, and channel history visible without overcrowding the main timeline.

### Phase 3: Unified Communication Workspace

- [-] Refactor Inbox into a HubSpot-like communication workspace. The first visible pass is now in progress: the Inbox uses a CRM-style page header, lighter workspace shell, cleaner conversation queue controls, refreshed conversation cards, and a more intentional empty workspace state while keeping the existing email/WhatsApp/Live Chat/Telegram behavior intact.
- [ ] Keep one unified left conversation list with channel filters, saved views, bulk actions, and assignment controls.
- [-] Use a consistent middle conversation/detail pane for Email, WhatsApp, Live Chat, and Telegram. Email, WhatsApp, Live Chat, and Telegram now use the pilot pattern: messages/content/internal notes stay in the main pane while channel context and Agent suggestions sit in a dedicated right rail on large screens.
- [-] Add an optional right context rail for linked customer/lead, AI context evidence, RAG snippets, tasks, and recent activity. The initial Email, WhatsApp, Live Chat, and Telegram right rails are now in place.
- [-] Extract shared conversation split layout. `ConversationSplitPane` now powers the Email, Live Chat, and Telegram detail panes; WhatsApp already follows the same visual split in embedded mode, with message rendering split out as the next step toward adopting the shared layout primitive.
- [ ] Preserve channel-specific capabilities such as email WYSIWYG, WhatsApp media, translation, scheduling, and human takeover while using shared layout patterns.

### Phase 4: Agent Operations Center

- [ ] Reframe Agent Hub as an operations center with clear task queue, approvals, execution history, health, and agent configuration areas.
- [ ] Make task source, entity, responsible agent, risk, approval state, and execution result visually obvious.
- [ ] Keep Agent Chat as an assistant surface, not the primary execution workflow.
- [ ] Add more visual traceability for context evidence, tool results, skipped reasons, and remediation suggestions.

### Phase 5: Dashboard and Growth Operations

- [ ] Rework Dashboard around actionable operating insights instead of only charts.
- [ ] Highlight follow-up workload, stalled deals, channel conversion trend, agent contribution, lead quality by source, and daily operating summary.
- [ ] Align gamification surfaces with meaningful CRM outcomes rather than simple activity volume.

### Phase 6: Settings and Admin Consistency

- [ ] Reorganize Settings into predictable admin categories: AI & Integrations, Channels, Users & Roles, Notifications, API Tokens, Data/RAG, Gamification, Currency, and System Health.
- [ ] Use shared forms, section layouts, validation states, and save feedback.
- [ ] Keep high-risk settings and destructive actions visually distinct with audit and approval context.

## 参考 HubSpot 的 UI 重构 Roadmap

此路线图用于跟踪参考 HubSpot 信息架构进行的渐进式 UI 重构。目标不是照搬 HubSpot 视觉，而是吸收它清晰的 CRM 工作方式：对象详情页、活动时间线、属性面板、统一沟通工作区、任务/审批运营中心和一致的导航结构。

维护规则：之后每一次 UI 重构都必须同步更新此 Roadmap。`[ ]` 表示未开始，`[-]` 表示进行中，`[x]` 表示已完成。

### 阶段 0：重构基础

- [-] 在大改布局前，先逐步拆分超大页面组件。`Inbox.tsx` 正在通过小组件和 hooks 持续瘦身。
- [x] 已拆出 Inbox 的会话列表项、侧栏控制、批量操作面板、弹窗、消息列表、回复框、内部备注、待跟进条和渠道详情头部等组件。
- [x] 已拆出 Inbox 的同步、统一会话动作、批量动作、导航动作、选择状态、选中邮件上下文、活跃会话上下文、待跟进、评论、Telegram/Live Chat 回复等 hooks。
- [x] 已拆出 Inbox Live Chat 对话面板，使访客上下文、AI 建议、内部备注和回复框可以独立演进。
- [x] 已拆出 Telegram/Live Chat 自动翻译状态、缓存、持久化和自动触发逻辑，统一放入共享 hook。
- [x] 已拆出 Live Chat socket/会话副作用，并清理旧的注释版会话列表死代码。
- [x] 已拆出创建 Lead 和添加到已有客户的弹窗编排逻辑，统一放入联系人关联组件。
- [x] 已拆出确认、通知、附件上传、标签和待办设置等辅助弹窗。
- [x] 已拆出 Inbox 右侧内容面板，将写邮件、发起 WhatsApp、Email、WhatsApp、Live Chat、Telegram 和空状态从页面壳层中隔离。
- [x] 已拆出 WhatsApp 消息渲染到 `WhatsAppMessageList`，并将 WhatsApp 媒体/翻译展示辅助逻辑移动到共享消息模型。
- [x] 已拆出 WhatsApp 聊天顶部控制区到 `WhatsAppChatHeader`，隔离关联客户操作、chatId 映射、Hub client 选择、自动翻译和 Agent Mode 开关。
- [x] 已拆出 WhatsApp 会话元信息区到 `WhatsAppConversationMetaBar`，将标签和内部备注控制从聊天 modal 中隔离。
- [x] 已拆出 WhatsApp 输入发送区到 `WhatsAppMessageComposer`，隔离附件、媒体库、emoji、定时发送、发送前翻译、AI 起草和发送按钮。
- [x] 已拆出 WhatsApp 聊天数据加载到 `useWhatsAppChatData`，隔离 Hub client/message 加载、本地消息缓存恢复、后台同步、窗口聚焦轮询和 sticky sender 选择。
- [x] 已拆出 WhatsApp 翻译执行到 `useWhatsAppTranslation`，隔离入站自动翻译、发送前翻译、翻译持久化、本地翻译缓存写入和翻译中状态。
- [x] 已拆出 WhatsApp 会话摘要压缩到 `useWhatsAppConversationSummary`，隔离长对话压缩、请求去重和会话摘要回写。
- [x] 已拆出 WhatsApp chatId 映射到 `useWhatsAppChatMapping`，隔离 inline 映射编辑状态、校验、Hub 映射 API、会话回写和重载行为。
- [x] 已拆出 WhatsApp 会话元信息写入到 `useWhatsAppConversationMeta`，隔离标签更新、内部备注、待跟进 marker 解析和备注删除。
- [x] 已拆出 WhatsApp AI 起草到 `useWhatsAppDrafting`，隔离客服/起草 prompt 执行、CRM/RAG/产品上下文组装和 AI 生成中状态。
- [x] 已拆出 WhatsApp 发送逻辑到 `useWhatsAppSending`，隔离媒体上传、Agent Mode 发送生成、发送前翻译持久化、Hub 发送调用、CRM 日志和发送后清理。
- [x] 已拆出 WhatsApp 客户关联逻辑到 `useWhatsAppClientLinking`，隔离 New Lead/Add to Existing Client 弹窗状态、会话关联客户 PATCH 和创建后自动关联。
- [x] 已拆出 WhatsApp 智能体上下文建议到 `WhatsAppContextSuggestionsPanel`，隔离建议侧栏、起草/备注/待跟进操作、删除操作和分析结果回写。
- [x] 已拆出 WhatsApp 输入区状态到 `useWhatsAppComposerState`，隔离正文、附件、媒体库、emoji、定时发送开关和切换会话后的清理。
- [x] 已拆出 WhatsApp 聊天选择派生状态到 `useWhatsAppChatSelection`，隔离显示号码解析、关联 CRM 客户识别、可选 Hub client 过滤、sticky sender 选择和无效 sender 重置。
- [x] 已拆出 WhatsApp 弹窗层到 `WhatsAppDialogLayer`，将媒体库、New Lead 和 Add to Existing Client 弹窗从聊天壳层中隔离。
- [x] 已拆出 WhatsApp 智能体上下文准备到 `useWhatsAppAgentContext`，隔离压缩记忆、最近入站/出站识别、关联 Lead、统一 Agent 上下文和外发语言选项。
- [x] 已拆出 WhatsApp 消息滚动逻辑到 `useWhatsAppMessageScroll`，隔离最新消息 id、底部定位 ref、自动滚动定时器和媒体加载后滚动。
- [x] 已拆出 Inbox 弹窗层 props 装配逻辑，将关闭、上传附件、标签和待跟进等回调 wiring 移出页面组件。
- [x] 已拆出 Inbox 侧栏 props 装配逻辑，将筛选、列表和批量操作 wiring 移出页面组件。
- [x] 继续把 `Inbox.tsx` 收敛为页面编排层，再替换整体布局。
- [x] 对其他大型详情页/记录页使用同样的渐进式抽组件方式。`ClientDetails.tsx` 已通过 UI 状态、页面动作、数据选择、布局、主栏/侧栏/评论和弹窗层抽离完成瘦身。

### 阶段 1：Design System 基础层

- [-] 建立共享 UI 基础组件：`PageHeader`、`SectionHeader`、`ActionBar`、`Toolbar`、`FilterBar`、`StatusBadge`、`OwnerStageControl`、`EmptyState`、`ConfirmDialog`、`DataTable`。`PageHeader`、`SectionHeader`、`ActionBar`、`Toolbar`、`FilterBar`、`StatusBadge`、`EmptyState`、`IconButton`、`ActionButton`、`ModalDialog`、`ConfirmDialog` 和 `DataTable` 已有初始实现。产品和报价列表标题区已开始使用共享页面标题模式；知识库搜索和批量操作区已开始使用共享筛选/操作栏；报价和客户列表已使用共享数据表格，客户头部操作和删除确认已使用共享标题/操作/确认组件。
- [-] 统一运营页面的间距、字体层级、按钮层级、输入框、Tabs、图标和信息密度。已加入共享 `SearchInput`，产品和报价列表搜索已开始使用统一搜索输入；客户列表的标签/国家搜索已开始使用共享 `TagSearchInput`；客户列表/地图与产品/报价切换已开始使用共享 `SegmentedControl`。
- [-] 建立共享布局组件：`CRMWorkspaceLayout`、`RecordPageLayout`、`LeftListMiddleDetailRightPanelLayout`、`WidgetRail`。`CRMWorkspaceLayout` 已有初始实现，并支持 header/body 滚动控制；产品/报价工作区和客户/线索工作区已开始使用。`RecordPageLayout` 已有初始实现，客户详情布局已委托给它。`WidgetRail` 已开始承载客户详情右侧 widgets。`LeftListMiddleDetailRightPanelLayout` 已提供可复用三栏工作区骨架，Inbox 的可拖拽工作区也已开始复用它的三栏基础样式。Inbox 已升级 `ConversationContextRail`，用于承载 Email、WhatsApp、Telegram、Live Chat 的上下文和智能体建议区域，并支持标题、描述、操作区、panel/rail 样式和折叠行为。Email、WhatsApp、Live Chat 和 Telegram 的上下文/智能体建议区域已开始使用 rail 样式，并带轻量标题与折叠控制。
- [ ] 保持 CRM 高频工作场景的紧凑、可扫读、可重复操作，而不是做成营销页风格。

### 阶段 2：客户 / Lead 详情页

- [ ] 将客户/Lead 详情重构为类似 HubSpot 的销售作战室。
- [ ] 使用清晰三栏结构：左侧身份与属性，中间活动时间线和全渠道历史，右侧 AI、任务、报价、联系人、RAG、待审批 widget。
- [ ] 在 UI 上明确区分客户级情报和 Lead 级情报。
- [ ] 把“下一步最佳行动”作为销售工作的主入口。
- [ ] 在不过度拥挤主时间线的情况下展示报价、联系人、关联产品、RAG 依据、待处理任务和渠道历史。

### 阶段 3：统一沟通工作区

- [ ] 将 Inbox 重构为类似 HubSpot 的统一沟通工作区。
- [ ] 保留统一左侧会话列表，并支持渠道筛选、保存视图、批量操作和分配控制。
- [-] Email、WhatsApp、Live Chat、Telegram 使用一致的中间会话/详情区域。Email、WhatsApp、Live Chat 和 Telegram 已开始使用试点布局：消息/正文和内部备注保留在主区域，渠道上下文和 Agent 建议在大屏进入独立右侧 rail。
- [-] 增加可选右侧上下文栏，用于展示关联客户/Lead、AI context evidence、RAG snippets、任务和最近活动。Email、WhatsApp、Live Chat 和 Telegram 的初始右侧上下文 rail 已落地。
- [-] 抽出共享沟通详情分栏布局。`ConversationSplitPane` 已用于 Email、Live Chat 和 Telegram 详情；WhatsApp 在内嵌模式下已保持同样视觉分栏，并已先拆出消息渲染层，下一步可更安全地接入共享布局组件。
- [ ] 保留各渠道特有能力，如邮件 WYSIWYG、WhatsApp 媒体、翻译、定时发送和人工接管，同时统一布局模式。

### 阶段 4：Agent 运营中心

- [ ] 将 Agent Hub 收敛为更清晰的运营中心：任务队列、审批、执行历史、健康状态、Agent 配置。
- [ ] 让任务来源、关联对象、负责 Agent、风险、审批状态和执行结果更直观。
- [ ] Agent Chat 保持为辅助入口，而不是主执行流程。
- [ ] 增强 Context Evidence、工具结果、跳过原因和修复建议的可视化。

### 阶段 5：Dashboard 与增长运营

- [ ] Dashboard 从“图表集合”转为更可执行的经营洞察。
- [ ] 突出待跟进工作量、停滞 Deals、渠道转化趋势、Agent 贡献、线索质量来源分析和每日运营摘要。
- [ ] 游戏化机制继续与真实销售结果绑定，减少单纯刷操作得分。

### 阶段 6：设置与后台管理一致性

- [ ] 将 Settings 重新组织为清晰的后台分类：AI & Integrations、Channels、Users & Roles、Notifications、API Tokens、Data/RAG、Gamification、Currency、System Health。
- [ ] 统一表单、分区布局、校验状态和保存反馈。
- [ ] 高风险设置和破坏性操作需要明显区分，并带审计和审批上下文。

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

## Telegram Bot Webhook API

Telegram Bot inbound messages can be ingested through a scoped API token. Create a token with the `Telegram Bot Webhook` template in Settings -> API Tokens, then configure your Telegram Bot webhook or middleware to call:

`POST /api/telegram-bot/webhook`

Request:

```json
{
  "apiToken": "tq_generated_telegram_webhook_token",
  "update": {
    "update_id": 178000000,
    "message": {
      "message_id": 42,
      "date": 1780000000,
      "chat": { "id": 123456789, "type": "private", "username": "alexsolar" },
      "from": { "id": 123456789, "first_name": "Alex", "username": "alexsolar" },
      "text": "Hi, I want to know more about solar monitoring."
    }
  }
}
```

Response:

```json
{
  "ok": true,
  "duplicate": false,
  "conversation": {
    "id": "tg_conv_user_hash",
    "telegramChatId": "123456789",
    "username": "alexsolar",
    "displayName": "Alex",
    "status": "open"
  },
  "message": {
    "direction": "inbound",
    "body": "Hi, I want to know more about solar monitoring.",
    "messageType": "text"
  },
  "agentMessage": {
    "direction": "outbound",
    "body": "Hi Alex, thanks for reaching out. Could you share your target project size and country?",
    "messageType": "text"
  }
}
```

Notes:

- The token must include `telegram.webhook`.
- The endpoint stores Telegram conversations and messages locally, deduplicates Telegram webhook retries, syncs them into the unified conversation/message model, triggers `telegram_received`, and can send Bark/Webhook notifications.
- Customer linking checks Telegram username, Telegram user id, and contact phone when available.
- CRM operators can reply from the unified Inbox after enabling Telegram Bot and setting the Bot Token in Settings -> AI & Integrations -> Telegram Bot. Sent replies are stored back into Telegram and the unified conversation model.
- If the `Telegram Customer Service Agent` is active and the conversation is not under human takeover, new inbound webhook messages can trigger unattended Telegram replies. Duplicate Telegram webhook retries do not trigger another Agent reply.
- Human takeover can be toggled from the Telegram conversation header in the unified Inbox. When enabled, the Agent is paused for that conversation until takeover is released.
- Agent Hub runs that include Telegram tools now use a Telegram-specific executor. Event-triggered runs process the related conversation; manual or scheduled runs process recent open conversations. Each step writes `resultMeta` so operators can see whether the tool only read context or landed a reply/tag/escalation.

Manual operator reply:

```http
POST /api/telegram/conversations/tg_conv_user_hash/messages
Authorization: Bearer <crm-token>
Content-Type: application/json
```

```json
{
  "body": "Thanks, I will ask our engineer to confirm the monitoring gateway model."
}
```

Conversation controls:

```http
PATCH /api/telegram/conversations/tg_conv_user_hash
Authorization: Bearer <crm-token>
Content-Type: application/json
```

```json
{
  "humanTakeover": true,
  "priority": "high",
  "tags": ["needs-engineer"]
}
```

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
- Agent Context & Suggestions now uses one shared context builder across Email, WhatsApp, Live Chat, and Telegram. It reads the latest inbound customer messages together with customer profile, AI summary, best next step, score, comments, logs, other-channel history, compressed channel memory, products, and RAG context.
- Team outbound messages are included only as background context. They are explicitly separated from inbound customer messages and must not be interpreted as customer intent.
- Email and WhatsApp keep channel-native Agent Context analysis persistence. Live Chat and Telegram store their Agent Context analysis on the shared `communication_conversations` record, so cached analysis survives navigation and refresh.
- The backend exposes `GET /api/agent-context?conversationId=<communication_conversation_id>` as the shared Context Service. Inbox Agent Context panels prefer this server context and fall back to the local frontend builder when a unified conversation id is not available.
- Unattended Live Chat, Telegram, WhatsApp Customer Service, and Email Draft agents also consume the shared Context Service before drafting a reply, so backend automation uses the same customer summary, best next step, cross-channel history, product context, and RAG evidence shown in Inbox.
- Internal AI outputs such as AI Radar summaries, customer intelligence, lead summaries, and recommended next steps are normalized to the system language before being saved. Changing the system language also invalidates stale analysis signatures so old-language results can be regenerated.
- Live Chat conversations are embedded directly in the unified Inbox reading pane. Operators can read/reply, toggle human takeover, run the Live Chat Agent, set follow-ups, delete/request review, and use Agent Context & Suggestions without leaving Inbox. The standalone Live Chat Desk remains the seat-management and monitoring view.
- Live Chat tags and internal notes use the linked customer as the primary destination when a customer is attached. Unlinked visitor conversations keep tags and notes on the conversation until they are linked or converted.
- Inbox Live Chat shows visitor context evidence such as page URL, IP, browser, OS, language, timezone, local time, and message timing. The same evidence plus recent transcript, customer tags, and recent customer notes is passed into Agent Context & Suggestions so recommendations are easier to audit.
- Unified Inbox is now the primary Live Chat conversation surface. The standalone Live Chat page remains for seat monitoring and operational management, not as the default message-reading path.
- Telegram conversations in the unified Inbox support `New Lead` and `Add to Existing Client` using Telegram username, Telegram user id, or chat id. Once linked, Telegram tags and internal notes use the customer profile as the primary destination; unlinked conversations keep those records on the conversation.
- Telegram conversations also show Agent Context & Suggestions in the unified Inbox. Operators can draft a Telegram reply using the same customer/RAG/product/cross-channel context without sending it automatically.

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
- 智能体上下文与建议现在在 Email、WhatsApp、Live Chat 和 Telegram 中共用同一套上下文构建器。它会读取最新客户入站消息，并结合客户资料、AI 摘要、最佳下一步、评分、评论、日志、其他渠道沟通历史、压缩后的渠道记忆、产品和 RAG 上下文。
- 我方发送的 outbound 消息只作为背景上下文，并会与客户入站消息明确分离，不能被解释为客户意图。
- Email 和 WhatsApp 继续使用各自渠道的智能体上下文分析持久化；Live Chat 和 Telegram 会把分析结果保存到统一的 `communication_conversations` 记录中，因此切换页面或刷新后仍可复用缓存分析。
- 后端提供 `GET /api/agent-context?conversationId=<communication_conversation_id>` 作为统一 Context Service。收件箱里的智能体上下文面板会优先使用服务端上下文；当缺少统一会话 ID 时，才回退到前端本地构建器。
- Telegram 会话在统一收件箱中也会显示智能体上下文与建议；运营人员可以基于同一套客户/RAG/产品/跨渠道上下文起草 Telegram 回复，草稿不会自动发送。

补充：无人值守的 Live Chat、Telegram、WhatsApp Customer Service 和 Email Draft Agent 在起草回复前也会读取统一 Context Service，因此后台自动化会使用与收件箱一致的客户摘要、最佳下一步、跨渠道历史、产品上下文和 RAG 证据。

补充：AI Radar 摘要、客户级情报、Lead 摘要和推荐下一步等对内 AI 输出，会在保存前归一为系统语言；系统语言变化也会使旧分析签名失效，从而允许重新生成对应语言的结果。

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
2. Ensures the deploy target and `/opt/ai-crm/rag-import` exist on the VPS.
3. Syncs files to the VPS.
4. Builds the Docker image before replacing the running container.
5. Starts containers with `docker compose up -d --remove-orphans`.
6. Polls `/api/healthz` until the app and database are ready, or prints container status/logs when the check fails.

Optional GitHub Actions secret:

- `HEALTHCHECK_URL`: override the default `http://127.0.0.1:3003/api/healthz` if the container is exposed on another host or port.

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
- `communication_conversations`: unified Email, WhatsApp, and Live Chat conversation index for cross-channel CRM workflows.
- `communication_messages`: unified message index linked to `communication_conversations`.
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
- Email、WhatsApp 和 Live Chat 已有统一的 `communication_conversations` / `communication_messages` 后端索引。原渠道表仍作为事实来源，统一模型用于后续 CRM 作战室迭代。
- 登录后的接口可通过 `GET /api/conversations`、`GET /api/conversations/:id/messages`、`PATCH /api/conversations/:id` 和 `DELETE /api/conversations/:id` 读写统一沟通层。
- 收件箱内的会话级操作已统一走 Email、WhatsApp、Live Chat 共用接口：删除/归档、待跟进、重要、标签、评论、负责人/阶段、客户关联都会写入 `/api/conversations`，再同步回对应渠道记录。
- 渠道原生 API 仍负责发送邮件、发送/同步 WhatsApp、媒体上传、定时发送、chatId 映射，以及 Live Chat 访客/座席消息传输。
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
- 网站 API Token 可在 Settings -> API Tokens 中生成和吊销。权限模板包括 Live Chat Agent、Live Chat Public Only、Website Lead Capture、Telegram Bot Webhook 和 Product Catalog Read。

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

- 知识库条目包含标题、内容、可选客户关联、embedding 向量，以及 `sourceType`、`sourcePath`、`sourceHash`、源文件修改时间、导入批次和导入状态等来源元数据。
- RAG 会检索全局知识库；有客户上下文时也会检索客户专属知识。客户专属知识拥有更高检索权重，全局知识则作为产品/公司级上下文补充。
- 全局 RAG 支持从服务器指定文件夹批量导入。服务端配置 `KNOWLEDGE_IMPORT_DIR` 或 `RAG_IMPORT_DIR` 后，把结构化文件放入该目录，即可在知识库页面导入配置根目录或相对路径子目录。
- 文件夹导入支持 `.txt`、`.md`、`.markdown`、`.json`、`.csv`、`.tsv`、`.html`、`.htm` 和 `.pdf`。重复导入同一个相对路径文件会更新同一条知识库，不会重复创建。
- 文件夹导入支持增量同步：内容 hash 未变化的文件会跳过，内容变化的文件会重新生成 embedding，新文件会创建，源文件已删除的 folder-sourced RAG 条目会同步删除以清理陈旧向量。如果扫描触达 `maxFiles` 上限，删除同步会自动跳过，避免部分扫描导致误删。
- 删除知识库条目时，会从同一张 `knowledge_base` 表中硬删除内容和 embedding。
- 删除后，后续 RAG 不会再检索到该条知识。
- AI/Agent Prompt 会带上 RAG 引用元数据，例如作用域、来源路径/类型和相关度分数，便于判断答案使用的是客户知识还是全局知识。
- 如果更新知识库时 embedding 生成失败，正文会更新且旧 embedding 会被清空，避免正文和旧向量不匹配。

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
- 不同功能模块可以指定不同模型，例如 drafting、analysis、embedding、Execution Engine、Prompt Builder、Tool Selection、Context Suggestions、WhatsApp Drafting 和 Global Orchestrator。
- 默认选项不会强制依赖 Gemini。

## Agent Hub

Agent Hub 是系统的智能体运行中心，负责任务队列、审批中心、执行日志、智能体配置，以及运营人员和智能体之间的对话。

### 系统 Agent

系统 Agent 内置且不可删除，名称不可修改，因为名称代表系统角色定位。

- Global Orchestrator：把 CRM 目标拆解为进入任务队列、受执行策略约束的任务，并协调各专门智能体。
- Signal Scanner Agent：扫描 CRM 信号并创建机会任务。
- Lead Data Agent：基于产品、知识库和客户画像获取、导入、富集、去重和标准化线索。
- Lead Scoring Agent：为 lead 评分，生成 lead 摘要和最佳下一步。
- AI Follow-Up Agent：生成客户跟进建议和邮件/WhatsApp 草稿。
- WhatsApp Inbox Agent：读取 WhatsApp 对话上下文并建议下一步。
- Context Suggestion Agent：分析邮件/WhatsApp 上下文并给出建议。
- Email Draft Agent：结合 CRM、产品和 RAG 起草邮件。
- WhatsApp Draft Agent：结合 CRM、产品和 RAG 起草 WhatsApp 风格消息。
- Live Chat Agent：处理网站访客 live chat，并在需要时转交人工座席。
- Telegram Customer Service Agent：Telegram Bot 智能客服系统 Agent。已支持入站 webhook、消息持久化、通知、Agent Hub 事件、Bot API 回复、AI 自动回复、人工接管、客户关联、标签和执行历史。
- Agent Prompt Builder Agent：根据用户目标、产品、知识库、工具、护栏和语言策略生成 Agent 指令。
- Agent Tool Selection Agent：根据 Agent 名称和 Prompt 从工具注册表中选择工具。

系统 Agent 支持一键恢复默认最佳实践配置。

### 自定义 Agent

- 用户可以创建、编辑、启动、暂停和删除自定义 Agent。
- 自定义 Agent 包含指令、工具、护栏、定期运行、事件触发、事件作用范围和执行策略。
- 工具通过工具选择器配置，不再手动输入逗号字符串。
- AI 可以生成 Prompt，也可以自动选择工具。这两个动作由系统 Agent 完成，并会增加对应系统 Agent 的已处理任务数。
- Agent 名称定义角色，Prompt/指令定义行为、上下文检查、幂等规则、风险规则和输出格式。

### 智能体控制台

- Agent Hub 默认打开任务队列，让运营人员优先看到待处理工作。
- 智能体控制台用于询问智能体、引用客户/线索上下文、生成任务和优化智能体指令。
- 点击左侧 Agent 即可与该 Agent 对话。
- 控制台会显示该 Agent 的用户友好使用说明，而不是直接展示原始 Prompt。
- `@` 用于引用客户/线索，不用于选择 Agent。
- 聊天记录会持久化，按时间顺序显示，并支持删除和清空。
- Agent 可以在控制台中调用自己有权限的工具，执行时显示 loading，完成后在聊天中反馈结果；如需审核，会在对应聊天窗口内显示审核按钮。
- 正式执行仍会进入任务队列、审批中心、执行策略和执行日志。

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

### 第二层：任务队列与路由策略

机会任务集中在 Agent Hub -> 任务队列中。

任务队列现在由统一的 `Agent Task` 记录承载。定时运行、Signal Scanner 发现、事件触发、手动操作和智能体控制台请求，都应该先规范化为同一种任务结构，再进入执行流程。

核心字段包括 `source`、`triggerType`、`entityType`、`entityId`、`agentId`、`status`、`risk`、`dedupeKey`、`approvalStatus`、`runId`、`retryCount` 和时间戳。旧机会任务会桥接成确定性任务 ID，例如 `task_<opportunityId>`，保证旧数据和新的任务执行模型保持同步。

任务生命周期状态统一为 7 个队列状态：`open`、`queued`、`approval_required`、`running`、`completed`、`failed`、`ignored`。旧状态如 `pending_review`、`approved`、`rejected`、`complete` 或 `skipped` 会在 Agent Hub 数据边界被转换，避免旧 Harness / Global Agent 记录把并行生命周期语义带回当前任务队列。

每个任务还会记录完整审计字段：`triggeredBy`、`triggeredAt`、`approvedBy`、`approvedAt`、`executedBy`、`executedAt` 和 `affectedRecords`。任务详情抽屉会显示谁触发、谁审核、谁执行，以及哪些 CRM 记录被读取、写入、发送、导入、起草或影响。

任务卡片和任务详情抽屉会显示来源链路：来源 -> 关联主体 -> 负责 Agent -> 路由结果。这样运营人员可以直接判断任务为什么出现、影响哪条记录、由哪个 Agent 负责，以及当前是等待策略路由、审核、执行、完成还是忽略状态。

执行追踪步骤会包含落地元数据。每个工具调用可以显示它只是读取/分析上下文，还是已经真实落地写入、发送或创建动作，并附带简洁证据，例如草稿 ID、导入线索数量、发送渠道、标签、报价编号或更新记录。

路由策略决定每个机会任务：

- 保留为手动派发。
- 自动派发。
- 进入人工审核。
- 在风险和护栏允许时自动执行。

机会任务通过 `dedupeKey` 去重。

- 活跃机会任务不会重复创建。
- 失败机会任务会复用，不再新建副本。
- 已完成或已忽略的机会任务 30 天内不会重新创建，避免同一个客户/邮件线程每小时重复派发。
- 从任务队列移除任务时，会把关联机会任务标记为 `ignored`，而不是硬删除。这样可以保留去重墓碑，刷新页面或下次扫描后不会重新出现。

### 第三层：执行引擎

执行引擎负责执行 Agent 工作流，并记录完整追踪。它不是独立业务智能体，而是负责工具权限、审批门禁、工具执行和审计记录的运行层。

它记录：

- 计划。
- 预期结果。
- 实际结果。
- 工具步骤。
- 风险等级。
- 审核状态。
- 执行时间和完成时间。

执行输出以 timeline 显示。长步骤默认只显示部分步骤，可点击显示全部。

### 与 Global Orchestrator 和执行引擎的关系

- Global Orchestrator 是高层策略与统筹者。
- Signal Scanner 负责发现任务。
- 任务队列负责排队和路由。
- 执行引擎负责可追踪执行和人工审核。
- 各个专业 Agent 负责执行具体工作。

旧的直接定时执行逻辑已经优化为先进入机会任务机制，避免定时执行、事件触发和手动执行互相冲突。

旧的直接规划接口 `/api/global-agent/plan` 和 `/api/agent-harness/plan` 已弃用，会返回兼容错误。新的规划和执行应统一进入 Agent Hub 的任务队列、审批中心、Agent Run 和执行日志。

### Agent 状态持久化

关键 Agent Hub 状态正在从 `users.settings` JSONB 逐步迁移到独立数据库表：

- `agent_run_records`
- `agent_opportunities`
- `agent_tasks`
- `agent_harness_runs`
- `global_agent_plans`

为保持兼容，`/api/user/settings` 仍会返回这些数组。读取时，数据库表记录和旧 JSON 数组会按 `updatedAt` 合并，较新的记录优先。写入时，传入的 Agent 数组会同步回独立表。这样既不破坏现有前端流程，也能让任务、审批和执行记录更稳定、更方便查询。

### 系统健康检查

Agent Hub 包含 Health 标签页，后端接口为 `GET /api/system/health`。它现在是实际运行监控面板，而不只是配置检查清单。

Health 标签页包含统一的 Worker 状态表，覆盖：

- Email Sync。
- WhatsApp Sync。
- Live Chat Agent。
- Signal Scanner。
- Agent Hub Scheduler。

每个 Worker 会显示当前状态、最近运行时间、耗时、成功/失败次数、最近错误、简要运行明细，以及可计算时的下次运行时间。

同一个 Health API 还会返回：

- 启动诊断：必要环境变量、RAG 导入目录访问、数据库迁移、后台 worker 注册。
- 邮件同步配置和真实运行状态。
- WhatsApp Actor Hub 配置、Actor 池和同步运行状态。
- Live Chat 会话状态和 Live Chat Agent 运行状态。
- Agent Scheduler 轮询周期、定时 Agent、事件触发 Agent 和 Signal Scanner 运行状态。
- Bark/Webhook 通知配置。
- RAG 条目数量、embedding 数量和导入目录配置。
- LLM Provider 和模块映射配置。
- Agent 独立持久化表记录数量。
- Agent Hub 修复诊断：检查引用已删除邮件、不存在邮件、不存在客户或不存在 Lead 的任务。Health 标签页提供修复操作，可关闭这些无效任务/运行，避免刷新后恢复或重复派发。

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
| `telegram.read` | Telegram 连接器启用后读取 Telegram Bot 会话。 |
| `telegram.reply` | Telegram 连接器启用后使用对外安全上下文通过 Telegram Bot 回复。 |
| `telegram.escalate` | 将 Telegram 会话标记为人工接管或高优先级审核。 |
| `telegram.tag` | 添加或更新 Telegram 会话标签。 |
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

Agent Execution Policy 使用的 Global Orchestrator action type：

`create_lead_campaign`, `run_lead_campaign`, `create_followup_workflow`, `process_customer_reply`, `send_email`, `send_whatsapp`, `update_client_stage`, `add_client_comment`, `enrich_client_data`, `create_deal`, `create_quote`, `prioritize_leads`, `review_pipeline`。

## Agent 工具执行器路线图

执行引擎目前已经补齐以下后端工具执行器：

- 邮件工具：`email.delete`、`email.tag`、`email.comment`。
- 产品工具：`product.create`、`product.update`、`product.delete`。
- 知识库工具：`knowledge.create`、`knowledge.update`、`knowledge.delete`。
- 客户工具：`client.create`、`client.delete`、`client.tag`。
- Lead 工具：`lead.create`、`lead.delete`、`lead.tag`。

每个执行步骤都会写入 `resultMeta`，用于说明该工具是否真实落地、是否只读、是否跳过，以及影响了哪些记录。删除/归档类工具仍属于高风险动作，应继续由 Agent Execution Policy 和审批规则治理。

其他路线图事项：

- [x] Telegram Bot 智能客服结构接入：已注册 Telegram 工具、Telegram Customer Service Agent、权限、事件触发、通知事件和 API Token 模板。
- [x] Telegram Bot 入站连接器：受限 webhook API、Telegram 会话/消息持久化、统一 conversation 索引、去重、客户关联、通知和 Agent Hub 事件触发。
- [x] Telegram Bot 出站回复层：Settings Bot Token 配置、Bot API `sendMessage`、Inbox 回复框、出站消息持久化和统一 conversation 同步。
- [x] Telegram Bot 自动化层：AI 自动回复、更完整的客户/Lead 关联控制、人工接管控制，以及 `telegram.read`、`telegram.reply`、`telegram.tag`、`telegram.escalate` 的 Agent Hub 执行器。

## 产品 Roadmap

建议的近期 Roadmap：

### 阶段 1：Agent Hub 清晰度与可运营性

- [x] 把任务队列、审批中心、执行策略、执行引擎和执行日志作为定时、事件、手动和控制台触发工作的正式执行路径。
- [x] 将 Agent Chat 定位为辅助入口，而不是 Agent Hub 的主工作流。
- [x] 从任务队列移除任务时标记为 ignored，避免刷新或下次扫描后重新出现。
- [x] 为任务队列增加筛选：开放、待审批、运行中、已完成、失败、已忽略。
- [x] 增加任务详情抽屉，展示触发原因、关联客户/Lead/消息、推荐 Agent、风险原因、dedupeKey 和无法执行原因。
- [x] 增加批量任务操作：忽略、重新打开、派发、标记完成、分配负责 Agent。

### 阶段 2：Agent 可靠性与诊断

- [x] 增加 Agent 健康卡片：最近运行时间、成功率、连续失败次数、跳过数量、下次运行时间。
- [x] 执行日志支持按 Agent、状态、触发来源、风险和时间范围筛选。
- [x] 聚合失败和跳过原因，例如渠道未配置、幂等跳过、未关联主体、需要审批等。
- [x] 增加 Agent dry run / 模拟运行，执行前预览会影响哪些记录、计划调用哪些工具。

### 阶段 3：数据与后台任务加固

- [x] 将关键 Agent 任务、审批、执行记录从 user settings JSON 逐步迁移到独立数据库表。
- [x] 增加系统健康检查页面，覆盖邮件同步、WhatsApp 同步、Live Chat Agent、Scheduler、通知投递、RAG 索引和 LLM Provider。
- [x] 启动时检查必要目录、环境变量、数据库迁移和后台 worker。
- [x] 将 Health 从配置检查升级为真实 Worker 运行监控，显示最近运行、耗时、成功/失败、错误原因和下次运行时间。
- [x] GitHub Actions 部署后增加自动 health check。

### 阶段 4：统一沟通与 CRM 作战室

- [x] 增加 Email、WhatsApp、Live Chat 统一 conversation/message 后端索引和统一读取 API。
- [x] 将 Inbox 左侧会话列表迁移到统一沟通模型。Email、WhatsApp、Live Chat 共用同一列表、搜索、渠道筛选和时间排序；点击后打开原有渠道详情视图。
- [x] 增加统一 conversation 写入 API，并将 Inbox 批量标签、内部备注、重要标记、待跟进、邮件删除、WhatsApp 删除、Live Chat 关闭/归档迁移到统一入口。
- [x] 在统一沟通 UI 中加入负责人和阶段控制。Inbox 支持单条和批量更新负责人/阶段，阶段会同步到已关联客户状态。
- [x] 将 Dashboard 待跟进负载和 Agent Hub 任务主体类型接入统一 conversation 模型，让 Email、WhatsApp、Live Chat 的提醒能一致呈现。
- [x] 增加跨渠道统一搜索。搜索覆盖会话字段、关联客户字段、标签、备注、metadata 和历史消息正文。
- [x] 为 Email 和 WhatsApp 右侧详情加入共享 conversation header。详情页已共享渠道标识、关联客户入口、标签、负责人、阶段和主要动作，同时保留各渠道原有正文、发送和回复逻辑。
- [x] 为 Email 和 WhatsApp 详情加入共享待跟进状态条。运营人员可在同一位置查看、设置、取消和完成会话待跟进；Email 兼容旧 `todoAt` 字段，WhatsApp 兼容原 follow-up marker comments。
- [x] 完成 Inbox 会话操作迁移收尾。单条和批量删除、待跟进、重要、标签、评论、客户关联操作现在都会优先走统一 conversation API；旧渠道 store 仅作为本地草稿或尚未索引记录的兜底。
- [x] 强化客户/Lead 作战室 widgets：AI Summary、Best Next Step、Quotes、Contacts、RAG 依据、待处理任务和全渠道历史。
- [x] 客户级和 Lead 级 AI 分析增加 diff 机制，记录无变化时不重复消耗 AI；手动 AI Radar 和后台洞察型 Agent 都会复用未变化签名并跳过模型调用。

### 阶段 5：治理、RAG 与运营体验

- [x] 增加基于角色的权限，覆盖 Agent 工具、外发消息、破坏性操作和 API Token。
- [x] API Token 管理接入 `api_token.manage` 角色权限，仅 superadmin/admin 可查看、生成和吊销网站/API Token。
- [x] Agent 工具执行接入角色权限矩阵。Email/WhatsApp 外发、Live Chat 回复、报价、客户、Lead、产品、知识库和删除类工具都会按当前用户角色校验。
- [x] 敏感动作增加审批评论、审批人、回滚元数据和审计日志。
- [x] Agent Hub 审批中心支持批准/拒绝时填写审批原因，并写入任务、运行记录和后端执行状态。
- [x] 沟通记录删除增加审计日志。统一会话删除和 WhatsApp 会话删除会记录操作者、渠道、关联客户、原因、影响记录和成功/待审状态。
- [x] 产品、报价、知识库的创建、更新、删除都会写入独立审计日志，包含操作者、风险级别、影响记录，以及更新前后或删除快照。
- [x] RAG 增加来源元数据、来源路径、更新时间、文件夹增量同步、删除同步、客户/全局检索权重和 AI 输出引用来源展示。
- [x] 通知系统增加通知历史、免打扰时段、模板和连续失败升级规则；Bark/Webhook 投递日志支持重试和清理。
- [x] 将游戏化积分和 EXP 与真实 CRM 结果绑定，并支持可配置规则。
- [x] 已将报价发出、进入寄样、进入谈判、赢单等真实销售结果接入可配置且幂等的积分与 EXP 奖励。

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

## Telegram Bot Webhook API

Telegram Bot 入站消息可以通过受限 API Token 接入。请在 Settings -> API Tokens 中创建 `Telegram Bot Webhook` 模板的 token，然后让 Telegram Bot webhook 或你的中间件调用：

`POST /api/telegram-bot/webhook`

Request：

```json
{
  "apiToken": "tq_generated_telegram_webhook_token",
  "update": {
    "update_id": 178000000,
    "message": {
      "message_id": 42,
      "date": 1780000000,
      "chat": { "id": 123456789, "type": "private", "username": "alexsolar" },
      "from": { "id": 123456789, "first_name": "Alex", "username": "alexsolar" },
      "text": "Hi, I want to know more about solar monitoring."
    }
  }
}
```

Response：

```json
{
  "ok": true,
  "duplicate": false,
  "conversation": {
    "id": "tg_conv_user_hash",
    "telegramChatId": "123456789",
    "username": "alexsolar",
    "displayName": "Alex",
    "status": "open"
  },
  "message": {
    "direction": "inbound",
    "body": "Hi, I want to know more about solar monitoring.",
    "messageType": "text"
  }
}
```

说明：

- Token 必须包含 `telegram.webhook` 权限。
- 接口会把 Telegram 会话和消息保存到 CRM 数据库，自动去重 Telegram webhook 重试，同步到统一 conversation/message 模型，并触发 `telegram_received` 事件和 Bark/Webhook 通知。
- 客户关联会尝试匹配 Telegram username、Telegram user id，以及 contact 消息中的手机号。
- 在 Settings -> AI & Integrations -> Telegram Bot 启用并配置 Bot Token 后，CRM 操作员可以在统一 Inbox 中直接回复 Telegram，会同步写回 Telegram 和统一 conversation 模型。
- Telegram Customer Service Agent 启用且会话未被人工接管时，新入站消息可以触发无人值守回复；Telegram 工具通过 Agent Hub 执行时会写入 `resultMeta`，用于说明本次是只读取上下文，还是实际落地了回复、标签或升级动作。

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
2. 确保 VPS 上部署目录和 `/opt/ai-crm/rag-import` 已存在。
3. 同步文件到 VPS。
4. 先构建 Docker 镜像，再替换运行中的容器。
5. 使用 `docker compose up -d --remove-orphans` 启动容器。
6. 轮询 `/api/healthz`，确认应用和数据库可用；如果检查失败，会输出容器状态和最近日志。

可选 GitHub Actions Secret：

- `HEALTHCHECK_URL`：如果容器暴露的地址或端口不是默认的 `http://127.0.0.1:3003/api/healthz`，可用此项覆盖。

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
- `communication_conversations`：Email、WhatsApp、Live Chat 统一沟通索引，用于跨渠道 CRM 工作流。
- `communication_messages`：关联到 `communication_conversations` 的统一消息索引。
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
