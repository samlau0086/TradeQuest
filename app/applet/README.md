# Foreign Trade CRM System / 外贸 CRM 系统

A comprehensive, next-generation Customer Relationship Management (CRM) system customized for foreign trade professionals. It integrates sales pipeline management, email inbox/outbox, AI agents via Retrieval-Augmented Generation (RAG), and gamified performance tracking (EXP & Leveling).

专为外贸业务人员打造的下一代综合型客户关系管理 (CRM) 系统。产品融合了外贸销售漏斗管理、集成收发件箱、基于 RAG 检索增强生成的 AI 工具，以及游戏化的业绩追踪 (经验值与升级系统)。

---

## 🌎 Essential Features / 核心功能 (English & 中文)

### 1. Dashboard & Analytics (大盘数据与可视化分析)
- **English**: Provides a high-level overview of your business metrics. Displays key statistics like Active Clients, Total Deals, Revenue, Pipeline Value, and pending/overdue Tasks. Features dynamic visual charts for revenue projections and pipeline stages.
- **中文**: 纵览您的核心业务指标。展示重要数据统计如活跃客户数、成单量、总营收、漏斗潜在价值以及待办或逾期任务。拥有动态图表用于呈现预期收入与销售漏斗阶段。

### 2. Intelligent Email Client (智能邮件客户端)
- **English**: Integrated IMAP/SMTP mail client. Connect your email accounts and manage all client communication directly from within the CRM. It matches incoming emails to existing clients automatically. Supports multi-account, Drafts, Scheduled Send, Email tracking (Read receipts), and Attachments. 
- **中文**: 集成 IMAP/SMTP 邮件客户端。内置邮件收发功能，并在收信时自动将其匹配归档至对应客户名下。支持多账号绑定设定、邮件草稿箱、定时发送、已读追踪 (Read Receipt) 以及邮件附件管理。

### 3. CRM, World Map & Lead Mining (客户资源、地图分析与线索挖掘)
- **English**: A comprehensive list of all clients with batch CSV Import/Export. Features a "World Map" view to visually explore clients by geographical density. Moreover, access "Outscraper Integration" for B2B Google Maps lead mining straight from the interface. Keep track of clients' local timezone natively.
- **中文**: 支持全量管理客户资源，包含批量 CSV 导入导出。首创“世界地图 (World Map)”视图功能，可通过地图直观探索高净值区域分布。更内置了 Outscraper API 集成，允许您直接从系统内调用谷歌地图商家数据挖掘 (B2B 获客)。天然自带查询客户当地时间 (时区跟踪) 功能。

### 4. Kanban & Sales Pipeline (拖拽式看板与销售漏斗)
- **English**: Drag-and-drop Kanban board representing your sales pipeline (Lead -> Contacted -> Negotiating -> Won -> Lost). Visually manage deals and track their dollar value as they progress across stages.
- **中文**: 拖拽交互式看板视图，呈现完整的销售漏斗 (潜在 -> 已联系 -> 谈判中 -> 赢单 -> 输单)。直观跟进每个客户所在的销售阶段并计算各阶段预期金额聚合。

### 5. Actionable Clients & Follow-Ups (智能跟进提醒与行动视图)
- **English**: A dedicated view separating leads into actionable status categories: "Follow-ups needed", "New Leads", and "Dormant". Automatically flags clients who haven't been contacted in over 30 days to prevent deal rot.
- **中文**: "行动中心" 视图将客户线索按所需的操作分离分类，包括：“需跟进”、“新线索”和“已沉寂”。自动标记和预警超过 30 天未联络的业务关系，有效防止丢单腐皮。

### 6. Public Pool & Resource Allocation (公海客户与资源流转)
- **English**: A shared resource pool where discarded or dormant clients land. Sales representatives can "claim" clients from the public pool. Superadmins have extensive controls over global pool logic to prevent hoarding.
- **中文**: 存放沉寂或流失客户的公共池。长期不联系或因故流失的客户会自动掉入公海，任意业务员都可以从公海认领线索，促进公共资源的健康盘活。超级管理员可管理公海释放逻辑与参数。

### 7. Products Library & Quotes Management (产品库与精准报价单)
- **English**: Store and manage product catalogs. Generate professional quotes paired with selected products instantly. Keep track of quote statuses, revisions, and expiration.
- **中文**: 维护企业常售产品目录。您能在跟进中一键引用产品以快速生成并发送标准化的精美报价单，对所有对外开出的报价状态及有效期进行有序跟踪。

### 8. Global Knowledge Base / RAG (全局知识语料库 / RAG)
- **English**: Upload company policies, catalogs, or other `.pdf`, `.txt`, `.doc`, `.docx` documents. The system parses and stores these documents as vector embeddings. AI agents query this globally accessible knowledge base to accurately answer localized inquiries.
- **中文**: 支持上传并导入公司制度、产品手册等文档。系统自动以向量化存储实现全局 RAG(检索增强生成)，使得 AI 助手可以利用这些私域语料协助解答外发邮件询问、撰写规范化回应。

### 9. AI "Magic Commands" & Custom Agents (AI 魔法指令与智能体引擎)
- **English**: Trigger contextual AI commands straight from the UI. Features "Workflow Configurations" to build your custom prompt logic (e.g. specialized translation rules, tone rewriting). Automatically generate meeting logs, sentiment analysis, or email drafts.
- **中文**: 从界面快捷触发关联上下文的智能辅助。内置智能体 "工作流配置" (Workflow Config)，允许高级人员预设企业特有的 Prompt 模板 (例如外贸询盘话术、小语种精准润色语调设定等)。还支持一键生成客户互动复盘摘要和邮件起草。

### 10. Gamification: EXP & Quests (企业游戏化：日常任务与排位)
- **English**: Reps earn Experience Points (EXP) for solid CRM habits (updating statuses, logging emails, closing deals, claiming leads). Daily/Weekly Quests build habit streaks. Users rank up and unlock internal Titles.
- **中文**: 将工作游戏化。业务员在系统内主动录入、发送开发信或成单都可以赚取业务经验值 (EXP)。配套每日任务系统及系统称谓 (Titles) 解锁路线，显著带动基层员工的数据维护积极性。

### 11. Advanced Admin Control & RBAC (高级管理员控制面板)
- **English**: Multi-user architecture. The first user or designated `superadmin` controls visibility. Introduces an "Edit Requests" approval mechanism to protect shared databases (preventing junior reps from silently changing sensitive product pricing).
- **中文**: 多用户权限管理体系。设定的超管拥有顶级权限，支持创新的 "编辑请求 (Edit Requests)" 审批流工作链 — 防止新手业务员篡改公共系统基建数据或产品敏感报价，需提交申请经核心人员批准才可入库。

---

## 🛠 Tech Stack / 技术栈

- **Frontend / 前端**: React 18, Vite, Tailwind CSS v4, Lucide React Icons
- **UI Architecture / 架构**: Headless UI hooks, `react-resizable-panels` (Adjustable Layouts), Context APIs tied to LocalStorage/Remote DB state engines.
- **Visuals / 视觉**: Recharts (Analytics Dashboard), `react-simple-maps` (World Map / GeoJSON rendering).
- **Backend / 后端**: Ready for Node.js + Express + PostgreSQL full-stack syncing.
- **AI Integration / 人工智能**: Native integration with Google Gemini Pro API (`@google/genai`) for text generation and document embeddings.

---

## 🚀 How to Use & Onboarding / 使用指南

### 1. Connecting Email (配置您的 IMAP/SMTP 邮箱信道)
- Navigate to the **Settings** menu and look for **Integrations / Email Server Setup**. 
- Add your standard corporate IMAP (for receiving) and SMTP (for sending) endpoint specifics. 
- *Tip for Gmail/Outlook*: You must bypass generic login by generating an "App Password" through your Mailbox provider's security settings. Enter the App Password into the interface to ensure flawless syncing.
- **邮箱集成指南**: 点击底部 **设置 (Settings)** 的集成服务区块，配置对应企业邮箱或免费邮箱的 IMAP 和 SMTP。如果您使用 Gmail 等强验证环境邮箱，必须进入其后台开启 2FA 并申请“应用专用密码 (App Password)”，方可填入此系统。

### 2. Loading the Knowledge Base (填充团队语料库)
- Click **Knowledge Base** on the left menu.
- Click `Upload Doc` and drag-and-drop multiple `.pdf` or `.docx` files.
- Ensure the AI Provider setting is valid to parse these files optimally.
- **填充私域知识库**: 展开左侧菜单找到 **知识库 (Knowledge Base)**，点击右上方的 `上传文档`，直接批量拖入产品目录或操作手册文件，待提取分词完毕立刻用于后续聊天对话流。

### 3. Outscraper Lead Mining (启用地图获客探测器)
- Request an API key from Outscraper.com.
- Store this within the System `Settings` -> `Lead Generation`.
- Now from the Client list, select "Add via Outscraper Map", define your query (e.g. *Medical Supplies in Berlin*), and batch-mine rich local contacts straight to your CRM Public Pool.
- **启用 Outscraper 外部开发机制**: 在 Outscraper.com 注册获得其开发密钥，将其键入 CRM 系统配置中即可。从客户列表发起商机挖掘搜索，输入关键词与商机所在区域 (如 "迪拜 医疗器械代理商")，挖掘出来的名录将一键掉入公海供您的团队转化。

### 4. Admin Management & Shared Approvals (业务审批机制流转)
- General users attempting to delete global elements will trigger an "Edit Request." 
- The `superadmin` checks the **Edit Requests** pane in their left sidebar to Approve / Reject changes synchronously.
- **如何操作审批流**: 普通业务员尝试重命名全局预定义模块时系统将生成修改提案。团队的超级管理角色能在个人侧控制台的 **编辑申请 (Edit Requests)** 追踪、拒绝或批准操作。这就构筑了数据资产的安全城墙。

---

> Built intentionally to streamline, scale, and incentivize outward-bound cross-border trade workflows.
> 极度针对外贸及其跨国 B2B 出海贸易链路开发重构而生。
