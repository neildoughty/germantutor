'use strict';

const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are a friendly, encouraging German language tutor helping a 13-year-old UK student prepare for their Year 8 oral assessment. Your job is to mark their spoken German answers.

The student is at KS3 level. They are learning:
- Present tense (ich bin, ich habe, ich mache, ich esse, etc.)
- Perfect tense for past events (ich habe gemacht, ich bin gefahren)
- Future with "werden" (ich werde machen) and "möchten" (ich möchte fahren)
- Basic cases: nominative and accusative
- Common vocabulary: family, hobbies, school, food, travel, daily routine
- Opinions with reasons: ich finde... weil..., ich mag... weil...

When marking:
1. Award stars 1-5 (see criteria below)
2. Give a SHORT, warm, encouraging feedback comment in English (2-3 sentences max)
3. If there are errors, gently identify the most important one and give the correct version
4. Provide a "model answer" — a short, correct example German answer they could have given

Star criteria:
- 1 star: No attempt or completely incomprehensible
- 2 stars: Some German words used but answer is largely incorrect or incomplete
- 3 stars: Answer is understandable and relevant but has grammatical errors (wrong tense, wrong verb form, missing gender agreement)
- 4 stars: Good answer with only minor errors
- 5 stars: Excellent — correct vocabulary, grammar and tense for their level

Tone: Be like an encouraging teacher, not a strict examiner. Celebrate effort. Use phrases like "Great try!", "Almost perfect!", "Good use of the perfect tense there!"

Respond ONLY in this JSON format, with no preamble or markdown:
{
  "stars": 4,
  "feedback": "Great answer! You used the perfect tense correctly. Next time, try to add a reason using 'weil'.",
  "correctedAnswer": "Ich habe Fußball gespielt, weil es Spaß macht.",
  "modelAnswer": "Letztes Wochenende habe ich Fußball mit meinem Freund gespielt. Es war toll!"
}`;

// POST /api/mark
app.post('/api/mark', async (req, res) => {
  const { question, answer, level } = req.body;
  if (!question) return res.status(400).json({ error: 'question required' });

  const levelNote = level === 'Higher'
    ? 'The student is attempting Higher tier (grades 4–9). Reward use of multiple tenses, complex structures, and extended answers.'
    : 'The student is attempting Foundation tier (grades 1–5). Focus on basic vocabulary and simple grammatical structures.';

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 512,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n${levelNote}` },
        { role: 'user', content: `Question: ${question}\nStudent's answer: ${answer || '(no answer given)'}` }
      ]
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: 'Marking failed' });
  }
});

// GET /api/syllabus — returns the AQA GCSE German theme/topic structure
app.get('/api/syllabus', (req, res) => {
  res.json(require('./data/aqa-gcse-german.json'));
});

// POST /api/questions/generate
// Body: { theme, level, count }
//   theme  — theme name, or "all" for a quickfire mix across every theme
//   level  — "Foundation" | "Higher"
//   count  — number of questions (default 5)
app.post('/api/questions/generate', async (req, res) => {
  const { theme, level, count = 5 } = req.body;
  if (!level) return res.status(400).json({ error: 'level required' });

  const levelGuide = level === 'Higher'
    ? 'Higher tier: complex vocabulary, multiple tenses (present, perfect, future, imperfect), subordinate clauses, opinions with justification'
    : 'Foundation tier: simple vocabulary, mainly present tense with some perfect and future tense, straightforward questions';

  const scope = (!theme || theme === 'all')
    ? 'Spread questions evenly across all three AQA GCSE German themes: People & lifestyle, Popular culture, and Communication & the world around us.'
    : `Focus on the AQA GCSE German theme: "${theme}". Spread questions across the different topics within this theme.`;

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate exactly ${count} spoken German questions for a GCSE oral practice app.

${scope}
Level: ${level} — ${levelGuide}

Requirements:
- Questions must be in German only
- Vary the types: descriptions, opinions, past experiences, future plans, comparisons
- Natural oral exam questions, not written exercises
- Return ONLY a valid JSON array of strings, no explanation, no markdown:
["Question 1?", "Question 2?", ...]`
        }
      ]
    });

    const raw = completion.choices[0].message.content.trim();
    const questions = JSON.parse(raw);
    if (!Array.isArray(questions)) throw new Error('Not an array');
    res.json({ questions });
  } catch (err) {
    console.error('Question generation error:', err.message);
    res.status(500).json({ error: 'Question generation failed' });
  }
});

// POST /api/speak
app.post('/api/speak', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/myshell-ai/melo-tts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, lang: 'DE' })
      }
    );

    if (!response.ok) {
      throw new Error(`Cloudflare TTS returned ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error('TTS error:', err.message);
    res.status(500).json({ error: 'TTS failed' });
  }
});

// POST /api/transcribe
// Body: { audio: base64String, mimeType: string }
app.post('/api/transcribe', async (req, res) => {
  const { audio, mimeType } = req.body;
  if (!audio) return res.status(400).json({ error: 'audio required' });

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const buffer = Buffer.from(audio, 'base64');
    const file = new File([buffer], 'recording.webm', { type: mimeType || 'audio/webm' });

    const result = await client.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language: 'de',
    });

    res.json({ transcript: result.text || '' });
  } catch (err) {
    console.error('Transcription error:', err.message);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sprich! running on http://localhost:${PORT}`));
