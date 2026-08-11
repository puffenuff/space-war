// ===================== STATIC GAME DATA =====================

const PLANET_COUNT = 14;
const PLANET_ID_LIST = Array.from({ length: PLANET_COUNT }, (_, i) => i + 1);

const PLANETS = {
  1: {
    name: 'Rustholm', theme: 'desert',
    ground: 0xc06a3a, ground2: 0x8a4423, sky: 0xffb37a, fog: 0xd88a52,
    size: 600, hills: 10, craters: 5,
    enemyCount: 5, dugSites: 4, wreckPos: [60, 0, -80], vehicleType: 'rover',
    partSpots: { noseCone: [-90, 0, 90] }, outfitColor: 0xd4622a, caveRadius: 225,
    secretRoom: true,
  },
  2: {
    name: 'Cryovale', theme: 'ice',
    ground: 0xbfe6f5, ground2: 0x89c3dd, sky: 0xdfefff, fog: 0xaad0e6,
    size: 600, hills: 12, craters: 4,
    enemyCount: 7, dugSites: 4, wreckPos: [-75, 0, 60], vehicleType: 'crawler',
    partSpots: { fins: [-105, 0, -105] }, outfitColor: 0x9fe0f0, caveRadius: 270,
    secretRoom: true, secretRoomEnemyCount: 5, secretRoomBoss: 'yeti',
  },
  3: {
    name: 'Emberfall', theme: 'volcanic',
    ground: 0xff6a2e, ground2: 0x3a1a0e, sky: 0xff9a4d, fog: 0xcc4a1e,
    size: 600, hills: 13, craters: 7,
    enemyCount: 10, dugSites: 5, wreckPos: [80, 0, -60], vehicleType: 'alien',
    partSpots: { fuelTank: [-95, 0, 75] }, outfitColor: 0xb82e18, caveRadius: 345,
  },
  4: {
    name: 'Verdantia', theme: 'jungle',
    ground: 0x3a8f4a, ground2: 0x1e5a2a, sky: 0x9fe0a8, fog: 0x5fae6c,
    size: 600, hills: 11, craters: 3,
    enemyCount: 11, dugSites: 5, wreckPos: [-90, 0, -50], vehicleType: 'buggy',
    partSpots: { engine: [105, 0, 65] }, outfitColor: 0x3f7a3a, caveRadius: 285,
  },
  5: {
    name: 'Duskmoor', theme: 'swamp',
    ground: 0x6a7a3a, ground2: 0x3a4a1e, sky: 0x8a9a6a, fog: 0x5a6a3a,
    size: 600, hills: 9, craters: 3,
    enemyCount: 12, dugSites: 6, wreckPos: [65, 0, 90], vehicleType: 'buggy',
    partSpots: { fuelTank: [-110, 0, -80] }, outfitColor: 0x5a4a7a, caveRadius: 360,
  },
  6: {
    name: 'Ashcrag', theme: 'canyon',
    ground: 0x9a7a5a, ground2: 0x5a4232, sky: 0xd9b98a, fog: 0xaa8a6a,
    size: 600, hills: 18, craters: 6,
    enemyCount: 13, dugSites: 6, wreckPos: [-105, 0, 80], vehicleType: 'rover',
    partSpots: { noseCone: [120, 0, -90] }, outfitColor: 0xb08a5a, caveRadius: 390,
  },
  7: {
    name: 'Neonspire', theme: 'crystal',
    ground: 0x3a2a5a, ground2: 0x1a0e33, sky: 0xff5ecb, fog: 0x6a3a9a,
    size: 600, hills: 12, craters: 4,
    enemyCount: 14, dugSites: 6, wreckPos: [95, 0, -105], vehicleType: 'alien',
    partSpots: { fins: [-125, 0, 60] }, outfitColor: 0xd63aff, caveRadius: 330,
  },
  8: {
    name: 'Stormreach', theme: 'storm',
    ground: 0x4a5a6a, ground2: 0x2a3542, sky: 0x7a8aa0, fog: 0x5a6a7a,
    size: 600, hills: 16, craters: 4,
    enemyCount: 15, dugSites: 6, wreckPos: [-120, 0, -95], vehicleType: 'crawler',
    partSpots: { engine: [135, 0, 75] }, outfitColor: 0x4a7ab8, caveRadius: 405,
  },
  9: {
    name: 'Lunaris', theme: 'lunar',
    ground: 0x9a9aa2, ground2: 0x55555c, sky: 0x141425, fog: 0x33334a,
    size: 600, hills: 14, craters: 9,
    enemyCount: 16, dugSites: 6, wreckPos: [110, 0, -85], vehicleType: 'crawler',
    partSpots: { fins: [-130, 0, 100] }, outfitColor: 0xc0c0d0, caveRadius: 415,
  },
  10: {
    name: 'Coralis', theme: 'reef',
    ground: 0xff6fa0, ground2: 0x2ab5a0, sky: 0x8fe0ff, fog: 0x5fc9d8,
    size: 600, hills: 8, craters: 2,
    enemyCount: 17, dugSites: 6, wreckPos: [-95, 0, -120], vehicleType: 'buggy',
    partSpots: { engine: [140, 0, -50] }, outfitColor: 0xff6fa0, caveRadius: 435,
  },
  11: {
    name: 'Cindergate', theme: 'ashlands',
    ground: 0x6a6258, ground2: 0x3a352e, sky: 0x8a7d6a, fog: 0x5a5248,
    size: 600, hills: 15, craters: 8,
    enemyCount: 18, dugSites: 6, wreckPos: [100, 0, 120], vehicleType: 'rover',
    partSpots: { fuelTank: [-145, 0, -65] }, outfitColor: 0x8a7a6a, caveRadius: 455,
  },
  12: {
    name: 'Bloodmere', theme: 'crimson',
    ground: 0x8a1f1f, ground2: 0x4a0f0f, sky: 0xcc4a3a, fog: 0x992e2e,
    size: 600, hills: 13, craters: 5,
    enemyCount: 19, dugSites: 6, wreckPos: [-120, 0, 100], vehicleType: 'alien',
    partSpots: { noseCone: [150, 0, 70] }, outfitColor: 0xcc2222, caveRadius: 475,
  },
  13: {
    name: 'Toxara', theme: 'toxic',
    ground: 0x6aff4a, ground2: 0x2a5a1a, sky: 0x9aff6a, fog: 0x4a8a2a,
    size: 600, hills: 10, craters: 4,
    enemyCount: 20, dugSites: 6, wreckPos: [130, 0, -110], vehicleType: 'crawler',
    partSpots: { engine: [-140, 0, 110] }, outfitColor: 0x8aff4a, caveRadius: 495,
  },
  14: {
    name: 'Xenar Prime', theme: 'alien',
    ground: 0x5b3a7a, ground2: 0x3c2456, sky: 0x2a1a44, fog: 0x4a2f6e,
    size: 600, hills: 17, craters: 7,
    enemyCount: 24, dugSites: 6, wreckPos: [105, 0, 105], vehicleType: 'alien',
    partSpots: { noseCone: [-135, 0, -60] }, outfitColor: 0xd4af37, caveRadius: 550,
    lostRocketPos: [0, 0, -260],
  },
};

// Missions per planet. type: 'kill' | 'collect' | 'repair' | 'dig' | 'partpickup' | 'lostrocket'
const MISSIONS = {
  1: [
    { id: 'p1m1', name: 'Clear the Raiders', desc: 'Defeat 3 raiders roaming Rustholm.', type: 'kill', target: 3, reward: { coins: 35 } },
    { id: 'p1m2', name: 'Scrap Run', desc: 'Collect 5 scrap metal from the surface.', type: 'collect', item: 'scrap', target: 5, reward: { coins: 25, tools: 1 } },
    { id: 'p1m3', name: 'Rover Recovery', desc: 'Find and repair the abandoned rover.', type: 'repair', reward: { coins: 20, rocketPart: 'fins' } },
    { id: 'p1m4', name: 'Dig for the Engine', desc: 'Search the dig sites for a buried Engine part.', type: 'dig', reward: { rocketPart: 'engine' } },
    { id: 'p1m5', name: 'Cone Retrieval', desc: 'Retrieve the Nose Cone from the far dunes.', type: 'partpickup', part: 'noseCone', reward: { coins: 15 } },
  ],
  2: [
    { id: 'p2m1', name: 'Frost Raiders', desc: 'Defeat 5 raiders on the ice fields.', type: 'kill', target: 5, reward: { coins: 45 } },
    { id: 'p2m2', name: 'Ice Core Samples', desc: 'Collect 6 scrap from frozen wreckage.', type: 'collect', item: 'scrap', target: 6, reward: { coins: 30, tools: 1 } },
    { id: 'p2m3', name: 'Snow Crawler Recovery', desc: 'Find and repair the buried rover.', type: 'repair', reward: { coins: 25, rocketPart: 'noseCone' } },
    { id: 'p2m4', name: 'Buried Fuel Tank', desc: 'Dig up the Fuel Tank hidden under the ice.', type: 'dig', reward: { rocketPart: 'fuelTank' } },
    { id: 'p2m5', name: 'Fin Salvage', desc: 'Retrieve the Fins from the crash site.', type: 'partpickup', part: 'fins', reward: { coins: 20 } },
  ],
  3: [
    { id: 'p3m1', name: 'Ember Raiders', desc: 'Defeat 8 raiders in the lava fields of Emberfall.', type: 'kill', target: 8, reward: { coins: 55 } },
    { id: 'p3m2', name: 'Obsidian Scrap', desc: 'Collect 9 scrap from the cooled lava flats.', type: 'collect', item: 'scrap', target: 9, reward: { coins: 35, tools: 1 } },
    { id: 'p3m3', name: 'Magma Crawler Recovery', desc: 'Find and repair the scorched rover.', type: 'repair', reward: { coins: 30, rocketPart: 'noseCone' } },
    { id: 'p3m4', name: 'Dig for the Engine', desc: 'Search dig sites near the volcano for an Engine part.', type: 'dig', reward: { rocketPart: 'engine' } },
    { id: 'p3m5', name: 'Fuel Tank Salvage', desc: 'Retrieve the Fuel Tank from the ash dunes.', type: 'partpickup', part: 'fuelTank', reward: { coins: 25 } },
  ],
  4: [
    { id: 'p4m1', name: 'Jungle Ambush', desc: 'Defeat 9 raiders hiding in the Verdantia canopy.', type: 'kill', target: 9, reward: { coins: 65 } },
    { id: 'p4m2', name: 'Vine Scrap', desc: 'Collect 10 scrap tangled in the undergrowth.', type: 'collect', item: 'scrap', target: 10, reward: { coins: 40, tools: 1 } },
    { id: 'p4m3', name: 'Overgrown Crawler Recovery', desc: 'Find and repair the vine-covered rover.', type: 'repair', reward: { coins: 35, rocketPart: 'fuelTank' } },
    { id: 'p4m4', name: 'Dig for the Fins', desc: 'Search dig sites under the jungle floor for Fins.', type: 'dig', reward: { rocketPart: 'fins' } },
    { id: 'p4m5', name: 'Engine Salvage', desc: 'Retrieve the Engine from the ruined canopy platform.', type: 'partpickup', part: 'engine', reward: { coins: 30 } },
  ],
  5: [
    { id: 'p5m1', name: 'Bog Raiders', desc: 'Defeat 10 raiders lurking in the Duskmoor mire.', type: 'kill', target: 10, reward: { coins: 75 } },
    { id: 'p5m2', name: 'Toxic Scrap', desc: 'Collect 11 scrap from the murky wetlands.', type: 'collect', item: 'scrap', target: 11, reward: { coins: 45, tools: 2 } },
    { id: 'p5m3', name: 'Mire Crawler Recovery', desc: 'Find and repair the sunken rover.', type: 'repair', reward: { coins: 40, rocketPart: 'engine' } },
    { id: 'p5m4', name: 'Dig for the Nose Cone', desc: 'Search dig sites in the bog for a Nose Cone.', type: 'dig', reward: { rocketPart: 'noseCone' } },
    { id: 'p5m5', name: 'Fuel Tank Salvage', desc: 'Retrieve the Fuel Tank from the sunken ruins.', type: 'partpickup', part: 'fuelTank', reward: { coins: 35 } },
  ],
  6: [
    { id: 'p6m1', name: 'Canyon Raiders', desc: 'Defeat 11 raiders roaming the Ashcrag mesas.', type: 'kill', target: 11, reward: { coins: 85 } },
    { id: 'p6m2', name: 'Mesa Scrap', desc: 'Collect 12 scrap from the canyon floor.', type: 'collect', item: 'scrap', target: 12, reward: { coins: 50, tools: 2 } },
    { id: 'p6m3', name: 'Dust Crawler Recovery', desc: 'Find and repair the buried rover.', type: 'repair', reward: { coins: 45, rocketPart: 'fins' } },
    { id: 'p6m4', name: 'Dig for the Fuel Tank', desc: 'Search dig sites in the badlands for a Fuel Tank.', type: 'dig', reward: { rocketPart: 'fuelTank' } },
    { id: 'p6m5', name: 'Nose Cone Salvage', desc: 'Retrieve the Nose Cone from the cliffside wreck.', type: 'partpickup', part: 'noseCone', reward: { coins: 40 } },
  ],
  7: [
    { id: 'p7m1', name: 'Spire Sentinels', desc: 'Defeat 12 raiders guarding the Neonspire ruins.', type: 'kill', target: 12, reward: { coins: 95 } },
    { id: 'p7m2', name: 'Crystal Scrap', desc: 'Collect 13 glowing scrap shards.', type: 'collect', item: 'scrap', target: 13, reward: { coins: 55, tools: 2 } },
    { id: 'p7m3', name: 'Ruin Crawler Recovery', desc: 'Find and repair the ancient rover.', type: 'repair', reward: { coins: 50, rocketPart: 'noseCone' } },
    { id: 'p7m4', name: 'Dig for the Engine', desc: 'Search dig sites beneath the crystal spires for an Engine.', type: 'dig', reward: { rocketPart: 'engine' } },
    { id: 'p7m5', name: 'Fin Salvage', desc: 'Retrieve the Fins from the shattered tower.', type: 'partpickup', part: 'fins', reward: { coins: 45 } },
  ],
  8: [
    { id: 'p8m1', name: 'Storm Raiders', desc: 'Defeat 13 raiders braving the Stormreach highlands.', type: 'kill', target: 13, reward: { coins: 105 } },
    { id: 'p8m2', name: 'Lightning Scrap', desc: 'Collect 14 scrap scattered by the storms.', type: 'collect', item: 'scrap', target: 14, reward: { coins: 60, tools: 3 } },
    { id: 'p8m3', name: 'Storm Crawler Recovery', desc: 'Find and repair the storm-battered rover.', type: 'repair', reward: { coins: 55, rocketPart: 'fuelTank' } },
    { id: 'p8m4', name: 'Dig for the Nose Cone', desc: 'Search dig sites on the highlands for a Nose Cone.', type: 'dig', reward: { rocketPart: 'noseCone' } },
    { id: 'p8m5', name: 'Engine Salvage', desc: 'Retrieve the Engine from the lightning-scarred ridge.', type: 'partpickup', part: 'engine', reward: { coins: 50 } },
  ],
  9: [
    { id: 'p9m1', name: 'Lunar Raiders', desc: 'Defeat 15 raiders roaming the lunar craters.', type: 'kill', target: 15, reward: { coins: 115 } },
    { id: 'p9m2', name: 'Regolith Scrap', desc: 'Collect 16 scrap from the crater fields.', type: 'collect', item: 'scrap', target: 16, reward: { coins: 65, tools: 3 } },
    { id: 'p9m3', name: 'Moon Crawler Recovery', desc: 'Find and repair the dust-buried rover.', type: 'repair', reward: { coins: 60, rocketPart: 'engine' } },
    { id: 'p9m4', name: 'Dig for the Nose Cone', desc: 'Search dig sites in the craters for a Nose Cone.', type: 'dig', reward: { rocketPart: 'noseCone' } },
    { id: 'p9m5', name: 'Fin Salvage', desc: 'Retrieve the Fins from a crashed lander.', type: 'partpickup', part: 'fins', reward: { coins: 55 } },
  ],
  10: [
    { id: 'p10m1', name: 'Reef Raiders', desc: 'Defeat 16 raiders lurking among the coral spires.', type: 'kill', target: 16, reward: { coins: 125 } },
    { id: 'p10m2', name: 'Coral Scrap', desc: 'Collect 17 scrap from the reef floor.', type: 'collect', item: 'scrap', target: 17, reward: { coins: 70, tools: 3 } },
    { id: 'p10m3', name: 'Tidal Crawler Recovery', desc: 'Find and repair the reef-battered rover.', type: 'repair', reward: { coins: 65, rocketPart: 'fuelTank' } },
    { id: 'p10m4', name: 'Dig for the Fins', desc: 'Search dig sites along the reef for Fins.', type: 'dig', reward: { rocketPart: 'fins' } },
    { id: 'p10m5', name: 'Engine Salvage', desc: 'Retrieve the Engine from the sunken wreck.', type: 'partpickup', part: 'engine', reward: { coins: 60 } },
  ],
  11: [
    { id: 'p11m1', name: 'Ash Raiders', desc: 'Defeat 17 raiders in the Cindergate ruins.', type: 'kill', target: 17, reward: { coins: 135 } },
    { id: 'p11m2', name: 'Cinder Scrap', desc: 'Collect 18 scrap from the ash drifts.', type: 'collect', item: 'scrap', target: 18, reward: { coins: 75, tools: 4 } },
    { id: 'p11m3', name: 'Wasteland Crawler Recovery', desc: 'Find and repair the ash-choked rover.', type: 'repair', reward: { coins: 70, rocketPart: 'noseCone' } },
    { id: 'p11m4', name: 'Dig for the Fuel Tank', desc: 'Search dig sites in the ashlands for a Fuel Tank.', type: 'dig', reward: { rocketPart: 'fuelTank' } },
    { id: 'p11m5', name: 'Engine Salvage', desc: 'Retrieve the Engine from the buried ruins.', type: 'partpickup', part: 'engine', reward: { coins: 65 } },
  ],
  12: [
    { id: 'p12m1', name: 'Crimson Raiders', desc: 'Defeat 18 raiders roaming Bloodmere.', type: 'kill', target: 18, reward: { coins: 145 } },
    { id: 'p12m2', name: 'Bloodstone Scrap', desc: 'Collect 19 scrap from the crimson sands.', type: 'collect', item: 'scrap', target: 19, reward: { coins: 80, tools: 4 } },
    { id: 'p12m3', name: 'Sand Crawler Recovery', desc: 'Find and repair the sand-buried rover.', type: 'repair', reward: { coins: 75, rocketPart: 'fins' } },
    { id: 'p12m4', name: 'Dig for the Fuel Tank', desc: 'Search dig sites in the red dunes for a Fuel Tank.', type: 'dig', reward: { rocketPart: 'fuelTank' } },
    { id: 'p12m5', name: 'Nose Cone Salvage', desc: 'Retrieve the Nose Cone from the sunken ruins.', type: 'partpickup', part: 'noseCone', reward: { coins: 70 } },
  ],
  13: [
    { id: 'p13m1', name: 'Toxic Raiders', desc: 'Defeat 19 mutated raiders on Toxara.', type: 'kill', target: 19, reward: { coins: 155 } },
    { id: 'p13m2', name: 'Irradiated Scrap', desc: 'Collect 20 scrap from the glowing marshes.', type: 'collect', item: 'scrap', target: 20, reward: { coins: 85, tools: 4 } },
    { id: 'p13m3', name: 'Mutant Crawler Recovery', desc: 'Find and repair the corroded rover.', type: 'repair', reward: { coins: 80, rocketPart: 'fuelTank' } },
    { id: 'p13m4', name: 'Dig for the Nose Cone', desc: 'Search dig sites in the toxic flats for a Nose Cone.', type: 'dig', reward: { rocketPart: 'noseCone' } },
    { id: 'p13m5', name: 'Fin Salvage', desc: 'Retrieve the Fins from the irradiated wreck.', type: 'partpickup', part: 'fins', reward: { coins: 75 } },
  ],
  14: [
    { id: 'p14m1', name: 'Xenar Defense', desc: 'Defeat 23 alien raiders.', type: 'kill', target: 23, reward: { coins: 170 } },
    { id: 'p14m2', name: 'Crystal Scrap', desc: 'Collect 24 scrap crystals.', type: 'collect', item: 'scrap', target: 24, reward: { coins: 95, tools: 5 } },
    { id: 'p14m3', name: 'Alien Crawler Recovery', desc: 'Find and repair the strange rover.', type: 'repair', reward: { coins: 90, rocketPart: 'engine' } },
    { id: 'p14m4', name: 'Dig for the Fuel Cell', desc: 'Search dig sites for a Fuel Tank part.', type: 'dig', reward: { rocketPart: 'fuelTank' } },
    { id: 'p14m5', name: 'Cone Salvage', desc: 'Retrieve the Nose Cone from the alien ruins.', type: 'partpickup', part: 'noseCone', reward: { coins: 80 } },
    { id: 'p14m6', name: 'The Lost Rocket', desc: 'Find the ancient lost rocket ship deep on Xenar Prime.', type: 'lostrocket', reward: { coins: 250 } },
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
};

const SHOP_ITEMS = {
  parts: [
    { key: 'engine', name: 'Rocket Engine', desc: 'Buy the engine outright.', cost: 90, type: 'rocketPart' },
    { key: 'fuelTank', name: 'Fuel Tank', desc: 'Buy the fuel tank outright.', cost: 80, type: 'rocketPart' },
    { key: 'noseCone', name: 'Nose Cone', desc: 'Buy the nose cone outright.', cost: 70, type: 'rocketPart' },
    { key: 'fins', name: 'Rocket Fins', desc: 'Buy the fins outright.', cost: 60, type: 'rocketPart' },
  ],
  tools: [
    { key: 'tools', name: 'Repair Tool', desc: 'Needed to repair vehicles.', cost: 12, type: 'inventory' },
  ],
  food: [
    { key: 'food', name: 'Ration Pack', desc: 'Eat now to restore 40 health.', cost: 10, type: 'heal', amount: 40 },
    { key: 'feast', name: 'Big Feast', desc: 'Eat now to fully restore health.', cost: 22, type: 'heal', amount: 999 },
  ],
};
