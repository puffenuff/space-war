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

let spaceFlight = null;

let digTarget = null;
let digProgress = 0;
let repairHoldProgress = 0;

const clock = new THREE.Clock();
let elapsed = 0;
let saveTimer = 0;

// ===================== EFFECTS APPLICATION =====================
function applyUpgradeEffects() {
  state.maxHealth = 100 + state.upgrades.hull * 25;
  if (state.health > state.maxHealth) state.health = state.maxHealth;
  player.jumpPower = 8.4 + state.upgrades.jump * 2.0;
}

function speedMultiplier() { return 1 + state.upgrades.speed * 0.16; }
function gunDamage() { return 12 + state.upgrades.damage * 6; }

// ===================== GROUND HEIGHT =====================
function getGroundHeightCurrent(x, z) {
  if (mode === 'planet') {
    if (inCave) return activeBuild.caveOrigin.y;
    return activeBuild.groundHeightFn(x, z);
  }
  return 0;
}
player.getGroundHeight = (x, z) => getGroundHeightCurrent(x, z);

// ===================== FIRE HANDLING =====================
player.onFire = (origin, dir) => {
  if (mode !== 'planet') return;
  const list = inCave ? [] : activeBuild.enemies;
  const p = createProjectile(origin, dir, { color: 0x8dffb0, speed: 46, damage: gunDamage(), owner: 'player', life: 2.2 });
  activeScene.add(p);
  activeBuild.projectiles.push(p);
  sfx.shoot();
};
player.onJump = () => sfx.jump();

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
  build.vehicle = createRover(build.wreckPos, state.planets[id].vehicleRepaired);
  build.scene.add(build.vehicle);
  build.enemySpawns.forEach((spawn) => {
    const e = createGroundEnemy(spawn);
    build.scene.add(e);
    build.enemies.push(e);
  });
  if (build.lostRocket && build.lostRocketSurface) {
    for (let i = 0; i < 2; i++) {
      const gx = build.lostRocketSurface.x + (i === 0 ? 8 : -8);
      const gz = build.lostRocketSurface.z + 6;
      const spawn = { x: gx, y: build.groundHeightFn(gx, gz), z: gz };
      const guard = createGroundEnemy(spawn);
      guard.userData.hp = 55; guard.userData.maxHp = 55;
      build.scene.add(guard);
      build.enemies.push(guard);
    }
  }
  if (state.planets[id].lostRocketFound && build.lostRocket) {
    build.scene.remove(build.lostRocket);
    build.lostRocket = null;
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
}

function exitCave() {
  inCave = false;
  const build = activeBuild;
  const pos = caveReturnPos || build.spawnPoint;
  player.mesh.position.set(pos.x, build.groundHeightFn(pos.x, pos.z), pos.z + 2);
  player.heading = Math.PI;
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
    b.scrapPickups.forEach((m) => {
      if (m.userData.collected) return;
      if (pPos.distanceTo(m.position) < range) {
        m.userData.collected = true;
        m.visible = false;
        state.inventory.scrap += 1;
        sfx.scrap();
        progressCollect(currentPlanetId, missionToast);
        ui.showToast('+1 Scrap');
      }
    });
    b.coinPickups.forEach((m) => {
      if (m.userData.collected) return;
      if (pPos.distanceTo(m.position) < range) {
        m.userData.collected = true;
        m.visible = false;
        state.coins += m.userData.value;
        sfx.coin();
        ui.showToast(`+${m.userData.value} Coins`);
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
  } else {
    if (!b.chest.userData.collected && pPos.distanceTo(new THREE.Vector3(b.caveOrigin.x + b.chest.position.x, player.mesh.position.y, b.caveOrigin.z + b.chest.position.z)) < 1.8) {
      b.chest.userData.collected = true;
      state.coins += 45;
      state.inventory.tools += 1;
      sfx.partFound();
      ui.showToast('Cave Treasure! +45 Coins, +1 Tool');
    }
  }
}

function findNearestInteractable() {
  if (mode === 'base') {
    const cands = [...activeBuild.shops, activeBuild.padGroup, activeBuild.starMap];
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
    if (d.type === 'launchPad') return rocketReady() ? 'Assemble & Launch Rocket' : `Launch Pad (${rocketPartsCount()}/4 parts)`;
    if (d.type === 'starMap') return 'Open Star Map';
    if (d.type === 'vehicle') return 'Enter Rover';
  } else {
    const d = obj.userData;
    if (d.type === 'returnBeacon') return 'Return to Base';
    if (d.type === 'vehicle') return d.repaired ? 'Enter Rover' : `Hold to Repair (needs 2 Tools, have ${state.inventory.tools})`;
    if (d.type === 'digSite') return 'Hold to Dig';
    if (d.type === 'lostRocket') return state.planets[PLANET_COUNT].lostRocketFound ? 'Lost Rocket Ship (explored)' : 'Explore the Lost Rocket Ship!';
    if (d.type === 'caveExit') return 'Exit Cave';
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
  } else {
    if (d.type === 'returnBeacon') { enterBase(); return; }
    if (d.type === 'vehicle' && d.repaired) { enterVehicle(obj); return; }
    if (d.type === 'lostRocket') { exploreLostRocket(); return; }
    if (d.type === 'caveExit') { exitCave(); return; }
  }
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
    ui.showToast(`Need ${4 - rocketPartsCount()} more rocket part(s)! (${rocketPartsCount()}/4)`);
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
  } else if (kind === 'cave') {
    ui.showToast('You dug into a cave!');
    sfx.dig();
    enterCave(site);
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
function updateGroundCombat(dt) {
  const b = activeBuild;
  if (inCave) return;
  b.enemies.forEach((e) => {
    if (!e.userData.alive) {
      if (e.userData.respawnAt && elapsed >= e.userData.respawnAt) {
        e.userData.alive = true; e.userData.hp = e.userData.maxHp; e.userData.respawnAt = null;
        e.position.copy(e.userData.home);
        e.visible = true;
        b.scene.add(e);
      }
      return;
    }
    updateGroundEnemy(e, dt, player.mesh.position, (x, z) => getGroundHeightCurrent(x, z), (origin, dir) => {
      const p = createProjectile(origin, dir, { color: 0xff5050, speed: 20, damage: 8, owner: 'enemy', life: 2.5 });
      b.scene.add(p);
      b.enemyProjectiles.push(p);
      sfx.enemyShoot();
    });
  });

  updateProjectiles(b.projectiles, dt, b.scene);
  updateProjectiles(b.enemyProjectiles, dt, b.scene);
  updateExplosions(b.explosions, dt, b.scene);

  for (let i = b.projectiles.length - 1; i >= 0; i--) {
    const p = b.projectiles[i];
    let hit = false;
    for (const e of b.enemies) {
      if (!e.userData.alive) continue;
      if (p.position.distanceTo(e.position) < 1.5) {
        e.userData.hp -= p.userData.damage;
        b.scene.remove(p); b.projectiles.splice(i, 1); hit = true;
        if (e.userData.hp <= 0) {
          e.userData.alive = false;
          e.userData.respawnAt = elapsed + 25;
          b.explosions.push(createExplosion(b.scene, e.position, 0xffaa33));
          b.scene.remove(e);
          const coinGain = 8 + Math.floor(Math.random() * 10);
          state.coins += coinGain;
          sfx.explosion();
          progressKill(currentPlanetId, missionToast);
          ui.showToast(`Raider down! +${coinGain} Coins`);
        } else {
          sfx.hit();
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

function respawnPlayer() {
  state.coins = Math.max(0, Math.floor(state.coins * 0.9));
  state.health = Math.floor(state.maxHealth * 0.5);
  sfx.knockedOut();
  enterBase();
  ui.showToast('Knocked out! Rescued back to Base.');
}

// ===================== MAIN LOOP =====================
let lastInteractObj = null;
function tick() {
  requestAnimationFrame(tick);
  let dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;

  if (mode === 'title') { renderer.render(getEmptyScene(), camera); return; }

  updateControlsFrame();

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
    updateThirdPersonCamera(camera, drivingVehicle.position, dt, 10, 2.2);
    if (input.interactPressed) {
      exitVehicleIfAny();
      input.interactPressed = false; // consume now, or the interactable check below sees you standing next to the car and re-enters it in the same frame
    }
  } else {
    player.update(dt, speedMultiplier());
    updateThirdPersonCamera(camera, player.mesh.position, dt);
  }

  if (!ui.isPanelOpen()) {
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
    activeBuild.tick(dt, elapsed);
    ui.renderMissionTracker(activeMissions(currentPlanetId));
  } else if (mode === 'base') {
    activeBuild.tick(dt, elapsed);
    ui.renderMissionTracker([]);
  }

  ui.updateCoins(state.coins);
  ui.updateParts(rocketPartsCount());
  ui.updateHealth(state.health, state.maxHealth);
  ui.showCrosshair(mode === 'planet' && !drivingVehicle && !ui.isPanelOpen());

  saveTimer += dt;
  if (saveTimer > 12) { saveTimer = 0; saveGame(); }

  renderer.render(activeScene, camera);
  consumeOneShots();
}

let emptyScene = null;
function getEmptyScene() { if (!emptyScene) emptyScene = new THREE.Scene(); return emptyScene; }

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

// ===================== TITLE / BOOTSTRAP =====================
document.getElementById('btn-missions').addEventListener('click', () => { sfx.uiClick(); openMissionLog(); });
ui.initPanelClose(() => { sfx.uiClick(); });

document.getElementById('btn-mute').addEventListener('click', (e) => {
  unlockAudio();
  const nowMuted = toggleMute();
  e.currentTarget.textContent = nowMuted ? '🔇' : '🔊';
});

document.getElementById('btn-new-game').addEventListener('click', () => {
  unlockAudio();
  resetState();
  applyUpgradeEffects();
  ui.showTitleScreen(false);
  ui.showHUD(true);
  enterBase();
});
document.getElementById('btn-continue').addEventListener('click', () => {
  unlockAudio();
  loadGame();
  applyUpgradeEffects();
  ui.showTitleScreen(false);
  ui.showHUD(true);
  enterBase();
});

function boot() {
  document.getElementById('btn-mute').textContent = isMuted() ? '🔇' : '🔊';
  ui.showLoading(false);
  ui.setContinueEnabled(hasSave());
  ui.showTitleScreen(true);
  ui.showHUD(false);
  requestAnimationFrame(tick);
}
boot();
