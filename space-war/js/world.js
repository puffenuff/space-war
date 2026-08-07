
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildTerrain(planet, seed) {
  const size = planet.size;
  const segs = 90;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const cA = new THREE.Color(planet.ground);
  const cB = new THREE.Color(planet.ground2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z, seed, 7 + planet.hills * 0.4);
    pos.setY(i, h);
    const t = Math.max(0, Math.min(1, (h + 6) / 12));
    const c = cA.clone().lerp(cB, t);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function makeSparkle(color) {
  const geo = new THREE.SphereGeometry(0.05, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color });
  const pts = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(geo, mat);
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3);
    pts.add(s);
  }
  return pts;
}

function buildPlanetScene(planetId) {
  const planet = PLANETS[planetId];
  const seed = planetId * 133.7;
  const rand = seededRand(planetId * 991 + 7);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(planet.sky);
  scene.fog = new THREE.Fog(planet.fog, 40, planet.size * 0.85);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
  scene.add(sun);

  const terrain = buildTerrain(planet, seed);
  scene.add(terrain);

  function groundHeightFn(x, z) {
    return terrainHeight(x, z, seed, 7 + planet.hills * 0.4);
  }

  // ---- decorative rocks ----
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 });
  for (let i = 0; i < 60; i++) {
    const x = (rand() - 0.5) * planet.size * 0.9;
    const z = (rand() - 0.5) * planet.size * 0.9;
    if (Math.hypot(x, z) < 20) continue;
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const s = 0.6 + rand() * 2.2;
    rock.scale.set(s, s * (0.6 + rand() * 0.6), s);
    rock.position.set(x, groundHeightFn(x, z) + s * 0.25, z);
    rock.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    rock.castShadow = true; rock.receiveShadow = true;
    scene.add(rock);
  }

  // ---- return beacon near spawn ----
  const beacon = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3, 8), new THREE.MeshStandardMaterial({ color: 0x99a3b0, metalness: 0.6, roughness: 0.3 }));
  pole.position.y = 1.5;
  const beaconLight = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshStandardMaterial({ color: 0x4ad2ff, emissive: 0x2aa9e0, emissiveIntensity: 0.8 }));
  beaconLight.position.y = 3.1;
  beacon.add(pole, beaconLight);
  beacon.position.set(0, groundHeightFn(0, 12), 12);
  beacon.userData = { type: 'returnBeacon', label: 'Return to Base' };
  scene.add(beacon);

  // ---- scrap + coin pickups ----
  const scrapPickups = [];
  const scrapGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const scrapMat = new THREE.MeshStandardMaterial({ color: 0x8899a5, metalness: 0.7, roughness: 0.4 });
  const scrapCount = planetId === 1 ? 9 : planetId === 2 ? 10 : 13;
  for (let i = 0; i < scrapCount; i++) {
    const x = (rand() - 0.5) * planet.size * 0.75;
    const z = (rand() - 0.5) * planet.size * 0.75;
    if (Math.hypot(x, z) < 14) continue;
    const m = new THREE.Mesh(scrapGeo, scrapMat);
    m.position.set(x, groundHeightFn(x, z) + 0.3, z);
    m.castShadow = true;
    m.userData = { type: 'scrap', collected: false, spin: rand() * 10 };
    scene.add(m);
    scrapPickups.push(m);
  }

  const coinPickups = [];
  const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 14);
  const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd35e, metalness: 0.8, roughness: 0.25, emissive: 0x553d00, emissiveIntensity: 0.3 });
  for (let i = 0; i < 10; i++) {
    const x = (rand() - 0.5) * planet.size * 0.8;
    const z = (rand() - 0.5) * planet.size * 0.8;
    if (Math.hypot(x, z) < 14) continue;
    const m = new THREE.Mesh(coinGeo, coinMat);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, groundHeightFn(x, z) + 0.35, z);
    m.castShadow = true;
    m.userData = { type: 'coin', collected: false, value: 5 + Math.floor(rand() * 8) };
    scene.add(m);
    coinPickups.push(m);
  }

  // ---- rocket part ground pickup ----
  let partPickup = null;
  const partEntry = Object.entries(planet.partSpots)[0];
  if (partEntry) {
    const [partName, spot] = partEntry;
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.3, emissive: 0x2a6fff, emissiveIntensity: 0.35 }));
    body.rotation.x = Math.PI;
    body.position.y = 1.1;
    group.add(body);
    const y = groundHeightFn(spot[0], spot[2]);
    group.position.set(spot[0], y, spot[2]);
    group.userData = { type: 'partPickup', part: partName, collected: false };
    scene.add(group);
    partPickup = group;
  }

  // ---- dig sites ----
  const digSites = [];
  const digCount = planet.dugSites;
  const digKinds = ['mission', 'cave', 'loot', 'loot'];
  for (let i = 0; i < digCount; i++) {
    let x, z;
    do {
      x = (rand() - 0.5) * planet.size * 0.7;
      z = (rand() - 0.5) * planet.size * 0.7;
    } while (Math.hypot(x, z) < 16);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 }));
    mound.position.set(x, groundHeightFn(x, z), z);
    mound.scale.y = 0.55;
    const sparkle = makeSparkle(0xfff2a0);
    sparkle.position.set(x, groundHeightFn(x, z) + 0.5, z);
    mound.userData = { type: 'digSite', dug: false, kind: digKinds[i % digKinds.length], id: `dig${planetId}_${i}`, sparkle };
    scene.add(mound);
    scene.add(sparkle);
    digSites.push(mound);
  }

  // ---- cave interior (built far away, teleport target) ----
  const caveOrigin = new THREE.Vector3(3000 + planetId * 500, -6, 3000);
  const caveGroup = new THREE.Group();
  caveGroup.position.copy(caveOrigin);
  const caveFloor = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 1, 16), new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 }));
  caveFloor.position.y = -0.5;
  caveGroup.add(caveFloor);
  const caveWall = new THREE.Mesh(new THREE.CylinderGeometry(14.4, 14.4, 8, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 1, side: THREE.BackSide }));
  caveWall.position.y = 3.5;
  caveGroup.add(caveWall);
  const caveCeil = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 1, 16), new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 1, side: THREE.DoubleSide }));
  caveCeil.position.y = 7.5;
  caveGroup.add(caveCeil);
  const caveLight = new THREE.PointLight(0x6fd7ff, 1.6, 30);
  caveLight.position.set(0, 5, 0);
  caveGroup.add(caveLight);
  const glowOrbGeo = new THREE.SphereGeometry(0.5, 10, 10);
  for (let i = 0; i < 5; i++) {
    const o = new THREE.Mesh(glowOrbGeo, new THREE.MeshBasicMaterial({ color: 0x6fd7ff }));
    const a = (i / 5) * Math.PI * 2;
    o.position.set(Math.cos(a) * 10, 0.5, Math.sin(a) * 10);
    caveGroup.add(o);
  }
  // cave loot chest
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0xd4a531, metalness: 0.5, roughness: 0.4 }));
  chest.position.set(0, -0.05, -4);
  chest.userData = { type: 'caveLoot', collected: false, worldPos: caveOrigin.clone().add(chest.position) };
  caveGroup.add(chest);
  // cave exit beacon
  const caveExit = new THREE.Group();
  const exitPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3, 8), new THREE.MeshStandardMaterial({ color: 0x99a3b0 }));
  exitPole.position.y = 1.5;
  const exitLight = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshStandardMaterial({ color: 0xff9c4a, emissive: 0xcc6a20, emissiveIntensity: 0.8 }));
  exitLight.position.y = 3.1;
  caveExit.add(exitPole, exitLight);
  caveExit.position.set(0, 0, 5);
  caveExit.userData = { type: 'caveExit', label: 'Exit Cave', worldPos: caveOrigin.clone().add(caveExit.position) };
  caveGroup.add(caveExit);
  scene.add(caveGroup);

  // ---- rocket wreck (vehicle) spot handled by vehicles.js, expose ground height there ----
  const wreckY = groundHeightFn(planet.wreckPos[0], planet.wreckPos[2]);

  // ---- lost rocket ship (planet 3 only) ----
  let lostRocket = null;
  if (planet.lostRocketPos) {
    const [lx, , lz] = planet.lostRocketPos;
    const ly = groundHeightFn(lx, lz);
    const group = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 9, 12), new THREE.MeshStandardMaterial({ color: 0x8a8f9a, metalness: 0.6, roughness: 0.5 }));
    hull.position.y = 4.2;
    hull.rotation.z = 0.35;
    group.add(hull);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 12), new THREE.MeshStandardMaterial({ color: 0xb33b3b, metalness: 0.4, roughness: 0.5 }));
    nose.position.set(-0.8, 8.6, 0);
    nose.rotation.z = 0.35;
    group.add(nose);
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2, 1.3), new THREE.MeshStandardMaterial({ color: 0x5a5f6a }));
      const a = (i / 3) * Math.PI * 2;
      fin.position.set(Math.sin(a) * 1.9, 0.6, Math.cos(a) * 1.9);
      fin.rotation.y = a;
      fin.rotation.z = 0.35;
      group.add(fin);
    }
    group.position.set(lx, ly, lz);
    group.userData = { type: 'lostRocket', found: false };
    scene.add(group);
    lostRocket = group;
  }

  return {
    scene, groundHeightFn,
    planet,
    spawnPoint: { x: 0, z: 6 },
    beacon, scrapPickups, coinPickups, partPickup, digSites,
    caveGroup, caveOrigin, chest, caveExit,
    wreckPos: [planet.wreckPos[0], wreckY, planet.wreckPos[2]],
    lostRocket,
    lostRocketSurface: planet.lostRocketPos ? { x: planet.lostRocketPos[0], z: planet.lostRocketPos[2] } : null,
    enemySpawns: buildEnemySpawns(planet, rand, groundHeightFn),
    tick(dt, t) {
      scrapPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.y = t * 2 + m.userData.spin; } });
      coinPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.z = t * 3; } });
      if (partPickup && !partPickup.userData.collected) { partPickup.rotation.y = t * 1.2; partPickup.position.y += Math.sin(t * 2) * 0.002; }
      digSites.forEach((d) => { if (!d.userData.dug) d.userData.sparkle.rotation.y = t * 1.5; else d.userData.sparkle.visible = false; });
      beaconLight.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
      if (lostRocket && !lostRocket.userData.found) lostRocket.rotation.y = Math.sin(t * 0.3) * 0.05;
      exitLight.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
    },
  };
}

function buildEnemySpawns(planet, rand, groundHeightFn) {
  const spawns = [];
  for (let i = 0; i < planet.enemyCount; i++) {
    let x, z;
    do {
      x = (rand() - 0.5) * planet.size * 0.65;
      z = (rand() - 0.5) * planet.size * 0.65;
    } while (Math.hypot(x, z) < 22);
    spawns.push({ x, y: groundHeightFn(x, z), z });
  }
  return spawns;
}
