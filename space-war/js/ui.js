// ===================== UI HELPERS =====================
const $ = (id) => document.getElementById(id);

export function showLoading(show) {
  $('loading-screen').classList.toggle('hidden', !show);
}

export function showTitleScreen(show) {
  $('title-screen').classList.toggle('hidden', !show);
}

export function showHUD(show) {
  $('hud').classList.toggle('hidden', !show);
  $('btn-missions').classList.toggle('hidden', !show);
}

export function setContinueEnabled(enabled) {
  $('btn-continue').style.display = enabled ? 'inline-block' : 'none';
}

export function updateHealth(health, max) {
  const pct = Math.max(0, Math.min(100, (health / max) * 100));
  $('health-bar').style.width = pct + '%';
  $('health-label').textContent = Math.max(0, Math.round(health));
}

export function updateCoins(coins) { $('coin-count').textContent = coins; }
export function updateParts(count) { $('parts-count').textContent = count; }

export function setLocationLabel(text) { $('location-label').textContent = text; }

export function showInteractPrompt(text) {
  const el = $('interact-prompt');
  el.textContent = text;
  el.classList.remove('hidden');
}
export function hideInteractPrompt() { $('interact-prompt').classList.add('hidden'); }

let toastTimer = null;
export function showToast(text) {
  const el = $('pickup-toast');
  el.textContent = text;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 1400);
}

export function showDigProgress(pct) {
  $('dig-progress-wrap').classList.remove('hidden');
  $('dig-progress-bar').style.width = Math.round(pct * 100) + '%';
}
export function hideDigProgress() { $('dig-progress-wrap').classList.add('hidden'); }

export function showCrosshair(show) { $('crosshair').classList.toggle('hidden', !show); }

export function openPanel(title, bodyNode) {
  $('panel-title').textContent = title;
  const body = $('panel-body');
  body.innerHTML = '';
  body.appendChild(bodyNode);
  $('panel-backdrop').classList.remove('hidden');
}
export function closePanel() { $('panel-backdrop').classList.add('hidden'); }
export function isPanelOpen() { return !$('panel-backdrop').classList.contains('hidden'); }

export function initPanelClose(onClose) {
  $('panel-close').addEventListener('click', () => { closePanel(); onClose && onClose(); });
  $('panel-backdrop').addEventListener('click', (e) => { if (e.target.id === 'panel-backdrop') { closePanel(); onClose && onClose(); } });
}

export function renderMissionTracker(list) {
  const el = $('mission-tracker');
  const active = list.filter((m) => !m.prog.done).slice(0, 3);
  if (active.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = active.map((m) => `<div class="m-title">${m.def.name}</div><div>${m.def.desc}</div>`).join('<hr style="border-color:#2a3a5a;margin:6px 0;opacity:0.4">');
}

let bigMsgTimer = null;
export function showBigMessage(title, subtitle, durationMs = 3200) {
  const el = $('big-message');
  el.innerHTML = `<h2>${title}</h2><p>${subtitle}</p>`;
  el.classList.remove('hidden');
  clearTimeout(bigMsgTimer);
  if (durationMs > 0) bigMsgTimer = setTimeout(() => el.classList.add('hidden'), durationMs);
}
export function hideBigMessage() { $('big-message').classList.add('hidden'); }

export function showStarmapHint(text) {
  const el = $('starmap-hint');
  if (!text) { el.classList.add('hidden'); return; }
  el.textContent = text;
  el.classList.remove('hidden');
}
