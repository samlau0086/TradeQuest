import express from "express";
import path from "path";
import multer from "multer";
import { createRequire } from 'module';
const customRequire = typeof require !== "undefined" ? require : createRequire(import.meta.url);
const pdfParse = customRequire("pdf-parse");
const nodemailer = customRequire("nodemailer");
const geoip = customRequire("geoip-lite");
const { ImapFlow } = customRequire("imapflow");
const Pop3Command = customRequire("node-pop3").default || customRequire("node-pop3");
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

const COUNTRY_LANGUAGE_OVERRIDES: Record<string, string> = {
  china: 'Chinese',
  'hong kong': 'Chinese',
  taiwan: 'Chinese',
  japan: 'Japanese',
  'south korea': 'Korean',
  korea: 'Korean',
  france: 'French',
  germany: 'German',
  austria: 'German',
  switzerland: 'German',
  spain: 'Spanish',
  mexico: 'Spanish',
  colombia: 'Spanish',
  argentina: 'Spanish',
  chile: 'Spanish',
  peru: 'Spanish',
  portugal: 'Portuguese',
  brazil: 'Portuguese',
  italy: 'Italian',
  russia: 'Russian',
  ukraine: 'Ukrainian',
  turkey: 'Turkish',
  vietnam: 'Vietnamese',
  thailand: 'Thai',
  indonesia: 'Indonesian',
  malaysia: 'Malay',
  india: 'Hindi or English',
  pakistan: 'Urdu or English',
  bangladesh: 'Bengali',
  'saudi arabia': 'Arabic',
  'united arab emirates': 'Arabic',
  egypt: 'Arabic',
  morocco: 'Arabic',
  netherlands: 'Dutch',
  belgium: 'Dutch or French',
  poland: 'Polish',
  'czechia (czech republic)': 'Czech',
  czechia: 'Czech',
  romania: 'Romanian',
  greece: 'Greek',
  israel: 'Hebrew',
  iran: 'Persian',
  'united states': 'English',
  usa: 'English',
  canada: 'English',
  'united kingdom': 'English',
  australia: 'English',
  'new zealand': 'English',
  singapore: 'English'
};

const getOutboundLanguage = (preferredLanguage?: string, country?: string) => {
  const preferred = preferredLanguage?.trim();
  if (preferred) return preferred;
  const normalizedCountry = country?.trim().toLowerCase();
  if (!normalizedCountry) return 'English';
  return COUNTRY_LANGUAGE_OVERRIDES[normalizedCountry] || 'English';
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
  query_timeout: 15000,
  keepAlive: true
});

async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set. User data APIs will fail.");
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        display_name VARCHAR(100),
        avatar_url TEXT,
        points INT DEFAULT 0,
        company_name VARCHAR(255),
        company_address TEXT,
        company_phone VARCHAR(100),
        company_email VARCHAR(255),
        company_website VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE users ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_address TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_phone VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_email VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_website VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
      
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        address TEXT,
        country VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Leads',
        tags JSONB DEFAULT '[]',
        last_contact TIMESTAMP WITH TIME ZONE,
        is_dormant BOOLEAN DEFAULT FALSE,
        contact_methods JSONB DEFAULT '[]',
        comments JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);

      ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS pending_edit_request BOOLEAN DEFAULT FALSE;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN DEFAULT FALSE;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_mode VARCHAR(50) DEFAULT 'manual';
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_context TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_summary TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_next_step TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_score INT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_summary TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_next_step TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_scoring_signature TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_scoring_analyzed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_last_run TIMESTAMP WITH TIME ZONE;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_workflow_id VARCHAR(128);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(100);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_time_range VARCHAR(255);

      CREATE TABLE IF NOT EXISTS global_settings (
        key VARCHAR(128) PRIMARY KEY,
        value JSONB
      );

      CREATE TABLE IF NOT EXISTS payment_terms (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        advance_ratio NUMERIC(5,2) DEFAULT 0,
        balance_ratio NUMERIC(5,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS client_edit_requests (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(128) REFERENCES clients(id) ON DELETE CASCADE,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        original_data JSONB,
        requested_data JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE IF NOT EXISTS knowledge_base (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        client_id VARCHAR(128) REFERENCES clients(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        embedding vector(768),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS embedding vector(768);

      CREATE TABLE IF NOT EXISTS logs (
        id VARCHAR(128) PRIMARY KEY,
        client_id VARCHAR(128) REFERENCES clients(id) ON DELETE CASCADE,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        content TEXT,
        related_email_id VARCHAR(128),
        type VARCHAR(50) DEFAULT 'general',
        metadata JSONB
      );
      
      ALTER TABLE logs ADD COLUMN IF NOT EXISTS related_email_id VARCHAR(128);
      ALTER TABLE logs ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';
      ALTER TABLE logs ADD COLUMN IF NOT EXISTS metadata JSONB;

      CREATE TABLE IF NOT EXISTS emails (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        client_id VARCHAR(128) REFERENCES clients(id) ON DELETE SET NULL,
        sender VARCHAR(255),
        sender_name VARCHAR(255),
        recipient VARCHAR(255),
        cc VARCHAR(255),
        bcc VARCHAR(255),
        subject VARCHAR(255),
        body TEXT,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        read BOOLEAN DEFAULT FALSE,
        type VARCHAR(50) DEFAULT 'inbox',
        tags JSONB DEFAULT '[]',
        comments JSONB DEFAULT '[]',
        scheduled_at TIMESTAMP WITH TIME ZONE,
        attachments JSONB DEFAULT '[]'
      );
      
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS pending_delete BOOLEAN DEFAULT FALSE;
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT FALSE;
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS todo_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS todo_note TEXT;
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS agent_context_analysis JSONB;
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS agent_context_analysis_key TEXT;

      CREATE TABLE IF NOT EXISTS deleted_emails (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS email_tracking (
        id SERIAL PRIMARY KEY,
        email_id VARCHAR(128) REFERENCES emails(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        url TEXT,
        ip_address VARCHAR(128),
        location JSONB,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deals (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        client_id VARCHAR(128) REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        value NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Leads',
        contact_info JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS pending_delete BOOLEAN DEFAULT FALSE;
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS pending_edit_request BOOLEAN DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        sku VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        bulk_prices JSONB DEFAULT '[]'::jsonb,
        comments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quotes (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        client_id VARCHAR(128) REFERENCES clients(id) ON DELETE SET NULL,
        quote_number VARCHAR(255) NOT NULL,
        payment_terms TEXT,
        payment_term_id VARCHAR(128),
        advance_ratio NUMERIC(5,2) DEFAULT 0,
        balance_ratio NUMERIC(5,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Draft',
        items JSONB DEFAULT '[]'::jsonb,
        fees JSONB DEFAULT '[]'::jsonb,
        comments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_term_id VARCHAR(128);
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS advance_ratio NUMERIC(5,2) DEFAULT 0;
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS balance_ratio NUMERIC(5,2) DEFAULT 0;

      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        quote_id VARCHAR(128) REFERENCES quotes(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        document_number VARCHAR(255) NOT NULL,
        content JSONB,
        comments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS media_library (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        size BIGINT DEFAULT 0,
        url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scheduled_whatsapp_messages (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        crm_client_id VARCHAR(128) REFERENCES clients(id) ON DELETE SET NULL,
        hub_client_id VARCHAR(128),
        to_phone VARCHAR(64) NOT NULL,
        body TEXT DEFAULT '',
        media JSONB,
        metadata JSONB DEFAULT '{}'::jsonb,
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(32) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_scheduled_whatsapp_due
      ON scheduled_whatsapp_messages (status, scheduled_at);

      CREATE TABLE IF NOT EXISTS whatsapp_conversations (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        target_phone VARCHAR(64) NOT NULL,
        client_id VARCHAR(128) REFERENCES clients(id) ON DELETE SET NULL,
        tags JSONB DEFAULT '[]'::jsonb,
        comments JSONB DEFAULT '[]'::jsonb,
        last_message_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, target_phone)
      );

      ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS agent_context_analysis JSONB;
      ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS agent_context_analysis_key TEXT;
      ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        conversation_id VARCHAR(128) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
        client_id VARCHAR(128) REFERENCES clients(id) ON DELETE SET NULL,
        hub_client_id VARCHAR(128),
        direction VARCHAR(24) NOT NULL,
        sender VARCHAR(128),
        recipient VARCHAR(128),
        target_phone VARCHAR(64) NOT NULL,
        body TEXT DEFAULT '',
        message_type VARCHAR(64),
        payload JSONB,
        source_created_at TIMESTAMP WITH TIME ZONE,
        received_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_target
      ON whatsapp_messages (user_id, target_phone, source_created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_updated
      ON whatsapp_conversations (user_id, updated_at DESC);

      -- Migrate existing clients to a default deal if none exist for that client
      INSERT INTO deals (id, user_id, client_id, name, status, created_at, updated_at)
      SELECT 
        'd_' || floor(extract(epoch from now()))::text || '_' || id,
        user_id,
        id,
        COALESCE(company, name) || ' Default Deal',
        status,
        created_at,
        updated_at
      FROM clients c
      WHERE NOT EXISTS (SELECT 1 FROM deals d WHERE d.client_id = c.id);
    `);
    
    // Seed default admin account
    const superAdminEmail = 'samlau0086@gmail.com';
    const adminCheck = await pool.query('SELECT * FROM users WHERE email = $1', [superAdminEmail]);
    if (adminCheck.rows.length === 0) {
      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash('admin123456', 10);
      await pool.query(
        `INSERT INTO users (id, email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, superAdminEmail, passwordHash, 'Super Admin', 'superadmin']
      );
      console.log(`Default superadmin created: ${superAdminEmail} / admin123456`);
    }

    const userEmail2 = 'agqyed01@gmail.com';
    const adminCheck2 = await pool.query('SELECT * FROM users WHERE email = $1', [userEmail2]);
    if (adminCheck2.rows.length === 0) {
      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash('admin123456', 10);
      await pool.query(
        `INSERT INTO users (id, email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, userEmail2, passwordHash, 'Admin', 'superadmin']
      );
      console.log(`Default superadmin created: ${userEmail2} / admin123456`);
    }
    
    console.log("Postgres database initialized.");
  } catch (error) {
    console.error("Failed to initialize Postgres database:", error);
  }
}


const defaultAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function callAI(prompt: string, llmConfig: any, isJson: boolean = false) {
  if (llmConfig) {
    if (llmConfig.provider === 'openai' || llmConfig.provider === 'openrouter' || llmConfig.provider === 'custom_openai') {
      const openai = new OpenAI({
        apiKey: llmConfig.apiKey,
        baseURL: llmConfig.provider === 'openrouter' ? (llmConfig.baseURL || 'https://openrouter.ai/api/v1') : llmConfig.baseURL || undefined,
      });
      const response = await openai.chat.completions.create({
        model: llmConfig.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: isJson ? { type: 'json_object' } : undefined,
      });
      return response.choices[0].message.content || '';
    } else if (llmConfig.provider === 'gemini') {
      const gemini = new GoogleGenAI({ apiKey: llmConfig.apiKey });
      const response = await gemini.models.generateContent({
        model: llmConfig.model || 'gemini-2.5-flash',
        contents: prompt,
        config: isJson ? { responseMimeType: 'application/json' } : undefined,
      });
      return response.text;
    }
  }
  
  // Fallback
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("No AI provider configured. Configure a model in AI & Integrations or set GEMINI_API_KEY.");
  }
  const response = await defaultAi.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: isJson ? { responseMimeType: 'application/json' } : undefined,
  });
  return response.text;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Magic command completion
  app.post("/api/chat/magic", authenticateToken, async (req: any, res) => {
    try {
      const { command, context, llmConfig, embeddingLlmConfig, skipKnowledgeBase } = req.body;
      
      const kbRes = skipKnowledgeBase
        ? { rows: [] }
        : await searchKnowledgeBase(req.user.uid, context?.clientId || null, command, embeddingLlmConfig || llmConfig);
      
      const prompt = `You are an AI assistant in a Foreign Trade CRM. 
User executed magic command: "${command}". 
Client Context: ${JSON.stringify(context)}.
Knowledge Base (RAG):
${kbRes.rows.map(kb => `[${kb.title}]\n${kb.content}`).join('\n\n')}
If the command asks to draft a WhatsApp message, write a concise, natural, conversational WhatsApp message that respects the customer preferences, prior records, recent conversation, and RAG context. Do not format it like an email.
If the command asks to follow up or draft an email, write a short, professional, yet engaging drafted email.
Respond only with the draft or the direct output of the action requested. Do not include markdown formatting like \`\`\`.`;
      
      const text = await callAI(prompt, llmConfig, false);
      res.json({ result: text });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed to process magic command" });
    }
  });

  app.post("/api/global-agent/plan", authenticateToken, async (req: any, res) => {
    try {
      const { prompt, llmConfig } = req.body;
      if (!prompt) return res.status(400).json({ error: "Missing planning prompt" });
      const result = await callAI(prompt, llmConfig, false);
      res.json({ result });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate Global Agent plan" });
    }
  });

  app.post("/api/agent-harness/plan", authenticateToken, async (req: any, res) => {
    try {
      const { prompt, llmConfig } = req.body;
      if (!prompt) return res.status(400).json({ error: "Missing harness planning prompt" });
      const result = await callAI(prompt, llmConfig, true);
      res.json({ result });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate Agent Harness run" });
    }
  });

  app.post("/api/agent-tools/select", authenticateToken, async (req: any, res) => {
    try {
      const { agentName = '', instructions = '', availableTools = [], llmConfig } = req.body;
      if (!agentName && !instructions) return res.status(400).json({ error: "Missing agent prompt" });
      const toolIds = new Set((Array.isArray(availableTools) ? availableTools : []).map((tool: any) => String(tool.id || '')));
      const prompt = `You are configuring an AI agent inside a foreign trade CRM.
Choose the tools this agent should be allowed to use based on its name and prompt.
Select only tools from the provided registry. Do not invent tool IDs.
Prefer the smallest sufficient tool set. Include outbound tools only if the prompt clearly needs sending messages, quotes, or follow-up execution.

Agent name:
${agentName}

Agent prompt / instructions:
${instructions}

Available tool registry:
${JSON.stringify(availableTools, null, 2)}

Return JSON only:
{
  "tools": ["tool.id"],
  "reason": "one short reason"
}`;

      const text = await callAI(prompt, llmConfig, true);
      const parsed = JSON.parse(text || '{}');
      const tools = Array.isArray(parsed.tools)
        ? parsed.tools.map((id: any) => String(id)).filter((id: string) => toolIds.has(id))
        : [];
      res.json({ tools, reason: parsed.reason || '' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to select agent tools" });
    }
  });

  // Workflow Auto-Planner
  app.post("/api/ai/plan-workflow", authenticateToken, async (req: any, res) => {
    try {
      const { prompt: userPrompt, llmConfig, clientContext } = req.body;
      
      const prompt = `You are an AI assistant in a Foreign Trade CRM.
You need to design a follow-up workflow based on the user's request.
${clientContext ? `\n${clientContext}\n` : ''}
User Request: "${userPrompt}"

Generate a JSON object with a list of steps. Each step must have:
- type: one of "email", "whatsapp", "call", "other"
- delayDays: number of days to wait from the previous step (e.g. 1 for next day)
- templatePrompt: simple instruction on what this message/step should say
- sendTime: optional, formatted as "HH:mm" (e.g., "09:00"). Leave as empty string if no specific time needed.

Output schema:
{
  "steps": [
    {
      "type": "email",
      "delayDays": 1,
      "templatePrompt": "greeting message",
      "sendTime": ""
    }
  ]
}
No markdown wrappers, just valid JSON.`;

      const text = await callAI(prompt, llmConfig, true);
      const parsed = JSON.parse(text || '{}');
      res.json(parsed);
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: "Failed to plan workflow" });
    }
  });

  // Emotional Thermometer & Icebreaker
  app.post("/api/chat/icebreaker", authenticateToken, async (req: any, res) => {
    try {
      const { client, logs, emails, llmConfig, embeddingLlmConfig, systemLanguage = 'English', outboundLanguage } = req.body;
      const resolvedOutboundLanguage = outboundLanguage || getOutboundLanguage(client?.preferredLanguage, client?.country);
      
      const kbRes = await searchKnowledgeBase(req.user.uid, client?.id || null, `Icebreaker and follow up strategy for client in ${client?.company || 'foreign trade'}`, embeddingLlmConfig || llmConfig, 5);
      
      const prompt = `You are a savvy foreign trade AI assistant.
Analyze this client and their recent logs.
Language rules:
- sentiment, leadSummary, leadNextStep, and summary are internal CRM outputs and MUST use ${systemLanguage}.
- icebreaker is customer-facing outbound content and MUST use ${resolvedOutboundLanguage}. If no preferred language is configured, use the official language of the customer's country; if country is missing, use English.
Client: ${JSON.stringify(client)}
Logs: ${JSON.stringify(logs)}
Emails: ${JSON.stringify(emails || [])}
Knowledge Base (RAG):
${kbRes.rows.map(kb => `[${kb.title}]\n${kb.content}`).join('\n\n')}

Return a JSON object:
{
  "sentiment": "HOT" | "WARM" | "COLD",
  "temperature": number (0-100, 100 being hot),
  "leadScore": number (0-100, based on fit, intent, completeness, urgency, and conversion probability),
  "leadSummary": "A concise lead/account summary for CRM operators.",
  "leadNextStep": "The best next action to improve conversion.",
  "icebreaker": "A short, localized, personal opening sentence (e.g., 'Happy holidays!', 'Hope your team won the match!', 'Seeing the weather in [country] is nice!')",
  "summary": "A 1-sentence zero-input log summary of the interaction style."
}
No markdown wrappers, just valid JSON.`;
      
      const text = await callAI(prompt, llmConfig, true);
      const parsed = JSON.parse(text || '{}');
      const fallbackSummary = [client?.company || client?.name, client?.country, client?.status, Array.isArray(client?.tags) && client.tags.length ? `Tags: ${client.tags.join(', ')}` : '']
        .filter(Boolean)
        .join(' / ');
      parsed.leadScore = Number(parsed.leadScore ?? parsed.temperature ?? 0);
      parsed.leadSummary = parsed.leadSummary || parsed.summary || fallbackSummary || 'Lead profile requires more interaction data.';
      parsed.leadNextStep = parsed.leadNextStep || parsed.nextStep || 'Review the lead profile and choose the next follow-up action.';
      res.json(parsed);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate icebreaker" });
    }
  });

  // Postgres User API Endpoints
  // Authentication Endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const role = (email === 'samlau0086@gmail.com' || email === 'agqyed01@gmail.com') ? 'superadmin' : 'user';

      const result = await pool.query(
        `INSERT INTO users (id, email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, email, display_name, role, avatar_url, points, created_at, updated_at`,
        [id, email, passwordHash, displayName, role]
      );
      
      const user = result.rows[0];
      const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({ token, user: {
        id: user.id, email: user.email, role: user.role, displayName: user.display_name, avatarUrl: user.avatar_url, points: user.points, companyName: user.company_name, companyAddress: user.company_address, companyPhone: user.company_phone, companyEmail: user.company_email, companyWebsite: user.company_website, createdAt: user.created_at, updatedAt: user.updated_at
      } });
    } catch (e: any) {
      if (e.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      console.error(e);
      res.status(500).json({ error: 'Failed to register' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: {
        id: user.id, email: user.email, role: user.role, displayName: user.display_name, avatarUrl: user.avatar_url, points: user.points, companyName: user.company_name, companyAddress: user.company_address, companyPhone: user.company_phone, companyEmail: user.company_email, companyWebsite: user.company_website, createdAt: user.created_at, updatedAt: user.updated_at
      } });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  app.post('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.uid]);
      const user = result.rows[0];
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      res.json({
        id: user.id, email: user.email, role: user.role, displayName: user.display_name, avatarUrl: user.avatar_url, points: user.points, companyName: user.company_name, companyAddress: user.company_address, companyPhone: user.company_phone, companyEmail: user.company_email, companyWebsite: user.company_website, createdAt: user.created_at, updatedAt: user.updated_at
      });
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.post('/api/auth/password', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, decoded.uid]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Middleware to authenticate JWT
  function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Middleware to check superadmin role
  const requireSuperadmin = async (req: any, res: any, next: any) => {
    try {
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.uid]);
      if (result.rows.length === 0 || result.rows[0].role !== 'superadmin') {
        return res.sendStatus(403);
      }
      next();
    } catch (e) {
      res.sendStatus(500);
    }
  };

  app.get('/api/user/settings', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.uid]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(result.rows[0].settings || {});
    } catch (e) {
      console.error('Failed to fetch settings', e);
      res.status(500).json({ error: 'Failed to fetch user settings' });
    }
  });

  const mergeSettingsArrayById = (existingItems: any[] = [], incomingItems: any[] = []) => {
    const merged = new Map<string, any>();
    [...incomingItems, ...existingItems].forEach(item => {
      if (!item?.id) return;
      const current = merged.get(item.id);
      if (!current) {
        merged.set(item.id, item);
        return;
      }
      const currentTime = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
      const itemTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      if (itemTime > currentTime) merged.set(item.id, item);
    });
    return Array.from(merged.values()).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  };

  const mergeAgentHubAgents = (existingItems: any[] = [], incomingItems: any[] = []) => {
    const byId = new Map<string, any>();
    existingItems.forEach(agent => {
      if (agent?.id) byId.set(agent.id, agent);
    });
    incomingItems.forEach(agent => {
      if (!agent?.id) return;
      const existing = byId.get(agent.id) || {};
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const incomingTime = agent.updatedAt ? new Date(agent.updatedAt).getTime() : 0;
      const backendRuntimeIsNewer = existingTime > incomingTime;
      byId.set(agent.id, {
        ...existing,
        ...agent,
        // Scheduler-owned runtime fields should not be erased by a stale browser autosave.
        lastRunAt: backendRuntimeIsNewer ? existing.lastRunAt : agent.lastRunAt,
        scheduleRunCount: backendRuntimeIsNewer ? existing.scheduleRunCount : agent.scheduleRunCount,
        tasksCompleted: backendRuntimeIsNewer ? existing.tasksCompleted : agent.tasksCompleted,
        // User-owned schedule configuration must always follow the latest browser payload.
        scheduleEnabled: agent.scheduleEnabled,
        scheduleIntervalMinutes: agent.scheduleIntervalMinutes,
        scheduleIntervalValue: agent.scheduleIntervalValue,
        scheduleIntervalUnit: agent.scheduleIntervalUnit,
        scheduleDayOfMonth: agent.scheduleDayOfMonth,
        scheduleMaxRuns: agent.scheduleMaxRuns,
        updatedAt: new Date(Math.max(existingTime, incomingTime, Date.now())).toISOString()
      });
    });
    return Array.from(byId.values()).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  };

  const mergeUserSettings = (existing: any = {}, incoming: any = {}) => {
    const merged = { ...existing, ...incoming };
    merged.agentRunRecords = mergeSettingsArrayById(existing.agentRunRecords || [], incoming.agentRunRecords || []).slice(0, 200);
    merged.agentHarnessRuns = mergeSettingsArrayById(existing.agentHarnessRuns || [], incoming.agentHarnessRuns || []);
    merged.globalAgentPlans = mergeSettingsArrayById(existing.globalAgentPlans || [], incoming.globalAgentPlans || []);
    merged.agentHubAgents = mergeAgentHubAgents(existing.agentHubAgents || [], incoming.agentHubAgents || []);
    return merged;
  };

  app.patch('/api/user/settings', authenticateToken, async (req: any, res) => {
    try {
      const existingRes = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.uid]);
      const existingSettings = existingRes.rows[0]?.settings || {};
      const nextSettings = mergeUserSettings(existingSettings, req.body || {});
      const result = await pool.query(
        'UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING settings',
        [JSON.stringify(nextSettings), req.user.uid]
      );
      res.json(result.rows[0].settings || {});
    } catch (e) {
      console.error('Failed to update settings', e);
      res.status(500).json({ error: 'Failed to update user settings' });
    }
  });

  const sendExternalNotification = async (
    userId: string,
    payload: { event: string; title: string; body: string; url?: string; metadata?: any }
  ) => {
    const result = await pool.query('SELECT settings FROM users WHERE id = $1', [userId]);
    const settings = result.rows[0]?.settings || {};
    const config = settings.externalNotificationConfig || {};
    const events = config.events || {};
    if (!config.enabled || events[payload.event] === false) return;

    const jobs: Promise<any>[] = [];
    if (config.barkEnabled && config.barkDeviceKey) {
      const serverUrl = String(config.barkServerUrl || 'https://api.day.app').replace(/\/+$/, '');
      const deviceKey = String(config.barkDeviceKey).trim().replace(/^\/+|\/+$/g, '');
      const barkUrl = /^https?:\/\//i.test(deviceKey) ? deviceKey : `${serverUrl}/${encodeURIComponent(deviceKey)}`;
      jobs.push(fetch(barkUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url,
          group: 'TradeQuest',
          level: payload.event === 'execution_failed' ? 'timeSensitive' : 'active'
        })
      }));
    }

    if (config.webhookEnabled && config.webhookUrl) {
      jobs.push(fetch(String(config.webhookUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'TradeQuest',
          event: payload.event,
          title: payload.title,
          body: payload.body,
          url: payload.url,
          metadata: payload.metadata || {},
          createdAt: new Date().toISOString()
        })
      }));
    }

    await Promise.allSettled(jobs);
  };

  app.post('/api/notifications/external', authenticateToken, async (req: any, res) => {
    try {
      const { event, title, body, url, metadata } = req.body || {};
      if (!event || !title || !body) {
        return res.status(400).json({ error: 'Missing notification event, title, or body' });
      }
      await sendExternalNotification(req.user.uid, {
        event: String(event),
        title: String(title).slice(0, 160),
        body: String(body).slice(0, 1000),
        url: url ? String(url) : undefined,
        metadata
      });
      res.json({ success: true });
    } catch (e) {
      console.error('External notification failed', e);
      res.status(500).json({ error: 'Failed to send external notification' });
    }
  });

  const getWhatsAppHubConfig = async (userId: string) => {
    const result = await pool.query('SELECT settings FROM users WHERE id = $1', [userId]);
    const settings = result.rows[0]?.settings || {};
    const config = settings.whatsappHubConfig || {};
    if (!config.enabled || !config.baseUrl || !config.apiToken) {
      throw new Error('WhatsApp Actor Hub is not configured');
    }
    return {
      baseUrl: String(config.baseUrl).replace(/\/+$/, ''),
      apiToken: String(config.apiToken),
      dailyBaseQuota: Number(config.dailyBaseQuota || 40),
      minReplyRate: Number(config.minReplyRate || 0.25)
    };
  };

  const callWhatsAppHub = async (userId: string, path: string, init: RequestInit = {}) => {
    const config = await getWhatsAppHubConfig(userId);
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-hub-token': config.apiToken,
        ...(init.headers || {})
      }
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error: any = new Error(body.error || `WhatsApp Hub request failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return body;
  };

  const normalizeWhatsAppPhone = (value: string) => String(value || '').replace(/[^0-9]/g, '');

  const phoneFromWhatsAppMessage = (message: any) => normalizeWhatsAppPhone(
    message.direction === 'inbound' ? message.sender : message.recipient
  );

  const findClientForWhatsAppPhone = async (userId: string, phone: string) => {
    if (!phone) return null;
    const result = await pool.query(
      `SELECT id FROM clients
       WHERE user_id = $1
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(contact_methods) elem
           WHERE elem->>'type' IN ('whatsapp', 'phone')
             AND regexp_replace(elem->>'value', '[^0-9]', '', 'g') LIKE $2
         )
       LIMIT 1`,
      [userId, `%${phone.slice(-8)}`]
    );
    return result.rows[0]?.id || null;
  };

  const ensureWhatsAppConversation = async (
    userId: string,
    phone: string,
    clientId?: string | null,
    lastMessageAt?: string,
    options: { restoreDeleted?: boolean } = {}
  ) => {
    const conversationId = `wa_conv_${userId}_${phone}`;
    const resolvedClientId = clientId || await findClientForWhatsAppPhone(userId, phone);
    const deletedRes = await pool.query(
      `SELECT id, deleted_at FROM whatsapp_conversations
       WHERE user_id = $1 AND target_phone = $2 AND deleted_at IS NOT NULL`,
      [userId, phone]
    );
    if (deletedRes.rows.length > 0 && !options.restoreDeleted) return null;
    await pool.query(
      `INSERT INTO whatsapp_conversations (id, user_id, target_phone, client_id, last_message_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, target_phone)
       DO UPDATE SET
         client_id = COALESCE(whatsapp_conversations.client_id, EXCLUDED.client_id),
         last_message_at = GREATEST(COALESCE(whatsapp_conversations.last_message_at, EXCLUDED.last_message_at), COALESCE(EXCLUDED.last_message_at, whatsapp_conversations.last_message_at)),
         deleted_at = CASE WHEN $6::boolean THEN NULL ELSE whatsapp_conversations.deleted_at END,
         updated_at = CURRENT_TIMESTAMP`,
      [conversationId, userId, phone, resolvedClientId, lastMessageAt || null, !!options.restoreDeleted]
    );
    return { id: conversationId, clientId: resolvedClientId };
  };

  const upsertWhatsAppMessage = async (userId: string, message: any) => {
    const targetPhone = phoneFromWhatsAppMessage(message);
    if (!targetPhone) return;
    const messageTime = message.created_at || message.received_at || new Date().toISOString();
    const deletedRes = await pool.query(
      `SELECT deleted_at FROM whatsapp_conversations
       WHERE user_id = $1 AND target_phone = $2 AND deleted_at IS NOT NULL`,
      [userId, targetPhone]
    );
    const deletedAt = deletedRes.rows[0]?.deleted_at ? new Date(deletedRes.rows[0].deleted_at).getTime() : 0;
    const incomingAt = new Date(messageTime).getTime();
    const restoreDeleted = Boolean(deletedAt && Number.isFinite(incomingAt) && incomingAt > deletedAt);
    const conversation = await ensureWhatsAppConversation(userId, targetPhone, null, messageTime, { restoreDeleted });
    if (!conversation) return;
    const messageId = String(message.id || `wa_msg_${message.client_id || 'hub'}_${message.direction}_${targetPhone}_${new Date(messageTime).getTime()}`).slice(0, 128);
    await pool.query(
      `INSERT INTO whatsapp_messages
       (id, user_id, conversation_id, client_id, hub_client_id, direction, sender, recipient, target_phone, body, message_type, payload, source_created_at, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id)
       DO UPDATE SET
         client_id = COALESCE(whatsapp_messages.client_id, EXCLUDED.client_id),
         body = EXCLUDED.body,
         message_type = EXCLUDED.message_type,
         payload = EXCLUDED.payload,
         source_created_at = EXCLUDED.source_created_at,
         received_at = EXCLUDED.received_at`,
      [
        messageId,
        userId,
        conversation.id,
        conversation.clientId,
        message.client_id || message.hubClientId || null,
        message.direction || 'inbound',
        message.sender || '',
        message.recipient || '',
        targetPhone,
        message.body || '',
        message.message_type || message.type || 'chat',
        JSON.stringify(message.payload || {}),
        message.created_at || messageTime,
        message.received_at || null
      ]
    );
  };

  const syncWhatsAppHubMessages = async (userId: string, options: { targetPhone?: string; limit?: number; since?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.targetPhone) params.set('targetPhone', options.targetPhone);
    if (options.since) params.set('since', options.since);
    params.set('limit', String(Math.min(Math.max(options.limit || 100, 1), 200)));
    const data = await callWhatsAppHub(userId, `/api/messages?${params.toString()}`);
    const messages = Array.isArray(data.messages) ? data.messages : [];
    for (const message of messages) {
      await upsertWhatsAppMessage(userId, message);
    }
    return messages.length;
  };

  const mapWhatsAppMessageRow = (row: any) => ({
    id: row.id,
    client_id: row.hub_client_id,
    clientId: row.client_id,
    conversationId: row.conversation_id,
    direction: row.direction,
    sender: row.sender,
    recipient: row.recipient,
    targetPhone: row.target_phone,
    body: row.body,
    message_type: row.message_type,
    payload: row.payload,
    created_at: row.source_created_at || row.created_at,
    received_at: row.received_at
  });

  const mapWhatsAppConversationRow = (row: any) => ({
    id: row.id,
    targetPhone: row.target_phone,
    clientId: row.client_id,
    clientName: row.client_name,
    clientCompany: row.client_company,
    tags: row.tags || [],
    comments: row.comments || [],
    lastMessageAt: row.last_message_at,
    lastBody: row.last_body,
    lastDirection: row.last_direction,
    lastHubClientId: row.last_hub_client_id,
    agentContextAnalysis: row.agent_context_analysis,
    agentContextAnalysisKey: row.agent_context_analysis_key,
    updatedAt: row.updated_at
  });

  const isFutureDate = (value?: string) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time > Date.now();
  };

  const getWhatsAppClientQuota = async (userId: string, clientId: string) => {
    const config = await getWhatsAppHubConfig(userId);
    const data = await callWhatsAppHub(userId, `/api/messages?clientId=${encodeURIComponent(clientId)}&limit=500`);
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const now = Date.now();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const recent = messages.filter((message: any) => now - new Date(message.created_at || message.received_at || 0).getTime() <= 7 * 86400000);
    const outboundRecent = recent.filter((message: any) => message.direction === 'outbound').length;
    const inboundRecent = recent.filter((message: any) => message.direction === 'inbound').length;
    const replyRate = outboundRecent > 0 ? inboundRecent / outboundRecent : 1;
    const sentToday = messages.filter((message: any) => (
      message.direction === 'outbound' &&
      new Date(message.created_at || message.received_at || 0).getTime() >= dayStart.getTime()
    )).length;
    const replyFactor = Math.max(0.25, Math.min(1.5, replyRate / Math.max(config.minReplyRate, 0.01)));
    const dailyQuota = Math.max(5, Math.floor(config.dailyBaseQuota * replyFactor));
    return { clientId, sentToday, dailyQuota, replyRate, remaining: Math.max(0, dailyQuota - sentToday) };
  };

  const getWhatsAppHubClient = async (userId: string, clientId: string) => {
    const clientsData = await callWhatsAppHub(userId, '/api/clients');
    return (clientsData.clients || []).find((client: any) => client.id === clientId);
  };

  const chooseWhatsAppClient = async (userId: string, targetPhone: string, requestedClientId?: string) => {
    if (requestedClientId) {
      const requestedClient = await getWhatsAppHubClient(userId, requestedClientId);
      if (!requestedClient) throw new Error(`WhatsApp client ${requestedClientId} was not found`);
      if (requestedClient.status !== 'online') throw new Error(`WhatsApp client ${requestedClientId} is not online`);
      return requestedClientId;
    }
    const history = await callWhatsAppHub(userId, `/api/messages?targetPhone=${encodeURIComponent(targetPhone)}&limit=100`).catch(() => ({ messages: [] }));
    const sticky = (history.messages || []).find((message: any) => message.direction === 'outbound' && message.client_id)?.client_id;
    if (sticky) {
      const stickyClient = await getWhatsAppHubClient(userId, sticky).catch(() => null);
      if (stickyClient?.status === 'online') {
        const stickyQuota = await getWhatsAppClientQuota(userId, sticky).catch(() => null);
        if (!stickyQuota || stickyQuota.remaining > 0) return sticky;
      }
    }

    const clientsData = await callWhatsAppHub(userId, '/api/clients');
    const onlineClients = (clientsData.clients || []).filter((client: any) => client.status === 'online');
    const candidates = [];
    for (const client of onlineClients) {
      const quota = await getWhatsAppClientQuota(userId, client.id).catch(() => null);
      if (!quota || quota.remaining > 0) candidates.push(client);
    }
    if (candidates.length === 0) throw new Error('no online WhatsApp clients with available quota');
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  };

  const sendWhatsAppViaHub = async (userId: string, payload: any) => {
    const to = normalizeWhatsAppPhone(payload.to);
    if (!to || (!payload.body && !payload.media)) throw new Error('Missing WhatsApp recipient or message body');
    const clientId = await chooseWhatsAppClient(userId, to, payload.clientId || undefined);
    const quota = await getWhatsAppClientQuota(userId, clientId);
    if (quota.remaining <= 0) throw new Error(`WhatsApp client ${clientId} reached today's dynamic quota`);
    const data = await callWhatsAppHub(userId, '/api/tasks/send-message', {
      method: 'POST',
      body: JSON.stringify({
        clientId,
        to,
        body: payload.body || '',
        media: payload.media,
        metadata: { source: 'tradequest-crm', ...(payload.metadata || {}) }
      })
    });
    await upsertWhatsAppMessage(userId, {
      id: String(data.task?.id || data.id || `wa_local_${Date.now()}_${Math.floor(Math.random() * 1000)}`),
      client_id: clientId,
      direction: 'outbound',
      sender: clientId,
      recipient: to,
      body: payload.body || '',
      message_type: payload.media ? 'media' : 'chat',
      payload: { ...(payload.media ? { media: payload.media, hasMedia: true } : {}), ...(payload.metadata || {}) },
      created_at: new Date().toISOString()
    });
    return { ...data, selectedClientId: clientId, quota };
  };

  const scheduleWhatsAppMessage = async (userId: string, payload: any) => {
    const id = `wa_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const to = normalizeWhatsAppPhone(payload.to);
    const scheduledAt = payload.scheduledAt || new Date().toISOString();
    await pool.query(
      `INSERT INTO scheduled_whatsapp_messages
       (id, user_id, crm_client_id, hub_client_id, to_phone, body, media, metadata, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        id,
        userId,
        payload.metadata?.clientId || null,
        payload.clientId || null,
        to,
        payload.body || '',
        payload.media ? JSON.stringify(payload.media) : null,
        JSON.stringify({ source: 'tradequest-crm', ...(payload.metadata || {}) }),
        scheduledAt
      ]
    );
    return { id, scheduledAt, status: 'pending' };
  };

  app.get('/api/whatsapp-hub/clients', authenticateToken, async (req: any, res) => {
    try {
      const data = await callWhatsAppHub(req.user.uid, '/api/clients');
      const quotas = await Promise.all((data.clients || []).map((client: any) => getWhatsAppClientQuota(req.user.uid, client.id).catch(() => null)));
      res.json({ clients: (data.clients || []).map((client: any, index: number) => ({ ...client, quota: quotas[index] })) });
    } catch (e: any) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to fetch WhatsApp clients' });
    }
  });

  app.get('/api/whatsapp-hub/messages', authenticateToken, async (req: any, res) => {
    try {
      const targetPhone = req.query.targetPhone ? normalizeWhatsAppPhone(String(req.query.targetPhone)) : '';
      const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 500);

      const values: any[] = [req.user.uid];
      let where = 'm.user_id = $1';
      if (targetPhone) {
        values.push(targetPhone);
        where += ` AND m.target_phone = $${values.length}`;
      }
      values.push(limit);
      const result = await pool.query(
        `SELECT m.*
         FROM whatsapp_messages m
         WHERE ${where}
         ORDER BY COALESCE(m.source_created_at, m.created_at) DESC
         LIMIT $${values.length}`,
        values
      );
      res.json({ messages: result.rows.map(mapWhatsAppMessageRow) });
    } catch (e: any) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to fetch WhatsApp messages' });
    }
  });

  app.post('/api/whatsapp-hub/sync', authenticateToken, async (req: any, res) => {
    try {
      const targetPhone = req.body?.targetPhone ? normalizeWhatsAppPhone(req.body.targetPhone) : '';
      let since = req.body?.since ? String(req.body.since) : '';
      if (!since) {
        const values: any[] = [req.user.uid];
        let where = 'user_id = $1';
        if (targetPhone) {
          values.push(targetPhone);
          where += ` AND target_phone = $${values.length}`;
        }
        const latest = await pool.query(
          `SELECT MAX(COALESCE(source_created_at, created_at)) AS latest_at FROM whatsapp_messages WHERE ${where}`,
          values
        );
        since = latest.rows[0]?.latest_at ? new Date(latest.rows[0].latest_at).toISOString() : '';
      }
      const count = await syncWhatsAppHubMessages(req.user.uid, { targetPhone, limit: Number(req.body?.limit || 100), since });
      res.json({ success: true, count });
    } catch (e: any) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to sync WhatsApp messages' });
    }
  });

  app.get('/api/whatsapp-hub/conversations', authenticateToken, async (req: any, res) => {
    try {
      const search = String(req.query.search || '').trim().toLowerCase();
      const values: any[] = [req.user.uid];
      let searchSql = '';
      if (search) {
        values.push(`%${search}%`);
        searchSql = `AND (
          lower(c.target_phone) LIKE $${values.length}
          OR lower(COALESCE(cl.name, '')) LIKE $${values.length}
          OR lower(COALESCE(cl.company, '')) LIKE $${values.length}
          OR lower(COALESCE(last_msg.body, '')) LIKE $${values.length}
          OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(c.tags) tag WHERE lower(tag) LIKE $${values.length})
        )`;
      }
      const result = await pool.query(
        `SELECT c.*, cl.name AS client_name, cl.company AS client_company,
                last_msg.body AS last_body,
                last_msg.direction AS last_direction,
                last_msg.hub_client_id AS last_hub_client_id
         FROM whatsapp_conversations c
         LEFT JOIN clients cl ON cl.id = c.client_id
         LEFT JOIN LATERAL (
           SELECT body, direction, hub_client_id
           FROM whatsapp_messages m
           WHERE m.conversation_id = c.id
           ORDER BY COALESCE(m.source_created_at, m.created_at) DESC
           LIMIT 1
         ) last_msg ON true
         WHERE c.user_id = $1 AND c.deleted_at IS NULL ${searchSql}
         ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC
         LIMIT 200`,
        values
      );
      res.json({ conversations: result.rows.map(mapWhatsAppConversationRow) });
    } catch (e: any) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to load WhatsApp conversations' });
    }
  });

  app.patch('/api/whatsapp-hub/conversations/:id', authenticateToken, async (req: any, res) => {
    try {
      const updates = [];
      const values: any[] = [];
      if (req.body.tags !== undefined) {
        values.push(JSON.stringify(req.body.tags || []));
        updates.push(`tags = $${values.length}`);
      }
      if (req.body.clientId !== undefined) {
        values.push(req.body.clientId || null);
        updates.push(`client_id = $${values.length}`);
      }
      if (req.body.agentContextAnalysis !== undefined) {
        values.push(JSON.stringify(req.body.agentContextAnalysis || null));
        updates.push(`agent_context_analysis = $${values.length}`);
      }
      if (req.body.agentContextAnalysisKey !== undefined) {
        values.push(req.body.agentContextAnalysisKey || null);
        updates.push(`agent_context_analysis_key = $${values.length}`);
      }
      if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
      values.push(req.params.id, req.user.uid);
      const result = await pool.query(
        `UPDATE whatsapp_conversations
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING *`,
        values
      );
      res.json({ conversation: result.rows[0] });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to update WhatsApp conversation' });
    }
  });

  app.delete('/api/whatsapp-hub/conversations/:id', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query(
        `UPDATE whatsapp_conversations
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [req.params.id, req.user.uid]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
      res.json({ success: true, deletedId: result.rows[0].id });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to delete WhatsApp conversation' });
    }
  });

  app.post('/api/whatsapp-hub/conversations/:id/comments', authenticateToken, async (req: any, res) => {
    try {
      const comment = {
        id: `wac_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        author: req.user.email || 'User',
        content: String(req.body.content || '').trim(),
        createdAt: new Date().toISOString(),
        replies: []
      };
      if (!comment.content) return res.status(400).json({ error: 'Comment is required' });
      const result = await pool.query(
        `UPDATE whatsapp_conversations
         SET comments = COALESCE(comments, '[]'::jsonb) || $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3
         RETURNING comments`,
        [JSON.stringify([comment]), req.params.id, req.user.uid]
      );
      res.json({ comment, comments: result.rows[0]?.comments || [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to add WhatsApp conversation comment' });
    }
  });

  app.delete('/api/whatsapp-hub/conversations/:id/comments/:commentId', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query(
        `UPDATE whatsapp_conversations
         SET comments = COALESCE((
             SELECT jsonb_agg(comment)
             FROM jsonb_array_elements(COALESCE(comments, '[]'::jsonb)) comment
             WHERE comment->>'id' <> $1
           ), '[]'::jsonb),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3
         RETURNING comments`,
        [req.params.commentId, req.params.id, req.user.uid]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
      res.json({ success: true, comments: result.rows[0]?.comments || [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to delete WhatsApp conversation comment' });
    }
  });

  app.get('/api/whatsapp-hub/tasks', authenticateToken, async (req: any, res) => {
    try {
      const data = await callWhatsAppHub(req.user.uid, '/api/tasks?limit=100');
      res.json(data);
    } catch (e: any) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to fetch WhatsApp tasks' });
    }
  });

  app.get('/api/whatsapp-hub/scheduled', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query(
        `SELECT id, crm_client_id, hub_client_id, to_phone, body, media, metadata, scheduled_at, status, attempts, last_error, sent_at, created_at, updated_at
         FROM scheduled_whatsapp_messages
         WHERE user_id = $1
         ORDER BY scheduled_at DESC
         LIMIT 100`,
        [req.user.uid]
      );
      res.json({
        messages: result.rows.map(row => ({
          id: row.id,
          clientId: row.crm_client_id,
          hubClientId: row.hub_client_id,
          to: row.to_phone,
          body: row.body,
          media: row.media,
          metadata: row.metadata,
          scheduledAt: row.scheduled_at,
          status: row.status,
          attempts: row.attempts,
          lastError: row.last_error,
          sentAt: row.sent_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to load scheduled WhatsApp messages' });
    }
  });

  const whatsappHubUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  app.post('/api/whatsapp-hub/upload', authenticateToken, whatsappHubUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const config = await getWhatsAppHubConfig(req.user.uid);
      const form = new FormData();
      form.append(
        'file',
        new Blob([req.file.buffer as any], { type: req.file.mimetype || 'application/octet-stream' }),
        req.file.originalname || 'upload'
      );
      const response = await fetch(`${config.baseUrl}/api/uploads`, {
        method: 'POST',
        headers: { 'x-hub-token': config.apiToken },
        body: form as any
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status).json({ error: data.error || 'WhatsApp Hub upload failed' });
      res.json(data);
    } catch (e: any) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to upload WhatsApp media' });
    }
  });

  app.post('/api/whatsapp-hub/send', authenticateToken, async (req: any, res) => {
    try {
      const to = normalizeWhatsAppPhone(req.body.to);
      if (!to || (!req.body.body && !req.body.media)) return res.status(400).json({ error: 'Missing WhatsApp recipient or message body' });
      if (req.body.scheduledAt && isFutureDate(req.body.scheduledAt)) {
        const scheduled = await scheduleWhatsAppMessage(req.user.uid, { ...req.body, to });
        return res.status(202).json({ scheduled: true, ...scheduled });
      }
      const data = await sendWhatsAppViaHub(req.user.uid, { ...req.body, to });
      res.status(202).json(data);
    } catch (e: any) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to send WhatsApp message' });
    }
  });

  app.get('/api/users/:uid', authenticateToken, async (req, res) => {
    try {
      const { uid } = req.params;
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [uid]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = result.rows[0];
      // Map to camelCase for frontend
      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      });
    } catch (error: any) {
      console.error('DB Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/auth/reset-token', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
      const { uid } = req.body;
      const token = jwt.sign({ resetUid: uid }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token });
    } catch (e) {
      res.status(500).json({ error: 'Failed to generate token' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Invalid input' });
      
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (!decoded.resetUid) return res.status(400).json({ error: 'Invalid token type' });

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, decoded.resetUid]);
      res.json({ success: true });
    } catch(e) {
      res.status(400).json({ error: 'Invalid or expired token' });
    }
  });

  app.get('/api/users', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      res.json(result.rows.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })));
    } catch (error: any) {
      console.error('DB Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/users', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
      const { uid, email, displayName, role } = req.body;
      const result = await pool.query(
        `INSERT INTO users (id, email, display_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
         RETURNING *`,
        [uid, email, displayName, role || 'user']
      );
      const user = result.rows[0];
      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      });
    } catch (error: any) {
      console.error('DB Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.patch('/api/users/:uid', authenticateToken, async (req: any, res: any) => {
    try {
      const { uid } = req.params;
      const { displayName, avatarUrl, role, companyName, companyAddress, companyPhone, companyEmail, companyWebsite } = req.body;
      
      // Check if user is modifying themselves or is a superadmin
      let isSuperadmin = false;
      const authResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.uid]);
      if (authResult.rows.length > 0 && authResult.rows[0].role === 'superadmin') {
        isSuperadmin = true;
      }
      
      if (req.user.uid !== uid && !isSuperadmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // non-superadmins cannot modify roles
      const updateRole = isSuperadmin && role !== undefined ? role : null;

      const result = await pool.query(
        `UPDATE users 
         SET display_name = COALESCE($1, display_name),
             avatar_url = COALESCE($2, avatar_url),
             role = COALESCE($3, role),
             company_name = COALESCE($5, company_name),
             company_address = COALESCE($6, company_address),
             company_phone = COALESCE($7, company_phone),
             company_email = COALESCE($8, company_email),
             company_website = COALESCE($9, company_website),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [
          displayName !== undefined ? displayName : null, 
          avatarUrl !== undefined ? avatarUrl : null, 
          updateRole, 
          uid,
          companyName !== undefined ? companyName : null,
          companyAddress !== undefined ? companyAddress : null,
          companyPhone !== undefined ? companyPhone : null,
          companyEmail !== undefined ? companyEmail : null,
          companyWebsite !== undefined ? companyWebsite : null
        ]
      );
      const user = result.rows[0];
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      });
    } catch (error: any) {
      console.error('DB Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete('/api/users/:uid', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
      const { uid } = req.params;
      await pool.query('DELETE FROM users WHERE id = $1', [uid]);
      res.json({ success: true });
    } catch (error: any) {
      console.error('DB Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Auto-release logic
  const releaseIdleLeads = async () => {
    try {
      const result = await pool.query(`
        UPDATE clients 
        SET user_id = NULL 
        WHERE user_id IS NOT NULL 
          AND status IN ('Leads', 'Contacted')
          AND (
            (last_contact IS NOT NULL AND last_contact < NOW() - INTERVAL '30 days')
            OR
            (last_contact IS NULL AND created_at < NOW() - INTERVAL '30 days')
            OR
            (created_at < NOW() - INTERVAL '90 days')
          )
      `);
      if (result.rowCount && result.rowCount > 0) {
        console.log(`Auto-released ${result.rowCount} idle leads to the public pool.`);
      }
    } catch (e) {
      console.error('Failed to release idle leads:', e);
    }
  };

  // Run idle release periodically
  setInterval(releaseIdleLeads, 60 * 60 * 1000); // Check every hour
  
  // Agent Polling
  const runAgentPolling = async () => {
    try {
      if (!pool) return;
      const settingsRes = await pool.query("SELECT key, value FROM global_settings WHERE key IN ('agent_polling_interval_seconds', 'agent_polling_interval_hours')");
      if (settingsRes.rows.length === 0) return; // Not configured yet
      const settings = settingsRes.rows.reduce((acc: Record<string, any>, row: any) => ({ ...acc, [row.key]: row.value }), {});
      const intervalSeconds = settings.agent_polling_interval_seconds !== undefined
        ? parseFloat(settings.agent_polling_interval_seconds)
        : parseFloat(settings.agent_polling_interval_hours) * 3600;
      if (isNaN(intervalSeconds) || intervalSeconds <= 0) return;

      const clientsRes = await pool.query(`
        SELECT c.*, u.settings as user_settings 
        FROM clients c
        JOIN users u ON c.user_id = u.id
        WHERE c.agent_enabled = TRUE 
          AND (c.agent_last_run IS NULL OR c.agent_last_run < NOW() - INTERVAL '1 second' * $1)
      `, [intervalSeconds]);

      for (const client of clientsRes.rows) {
        try {
          console.log(`Running background agent for client ${client.id}`);
          const userSettingsStr = typeof client.user_settings === 'string' ? client.user_settings : JSON.stringify(client.user_settings || {});
          const userSettings = JSON.parse(userSettingsStr || '{}');
          const agentWorkflows = userSettings.agentWorkflows || [];
          const userTimezone = userSettings.timezone || 'UTC';
          const selectedWf = agentWorkflows.find((w: any) => w.id === client.agent_workflow_id);

          // Fetch context
          const emailsRes = await pool.query(`SELECT * FROM emails WHERE (client_id = $1 OR recipient = $2) AND user_id = $3 ORDER BY date DESC LIMIT 5`, [client.id, client.email || '', client.user_id]);
          const logsRes = await pool.query(`SELECT * FROM logs WHERE client_id = $1 ORDER BY date DESC LIMIT 5`, [client.id]);
          const productsRes = await pool.query(`SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [client.user_id]); 
          const kbRes = await searchKnowledgeBase(client.user_id, client.id, `Agent follow up strategy for client in ${client.country || client.company || 'foreign trade'}`, undefined, 5);

          let workflowInstructions = 'None specified.';
          if (selectedWf) {
            workflowInstructions = `Workflow: ${selectedWf.name}\nSteps sequence: ${JSON.stringify(selectedWf.steps)}\nStop on Meaningful Reply globally requested: ${!!selectedWf.stopOnMeaningfulReply}`;
          }
          
          const contextPrompt = `
You are an expert sales AI assistant tasked with following up with a specific client.
Current Time in User Timezone (${userTimezone}): ${new Date().toLocaleString('en-US', { timeZone: userTimezone })}

Client Information:
Name: ${client.name}
Company: ${client.company}
Country/Local Region: ${client.country || 'Unknown'} (Compute their local time based on this)
Preferred Language: ${client.preferred_language || 'Auto-detect or English'}
Preferred Comm Time: ${client.preferred_time_range || 'Any'} (This is in the Client's Local Time)
Agent Context / Instructions: ${client.agent_context || 'None'}
Long-term Summary: ${client.agent_summary || 'None'}
Lead Scoring Agent:
- Lead Score: ${client.lead_score ?? 'Not scored yet'}
- Lead Summary: ${client.lead_summary || 'None'}
- Best Next Step: ${client.lead_next_step || 'None'}
- Coordination Rule: Do not repeat lead scoring or rewrite the lead summary unless new evidence materially changes it. Use the score, summary, and next step above to choose follow-up timing and content.

${workflowInstructions}

Knowledge Base context:
${kbRes.rows.map((kb: any) => `[${kb.title}]\n${kb.content}`).join('\n\n')}

Recent Logs:
${JSON.stringify(logsRes.rows)}

Recent Emails:
${JSON.stringify(emailsRes.rows)}

Available Products (for context):
${JSON.stringify(productsRes.rows)}
`;

          const prompt = `${contextPrompt}
Based on the above context, you must decide on the next best action to advance this lead. 
If the instruction is to "Stop on Meaningful Reply" and a meaningful reply has recently been received from the client, you MUST abort further follow ups (return an empty draftEmail and set suggestedNextStep to 'Stopped: received reply').
If an email or WhatsApp message should be sent according to a workflow step, take note of its "delayDays" and "sendTime" (HH:mm form). Compute precisely when it should be sent in ISO format. IMPORTANT: you must calculate the ISO schedule time so that it hits the "sendTime" in the **Client's Local Time** (based on their Country/Local Region), rather than Beijing time or your system time. If no specific time is required, just send it immediately (leave the corresponding scheduled field empty).

Your output MUST be a JSON object with the following schema:
{
  "newSummary": "An updated long-term summary incorporating the new history. Max 3 sentences.",
  "suggestedNextStep": "A short sentence describing what should be done next to follow up.",
  "draftEmail": "If an email should be sent, provide the body of a drafted email here. Otherwise, leave empty.",
  "draftWhatsApp": "If a WhatsApp step should be sent, provide a short WhatsApp message here. Otherwise, leave empty.",
  "scheduledAt": "ISO date string for when to schedule the email. Leave empty if sending now.",
  "whatsappScheduledAt": "ISO date string for when to schedule the WhatsApp message. Leave empty if sending now."
}
No markdown wrappers, just valid JSON.`;

          // use default internal AI
          const aiResponse = await callAI(prompt, null, true);
          const parsed = JSON.parse(aiResponse || '{}');
          
          const newSummary = parsed.newSummary || client.agent_summary;
          const nextStep = parsed.suggestedNextStep || 'Needs follow up.';
          const draftEmail = parsed.draftEmail || '';
          const draftWhatsApp = parsed.draftWhatsApp || '';
          const scheduledAt = parsed.scheduledAt || new Date().toISOString();
          const whatsappScheduledAt = parsed.whatsappScheduledAt || '';

          let nextRun = new Date().toISOString();

          await pool.query(
            'UPDATE clients SET agent_summary = $1, agent_next_step = $2, agent_last_run = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
            [newSummary, nextStep, nextRun, client.id]
          );

          if (client.agent_mode === 'auto_email' && draftEmail) {
            const emailId = `e${Date.now()}${Math.floor(Math.random()*1000)}`;
            const isScheduled = parsed.scheduledAt ? true : false;
            await pool.query(
              `INSERT INTO emails (id, user_id, client_id, sender, recipient, subject, body, date, scheduled_at, read, direction, type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, 'outbound', $10)`,
              [emailId, client.user_id, client.id, 'AutoAgent', client.email || 'unknown@example.com', 'Follow Up', draftEmail, new Date().toISOString(), isScheduled ? scheduledAt : null, isScheduled ? 'scheduled' : 'outbound']
            );
            await pool.query(
              `INSERT INTO logs (id, client_id, date, content) VALUES ($1, $2, $3, $4)`,
              [`l${Date.now()}${Math.floor(Math.random()*1000)}`, client.id, new Date().toISOString(), 'Auto-Agent sent follow up email.']
            );
          }
          if (client.agent_mode === 'auto_email' && draftWhatsApp) {
            try {
              const contactMethods = typeof client.contact_methods === 'string' ? JSON.parse(client.contact_methods || '[]') : (client.contact_methods || []);
              const whatsapp = contactMethods.find((method: any) => ['whatsapp', 'phone'].includes(method.type) && method.value)?.value;
              if (whatsapp) {
                const to = normalizeWhatsAppPhone(whatsapp);
                if (whatsappScheduledAt && isFutureDate(whatsappScheduledAt)) {
                  const scheduled = await scheduleWhatsAppMessage(client.user_id, {
                    to,
                    body: draftWhatsApp,
                    scheduledAt: whatsappScheduledAt,
                    metadata: { source: 'tradequest-follow-up-agent', clientId: client.id }
                  });
                  await pool.query(
                    `INSERT INTO logs (id, client_id, date, content, type, metadata) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [`l${Date.now()}${Math.floor(Math.random()*1000)}`, client.id, new Date().toISOString(), `Auto-Agent scheduled WhatsApp follow up for ${new Date(whatsappScheduledAt).toLocaleString()}.`, 'whatsapp', JSON.stringify(scheduled)]
                  );
                } else {
                  const data = await sendWhatsAppViaHub(client.user_id, {
                    to,
                    body: draftWhatsApp,
                    metadata: { source: 'tradequest-follow-up-agent', clientId: client.id }
                  });
                  await pool.query(
                    `INSERT INTO logs (id, client_id, date, content, type, metadata) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [`l${Date.now()}${Math.floor(Math.random()*1000)}`, client.id, new Date().toISOString(), 'Auto-Agent queued WhatsApp follow up.', 'whatsapp', JSON.stringify(data)]
                  );
                }
              }
            } catch (whatsappErr) {
              console.error(`Failed to send WhatsApp agent follow-up for ${client.id}`, whatsappErr);
            }
          }
        } catch (err) {
          console.error(`Failed to run agent for ${client.id}`, err);
        }
      }
    } catch (e) {
      console.error('Failed to run agent polling:', e);
    }
  };

  // Run agent polling frequently; per-client eligibility is controlled by agent_polling_interval_seconds.
  setInterval(runAgentPolling, 5 * 1000);

  const getAgentHubScheduleIntervalMs = (agent: any) => {
    const value = Math.max(1, Number(agent.scheduleIntervalValue || agent.scheduleIntervalMinutes || 1));
    const unit = agent.scheduleIntervalUnit || 'minute';
    if (unit === 'second') return value * 1000;
    if (unit === 'minute') return value * 60 * 1000;
    if (unit === 'hour') return value * 60 * 60 * 1000;
    return value * 24 * 60 * 60 * 1000;
  };

  const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

  const isAgentHubScheduleDue = (agent: any, now: number) => {
    if (!agent?.scheduleEnabled || agent.status === 'paused') return false;
    if (agent.scheduleMaxRuns != null && (agent.scheduleRunCount || 0) >= agent.scheduleMaxRuns) return false;
    const unit = agent.scheduleIntervalUnit || 'minute';
    const lastRun = agent.lastRunAt ? new Date(agent.lastRunAt) : null;
    if (unit === 'month_day') {
      const current = new Date(now);
      const requestedDay = Math.min(31, Math.max(1, Number(agent.scheduleDayOfMonth || 1)));
      const lastDayOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const runDay = Math.min(requestedDay, lastDayOfMonth);
      if (current.getDate() !== runDay) return false;
      return !lastRun || !isSameMonth(lastRun, current);
    }
    if (!lastRun) return true;
    return now - lastRun.getTime() >= getAgentHubScheduleIntervalMs(agent);
  };

  const getAgentHubScheduleState = (agent: any, now: number) => {
    const unit = agent?.scheduleIntervalUnit || 'minute';
    const value = Math.max(1, Number(agent?.scheduleIntervalValue || agent?.scheduleIntervalMinutes || 1));
    const lastRun = agent?.lastRunAt ? new Date(agent.lastRunAt) : null;
    if (!agent?.scheduleEnabled) {
      return { due: false, reason: 'schedule_disabled', unit, value, lastRunAt: agent?.lastRunAt || null, nextRunAt: null };
    }
    if (agent.status === 'paused') {
      return { due: false, reason: 'paused', unit, value, lastRunAt: agent?.lastRunAt || null, nextRunAt: null };
    }
    if (agent.scheduleMaxRuns != null && (agent.scheduleRunCount || 0) >= agent.scheduleMaxRuns) {
      return { due: false, reason: 'max_runs_reached', unit, value, lastRunAt: agent?.lastRunAt || null, nextRunAt: null };
    }
    if (unit === 'month_day') {
      const current = new Date(now);
      const requestedDay = Math.min(31, Math.max(1, Number(agent.scheduleDayOfMonth || 1)));
      const lastDayOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const runDay = Math.min(requestedDay, lastDayOfMonth);
      const due = current.getDate() === runDay && (!lastRun || !isSameMonth(lastRun, current));
      return {
        due,
        reason: due ? 'due' : 'waiting_for_month_day',
        unit,
        value,
        lastRunAt: agent?.lastRunAt || null,
        nextRunAt: due ? new Date(now).toISOString() : new Date(current.getFullYear(), current.getMonth() + (current.getDate() > runDay ? 1 : 0), runDay).toISOString()
      };
    }
    if (!lastRun) {
      return { due: true, reason: 'never_run', unit, value, lastRunAt: null, nextRunAt: new Date(now).toISOString() };
    }
    const intervalMs = getAgentHubScheduleIntervalMs(agent);
    const nextRunAtMs = lastRun.getTime() + intervalMs;
    return {
      due: now >= nextRunAtMs,
      reason: now >= nextRunAtMs ? 'due' : 'waiting_interval',
      unit,
      value,
      lastRunAt: agent.lastRunAt,
      nextRunAt: new Date(nextRunAtMs).toISOString(),
      secondsRemaining: Math.max(0, Math.ceil((nextRunAtMs - now) / 1000))
    };
  };

  const addAgentHubRunRecordToSettings = (settings: any, record: any) => {
    const now = new Date().toISOString();
    const id = `agent_run_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nextRecord = { ...record, id, createdAt: now, updatedAt: now };
    settings.agentRunRecords = [nextRecord, ...(settings.agentRunRecords || [])].slice(0, 200);
    return nextRecord;
  };

  const updateAgentHubRunRecordInSettings = (settings: any, id: string, updates: any) => {
    settings.agentRunRecords = (settings.agentRunRecords || []).map((record: any) => (
      record.id === id ? { ...record, ...updates, updatedAt: new Date().toISOString() } : record
    ));
  };

  const runAgentHubScheduler = async () => {
    const summary: any = { users: 0, configuredAgents: 0, dueAgents: 0, recordsCreated: 0, errors: 0, agents: [] };
    try {
      if (!pool) return;
      const usersRes = await pool.query(`
        SELECT id, settings
        FROM users
        WHERE settings IS NOT NULL
      `);
      const now = Date.now();

      for (const user of usersRes.rows) {
        summary.users += 1;
        const settings = typeof user.settings === 'string' ? JSON.parse(user.settings || '{}') : (user.settings || {});
        const agents = Array.isArray(settings.agentHubAgents) ? settings.agentHubAgents : [];
        if (agents.length === 0) continue;
        summary.configuredAgents += agents.length;

        let changed = false;
        for (const agent of agents) {
          const scheduleState = getAgentHubScheduleState(agent, now);
          summary.agents.push({
            userId: user.id,
            agentId: agent.id,
            agentName: agent.name,
            status: agent.status,
            scheduleEnabled: !!agent.scheduleEnabled,
            scheduleIntervalUnit: scheduleState.unit,
            scheduleIntervalValue: scheduleState.value,
            scheduleRunCount: agent.scheduleRunCount || 0,
            scheduleMaxRuns: agent.scheduleMaxRuns ?? null,
            lastRunAt: scheduleState.lastRunAt,
            nextRunAt: scheduleState.nextRunAt,
            secondsRemaining: scheduleState.secondsRemaining ?? null,
            due: scheduleState.due,
            reason: scheduleState.reason
          });
          if (!scheduleState.due) continue;
          summary.dueAgents += 1;
          if (agent.id === 'follow_up_agent') {
            const scoringAgent = agents.find((item: any) => item.id === 'lead_scoring_agent');
            if (scoringAgent && isAgentHubScheduleDue(scoringAgent, now)) continue;
          }

          const reviewStatus = agent.guardrail === 'auto' ? 'approved' : 'pending_review';
          const objective = agent.id === 'follow_up_agent'
            ? `Scheduled run for ${agent.name}: ${agent.instructions}. Use Lead Scoring Agent outputs when available and do not repeat lead scoring or lead summaries.`
            : `Scheduled run for ${agent.name}: ${agent.instructions || ''}`;
          const expectedResult = agent.id === 'global_agent'
            ? 'Create or update a Global Agent plan for conversion coordination.'
            : agent.id === 'lead_scoring_agent'
              ? 'Scan eligible leads, skip unchanged leads, and update score/summary/next step when needed.'
              : 'Create an Agent Harness run with the configured agent tools and guardrails.';
          const startedRecord = addAgentHubRunRecordToSettings(settings, {
            agentId: agent.id,
            agentName: agent.name,
            trigger: 'scheduled',
            status: 'running',
            plan: objective,
            expectedResult,
            actualResult: 'Backend scheduled agent run started.'
          });
          summary.recordsCreated += 1;

          try {
            let relatedRunId = '';
            let relatedRunType: 'harness' | 'global' = 'harness';
            if (agent.id === 'global_agent') {
              relatedRunId = `gplan_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
              relatedRunType = 'global';
              settings.globalAgentPlans = [{
                id: relatedRunId,
                objective,
                summary: `Scheduled Global Agent run: ${agent.name}`,
                status: reviewStatus,
                steps: [{
                  id: `step_${Date.now()}_${agent.id}`,
                  title: 'Scheduled Global Agent review',
                  description: agent.instructions || '',
                  actionType: 'review_pipeline',
                  status: 'pending',
                  payload: { source: 'agent-hub-backend-schedule', agentId: agent.id, tools: agent.tools || [] }
                }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, ...(settings.globalAgentPlans || [])];
            } else {
              relatedRunId = `harness_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
              settings.agentHarnessRuns = [{
                id: relatedRunId,
                objective,
                summary: `Scheduled Agent Hub run: ${agent.name}`,
                status: reviewStatus,
                steps: [{
                  id: `hstep_${Date.now()}_${agent.id}`,
                  agentId: agent.id,
                  title: `Run ${agent.name}`,
                  description: agent.instructions || '',
                  tool: (agent.tools || [])[0] || 'agent.run',
                  risk: agent.guardrail === 'auto' ? 'low' : 'medium',
                  status: 'pending',
                  payload: { source: 'agent-hub-backend-schedule', agentId: agent.id, tools: agent.tools || [] }
                }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, ...(settings.agentHarnessRuns || [])];
            }

            updateAgentHubRunRecordInSettings(settings, startedRecord.id, {
              status: reviewStatus,
              actualResult: reviewStatus === 'approved'
                ? 'Backend scheduler created and auto-approved the agent run according to guardrail policy.'
                : 'Backend scheduler created the agent run and is waiting for human approval.',
              relatedRunId,
              relatedRunType,
              completedAt: new Date().toISOString()
            });

            const nextRunCount = (agent.scheduleRunCount || 0) + 1;
            agent.lastRunAt = new Date(now).toISOString();
            agent.scheduleRunCount = nextRunCount;
            agent.scheduleEnabled = agent.scheduleMaxRuns != null && nextRunCount >= agent.scheduleMaxRuns ? false : agent.scheduleEnabled;
            agent.tasksCompleted = (agent.tasksCompleted || 0) + (agent.guardrail === 'auto' ? 1 : 0);
            agent.updatedAt = new Date().toISOString();
          } catch (error: any) {
            summary.errors += 1;
            updateAgentHubRunRecordInSettings(settings, startedRecord.id, {
              status: 'failed',
              actualResult: error?.message || 'Backend scheduled agent run failed.',
              completedAt: new Date().toISOString()
            });
          }
          changed = true;
        }

        if (changed) {
          await pool.query(
            'UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(settings), user.id]
          );
        }
      }
    } catch (e) {
      summary.errors += 1;
      console.error('Failed to run Agent Hub scheduler:', e);
    }
    return summary;
  };

  app.post('/api/agent-hub/scheduler/run', authenticateToken, async (_req: any, res) => {
    try {
      const summary = await runAgentHubScheduler();
      res.json({ success: true, summary });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to run Agent Hub scheduler' });
    }
  });

  void runAgentHubScheduler();
  setInterval(runAgentHubScheduler, 5 * 1000);
  
  // Scheduled Emails Processor
  const processScheduledEmails = async () => {
    try {
      if (!pool) return;
      const now = new Date().toISOString();
      const result = await pool.query(`
        SELECT * FROM emails
        WHERE type = 'scheduled' AND scheduled_at <= $1
      `, [now]);

      for (const email of result.rows) {
        try {
          const userRes = await pool.query('SELECT settings FROM users WHERE id = $1', [email.user_id]);
          const settings = userRes.rows[0]?.settings || {};
          const outboxConfigs = settings.outboxConfigs || [];
          const config = outboxConfigs.find((c: any) => c.fromEmail === email.sender) || outboxConfigs[0];

          if (config) {
            let finalBody = email.body;
            // The body is already processed with track pixels from POST /api/emails if enableTracking was true, since the tracking pixel was appended before inserting.

            if (config.type === 'smtp') {
              const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port ? parseInt(config.port) : (config.secure ? 465 : 587),
                secure: (config.port && parseInt(config.port) === 465) ? true : !!config.secure,
                tls: { rejectUnauthorized: false },
                auth: { user: config.username, pass: config.password }
              });
              await transporter.sendMail({
                from: `"${email.sender_name || config.fromName}" <${email.sender}>`,
                to: email.recipient,
                cc: email.cc || undefined,
                bcc: email.bcc || undefined,
                subject: email.subject,
                html: finalBody
              });
            } else if (config.type === 'resend' && config.apiKey) {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${config.apiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: `"${email.sender_name || config.fromName}" <${email.sender}>`,
                  to: email.recipient,
                  cc: email.cc ? email.cc.split(',').map((s: string) => s.trim()) : undefined,
                  bcc: email.bcc ? email.bcc.split(',').map((s: string) => s.trim()) : undefined,
                  subject: email.subject,
                  html: finalBody
                })
              });
            }
          }
          await pool.query(`UPDATE emails SET type = 'sent', date = $1 WHERE id = $2`, [new Date().toISOString(), email.id]);
          console.log(`Sent scheduled email ${email.id}`);
        } catch (err) {
          console.error(`Failed to send scheduled email ${email.id}`, err);
        }
      }
    } catch (e) {
      console.error('Failed to process scheduled emails:', e);
    }
  };

  // Run scheduled emails processor every 1 minute
  setInterval(processScheduledEmails, 60 * 1000);

  const processScheduledWhatsAppMessages = async () => {
    try {
      if (!pool) return;
      const now = new Date().toISOString();
      const result = await pool.query(
        `SELECT * FROM scheduled_whatsapp_messages
         WHERE status = 'pending' AND scheduled_at <= $1
         ORDER BY scheduled_at ASC
         LIMIT 50`,
        [now]
      );

      for (const message of result.rows) {
        try {
          const metadata = typeof message.metadata === 'string' ? JSON.parse(message.metadata || '{}') : (message.metadata || {});
          const media = typeof message.media === 'string' ? JSON.parse(message.media || 'null') : message.media;
          const data = await sendWhatsAppViaHub(message.user_id, {
            to: message.to_phone,
            body: message.body || '',
            media,
            clientId: message.hub_client_id || undefined,
            metadata: { ...metadata, scheduledWhatsAppId: message.id }
          });
          await pool.query(
            `UPDATE scheduled_whatsapp_messages
             SET status = 'sent', sent_at = $1, attempts = attempts + 1, last_error = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [new Date().toISOString(), message.id]
          );
          if (message.crm_client_id) {
            await pool.query(
              `INSERT INTO logs (id, client_id, date, content, type, metadata) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                `l${Date.now()}${Math.floor(Math.random() * 1000)}`,
                message.crm_client_id,
                new Date().toISOString(),
                'Scheduled WhatsApp message sent.',
                'whatsapp',
                JSON.stringify(data)
              ]
            );
          }
        } catch (err: any) {
          await pool.query(
            `UPDATE scheduled_whatsapp_messages
             SET attempts = attempts + 1, last_error = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [err.message || 'WhatsApp send attempt failed', message.id]
          );
        }
      }
    } catch (e) {
      console.error('Failed to process scheduled WhatsApp messages:', e);
    }
  };

  setInterval(processScheduledWhatsAppMessages, 60 * 1000);
  
  // Deals API Endpoints
  app.get('/api/deals', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM deals WHERE user_id = $1 AND pending_delete = FALSE ORDER BY updated_at DESC', [req.user.uid]);
      res.json(result.rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        name: row.name,
        value: row.value,
        status: row.status,
        contactInfo: row.contact_info,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/api/deals', authenticateToken, async (req: any, res) => {
    try {
      const { id, clientId, name, value, status, contactInfo } = req.body;
      const result = await pool.query(
        `INSERT INTO deals (id, user_id, client_id, name, value, status, contact_info)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, req.user.uid, clientId || null, name, value || 0, status || 'Leads', contactInfo || {}]
      );
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.patch('/api/deals/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, name, value, contactInfo, clientId } = req.body;
      
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;
      
      if (status !== undefined) {
        updates.push(`status = $${idx++}`);
        values.push(status);
      }
      if (name !== undefined) {
        updates.push(`name = $${idx++}`);
        values.push(name);
      }
      if (value !== undefined) {
        updates.push(`value = $${idx++}`);
        values.push(value);
      }
      if (contactInfo !== undefined) {
        updates.push(`contact_info = $${idx++}`);
        values.push(contactInfo);
      }
      if (clientId !== undefined) {
        updates.push(`client_id = $${idx++}`);
        values.push(clientId);
      }
      
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      values.push(req.user.uid);
      
      if (updates.length > 1) { // updated_at is always there
        const dbClient = await pool.connect();
        try {
          await dbClient.query('BEGIN');
          const result = await dbClient.query(
            `UPDATE deals SET ${updates.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING client_id`,
            values
          );
          if (result.rowCount === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ error: 'Deal not found' });
          }
          if (status !== undefined && result.rows[0].client_id) {
            await dbClient.query(
              `UPDATE clients SET status = $1, is_dormant = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`,
              [status, result.rows[0].client_id, req.user.uid]
            );
          }
          await dbClient.query('COMMIT');
        } catch (e) {
          await dbClient.query('ROLLBACK');
          throw e;
        } finally {
          dbClient.release();
        }
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.delete('/api/deals/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.uid]);
      const role = userRes.rows[0].role;
      
      const dealRes = await pool.query('SELECT * FROM deals WHERE id = $1 AND user_id = $2', [id, req.user.uid]);
      if (dealRes.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
      const deal = dealRes.rows[0];

      if (role === 'superadmin') {
        await pool.query('DELETE FROM deals WHERE id = $1', [id]);
        return res.json({ success: true, permanent: true });
      }

      await pool.query(
        `INSERT INTO client_edit_requests (client_id, user_id, original_data, requested_data) VALUES ($1, $2, $3, $4)`,
        [deal.client_id, req.user.uid, JSON.stringify(deal), JSON.stringify({ action: 'delete_deal', deal_id: id, name: deal.name })]
      );
      
      await pool.query(`UPDATE deals SET pending_delete = TRUE WHERE id = $1`, [id]);
      
      res.json({ success: true, pendingApproval: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // Products API Endpoints
  app.get('/api/products', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC', [req.user.uid]);
      res.json(result.rows.map(row => ({
        id: row.id, sku: row.sku, name: row.name, description: row.description, imageUrl: row.image_url,
        bulkPrices: row.bulk_prices, comments: row.comments, createdAt: row.created_at, updatedAt: row.updated_at
      })));
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/api/products', authenticateToken, async (req: any, res) => {
    try {
      const { id, sku, name, description, imageUrl, bulkPrices, comments } = req.body;
      const result = await pool.query(
        `INSERT INTO products (id, user_id, sku, name, description, image_url, bulk_prices, comments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [id, req.user.uid, sku, name, description, imageUrl, JSON.stringify(bulkPrices || []), JSON.stringify(comments || [])]
      );
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.patch('/api/products/:id', authenticateToken, async (req: any, res) => {
    try {
      const { sku, name, description, imageUrl, bulkPrices, comments } = req.body;
      const updates = []; const values = []; let idx = 1;
      const mapping = { sku: 'sku', name: 'name', description: 'description', imageUrl: 'image_url', bulkPrices: 'bulk_prices', comments: 'comments' };
      for (const [k, v] of Object.entries({ sku, name, description, imageUrl, bulkPrices, comments })) {
        if (v !== undefined) {
          updates.push(`${mapping[k as keyof typeof mapping]} = $${idx++}`);
          values.push(k === 'bulkPrices' || k === 'comments' ? JSON.stringify(v) : v);
        }
      }
      if (updates.length > 0) {
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(req.params.id, req.user.uid);
        await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`, values);
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.delete('/api/products/:id', authenticateToken, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM products WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]);
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  // Quotes API Endpoints
  // Public route to view a quote
  app.get('/api/public/quotes/:id', async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT q.*, c.name as client_name, c.company as client_company, c.contact_methods as client_contact_methods,
               u.display_name as user_name, u.email as user_email
        FROM quotes q 
        LEFT JOIN clients c ON q.client_id = c.id
        LEFT JOIN users u ON q.user_id = u.id
        WHERE q.id = $1
      `, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
      
      const row = result.rows[0];
      res.json({
        id: row.id, quoteNumber: row.quote_number, clientId: row.client_id, paymentTerms: row.payment_terms,
        status: row.status, items: row.items, fees: row.fees, comments: row.comments, createdAt: row.created_at, updatedAt: row.updated_at,
        clientName: row.client_name, clientCompany: row.client_company, clientContactMethods: row.client_contact_methods,
        userName: row.user_name, userEmail: row.user_email
      });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.get('/api/quotes', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM quotes WHERE user_id = $1 ORDER BY created_at DESC', [req.user.uid]);
      res.json(result.rows.map(row => ({
        id: row.id, quoteNumber: row.quote_number, clientId: row.client_id, paymentTerms: row.payment_terms,
        paymentTermId: row.payment_term_id, advanceRatio: row.advance_ratio ? parseFloat(row.advance_ratio) : 0, balanceRatio: row.balance_ratio ? parseFloat(row.balance_ratio) : 0,
        status: row.status, items: row.items, fees: row.fees, comments: row.comments, createdAt: row.created_at, updatedAt: row.updated_at
      })));
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/api/quotes', authenticateToken, async (req: any, res) => {
    try {
      const { id, quoteNumber, clientId, paymentTerms, paymentTermId, advanceRatio, balanceRatio, status, items, fees, comments } = req.body;
      const result = await pool.query(
        `INSERT INTO quotes (id, user_id, client_id, quote_number, payment_terms, payment_term_id, advance_ratio, balance_ratio, status, items, fees, comments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [id, req.user.uid, clientId || null, quoteNumber, paymentTerms, paymentTermId || null, advanceRatio || 0, balanceRatio || 0, status, JSON.stringify(items || []), JSON.stringify(fees || []), JSON.stringify(comments || [])]
      );
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.patch('/api/quotes/:id', authenticateToken, async (req: any, res) => {
    try {
      const { quoteNumber, clientId, paymentTerms, paymentTermId, advanceRatio, balanceRatio, status, items, fees, comments } = req.body;
      const updates = []; const values = []; let idx = 1;
      const mapping = { quoteNumber: 'quote_number', clientId: 'client_id', paymentTerms: 'payment_terms', paymentTermId: 'payment_term_id', advanceRatio: 'advance_ratio', balanceRatio: 'balance_ratio', status: 'status', items: 'items', fees: 'fees', comments: 'comments' };
      for (const [k, v] of Object.entries({ quoteNumber, clientId, paymentTerms, paymentTermId, advanceRatio, balanceRatio, status, items, fees, comments })) {
        if (v !== undefined) {
          updates.push(`${mapping[k as keyof typeof mapping]} = $${idx++}`);
          values.push(k === 'items' || k === 'fees' || k === 'comments' ? JSON.stringify(v) : v);
        }
      }
      if (updates.length > 0) {
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(req.params.id, req.user.uid);
        await pool.query(`UPDATE quotes SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`, values);
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.delete('/api/quotes/:id', authenticateToken, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM quotes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]);
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.get('/api/payment-terms', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM payment_terms ORDER BY created_at ASC');
      res.json(result.rows.map(row => ({
        id: row.id, name: row.name, description: row.description,
        advanceRatio: parseFloat(row.advance_ratio), balanceRatio: parseFloat(row.balance_ratio)
      })));
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/api/payment-terms', authenticateToken, requireSuperadmin, async (req: any, res) => {
    try {
      const { id, name, description, advanceRatio, balanceRatio } = req.body;
      const result = await pool.query(
        `INSERT INTO payment_terms (id, name, description, advance_ratio, balance_ratio)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, name, description, advanceRatio || 0, balanceRatio || 0]
      );
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.patch('/api/payment-terms/:id', authenticateToken, requireSuperadmin, async (req: any, res) => {
    try {
      const { name, description, advanceRatio, balanceRatio } = req.body;
      const updates = []; const values = []; let idx = 1;
      const mapping = { name: 'name', description: 'description', advanceRatio: 'advance_ratio', balanceRatio: 'balance_ratio' };
      for (const [k, v] of Object.entries({ name, description, advanceRatio, balanceRatio })) {
        if (v !== undefined) {
          updates.push(`${mapping[k as keyof typeof mapping]} = $${idx++}`);
          values.push(v);
        }
      }
      if (updates.length > 0) {
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(req.params.id);
        await pool.query(`UPDATE payment_terms SET ${updates.join(', ')} WHERE id = $${idx}`, values);
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.delete('/api/payment-terms/:id', authenticateToken, requireSuperadmin, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM payment_terms WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });
  
  // Generates next quote number based on YYMMDD
  app.get('/api/quotes-next-number', authenticateToken, async (req: any, res) => {
    try {
      const d = new Date();
      const prefix = `QT${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const result = await pool.query(`SELECT count(id) FROM quotes WHERE quote_number LIKE $1`, [prefix + '%']);
      const count = parseInt(result.rows[0].count) + 1;
      res.json({ nextNumber: `${prefix}${String(count).padStart(2, '0')}` });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  // Documents (SO, PI, CI) API Endpoints
  app.get('/api/documents', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC', [req.user.uid]);
      res.json(result.rows.map(row => ({
        id: row.id, quoteId: row.quote_id, type: row.type, documentNumber: row.document_number,
        content: row.content, comments: row.comments, createdAt: row.created_at, updatedAt: row.updated_at
      })));
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/api/documents', authenticateToken, async (req: any, res) => {
    try {
      const { id, quoteId, type, documentNumber, content, comments } = req.body;
      const result = await pool.query(
        `INSERT INTO documents (id, user_id, quote_id, type, document_number, content, comments)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, req.user.uid, quoteId, type, documentNumber, JSON.stringify(content || {}), JSON.stringify(comments || [])]
      );
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.patch('/api/documents/:id', authenticateToken, async (req: any, res) => {
    try {
      const { type, documentNumber, content, comments } = req.body;
      const updates = []; const values = []; let idx = 1;
      const mapping = { type: 'type', documentNumber: 'document_number', content: 'content', comments: 'comments' };
      for (const [k, v] of Object.entries({ type, documentNumber, content, comments })) {
        if (v !== undefined) {
          updates.push(`${mapping[k as keyof typeof mapping]} = $${idx++}`);
          values.push(k === 'content' || k === 'comments' ? JSON.stringify(v) : v);
        }
      }
      if (updates.length > 0) {
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(req.params.id, req.user.uid);
        await pool.query(`UPDATE documents SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`, values);
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.delete('/api/documents/:id', authenticateToken, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM documents WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]);
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  // Media Library APIs
  app.get('/api/media', authenticateToken, async (req: any, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM media_library WHERE user_id = $1 ORDER BY created_at DESC', [req.user.uid]);
      res.json(rows);
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/api/media', authenticateToken, async (req: any, res) => {
    try {
      const { id, name, type, size, url } = req.body;
      await pool.query(
        'INSERT INTO media_library (id, user_id, name, type, size, url) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, req.user.uid, name, type, size, url]
      );
      res.json({ success: true, pointsAdded: 0 });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.delete('/api/media/:id', authenticateToken, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM media_library WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]);
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/api/outscraper/search', authenticateToken, async (req: any, res) => {
    try {
      const { query, limit, apiKey } = req.body;
      if (!apiKey) return res.status(400).json({ error: 'Outscraper API Key required' });
      const url = `https://api.outscraper.com/maps/search-v2?query=${encodeURIComponent(query)}&limit=${limit || 10}&async=false`;
      const outscraperRes = await fetch(url, {
        headers: { 'X-API-KEY': apiKey }
      });
      if (!outscraperRes.ok) {
        return res.status(outscraperRes.status).json({ error: 'Outscraper API error' });
      }
      const data = await outscraperRes.json();
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to search outscraper' });
    }
  });

  app.post('/api/outscraper/translate', authenticateToken, async (req: any, res) => {
    try {
      const { query, llmConfig } = req.body;
      const prompt = `Translate or refine the following search query for Google Maps to the local language of the target location. 
If the query mentions a location, translate the query to the primary language of that location. If it doesn't mention a location, just return the query as is.
Return ONLY the translated/refined query string, nothing else. No markdown, no quotes.

Query: "${query}"`;
      const text = await callAI(prompt, llmConfig, false);
      res.json({ result: text.trim() });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to translate query' });
    }
  });

  const normalizeLeadRows = (rows: any[], fallbackCountry = '', fallbackTag = '') => {
    return rows.filter(Boolean).map((row: any) => {
      const name = row.name || row.title || row.company || row.companyName || row.organization_name || row.business_name;
      const emails = row.emails || row.email || row.email_address || row.emailAddresses;
      const phones = row.phones || row.phone || row.phone_number || row.phoneNumbers;
      const contactMethods: any[] = [];
      const emailList = Array.isArray(emails) ? emails : (emails ? String(emails).split(',') : []);
      const phoneList = Array.isArray(phones) ? phones : (phones ? String(phones).split(',') : []);
      if (emailList[0]) contactMethods.push({ type: 'email', value: String(emailList[0]).trim() });
      if (phoneList[0]) contactMethods.push({ type: 'phone', value: String(phoneList[0]).trim() });
      return {
        name,
        company: row.company || row.companyName || row.organization_name || row.business_name || name,
        address: row.full_address || row.address || row.formatted_address || '',
        city: row.city || '',
        state: row.state || row.region || '',
        country: row.country || fallbackCountry || 'Unknown',
        tags: [row.type || row.category || row.industry || fallbackTag].filter(Boolean),
        contactMethods: contactMethods.length > 0 ? contactMethods : undefined
      };
    }).filter((lead: any) => lead.name);
  };

  const pickLeadRows = (provider: string, data: any) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.leads)) return data.leads;
    if (Array.isArray(data?.data?.[0])) return data.data[0];
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.items)) return data.items;
    if (provider === 'apify' && Array.isArray(data?.defaultDatasetItems)) return data.defaultDatasetItems;
    return [];
  };

  app.post('/api/lead-data/search', authenticateToken, async (req: any, res) => {
    try {
      const { provider = 'outscraper', query, keywords, industry, country, limit, config = {} } = req.body;
      if (!config.apiKey) return res.status(400).json({ error: 'Data channel API key required' });

      if (provider === 'outscraper') {
        const url = `https://api.outscraper.com/maps/search-v2?query=${encodeURIComponent(query)}&limit=${limit || 10}&async=false`;
        const outRes = await fetch(url, { headers: { 'X-API-KEY': config.apiKey } });
        if (!outRes.ok) return res.status(outRes.status).json({ error: 'Outscraper API error' });
        const data = await outRes.json();
        return res.json({ provider, leads: normalizeLeadRows(pickLeadRows(provider, data), country, industry), raw: data });
      }

      if (provider === 'apify' && config.actorId) {
        const actorId = String(config.actorId).replace('/', '~');
        const runRes = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(config.apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, keywords, industry, country, limit })
        });
        if (!runRes.ok) return res.status(runRes.status).json({ error: 'Apify actor failed' });
        const data = await runRes.json();
        return res.json({ provider, leads: normalizeLeadRows(pickLeadRows(provider, data), country, industry), raw: data });
      }

      if (provider === 'phantombuster' && config.agentId) {
        const launchRes = await fetch('https://api.phantombuster.com/api/v2/agents/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Phantombuster-Key': config.apiKey },
          body: JSON.stringify({ id: config.agentId, argument: { query, keywords, industry, country, limit } })
        });
        if (!launchRes.ok) return res.status(launchRes.status).json({ error: 'PhantomBuster agent failed to launch' });
        const data = await launchRes.json();
        return res.json({ provider, leads: normalizeLeadRows(pickLeadRows(provider, data), country, industry), raw: data });
      }

      if (!config.searchEndpoint) {
        return res.status(400).json({ error: 'Search endpoint or provider workflow ID required' });
      }

      const genericRes = await fetch(config.searchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify({ query, keywords, industry, country, limit })
      });
      if (!genericRes.ok) return res.status(genericRes.status).json({ error: `${provider} search failed` });
      const data = await genericRes.json();
      res.json({ provider, leads: normalizeLeadRows(pickLeadRows(provider, data), country, industry), raw: data });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to search lead data channel' });
    }
  });

  app.post('/api/lead-data/enrich', authenticateToken, async (req: any, res) => {
    try {
      const { provider, leads, config = {} } = req.body;
      if (!Array.isArray(leads)) return res.status(400).json({ error: 'Invalid leads' });
      if (!config.enrichEndpoint) return res.json({ provider, leads });

      const enrichRes = await fetch(config.enrichEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey || ''}`,
          'X-API-Key': config.apiKey || ''
        },
        body: JSON.stringify({ leads })
      });
      if (!enrichRes.ok) return res.status(enrichRes.status).json({ error: `${provider} enrichment failed` });
      const data = await enrichRes.json();
      const enrichedRows = Array.isArray(data?.leads) ? data.leads : Array.isArray(data?.data) ? data.data : leads;
      res.json({ provider, leads: enrichedRows });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to enrich leads' });
    }
  });

  // Clients API Endpoints
  app.get('/api/clients', authenticateToken, async (req: any, res) => {
    try {
      await releaseIdleLeads(); // Run on fetch to ensure up-to-date state
      const result = await pool.query('SELECT * FROM clients WHERE user_id = $1 ORDER BY updated_at DESC', [req.user.uid]);
      res.json(result.rows.map(row => ({
        id: row.id,
        name: row.name,
        company: row.company,
        address: row.address,
        country: row.country,
        status: row.status,
        tags: row.tags,
        lastContact: row.last_contact,
        isDormant: row.is_dormant,
        contactMethods: row.contact_methods,
        comments: row.comments,
        pendingEditRequest: row.pending_edit_request,
        deletedBy: row.deleted_by,
        agentEnabled: row.agent_enabled,
        agentMode: row.agent_mode,
        agentContext: row.agent_context,
        agentSummary: row.agent_summary,
        agentNextStep: row.agent_next_step,
        leadScore: row.lead_score,
        leadSummary: row.lead_summary,
        leadNextStep: row.lead_next_step,
        leadScoringSignature: row.lead_scoring_signature,
        leadScoringAnalyzedAt: row.lead_scoring_analyzed_at,
        agentWorkflowId: row.agent_workflow_id,
        preferredLanguage: row.preferred_language,
        preferredTimeRange: row.preferred_time_range
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  app.get('/api/public-leads', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM clients WHERE user_id IS NULL ORDER BY created_at DESC');
      res.json(result.rows.map(row => ({
        id: row.id,
        name: row.name,
        company: row.company,
        address: row.address,
        country: row.country,
        status: row.status,
        tags: row.tags,
        lastContact: row.last_contact,
        isDormant: row.is_dormant,
        contactMethods: row.contact_methods,
        comments: row.comments,
        pendingEditRequest: row.pending_edit_request,
        deletedBy: row.deleted_by,
        agentEnabled: row.agent_enabled,
        agentMode: row.agent_mode,
        agentContext: row.agent_context,
        agentSummary: row.agent_summary,
        agentNextStep: row.agent_next_step,
        leadScore: row.lead_score,
        leadSummary: row.lead_summary,
        leadNextStep: row.lead_next_step,
        leadScoringSignature: row.lead_scoring_signature,
        leadScoringAnalyzedAt: row.lead_scoring_analyzed_at,
        agentWorkflowId: row.agent_workflow_id,
        preferredLanguage: row.preferred_language,
        preferredTimeRange: row.preferred_time_range
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch public leads' });
    }
  });

  app.post('/api/public-leads/:id/claim', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const CLAIM_COST = 10;
      const userRes = await pool.query('SELECT points FROM users WHERE id = $1', [req.user.uid]);
      if (userRes.rows.length === 0 || userRes.rows[0].points < CLAIM_COST) {
        return res.status(400).json({ error: 'Not enough points to claim a public lead (cost: 10 points)' });
      }

      const result = await pool.query(
        `UPDATE clients SET user_id = $1, status = 'Leads', updated_at = CURRENT_TIMESTAMP, last_contact = CURRENT_TIMESTAMP, deleted_by = NULL, is_dormant = FALSE WHERE id = $2 AND user_id IS NULL RETURNING id, name, company`,
        [req.user.uid, id]
      );
      if (result.rows.length === 0) {
        console.error("Claim failed: Lead already claimed or not found. id:", id);
        return res.status(400).json({ error: 'Lead already claimed or not found' });
      }
      
      await pool.query('UPDATE users SET points = points - $1 WHERE id = $2', [CLAIM_COST, req.user.uid]);
      
      const client = result.rows[0];
      const dealId = `d${Date.now()}${Math.floor(Math.random()*1000)}`;
      const dealName = client.company ? `${client.company} Lead` : `${client.name} Lead`;
      
      await pool.query(
        `INSERT INTO deals (id, user_id, client_id, name, value, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [dealId, req.user.uid, id, dealName, 0, 'Leads']
      );

      res.json({ success: true, id: client.id });
    } catch (e) {
      console.error("Claim error:", e);
      res.status(500).json({ error: 'Failed to claim lead' });
    }
  });

  app.post('/api/public-leads/import', authenticateToken, async (req: any, res) => {
    try {
      const { leads } = req.body;
      if (!Array.isArray(leads)) return res.status(400).json({ error: 'invalid data' });

      let addedCount = 0;
      for (const lead of leads) {
        const incomingMethods = (lead.contactMethods || []).filter((cm: any) => cm.value).map((cm: any) => cm.value);
        if (incomingMethods.length > 0) {
          const checkQuery = `
            SELECT id FROM clients 
            WHERE EXISTS (
              SELECT 1 FROM jsonb_array_elements(contact_methods) as cm 
              WHERE cm->>'value' = ANY($1::text[])
            ) LIMIT 1
          `;
          const checkRes = await pool.query(checkQuery, [incomingMethods]);
          if (checkRes.rows.length > 0) {
            continue; // Skip duplicates
          }
        }
        
        const id = `c${Date.now()}${Math.floor(Math.random()*1000)}`;
        await pool.query(
          `INSERT INTO clients (id, user_id, name, company, address, state, city, country, status, tags, last_contact, is_dormant, contact_methods, comments)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [id, null, lead.name, lead.company || '', lead.address || '', lead.state || '', lead.city || '', lead.country || '', 'Leads', JSON.stringify(lead.tags || []), null, false, JSON.stringify(lead.contactMethods || []), JSON.stringify([])]
        );
        addedCount++;
      }
      
      if (addedCount > 0) {
        await pool.query(`UPDATE users SET points = points + $1 WHERE id = $2`, [addedCount * 5, req.user.uid]);
      }
      
      res.json({ success: true, count: addedCount, pointsAdded: addedCount * 5 });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to import leads' });
    }
  });

  app.post('/api/clients', authenticateToken, async (req: any, res) => {
    try {
      const { id, name, company, country, status, tags, lastContact, isDormant, contactMethods, comments } = req.body;
      
      const incomingMethods = (contactMethods || []).filter((cm: any) => cm.value).map((cm: any) => cm.value);
      if (incomingMethods.length > 0) {
        const checkQuery = `
          SELECT id FROM clients 
          WHERE EXISTS (
            SELECT 1 FROM jsonb_array_elements(contact_methods) as cm 
            WHERE cm->>'value' = ANY($1::text[])
          ) AND user_id = $2 LIMIT 1
        `;
        const checkRes = await pool.query(checkQuery, [incomingMethods, req.user.uid]);
        if (checkRes.rows.length > 0) {
          return res.status(409).json({ error: 'Duplicate contact method found', skipped: true, existingId: checkRes.rows[0].id });
        }
      }

      await pool.query(
        `INSERT INTO clients (id, user_id, name, company, address, state, city, country, status, tags, last_contact, is_dormant, contact_methods, comments, preferred_language, preferred_time_range, agent_workflow_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [id, req.body.isPublic ? null : req.user.uid, name, company, req.body.address || null, req.body.state || null, req.body.city || null, country, status, JSON.stringify(tags || []), lastContact || null, !!isDormant, JSON.stringify(contactMethods || []), JSON.stringify(comments || []), req.body.preferredLanguage || null, req.body.preferredTimeRange || null, req.body.agentWorkflowId || null]
      );

      await pool.query(`UPDATE users SET points = points + 5 WHERE id = $1`, [req.user.uid]);

      res.json({ success: true, pointsAdded: 5 });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to insert client' });
    }
  });

  app.patch('/api/clients/:id', authenticateToken, async (req: any, res) => {
    try {
      const id = req.params.id;
      const updates = req.body;
      
      const setClauses = [];
      const values = [id, req.user.uid];
      let valIdx = 3;
      
      const mapping: Record<string, string> = {
        name: 'name', company: 'company', address: 'address', state: 'state', city: 'city', country: 'country', status: 'status',
        tags: 'tags', lastContact: 'last_contact', isDormant: 'is_dormant',
        contactMethods: 'contact_methods', comments: 'comments',
        agentEnabled: 'agent_enabled', agentMode: 'agent_mode',
        agentContext: 'agent_context', agentSummary: 'agent_summary',
        agentNextStep: 'agent_next_step',
        leadScore: 'lead_score', leadSummary: 'lead_summary', leadNextStep: 'lead_next_step',
        leadScoringSignature: 'lead_scoring_signature', leadScoringAnalyzedAt: 'lead_scoring_analyzed_at',
        agentWorkflowId: 'agent_workflow_id', preferredLanguage: 'preferred_language',
        preferredTimeRange: 'preferred_time_range'
      };
      
      let pointsToAward = 0;
      const existingClientRes = await pool.query(`SELECT * FROM clients WHERE id = $1`, [id]);
      if (existingClientRes.rows.length > 0) {
        const ec = existingClientRes.rows[0];
        if (updates.company && !ec.company) pointsToAward += 2;
        if (updates.address && !ec.address) pointsToAward += 2;
        if (updates.country && !ec.country) pointsToAward += 2;
        if (updates.contactMethods && updates.contactMethods.length > 0) {
            const extLen = Array.isArray(ec.contact_methods) ? ec.contact_methods.length : JSON.parse(ec.contact_methods || '[]').length;
            if (updates.contactMethods.length > extLen) {
                pointsToAward += (updates.contactMethods.length - extLen) * 3;
            }
        }
        if (updates.tags && updates.tags.length > 0) {
            const extLen = Array.isArray(ec.tags) ? ec.tags.length : JSON.parse(ec.tags || '[]').length;
            if (updates.tags.length > extLen) {
                pointsToAward += (updates.tags.length - extLen) * 1;
            }
        }
      }

      for (const [key, val] of Object.entries(updates)) {
        if (mapping[key]) {
          setClauses.push(`${mapping[key]} = $${valIdx}`);
          values.push((key === 'tags' || key === 'comments' || key === 'contactMethods') ? JSON.stringify(val) : val);
          valIdx++;
        }
      }
      
      if (setClauses.length > 0) {
        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
        await pool.query(`UPDATE clients SET ${setClauses.join(', ')} WHERE id = $1 AND user_id = $2`, values);
        
        if (pointsToAward > 0) {
            await pool.query(`UPDATE users SET points = points + $1 WHERE id = $2`, [pointsToAward, req.user.uid]);
        }
      }
      res.json({ success: true, pointsAdded: pointsToAward });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  app.post('/api/clients/:id/run-agent', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { llmConfig, systemLanguage = 'English', outboundLanguage } = req.body;
      
      const clientRes = await pool.query('SELECT * FROM clients WHERE id = $1 AND user_id = $2', [id, req.user.uid]);
      if (clientRes.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
      const client = clientRes.rows[0];
      const resolvedOutboundLanguage = outboundLanguage || getOutboundLanguage(client.preferred_language, client.country);
      
      if (!client.agent_enabled) {
        return res.status(400).json({ error: 'Agent is not enabled for this client' });
      }

      // Fetch context
      const emailsRes = await pool.query(`SELECT * FROM emails WHERE (client_id = $1 OR recipient = $2) AND user_id = $3 ORDER BY date DESC LIMIT 5`, [id, client.email || '', req.user.uid]);
      const logsRes = await pool.query(`SELECT * FROM logs WHERE client_id = $1 ORDER BY date DESC LIMIT 5`, [id]);
      const productsRes = await pool.query(`SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [req.user.uid]); // Top 5 recent products for context
      const kbRes = await searchKnowledgeBase(req.user.uid, id, `Agent follow up strategy for client in ${client.country || client.company || 'foreign trade'}`, undefined, 5);
      
      const contextPrompt = `
You are an expert sales AI assistant tasked with following up with a specific client.

Client Information:
Name: ${client.name}
Company: ${client.company}
Country: ${client.country}
Preferred Language: ${client.preferred_language || 'Auto-detect or English'}
System Language for internal agent outputs: ${systemLanguage}
Outbound Content Language: ${resolvedOutboundLanguage}
Preferred Comm Time: ${client.preferred_time_range || 'Any'}
Agent Context / Instructions: ${client.agent_context || 'None'}
Long-term Summary: ${client.agent_summary || 'None'}
Lead Scoring Agent:
- Lead Score: ${client.lead_score ?? 'Not scored yet'}
- Lead Summary: ${client.lead_summary || 'None'}
- Best Next Step: ${client.lead_next_step || 'None'}
- Coordination Rule: Do not repeat lead scoring or rewrite the lead summary unless new evidence materially changes it. Use the score, summary, and next step above to choose follow-up timing and content.

Knowledge Base context:
${kbRes.rows.map((kb: any) => `[${kb.title}]\n${kb.content}`).join('\n\n')}

Recent Logs:
${JSON.stringify(logsRes.rows)}

Recent Emails:
${JSON.stringify(emailsRes.rows)}

Available Products (for context, do not push aggressively if not relevant):
${JSON.stringify(productsRes.rows)}
`;

      const prompt = `${contextPrompt}
Based on the above context, you must decide on the next best action to advance this lead. 
Language rules:
- newSummary and suggestedNextStep are internal CRM agent outputs and MUST be written in ${systemLanguage}.
- draftEmail is outbound customer-facing content and MUST be written in ${resolvedOutboundLanguage}. If the client has no preferred language, use the official language of the customer's country; if country is missing, use English.
Your output MUST be a JSON object with the following schema:
{
  "newSummary": "An updated long-term summary incorporating the new history. Max 3 sentences.",
  "suggestedNextStep": "A short sentence describing what should be done next to follow up. (e.g. 'Follow up on the pricing proposal from last week.')",
  "draftEmail": "If an email should be sent, provide the body of a drafted email here. Otherwise, leave empty."
}
No markdown wrappers, just valid JSON.`;

      const aiResponse = await callAI(prompt, llmConfig, true);
      const parsed = JSON.parse(aiResponse || '{}');
      
      const newSummary = parsed.newSummary || client.agent_summary;
      const nextStep = parsed.suggestedNextStep || 'Needs follow up.';
      const draftEmail = parsed.draftEmail || '';
      
      // Update the client
      await pool.query(
        'UPDATE clients SET agent_summary = $1, agent_next_step = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [newSummary, nextStep, id]
      );
      
      // If Auto Email mode is on and we have a draft, we might send it. 
      // But for simplicity/safety, let's just log it or draft it, or if auto_email, simulate a send.
      if (client.agent_mode === 'auto_email' && draftEmail) {
        // Automatically create an email draft or log it as sent
        const emailId = `e${Date.now()}`;
        await pool.query(
          `INSERT INTO emails (id, user_id, client_id, sender, recipient, subject, body, date, read, direction, type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, 'outbound', 'Auto Follow-up')`,
          [emailId, req.user.uid, id, 'AutoAgent', client.email || 'unknown@example.com', 'Follow Up', draftEmail, new Date().toISOString()]
        );
        // Also add a log
        await pool.query(
          `INSERT INTO logs (id, client_id, date, content) VALUES ($1, $2, $3, $4)`,
          [`l${Date.now()}`, id, new Date().toISOString(), 'Auto-Agent sent follow up email.']
        );
      }

      res.json({ success: true, summary: newSummary, nextStep, draftEmail });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to run agent' });
    }
  });

  app.post('/api/clients/:id/edit-requests', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const requestedData = req.body;
      
      const clientRes = await pool.query('SELECT * FROM clients WHERE id = $1 AND user_id = $2', [id, req.user.uid]);
      if (clientRes.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
      const client = clientRes.rows[0];

      await pool.query(
        `INSERT INTO client_edit_requests (client_id, user_id, original_data, requested_data) VALUES ($1, $2, $3, $4)`,
        [id, req.user.uid, JSON.stringify(client), JSON.stringify(requestedData)]
      );

      await pool.query(`UPDATE clients SET pending_edit_request = TRUE WHERE id = $1`, [id]);
      
      // Award points for enrichment via edit request
      await pool.query(`UPDATE users SET points = points + 5 WHERE id = $1`, [req.user.uid]);

      res.json({ success: true, pointsAdded: 5 });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create edit request' });
    }
  });

  app.delete('/api/clients/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.uid]);
      const role = userRes.rows[0].role;

      if (role === 'superadmin') {
        await pool.query('DELETE FROM clients WHERE id = $1', [id]);
        return res.json({ success: true, permanent: true });
      }

      const result = await pool.query(
        `UPDATE clients SET user_id = NULL, deleted_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $1 RETURNING id`,
        [req.user.uid, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not found or permission denied' });
      }
      
      // Delete associated deals
      await pool.query('DELETE FROM deals WHERE client_id = $1', [id]);
      
      res.json({ success: true, softDeleted: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  app.post('/api/clients/:id/restore', authenticateToken, requireSuperadmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await pool.query(`UPDATE clients SET deleted_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to restore client' });
    }
  });

  // Public Settings
  app.get('/api/settings/public', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM global_settings WHERE key LIKE \'exp_%\' OR key IN (\'agent_polling_interval_seconds\', \'agent_polling_interval_hours\')');
      const settings = result.rows.reduce((acc, row) => ({ ...acc, [row.key]: typeof row.value === 'string' ? JSON.parse(row.value) : row.value }), {});
      res.json(settings);
    } catch (e) {
      console.error('Failed to fetch public settings', e);
      res.status(500).json({ error: 'Failed to fetch public settings' });
    }
  });

  // Superadmin Global Settings
  app.get('/api/admin/settings', authenticateToken, requireSuperadmin, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM global_settings');
      const settings = result.rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
      res.json(settings);
    } catch (e) {
      console.error('Failed to fetch settings', e);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.patch('/api/admin/settings', authenticateToken, requireSuperadmin, async (req: any, res) => {
    try {
      const dbClient = await pool.connect();
      try {
        await dbClient.query('BEGIN');
        for (const [key, value] of Object.entries(req.body)) {
          if (value === undefined) continue;
          await dbClient.query(
            `INSERT INTO global_settings (key, value) VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
            [key, JSON.stringify(value)]
          );
        }
        await dbClient.query('COMMIT');
        res.json({ success: true });
      } catch (e) {
        await dbClient.query('ROLLBACK');
        throw e;
      } finally {
        dbClient.release();
      }
    } catch (e) {
      console.error('Failed to update settings', e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Admin APIs for Edit Requests
  app.get('/api/admin/client-edit-requests', authenticateToken, requireSuperadmin, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT r.*, c.name as current_client_name, u.display_name as requester_name
        FROM client_edit_requests r
        LEFT JOIN clients c ON r.client_id = c.id
        JOIN users u ON r.user_id = u.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at DESC
      `);
      res.json(result.rows);
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch edit requests' });
    }
  });

  app.post('/api/admin/client-edit-requests/:requestId/approve', authenticateToken, requireSuperadmin, async (req: any, res) => {
     try {
       const { requestId } = req.params;
       const reqRes = await pool.query(`SELECT * FROM client_edit_requests WHERE id = $1`, [requestId]);
       if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
       const editReq = reqRes.rows[0];

       if (editReq.status !== 'pending') return res.status(400).json({ error: 'Not pending' });

       await pool.query(`UPDATE client_edit_requests SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [requestId]);

       const updates = typeof editReq.requested_data === 'string' ? JSON.parse(editReq.requested_data) : editReq.requested_data;
       
       if (updates.action === 'delete_email') {
         await pool.query(`INSERT INTO deleted_emails (id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [updates.email_id, editReq.user_id]);
         await pool.query(`DELETE FROM emails WHERE id = $1`, [updates.email_id]);
         res.json({ success: true });
         return;
       }

       if (updates.action === 'delete_deal') {
         await pool.query(`DELETE FROM deals WHERE id = $1`, [updates.deal_id]);
         res.json({ success: true });
         return;
       }

       const mapping: Record<string, string> = {
         name: 'name', company: 'company', country: 'country', status: 'status',
         address: 'address', state: 'state', city: 'city',
         tags: 'tags', lastContact: 'last_contact', isDormant: 'is_dormant',
         contactMethods: 'contact_methods', comments: 'comments'
       };
       
       const setClauses = [];
       const values = [editReq.client_id];
       let valIdx = 2;
       
       for (const [key, val] of Object.entries(updates)) {
         if (mapping[key]) {
           setClauses.push(`${mapping[key]} = $${valIdx}`);
           values.push((key === 'tags' || key === 'comments' || key === 'contactMethods') ? JSON.stringify(val) : val as any);
           valIdx++;
         }
       }
       
       if (setClauses.length > 0) {
         setClauses.push(`pending_edit_request = FALSE`);
         setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
         await pool.query(`UPDATE clients SET ${setClauses.join(', ')} WHERE id = $1`, values);
       }

       res.json({ success: true });
     } catch(e) {
       console.error(e);
       res.status(500).json({ error: 'Failed' });
     }
  });

  app.post('/api/admin/client-edit-requests/:requestId/reject', authenticateToken, requireSuperadmin, async (req: any, res) => {
     try {
       const { requestId } = req.params;
       const reqRes = await pool.query(`SELECT client_id, requested_data FROM client_edit_requests WHERE id = $1`, [requestId]);
       if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
       
       await pool.query(`UPDATE client_edit_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [requestId]);
       
       const editReq = reqRes.rows[0];
       const updates = typeof editReq.requested_data === 'string' ? JSON.parse(editReq.requested_data) : editReq.requested_data;

       if (updates.action === 'delete_email') {
         await pool.query(`UPDATE emails SET pending_delete = FALSE WHERE id = $1`, [updates.email_id]);
       } else if (updates.action === 'delete_deal') {
         await pool.query(`UPDATE deals SET pending_delete = FALSE WHERE id = $1`, [updates.deal_id]);
       } else {
         await pool.query(`UPDATE clients SET pending_edit_request = FALSE WHERE id = $1`, [editReq.client_id]);
       }
       
       res.json({ success: true });
     } catch(e) {
       console.error(e);
       res.status(500).json({ error: 'Failed' });
     }
  });

  // Knowledge Base APIs
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  async function generateEmbedding(text: string, llmConfig?: any): Promise<number[] | null> {
    try {
      if (llmConfig && (llmConfig.provider === 'openai' || llmConfig.provider === 'openrouter' || llmConfig.provider === 'custom_openai')) {
         const openai = new OpenAI({
           apiKey: llmConfig.apiKey,
           baseURL: llmConfig.provider === 'openrouter'
             ? (llmConfig.baseURL || 'https://openrouter.ai/api/v1')
             : llmConfig.provider === 'custom_openai'
               ? llmConfig.baseURL || llmConfig.endpoint
               : undefined,
         });
         
         const modelName = llmConfig.embeddingModel || 'text-embedding-3-small';
         
         const args: any = {
           model: modelName,
           input: text.substring(0, 8000),
         };
         
         if (modelName.includes('text-embedding-3')) {
           args.dimensions = 768;
         }
         
         const response = await openai.embeddings.create(args);
         return response.data?.[0]?.embedding || null;
      }
      
      const api_key = (llmConfig && llmConfig.provider === 'gemini' && llmConfig.apiKey) ? llmConfig.apiKey : process.env.GEMINI_API_KEY;
      if (!api_key) return null;
      
      const ai = new GoogleGenAI({ apiKey: api_key });
      const response = await ai.models.embedContent({
        model: llmConfig?.embeddingModel || 'text-embedding-004',
        contents: text.substring(0, 9000), // Ensure we don't exceed limits
      });
      return response.embeddings?.[0]?.values || null;
    } catch (e) {
      console.error('Failed to generate embedding:', e);
      return null;
    }
  }

  function formatVector(values: number[]) {
    return `[${values.join(',')}]`;
  }

  async function searchKnowledgeBase(userId: string, clientId: string | null, queryText: string, llmConfig?: any, limit: number = 5) {
    try {
      const queryEmbedding = await generateEmbedding(queryText, llmConfig);
      if (queryEmbedding) {
        const res = await pool.query(
          `SELECT title, content FROM knowledge_base 
           WHERE user_id = $1 AND (client_id IS NULL OR client_id = $2)
           ORDER BY embedding <=> $3 LIMIT $4`,
          [userId, clientId, formatVector(queryEmbedding), limit]
        );
        return res;
      }
    } catch(e) {
      console.error('Vector search failed', e);
    }
    // Fallback
    return await pool.query(
      `SELECT title, content FROM knowledge_base WHERE user_id = $1 AND (client_id IS NULL OR client_id = $2) LIMIT $3`,
      [userId, clientId, limit]
    );
  }

  // File upload route...
  app.post('/api/knowledge-base/upload', authenticateToken, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      let textContent = '';
      if (req.file.mimetype === 'application/pdf') {
        const data = await pdfParse(req.file.buffer);
        textContent = data.text;
      } else {
        textContent = req.file.buffer.toString('utf-8');
      }

      res.json({ success: true, text: textContent });
    } catch (e) {
      console.error('File parsing error:', e);
      res.status(500).json({ error: 'Failed to parse document' });
    }
  });

  app.get('/api/knowledge-base', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM knowledge_base WHERE user_id = $1 ORDER BY created_at DESC', [req.user.uid]);
      res.json(result.rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        title: row.title,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch knowledge base' });
    }
  });

  app.post('/api/knowledge-base', authenticateToken, async (req: any, res) => {
    try {
      const { id, clientId, title, content, llmConfig } = req.body;
      const embedding = await generateEmbedding(content, llmConfig);
      let query, params;
      
      if (embedding) {
        query = `INSERT INTO knowledge_base (id, user_id, client_id, title, content, embedding) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        params = [id, req.user.uid, clientId || null, title, content, formatVector(embedding)];
      } else {
        query = `INSERT INTO knowledge_base (id, user_id, client_id, title, content) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        params = [id, req.user.uid, clientId || null, title, content];
      }
      
      const result = await pool.query(query, params);
      
      res.json({ success: true, data: result.rows[0] });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to add knowledge base' });
    }
  });

  app.patch('/api/knowledge-base/:id', authenticateToken, async (req: any, res) => {
    try {
      const { title, content, llmConfig } = req.body;
      const embedding = await generateEmbedding(content, llmConfig);
      
      let query, params;
      if (embedding) {
        query = `UPDATE knowledge_base SET title = $1, content = $2, embedding = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5`;
        params = [title, content, formatVector(embedding), req.params.id, req.user.uid];
      } else {
        query = `UPDATE knowledge_base SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4`;
        params = [title, content, req.params.id, req.user.uid];
      }
      
      await pool.query(query, params);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update knowledge base' });
    }
  });

  app.delete('/api/knowledge-base/:id', authenticateToken, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM knowledge_base WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to delete knowledge base' });
    }
  });

  // Logs API
  app.get('/api/logs', authenticateToken, async (req: any, res) => {
    try {
      // Get all logs for clients owned by this user
      const result = await pool.query(`
        SELECT l.* FROM logs l
        JOIN clients c ON l.client_id = c.id
        WHERE c.user_id = $1
        ORDER BY l.date DESC
      `, [req.user.uid]);
      
      res.json(result.rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        date: row.date,
        content: row.content,
        relatedEmailId: row.related_email_id,
        type: row.type || 'general',
        metadata: row.metadata
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  app.post('/api/logs', authenticateToken, async (req: any, res) => {
    try {
      const { id, clientId, date, content, relatedEmailId, type, metadata } = req.body;
      
      const clientCheck = await pool.query('SELECT id FROM clients WHERE id = $1 AND user_id = $2', [clientId, req.user.uid]);
      if (clientCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await pool.query(
        `INSERT INTO logs (id, client_id, date, content, related_email_id, type, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, clientId, date || new Date().toISOString(), content, relatedEmailId || null, type || 'general', metadata ? JSON.stringify(metadata) : null]
      );
      await pool.query(`UPDATE clients SET last_contact = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`, [clientId, req.user.uid]);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to add log' });
    }
  });

  // Test Inbox Connection
  app.post('/api/test-inbox', authenticateToken, async (req: any, res) => {
    try {
      const { type, host, port, secure, username, password } = req.body;
      
      if (type === 'pop3') {
        const client = new Pop3Command({
          host,
          port: port ? parseInt(port) : (secure ? 995 : 110),
          tls: (port && parseInt(port) === 995) ? true : !!secure,
          tlsOptions: { rejectUnauthorized: false },
          user: username,
          password
        });
        await client.QUIT(); // QUIT method of Pop3Command tests connection and auth implicitly and properly closes it.
        return res.json({ success: true });
      }

      const client = new ImapFlow({
        host,
        port: port ? parseInt(port) : (secure ? 993 : 143),
        secure: (port && parseInt(port) === 993) ? true : !!secure,
        tls: {
          rejectUnauthorized: false
        },
        auth: {
          user: username,
          pass: password
        },
        logger: false
      });

      await client.connect();
      await client.logout();
      res.json({ success: true });
    } catch (e: any) {
      console.error('IMAP Test Failed:', e);
      res.status(400).json({ error: e.message || 'Failed to connect to IMAP server' });
    }
  });

  // Test Outbox Connection
  app.post('/api/test-outbox', authenticateToken, async (req: any, res) => {
    try {
      const { host, port, secure, username, password } = req.body;
      let transporter = nodemailer.createTransport({
        host,
        port: port ? parseInt(port) : (secure ? 465 : 587),
        secure: (port && parseInt(port) === 465) ? true : !!secure,
        tls: {
          rejectUnauthorized: false
        },
        auth: {
          user: username,
          pass: password
        }
      });
      await transporter.verify();
      res.json({ success: true });
    } catch (e: any) {
      console.error('SMTP Test Failed:', e);
      res.status(400).json({ error: e.message || 'Failed to connect to SMTP server' });
    }
  });

  app.post('/api/sync-emails', authenticateToken, async (req: any, res) => {
    try {
      const { type, host, port, secure, username, password } = req.body;
      const { simpleParser } = customRequire('mailparser');
      const syncedEmails = [];

      if (type === 'pop3') {
        const client = new Pop3Command({
          host,
          port: port ? parseInt(port) : (secure ? 995 : 110),
          tls: (port && parseInt(port) === 995) ? true : !!secure,
          tlsOptions: { rejectUnauthorized: false },
          user: username,
          password
        });
        
        try {
          const list = await client.UIDL();
          // list is array of [msgNumber, uid] strings. Some servers return string, some return array of strings.
          // pop3Command.UIDL() returns an array of strings e.g., ["1 UID1", "2 UID2"]
          // or `list` could be array of arrays. Let's just safely map.
          let messages = [];
          if (Array.isArray(list)) {
            messages = list.map(item => {
              if (Array.isArray(item)) return { num: item[0], uid: item[1] };
              const parts = item.split(' ');
              return { num: parts[0], uid: parts[1] };
            });
          }
          
          // Fetch last 10 messages
          const recentMessages = messages.slice(-10);
          for (const msg of recentMessages) {
            const raw = await client.RETR(msg.num);
            const parsed = await simpleParser(raw);
            
            const fromEmail = parsed.from?.value?.[0]?.address || '';
            const clientRes = await pool.query(`
              SELECT id FROM clients 
              WHERE user_id = $1 
                AND EXISTS (
                  SELECT 1 FROM jsonb_array_elements(contact_methods) elem 
                  WHERE elem->>'type' = 'email' AND elem->>'value' = $2
                ) 
              LIMIT 1
            `, [req.user.uid, fromEmail]);
            const clientId = clientRes.rows.length > 0 ? clientRes.rows[0].id : null;

            let messageIdStr = parsed.messageId || `msg_${username}_${msg.uid}`;
            messageIdStr = messageIdStr.substring(0, 128);
            
            let htmlContent = parsed.html || parsed.textAsHtml;
            let bodyStr = '';
            if (htmlContent) {
               bodyStr = htmlContent;
            } else {
               bodyStr = (parsed.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
            }
            bodyStr = bodyStr.replace(/\x00/g, '');
            
            if (parsed.attachments) {
              parsed.attachments.forEach((att: any) => {
                if (att.cid && att.content) {
                  const dataUri = `data:${att.contentType};base64,${att.content.toString('base64')}`;
                  bodyStr = bodyStr.replace(new RegExp(`cid:${att.cid.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`, 'gi'), dataUri);
                }
              });
            }
            const toAddress = Array.isArray(parsed.to) 
              ? parsed.to.flatMap(t => t.value || []).map((v: any) => v.address).join(', ')
              : parsed.to?.value?.map((v: any) => v.address).join(', ') || '';

            const existingRes = await pool.query('SELECT id FROM emails WHERE id = $1 AND user_id = $2', [messageIdStr, req.user.uid]);
            const deletedRes = await pool.query('SELECT id FROM deleted_emails WHERE id = $1 AND user_id = $2', [messageIdStr, req.user.uid]);
            
            if (deletedRes.rows.length > 0) {
              continue; // Skip already hard-deleted emails
            }
            
            if (existingRes.rows.length === 0) {
              await pool.query(
                `INSERT INTO emails (id, user_id, client_id, sender, sender_name, recipient, subject, body, date, read, type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                  messageIdStr, req.user.uid, clientId, fromEmail, parsed.from?.value?.[0]?.name || '',
                  toAddress,
                  parsed.subject || '(No Subject)', bodyStr,
                  parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
                  false, 'inbound'
                ]
              );
              syncedEmails.push(messageIdStr);
            } else {
              // Update existing email's body to fix missing HTML
              await pool.query('UPDATE emails SET body = $1 WHERE id = $2 AND user_id = $3', [bodyStr, messageIdStr, req.user.uid]);
            }
          }
        } finally {
          await client.QUIT();
        }
        if (syncedEmails.length > 0) {
          await sendExternalNotification(req.user.uid, {
            event: 'email_received',
            title: 'New email received',
            body: `${syncedEmails.length} new email(s) synced from ${username}.`,
            metadata: { count: syncedEmails.length, mailbox: username, type }
          }).catch(err => console.warn('Email external notification failed', err));
        }
        return res.json({ success: true, count: syncedEmails.length });
      }

      const client = new ImapFlow({
        host,
        port: port ? parseInt(port) : (secure ? 993 : 143),
        secure: (port && parseInt(port) === 993) ? true : !!secure,
        tls: {
          rejectUnauthorized: false
        },
        auth: {
          user: username,
          pass: password
        },
        logger: false
      });

      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Fetch last 10 messages for speed
        const mb = await client.mailboxOpen('INBOX');
        const total = mb.exists;
        
        if (total > 0) {
          const fetchRange = total > 50 ? `${total - 49}:*` : '1:*';
          
          for await (let message of client.fetch(fetchRange, { source: true, uid: true })) {
          if (!message.source) continue;
          const parsed = await simpleParser(message.source);
          
          const fromEmail = parsed.from?.value?.[0]?.address || '';
          const clientRes = await pool.query(`
            SELECT id FROM clients 
            WHERE user_id = $1 
              AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(contact_methods) elem 
                WHERE elem->>'type' = 'email' AND elem->>'value' = $2
              ) 
            LIMIT 1
          `, [req.user.uid, fromEmail]);
          const clientId = clientRes.rows.length > 0 ? clientRes.rows[0].id : null;

          // Try to use messageId to prevent duplicates, fallback to uid
          let messageIdStr = parsed.messageId;
          if (!messageIdStr) {
             messageIdStr = `msg_${username}_${message.uid}`;
          }
          // Truncate to 128 chars
          messageIdStr = messageIdStr.substring(0, 128);
          
          let htmlContent = parsed.html || parsed.textAsHtml;
          let bodyStr = '';
          if (htmlContent) {
             bodyStr = htmlContent;
          } else {
             bodyStr = (parsed.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
          }
          bodyStr = bodyStr.replace(/\x00/g, '');

          if (parsed.attachments) {
            parsed.attachments.forEach((att: any) => {
              if (att.cid && att.content) {
                const dataUri = `data:${att.contentType};base64,${att.content.toString('base64')}`;
                bodyStr = bodyStr.replace(new RegExp(`cid:${att.cid.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`, 'gi'), dataUri);
              }
            });
          }
          const toAddress = Array.isArray(parsed.to) 
            ? parsed.to.flatMap(t => t.value || []).map((v: any) => v.address).join(', ')
            : parsed.to?.value?.map((v: any) => v.address).join(', ') || '';

          const existingRes = await pool.query('SELECT id FROM emails WHERE id = $1 AND user_id = $2', [messageIdStr, req.user.uid]);
          const deletedRes = await pool.query('SELECT id FROM deleted_emails WHERE id = $1 AND user_id = $2', [messageIdStr, req.user.uid]);
          
          if (deletedRes.rows.length > 0) {
            continue; // Skip already hard-deleted emails
          }

          if (existingRes.rows.length === 0) {
            await pool.query(
              `INSERT INTO emails (id, user_id, client_id, sender, sender_name, recipient, subject, body, date, read, type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                messageIdStr,
                req.user.uid,
                clientId,
                fromEmail,
                parsed.from?.value?.[0]?.name || '',
                toAddress,
                parsed.subject || '(No Subject)',
                bodyStr,
                parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
                false,
                'inbound'
              ]
            );
            syncedEmails.push(messageIdStr);
          } else {
            // Update existing email's body to fix missing HTML
            await pool.query('UPDATE emails SET body = $1 WHERE id = $2 AND user_id = $3', [bodyStr, messageIdStr, req.user.uid]);
          }
        }
      }
      } finally {
        lock.release();
        await client.logout();
      }

      if (syncedEmails.length > 0) {
        await sendExternalNotification(req.user.uid, {
          event: 'email_received',
          title: 'New email received',
          body: `${syncedEmails.length} new email(s) synced from ${username}.`,
          metadata: { count: syncedEmails.length, mailbox: username, type }
        }).catch(err => console.warn('Email external notification failed', err));
      }
      res.json({ success: true, count: syncedEmails.length });
    } catch (e: any) {
      console.error('Email Sync Failed:', e);
      res.status(500).json({ error: e.message || 'Failed to sync emails' });
    }
  });

  // Emails API
  app.get('/api/emails', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT e.*, 
          COALESCE((SELECT json_agg(t.*) FROM email_tracking t WHERE t.email_id = e.id), '[]'::json) as tracking_events
        FROM emails e 
        WHERE e.user_id = $1 AND e.pending_delete = FALSE
        ORDER BY e.date DESC
      `, [req.user.uid]);
      res.json(result.rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        sender: row.sender,
        senderName: row.sender_name,
        recipient: row.recipient,
        cc: row.cc,
        bcc: row.bcc,
        subject: row.subject,
        body: row.body,
        date: row.date,
        read: row.read,
        type: row.type,
        tags: row.tags,
        comments: row.comments,
        scheduledAt: row.scheduled_at,
        attachments: row.attachments,
        pendingDelete: row.pending_delete,
        isImportant: row.is_important,
        todoAt: row.todo_at,
        todoNote: row.todo_note,
        agentContextAnalysis: row.agent_context_analysis,
        agentContextAnalysisKey: row.agent_context_analysis_key,
        trackingEvents: row.tracking_events
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch emails' });
    }
  });

  app.post('/api/emails/delete', authenticateToken, async (req: any, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid ids' });

      let deletedIds = [];
      let pendingIds = [];

      for (const id of ids) {
        const emailRes = await pool.query('SELECT * FROM emails WHERE id = $1 AND user_id = $2', [id, req.user.uid]);
        if (emailRes.rows.length === 0) {
          deletedIds.push(id);
          continue;
        }
        const email = emailRes.rows[0];

        let clientIdToUse = email.client_id;
        if (!clientIdToUse) {
           // check if any client has this email as contact method
           const clientRes = await pool.query(`
             SELECT id FROM clients 
             WHERE user_id = $1 
             AND (
               contact_methods @> $2::jsonb
               OR contact_methods @> $3::jsonb
             )
             LIMIT 1
           `, [
             req.user.uid, 
             JSON.stringify([{ type: "email", value: email.sender }]),
             JSON.stringify([{ type: "email", value: email.recipient }])
           ]);
           
           if (clientRes.rows.length > 0) {
             clientIdToUse = clientRes.rows[0].id;
           }
        }

        if (clientIdToUse) {
          // Soft delete, pending admin review or just soft delete
          await pool.query(
            `INSERT INTO client_edit_requests (client_id, user_id, original_data, requested_data) VALUES ($1, $2, $3, $4)`,
            [clientIdToUse, req.user.uid, JSON.stringify(email), JSON.stringify({ action: 'delete_email', email_id: email.id, subject: email.subject })]
          );
          await pool.query(`UPDATE emails SET pending_delete = TRUE, client_id = $2 WHERE id = $1`, [id, clientIdToUse]);
          pendingIds.push(id);
        } else {
          // Soft delete even if no client is associated, to prevent IMAP re-syncing
          await pool.query(`UPDATE emails SET pending_delete = TRUE WHERE id = $1`, [id]);
          deletedIds.push(id);
        }
      }
      res.json({ success: true, deletedIds, pendingIds });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/emails', authenticateToken, async (req: any, res) => {
    try {
      const { id, clientId, sender, senderName, recipient, cc, bcc, subject, body, date, read, type, tags, comments, scheduledAt, attachments, enableTracking } = req.body;
      
      let finalBody = body;
      const appUrl = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}`;
      
      if (body && enableTracking) {
          const trackingPixel = `<img src="${appUrl}/api/track/open/${id}" width="1" height="1" style="display:none;" alt="" />`;
          finalBody = body.replace(/href="([^"]+)"/g, (match: string, url: string) => {
            if (url.startsWith('http') && !url.includes('/api/track/')) {
              const encodedUrl = Buffer.from(url).toString('base64');
              return `href="${appUrl}/api/track/click/${id}?url=${encodedUrl}"`;
            }
            return match;
          });
          finalBody += trackingPixel;
      }
      
      // If type is sent, actually send the email using configured outbox
      if (type === 'sent') {
        const userRes = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.uid]);
        const settings = userRes.rows[0]?.settings || {};
        const outboxConfigs = settings.outboxConfigs || [];
        // Match outbox config by sender email, fallback to first config
        const config = outboxConfigs.find((c: any) => c.fromEmail === sender) || outboxConfigs[0];

        if (config) {
          if (config.type === 'smtp') {
            const transporter = nodemailer.createTransport({
              host: config.host,
              port: config.port ? parseInt(config.port) : (config.secure ? 465 : 587),
              secure: (config.port && parseInt(config.port) === 465) ? true : !!config.secure,
              tls: { rejectUnauthorized: false },
              auth: {
                user: config.username,
                pass: config.password
              }
            });
            await transporter.sendMail({
              from: `"${senderName || config.fromName}" <${sender}>`,
              to: recipient,
              cc: cc || undefined,
              bcc: bcc || undefined,
              subject: subject,
              html: finalBody
            });
          } else if (config.type === 'resend' && config.apiKey) {
            const resendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: `"${senderName || config.fromName}" <${sender}>`,
                to: recipient,
                cc: cc ? cc.split(',').map((s: string) => s.trim()) : undefined,
                bcc: bcc ? bcc.split(',').map((s: string) => s.trim()) : undefined,
                subject: subject,
                html: finalBody
              })
            });
            if (!resendRes.ok) {
              const errTxt = await resendRes.text();
              console.error('Resend Error:', errTxt);
              throw new Error(`Failed to send via Resend: ${errTxt}`);
            }
          }
        } else {
          console.log('No outbox configured to send email, proceeding to save to DB only.');
        }
      }

      await pool.query(
        `INSERT INTO emails (id, user_id, client_id, sender, sender_name, recipient, cc, bcc, subject, body, date, read, type, tags, comments, scheduled_at, attachments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [id, req.user.uid, clientId || null, sender, senderName, recipient, cc, bcc, subject, finalBody, date || new Date().toISOString(), !!read, type, JSON.stringify(tags || []), JSON.stringify(comments || []), scheduledAt || null, JSON.stringify(attachments || [])]
      );
      if (clientId) {
        await pool.query(`UPDATE clients SET last_contact = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`, [clientId, req.user.uid]);
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Failed to save or send email' });
    }
  });

  app.patch('/api/emails/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const setClauses = [];
      const values = [id, req.user.uid];
      let valIdx = 3;
      
      const mapping: Record<string, string> = {
        read: 'read', type: 'type', tags: 'tags', comments: 'comments', date: 'date',
        isImportant: 'is_important', todoAt: 'todo_at', todoNote: 'todo_note',
        recipient: 'recipient', cc: 'cc', bcc: 'bcc', subject: 'subject', body: 'body',
        attachments: 'attachments', agentContextAnalysis: 'agent_context_analysis',
        agentContextAnalysisKey: 'agent_context_analysis_key'
      };
      
      for (const [key, val] of Object.entries(updates)) {
        if (mapping[key]) {
          setClauses.push(`${mapping[key]} = $${valIdx}`);
          values.push((key === 'tags' || key === 'comments' || key === 'attachments' || key === 'agentContextAnalysis') ? JSON.stringify(val) : val);
          valIdx++;
        }
      }
      
      if (setClauses.length > 0) {
        await pool.query(`UPDATE emails SET ${setClauses.join(', ')} WHERE id = $1 AND user_id = $2`, values);
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update email' });
    }
  });

  // Tracking API
  app.get('/api/track/open/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      // Get IP
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const ipAddr = Array.isArray(ip) ? ip[0] : ip.split(',')[0].trim();
      const userAgent = req.headers['user-agent'] || '';
      
      const geo = geoip.lookup(ipAddr);
      const location = geo ? { country: geo.country, region: geo.region, city: geo.city, ll: geo.ll } : null;

      await pool.query(
        `INSERT INTO email_tracking (email_id, type, ip_address, location, user_agent) VALUES ($1, $2, $3, $4, $5)`,
        [id, 'open', ipAddr, location ? JSON.stringify(location) : null, userAgent]
      );
    } catch (e) {
      console.error('Tracking open error:', e);
    }
    
    // Serve a 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    res.end(pixel);
  });

  app.get('/api/track/click/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).send('Missing url');
      }

      const decodedUrl = Buffer.from(url.toString(), 'base64').toString();

      // Get IP
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const ipAddr = Array.isArray(ip) ? ip[0] : ip.split(',')[0].trim();
      const userAgent = req.headers['user-agent'] || '';
      
      const geo = geoip.lookup(ipAddr);
      const location = geo ? { country: geo.country, region: geo.region, city: geo.city, ll: geo.ll } : null;

      await pool.query(
        `INSERT INTO email_tracking (email_id, type, url, ip_address, location, user_agent) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, 'click', decodedUrl, ipAddr, location ? JSON.stringify(location) : null, userAgent]
      );

      res.redirect(decodedUrl);
    } catch (e) {
      console.error('Tracking click error:', e);
      res.status(500).send('Tracker error');
    }
  });



  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  initDB().catch(console.error); // Do not block server startup
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
