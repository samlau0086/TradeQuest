# Foreign Trade CRM (AI-Powered)

Welcome to the **Foreign Trade CRM**, a modern, AI-augmented Customer Relationship Management tool designed specifically for foreign trade professionals. It combines powerful workflow management with gamification and advanced AI capabilities to help you close deals faster and stay on top of your client communications.

## 🚀 Key Features

### 🤖 AI-Driven Automation & Agents
Leverage language models to supercharge productivity and automate follow-ups. We support multiple AI providers (Gemini, OpenAI, Custom OpenAI endpoints).
- **Auto-pilot Follow-Up Agent:** Dedicate an AI Agent to specific clients to automate follow-ups. The agent remembers the **Long-Term Context**, generates a **Summary** of the client's status, and suggests the **Next Best Action**. It even allows for **Auto Email** mode to draft and send follow-ups autonomously.
- **Email Drafting & Magic Commands:** Automatically generate context-aware email drafts or snippets based on the client's history. Use `/` commands globally to prompt AI for assistance.
- **Client Analysis (AI Radar):** AI analyzes the client's background, recent logs, and emails to generate personalized icebreakers and sentiment readouts (Hot/Cold).
- **Module Mapping:** Assign different AI models to specific tasks (e.g., GPT-4 for Email Drafting, Gemini for Client Analysis).

### 📋 Lead Pool & Client Management
- **Public Lead Pool:** Discover and import potential clients from a shared pool.
- **Gamified Lead Claiming:** Spend your hard-earned 'Points' to claim highly-valuable leads from the Public Lead Pool.
- **Client Enrichment Rewards:** Automatically earn points by filling in missing client information (e.g., country, address, company) to encourage data health.
- **Client Edit Requests:** For public or restricted leads, propose updates that Admins can approve.
- **Kanban Pipeline:** Visually track your clients through the sales pipeline (`Leads` -> `Contacted` -> `Sample Sent` -> `Negotiating` -> `Closed Won`).
- **Comprehensive Profiles:** Consolidated view of a client's multi-channel contact methods, communication history, AI intelligence summaries, and files.

### 🎮 Gamification & Productivity
Turn daily tasks into an engaging experience.
- **Level & Experience (EXP):** Earn EXP by adding clients, logging contact events, sending emails, and closing deals.
- **Points Economy:** Points are currency! Earn points via data enrichments / tasks, and spend them to claim new public leads.
- **Daily Quests & Streaks:** Complete daily challenges (e.g., "Wake up Dormant Clients") to earn bonus EXP.

### 📦 Products, Quotes & Invoices
Manage your entire sales cycle seamlessly.
- **Products Catalog:** Keep track of your inventory, SKUs, bulk pricing, and descriptions.
- **Smart Quotes:** Build professional quotes from your product catalog. Calculate itemized totals, apply preset **Payment Terms** (Advance vs Balance ratios), and instantly **Generate PDF** quotes tailored with your company details.
- **Document Generation:** Manage and link PI (Proforma Invoices), CI (Commercial Invoices), and SO (Sales Orders).

### 📥 Communications Inbox
- **Unified Inbox:** Manage incoming and sent emails directly within the CRM.
- **Multi-channel Logs:** Keep track of WhatsApp, Phone, Email, and social interactions.

### 🛡️ Admin & Permissions Management
- **Role-based Access:** Superadmin and standard user access levels.
- **Edit Approvals:** Superadmins review client data enrichment proposals through a dedicated queue.
- **Global Preferences:** Flexible CRM configurations managed centrally.

## ⚙️ Setup & Usage

### First-Time Setup
1. The first registered user may need to be promoted manually to `superadmin` in the DB or use the default `samlau0086@gmail.com` initialized account.
2. Go to **Settings -> Profile** to set your **Company Name**, **Address**, and **Contact Info**. This will automatically appear on generated PDFs (Quotes).

### Adding Custom AI Providers
1. Navigate to the **Settings** page via the sidebar.
2. Scroll down to the **AI Models (LLM)** section.
3. Click **Add AI Provider**.
4. Select your provider type (OpenAI, Gemini, or Custom).
5. Enter your API Key and Model name.
6. Under **Functional Module Assignments**, assign specific AI models to Magic Commands, Email Drafting, or Client Analysis.

### Configuring AI Follow-Up Agents
1. Open a Client's details card.
2. Look for the **AI Follow-Up Agent** section and click **Enable Agent**.
3. Choose **Tracking Mode**:
   - `Prompt Only`: Read logs, summarize, and suggest next steps.
   - `Auto Email`: Includes the ability to draft emails based on the context.
4. Input specific **Agent Context/Instructions** (e.g., "This client is price-sensitive, focus on ROI").
5. Click **Run Agent** to let the AI process logs and generate updates.

## 🛠️ Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, Lucide Icons, jsPDF.
- **Backend**: Express.js, PostgreSQL (pg), JWT, bcrypt.
- **AI Integrations**: `@google/genai`, `openai`.
- **Infrastructure**: Vite + ESBuild wrapper for seamless full-stack deployment.

---

*Maximize your outreach, keep your pipeline clean, and let AI handle the heavy lifting of CRM follow-ups.*
