# Foreign Trade CRM (AI-Powered)

English | 中文

## English

Welcome to **Foreign Trade CRM**, a modern AI-powered customer relationship management system built for foreign trade teams. It combines CRM workflows, lead acquisition, multi-channel communication, gamification, AI agents, WhatsApp automation, email workflows, quotes, and data enrichment to help teams acquire leads and convert them more efficiently.

### Key Features

#### AI-Driven Automation and Agents
Use language models to automate CRM work and improve follow-up quality. The system supports multiple AI providers, including Gemini, OpenAI, and custom OpenAI-compatible endpoints.

- **AI Follow-Up Agent:** Assign an AI agent to specific clients. The agent can read long-term context, summarize the client's current status, suggest the next best action, and draft follow-up messages.
- **Agent Harness:** Build task-level orchestration for repeatable workflows such as lead acquisition, enrichment, tagging, WhatsApp outreach, email follow-up, and data cleanup.
- **Global Agent:** Coordinate the whole CRM with the goal of acquiring leads and improving conversion. Global Agent can plan work across lead acquisition, enrichment, email, WhatsApp, comments, quotes, stage updates, and follow-up tasks.
- **Email Drafting and Magic Commands:** Generate context-aware email drafts or short snippets based on client history. Global `/` commands can be used for AI assistance.
- **Client Analysis / AI Radar:** Analyze client background, logs, emails, and activity to generate icebreakers, sentiment readouts, and next-step suggestions.
- **Module Mapping:** Assign different AI providers or models to different functional modules in **Settings -> AI & Integrations**.

#### Lead Pool and Client Management
- **Public Lead Pool:** Discover, import, and claim potential clients from a shared lead pool.
- **Lead Acquisition Agent:** Create lead acquisition campaigns manually or through an agent. Campaigns can define keywords, industry, country, and batch size, and new leads are added to the public pool by default.
- **Lead Data Channels:** Support lead acquisition and enrichment channels such as Apify, PhantomBuster, Scrap.io, HasData, Decodo, and Clay.
- **Client Enrichment Rewards:** Earn points by filling missing client information such as country, address, company, and contact methods.
- **Client Edit Requests:** For public or restricted leads, users can propose updates for admin approval.
- **Kanban Pipeline:** Track clients and deals through `Leads -> Contacted -> Sample Sent -> Negotiating -> Closed Won`.
- **Comprehensive Profiles:** View client contact methods, comments, logs, emails, WhatsApp history, AI summaries, quotes, files, and related tasks in one place.

#### WhatsApp Actor Hub
- **Multi-Client WhatsApp Hub:** Manage multiple WhatsApp clients and conversations from a centralized inbox-like module.
- **Conversation Persistence:** WhatsApp messages are stored in the CRM and linked to matching client records when possible.
- **Message Sending:** Send text, emoji, media, and file messages through the connected WhatsApp Actor Hub.
- **Client Selection Rules:** A user can choose a specific WhatsApp client or random client. After sending to a customer, the client used for that customer becomes fixed unless manually changed.
- **Scheduled WhatsApp Messages:** Schedule WhatsApp sends from workflows or directly from WhatsApp Hub. If no suitable client is available, the message is sent when an available or specified client comes online.
- **Conversation Management:** Search conversations, add tags and comments, and open the linked client sidebar from the conversation header.
- **AI Agent Access:** AI Follow-Up Agent, Agent Harness, and Global Agent can use WhatsApp Actor Hub according to the same client selection and quota rules.
- **Quota Awareness:** Automated WhatsApp outreach should consider client send quota, reply rate, and account safety. Daily sending limits should adjust dynamically to reduce ban risk.

#### Email Inbox and Communication
- **Unified Inbox:** Manage incoming and sent emails inside the CRM.
- **Background Sync:** Email inboxes sync automatically in the background. The default interval is 1 hour and can be configured per email server.
- **Scheduled Emails:** Schedule email sending as part of manual workflows or AI workflows.
- **Multi-Channel Logs:** Track WhatsApp, phone, email, comments, and other interactions in client growth logs.

#### Gamification and Productivity
- **Level and Experience:** Earn EXP by adding clients, logging contact events, sending emails, and closing deals.
- **Points Economy:** Earn points through enrichment and tasks, then spend points to claim public leads.
- **Daily Quests and Streaks:** Complete daily challenges, such as waking up dormant clients, to earn bonus EXP.

#### Products, Quotes, and Invoices
- **Product Catalog:** Manage products, SKUs, pricing tiers, inventory, and descriptions.
- **Smart Quotes:** Build professional quotes from the product catalog, calculate totals, apply payment terms, and generate PDFs with company details.
- **Document Generation:** Manage and link PI, CI, SO, and other sales documents.

#### Admin and Permissions
- **Role-Based Access:** Support superadmin and standard user roles.
- **Edit Approvals:** Superadmins can review lead and client data enrichment proposals.
- **Global Preferences:** Configure CRM behavior, AI providers, module assignments, integrations, and email server sync intervals.

### Setup and Usage

#### First-Time Setup
1. The first registered user may need to be promoted manually to `superadmin` in the database, or use the initialized account `samlau0086@gmail.com`.
2. Go to **Settings -> Profile** to set company name, address, and contact information. These values appear on generated PDFs such as quotes.

#### Adding Custom AI Providers
1. Open **Settings** from the sidebar.
2. Go to **AI & Integrations**.
3. Add an AI provider.
4. Select the provider type: OpenAI, Gemini, or custom OpenAI-compatible endpoint.
5. Enter the API key, base URL if needed, and model name.
6. Under functional module assignments, assign providers/models to modules such as Magic Commands, Email Drafting, Client Analysis, Agent Harness, and Global Agent.

#### Configuring AI Follow-Up Agents
1. Open a client's detail card.
2. Find the **AI Follow-Up Agent** section and enable the agent.
3. Choose a tracking mode:
   - `Prompt Only`: Read logs, summarize status, and suggest next steps.
   - `Auto Email`: Draft follow-up emails based on client context.
4. Add agent context or instructions, such as "This client is price-sensitive, focus on ROI."
5. Run the agent to generate summaries and next-step suggestions.

#### Agent Harness and Global Agent Planning Cadence
Use **Agent Harness** for task-level orchestration, and use **Global Agent** for cross-system revenue planning.

**Agent Harness** is best for repeatable workflows such as lead acquisition, lead enrichment, WhatsApp outreach, email follow-up, tagging, and data cleanup. You usually do not need to regenerate an orchestration task before every run.

Recommended regeneration triggers:
- Business goal, target market, keywords, channels, or workflow rules changed.
- Data channel, API, AI provider, or model assignment changed.
- Message templates, scoring rules, enrichment requirements, or compliance limits changed.
- The latest execution results were poor and the workflow needs optimization.
- New capabilities were added, such as WhatsApp Actor Hub, media messages, scheduled sending, or new enrichment sources.

Default cadence:
- Regenerate manually when the workflow definition changes.
- Review and optimize weekly or biweekly for stable workflows.
- Keep generated tasks under human review before execution when they can affect customers or external channels.

**Global Agent** is the system-level coordinator. Its goal is to acquire leads and convert them by coordinating lead acquisition, enrichment, email, WhatsApp, comments, quotes, stage updates, and follow-up actions across the CRM.

Recommended cadence:
- Generate a daily execution plan for short-term actions: who to follow up with, which leads to enrich, what messages to send, and which stages to update.
- Generate a weekly strategy plan for target industries, countries, keywords, channel allocation, send quotas, and conversion bottlenecks.
- Regenerate immediately after major changes, such as AI provider changes, WhatsApp client quota changes, email reply spikes, lead source changes, or a visible drop in conversion quality.

All Global Agent plans should require human approval before execution. If approved, the agent can execute according to the reviewed plan; if rejected, regenerate or manually adjust the plan before running.

#### Agent Execution Policy
**Agent Execution Policy** controls which Global Agent actions can run automatically after planning, and which actions must wait for human review.

Where to configure:
1. Open **Settings**.
2. Go to **AI & Integrations**.
3. Find **Agent Execution Policy / Agent 执行策略**.
4. For each Global Agent action type, choose:
   - `Auto`: the step can run automatically after the plan is generated.
   - `Review`: the step waits for human approval before execution.
   - Risk level: `Low`, `Medium`, or `High`.

Default policy:
- Auto by default: `enrich_client_data`, `add_client_comment`, `prioritize_leads`, `review_pipeline`.
- Review by default: sending email, sending WhatsApp messages, updating client stage, creating quotes, creating deals, creating/running lead campaigns, processing customer replies, and creating follow-up workflows.

How it works:
- When Global Agent generates a plan, each step is labeled as `Auto` or `Review` according to the current policy.
- `Auto` steps run automatically after successful planning.
- `Review` steps remain in the pending review plan and require **Approve & Execute** before running.
- If automatic execution fails, the plan moves to `failed` and the failed step must be reviewed before continuing.
- If AI planning fails and the system creates a safe fallback plan, that fallback plan is not auto-executed and must be reviewed manually.

Recommended usage:
- Keep customer-facing actions as `Review`, especially email, WhatsApp, quotes, and stage changes.
- Use `Auto` for low-risk internal actions such as enrichment, internal comments, and lead prioritization.
- Review this policy whenever new channels, AI models, or automation capabilities are added.

#### Agent Tool Reference
Use these tool identifiers when configuring agents in **Agent Hub**. Keep customer-facing tools behind review unless the workflow is proven safe.

| Tool | Description |
| --- | --- |
| `global_agent.plan` | Generate a cross-system acquisition and conversion plan for human review. |
| `lead.acquire` | Acquire new leads from configured lead data channels and campaign criteria. |
| `lead.enrich` | Enrich lead or client data through configured enrichment providers. |
| `public_pool.import` | Import acquired leads into the public lead pool. |
| `client.dedupe` | Detect and avoid duplicate client or lead records. |
| `data.normalize` | Normalize imported lead fields, contact methods, country, and tags. |
| `lead.analyze` | Analyze a lead or client using CRM history, messages, and context. |
| `lead.score` | Score lead quality and conversion potential. |
| `client.summarize` | Generate or update internal client summaries. |
| `next_step.recommend` | Recommend the best next follow-up action. |
| `email.send` | Draft, schedule, or send email through configured outbox rules. |
| `whatsapp.read` | Read WhatsApp conversation history from the unified inbox cache. |
| `whatsapp.send` | Draft, schedule, or send WhatsApp messages through WhatsApp Actor Hub. |
| `conversation.tag` | Add or update tags on WhatsApp conversations. |
| `conversation.comment` | Add internal comments to WhatsApp conversations. |
| `client.comment` | Add internal comments to client records. |
| `client.stage` | Update client pipeline stage. |
| `client.update` | Update client profile fields and contact methods. |
| `quote.create` | Create quote drafts for operator review and sending. |

Global Agent action types used by **Agent Execution Policy**:
`create_lead_campaign`, `run_lead_campaign`, `create_followup_workflow`, `process_customer_reply`, `send_email`, `send_whatsapp`, `update_client_stage`, `add_client_comment`, `enrich_client_data`, `create_deal`, `create_quote`, `prioritize_leads`, `review_pipeline`.

### Technology Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Zustand, Lucide Icons, jsPDF.
- **Backend:** Express.js, PostgreSQL, JWT, bcrypt.
- **AI Integrations:** `@google/genai`, `openai`.
- **Infrastructure:** Vite and ESBuild wrapper for full-stack development.

---

## 中文

欢迎使用 **Foreign Trade CRM**，这是一套面向外贸团队的 AI 驱动 CRM 系统。它将客户管理、获客、公海线索、多渠道沟通、游戏化激励、AI Agent、WhatsApp 自动化、邮件流程、报价、资料补全和数据富化整合在一起，帮助团队更高效地获取 lead 并推动转化。

### 核心功能

#### AI 自动化与 Agent
系统可接入多个 AI provider，例如 Gemini、OpenAI 和兼容 OpenAI 格式的自定义接口，用于自动化 CRM 工作并提升客户跟进质量。

- **AI Follow-Up Agent：** 可为单个客户启用跟进 Agent。Agent 能读取长期上下文，总结客户状态，建议下一步动作，并生成跟进内容。
- **Agent Harness：** 用于任务级编排，适合获客、资料补全、打标签、WhatsApp 触达、邮件跟进和数据清理等可重复流程。
- **Global Agent：** 用于全局统筹 CRM，核心目标是获取 lead 并提升转化。它可以跨获客、资料补全、邮件、WhatsApp、comments、报价、阶段推进和跟进任务进行规划。
- **邮件草稿与 Magic Commands：** 根据客户历史自动生成邮件草稿或短文本。也可以使用全局 `/` 命令调用 AI 辅助。
- **客户分析 / AI Radar：** 分析客户背景、日志、邮件和互动记录，生成破冰话术、冷热度判断和下一步建议。
- **功能模块分配：** 可在 **Settings -> AI & Integrations** 中为不同功能模块指定不同 AI provider 或模型。

#### 公海线索与客户管理
- **Public Lead Pool：** 从共享公海中发现、导入和领取潜在客户。
- **自动获客 Agent：** 可手动创建或通过 Agent 创建获客 campaign，设置关键词、行业、国家和单次获取数量，新获取的 lead 默认进入公海。
- **Lead 数据渠道：** 支持 Apify、PhantomBuster、Scrap.io、HasData、Decodo、Clay 等渠道，用于获取 lead 和做 lead data enrichment。
- **客户资料补全奖励：** 补全国家、地址、公司、联系方式等信息可获得 points，帮助保持数据健康。
- **客户编辑申请：** 对公海或受限客户可提交资料修改申请，由管理员审核。
- **看板销售管线：** 使用 `Leads -> Contacted -> Sample Sent -> Negotiating -> Closed Won` 阶段追踪客户与交易。
- **客户完整档案：** 在一个侧边栏中查看客户联系方式、comments、growth logs、邮件、WhatsApp 历史、AI 总结、报价、文件和相关任务。

#### WhatsApp Actor Hub
- **多 Client WhatsApp Hub：** 像邮箱 inbox 一样集中管理多个 WhatsApp client 和多条对话。
- **消息固化：** WhatsApp 消息会保存到 CRM，并在可能时关联到对应客户记录。
- **消息发送：** 可通过 WhatsApp Actor Hub 发送文本、emoji、媒体消息和文件。
- **Client 选择规则：** 可手动选择某个 WhatsApp client，也可以随机选择。向某客户发送消息后，该客户默认固定使用最后一次发送所用的 client，除非手动切换。
- **WhatsApp 定时发送：** 可在 AI 工作流或 WhatsApp Hub 中设置定时发送。如发送时无可用 client，或指定 client 未在线，则在有可用 client 或指定 client 上线时立即发送。
- **对话管理：** 支持搜索对话、添加 tag、添加 comments，并可从对话 header 点击客户名称打开客户侧边栏。
- **AI Agent 调用：** AI Follow-Up Agent、Agent Harness 和 Global Agent 都可以调用 WhatsApp Actor Hub，并遵循相同的 client 选择和 quota 规则。
- **Quota 安全策略：** 自动化 WhatsApp 营销应考虑 client send quota、回复率和账号安全，每日最大发送量需要根据回复率动态调整，以降低封号风险。

#### 邮件收件箱与沟通记录
- **统一 Inbox：** 在 CRM 内管理收件和发件邮件。
- **后台同步：** 邮箱会定期在后台同步，默认每 1 小时同步一次，也可以在 Email Servers 配置中为每个邮箱设置同步间隔。
- **邮件定时发送：** 支持手动工作流和 AI 工作流中的邮件定时发送。
- **多渠道 Growth Logs：** 记录 WhatsApp、电话、邮件、comments 和其他客户互动。

#### 游戏化与效率
- **等级与经验值：** 添加客户、记录联系、发送邮件、赢单等操作可获得 EXP。
- **Points 经济：** 通过资料补全和任务获得 points，并用 points 领取公海 lead。
- **每日任务与连续记录：** 完成唤醒休眠客户等每日任务可获得额外 EXP。

#### 产品、报价与单据
- **产品目录：** 管理产品、SKU、阶梯价格、库存和描述。
- **智能报价：** 从产品目录生成专业报价，自动计算总价，套用付款条款，并生成带公司信息的 PDF。
- **单据生成：** 管理并关联 PI、CI、SO 等销售单据。

#### 管理员与权限
- **角色权限：** 支持 superadmin 和普通用户角色。
- **编辑审核：** Superadmin 可审核 lead 和客户资料补全申请。
- **全局偏好设置：** 集中配置 CRM 行为、AI provider、功能模块分配、集成和邮箱同步间隔。

### 安装与使用

#### 首次设置
1. 第一个注册用户可能需要在数据库中手动提升为 `superadmin`，也可以使用初始化账号 `samlau0086@gmail.com`。
2. 前往 **Settings -> Profile** 设置公司名称、地址和联系方式。这些信息会出现在报价等 PDF 文件中。

#### 添加自定义 AI Provider
1. 从侧边栏进入 **Settings**。
2. 打开 **AI & Integrations**。
3. 添加 AI provider。
4. 选择 provider 类型：OpenAI、Gemini 或兼容 OpenAI 的自定义接口。
5. 填写 API key、必要时填写 base URL，并填写模型名称。
6. 在功能模块分配中，为 Magic Commands、Email Drafting、Client Analysis、Agent Harness、Global Agent 等模块指定 provider 或模型。

#### 配置 AI Follow-Up Agent
1. 打开客户详情侧边栏。
2. 找到 **AI Follow-Up Agent** 区块并启用。
3. 选择跟踪模式：
   - `Prompt Only`：读取日志、总结状态并建议下一步。
   - `Auto Email`：根据客户上下文生成邮件草稿。
4. 添加 Agent 上下文或指令，例如“该客户对价格敏感，重点强调 ROI”。
5. 运行 Agent，生成客户总结和下一步建议。

#### Agent Harness 与 Global Agent 计划刷新频率
**Agent Harness** 适合做任务级编排，**Global Agent** 适合做跨系统的获客与转化统筹。

**Agent Harness** 主要用于可重复执行的流程，例如获客、线索资料补全、WhatsApp 触达、邮件跟进、打标签、数据清理等。通常不需要每次运行前都重新生成编排任务。

建议在以下情况重新生成：
- 业务目标、目标市场、关键词、渠道或流程规则发生变化。
- 数据渠道、API、AI provider 或模型分配发生变化。
- 消息模板、评分规则、资料补全要求或合规限制发生变化。
- 最近一次执行效果不理想，需要优化流程。
- 系统新增了 WhatsApp Actor Hub、媒体消息、定时发送、新的数据富化渠道等能力。

默认建议频率：
- 工作流定义变化时手动重新生成。
- 稳定流程建议每周或每两周复盘优化一次。
- 涉及客户触达或外部渠道动作的编排任务，建议先进入人工审核，通过后再执行。

**Global Agent** 是系统级统筹 Agent，核心目标是获取 lead 并推动转化。它会协调 CRM 内的获客、资料补全、邮件、WhatsApp、comments、报价、阶段推进和跟进动作。

建议频率：
- 每天生成一次短期执行计划：今天跟进谁、补全哪些资料、发送什么消息、推进哪些客户阶段。
- 每周生成一次整体策略计划：目标行业、目标国家、关键词、渠道分配、发送配额和转化瓶颈。
- 遇到重大变化时立即重新生成，例如 AI provider 调整、WhatsApp client quota 变化、邮件回复量突然增加、lead 来源变化或转化质量明显下降。

所有 Global Agent 计划都应先经过人工审核。审核通过后，Agent 按审核后的计划执行；如果审核拒绝，应重新生成或人工调整计划后再执行。

#### Agent Execution Policy / Agent 执行策略
**Agent Execution Policy** 用来控制 Global Agent 生成计划后，哪些动作可以自动执行，哪些动作必须等待人工审核。

配置位置：
1. 打开 **Settings**。
2. 进入 **AI & Integrations**。
3. 找到 **Agent Execution Policy / Agent 执行策略**。
4. 对每一种 Global Agent action type 设置：
   - `Auto / 自动`：计划生成后，该步骤可以自动执行。
   - `Review / 审核`：该步骤必须等待人工审核，通过后才执行。
   - 风险等级：`Low / 低`、`Medium / 中`、`High / 高`。

默认策略：
- 默认自动执行：`enrich_client_data`、`add_client_comment`、`prioritize_leads`、`review_pipeline`。
- 默认需要审核：发送邮件、发送 WhatsApp、更新客户阶段、创建报价、创建交易、创建/执行获客 campaign、处理客户回复、创建跟进 workflow。

运行规则：
- Global Agent 生成计划后，每个 step 会按照当前策略标记为 `Auto` 或 `Review`。
- `Auto` 步骤会在计划生成成功后自动执行。
- `Review` 步骤会留在待审核计划中，需要点击 **Approve & Execute** 后才执行。
- 如果自动执行失败，计划会进入 `failed` 状态，需要先检查失败步骤，再继续执行。
- 如果 AI 规划失败，系统生成的安全默认计划不会自动执行，必须人工审核。

推荐使用方式：
- 对客户外发动作保持 `Review`，尤其是邮件、WhatsApp、报价和客户阶段变更。
- 对低风险内部动作使用 `Auto`，例如资料补全、内部 comments、线索优先级排序。
- 每次新增渠道、AI 模型或自动化能力后，都应复查一次执行策略。

#### Agent 工具清单
在 **Agent Hub** 中配置 Agent tools 时可使用以下标识。客户外发类工具建议保持人工审核，除非流程已经充分验证安全。

| Tool | 说明 |
| --- | --- |
| `global_agent.plan` | 生成跨系统获客与转化计划，供人工审核。 |
| `lead.acquire` | 按 campaign 条件和数据渠道获取新 lead。 |
| `lead.enrich` | 通过已配置的数据补全渠道补全 lead 或客户资料。 |
| `public_pool.import` | 将获取到的 lead 导入公海。 |
| `client.dedupe` | 检测并避免重复客户或重复 lead。 |
| `data.normalize` | 标准化导入字段、联系方式、国家和标签。 |
| `lead.analyze` | 基于 CRM 历史、消息和上下文分析 lead 或客户。 |
| `lead.score` | 给 lead 质量和转化潜力打分。 |
| `client.summarize` | 生成或更新内部客户摘要。 |
| `next_step.recommend` | 推荐最佳下一步跟进动作。 |
| `email.send` | 通过已配置发件箱起草、定时或发送邮件。 |
| `whatsapp.read` | 从统一收件箱缓存读取 WhatsApp 对话历史。 |
| `whatsapp.send` | 通过 WhatsApp Actor Hub 起草、定时或发送 WhatsApp 消息。 |
| `conversation.tag` | 添加或更新 WhatsApp 对话标签。 |
| `conversation.comment` | 给 WhatsApp 对话添加内部 comments。 |
| `client.comment` | 给客户记录添加内部 comments。 |
| `client.stage` | 更新客户管线阶段。 |
| `client.update` | 更新客户资料和联系方式。 |
| `quote.create` | 创建报价草稿，供人工检查后发送。 |

**Agent Execution Policy** 使用的 Global Agent action type：
`create_lead_campaign`、`run_lead_campaign`、`create_followup_workflow`、`process_customer_reply`、`send_email`、`send_whatsapp`、`update_client_stage`、`add_client_comment`、`enrich_client_data`、`create_deal`、`create_quote`、`prioritize_leads`、`review_pipeline`。

### 技术栈
- **前端：** React、TypeScript、Tailwind CSS、Zustand、Lucide Icons、jsPDF。
- **后端：** Express.js、PostgreSQL、JWT、bcrypt。
- **AI 集成：** `@google/genai`、`openai`。
- **基础设施：** Vite 与 ESBuild wrapper，用于全栈开发。

---

*Maximize your outreach, keep your pipeline clean, and let AI handle the heavy lifting of CRM follow-ups.*

*最大化你的客户触达效率，保持销售管线清晰，把重复性的 CRM 跟进工作交给 AI。*
