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

// Keep-alive health probe for uptime monitors
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'active', system: 'Wather Core v0.9' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.html'));
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages array.' });
  }

  const apiKey = GEMINI_API_KEY ? GEMINI_API_KEY.trim() : '';
  if (!apiKey) {
    return res.status(500).json({ error: 'System API key unconfigured.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const ai = new GoogleGenAI({ apiKey });

  // Format context history
  const contents = messages.slice(-10).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const systemInstruction = 
    "You are Wather (Beta v0.9), an adaptive intelligence system architected by Kalyan Teja Siddiraju. " +
    "Deliver sharp, accurate, highly technical, and direct responses. Use clean markdown and code blocks when helpful.";

  // High-performance tiered cascade
  const modelTiers = ['gemini-3.6-flash', 'gemini-2.5-flash'];
  let responseStream = null;
  let activeError = null;

  for (const model of modelTiers) {
    try {
      responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: { 
          systemInstruction,
          temperature: 0.7
        }
      });
      if (responseStream) break;
    } catch (err) {
      activeError = err;
      console.warn(`[Wather Engine] Tier ${model} throttled (${err.message}). Cascading to next tier...`);
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (!responseStream) {
    const errorMsg = activeError?.message?.includes('503')
      ? "Engine capacity saturated across clusters. Please resend in 5 seconds."
      : "Engine link interrupted. Please try again.";

    res.write(`data: ${JSON.stringify({ text: `\n\n*[${errorMsg}]*` })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  try {
    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (streamErr) {
    res.write(`data: ${JSON.stringify({ text: '\n\n*[Connection stream paused]*' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`[Wather Engine] Service online on port ${PORT}`);
});