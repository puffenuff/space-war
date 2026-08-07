// ===================== STATIC GAME DATA =====================

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
    name: 'Xenar Prime', theme: 'alien',
    ground: 0x5b3a7a, ground2: 0x3c2456, sky: 0x2a1a44, fog: 0x4a2f6e,
    size: 340, hills: 13, craters: 5,
    enemyCount: 8, dugSites: 4, wreckPos: [60, 0, 60],
    partSpots: { noseCone: [-80, 0, -30] },
    lostRocketPos: [0, 0, -150],
  },
};

// Missions per planet. type: 'kill' | 'collect' | 'repair' | 'dig' | 'boss'
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
    { id: 'p3m1', name: 'Xenar Defense', desc: 'Defeat 7 alien raiders.', type: 'kill', target: 7, reward: { coins: 60 } },
    { id: 'p3m2', name: 'Crystal Scrap', desc: 'Collect 8 scrap crystals.', type: 'collect', item: 'scrap', target: 8, reward: { coins: 40, tools: 2 } },
    { id: 'p3m3', name: 'Alien Crawler Recovery', desc: 'Find and repair the strange rover.', type: 'repair', reward: { coins: 30, rocketPart: 'engine' } },
    { id: 'p3m4', name: 'Dig for the Fuel Cell', desc: 'Search dig sites for a Fuel Tank part.', type: 'dig', reward: { rocketPart: 'fuelTank' } },
    { id: 'p3m5', name: 'Cone Salvage', desc: 'Retrieve the Nose Cone from the alien ruins.', type: 'partpickup', part: 'noseCone', reward: { coins: 25 } },
    { id: 'p3m6', name: 'The Lost Rocket', desc: 'Find the ancient lost rocket ship deep on Xenar Prime.', type: 'lostrocket', reward: { coins: 150 } },
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
