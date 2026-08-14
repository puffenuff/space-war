// ===================== MULTIPLAYER NETWORKING (PartyKit) =====================
// A thin, generic client for the co-op layer: connects to a PartyKit room and gives
// game.js a simple pub/sub (net.on) for game-specific messages (presence, loot,
// mission progress, shared enemies) instead of baking game logic into this file.
//
// Deploy your own PartyKit server first (see party/index.js + party/README-ish
// comments below), then paste the host it gives you into PARTYKIT_HOST. Until you
// do, multiplayer is a no-op - single-player play is completely unaffected.
//
//   cd party
//   npm install
//   npx partykit deploy
//   (paste the printed *.partykit.dev host below)
const PARTYKIT_HOST = 'space-war-party.YOUR-USERNAME.partykit.dev'; // <-- replace after deploying

const net = (() => {
  let ws = null;
  let selfId = null;
  let hostId = null;
  let roomCode = null;
  const listeners = {};
  const remotePlayers = {}; // id -> last received state payload

  function isConfigured() { return !PARTYKIT_HOST.includes('YOUR-USERNAME'); }

  function on(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
  }
  function emit(type, data) {
    (listeners[type] || []).forEach((fn) => { try { fn(data); } catch (e) { /* one bad handler shouldn't break the others */ } });
  }

  function isConnected() { return !!ws && ws.readyState === WebSocket.OPEN; }
  function isHost() { return isConnected() && selfId !== null && selfId === hostId; }

  function clearRoster() {
    Object.keys(remotePlayers).forEach((id) => delete remotePlayers[id]);
  }

  function connect(code) {
    return new Promise((resolve, reject) => {
      if (!isConfigured()) { reject(new Error('Multiplayer server not set up yet - see js/net.js')); return; }
      disconnect();
      roomCode = (code || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'public';
      const url = `wss://${PARTYKIT_HOST}/parties/main/${encodeURIComponent(roomCode)}`;
      let settled = false;
      let socket;
      try {
        socket = new WebSocket(url);
      } catch (e) {
        reject(e);
        return;
      }
      ws = socket;
      const failTimer = setTimeout(() => {
        if (!settled) { settled = true; disconnect(); reject(new Error('Connection timed out.')); }
      }, 8000);

      socket.addEventListener('error', () => {
        if (!settled) { settled = true; clearTimeout(failTimer); reject(new Error('Could not reach the multiplayer server.')); }
      });
      socket.addEventListener('close', () => {
        const wasConnected = selfId !== null;
        selfId = null; hostId = null; roomCode = null;
        clearRoster();
        if (ws === socket) ws = null;
        if (wasConnected) emit('disconnected');
        if (!settled) { settled = true; clearTimeout(failTimer); reject(new Error('Connection closed before joining.')); }
      });
      socket.addEventListener('message', (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch (err) { return; }
        if (msg.type === 'welcome') {
          selfId = msg.selfId;
          hostId = msg.hostId;
          if (!settled) { settled = true; clearTimeout(failTimer); resolve({ selfId, hostId, roster: msg.roster }); }
          emit('welcome', msg);
          return;
        }
        if (msg.type === 'playerJoined') { emit('playerJoined', msg.id); return; }
        if (msg.type === 'playerLeft') { delete remotePlayers[msg.id]; emit('playerLeft', msg.id); return; }
        if (msg.type === 'hostChanged') { hostId = msg.hostId; emit('hostChanged', hostId); return; }
        if (msg.type === 'state') { remotePlayers[msg.from] = msg; emit('state', msg); return; }
        emit(msg.type, msg);
      });
    });
  }

  function disconnect() {
    if (ws) { try { ws.close(); } catch (e) { /* already closed */ } }
    ws = null; selfId = null; hostId = null; roomCode = null;
    clearRoster();
  }

  function send(type, data) {
    if (!isConnected()) return;
    try { ws.send(JSON.stringify(Object.assign({ type }, data))); } catch (e) { /* dropped frame is fine, next tick resends state */ }
  }

  return {
    connect, disconnect, send, on, isConfigured,
    isConnected, isHost,
    get selfId() { return selfId; },
    get hostId() { return hostId; },
    get roomCode() { return roomCode; },
    remotePlayers,
  };
})();
