import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Magic command completion
  app.post("/api/chat/magic", async (req, res) => {
    try {
      const { command, context } = req.body;
      const prompt = `You are an AI assistant in a Foreign Trade CRM. 
User executed magic command: "${command}". 
Client Context: ${JSON.stringify(context)}.
If the command asks to follow up or draft an email, write a short, professional, yet engaging drafted email.
Respond only with the draft or the direct output of the action requested. Do not include markdown formatting like \`\`\`.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to process magic command" });
    }
  });

  // Emotional Thermometer & Icebreaker
  app.post("/api/chat/icebreaker", async (req, res) => {
    try {
      const { client, logs } = req.body;
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
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate icebreaker" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
