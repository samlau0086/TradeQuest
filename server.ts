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

const normalizeCrmCountry = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const aliases: Record<string, string> = {
    us: 'United States',
    usa: 'United States',
    'u.s.': 'United States',
    'u.s.a.': 'United States',
    'united states': 'United States',
    'united states of america': 'United States',
    america: 'United States',
    uk: 'United Kingdom',
    'u.k.': 'United Kingdom',
    'great britain': 'United Kingdom'
  };
  return aliases[raw.toLowerCase()] || raw;
};

const getSystemLanguageName = (language?: string) => {
  const normalized = String(language || '').trim().toLowerCase();
  return ['zh', 'zh-cn', 'cn', 'chinese', '中文', '简体中文'].includes(normalized) ? 'Chinese' : 'English';
};

const inferCommunicationLanguage = (text?: string | null) => {
  const sample = (text || '').trim();
  if (!sample) return '';
  if (/[\u4e00-\u9fff]/.test(sample)) return 'Chinese';
  if (/[\u3040-\u30ff]/.test(sample)) return 'Japanese';
  if (/[\uac00-\ud7af]/.test(sample)) return 'Korean';
  if (/[\u0400-\u04ff]/.test(sample)) return 'Russian or Ukrainian';
  if (/[\u0600-\u06ff]/.test(sample)) return 'Arabic';
  if (/[¿¡ñáéíóúü]/i.test(sample)) return 'Spanish';
  if (/[àâçéèêëîïôùûüÿœ]/i.test(sample)) return 'French';
  if (/[äöüß]/i.test(sample)) return 'German';
  if (/[ãõç]/i.test(sample)) return 'Portuguese';
  return '';
};

const getCustomerOutputLanguage = (input: {
  lastCommunicationLanguage?: string | null;
  lastCommunicationText?: string | null;
  preferredLanguage?: string | null;
  country?: string | null;
}) => {
  const last = input.lastCommunicationLanguage?.trim();
  if (last) return last;
  const inferred = inferCommunicationLanguage(input.lastCommunicationText);
  if (inferred) return inferred;
  return getOutboundLanguage(input.preferredLanguage || undefined, input.country || undefined);
};

const buildLanguagePolicy = (input: { systemLanguage?: string; customerLanguage?: string }) => {
  const internalLanguage = getSystemLanguageName(input.systemLanguage);
  const customerLanguage = input.customerLanguage || 'the customer language resolved by policy';
  return [
    `Internal-facing output for CRM users MUST be written in ${internalLanguage}.`,
    `Customer-facing output such as email, WhatsApp, quotes, proposal text, and externally visible notes MUST be written in ${customerLanguage}.`,
    'Customer-facing language priority is: last communication language > client preferred language > official language of client country/region > English.'
  ].join('\n');
};

const removeCommentById = (comments: any[] = [], commentId: string): any[] => comments
  .filter(comment => comment?.id !== commentId)
  .map(comment => ({
    ...comment,
    replies: Array.isArray(comment.replies) ? removeCommentById(comment.replies, commentId) : comment.replies
  }));

const clearCommentPendingDelete = (comments: any[] = [], commentId: string): any[] => comments.map(comment => {
  if (comment?.id === commentId) {
    const { pendingDelete, pendingDeleteRequestedAt, ...rest } = comment;
    return rest;
  }
  return {
    ...comment,
    replies: Array.isArray(comment.replies) ? clearCommentPendingDelete(comment.replies, commentId) : comment.replies
  };
});

const countryNameFromCode = (code?: string) => {
  if (!code) return '';
  try {
    return normalizeCrmCountry(new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase());
  } catch {
    return normalizeCrmCountry(code.toUpperCase());
  }
};

const isPrivateIp = (ip: string) => {
  const normalized = ip.replace(/^\[|\]$/g, '').replace(/^::ffff:/i, '');
  if (/^(10\.|127\.|0\.|169\.254\.|192\.168\.)/.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (/^(::1|fc|fd|fe80:)/i.test(normalized)) return true;
  return false;
};

const extractSenderGeoFromHeaders = (headers: any) => {
  const getHeader = (key: string) => {
    if (!headers) return [];
    const value = typeof headers.get === 'function' ? headers.get(key) : headers[key] || headers[key.toLowerCase()];
    if (!value) return [];
    return Array.isArray(value) ? value.map(String) : [String(value)];
  };

  const headerText = [
    ...getHeader('x-originating-ip'),
    ...getHeader('x-sender-ip'),
    ...getHeader('received')
  ].join('\n');

  const matches = [
    ...headerText.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g),
    ...headerText.matchAll(/\b(?:[a-f0-9]{1,4}:){2,}[a-f0-9]{1,4}\b/gi)
  ].map(match => match[0].replace(/^\[|\]$/g, '').replace(/^::ffff:/i, ''));

  const publicCandidates = matches.filter(candidate => !isPrivateIp(candidate));
  const resolved = publicCandidates
    .map(candidate => ({ ip: candidate, geo: geoip.lookup(candidate) }))
    .find(item => item.geo) || (publicCandidates[0] ? { ip: publicCandidates[0], geo: null } : null);
  const ip = resolved?.ip || '';
  const geo = resolved?.geo || null;
  const country = geo?.country ? countryNameFromCode(geo.country) : '';
  return { senderIp: ip || '', senderCountry: country, senderGeo: geo || null };
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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS inactive_notification_sent_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_state JSONB DEFAULT '{}'::jsonb;

      CREATE TABLE IF NOT EXISTS point_transactions (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        amount INT NOT NULL,
        balance_after INT NOT NULL,
        reason TEXT NOT NULL,
        source VARCHAR(100),
        reference_id VARCHAR(128),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created
      ON point_transactions (user_id, created_at DESC);
      
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
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_contact_id VARCHAR(128);
      UPDATE clients
      SET country = 'United States'
      WHERE LOWER(TRIM(COALESCE(country, ''))) IN ('us', 'usa', 'u.s.', 'u.s.a.', 'united states of america', 'america');

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
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS inbox_config_id VARCHAR(128);
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS outbox_config_id VARCHAR(128);
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS sender_ip VARCHAR(128);
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS sender_country VARCHAR(128);
      ALTER TABLE emails ADD COLUMN IF NOT EXISTS sender_geo JSONB;

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
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_score INTEGER;
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_summary TEXT;
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_next_step TEXT;
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_scoring_signature TEXT;
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_scoring_analyzed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS pending_delete BOOLEAN DEFAULT FALSE;
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS pending_edit_request BOOLEAN DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        sku VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sales_points TEXT,
        image_url TEXT,
        bulk_prices JSONB DEFAULT '[]'::jsonb,
        comments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_points TEXT;

      CREATE TABLE IF NOT EXISTS quotes (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        client_id VARCHAR(128) REFERENCES clients(id) ON DELETE SET NULL,
        quote_number VARCHAR(255) NOT NULL,
        currency VARCHAR(16) DEFAULT 'USD',
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
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS currency VARCHAR(16) DEFAULT 'USD';
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
      ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(64);
      ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS raw_chat_id VARCHAR(255);
      ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS conversation_key VARCHAR(255);

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
      ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(64);
      ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS raw_chat_id VARCHAR(255);
      ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS conversation_key VARCHAR(255);

      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_target
      ON whatsapp_messages (user_id, target_phone, source_created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_chat
      ON whatsapp_messages (user_id, raw_chat_id, source_created_at DESC);

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

async function adjustUserPoints(userId: string, amount: number, reason: string, source = 'system', referenceId: string | null = null, metadata: any = {}) {
  const normalizedAmount = Number(amount) || 0;
  if (normalizedAmount === 0) return null;
  const updateRes = await pool.query(
    `UPDATE users SET points = points + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING points`,
    [normalizedAmount, userId]
  );
  const balanceAfter = Number(updateRes.rows[0]?.points ?? 0);
  const id = `pt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  await pool.query(
    `INSERT INTO point_transactions (id, user_id, amount, balance_after, reason, source, reference_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, userId, normalizedAmount, balanceAfter, reason, source, referenceId, JSON.stringify(metadata || {})]
  );
  return { id, amount: normalizedAmount, balanceAfter, reason, source, referenceId, metadata };
}

async function getGlobalSettingNumber(key: string, fallback: number) {
  const result = await pool.query('SELECT value FROM global_settings WHERE key = $1', [key]);
  const value = Number(result.rows[0]?.value ?? fallback);
  return Number.isFinite(value) ? value : fallback;
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
        temperature: 0,
      });
      return response.choices[0].message.content || '';
    } else if (llmConfig.provider === 'gemini') {
      const gemini = new GoogleGenAI({ apiKey: llmConfig.apiKey });
      const response = await gemini.models.generateContent({
        model: llmConfig.model || 'gemini-2.5-flash',
        contents: prompt,
        config: isJson ? { responseMimeType: 'application/json', temperature: 0 } : { temperature: 0 },
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
    config: isJson ? { responseMimeType: 'application/json', temperature: 0 } : { temperature: 0 },
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
Language policy:
${buildLanguagePolicy({ systemLanguage: context?.systemLanguage, customerLanguage: context?.customerLanguage || context?.outboundLanguage })}
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
Choose a complete executable tool set, not just the final action tool.
Include read/context tools needed to make the action reliable.
Include product.read when the prompt says the agent should use company products, catalog, SKUs, pricing, product materials, product-market fit, or product-led targeting.
Include knowledge.search and knowledge.read when the prompt says the agent should use RAG, knowledge base, documents, company materials, ICP, historical closed-won customers, or customer profiles.
Include lead.acquire plus lead.create/public_pool.import/lead.enrich/client.dedupe/data.normalize when the prompt asks to discover, acquire, import, enrich, or build potential leads.
Include outbound tools only if the prompt clearly needs sending messages, quotes, or follow-up execution.
Do not over-minimize. Select all tools that the configured agent would need during a normal run.

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

  app.post("/api/agent-instructions/generate", authenticateToken, async (req: any, res) => {
    try {
      const { agentName = '', currentInstructions = '', selectedTools = [], availableTools = [], guardrail = 'review', systemLanguage = 'English', llmConfig } = req.body;
      if (!agentName && !currentInstructions) return res.status(400).json({ error: "Missing agent context" });
      const selectedToolDefinitions = (Array.isArray(availableTools) ? availableTools : [])
        .filter((tool: any) => Array.isArray(selectedTools) && selectedTools.includes(tool.id));
      const selectedToolIds = new Set((Array.isArray(selectedTools) ? selectedTools : []).map((tool: any) => String(tool)));
      const shouldUseAcquisitionContextRules = selectedToolIds.has('lead.acquire');
      const shouldLoadEnterpriseContext = shouldUseAcquisitionContextRules
        || selectedToolIds.has('product.read')
        || selectedToolIds.has('knowledge.search')
        || selectedToolIds.has('knowledge.read')
        || /product|catalog|sku|knowledge|rag|\u4ea7\u54c1|\u77e5\u8bc6\u5e93|\u5386\u53f2\u6210\u4ea4|\u5ba2\u6237\u753b\u50cf/i.test(`${agentName} ${currentInstructions}`);
      let enterpriseContext = 'No enterprise product/RAG/customer context loaded.';
      if (shouldLoadEnterpriseContext) {
        const [productsRes, knowledgeRes, wonClientsRes] = await Promise.all([
          pool.query(
            `SELECT sku, name, description, sales_points, bulk_prices
             FROM products
             WHERE user_id = $1
             ORDER BY updated_at DESC
             LIMIT 12`,
            [req.user.uid]
          ),
          pool.query(
            `SELECT title, content
             FROM knowledge_base
             WHERE user_id = $1 AND client_id IS NULL
             ORDER BY updated_at DESC
             LIMIT 10`,
            [req.user.uid]
          ),
          pool.query(
            `SELECT name, company, country, tags, contact_methods
             FROM clients
             WHERE user_id = $1 AND status = 'Closed Won'
             ORDER BY updated_at DESC
             LIMIT 12`,
            [req.user.uid]
          )
        ]);
        enterpriseContext = JSON.stringify({
          products: productsRes.rows.map((product: any) => ({
            sku: product.sku,
            name: product.name,
            description: String(product.description || '').slice(0, 700),
            salesPoints: String(product.sales_points || '').slice(0, 700),
            bulkPrices: product.bulk_prices || []
          })),
          knowledgeBase: knowledgeRes.rows.map((item: any) => ({
            title: item.title,
            content: String(item.content || '').slice(0, 900)
          })),
          historicalClosedWonCustomers: wonClientsRes.rows.map((client: any) => ({
            name: client.name,
            company: client.company,
            country: client.country,
            tags: client.tags || [],
            contactMethodTypes: parseJsonArray(client.contact_methods).map((method: any) => method.type).filter(Boolean)
          }))
        }, null, 2);
      }
      const prompt = `You are configuring an AI agent inside a foreign trade CRM.
Generate a clear, operational "Prompt / Instructions" block for this agent.

Language:
- Write internal-facing instructions, logs, summaries, comments for CRM users, and operational guidance in ${systemLanguage}.
- Include this policy in the generated agent instructions:
${buildLanguagePolicy({ systemLanguage })}

Agent name:
${agentName || '(not set)'}

Current draft instructions:
${currentInstructions || '(empty)'}

Guardrail mode:
${guardrail}

Selected tools:
${JSON.stringify(selectedToolDefinitions.length > 0 ? selectedToolDefinitions : selectedTools, null, 2)}

Enterprise context available to personalize this agent:
${enterpriseContext}

Enterprise-context rules:
- When enterprise context is available, use it to make the generated instructions specific to this company. Mention concrete product categories, product keyword strategy, target industries, target countries, ICP patterns, and RAG usage where supported by the context.
- Do not invent product facts that are not present in the enterprise context. If context is sparse, instruct the agent to read product.read and knowledge.search first.
${shouldUseAcquisitionContextRules ? `- Because this agent can acquire leads, the generated instructions MUST explain how lead acquisition should use available enterprise context.
- If product.read is selected, instruct the agent to read product catalog details before lead.acquire and derive acquisition keywords from product names, SKUs, use cases, industries, buyer roles, and target markets.
- If knowledge.search or knowledge.read is selected, instruct the agent to use RAG for product-market fit, ICP, historical customer patterns, and qualification criteria.
- For each imported lead, require an internal note explaining the matching product/use case and why the lead is relevant.
- If public_pool.import is selected, imported leads should default into the public pool.` : '- No acquisition-specific context rules required for this agent.'}

Write instructions that define:
- Role and primary objective.
- What data/context to inspect before acting.
- Which actions it may perform through the selected tools.
- Idempotency rules: skip unchanged or already-completed work.
- Approval rules for risky or customer-facing actions.
- Output expectations for logs, comments, summaries, and next steps.

Return JSON only:
{
  "instructions": "final prompt instructions"
}`;

      const text = await callAI(prompt, llmConfig, true);
      const parsed = JSON.parse(text || '{}');
      res.json({ instructions: String(parsed.instructions || '').trim() });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate agent instructions" });
    }
  });

  app.post("/api/agent-hub/chat", authenticateToken, async (req: any, res) => {
    try {
      const { agentId = 'global_agent', agent: requestAgent = null, message = '', history = [], contextClients = [], llmConfig } = req.body || {};
      if (!String(message).trim()) return res.status(400).json({ error: "Missing message" });
      const settingsRes = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.uid]);
      const settings = settingsRes.rows[0]
        ? (typeof settingsRes.rows[0].settings === 'string' ? JSON.parse(settingsRes.rows[0].settings || '{}') : (settingsRes.rows[0].settings || {}))
        : {};
      const agents = Array.isArray(settings.agentHubAgents) ? settings.agentHubAgents : [];
      const agent = agents.find((item: any) => item.id === agentId) || (requestAgent?.id === agentId ? requestAgent : null) || agents.find((item: any) => item.id === 'global_agent') || {
        id: 'global_agent',
        name: 'Global Conversion Agent',
        instructions: 'Plan and coordinate CRM-wide lead acquisition, follow-up, and conversion.',
        tools: []
      };
      const prompt = `You are chatting with a CRM agent to help it evolve.
The user may give feedback, corrections, strategy, preferences, or operating lessons.
Do not change tool permissions, guardrails, or safety rules. Produce a controlled evolution proposal only.
If the user asks about this agent's configuration, answer from the Agent JSON below exactly. Do not infer missing configuration.
For Event Trigger questions, use agent.eventTriggers and agent.eventTriggerScope exactly.
If the user asks this agent to perform work now, set shouldRun true and include a concrete runObjective. Do not claim the work has already been executed in reply; say that you will create an Agent Hub run.
If contextClients are provided, treat them as the referenced CRM customers from @mentions. Use their exact IDs/names in replies and runObjective. If the user asks for an action on a referenced customer, scope the runObjective to those customers unless the user explicitly asks for a global action.
Internal-facing output language: ${settings.language === 'zh' ? 'Chinese' : 'English'}.

Agent:
${JSON.stringify({
  id: agent.id,
  name: agent.name,
  instructions: agent.instructions,
  tools: agent.tools || [],
  guardrail: agent.guardrail,
  status: agent.status,
  scheduleEnabled: !!agent.scheduleEnabled,
  scheduleIntervalValue: agent.scheduleIntervalValue,
  scheduleIntervalUnit: agent.scheduleIntervalUnit,
  scheduleMaxRuns: agent.scheduleMaxRuns,
  scheduleRunCount: agent.scheduleRunCount,
  eventTriggers: Array.isArray(agent.eventTriggers) ? agent.eventTriggers : [],
  eventTriggerScope: agent.eventTriggerScope || 'subject',
  contextSuggestionMode: agent.contextSuggestionMode || 'manual',
  soul: agent.soul || '',
  recentEvolutionLog: (agent.evolutionLog || []).slice(0, 8)
}, null, 2)}

Recent chat:
${JSON.stringify(Array.isArray(history) ? history.slice(-8) : [], null, 2)}

Referenced CRM customers:
${JSON.stringify(Array.isArray(contextClients) ? contextClients.slice(0, 5) : [], null, 2)}

User message:
${message}

Return JSON only:
{
  "reply": "direct response to the user as this agent, concise and useful",
  "soulPatch": "a proposed addition or refinement for this agent's Soul. Empty string if no durable learning is needed.",
  "summary": "short internal summary of what should be learned. Empty string if no durable learning is needed.",
  "shouldRun": false,
  "runObjective": "specific execution objective if shouldRun is true, otherwise empty string"
}`;
      const selectedLlmId = settings.llmMappings?.agent_harness || settings.llmMappings?.agent_instruction_generation || settings.activeLLMId;
      const mappedConfig = selectedLlmId ? (settings.llmConfigs || []).find((config: any) => config.id === selectedLlmId) : null;
      const text = await callAI(prompt, llmConfig || mappedConfig, true);
      const parsed = JSON.parse(String(text || '{}'));
      res.json({
        agentId: agent.id,
        reply: String(parsed.reply || '').trim(),
        soulPatch: String(parsed.soulPatch || '').trim(),
        summary: String(parsed.summary || '').trim(),
        shouldRun: !!parsed.shouldRun,
        runObjective: String(parsed.runObjective || '').trim()
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e?.message || "Failed to chat with agent" });
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
      const { client, lead, logs, emails, llmConfig, embeddingLlmConfig, systemLanguage = 'English', outboundLanguage } = req.body;
      const latestCustomerText = Array.isArray(emails) ? (emails.find((email: any) => ['inbox', 'inbound'].includes(email.type)) || emails[0])?.body : '';
      const resolvedOutboundLanguage = outboundLanguage || getCustomerOutputLanguage({
        lastCommunicationText: latestCustomerText,
        preferredLanguage: client?.preferredLanguage,
        country: client?.country
      });
      
      const kbRes = await searchKnowledgeBase(req.user.uid, client?.id || null, `Icebreaker and follow up strategy for client in ${client?.company || 'foreign trade'}`, embeddingLlmConfig || llmConfig, 5);
      
      const prompt = `You are a savvy foreign trade AI assistant.
Analyze the ${lead ? 'specific lead/opportunity' : 'customer/account'} and its recent logs.
Language rules:
${buildLanguagePolicy({ systemLanguage, customerLanguage: resolvedOutboundLanguage })}
- sentiment, leadSummary, leadNextStep, and summary are internal CRM outputs.
- icebreaker is customer-facing outbound content.
- Client/account fields and lead/opportunity fields are separate modules. If a lead is provided, leadSummary and leadNextStep must describe that specific opportunity, not the overall customer account. If no lead is provided, they should describe the customer/account-level relationship and account-level next step.
Client: ${JSON.stringify(client)}
Lead/Opportunity: ${JSON.stringify(lead || null)}
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
      const fallbackSummary = [lead?.name || client?.company || client?.name, client?.country, lead?.status || client?.status, Array.isArray(client?.tags) && client.tags.length ? `Tags: ${client.tags.join(', ')}` : '']
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
      
      await pool.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, inactive_notification_sent_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
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

  app.get('/api/points/history', authenticateToken, async (req: any, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
      const result = await pool.query(
        `SELECT id, amount, balance_after, reason, source, reference_id, metadata, created_at
         FROM point_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [req.user.uid, limit]
      );
      res.json(result.rows.map((row: any) => ({
        id: row.id,
        amount: row.amount,
        balanceAfter: row.balance_after,
        reason: row.reason,
        source: row.source,
        referenceId: row.reference_id,
        metadata: row.metadata || {},
        createdAt: row.created_at
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to load point history' });
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
        eventTriggers: Array.isArray(agent.eventTriggers) ? agent.eventTriggers : existing.eventTriggers,
        eventTriggerScope: agent.eventTriggerScope || existing.eventTriggerScope || 'subject',
        updatedAt: new Date(Math.max(existingTime, incomingTime) || Date.now()).toISOString()
      });
    });
    return Array.from(byId.values()).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  };

  const SYSTEM_AGENT_IDS = new Set([
    'signal_scanner_agent',
    'global_agent',
    'follow_up_agent',
    'whatsapp_agent',
    'lead_scoring_agent',
    'lead_data_agent',
    'email_draft_agent',
    'whatsapp_draft_agent',
    'context_suggestion_agent',
    'agent_prompt_builder_agent',
    'agent_tool_selection_agent'
  ]);

  const mergeUserSettings = (existing: any = {}, incoming: any = {}) => {
    const merged = { ...existing, ...incoming };
    const deletedAgentHubAgentIds = Array.from(new Set([
      ...((existing.deletedAgentHubAgentIds || []) as string[]),
      ...((incoming.deletedAgentHubAgentIds || []) as string[])
    ])).filter(id => !SYSTEM_AGENT_IDS.has(id));
    const deletedAgentHubAgentIdSet = new Set(deletedAgentHubAgentIds);
    merged.agentRunRecords = mergeSettingsArrayById(existing.agentRunRecords || [], incoming.agentRunRecords || []).slice(0, 200);
    const mergedOpportunityDedupeLog = {
      ...(existing.agentOpportunityDedupeLog || {}),
      ...(incoming.agentOpportunityDedupeLog || {})
    };
    Object.entries(existing.agentOpportunityDedupeLog || {}).forEach(([key, value]: [string, any]) => {
      const incomingValue = mergedOpportunityDedupeLog[key] as any;
      const existingTime = new Date(value?.lastTouchedAt || value?.completedAt || value?.updatedAt || 0).getTime();
      const incomingTime = new Date(incomingValue?.lastTouchedAt || incomingValue?.completedAt || incomingValue?.updatedAt || 0).getTime();
      if (existingTime > incomingTime) mergedOpportunityDedupeLog[key] = value;
    });
    merged.agentOpportunityDedupeLog = Object.fromEntries(
      Object.entries(mergedOpportunityDedupeLog)
        .sort(([, a]: [string, any], [, b]: [string, any]) => new Date(b?.lastTouchedAt || 0).getTime() - new Date(a?.lastTouchedAt || 0).getTime())
        .slice(0, 500)
    );
    merged.agentOpportunities = Array.isArray(incoming.agentOpportunities)
      ? incoming.agentOpportunities.filter((opportunity: any) => opportunity?.id).slice(0, 300)
      : (existing.agentOpportunities || []);
    merged.agentOpportunityRoutingPolicy = {
      enabled: true,
      autoExecuteLowRisk: true,
      routeMediumRiskToReview: true,
      routeHighRiskToReview: false,
      maxAutoDispatchPerRun: 10,
      ...(existing.agentOpportunityRoutingPolicy || {}),
      ...(incoming.agentOpportunityRoutingPolicy || {})
    };
    merged.agentChatMessages = Array.isArray(incoming.agentChatMessages)
      ? incoming.agentChatMessages
        .filter((message: any) => message?.id)
        .sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
        .slice(-300)
      : (existing.agentChatMessages || []);
    merged.agentHarnessRuns = mergeSettingsArrayById(existing.agentHarnessRuns || [], incoming.agentHarnessRuns || []);
    merged.globalAgentPlans = mergeSettingsArrayById(existing.globalAgentPlans || [], incoming.globalAgentPlans || []);
    merged.deletedAgentHubAgentIds = deletedAgentHubAgentIds;
    merged.agentHubAgents = mergeAgentHubAgents(
      (existing.agentHubAgents || []).filter((agent: any) => agent?.builtIn || SYSTEM_AGENT_IDS.has(agent.id) || !deletedAgentHubAgentIdSet.has(agent.id)),
      (incoming.agentHubAgents || []).filter((agent: any) => agent?.builtIn || SYSTEM_AGENT_IDS.has(agent.id) || !deletedAgentHubAgentIdSet.has(agent.id))
    );
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
    if (!config.enabled) return { skipped: true, reason: 'External notifications are disabled.', results: [] };
    if (events[payload.event] === false) return { skipped: true, reason: `Event ${payload.event} is disabled.`, results: [] };

    const jobs: Promise<{ channel: string; ok: boolean; status?: number; error?: string }>[] = [];
    if (config.barkEnabled && config.barkDeviceKey) {
      const serverUrl = String(config.barkServerUrl || 'https://api.day.app').replace(/\/+$/, '');
      const deviceKey = String(config.barkDeviceKey).trim().replace(/^\/+|\/+$/g, '');
      const barkUrl = /^https?:\/\//i.test(deviceKey) ? deviceKey : `${serverUrl}/${encodeURIComponent(deviceKey)}`;
      jobs.push(
        fetch(barkUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url,
            group: 'TradeQuest',
            level: payload.event === 'execution_failed' ? 'timeSensitive' : 'active'
          })
        })
          .then(async response => ({
            channel: 'bark',
            ok: response.ok,
            status: response.status,
            error: response.ok ? undefined : (await response.text().catch(() => response.statusText)).slice(0, 300)
          }))
          .catch(error => ({ channel: 'bark', ok: false, error: error instanceof Error ? error.message : String(error) }))
      );
    }

    if (config.webhookEnabled && config.webhookUrl) {
      jobs.push(
        fetch(String(config.webhookUrl), {
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
        })
          .then(async response => ({
            channel: 'webhook',
            ok: response.ok,
            status: response.status,
            error: response.ok ? undefined : (await response.text().catch(() => response.statusText)).slice(0, 300)
          }))
          .catch(error => ({ channel: 'webhook', ok: false, error: error instanceof Error ? error.message : String(error) }))
      );
    }

    if (jobs.length === 0) {
      return { skipped: true, reason: 'No Bark or Webhook channel is configured.', results: [] };
    }
    const results = await Promise.all(jobs);
    return { skipped: false, results };
  };

  app.post('/api/notifications/external', authenticateToken, async (req: any, res) => {
    try {
      const { event, title, body, url, metadata } = req.body || {};
      if (!event || !title || !body) {
        return res.status(400).json({ error: 'Missing notification event, title, or body' });
      }
      const result = await sendExternalNotification(req.user.uid, {
        event: String(event),
        title: String(title).slice(0, 160),
        body: String(body).slice(0, 1000),
        url: url ? String(url) : undefined,
        metadata
      });
      res.json({ success: true, ...result });
    } catch (e) {
      console.error('External notification failed', e);
      res.status(500).json({ error: 'Failed to send external notification' });
    }
  });

  const getUserNotificationDateKey = (timezone?: string) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const buildDailyOperationSummary = async (user: any) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [emailRes, clientRes, dealRes, logRes, editReqRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM emails WHERE user_id = $1 AND date >= $2`, [user.id, since]),
      pool.query(`SELECT COUNT(*)::int AS count FROM clients WHERE user_id = $1 AND created_at >= $2`, [user.id, since]),
      pool.query(`SELECT COUNT(*)::int AS count FROM deals WHERE user_id = $1 AND updated_at >= $2`, [user.id, since]),
      pool.query(`SELECT COUNT(*)::int AS count FROM logs WHERE client_id IN (SELECT id FROM clients WHERE user_id = $1) AND date >= $2`, [user.id, since]),
      pool.query(`SELECT COUNT(*)::int AS count FROM client_edit_requests WHERE user_id = $1 AND status = 'pending'`, [user.id])
    ]);
    const settings = user.settings || {};
    const isZh = settings.language === 'zh';
    const agentRecords = Array.isArray(settings.agentRunRecords) ? settings.agentRunRecords : [];
    const recentAgentRuns = agentRecords.filter((record: any) => new Date(record.startedAt || record.createdAt || 0).getTime() >= Date.now() - 24 * 60 * 60 * 1000).length;
    const emails = Number(emailRes.rows[0]?.count || 0);
    const clients = Number(clientRes.rows[0]?.count || 0);
    const deals = Number(dealRes.rows[0]?.count || 0);
    const logs = Number(logRes.rows[0]?.count || 0);
    const pendingReviews = Number(editReqRes.rows[0]?.count || 0);
    return isZh
      ? `过去24小时：邮件 ${emails} 封，新增客户/线索 ${clients} 个，更新线索 ${deals} 个，事件 ${logs} 条，智能体运行 ${recentAgentRuns} 次，待审核 ${pendingReviews} 项。`
      : `Last 24h: ${emails} email(s), ${clients} new client/lead record(s), ${deals} updated deal(s), ${logs} event(s), ${recentAgentRuns} agent run(s), and ${pendingReviews} pending review item(s).`;
  };

  const runExternalNotificationScheduler = async () => {
    try {
      const usersRes = await pool.query(`
        SELECT id, email, display_name, settings, last_login_at, inactive_notification_sent_at, notification_state, created_at, updated_at
        FROM users
        WHERE COALESCE((settings->'externalNotificationConfig'->>'enabled')::boolean, false) = true
      `);
      for (const user of usersRes.rows) {
        const settings = user.settings || {};
        const notificationState = user.notification_state || {};
        const config = settings.externalNotificationConfig || {};
        const events = config.events || {};
        const isZh = settings.language === 'zh';
        const dateKey = getUserNotificationDateKey(settings.timezone);

        if (events.daily_operation_summary !== false && notificationState.lastDailyOperationSummaryDate !== dateKey) {
          const body = await buildDailyOperationSummary(user);
          const result = await sendExternalNotification(user.id, {
            event: 'daily_operation_summary',
            title: isZh ? 'TradeQuest 每日运营摘要' : 'TradeQuest Daily Operation Summary',
            body,
            metadata: { source: 'notification-scheduler', dateKey }
          });
          if (!result?.skipped) {
            await pool.query(
              `UPDATE users SET notification_state = COALESCE(notification_state, '{}'::jsonb) || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
              [JSON.stringify({ lastDailyOperationSummaryDate: dateKey }), user.id]
            );
          }
        }

        if (events.inactive_login_reminder !== false) {
          const lastLoginAt = user.last_login_at || user.updated_at || user.created_at;
          const lastLoginTime = lastLoginAt ? new Date(lastLoginAt).getTime() : Date.now();
          const daysInactive = Math.floor((Date.now() - lastLoginTime) / (24 * 60 * 60 * 1000));
          const lastSentTime = user.inactive_notification_sent_at ? new Date(user.inactive_notification_sent_at).getTime() : 0;
          const daysSinceLastSent = lastSentTime ? Math.floor((Date.now() - lastSentTime) / (24 * 60 * 60 * 1000)) : Infinity;
          if (daysInactive >= 3 && daysSinceLastSent >= 3) {
            const result = await sendExternalNotification(user.id, {
              event: 'inactive_login_reminder',
              title: isZh ? 'TradeQuest 登录提醒' : 'TradeQuest Login Reminder',
              body: isZh
                ? `你已经连续 ${daysInactive} 天未登录 TradeQuest。建议回来查看待审核事项、客户回复和智能体运行结果。`
                : `You have not logged in to TradeQuest for ${daysInactive} consecutive days. Check pending reviews, customer replies, and agent results.`,
              metadata: { source: 'notification-scheduler', daysInactive }
            });
            if (!result?.skipped) {
              await pool.query(
                `UPDATE users SET inactive_notification_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [user.id]
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('External notification scheduler failed', error);
    }
  };
  setInterval(runExternalNotificationScheduler, 60 * 60 * 1000);
  setTimeout(runExternalNotificationScheduler, 30 * 1000);

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
  const isLikelyWhatsAppChatId = (value: string) => /@(?:lid|c\.us|g\.us|broadcast)$/i.test(String(value || ''));
  const normalizeWhatsAppConversationKey = (value: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return isLikelyWhatsAppChatId(raw) ? raw : normalizeWhatsAppPhone(raw);
  };

  const extractWhatsAppMessageIdentity = (message: any) => {
    const rawChatId = String(message.raw_chat_id || message.chat_id || message.chatId || message.payload?.contact?.id || '').trim();
    const contactPhone = normalizeWhatsAppPhone(
      message.contact_phone
      || message.contactPhone
      || message.conversation_key
      || message.conversation_id
      || message.payload?.senderPhone
      || message.payload?.contact?.number
      || ''
    );
    const directionalPhone = normalizeWhatsAppPhone(message.direction === 'inbound' ? message.sender : message.recipient);
    const resolvedPhone = contactPhone || (isLikelyWhatsAppChatId(rawChatId) ? '' : directionalPhone);
    const conversationKey = normalizeWhatsAppConversationKey(message.conversation_key || message.conversation_id || resolvedPhone || rawChatId || directionalPhone);
    return {
      rawChatId,
      contactPhone: resolvedPhone,
      conversationKey: conversationKey || resolvedPhone || rawChatId || directionalPhone
    };
  };

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
    target: string,
    clientId?: string | null,
    lastMessageAt?: string,
    options: { restoreDeleted?: boolean; contactPhone?: string; rawChatId?: string; conversationKey?: string } = {}
  ) => {
    const conversationKey = normalizeWhatsAppConversationKey(options.conversationKey || options.contactPhone || target);
    const contactPhone = normalizeWhatsAppPhone(options.contactPhone || (!isLikelyWhatsAppChatId(conversationKey) ? conversationKey : ''));
    const rawChatId = String(options.rawChatId || (isLikelyWhatsAppChatId(target) ? target : '')).trim();
    if (!conversationKey) return null;
    const conversationId = `wa_conv_${userId}_${conversationKey}`.slice(0, 128);
    const resolvedClientId = clientId || await findClientForWhatsAppPhone(userId, contactPhone || conversationKey);
    const deletedRes = await pool.query(
      `SELECT id, deleted_at FROM whatsapp_conversations
       WHERE user_id = $1 AND target_phone = $2 AND deleted_at IS NOT NULL`,
      [userId, conversationKey]
    );
    if (deletedRes.rows.length > 0 && !options.restoreDeleted) return null;
    await pool.query(
      `INSERT INTO whatsapp_conversations (id, user_id, target_phone, client_id, last_message_at, contact_phone, raw_chat_id, conversation_key)
       VALUES ($1, $2, $3, $4, $5, $7, $8, $3)
       ON CONFLICT (user_id, target_phone)
       DO UPDATE SET
         client_id = COALESCE(whatsapp_conversations.client_id, EXCLUDED.client_id),
         last_message_at = GREATEST(COALESCE(whatsapp_conversations.last_message_at, EXCLUDED.last_message_at), COALESCE(EXCLUDED.last_message_at, whatsapp_conversations.last_message_at)),
         contact_phone = COALESCE(EXCLUDED.contact_phone, whatsapp_conversations.contact_phone),
         raw_chat_id = COALESCE(EXCLUDED.raw_chat_id, whatsapp_conversations.raw_chat_id),
         conversation_key = COALESCE(EXCLUDED.conversation_key, whatsapp_conversations.conversation_key, whatsapp_conversations.target_phone),
         deleted_at = CASE WHEN $6::boolean THEN NULL ELSE whatsapp_conversations.deleted_at END,
         updated_at = CURRENT_TIMESTAMP`,
      [conversationId, userId, conversationKey, resolvedClientId, lastMessageAt || null, !!options.restoreDeleted, contactPhone || null, rawChatId || null]
    );
    return { id: conversationId, clientId: resolvedClientId, targetPhone: conversationKey, contactPhone, rawChatId };
  };

  const upsertWhatsAppMessage = async (userId: string, message: any) => {
    const identity = extractWhatsAppMessageIdentity(message);
    const targetPhone = identity.conversationKey;
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
    const conversation = await ensureWhatsAppConversation(userId, targetPhone, null, messageTime, {
      restoreDeleted,
      contactPhone: identity.contactPhone,
      rawChatId: identity.rawChatId,
      conversationKey: identity.conversationKey
    });
    if (!conversation) return;
    const messageId = String(message.id || `wa_msg_${message.client_id || 'hub'}_${message.direction}_${targetPhone}_${new Date(messageTime).getTime()}`).slice(0, 128);
    await pool.query(
      `INSERT INTO whatsapp_messages
       (id, user_id, conversation_id, client_id, hub_client_id, direction, sender, recipient, target_phone, body, message_type, payload, source_created_at, received_at, contact_phone, raw_chat_id, conversation_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id)
       DO UPDATE SET
         client_id = COALESCE(whatsapp_messages.client_id, EXCLUDED.client_id),
         conversation_id = EXCLUDED.conversation_id,
         target_phone = EXCLUDED.target_phone,
         contact_phone = COALESCE(EXCLUDED.contact_phone, whatsapp_messages.contact_phone),
         raw_chat_id = COALESCE(EXCLUDED.raw_chat_id, whatsapp_messages.raw_chat_id),
         conversation_key = COALESCE(EXCLUDED.conversation_key, whatsapp_messages.conversation_key),
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
        message.received_at || null,
        identity.contactPhone || null,
        identity.rawChatId || null,
        identity.conversationKey || targetPhone
      ]
    );
  };

  const syncWhatsAppHubMessages = async (userId: string, options: { targetPhone?: string; chatId?: string; limit?: number; since?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.targetPhone) params.set('targetPhone', options.targetPhone);
    if (options.chatId) params.set('chatId', options.chatId);
    if (options.since) params.set('since', options.since);
    params.set('limit', String(Math.min(Math.max(options.limit || 100, 1), 200)));
    const data = await callWhatsAppHub(userId, `/api/messages?${params.toString()}`);
    const messages = Array.isArray(data.messages) ? data.messages : [];
    for (const message of messages) {
      await upsertWhatsAppMessage(userId, message);
    }
    return messages.length;
  };

  const syncWhatsAppHubChats = async (userId: string, limit = 100) => {
    const data = await callWhatsAppHub(userId, `/api/chats?limit=${Math.min(Math.max(limit, 1), 500)}`).catch(() => ({ chats: [] }));
    const chats = Array.isArray(data.chats) ? data.chats : [];
    for (const chat of chats) {
      const conversationKey = normalizeWhatsAppConversationKey(chat.conversation_key || chat.conversation_id || chat.contact_phone || chat.chat_id);
      if (!conversationKey) continue;
      const contactPhone = normalizeWhatsAppPhone(chat.contact_phone || (!isLikelyWhatsAppChatId(conversationKey) ? conversationKey : ''));
      await ensureWhatsAppConversation(userId, conversationKey, null, chat.last_message_at || new Date().toISOString(), {
        contactPhone,
        rawChatId: chat.raw_chat_id || chat.chat_id || '',
        conversationKey,
        restoreDeleted: false
      });
    }
    return chats.length;
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
    contactPhone: row.contact_phone,
    rawChatId: row.raw_chat_id,
    conversationKey: row.conversation_key || row.target_phone,
    body: row.body,
    message_type: row.message_type,
    payload: row.payload,
    created_at: row.source_created_at || row.created_at,
    received_at: row.received_at
  });

  const mapWhatsAppConversationRow = (row: any) => ({
    id: row.id,
    targetPhone: row.target_phone,
    contactPhone: row.contact_phone,
    rawChatId: row.raw_chat_id,
    conversationKey: row.conversation_key || row.target_phone,
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
        chatId: payload.chatId || payload.metadata?.chatId || undefined,
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
      const rawTarget = req.query.targetPhone ? String(req.query.targetPhone) : '';
      const targetPhone = rawTarget ? normalizeWhatsAppConversationKey(rawTarget) : '';
      const chatId = req.query.chatId ? String(req.query.chatId).trim() : '';
      const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 500);

      const values: any[] = [req.user.uid];
      let where = 'm.user_id = $1';
      if (targetPhone) {
        values.push(targetPhone);
        where += ` AND (m.target_phone = $${values.length} OR m.contact_phone = $${values.length} OR m.conversation_key = $${values.length})`;
      }
      if (chatId) {
        values.push(chatId);
        where += ` AND (m.raw_chat_id = $${values.length} OR m.target_phone = $${values.length} OR m.conversation_key = $${values.length})`;
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
      const rawTarget = req.body?.targetPhone ? String(req.body.targetPhone) : '';
      const targetPhone = rawTarget ? normalizeWhatsAppConversationKey(rawTarget) : '';
      const chatId = req.body?.chatId ? String(req.body.chatId).trim() : (isLikelyWhatsAppChatId(targetPhone) ? targetPhone : '');
      let since = req.body?.since ? String(req.body.since) : '';
      if (!since) {
        const values: any[] = [req.user.uid];
        let where = 'user_id = $1';
        if (targetPhone) {
          values.push(targetPhone);
          where += ` AND (target_phone = $${values.length} OR contact_phone = $${values.length} OR conversation_key = $${values.length})`;
        }
        if (chatId) {
          values.push(chatId);
          where += ` AND (raw_chat_id = $${values.length} OR target_phone = $${values.length} OR conversation_key = $${values.length})`;
        }
        const latest = await pool.query(
          `SELECT MAX(COALESCE(source_created_at, created_at)) AS latest_at FROM whatsapp_messages WHERE ${where}`,
          values
        );
        since = latest.rows[0]?.latest_at ? new Date(latest.rows[0].latest_at).toISOString() : '';
      }
      const count = await syncWhatsAppHubMessages(req.user.uid, {
        targetPhone: chatId ? undefined : targetPhone,
        chatId: chatId || undefined,
        limit: Number(req.body?.limit || 100),
        since
      });
      const chatCount = !targetPhone && !chatId ? await syncWhatsAppHubChats(req.user.uid, Number(req.body?.limit || 100)) : 0;
      res.json({ success: true, count, chatCount });
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
          OR lower(COALESCE(c.contact_phone, '')) LIKE $${values.length}
          OR lower(COALESCE(c.raw_chat_id, '')) LIKE $${values.length}
          OR lower(COALESCE(c.conversation_key, '')) LIKE $${values.length}
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

  app.put('/api/whatsapp-hub/contact-mappings', authenticateToken, async (req: any, res) => {
    try {
      const phone = normalizeWhatsAppPhone(req.body?.phone);
      const chatId = String(req.body?.chatId || '').trim();
      const clientId = req.body?.clientId ? String(req.body.clientId) : undefined;
      const conversationId = req.body?.conversationId ? String(req.body.conversationId) : '';
      if (!phone || !chatId) return res.status(400).json({ error: 'Phone and chatId are required' });

      const hubPayload: any = { phone, chatId };
      if (clientId) hubPayload.clientId = clientId;
      const mappingResult = await callWhatsAppHub(req.user.uid, '/api/contact-mappings', {
        method: 'PUT',
        body: JSON.stringify(hubPayload)
      });

      const existingByPhone = await ensureWhatsAppConversation(req.user.uid, phone, null, new Date().toISOString(), {
        contactPhone: phone,
        rawChatId: chatId,
        conversationKey: phone,
        restoreDeleted: true
      });
      if (!existingByPhone) throw new Error('Failed to create mapped WhatsApp conversation');

      const sourceConversation = conversationId
        ? await pool.query(`SELECT * FROM whatsapp_conversations WHERE id = $1 AND user_id = $2`, [conversationId, req.user.uid])
        : await pool.query(`SELECT * FROM whatsapp_conversations WHERE user_id = $1 AND (raw_chat_id = $2 OR target_phone = $2 OR conversation_key = $2) LIMIT 1`, [req.user.uid, chatId]);
      const source = sourceConversation.rows[0];
      if (source && source.id !== existingByPhone.id) {
        await pool.query(
          `UPDATE whatsapp_messages
           SET conversation_id = $1,
               target_phone = $2,
               contact_phone = $2,
               raw_chat_id = COALESCE(raw_chat_id, $3),
               conversation_key = $2
           WHERE user_id = $4 AND conversation_id = $5`,
          [existingByPhone.id, phone, chatId, req.user.uid, source.id]
        );
        await pool.query(
          `UPDATE whatsapp_conversations
           SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND user_id = $2`,
          [source.id, req.user.uid]
        );
      }

      await pool.query(
        `UPDATE whatsapp_messages
         SET target_phone = $1,
             contact_phone = $1,
             raw_chat_id = COALESCE(raw_chat_id, $2),
             conversation_key = $1
         WHERE user_id = $3 AND (raw_chat_id = $2 OR target_phone = $2 OR conversation_key = $2 OR contact_phone = $1)`,
        [phone, chatId, req.user.uid]
      );
      await pool.query(
        `UPDATE whatsapp_conversations
         SET contact_phone = $1,
             raw_chat_id = $2,
             conversation_key = $1,
             target_phone = $1,
             deleted_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND user_id = $4`,
        [phone, chatId, existingByPhone.id, req.user.uid]
      );

      const refreshed = await pool.query(
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
         WHERE c.id = $1 AND c.user_id = $2`,
        [existingByPhone.id, req.user.uid]
      );
      res.json({ success: true, mapping: mappingResult.mapping || mappingResult, conversation: mapWhatsAppConversationRow(refreshed.rows[0]) });
    } catch (e: any) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to update WhatsApp contact mapping' });
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
        const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_schedule_whatsapp', 1));
        await adjustUserPoints(req.user.uid, pointsAdded, 'Scheduled WhatsApp message', 'schedule_whatsapp', scheduled.id, { to });
        return res.status(202).json({ scheduled: true, ...scheduled });
      }
      const data = await sendWhatsAppViaHub(req.user.uid, { ...req.body, to });
      const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_send_whatsapp', 2));
      await adjustUserPoints(req.user.uid, pointsAdded, 'Sent WhatsApp message', 'send_whatsapp', data?.id || null, { to });
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
          const latestCustomerEmail = emailsRes.rows.find((email: any) => ['inbox', 'inbound'].includes(email.type)) || emailsRes.rows[0];
          const resolvedOutboundLanguage = getCustomerOutputLanguage({
            lastCommunicationText: latestCustomerEmail?.body,
            preferredLanguage: client.preferred_language,
            country: client.country
          });

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
Preferred Language: ${client.preferred_language || 'Not configured'}
Resolved Customer-Facing Language: ${resolvedOutboundLanguage}
Preferred Comm Time: ${client.preferred_time_range || 'Any'} (This is in the Client's Local Time)
Agent Context / Instructions: ${client.agent_context || 'None'}
Language policy:
${buildLanguagePolicy({ systemLanguage: userSettings.language, customerLanguage: resolvedOutboundLanguage })}
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
Internal fields newSummary and suggestedNextStep must follow the internal system language. Customer-facing fields draftEmail and draftWhatsApp must follow the customer-facing output language policy.
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

  const AGENT_OPPORTUNITY_ACTIVE_STATUSES = new Set(['open', 'queued', 'pending_review', 'running', 'failed']);
  const AGENT_OPPORTUNITY_CLOSED_DEDUPE_MS = 30 * 24 * 60 * 60 * 1000;
  const AGENT_OPPORTUNITY_DEDUPE_LOG_LIMIT = 500;
  const AGENT_OPPORTUNITY_DEDUPE_LOG_TTL_MS = 90 * 24 * 60 * 60 * 1000;

  const getAgentOpportunityTimestamp = (opportunity: any) => {
    const raw = opportunity?.completedAt || opportunity?.updatedAt || opportunity?.createdAt;
    const time = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  };

  const getAgentOpportunityStateSignature = (opportunity: any) => {
    if (opportunity?.metadata?.stateSignature) return String(opportunity.metadata.stateSignature);
    return JSON.stringify({
      targetType: opportunity?.targetType || null,
      targetId: opportunity?.targetId || null,
      relatedEmailIds: opportunity?.metadata?.relatedEmailIds || null,
      trackingCount: opportunity?.metadata?.trackingCount || null,
      objective: opportunity?.objective || ''
    });
  };

  const pruneAgentOpportunityDedupeLog = (settings: any) => {
    const now = Date.now();
    const entries = Object.entries(settings.agentOpportunityDedupeLog || {})
      .filter(([, value]: [string, any]) => {
        const touchedAt = new Date(value?.lastTouchedAt || 0).getTime();
        return touchedAt > 0 && now - touchedAt < AGENT_OPPORTUNITY_DEDUPE_LOG_TTL_MS;
      })
      .sort(([, a]: [string, any], [, b]: [string, any]) => new Date(b?.lastTouchedAt || 0).getTime() - new Date(a?.lastTouchedAt || 0).getTime())
      .slice(0, AGENT_OPPORTUNITY_DEDUPE_LOG_LIMIT);
    settings.agentOpportunityDedupeLog = Object.fromEntries(entries);
  };

  const rememberAgentOpportunityDedupe = (settings: any, opportunity: any, updates: any = {}) => {
    if (!opportunity?.dedupeKey) return;
    pruneAgentOpportunityDedupeLog(settings);
    settings.agentOpportunityDedupeLog = {
      ...(settings.agentOpportunityDedupeLog || {}),
      [opportunity.dedupeKey]: {
        opportunityId: opportunity.id,
        relatedRunId: updates.relatedRunId || opportunity.relatedRunId || null,
        status: updates.status || opportunity.status || 'open',
        title: opportunity.title || '',
        source: opportunity.source || '',
        targetType: opportunity.targetType || null,
        targetId: opportunity.targetId || null,
        stateSignature: getAgentOpportunityStateSignature(opportunity),
        lastTouchedAt: updates.completedAt || updates.updatedAt || new Date().toISOString()
      }
    };
    pruneAgentOpportunityDedupeLog(settings);
  };

  const shouldSuppressOpportunityByDedupeLog = (settings: any, opportunity: any, options: { ignoreOpportunityId?: string } = {}) => {
    const entry = opportunity?.dedupeKey ? settings.agentOpportunityDedupeLog?.[opportunity.dedupeKey] : null;
    if (!entry) return false;
    if (options.ignoreOpportunityId && entry.opportunityId === options.ignoreOpportunityId) return false;
    if (entry.stateSignature !== getAgentOpportunityStateSignature(opportunity)) return false;
    const touchedAt = new Date(entry.lastTouchedAt || 0).getTime();
    return touchedAt > 0 && Date.now() - touchedAt < AGENT_OPPORTUNITY_CLOSED_DEDUPE_MS;
  };

  const shouldSuppressDuplicateOpportunity = (existingOpportunity: any, incomingOpportunity: any) => {
    if (!existingOpportunity?.dedupeKey || existingOpportunity.dedupeKey !== incomingOpportunity?.dedupeKey) return false;
    const status = existingOpportunity.status || 'open';
    if (AGENT_OPPORTUNITY_ACTIVE_STATUSES.has(status)) return true;
    if (!['completed', 'ignored'].includes(status)) return false;
    if (getAgentOpportunityStateSignature(existingOpportunity) !== getAgentOpportunityStateSignature(incomingOpportunity)) return false;

    const lastTouchedAt = getAgentOpportunityTimestamp(existingOpportunity);
    return lastTouchedAt > 0 && Date.now() - lastTouchedAt < AGENT_OPPORTUNITY_CLOSED_DEDUPE_MS;
  };

  const addAgentOpportunityToSettings = (settings: any, opportunity: any) => {
    const now = new Date().toISOString();
    const existing = Array.isArray(settings.agentOpportunities) ? settings.agentOpportunities : [];
    if (shouldSuppressOpportunityByDedupeLog(settings, opportunity)) {
      return null;
    }
    if (existing.some((item: any) => shouldSuppressDuplicateOpportunity(item, opportunity))) {
      return null;
    }
    const nextOpportunity = {
      ...opportunity,
      id: `opp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: opportunity.status || 'open',
      createdAt: now,
      updatedAt: now
    };
    settings.agentOpportunities = [nextOpportunity, ...existing].slice(0, 300);
    rememberAgentOpportunityDedupe(settings, nextOpportunity, { status: nextOpportunity.status, updatedAt: now });
    return nextOpportunity;
  };

  const normalizeEmailThreadSubject = (subject: string) => {
    const normalized = String(subject || '')
      .toLowerCase()
      .replace(/^\s*((re|fw|fwd|答复|回复|转发)\s*[:：]\s*)+/i, '')
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized || 'no-subject';
  };

  const getEmailOpportunityThreadKey = (email: any) => {
    const participantKey = email.client_id || [email.sender, email.recipient]
      .filter(Boolean)
      .map((value: string) => value.toLowerCase().trim())
      .sort()
      .join('|') || 'unknown-contact';
    return `${participantKey}:${normalizeEmailThreadSubject(email.subject)}`;
  };

  const scanAgentOpportunitiesForUser = async (userId: string, settings: any) => {
    const isZh = settings.language === 'zh';
    const created: any[] = [];
    const add = (opportunity: any) => {
      const item = addAgentOpportunityToSettings(settings, opportunity);
      if (item) created.push(item);
    };
    const [clientsRes, dealsRes, emailsRes] = await Promise.all([
      pool.query(`SELECT id, name, company, country, status, last_contact, lead_score, lead_summary, lead_next_step, agent_next_step, updated_at FROM clients WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 200`, [userId]),
      pool.query(`SELECT id, client_id, name, status, value, lead_score, lead_summary, lead_next_step, updated_at FROM deals WHERE user_id = $1 AND pending_delete = FALSE ORDER BY updated_at DESC LIMIT 200`, [userId]),
      pool.query(`
        SELECT e.id, e.client_id, e.sender, e.recipient, e.subject, e.body, e.date, e.read, e.type,
          COALESCE((SELECT json_agg(t.*) FROM email_tracking t WHERE t.email_id = e.id), '[]'::json) as tracking_events
        FROM emails e
        WHERE e.user_id = $1 AND e.pending_delete = FALSE
        ORDER BY e.date DESC
        LIMIT 300
      `, [userId])
    ]);
    const clientsById = new Map(clientsRes.rows.map((client: any) => [client.id, client]));
    const inboundEmails = emailsRes.rows.filter((email: any) => ['inbox', 'inbound'].includes(email.type));

    inboundEmails.filter((email: any) => !email.read).slice(0, 20).forEach((email: any) => {
      add({
        title: isZh ? `未处理入站邮件：${email.subject || '(无主题)'}` : `Unread inbound email: ${email.subject || '(no subject)'}`,
        description: isZh ? `客户来信尚未读取或处理，建议生成上下文建议并准备回复。` : `A customer email is unread or unprocessed. Generate context suggestions and prepare a reply.`,
        recommendedAgentId: 'context_suggestion_agent',
        recommendedAgentName: 'Context Suggestion Agent',
        objective: isZh
          ? `分析邮件 ${email.id} 的意图、客户上下文和知识库相关内容，并给出下一步建议。`
          : `Analyze email ${email.id} intent, CRM context, and relevant knowledge, then recommend the next step.`,
        risk: 'low',
        targetType: 'email',
        targetId: email.id,
        source: 'signal_scanner',
        dedupeKey: `unread_email:${email.id}`,
        metadata: {
          stateSignature: `read:${email.read}:date:${email.date || ''}:subject:${email.subject || ''}`
        }
      });
    });

    clientsRes.rows.filter((client: any) => !client.lead_next_step && !client.agent_next_step).slice(0, 30).forEach((client: any) => {
      add({
        title: isZh ? `缺少最佳下一步：${client.name}` : `Missing best next step: ${client.name}`,
        description: isZh ? `该客户没有明确的下一步建议，可能导致跟进停滞。` : `This customer has no clear next-step recommendation, which can stall follow-up.`,
        recommendedAgentId: 'lead_scoring_agent',
        recommendedAgentName: 'Lead Scoring Agent',
        objective: isZh
          ? `分析客户 ${client.id}，生成线索评分、客户摘要和最佳下一步，并保存到 CRM。`
          : `Analyze client ${client.id}, generate lead score, summary, and best next step, then save it to CRM.`,
        risk: 'low',
        targetType: 'client',
        targetId: client.id,
        source: 'signal_scanner',
        dedupeKey: `missing_next_step:client:${client.id}`,
        metadata: {
          stateSignature: `status:${client.status || ''}:score:${client.lead_score ?? ''}:updated:${client.updated_at || ''}:next:${client.lead_next_step || client.agent_next_step || ''}`
        }
      });
    });

    dealsRes.rows.filter((deal: any) => !deal.lead_next_step || deal.lead_score == null).slice(0, 30).forEach((deal: any) => {
      add({
        title: isZh ? `线索待分析：${deal.name}` : `Lead needs analysis: ${deal.name}`,
        description: isZh ? `该线索缺少评分、摘要或最佳下一步。` : `This lead is missing score, summary, or a best next step.`,
        recommendedAgentId: 'lead_scoring_agent',
        recommendedAgentName: 'Lead Scoring Agent',
        objective: isZh
          ? `分析线索 ${deal.id}，生成评分、摘要和最佳下一步，并避免重复评分。`
          : `Analyze lead ${deal.id}, generate score, summary, and best next step while avoiding duplicate scoring.`,
        risk: 'low',
        targetType: 'lead',
        targetId: deal.id,
        source: 'signal_scanner',
        dedupeKey: `missing_score:lead:${deal.id}`,
        metadata: {
          stateSignature: `status:${deal.status || ''}:score:${deal.lead_score ?? ''}:updated:${deal.updated_at || ''}:next:${deal.lead_next_step || ''}`
        }
      });
    });

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    clientsRes.rows.filter((client: any) => {
      const lastContact = client.last_contact ? new Date(client.last_contact).getTime() : new Date(client.updated_at || 0).getTime();
      return lastContact > 0 && lastContact < thirtyDaysAgo && !['Closed Won'].includes(client.status);
    }).slice(0, 25).forEach((client: any) => {
      add({
        title: isZh ? `超过 30 天未跟进：${client.name}` : `No follow-up for 30+ days: ${client.name}`,
        description: isZh ? `该客户长期没有新的沟通记录，建议检查是否需要重新激活。` : `This customer has had no recent contact. Check whether reactivation is needed.`,
        recommendedAgentId: 'follow_up_agent',
        recommendedAgentName: 'AI Follow-Up Agent',
        objective: isZh
          ? `读取客户 ${client.id} 的历史记录，判断是否需要重新激活，并生成内部建议或跟进草稿。`
          : `Read client ${client.id} history, decide whether reactivation is needed, and draft an internal recommendation or follow-up.`,
        risk: 'medium',
        targetType: 'client',
        targetId: client.id,
        source: 'signal_scanner',
        dedupeKey: `inactive_30d:client:${client.id}`,
        metadata: {
          stateSignature: `status:${client.status || ''}:last:${client.last_contact || ''}:updated:${client.updated_at || ''}`
        }
      });
    });

    const trackedEmailThreads = new Map<string, { representative: any; emails: any[]; trackingCount: number }>();
    emailsRes.rows.filter((email: any) => ['sent', 'outbound'].includes(email.type) && Array.isArray(email.tracking_events) && email.tracking_events.length >= 3).forEach((email: any) => {
      const threadKey = getEmailOpportunityThreadKey(email);
      const current = trackedEmailThreads.get(threadKey);
      const emailTime = new Date(email.date || 0).getTime();
      const representativeTime = current ? new Date(current.representative.date || 0).getTime() : -1;
      trackedEmailThreads.set(threadKey, {
        representative: !current || emailTime >= representativeTime ? email : current.representative,
        emails: [...(current?.emails || []), email],
        trackingCount: (current?.trackingCount || 0) + (email.tracking_events?.length || 0)
      });
    });

    Array.from(trackedEmailThreads.entries()).slice(0, 25).forEach(([threadKey, thread]) => {
      const email = thread.representative;
      const client = email.client_id ? clientsById.get(email.client_id) : null;
      const relatedEmailIds = thread.emails.map((item: any) => item.id);
      const baseSubject = normalizeEmailThreadSubject(email.subject);
      add({
        title: isZh ? `邮件多次互动未跟进：${email.subject || email.id}` : `Tracked email has repeated activity: ${email.subject || email.id}`,
        description: isZh ? `该邮件会话已有 ${thread.trackingCount} 次打开/点击记录，涉及 ${thread.emails.length} 封相关已发送邮件，建议合并为一次及时跟进。` : `This email thread has ${thread.trackingCount} open/click event(s) across ${thread.emails.length} related sent email(s). A timely follow-up may improve conversion.`,
        recommendedAgentId: 'follow_up_agent',
        recommendedAgentName: 'AI Follow-Up Agent',
        objective: isZh
          ? `基于邮件会话“${baseSubject}”（代表邮件 ${email.id}${client ? `，客户 ${client.id}` : ''}，相关邮件：${relatedEmailIds.join(', ')}）的互动记录，生成一条合并后的跟进建议或草稿。`
          : `Use tracking activity from email thread "${baseSubject}" represented by ${email.id}${client ? ` and client ${client.id}` : ''}. Related emails: ${relatedEmailIds.join(', ')}. Prepare one consolidated follow-up recommendation or draft.`,
        risk: 'medium',
        targetType: 'email',
        targetId: email.id,
        source: 'signal_scanner',
        dedupeKey: `tracking_activity:thread:${threadKey}`,
        metadata: {
          threadKey,
          normalizedSubject: baseSubject,
          relatedEmailIds,
          trackingCount: thread.trackingCount,
          stateSignature: `tracking:${thread.trackingCount}:emails:${relatedEmailIds.sort().join(',')}:representative:${email.id}`
        }
      });
    });

    return created;
  };

  const summarizeAgentExecutionResult = (result: any, isZh: boolean) => {
    if (!result) return isZh ? '已创建运行。' : 'Run created.';
    const details = Array.isArray(result.details) ? result.details.filter(Boolean).slice(0, 5).join(' ') : '';
    const parts = [
      typeof result.scanned === 'number' ? `${isZh ? '扫描' : 'scanned'} ${result.scanned}` : '',
      typeof result.acted === 'number' ? `${isZh ? '处理' : 'acted'} ${result.acted}` : '',
      typeof result.skipped === 'number' ? `${isZh ? '跳过' : 'skipped'} ${result.skipped}` : '',
      typeof result.failed === 'number' ? `${isZh ? '失败' : 'failed'} ${result.failed}` : ''
    ].filter(Boolean);
    return `${parts.join(' · ')}${details ? ` · ${details}` : ''}` || (typeof result === 'string' ? result : JSON.stringify(result));
  };

  const updateAgentOpportunityInSettings = (settings: any, opportunityId: string, updates: any) => {
    const nowIso = new Date().toISOString();
    settings.agentOpportunities = (Array.isArray(settings.agentOpportunities) ? settings.agentOpportunities : []).map((opportunity: any) => {
      if (opportunity.id !== opportunityId) return opportunity;
      const nextOpportunity = { ...opportunity, ...updates, updatedAt: nowIso };
      rememberAgentOpportunityDedupe(settings, nextOpportunity, { ...updates, updatedAt: nowIso });
      return nextOpportunity;
    });
  };

  const activeOpportunityDispatches = new Set<string>();
  const activeHarnessExecutions = new Set<string>();
  let agentHubSchedulerRunning = false;
  const AGENT_HUB_SCHEDULER_LOCK_KEY = 178020531;

  const findActiveRunForOpportunity = (settings: any, opportunityId: string) => {
    const isActive = (status: string) => !['completed', 'failed', 'rejected'].includes(status);
    const hasOpportunityStep = (steps: any[]) => (steps || []).some((step: any) => step?.payload?.opportunityId === opportunityId);
    const harnessRun = (settings.agentHarnessRuns || []).find((run: any) => isActive(run.status) && hasOpportunityStep(run.steps));
    if (harnessRun) return { relatedRunId: harnessRun.id, relatedRunType: 'harness' as const };
    const globalPlan = (settings.globalAgentPlans || []).find((plan: any) => isActive(plan.status) && hasOpportunityStep(plan.steps));
    if (globalPlan) return { relatedRunId: globalPlan.id, relatedRunType: 'global' as const };
    return null;
  };

  const dispatchAgentOpportunityForUser = async (userId: string, settings: any, opportunityId: string, dispatchMode: 'manual' | 'auto' = 'manual') => {
    const dispatchLockKey = `${userId}:${opportunityId}`;
    if (activeOpportunityDispatches.has(dispatchLockKey)) {
      throw new Error(settings.language === 'zh' ? '该机会任务正在派发中，请勿重复提交。' : 'This opportunity is already being dispatched.');
    }
    activeOpportunityDispatches.add(dispatchLockKey);
    try {
    const opportunities = Array.isArray(settings.agentOpportunities) ? settings.agentOpportunities : [];
    const opportunity = opportunities.find((item: any) => item.id === opportunityId);
    if (!opportunity) throw new Error('Agent opportunity not found');
    if (['completed', 'ignored'].includes(opportunity.status)) throw new Error('Agent opportunity is already closed');
    if (shouldSuppressOpportunityByDedupeLog(settings, opportunity, { ignoreOpportunityId: opportunity.id })) {
      updateAgentOpportunityInSettings(settings, opportunityId, {
        status: 'completed',
        resultSummary: settings.language === 'zh'
          ? '同一机会任务在冷却窗口内且状态未变化，已跳过重复派发。'
          : 'Duplicate opportunity skipped because the same state is still inside the dispatch cooldown window.',
        completedAt: new Date().toISOString()
      });
      return {
        opportunityId,
        relatedRunId: null,
        relatedRunType: 'harness',
        reviewStatus: 'skipped',
        executionResult: {
          scanned: 0,
          acted: 0,
          skipped: 1,
          failed: 0,
          details: [settings.language === 'zh' ? '已按机会任务派发记忆跳过。' : 'Skipped by opportunity dispatch memory.']
        }
      };
    }
    if (opportunity.relatedRunId || !['open', 'failed'].includes(opportunity.status || 'open')) {
      throw new Error(settings.language === 'zh' ? '该机会任务已派发或正在处理中。' : 'This opportunity has already been dispatched or is already in progress.');
    }
    const existingRun = findActiveRunForOpportunity(settings, opportunityId);
    if (existingRun) {
      updateAgentOpportunityInSettings(settings, opportunityId, {
        status: 'pending_review',
        relatedRunId: existingRun.relatedRunId,
        relatedRunType: existingRun.relatedRunType,
        resultSummary: settings.language === 'zh' ? '该机会任务已有待处理的智能体运行，已复用现有审核项。' : 'This opportunity already has an active agent run; reusing the existing review item.'
      });
      throw new Error(settings.language === 'zh' ? '该机会任务已有待处理的智能体运行。' : 'This opportunity already has an active agent run.');
    }

    const agents = Array.isArray(settings.agentHubAgents) ? settings.agentHubAgents : [];
    const agent = agents.find((item: any) => item.id === opportunity.recommendedAgentId);
    if (!agent) throw new Error('Recommended agent was not found');
    if (agent.status === 'paused') throw new Error('Recommended agent is paused');

    const isZh = settings.language === 'zh';
    const nowIso = new Date().toISOString();
    const reviewStatus = agent.guardrail === 'auto' ? 'approved' : 'pending_review';
    const relatedRunType: 'global' | 'harness' = agent.id === 'global_agent' ? 'global' : 'harness';
    const relatedRunId = relatedRunType === 'global'
      ? `gplan_opp_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      : `harness_opp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const objective = `${opportunity.objective}\n\n${isZh ? '来源机会任务' : 'Source opportunity'}: ${opportunity.title}\n${agent.instructions || ''}`;
    const expectedResult = isZh
      ? `1. 读取机会任务和目标主体上下文。\n2. 确认推荐 Agent、工具权限和护栏策略。\n3. 创建可追踪的执行/审核项。\n4. 若策略允许自动执行，则运行授权工具并回写机会任务结果。\n5. 若需要审核，则保持机会任务为待审核状态，等待人工确认。`
      : `1. Read the opportunity and target context.\n2. Confirm the recommended agent, tool permissions, and guardrail policy.\n3. Create a traceable execution or review item.\n4. If policy allows auto execution, run authorized tools and write the result back to the opportunity.\n5. If approval is required, keep the opportunity in pending review until a human confirms it.`;
    const actualResult = reviewStatus === 'approved'
      ? (isZh ? '机会任务已派发，并根据 Agent 护栏策略自动进入执行。' : 'Opportunity dispatched and auto-approved by the agent guardrail policy.')
      : (isZh ? '机会任务已派发，并创建待审核执行项。' : 'Opportunity dispatched and a review-gated execution item was created.');

    const localizedObjective = isZh
      ? `机会任务执行：${opportunity.title}\n\n目标：${opportunity.objective}\n\n负责智能体：${agent.name}\n指令：${agent.instructions || ''}`
      : `Opportunity execution: ${opportunity.title}\n\nObjective: ${opportunity.objective}\n\nResponsible agent: ${agent.name}\nInstructions: ${agent.instructions || ''}`;
    const localizedExpectedResult = isZh
      ? `1. 读取机会任务和目标主体上下文。\n2. 确认推荐智能体、工具权限和护栏策略。\n3. 创建可追踪的执行或审核项。\n4. 若策略允许自动执行，则运行授权工具并回写机会任务结果。\n5. 若需要审核，则保持机会任务为待审核状态，等待人工确认。`
      : expectedResult;
    const localizedActualResult = reviewStatus === 'approved'
      ? (isZh ? '机会任务已派发，并根据智能体护栏策略自动进入执行。' : actualResult)
      : (isZh ? '机会任务已派发，并创建待审核执行项。' : actualResult);

    updateAgentOpportunityInSettings(settings, opportunityId, {
      status: reviewStatus === 'approved' && relatedRunType === 'harness' ? 'running' : 'pending_review',
      relatedRunId,
      relatedRunType,
      dispatchMode,
      dispatchedAt: nowIso,
      resultSummary: localizedActualResult
    });

    if (relatedRunType === 'global') {
      settings.globalAgentPlans = [{
        id: relatedRunId,
        objective: localizedObjective,
        summary: isZh ? `机会任务派发：${agent.name}` : `Opportunity dispatch: ${agent.name}`,
        status: reviewStatus,
        steps: [{
          id: `step_opp_${Date.now()}_${agent.id}`,
          title: opportunity.title,
          description: opportunity.description || agent.instructions || '',
          actionType: 'review_pipeline',
          status: 'pending',
          payload: { source: 'agent-opportunity', opportunityId, agentId: agent.id, tools: agent.tools || [], targetType: opportunity.targetType, targetId: opportunity.targetId }
        }],
        createdAt: nowIso,
        updatedAt: nowIso
      }, ...(settings.globalAgentPlans || [])];
    } else {
      settings.agentHarnessRuns = [{
        id: relatedRunId,
        objective: localizedObjective,
        summary: isZh ? `机会任务派发：${agent.name}` : `Opportunity dispatch: ${agent.name}`,
        status: reviewStatus,
        steps: buildHarnessStepsForAgent(agent, {
          status: reviewStatus === 'approved' ? 'approved' : 'pending',
          payload: { source: 'agent-opportunity', opportunityId, targetType: opportunity.targetType, targetId: opportunity.targetId }
        }).map((step: any, index: number) => ({
          ...step,
          title: index === 0 ? opportunity.title : step.title,
          description: opportunity.description || step.description,
          risk: opportunity.risk || step.risk
        })),
        createdAt: nowIso,
        updatedAt: nowIso
      }, ...(settings.agentHarnessRuns || [])];
    }

    const record = addAgentHubRunRecordToSettings(settings, {
      agentId: agent.id,
      agentName: agent.name,
      trigger: dispatchMode === 'auto' ? 'system' : 'manual',
      status: reviewStatus,
      plan: localizedObjective,
      expectedResult: localizedExpectedResult,
      actualResult: localizedActualResult,
      relatedRunId,
      relatedRunType,
      completedAt: reviewStatus === 'pending_review' ? nowIso : undefined
    });

    let executionResult = null;
    if (reviewStatus === 'approved' && relatedRunType === 'harness') {
      try {
        executionResult = await executeAgentHubHarnessRun(userId, settings, relatedRunId);
        const resultSummary = summarizeAgentExecutionResult(executionResult, isZh);
        updateAgentOpportunityInSettings(settings, opportunityId, {
          status: executionResult?.failed > 0 && !executionResult?.acted ? 'failed' : 'completed',
          resultSummary,
          completedAt: new Date().toISOString()
        });
      } catch (error: any) {
        updateAgentHubRunRecordInSettings(settings, record.id, {
          status: 'failed',
          actualResult: error?.message || 'Opportunity execution failed.',
          completedAt: new Date().toISOString()
        });
        updateAgentOpportunityInSettings(settings, opportunityId, {
          status: 'failed',
          resultSummary: error?.message || 'Opportunity execution failed.',
          completedAt: new Date().toISOString()
        });
        throw error;
      }
    }

    return { opportunityId, relatedRunId, relatedRunType, reviewStatus, executionResult };
    } finally {
      activeOpportunityDispatches.delete(dispatchLockKey);
    }
  };

  const getOpportunityRoutingPolicy = (settings: any) => ({
    enabled: true,
    autoExecuteLowRisk: true,
    routeMediumRiskToReview: true,
    routeHighRiskToReview: false,
    maxAutoDispatchPerRun: 10,
    ...(settings.agentOpportunityRoutingPolicy || {})
  });

  const shouldAutoRouteOpportunity = (opportunity: any, agent: any, policy: any) => {
    if (!policy.enabled || !agent || agent.status === 'paused') return false;
    if (opportunity.relatedRunId) return false;
    if (!['open', 'failed'].includes(opportunity.status || 'open')) return false;
    const risk = opportunity.risk || 'medium';
    if (risk === 'low') return policy.autoExecuteLowRisk && agent.guardrail === 'auto';
    if (risk === 'medium') return !!policy.routeMediumRiskToReview && agent.guardrail !== 'auto';
    if (risk === 'high') return !!policy.routeHighRiskToReview && agent.guardrail !== 'auto';
    return false;
  };

  const routeAgentOpportunitiesForUser = async (userId: string, settings: any) => {
    const policy = getOpportunityRoutingPolicy(settings);
    if (!policy.enabled) return { routed: 0, executed: 0, review: 0, failed: 0, details: [] as string[] };
    const agents = Array.isArray(settings.agentHubAgents) ? settings.agentHubAgents : [];
    const opportunities = (Array.isArray(settings.agentOpportunities) ? settings.agentOpportunities : [])
      .filter((opportunity: any) => ['open', 'failed'].includes(opportunity.status || 'open'));
    const max = Math.max(0, Number(policy.maxAutoDispatchPerRun || 10));
    const result = { routed: 0, executed: 0, review: 0, failed: 0, details: [] as string[] };

    for (const opportunity of opportunities) {
      if (result.routed >= max) break;
      const agent = agents.find((item: any) => item.id === opportunity.recommendedAgentId);
      if (shouldSuppressOpportunityByDedupeLog(settings, opportunity, { ignoreOpportunityId: opportunity.id })) {
        updateAgentOpportunityInSettings(settings, opportunity.id, {
          status: 'completed',
          resultSummary: settings.language === 'zh'
            ? '同一机会任务在冷却窗口内且状态未变化，已跳过重复派发。'
            : 'Duplicate opportunity skipped because the same state is still inside the dispatch cooldown window.',
          completedAt: new Date().toISOString()
        });
        result.details.push(`${opportunity.id}: skipped_by_dedupe_memory`);
        continue;
      }
      if (!shouldAutoRouteOpportunity(opportunity, agent, policy)) continue;
      try {
        const dispatch = await dispatchAgentOpportunityForUser(userId, settings, opportunity.id, 'auto');
        result.routed += 1;
        if (dispatch.reviewStatus === 'pending_review') result.review += 1;
        if (dispatch.executionResult && dispatch.reviewStatus !== 'skipped') result.executed += 1;
        result.details.push(`${opportunity.id}: ${dispatch.reviewStatus}`);
      } catch (error: any) {
        result.failed += 1;
        result.details.push(`${opportunity.id}: ${error?.message || 'failed'}`);
      }
    }
    return result;
  };

  const runAgentHubScheduler = async () => {
    const summary: any = { users: 0, configuredAgents: 0, dueAgents: 0, recordsCreated: 0, opportunitiesCreated: 0, opportunitiesRouted: 0, opportunitiesExecuted: 0, opportunitiesReview: 0, errors: 0, agents: [] };
    let schedulerLockClient: any = null;
    let schedulerLockAcquired = false;
    if (agentHubSchedulerRunning) return summary;
    agentHubSchedulerRunning = true;
    try {
      if (!pool) return;
      schedulerLockClient = await pool.connect();
      const lockRes = await schedulerLockClient.query('SELECT pg_try_advisory_lock($1) AS locked', [AGENT_HUB_SCHEDULER_LOCK_KEY]);
      schedulerLockAcquired = Boolean(lockRes.rows[0]?.locked);
      if (!schedulerLockAcquired) return summary;
      const usersRes = await schedulerLockClient.query(`
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
          const isZh = settings.language === 'zh';
          if (agent.id === 'signal_scanner_agent') {
            const startedRecord = addAgentHubRunRecordToSettings(settings, {
              agentId: agent.id,
              agentName: agent.name,
              trigger: 'scheduled',
              status: 'running',
              plan: isZh ? '扫描 CRM 信号并生成智能体机会任务。' : 'Scan CRM signals and generate agent opportunity tasks.',
              expectedResult: isZh ? '生成去重后的可执行机会任务，并推荐负责智能体。' : 'Create deduplicated actionable tasks and recommend the responsible agent.',
              actualResult: isZh ? 'Signal Scanner 已开始扫描。' : 'Signal Scanner started.'
            });
            summary.recordsCreated += 1;
            try {
              const opportunities = await scanAgentOpportunitiesForUser(user.id, settings);
              const routed = await routeAgentOpportunitiesForUser(user.id, settings);
              summary.opportunitiesCreated += opportunities.length;
              summary.opportunitiesRouted += routed.routed;
              summary.opportunitiesExecuted += routed.executed;
              summary.opportunitiesReview += routed.review;
              summary.errors += routed.failed;
              updateAgentHubRunRecordInSettings(settings, startedRecord.id, {
                status: 'completed',
                actualResult: isZh
                  ? `扫描完成：新增 ${opportunities.length} 个机会任务，自动路由 ${routed.routed} 个，进入审核 ${routed.review} 个，已自动执行 ${routed.executed} 个，失败 ${routed.failed} 个。`
                  : `Scan completed: created ${opportunities.length} opportunity task(s), routed ${routed.routed}, sent ${routed.review} to review, auto-executed ${routed.executed}, failed ${routed.failed}.`,
                completedAt: new Date().toISOString()
              });
              const nextRunCount = (agent.scheduleRunCount || 0) + 1;
              agent.lastRunAt = new Date(now).toISOString();
              agent.scheduleRunCount = nextRunCount;
              agent.scheduleEnabled = agent.scheduleMaxRuns != null && nextRunCount >= agent.scheduleMaxRuns ? false : agent.scheduleEnabled;
              agent.tasksCompleted = (agent.tasksCompleted || 0) + opportunities.length;
              agent.updatedAt = new Date().toISOString();
            } catch (error: any) {
              summary.errors += 1;
              updateAgentHubRunRecordInSettings(settings, startedRecord.id, {
                status: 'failed',
                actualResult: isZh ? `Signal Scanner 扫描失败：${error?.message || '未知错误'}` : (error?.message || 'Signal Scanner failed.'),
                completedAt: new Date().toISOString()
              });
            }
            changed = true;
            continue;
          }
          const objective = agent.id === 'follow_up_agent'
            ? `Scheduled run for ${agent.name}: ${agent.instructions}. Use Lead Scoring Agent outputs when available and do not repeat lead scoring or lead summaries.`
            : `Scheduled run for ${agent.name}: ${agent.instructions || ''}`;
          const expectedResult = agent.id === 'global_agent'
            ? (isZh ? '创建或更新全局 Agent 转化协同计划。' : 'Create or update a Global Agent plan for conversion coordination.')
            : agent.id === 'lead_scoring_agent'
              ? (isZh ? '扫描符合条件的线索，跳过未变化线索，并在需要时更新评分、摘要和最佳下一步。' : 'Scan eligible leads, skip unchanged leads, and update score/summary/next step when needed.')
              : (isZh
                ? `审核通过后执行 ${agent.name} 的配置工作流：读取符合条件的客户上下文，检查幂等和风险规则，生成适合渠道的外发内容，执行已授权工具（${(agent.tools || []).join(', ') || 'agent tools'}），更新 CRM 日志/状态，并汇总扫描、执行、跳过、失败数量。`
                : `Run the configured ${agent.name} workflow after approval: read eligible customer context, check idempotency and risk rules, generate channel-appropriate outbound content, execute permitted tools (${(agent.tools || []).join(', ') || 'agent tools'}), update CRM logs/status, and report scanned/acted/skipped/failed counts.`);
          const localizedScheduledObjective = isZh
            ? `定期运行：${agent.name}\n\n${agent.instructions || ''}`
            : objective;
          const localizedSchedulerExpectedResult = isZh
            ? `1. 定期触发先进入机会任务队列。\n2. 策略路由器判断是否自动执行、进入审核或保留待派发。\n3. 执行时按该智能体配置的工具链运行：${(agent.tools || []).join(', ') || 'agent tools'}。\n4. 写入机会任务、追踪日志和运行记录。`
            : 'Scheduled triggers enqueue an opportunity first. The policy router decides whether to auto-execute, send to review, or keep it for manual dispatch.';
          const localizedSchedulerActualResult = isZh
            ? '正在创建机会任务并应用路由策略。'
            : 'Creating an opportunity and applying routing policy.';
          const schedulerRecord = addAgentHubRunRecordToSettings(settings, {
            agentId: agent.id,
            agentName: agent.name,
            trigger: 'scheduled',
            status: 'running',
            plan: localizedScheduledObjective,
            expectedResult: localizedSchedulerExpectedResult,

            actualResult: localizedSchedulerActualResult
          });
          summary.recordsCreated += 1;
          try {
            const tools = Array.isArray(agent.tools) ? agent.tools : [];
            const scheduledRisk = tools.some((tool: string) => ['email.send', 'whatsapp.send', 'quote.create'].includes(tool))
              ? 'high'
              : (agent.guardrail === 'auto' ? 'low' : 'medium');
            const opportunity = addAgentOpportunityToSettings(settings, {
              title: isZh ? `定期任务：${agent.name}` : `Scheduled task: ${agent.name}`,
              description: isZh
                ? '该任务由智能体定期运行配置触发，已统一进入机会任务队列。'
                : 'This task was triggered by the agent schedule and routed through the opportunity queue.',
              recommendedAgentId: agent.id,
              recommendedAgentName: agent.name,
              objective,
              risk: scheduledRisk,
              targetType: 'system',
              source: 'agent_schedule',
              dedupeKey: `scheduled_agent:${agent.id}`
            });
            const routed = await routeAgentOpportunitiesForUser(user.id, settings);
            summary.opportunitiesCreated += opportunity ? 1 : 0;
            summary.opportunitiesRouted += routed.routed;
            summary.opportunitiesExecuted += routed.executed;
            summary.opportunitiesReview += routed.review;
            summary.errors += routed.failed;
            updateAgentHubRunRecordInSettings(settings, schedulerRecord.id, {
              status: 'completed',
              actualResult: isZh
                ? `已进入三层机制：新增机会任务 ${opportunity ? 1 : 0} 个，自动路由 ${routed.routed} 个，进入审核 ${routed.review} 个。`
                : `Routed through the three-layer flow: created ${opportunity ? 1 : 0} opportunity, auto-routed ${routed.routed}, sent ${routed.review} to review.`,
              completedAt: new Date().toISOString()
            });
            const nextRunCount = (agent.scheduleRunCount || 0) + 1;
            agent.lastRunAt = new Date(now).toISOString();
            agent.scheduleRunCount = nextRunCount;
            agent.scheduleEnabled = agent.scheduleMaxRuns != null && nextRunCount >= agent.scheduleMaxRuns ? false : agent.scheduleEnabled;
            agent.tasksCompleted = (agent.tasksCompleted || 0) + (opportunity ? 1 : 0);
            agent.updatedAt = new Date().toISOString();
          } catch (error: any) {
            summary.errors += 1;
            updateAgentHubRunRecordInSettings(settings, schedulerRecord.id, {
              status: 'failed',
              actualResult: error?.message || 'Scheduled opportunity routing failed.',
              completedAt: new Date().toISOString()
            });
          }
          changed = true;
          continue;
          const startedRecord = addAgentHubRunRecordToSettings(settings, {
            agentId: agent.id,
            agentName: agent.name,
            trigger: 'scheduled',
            status: 'running',
            plan: localizedScheduledObjective,
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
                ? (isZh ? '后端调度器已创建该智能体运行，并根据护栏策略自动批准。' : 'Backend scheduler created and auto-approved the agent run according to guardrail policy.')
                : (isZh ? '后端调度器已创建该智能体运行，正在等待人工审核。' : 'Backend scheduler created the agent run and is waiting for human approval.'),
              relatedRunId,
              relatedRunType,
              completedAt: new Date().toISOString()
            });

            const nextRunCount = (agent.scheduleRunCount || 0) + 1;
            agent.lastRunAt = new Date(now).toISOString();
            agent.scheduleRunCount = nextRunCount;
            agent.scheduleEnabled = agent.scheduleMaxRuns != null && nextRunCount >= agent.scheduleMaxRuns ? false : agent.scheduleEnabled;
            agent.tasksCompleted = (agent.tasksCompleted || 0) + 1;
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
          await schedulerLockClient.query(
            'UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(settings), user.id]
          );
        }
      }
    } catch (e) {
      summary.errors += 1;
      console.error('Failed to run Agent Hub scheduler:', e);
    } finally {
      if (schedulerLockClient) {
        if (schedulerLockAcquired) {
          await schedulerLockClient.query('SELECT pg_advisory_unlock($1)', [AGENT_HUB_SCHEDULER_LOCK_KEY]).catch(() => undefined);
        }
        schedulerLockClient.release();
      }
      agentHubSchedulerRunning = false;
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

  app.post('/api/agent-hub/logs/clear', authenticateToken, async (req: any, res) => {
    try {
      const target = String(req.body?.target || 'records');
      const result = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.uid]);
      const settings = typeof result.rows[0]?.settings === 'string'
        ? JSON.parse(result.rows[0].settings || '{}')
        : (result.rows[0]?.settings || {});

      if (target === 'trace' || target === 'all') {
        settings.agentHarnessRuns = [];
        settings.globalAgentPlans = [];
      }
      if (target === 'records' || target === 'all') {
        settings.agentRunRecords = [];
      }

      const updated = await pool.query(
        'UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING settings',
        [JSON.stringify(settings), req.user.uid]
      );
      res.json(updated.rows[0]?.settings || settings);
    } catch (e: any) {
      console.error('Failed to clear Agent Hub logs', e);
      res.status(500).json({ error: e.message || 'Failed to clear Agent Hub logs' });
    }
  });

  const parseJsonArray = (value: any) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const findContactValue = (client: any, types: string[]) => {
    const methods = [
      ...parseJsonArray(client.contact_methods),
      ...parseJsonArray(client.contacts).flatMap((contact: any) => contact.contactMethods || [])
    ];
    const match = methods.find((method: any) => types.includes(String(method.type || '').toLowerCase()) && method.value);
    return match?.value || '';
  };

  const stripAgentJson = (raw: string) => {
    const cleaned = String(raw || '').replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
  };

  const buildHarnessStepsForAgent = (agent: any, base: any = {}) => {
    const tools = Array.isArray(agent.tools) && agent.tools.length ? agent.tools : ['agent.run'];
    return tools.map((tool: string, index: number) => ({
      id: `hstep_${Date.now()}_${index}_${agent.id}`,
      agentId: agent.id,
      title: tool,
      description: agent.instructions || '',
      tool,
      risk: ['email.send', 'whatsapp.send', 'quote.create', 'product.delete'].includes(tool)
        ? 'high'
        : ['lead.acquire', 'lead.create', 'lead.update', 'client.update', 'product.update', 'email.schedule'].includes(tool)
          ? 'medium'
          : (agent.guardrail === 'auto' ? 'low' : 'medium'),
      status: base.status || 'pending',
      payload: {
        ...(base.payload || {}),
        agentId: agent.id,
        tools
      }
    }));
  };

  const executeAgentHubHarnessRun = async (userId: string, settings: any, runId: string) => {
    const isZh = settings.language === 'zh';
    const runs = Array.isArray(settings.agentHarnessRuns) ? settings.agentHarnessRuns : [];
    const run = runs.find((item: any) => item.id === runId);
    if (!run) throw new Error('Agent Harness run not found');
    const firstStep = run.steps?.[0] || {};
    const agentId = firstStep.payload?.agentId || firstStep.agentId;
    const agents = Array.isArray(settings.agentHubAgents) ? settings.agentHubAgents : [];
    const agent = agents.find((item: any) => item.id === agentId);
    if (!agent) throw new Error('Agent configuration not found');

    const tools = Array.isArray(agent.tools) ? agent.tools : [];
    if (tools.includes('lead.acquire')) {
      return executeLeadAcquisitionAgentRun(userId, settings, run, agent);
    }
    const canSendEmail = tools.includes('email.send');
    const canSendWhatsApp = tools.includes('whatsapp.send');
    const canLog = tools.includes('client.log') || tools.includes('lead.log');
    const canUpdateClient = tools.includes('client.update') || tools.includes('lead.update');
    const canAnalyze = tools.some((tool: string) => ['lead.analyze', 'lead.score', 'client.summarize', 'next_step.recommend', 'product.read', 'knowledge.search', 'knowledge.read'].includes(tool));
    if (!canSendEmail && !canSendWhatsApp && !canLog && !canUpdateClient && canAnalyze) {
      return executeInsightAgentRun(userId, settings, run, agent);
    }
    if (!canSendEmail && !canSendWhatsApp && !canLog && !canUpdateClient) {
      throw new Error('Agent has no executable tools configured');
    }

    const llmId = settings.llmMappings?.agent_harness || settings.llmMappings?.drafting || settings.activeLLMId;
    const llmConfig = llmId ? (settings.llmConfigs || []).find((config: any) => config.id === llmId) : null;
    const nowIso = new Date().toISOString();
    const outbox = (settings.outboxConfigs || [])[0] || {};
    const sender = outbox.fromEmail || 'AutoAgent';
    const senderName = outbox.fromName || agent.name || 'AutoAgent';
    const batchLimit = Math.max(1, Math.min(10, Number(agent.batchSize || 5)));
    const eventPayload = firstStep.payload?.eventPayload || {};
    const eventScope = firstStep.payload?.eventScope || agent.eventTriggerScope || 'subject';
    const subjectClientIds = new Set<string>();
    const payloadTargetType = firstStep.payload?.targetType;
    const payloadTargetId = firstStep.payload?.targetId;
    const directClientId = eventPayload.clientId || eventPayload.client?.id || eventPayload.customerId || eventPayload.customer?.id;
    if (directClientId) subjectClientIds.add(String(directClientId));
    if (payloadTargetType === 'client' && payloadTargetId) subjectClientIds.add(String(payloadTargetId));
    const leadId = eventPayload.leadId || eventPayload.lead?.id || eventPayload.dealId || eventPayload.deal?.id;
    const payloadLeadId = payloadTargetType === 'lead' ? payloadTargetId : null;
    if (leadId || payloadLeadId) {
      const leadClientRes = await pool.query(
        `SELECT client_id FROM deals WHERE id = $1 AND user_id = $2 AND client_id IS NOT NULL`,
        [String(leadId || payloadLeadId), userId]
      );
      leadClientRes.rows.forEach((row: any) => row.client_id && subjectClientIds.add(String(row.client_id)));
    }
    const emailIds = [
      ...(Array.isArray(eventPayload.emailIds) ? eventPayload.emailIds : []),
      ...(eventPayload.emailId ? [eventPayload.emailId] : []),
      ...(payloadTargetType === 'email' && payloadTargetId ? [payloadTargetId] : [])
    ].filter(Boolean);
    if (emailIds.length > 0) {
      const emailClientRes = await pool.query(
        `SELECT DISTINCT client_id FROM emails WHERE user_id = $1 AND id = ANY($2::text[]) AND client_id IS NOT NULL`,
        [userId, emailIds.map((id: any) => String(id))]
      );
      emailClientRes.rows.forEach((row: any) => row.client_id && subjectClientIds.add(String(row.client_id)));
    }
    const subjectOnly = eventScope !== 'global';
    const clientsRes = subjectOnly && subjectClientIds.size > 0
      ? await pool.query(
        `SELECT *
         FROM clients
         WHERE user_id = $1
           AND id = ANY($2::text[])
           AND COALESCE(status, '') <> 'Closed Won'
         ORDER BY updated_at DESC NULLS LAST, last_contact NULLS FIRST
         LIMIT 30`,
        [userId, Array.from(subjectClientIds)]
      )
      : subjectOnly
        ? { rows: [] }
        : await pool.query(
          `SELECT *
           FROM clients
           WHERE user_id = $1
             AND COALESCE(status, '') <> 'Closed Won'
           ORDER BY updated_at DESC NULLS LAST, last_contact NULLS FIRST
           LIMIT 30`,
          [userId]
        );

    let scanned = 0;
    let acted = 0;
    let skipped = 0;
    let failed = 0;
    const details: string[] = [];
    if (subjectOnly && subjectClientIds.size === 0) {
      details.push(isZh
        ? '事件主体模式：未找到事件关联的客户/线索主体，已跳过全局扫描。'
        : 'Event subject mode: no related client/lead subject was found, so global scanning was skipped.');
    }

    for (const client of clientsRes.rows) {
      if (acted >= batchLimit) break;
      scanned += 1;
      try {
        const emailAddress = findContactValue(client, ['email']);
        const whatsappAddress = findContactValue(client, ['whatsapp', 'phone']);
        if ((canSendEmail && !emailAddress) && (canSendWhatsApp && !whatsappAddress)) {
          skipped += 1;
          details.push(isZh ? `${client.id}：已跳过，没有可用的外发联系方式。` : `${client.id}: skipped, no usable outbound contact.`);
          continue;
        }

        const recentMarker = await pool.query(
          `SELECT id FROM logs
           WHERE client_id = $1
             AND content ILIKE $2
             AND date > NOW() - INTERVAL '30 days'
           LIMIT 1`,
          [client.id, `%Agent ${agent.id}%`]
        );
        if (recentMarker.rows.length > 0) {
          skipped += 1;
          details.push(isZh ? `${client.id}：已按幂等窗口跳过。` : `${client.id}: skipped by idempotency window.`);
          continue;
        }

        const emailsRes = await pool.query(
          `SELECT sender, recipient, subject, body, date, type
           FROM emails
           WHERE client_id = $1 AND user_id = $2
           ORDER BY date DESC
           LIMIT 8`,
          [client.id, userId]
        );
        const logsRes = await pool.query(
          `SELECT date, content, type
           FROM logs
           WHERE client_id = $1
           ORDER BY date DESC
           LIMIT 8`,
          [client.id]
        );
        const productsRes = await pool.query(
          `SELECT sku, name, description, sales_points, bulk_prices
           FROM products
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 5`,
          [userId]
        );
        const kbRes = await searchKnowledgeBase(
          userId,
          client.id,
          `${agent.name} ${client.company || client.name || ''} ${client.country || ''}`,
          llmConfig,
          5
        );

        const latestCustomerMessage = emailsRes.rows.find((email: any) => ['inbox', 'inbound'].includes(email.type)) || emailsRes.rows[0];
        const outboundLanguage = getCustomerOutputLanguage({
          lastCommunicationText: latestCustomerMessage?.body,
          preferredLanguage: client.preferred_language,
          country: client.country
        });
        const prompt = `You are executing a configured CRM Agent.
Agent name: ${agent.name}
Agent instructions:
${agent.instructions || ''}

Allowed tools: ${tools.join(', ')}

Client:
${JSON.stringify({
  id: client.id,
  name: client.name,
  company: client.company,
  country: client.country,
  status: client.status,
  preferredLanguage: client.preferred_language,
  preferredTimeRange: client.preferred_time_range,
  contacts: parseJsonArray(client.contacts),
  contactMethods: parseJsonArray(client.contact_methods)
}, null, 2)}

Recent emails:
${JSON.stringify(emailsRes.rows, null, 2)}

Recent logs:
${JSON.stringify(logsRes.rows, null, 2)}

Knowledge base:
${kbRes.rows.map((kb: any) => `[${kb.title}]\n${kb.content}`).join('\n\n')}

Products:
${JSON.stringify(productsRes.rows, null, 2)}

Rules:
${buildLanguagePolicy({ systemLanguage: settings.language, customerLanguage: outboundLanguage })}
- Internal CRM fields include clientNote, clientUpdate, nextAction, run summaries, skip reasons, and risk notes.
- Customer-facing fields include emailSubject, emailBody, whatsappBody, quote/proposal text, and any message visible to the customer.
- Do not duplicate prior outreach. If no useful ice-breaking action is appropriate, set channel to "none".
- If sensitive promotion/complaint/legal-risk content would be needed, set requiresApproval true and do not produce send-ready content.
- Keep email concise and professional. Keep WhatsApp natural and shorter.

Return JSON only:
{
  "channel": "email" | "whatsapp" | "both" | "none",
  "language": "language actually used",
  "emailSubject": "subject if email is needed",
  "emailBody": "HTML or plain text body if email is needed",
  "whatsappBody": "WhatsApp body if WhatsApp is needed",
  "clientNote": "internal CRM note/log",
  "clientUpdate": { "status": "optional CRM status" },
  "requiresApproval": false,
  "nextAction": "recommended next action"
}`;

        const parsed = stripAgentJson(await callAI(prompt, llmConfig, true));
        if (parsed.requiresApproval || parsed.channel === 'none') {
          if (canLog) {
            await pool.query(
              `INSERT INTO logs (id, client_id, date, content, type, metadata)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [`l${Date.now()}${Math.floor(Math.random() * 1000)}`, client.id, nowIso, `Agent ${agent.id} reviewed client but did not send. ${parsed.clientNote || parsed.nextAction || ''}`, 'general', JSON.stringify({ agentId: agent.id, requiresApproval: !!parsed.requiresApproval })]
            );
          }
          skipped += 1;
          details.push(isZh
            ? `${client.id}：已分析，未发送${parsed.requiresApproval ? '（需要审批）' : ''}。`
            : `${client.id}: reviewed, no send${parsed.requiresApproval ? ' (needs approval)' : ''}.`);
          continue;
        }

        const sent: string[] = [];
        if (canSendEmail && ['email', 'both'].includes(parsed.channel) && parsed.emailBody && emailAddress) {
          const emailId = `e${Date.now()}${Math.floor(Math.random() * 1000)}`;
          await pool.query(
            `INSERT INTO emails (id, user_id, client_id, sender, sender_name, recipient, subject, body, date, read, type, outbox_config_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 'sent', $10)`,
            [emailId, userId, client.id, sender, senderName, emailAddress, parsed.emailSubject || `Hello from ${senderName}`, parsed.emailBody, nowIso, outbox.id || null]
          );
          sent.push(`email:${emailAddress}`);
        }

        if (canSendWhatsApp && ['whatsapp', 'both'].includes(parsed.channel) && parsed.whatsappBody && whatsappAddress) {
          const to = normalizeWhatsAppPhone(whatsappAddress);
          await sendWhatsAppViaHub(userId, {
            to,
            body: parsed.whatsappBody,
            metadata: { source: 'agent-hub-executor', agentId: agent.id, clientId: client.id }
          });
          sent.push(`whatsapp:${to}`);
        }

        if (sent.length === 0) {
          skipped += 1;
          details.push(isZh ? `${client.id}：未生成匹配渠道的内容。` : `${client.id}: no matching channel content generated.`);
          continue;
        }

        if (canLog) {
          await pool.query(
            `INSERT INTO logs (id, client_id, date, content, type, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [`l${Date.now()}${Math.floor(Math.random() * 1000)}`, client.id, nowIso, `Agent ${agent.id} executed ice-breaking outreach via ${sent.join(', ')}. Language: ${parsed.language || outboundLanguage}. ${parsed.clientNote || parsed.nextAction || ''}`, sent.some(item => item.startsWith('whatsapp')) ? 'whatsapp' : 'email', JSON.stringify({ agentId: agent.id, sent, language: parsed.language || outboundLanguage })]
          );
        }

        if (canUpdateClient) {
          const allowedStatuses = ['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'];
          const statusUpdate = allowedStatuses.includes(parsed.clientUpdate?.status) ? parsed.clientUpdate.status : (client.status === 'Leads' ? 'Contacted' : client.status);
          await pool.query(
            `UPDATE clients SET status = $1, last_contact = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
            [statusUpdate, nowIso.slice(0, 10), client.id]
          );
        }

        acted += 1;
        details.push(isZh ? `${client.id}：已发送 ${sent.join(', ')}。` : `${client.id}: sent ${sent.join(', ')}.`);
      } catch (error: any) {
        failed += 1;
        details.push(isZh ? `${client.id}：失败 - ${error?.message || '未知错误'}。` : `${client.id}: failed - ${error?.message || 'unknown error'}.`);
      }
    }

    const resultText = isZh
      ? `工作流已完成：扫描 ${scanned} 个客户，执行 ${acted} 个，跳过 ${skipped} 个，失败 ${failed} 个。${details.slice(0, 8).join(' ')}`
      : `Workflow completed: scanned ${scanned} client(s), acted on ${acted}, skipped ${skipped}, failed ${failed}. ${details.slice(0, 8).join(' ')}`;
    run.status = failed > 0 && acted === 0 ? 'failed' : 'completed';
    run.completedAt = new Date().toISOString();
    run.steps = (run.steps || []).map((step: any) => ({
      ...step,
      status: run.status === 'failed' ? 'failed' : 'completed',
      result: resultText,
      error: run.status === 'failed' ? resultText : undefined
    }));

    const record = (settings.agentRunRecords || []).find((item: any) => item.relatedRunId === runId && item.relatedRunType === 'harness');
    if (record) {
      record.status = run.status === 'failed' ? 'failed' : 'completed';
      record.actualResult = resultText;
      record.completedAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
    }

    agent.tasksCompleted = (agent.tasksCompleted || 0) + Math.max(1, acted);
    agent.evolutionLog = [{
      id: `evo_run_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      source: 'run_reflection',
      summary: isZh ? '运行复盘' : 'Run reflection',
      proposal: isZh
        ? `本次运行结果：扫描 ${scanned} 个客户，执行 ${acted} 个，跳过 ${skipped} 个，失败 ${failed} 个。后续应保留有效幂等检查，并根据失败/跳过原因优化目标客户选择和消息策略。`
        : `Run result: scanned ${scanned} client(s), acted on ${acted}, skipped ${skipped}, failed ${failed}. Preserve useful idempotency checks and refine targeting or messaging based on failure/skip reasons.`,
      status: 'proposed',
      createdAt: new Date().toISOString()
    }, ...(agent.evolutionLog || [])].slice(0, 50);
    agent.updatedAt = new Date().toISOString();
    return { scanned, acted, skipped, failed, details };
  };

  const triggerAgentHubEvent = async (userId: string, event: string, payload: any = {}) => {
    const userRes = await pool.query('SELECT settings FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return { created: 0, executed: 0 };
    const settings = typeof userRes.rows[0].settings === 'string' ? JSON.parse(userRes.rows[0].settings || '{}') : (userRes.rows[0].settings || {});
    const agents = Array.isArray(settings.agentHubAgents) ? settings.agentHubAgents : [];
    const matchedAgents = agents.filter((agent: any) => (
      agent?.status !== 'paused' &&
      Array.isArray(agent.eventTriggers) &&
      agent.eventTriggers.includes(event)
    ));
    if (matchedAgents.length === 0) return { created: 0, executed: 0 };

    const isZh = settings.language === 'zh';
    let created = 0;
    let executed = 0;

    for (const agent of matchedAgents) {
      const reviewStatus = agent.guardrail === 'auto' ? 'approved' : 'pending_review';
      const eventScope = agent.eventTriggerScope || 'subject';
      let objective = isZh
        ? `事件触发运行：${agent.name}\n触发事件：${event}\n事件上下文：${JSON.stringify(payload, null, 2)}\n\n${agent.instructions || ''}`
        : `Event-triggered run: ${agent.name}\nEvent: ${event}\nEvent context: ${JSON.stringify(payload, null, 2)}\n\n${agent.instructions || ''}`;
      if (isZh) {
        objective = `事件触发运行：${agent.name}\n触发事件：${event}\n事件上下文：${JSON.stringify(payload, null, 2)}\n\n${agent.instructions || ''}`;
      }
      const expectedResult = isZh
        ? `1. 读取事件上下文和相关客户/线索资料。\n2. 根据 ${agent.name} 的指令判断是否需要行动。\n3. 检查幂等性、风险和审核策略。\n4. 执行已授权工具：${(agent.tools || []).join(', ') || 'agent tools'}。\n5. 写入运行结果、CRM 日志和后续建议。`
        : `1. Read event context and related client/lead data.\n2. Decide whether action is needed according to ${agent.name} instructions.\n3. Check idempotency, risk, and approval policy.\n4. Execute permitted tools: ${(agent.tools || []).join(', ') || 'agent tools'}.\n5. Record run result, CRM logs, and next-step suggestions.`;
      const actualResult = reviewStatus === 'approved'
        ? (isZh
          ? `1. 事件 ${event} 已匹配该智能体。\n2. 护栏策略允许自动通过。\n3. 运行已进入执行流程。`
          : `1. Event ${event} matched this agent.\n2. Guardrail policy allowed auto-approval.\n3. The run entered execution.`)
        : (isZh
          ? `1. 事件 ${event} 已匹配该智能体。\n2. 护栏策略要求人工审核。\n3. 已创建待审核运行。`
          : `1. Event ${event} matched this agent.\n2. Guardrail policy requires human review.\n3. A review-gated run was created.`);

      const relatedRunId = agent.id === 'global_agent'
        ? `gplan_event_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        : `harness_event_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const relatedRunType: 'global' | 'harness' = agent.id === 'global_agent' ? 'global' : 'harness';
      const nowIso = new Date().toISOString();

      if (relatedRunType === 'global') {
        settings.globalAgentPlans = [{
          id: relatedRunId,
          objective,
          summary: isZh ? `事件触发：${agent.name}` : `Event-triggered run: ${agent.name}`,
          status: reviewStatus,
          steps: [{
            id: `step_event_${Date.now()}_${agent.id}`,
            title: isZh ? `处理事件：${event}` : `Handle event: ${event}`,
            description: agent.instructions || '',
            actionType: 'review_pipeline',
            status: 'pending',
            payload: { source: 'agent-hub-event', event, eventPayload: payload, eventScope, agentId: agent.id, tools: agent.tools || [] }
          }],
          createdAt: nowIso,
          updatedAt: nowIso
        }, ...(settings.globalAgentPlans || [])];
      } else {
        settings.agentHarnessRuns = [{
          id: relatedRunId,
          objective,
          summary: isZh ? `事件触发：${agent.name}` : `Event-triggered run: ${agent.name}`,
          status: reviewStatus,
          steps: buildHarnessStepsForAgent(agent, {
            status: reviewStatus === 'approved' ? 'approved' : 'pending',
            payload: { source: 'agent-hub-event', event, eventPayload: payload, eventScope }
          }).map((step: any, index: number) => ({
            ...step,
            title: index === 0 ? (isZh ? `处理事件：${event}` : `Handle event: ${event}`) : step.title
          })),
          createdAt: nowIso,
          updatedAt: nowIso
        }, ...(settings.agentHarnessRuns || [])];
      }

      const eventRecord = addAgentHubRunRecordToSettings(settings, {
        agentId: agent.id,
        agentName: agent.name,
        trigger: 'event',
        status: reviewStatus,
        plan: objective,
        expectedResult,
        actualResult,
        relatedRunId,
        relatedRunType,
        completedAt: nowIso
      });
      created += 1;

      if (reviewStatus === 'approved' && relatedRunType === 'harness') {
        try {
          const result = await executeAgentHubHarnessRun(userId, settings, relatedRunId);
          executed += result.acted || 0;
        } catch (error: any) {
          updateAgentHubRunRecordInSettings(settings, eventRecord.id, {
            status: 'failed',
            actualResult: isZh
              ? `1. 事件触发运行失败。\n2. 错误：${error?.message || '未知错误'}`
              : `1. Event-triggered run failed.\n2. Error: ${error?.message || 'Unknown error'}`,
            completedAt: new Date().toISOString()
          });
        }
      }
    }

    await pool.query('UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(settings), userId]);
    return { created, executed };
  };

  app.post('/api/agent-hub/events/trigger', authenticateToken, async (req: any, res) => {
    try {
      const event = String(req.body?.event || '').trim();
      if (!event) return res.status(400).json({ error: 'Missing event' });
      const result = await triggerAgentHubEvent(req.user.uid, event, req.body?.payload || {});
      res.json({ success: true, result });
    } catch (e: any) {
      console.error('Failed to trigger Agent Hub event', e);
      res.status(500).json({ error: e.message || 'Failed to trigger Agent Hub event' });
    }
  });

  app.post('/api/agent-hub/agents/:agentId/run', authenticateToken, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const requestedObjective = String(req.body?.objective || '').trim();
      const userRes = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.uid]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const settings = typeof userRes.rows[0].settings === 'string' ? JSON.parse(userRes.rows[0].settings || '{}') : (userRes.rows[0].settings || {});
      const agents = Array.isArray(settings.agentHubAgents) ? settings.agentHubAgents : [];
      const agent = agents.find((item: any) => item.id === agentId);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      if (agent.status === 'paused') return res.status(400).json({ error: 'Agent is paused' });

      const isZh = settings.language === 'zh';
      const reviewStatus = agent.guardrail === 'auto' ? 'approved' : 'pending_review';
      const nowIso = new Date().toISOString();
      let objective = isZh
        ? `手动执行智能体：${agent.name}\n\n${agent.instructions || ''}`
        : `Manual agent run: ${agent.name}\n\n${agent.instructions || ''}`;
      if (requestedObjective) objective = `${requestedObjective}\n\n${objective}`;
      const expectedResult = isZh
        ? `1. 读取该智能体可处理的上下文。\n2. 检查工具权限、幂等性和审核策略。\n3. 按配置执行工具：${(agent.tools || []).join(', ') || 'agent tools'}。\n4. 输出实际执行结果并写入运行记录。`
        : `1. Read context eligible for this agent.\n2. Check tool permissions, idempotency, and guardrail policy.\n3. Execute configured tools: ${(agent.tools || []).join(', ') || 'agent tools'}.\n4. Output actual execution result and write the run record.`;
      const actualResult = reviewStatus === 'approved'
        ? (isZh ? '1. 手动执行已触发。\n2. 护栏策略允许自动通过。\n3. 正在执行配置的工具。' : '1. Manual run was triggered.\n2. Guardrail policy allowed auto-approval.\n3. Executing configured tools.')
        : (isZh ? '1. 手动执行已触发。\n2. 护栏策略要求人工审核。\n3. 已创建待审核任务。' : '1. Manual run was triggered.\n2. Guardrail policy requires human review.\n3. A review task was created.');

      const relatedRunType: 'global' | 'harness' = agent.id === 'global_agent' ? 'global' : 'harness';
      const relatedRunId = relatedRunType === 'global'
        ? `gplan_manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        : `harness_manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      if (relatedRunType === 'global') {
        settings.globalAgentPlans = [{
          id: relatedRunId,
          objective,
          summary: isZh ? `手动执行：${agent.name}` : `Manual run: ${agent.name}`,
          status: reviewStatus,
          steps: [{
            id: `step_manual_${Date.now()}_${agent.id}`,
            title: isZh ? `执行 ${agent.name}` : `Run ${agent.name}`,
            description: agent.instructions || '',
            actionType: 'review_pipeline',
            status: 'pending',
            payload: { source: 'agent-hub-manual', agentId: agent.id, tools: agent.tools || [] }
          }],
          createdAt: nowIso,
          updatedAt: nowIso
        }, ...(settings.globalAgentPlans || [])];
      } else {
        settings.agentHarnessRuns = [{
          id: relatedRunId,
          objective,
          summary: isZh ? `手动执行：${agent.name}` : `Manual run: ${agent.name}`,
          status: reviewStatus,
          steps: buildHarnessStepsForAgent(agent, {
            status: reviewStatus === 'approved' ? 'approved' : 'pending',
            payload: { source: 'agent-hub-manual' }
          }).map((step: any, index: number) => ({
            ...step,
            title: index === 0 ? (isZh ? `执行 ${agent.name}` : `Run ${agent.name}`) : step.title
          })),
          createdAt: nowIso,
          updatedAt: nowIso
        }, ...(settings.agentHarnessRuns || [])];
      }

      const record = addAgentHubRunRecordToSettings(settings, {
        agentId: agent.id,
        agentName: agent.name,
        trigger: 'manual',
        status: reviewStatus,
        plan: objective,
        expectedResult,
        actualResult,
        relatedRunId,
        relatedRunType,
        completedAt: nowIso
      });

      let executionResult = null;
      if (reviewStatus === 'approved' && relatedRunType === 'harness') {
        try {
          executionResult = await executeAgentHubHarnessRun(req.user.uid, settings, relatedRunId);
        } catch (error: any) {
          updateAgentHubRunRecordInSettings(settings, record.id, {
            status: 'failed',
            actualResult: isZh
              ? `1. 手动执行失败。\n2. 错误：${error?.message || '未知错误'}`
              : `1. Manual run failed.\n2. Error: ${error?.message || 'Unknown error'}`,
            completedAt: new Date().toISOString()
          });
        }
      }

      await pool.query('UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(settings), req.user.uid]);
      if (reviewStatus === 'approved') {
        const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_agent_run', 5));
        await adjustUserPoints(req.user.uid, pointsAdded, 'Completed agent run', 'agent_run', relatedRunId, { agentId, relatedRunType });
      }
      res.json({ success: true, runId: relatedRunId, relatedRunType, executionResult });
    } catch (e: any) {
      console.error('Failed to run Agent Hub agent manually', e);
      res.status(500).json({ error: e.message || 'Failed to run agent' });
    }
  });

  app.post('/api/agent-hub/opportunities/:opportunityId/dispatch', authenticateToken, async (req: any, res) => {
    let client: any = null;
    try {
      const { opportunityId } = req.params;
      client = await pool.connect();
      await client.query('BEGIN');
      const userRes = await client.query('SELECT settings FROM users WHERE id = $1 FOR UPDATE', [req.user.uid]);
      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
      const settings = typeof userRes.rows[0].settings === 'string' ? JSON.parse(userRes.rows[0].settings || '{}') : (userRes.rows[0].settings || {});
      const result = await dispatchAgentOpportunityForUser(req.user.uid, settings, opportunityId, 'manual');
      const updated = await client.query(
        'UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING settings',
        [JSON.stringify(settings), req.user.uid]
      );
      await client.query('COMMIT');
      res.json({ success: true, result, settings: updated.rows[0]?.settings || settings });
    } catch (e: any) {
      if (client) await client.query('ROLLBACK').catch(() => undefined);
      console.error('Failed to dispatch Agent Hub opportunity', e);
      const message = e.message || 'Failed to dispatch opportunity';
      const isConflict = message.includes('already') || message.includes('正在') || message.includes('已派发') || message.includes('处理中');
      res.status(isConflict ? 409 : 500).json({ error: message });
    } finally {
      if (client) client.release();
    }
  });

  app.post('/api/agent-hub/harness-runs/:runId/execute', authenticateToken, async (req: any, res) => {
    const { runId } = req.params;
    const executionLockKey = `${req.user.uid}:${runId}`;
    if (activeHarnessExecutions.has(executionLockKey)) {
      return res.status(409).json({ error: 'This agent run is already executing.' });
    }
    activeHarnessExecutions.add(executionLockKey);
    try {
      const userRes = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.uid]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const settings = typeof userRes.rows[0].settings === 'string' ? JSON.parse(userRes.rows[0].settings || '{}') : (userRes.rows[0].settings || {});
      const existingRun = (settings.agentHarnessRuns || []).find((run: any) => run.id === runId);
      if (!existingRun) return res.status(404).json({ error: 'Agent run not found' });
      if (['running', 'completed'].includes(existingRun.status)) {
        return res.status(409).json({ error: settings.language === 'zh' ? '该智能体运行已在执行或已完成。' : 'This agent run is already running or completed.' });
      }
      settings.agentHarnessRuns = (settings.agentHarnessRuns || []).map((run: any) => run.id === runId ? {
        ...run,
        status: 'running',
        approvedAt: run.approvedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: (run.steps || []).map((step: any) => ({ ...step, status: 'running', error: undefined }))
      } : run);
      settings.agentRunRecords = (settings.agentRunRecords || []).map((record: any) => record.relatedRunId === runId && record.relatedRunType === 'harness' ? {
        ...record,
        status: 'running',
        actualResult: settings.language === 'zh' ? '人工已批准该智能体运行，正在执行配置的工具。' : 'Human approved the planned agent run. Executing configured tools now.',
        updatedAt: new Date().toISOString()
      } : record);

      const result = await executeAgentHubHarnessRun(req.user.uid, settings, runId);
      const executedRun = (settings.agentHarnessRuns || []).find((run: any) => run.id === runId);
      const opportunityId = executedRun?.steps?.[0]?.payload?.opportunityId;
      if (opportunityId) {
        updateAgentOpportunityInSettings(settings, opportunityId, {
          status: result?.failed > 0 && !result?.acted ? 'failed' : 'completed',
          resultSummary: summarizeAgentExecutionResult(result, settings.language === 'zh'),
          completedAt: new Date().toISOString()
        });
      }
      await pool.query('UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(settings), req.user.uid]);
      const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_agent_run', 5));
      await adjustUserPoints(req.user.uid, pointsAdded, 'Completed agent run', 'agent_run', runId, { runId });
      res.json({ success: true, result });
    } catch (e: any) {
      console.error('Failed to execute Agent Hub harness run', e);
      await triggerAgentHubEvent(req.user.uid, 'execution_failed', {
        source: 'agent-hub-harness',
        runId: req.params?.runId,
        error: e.message || 'Failed to execute Agent Hub run'
      }).catch(err => console.warn('Agent Hub execution_failed trigger failed', err));
      res.status(500).json({ error: e.message || 'Failed to execute Agent Hub run' });
    } finally {
      activeHarnessExecutions.delete(executionLockKey);
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
          const config = outboxConfigs.find((c: any) => c.id === email.outbox_config_id) || outboxConfigs.find((c: any) => c.fromEmail === email.sender) || outboxConfigs[0];

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
        comments: row.comments || [],
        leadScore: row.lead_score,
        leadSummary: row.lead_summary,
        leadNextStep: row.lead_next_step,
        leadScoringSignature: row.lead_scoring_signature,
        leadScoringAnalyzedAt: row.lead_scoring_analyzed_at,
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
      const { id, clientId, name, value, status, contactInfo, comments, leadScore, leadSummary, leadNextStep, leadScoringSignature, leadScoringAnalyzedAt } = req.body;
      const result = await pool.query(
        `INSERT INTO deals (id, user_id, client_id, name, value, status, contact_info, comments, lead_score, lead_summary, lead_next_step, lead_scoring_signature, lead_scoring_analyzed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [id, req.user.uid, clientId || null, name, value || 0, status || 'Leads', contactInfo || {}, comments || [], leadScore ?? null, leadSummary || null, leadNextStep || null, leadScoringSignature || null, leadScoringAnalyzedAt || null]
      );
      await triggerAgentHubEvent(req.user.uid, 'lead_created', {
        leadId: id,
        clientId: clientId || null,
        name,
        value: value || 0,
        status: status || 'Leads'
      }).catch(err => console.warn('Agent Hub lead_created trigger failed', err));
      const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_create_deal', 5));
      await adjustUserPoints(req.user.uid, pointsAdded, 'Created lead / deal', 'create_deal', id, { dealId: id, clientId: clientId || null });
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.patch('/api/deals/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, name, value, contactInfo, clientId, comments, leadScore, leadSummary, leadNextStep, leadScoringSignature, leadScoringAnalyzedAt } = req.body;
      
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
      if (comments !== undefined) {
        updates.push(`comments = $${idx++}`);
        values.push(comments);
      }
      if (leadScore !== undefined) {
        updates.push(`lead_score = $${idx++}`);
        values.push(leadScore);
      }
      if (leadSummary !== undefined) {
        updates.push(`lead_summary = $${idx++}`);
        values.push(leadSummary);
      }
      if (leadNextStep !== undefined) {
        updates.push(`lead_next_step = $${idx++}`);
        values.push(leadNextStep);
      }
      if (leadScoringSignature !== undefined) {
        updates.push(`lead_scoring_signature = $${idx++}`);
        values.push(leadScoringSignature);
      }
      if (leadScoringAnalyzedAt !== undefined) {
        updates.push(`lead_scoring_analyzed_at = $${idx++}`);
        values.push(leadScoringAnalyzedAt);
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
        id: row.id, sku: row.sku, name: row.name, description: row.description, salesPoints: row.sales_points, imageUrl: row.image_url,
        bulkPrices: row.bulk_prices, comments: row.comments, createdAt: row.created_at, updatedAt: row.updated_at
      })));
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/api/products', authenticateToken, async (req: any, res) => {
    try {
      const { id, sku, name, description, salesPoints, imageUrl, bulkPrices, comments } = req.body;
      const result = await pool.query(
        `INSERT INTO products (id, user_id, sku, name, description, sales_points, image_url, bulk_prices, comments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [id, req.user.uid, sku, name, description, salesPoints, imageUrl, JSON.stringify(bulkPrices || []), JSON.stringify(comments || [])]
      );
      const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_add_product', 3));
      await adjustUserPoints(req.user.uid, pointsAdded, 'Added product', 'add_product', id, { productId: id });
      res.json({ ...result.rows[0], pointsAdded });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.patch('/api/products/:id', authenticateToken, async (req: any, res) => {
    try {
      const { sku, name, description, salesPoints, imageUrl, bulkPrices, comments } = req.body;
      const updates = []; const values = []; let idx = 1;
      const mapping = { sku: 'sku', name: 'name', description: 'description', salesPoints: 'sales_points', imageUrl: 'image_url', bulkPrices: 'bulk_prices', comments: 'comments' };
      for (const [k, v] of Object.entries({ sku, name, description, salesPoints, imageUrl, bulkPrices, comments })) {
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
        id: row.id, quoteNumber: row.quote_number, clientId: row.client_id, currency: row.currency || 'USD', paymentTerms: row.payment_terms,
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
        id: row.id, quoteNumber: row.quote_number, clientId: row.client_id, currency: row.currency || 'USD', paymentTerms: row.payment_terms,
        paymentTermId: row.payment_term_id, advanceRatio: row.advance_ratio ? parseFloat(row.advance_ratio) : 0, balanceRatio: row.balance_ratio ? parseFloat(row.balance_ratio) : 0,
        status: row.status, items: row.items, fees: row.fees, comments: row.comments, createdAt: row.created_at, updatedAt: row.updated_at
      })));
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/api/quotes', authenticateToken, async (req: any, res) => {
    try {
      const { id, quoteNumber, clientId, currency, paymentTerms, paymentTermId, advanceRatio, balanceRatio, status, items, fees, comments } = req.body;
      const result = await pool.query(
        `INSERT INTO quotes (id, user_id, client_id, quote_number, currency, payment_terms, payment_term_id, advance_ratio, balance_ratio, status, items, fees, comments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [id, req.user.uid, clientId || null, quoteNumber, currency || 'USD', paymentTerms, paymentTermId || null, advanceRatio || 0, balanceRatio || 0, status, JSON.stringify(items || []), JSON.stringify(fees || []), JSON.stringify(comments || [])]
      );
      const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_create_quote', 8));
      await adjustUserPoints(req.user.uid, pointsAdded, 'Created quote', 'create_quote', id, { quoteId: id, clientId: clientId || null });
      res.json({ ...result.rows[0], pointsAdded });
    } catch (e) {
      console.error(e); res.status(500).json({ error: 'Internal error' });
    }
  });

  app.patch('/api/quotes/:id', authenticateToken, async (req: any, res) => {
    try {
      const { quoteNumber, clientId, currency, paymentTerms, paymentTermId, advanceRatio, balanceRatio, status, items, fees, comments } = req.body;
      const updates = []; const values = []; let idx = 1;
      const mapping = { quoteNumber: 'quote_number', clientId: 'client_id', currency: 'currency', paymentTerms: 'payment_terms', paymentTermId: 'payment_term_id', advanceRatio: 'advance_ratio', balanceRatio: 'balance_ratio', status: 'status', items: 'items', fees: 'fees', comments: 'comments' };
      for (const [k, v] of Object.entries({ quoteNumber, clientId, currency, paymentTerms, paymentTermId, advanceRatio, balanceRatio, status, items, fees, comments })) {
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
      const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_create_document', 5));
      await adjustUserPoints(req.user.uid, pointsAdded, 'Created document', 'create_document', id, { documentId: id, quoteId });
      res.json({ ...result.rows[0], pointsAdded });
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
      const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_add_media', 1));
      await adjustUserPoints(req.user.uid, pointsAdded, 'Added media asset', 'add_media', id, { mediaId: id });
      res.json({ success: true, pointsAdded });
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
    const getByPath = (row: any, path: string) => path.split('.').reduce((value, key) => value?.[key], row);
    const collectDeepValues = (value: any, matcher: (key: string) => boolean, parentKey = ''): string[] => {
      if (value === undefined || value === null) return [];
      if (Array.isArray(value)) return value.flatMap(item => collectDeepValues(item, matcher, parentKey));
      if (typeof value === 'object') {
        return Object.entries(value).flatMap(([key, item]) => collectDeepValues(item, matcher, key));
      }
      if (!matcher(parentKey)) return [];
      return String(value).split(',').map(item => item.trim()).filter(Boolean);
    };
    const pickFirst = (row: any, keys: string[]) => {
      for (const key of keys) {
        const value = key.includes('.') ? getByPath(row, key) : row?.[key];
        if (Array.isArray(value) && value.find(Boolean)) return value.find(Boolean);
        if (value !== undefined && value !== null && String(value).trim()) return value;
      }
      return '';
    };
    const collectValues = (row: any, keys: string[]) => {
      const values: string[] = [];
      for (const key of keys) {
        const value = key.includes('.') ? getByPath(row, key) : row?.[key];
        if (Array.isArray(value)) {
          values.push(...value.map(item => String(item || '').trim()).filter(Boolean));
        } else if (value !== undefined && value !== null && String(value).trim()) {
          values.push(...String(value).split(',').map(item => item.trim()).filter(Boolean));
        }
      }
      return Array.from(new Set(values));
    };
    const appendMethod = (methods: any[], type: string, value: any) => {
      const normalized = String(value || '').trim();
      if (!normalized) return;
      if (!methods.some(method => method.type === type && method.value === normalized)) {
        methods.push({ type, value: normalized });
      }
    };

    return rows.filter(Boolean).map((row: any) => {
      const name = pickFirst(row, ['name', 'title', 'company', 'companyName', 'organization_name', 'business_name']);
      const company = pickFirst(row, ['company', 'companyName', 'organization_name', 'business_name', 'name', 'title']);
      const contactMethods: any[] = [];
      for (const method of row.contactMethods || []) appendMethod(contactMethods, method.type, method.value);
      collectValues(row, ['emails', 'email', 'email_address', 'emailAddresses', 'email_1', 'email_2', 'email_3', 'business_email', 'company_email', 'contact_email', 'website_data.emails'])
        .concat(collectDeepValues(row, key => /email/i.test(key)))
        .filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        .forEach(value => appendMethod(contactMethods, 'email', value));
      collectValues(row, ['phones', 'phone', 'phone_number', 'phoneNumbers', 'phone_1', 'phone_2', 'phone_3', 'mobile', 'mobile_phone', 'business_phone', 'phone_numbers', 'contacts.phone'])
        .concat(collectDeepValues(row, key => /(phone|mobile|telephone)/i.test(key)))
        .forEach(value => appendMethod(contactMethods, 'phone', value));
      collectValues(row, ['whatsapp', 'whatsapp_number', 'whatsappNumber']).forEach(value => appendMethod(contactMethods, 'whatsapp', value));
      collectValues(row, ['site', 'website', 'domain', 'url', 'business_url', 'website_url', 'links.website'])
        .forEach(value => appendMethod(contactMethods, 'website', value));
      const categoryValues = collectValues(row, ['type', 'category', 'categories', 'subtypes', 'industry']);
      const city = pickFirst(row, ['city', 'municipality', 'locality', 'town', 'address_info.city', 'address_info.town', 'address_info.municipality', 'address_info.locality', 'location.city']);
      const state = pickFirst(row, ['state', 'region', 'province', 'administrative_area_level_1', 'address_info.state', 'address_info.region', 'address_info.province', 'location.state']);
      const country = normalizeCrmCountry(pickFirst(row, ['country', 'country_name', 'address_info.country', 'location.country', 'country_code']) || fallbackCountry || 'Unknown');
      const comments = [
        row.rating ? `Outscraper rating: ${row.rating}${row.reviews ? ` (${row.reviews} reviews)` : ''}` : '',
        row.site || row.website ? `Website: ${row.site || row.website}` : '',
        row.place_id || row.google_id ? `Google place id: ${row.place_id || row.google_id}` : ''
      ].filter(Boolean).map((content, index) => ({
        id: `import_note_${Date.now()}_${index}`,
        author: 'Outscraper',
        content,
        createdAt: new Date().toISOString(),
        replies: []
      }));
      return {
        name,
        company: company || name,
        address: pickFirst(row, ['full_address', 'address', 'formatted_address', 'street_address', 'address_info.full_address', 'location.address']),
        city,
        state,
        country,
        tags: Array.from(new Set([...categoryValues, fallbackTag, 'Outscraper'].filter(Boolean))),
        contactMethods: contactMethods.length > 0 ? contactMethods : undefined,
        comments
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

  const searchLeadDataProvider = async (
    provider: string,
    config: any,
    input: { query: string; keywords: string; industry: string; country: string; limit: number }
  ) => {
    if (!config?.apiKey) throw new Error(`${provider} data channel is not configured`);
    const { query, keywords, industry, country, limit } = input;

    if (provider === 'outscraper') {
      const url = `https://api.outscraper.com/maps/search-v2?query=${encodeURIComponent(query)}&limit=${limit || 10}&async=false`;
      const outRes = await fetch(url, { headers: { 'X-API-KEY': config.apiKey } });
      if (!outRes.ok) throw new Error(`Outscraper API error: ${await readLeadChannelResponseMessage(outRes)}`);
      const data = await outRes.json();
      return normalizeLeadRows(pickLeadRows(provider, data), country, industry);
    }

    if (provider === 'apify' && config.actorId) {
      const actorId = String(config.actorId).replace('/', '~');
      const runRes = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(config.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, keywords, industry, country, limit })
      });
      if (!runRes.ok) throw new Error(`Apify actor failed: ${await readLeadChannelResponseMessage(runRes)}`);
      const data = await runRes.json();
      return normalizeLeadRows(pickLeadRows(provider, data), country, industry);
    }

    if (provider === 'phantombuster' && config.agentId) {
      const launchRes = await fetch('https://api.phantombuster.com/api/v2/agents/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Phantombuster-Key': config.apiKey },
        body: JSON.stringify({ id: config.agentId, argument: { query, keywords, industry, country, limit } })
      });
      if (!launchRes.ok) throw new Error(`PhantomBuster agent failed: ${await readLeadChannelResponseMessage(launchRes)}`);
      const data = await launchRes.json();
      return normalizeLeadRows(pickLeadRows(provider, data), country, industry);
    }

    if (!config.searchEndpoint) throw new Error(`${provider} search endpoint is not configured`);
    const genericRes = await fetch(config.searchEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify({ query, keywords, industry, country, limit })
    });
    if (!genericRes.ok) throw new Error(`${provider} search failed: ${await readLeadChannelResponseMessage(genericRes)}`);
    const data = await genericRes.json();
    return normalizeLeadRows(pickLeadRows(provider, data), country, industry);
  };

  const importLeadsToPublicPool = async (leads: any[]) => {
    let addedCount = 0;
    for (const lead of leads) {
      const incomingMethods = [
        ...(lead.contactMethods || []),
        ...(lead.contacts || []).flatMap((contact: any) => contact.contactMethods || [])
      ].filter((cm: any) => cm.value).map((cm: any) => cm.value);
      if (incomingMethods.length > 0) {
        const checkRes = await pool.query(`
          SELECT id FROM clients
          WHERE EXISTS (
            SELECT 1 FROM jsonb_array_elements(contact_methods) as cm
            WHERE cm->>'value' = ANY($1::text[])
          ) OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(contacts, '[]'::jsonb)) as contact,
                 jsonb_array_elements(COALESCE(contact->'contactMethods', '[]'::jsonb)) as cm
            WHERE cm->>'value' = ANY($1::text[])
          ) LIMIT 1
        `, [incomingMethods]);
        if (checkRes.rows.length > 0) continue;
      }

      const id = `c${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO clients (id, user_id, name, company, address, state, city, country, status, tags, last_contact, is_dormant, contact_methods, contacts, primary_contact_id, comments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [id, null, lead.name, lead.company || '', lead.address || '', lead.state || '', lead.city || '', normalizeCrmCountry(lead.country) || '', 'Leads', JSON.stringify(lead.tags || []), null, false, JSON.stringify(lead.contactMethods || []), JSON.stringify(lead.contacts || []), lead.primaryContactId || null, JSON.stringify(lead.comments || [])]
      );
      addedCount += 1;
    }
    return addedCount;
  };

  const executeLeadAcquisitionAgentRun = async (userId: string, settings: any, run: any, agent: any) => {
    const isZh = settings.language === 'zh';
    const firstStep = run.steps?.[0] || {};
    const objective = `${run.objective || ''}\n${firstStep.description || ''}`;
    const limitMatch = objective.match(/(\d+)\s*(?:条|个|leads?|线索)/i);
    const limit = Math.max(1, Math.min(50, Number(limitMatch?.[1] || 10)));
    const channelConfigs = settings.leadDataChannelConfigs || {};
    const providerEntries = Object.entries(channelConfigs).filter(([provider, config]: any) => {
      if (!config?.enabled || !config?.apiKey) return false;
      if (provider === 'clay') return !!config.searchEndpoint;
      return provider === 'outscraper' || provider === 'apify' || provider === 'phantombuster' || !!config.searchEndpoint;
    });
    if (providerEntries.length === 0) throw new Error('No configured lead data channel is available for lead.acquire');

    const productsRes = await pool.query(
      `SELECT sku, name, description, sales_points FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    const kbRes = await searchKnowledgeBase(userId, null, `${agent.name} ${objective}`, null, 8).catch(() => ({ rows: [] as any[] }));
    const llmId = settings.llmMappings?.agent_harness || settings.llmMappings?.agent_instruction_generation || settings.activeLLMId;
    const llmConfig = llmId ? (settings.llmConfigs || []).find((config: any) => config.id === llmId) : null;
    const prompt = `Create lead acquisition search parameters for this CRM agent.
Agent instructions:
${agent.instructions || ''}

User objective:
${objective}

Products:
${JSON.stringify(productsRes.rows, null, 2)}

Knowledge:
${(kbRes.rows || []).map((kb: any) => `[${kb.title}]\n${kb.content}`).join('\n\n')}

Return JSON only:
{
  "industry": "target industry",
  "customerRoles": ["buyer role"],
  "keywords": ["keyword"],
  "country": "target country or empty string",
  "query": "provider search query"
}`;
    let params: any = {};
    try {
      params = stripAgentJson(await callAI(prompt, llmConfig, true));
    } catch {
      params = {};
    }
    const industry = String(params.industry || 'Solar energy').trim();
    const country = String(params.country || '').trim();
    const keywords = Array.isArray(params.keywords) ? params.keywords.join(', ') : String(params.keywords || 'solar monitoring, PV plant management, energy optimization');
    const roles = Array.isArray(params.customerRoles) ? params.customerRoles.join(', ') : 'project manager, procurement manager, operations manager';
    const query = String(params.query || `${keywords} ${roles} ${industry} ${country}`.trim());

    let foundLeads: any[] = [];
    let providerUsed = '';
    const errors: string[] = [];
    for (const [provider, config] of providerEntries as any[]) {
      try {
        foundLeads = await searchLeadDataProvider(provider, config, { query, keywords, industry, country, limit });
        providerUsed = provider;
        if (foundLeads.length > 0) break;
      } catch (error: any) {
        errors.push(`${provider}: ${error?.message || 'failed'}`);
      }
    }
    if (foundLeads.length === 0) {
      throw new Error(errors.length ? `No leads acquired. ${errors.join('; ')}` : 'No leads acquired from configured channels');
    }

    const imported = await importLeadsToPublicPool(foundLeads.slice(0, limit));
    const resultText = isZh
      ? `线索获取已完成：渠道 ${providerUsed}，查询 "${query}"，获取 ${foundLeads.length} 条，导入公海 ${imported} 条。`
      : `Lead acquisition completed: provider ${providerUsed}, query "${query}", acquired ${foundLeads.length}, imported ${imported} to public pool.`;
    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    run.steps = (run.steps || []).map((step: any) => ({ ...step, status: 'completed', result: resultText }));
    const record = (settings.agentRunRecords || []).find((item: any) => item.relatedRunId === run.id && item.relatedRunType === 'harness');
    if (record) {
      record.status = 'completed';
      record.actualResult = resultText;
      record.completedAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
    }
    agent.tasksCompleted = (agent.tasksCompleted || 0) + 1;
    agent.lastRunAt = new Date().toISOString();
    agent.updatedAt = new Date().toISOString();
    return { scanned: foundLeads.length, acted: imported, skipped: Math.max(0, foundLeads.length - imported), failed: 0, details: [resultText] };
  };

  const executeInsightAgentRun = async (userId: string, settings: any, run: any, agent: any) => {
    const isZh = settings.language === 'zh';
    const tools = Array.isArray(agent.tools) ? agent.tools : [];
    const firstStep = run.steps?.[0] || {};
    const eventPayload = firstStep.payload?.eventPayload || {};
    const objective = `${run.objective || ''}\n${firstStep.description || ''}`;
    const subjectClientId = eventPayload.clientId || eventPayload.client?.id || eventPayload.customerId || eventPayload.customer?.id;
    const subjectLeadId = eventPayload.leadId || eventPayload.lead?.id || eventPayload.dealId || eventPayload.deal?.id;

    let clientsQuery;
    let clientsParams: any[];
    if (subjectClientId) {
      clientsQuery = `SELECT * FROM clients WHERE user_id = $1 AND id = $2 LIMIT 1`;
      clientsParams = [userId, String(subjectClientId)];
    } else if (subjectLeadId) {
      clientsQuery = `SELECT c.* FROM clients c JOIN deals d ON d.client_id = c.id WHERE c.user_id = $1 AND d.id = $2 LIMIT 1`;
      clientsParams = [userId, String(subjectLeadId)];
    } else {
      clientsQuery = `SELECT * FROM clients WHERE user_id = $1 ORDER BY updated_at DESC NULLS LAST, last_contact NULLS FIRST LIMIT 10`;
      clientsParams = [userId];
    }
    const clientsRes = await pool.query(clientsQuery, clientsParams);
    const targetClients: any[] = clientsRes.rows as any[];
    if (targetClients.length === 0) throw new Error('No eligible client or lead context found for this agent run');

    const productsRes = tools.includes('product.read')
      ? await pool.query(`SELECT sku, name, description, sales_points, bulk_prices FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [userId])
      : { rows: [] };

    let scanned = 0;
    let acted = 0;
    let failed = 0;
    const details: string[] = [];
    const llmId = settings.llmMappings?.agent_harness || settings.llmMappings?.analysis || settings.activeLLMId;
    const llmConfig = llmId ? (settings.llmConfigs || []).find((config: any) => config.id === llmId) : null;

    for (const client of targetClients) {
      scanned += 1;
      try {
        const emailsRes = tools.includes('email.read')
          ? await pool.query(`SELECT sender, recipient, subject, body, date, type FROM emails WHERE client_id = $1 AND user_id = $2 ORDER BY date DESC LIMIT 10`, [client.id, userId])
          : { rows: [] };
        const logsRes = await pool.query(`SELECT date, content, type FROM logs WHERE client_id = $1 ORDER BY date DESC LIMIT 10`, [client.id]);
        const dealsRes = await pool.query(`SELECT id, name, value, status, comments, lead_score, lead_summary, lead_next_step FROM deals WHERE user_id = $1 AND client_id = $2 ORDER BY updated_at DESC NULLS LAST LIMIT 5`, [userId, client.id]);
        const kbRes = (tools.includes('knowledge.search') || tools.includes('knowledge.read'))
          ? await searchKnowledgeBase(userId, client.id, `${agent.name} ${objective} ${client.company || client.name || ''}`, llmConfig, 8).catch(() => ({ rows: [] as any[] }))
          : { rows: [] };

        const prompt = `Execute this CRM insight agent using only its allowed tools.
Agent name: ${agent.name}
Allowed tools: ${tools.join(', ')}
Agent instructions:
${agent.instructions || ''}

Run objective:
${objective}

Client:
${JSON.stringify({
  id: client.id,
  name: client.name,
  company: client.company,
  country: client.country,
  status: client.status,
  tags: parseJsonArray(client.tags),
  preferredLanguage: client.preferred_language,
  contactMethods: parseJsonArray(client.contact_methods),
  contacts: parseJsonArray(client.contacts)
}, null, 2)}

Deals/leads:
${JSON.stringify(dealsRes.rows, null, 2)}

Recent emails:
${JSON.stringify(emailsRes.rows, null, 2)}

Recent logs:
${JSON.stringify(logsRes.rows, null, 2)}

Products:
${JSON.stringify(productsRes.rows, null, 2)}

Knowledge:
${(kbRes.rows || []).map((kb: any) => `[${kb.title}]\n${kb.content}`).join('\n\n')}

Rules:
${buildLanguagePolicy({ systemLanguage: settings.language })}
- Internal output fields must use the system language.
- If lead.score is allowed, produce a numeric score 0-100.
- If client.summarize or lead.analyze is allowed, produce a useful internal summary.
- If next_step.recommend is allowed, produce a concrete next action.
- If client.comment, lead.comment, client.log, or lead.log is not allowed, do not ask to write notes.

Return JSON only:
{
  "score": 0,
  "summary": "internal client or lead summary",
  "nextStep": "recommended next action",
  "comment": "optional internal comment/log text",
  "status": "optional CRM status"
}`;
        const parsed = stripAgentJson(await callAI(prompt, llmConfig, true));
        const score = Number(parsed.score ?? client.lead_score ?? 0);
        const summary = String(parsed.summary || '').trim();
        const nextStep = String(parsed.nextStep || '').trim();
        const comment = String(parsed.comment || summary || nextStep || '').trim();

        if ((tools.includes('lead.score') || tools.includes('lead.update')) && dealsRes.rows[0]) {
          await pool.query(
            `UPDATE deals SET lead_score = $1, lead_summary = $2, lead_next_step = $3, lead_scoring_analyzed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5`,
            [Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null, summary || null, nextStep || null, dealsRes.rows[0].id, userId]
          );
        }
        if (tools.includes('client.summarize') || tools.includes('client.update')) {
          await pool.query(
            `UPDATE clients SET agent_summary = COALESCE($1, agent_summary), agent_next_step = COALESCE($2, agent_next_step), lead_score = COALESCE($3, lead_score), updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5`,
            [summary || null, nextStep || null, Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null, client.id, userId]
          );
        }
        if (comment && (tools.includes('client.comment') || tools.includes('lead.comment') || tools.includes('client.log') || tools.includes('lead.log'))) {
          await pool.query(
            `INSERT INTO logs (id, client_id, date, content, type, metadata) VALUES ($1, $2, $3, $4, $5, $6)`,
            [`l${Date.now()}${Math.floor(Math.random() * 1000)}`, client.id, new Date().toISOString(), `Agent ${agent.id}: ${comment}`, 'general', JSON.stringify({ agentId: agent.id, score, summary, nextStep })]
          );
        }
        acted += 1;
        details.push(isZh
          ? `${client.id}：已分析${Number.isFinite(score) ? `，评分 ${score}/100` : ''}。${nextStep || summary}`
          : `${client.id}: analyzed${Number.isFinite(score) ? `, score ${score}/100` : ''}. ${nextStep || summary}`);
      } catch (error: any) {
        failed += 1;
        details.push(isZh ? `${client.id}：失败 - ${error?.message || '未知错误'}` : `${client.id}: failed - ${error?.message || 'unknown error'}`);
      }
    }

    const resultText = isZh
      ? `洞察型智能体执行完成：扫描 ${scanned} 个客户/线索，处理 ${acted} 个，失败 ${failed} 个。${details.slice(0, 8).join(' ')}`
      : `Insight agent completed: scanned ${scanned} client/lead record(s), processed ${acted}, failed ${failed}. ${details.slice(0, 8).join(' ')}`;
    run.status = failed > 0 && acted === 0 ? 'failed' : 'completed';
    run.completedAt = new Date().toISOString();
    run.steps = (run.steps || []).map((step: any) => ({
      ...step,
      status: run.status === 'failed' ? 'failed' : 'completed',
      result: resultText,
      error: run.status === 'failed' ? resultText : undefined
    }));
    const record = (settings.agentRunRecords || []).find((item: any) => item.relatedRunId === run.id && item.relatedRunType === 'harness');
    if (record) {
      record.status = run.status;
      record.actualResult = resultText;
      record.completedAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
    }
    agent.tasksCompleted = (agent.tasksCompleted || 0) + Math.max(1, acted);
    agent.lastRunAt = new Date().toISOString();
    agent.updatedAt = new Date().toISOString();
    return { scanned, acted, skipped: 0, failed, details };
  };

  const readLeadChannelResponseMessage = async (response: Response) => {
    const text = await response.text().catch(() => '');
    if (!text) return `${response.status} ${response.statusText}`.trim();
    try {
      const data = JSON.parse(text);
      return data?.error?.message || data?.error || data?.message || text.slice(0, 300);
    } catch {
      return text.slice(0, 300);
    }
  };

  const fetchLeadChannelWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  app.post('/api/lead-data/test-channel', authenticateToken, async (req: any, res) => {
    try {
      const { provider, config = {} } = req.body || {};
      if (!provider) return res.status(400).json({ success: false, error: 'Lead data provider is required' });
      if (!config.apiKey) return res.status(400).json({ success: false, error: 'Data channel API key required' });

      let testResponse: Response;

      if (provider === 'outscraper') {
        const url = 'https://api.outscraper.com/maps/search-v2?query=test&limit=1&async=false';
        testResponse = await fetchLeadChannelWithTimeout(url, { headers: { 'X-API-KEY': config.apiKey } });
      } else if (provider === 'apify') {
        const actorId = config.actorId ? String(config.actorId).replace('/', '~') : '';
        const url = actorId
          ? `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}?token=${encodeURIComponent(config.apiKey)}`
          : `https://api.apify.com/v2/users/me?token=${encodeURIComponent(config.apiKey)}`;
        testResponse = await fetchLeadChannelWithTimeout(url);
      } else if (provider === 'phantombuster') {
        const url = config.agentId
          ? `https://api.phantombuster.com/api/v2/agents/fetch?id=${encodeURIComponent(config.agentId)}`
          : 'https://api.phantombuster.com/api/v2/agents/fetch-all';
        testResponse = await fetchLeadChannelWithTimeout(url, { headers: { 'X-Phantombuster-Key': config.apiKey } });
      } else {
        const endpoint = provider === 'clay' ? config.enrichEndpoint : (config.searchEndpoint || config.enrichEndpoint);
        if (!endpoint) return res.status(400).json({ success: false, error: 'Search or enrichment endpoint required' });
        testResponse = await fetchLeadChannelWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
            'X-API-Key': config.apiKey
          },
          body: JSON.stringify({ query: 'test', limit: 1, dryRun: true })
        });
      }

      if (!testResponse.ok) {
        const message = await readLeadChannelResponseMessage(testResponse);
        return res.status(502).json({
          success: false,
          error: `${provider} connection failed: ${message}`,
          status: testResponse.status
        });
      }

      res.json({ success: true, message: `${provider} channel connected successfully.`, status: testResponse.status });
    } catch (e: any) {
      const message = e?.name === 'AbortError' ? 'Connection timed out' : (e?.message || 'Failed to test lead data channel');
      res.status(500).json({ success: false, error: message });
    }
  });

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
        contacts: row.contacts,
        primaryContactId: row.primary_contact_id,
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
        contacts: row.contacts,
        primaryContactId: row.primary_contact_id,
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
      
      const CLAIM_COST = Math.max(0, await getGlobalSettingNumber('point_cost_claim_lead', 10));
      const userRes = await pool.query('SELECT points FROM users WHERE id = $1', [req.user.uid]);
      if (userRes.rows.length === 0 || userRes.rows[0].points < CLAIM_COST) {
        return res.status(400).json({ error: `Not enough points to claim a public lead (cost: ${CLAIM_COST} points)` });
      }

      const result = await pool.query(
        `UPDATE clients SET user_id = $1, status = 'Leads', updated_at = CURRENT_TIMESTAMP, last_contact = CURRENT_TIMESTAMP, deleted_by = NULL, is_dormant = FALSE WHERE id = $2 AND user_id IS NULL RETURNING id, name, company`,
        [req.user.uid, id]
      );
      if (result.rows.length === 0) {
        console.error("Claim failed: Lead already claimed or not found. id:", id);
        return res.status(400).json({ error: 'Lead already claimed or not found' });
      }
      
      await adjustUserPoints(req.user.uid, -CLAIM_COST, 'Claimed public lead', 'claim_lead', id, { leadId: id });
      
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
        const incomingMethods = [
          ...(lead.contactMethods || []),
          ...(lead.contacts || []).flatMap((contact: any) => contact.contactMethods || [])
        ].filter((cm: any) => cm.value).map((cm: any) => cm.value);
        if (incomingMethods.length > 0) {
          const checkQuery = `
            SELECT id FROM clients 
            WHERE EXISTS (
              SELECT 1 FROM jsonb_array_elements(contact_methods) as cm 
              WHERE cm->>'value' = ANY($1::text[])
            ) OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(COALESCE(contacts, '[]'::jsonb)) as contact,
                   jsonb_array_elements(COALESCE(contact->'contactMethods', '[]'::jsonb)) as cm
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
          `INSERT INTO clients (id, user_id, name, company, address, state, city, country, status, tags, last_contact, is_dormant, contact_methods, contacts, primary_contact_id, comments)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [id, null, lead.name, lead.company || '', lead.address || '', lead.state || '', lead.city || '', normalizeCrmCountry(lead.country) || '', 'Leads', JSON.stringify(lead.tags || []), null, false, JSON.stringify(lead.contactMethods || []), JSON.stringify(lead.contacts || []), lead.primaryContactId || null, JSON.stringify(lead.comments || [])]
        );
        addedCount++;
      }
      
      if (addedCount > 0) {
        const importReward = Math.max(0, await getGlobalSettingNumber('point_event_import_lead', 5));
        await adjustUserPoints(req.user.uid, addedCount * importReward, `Imported ${addedCount} public leads`, 'import_public_leads', null, { count: addedCount });
      }
      
      const importReward = Math.max(0, await getGlobalSettingNumber('point_event_import_lead', 5));
      res.json({ success: true, count: addedCount, pointsAdded: addedCount * importReward });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to import leads' });
    }
  });

  app.post('/api/public-leads/bulk-delete', authenticateToken, requireSuperadmin, async (req: any, res) => {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? Array.from(new Set(req.body.ids.map((id: any) => String(id || '').trim()).filter(Boolean)))
        : [];
      if (ids.length === 0) return res.status(400).json({ error: 'No public lead IDs provided' });

      const deletedRes = await pool.query(
        `DELETE FROM clients
         WHERE user_id IS NULL AND id = ANY($1::text[])
         RETURNING id`,
        [ids]
      );
      const deletedIds = deletedRes.rows.map((row: any) => row.id);
      if (deletedIds.length > 0) {
        await pool.query('DELETE FROM deals WHERE client_id = ANY($1::text[])', [deletedIds]);
      }

      res.json({ success: true, count: deletedIds.length, ids: deletedIds });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to bulk delete public leads' });
    }
  });

  app.post('/api/clients', authenticateToken, async (req: any, res) => {
    try {
      const { id, name, company, country, status, tags, lastContact, isDormant, contactMethods, contacts, primaryContactId, comments } = req.body;
      
      const incomingMethods = [
        ...(contactMethods || []),
        ...(contacts || []).flatMap((contact: any) => contact.contactMethods || [])
      ].filter((cm: any) => cm.value).map((cm: any) => cm.value);
      if (incomingMethods.length > 0) {
        const checkQuery = `
          SELECT id FROM clients 
          WHERE user_id = $2 AND (
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(contact_methods) as cm 
              WHERE cm->>'value' = ANY($1::text[])
            ) OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(COALESCE(contacts, '[]'::jsonb)) as contact,
                   jsonb_array_elements(COALESCE(contact->'contactMethods', '[]'::jsonb)) as cm
              WHERE cm->>'value' = ANY($1::text[])
            )
          ) LIMIT 1
        `;
        const checkRes = await pool.query(checkQuery, [incomingMethods, req.user.uid]);
        if (checkRes.rows.length > 0) {
          return res.status(409).json({ error: 'Duplicate contact method found', skipped: true, existingId: checkRes.rows[0].id });
        }
      }

      await pool.query(
        `INSERT INTO clients (id, user_id, name, company, address, state, city, country, status, tags, last_contact, is_dormant, contact_methods, contacts, primary_contact_id, comments, preferred_language, preferred_time_range, agent_workflow_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [id, req.body.isPublic ? null : req.user.uid, name, company, req.body.address || null, req.body.state || null, req.body.city || null, country, status, JSON.stringify(tags || []), lastContact || null, !!isDormant, JSON.stringify(contactMethods || []), JSON.stringify(contacts || []), primaryContactId || null, JSON.stringify(comments || []), req.body.preferredLanguage || null, req.body.preferredTimeRange || null, req.body.agentWorkflowId || null]
      );

      const createClientReward = Math.max(0, await getGlobalSettingNumber('point_event_add_client', 5));
      await adjustUserPoints(req.user.uid, createClientReward, 'Created client', 'client_create', id, { clientId: id });
      if (!req.body.isPublic) {
        await triggerAgentHubEvent(req.user.uid, 'client_created', {
          clientId: id,
          name,
          company,
          country,
          status
        }).catch(err => console.warn('Agent Hub client_created trigger failed', err));
      }

      res.json({ success: true, pointsAdded: createClientReward });
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
        contactMethods: 'contact_methods', contacts: 'contacts', primaryContactId: 'primary_contact_id', comments: 'comments',
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
          values.push((key === 'tags' || key === 'comments' || key === 'contactMethods' || key === 'contacts') ? JSON.stringify(val) : val);
          valIdx++;
        }
      }
      
      if (setClauses.length > 0) {
        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
        await pool.query(`UPDATE clients SET ${setClauses.join(', ')} WHERE id = $1 AND user_id = $2`, values);
        
        if (pointsToAward > 0) {
            const profileRewardMultiplier = Math.max(0, await getGlobalSettingNumber('point_event_enrich_client', 1));
            const adjustedPoints = Math.round(pointsToAward * profileRewardMultiplier);
            await adjustUserPoints(req.user.uid, adjustedPoints, 'Enriched client profile', 'client_update', id, { clientId: id, updatedFields: Object.keys(updates) });
            pointsToAward = adjustedPoints;
        }
        await triggerAgentHubEvent(req.user.uid, 'client_updated', {
          clientId: id,
          updatedFields: Object.keys(updates)
        }).catch(err => console.warn('Agent Hub client_updated trigger failed', err));
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
      
      if (!client.agent_enabled) {
        return res.status(400).json({ error: 'Agent is not enabled for this client' });
      }

      // Fetch context
      const emailsRes = await pool.query(`SELECT * FROM emails WHERE (client_id = $1 OR recipient = $2) AND user_id = $3 ORDER BY date DESC LIMIT 5`, [id, client.email || '', req.user.uid]);
      const logsRes = await pool.query(`SELECT * FROM logs WHERE client_id = $1 ORDER BY date DESC LIMIT 5`, [id]);
      const productsRes = await pool.query(`SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [req.user.uid]); // Top 5 recent products for context
      const kbRes = await searchKnowledgeBase(req.user.uid, id, `Agent follow up strategy for client in ${client.country || client.company || 'foreign trade'}`, undefined, 5);
      const latestCustomerEmail = emailsRes.rows.find((email: any) => ['inbox', 'inbound'].includes(email.type)) || emailsRes.rows[0];
      const resolvedOutboundLanguage = outboundLanguage || getCustomerOutputLanguage({
        lastCommunicationText: latestCustomerEmail?.body,
        preferredLanguage: client.preferred_language,
        country: client.country
      });
      
      const contextPrompt = `
You are an expert sales AI assistant tasked with following up with a specific client.

Client Information:
Name: ${client.name}
Company: ${client.company}
Country: ${client.country}
Preferred Language: ${client.preferred_language || 'Not configured'}
Resolved Customer-Facing Language: ${resolvedOutboundLanguage}
Language policy:
${buildLanguagePolicy({ systemLanguage, customerLanguage: resolvedOutboundLanguage })}
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
- newSummary and suggestedNextStep are internal CRM agent outputs.
- draftEmail is outbound customer-facing content.
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
      if (requestedData?.action === 'delete_deal_comment' && requestedData?.deal_id) {
        await pool.query(`UPDATE deals SET pending_edit_request = TRUE WHERE id = $1 AND user_id = $2`, [requestedData.deal_id, req.user.uid]);
      }
      
      // Award points for enrichment via edit request
      const editRequestReward = Math.max(0, await getGlobalSettingNumber('point_event_edit_request', 5));
      await adjustUserPoints(req.user.uid, editRequestReward, 'Submitted client edit request', 'client_edit_request', id, { clientId: id });

      res.json({ success: true, pointsAdded: editRequestReward });
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

      const publicLeadRes = await pool.query(
        `DELETE FROM clients WHERE id = $1 AND user_id IS NULL AND deleted_by IS NULL RETURNING id`,
        [id]
      );
      if (publicLeadRes.rows.length > 0) {
        await pool.query('DELETE FROM deals WHERE client_id = $1', [id]);
        return res.json({ success: true, permanent: true, publicLead: true });
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
      const result = await pool.query('SELECT * FROM global_settings WHERE key LIKE \'exp_%\' OR key LIKE \'point_cost_%\' OR key LIKE \'point_event_%\' OR key IN (\'agent_polling_interval_seconds\', \'agent_polling_interval_hours\', \'currency_rates\', \'default_quote_currency\', \'currency_rates_updated_at\')');
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

  app.post('/api/admin/settings/currency-rates/update', authenticateToken, requireSuperadmin, async (req: any, res) => {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch public exchange rates' });
      const data = await response.json();
      const rates = data?.rates || {};
      if (!rates.USD) rates.USD = 1;
      const allowed = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'AUD', 'CAD', 'HKD', 'SGD', 'KRW', 'INR', 'AED'];
      const nextRates = allowed.reduce((acc: Record<string, number>, code) => {
        const value = Number(rates[code]);
        if (Number.isFinite(value) && value > 0) acc[code] = value;
        return acc;
      }, { USD: 1 });
      const updatedAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO global_settings (key, value) VALUES
          ('currency_rates', $1),
          ('currency_rates_updated_at', $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [JSON.stringify(nextRates), JSON.stringify(updatedAt)]
      );
      res.json({ success: true, rates: nextRates, updatedAt });
    } catch (e) {
      console.error('Failed to update currency rates', e);
      res.status(500).json({ error: 'Failed to update currency rates' });
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

       if (updates.action === 'delete_client_comment') {
         const commentId = String(updates.comment_id || '');
         const clientData = typeof editReq.original_data === 'string' ? JSON.parse(editReq.original_data) : editReq.original_data;
         const currentRes = await pool.query(`SELECT comments FROM clients WHERE id = $1 AND user_id = $2`, [editReq.client_id, editReq.user_id]);
         const currentComments = currentRes.rows[0]?.comments || clientData.comments || [];
         await pool.query(
           `UPDATE clients SET comments = $2, pending_edit_request = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $3`,
           [editReq.client_id, JSON.stringify(removeCommentById(currentComments, commentId)), editReq.user_id]
         );
         res.json({ success: true });
         return;
       }

       if (updates.action === 'delete_deal_comment') {
         const commentId = String(updates.comment_id || '');
         const dealId = String(updates.deal_id || '');
         const dealRes = await pool.query(`SELECT comments FROM deals WHERE id = $1 AND user_id = $2`, [dealId, editReq.user_id]);
         const currentComments = dealRes.rows[0]?.comments || [];
         await pool.query(
           `UPDATE deals SET comments = $2, pending_edit_request = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $3`,
           [dealId, JSON.stringify(removeCommentById(currentComments, commentId)), editReq.user_id]
         );
         await pool.query(`UPDATE clients SET pending_edit_request = FALSE WHERE id = $1 AND user_id = $2`, [editReq.client_id, editReq.user_id]);
         res.json({ success: true });
         return;
       }

       const mapping: Record<string, string> = {
         name: 'name', company: 'company', country: 'country', status: 'status',
         address: 'address', state: 'state', city: 'city',
         tags: 'tags', lastContact: 'last_contact', isDormant: 'is_dormant',
         contactMethods: 'contact_methods', contacts: 'contacts', primaryContactId: 'primary_contact_id',
         comments: 'comments', preferredLanguage: 'preferred_language', preferredTimeRange: 'preferred_time_range',
         agentWorkflowId: 'agent_workflow_id'
       };
       
       const setClauses = [];
       const values = [editReq.client_id];
       let valIdx = 2;
       
       for (const [key, val] of Object.entries(updates)) {
         if (mapping[key]) {
           setClauses.push(`${mapping[key]} = $${valIdx}`);
           values.push((key === 'tags' || key === 'comments' || key === 'contactMethods' || key === 'contacts') ? JSON.stringify(val) : val as any);
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
       } else if (updates.action === 'delete_client_comment') {
         const commentId = String(updates.comment_id || '');
         const currentRes = await pool.query(`SELECT comments FROM clients WHERE id = $1`, [editReq.client_id]);
         const currentComments = currentRes.rows[0]?.comments || [];
         await pool.query(
           `UPDATE clients SET comments = $2, pending_edit_request = FALSE WHERE id = $1`,
           [editReq.client_id, JSON.stringify(clearCommentPendingDelete(currentComments, commentId))]
         );
       } else if (updates.action === 'delete_deal_comment') {
         const commentId = String(updates.comment_id || '');
         const dealId = String(updates.deal_id || '');
         const dealRes = await pool.query(`SELECT comments FROM deals WHERE id = $1`, [dealId]);
         const currentComments = dealRes.rows[0]?.comments || [];
         await pool.query(
           `UPDATE deals SET comments = $2, pending_edit_request = FALSE WHERE id = $1`,
           [dealId, JSON.stringify(clearCommentPendingDelete(currentComments, commentId))]
         );
         await pool.query(`UPDATE clients SET pending_edit_request = FALSE WHERE id = $1`, [editReq.client_id]);
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
      const pointsAdded = Math.max(0, await getGlobalSettingNumber('point_event_add_knowledge', 3));
      await adjustUserPoints(req.user.uid, pointsAdded, 'Added knowledge base item', 'add_knowledge', id, { knowledgeId: id, clientId: clientId || null });
      res.json({ success: true, data: result.rows[0], pointsAdded });
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

  app.delete('/api/logs/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`
        DELETE FROM logs l
        USING clients c
        WHERE l.id = $1
          AND l.client_id = c.id
          AND c.user_id = $2
        RETURNING l.id
      `, [id, req.user.uid]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Log not found' });
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to delete log' });
    }
  });

  // Test Inbox Connection
  app.post('/api/test-inbox', authenticateToken, async (req: any, res) => {
    try {
      const { id: inboxConfigId, type, host, port, secure, username, password } = req.body;
      
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
      const { id: inboxConfigId, type, host, port, secure, username, password } = req.body;
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
            const senderGeo = extractSenderGeoFromHeaders(parsed.headers);
            
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
                `INSERT INTO emails (id, user_id, client_id, sender, sender_name, recipient, subject, body, date, read, type, inbox_config_id, sender_ip, sender_country, sender_geo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [
                  messageIdStr, req.user.uid, clientId, fromEmail, parsed.from?.value?.[0]?.name || '',
                  toAddress,
                  parsed.subject || '(No Subject)', bodyStr,
                  parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
                  false, 'inbound', inboxConfigId || null,
                  senderGeo.senderIp || null, senderGeo.senderCountry || null, JSON.stringify(senderGeo.senderGeo || null)
                ]
              );
              syncedEmails.push(messageIdStr);
            } else {
              // Update existing email's body to fix missing HTML
              await pool.query(
                'UPDATE emails SET body = $1, sender_ip = COALESCE(sender_ip, $4), sender_country = COALESCE(sender_country, $5), sender_geo = COALESCE(sender_geo, $6::jsonb) WHERE id = $2 AND user_id = $3',
                [bodyStr, messageIdStr, req.user.uid, senderGeo.senderIp || null, senderGeo.senderCountry || null, JSON.stringify(senderGeo.senderGeo || null)]
              );
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
          await triggerAgentHubEvent(req.user.uid, 'email_received', {
            count: syncedEmails.length,
            mailbox: username,
            type,
            emailIds: syncedEmails
          }).catch(err => console.warn('Agent Hub email_received trigger failed', err));
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
          const senderGeo = extractSenderGeoFromHeaders(parsed.headers);
          
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
              `INSERT INTO emails (id, user_id, client_id, sender, sender_name, recipient, subject, body, date, read, type, inbox_config_id, sender_ip, sender_country, sender_geo)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
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
                'inbound',
                inboxConfigId || null,
                senderGeo.senderIp || null,
                senderGeo.senderCountry || null,
                JSON.stringify(senderGeo.senderGeo || null)
              ]
            );
            syncedEmails.push(messageIdStr);
          } else {
            // Update existing email's body to fix missing HTML
            await pool.query(
              'UPDATE emails SET body = $1, sender_ip = COALESCE(sender_ip, $4), sender_country = COALESCE(sender_country, $5), sender_geo = COALESCE(sender_geo, $6::jsonb) WHERE id = $2 AND user_id = $3',
              [bodyStr, messageIdStr, req.user.uid, senderGeo.senderIp || null, senderGeo.senderCountry || null, JSON.stringify(senderGeo.senderGeo || null)]
            );
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
        await triggerAgentHubEvent(req.user.uid, 'email_received', {
          count: syncedEmails.length,
          mailbox: username,
          type,
          emailIds: syncedEmails
        }).catch(err => console.warn('Agent Hub email_received trigger failed', err));
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
        senderIp: row.sender_ip,
        senderCountry: row.sender_country,
        senderGeo: row.sender_geo,
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
        inboxConfigId: row.inbox_config_id,
        outboxConfigId: row.outbox_config_id,
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
      const { id, clientId, sender, senderName, recipient, cc, bcc, subject, body, date, read, type, tags, comments, scheduledAt, attachments, enableTracking, inboxConfigId, outboxConfigId } = req.body;
      
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
      
      let resolvedOutboxConfigId = outboxConfigId || null;
      // If type is sent, actually send the email using configured outbox
      if (type === 'sent') {
        const userRes = await pool.query('SELECT settings FROM users WHERE id = $1', [req.user.uid]);
        const settings = userRes.rows[0]?.settings || {};
        const outboxConfigs = settings.outboxConfigs || [];
        // Match outbox config by sender email, fallback to first config
        const config = outboxConfigs.find((c: any) => c.id === outboxConfigId) || outboxConfigs.find((c: any) => c.fromEmail === sender) || outboxConfigs[0];

        if (config) {
          resolvedOutboxConfigId = config.id || resolvedOutboxConfigId;
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
        `INSERT INTO emails (id, user_id, client_id, sender, sender_name, recipient, cc, bcc, subject, body, date, read, type, tags, comments, scheduled_at, attachments, inbox_config_id, outbox_config_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [id, req.user.uid, clientId || null, sender, senderName, recipient, cc, bcc, subject, finalBody, date || new Date().toISOString(), !!read, type, JSON.stringify(tags || []), JSON.stringify(comments || []), scheduledAt || null, JSON.stringify(attachments || []), inboxConfigId || null, resolvedOutboxConfigId]
      );
      if (clientId) {
        await pool.query(`UPDATE clients SET last_contact = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`, [clientId, req.user.uid]);
      }
      const pointKey = type === 'scheduled' ? 'point_event_schedule_email' : type === 'sent' || type === 'outbound' ? 'point_event_send_email' : '';
      const fallback = type === 'scheduled' ? 1 : 2;
      if (pointKey) {
        const pointsAdded = Math.max(0, await getGlobalSettingNumber(pointKey, fallback));
        await adjustUserPoints(req.user.uid, pointsAdded, type === 'scheduled' ? 'Scheduled email' : 'Sent email', type === 'scheduled' ? 'schedule_email' : 'send_email', id, { emailId: id, clientId: clientId || null });
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
        agentContextAnalysisKey: 'agent_context_analysis_key',
        inboxConfigId: 'inbox_config_id', outboxConfigId: 'outbox_config_id'
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
