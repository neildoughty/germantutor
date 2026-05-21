'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  screen: 'welcome',    // 'welcome' | 'question' | 'feedback' | 'end'
  themeId: null,
  questionPool: [],     // [{de, en, topic}] for this session
  qIndex: 0,
  scores: [],           // star score per answered question
  streak: 0,
  micState: 'speaking', // 'speaking' | 'idle' | 'listening'
  listenTime: 0,
  listenInterval: null,
  transcript: '',
  markingResult: null,
  isMarking: false,
  audioObj: null,
  mediaStream: null,
  mediaRecorder: null,
  audioChunks: [],
};

// ─── Computed helpers ─────────────────────────────────────────────────────────
const totalStars   = () => state.scores.reduce((a, b) => a + b, 0);
const weakCount    = () => state.scores.filter(s => s < 3).length;
const currentQ     = () => state.questionPool[state.qIndex];
const totalQ       = () => state.questionPool.length;
const isLast       = () => state.qIndex >= state.questionPool.length - 1;
const currentTheme = () => window.THEMES.find(t => t.id === state.themeId);

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
const I = {
  back:      `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
  arrowSm:   `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`,
  refresh:   `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  refreshLg: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  skip:      `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`,
  mic:       `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>`,
  weak:      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-6M12 8V4M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24M2 12h6M16 12h6"/></svg>`,
  play:      `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  cardArrow: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`,
};

function starSVG(size, filled, earned = true) {
  const id = `gold-${size}-${filled ? 1 : 0}`;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient></defs>
    <path d="M12 2.5l2.92 6.26 6.88.78-5.1 4.7 1.42 6.76L12 17.55 5.88 21l1.42-6.76-5.1-4.7 6.88-.78L12 2.5z"
      fill="${filled ? `url(#${id})` : 'transparent'}"
      stroke="${earned ? '#f59e0b' : 'rgba(148,163,184,.32)'}"
      stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function waveformHTML(micState) {
  const color = micState === 'listening' ? 'var(--accent-listen)'
              : micState === 'speaking'  ? 'var(--accent-speak)'
              : 'rgba(148,163,184,.35)';
  const active = micState === 'speaking' || micState === 'listening';
  const bars = Array.from({ length: 28 }, (_, i) => {
    const s = Math.sin(i * 12.9898) * 43758.5453;
    const h = 0.35 + (s - Math.floor(s)) * 0.6;
    return `<span class="wf-bar" style="--h:${h};--i:${i};background:${color};animation-play-state:${active ? 'running' : 'paused'}"></span>`;
  }).join('');
  return `<div class="waveform" data-state="${micState}">${bars}</div>`;
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function topBarHTML() {
  const theme = currentTheme();
  const pct = Math.min(100, (state.qIndex / totalQ()) * 100);
  const streakPill = state.streak >= 3
    ? `<div class="streak-pill"><span class="streak-flame">🔥</span><span class="streak-num">${state.streak}</span></div>` : '';
  return `
    <header class="topbar">
      <button class="topbar-back" id="back-btn" aria-label="Back to themes">
        ${I.back}
        <span class="topbar-back-label">
          <span class="topbar-back-eyebrow">Theme</span>
          <span class="topbar-back-name">${escapeHTML(theme?.name || '')}</span>
        </span>
      </button>
      <div class="progress">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label">Question <b>${state.qIndex + 1}</b> of ${totalQ()}</div>
      </div>
      <div class="topbar-right">
        ${streakPill}
        <div class="star-counter">${starSVG(20, true)}<span>${totalStars()}</span></div>
      </div>
    </header>`;
}

// ─── Theme card ───────────────────────────────────────────────────────────────
function themeCardHTML(theme, large = false) {
  const accent     = `oklch(0.7 0.18 ${theme.accentHue})`;
  const accentSoft = `oklch(0.7 0.18 ${theme.accentHue} / 0.18)`;
  const accentGlow = `oklch(0.7 0.18 ${theme.accentHue} / 0.35)`;
  const count = theme.isMix ? 10 : theme.questions.length;
  const topicsHTML = theme.isMix ? '' : `
    <ul class="theme-card-topics">
      ${theme.topics.map(t => `<li>${escapeHTML(t)}</li>`).join('')}
    </ul>`;
  const pillHTML = theme.isMix
    ? `<div class="theme-card-pill"><span>🎲</span> Random</div>` : '';

  return `
    <button class="theme-card${large ? ' is-large' : ''}${theme.isMix ? ' is-mix' : ''}"
      data-theme-id="${theme.id}"
      style="--card-accent:${accent};--card-accent-soft:${accentSoft};--card-accent-glow:${accentGlow}"
      aria-label="Practise ${escapeHTML(theme.name)}">
      <div class="theme-card-glow" aria-hidden="true"></div>
      <div class="theme-card-head">
        <div class="theme-card-de">${escapeHTML(theme.nameDe)}</div>
        ${pillHTML}
      </div>
      <h3 class="theme-card-title">${escapeHTML(theme.name)}</h3>
      <p class="theme-card-blurb">${escapeHTML(theme.blurb)}</p>
      ${topicsHTML}
      <div class="theme-card-foot">
        <span class="theme-card-count"><b>${count}</b> questions</span>
        <span class="theme-card-arrow" aria-hidden="true">${I.cardArrow}</span>
      </div>
    </button>`;
}

// ─── Welcome / theme picker ───────────────────────────────────────────────────
function renderWelcome() {
  const el = document.createElement('section');
  el.className = 'screen welcome';
  const regularThemes = window.THEMES.filter(t => !t.isMix);
  const mixThemes = window.THEMES.filter(t => t.isMix);

  el.innerHTML = `
    <header class="welcome-header">
      <div class="welcome-brand">
        <span class="brand-orb" aria-hidden="true">
          <span class="brand-orb-ring brand-orb-ring-1"></span>
          <span class="brand-orb-ring brand-orb-ring-2"></span>
          <span class="brand-orb-core"></span>
        </span>
        <span class="brand-word">Sprich<span class="title-bang">!</span></span>
      </div>
      <div class="welcome-meta-row">
        <span class="meta-chip">AQA · GCSE German</span>
        <span class="meta-chip">Speaking practice</span>
      </div>
    </header>
    <div class="welcome-intro">
      <h1 class="welcome-h1">Pick a theme to practise.</h1>
      <p class="welcome-sub">Sprich! will ask questions out loud and listen to your answer. Stick with one theme, or shuffle them for a full exam-style run.</p>
    </div>
    <div class="theme-grid">
      ${regularThemes.map(t => themeCardHTML(t)).join('')}
    </div>
    <div class="theme-grid theme-grid-mix">
      ${mixThemes.map(t => themeCardHTML(t, true)).join('')}
    </div>
    <footer class="welcome-foot">
      <span>Tip · Answer out loud, full sentences, in German.</span>
    </footer>`;

  el.querySelectorAll('.theme-card').forEach(btn => {
    btn.addEventListener('click', () => pickTheme(btn.dataset.themeId));
  });
  return el;
}

// ─── Question screen ──────────────────────────────────────────────────────────
function renderQuestion() {
  const q = currentQ();
  const el = document.createElement('section');
  el.className = 'screen question';
  el.innerHTML = `
    ${topBarHTML()}
    <div class="q-stage">
      <div class="q-eyebrow">
        <span class="q-num">Question ${state.qIndex + 1}</span>
        <span class="q-dot">·</span>
        <span class="q-topic">${escapeHTML(q.topic || currentTheme()?.name || '')}</span>
      </div>
      <h2 class="q-text">${escapeHTML(q.de)}</h2>
      ${waveformHTML('speaking')}
      <div class="mic-area">
        <button class="mic-btn" id="mic-btn" disabled aria-label="Tap to answer">
          <span class="mic-pulse" aria-hidden="true"></span>
          <span class="mic-pulse mic-pulse-2" aria-hidden="true"></span>
          ${I.mic}
        </button>
        <p class="mic-status" id="mic-status" data-state="speaking">Speaking the question…</p>
        <button class="mic-submit" id="mic-submit" style="display:none">
          Done answering ${I.arrowSm}
        </button>
      </div>
      <div class="transcript-display" id="transcript-display"></div>
    </div>
    <footer class="q-footer">
      <button class="ghost-btn" id="hear-again-btn">${I.refresh} Hear again</button>
      <button class="ghost-btn" id="skip-btn">Skip ${I.skip}</button>
    </footer>`;

  el.querySelector('#back-btn').addEventListener('click', backToThemes);
  el.querySelector('#mic-btn').addEventListener('click', handleMicTap);
  el.querySelector('#mic-submit').addEventListener('click', () => stopRecording().then(blob => submitAnswer(blob)));
  el.querySelector('#hear-again-btn').addEventListener('click', () => speakQuestion(q.de));
  el.querySelector('#skip-btn').addEventListener('click', () => stopRecording().then(() => { state.transcript = ''; submitAnswer(null); }));
  return el;
}

// ─── Feedback screen ──────────────────────────────────────────────────────────
function renderFeedback() {
  const q = currentQ();
  const el = document.createElement('section');
  el.className = 'screen feedback';

  if (state.isMarking || !state.markingResult) {
    el.innerHTML = `
      ${topBarHTML()}
      <div class="fb-stage" style="justify-content:center">
        <div class="marking-loader">
          <div class="loader-ring"></div>
          <p style="color:var(--text-mute);font-size:15px;margin-top:16px">Marking your answer…</p>
        </div>
      </div>`;
    el.querySelector('#back-btn')?.addEventListener('click', backToThemes);
    return el;
  }

  const { stars, feedback, correctedAnswer, modelAnswer } = state.markingResult;
  const verdict = stars >= 5 ? 'Outstanding!' : stars >= 4 ? 'Really good!' : stars >= 3 ? 'Good try!' : 'Keep practising.';
  const corrHTML = correctedAnswer
    ? `<p class="fb-correction"><em>Correction:</em> ${escapeHTML(correctedAnswer)}</p>` : '';

  el.innerHTML = `
    ${topBarHTML()}
    <div class="fb-stage">
      <div class="fb-verdict">${verdict}</div>
      <div class="stars-row" id="stars-row">
        ${Array.from({ length: 5 }, (_, i) =>
          `<span class="star ${i < stars ? '' : 'is-empty'}" style="width:64px;height:64px">${starSVG(64, false, i < stars)}</span>`
        ).join('')}
      </div>
      <p class="fb-text">${escapeHTML(feedback)}</p>
      ${corrHTML}
      <div class="model-card">
        <div class="model-head">
          <span class="model-badge">Model answer</span>
          <button class="model-play" id="model-play-btn" aria-label="Play model answer">${I.play} Play</button>
        </div>
        <p class="model-de">${escapeHTML(modelAnswer || '—')}</p>
        ${q?.en ? `<p class="model-en">${escapeHTML(q.en)}</p>` : ''}
      </div>
      <button class="btn-primary btn-lg" id="next-btn">
        <span>${isLast() ? 'See results' : 'Next question'}</span>${I.arrowSm}
      </button>
    </div>`;

  el.querySelector('#back-btn')?.addEventListener('click', backToThemes);
  el.querySelector('#next-btn').addEventListener('click', nextQuestion);
  el.querySelector('#model-play-btn').addEventListener('click', () => {
    if (modelAnswer) speakQuestion(modelAnswer);
  });
  animateStars(el, stars);
  return el;
}

function animateStars(container, count) {
  container.querySelectorAll('.stars-row .star').forEach((slot, i) => {
    if (i < count) {
      setTimeout(() => {
        slot.innerHTML = starSVG(64, true, true);
        slot.classList.add('is-filled');
        slot.classList.remove('is-empty');
      }, 370 + i * 260);
    }
  });
}

// ─── End screen ───────────────────────────────────────────────────────────────
function renderEnd() {
  const theme = currentTheme();
  const stars = totalStars();
  const maxS = state.scores.length * 5;
  const pct = maxS > 0 ? Math.round((stars / maxS) * 100) : 0;
  const weak = weakCount();
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7'];

  const confetti = Array.from({ length: 24 }, (_, i) =>
    `<span class="confetti" style="--x:${(i * 41) % 100}%;--d:${(i % 7) * 0.18}s;--c:${colors[i % 4]}"></span>`
  ).join('');

  const stripes = state.scores.map((s, i) => `
    <div class="stripe-cell" data-score="${s}">
      <div class="stripe-bar" style="height:${(s / 5) * 100}%;--i:${i}"></div>
      <div class="stripe-num">${i + 1}</div>
    </div>`).join('');

  const el = document.createElement('section');
  el.className = 'screen end';
  el.innerHTML = `
    <div class="end-confetti" aria-hidden="true">${confetti}</div>
    <div class="end-card">
      <div class="end-eyebrow">Session complete · ${escapeHTML(theme?.name || '')}</div>
      <h1 class="end-title">Gut gemacht! <span class="end-emoji">🎉</span></h1>
      <div class="end-score">
        <div class="end-score-big">
          <span class="big-num">${stars}</span>
          <span class="big-den">/ ${maxS}</span>
        </div>
        <div class="end-score-meta">
          <div class="meta-line"><span>Accuracy</span><b>${pct}%</b></div>
          <div class="meta-line"><span>Questions</span><b>${state.scores.length}</b></div>
          <div class="meta-line"><span>Weak answers</span><b>${weak}</b></div>
        </div>
      </div>
      <div class="end-stripe">${stripes}</div>
      <div class="end-actions">
        <button class="btn-secondary btn-lg" id="weak-btn" ${weak === 0 ? 'disabled' : ''}>
          ${I.weak} Practise weak answers ${weak > 0 ? `<span class="badge-count">${weak}</span>` : ''}
        </button>
        <button class="btn-secondary btn-lg" id="back-theme-btn">
          ${I.back} Pick another theme
        </button>
        <button class="btn-primary btn-lg" id="retry-btn">
          ${I.refreshLg} Try this theme again
        </button>
      </div>
    </div>`;

  el.querySelector('#weak-btn').addEventListener('click', startWeakSession);
  el.querySelector('#back-theme-btn').addEventListener('click', backToThemes);
  el.querySelector('#retry-btn').addEventListener('click', () => pickTheme(state.themeId));
  return el;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const app = document.querySelector('.sprich-app');
  app.querySelector('.screen')?.remove();
  const map = {
    welcome:  renderWelcome,
    question: renderQuestion,
    feedback: renderFeedback,
    end:      renderEnd,
  };
  const el = map[state.screen]?.();
  if (el) app.appendChild(el);
}

// ─── Session control ──────────────────────────────────────────────────────────
function pickTheme(id) {
  stopAudio();
  window.speechSynthesis.cancel();
  stopRecording();

  const theme = window.THEMES.find(t => t.id === id);
  const pool = theme.isMix ? shuffle(theme.questions).slice(0, 10) : shuffle(theme.questions);

  // Tint global accent to match the chosen theme
  const app = document.querySelector('.sprich-app');
  const accent = `oklch(0.65 0.18 ${theme.accentHue})`;
  app.style.setProperty('--accent', accent);
  app.style.setProperty('--accent-speak', accent);

  Object.assign(state, {
    screen: 'question',
    themeId: id,
    questionPool: pool,
    qIndex: 0,
    scores: [],
    streak: 0,
    markingResult: null,
    isMarking: false,
    transcript: '',
    micState: 'speaking',
  });
  render();
  speakQuestion(currentQ().de);
}

function startWeakSession() {
  stopAudio();
  const weakQuestions = state.questionPool.filter((_, i) => state.scores[i] < 3);
  if (weakQuestions.length === 0) return;
  Object.assign(state, {
    screen: 'question',
    qIndex: 0,
    questionPool: weakQuestions,
    scores: [],
    streak: 0,
    markingResult: null,
    isMarking: false,
    transcript: '',
    micState: 'speaking',
  });
  render();
  speakQuestion(currentQ().de);
}

function backToThemes() {
  stopAudio();
  window.speechSynthesis.cancel();
  stopRecording();
  clearListenTimer();
  // Reset to default palette accent
  const app = document.querySelector('.sprich-app');
  app.style.removeProperty('--accent');
  app.style.removeProperty('--accent-speak');
  state.screen = 'welcome';
  render();
}

function nextQuestion() {
  state.markingResult = null;
  state.transcript = '';
  if (isLast()) {
    state.screen = 'end';
    render();
  } else {
    state.qIndex++;
    state.screen = 'question';
    render();
    speakQuestion(currentQ().de);
  }
}

// ─── TTS ──────────────────────────────────────────────────────────────────────
function getGermanVoice() {
  return new Promise(resolve => {
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const de = voices.filter(v => v.lang.startsWith('de'));
      if (!de.length) return null;
      return de.find(v => v.name === 'Anna')
          || de.find(v => v.name.includes('Anna'))
          || de.find(v => v.localService)
          || de[0];
    };
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) return resolve(pick());
    window.speechSynthesis.onvoiceschanged = () => resolve(pick());
  });
}

async function speakQuestion(text) {
  stopAudio();
  setMicState('speaking');

  const voice = await getGermanVoice();
  if (voice) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voice;
    utter.lang = 'de-DE';
    utter.rate = 0.88;
    utter.onend  = () => { if (state.screen === 'question') setMicState('idle'); };
    utter.onerror = () => cloudflareTTS(text);
    window.speechSynthesis.speak(utter);
    return;
  }
  await cloudflareTTS(text);
}

async function cloudflareTTS(text) {
  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    state.audioObj = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      state.audioObj = null;
      if (state.screen === 'question') setMicState('idle');
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      state.audioObj = null;
      if (state.screen === 'question') setMicState('idle');
    };
    audio.play();
  } catch {
    if (state.screen === 'question') setMicState('idle');
  }
}

function stopAudio() {
  if (state.audioObj) { state.audioObj.pause(); state.audioObj = null; }
  window.speechSynthesis.cancel();
}

// ─── Recording (MediaRecorder → Groq Whisper) ─────────────────────────────────
async function startRecording() {
  setMicState('listening');
  state.transcript = '';
  state.audioChunks = [];

  if (!navigator.mediaDevices?.getUserMedia) { showTextInput(); return; }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaStream = stream;

    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
      .find(t => MediaRecorder.isTypeSupported(t)) || '';

    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    state.mediaRecorder = rec;

    rec.ondataavailable = e => { if (e.data.size > 0) state.audioChunks.push(e.data); };
    rec.start();
  } catch {
    showTextInput();
  }
}

function stopRecording() {
  return new Promise(resolve => {
    const rec = state.mediaRecorder;
    if (!rec || rec.state === 'inactive') { resolve(null); return; }

    rec.addEventListener('stop', () => {
      const blob = new Blob(state.audioChunks, { type: rec.mimeType || 'audio/webm' });
      state.audioChunks = [];
      state.mediaRecorder = null;
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(t => t.stop());
        state.mediaStream = null;
      }
      resolve(blob.size > 100 ? blob : null);
    }, { once: true });

    rec.stop();
  });
}

async function transcribeAudio(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64, mimeType: blob.type }),
        });
        const { transcript } = res.ok ? await res.json() : {};
        resolve(transcript || '');
      } catch { resolve(''); }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

function showTextInput() {
  setMicState('idle');
  const micArea = document.querySelector('.mic-area');
  if (!micArea || micArea.querySelector('.text-fallback')) return;
  const div = document.createElement('div');
  div.className = 'text-fallback';
  div.innerHTML = `
    <p style="font-size:14px;color:var(--text-mute)">Microphone unavailable — type your answer instead</p>
    <div style="display:flex;gap:8px;width:min(400px,90vw)">
      <input id="text-answer" type="text" placeholder="Type in German…" />
      <button class="btn-primary" id="text-submit">Submit</button>
    </div>`;
  micArea.appendChild(div);
  div.querySelector('#text-answer').focus();
  const submit = () => { state.transcript = div.querySelector('#text-answer').value; submitAnswer(null); };
  div.querySelector('#text-submit').addEventListener('click', submit);
  div.querySelector('#text-answer').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

// ─── Mic UI ───────────────────────────────────────────────────────────────────
function handleMicTap() {
  if (state.micState === 'idle') startRecording();
  else if (state.micState === 'listening') stopRecording().then(blob => submitAnswer(blob));
}

function setMicState(s) { state.micState = s; updateMicUI(); }

function updateMicUI() {
  const { micState } = state;
  const color  = micState === 'listening' ? 'var(--accent-listen)'
               : micState === 'speaking'  ? 'var(--accent-speak)'
               : 'rgba(148,163,184,.35)';
  const active = micState === 'speaking' || micState === 'listening';

  const wf = document.querySelector('.waveform');
  if (wf) {
    wf.dataset.state = micState;
    wf.querySelectorAll('.wf-bar').forEach(b => {
      b.style.background = color;
      b.style.animationPlayState = active ? 'running' : 'paused';
    });
  }
  const btn = document.getElementById('mic-btn');
  if (btn) {
    btn.className = `mic-btn${micState === 'listening' ? ' is-listening' : ''}`;
    btn.disabled = micState === 'speaking';
  }
  const status = document.getElementById('mic-status');
  if (status) {
    status.dataset.state = micState;
    if (micState === 'speaking') status.textContent = 'Speaking the question…';
    else if (micState === 'idle') status.textContent = 'Tap the mic to answer';
  }
  const done = document.getElementById('mic-submit');
  if (done) done.style.display = micState === 'listening' ? '' : 'none';

  if (micState === 'listening') startListenTimer();
  else clearListenTimer();
}

function startListenTimer() {
  clearListenTimer();
  state.listenTime = 0;
  const t0 = Date.now();
  state.listenInterval = setInterval(() => {
    state.listenTime = (Date.now() - t0) / 1000;
    const el = document.getElementById('mic-status');
    if (el) el.textContent = `Listening… ${state.listenTime.toFixed(1)}s`;
  }, 100);
}

function clearListenTimer() {
  if (state.listenInterval) { clearInterval(state.listenInterval); state.listenInterval = null; }
}

// ─── Answer marking ───────────────────────────────────────────────────────────
async function submitAnswer(blob = null) {
  if (state.isMarking) return;
  clearListenTimer();

  const q = currentQ();
  state.isMarking = true;
  state.markingResult = null;
  state.screen = 'feedback';
  render();

  // Transcribe audio → transcript (skipped when blob is null, e.g. Skip)
  if (blob) {
    state.transcript = await transcribeAudio(blob);
  }

  try {
    const res = await fetch('/api/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q.de, answer: state.transcript, level: 'Foundation' }),
    });
    if (!res.ok) throw new Error('mark failed');
    if (state.screen !== 'feedback') return;
    const result = await res.json();
    state.markingResult = result;
    const s = Math.max(1, Math.min(5, result.stars || 1));
    state.scores.push(s);
    state.streak = s >= 4 ? state.streak + 1 : 0;
  } catch {
    if (state.screen !== 'feedback') return;
    state.markingResult = {
      stars: 1,
      feedback: 'Something went wrong. Please try again.',
      correctedAnswer: '',
      modelAnswer: '',
    };
    state.scores.push(1);
    state.streak = 0;
  }

  state.isMarking = false;
  render();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', render);
