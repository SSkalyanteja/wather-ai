import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.html'));
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format.' });
  }

  const apiKey = GEMINI_API_KEY ? GEMINI_API_KEY.trim() : '';
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Format chat history for the SDK
    const contents = messages.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: "You are Wather (Beta v0.9), an adaptive AI intelligence platform designed and architected by Kalyan Teja Siddiraju. Deliver sharp, accurate, well-formatted technical responses with clear code blocks and markdown."
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ text: `\n\nAI Engine Error: ${err.message}` })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Wather server active on port ${PORT}`);
});