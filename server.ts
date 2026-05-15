import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
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
  app.post("/api/chat/magic", async (req, res) => {
    try {
      const { command, context, llmConfig } = req.body;
      const prompt = `You are an AI assistant in a Foreign Trade CRM. 
User executed magic command: "${command}". 
Client Context: ${JSON.stringify(context)}.
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
  app.post("/api/chat/icebreaker", async (req, res) => {
    try {
      const { client, logs, llmConfig } = req.body;
      const prompt = `You are a savvy foreign trade AI assistant.
Analyze this client and their recent logs.
Client: ${JSON.stringify(client)}
Logs: ${JSON.stringify(logs)}

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
      const role = email === 'samlau0086@gmail.com' ? 'superadmin' : 'user';

      const result = await pool.query(
        `INSERT INTO users (id, email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, email, display_name, role, avatar_url, created_at, updated_at`,
        [id, email, passwordHash, displayName, role]
      );
      
      const user = result.rows[0];
      const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({ token, user: {
        id: user.id, email: user.email, role: user.role, displayName: user.display_name, avatarUrl: user.avatar_url, createdAt: user.created_at, updatedAt: user.updated_at
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
        id: user.id, email: user.email, role: user.role, displayName: user.display_name, avatarUrl: user.avatar_url, createdAt: user.created_at, updatedAt: user.updated_at
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
        id: user.id, email: user.email, role: user.role, displayName: user.display_name, avatarUrl: user.avatar_url, createdAt: user.created_at, updatedAt: user.updated_at
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
  const authenticateToken = (req: any, res: any, next: any) => {
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
      const { displayName, avatarUrl, role } = req.body;
      
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
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [displayName !== undefined ? displayName : null, avatarUrl !== undefined ? avatarUrl : null, updateRole, uid]
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

  await initDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
