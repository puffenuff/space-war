// ===================== STATIC GAME DATA =====================

// trimmed from 14 to 5 planets - each planet's progress is now fully independent (see
// state.js's per-planet progress swap), so 5 well-differentiated worlds you can freely
// pick between is a better fit than 14 requiring a full separate playthrough each
const PLANET_COUNT = 5;
const PLANET_ID_LIST = Array.from({ length: PLANET_COUNT }, (_, i) => i + 1);

const PLANETS = {
  1: {
    name: 'Rustholm', theme: 'desert',
    ground: 0xc06a3a, ground2: 0x8a4423, sky: 0xffb37a, fog: 0xd88a52,
    size: 4000, hills: 10, craters: 5,
    enemyCount: 5, dugSites: 4, wreckPos: [400, 0, -533], vehicleType: 'rover',
    partSpots: { noseCone: [-600, 0, 600] }, outfitColor: 0xd4622a, caveRadius: 225,
    secretRoom: true, secretRoomEnemyCount: 6, secretRoomBoss: 'sandTitan',
  },
  2: {
    name: 'Cryovale', theme: 'ice',
    ground: 0xbfe6f5, ground2: 0x89c3dd, sky: 0xdfefff, fog: 0xaad0e6,
    size: 4000, hills: 12, craters: 4,
    enemyCount: 14, dugSites: 4, wreckPos: [-500, 0, 400], vehicleType: 'crawler',
    partSpots: { fins: [-700, 0, -700] }, outfitColor: 0x9fe0f0, caveRadius: 270,
    secretRoom: true, secretRoomEnemyCount: 10, secretRoomBoss: 'yeti',
    enemySkin: 'miniYeti',
  },
  3: {
    name: 'Emberfall', theme: 'volcanic',
    ground: 0xff6a2e, ground2: 0x3a1a0e, sky: 0xff9a4d, fog: 0xcc4a1e,
    size: 4000, hills: 13, craters: 7,
    enemyCount: 10, dugSites: 5, wreckPos: [533, 0, -400], vehicleType: 'alien',
    partSpots: { fuelTank: [-633, 0, 500] }, outfitColor: 0xb82e18, caveRadius: 345,
    secretRoom: true, secretRoomEnemyCount: 8, secretRoomBoss: 'magmaBehemoth',
  },
  4: {
    name: 'Verdantia', theme: 'jungle',
    ground: 0x3a8f4a, ground2: 0x1e5a2a, sky: 0x9fe0a8, fog: 0x5fae6c,
    size: 4000, hills: 11, craters: 3,
    enemyCount: 11, dugSites: 5, wreckPos: [-600, 0, -333], vehicleType: 'buggy',
    partSpots: { engine: [700, 0, 433] }, outfitColor: 0x3f7a3a, caveRadius: 285,
    secretRoom: true, secretRoomEnemyCount: 9, secretRoomBoss: 'vineColossus',
  },
  5: {
    name: 'Xenar Prime', theme: 'alien',
    ground: 0x5b3a7a, ground2: 0x3c2456, sky: 0x2a1a44, fog: 0x4a2f6e,
    size: 4000, hills: 17, craters: 7,
    enemyCount: 24, dugSites: 6, wreckPos: [700, 0, 700], vehicleType: 'alien',
    partSpots: { noseCone: [-900, 0, -400] }, outfitColor: 0xd4af37, caveRadius: 550,
    lostRocketPos: [0, 0, -1733],
    secretRoom: true, secretRoomEnemyCount: 22, secretRoomBoss: 'xenarOverlord',
  },
};

// ===================== RAW MATERIALS (Planet-Crafter-style resource chests) =====================
// 17 named materials instead of one generic "ore" - rarer ones are worth chasing down and
// glow brighter in their chest, and atmosphere missions/base modules ask for specific ones
// instead of an undifferentiated pile.
const MATERIALS = [
  { key: 'iron', name: 'Iron', color: 0x9c6b4a, rarity: 'common' },
  { key: 'silicon', name: 'Silicon', color: 0x6a7a8a, rarity: 'common' },
  { key: 'aluminum', name: 'Aluminum', color: 0xc8ccd4, rarity: 'common' },
  { key: 'ice', name: 'Ice', color: 0xbfe9ff, rarity: 'common' },
  { key: 'magnesium', name: 'Magnesium', color: 0xe8e4d8, rarity: 'common' },
  { key: 'sulfur', name: 'Sulfur', color: 0xe8d54a, rarity: 'common' },
  { key: 'cobalt', name: 'Cobalt', color: 0x3a5fae, rarity: 'uncommon' },
  { key: 'titanium', name: 'Titanium', color: 0x9aa5b0, rarity: 'uncommon' },
  { key: 'zeolite', name: 'Zeolite', color: 0xd9b98a, rarity: 'uncommon' },
  { key: 'phosphorus', name: 'Phosphorus', color: 0xd0ff6a, rarity: 'uncommon' },
  { key: 'obsidian', name: 'Obsidian', color: 0x1c1620, rarity: 'uncommon' },
  { key: 'selenium', name: 'Selenium', color: 0xc23a5a, rarity: 'uncommon' },
  { key: 'tungsten', name: 'Tungsten', color: 0x5a5a62, rarity: 'rare' },
  { key: 'iridium', name: 'Iridium', color: 0xe6ecf5, rarity: 'rare' },
  { key: 'uranium', name: 'Uranium', color: 0x8aff5a, rarity: 'rare' },
  { key: 'osmium', name: 'Osmium', color: 0x4a7a8a, rarity: 'rare' },
  { key: 'superAlloy', name: 'Super Alloy', color: 0xffd35e, rarity: 'rare' },
];
const MATERIAL_ORDER = MATERIALS.map((m) => m.key);
const MATERIAL_BY_KEY = {};
MATERIALS.forEach((m) => { MATERIAL_BY_KEY[m.key] = m; });
const MATERIAL_RARITY_WEIGHT = { common: 5, uncommon: 3, rare: 1 };

// deterministic weighted pick - callers pass the planet's seeded rand() so chest contents
// stay consistent across reloads and across every client in a multiplayer room
function pickMaterial(rand) {
  const total = MATERIALS.reduce((sum, m) => sum + MATERIAL_RARITY_WEIGHT[m.rarity], 0);
  let r = rand() * total;
  for (const m of MATERIALS) {
    r -= MATERIAL_RARITY_WEIGHT[m.rarity];
    if (r <= 0) return m;
  }
  return MATERIALS[MATERIALS.length - 1];
}

// Missions per planet. type: 'kill' | 'collect' | 'repair' | 'dig' | 'partpickup' | 'lostrocket'
const MISSIONS = {
  1: [
    { id: 'p1m1', name: 'Clear the Raiders', desc: 'Defeat 3 raiders roaming Rustholm.', type: 'kill', target: 3, reward: { coins: 35 } },
    { id: 'p1m2', name: 'Salvage Run', desc: 'Collect 5 salvage metal from the surface.', type: 'collect', item: 'salvage', target: 5, reward: { coins: 25, tools: 1 } },
    { id: 'p1m3', name: 'Rover Recovery', desc: 'Find and repair the abandoned rover.', type: 'repair', reward: { coins: 20, rocketPart: 'fins' } },
    { id: 'p1m4', name: 'Dig for the Engine', desc: 'Search the dig sites for a buried Engine part.', type: 'dig', reward: { rocketPart: 'engine' } },
    { id: 'p1m5', name: 'Cone Retrieval', desc: 'Retrieve the Nose Cone from the far dunes.', type: 'partpickup', part: 'noseCone', reward: { coins: 15 } },
    { id: 'p1m6', name: 'Raider Bounty', desc: 'Defeat 6 raiders total across Rustholm.', type: 'kill', target: 6, reward: { coins: 55 } },
    { id: 'p1m7', name: 'Deep Salvage Run', desc: 'Collect 10 salvage metal in total.', type: 'collect', item: 'salvage', target: 10, reward: { coins: 45, tools: 1 } },
    { id: 'p1m8', name: 'Rustholm Cleanup', desc: 'Defeat 10 raiders total.', type: 'kill', target: 10, reward: { coins: 70 } },
    { id: 'p1m9', name: 'Dune Scavenging', desc: 'Collect 16 salvage in total.', type: 'collect', item: 'salvage', target: 16, reward: { coins: 60, tools: 2 } },
    { id: 'p1m10', name: 'Make Rustholm Inhabitable', desc: 'Find the blueprint microchip in the crashed shuttle and gather 9 Iron and 8 Silicon from chests around the surface and cave to seed a breathable atmosphere.', type: 'atmosphere', materialTargets: { iron: 9, silicon: 8 }, reward: { coins: 170, tools: 2 } },
  ],
  2: [
    { id: 'p2m1', name: 'Frost Raiders', desc: 'Defeat 5 raiders on the ice fields.', type: 'kill', target: 5, reward: { coins: 45 } },
    { id: 'p2m2', name: 'Ice Core Samples', desc: 'Collect 6 salvage from frozen wreckage.', type: 'collect', item: 'salvage', target: 6, reward: { coins: 30, tools: 1 } },
    { id: 'p2m3', name: 'Snow Crawler Recovery', desc: 'Find and repair the buried rover.', type: 'repair', reward: { coins: 25, rocketPart: 'noseCone' } },
    { id: 'p2m4', name: 'Buried Fuel Tank', desc: 'Dig up the Fuel Tank hidden under the ice.', type: 'dig', reward: { rocketPart: 'fuelTank' } },
    { id: 'p2m5', name: 'Fin Salvage', desc: 'Retrieve the Fins from the crash site.', type: 'partpickup', part: 'fins', reward: { coins: 20 } },
    { id: 'p2m6', name: 'Blizzard Bounty', desc: 'Defeat 9 raiders total on the ice fields.', type: 'kill', target: 9, reward: { coins: 65 } },
    { id: 'p2m7', name: 'Frozen Depths Salvage', desc: 'Collect 12 salvage in total.', type: 'collect', item: 'salvage', target: 12, reward: { coins: 55, tools: 1 } },
    { id: 'p2m8', name: 'Glacier Cleanup', desc: 'Defeat 14 raiders total.', type: 'kill', target: 14, reward: { coins: 85 } },
    { id: 'p2m9', name: 'Permafrost Scavenging', desc: 'Collect 18 salvage in total.', type: 'collect', item: 'salvage', target: 18, reward: { coins: 75, tools: 2 } },
    { id: 'p2m10', name: 'Make Cryovale Inhabitable', desc: 'Find the blueprint microchip in the crashed shuttle and gather 10 Ice and 9 Osmium from chests around the surface and cave to seed a breathable atmosphere.', type: 'atmosphere', materialTargets: { ice: 10, osmium: 9 }, reward: { coins: 190, tools: 2 } },
  ],
  3: [
    { id: 'p3m1', name: 'Ember Raiders', desc: 'Defeat 8 raiders in the lava fields of Emberfall.', type: 'kill', target: 8, reward: { coins: 55 } },
    { id: 'p3m2', name: 'Obsidian Salvage', desc: 'Collect 9 salvage from the cooled lava flats.', type: 'collect', item: 'salvage', target: 9, reward: { coins: 35, tools: 1 } },
    { id: 'p3m3', name: 'Magma Crawler Recovery', desc: 'Find and repair the scorched rover.', type: 'repair', reward: { coins: 30, rocketPart: 'noseCone' } },
    { id: 'p3m4', name: 'Dig for the Engine', desc: 'Search dig sites near the volcano for an Engine part.', type: 'dig', reward: { rocketPart: 'engine' } },
    { id: 'p3m5', name: 'Fuel Tank Salvage', desc: 'Retrieve the Fuel Tank from the ash dunes.', type: 'partpickup', part: 'fuelTank', reward: { coins: 25 } },
    { id: 'p3m6', name: 'Cinder Bounty', desc: 'Defeat 14 raiders total in the lava fields.', type: 'kill', target: 14, reward: { coins: 75 } },
    { id: 'p3m7', name: 'Ash Flat Salvage Run', desc: 'Collect 16 salvage in total.', type: 'collect', item: 'salvage', target: 16, reward: { coins: 65, tools: 2 } },
    { id: 'p3m8', name: 'Emberfall Cleanup', desc: 'Defeat 20 raiders total.', type: 'kill', target: 20, reward: { coins: 100 } },
    { id: 'p3m9', name: 'Cinder Scavenging', desc: 'Collect 24 salvage in total.', type: 'collect', item: 'salvage', target: 24, reward: { coins: 90, tools: 3 } },
    { id: 'p3m10', name: 'Make Emberfall Inhabitable', desc: 'Find the blueprint microchip in the crashed shuttle and gather 11 Sulfur and 10 Obsidian from chests around the surface and cave to seed a breathable atmosphere.', type: 'atmosphere', materialTargets: { sulfur: 11, obsidian: 10 }, reward: { coins: 210, tools: 2 } },
  ],
  4: [
    { id: 'p4m1', name: 'Jungle Ambush', desc: 'Defeat 9 raiders hiding in the Verdantia canopy.', type: 'kill', target: 9, reward: { coins: 65 } },
    { id: 'p4m2', name: 'Vine Salvage', desc: 'Collect 10 salvage tangled in the undergrowth.', type: 'collect', item: 'salvage', target: 10, reward: { coins: 40, tools: 1 } },
    { id: 'p4m3', name: 'Overgrown Crawler Recovery', desc: 'Find and repair the vine-covered rover.', type: 'repair', reward: { coins: 35, rocketPart: 'fuelTank' } },
    { id: 'p4m4', name: 'Dig for the Fins', desc: 'Search dig sites under the jungle floor for Fins.', type: 'dig', reward: { rocketPart: 'fins' } },
    { id: 'p4m5', name: 'Engine Salvage', desc: 'Retrieve the Engine from the ruined canopy platform.', type: 'partpickup', part: 'engine', reward: { coins: 30 } },
    { id: 'p4m6', name: 'Canopy Bounty', desc: 'Defeat 16 raiders total in the jungle.', type: 'kill', target: 16, reward: { coins: 85 } },
    { id: 'p4m7', name: 'Undergrowth Salvage Run', desc: 'Collect 18 salvage in total.', type: 'collect', item: 'salvage', target: 18, reward: { coins: 75, tools: 2 } },
    { id: 'p4m8', name: 'Verdantia Cleanup', desc: 'Defeat 24 raiders total.', type: 'kill', target: 24, reward: { coins: 115 } },
    { id: 'p4m9', name: 'Deep Canopy Scavenging', desc: 'Collect 27 salvage in total.', type: 'collect', item: 'salvage', target: 27, reward: { coins: 105, tools: 3 } },
    { id: 'p4m10', name: 'Make Verdantia Inhabitable', desc: 'Find the blueprint microchip in the crashed shuttle and gather 12 Phosphorus and 11 Magnesium from chests around the surface and cave to seed a breathable atmosphere.', type: 'atmosphere', materialTargets: { phosphorus: 12, magnesium: 11 }, reward: { coins: 230, tools: 3 } },
  ],
  5: [
    { id: 'p5m1', name: 'Xenar Defense', desc: 'Defeat 23 alien raiders.', type: 'kill', target: 23, reward: { coins: 170 } },
    { id: 'p5m2', name: 'Crystal Salvage', desc: 'Collect 24 salvage crystals.', type: 'collect', item: 'salvage', target: 24, reward: { coins: 95, tools: 5 } },
    { id: 'p5m3', name: 'Alien Crawler Recovery', desc: 'Find and repair the strange rover.', type: 'repair', reward: { coins: 90, rocketPart: 'engine' } },
    { id: 'p5m4', name: 'Dig for the Fuel Cell', desc: 'Search dig sites for a Fuel Tank part.', type: 'dig', reward: { rocketPart: 'fuelTank' } },
    { id: 'p5m5', name: 'Cone Salvage', desc: 'Retrieve the Nose Cone from the alien ruins.', type: 'partpickup', part: 'noseCone', reward: { coins: 80 } },
    { id: 'p5m6', name: 'The Lost Rocket', desc: 'Find the ancient lost rocket ship deep on Xenar Prime.', type: 'lostrocket', reward: { coins: 250 } },
    { id: 'p5m7', name: 'Xenar Final Bounty', desc: 'Defeat 40 alien raiders total.', type: 'kill', target: 40, reward: { coins: 200 } },
    { id: 'p5m8', name: 'Last Crystal Salvage Run', desc: 'Collect 42 salvage crystals in total.', type: 'collect', item: 'salvage', target: 42, reward: { coins: 190, tools: 5 } },
    { id: 'p5m9', name: 'Xenar Prime Cleanup', desc: 'Defeat 58 alien raiders total.', type: 'kill', target: 58, reward: { coins: 280 } },
    { id: 'p5m10', name: 'Final Deep Scavenging', desc: 'Collect 60 salvage crystals in total.', type: 'collect', item: 'salvage', target: 60, reward: { coins: 270, tools: 6 } },
    { id: 'p5m11', name: 'Make Xenar Prime Inhabitable', desc: 'Find the blueprint microchip in the crashed shuttle and gather 22 Super Alloy and 21 Iridium from chests around the surface and cave to seed a breathable atmosphere.', type: 'atmosphere', materialTargets: { superAlloy: 22, iridium: 21 }, reward: { coins: 430, tools: 6 } },
  ],
};

const WEAPONS = {
  pistol: { key: 'pistol', name: 'Pistol', desc: 'Reliable sidearm. Standard issue.', cost: 0, damage: 16, cooldown: 0.32, speed: 44, color: 0x8dffb0, pellets: 1, spread: 0, magSize: 8, reloadTime: 1.0 },
  smg: { key: 'smg', name: 'SMG', desc: 'Fast-firing, lower damage per shot.', cost: 140, damage: 9, cooldown: 0.1, speed: 46, color: 0xffe45e, pellets: 1, spread: 0.05, magSize: 24, reloadTime: 1.4 },
  shotgun: { key: 'shotgun', name: 'Shotgun', desc: 'Devastating up close, wide spread of pellets.', cost: 220, damage: 9, cooldown: 0.7, speed: 40, color: 0xff8a3d, pellets: 6, spread: 0.16, magSize: 6, reloadTime: 1.8 },
  assaultRifle: { key: 'assaultRifle', name: 'Assault Rifle', desc: 'Balanced automatic fire.', cost: 300, damage: 15, cooldown: 0.15, speed: 50, color: 0x5ecbff, pellets: 1, spread: 0.03, magSize: 30, reloadTime: 1.6 },
  lmg: { key: 'lmg', name: 'LMG', desc: 'Heavy suppressive fire with a big drum mag.', cost: 380, damage: 13, cooldown: 0.08, speed: 48, color: 0xff5a5a, pellets: 1, spread: 0.06, magSize: 60, reloadTime: 2.4 },
  sniper: { key: 'sniper', name: 'Sniper Rifle', desc: 'Slow, devastating precision shots.', cost: 460, damage: 75, cooldown: 1.15, speed: 80, color: 0xd85eff, pellets: 1, spread: 0, magSize: 5, reloadTime: 2.0 },
};
const WEAPON_ORDER = ['pistol', 'smg', 'shotgun', 'assaultRifle', 'lmg', 'sniper'];

const CHEAT_CODES = {
  allcoins: { label: 'ALLCOINS', desc: 'Fills your pockets with coins.', reward: 'coins', amount: 3000 },
  // every planet is already freely travelable, so ALLWORLDS was repurposed - a stack of
  // every named material instead, since that's the currency that actually gates things now
  allmaterials: { label: 'ALLMATERIALS', desc: 'Fills your stockpile with every material.', reward: 'materials', amount: 50 },
};

// ===================== BASE MODULES (Craft menu - Space Crafter style base building) =====================
// One-time builds that permanently expand the base's life support, paid for with materials/tools
// gathered out in the field. Each built module adds a small permanent max-health bonus, so the
// crafting loop feeds back into survivability instead of just being a checklist. requiresTerraformed
// gates a module behind having fully terraformed that many planets (via the Terraform Computer) -
// the more terraforming you've done, the more there is to build.
const BASE_MODULES = [
  // gear-unlock modules: build one of these to unlock the matching GEAR menu item on this planet
  { key: 'wardrobeRack', name: 'Wardrobe Rack', desc: 'Store and change into suits you\'ve found.', cost: { aluminum: 6, iron: 4 }, healthBonus: 0, requiresTerraformed: 0, unlocksGear: 'wardrobe' },
  { key: 'weaponsLocker', name: 'Weapons Locker', desc: 'Secure storage for blasters and ammo.', cost: { titanium: 6, iron: 6 }, healthBonus: 0, requiresTerraformed: 0, unlocksGear: 'weapons' },
  { key: 'upgradeBench', name: 'Upgrade Bench', desc: "Tune your suit's thrusters, coils, and plating.", cost: { cobalt: 6, silicon: 6, tools: 4 }, healthBonus: 0, requiresTerraformed: 0, unlocksGear: 'upgrades' },
  { key: 'supplyTerminal', name: 'Supply Terminal', desc: 'Order parts, tools, and food with coins.', cost: { aluminum: 8, magnesium: 6 }, healthBonus: 0, requiresTerraformed: 0, unlocksGear: 'shop' },
  { key: 'commsTerminal', name: 'Comms Terminal', desc: 'Redeem transmission codes from home.', cost: { silicon: 8, zeolite: 4 }, healthBonus: 0, requiresTerraformed: 0, unlocksGear: 'codes' },
  { key: 'terraformComputer', name: 'Terraform Computer', desc: "Track and drive this world's terraforming.", cost: { iron: 10, silicon: 8, tools: 6 }, healthBonus: 0, requiresTerraformed: 0, unlocksGear: 'terraform' },
  // health-bonus modules: build these purely to raise max health, no GEAR unlock attached
  { key: 'solarArray', name: 'Solar Array', desc: 'Clean power for the whole base.', cost: { silicon: 12, aluminum: 8 }, healthBonus: 10, requiresTerraformed: 0 },
  { key: 'waterReclaimer', name: 'Water Reclaimer', desc: 'Recycles water for life support.', cost: { ice: 10, zeolite: 5, tools: 6 }, healthBonus: 10, requiresTerraformed: 0 },
  { key: 'greenhouseDome', name: 'Greenhouse Dome', desc: 'Grows food to keep the crew fed.', cost: { phosphorus: 10, magnesium: 10 }, healthBonus: 10, requiresTerraformed: 1 },
  { key: 'commsArray', name: 'Comms Array', desc: 'Long-range antenna for contacting other worlds.', cost: { titanium: 8, cobalt: 6, tools: 8 }, healthBonus: 10, requiresTerraformed: 2 },
  { key: 'medBay', name: 'Med Bay', desc: 'A full medical suite for emergencies.', cost: { selenium: 6, sulfur: 8, iron: 6, tools: 6 }, healthBonus: 15, requiresTerraformed: 3 },
  { key: 'shieldGenerator', name: 'Shield Generator', desc: 'Deflects debris and raiders alike.', cost: { tungsten: 6, osmium: 5, superAlloy: 3 }, healthBonus: 15, requiresTerraformed: 5 },
];

// ===================== SECRET VAULT BOSSES (one per planet, except Cryovale's bespoke yeti) =====================
// Every boss shares the same jointed humanoid rig (see createBossEnemy in enemies.js) and is driven
// by a data-defined moveset instead of custom code - only colors, a decoration kit, and the specific
// combination/ranges/damage of moves differ per planet. Difficulty escalates with planet number.
const BOSSES = {
  sandTitan: {
    key: 'sandTitan', name: 'SAND TITAN',
    bodyColor: 0xc9975a, darkColor: 0x7a4d24, accentColor: 0xffcf6a, eyeColor: 0xff3b3b,
    decoration: 'spikes', scale: 1.3, chaseSpeed: 3.4, hitRadius: 3.2, hp: 400,
    moveset: {
      melee: { type: 'melee', range: 4.0, damage: 28, windup: 0.5, active: 0.2, recover: 0.2, knockback: 1.6, sfxKey: 'yetiPunch' },
      specialA: { type: 'aoe', name: 'Sand Slam', maxRange: 11, minRange: 0, radius: 8, damage: 30, windup: 0.75, active: 0.3, recover: 0.3, hitDelay: 0.1, knockback: 4, sfxKey: 'yetiSlam', particleColor: 0xffcf6a, cooldownMin: 3.5, cooldownVar: 1.5 },
    },
  },
  magmaBehemoth: {
    key: 'magmaBehemoth', name: 'MAGMA BEHEMOTH',
    bodyColor: 0x3a2a24, darkColor: 0x1c1410, accentColor: 0xff5a1e, eyeColor: 0xffaa33,
    decoration: 'crystals', scale: 1.32, chaseSpeed: 3.6, hitRadius: 3.3, hp: 440,
    moveset: {
      melee: { type: 'melee', range: 4.1, damage: 29, windup: 0.5, active: 0.2, recover: 0.2, knockback: 1.7, sfxKey: 'yetiPunch' },
      specialA: { type: 'aoe', name: 'Magma Slam', maxRange: 12, radius: 8.5, damage: 32, windup: 0.75, active: 0.3, recover: 0.3, hitDelay: 0.1, knockback: 4.2, sfxKey: 'yetiSlam', particleColor: 0xff5a1e, cooldownMin: 3.2, cooldownVar: 1.3 },
      specialB: { type: 'projectile', name: 'Lava Lob', maxRange: 40, minRange: 6, count: 3, spread: 0.18, projSpeed: 22, damage: 13, windup: 0.55, active: 0.4, recover: 0.35, hitDelay: 0.15, particleColor: 0xff6a2a, cooldownMin: 4, cooldownVar: 1.5 },
    },
  },
  vineColossus: {
    key: 'vineColossus', name: 'VINE COLOSSUS',
    bodyColor: 0x4a6b3a, darkColor: 0x2a4020, accentColor: 0x8aff4a, eyeColor: 0xffee55,
    decoration: 'tentacles', scale: 1.3, chaseSpeed: 3.8, hitRadius: 3.2, hp: 470,
    moveset: {
      melee: { type: 'melee', range: 4.0, damage: 29, windup: 0.5, active: 0.2, recover: 0.2, knockback: 1.6, sfxKey: 'yetiPunch' },
      specialA: { type: 'dash', name: 'Vine Lunge', maxRange: 40, minRange: 6, speed: 17, damage: 40, windup: 0.55, active: 0.5, recover: 0.3, hitRange: 4.2, knockback: 5, sfxKey: 'yetiChargeHit', cooldownMin: 3.5, cooldownVar: 1.3 },
      specialB: { type: 'aoe', name: 'Root Slam', maxRange: 12, radius: 8, damage: 32, windup: 0.75, active: 0.3, recover: 0.3, hitDelay: 0.1, knockback: 4, sfxKey: 'yetiSlam', particleColor: 0x8aff4a, cooldownMin: 4, cooldownVar: 1.5 },
    },
  },
  xenarOverlord: {
    key: 'xenarOverlord', name: 'XENAR OVERLORD',
    bodyColor: 0x2a1a3a, darkColor: 0x140d1e, accentColor: 0xd4af37, eyeColor: 0xd4af37,
    decoration: 'antennae', scale: 1.4, chaseSpeed: 4.4, hitRadius: 3.7, hp: 900,
    moveset: {
      melee: { type: 'melee', range: 4.6, damage: 45, windup: 0.4, active: 0.16, recover: 0.14, knockback: 2.3, sfxKey: 'yetiPunch' },
      specialA: { type: 'aoe', name: 'Void Slam', maxRange: 14, radius: 10.5, damage: 46, windup: 0.6, active: 0.26, recover: 0.22, hitDelay: 0.1, knockback: 5.8, sfxKey: 'yetiSlam', particleColor: 0xd4af37, cooldownMin: 2.5, cooldownVar: 1 },
      specialB: { type: 'dash', name: 'Warp Charge', maxRange: 50, minRange: 7, speed: 22, damage: 58, windup: 0.45, active: 0.5, recover: 0.24, hitRange: 4.6, knockback: 7, sfxKey: 'yetiChargeHit', cooldownMin: 2.8, cooldownVar: 1.1 },
    },
  },
};

const SHOP_ITEMS = {
  parts: [
    // prices raised well past "grind a bit and buy it" - earning parts through missions/digging/
    // the vault is meant to be the real path, this is just an expensive last resort
    { key: 'engine', name: 'Rocket Engine', desc: 'Buy the engine outright.', cost: 320, type: 'rocketPart' },
    { key: 'fuelTank', name: 'Fuel Tank', desc: 'Buy the fuel tank outright.', cost: 290, type: 'rocketPart' },
    { key: 'noseCone', name: 'Nose Cone', desc: 'Buy the nose cone outright.', cost: 260, type: 'rocketPart' },
    { key: 'fins', name: 'Rocket Fins', desc: 'Buy the fins outright.', cost: 230, type: 'rocketPart' },
  ],
  tools: [
    { key: 'tools', name: 'Repair Tool', desc: 'Needed to repair vehicles.', cost: 12, type: 'inventory' },
  ],
  food: [
    { key: 'food', name: 'Ration Pack', desc: 'Eat now to restore 40 health.', cost: 10, type: 'heal', amount: 40 },
    { key: 'feast', name: 'Big Feast', desc: 'Eat now to fully restore health.', cost: 22, type: 'heal', amount: 999 },
  ],
};

// ===================== TERRAFORMING (oxygen / heat / pressure) =====================
// Each of the 17 materials feeds exactly one of these three meters at a planet's Terraform
// Station - depositing units raises that meter until all three hit 100 and the planet is
// terraformed. Deliberately separate from the atmosphere mission (which just needs the
// blueprint chip + 2 specific materials) - this is an ongoing use for everything else you mine.
const TERRAFORM_GROUPS = {
  oxygen: ['ice', 'phosphorus', 'zeolite', 'magnesium', 'selenium', 'aluminum'],
  heat: ['sulfur', 'uranium', 'obsidian', 'cobalt', 'osmium', 'tungsten'],
  pressure: ['iron', 'silicon', 'titanium', 'iridium', 'superAlloy'],
};
const TERRAFORM_METER_PER_UNIT = 4; // 25 units of any mix within a group fills that meter
function terraformGroupOf(materialKey) {
  return Object.keys(TERRAFORM_GROUPS).find((g) => TERRAFORM_GROUPS[g].includes(materialKey));
}

// ===================== TECH TREE =====================
// Spend materials (and occasionally tools) instead of coins to unlock permanent
// gameplay effects. requires: [] means available from the start; otherwise every listed
// key must already be unlocked first.
const TECH_TREE = [
  { key: 'sturdyPickaxe', name: 'Sturdy Pickaxe', desc: 'A reinforced head breaks deposits apart faster.', requires: [], cost: { iron: 14 }, effect: 'Mining hold time -33%' },
  { key: 'deepScanner', name: 'Deep Scanner', desc: 'Read the ground for a wider reach while mining.', requires: ['sturdyPickaxe'], cost: { silicon: 12, iridium: 5 }, effect: '+1 mining interact range' },
  { key: 'atmosphericProcessor', name: 'Atmospheric Processor', desc: 'Doubles how much every deposited material raises its terraform meter.', requires: [], cost: { zeolite: 10, phosphorus: 8 }, effect: 'Terraform deposits x2 effective' },
  { key: 'extractorMk1', name: 'Extractor Mk1', desc: 'Unlocks building an automated Resource Extractor at each Terraform Station.', requires: [], cost: { titanium: 10, cobalt: 8 }, effect: 'Unlocks Resource Extractors' },
  { key: 'extractorMk2', name: 'Extractor Mk2', desc: 'A faster drivetrain - extractors generate material twice as fast.', requires: ['extractorMk1'], cost: { tungsten: 8, osmium: 6 }, effect: 'Extractor rate x2' },
  { key: 'cargoExpansion', name: 'Cargo Expansion', desc: 'A bigger hopper - extractors stockpile much more before they need collecting.', requires: ['extractorMk1'], cost: { aluminum: 12, magnesium: 10 }, effect: 'Extractor stockpile cap x2' },
  { key: 'superAlloyForge', name: 'Super Alloy Forge', desc: "A capstone project - reinforces Billy Bob's suit permanently.", requires: ['extractorMk2', 'atmosphericProcessor'], cost: { superAlloy: 5, uranium: 5 }, effect: '+20 max health' },
];
