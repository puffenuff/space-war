// ===================== STATIC GAME DATA =====================

const PLANET_COUNT = 9;
const PLANET_ID_LIST = Array.from({ length: PLANET_COUNT }, (_, i) => i + 1);

const PLANETS = {
  1: {
    name: 'Rustholm', theme: 'desert',
    ground: 0xc06a3a, ground2: 0x8a4423, sky: 0xffb37a, fog: 0xd88a52,
    size: 260, hills: 9, craters: 4,
    enemyCount: 4, dugSites: 3, wreckPos: [40, 0, -55],
    partSpots: { noseCone: [-60, 0, 60] },
  },
  2: {
    name: 'Cryovale', theme: 'ice',
    ground: 0xbfe6f5, ground2: 0x89c3dd, sky: 0xdfefff, fog: 0xaad0e6,
    size: 300, hills: 11, craters: 3,
    enemyCount: 6, dugSites: 3, wreckPos: [-50, 0, 40],
    partSpots: { fins: [-70, 0, -70] },
  },
  3: {
    name: 'Emberfall', theme: 'volcanic',
    ground: 0xff6a2e, ground2: 0x3a1a0e, sky: 0xff9a4d, fog: 0xcc4a1e,
    size: 320, hills: 12, craters: 6,
    enemyCount: 9, dugSites: 4, wreckPos: [55, 0, -40],
    partSpots: { fuelTank: [-65, 0, 50] },
  },
  4: {
    name: 'Verdantia', theme: 'jungle',
    ground: 0x3a8f4a, ground2: 0x1e5a2a, sky: 0x9fe0a8, fog: 0x5fae6c,
    size: 340, hills: 10, craters: 2,
    enemyCount: 10, dugSites: 4, wreckPos: [-60, 0, -35],
    partSpots: { engine: [70, 0, 45] },
  },
  5: {
    name: 'Duskmoor', theme: 'swamp',
    ground: 0x6a7a3a, ground2: 0x3a4a1e, sky: 0x8a9a6a, fog: 0x5a6a3a,
    size: 360, hills: 8, craters: 2,
    enemyCount: 11, dugSites: 5, wreckPos: [45, 0, 60],
    partSpots: { fuelTank: [-75, 0, -55] },
  },
  6: {
    name: 'Ashcrag', theme: 'canyon',
    ground: 0x9a7a5a, ground2: 0x5a4232, sky: 0xd9b98a, fog: 0xaa8a6a,
    size: 380, hills: 16, craters: 5,
    enemyCount: 12, dugSites: 5, wreckPos: [-70, 0, 55],
    partSpots: { noseCone: [80, 0, -60] },
  },
  7: {
    name: 'Neonspire', theme: 'crystal',
    ground: 0x3a2a5a, ground2: 0x1a0e33, sky: 0xff5ecb, fog: 0x6a3a9a,
    size: 400, hills: 11, craters: 3,
    enemyCount: 13, dugSites: 5, wreckPos: [65, 0, -70],
    partSpots: { fins: [-85, 0, 40] },
  },
  8: {
    name: 'Stormreach', theme: 'storm',
    ground: 0x4a5a6a, ground2: 0x2a3542, sky: 0x7a8aa0, fog: 0x5a6a7a,
    size: 400, hills: 14, craters: 3,
    enemyCount: 14, dugSites: 5, wreckPos: [-80, 0, -65],
    partSpots: { engine: [90, 0, 50] },
  },
  9: {
    name: 'Xenar Prime', theme: 'alien',
    ground: 0x5b3a7a, ground2: 0x3c2456, sky: 0x2a1a44, fog: 0x4a2f6e,
    size: 420, hills: 15, craters: 6,
    enemyCount: 18, dugSites: 5, wreckPos: [70, 0, 70],
    partSpots: { noseCone: [-90, 0, -40] },
    lostRocketPos: [0, 0, -170],
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
    { id: 'p9m1', name: 'Xenar Defense', desc: 'Defeat 17 alien raiders.', type: 'kill', target: 17, reward: { coins: 120 } },
    { id: 'p9m2', name: 'Crystal Scrap', desc: 'Collect 18 scrap crystals.', type: 'collect', item: 'scrap', target: 18, reward: { coins: 70, tools: 3 } },
    { id: 'p9m3', name: 'Alien Crawler Recovery', desc: 'Find and repair the strange rover.', type: 'repair', reward: { coins: 65, rocketPart: 'engine' } },
    { id: 'p9m4', name: 'Dig for the Fuel Cell', desc: 'Search dig sites for a Fuel Tank part.', type: 'dig', reward: { rocketPart: 'fuelTank' } },
    { id: 'p9m5', name: 'Cone Salvage', desc: 'Retrieve the Nose Cone from the alien ruins.', type: 'partpickup', part: 'noseCone', reward: { coins: 55 } },
    { id: 'p9m6', name: 'The Lost Rocket', desc: 'Find the ancient lost rocket ship deep on Xenar Prime.', type: 'lostrocket', reward: { coins: 200 } },
  ],
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
