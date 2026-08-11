// ===================== UNIFIED INPUT (keyboard/mouse + touch) =====================
const input = {
  moveX: 0, moveY: 0, // -1..1
  lookDX: 0, lookDY: 0, // per-frame look delta
  jumpPressed: false,
  firePressed: false,
  fireHeld: false,
  interactPressed: false,
  interactHeld: false,
  sprintHeld: false,
};

const keys = {};
let isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let kbFire = false, mouseFire = false, touchFire = false;
let kbInteract = false, touchInteract = false;
let kbSprint = false, touchSprint = false;

function isTouchDevice() { return isTouch; }

function initControls(canvas) {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') { input.jumpPressed = true; e.preventDefault(); }
    if (e.code === 'KeyF') { if (!kbFire) input.firePressed = true; kbFire = true; }
    if (e.code === 'KeyE') { if (!kbInteract) input.interactPressed = true; kbInteract = true; }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') kbSprint = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'KeyF') kbFire = false;
    if (e.code === 'KeyE') kbInteract = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') kbSprint = false;
  });

  // ---- mouse look (drag) ----
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('mousedown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    if (e.button === 0) { mouseFire = true; }
  });
  window.addEventListener('mouseup', () => { dragging = false; mouseFire = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    input.lookDX += (e.clientX - lastX);
    input.lookDY += (e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY;
  });

  // ---- touch joystick ----
  const joyZone = document.getElementById('joystick-zone');
  const joyKnob = document.getElementById('joystick-knob');
  const joyBase = document.getElementById('joystick-base');
  let joyTouchId = null, joyCenter = { x: 0, y: 0 };

  joyZone.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    joyTouchId = t.identifier;
    const r = joyBase.getBoundingClientRect();
    joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    updateJoy(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });
  joyZone.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyTouchId) updateJoy(t.clientX, t.clientY);
    }
    e.preventDefault();
  }, { passive: false });
  joyZone.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyTouchId) {
        joyTouchId = null; input.moveX = 0; input.moveY = 0;
        joyKnob.style.transform = `translate(0px,0px)`;
      }
    }
  });
  function updateJoy(x, y) {
    let dx = x - joyCenter.x, dy = y - joyCenter.y;
    const max = 46;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
    input.moveX = dx / max;
    input.moveY = -dy / max;
  }

  // ---- touch look (drag anywhere on right side / canvas outside joystick) ----
  let lookTouchId = null, lookLastX = 0, lookLastY = 0;
  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      const r = joyZone.getBoundingClientRect();
      const inJoy = t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom;
      if (!inJoy && lookTouchId === null) {
        lookTouchId = t.identifier; lookLastX = t.clientX; lookLastY = t.clientY;
      }
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === lookTouchId) {
        input.lookDX += (t.clientX - lookLastX);
        input.lookDY += (t.clientY - lookLastY);
        lookLastX = t.clientX; lookLastY = t.clientY;
      }
    }
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) { if (t.identifier === lookTouchId) lookTouchId = null; }
  });

  // ---- touch buttons ----
  const bindHold = (id, onDown, onUp) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { onDown(); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', (e) => { onUp && onUp(); e.preventDefault(); }, { passive: false });
    el.addEventListener('mousedown', (e) => { onDown(); });
    el.addEventListener('mouseup', () => { onUp && onUp(); });
  };
  bindHold('btn-jump', () => { input.jumpPressed = true; });
  bindHold('btn-interact', () => { if (!touchInteract) input.interactPressed = true; touchInteract = true; }, () => { touchInteract = false; });
  bindHold('btn-fire', () => { if (!touchFire) input.firePressed = true; touchFire = true; }, () => { touchFire = false; });
  bindHold('btn-sprint', () => { touchSprint = true; }, () => { touchSprint = false; });

  if (isTouch) {
    document.getElementById('touch-controls').classList.remove('hidden');
  }
}

// call each frame after using input.*Pressed flags, to reset one-shot flags & keyboard movement
function updateControlsFrame() {
  let mx = 0, my = 0;
  if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
  if (keys['KeyW'] || keys['ArrowUp']) my += 1;
  if (keys['KeyS'] || keys['ArrowDown']) my -= 1;
  if (mx !== 0 || my !== 0) { input.moveX = mx; input.moveY = my; }
  else if (!isTouch) { input.moveX = 0; input.moveY = 0; }

  input.fireHeld = kbFire || mouseFire || touchFire;
  input.interactHeld = kbInteract || touchInteract;
  input.sprintHeld = kbSprint || touchSprint;
}

function consumeOneShots() {
  input.jumpPressed = false;
  input.firePressed = false;
  input.interactPressed = false;
  input.lookDX = 0;
  input.lookDY = 0;
}
