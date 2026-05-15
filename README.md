# Foreign Trade CRM (AI-Powered)

Welcome to the **Foreign Trade CRM**, a modern, AI-augmented Customer Relationship Management tool designed specifically for foreign trade professionals. It combines powerful workflow management with gamification and advanced AI capabilities to help you close deals faster and stay on top of your client communications.

## 🚀 Key Features

### 🎮 Gamified Workflow
Turn your daily tasks into an engaging experience.
- **Experience Points (EXP) & Levels:** Earn EXP by adding clients, sending emails, and closing deals. Level up to earn new titles!
- **Daily Quests:** Complete daily challenges (e.g., "Wake up Dormant Clients", "Follow Up Master") to earn bonus EXP.
- **Streak Tracking:** Keep up your daily activity to maintain your streak.

### 🤖 Multi-Provider AI Integration
Leverage language models to supercharge your productivity. We support multiple AI providers, including the built-in Gemini model, OpenAI, and any Custom OpenAI-compatible providers.
- **Email Drafting:** Automatically generate context-aware email drafts or snippets based on the client's history.
- **Icebreakers & Analysis:** AI analyzes the client's background and recent logs to generate personalized icebreakers and sentiment readouts.
- **Magic Commands:** Use the `/` command bar at the top (e.g., `/icebreaker`, `/draft`) or inline inside the email composer to instantly generate content.
- **Module Mapping:** In the Settings, you can map different AI models to specific functional modules (Magic Commands, Email Drafting, Client Analysis).

### 📋 Client Management
- **Kanban Board:** Visually track your clients through the sales pipeline (Leads -> Contacted -> Sample Sent -> Negotiating -> Closed Won).
- **Client Details:** comprehensive view of client information, communication logs, active emails, and associated tags.
- **Map View:** Visualize where your clients are located globally to plan regional strategies.

### 📥 Built-in Inbox & Outbox Simulator
- **Unified Inbox:** Manage incoming and sent emails directly within the CRM.
- **Smart Replies:** Auto-detect follow-up purposes and generate smart AI drafts in one click.
- **Actionable Insights:** Identify dormant clients or clients needing follow-ups instantly from the dashboard.

## ⚙️ Setup & Usage

### Adding Custom AI Providers
1. Navigate to the **Settings** page via the sidebar.
2. Scroll down to the **AI Models (LLM)** section.
3. Click **Add AI Provider**.
4. Select your provider type (OpenAI, Gemini, or Custom).
5. Enter your API Key and Model name (for custom endpoints, provide the Base URL).
6. Click **Save**.

### Functional Module Assignments
Want to use GPT-4 for drafting emails but LLaMA-3 (via custom endpoint) for analyzing clients?
1. Go to **Settings** -> **AI Models**.
2. Under "Functional Module Assignments", select the specific AI model you want to assign to **Magic Commands**, **Email Drafting**, or **Client Analysis**. By default, it will fall back to the internal Gemini model.

### Adding a Client
1. Click the **+** icon in the sidebar or "Add Client" in the Kanban view.
2. Fill out the client's company, location, and tags.
3. Once added, you can click on the client card to add contact logs, schedule follow-ups, or analyze them using AI!

## 🛠️ Technology Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Zustand (State Management), Lucide Icons.
- **Backend/AI Proxy:** Express.js, `@google/genai`, `openai` SDK.
- **Build Tool:** Vite + ESBuild.

---

*Maximize your outreach, keep your pipeline clean, and let AI handle the heavy lifting of drafting follow-ups.*
