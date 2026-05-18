# Sprich! — GCSE German Speaking Tutor

A web app that speaks German questions aloud, listens to spoken answers, and gives warm, intelligent feedback using Claude AI.

---

## Running locally

**Prerequisites:** Node.js 18+, Chrome browser

```bash
npm install
cp .env.example .env
# Fill in the three keys in .env
node server.js
```

Open Chrome at **http://localhost:3000**

---

## Deploying to Render

1. Push this project to a GitHub repository
2. Go to [render.com](https://render.com) and create a free account
3. Click **New Web Service** → connect your GitHub repo
4. Render detects `render.yaml` automatically
5. In the Render dashboard under **Environment**, add:
   - `ANTHROPIC_API_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
6. Click **Deploy** — Render gives you a permanent URL (e.g. `https://german-tutor.onrender.com`)
7. Share that URL — works in Chrome on any device

---

## Where to get your keys

| Key | Where to find it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages (right sidebar) |
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com/profile/api-tokens → Create Token → Workers AI Read |

---

## Troubleshooting

- **Microphone not working:** Chrome needs microphone permission — check `chrome://settings/content/microphone`
- **Audio not playing:** Check your Cloudflare API token has Workers AI Read permission
- **Speech not recognised:** Speak clearly in German; check Chrome's mic is picking up sound
- **Slow first load on Render:** The free tier sleeps after 15 minutes of inactivity — the first load after sleep takes ~30 seconds. This is normal.
- **No mic in your browser:** A text input fallback will appear automatically
