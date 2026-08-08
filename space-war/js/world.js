
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildTerrain(planet, seed) {
  const size = planet.size;
  const segs = Math.min(160, Math.round(70 + size / 8));
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

// a single large, theme-matched landmark structure to make each world feel distinct
function buildLandmark(planet, groundHeightFn, rand) {
  const group = new THREE.Group();
  const glowParts = [];

  switch (planet.theme) {
    case 'desert': { // sun-bleached rock arch
      const legMat = new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 });
      const legGeo = new THREE.CylinderGeometry(2.2, 3.2, 18, 8);
      const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-9, 9, 0); legL.rotation.z = 0.18;
      const legR = new THREE.Mesh(legGeo, legMat); legR.position.set(9, 9, 0); legR.rotation.z = -0.18;
      group.add(legL, legR);
      const archCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-9, 17, 0), new THREE.Vector3(0, 25, 0), new THREE.Vector3(9, 17, 0)]);
      const arch = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 20, 2.6, 8, false), legMat);
      group.add(arch);
      break;
    }
    case 'ice': { // ice spire cluster
      const iceMat = new THREE.MeshStandardMaterial({ color: 0xcdeeff, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.88, emissive: 0x3a6a8a, emissiveIntensity: 0.35 });
      for (let i = 0; i < 6; i++) {
        const h = 12 + rand() * 22;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(1.5 + rand() * 1.6, h, 6), iceMat);
        const a = (i / 6) * Math.PI * 2, r = rand() * 7;
        spire.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
        spire.rotation.y = rand() * Math.PI;
        group.add(spire);
      }
      break;
    }
    case 'volcanic': { // active lava vent
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: 1 });
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(6, 15, 17, 10, 1, true), rockMat);
      cone.position.y = 8.5;
      group.add(cone);
      const lava = new THREE.Mesh(new THREE.CircleGeometry(5.5, 16), new THREE.MeshStandardMaterial({ color: 0xff5522, emissive: 0xff3300, emissiveIntensity: 1.2 }));
      lava.rotation.x = -Math.PI / 2;
      lava.position.y = 16.9;
      group.add(lava);
      glowParts.push(lava.material);
      break;
    }
    case 'jungle': { // overgrown watchtower
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1 });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 27, 10), towerMat);
      tower.position.y = 13.5;
      group.add(tower);
      const vineMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 1 });
      for (let i = 0; i < 10; i++) {
        const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6 + rand() * 11, 5), vineMat);
        const a = rand() * Math.PI * 2;
        vine.position.set(Math.cos(a) * 3.6, 6 + rand() * 15, Math.sin(a) * 3.6);
        vine.rotation.z = (rand() - 0.5) * 0.4;
        group.add(vine);
      }
      break;
    }
    case 'swamp': { // sunken ruin obelisk
      const obeMat = new THREE.MeshStandardMaterial({ color: 0x3a3a2a, roughness: 1 });
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.6, 21, 4), obeMat);
      obelisk.position.y = 8; obelisk.rotation.y = Math.PI / 4; obelisk.rotation.z = 0.13;
      group.add(obelisk);
      const glowRune = new THREE.Mesh(new THREE.CircleGeometry(1.2, 6), new THREE.MeshStandardMaterial({ color: 0x8affb0, emissive: 0x2a8a4a, emissiveIntensity: 0.9 }));
      glowRune.position.set(0.6, 7, 1.4); glowRune.rotation.y = 0.6;
      group.add(glowRune);
      glowParts.push(glowRune.material);
      break;
    }
    case 'canyon': { // natural rock bridge
      const rockMat = new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 });
      const span = new THREE.Mesh(new THREE.BoxGeometry(30, 2.6, 4.2), rockMat);
      span.position.y = 14.5; span.rotation.z = 0.05;
      group.add(span);
      const pierL = new THREE.Mesh(new THREE.BoxGeometry(4.2, 14, 4.2), rockMat); pierL.position.set(-13, 7, 0);
      const pierR = new THREE.Mesh(new THREE.BoxGeometry(4.2, 14, 4.2), rockMat); pierR.position.set(13, 7, 0);
      group.add(pierL, pierR);
      break;
    }
    case 'crystal': { // towering crystal spires
      const cMat = new THREE.MeshStandardMaterial({ color: 0xd63aff, emissive: 0x8a1acc, emissiveIntensity: 0.65, metalness: 0.4, roughness: 0.2 });
      for (let i = 0; i < 7; i++) {
        const h = 10 + rand() * 24;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(1.2 + rand(), h, 5), cMat);
        const a = (i / 7) * Math.PI * 2, r = rand() * 8;
        sp.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
        group.add(sp);
      }
      glowParts.push(cMat);
      break;
    }
    case 'storm': { // lightning-rod tower
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x3a4550, metalness: 0.6, roughness: 0.4 });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.4, 29, 8), towerMat);
      tower.position.y = 14.5;
      group.add(tower);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8ac8ff, emissiveIntensity: 1 }));
      rod.position.y = 32;
      group.add(rod);
      glowParts.push(rod.material);
      break;
    }
    case 'alien':
    default: { // ancient monolith ring
      const monMat = new THREE.MeshStandardMaterial({ color: 0x2a1a44, emissive: 0x6a2aff, emissiveIntensity: 0.45, roughness: 0.6 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const mono = new THREE.Mesh(new THREE.BoxGeometry(2, 12 + rand() * 7, 1.2), monMat);
        mono.position.set(Math.cos(a) * 15, 6, Math.sin(a) * 15);
        mono.rotation.y = a;
        group.add(mono);
      }
      glowParts.push(monMat);
      break;
    }
  }

  const lx = planet.size * 0.3 * (rand() > 0.5 ? 1 : -1);
  const lz = planet.size * 0.27 * (rand() > 0.5 ? 1 : -1);
  group.position.set(lx, groundHeightFn(lx, lz), lz);
  group.userData = { glowParts };
  return group;
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

  // ---- signature landmark ----
  const landmark = buildLandmark(planet, groundHeightFn, rand);
  scene.add(landmark);

  // ---- decorative rocks ----
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 });
  const rockCount = Math.round(60 * (planet.size / 300));
  for (let i = 0; i < rockCount; i++) {
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
  const collectMission = MISSIONS[planetId] && MISSIONS[planetId].find((m) => m.type === 'collect');
  const scrapCount = (collectMission ? collectMission.target : 8) + 4;
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
  const coinCount = Math.round(10 * (planet.size / 300));
  for (let i = 0; i < coinCount; i++) {
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
    const kind = digKinds[i % digKinds.length];
    const isCave = kind === 'cave';
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 }));
    mound.position.set(x, groundHeightFn(x, z), z);
    mound.scale.y = 0.55;
    const sparkle = makeSparkle(isCave ? 0x6fd7ff : 0xfff2a0);
    sparkle.position.set(x, groundHeightFn(x, z) + 0.5, z);
    scene.add(sparkle);

    // cave entrances get a tall glowing beacon so they're spottable from across the map
    let beam = null;
    if (isCave) {
      beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.45, 30, 8, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x6fd7ff, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })
      );
      beam.position.set(x, groundHeightFn(x, z) + 15, z);
      scene.add(beam);
    }

    mound.userData = { type: 'digSite', dug: false, kind, id: `dig${planetId}_${i}`, sparkle, beam };
    scene.add(mound);
    digSites.push(mound);
  }

  // ---- cave interior (built far away, teleport target); size differs per planet ----
  const caveRadius = planet.caveRadius || 75;
  const caveHeight = Math.round(caveRadius * 0.43);
  const caveOrigin = new THREE.Vector3(3000 + planetId * 500, -6, 3000);
  const caveGroup = new THREE.Group();
  caveGroup.position.copy(caveOrigin);
  const caveFloor = new THREE.Mesh(new THREE.CylinderGeometry(caveRadius, caveRadius, 1, 20), new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 }));
  caveFloor.position.y = -0.5;
  caveGroup.add(caveFloor);
  const caveWall = new THREE.Mesh(new THREE.CylinderGeometry(caveRadius + 0.4, caveRadius + 0.4, caveHeight, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 1, side: THREE.BackSide }));
  caveWall.position.y = caveHeight / 2 - 0.5;
  caveGroup.add(caveWall);
  const caveCeil = new THREE.Mesh(new THREE.CylinderGeometry(caveRadius, caveRadius, 1, 20), new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 1, side: THREE.DoubleSide }));
  caveCeil.position.y = caveHeight - 0.5;
  caveGroup.add(caveCeil);

  // dim, moody point lights - pools of light rather than an evenly lit room
  const caveLightA = new THREE.PointLight(0x6fd7ff, 1.1, caveRadius * 1.3);
  caveLightA.position.set(0, caveHeight * 0.55, 0);
  caveGroup.add(caveLightA);
  const caveLightB = new THREE.PointLight(0x8a6fff, 0.75, caveRadius * 1.1);
  caveLightB.position.set(caveRadius * 0.45, caveHeight * 0.4, -caveRadius * 0.45);
  caveGroup.add(caveLightB);
  const caveLightC = new THREE.PointLight(0x6fd7ff, 0.75, caveRadius * 1.1);
  caveLightC.position.set(-caveRadius * 0.5, caveHeight * 0.4, caveRadius * 0.45);
  caveGroup.add(caveLightC);
  const caveLightD = new THREE.PointLight(0x8a6fff, 0.6, caveRadius * 1.0);
  caveLightD.position.set(caveRadius * 0.5, caveHeight * 0.35, caveRadius * 0.5);
  caveGroup.add(caveLightD);

  const glowOrbGeo = new THREE.SphereGeometry(0.5, 10, 10);
  const glowOrbCount = Math.min(70, Math.round(caveRadius * 0.42));
  for (let i = 0; i < glowOrbCount; i++) {
    const o = new THREE.Mesh(glowOrbGeo, new THREE.MeshBasicMaterial({ color: 0x6fd7ff }));
    const a = (i / glowOrbCount) * Math.PI * 2;
    const rr = caveRadius * (0.35 + (i % 3) * 0.2);
    o.position.set(Math.cos(a) * rr, 0.5, Math.sin(a) * rr);
    caveGroup.add(o);
  }

  // scattered stalagmite/rock formations to fill the bigger room
  const stalagGeo = new THREE.ConeGeometry(1, 1, 7);
  const stalagMat = new THREE.MeshStandardMaterial({ color: 0x24242c, roughness: 1 });
  const caveRand = seededRand(planetId * 47 + 501);
  const stalagCount = Math.min(95, Math.round(caveRadius * 0.6));
  for (let i = 0; i < stalagCount; i++) {
    const a = caveRand() * Math.PI * 2;
    const r = 6 + caveRand() * (caveRadius - 10);
    const s = new THREE.Mesh(stalagGeo, stalagMat);
    const h = 1.5 + caveRand() * 3.5;
    s.scale.set(0.8 + caveRand() * 1.2, h, 0.8 + caveRand() * 1.2);
    s.position.set(Math.cos(a) * r, -0.5 + h / 2, Math.sin(a) * r);
    s.rotation.y = caveRand() * Math.PI;
    caveGroup.add(s);
  }

  // glowing mineral crystal clusters, color-matched to this planet's outfit accent
  const crystalMat = new THREE.MeshStandardMaterial({ color: planet.outfitColor || 0x6fd7ff, emissive: planet.outfitColor || 0x6fd7ff, emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.3 });
  const crystalGeo = new THREE.ConeGeometry(0.4, 1, 5);
  const crystalClusterCount = Math.min(24, Math.round(caveRadius / 10));
  for (let i = 0; i < crystalClusterCount; i++) {
    const a = caveRand() * Math.PI * 2;
    const r = 8 + caveRand() * (caveRadius - 14);
    const cluster = new THREE.Group();
    const shardCount = 3 + Math.floor(caveRand() * 3);
    for (let j = 0; j < shardCount; j++) {
      const shard = new THREE.Mesh(crystalGeo, crystalMat);
      const h = 0.6 + caveRand() * 1.4;
      shard.scale.set(0.6 + caveRand() * 0.6, h, 0.6 + caveRand() * 0.6);
      shard.position.set((caveRand() - 0.5) * 1.2, -0.5 + h / 2, (caveRand() - 0.5) * 1.2);
      shard.rotation.z = (caveRand() - 0.5) * 0.3;
      cluster.add(shard);
    }
    cluster.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    caveGroup.add(cluster);
  }

  // scrap and coin pickups underground too, so exploring is worth it
  const caveScrapPickups = [];
  const caveScrapCount = Math.min(20, Math.round(caveRadius / 12));
  for (let i = 0; i < caveScrapCount; i++) {
    const a = caveRand() * Math.PI * 2;
    const r = 5 + caveRand() * (caveRadius - 10);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0x8899a5, metalness: 0.7, roughness: 0.4 }));
    const localPos = new THREE.Vector3(Math.cos(a) * r, 0.3, Math.sin(a) * r);
    m.position.copy(localPos);
    m.userData = { type: 'scrap', collected: false, spin: caveRand() * 10, worldPos: caveOrigin.clone().add(localPos) };
    caveGroup.add(m);
    caveScrapPickups.push(m);
  }
  const caveCoinPickups = [];
  const caveCoinCount = Math.min(18, Math.round(caveRadius / 15));
  for (let i = 0; i < caveCoinCount; i++) {
    const a = caveRand() * Math.PI * 2;
    const r = 5 + caveRand() * (caveRadius - 10);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 14), new THREE.MeshStandardMaterial({ color: 0xffd35e, metalness: 0.8, roughness: 0.25, emissive: 0x553d00, emissiveIntensity: 0.3 }));
    m.rotation.x = Math.PI / 2;
    const localPos = new THREE.Vector3(Math.cos(a) * r, 0.35, Math.sin(a) * r);
    m.position.copy(localPos);
    m.userData = { type: 'coin', collected: false, value: 5 + Math.floor(caveRand() * 10), worldPos: caveOrigin.clone().add(localPos) };
    caveGroup.add(m);
    caveCoinPickups.push(m);
  }

  // rock columns that span floor to ceiling
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e1e26, roughness: 1 });
  const pillarRand = seededRand(planetId * 71 + 909);
  const pillarCount = Math.min(26, Math.max(4, Math.round(caveRadius / 12)));
  for (let i = 0; i < pillarCount; i++) {
    const a = pillarRand() * Math.PI * 2;
    const r = 12 + pillarRand() * (caveRadius - 20);
    const radiusTop = 0.6 + pillarRand() * 0.8;
    const radiusBottom = 0.9 + pillarRand() * 1.1;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, caveHeight, 7), pillarMat);
    pillar.position.set(Math.cos(a) * r, caveHeight / 2 - 0.5, Math.sin(a) * r);
    pillar.rotation.y = pillarRand() * Math.PI;
    caveGroup.add(pillar);
  }

  // cave loot chests (two, spread across the bigger room)
  const chestMat = new THREE.MeshStandardMaterial({ color: 0xd4a531, metalness: 0.5, roughness: 0.4 });
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.9), chestMat);
  chest.position.set(0, -0.05, -caveRadius * 0.55);
  chest.userData = { type: 'caveLoot', collected: false, worldPos: caveOrigin.clone().add(chest.position) };
  caveGroup.add(chest);

  const chest2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 0.8), chestMat.clone());
  chest2.position.set(caveRadius * 0.5, -0.12, caveRadius * 0.4);
  chest2.userData = { type: 'caveLoot', collected: false, worldPos: caveOrigin.clone().add(chest2.position) };
  caveGroup.add(chest2);
  const caveTreasures = [chest, chest2];

  // special suit pickup, unique per planet, permanently reskins the astronaut
  const outfitColor = planet.outfitColor || 0xffffff;
  const outfit = new THREE.Group();
  const outfitMat = new THREE.MeshStandardMaterial({ color: outfitColor, emissive: outfitColor, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.3 });
  const outfitTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), outfitMat);
  outfitTorso.position.y = 0.55;
  outfit.add(outfitTorso);
  const outfitHead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), outfitMat);
  outfitHead.position.y = 1.05;
  outfit.add(outfitHead);
  const outfitRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 20), new THREE.MeshBasicMaterial({ color: outfitColor }));
  outfitRing.rotation.x = Math.PI / 2;
  outfitRing.position.y = 0.05;
  outfit.add(outfitRing);
  outfit.position.set(-caveRadius * 0.5, 0.1, caveRadius * 0.35);
  outfit.userData = { type: 'caveOutfit', collected: false, suitColor: outfitColor, worldPos: caveOrigin.clone().add(outfit.position) };
  caveGroup.add(outfit);

  // cave enemy spawn points (positions only; game.js instantiates the actual enemies)
  const caveEnemySpawns = [];
  const caveEnemyCount = Math.min(10, Math.max(3, Math.round(caveRadius / 15)));
  for (let i = 0; i < caveEnemyCount; i++) {
    const a = (i / caveEnemyCount) * Math.PI * 2 + 0.6;
    const r = caveRadius * 0.5;
    caveEnemySpawns.push({ x: caveOrigin.x + Math.cos(a) * r, y: caveOrigin.y, z: caveOrigin.z + Math.sin(a) * r });
  }

  // cave exit beacon
  const caveExit = new THREE.Group();
  const exitPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3, 8), new THREE.MeshStandardMaterial({ color: 0x99a3b0 }));
  exitPole.position.y = 1.5;
  const exitLight = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshStandardMaterial({ color: 0xff9c4a, emissive: 0xcc6a20, emissiveIntensity: 0.8 }));
  exitLight.position.y = 3.1;
  caveExit.add(exitPole, exitLight);
  caveExit.position.set(0, 0, caveRadius * 0.4);
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
    planet, ambient,
    spawnPoint: { x: 0, z: 6 },
    beacon, scrapPickups, coinPickups, partPickup, digSites,
    caveGroup, caveOrigin, chest, caveTreasures, outfit, caveExit,
    caveScrapPickups, caveCoinPickups,
    wreckPos: [planet.wreckPos[0], wreckY, planet.wreckPos[2]],
    lostRocket,
    lostRocketSurface: planet.lostRocketPos ? { x: planet.lostRocketPos[0], z: planet.lostRocketPos[2] } : null,
    enemySpawns: buildEnemySpawns(planet, rand, groundHeightFn),
    caveEnemySpawns,
    tick(dt, t) {
      scrapPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.y = t * 2 + m.userData.spin; } });
      coinPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.z = t * 3; } });
      caveScrapPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.y = t * 2 + m.userData.spin; } });
      caveCoinPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.z = t * 3; } });
      if (partPickup && !partPickup.userData.collected) { partPickup.rotation.y = t * 1.2; partPickup.position.y += Math.sin(t * 2) * 0.002; }
      if (outfit && !outfit.userData.collected) { outfit.rotation.y = t * 0.8; outfit.position.y = 0.1 + Math.sin(t * 1.6) * 0.15; }
      digSites.forEach((d) => {
        if (!d.userData.dug) {
          d.userData.sparkle.rotation.y = t * 1.5;
          if (d.userData.beam) d.userData.beam.material.opacity = 0.22 + Math.sin(t * 2) * 0.12;
        } else {
          d.userData.sparkle.visible = false;
          if (d.userData.beam) d.userData.beam.visible = false;
        }
      });
      beaconLight.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
      if (lostRocket && !lostRocket.userData.found) lostRocket.rotation.y = Math.sin(t * 0.3) * 0.05;
      exitLight.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
      landmark.userData.glowParts.forEach((m) => { m.emissiveIntensity = 0.7 + Math.sin(t * 2.2) * 0.4; });
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
