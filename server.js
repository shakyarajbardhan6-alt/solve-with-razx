require('dotenv').config();

const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const Groq = require('groq-sdk');

const app = express();
const port = Number(process.env.PORT) || 3000;
const subjects = new Set([
  'Mathematics',
  'Physics',
  'Chemistry',
  'Computer Science',
  'Programming',
  'English',
  'General'
]);
const systemPrompt = `You are Doubt Solver, an educational AI tutor.

Your goal is to help students understand academic concepts rather than simply giving unexplained answers.

Rules:
- Give accurate, clear and student-friendly explanations.
- For numerical problems, show the formula, substitution, calculation and final answer.
- Break difficult concepts into simple steps.
- If the student asks in Hindi or Hinglish, answer in the same style.
- Use Markdown formatting where useful.
- Use mathematical notation when appropriate.
- If the question is unclear, state the assumption.
- Never pretend to know something you are uncertain about.
- Do not fabricate sources.
- End numerical/conceptual solutions with a clearly labelled Final Answer or Key Takeaway.
- Encourage learning and understanding.`;

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const trustProxyHops = process.env.TRUST_PROXY_HOPS;

if (trustProxyHops) {
  const hopCount = Number(trustProxyHops);
  if (!Number.isSafeInteger(hopCount) || hopCount < 1) {
    throw new Error('TRUST_PROXY_HOPS must be a positive integer.');
  }
  app.set('trust proxy', hopCount);
}

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  }
}));
app.use(express.json({ limit: '10kb', strict: true }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const solveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again in a little while.' }
});

app.post('/api/solve', solveLimiter, async (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ success: false, error: 'Send the question as JSON.' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, error: 'Request body must be a JSON object.' });
  }

  const { question, subject } = body;
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ success: false, error: 'Please enter a question.' });
  }
  if (question.length > 3000) {
    return res.status(400).json({ success: false, error: 'Questions must be 3000 characters or fewer.' });
  }
  if (typeof subject !== 'string' || !subjects.has(subject)) {
    return res.status(400).json({ success: false, error: 'Choose a valid subject.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ success: false, error: 'The solver is not configured yet. Please try again later.' });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 30000, maxRetries: 1 });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.4,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Subject: ${subject}\n\nStudent question:\n${question.trim()}` }
      ]
    });
    const answer = completion.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return res.status(502).json({ success: false, error: 'The solver returned an empty answer. Please try again.' });
    }
    return res.json({ success: true, answer, subject });
  } catch (error) {
    const status = Number(error.status);
    if (status === 429) {
      return res.status(503).json({ success: false, error: 'The AI service is busy. Please try again shortly.' });
    }
    if (status >= 400 && status < 500 && status !== 408) {
      console.error('Doubt Solver AI request rejected by provider:', status);
      if (status === 401 || status === 403) {
        return res.status(503).json({ success: false, error: 'The AI provider rejected the server credentials. Check the server configuration.' });
      }
      return res.status(502).json({ success: false, error: 'The AI service could not process this question.' });
    }
    console.error('Doubt Solver AI request failed:', error.name || 'UnknownError');
    return res.status(status === 408 || error.name === 'APIConnectionTimeoutError' ? 504 : 502)
      .json({ success: false, error: 'We could not reach the AI solver. Please try again.' });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Request body contains invalid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request body is too large.' });
  }
  console.error('Request failed:', error.name || 'UnknownError');
  return res.status(500).json({ success: false, error: 'An unexpected server error occurred.' });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Doubt Solver is running on port ${port}`));
}

module.exports = app;