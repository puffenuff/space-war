// ===================== GAME STATE + SAVE/LOAD =====================
// Multi-save-slot storage: a dict of named saves under one localStorage key, instead of a
// single save blob. state.saveName is whichever save is currently active/being played.
const SAVES_KEY = 'spacewar_saves_v1';

// the "swapped" half of a planet's data - coins, gear, upgrades, crafted structures - kept
// fully independent per planet (see saveActiveProgressToPlanet/loadPlanetProgressToActive
// below). Mission/dig/kill/terraform progress is NOT here - that was already per-planet
// and lives directly on state.planets[id] instead.
function freshPlanetProgress() {
  const baseModules = {};
  BASE_MODULES.forEach((m) => { baseModules[m.key] = false; });
  const tech = {};
  TECH_TREE.forEach((t) => { tech[t.key] = false; });
  const materials = {};
  MATERIALS.forEach((m) => { materials[m.key] = 0; });
  return {
    coins: 40,
    health: 100,
    maxHealth: 100,
    inventory: { tools: 0, food: 0, materials },
    upgrades: { speed: 0, jump: 0, damage: 0, hull: 0 }, // each level 0-3
    weaponsOwned: { pistol: true },
    equippedWeapon: 'pistol',
    equippedSuitColor: null,
    baseModules,
    tech,
    rocketParts: { engine: false, fuelTank: false, noseCone: false, fins: false, heatShield: false, guidanceCore: false },
  };
}

function freshState(saveName) {
  const planets = {};
  PLANET_ID_LIST.forEach((id) => {
    const atmoDef = MISSIONS[id].find((m) => m.type === 'atmosphere');
    const extractorMaterial = atmoDef ? Object.keys(atmoDef.materialTargets)[0] : 'iron';
    planets[id] = {
      completed: false, missions: {}, found: {}, dug: {}, kills: 0,
      vehicleRepaired: false, lostRocketFound: false, secretRoomDone: false, blueprintFound: false,
      terraform: { oxygen: 0, heat: 0, pressure: 0, complete: false },
      extractor: { built: false, material: extractorMaterial, stock: 0, lastTick: null },
      progress: freshPlanetProgress(),
    };
  });
  return {
    saveName: saveName || 'Billy Bob',
    playerName: 'Billy Bob',
    planets,
    outfitsFound: {},
    location: 'planet',
    // mirrors the currently-active planet's progress object live during play - see
    // saveActiveProgressToPlanet/loadPlanetProgressToActive
    ...freshPlanetProgress(),
  };
}

let state = freshState();

function resetState(saveName) {
  state = freshState(saveName);
  return state;
}

// ---- per-planet progress swap: state.coins/inventory/upgrades/etc stay at the top level
// (so the ~40+ existing call sites throughout game.js/missions.js don't need to change),
// but they're really just a live mirror of whichever planet is currently active. Switching
// planets saves the mirror into the old planet's record, then loads the new one in. ----
function saveActiveProgressToPlanet(planetId) {
  if (!planetId || !state.planets[planetId]) return;
  state.planets[planetId].progress = {
    coins: state.coins, health: state.health, maxHealth: state.maxHealth,
    inventory: state.inventory, upgrades: state.upgrades, weaponsOwned: state.weaponsOwned,
    equippedWeapon: state.equippedWeapon, equippedSuitColor: state.equippedSuitColor,
    baseModules: state.baseModules, tech: state.tech, rocketParts: state.rocketParts,
  };
}

function loadPlanetProgressToActive(planetId) {
  const src = (state.planets[planetId] && state.planets[planetId].progress) || freshPlanetProgress();
  Object.assign(state, src);
}

function listSaves() {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return Object.keys(all);
  } catch (e) { return []; }
}

function saveGameAs(name) {
  if (!name) return;
  try {
    saveActiveProgressToPlanet(currentPlanetIdForSave());
    const raw = localStorage.getItem(SAVES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    state.saveName = name;
    all[name] = state;
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
  } catch (e) { /* storage unavailable, ignore */ }
}

// game.js sets this so state.js knows which planet's live mirror to flush before saving,
// without state.js needing to import game.js's module-level currentPlanetId directly
let currentPlanetIdForSave = () => null;
function setCurrentPlanetIdGetter(fn) { currentPlanetIdForSave = fn; }

function loadSaveByName(name) {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const parsed = all[name];
    if (!parsed) return false;
    const fresh = freshState(name);
    Object.assign(state, fresh, parsed);
    state.saveName = name;
    // deep-merge planets so a save missing worlds/fields added since it was made doesn't
    // wipe out newly-added planets/fields - merge each planet's own fields too
    state.planets = {};
    PLANET_ID_LIST.forEach((id) => {
      const freshPlanet = fresh.planets[id];
      const savedPlanet = (parsed.planets && parsed.planets[id]) || {};
      state.planets[id] = Object.assign({}, freshPlanet, savedPlanet);
      // progress is itself a nested bundle of further-nested objects (inventory.materials,
      // baseModules, tech, etc) - a shallow merge of the planet object would let a saved
      // progress blob missing newly-added fields wholesale replace the fresh defaults, so
      // merge progress one level deeper too
      const freshProgress = freshPlanet.progress;
      const savedProgress = savedPlanet.progress || {};
      state.planets[id].progress = Object.assign({}, freshProgress, savedProgress);
      state.planets[id].progress.inventory = Object.assign({}, freshProgress.inventory, savedProgress.inventory || {});
      state.planets[id].progress.inventory.materials = Object.assign({}, freshProgress.inventory.materials, (savedProgress.inventory && savedProgress.inventory.materials) || {});
      state.planets[id].progress.upgrades = Object.assign({}, freshProgress.upgrades, savedProgress.upgrades || {});
      state.planets[id].progress.weaponsOwned = Object.assign({}, freshProgress.weaponsOwned, savedProgress.weaponsOwned || {});
      state.planets[id].progress.baseModules = Object.assign({}, freshProgress.baseModules, savedProgress.baseModules || {});
      state.planets[id].progress.tech = Object.assign({}, freshProgress.tech, savedProgress.tech || {});
      state.planets[id].progress.rocketParts = Object.assign({}, freshProgress.rocketParts, savedProgress.rocketParts || {});
    });
    return true;
  } catch (e) {
    return false;
  }
}

// thin wrapper so the ~15 existing "just persist whatever's happening now" call sites
// throughout game.js (periodic autosave, after buying something, etc) don't all need to
// change to pass a name explicitly - they just keep calling saveGame()
function saveGame() {
  saveGameAs(state.saveName);
}

function deleteSave(name) {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    delete all[name];
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
  } catch (e) { /* storage unavailable, ignore */ }
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
