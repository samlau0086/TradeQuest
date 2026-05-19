import express from "express";
import path from "path";
import multer from "multer";
import { createRequire } from 'module';
const customRequire = typeof require !== "undefined" ? require : createRequire(import.meta.url);
const pdfParse = customRequire("pdf-parse");
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

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
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_last_run TIMESTAMP WITH TIME ZONE;

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
        content TEXT
      );

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
    if (llmConfig.provider === 'openai' || llmConfig.provider === 'custom_openai') {
      const openai = new OpenAI({
        apiKey: llmConfig.apiKey,
        baseURL: llmConfig.baseURL || undefined,
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

  app.use(express.json());

  // Magic command completion
  app.post("/api/chat/magic", authenticateToken, async (req: any, res) => {
    try {
      const { command, context, llmConfig, embeddingLlmConfig } = req.body;
      
      const kbRes = await searchKnowledgeBase(req.user.uid, context?.clientId || null, command, embeddingLlmConfig || llmConfig);
      
      const prompt = `You are an AI assistant in a Foreign Trade CRM. 
User executed magic command: "${command}". 
Client Context: ${JSON.stringify(context)}.
Knowledge Base (RAG):
${kbRes.rows.map(kb => `[${kb.title}]\n${kb.content}`).join('\n\n')}
If the command asks to follow up or draft an email, write a short, professional, yet engaging drafted email.
Respond only with the draft or the direct output of the action requested. Do not include markdown formatting like \`\`\`.`;
      
      const text = await callAI(prompt, llmConfig, false);
      res.json({ result: text });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to process magic command" });
    }
  });

  // Emotional Thermometer & Icebreaker
  app.post("/api/chat/icebreaker", authenticateToken, async (req: any, res) => {
    try {
      const { client, logs, llmConfig, embeddingLlmConfig } = req.body;
      
      const kbRes = await searchKnowledgeBase(req.user.uid, client?.id || null, `Icebreaker and follow up strategy for client in ${client?.company || 'foreign trade'}`, embeddingLlmConfig || llmConfig, 5);
      
      const prompt = `You are a savvy foreign trade AI assistant.
Analyze this client and their recent logs.
Client: ${JSON.stringify(client)}
Logs: ${JSON.stringify(logs)}
Knowledge Base (RAG):
${kbRes.rows.map(kb => `[${kb.title}]\n${kb.content}`).join('\n\n')}

Return a JSON object:
{
  "sentiment": "HOT" | "WARM" | "COLD",
  "temperature": number (0-100, 100 being hot),
  "icebreaker": "A short, localized, personal opening sentence (e.g., 'Happy holidays!', 'Hope your team won the match!', 'Seeing the weather in [country] is nice!')",
  "summary": "A 1-sentence zero-input log summary of the interaction style."
}
No markdown wrappers, just valid JSON.`;
      
      const text = await callAI(prompt, llmConfig, true);
      const parsed = JSON.parse(text || '{}');
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
      const settingsRes = await pool.query("SELECT value FROM global_settings WHERE key = 'agent_polling_interval_hours'");
      if (settingsRes.rows.length === 0) return; // Not configured yet
      const intervalHours = parseFloat(settingsRes.rows[0].value);
      if (isNaN(intervalHours) || intervalHours <= 0) return;

      const clientsRes = await pool.query(`
        SELECT * FROM clients 
        WHERE agent_enabled = TRUE 
          AND (agent_last_run IS NULL OR agent_last_run < NOW() - INTERVAL '1 hour' * $1)
      `, [intervalHours]);

      for (const client of clientsRes.rows) {
        try {
          console.log(`Running background agent for client ${client.id}`);
          // Fetch context
          const emailsRes = await pool.query(`SELECT * FROM emails WHERE (client_id = $1 OR recipient = $2) AND user_id = $3 ORDER BY date DESC LIMIT 5`, [client.id, client.email || '', client.user_id]);
          const logsRes = await pool.query(`SELECT * FROM logs WHERE client_id = $1 ORDER BY date DESC LIMIT 5`, [client.id]);
          const productsRes = await pool.query(`SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [client.user_id]); 
          const kbRes = await searchKnowledgeBase(client.user_id, client.id, `Agent follow up strategy for client in ${client.country || client.company || 'foreign trade'}`, undefined, 5);
          
          const contextPrompt = `
You are an expert sales AI assistant tasked with following up with a specific client.

Client Information:
Name: ${client.name}
Company: ${client.company}
Country: ${client.country}
Agent Context / Instructions: ${client.agent_context || 'None'}
Long-term Summary: ${client.agent_summary || 'None'}

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
Your output MUST be a JSON object with the following schema:
{
  "newSummary": "An updated long-term summary incorporating the new history. Max 3 sentences.",
  "suggestedNextStep": "A short sentence describing what should be done next to follow up. (e.g. 'Follow up on the pricing proposal from last week.')",
  "draftEmail": "If an email should be sent, provide the body of a drafted email here. Otherwise, leave empty."
}
No markdown wrappers, just valid JSON.`;

          // use default internal AI
          const aiResponse = await callAI(prompt, null, true);
          const parsed = JSON.parse(aiResponse || '{}');
          
          const newSummary = parsed.newSummary || client.agent_summary;
          const nextStep = parsed.suggestedNextStep || 'Needs follow up.';
          const draftEmail = parsed.draftEmail || '';

          let nextRun = new Date().toISOString();

          await pool.query(
            'UPDATE clients SET agent_summary = $1, agent_next_step = $2, agent_last_run = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
            [newSummary, nextStep, nextRun, client.id]
          );

          if (client.agent_mode === 'auto_email' && draftEmail) {
            const emailId = `e${Date.now()}${Math.floor(Math.random()*1000)}`;
            await pool.query(
              `INSERT INTO emails (id, user_id, client_id, sender, recipient, subject, body, date, read, direction, type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, 'outbound', 'Auto Follow-up')`,
              [emailId, client.user_id, client.id, 'AutoAgent', client.email || 'unknown@example.com', 'Follow Up', draftEmail, new Date().toISOString()]
            );
            await pool.query(
              `INSERT INTO logs (id, client_id, date, content) VALUES ($1, $2, $3, $4)`,
              [`l${Date.now()}${Math.floor(Math.random()*1000)}`, client.id, new Date().toISOString(), 'Auto-Agent sent follow up email.']
            );
          }
        } catch (err) {
          console.error(`Failed to run agent for ${client.id}`, err);
        }
      }
    } catch (e) {
      console.error('Failed to run agent polling:', e);
    }
  };

  // Run agent polling every 10 minutes
  setInterval(runAgentPolling, 10 * 60 * 1000);
  
  // Deals API Endpoints
  app.get('/api/deals', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM deals WHERE user_id = $1 ORDER BY updated_at DESC', [req.user.uid]);
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
        await pool.query(
          `UPDATE deals SET ${updates.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1}`,
          values
        );
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
      await pool.query('DELETE FROM deals WHERE id = $1 AND user_id = $2', [id, req.user.uid]);
      res.json({ success: true });
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
        agentNextStep: row.agent_next_step
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
        agentNextStep: row.agent_next_step
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
        `INSERT INTO clients (id, user_id, name, company, address, state, city, country, status, tags, last_contact, is_dormant, contact_methods, comments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [id, req.body.isPublic ? null : req.user.uid, name, company, req.body.address || null, req.body.state || null, req.body.city || null, country, status, JSON.stringify(tags || []), lastContact || null, !!isDormant, JSON.stringify(contactMethods || []), JSON.stringify(comments || [])]
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
        agentNextStep: 'agent_next_step'
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
      const { llmConfig } = req.body;
      
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
      
      const contextPrompt = `
You are an expert sales AI assistant tasked with following up with a specific client.

Client Information:
Name: ${client.name}
Company: ${client.company}
Country: ${client.country}
Agent Context / Instructions: ${client.agent_context || 'None'}
Long-term Summary: ${client.agent_summary || 'None'}

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
      const result = await pool.query('SELECT * FROM global_settings WHERE key LIKE \'exp_%\' OR key = \'agent_polling_interval_hours\'');
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
        JOIN clients c ON r.client_id = c.id
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
       await pool.query(`UPDATE client_edit_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [requestId]);
       
       const reqRes = await pool.query(`SELECT client_id FROM client_edit_requests WHERE id = $1`, [requestId]);
       if (reqRes.rows.length > 0) {
           await pool.query(`UPDATE clients SET pending_edit_request = FALSE WHERE id = $1`, [reqRes.rows[0].client_id]);
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
      if (llmConfig && (llmConfig.provider === 'openai' || llmConfig.provider === 'custom_openai')) {
         const openai = new OpenAI({
           apiKey: llmConfig.apiKey,
           baseURL: llmConfig.provider === 'custom_openai' ? llmConfig.baseURL || llmConfig.endpoint : undefined,
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
        content: row.content
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  app.post('/api/logs', authenticateToken, async (req: any, res) => {
    try {
      const { id, clientId, date, content } = req.body;
      await pool.query(
        `INSERT INTO logs (id, client_id, date, content) VALUES ($1, $2, $3, $4)`,
        [id, clientId, date || new Date().toISOString(), content]
      );
      await pool.query(`UPDATE clients SET last_contact = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`, [clientId, req.user.uid]);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to add log' });
    }
  });

  // Emails API
  app.get('/api/emails', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM emails WHERE user_id = $1 ORDER BY date DESC', [req.user.uid]);
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
        attachments: row.attachments
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch emails' });
    }
  });

  app.post('/api/emails', authenticateToken, async (req: any, res) => {
    try {
      const { id, clientId, sender, senderName, recipient, cc, bcc, subject, body, date, read, type, tags, comments, scheduledAt, attachments } = req.body;
      
      await pool.query(
        `INSERT INTO emails (id, user_id, client_id, sender, sender_name, recipient, cc, bcc, subject, body, date, read, type, tags, comments, scheduled_at, attachments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [id, req.user.uid, clientId || null, sender, senderName, recipient, cc, bcc, subject, body, date || new Date().toISOString(), !!read, type, JSON.stringify(tags || []), JSON.stringify(comments || []), scheduledAt || null, JSON.stringify(attachments || [])]
      );
      if (clientId) {
        await pool.query(`UPDATE clients SET last_contact = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`, [clientId, req.user.uid]);
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to save email' });
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
        read: 'read', type: 'type', tags: 'tags', comments: 'comments', date: 'date'
      };
      
      for (const [key, val] of Object.entries(updates)) {
        if (mapping[key]) {
          setClauses.push(`${mapping[key]} = $${valIdx}`);
          values.push((key === 'tags' || key === 'comments') ? JSON.stringify(val) : val);
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
