// ===================== UI HELPERS =====================
const $ = (id) => document.getElementById(id);

function showLoading(show) {
  $('loading-screen').classList.toggle('hidden', !show);
}

function showTitleScreen(show) {
  $('title-screen').classList.toggle('hidden', !show);
}

function showHUD(show) {
  $('hud').classList.toggle('hidden', !show);
  $('btn-missions').classList.toggle('hidden', !show);
  $('btn-craft').classList.toggle('hidden', !show);
}

function setContinueEnabled(enabled) {
  $('btn-continue').style.display = enabled ? 'inline-block' : 'none';
}

function updateHealth(health, max) {
  const pct = Math.max(0, Math.min(100, (health / max) * 100));
  $('health-bar').style.width = pct + '%';
  $('health-label').textContent = Math.max(0, Math.round(health));
}

function updateCoins(coins) { $('coin-count').textContent = coins; }
function updateParts(count) { $('parts-count').textContent = count; }
function updateMaterials(count) { $('materials-count').textContent = count; }

function setLocationLabel(text) { $('location-label').textContent = text; }

function showInteractPrompt(text) {
  const el = $('interact-prompt');
  el.textContent = text;
  el.classList.remove('hidden');
}
function hideInteractPrompt() { $('interact-prompt').classList.add('hidden'); }

let toastTimer = null;
function showToast(text) {
  const el = $('pickup-toast');
  el.textContent = text;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 1400);
}

function showDigProgress(pct) {
  $('dig-progress-wrap').classList.remove('hidden');
  $('dig-progress-bar').style.width = Math.round(pct * 100) + '%';
}
function hideDigProgress() { $('dig-progress-wrap').classList.add('hidden'); }

function showCrosshair(show) { $('crosshair').classList.toggle('hidden', !show); }

function showBossHealth(show, name, hp, maxHp) {
  const el = $('boss-health-wrap');
  el.classList.toggle('hidden', !show);
  if (!show) return;
  $('boss-name').textContent = name;
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  $('boss-health-bar').style.width = pct + '%';
}

function updateAmmo(show, ammo, magSize, reloading) {
  const el = $('ammo-display');
  el.classList.toggle('hidden', !show);
  if (!show) return;
  $('ammo-count').textContent = reloading ? 'RELOADING...' : `${ammo} / ${magSize}`;
  el.classList.toggle('reloading', reloading);
  el.classList.toggle('empty', !reloading && ammo <= 0);
}

function openPanel(title, bodyNode) {
  $('panel-title').textContent = title;
  const body = $('panel-body');
  body.innerHTML = '';
  body.appendChild(bodyNode);
  $('panel-backdrop').classList.remove('hidden');
}
function closePanel() { $('panel-backdrop').classList.add('hidden'); }
function isPanelOpen() { return !$('panel-backdrop').classList.contains('hidden'); }

function initPanelClose(onClose) {
  $('panel-close').addEventListener('click', () => { closePanel(); onClose && onClose(); });
  $('panel-backdrop').addEventListener('click', (e) => { if (e.target.id === 'panel-backdrop') { closePanel(); onClose && onClose(); } });
}

function renderMissionTracker(list) {
  const el = $('mission-tracker');
  const active = list.filter((m) => !m.prog.done).slice(0, 3);
  if (active.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = active.map((m) => `<div class="m-title">${m.def.name}</div><div>${m.def.desc}</div>`).join('<hr style="border-color:#2a3a5a;margin:6px 0;opacity:0.4">');
}

let bigMsgTimer = null;
function showBigMessage(title, subtitle, durationMs = 3200) {
  const el = $('big-message');
  el.innerHTML = `<h2>${title}</h2><p>${subtitle}</p>`;
  el.classList.remove('hidden');
  clearTimeout(bigMsgTimer);
  if (durationMs > 0) bigMsgTimer = setTimeout(() => el.classList.add('hidden'), durationMs);
}
function hideBigMessage() { $('big-message').classList.add('hidden'); }

function showStarmapHint(text) {
  const el = $('starmap-hint');
  if (!text) { el.classList.add('hidden'); return; }
  el.textContent = text;
  el.classList.remove('hidden');
}

// game.js calls these as ui.xxx(...), so bundle them into a namespace object.
const ui = {
  showLoading, showTitleScreen, showHUD, setContinueEnabled,
  updateHealth, updateCoins, updateParts, updateMaterials, setLocationLabel,
  showInteractPrompt, hideInteractPrompt, showToast,
  showDigProgress, hideDigProgress, showCrosshair, updateAmmo, showBossHealth,
  openPanel, closePanel, isPanelOpen, initPanelClose,
  renderMissionTracker, showBigMessage, hideBigMessage, showStarmapHint,
};
