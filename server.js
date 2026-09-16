import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default Route serves landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// App Route
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Streaming Chat API Endpoint
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages array provided.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const latestQuery = messages[messages.length - 1]?.content || '';
  const simulatedResponse = `Analyzing your architecture query: **"${latestQuery}"**\n\n` +
    `Here is the architectural breakdown:\n\n` +
    `1. **Stateless Core**: Using SSE (Server-Sent Events) keeps connection overhead minimal.\n` +
    `2. **State Isolation**: Client sessions remain keyed strictly to local token enclaves.\n` +
    `3. **Resilient Failover**: If backend clusters detach, the interface falls back smoothly.\n\n` +
    `\`\`\`javascript\n// Wather Runtime Verification\nconst status = "Engine Online (Beta)";\nconsole.log({ status, version: "0.9.0" });\n\`\`\`\n\n` +
    `Let me know if you would like to refactor any specific module!`;

  const tokens = simulatedResponse.split(' ');

  for (let i = 0; i < tokens.length; i++) {
    if (res.writableEnded) break;
    const chunk = (i === 0 ? '' : ' ') + tokens[i];
    res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 35));
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Wather Core active at http://localhost:${PORT}`);
  console.log(`🌐 Landing: http://localhost:${PORT}/`);
  console.log(`⚡ App:     http://localhost:${PORT}/index.html`);
  console.log(`=========================================`);
});