// ===================== GAME STATE + SAVE/LOAD =====================
const SAVE_KEY = 'spacewar_save_v1';

function freshState() {
  const planets = {};
  PLANET_ID_LIST.forEach((id) => {
    planets[id] = { unlocked: id === 1, completed: false, missions: {}, found: {}, dug: {}, kills: 0, vehicleRepaired: false, lostRocketFound: false, secretRoomDone: false };
  });
  return {
    playerName: 'Billy Bob',
    coins: 40,
    health: 100,
    maxHealth: 100,
    inventory: { scrap: 0, tools: 0, food: 0 },
    upgrades: { speed: 0, jump: 0, damage: 0, hull: 0 }, // each level 0-3
    rocketParts: { engine: false, fuelTank: false, noseCone: false, fins: false, heatShield: false, guidanceCore: false },
    planets,
    outfitsFound: {},
    equippedSuitColor: null,
    weaponsOwned: { pistol: true },
    equippedWeapon: 'pistol',
    location: 'base',
  };
}

let state = freshState();

function resetState() {
  state = freshState();
  return state;
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) { /* storage unavailable, ignore */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const fresh = freshState();
    Object.assign(state, fresh, parsed);
    // deep-merge planets so an older save (fewer worlds) doesn't wipe out newly added planets
    state.planets = Object.assign({}, fresh.planets, parsed.planets || {});
    // same deal for rocketParts - an older save with fewer part types would otherwise wipe out
    // newly added ones (they'd end up undefined instead of false)
    state.rocketParts = Object.assign({}, fresh.rocketParts, parsed.rocketParts || {});
    return true;
  } catch (e) {
    return false;
  }
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

function rocketPartsCount() {
  return Object.values(state.rocketParts).filter(Boolean).length;
}

function rocketReady() {
  return rocketPartsCount() >= 6;
}

function consumeRocketParts() {
  state.rocketParts = { engine: false, fuelTank: false, noseCone: false, fins: false, heatShield: false, guidanceCore: false };
}

const UPGRADE_INFO = {
  speed: { name: 'Boot Thrusters', desc: '+ move speed', base: 30, mult: 1.8 },
  jump: { name: 'Jetpack Booster', desc: '+ jump height', base: 25, mult: 1.8 },
  damage: { name: 'Blaster Coils', desc: '+ blaster damage', base: 35, mult: 1.9 },
  hull: { name: 'Suit Plating', desc: '+ max health', base: 30, mult: 1.8 },
};

function upgradeCost(key) {
  const info = UPGRADE_INFO[key];
  const lvl = state.upgrades[key];
  return Math.round(info.base * Math.pow(info.mult, lvl));
}
