/*============================================
   AI CAREER COUNSELOR & SKILL GAP ANALYZER
   Application Logic — ASI:ONE API Integration
   ============================================

   ▸ ARCHITECTURE
     This file handles ALL app logic for a single-page career counselor.
     No frameworks — pure vanilla JS with fetch() for API calls.

   ▸ ASI:ONE API DETAILS
     Base URL  : https://api.asi1.ai/v1
     Model     : asi1-mini (balanced speed + quality)
     Auth      : Bearer token (user provides their key, stored in localStorage)
     Endpoint  : POST /chat/completions  (OpenAI-compatible format)
     JSON Mode : response_format: { type: "json_object" } for structured output

   ▸ THREE CORE FEATURES
     1. Career Chat     → callASI() with system prompt for career counseling
     2. Skill Gap       → callASI(jsonMode=true) returns structured skill analysis
     3. Learning Roadmap→ callASI(jsonMode=true) returns phased learning plan

   ▸ KEY FUNCTIONS
     callASI(messages, jsonMode)  — Core API call (Chat Completion or Structured Data)
     sendMessage()                — Chat flow: user msg → API → assistant reply
     runSkillGapAnalysis()        — Structured JSON analysis of skill gaps
     generateRoadmap()            — Phased learning roadmap from gap data
     renderRadarChart(skills)     — Canvas-drawn radar/spider chart
     renderSkillGapResults(data)  — Animated skill bar cards
     renderRoadmap(data)          — Timeline UI with phases & resources

   ▸ DATA FLOW
     User Profile (sidebar inputs)
       → buildProfileContext() injects into system prompt
       → ASI:ONE returns career advice / structured JSON
       → Results rendered in chat + results panel (radar, bars, timeline)

   ▸ CUSTOMIZATION
     Change MODEL to "asi1-extended" for deeper reasoning (slower)
     Change MODEL to "asi1-fast" for quicker responses (less detailed)
     Adjust temperature (line ~301) for creativity: 0.3 = precise, 0.9 = creative
============================================ */

// ---- State ----
const state = {
  apiKey: 'sk_f60f8bd4322046b6b48e7060333f384a406e4689452e4d209470b6a7937df36f',
  messages: [],
  isStreaming: false,
  analysisData: null,
  roadmapData: null,
};

// ---- ASI:ONE API Config ----
const API_BASE = 'https://api.asi1.ai/v1';
const MODEL = 'asi1-mini';

// ---- DOM Elements ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  heroSection: $('#heroSection'),
  appSection: $('#appSection'),
  startChatBtn: $('#startChatBtn'),
  quickAnalysisBtn: $('#quickAnalysisBtn'),
  sidebar: $('#sidebar'),
  openSidebar: $('#openSidebar'),
  closeSidebar: $('#closeSidebar'),
  chatMessages: $('#chatMessages'),
  chatInput: $('#chatInput'),
  sendBtn: $('#sendBtn'),
  clearChatBtn: $('#clearChatBtn'),
  analyzeBtn: $('#analyzeBtn'),
  roadmapBtn: $('#roadmapBtn'),
  resultsPanel: $('#resultsPanel'),
  closeResults: $('#closeResults'),
  radarCard: $('#radarCard'),
  radarChart: $('#radarChart'),
  skillGapCard: $('#skillGapCard'),
  skillGapList: $('#skillGapList'),
  roadmapCard: $('#roadmapCard'),
  roadmapTimeline: $('#roadmapTimeline'),
  currentRole: $('#currentRole'),
  dreamRole: $('#dreamRole'),
  userSkills: $('#userSkills'),
  experienceYears: $('#experienceYears'),
  education: $('#education'),
  particles: $('#particles'),
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  bindEvents();
});

// ---- Particles ----
function createParticles() {
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 20 + 's';
    p.style.animationDuration = (15 + Math.random() * 15) + 's';
    p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
    p.style.background = Math.random() > 0.5
      ? 'rgba(168, 85, 247, 0.3)'
      : 'rgba(6, 182, 212, 0.3)';
    els.particles.appendChild(p);
  }
}

// ---- Navigation ----
function enterApp() {
  els.heroSection.style.display = 'none';
  els.appSection.classList.add('active');
  els.chatInput.focus();
}

// ---- Events ----
function bindEvents() {
  els.startChatBtn.addEventListener('click', enterApp);
  els.quickAnalysisBtn.addEventListener('click', () => {
    enterApp();
    setTimeout(() => els.sidebar.classList.add('open'), 300);
  });

  els.openSidebar.addEventListener('click', () => els.sidebar.classList.toggle('open'));
  els.closeSidebar.addEventListener('click', () => els.sidebar.classList.remove('open'));
  els.closeResults.addEventListener('click', () => {
    els.resultsPanel.classList.remove('active');
    els.appSection.classList.remove('with-results');
  });

  els.sendBtn.addEventListener('click', sendMessage);
  els.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  els.chatInput.addEventListener('input', () => {
    els.chatInput.style.height = 'auto';
    els.chatInput.style.height = Math.min(els.chatInput.scrollHeight, 140) + 'px';
  });

  els.clearChatBtn.addEventListener('click', () => {
    state.messages = [];
    els.chatMessages.innerHTML = '';
    addAssistantWelcome();
  });

  els.analyzeBtn.addEventListener('click', runSkillGapAnalysis);
  els.roadmapBtn.addEventListener('click', generateRoadmap);
}

// ---- Chat ----
function addAssistantWelcome() {
  const html = `
    <div class="message assistant">
      <div class="message-avatar">🤖</div>
      <div class="message-content glass-card">
        <p>Hey there! 👋 I'm your <strong>AI Career Counselor</strong>, powered by <span class="gradient-text">ASI:ONE</span>.</p>
        <p>I can help you with:</p>
        <ul>
          <li>🎯 Exploring career paths that match your skills</li>
          <li>📊 Analyzing your skill gaps for a target role</li>
          <li>🗺️ Building a personalized learning roadmap</li>
          <li>💡 Suggesting courses, certifications & projects</li>
        </ul>
        <p>Fill in your profile on the left, or just start chatting! What career are you interested in?</p>
      </div>
    </div>`;
  els.chatMessages.innerHTML = html;
}

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  const avatar = role === 'user' ? '👤' : '🤖';
  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content glass-card">${formatMessage(content)}</div>`;
  els.chatMessages.appendChild(div);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  return div;
}

function addTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content glass-card">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  els.chatMessages.appendChild(div);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

function formatMessage(text) {
  // Convert markdown-like formatting
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');

  // Convert lists
  html = html.replace(/(?:^|\<br\/>)- (.*?)(?=\<br\/>|$)/g, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

  // Wrap in paragraphs where needed
  if (!html.startsWith('<')) html = `<p>${html}</p>`;

  return html;
}

async function sendMessage() {
  const text = els.chatInput.value.trim();
  if (!text || state.isStreaming) return;

  // Add user message
  addMessage('user', text);
  state.messages.push({ role: 'user', content: text });
  els.chatInput.value = '';
  els.chatInput.style.height = 'auto';

  // Build context from profile
  const profileContext = buildProfileContext();

  state.isStreaming = true;
  els.sendBtn.disabled = true;
  addTypingIndicator();

  try {
    const systemPrompt = `You are an expert AI Career Counselor. You help users explore career paths, identify skill gaps, and create learning roadmaps.

You are warm, encouraging, and specific in your advice. You give actionable suggestions — not vague ones.

${profileContext}

Guidelines:
- Ask clarifying questions to understand user's goals
- Reference specific skills, tools, certifications, and courses
- When discussing career paths, mention realistic salary ranges and job market trends
- Suggest practical projects to build portfolio
- Be honest about skill gaps but frame them as opportunities
- Use markdown formatting for readability`;

    const response = await callASI([
      { role: 'system', content: systemPrompt },
      ...state.messages
    ]);

    removeTypingIndicator();
    addMessage('assistant', response);
    state.messages.push({ role: 'assistant', content: response });

  } catch (err) {
    removeTypingIndicator();
    addMessage('assistant', `⚠️ **Error:** ${err.message}\n\nPlease check your API key and try again.`);
  }

  state.isStreaming = false;
  els.sendBtn.disabled = false;
  els.chatInput.focus();
}

function buildProfileContext() {
  const role = els.currentRole.value.trim();
  const dream = els.dreamRole.value.trim();
  const skills = els.userSkills.value.trim();
  const exp = els.experienceYears.value;
  const edu = els.education.value.trim();

  if (!role && !dream && !skills) return '';

  let ctx = '\nUser Profile:\n';
  if (role) ctx += `- Current Role: ${role}\n`;
  if (dream) ctx += `- Target/Dream Role: ${dream}\n`;
  if (skills) ctx += `- Current Skills: ${skills}\n`;
  if (exp) ctx += `- Years of Experience: ${exp}\n`;
  if (edu) ctx += `- Education: ${edu}\n`;

  return ctx;
}

// ---- ASI:ONE API Call ----
async function callASI(messages, jsonMode = false) {
  const body = {
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API Error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ---- Skill Gap Analysis ----
async function runSkillGapAnalysis() {
  const dreamRole = els.dreamRole.value.trim();
  const userSkills = els.userSkills.value.trim();

  if (!dreamRole || !userSkills) {
    alert('Please fill in your Dream Role and current Skills to run the analysis.');
    return;
  }

  els.analyzeBtn.disabled = true;
  els.analyzeBtn.innerHTML = '<span class="spinner"></span> Analyzing...';

  const prompt = `Analyze the skill gap for a person aiming to become a "${dreamRole}".

Their current skills are: ${userSkills}
Current role: ${els.currentRole.value || 'Not specified'}
Experience: ${els.experienceYears.value || 'Not specified'} years
Education: ${els.education.value || 'Not specified'}

Return a JSON object with this exact schema:
{
  "target_role": "string",
  "match_percentage": number (0-100),
  "skills": [
    {
      "name": "string (skill name)",
      "required_level": "string (beginner|intermediate|advanced|expert)",
      "current_level": "string (none|beginner|intermediate|advanced|expert)",
      "score": number (0-100, their current level for this skill),
      "gap": "string (brief description of what to improve)",
      "priority": "string (critical|high|medium|low)"
    }
  ],
  "summary": "string (2-3 sentence overall assessment)",
  "top_recommendations": ["string (actionable recommendation)", ...]
}

Include 8-12 skills that are important for the target role. Be realistic and accurate in your assessment.`;

  try {
    const raw = await callASI([
      { role: 'system', content: 'You are a career skills assessment expert. Return ONLY valid JSON, no other text.' },
      { role: 'user', content: prompt }
    ], true);

    const data = JSON.parse(raw);
    state.analysisData = data;

    renderSkillGapResults(data);
    renderRadarChart(data.skills);

    // Show results panel
    els.resultsPanel.classList.add('active');
    els.appSection.classList.add('with-results');
    els.radarCard.style.display = 'block';
    els.skillGapCard.style.display = 'block';
    els.roadmapBtn.disabled = false;

    // Add summary to chat
    addMessage('assistant', `📊 **Skill Gap Analysis Complete!**\n\n${data.summary}\n\n**Overall Match: ${data.match_percentage}%**\n\nI found gaps in ${data.skills.filter(s => s.score < 60).length} key areas. Check the results panel on the right for details.\n\n**Top Recommendations:**\n${data.top_recommendations.map(r => `- ${r}`).join('\n')}`);
    state.messages.push({ role: 'assistant', content: `Skill gap analysis completed with ${data.match_percentage}% match.` });

  } catch (err) {
    addMessage('assistant', `⚠️ **Analysis Error:** ${err.message}\n\nPlease try again.`);
  }

  els.analyzeBtn.disabled = false;
  els.analyzeBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <span>Analyze Skill Gap</span>`;
}

function renderSkillGapResults(data) {
  let html = '';
  const sorted = [...data.skills].sort((a, b) => a.score - b.score);

  sorted.forEach(skill => {
    const levelClass = skill.current_level === 'none' ? 'missing' : skill.current_level;
    html += `
      <div class="skill-item">
        <div class="skill-item-header">
          <span class="skill-name">${skill.name}</span>
          <span class="skill-level ${levelClass}">${skill.current_level === 'none' ? 'Missing' : skill.current_level}</span>
        </div>
        <div class="skill-bar">
          <div class="skill-bar-fill" style="width: ${skill.score}%; background: ${getBarGradient(skill.score)}"></div>
        </div>
      </div>`;
  });

  els.skillGapList.innerHTML = html;

  // Animate bars after render
  setTimeout(() => {
    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
      bar.style.width = bar.style.width; // trigger animation
    });
  }, 100);
}

function getBarGradient(score) {
  if (score >= 80) return 'linear-gradient(90deg, #10b981, #06b6d4)';
  if (score >= 60) return 'linear-gradient(90deg, #06b6d4, #a855f7)';
  if (score >= 40) return 'linear-gradient(90deg, #f59e0b, #06b6d4)';
  if (score >= 20) return 'linear-gradient(90deg, #ef4444, #f59e0b)';
  return 'linear-gradient(90deg, #ef4444, #ec4899)';
}

// ---- Radar Chart (Canvas) ----
function renderRadarChart(skills) {
  const canvas = els.radarChart;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = 300 * dpr;
  canvas.height = 300 * dpr;
  canvas.style.width = '300px';
  canvas.style.height = '300px';
  ctx.scale(dpr, dpr);

  const centerX = 150;
  const centerY = 150;
  const maxRadius = 110;
  const n = Math.min(skills.length, 10);
  const angleStep = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, 300, 300);

  // Draw grid rings
  for (let r = 1; r <= 4; r++) {
    const radius = (maxRadius / 4) * r;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw axes
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * maxRadius,
      centerY + Math.sin(angle) * maxRadius
    );
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw data polygon
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const val = skills[i].score / 100;
    const x = centerX + Math.cos(angle) * maxRadius * val;
    const y = centerY + Math.sin(angle) * maxRadius * val;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Fill with gradient
  const grad = ctx.createLinearGradient(40, 40, 260, 260);
  grad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
  grad.addColorStop(1, 'rgba(6, 182, 212, 0.25)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw data points & labels
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const val = skills[i].score / 100;

    // Point
    const px = centerX + Math.cos(angle) * maxRadius * val;
    const py = centerY + Math.sin(angle) * maxRadius * val;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#a855f7';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    const lx = centerX + Math.cos(angle) * (maxRadius + 22);
    const ly = centerY + Math.sin(angle) * (maxRadius + 22);
    ctx.fillStyle = '#94a3b8';
    const label = skills[i].name.length > 12 ? skills[i].name.substring(0, 11) + '…' : skills[i].name;
    ctx.fillText(label, lx, ly + 4);
  }
}

// ---- Learning Roadmap ----
async function generateRoadmap() {
  if (!state.analysisData) return;

  els.roadmapBtn.disabled = true;
  els.roadmapBtn.innerHTML = '<span class="spinner"></span> Generating...';

  const gaps = state.analysisData.skills
    .filter(s => s.score < 70)
    .map(s => `${s.name} (current: ${s.current_level}, required: ${s.required_level})`);

  const prompt = `Create a detailed learning roadmap for someone transitioning to "${state.analysisData.target_role}".

Their skill gaps are:
${gaps.join('\n')}

Return a JSON object with this exact schema:
{
  "roadmap_title": "string",
  "estimated_total_duration": "string (e.g. 6-9 months)",
  "phases": [
    {
      "phase_number": number,
      "title": "string (phase title)",
      "duration": "string (e.g. 2-3 weeks)",
      "description": "string (what to learn and why)",
      "resources": [
        "string (specific course name, book, or project idea)"
      ],
      "milestone": "string (what you can do after this phase)"
    }
  ]
}

Include 4-6 phases that build on each other. Be specific with resource names — mention real courses (Coursera, Udemy, YouTube channels), real books, and specific project ideas.`;

  try {
    const raw = await callASI([
      { role: 'system', content: 'You are a career learning path expert. Return ONLY valid JSON, no other text.' },
      { role: 'user', content: prompt }
    ], true);

    const data = JSON.parse(raw);
    state.roadmapData = data;

    renderRoadmap(data);
    els.roadmapCard.style.display = 'block';

    // Show in results panel
    els.resultsPanel.classList.add('active');
    els.appSection.classList.add('with-results');

    addMessage('assistant', `🗺️ **Your Learning Roadmap is Ready!**\n\n**${data.roadmap_title}**\nEstimated Duration: **${data.estimated_total_duration}**\n\n${data.phases.map((p, i) => `**Phase ${i + 1}: ${p.title}** (${p.duration})\n${p.description}`).join('\n\n')}\n\nCheck the results panel for the full visual roadmap with resources! 🚀`);

  } catch (err) {
    addMessage('assistant', `⚠️ **Roadmap Error:** ${err.message}\n\nPlease try again.`);
  }

  els.roadmapBtn.disabled = false;
  els.roadmapBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    <span>Generate Roadmap</span>`;
}

function renderRoadmap(data) {
  let html = `<h4 style="margin-bottom: 4px; font-size: 16px; color: var(--text-primary); text-transform: none; letter-spacing: 0;">${data.roadmap_title}</h4>
    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 24px;">⏱ ${data.estimated_total_duration}</p>
    <div class="roadmap-unified">
      <div class="track-wrapper">
        <div class="track-header">`;

  data.phases.forEach((phase, idx) => {
    const colors = ['flow-green', 'flow-purple', 'flow-pink', 'flow-cyan', 'flow-amber'];
    const colorClass = colors[idx % colors.length];

    html += `
          <div class="track-segment ${colorClass}" style="animation-delay: ${idx * 0.15}s">
            <span class="segment-title">Phase ${phase.phase_number}: ${phase.title}</span>
            <span class="segment-duration">${phase.duration}</span>
          </div>`;
  });

  html += `
        </div>
        <div class="track-columns">`;

  data.phases.forEach((phase, idx) => {
    const colors = ['flow-green', 'flow-purple', 'flow-pink', 'flow-cyan', 'flow-amber'];
    const colorClass = colors[idx % colors.length];

    html += `
          <div class="track-column ${colorClass}" style="animation-delay: ${idx * 0.15 + 0.3}s">
            <div class="track-connector"></div>
            <div class="track-node desc-node">${phase.description}</div>
            <div class="track-node tools-node">
              <strong>Tools & Concepts:</strong>
              <ul class="track-resource-list">
                ${phase.resources.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
            ${phase.milestone ? `<div class="track-node milestone-node">✅ ${phase.milestone}</div>` : ''}
          </div>`;
  });

  html += `
        </div>
      </div>
    </div>`;
  els.roadmapTimeline.innerHTML = html;
}
