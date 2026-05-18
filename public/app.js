'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  screen: 'welcome',
  qIndex: 0,
  activeQuestions: [],  // indices into QUESTIONS
  scores: [],
  streak: 0,
  micState: 'speaking',
  listenTime: 0,
  listenInterval: null,
  transcript: '',
  markingResult: null,
  isMarking: false,
  audioObj: null,
  recognition: null,
};

function totalStars() { return state.scores.reduce((a, b) => a + b, 0); }
function weakCount()   { return state.scores.filter(s => s < 3).length; }
function currentQuestion() { return QUESTIONS[state.activeQuestions[state.qIndex]]; }
function totalQ()  { return state.activeQuestions.length; }
function isLast()  { return state.qIndex >= state.activeQuestions.length - 1; }

// ─── SVG icons ────────────────────────────────────────────────────────────────
const I = {
  arrowSm: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`,
  arrowLg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`,
  close:   `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  refreshLg:`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  skip:    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`,
  mic:     `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>`,
  weak:    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-6M12 8V4M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24M2 12h6M16 12h6"/></svg>`,
  play:    `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
};

function starSVG(size, filled) {
  const id = `gold-${size}-${filled ? 1 : 0}`;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
    </defs>
    <path d="M12 2.5l2.92 6.26 6.88.78-5.1 4.7 1.42 6.76L12 17.55 5.88 21l1.42-6.76-5.1-4.7 6.88-.78L12 2.5z"
      fill="${filled ? `url(#${id})` : 'transparent'}"
      stroke="${filled ? '#f59e0b' : 'rgba(148,163,184,.32)'}"
      stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function waveformHTML(micState) {
  const color = micState === 'listening' ? 'var(--accent-listen)'
              : micState === 'speaking'  ? 'var(--accent-speak)'
              : 'rgba(148,163,184,.35)';
  const active = micState === 'speaking' || micState === 'listening';
  const bars = Array.from({length: 28}, (_, i) => {
    const s = Math.sin(i * 12.9898) * 43758.5453;
    const h = 0.35 + (s - Math.floor(s)) * 0.6;
    return `<span class="wf-bar" style="--h:${h};--i:${i};background:${color};animation-play-state:${active ? 'running' : 'paused'}"></span>`;
  }).join('');
  return `<div class="waveform" data-state="${micState}">${bars}</div>`;
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function topBarHTML() {
  const pct = Math.min(100, (state.qIndex / totalQ()) * 100);
  const streakPill = state.streak >= 3
    ? `<div class="streak-pill" aria-label="${state.streak} streak"><span class="streak-flame">🔥</span><span>${state.streak}</span></div>`
    : '';
  return `
    <header class="topbar">
      <button class="topbar-exit" id="exit-btn" aria-label="Exit session">${I.close}</button>
      <div class="progress">
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-label">Question <b>${state.qIndex + 1}</b> of ${totalQ()}</div>
      </div>
      <div class="topbar-right">
        ${streakPill}
        <div class="star-counter" aria-label="${totalStars()} stars">
          ${starSVG(20, true)}
          <span>${totalStars()}</span>
        </div>
      </div>
    </header>`;
}

// ─── Welcome screen ───────────────────────────────────────────────────────────
function renderWelcome() {
  const el = document.createElement('section');
  el.className = 'screen welcome';
  el.innerHTML = `
    <div class="welcome-orb" aria-hidden="true">
      <div class="orb-ring orb-ring-1"></div>
      <div class="orb-ring orb-ring-2"></div>
      <div class="orb-ring orb-ring-3"></div>
      <div class="orb-core"></div>
    </div>
    <h1 class="welcome-title">Sprich<span class="title-bang">!</span></h1>
    <p class="welcome-sub">Answer each question out loud in German</p>
    <button class="btn-primary btn-xl" id="start-btn">
      <span>Start</span>${I.arrowLg}
    </button>
    <div class="welcome-meta">
      <div class="meta-chip"><b>27</b> questions</div>
      <div class="meta-chip">~<b>15</b> min</div>
      <div class="meta-chip">GCSE Foundation</div>
    </div>`;
  el.querySelector('#start-btn').addEventListener('click', startSession);
  return el;
}

// ─── Question screen ──────────────────────────────────────────────────────────
function renderQuestion() {
  const q = currentQuestion();
  const el = document.createElement('section');
  el.className = 'screen question';
  el.innerHTML = `
    ${topBarHTML()}
    <div class="q-stage">
      <div class="q-eyebrow">
        <span class="q-num">Question ${state.qIndex + 1}</span>
        <span class="q-dot">·</span>
        <span>German</span>
      </div>
      <h2 class="q-text">${escapeHTML(q)}</h2>
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

  el.querySelector('#exit-btn').addEventListener('click', exitSession);
  el.querySelector('#mic-btn').addEventListener('click', handleMicTap);
  el.querySelector('#mic-submit').addEventListener('click', () => { stopListening(); submitAnswer(); });
  el.querySelector('#hear-again-btn').addEventListener('click', () => speakQuestion(q));
  el.querySelector('#skip-btn').addEventListener('click', () => { state.transcript = ''; submitAnswer(); });
  return el;
}

// ─── Feedback screen ──────────────────────────────────────────────────────────
function renderFeedback() {
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
    el.querySelector('#exit-btn')?.addEventListener('click', exitSession);
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
        ${Array.from({length: 5}, (_, i) =>
          `<span class="star ${i < stars ? '' : 'is-empty'}" style="width:64px;height:64px">${starSVG(64, false)}</span>`
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
      </div>
      <button class="btn-primary btn-lg" id="next-btn">
        <span>${isLast() ? 'See results' : 'Next question'}</span>${I.arrowSm}
      </button>
    </div>`;

  el.querySelector('#exit-btn')?.addEventListener('click', exitSession);
  el.querySelector('#next-btn').addEventListener('click', nextQuestion);
  el.querySelector('#model-play-btn').addEventListener('click', () => {
    if (modelAnswer) speakQuestion(modelAnswer);
  });

  animateStars(el, stars);
  return el;
}

function animateStars(container, count) {
  const slots = container.querySelectorAll('.stars-row .star');
  slots.forEach((slot, i) => {
    if (i < count) {
      setTimeout(() => {
        slot.innerHTML = starSVG(64, true);
        slot.classList.add('is-filled');
        slot.classList.remove('is-empty');
      }, 370 + i * 260);
    }
  });
}

// ─── End screen ───────────────────────────────────────────────────────────────
function renderEnd() {
  const stars = totalStars();
  const maxS = state.scores.length * 5;
  const pct = maxS > 0 ? Math.round((stars / maxS) * 100) : 0;
  const weak = weakCount();
  const colors = ['#3b82f6','#10b981','#f59e0b','#a855f7'];

  const confetti = Array.from({length: 24}, (_, i) =>
    `<span class="confetti" style="--x:${(i*41)%100}%;--d:${(i%7)*0.18}s;--c:${colors[i%4]}"></span>`
  ).join('');

  const stripes = state.scores.map((s, i) => `
    <div class="stripe-cell" data-score="${s}">
      <div class="stripe-bar" style="height:${(s/5)*100}%;--i:${i}"></div>
      <div class="stripe-num">${i+1}</div>
    </div>`).join('');

  const el = document.createElement('section');
  el.className = 'screen end';
  el.innerHTML = `
    <div class="end-confetti" aria-hidden="true">${confetti}</div>
    <div class="end-card">
      <div class="end-eyebrow">Session complete</div>
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
        <button class="btn-primary btn-lg" id="retry-btn">
          ${I.refreshLg} Start again
        </button>
      </div>
    </div>`;

  el.querySelector('#retry-btn').addEventListener('click', startSession);
  el.querySelector('#weak-btn').addEventListener('click', startWeakSession);
  return el;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const app = document.querySelector('.sprich-app');
  const existing = app.querySelector('.screen');
  if (existing) existing.remove();

  const screens = {
    welcome:  renderWelcome,
    question: renderQuestion,
    feedback: renderFeedback,
    end:      renderEnd,
  };
  const screenEl = screens[state.screen]?.();
  if (screenEl) app.appendChild(screenEl);
}

// ─── Session control ──────────────────────────────────────────────────────────
function startSession() {
  stopAudio();
  window.speechSynthesis.cancel();
  Object.assign(state, {
    screen: 'question',
    qIndex: 0,
    activeQuestions: Array.from({length: QUESTIONS.length}, (_, i) => i),
    scores: [],
    streak: 0,
    markingResult: null,
    isMarking: false,
    transcript: '',
    micState: 'speaking',
  });
  render();
  speakQuestion(currentQuestion());
}

function startWeakSession() {
  stopAudio();
  const weakIndices = state.scores.map((s, i) => s < 3 ? i : -1).filter(i => i >= 0);
  Object.assign(state, {
    screen: 'question',
    qIndex: 0,
    activeQuestions: weakIndices,
    scores: [],
    streak: 0,
    markingResult: null,
    isMarking: false,
    transcript: '',
    micState: 'speaking',
  });
  render();
  speakQuestion(currentQuestion());
}

function exitSession() {
  stopAudio();
  window.speechSynthesis.cancel();
  stopListening();
  clearListenTimer();
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
    speakQuestion(currentQuestion());
  }
}

// ─── TTS ──────────────────────────────────────────────────────────────────────
async function speakQuestion(text) {
  stopAudio();
  setMicState('speaking');

  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text})
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
      fallbackTTS(text);
    };
    audio.play();
  } catch {
    fallbackTTS(text);
  }
}

function fallbackTTS(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'de-DE';
  utter.rate = 0.9;
  utter.onend = () => { if (state.screen === 'question') setMicState('idle'); };
  window.speechSynthesis.speak(utter);
}

function stopAudio() {
  if (state.audioObj) {
    state.audioObj.pause();
    state.audioObj = null;
  }
  window.speechSynthesis.cancel();
}

// ─── STT ──────────────────────────────────────────────────────────────────────
function startListening() {
  setMicState('listening');
  state.transcript = '';

  const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
  if (!SR) { showTextInput(); return; }

  const rec = new SR();
  rec.lang = 'de-DE';
  rec.continuous = false;
  rec.interimResults = true;
  state.recognition = rec;

  rec.onresult = (event) => {
    let interim = '', final = '';
    for (const r of event.results) {
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    state.transcript = final || interim;
    const el = document.getElementById('transcript-display');
    if (el) el.textContent = state.transcript;
  };

  rec.onend = () => {
    state.recognition = null;
    if (state.micState === 'listening') submitAnswer();
  };

  rec.onerror = (e) => {
    state.recognition = null;
    if (e.error !== 'aborted' && state.screen === 'question') showTextInput();
  };

  rec.start();
}

function stopListening() {
  if (state.recognition) {
    state.recognition.stop();
    state.recognition = null;
  }
}

function showTextInput() {
  setMicState('idle');
  const micArea = document.querySelector('.mic-area');
  if (!micArea || micArea.querySelector('.text-fallback')) return;

  const div = document.createElement('div');
  div.className = 'text-fallback';
  div.innerHTML = `
    <p style="font-size:14px;color:var(--text-mute);">Couldn't hear you — type your answer instead</p>
    <div style="display:flex;gap:8px;width:min(400px,90vw)">
      <input id="text-answer" type="text" placeholder="Type in German…">
      <button class="btn-primary" id="text-submit">Submit</button>
    </div>`;
  micArea.appendChild(div);

  div.querySelector('#text-answer').focus();
  const submit = () => {
    state.transcript = div.querySelector('#text-answer').value;
    submitAnswer();
  };
  div.querySelector('#text-submit').addEventListener('click', submit);
  div.querySelector('#text-answer').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

// ─── Mic UI ───────────────────────────────────────────────────────────────────
function handleMicTap() {
  if (state.micState === 'idle') startListening();
  else if (state.micState === 'listening') { stopListening(); submitAnswer(); }
}

function setMicState(s) {
  state.micState = s;
  updateMicUI();
}

function updateMicUI() {
  const { micState } = state;
  const color   = micState === 'listening' ? 'var(--accent-listen)' : micState === 'speaking' ? 'var(--accent-speak)' : 'rgba(148,163,184,.35)';
  const active  = micState === 'speaking' || micState === 'listening';

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
async function submitAnswer() {
  if (state.isMarking) return;
  stopListening();
  clearListenTimer();

  state.isMarking = true;
  state.markingResult = null;
  state.screen = 'feedback';
  render();  // show loading state

  try {
    const res = await fetch('/api/mark', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({question: currentQuestion(), answer: state.transcript})
    });
    if (!res.ok) throw new Error('mark failed');
    const result = await res.json();

    state.markingResult = result;
    const s = Math.max(1, Math.min(5, result.stars || 1));
    state.scores.push(s);
    state.streak = s >= 4 ? state.streak + 1 : 0;
  } catch {
    state.markingResult = {
      stars: 1,
      feedback: 'Something went wrong. Please try again.',
      correctedAnswer: '',
      modelAnswer: ''
    };
    state.scores.push(1);
    state.streak = 0;
  }

  state.isMarking = false;
  render();  // show result
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', render);
