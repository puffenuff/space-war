// NOTE: this is a classic (non-module) script. THREE and everything from
// noise.js/data.js/state.js/controls.js/player.js/enemies.js/vehicles.js/
// world.js/base.js/missions.js/spaceflight.js/ui.js is already in global
// scope because index.html loads those scripts, in that order, before this one.

// ===================== RENDERER / CAMERA =====================
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 4000);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

initControls(canvas);

// ===================== GAME STATE MACHINE =====================
let mode = 'title'; // title | base | planet | cave | space
let currentPlanetId = null;
let inCave = false;
let caveReturnPos = null;
let activeScene = null;
let activeBuild = null;
const planetBuilds = {};
let baseBuild = null;

const player = new Player({});
let drivingVehicle = null; // { mesh, controller }
let vehicleCtl = null;
let firstPerson = false; // on-foot only - hides own head so it doesn't block the view

let spaceFlight = null;

let digTarget = null;
let digProgress = 0;
let repairHoldProgress = 0;

let deathSequence = null; // non-null while the yeti execution cutscene is playing

const clock = new THREE.Clock();
let elapsed = 0;
let saveTimer = 0;

// ===================== EFFECTS APPLICATION =====================
function baseModuleHealthBonus() {
  return BASE_MODULES.reduce((sum, m) => sum + (state.baseModules[m.key] ? m.healthBonus : 0), 0);
}

function applyUpgradeEffects() {
  state.maxHealth = 100 + state.upgrades.hull * 25 + baseModuleHealthBonus();
  if (state.health > state.maxHealth) state.health = state.maxHealth;
  player.jumpPower = 8.4 + state.upgrades.jump * 2.0;
}

function speedMultiplier() { return 1 + state.upgrades.speed * 0.16; }
function gunDamage(baseDamage) { return baseDamage + state.upgrades.damage * 6; }

// ===================== GROUND HEIGHT =====================
function getGroundHeightCurrent(x, z) {
  if (mode === 'planet') {
    if (inCave) return activeBuild.caveOrigin.y;
    return activeBuild.groundHeightFn(x, z);
  }
  return 0;
}
player.getGroundHeight = (x, z) => getGroundHeightCurrent(x, z);

// invisible boundary wall: keeps the player/vehicle inside the detailed terrain square
// (well short of its actual edge) on planet surfaces, so the world never visibly runs out
let lastBoundaryToast = -999;
function clampToWorldBoundary(pos) {
  if (mode !== 'planet' || inCave) return;
  const limit = activeBuild.planet.size / 2 - 20;
  const hitX = Math.abs(pos.x) > limit;
  const hitZ = Math.abs(pos.z) > limit;
  if (!hitX && !hitZ) return;
  pos.x = Math.max(-limit, Math.min(limit, pos.x));
  pos.z = Math.max(-limit, Math.min(limit, pos.z));
  if (elapsed - lastBoundaryToast > 4) {
    lastBoundaryToast = elapsed;
    ui.showToast("This is as far as the terrain goes...");
  }
}

// ===================== FIRE HANDLING =====================
player.onFire = (origin, dir) => {
  if (mode !== 'planet') return;
  const w = player.weaponStats;
  const pelletCount = w.pellets || 1;
  for (let i = 0; i < pelletCount; i++) {
    let d = dir;
    if (w.spread) {
      d = dir.clone();
      d.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * w.spread);
      d.y += (Math.random() - 0.5) * w.spread * 0.5;
      d.normalize();
    }
    const p = createProjectile(origin, d, { color: w.color, speed: w.speed, damage: gunDamage(w.damage), owner: 'player', life: 2.2 });
    activeScene.add(p);
    activeBuild.projectiles.push(p);
  }
  sfx.shoot();
};
player.onJump = () => sfx.jump();
player.onEmptyFire = () => sfx.emptyClick();
player.onReloadStart = () => sfx.reload();
player.onReloadDone = () => sfx.reloadDone();

// ===================== SCENE TRANSITIONS =====================
function detachPlayer() {
  if (activeScene) player.removeFrom(activeScene);
}

function enterBase(spawn = true) {
  mode = 'base'; inCave = false; currentPlanetId = null;
  if (!baseBuild) baseBuild = buildBaseScene();
  detachPlayer();
  activeScene = baseBuild.scene;
  activeBuild = baseBuild;
  player.addTo(activeScene);
  if (spawn) { player.mesh.position.set(baseBuild.spawnPoint.x, 0, baseBuild.spawnPoint.z); player.heading = Math.PI; }
  ui.setLocationLabel('SPACE WAR BASE');
  exitVehicleIfAny(false);
  playMusicScene('base');
  stopEngineRumble();
  saveGame();
}

function ensurePlanetBuild(id) {
  if (planetBuilds[id]) return planetBuilds[id];
  const build = buildPlanetScene(id);
  build.enemies = [];
  build.projectiles = [];
  build.enemyProjectiles = [];
  build.explosions = [];
  build.vehicle = createVehicle(build.planet.vehicleType || 'rover', build.wreckPos, state.planets[id].vehicleRepaired);
  build.scene.add(build.vehicle);
  build.enemySpawns.forEach((spawn) => {
    const e = createGroundEnemy(spawn, build.planet.enemySkin, id);
    build.scene.add(e);
    build.enemies.push(e);
  });
  (build.caveEnemySpawns || []).forEach((spawn) => {
    const e = createGroundEnemy(spawn, build.planet.enemySkin, id);
    build.scene.add(e);
    build.enemies.push(e);
  });
  if (build.lostRocket && build.lostRocketSurface) {
    for (let i = 0; i < 2; i++) {
      const gx = build.lostRocketSurface.x + (i === 0 ? 8 : -8);
      const gz = build.lostRocketSurface.z + 6;
      const spawn = { x: gx, y: build.groundHeightFn(gx, gz), z: gz };
      const guard = createGroundEnemy(spawn, build.planet.enemySkin, id);
      guard.userData.hp = 55; guard.userData.maxHp = 55;
      build.scene.add(guard);
      build.enemies.push(guard);
    }
  }
  if (state.planets[id].lostRocketFound && build.lostRocket) {
    build.scene.remove(build.lostRocket);
    build.lostRocket = null;
  }
  if (build.secretRoom && state.planets[id].secretRoomDone) {
    const sr = build.secretRoom;
    sr.triggered = true; sr.resolved = true;
    sr.doorMesh.userData.state = 'open';
    sr.doorMesh.position.y = sr.doorMesh.userData.openY;
    if (sr.boss) { sr.boss.triggered = true; sr.boss.wallPanel.visible = false; }
  }
  planetBuilds[id] = build;
  return build;
}

function enterPlanet(id, opts = {}) {
  mode = 'planet'; inCave = false; currentPlanetId = id;
  ensurePlanetMissions(id);
  const build = ensurePlanetBuild(id);
  detachPlayer();
  activeScene = build.scene;
  activeBuild = build;
  player.addTo(activeScene);
  const sp = opts.pos || build.spawnPoint;
  player.mesh.position.set(sp.x, build.groundHeightFn(sp.x, sp.z), sp.z);
  player.heading = 0;
  ui.setLocationLabel(build.planet.name.toUpperCase());
  exitVehicleIfAny(false);
  playMusicScene('planet');
  stopEngineRumble();
  saveGame();
}

function enterCave(digSite) {
  inCave = true;
  caveReturnPos = digSite.position.clone();
  const build = activeBuild;
  const exitPos = build.caveExit.position;
  player.mesh.position.set(build.caveOrigin.x + exitPos.x, build.caveOrigin.y, build.caveOrigin.z + exitPos.z - 2);
  player.heading = Math.PI;
  if (build.ambient) build.ambient.intensity = 0.22;
}

function exitCave() {
  inCave = false;
  const build = activeBuild;
  const pos = caveReturnPos || build.spawnPoint;
  player.mesh.position.set(pos.x, build.groundHeightFn(pos.x, pos.z), pos.z + 2);
  player.heading = Math.PI;
  if (build.ambient) build.ambient.intensity = 0.55;
}

function exitVehicleIfAny(keepScene = true) {
  if (drivingVehicle) {
    drivingVehicle.userData.driving = false;
    player.disabled = false;
    player.mesh.position.copy(drivingVehicle.position);
    player.mesh.position.x += 1.5;
    player.mesh.visible = true;
    drivingVehicle = null;
    vehicleCtl = null;
    sfx.exitVehicle();
  }
}

// ===================== SPACE FLIGHT =====================
function launchToSpace(destId, opts = {}) {
  mode = 'space';
  detachPlayer();
  spaceFlight = new SpaceFlight(destId, { health: state.health, maxHealth: state.maxHealth, forcedCombat: !!opts.forced, travelGoal: opts.travelGoal });
  activeScene = spaceFlight.scene;
  ui.setLocationLabel('DEEP SPACE');
  ui.showStarmapHint(null);
  ui.showBigMessage('LAUNCHING', `Course set for ${PLANETS[destId].name}...`, 1800);
  playMusicScene('space');
  sfx.launch();
  startEngineRumble();
}

function onArriveSpace(destId, progressionLaunch) {
  state.health = Math.max(40, spaceFlight.health);
  sfx.arrive();
  if (progressionLaunch) {
    const prevFrontier = destId - 1;
    state.planets[prevFrontier].completed = true;
    state.planets[destId].unlocked = true;
    consumeRocketParts();
    ui.showBigMessage(`PLANET ${prevFrontier} COMPLETE!`, `${PLANETS[destId].name} is now unlocked.`, 3400);
    sfx.missionComplete();
  } else {
    ui.showBigMessage('ARRIVED', PLANETS[destId].name, 1800);
  }
  spaceFlight = null;
  enterPlanet(destId);
}

// ===================== INTERACTABLES =====================
function collectiblesTick(dt) {
  if (mode !== 'planet') return;
  const b = activeBuild;
  const pPos = player.mesh.position;
  const range = 1.5;

  if (!inCave) {
    b.scrapPickups.forEach((m, i) => {
      if (m.userData.collected) return;
      if (pPos.distanceTo(m.position) < range) {
        m.userData.collected = true;
        m.visible = false;
        state.inventory.scrap += 1;
        sfx.scrap();
        progressCollectNet(currentPlanetId, missionToast);
        ui.showToast('+1 Scrap');
        broadcastLoot('scrap', i);
      }
    });
    b.coinPickups.forEach((m, i) => {
      if (m.userData.collected) return;
      if (pPos.distanceTo(m.position) < range) {
        m.userData.collected = true;
        m.visible = false;
        state.coins += m.userData.value;
        sfx.coin();
        ui.showToast(`+${m.userData.value} Coins`);
        broadcastLoot('coin', i);
      }
    });
    if (b.partPickup && !b.partPickup.userData.collected && pPos.distanceTo(b.partPickup.position) < 1.9) {
      b.partPickup.userData.collected = true;
      b.partPickup.visible = false;
      state.rocketParts[b.partPickup.userData.part] = true;
      sfx.partFound();
      completeMissionByType(currentPlanetId, 'partpickup', missionToast);
      ui.showToast(`${labelForPart(b.partPickup.userData.part)} acquired!`);
    }
    (b.oreChests || []).forEach((c, i) => {
      if (c.userData.collected) return;
      if (pPos.distanceTo(c.position) < 1.8) {
        c.userData.collected = true;
        c.visible = false;
        state.inventory.ore += c.userData.amount;
        sfx.scrap();
        ui.showToast(`+${c.userData.amount} Ore`);
        checkAtmosphereMission(currentPlanetId, missionToast);
        broadcastLoot('ore', i);
      }
    });
  } else {
    (b.caveScrapPickups || []).forEach((m, i) => {
      if (m.userData.collected) return;
      if (pPos.distanceTo(m.userData.worldPos) < range) {
        m.userData.collected = true;
        m.visible = false;
        state.inventory.scrap += 1;
        sfx.scrap();
        progressCollectNet(currentPlanetId, missionToast);
        ui.showToast('+1 Scrap');
        broadcastLoot('caveScrap', i);
      }
    });
    (b.caveCoinPickups || []).forEach((m, i) => {
      if (m.userData.collected) return;
      if (pPos.distanceTo(m.userData.worldPos) < range) {
        m.userData.collected = true;
        m.visible = false;
        state.coins += m.userData.value;
        sfx.coin();
        ui.showToast(`+${m.userData.value} Coins`);
        broadcastLoot('caveCoin', i);
      }
    });
    (b.caveTreasures || [b.chest]).forEach((c, i) => {
      if (c.userData.collected) return;
      if (pPos.distanceTo(c.userData.worldPos) < 1.8) {
        c.userData.collected = true;
        const coinGain = 30 + Math.floor(Math.random() * 30);
        state.coins += coinGain;
        state.inventory.tools += 1;
        sfx.partFound();
        ui.showToast(`Cave Treasure! +${coinGain} Coins, +1 Tool`);
        broadcastLoot('treasure', i);
      }
    });
    (b.caveOreChests || []).forEach((c, i) => {
      if (c.userData.collected) return;
      if (pPos.distanceTo(c.userData.worldPos) < 1.8) {
        c.userData.collected = true;
        c.visible = false;
        state.inventory.ore += c.userData.amount;
        sfx.scrap();
        ui.showToast(`+${c.userData.amount} Ore (special find!)`);
        checkAtmosphereMission(currentPlanetId, missionToast);
        broadcastLoot('caveOre', i);
      }
    });
    if (b.outfit && !b.outfit.userData.collected && pPos.distanceTo(b.outfit.userData.worldPos) < 2.0) {
      b.outfit.userData.collected = true;
      const hex = b.outfit.userData.suitColor;
      state.outfitsFound[currentPlanetId] = hex;
      state.equippedSuitColor = hex;
      player.setSuitColor(hex);
      sfx.win();
      ui.showToast(`New Suit Found: ${b.planet.name} Outfit!`);
    }
  }
}

// ===================== MULTIPLAYER: shared loot =====================
// Fungible field pickups (scrap/coins/ore/cave treasure) are shared: once anyone in the
// party grabs one it disappears for everyone, so party members aren't fighting over the
// same rock. Unique progression items (rocket parts, outfits, blueprint chips) are NOT
// shared this way - each player finds and keeps their own.
const LOOT_ARRAYS = {
  scrap: (b) => b.scrapPickups,
  coin: (b) => b.coinPickups,
  ore: (b) => b.oreChests,
  caveScrap: (b) => b.caveScrapPickups,
  caveCoin: (b) => b.caveCoinPickups,
  caveOre: (b) => b.caveOreChests,
  treasure: (b) => b.caveTreasures || [b.chest],
};

function broadcastLoot(kind, index) {
  if (net.isConnected()) net.send('loot', { planetId: currentPlanetId, inCave, kind, index });
}

net.on('loot', (msg) => {
  if (msg.planetId !== currentPlanetId || msg.inCave !== inCave) return;
  const b = activeBuild;
  const getArr = b && LOOT_ARRAYS[msg.kind];
  const arr = getArr && getArr(b);
  const item = arr && arr[msg.index];
  if (item && !item.userData.collected) {
    item.userData.collected = true;
    if ('visible' in item) item.visible = false;
  }
});

// ===================== MULTIPLAYER: shared mission progress =====================
// Kill/collect progress (simple counters) is shared with the party on the same planet -
// a raider your friend kills counts toward your own kill-mission too. Progress that's
// gated behind a unique item (blueprint chips, rocket parts) stays individual, since
// those aren't shared loot either - see LOOT_ARRAYS above.
function progressKillNet(planetId, toast) {
  progressKill(planetId, toast);
  if (net.isConnected()) net.send('missionProgress', { planetId, kind: 'kill' });
}
function progressCollectNet(planetId, toast) {
  progressCollect(planetId, toast);
  if (net.isConnected()) net.send('missionProgress', { planetId, kind: 'collect' });
}
net.on('missionProgress', (msg) => {
  if (msg.planetId !== currentPlanetId) return;
  if (msg.kind === 'kill') progressKill(msg.planetId, missionToast);
  else if (msg.kind === 'collect') progressCollect(msg.planetId, missionToast);
});

function findNearestInteractable() {
  if (mode === 'base') {
    const cands = [...activeBuild.shops, activeBuild.padGroup, activeBuild.starMap, activeBuild.wardrobe, activeBuild.weaponsStand, activeBuild.codesStand];
    if (!drivingVehicle) cands.push(activeBuild.baseRover);
    return nearestOf(cands, (o) => o.position, [3.6, 4.2, 3.6, 3]);
  }
  if (mode === 'planet') {
    const b = activeBuild;
    const list = [];
    if (!inCave) {
      list.push(b.beacon);
      if (!b.vehicle.userData.repaired || !drivingVehicle) list.push(b.vehicle);
      b.digSites.forEach((d) => { if (!d.userData.dug) list.push(d); });
      if (b.lostRocket) list.push(b.lostRocket);
      list.push(b.mineEntrance);
      if (!b.shuttleWreck.userData.searched) list.push(b.shuttleWreck);
    } else {
      const exitWorld = new THREE.Object3D();
      exitWorld.position.set(b.caveOrigin.x + b.caveExit.position.x, b.caveOrigin.y, b.caveOrigin.z + b.caveExit.position.z);
      exitWorld.userData = { type: 'caveExit' };
      list.push(exitWorld);
    }
    return nearestOf(list, (o) => (o === b.beacon || o === b.vehicle || o === b.lostRocket || b.digSites.includes(o)) ? worldPosOf(o, b) : o.position, list.map(() => (list.includes(b.lostRocket) ? 5 : 3)));
  }
  return null;
}

function worldPosOf(obj, build) {
  return obj.position;
}

function nearestOf(list, posFn, ranges) {
  let best = null, bestDist = Infinity, bestRange = 3;
  list.forEach((o, i) => {
    const p = posFn(o);
    const d = player.mesh.position.distanceTo(p);
    const r = ranges[i] ?? 3;
    if (d < r && d < bestDist) { bestDist = d; best = o; bestRange = r; }
  });
  return best;
}

function promptLabelFor(obj) {
  if (mode === 'base') {
    const d = obj.userData;
    if (d.type === 'shop') return `Enter ${d.label}`;
    if (d.type === 'launchPad') return rocketReady() ? 'Assemble & Launch Rocket' : `Launch Pad (${rocketPartsCount()}/${Object.keys(state.rocketParts).length} parts)`;
    if (d.type === 'starMap') return 'Open Star Map';
    if (d.type === 'vehicle') return 'Enter Rover';
    if (d.type === 'wardrobe') return 'Change Outfit';
    if (d.type === 'weaponsStand') return 'Browse Weapons';
    if (d.type === 'codesStand') return 'Enter Code';
  } else {
    const d = obj.userData;
    if (d.type === 'returnBeacon') return 'Return to Base';
    if (d.type === 'vehicle') return d.repaired ? 'Enter Rover' : `Hold to Repair (needs 2 Tools, have ${state.inventory.tools})`;
    if (d.type === 'digSite') return 'Hold to Dig';
    if (d.type === 'lostRocket') return state.planets[PLANET_COUNT].lostRocketFound ? 'Lost Rocket Ship (explored)' : 'Explore the Lost Rocket Ship!';
    if (d.type === 'mineEntrance') return 'Enter Mineshaft';
    if (d.type === 'caveExit') return 'Exit Mineshaft';
    if (d.type === 'shuttleWreck') return 'Search the Crashed Shuttle';
  }
  return 'Interact';
}

// ===================== INTERACT HANDLING =====================
function handleInteractTap(obj) {
  const d = obj.userData;
  if (mode === 'base') {
    if (d.type === 'shop') { openShop(d.shopKey); return; }
    if (d.type === 'starMap') { openStarmap(); return; }
    if (d.type === 'launchPad') { tryLaunch(); return; }
    if (d.type === 'vehicle') { enterVehicle(obj); return; }
    if (d.type === 'wardrobe') { openWardrobe(); return; }
    if (d.type === 'weaponsStand') { openWeapons(); return; }
    if (d.type === 'codesStand') { openCodes(); return; }
  } else {
    if (d.type === 'returnBeacon') { enterBase(); return; }
    if (d.type === 'vehicle' && d.repaired) { enterVehicle(obj); return; }
    if (d.type === 'lostRocket') { exploreLostRocket(); return; }
    if (d.type === 'mineEntrance') { enterCave(obj); return; }
    if (d.type === 'caveExit') { exitCave(); return; }
    if (d.type === 'shuttleWreck') { searchShuttleWreck(obj); return; }
  }
}

function searchShuttleWreck(shuttle) {
  shuttle.userData.searched = true;
  shuttle.userData.chipGlow.visible = false;
  state.planets[currentPlanetId].blueprintFound = true;
  sfx.partFound();
  ui.showToast('Blueprint microchip recovered!');
  checkAtmosphereMission(currentPlanetId, missionToast);
  saveGame();
}

function missionToast(text) { ui.showToast(text); sfx.missionComplete(); }

function enterVehicle(mesh) {
  drivingVehicle = mesh;
  mesh.userData.driving = true;
  vehicleCtl = new VehicleController(mesh, (x, z) => getGroundHeightCurrent(x, z));
  vehicleCtl.vehicle.userData.heading = player.heading;
  mesh.rotation.y = player.heading;
  player.disabled = true;
  player.mesh.visible = false;
  if (firstPerson) { firstPerson = false; player.mesh.userData.head.visible = true; player.mesh.userData.visor.visible = true; }
  sfx.enterVehicle();
}

function openShop(shopKey) {
  const body = document.createElement('div');
  if (shopKey === 'upgrades') {
    Object.entries(UPGRADE_INFO).forEach(([key, info]) => {
      const lvl = state.upgrades[key];
      const row = document.createElement('div');
      row.className = 'shop-item';
      const maxed = lvl >= 3;
      const cost = maxed ? 0 : upgradeCost(key);
      row.innerHTML = `<div><div class="si-name">${info.name} (Lv ${lvl}/3)</div><div class="si-desc">${info.desc}</div></div>`;
      const btn = document.createElement('button');
      btn.textContent = maxed ? 'MAX' : `${cost} coins`;
      btn.disabled = maxed || state.coins < cost;
      btn.onclick = () => {
        state.coins -= cost; state.upgrades[key] += 1;
        applyUpgradeEffects(); saveGame(); ui.updateCoins(state.coins);
        sfx.buy();
        openShop(shopKey);
      };
      row.appendChild(btn);
      body.appendChild(row);
    });
  } else {
    SHOP_ITEMS[shopKey].forEach((item) => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      let owned = item.type === 'rocketPart' && state.rocketParts[item.key];
      row.innerHTML = `<div><div class="si-name">${item.name}</div><div class="si-desc">${item.desc}</div></div>`;
      const btn = document.createElement('button');
      btn.textContent = owned ? 'OWNED' : `${item.cost} coins`;
      btn.disabled = owned || state.coins < item.cost;
      btn.onclick = () => {
        state.coins -= item.cost;
        if (item.type === 'rocketPart') state.rocketParts[item.key] = true;
        else if (item.type === 'inventory') state.inventory[item.key] = (state.inventory[item.key] || 0) + 1;
        else if (item.type === 'heal') state.health = Math.min(state.maxHealth, state.health + item.amount);
        saveGame(); ui.updateCoins(state.coins); ui.updateParts(rocketPartsCount()); ui.updateHealth(state.health, state.maxHealth);
        sfx.buy();
        openShop(shopKey);
      };
      row.appendChild(btn);
      body.appendChild(row);
    });
  }
  const title = { parts: '🔧 PARTS SHOP', upgrades: '⚡ UPGRADES', tools: '🛠 TOOL SHOP', food: '🍔 FOOD SHOP' }[shopKey];
  ui.openPanel(title, body);
}

function openWardrobe() {
  const body = document.createElement('div');

  const defaultRow = document.createElement('div');
  defaultRow.className = 'starmap-row';
  defaultRow.innerHTML = '<div><div class="si-name">Default Suit</div><div class="si-desc">Standard-issue white</div></div>';
  const defaultBtn = document.createElement('button');
  const defaultWorn = !state.equippedSuitColor;
  defaultBtn.textContent = defaultWorn ? 'Worn' : 'Wear';
  defaultBtn.disabled = defaultWorn;
  defaultBtn.onclick = () => {
    sfx.uiClick();
    state.equippedSuitColor = null;
    player.setSuitColor(0xe8e8e8);
    saveGame();
    openWardrobe();
  };
  defaultRow.appendChild(defaultBtn);
  body.appendChild(defaultRow);

  const foundIds = Object.keys(state.outfitsFound);
  if (foundIds.length === 0) {
    const hint = document.createElement('p');
    hint.style.cssText = 'color:#9ab;font-size:13px;padding:6px 2px;';
    hint.textContent = 'No special outfits found yet — look for a glowing suit inside a cave on each planet.';
    body.appendChild(hint);
  }
  foundIds.forEach((idStr) => {
    const id = Number(idStr);
    const hex = state.outfitsFound[id];
    const row = document.createElement('div');
    row.className = 'starmap-row';
    row.innerHTML = `<div><div class="si-name">${PLANETS[id].name} Outfit</div><div class="si-desc">Found in the ${PLANETS[id].name} cave</div></div>`;
    const btn = document.createElement('button');
    const isWorn = state.equippedSuitColor === hex;
    btn.textContent = isWorn ? 'Worn' : 'Wear';
    btn.disabled = isWorn;
    btn.onclick = () => {
      sfx.uiClick();
      state.equippedSuitColor = hex;
      player.setSuitColor(hex);
      saveGame();
      openWardrobe();
    };
    row.appendChild(btn);
    body.appendChild(row);
  });

  ui.openPanel('🧥 WARDROBE', body);
}

function openWeapons() {
  const body = document.createElement('div');
  WEAPON_ORDER.forEach((key) => {
    const w = WEAPONS[key];
    const owned = !!state.weaponsOwned[key];
    const equipped = state.equippedWeapon === key;
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `<div><div class="si-name">${w.name}${equipped ? ' (Equipped)' : ''}</div><div class="si-desc">${w.desc}</div></div>`;
    const btn = document.createElement('button');
    if (equipped) {
      btn.textContent = 'Equipped';
      btn.disabled = true;
    } else if (owned) {
      btn.textContent = 'Equip';
      btn.disabled = false;
      btn.onclick = () => {
        sfx.uiClick();
        state.equippedWeapon = key;
        player.setWeapon(key);
        saveGame();
        openWeapons();
      };
    } else {
      btn.textContent = `${w.cost} coins`;
      btn.disabled = state.coins < w.cost;
      btn.onclick = () => {
        state.coins -= w.cost;
        state.weaponsOwned[key] = true;
        state.equippedWeapon = key;
        player.setWeapon(key);
        saveGame(); ui.updateCoins(state.coins);
        sfx.buy();
        openWeapons();
      };
    }
    row.appendChild(btn);
    body.appendChild(row);
  });
  ui.openPanel('🔫 WEAPONS', body);
}

function openCodes() {
  const body = document.createElement('div');

  const hint = document.createElement('p');
  hint.style.cssText = 'color:#9ab;font-size:13px;padding:0 2px 4px;';
  hint.textContent = 'Enter a code to redeem a reward.';
  body.appendChild(hint);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:8px;';
  const codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.className = 'code-input';
  codeInput.placeholder = 'CODE';
  codeInput.autocomplete = 'off';
  codeInput.autocapitalize = 'off';
  codeInput.spellcheck = false;
  const submitBtn = document.createElement('button');
  submitBtn.className = 'code-submit';
  submitBtn.textContent = 'Redeem';
  row.appendChild(codeInput);
  row.appendChild(submitBtn);
  body.appendChild(row);

  const feedback = document.createElement('p');
  feedback.style.cssText = 'font-size:13px; font-weight:700; min-height:16px; padding:2px;';
  body.appendChild(feedback);

  const redeem = () => {
    const code = codeInput.value.trim().toLowerCase();
    if (!code) return;
    const entry = CHEAT_CODES[code];
    if (!entry) {
      feedback.textContent = 'Invalid code.';
      feedback.style.color = '#ff5b5b';
      sfx.denied();
      return;
    }
    if (entry.reward === 'coins') {
      state.coins += entry.amount;
      ui.updateCoins(state.coins);
      feedback.textContent = `Code accepted! +${entry.amount} Coins`;
    } else if (entry.reward === 'unlockAll') {
      PLANET_ID_LIST.forEach((id) => { state.planets[id].unlocked = true; });
      feedback.textContent = 'Code accepted! Every world is now unlocked.';
    }
    feedback.style.color = '#7fff9e';
    saveGame();
    sfx.win();
    codeInput.value = '';
  };
  submitBtn.onclick = redeem;
  codeInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') redeem();
  });
  codeInput.addEventListener('keyup', (e) => e.stopPropagation());

  ui.openPanel('💻 CODES', body);
  setTimeout(() => codeInput.focus(), 50);
}

function openStarmap() {
  const body = document.createElement('div');
  PLANET_ID_LIST.forEach((id) => {
    const p = state.planets[id];
    const row = document.createElement('div');
    row.className = 'starmap-row';
    const status = p.completed ? 'Completed ✅' : p.unlocked ? 'Unlocked' : 'Locked 🔒';
    row.innerHTML = `<div><div class="si-name">${PLANETS[id].name}</div><div class="si-desc">${status}</div></div>`;
    const btn = document.createElement('button');
    btn.textContent = 'Travel';
    btn.disabled = !p.unlocked;
    btn.onclick = () => {
      sfx.uiClick();
      ui.closePanel();
      launchToSpace(id, { forced: false, travelGoal: 340 });
    };
    row.appendChild(btn);
    body.appendChild(row);
  });
  ui.openPanel('🌌 STAR MAP', body);
}

function tryLaunch() {
  const frontier = Math.max(...PLANET_ID_LIST.filter((id) => state.planets[id].unlocked));
  if (frontier >= PLANET_COUNT) {
    if (state.planets[PLANET_COUNT].lostRocketFound) ui.showToast('SPACE WAR complete! Explore freely.');
    else ui.showToast('Find the Lost Rocket Ship on Xenar Prime!');
    sfx.denied();
    return;
  }
  if (!rocketReady()) {
    const totalParts = Object.keys(state.rocketParts).length;
    ui.showToast(`Need ${totalParts - rocketPartsCount()} more rocket part(s)! (${rocketPartsCount()}/${totalParts})`);
    sfx.denied();
    return;
  }
  launchToSpace(frontier + 1, { forced: true, travelGoal: 620 });
}

function exploreLostRocket() {
  if (state.planets[PLANET_COUNT].lostRocketFound) return;
  state.planets[PLANET_COUNT].lostRocketFound = true;
  state.planets[PLANET_COUNT].completed = true;
  completeMissionByType(PLANET_COUNT, 'lostrocket', ui.showToast);
  if (activeBuild.lostRocket) { activeBuild.scene.remove(activeBuild.lostRocket); activeBuild.lostRocket = null; }
  saveGame();
  sfx.win();
  ui.showBigMessage('🚀 LOST ROCKET FOUND!', 'Billy Bob has completed SPACE WAR! Keep exploring all nine worlds anytime.', 5000);
}

// ===================== DIG / REPAIR HOLD LOGIC =====================
let lastDigTickStep = -1;
let lastRepairTickStep = -1;

function handleHold(obj, dt) {
  const d = obj.userData;
  if (d.type === 'digSite') {
    digTarget = obj;
    if (input.interactHeld) {
      digProgress = Math.min(1, digProgress + dt / 1.8);
      player.digging = true;
      ui.showDigProgress(digProgress);
      const step = Math.floor(digProgress * 6);
      if (step !== lastDigTickStep) { lastDigTickStep = step; sfx.dig(); }
      if (digProgress >= 1) completeDig(obj);
    } else {
      digProgress = Math.max(0, digProgress - dt * 2);
      lastDigTickStep = -1;
      if (digProgress <= 0) { player.digging = false; ui.hideDigProgress(); }
    }
    return true;
  }
  if (d.type === 'vehicle' && !d.repaired) {
    if (input.interactHeld) {
      if (state.inventory.tools < 2) { ui.showToast('Need 2 Repair Tools!'); sfx.denied(); repairHoldProgress = 0; return true; }
      repairHoldProgress = Math.min(1, repairHoldProgress + dt / 1.6);
      player.digging = true;
      ui.showDigProgress(repairHoldProgress);
      const step = Math.floor(repairHoldProgress * 6);
      if (step !== lastRepairTickStep) { lastRepairTickStep = step; sfx.repairTick(); }
      if (repairHoldProgress >= 1) completeRepair(obj);
    } else {
      repairHoldProgress = Math.max(0, repairHoldProgress - dt * 2);
      lastRepairTickStep = -1;
      if (repairHoldProgress <= 0) { player.digging = false; ui.hideDigProgress(); }
    }
    return true;
  }
  player.digging = false;
  ui.hideDigProgress();
  return false;
}

function completeDig(site) {
  site.userData.dug = true;
  site.visible = false;
  if (site.userData.sparkle) site.userData.sparkle.visible = false;
  digProgress = 0; player.digging = false; ui.hideDigProgress();
  const kind = site.userData.kind;
  if (kind === 'mission') {
    const def = completeMissionByType(currentPlanetId, 'dig', missionToast);
    if (!def) { state.coins += 20; ui.showToast('+20 Coins'); sfx.coin(); }
  } else {
    const c = 10 + Math.floor(Math.random() * 15);
    state.coins += c; state.inventory.scrap += 1;
    ui.showToast(`+${c} Coins, +1 Scrap`);
    sfx.coin();
  }
  saveGame();
}

function completeRepair(vehicleMesh) {
  state.inventory.tools -= 2;
  setRepaired(vehicleMesh);
  state.planets[currentPlanetId].vehicleRepaired = true;
  repairHoldProgress = 0; player.digging = false; ui.hideDigProgress();
  sfx.repairDone();
  completeMissionByType(currentPlanetId, 'repair', ui.showToast);
  ui.showToast('Rover repaired!');
  saveGame();
}

// ===================== COMBAT (ground) =====================
// true if this client should treat raiders (not bosses/yeti, which are always local-only)
// as puppets driven by the party host's snapshots instead of running AI/damage locally -
// only when the host is actually here too, so a guest exploring solo elsewhere still gets
// normal single-player raiders instead of frozen ones with no one to drive them
function hostIsHere() {
  if (!net.isConnected() || net.isHost()) return false;
  const h = net.remotePlayers[net.hostId];
  return !!h && h.mode === mode && h.inCave === inCave && (mode !== 'planet' || h.planetId === currentPlanetId);
}

// secret-room ambush raiders are excluded - they're dynamically spawned per-player when
// that player triggers their own vault, so their array index isn't the same thing across
// clients the way the deterministic initial spawn list is. Those stay fully local, like bosses.
function isSharedRaider(e) {
  return e.userData.kind !== 'boss' && e.userData.kind !== 'yeti' && !e.userData.secretRoom;
}

function killEnemyLocal(b, e, opts = {}) {
  const grantReward = opts.grantReward !== false;
  const isYeti = e.userData.kind === 'yeti';
  const isBoss = isYeti || e.userData.kind === 'boss';
  const bossLabel = isYeti ? 'YETI' : e.userData.displayName;
  e.userData.alive = false;
  if (!e.userData.noRespawn) e.userData.respawnAt = elapsed + 25;
  b.explosions.push(createExplosion(b.scene, e.position, isYeti ? 0xbfe8ff : (e.userData.deathColor || 0xffaa33), isBoss ? 30 : 16));
  b.scene.remove(e);
  sfx.explosion();
  if (!grantReward) return;
  const coinGain = isBoss ? (60 + Math.floor(Math.random() * 40)) : (8 + Math.floor(Math.random() * 10));
  state.coins += coinGain;
  progressKillNet(currentPlanetId, missionToast);
  const killText = isBoss ? `${bossLabel} DEFEATED!` : 'Raider down!';
  if (e.userData.secretRoom && b.secretRoom) {
    b.secretRoom.remaining -= 1;
    ui.showToast(`${killText} +${coinGain} Coins (${b.secretRoom.remaining} left)`);
    if (b.secretRoom.remaining <= 0) resolveSecretRoom(b);
  } else {
    ui.showToast(`${killText} +${coinGain} Coins`);
  }
}

function updateGroundCombat(dt) {
  const b = activeBuild;
  const deferToHost = hostIsHere();
  b.enemies.forEach((e) => {
    if (isSharedRaider(e) && deferToHost) {
      if (e.userData.alive && e.userData.netTarget) {
        const lerpT = Math.min(1, dt * 6);
        e.position.lerp(e.userData.netTarget, lerpT);
        e.rotation.y = lerpAngle(e.rotation.y, e.userData.netTargetRy || 0, lerpT);
      }
      return;
    }
    if (!e.userData.alive) {
      if (e.userData.respawnAt && elapsed >= e.userData.respawnAt) {
        e.userData.alive = true; e.userData.hp = e.userData.maxHp; e.userData.respawnAt = null;
        e.position.copy(e.userData.home);
        e.visible = true;
        b.scene.add(e);
      }
      return;
    }
    if (e.userData.kind === 'yeti') {
      updateYetiBoss(e, dt, player.mesh.position, (x, z) => getGroundHeightCurrent(x, z), {
        onPunchHit: (dir) => applyYetiHit(e.userData.punchDamage, dir, e, () => sfx.yetiPunch(), 1.6),
        onSlamHit: (dir) => {
          b.explosions.push(createExplosion(b.scene, e.position, 0xbfe8ff, 22));
          applyYetiHit(e.userData.slamDamage, dir, e, () => sfx.yetiSlam(), 4.5);
        },
        onChargeHit: (dir) => applyYetiHit(e.userData.chargeDamage, dir, e, () => sfx.yetiChargeHit(), 6),
      });
    } else if (e.userData.kind === 'boss') {
      updateBossGeneric(e, dt, player.mesh.position, (x, z) => getGroundHeightCurrent(x, z), {
        onMeleeHit: (dir, move) => applyBossMoveHit(b, e, move, dir),
        onSpecialAHit: (dir, move) => applyBossMoveHit(b, e, move, dir),
        onSpecialBHit: (dir, move) => applyBossMoveHit(b, e, move, dir),
      });
    } else {
      updateGroundEnemy(e, dt, player.mesh.position, (x, z) => getGroundHeightCurrent(x, z), (origin, dir) => {
        const p = createProjectile(origin, dir, { color: 0xff5050, speed: 20, damage: e.userData.damage || 8, owner: 'enemy', life: 2.5 });
        b.scene.add(p);
        b.enemyProjectiles.push(p);
        sfx.enemyShoot();
      });
    }
  });

  updateProjectiles(b.projectiles, dt, b.scene);
  updateProjectiles(b.enemyProjectiles, dt, b.scene);
  updateExplosions(b.explosions, dt, b.scene);

  for (let i = b.projectiles.length - 1; i >= 0; i--) {
    const p = b.projectiles[i];
    let hit = false;
    for (const e of b.enemies) {
      if (!e.userData.alive) continue;
      if (p.position.distanceTo(e.position) < (e.userData.hitRadius || 1.5)) {
        b.scene.remove(p); b.projectiles.splice(i, 1); hit = true;
        if (isSharedRaider(e) && deferToHost) {
          // the host owns this raider's real hp - forward the hit instead of mutating it here,
          // but reward myself right away so landing the killing blow still feels responsive
          const idx = b.enemies.indexOf(e);
          net.send('enemyHit', { planetId: currentPlanetId, inCave, index: idx, damage: p.userData.damage });
          if (e.userData.hp - p.userData.damage <= 0) {
            const coinGain = 8 + Math.floor(Math.random() * 10);
            state.coins += coinGain;
            progressKillNet(currentPlanetId, missionToast);
            ui.showToast(`Raider down! +${coinGain} Coins`);
          } else {
            sfx.hit();
          }
        } else {
          e.userData.hp -= p.userData.damage;
          if (e.userData.hp <= 0) killEnemyLocal(b, e);
          else sfx.hit();
        }
        break;
      }
    }
    if (hit) continue;
  }

  for (let i = b.enemyProjectiles.length - 1; i >= 0; i--) {
    const p = b.enemyProjectiles[i];
    if (p.position.distanceTo(player.mesh.position) < 1.1) {
      state.health -= p.userData.damage;
      b.scene.remove(p); b.enemyProjectiles.splice(i, 1);
      ui.updateHealth(state.health, state.maxHealth);
      sfx.playerHurt();
      if (state.health <= 0) respawnPlayer();
    }
  }
}

// ===================== MULTIPLAYER: shared ground-raider enemies =====================
// Host-authoritative: the party host runs real raider AI/damage exactly like single-player
// and periodically broadcasts a snapshot; everyone else renders puppets (see hostIsHere/
// deferToHost above) and forwards their own hits instead of mutating shared hp directly.
// Bosses/yeti vault fights stay fully local to whoever triggered that vault - they aren't
// broadcast at all, since each player's vault encounter is already their own instance.
let enemySnapshotTimer = 0;
function syncSharedEnemies(dt) {
  if (!net.isConnected() || mode !== 'planet' || !net.isHost()) return;
  enemySnapshotTimer -= dt;
  if (enemySnapshotTimer > 0) return;
  enemySnapshotTimer = 0.15;
  const b = activeBuild;
  const enemies = [];
  b.enemies.forEach((e, i) => {
    if (!isSharedRaider(e)) return;
    enemies.push({ i, x: e.position.x, y: e.position.y, z: e.position.z, ry: e.rotation.y, hp: e.userData.hp, alive: e.userData.alive });
  });
  net.send('enemySnapshot', { planetId: currentPlanetId, inCave, enemies });
}

net.on('enemySnapshot', (msg) => {
  if (net.isHost() || mode !== 'planet') return;
  if (msg.planetId !== currentPlanetId || msg.inCave !== inCave) return;
  const b = activeBuild;
  if (!b) return;
  msg.enemies.forEach((es) => {
    const e = b.enemies[es.i];
    if (!e) return;
    const wasAlive = e.userData.alive;
    e.userData.hp = es.hp;
    e.userData.netTarget = new THREE.Vector3(es.x, es.y, es.z);
    e.userData.netTargetRy = es.ry;
    if (wasAlive && !es.alive) {
      killEnemyLocal(b, e, { grantReward: false });
    } else if (!wasAlive && es.alive) {
      e.userData.alive = true;
      e.visible = true;
      e.position.set(es.x, es.y, es.z);
      b.scene.add(e);
    }
  });
});

net.on('enemyHit', (msg) => {
  if (!net.isHost() || mode !== 'planet') return;
  if (msg.planetId !== currentPlanetId || msg.inCave !== inCave) return;
  const b = activeBuild;
  const e = b && b.enemies[msg.index];
  if (!e || !e.userData.alive || !isSharedRaider(e)) return;
  e.userData.hp -= msg.damage;
  if (e.userData.hp <= 0) killEnemyLocal(b, e, { grantReward: false });
});

function respawnPlayer() {
  state.coins = Math.max(0, Math.floor(state.coins * 0.9));
  state.health = Math.floor(state.maxHealth * 0.5);
  sfx.knockedOut();
  enterBase();
  ui.showToast('Knocked out! Rescued back to Base.');
}

// ===================== YETI EXECUTION (special kill animation) =====================
function applyYetiHit(dmg, dir, e, hitSfx, knockback) {
  if (deathSequence) return;
  state.health -= dmg;
  ui.updateHealth(state.health, state.maxHealth);
  hitSfx();
  if (state.health <= 0) {
    startYetiExecution(e);
  } else if (dir) {
    player.mesh.position.x += dir.x * knockback;
    player.mesh.position.z += dir.z * knockback;
  }
}

// generic (non-yeti) boss damage: a normal knockout, no special execution cutscene
function applyBossDamage(dmg, dir, knockback) {
  if (deathSequence) return;
  state.health -= dmg;
  ui.updateHealth(state.health, state.maxHealth);
  if (state.health <= 0) {
    respawnPlayer();
  } else if (dir) {
    player.mesh.position.x += dir.x * knockback;
    player.mesh.position.z += dir.z * knockback;
  }
}

// dispatches a landed boss move: ranged moves spawn real projectiles toward the player,
// everything else (melee/aoe/dash) is direct damage + knockback with type-appropriate feedback
function applyBossMoveHit(b, boss, move, dir) {
  if (move.type === 'projectile') {
    const originPos = boss.position.clone(); originPos.y += 2.4;
    const count = move.count || 3;
    for (let i = 0; i < count; i++) {
      const spread = move.spread || 0.2;
      const d = dir.clone();
      d.applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (count - 1) / 2) * spread);
      const p = createProjectile(originPos, d, { color: move.particleColor || 0xff8844, speed: move.projSpeed || 22, damage: move.damage, owner: 'enemy', life: 3 });
      b.scene.add(p);
      b.enemyProjectiles.push(p);
    }
    sfx.enemyShoot();
    return;
  }
  if (move.type === 'aoe') {
    b.explosions.push(createExplosion(b.scene, boss.position, move.particleColor || 0xffaa33, 24));
  }
  const hitSfx = sfx[move.sfxKey] || sfx.hit;
  hitSfx();
  applyBossDamage(move.damage, dir, move.knockback || 3);
}

function startYetiExecution(yeti) {
  const u = player.mesh.userData;
  player.disabled = true;
  ui.hideInteractPrompt();
  const headWorldPos = new THREE.Vector3();
  u.head.getWorldPosition(headWorldPos);
  const headClone = u.head.clone();
  headClone.position.copy(headWorldPos);
  headClone.rotation.copy(player.mesh.rotation);
  activeScene.add(headClone);
  u.head.visible = false;
  deathSequence = { timer: 0, phase: 'grab', yeti, headClone };
  sfx.yetiRoar();
}

function updateYetiExecution(dt) {
  const ds = deathSequence;
  const yeti = ds.yeti;
  ds.timer += dt;
  const facing = new THREE.Vector3().subVectors(player.mesh.position, yeti.position).setY(0).normalize();
  const grabSpot = new THREE.Vector3(yeti.position.x + facing.x * 1.6, yeti.position.y, yeti.position.z + facing.z * 1.6);

  if (ds.phase === 'grab') {
    const t = Math.min(1, ds.timer / 0.5);
    const groundY = getGroundHeightCurrent(player.mesh.position.x, player.mesh.position.z);
    player.mesh.position.lerp(grabSpot, 0.12);
    player.mesh.position.y = groundY + Math.sin(t * Math.PI) * 0.5;
    player.heading = Math.atan2(-facing.x, -facing.z);
    player.mesh.rotation.y = player.heading;
    ds.headClone.position.copy(player.mesh.position).add(new THREE.Vector3(0, 1.68, 0));
    if (yeti.userData.jaw) yeti.userData.jaw.rotation.x = -0.3 * t;
    if (ds.timer >= 0.5) { ds.phase = 'bite'; ds.timer = 0; }
  } else if (ds.phase === 'bite') {
    const t = Math.min(1, ds.timer / 0.35);
    if (yeti.userData.jaw) yeti.userData.jaw.rotation.x = -0.3 + Math.sin(t * Math.PI) * 0.9;
    if (!ds.ripped) {
      ds.headClone.position.copy(player.mesh.position).add(new THREE.Vector3(0, 1.68, 0));
    }
    if (ds.timer >= 0.12 && !ds.ripped) {
      ds.ripped = true;
      activeBuild.explosions.push(createExplosion(activeScene, ds.headClone.position, 0xff2020, 26));
      sfx.gib();
      ds.headVel = new THREE.Vector3((Math.random() - 0.5) * 2, 5 + Math.random() * 2, (Math.random() - 0.5) * 2);
    }
    if (ds.ripped) {
      ds.headVel.y -= 14 * dt;
      ds.headClone.position.addScaledVector(ds.headVel, dt);
      ds.headClone.rotation.x += dt * 6;
      ds.headClone.rotation.z += dt * 4;
    }
    if (ds.timer >= 0.35) { ds.phase = 'toss'; ds.timer = 0; }
  } else if (ds.phase === 'toss') {
    ds.headVel.y -= 14 * dt;
    ds.headClone.position.addScaledVector(ds.headVel, dt);
    ds.headClone.rotation.x += dt * 6;
    ds.headClone.rotation.z += dt * 4;
    player.mesh.rotation.z += (Math.PI / 2 - player.mesh.rotation.z) * Math.min(1, dt * 3);
    if (ds.timer >= 1.1) { finishYetiExecution(); }
  }
}

function finishYetiExecution() {
  const ds = deathSequence;
  if (ds.headClone.parent) ds.headClone.parent.remove(ds.headClone);
  const u = player.mesh.userData;
  u.head.visible = true;
  player.mesh.rotation.set(0, player.heading, 0);
  player.disabled = false;
  deathSequence = null;
  state.coins = Math.max(0, Math.floor(state.coins * 0.85));
  state.health = Math.floor(state.maxHealth * 0.5);
  enterBase();
  ui.showBigMessage('DECAPITATED!', 'The yeti tore Billy Bob apart. Rescued back to Base.', 3200);
}

// ===================== SECRET AMBUSH VAULT =====================
function updateSecretRoom() {
  if (mode !== 'planet' || !inCave) return;
  const b = activeBuild;
  const sr = b.secretRoom;
  if (!sr || sr.resolved) return;
  if (!sr.triggered) {
    const pPos = player.mesh.position;
    const dx = (pPos.x - b.caveOrigin.x) - sr.roomCenter.x;
    const dz = (pPos.z - b.caveOrigin.z) - sr.roomCenter.z;
    if (Math.hypot(dx, dz) < sr.roomRadius * 0.92) triggerSecretRoom(b, sr);
    return;
  }
  if (sr.boss && !sr.boss.triggered && elapsed >= sr.boss.burstAt) {
    burstBossWall(b, sr);
  }
}

function triggerSecretRoom(b, sr) {
  sr.triggered = true;
  sr.doorMesh.userData.state = 'closed';
  sr.remaining = sr.enemySpawns.length;
  sr.activeEnemies = sr.enemySpawns.map((spawn) => {
    const e = createGroundEnemy(spawn, b.planet.enemySkin, currentPlanetId);
    const vaultHp = b.planet.enemySkin === 'miniYeti' ? 31 : 22;
    e.userData.hp = vaultHp; e.userData.maxHp = vaultHp;
    e.userData.secretRoom = true;
    e.userData.noRespawn = true;
    b.scene.add(e);
    b.enemies.push(e);
    return e;
  });
  sfx.denied();
  if (sr.boss) {
    sr.boss.burstAt = elapsed + 1.4;
    ui.showBigMessage('AMBUSH!', 'The vault door seals shut behind you...', 1600);
  } else {
    ui.showBigMessage('AMBUSH!', 'The vault door seals shut behind you. Clear them all!', 2800);
  }
}

function burstBossWall(b, sr) {
  const boss = sr.boss;
  boss.triggered = true;
  boss.wallPanel.visible = false;
  const burstColor = boss.type === 'yeti' ? 0xbfe8ff : (BOSSES[boss.type] ? BOSSES[boss.type].accentColor : 0xffaa33);
  b.explosions.push(createExplosion(b.scene, boss.wallPanel.position, burstColor, 26));
  sfx.wallSmash();
  sfx.yetiRoar();
  const enemy = boss.type === 'yeti' ? createYetiBoss(boss.spawnPos) : createBossEnemy(boss.spawnPos, BOSSES[boss.type]);
  enemy.userData.secretRoom = true;
  enemy.userData.noRespawn = true;
  b.scene.add(enemy);
  b.enemies.push(enemy);
  boss.enemyRef = enemy;
  sr.remaining += 1;
  const label = boss.type === 'yeti' ? 'YETI' : BOSSES[boss.type].name;
  ui.showBigMessage(`${label} BURSTS THROUGH THE WALL!`, 'This is going to hurt.', 2600);
}

function resolveSecretRoom(b) {
  const sr = b.secretRoom;
  sr.resolved = true;
  sr.doorMesh.userData.state = 'open';
  state.planets[currentPlanetId].secretRoomDone = true;
  const toolGain = 3 + Math.floor(currentPlanetId / 4);
  const coinGain = 200 + currentPlanetId * 25;
  state.coins += coinGain;
  state.inventory.tools += toolGain;
  state.rocketParts.guidanceCore = true;
  saveGame();
  sfx.win();
  ui.showBigMessage('VAULT CLEARED!', `The blast door opens. +${coinGain} Coins, +${toolGain} Repair Tools, Guidance Core acquired!`, 3800);
}

// ===================== MAIN LOOP =====================
let lastInteractObj = null;
function tick() {
  requestAnimationFrame(tick);
  let dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;

  if (mode === 'title') { renderer.render(getEmptyScene(), camera); return; }

  updateControlsFrame();
  syncNetworkPresence(dt);

  if (mode === 'space') {
    spaceFlight.update(dt, {
      onEnemyKilled: () => { state.coins += 12; ui.updateCoins(state.coins); },
      onPlayerHit: (hp) => { ui.updateHealth(hp, state.maxHealth); },
      onArrive: () => {
        const frontier = Math.max(...PLANET_ID_LIST.filter((id) => state.planets[id].unlocked));
        const progression = spaceFlight.destPlanetId === frontier + 1;
        onArriveSpace(spaceFlight.destPlanetId, progression);
      },
      onDestroyed: () => { spaceFlight.health = 20; spaceFlight.traveled = spaceFlight.travelGoal; },
    });
    spaceFlight.updateCamera(camera, dt);
    ui.updateHealth(spaceFlight.health, spaceFlight.maxHealth);
    ui.showCrosshair(true);
    renderer.render(spaceFlight.scene, camera);
    return;
  }

  // base / planet / cave
  if (drivingVehicle) {
    vehicleCtl.update(dt);
    clampToWorldBoundary(drivingVehicle.position);
    updateThirdPersonCamera(camera, drivingVehicle.position, dt, 10, 2.2);
    if (input.interactPressed) {
      exitVehicleIfAny();
      input.interactPressed = false; // consume now, or the interactable check below sees you standing next to the car and re-enters it in the same frame
    }
  } else {
    if (input.viewTogglePressed) {
      firstPerson = !firstPerson;
      player.mesh.userData.head.visible = !firstPerson;
      player.mesh.userData.visor.visible = !firstPerson;
    }
    player.update(dt, speedMultiplier());
    clampToWorldBoundary(player.mesh.position);
    if (firstPerson) updateFirstPersonCamera(camera, player.mesh.position);
    else updateThirdPersonCamera(camera, player.mesh.position, dt);
  }

  // sky dressing (stars/sun/moon/other worlds) is parented under one group so it can be
  // recentered on wherever the player currently is, like a skybox - otherwise on the big maps
  // it's anchored near world origin and gets left behind once you wander from spawn
  if (mode === 'planet' && !inCave && activeBuild.skyGroup) {
    const trackPos = drivingVehicle ? drivingVehicle.position : player.mesh.position;
    activeBuild.skyGroup.position.set(trackPos.x, 0, trackPos.z);
  }

  if (deathSequence) updateYetiExecution(dt);

  if (!ui.isPanelOpen() && !deathSequence) {
    const nearest = findNearestInteractable();
    if (nearest) {
      const consumedHold = mode === 'planet' ? handleHold(nearest, dt) : false;
      if (!consumedHold) { digProgress = 0; repairHoldProgress = 0; player.digging = false; ui.hideDigProgress(); }
      ui.showInteractPrompt(promptLabelFor(nearest));
      if (input.interactPressed) handleInteractTap(nearest);
      lastInteractObj = nearest;
    } else {
      ui.hideInteractPrompt();
      digProgress = 0; repairHoldProgress = 0; player.digging = false; ui.hideDigProgress();
      lastInteractObj = null;
    }
  }

  collectiblesTick(dt);
  if (mode === 'planet') {
    updateGroundCombat(dt);
    syncSharedEnemies(dt);
    updateSecretRoom();
    activeBuild.tick(dt, elapsed);
    ui.renderMissionTracker(activeMissions(currentPlanetId));
  } else if (mode === 'base') {
    activeBuild.tick(dt, elapsed);
    ui.renderMissionTracker([]);
  }

  ui.updateCoins(state.coins);
  ui.updateParts(rocketPartsCount());
  ui.updateOre(state.inventory.ore);
  ui.updateHealth(state.health, state.maxHealth);
  const showCombatHud = mode === 'planet' && !drivingVehicle && !ui.isPanelOpen();
  ui.showCrosshair(showCombatHud);
  ui.updateAmmo(showCombatHud, player.ammo, player.weaponStats.magSize, player.reloading);
  const bossEnemy = mode === 'planet' && inCave && activeBuild.secretRoom && activeBuild.secretRoom.boss
    ? activeBuild.secretRoom.boss.enemyRef : null;
  if (bossEnemy && bossEnemy.userData.alive) {
    const bossName = bossEnemy.userData.kind === 'yeti' ? 'YETI' : bossEnemy.userData.displayName;
    ui.showBossHealth(true, bossName, bossEnemy.userData.hp, bossEnemy.userData.maxHp);
  } else {
    ui.showBossHealth(false);
  }

  saveTimer += dt;
  if (saveTimer > 12) { saveTimer = 0; saveGame(); }

  renderer.render(activeScene, camera);
  consumeOneShots();
}

let emptyScene = null;
function getEmptyScene() { if (!emptyScene) emptyScene = new THREE.Scene(); return emptyScene; }

// ===================== MULTIPLAYER: remote player presence =====================
// Ghost astronauts for whoever else is in the room, rendered when their reported
// mode/planet matches what the local player is currently looking at. Driving isn't
// synced yet (no shared vehicle model), so a driving remote player is simply hidden
// rather than shown standing still.
const remotePlayerMeshes = {}; // id -> { mesh, tagEl, scene, walkT, curColor, curWeapon }
let netSendTimer = 0;

function localNetState() {
  const driving = !!drivingVehicle;
  const pos = driving ? drivingVehicle.position : player.mesh.position;
  const heading = driving ? (drivingVehicle.userData.heading || 0) : player.heading;
  return {
    pos: [pos.x, pos.y, pos.z],
    heading, mode, planetId: currentPlanetId, inCave, driving,
    suitColor: state.equippedSuitColor || 0xe8e8e8,
    weaponType: state.equippedWeapon || 'pistol',
    name: state.playerName || 'Player',
  };
}

function currentSceneFor(m) {
  if (m === 'base') return baseBuild ? baseBuild.scene : null;
  if (m === 'planet') return activeBuild ? activeBuild.scene : null;
  return null;
}

function ensureRemoteMesh(id, s) {
  const mesh = createAstronaut(0xe8e8e8);
  mesh.position.set(s.pos[0], s.pos[1], s.pos[2]);
  mesh.rotation.y = s.heading || 0;
  const tagEl = document.createElement('div');
  tagEl.className = 'player-tag hidden';
  document.getElementById('player-tags').appendChild(tagEl);
  const entry = { mesh, tagEl, scene: null, walkT: 0, curColor: null, curWeapon: null };
  remotePlayerMeshes[id] = entry;
  return entry;
}

function removeRemoteMesh(id) {
  const entry = remotePlayerMeshes[id];
  if (!entry) return;
  if (entry.scene) entry.scene.remove(entry.mesh);
  entry.tagEl.remove();
  delete remotePlayerMeshes[id];
}

function syncNetworkPresence(dt) {
  if (!net.isConnected()) return;

  netSendTimer -= dt;
  if (netSendTimer <= 0 && mode !== 'title') {
    netSendTimer = 0.1;
    net.send('state', localNetState());
  }

  Object.keys(remotePlayerMeshes).forEach((id) => {
    if (!net.remotePlayers[id]) removeRemoteMesh(id);
  });

  Object.keys(net.remotePlayers).forEach((id) => {
    if (id === net.selfId) return;
    const s = net.remotePlayers[id];
    const entry = remotePlayerMeshes[id] || ensureRemoteMesh(id, s);

    const visible = !s.driving && s.mode === mode && s.inCave === inCave &&
      (mode !== 'planet' || s.planetId === currentPlanetId);
    const targetScene = visible ? currentSceneFor(s.mode) : null;

    if (targetScene !== entry.scene) {
      if (entry.scene) entry.scene.remove(entry.mesh);
      if (targetScene) targetScene.add(entry.mesh);
      entry.scene = targetScene;
    }
    if (!targetScene) { entry.tagEl.classList.add('hidden'); return; }

    if (entry.curColor !== s.suitColor) { setAstronautSuitColor(entry.mesh, s.suitColor || 0xe8e8e8); entry.curColor = s.suitColor; }
    if (entry.curWeapon !== s.weaponType) { equipWeaponMesh(entry.mesh, s.weaponType || 'pistol'); entry.curWeapon = s.weaponType; }

    const target = new THREE.Vector3(s.pos[0], s.pos[1], s.pos[2]);
    const dist = entry.mesh.position.distanceTo(target);
    const lerpT = 1 - Math.pow(0.0001, dt);
    entry.mesh.position.lerp(target, lerpT);
    entry.mesh.rotation.y = lerpAngle(entry.mesh.rotation.y, s.heading || 0, lerpT);

    const moving = dist > 0.02;
    entry.walkT += dt * (moving ? 8 : 0);
    animateWalkBob(entry.mesh.userData, entry.walkT, moving);

    const headWorld = entry.mesh.position.clone();
    headWorld.y += 1.9;
    const proj = headWorld.project(camera);
    if (proj.z > 1 || proj.z < -1) { entry.tagEl.classList.add('hidden'); return; }
    entry.tagEl.style.left = ((proj.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    entry.tagEl.style.top = ((1 - (proj.y * 0.5 + 0.5)) * window.innerHeight) + 'px';
    entry.tagEl.textContent = s.name || 'Player';
    entry.tagEl.classList.remove('hidden');
  });
}

net.on('disconnected', () => {
  Object.keys(remotePlayerMeshes).forEach((id) => removeRemoteMesh(id));
  ui.showToast('Disconnected from multiplayer.');
});
net.on('playerLeft', (id) => removeRemoteMesh(id));
net.on('playerJoined', () => { if (net.isConnected()) ui.showToast('A player joined the party!'); });

// ===================== MISSION LOG =====================
function openMissionLog() {
  const body = document.createElement('div');
  const id = mode === 'planet' ? currentPlanetId : null;
  if (!id) {
    body.innerHTML = '<p style="color:#9ab">Travel to a planet to view its mission log.</p>';
  } else {
    activeMissions(id).forEach(({ def, prog }) => {
      const row = document.createElement('div');
      row.className = 'mission-entry' + (prog.done ? ' done' : '');
      row.innerHTML = `<div class="me-name">${def.name} ${prog.done ? '✅' : ''}</div>
        <div class="me-desc">${def.desc}</div>
        <div class="me-reward">Reward: ${rewardText(def.reward) || '—'} &middot; ${missionProgressLabel(id, def)}</div>`;
      body.appendChild(row);
    });
  }
  ui.openPanel(`📋 ${id ? PLANETS[id].name.toUpperCase() : ''} MISSIONS`, body);
}

// ===================== CRAFT / BASE BUILDING =====================
function formatCraftCost(cost) {
  return Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(', ');
}
function canAffordCraftCost(cost) {
  return Object.entries(cost).every(([k, v]) => (state.inventory[k] || 0) >= v);
}

function openCraft() {
  const body = document.createElement('div');
  const hint = document.createElement('p');
  hint.style.cssText = 'color:#9ab;font-size:13px;padding:0 2px 8px;';
  hint.textContent = `Build modules for the base with materials gathered out in the field. Have: ${state.inventory.ore} ore, ${state.inventory.scrap} scrap, ${state.inventory.tools} tools.`;
  body.appendChild(hint);
  BASE_MODULES.forEach((mod) => {
    const built = !!state.baseModules[mod.key];
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `<div><div class="si-name">${mod.name}${built ? ' (Built)' : ''}</div><div class="si-desc">${mod.desc} &middot; +${mod.healthBonus} max health</div></div>`;
    const btn = document.createElement('button');
    if (built) {
      btn.textContent = 'Built';
      btn.disabled = true;
    } else {
      btn.textContent = formatCraftCost(mod.cost);
      btn.disabled = !canAffordCraftCost(mod.cost);
      btn.onclick = () => {
        Object.entries(mod.cost).forEach(([k, v]) => { state.inventory[k] -= v; });
        state.baseModules[mod.key] = true;
        applyUpgradeEffects();
        saveGame();
        ui.updateOre(state.inventory.ore);
        ui.updateHealth(state.health, state.maxHealth);
        sfx.buy();
        ui.showToast(`Built: ${mod.name}!  +${mod.healthBonus} Max Health`);
        openCraft();
      };
    }
    row.appendChild(btn);
    body.appendChild(row);
  });
  ui.openPanel('🛠️ CRAFT', body);
}

// ===================== TITLE / BOOTSTRAP =====================
document.getElementById('btn-missions').addEventListener('click', () => { sfx.uiClick(); openMissionLog(); });
document.getElementById('btn-craft').addEventListener('click', () => { sfx.uiClick(); openCraft(); });
ui.initPanelClose(() => { sfx.uiClick(); });

document.getElementById('btn-mute').addEventListener('click', (e) => {
  unlockAudio();
  const nowMuted = toggleMute();
  e.currentTarget.textContent = nowMuted ? '🔇' : '🔊';
});

function startPlaying(fromSave) {
  unlockAudio();
  if (fromSave) loadGame(); else resetState();
  applyUpgradeEffects();
  if (state.equippedSuitColor) player.setSuitColor(state.equippedSuitColor);
  player.setWeapon(state.equippedWeapon);
  ui.showTitleScreen(false);
  ui.showHUD(true);
  enterBase();
}

document.getElementById('btn-new-game').addEventListener('click', () => startPlaying(false));
document.getElementById('btn-continue').addEventListener('click', () => startPlaying(true));

// ===================== JOIN GAME (multiplayer) =====================
function openJoinPrompt() {
  const body = document.createElement('div');

  const hint = document.createElement('p');
  hint.style.cssText = 'color:#9ab;font-size:13px;padding:0 2px 4px;';
  hint.textContent = net.isConfigured()
    ? 'Enter a room code from a friend to play together, or make one up and share it with them.'
    : 'Multiplayer server not set up yet - see the comment at the top of js/net.js.';
  body.appendChild(hint);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:8px;';
  const codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.className = 'code-input';
  codeInput.placeholder = 'ROOM CODE';
  codeInput.autocomplete = 'off';
  codeInput.autocapitalize = 'off';
  codeInput.spellcheck = false;
  codeInput.disabled = !net.isConfigured();
  const joinBtn = document.createElement('button');
  joinBtn.className = 'code-submit';
  joinBtn.textContent = 'Join';
  joinBtn.disabled = !net.isConfigured();
  row.appendChild(codeInput);
  row.appendChild(joinBtn);
  body.appendChild(row);

  const feedback = document.createElement('p');
  feedback.style.cssText = 'font-size:13px; font-weight:700; min-height:16px; padding:2px;';
  body.appendChild(feedback);

  const tryJoin = () => {
    const code = codeInput.value.trim();
    if (!code) { feedback.textContent = 'Enter a room code first.'; feedback.style.color = '#ff5b5b'; return; }
    joinBtn.disabled = true;
    feedback.textContent = 'Connecting...';
    feedback.style.color = '#9ab';
    net.connect(code).then(() => {
      feedback.textContent = 'Connected!';
      feedback.style.color = '#7fff9e';
      sfx.win();
      ui.closePanel();
      startPlaying(hasSave());
    }).catch((err) => {
      joinBtn.disabled = false;
      feedback.textContent = err && err.message ? err.message : 'Could not connect.';
      feedback.style.color = '#ff5b5b';
      sfx.denied();
    });
  };
  joinBtn.onclick = tryJoin;
  codeInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') tryJoin();
  });
  codeInput.addEventListener('keyup', (e) => e.stopPropagation());

  ui.openPanel('🤝 JOIN GAME', body);
  if (net.isConfigured()) setTimeout(() => codeInput.focus(), 50);
}
document.getElementById('btn-join-game').addEventListener('click', () => { sfx.uiClick(); openJoinPrompt(); });

function boot() {
  document.getElementById('btn-mute').textContent = isMuted() ? '🔇' : '🔊';
  ui.showLoading(false);
  ui.setContinueEnabled(hasSave());
  ui.showTitleScreen(true);
  ui.showHUD(false);
  requestAnimationFrame(tick);
}
boot();
