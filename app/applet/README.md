# Foreign Trade CRM System / 外贸 CRM 系统

A comprehensive, next-generation Customer Relationship Management (CRM) system customized for foreign trade professionals. It integrates sales pipeline management, email inbox/outbox, AI agents via Retrieval-Augmented Generation (RAG), and gamified performance tracking (EXP & Leveling).

专为外贸业务人员打造的下一代综合型客户关系管理 (CRM) 系统。产品融合了外贸销售漏斗管理、集成收发件箱、基于 RAG 检索增强生成的 AI 工具，以及游戏化的业绩追踪 (经验值与升级系统)。

---

## 🌎 Features / 核心功能 (English & 中文)

### 1. Dashboard (仪表盘)
- **English**: Provides a high-level overview of your business metrics. Displays key statistics like Active Clients, Total Deals, Revenue, Pipeline Value, and pending/overdue Tasks. Features dynamic visual charts for revenue projections and pipeline stages.
- **中文**: 纵览您的核心业务指标。展示重要数据统计如活跃客户数、成单量、总营收、漏斗潜在价值以及待办或逾期任务。拥有动态图表用于呈现预期收入与销售漏斗阶段。

### 2. Email Inbox / Outbox (邮件收发箱)
- **English**: Integrated IMAP/SMTP mail client. Connect your email accounts and manage all client communication directly from within the CRM. It matches incoming emails to existing clients automatically.
- **中文**: 集成 IMAP/SMTP 邮件客户端。在一个系统内绑定邮箱并直接与客户沟通，系统会自动将接收到的邮件匹配至对应的客户名下。

### 3. Client Management (客户管理 & 列表)
- **English**: A comprehensive list of all clients, sortable and filterable. Features full CRUD (Create, Read, Update, Delete) operations. Includes a "World Map" view to visually explore clients by geographical location. Color-coding indicates the density of leads in each country.
- **中文**: 一应俱全的客户列表页，支持高阶筛选与搜索，并具有增删改查完整功能。包含独创的“世界地图(World Map)”视图功能，可通过地图直观按地理位置管理客户。国家区块颜色的深浅代表该地区的潜在客户密集程度。

### 4. Kanban / Sales Pipeline (看板视图与销售漏斗)
- **English**: Drag-and-drop Kanban board representing your sales pipeline (Lead -> Contacted -> Negotiating -> Won -> Lost). Visually manage deals and track their dollar value as they progress across stages.
- **中文**: 拖拽交互式看板视图，呈现完整的销售漏斗 (潜在 -> 已联系 -> 谈判中 -> 赢单 -> 输单)。直观跟进每个客户所在的销售阶段并计算各阶段预期金额。

### 5. Products Library (产品库)
- **English**: Store and manage product catalogs. Attach product records directly to client quotes and deals for streamlined pricing and fast quote generation.
- **中文**: 管理和维护常用的产品目录。将产品信息直接绑定到客户的报价单和交易记录中，实现快速且标准化的报价生成。

### 6. Quotes Management (报价单管理)
- **English**: Instantly generate professional quotes tied to specific clients and products. Keep track of expired vs up-to-date quotations.
- **中文**: 快速向指定客户与绑定商机生成专业的对外报价单，追踪并管理各类历史和最新报价。

### 7. Public Pool (公海客户)
- **English**: A shared resource pool where discarded or dormant clients land. Sales representatives can "claim" clients from the public pool. Superadmins have extensive controls over global pool logic.
- **中文**: 存放沉寂或流失客户的公共客户池。业务员可以从该公海领回或认领资源，超级管理员可控制相关的分配与释放逻辑。

### 8. Global Knowledge Base / RAG (全局知识库 / RAG)
- **English**: Upload company policies, product manuals, or other `.pdf`, `.txt`, `.doc`, `.docx` documents. The system parses and stores these documents as vector embeddings. AI agents query this globally accessible knowledge base (Retrieval-Augmented Generation) to answer client inquiries or outline marketing strategies.
- **中文**: 支持上传并导入公司制度、产品手册文档（支持直接拖入多份 `.pdf, .txt, .doc, .docx` 文件打包上传）。系统会自动采用向量化存储以支撑全局 RAG。您的 AI 助手可以利用该语料库帮助您自动撰写客户回复邮件以及构建营销规划。

### 9. Gamification / EXP & Quests (游戏化: 经验与日常任务)
- **English**: Reps earn Experience Points (EXP) for positive CRM habits (updating statuses, sending quotes, closing deals). Daily Quests keep utilization high and build habit streaks.
- **中文**: 业务员在 CRM 系统内正确更新状态、发送报价或成单都可以赚取业务经验值 (EXP)。配套每日任务系统及连续打卡挑战，显著提高员工录入数据的积极性。

### 10. AI "Magic Commands" & Automations (AI 魔法指令与自动流)
- **English**: Use deep contextual AI commands directly from the dashboard and client view. Prompt the AI assistant to summarize logs, analyze a client's sentiment, or draft follow-up strategies tailored to specific geographies (e.g., culturally attuned outreach).
- **中文**: 通过面板上的对话框随时呼出 AI 助手，针对当前上下文执行“魔法指令”。可快速实现日志生成、业务复盘、情感分析，或利用客户背景定制本地化、具有文化属性的开发跟进信。

---

## 🛠 Tech Stack / 技术栈

- **Frontend / 前端**: React (Vite) + Tailwind CSS + Lucide Icons
- **UI Components / 组件**: Radix UI primitives, Recharts (for Dashboard data), `react-simple-maps` (World Map View), `react-resizable-panels`.
- **Backend / 后端**: Node.js + Express
- **Database / 数据库**: PostgreSQL (pg)
- **AI & RAG / 人工智能**: `@google/genai` (For Vector Embeddings & Chat Completion)

---

## 🚀 How to Use / 使用指南

### 1. File & Document Upload (文件上传与知识库)
- To upload files in bulk to the **Global Knowledge Base (RAG)**:
  1. Click **Global Knowledge Base** in the sidebar.
  2. Click the `Upload Doc` button.
  3. Drag and drop multiple `.pdf`, `.txt`, or `.doc(x)` files into the modal to batch parse and vectorize the documents.
  4. The information within these docs will instantly be available to the integrated AI features.
  
- **如何批量上传文档至全局知识库 (RAG)**:
  1. 点击侧边栏的 **全局知识库 (RAG)** 选项。
  2. 点击屏幕上方的 `上传文档 (Upload Doc)` 按钮。
  3. 在弹出的模态框中框选或拖拽多份 `.pdf`, `.txt`, 等文档可实现批量上传向量化。
  4. 上传的所有文件知识将立刻可用于集成的 AI 助手问答上下文。

### 2. Email Server Setup (邮箱配置)
- Ensure to input standard IMAP and SMTP configurations in **Settings** under "Integrations".
- Gmail example requires "App Passwords" enabled on the Google Account.
- **邮箱集成指南**: 点击 **设置 (Settings)** 的集成功能，配置对应企业邮箱或免费邮箱的 IMAP 和 SMTP。如果是 Gmail 此类高安全邮箱，需要使用并在设置页填入其"应用专用密码 (App Password)"。

### 3. World Map Analytics (地图寻客视图)
- Open the Clients list, filter your search, and click the `Map View` (map icon). Countries containing your leads are color-coded based on density.
- To focus on clients from one geography, click the country geometry directly to filter the list instantly.
- **地理寻客与地图下钻**: 开打客户列表并点击 `地图图标 (Map)`，有建立线索的国家会按数量被着色。您可以通过直接点击地图内的国家板块高亮显示、立即检索出位于该地区的所有业务关系网络。

### 4. Admin Management (管理员与数据共享管理)
- The user first registered or marked as `superadmin` controls the access layers for all general users. Approving or rejecting destructive edits across shared resources.
- **管理层界面**: 超级管理员不仅具备所有的使用权限，还能审批或者拦截其余一般业务员试图删改核心公共资产 (比如产品库、共享设置) 的提案操作。

---

> Generated and strictly optimized for the Foreign Trade workflow.
> 高度定制，全流程为外贸与跨国 B2B 贸易链路优化。
