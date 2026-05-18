# Sprich! — GCSE German Speaking Tutor

A web app that speaks German questions aloud, listens to spoken answers, and gives warm, encouraging feedback powered by AI.

Live at: **https://germantutor.onrender.com**

---

## How it works

```
Browser                          Server (Node/Express)         External APIs
──────────────────────────────   ──────────────────────────    ─────────────────────
1. Page loads, shows Welcome
2. Student clicks Start
3. Question appears on screen
4. speakQuestion() called  ──►  (browser voices only,          
   Browser SpeechSynthesis       no server call needed)
   speaks question in German
   using Anna (macOS) or best
   available German voice
   └─ if no German voice ──────► POST /api/speak          ──►  Cloudflare Workers AI
                                  returns audio binary          (MeloTTS, German)
                                  browser plays it

5. Mic button activates
6. Chrome Web Speech API
   listens, shows live
   transcript on screen
7. Student stops speaking

8. Answer sent to server ──────► POST /api/mark           ──►  Groq API
                                  sends question + answer       (llama-3.3-70b)
                                  gets back JSON:               marks the answer,
                                  { stars, feedback,            returns score +
                                    correctedAnswer,            feedback in JSON
                                    modelAnswer }

9. Feedback screen shows:
   - Star rating (1–5)
   - Encouraging comment
   - Correction if needed
   - Model answer + Play button

10. Repeat for all 27 questions
11. End screen: score summary,
    option to retry weak answers
```

---

## Tech stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | Four-screen SPA — no framework |
| Backend | Node.js + Express | Proxies API calls so keys stay server-side |
| Voice output | Browser SpeechSynthesis (primary) | Natural German voice (Anna on Mac) |
| Voice output | Cloudflare Workers AI MeloTTS (fallback) | Used if no German voice installed |
| Speech input | Chrome Web Speech API | Listens to student's spoken German |
| Answer marking | Groq API (llama-3.3-70b) | Scores answers 1–5 stars with feedback |
| Hosting | Render (free tier) | Deployed via GitHub, auto-redeploys on push |

---

## File structure

```
german-tutor/
├── server.js           — Express backend: /api/mark (Groq) and /api/speak (Cloudflare)
├── package.json
├── render.yaml         — Render deployment config
├── .env.example        — Template for required environment variables
├── .gitignore
├── README.md
└── public/
    ├── index.html      — HTML shell
    ├── questions.js    — All 27 GCSE German questions (edit here to change questions)
    ├── app.js          — All app logic: state machine, TTS, speech recognition, screens
    └── style.css       — Full stylesheet and animations
```

---

## Running locally

**Prerequisites:** Node.js 18+, Chrome browser

```bash
npm install
cp .env.example .env
# Fill in your keys in .env
node server.js
```

Open Chrome at **http://localhost:3000**

---

## Deploying to Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo
3. Render detects `render.yaml` automatically
4. Under **Environment**, add:
   - `GROQ_API_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
5. Click **Deploy** — Render gives you a permanent URL

Any push to GitHub triggers an automatic redeploy.

---

## Where to get your keys

| Key | Where |
|---|---|
| `GROQ_API_KEY` | console.groq.com → API Keys (free) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages (right sidebar) |
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com/profile/api-tokens → Create Token → Workers AI |

---

## Updating the questions

All 27 questions live in `public/questions.js` as a plain JavaScript array. Edit that file and push to GitHub — Render redeploys automatically.

---

## Troubleshooting

- **Microphone not working:** Chrome needs mic permission — check `chrome://settings/content/microphone`
- **No audio:** Check your Cloudflare token has Workers AI permission
- **Speech not recognised:** Speak clearly in German; Chrome must be picking up sound
- **Slow first load:** Render's free tier sleeps after 15 min of inactivity — first load after sleep takes ~30s
