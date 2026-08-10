
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
    case 'lunar': { // crashed satellite, half-buried
      const hullMat = new THREE.MeshStandardMaterial({ color: 0xd8d8dc, metalness: 0.6, roughness: 0.4 });
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 10), hullMat);
      hull.rotation.z = Math.PI / 2.3;
      hull.position.y = 2.5;
      group.add(hull);
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x2a3a6a, metalness: 0.5, roughness: 0.3, emissive: 0x1a2a5a, emissiveIntensity: 0.4 });
      const panelL = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 2.4), panelMat); panelL.position.set(-4, 3.6, 0); panelL.rotation.z = 0.35;
      const panelR = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 2.4), panelMat); panelR.position.set(4, 5.6, 0); panelR.rotation.z = -0.2;
      group.add(panelL, panelR);
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 1.3, 0.6, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xc0c0c8, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }));
      dish.position.set(-2, 6.2, 0);
      dish.rotation.z = 0.5;
      group.add(dish);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 1 }));
      beacon.position.set(-2, 6.7, 0);
      group.add(beacon);
      glowParts.push(beacon.material);
      break;
    }
    case 'reef': { // giant coral spire cluster
      const coralMatA = new THREE.MeshStandardMaterial({ color: 0xff6fa0, emissive: 0xaa2f60, emissiveIntensity: 0.4, roughness: 0.6 });
      const coralMatB = new THREE.MeshStandardMaterial({ color: 0x2ab5a0, emissive: 0x0a5a50, emissiveIntensity: 0.4, roughness: 0.6 });
      for (let i = 0; i < 8; i++) {
        const h = 8 + rand() * 18;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(1 + rand() * 1.4, h, 6), i % 2 === 0 ? coralMatA : coralMatB);
        const a = (i / 8) * Math.PI * 2, r = rand() * 8;
        spire.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
        spire.rotation.z = (rand() - 0.5) * 0.3;
        group.add(spire);
      }
      glowParts.push(coralMatA, coralMatB);
      break;
    }
    case 'ashlands': { // ruined skeleton tower
      const beamMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1, metalness: 0.2 });
      for (let i = 0; i < 5; i++) {
        const beamH = 14 - i * 1.6;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, beamH, 0.6), beamMat);
        const a = (i / 5) * Math.PI * 2;
        beam.position.set(Math.cos(a) * 3.5, beamH / 2, Math.sin(a) * 3.5);
        beam.rotation.z = (rand() - 0.5) * 0.25;
        group.add(beam);
      }
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.15, 6, 12), beamMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 3 + i * 4;
        group.add(ring);
      }
      const emberGlow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff6a2e, emissive: 0xff4a1a, emissiveIntensity: 1 }));
      emberGlow.position.set(0, 1, 0);
      group.add(emberGlow);
      glowParts.push(emberGlow.material);
      break;
    }
    case 'crimson': { // jagged dark crimson spike formation
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0x4a0f0f, emissive: 0xcc2222, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0.3 });
      for (let i = 0; i < 6; i++) {
        const h = 14 + rand() * 20;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(1 + rand(), h, 4), spikeMat);
        const a = (i / 6) * Math.PI * 2, r = rand() * 6;
        spike.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
        spike.rotation.y = rand() * Math.PI;
        group.add(spike);
      }
      glowParts.push(spikeMat);
      break;
    }
    case 'toxic': { // leaking containment silo
      const siloMat = new THREE.MeshStandardMaterial({ color: 0x4a5a4a, metalness: 0.5, roughness: 0.5 });
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 18, 12), siloMat);
      silo.position.y = 9;
      group.add(silo);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), siloMat);
      cap.position.y = 18;
      group.add(cap);
      const oozeMat = new THREE.MeshStandardMaterial({ color: 0x6aff4a, emissive: 0x4aff2a, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 });
      const ooze = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 5.5, 5, 12, 1, true), oozeMat);
      ooze.position.y = 2.5;
      group.add(ooze);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 16), oozeMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.02;
      group.add(pool);
      glowParts.push(oozeMat);
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

  // ---- find a steep hillside for the mineshaft, before scattering rocks/crystals, so those can avoid it ----
  let mineX = 0, mineZ = 0, mineY = -Infinity, mineFacing = 0, bestScore = -Infinity;
  for (let attempt = 0; attempt < 24; attempt++) {
    const tx = (rand() - 0.5) * planet.size * 0.7;
    const tz = (rand() - 0.5) * planet.size * 0.7;
    if (Math.hypot(tx, tz) < 16) continue;
    const h = groundHeightFn(tx, tz);
    const d = 5;
    const gx = groundHeightFn(tx + d, tz) - groundHeightFn(tx - d, tz);
    const gz = groundHeightFn(tx, tz + d) - groundHeightFn(tx, tz - d);
    const steepness = Math.hypot(gx, gz);
    const score = h * 0.6 + steepness * 4; // favor a high AND steep spot, i.e. a hillside, not a flat plain
    if (score > bestScore) {
      bestScore = score; mineX = tx; mineZ = tz; mineY = h;
      mineFacing = Math.atan2(gx, gz); // points downhill - the entrance faces outward from the slope
    }
  }

  // ---- decorative rocks ----
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 });
  const rockCount = Math.round(85 * (planet.size / 300));
  for (let i = 0; i < rockCount; i++) {
    const x = (rand() - 0.5) * planet.size * 0.9;
    const z = (rand() - 0.5) * planet.size * 0.9;
    if (Math.hypot(x, z) < 20) continue;
    if (Math.hypot(x - mineX, z - mineZ) < 22) continue;
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const s = 0.6 + rand() * 2.2;
    rock.scale.set(s, s * (0.6 + rand() * 0.6), s);
    rock.position.set(x, groundHeightFn(x, z) + s * 0.25, z);
    rock.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    rock.castShadow = true; rock.receiveShadow = true;
    scene.add(rock);
  }

  // ---- scattered surface mineral crystal clusters, color-matched to this planet's outfit accent ----
  const surfaceCrystalMat = new THREE.MeshStandardMaterial({ color: planet.outfitColor || 0x6fd7ff, emissive: planet.outfitColor || 0x6fd7ff, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.3 });
  const surfaceCrystalGeo = new THREE.ConeGeometry(0.35, 1, 5);
  const surfaceCrystalCount = Math.round(18 * (planet.size / 300));
  for (let i = 0; i < surfaceCrystalCount; i++) {
    const x = (rand() - 0.5) * planet.size * 0.85;
    const z = (rand() - 0.5) * planet.size * 0.85;
    if (Math.hypot(x, z) < 20) continue;
    if (Math.hypot(x - mineX, z - mineZ) < 22) continue;
    const cluster = new THREE.Group();
    const shardCount = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < shardCount; j++) {
      const shard = new THREE.Mesh(surfaceCrystalGeo, surfaceCrystalMat);
      const h = 0.6 + rand() * 1.3;
      shard.scale.set(0.6 + rand() * 0.6, h, 0.6 + rand() * 0.6);
      shard.position.set((rand() - 0.5) * 1.1, h / 2, (rand() - 0.5) * 1.1);
      shard.rotation.z = (rand() - 0.5) * 0.3;
      cluster.add(shard);
    }
    cluster.position.set(x, groundHeightFn(x, z), z);
    scene.add(cluster);
  }

  // ---- jungle worlds get actual trees scattered across the surface ----
  if (planet.theme === 'jungle') {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 1 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.95 });
    const canopyMat2 = new THREE.MeshStandardMaterial({ color: 0x3a8f3a, roughness: 0.95 });
    const treeCount = Math.round(70 * (planet.size / 300));
    for (let i = 0; i < treeCount; i++) {
      const x = (rand() - 0.5) * planet.size * 0.88;
      const z = (rand() - 0.5) * planet.size * 0.88;
      if (Math.hypot(x, z) < 18) continue;
      const tree = new THREE.Group();
      const h = 4 + rand() * 6;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 + rand() * 0.15, 0.35 + rand() * 0.2, h, 6), trunkMat);
      trunk.position.y = h / 2;
      trunk.castShadow = true;
      tree.add(trunk);
      const canopyCount = 2 + Math.floor(rand() * 3);
      for (let c = 0; c < canopyCount; c++) {
        const cs = 1.3 + rand() * 1.4;
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(cs, 8, 6), rand() > 0.5 ? canopyMat : canopyMat2);
        canopy.position.set((rand() - 0.5) * 1.4, h + cs * 0.4 + rand() * 1.0, (rand() - 0.5) * 1.4);
        canopy.castShadow = true;
        tree.add(canopy);
      }
      tree.position.set(x, groundHeightFn(x, z), z);
      tree.rotation.y = rand() * Math.PI;
      const s = 0.8 + rand() * 0.5;
      tree.scale.set(s, s, s);
      scene.add(tree);
    }
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
  const coinCount = Math.round(15 * (planet.size / 300));
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

  // ---- dig sites (mission reward + loot only; the cave now has its own permanent entrance below) ----
  const digSites = [];
  const digCount = planet.dugSites;
  const digKinds = ['mission', 'loot', 'loot'];
  for (let i = 0; i < digCount; i++) {
    let x, z;
    do {
      x = (rand() - 0.5) * planet.size * 0.7;
      z = (rand() - 0.5) * planet.size * 0.7;
    } while (Math.hypot(x, z) < 16);
    const kind = digKinds[i % digKinds.length];
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 }));
    mound.position.set(x, groundHeightFn(x, z), z);
    mound.scale.y = 0.55;
    const sparkle = makeSparkle(0xfff2a0);
    sparkle.position.set(x, groundHeightFn(x, z) + 0.5, z);
    scene.add(sparkle);

    mound.userData = { type: 'digSite', dug: false, kind, id: `dig${planetId}_${i}`, sparkle, beam: null };
    scene.add(mound);
    digSites.push(mound);
  }

  // ---- permanent mineshaft entrance, bored into the hillside found above (walk in/out any time) ----
  const mineEntrance = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 1 });
  const mountainMat = new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 });

  // rock mass the shaft appears bored into, stacked behind and above the doorway
  const mountainGeo = new THREE.IcosahedronGeometry(1, 0);
  const mountainRand = seededRand(planetId * 613 + 29);
  for (let i = 0; i < 7; i++) {
    const boulder = new THREE.Mesh(mountainGeo, mountainMat);
    const s = 3 + mountainRand() * 5;
    boulder.scale.set(s, s * (0.7 + mountainRand() * 0.5), s);
    boulder.position.set((mountainRand() - 0.5) * 5, s * 0.35, -1.5 - mountainRand() * 3.5);
    boulder.rotation.set(mountainRand() * Math.PI, mountainRand() * Math.PI, mountainRand() * Math.PI);
    boulder.castShadow = true; boulder.receiveShadow = true;
    mineEntrance.add(boulder);
  }

  // dark doorway recessed into the rock face, framed by timber - not a flat disc on open ground
  const doorway = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 3), new THREE.MeshStandardMaterial({ color: 0x120d08, roughness: 1 }));
  doorway.position.set(0, 1.3, -0.8);
  mineEntrance.add(doorway);
  const postGeo = new THREE.CylinderGeometry(0.22, 0.26, 3.0, 8);
  const postL = new THREE.Mesh(postGeo, woodMat); postL.position.set(-1.15, 1.5, 0.4);
  const postR = new THREE.Mesh(postGeo, woodMat); postR.position.set(1.15, 1.5, 0.4);
  mineEntrance.add(postL, postR);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 0.4), woodMat);
  beam.position.set(0, 2.85, 0.4);
  mineEntrance.add(beam);
  const railGeo = new THREE.BoxGeometry(0.1, 0.08, 3.2);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.6, roughness: 0.5 });
  const railL = new THREE.Mesh(railGeo, railMat); railL.position.set(-0.5, 0.02, 1.8);
  const railR = new THREE.Mesh(railGeo, railMat); railR.position.set(0.5, 0.02, 1.8);
  mineEntrance.add(railL, railR);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 0.9 }));
  lantern.position.set(-1.15, 2.4, 0.4);
  mineEntrance.add(lantern);

  // tall glowing blue beacon beam so the mineshaft is spottable from across the map
  const shaftBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.45, 30, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x6fd7ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
  );
  shaftBeam.position.set(0, 15.5, 0.4);
  mineEntrance.add(shaftBeam);

  mineEntrance.position.set(mineX, mineY, mineZ);
  mineEntrance.rotation.y = mineFacing;
  mineEntrance.userData = { type: 'mineEntrance', label: 'Enter Mineshaft', worldPos: new THREE.Vector3(mineX, mineY, mineZ), lantern, shaftBeam };
  scene.add(mineEntrance);

  // ---- cave interior (built far away, teleport target); size differs per planet ----
  const caveRadius = planet.caveRadius || 75;
  const caveHeight = Math.round(caveRadius * 0.43);
  const caveOrigin = new THREE.Vector3(3000 + planetId * 500, -6, 3000);
  const caveGroup = new THREE.Group();
  caveGroup.position.copy(caveOrigin);
  // uneven rocky floor with subtle noise bumps and mineral color streaking
  const floorGeo = new THREE.CircleGeometry(caveRadius, 48);
  const floorPos = floorGeo.attributes.position;
  const floorSeed = planetId * 233 + 41;
  const floorColorA = new THREE.Color(planet.ground2);
  const floorColorB = floorColorA.clone().multiplyScalar(0.6);
  const floorColors = [];
  for (let i = 0; i < floorPos.count; i++) {
    const lx = floorPos.getX(i), ly = floorPos.getY(i);
    const n = fbm(lx * 0.025, ly * 0.025, floorSeed, 3);
    floorPos.setZ(i, (n - 0.5) * 0.5);
    const c = floorColorA.clone().lerp(floorColorB, n);
    floorColors.push(c.r, c.g, c.b);
  }
  floorGeo.setAttribute('color', new THREE.Float32BufferAttribute(floorColors, 3));
  floorGeo.computeVertexNormals();
  const caveFloor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  caveFloor.rotation.x = -Math.PI / 2;
  caveFloor.position.y = -0.5;
  caveGroup.add(caveFloor);

  // organic, uneven cave wall - bulges and alcoves instead of a perfect cylinder
  const wallGeo = new THREE.CylinderGeometry(caveRadius + 0.4, caveRadius + 0.4, caveHeight, 28, 10, true);
  const wallPosAttr = wallGeo.attributes.position;
  const wallSeed = planetId * 191 + 71;
  const wallColorA = new THREE.Color(0x2a2018);
  const wallColorB = new THREE.Color(0x1c150f);
  const wallColors = [];
  for (let i = 0; i < wallPosAttr.count; i++) {
    const wx = wallPosAttr.getX(i), wy = wallPosAttr.getY(i), wz = wallPosAttr.getZ(i);
    const theta = Math.atan2(wz, wx);
    const n = fbm(Math.cos(theta) * 2.4, Math.sin(theta) * 2.4 + wy * 0.06, wallSeed, 3);
    const bump = (n - 0.5) * Math.min(9, caveRadius * 0.035);
    const r = Math.hypot(wx, wz);
    const newR = r + bump;
    wallPosAttr.setX(i, Math.cos(theta) * newR);
    wallPosAttr.setZ(i, Math.sin(theta) * newR);
    const c = wallColorA.clone().lerp(wallColorB, n);
    wallColors.push(c.r, c.g, c.b);
  }
  wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3));
  wallGeo.computeVertexNormals();
  const caveWall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.BackSide }));
  caveWall.position.y = caveHeight / 2 - 0.5;
  caveGroup.add(caveWall);
  // uneven ceiling: some spots hang lower, some rise higher, but it always stays flush with the wall rim
  const ceilGeo = new THREE.CircleGeometry(caveRadius, 28);
  const ceilPos = ceilGeo.attributes.position;
  const ceilSeed = planetId * 311 + 17;
  for (let i = 0; i < ceilPos.count; i++) {
    const lx = ceilPos.getX(i), ly = ceilPos.getY(i);
    const distFrac = Math.min(1, Math.hypot(lx, ly) / caveRadius);
    const edgeFalloff = Math.max(0, 1 - distFrac);
    const n = fbm(lx * 0.012, ly * 0.012, ceilSeed, 3);
    ceilPos.setZ(i, (n - 0.5) * caveHeight * 0.55 * edgeFalloff);
  }
  ceilGeo.computeVertexNormals();
  const caveCeil = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: 0x1a140f, roughness: 1, side: THREE.DoubleSide }));
  caveCeil.rotation.x = -Math.PI / 2;
  caveCeil.position.y = caveHeight - 0.5;
  caveGroup.add(caveCeil);

  // warm amber "dripstone cave" lighting, with one cool light for contrast (like the reference photo)
  const caveLightA = new THREE.PointLight(0xffaa55, 1.3, caveRadius * 1.3);
  caveLightA.position.set(0, caveHeight * 0.55, 0);
  caveGroup.add(caveLightA);
  const caveLightB = new THREE.PointLight(0xff8844, 0.85, caveRadius * 1.1);
  caveLightB.position.set(caveRadius * 0.45, caveHeight * 0.4, -caveRadius * 0.45);
  caveGroup.add(caveLightB);
  const caveLightC = new THREE.PointLight(0x6fd7ff, 0.6, caveRadius * 1.1);
  caveLightC.position.set(-caveRadius * 0.5, caveHeight * 0.4, caveRadius * 0.45);
  caveGroup.add(caveLightC);
  const caveLightD = new THREE.PointLight(0xffaa55, 0.7, caveRadius * 1.0);
  caveLightD.position.set(caveRadius * 0.5, caveHeight * 0.35, caveRadius * 0.5);
  caveGroup.add(caveLightD);

  const glowOrbGeo = new THREE.SphereGeometry(0.5, 10, 10);
  const glowOrbCount = Math.min(95, Math.round(caveRadius * 0.42));
  for (let i = 0; i < glowOrbCount; i++) {
    const o = new THREE.Mesh(glowOrbGeo, new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x6fd7ff : 0xffaa55 }));
    const a = (i / glowOrbCount) * Math.PI * 2;
    const rr = caveRadius * (0.35 + (i % 3) * 0.2);
    o.position.set(Math.cos(a) * rr, 0.5, Math.sin(a) * rr);
    caveGroup.add(o);
  }

  // scattered stalagmite formations rising from the floor (warm limestone tone)
  const stalagGeo = new THREE.ConeGeometry(1, 1, 7);
  const stalagMat = new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 1 });
  const caveRand = seededRand(planetId * 47 + 501);
  const stalagCount = Math.min(130, Math.round(caveRadius * 0.6));
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

  // dense hanging stalactites from the ceiling - the dominant feature of the reference cave
  const stalactiteMat = new THREE.MeshStandardMaterial({ color: 0x5a4834, roughness: 1 });
  const stalactiteCount = Math.min(160, Math.round(caveRadius * 0.75));
  for (let i = 0; i < stalactiteCount; i++) {
    const a = caveRand() * Math.PI * 2;
    const r = caveRand() * (caveRadius - 4);
    const t = new THREE.Mesh(stalagGeo, stalactiteMat);
    const h = 1.2 + caveRand() * 4.5;
    t.scale.set(0.6 + caveRand() * 0.9, h, 0.6 + caveRand() * 0.9);
    t.rotation.x = Math.PI;
    t.position.set(Math.cos(a) * r, caveHeight - 0.5 - h / 2, Math.sin(a) * r);
    t.rotation.y = caveRand() * Math.PI;
    caveGroup.add(t);
  }

  // still reflective water pool on the cave floor
  const poolRadius = caveRadius * (0.28 + caveRand() * 0.1);
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x0a1420, metalness: 0.95, roughness: 0.06, envMapIntensity: 1.2 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(poolRadius, 28), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(caveRadius * 0.12, 0.01, -caveRadius * 0.12);
  caveGroup.add(pool);

  // glowing mineral crystal clusters, color-matched to this planet's outfit accent
  const crystalMat = new THREE.MeshStandardMaterial({ color: planet.outfitColor || 0x6fd7ff, emissive: planet.outfitColor || 0x6fd7ff, emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.3 });
  const crystalGeo = new THREE.ConeGeometry(0.4, 1, 5);
  const crystalClusterCount = Math.min(32, Math.round(caveRadius / 10));
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
  const pillarCount = Math.min(34, Math.max(4, Math.round(caveRadius / 12)));
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
  const outfitMat = new THREE.MeshStandardMaterial({ color: outfitColor, emissive: outfitColor, emissiveIntensity: 0.55, metalness: 0.45, roughness: 0.3 });
  const outfitTrimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: outfitColor, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.2 });

  const outfitTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), outfitMat);
  outfitTorso.position.y = 0.55;
  outfit.add(outfitTorso);
  const outfitChestLight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), outfitTrimMat);
  outfitChestLight.position.set(0, 0.62, 0.19);
  outfit.add(outfitChestLight);

  // shoulder pauldrons
  const padGeo = new THREE.BoxGeometry(0.24, 0.16, 0.3);
  const padL = new THREE.Mesh(padGeo, outfitTrimMat); padL.position.set(-0.32, 0.86, 0);
  const padR = new THREE.Mesh(padGeo, outfitTrimMat); padR.position.set(0.32, 0.86, 0);
  outfit.add(padL, padR);

  // small arms
  const outfitArmGeo = new THREE.BoxGeometry(0.15, 0.42, 0.17);
  const outfitArmL = new THREE.Mesh(outfitArmGeo, outfitMat); outfitArmL.position.set(-0.34, 0.55, 0); outfitArmL.rotation.z = 0.18;
  const outfitArmR = new THREE.Mesh(outfitArmGeo, outfitMat); outfitArmR.position.set(0.34, 0.55, 0); outfitArmR.rotation.z = -0.18;
  outfit.add(outfitArmL, outfitArmR);

  // helmet with glowing visor
  const outfitHead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  outfitHead.position.y = 1.05;
  outfit.add(outfitHead);
  const outfitVisor = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: outfitColor, emissive: outfitColor, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.15 }));
  outfitVisor.position.set(0, 1.05, 0.12);
  outfitVisor.rotation.x = -0.15;
  outfit.add(outfitVisor);
  const outfitAntenna = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 5), outfitTrimMat);
  outfitAntenna.position.set(0, 1.28, 0);
  outfit.add(outfitAntenna);

  // twin display rings, like a trophy pedestal
  const outfitRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 20), new THREE.MeshBasicMaterial({ color: outfitColor }));
  outfitRing.rotation.x = Math.PI / 2;
  outfitRing.position.y = 0.05;
  outfit.add(outfitRing);
  const outfitRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  outfitRing2.rotation.x = Math.PI / 2;
  outfitRing2.position.y = 1.4;
  outfit.add(outfitRing2);

  outfit.position.set(-caveRadius * 0.5, 0.1, caveRadius * 0.35);
  outfit.userData = { type: 'caveOutfit', collected: false, suitColor: outfitColor, worldPos: caveOrigin.clone().add(outfit.position), ring2: outfitRing2 };
  caveGroup.add(outfit);

  // cave enemy spawn points (positions only; game.js instantiates the actual enemies)
  const caveEnemySpawns = [];
  const caveEnemyCount = Math.min(10, Math.max(3, Math.round(caveRadius / 15)));
  for (let i = 0; i < caveEnemyCount; i++) {
    const a = (i / caveEnemyCount) * Math.PI * 2 + 0.6;
    const r = caveRadius * 0.5;
    caveEnemySpawns.push({ x: caveOrigin.x + Math.cos(a) * r, y: caveOrigin.y, z: caveOrigin.z + Math.sin(a) * r });
  }

  // cave exit: bottom of a mineshaft, with a ladder climbing up out of view
  const caveExit = new THREE.Group();
  const exitWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 1 });
  const railGeoExit = new THREE.CylinderGeometry(0.05, 0.05, 8, 6);
  const ladderRailL = new THREE.Mesh(railGeoExit, exitWoodMat); ladderRailL.position.set(-0.5, 4, 0);
  const ladderRailR = new THREE.Mesh(railGeoExit, exitWoodMat); ladderRailR.position.set(0.5, 4, 0);
  caveExit.add(ladderRailL, ladderRailR);
  for (let i = 0; i < 9; i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), exitWoodMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, 0.6 + i * 0.9, 0);
    caveExit.add(rung);
  }
  const exitLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 0.9 }));
  exitLight.position.set(0.9, 1.6, 0);
  caveExit.add(exitLight);
  caveExit.position.set(0, 0, caveRadius * 0.4);
  caveExit.userData = { type: 'caveExit', label: 'Exit Mineshaft', worldPos: caveOrigin.clone().add(caveExit.position) };
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
    beacon, scrapPickups, coinPickups, partPickup, digSites, mineEntrance,
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
      if (outfit && !outfit.userData.collected) {
        outfit.rotation.y = t * 0.8;
        outfit.position.y = 0.1 + Math.sin(t * 1.6) * 0.15;
        outfit.userData.ring2.rotation.z = -t * 1.6;
      }
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
      mineEntrance.userData.lantern.material.emissiveIntensity = 0.7 + Math.sin(t * 4) * 0.3;
      mineEntrance.userData.shaftBeam.material.opacity = 0.2 + Math.sin(t * 2) * 0.12;
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
