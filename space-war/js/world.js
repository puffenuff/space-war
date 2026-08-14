
// per-theme ambient weather look: falling snow/ash/dust on most worlds, rising bubbles/spores
// on the reef and toxic worlds for variety. Keyed by planet.theme, one entry per planet.
const WEATHER_BY_THEME = {
  desert: { color: 0xd8b98a, count: 60, fallSpeed: 0.6, size: 1.6, rising: false, sway: 0.6 },
  ice: { color: 0xffffff, count: 140, fallSpeed: 3.2, size: 1.4, rising: false, sway: 0.9 },
  volcanic: { color: 0xff8a3a, count: 90, fallSpeed: 1.0, size: 1.5, rising: false, sway: 0.4 },
  jungle: { color: 0xcfffb0, count: 80, fallSpeed: 0.5, size: 1.3, rising: false, sway: 1.1 },
  swamp: { color: 0x9fc27a, count: 70, fallSpeed: 0.4, size: 1.3, rising: false, sway: 0.8 },
  canyon: { color: 0xe0c090, count: 55, fallSpeed: 0.7, size: 1.5, rising: false, sway: 0.7 },
  crystal: { color: 0xff9dff, count: 90, fallSpeed: 0.35, size: 1.6, rising: false, sway: 0.6 },
  storm: { color: 0xaeccff, count: 220, fallSpeed: 9.0, size: 1.2, rising: false, sway: 0.2 },
  lunar: { color: 0xcfcfd8, count: 40, fallSpeed: 0.5, size: 1.3, rising: false, sway: 0.3 },
  reef: { color: 0xbfffef, count: 90, fallSpeed: 1.6, size: 1.4, rising: true, sway: 0.5 },
  ashlands: { color: 0x9a9088, count: 100, fallSpeed: 1.2, size: 1.5, rising: false, sway: 0.5 },
  crimson: { color: 0xff8a7a, count: 75, fallSpeed: 0.6, size: 1.5, rising: false, sway: 0.6 },
  toxic: { color: 0xbaff5a, count: 85, fallSpeed: 1.1, size: 1.5, rising: true, sway: 0.7 },
  alien: { color: 0xd9a8ff, count: 90, fallSpeed: 0.5, size: 1.5, rising: false, sway: 0.9 },
};

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildTerrain(planet, heightFn) {
  const size = planet.size;
  const segs = Math.min(220, Math.round(70 + size / 8));
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const cA = new THREE.Color(planet.ground);
  const cB = new THREE.Color(planet.ground2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightFn(x, z);
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
  // eased toward deep space rather than the raw atmospheric color, so the sky doesn't read
  // as a flat cartoon backdrop - the stars/sky-planets layered in below sell the rest
  scene.background = new THREE.Color(planet.sky).lerp(new THREE.Color(0x05070f), 0.3);
  // fog draw distance is capped rather than scaled with planet.size - on a much bigger map
  // that keeps rendering/decoration cost bounded (nothing needs to be drawn crisply far past
  // this regardless of how big the map is) while the horizon skirt still makes the ground
  // look like it continues past where the fog takes over
  const fogFarDist = Math.min(planet.size * 0.85, 700);
  scene.fog = new THREE.Fog(planet.fog, 40, fogFarDist);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
  scene.add(sun);

  // ---- sky dressing: distant stars + a glowing sun/moon + other worlds, so every planet reads
  // as a real vista - all parented under one group that game.js recenters on the player each
  // frame (like a skybox), so it stays overhead no matter how far you wander on a big map ----
  const skyGroup = new THREE.Group();
  scene.add(skyGroup);

  const starGeo = new THREE.BufferGeometry();
  const starCount = 260;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = rand() * Math.PI * 0.45;
    const r = 900 + rand() * 200;
    starPositions[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
    starPositions[i * 3 + 1] = Math.cos(phi) * r * 0.6 + 120;
    starPositions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.55, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  skyGroup.add(stars);

  const sunGlowColor = new THREE.Color(planet.outfitColor).lerp(new THREE.Color(0xffffff), 0.45);
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: sunGlowColor, transparent: true, opacity: 0.85, fog: false }));
  sunSprite.scale.set(90, 90, 1);
  sunSprite.position.set(300, 260, -400);
  skyGroup.add(sunSprite);
  const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xdcdefc, transparent: true, opacity: 0.5, fog: false }));
  moonSprite.scale.set(38, 38, 1);
  moonSprite.position.set(-380, 300, 250);
  skyGroup.add(moonSprite);

  // other worlds in this system, visible hanging in the sky - real shaded spheres (not flat
  // sprites) borrowing colors from other planets' data, so the sky hints that a whole system
  // of worlds exists beyond this one. Positions are seeded, so each planet's sky is fixed.
  const otherPlanetIds = PLANET_ID_LIST.filter((id) => id !== planetId);
  const skyPlanetCount = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < skyPlanetCount; i++) {
    const srcPlanet = PLANETS[otherPlanetIds[Math.floor(rand() * otherPlanetIds.length)]];
    const theta = rand() * Math.PI * 2;
    const phi = rand() * Math.PI * 0.35;
    const r = 550 + rand() * 250;
    const skyPlanetRadius = 18 + rand() * 22;
    const skyPlanet = new THREE.Mesh(
      new THREE.SphereGeometry(skyPlanetRadius, 14, 10),
      new THREE.MeshStandardMaterial({ color: srcPlanet.ground, roughness: 0.85, emissive: srcPlanet.ground, emissiveIntensity: 0.15, fog: false })
    );
    skyPlanet.position.set(Math.cos(theta) * Math.sin(phi) * r, Math.cos(phi) * r * 0.5 + 150, Math.sin(theta) * Math.sin(phi) * r);
    skyGroup.add(skyPlanet);
  }

  // ---- ambient weather, themed per planet (falling snow/ash/dust, rising bubbles/spores...) ----
  const weatherCfg = (WEATHER_BY_THEME[planet.theme] || WEATHER_BY_THEME.desert);
  // capped rather than scaled with planet.size - these are static positions (they don't
  // follow the player), so scattering them across a map far bigger than the fog/view
  // distance would just waste most of them where they're never seen
  const weatherRadius = Math.min(planet.size * 0.42, 400);
  const weatherHeight = 60;
  const weatherGeo = new THREE.BufferGeometry();
  const weatherPositions = new Float32Array(weatherCfg.count * 3);
  const weatherSeeds = new Float32Array(weatherCfg.count);
  for (let i = 0; i < weatherCfg.count; i++) {
    weatherPositions[i * 3] = (rand() - 0.5) * weatherRadius * 2;
    weatherPositions[i * 3 + 1] = rand() * weatherHeight;
    weatherPositions[i * 3 + 2] = (rand() - 0.5) * weatherRadius * 2;
    weatherSeeds[i] = rand() * 100;
  }
  weatherGeo.setAttribute('position', new THREE.BufferAttribute(weatherPositions, 3));
  const weatherMat = new THREE.PointsMaterial({ color: weatherCfg.color, size: weatherCfg.size, transparent: true, opacity: 0.7, depthWrite: false });
  const weatherPoints = new THREE.Points(weatherGeo, weatherMat);
  scene.add(weatherPoints);

  // ---- occasional weather EVENTS layered on top of the constant ambient weather above:
  // sandstorms (dusty worlds only - tints sky/fog and thickens the dust) and meteor showers
  // (any world - streaking objects falling from high up). Both fade in/out over a few seconds.
  const SANDSTORM_THEMES = ['desert', 'canyon', 'ashlands', 'volcanic', 'toxic'];
  const canSandstorm = SANDSTORM_THEMES.indexOf(planet.theme) !== -1;
  const baseFogNear = 40, baseFogFar = fogFarDist;
  const baseSkyColor = new THREE.Color(planet.sky);
  const baseFogColor = new THREE.Color(planet.fog);
  const sandstormColor = new THREE.Color(0xc9a066);
  let weatherEvent = null;
  let weatherEventCooldown = 30 + Math.random() * 40;
  const meteors = [];
  const meteorGeo = new THREE.ConeGeometry(0.4, 3.5, 6);
  function spawnMeteor() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffcf6a, fog: false, transparent: true, opacity: 1 });
    const m = new THREE.Mesh(meteorGeo, mat);
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * planet.size * 0.4;
    m.position.set(Math.cos(a) * r, 220 + Math.random() * 80, Math.sin(a) * r);
    const dir = new THREE.Vector3((Math.random() - 0.5) * 0.3, -1, (Math.random() - 0.5) * 0.3).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    m.userData = { dir, speed: 90 + Math.random() * 40, life: 4 };
    scene.add(m);
    meteors.push(m);
  }
  function updateMeteors(dt) {
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.position.addScaledVector(m.userData.dir, m.userData.speed * dt);
      m.userData.life -= dt;
      m.material.opacity = Math.max(0, Math.min(1, m.userData.life));
      if (m.userData.life <= 0 || m.position.y < -20) {
        scene.remove(m);
        meteors.splice(i, 1);
      }
    }
  }
  function startWeatherEvent(type) {
    weatherEvent = { type, timer: 0, duration: type === 'sandstorm' ? (18 + Math.random() * 12) : (14 + Math.random() * 10), nextMeteorAt: 0.4 };
    if (type === 'sandstorm') {
      sfx.windGust();
      ui.showToast('A sandstorm rolls in...');
    } else {
      ui.showToast('A meteor shower streaks overhead!');
    }
  }
  function updateWeatherEvent(dt) {
    const we = weatherEvent;
    we.timer += dt;
    const strength = Math.max(0, Math.min(Math.min(1, we.timer / 3), Math.min(1, (we.duration - we.timer) / 3)));
    if (we.type === 'sandstorm') {
      scene.fog.color.copy(baseFogColor).lerp(sandstormColor, strength * 0.85);
      scene.background.copy(baseSkyColor).lerp(sandstormColor, strength * 0.7);
      scene.fog.near = baseFogNear * (1 - strength * 0.3);
      scene.fog.far = baseFogFar * (1 - strength * 0.55);
      weatherMat.opacity = 0.7 + strength * 0.3;
      weatherMat.size = weatherCfg.size * (1 + strength * 1.4);
    } else {
      we.nextMeteorAt -= dt;
      if (we.nextMeteorAt <= 0 && strength > 0.15) {
        we.nextMeteorAt = 0.25 + Math.random() * 0.5;
        spawnMeteor();
      }
    }
    if (we.timer >= we.duration) {
      if (we.type === 'sandstorm') {
        scene.fog.color.copy(baseFogColor);
        scene.background.copy(baseSkyColor);
        scene.fog.near = baseFogNear; scene.fog.far = baseFogFar;
        weatherMat.opacity = 0.7; weatherMat.size = weatherCfg.size;
      }
      weatherEvent = null;
      weatherEventCooldown = 45 + Math.random() * 70;
    }
  }

  // ---- find a steep hillside for the mineshaft first (using the raw, unflattened height),
  // so the terrain built below can be shaped around it instead of the entrance getting
  // placed on top of a slope and swallowed by it ----
  function rawHeightFn(x, z) {
    return terrainHeight(x, z, seed, 7 + planet.hills * 0.4);
  }
  let mineX = 0, mineZ = 0, mineY = -Infinity, mineFacing = 0, bestScore = -Infinity;
  for (let attempt = 0; attempt < 24; attempt++) {
    const tx = (rand() - 0.5) * planet.size * 0.7;
    const tz = (rand() - 0.5) * planet.size * 0.7;
    if (Math.hypot(tx, tz) < 16) continue;
    const h = rawHeightFn(tx, tz);
    const d = 5;
    const gx = rawHeightFn(tx + d, tz) - rawHeightFn(tx - d, tz);
    const gz = rawHeightFn(tx, tz + d) - rawHeightFn(tx, tz - d);
    const steepness = Math.hypot(gx, gz);
    const dist = Math.hypot(tx, tz);
    // favor a high AND steep spot (a hillside, not a flat plain), with a mild pull toward
    // spawn so the mineshaft doesn't end up so far away it's lost in the distance fog
    const score = h * 0.6 + steepness * 4 - dist * 0.03;
    if (score > bestScore) {
      bestScore = score; mineX = tx; mineZ = tz; mineY = h;
      mineFacing = Math.atan2(gx, gz); // points downhill - the entrance faces outward from the slope
    }
  }

  // flatten a clean pad of real terrain around the mineshaft site, blending back to the
  // natural slope further out - without this, the actual hill (which we picked *because*
  // it's steep) rises up around the small entrance structure and swallows it
  const minePadRadius = 20, minePadBlend = 42;
  function groundHeightFn(x, z) {
    const raw = rawHeightFn(x, z);
    const d = Math.hypot(x - mineX, z - mineZ);
    if (d >= minePadBlend) return raw;
    const t = Math.max(0, Math.min(1, (d - minePadRadius) / (minePadBlend - minePadRadius)));
    return mineY * (1 - t) + raw * t;
  }

  const terrain = buildTerrain(planet, groundHeightFn);
  scene.add(terrain);

  // ---- extended ground beyond the real terrain edge, so the invisible boundary wall
  // (see game.js clampToWorldBoundary) never lets the player see the world just stop - a
  // single big flat plane sits at roughly the terrain's own edge height (sampled around the
  // boundary and averaged, with a small positive bias so it overlaps rather than gaps) and
  // stretches out past the fog's draw distance in every direction ----
  let edgeHeightSum = 0;
  const edgeSampleCount = 16;
  for (let i = 0; i < edgeSampleCount; i++) {
    const ang = (i / edgeSampleCount) * Math.PI * 2;
    edgeHeightSum += groundHeightFn(Math.cos(ang) * (planet.size / 2 - 2), Math.sin(ang) * (planet.size / 2 - 2));
  }
  // a ring, not a filled disc/plane - its inner radius clears the terrain square's farthest
  // corners with margin, so it can never overlap (and potentially render in front of / hide)
  // anything standing on the actual playable terrain
  const skirtInner = Math.SQRT2 * (planet.size / 2) + 20;
  const skirtOuter = planet.size * 5;
  const skirt = new THREE.Mesh(
    new THREE.RingGeometry(skirtInner, skirtOuter, 48, 1).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1, side: THREE.DoubleSide })
  );
  skirt.position.y = (edgeHeightSum / edgeSampleCount) + 1.5;
  scene.add(skirt);

  // ---- signature landmark ----
  const landmark = buildLandmark(planet, groundHeightFn, rand);
  scene.add(landmark);

  // ---- decorative rocks ----
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: planet.ground2, roughness: 1 });
  const rockCount = Math.min(500, Math.round(130 * (planet.size / 300)));
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
  const surfaceCrystalCount = Math.min(90, Math.round(30 * (planet.size / 300)));
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
    const treeCount = Math.min(350, Math.round(100 * (planet.size / 300)));
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
  const coinCount = Math.min(60, Math.round(15 * (planet.size / 300)));
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

  // ---- broken shuttle wreck: crashed somewhere out on the surface, holds a blueprint
  // microchip needed (along with enough ore) to make this world's atmosphere inhabitable ----
  let shuttleX, shuttleZ;
  do {
    shuttleX = (rand() - 0.5) * planet.size * 0.75;
    shuttleZ = (rand() - 0.5) * planet.size * 0.75;
  } while (Math.hypot(shuttleX, shuttleZ) < 30 || Math.hypot(shuttleX - mineX, shuttleZ - mineZ) < 30);
  const shuttleGroup = new THREE.Group();
  const shuttleHullMat = new THREE.MeshStandardMaterial({ color: 0x8a8f9a, metalness: 0.5, roughness: 0.6 });
  const shuttleDarkMat = new THREE.MeshStandardMaterial({ color: 0x201d1a, roughness: 0.9 });
  const shuttleHull = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 7, 10), shuttleHullMat);
  shuttleHull.rotation.z = Math.PI / 2 + 0.25;
  shuttleHull.position.y = 1.2;
  shuttleHull.castShadow = true;
  shuttleGroup.add(shuttleHull);
  const shuttleGap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.3), shuttleDarkMat);
  shuttleGap.position.set(-1.0, 1.4, 0.2);
  shuttleGroup.add(shuttleGap);
  const shuttleCockpit = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0x1a2a33, metalness: 0.4, roughness: 0.3 }));
  shuttleCockpit.position.set(3.0, 1.5, 0);
  shuttleCockpit.rotation.z = Math.PI / 2;
  shuttleGroup.add(shuttleCockpit);
  const shuttleWing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 1.3), shuttleHullMat);
  shuttleWing.position.set(0.6, 0.4, 1.6);
  shuttleWing.rotation.z = 0.5; shuttleWing.rotation.y = 0.3;
  shuttleGroup.add(shuttleWing);
  const scorchMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.6 + rand() * 0.5, 8), scorchMat);
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.set((rand() - 0.5) * 3, 0.02, (rand() - 0.5) * 2);
    shuttleGroup.add(scorch);
  }
  const chipGlow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.18), new THREE.MeshStandardMaterial({ color: 0x6fffea, emissive: 0x6fffea, emissiveIntensity: 0.8 }));
  chipGlow.position.set(-1.0, 0.9, 0.2);
  shuttleGroup.add(chipGlow);
  shuttleGroup.position.set(shuttleX, groundHeightFn(shuttleX, shuttleZ), shuttleZ);
  shuttleGroup.rotation.y = rand() * Math.PI * 2;
  shuttleGroup.userData = { type: 'shuttleWreck', searched: false, chipGlow };
  scene.add(shuttleGroup);

  // ---- ore chests: some out in the open, more tucked in the "special area" cave below ----
  const oreChestMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.6, roughness: 0.4, emissive: 0x5a3010, emissiveIntensity: 0.25 });
  const oreChestGeo = new THREE.BoxGeometry(1.0, 0.75, 0.8);
  const oreChests = [];
  const oreChestCount = 3;
  for (let i = 0; i < oreChestCount; i++) {
    let ox, oz;
    do {
      ox = (rand() - 0.5) * planet.size * 0.8;
      oz = (rand() - 0.5) * planet.size * 0.8;
    } while (Math.hypot(ox, oz) < 20 || Math.hypot(ox - mineX, oz - mineZ) < 20 || Math.hypot(ox - shuttleX, oz - shuttleZ) < 15);
    const chest = new THREE.Mesh(oreChestGeo, oreChestMat);
    chest.position.set(ox, groundHeightFn(ox, oz) + 0.02, oz);
    chest.rotation.y = rand() * Math.PI;
    chest.castShadow = true;
    chest.userData = { type: 'oreChest', collected: false, amount: 5 + Math.floor(rand() * 4) };
    scene.add(chest);
    oreChests.push(chest);
  }

  // ---- permanent mineshaft entrance, bored into the hillside found above (walk in/out any time) ----
  const mineEntrance = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 1 });
  // steered toward neutral grey stone instead of planet.ground2 - the terrain shader also
  // shades high/steep ground toward ground2, so using that color made the whole mountain
  // camouflage into the hillside it's sitting on
  const mountainColor = new THREE.Color(planet.ground2).lerp(new THREE.Color(0x4a4a4a), 0.6);
  const mountainMat = new THREE.MeshStandardMaterial({ color: mountainColor, roughness: 0.9 });

  // one big, tall mountain peak (not scattered boulders) that the shaft is bored into.
  // each cone's footprint (center z + radius) is kept behind the doorway's opening (z ~0.7)
  // so the rock mass reads as "behind/around" the entrance instead of bulging out over it
  const mountainRand = seededRand(planetId * 613 + 29);
  const peak = new THREE.Mesh(new THREE.ConeGeometry(17, 50, 9), mountainMat);
  peak.position.set(1, 24, -18);
  peak.rotation.y = mountainRand() * Math.PI;
  peak.castShadow = true; peak.receiveShadow = true;
  mineEntrance.add(peak);
  // smaller shoulder peaks so it reads as a mountain, not one perfect cone
  [[-9, 15, -10, 9, 30], [8, 12, -8, 7, 24], [-2, 9, -7, 6, 20]].forEach(([px, py, pz, r, h]) => {
    const shoulder = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mountainMat);
    shoulder.position.set(px, py, pz);
    shoulder.rotation.y = mountainRand() * Math.PI;
    shoulder.castShadow = true; shoulder.receiveShadow = true;
    mineEntrance.add(shoulder);
  });
  // boulders at the base where the mountain meets the ground - kept off to the sides,
  // well clear of the doorway and its walkway, so the entrance never gets buried
  const boulderGeo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 5; i++) {
    const boulder = new THREE.Mesh(boulderGeo, mountainMat);
    const s = 1.5 + mountainRand() * 2.5;
    boulder.scale.set(s, s * (0.7 + mountainRand() * 0.5), s);
    const side = i % 2 === 0 ? 1 : -1;
    const bx = side * (2.6 + mountainRand() * 4.5);
    const bz = -1 + mountainRand() * 3;
    boulder.position.set(bx, s * 0.35, bz);
    boulder.rotation.set(mountainRand() * Math.PI, mountainRand() * Math.PI, mountainRand() * Math.PI);
    boulder.castShadow = true; boulder.receiveShadow = true;
    mineEntrance.add(boulder);
  }

  // rock flanking the sides and top of the doorway, so the entrance reads as carved into
  // solid stone up close (not just distant mountain peaks). Each piece's forward reach
  // (center z + its own radius) is capped behind doorwaySafeFrontZ, so this can never
  // grow forward and re-cover the opening the way the old boulders/peaks used to.
  const doorwaySafeFrontZ = -0.3;
  [-1, 1].forEach((side) => {
    for (let j = 0; j < 3; j++) {
      const flank = new THREE.Mesh(boulderGeo, mountainMat);
      const s = 1.6 + mountainRand() * 1.3;
      flank.scale.set(s, s * (0.9 + mountainRand() * 0.6), s);
      const fx = side * (2.3 + j * 1.1 + mountainRand() * 0.5);
      const fy = 0.4 + j * 1.5 + mountainRand() * 0.4;
      const fz = doorwaySafeFrontZ - s - mountainRand() * 2.5;
      flank.position.set(fx, fy, fz);
      flank.rotation.set(mountainRand() * Math.PI, mountainRand() * Math.PI, mountainRand() * Math.PI);
      flank.castShadow = true; flank.receiveShadow = true;
      mineEntrance.add(flank);
    }
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 3.6), mountainMat);
  lintel.position.set(0, 4.4, -3);
  lintel.rotation.set((mountainRand() - 0.5) * 0.12, (mountainRand() - 0.5) * 0.15, (mountainRand() - 0.5) * 0.08);
  lintel.castShadow = true; lintel.receiveShadow = true;
  mineEntrance.add(lintel);

  // dark doorway recessed into the rock face, framed by timber
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
  // extra support planks visibly jutting out of the mountain face around the entrance
  const plankGeo = new THREE.BoxGeometry(0.18, 0.18, 3.4);
  [[-2.0, 2.2, -0.4, 0.35], [2.1, 1.7, -0.6, -0.25], [-1.6, 0.9, -0.8, 0.15], [1.8, 3.1, -0.5, -0.4]].forEach(([px, py, pz, rx]) => {
    const plank = new THREE.Mesh(plankGeo, woodMat);
    plank.position.set(px, py, pz);
    plank.rotation.x = rx;
    plank.rotation.y = (mountainRand() - 0.5) * 0.5;
    mineEntrance.add(plank);
  });
  const railGeo = new THREE.BoxGeometry(0.1, 0.08, 3.2);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.6, roughness: 0.5 });
  const railL = new THREE.Mesh(railGeo, railMat); railL.position.set(-0.5, 0.02, 1.8);
  const railR = new THREE.Mesh(railGeo, railMat); railR.position.set(0.5, 0.02, 1.8);
  mineEntrance.add(railL, railR);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 0.9 }));
  lantern.position.set(-1.15, 2.4, 0.4);
  mineEntrance.add(lantern);

  // tall glowing blue beacon beam so the mineshaft is spottable from across the map -
  // fog disabled so it stays bright at distance instead of fading into the sky color
  const shaftBeamMat = new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, fog: false });
  const shaftBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.6, 42, 8, 1, true), shaftBeamMat);
  shaftBeam.position.set(0, 21.5, 0.4);
  mineEntrance.add(shaftBeam);
  const beaconGlow = new THREE.PointLight(0x7fe0ff, 1.2, 60);
  beaconGlow.position.set(0, 12, 0.4);
  mineEntrance.add(beaconGlow);

  mineEntrance.position.set(mineX, mineY, mineZ);
  mineEntrance.rotation.y = mineFacing;
  mineEntrance.userData = { type: 'mineEntrance', label: 'Enter Mineshaft', worldPos: new THREE.Vector3(mineX, mineY, mineZ), lantern, shaftBeam };
  scene.add(mineEntrance);

  // ---- cave interior (built far away, teleport target); size differs per planet ----
  const caveRadius = planet.caveRadius || 75;
  // ceiling kept much lower than radius would suggest - a tall ceiling sits outside light range and just reads as a flat black void
  const caveHeight = Math.round(Math.min(40, Math.max(20, caveRadius * 0.13)));
  const caveOrigin = new THREE.Vector3(3000 + planetId * 500, -6, 3000);
  const caveGroup = new THREE.Group();
  caveGroup.position.copy(caveOrigin);
  const caveRand = seededRand(planetId * 47 + 501);
  // reserve a clear lane for the secret vault trail (built further below) so stalagmites,
  // pillars, and crystal clusters never spawn on top of it and block the path
  const secretTrailZoneStartZ = -caveRadius * 0.58;
  const secretTrailZoneEndZ = -caveRadius * 0.99;
  const secretTrailHalfWidth = 6;
  function inSecretTrailZone(x, z) {
    if (!planet.secretRoom) return false;
    return z <= secretTrailZoneStartZ && z >= secretTrailZoneEndZ && Math.abs(x) < secretTrailHalfWidth;
  }
  // uneven rocky floor with subtle noise bumps and mineral color streaking
  const floorGeo = new THREE.CircleGeometry(caveRadius, 48);
  const floorPos = floorGeo.attributes.position;
  const floorSeed = planetId * 233 + 41;
  const floorColorA = new THREE.Color(planet.ground2).lerp(new THREE.Color(0xffffff), 0.15);
  const floorColorB = new THREE.Color(planet.ground2).multiplyScalar(0.85);
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

  // dramatic god-ray light shafts from gaps in the ceiling
  const rayCount = 3;
  const godRays = [];
  for (let i = 0; i < rayCount; i++) {
    const ra = caveRand() * Math.PI * 2;
    const rr = caveRadius * (0.15 + caveRand() * 0.4);
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xffcf8a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 4.5, caveHeight * 1.05, 10, 1, true), rayMat);
    ray.position.set(Math.cos(ra) * rr, caveHeight * 0.48, Math.sin(ra) * rr);
    ray.rotation.z = (caveRand() - 0.5) * 0.25;
    ray.rotation.x = (caveRand() - 0.5) * 0.25;
    caveGroup.add(ray);
    godRays.push(ray);
    const rayLight = new THREE.PointLight(0xffcf8a, 0.5, caveRadius * 0.5);
    rayLight.position.set(ray.position.x, 1.5, ray.position.z);
    caveGroup.add(rayLight);
  }

  const glowOrbGeo = new THREE.SphereGeometry(0.5, 10, 10);
  const glowOrbCount = Math.min(95, Math.round(caveRadius * 0.42));
  for (let i = 0; i < glowOrbCount; i++) {
    const a = (i / glowOrbCount) * Math.PI * 2;
    const rr = caveRadius * (0.35 + (i % 3) * 0.2);
    const ox = Math.cos(a) * rr, oz = Math.sin(a) * rr;
    if (inSecretTrailZone(ox, oz)) continue;
    const o = new THREE.Mesh(glowOrbGeo, new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x6fd7ff : 0xffaa55 }));
    o.position.set(ox, 0.5, oz);
    caveGroup.add(o);
  }

  // slow-drifting glowing dust motes for atmosphere
  const moteGeo = new THREE.SphereGeometry(0.09, 6, 6);
  const moteCount = Math.min(26, Math.round(caveRadius * 0.12));
  const dustMotes = [];
  for (let i = 0; i < moteCount; i++) {
    const mote = new THREE.Mesh(moteGeo, new THREE.MeshBasicMaterial({ color: caveRand() > 0.5 ? 0xffcf8a : 0x9fe0ff, transparent: true, opacity: 0.7 }));
    const a = caveRand() * Math.PI * 2;
    const r = caveRand() * caveRadius * 0.75;
    mote.position.set(Math.cos(a) * r, 1 + caveRand() * (caveHeight * 0.6), Math.sin(a) * r);
    mote.userData = { baseY: mote.position.y, baseR: r, angle: a, speed: 0.05 + caveRand() * 0.1, bobPhase: caveRand() * Math.PI * 2 };
    caveGroup.add(mote);
    dustMotes.push(mote);
  }

  // scattered stalagmite formations rising from the floor (warm limestone tone)
  const stalagGeo = new THREE.ConeGeometry(1, 1, 7);
  const stalagMat = new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 1 });
  const stalagCount = Math.min(130, Math.round(caveRadius * 0.6));
  for (let i = 0; i < stalagCount; i++) {
    let sx, sz, tries = 0;
    do {
      const a = caveRand() * Math.PI * 2;
      const r = 6 + caveRand() * (caveRadius - 10);
      sx = Math.cos(a) * r; sz = Math.sin(a) * r;
      tries++;
    } while (inSecretTrailZone(sx, sz) && tries < 6);
    if (inSecretTrailZone(sx, sz)) continue;
    const s = new THREE.Mesh(stalagGeo, stalagMat);
    const h = 1.5 + caveRand() * 3.5;
    s.scale.set(0.8 + caveRand() * 1.2, h, 0.8 + caveRand() * 1.2);
    s.position.set(sx, -0.5 + h / 2, sz);
    s.rotation.y = caveRand() * Math.PI;
    caveGroup.add(s);
  }

  // dense hanging stalactites from the ceiling - the dominant feature of the reference cave
  const stalactiteMat = new THREE.MeshStandardMaterial({ color: 0x5a4834, roughness: 1 });
  const stalactiteCount = Math.min(160, Math.round(caveRadius * 0.75));
  for (let i = 0; i < stalactiteCount; i++) {
    let tx, tz, tries = 0;
    do {
      const a = caveRand() * Math.PI * 2;
      const r = caveRand() * (caveRadius - 4);
      tx = Math.cos(a) * r; tz = Math.sin(a) * r;
      tries++;
    } while (inSecretTrailZone(tx, tz) && tries < 6);
    if (inSecretTrailZone(tx, tz)) continue;
    const t = new THREE.Mesh(stalagGeo, stalactiteMat);
    const h = 1.2 + caveRand() * 4.5;
    t.scale.set(0.6 + caveRand() * 0.9, h, 0.6 + caveRand() * 0.9);
    t.rotation.x = Math.PI;
    t.position.set(tx, caveHeight - 0.5 - h / 2, tz);
    t.rotation.y = caveRand() * Math.PI;
    caveGroup.add(t);
  }

  // still reflective water pool on the cave floor
  const poolRadius = caveRadius * (0.28 + caveRand() * 0.1);
  // no scene envMap exists, so a near-black high-metalness material has nothing to
  // reflect and renders as a flat black disc - use a lit, low-metalness "dark water"
  // look instead so point lights actually show up on the surface
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x123a4a, emissive: 0x0a1f28, emissiveIntensity: 0.3, metalness: 0.2, roughness: 0.1 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(poolRadius, 28), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(caveRadius * 0.12, 0.01, -caveRadius * 0.12);
  caveGroup.add(pool);

  // a small waterfall trickling down the wall into the pool
  const fallHeight = caveHeight * 0.55;
  const fallX = pool.position.x + poolRadius * 0.7;
  const fallZ = pool.position.z + poolRadius * 0.5;
  const waterMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(1.4, fallHeight), waterMat);
  waterfall.position.set(fallX, fallHeight / 2, fallZ);
  waterfall.rotation.y = Math.atan2(fallX - pool.position.x, fallZ - pool.position.z) + Math.PI;
  caveGroup.add(waterfall);
  const splashMat = new THREE.MeshBasicMaterial({ color: 0xdfF4ff, transparent: true, opacity: 0.5 });
  const splash = new THREE.Mesh(new THREE.CircleGeometry(1.6, 12), splashMat);
  splash.rotation.x = -Math.PI / 2;
  splash.position.set(fallX, 0.03, fallZ);
  caveGroup.add(splash);

  // glowing mineral crystal clusters, color-matched to this planet's outfit accent
  const crystalMat = new THREE.MeshStandardMaterial({ color: planet.outfitColor || 0x6fd7ff, emissive: planet.outfitColor || 0x6fd7ff, emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.3 });
  const crystalGeo = new THREE.ConeGeometry(0.4, 1, 5);
  const crystalClusterCount = Math.min(32, Math.round(caveRadius / 10));
  for (let i = 0; i < crystalClusterCount; i++) {
    let cx, cz, tries = 0;
    do {
      const a = caveRand() * Math.PI * 2;
      const r = 8 + caveRand() * (caveRadius - 14);
      cx = Math.cos(a) * r; cz = Math.sin(a) * r;
      tries++;
    } while (inSecretTrailZone(cx, cz) && tries < 6);
    if (inSecretTrailZone(cx, cz)) continue;
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
    cluster.position.set(cx, 0, cz);
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

  // rock columns that span floor to ceiling - bumpy, noise-displaced surface instead of a smooth cylinder
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e1e26, roughness: 1 });
  const pillarRand = seededRand(planetId * 71 + 909);
  const pillarCount = Math.min(34, Math.max(4, Math.round(caveRadius / 12)));
  for (let i = 0; i < pillarCount; i++) {
    let px0, pz0, tries = 0;
    do {
      const a = pillarRand() * Math.PI * 2;
      const r = 12 + pillarRand() * (caveRadius - 20);
      px0 = Math.cos(a) * r; pz0 = Math.sin(a) * r;
      tries++;
    } while (inSecretTrailZone(px0, pz0) && tries < 6);
    if (inSecretTrailZone(px0, pz0)) continue;
    const radiusTop = 0.6 + pillarRand() * 0.8;
    const radiusBottom = 0.9 + pillarRand() * 1.1;
    const pillarGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, caveHeight, 8, 6);
    const pillarPos = pillarGeo.attributes.position;
    const pillarSeed = planetId * 613 + i * 37 + 5;
    for (let v = 0; v < pillarPos.count; v++) {
      const px = pillarPos.getX(v), py = pillarPos.getY(v), pz = pillarPos.getZ(v);
      const theta = Math.atan2(pz, px);
      const n = fbm(Math.cos(theta) * 2 + i, Math.sin(theta) * 2 + py * 0.15, pillarSeed, 2);
      const bump = 1 + (n - 0.5) * 0.34;
      pillarPos.setX(v, px * bump);
      pillarPos.setZ(v, pz * bump);
    }
    pillarGeo.computeVertexNormals();
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(px0, caveHeight / 2 - 0.5, pz0);
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

  // ore chests tucked in the cave - the "special area" ore, worth more per chest than the
  // ones scattered on the surface since they take real effort (a whole cave) to reach
  const caveOreChests = [];
  const caveOreChestCount = 2;
  for (let i = 0; i < caveOreChestCount; i++) {
    let cox, coz, tries = 0;
    do {
      const a = caveRand() * Math.PI * 2;
      const r = 10 + caveRand() * (caveRadius - 18);
      cox = Math.cos(a) * r; coz = Math.sin(a) * r;
      tries++;
    } while (inSecretTrailZone(cox, coz) && tries < 6);
    if (inSecretTrailZone(cox, coz)) continue;
    const oreChest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 0.8), new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.6, roughness: 0.4, emissive: 0x5a3010, emissiveIntensity: 0.25 }));
    oreChest.position.set(cox, -0.1, coz);
    oreChest.rotation.y = caveRand() * Math.PI;
    oreChest.userData = { type: 'oreChest', collected: false, amount: 9 + Math.floor(caveRand() * 5), worldPos: caveOrigin.clone().add(oreChest.position) };
    caveGroup.add(oreChest);
    caveOreChests.push(oreChest);
  }

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

  // ---- secret ambush vault: hidden room reached via a marked trail, seals shut on entry ----
  let secretRoom = null;
  if (planet.secretRoom) {
    const hasBoss = !!planet.secretRoomBoss;
    const corridorWidth = 5;
    const corridorHeight = 6.4;
    const trailStartZ = -caveRadius * 0.62;
    const corridorStartZ = -caveRadius * 0.95;
    const corridorLength = 30;
    const corridorEndZ = corridorStartZ - corridorLength;
    const roomRadius = hasBoss ? 36 : 22; // extra-large room when a boss needs room to loom
    const roomHeight = Math.min(caveHeight, 16);
    const roomCenterZ = corridorEndZ - roomRadius - 4;
    const doorZ = corridorEndZ;

    // glowing trail markers leading from the main chamber to the vault entrance - lit by
    // real point lights every couple of markers, since emissive material alone doesn't
    // cast any light and the cave's ambient light is dimmed way down while inCave
    const trailMat = new THREE.MeshStandardMaterial({ color: 0xffcf6a, emissive: 0xffaa33, emissiveIntensity: 0.9, roughness: 0.4 });
    const trailCount = 11;
    for (let i = 0; i < trailCount; i++) {
      const tFrac = i / (trailCount - 1);
      const tz = trailStartZ + (corridorStartZ - trailStartZ) * tFrac;
      const tx = Math.sin(tFrac * Math.PI * 1.4) * 1.6;
      const marker = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 6), trailMat);
      marker.position.set(tx, -0.32, tz);
      caveGroup.add(marker);
      if (i % 2 === 0) {
        const trailLight = new THREE.PointLight(0xffaa33, 0.8, 16);
        trailLight.position.set(tx, 1.6, tz);
        caveGroup.add(trailLight);
      }
    }

    // rock corridor connecting the main chamber to the hidden room
    const corridorMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 });
    const corridorZ = (corridorStartZ + corridorEndZ) / 2;
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.8, corridorHeight, corridorLength), corridorMat);
    wallL.position.set(-corridorWidth / 2, corridorHeight / 2 - 0.5, corridorZ);
    caveGroup.add(wallL);
    const wallR = wallL.clone();
    wallR.position.x = corridorWidth / 2;
    caveGroup.add(wallR);
    const corridorCeil = new THREE.Mesh(new THREE.BoxGeometry(corridorWidth + 1.6, 0.8, corridorLength), corridorMat);
    corridorCeil.position.set(0, corridorHeight - 0.5, corridorZ);
    caveGroup.add(corridorCeil);
    // corridor lighting so the tunnel itself isn't a pitch-black void
    const corridorLightA = new THREE.PointLight(0xffaa33, 0.9, 20);
    corridorLightA.position.set(0, corridorHeight * 0.6, corridorStartZ - corridorLength * 0.25);
    caveGroup.add(corridorLightA);
    const corridorLightB = new THREE.PointLight(0xff8844, 0.9, 20);
    corridorLightB.position.set(0, corridorHeight * 0.6, corridorStartZ - corridorLength * 0.75);
    caveGroup.add(corridorLightB);

    // the sealed vault room itself
    const roomWallMat = new THREE.MeshStandardMaterial({ color: 0x351c18, roughness: 1, side: THREE.BackSide });
    const roomWall = new THREE.Mesh(new THREE.CylinderGeometry(roomRadius, roomRadius, roomHeight, 20, 1, true), roomWallMat);
    roomWall.position.set(0, roomHeight / 2 - 0.5, roomCenterZ);
    caveGroup.add(roomWall);
    const roomFloor = new THREE.Mesh(new THREE.CircleGeometry(roomRadius, 20), new THREE.MeshStandardMaterial({ color: 0x2a1712, roughness: 1 }));
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.set(0, -0.5, roomCenterZ);
    caveGroup.add(roomFloor);
    const roomCeil = new THREE.Mesh(new THREE.CircleGeometry(roomRadius, 20), new THREE.MeshStandardMaterial({ color: 0x1c100c, roughness: 1, side: THREE.DoubleSide }));
    roomCeil.rotation.x = -Math.PI / 2;
    roomCeil.position.set(0, roomHeight - 0.5, roomCenterZ);
    caveGroup.add(roomCeil);
    const roomLight = new THREE.PointLight(0xff6a3a, 1.1, roomRadius * 1.4);
    roomLight.position.set(0, roomHeight * 0.6, roomCenterZ);
    caveGroup.add(roomLight);

    // boss wall: a slab flush with the far wall (opposite the corridor entrance) that looks
    // like solid rock until game.js triggers the burst - the boss then appears at
    // bossSpawnLocal, just in front of where the wall used to be. Tinted per-planet: a rock
    // base blended toward the boss's own accent color (falls back to icy blue for the yeti).
    let bossWallPanel = null, bossSpawnLocal = null;
    if (hasBoss) {
      const bossAngle = -Math.PI / 2; // straight back from the room center, away from the door
      const wallX = Math.cos(bossAngle) * roomRadius;
      const wallZ = roomCenterZ + Math.sin(bossAngle) * roomRadius;
      const bossDef = BOSSES[planet.secretRoomBoss];
      const panelAccent = bossDef ? bossDef.accentColor : 0x8fd8ff;
      const panelBase = new THREE.Color(planet.ground2).lerp(new THREE.Color(0xffffff), 0.35);
      const panelMat = new THREE.MeshStandardMaterial({ color: panelBase, emissive: panelAccent, emissiveIntensity: 0.3, metalness: 0.15, roughness: 0.35 });
      bossWallPanel = new THREE.Mesh(new THREE.BoxGeometry(10, 9, 1.4), panelMat);
      bossWallPanel.position.set(wallX, 4.0, wallZ + 0.4);
      caveGroup.add(bossWallPanel);
      const panelLight = new THREE.PointLight(panelAccent, 0.7, 14);
      panelLight.position.set(wallX, 4.5, wallZ + 2);
      caveGroup.add(panelLight);
      bossSpawnLocal = { x: wallX, y: 0, z: wallZ + 3.5 };
    }

    // blast door: normally retracted below the floor, rises to seal the corridor once triggered
    const doorClosedY = corridorHeight / 2 - 0.5;
    const doorOpenY = -corridorHeight - 1;
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, metalness: 0.6, roughness: 0.35 });
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(corridorWidth + 0.4, corridorHeight, 0.7), doorMat);
    doorMesh.position.set(0, doorOpenY, doorZ);
    doorMesh.userData = { state: 'open', closedY: doorClosedY, openY: doorOpenY };
    caveGroup.add(doorMesh);
    const doorStripe = new THREE.Mesh(new THREE.BoxGeometry(corridorWidth, 0.3, 0.75), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
    doorStripe.position.set(0, 0, 0.02);
    doorMesh.add(doorStripe);

    // dormant prize crate at the room's center, lights up once the vault is cleared
    const prizeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0x000000, metalness: 0.5, roughness: 0.4 });
    const prizeCrate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.1), prizeMat);
    prizeCrate.position.set(0, 0.05, roomCenterZ);
    caveGroup.add(prizeCrate);
    const prizeGlow = new THREE.PointLight(0xffd35e, 0, 8);
    prizeGlow.position.set(0, 1.2, roomCenterZ);
    caveGroup.add(prizeGlow);

    // ambush spawn points ringed around the room (world positions; game.js instantiates the
    // enemies on trigger). Small squads get one ring; bigger swarms (like Rustholm's 15) split
    // into an outer and inner ring so they don't overlap.
    const enemySpawns = [];
    const ambushCount = planet.secretRoomEnemyCount || 15;
    const outerRingCount = 8;
    if (ambushCount <= 6) {
      for (let i = 0; i < ambushCount; i++) {
        const a = (i / ambushCount) * Math.PI * 2 + 0.4;
        const r = roomRadius * 0.5;
        enemySpawns.push({
          x: caveOrigin.x + Math.cos(a) * r,
          y: caveOrigin.y,
          z: caveOrigin.z + roomCenterZ + Math.sin(a) * r,
        });
      }
    } else {
      for (let i = 0; i < ambushCount; i++) {
        const ring = i < outerRingCount ? 0 : 1;
        const idxInRing = ring === 0 ? i : i - outerRingCount;
        const ringCount = ring === 0 ? outerRingCount : (ambushCount - outerRingCount);
        const a = (idxInRing / ringCount) * Math.PI * 2 + ring * 0.35;
        const r = roomRadius * (ring === 0 ? 0.65 : 0.32);
        enemySpawns.push({
          x: caveOrigin.x + Math.cos(a) * r,
          y: caveOrigin.y,
          z: caveOrigin.z + roomCenterZ + Math.sin(a) * r,
        });
      }
    }

    secretRoom = {
      doorMesh, doorStripe, prizeCrate, prizeGlow,
      roomCenter: { x: 0, z: roomCenterZ }, roomRadius,
      enemySpawns,
      boss: hasBoss ? {
        type: planet.secretRoomBoss,
        wallPanel: bossWallPanel,
        spawnPos: { x: caveOrigin.x + bossSpawnLocal.x, y: caveOrigin.y, z: caveOrigin.z + bossSpawnLocal.z },
        triggered: false,
      } : null,
      triggered: false, resolved: false, remaining: 0, activeEnemies: [],
    };
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
    planet, ambient, skyGroup,
    spawnPoint: { x: 0, z: 6 },
    beacon, scrapPickups, coinPickups, partPickup, digSites, mineEntrance,
    caveGroup, caveOrigin, chest, caveTreasures, outfit, caveExit,
    caveScrapPickups, caveCoinPickups,
    shuttleWreck: shuttleGroup, oreChests, caveOreChests,
    wreckPos: [planet.wreckPos[0], wreckY, planet.wreckPos[2]],
    lostRocket,
    lostRocketSurface: planet.lostRocketPos ? { x: planet.lostRocketPos[0], z: planet.lostRocketPos[2] } : null,
    enemySpawns: buildEnemySpawns(planet, rand, groundHeightFn),
    caveEnemySpawns,
    secretRoom,
    tick(dt, t) {
      stars.rotation.y += dt * 0.003;
      const dir = weatherCfg.rising ? 1 : -1;
      const posAttr = weatherGeo.attributes.position;
      for (let i = 0; i < weatherCfg.count; i++) {
        let wy = posAttr.getY(i) + dir * weatherCfg.fallSpeed * dt;
        if (weatherCfg.rising && wy > weatherHeight) wy = 0;
        if (!weatherCfg.rising && wy < 0) wy = weatherHeight;
        posAttr.setY(i, wy);
        posAttr.setX(i, posAttr.getX(i) + Math.sin(t * 0.5 + weatherSeeds[i]) * weatherCfg.sway * dt);
      }
      posAttr.needsUpdate = true;
      updateMeteors(dt);
      if (weatherEvent) {
        updateWeatherEvent(dt);
      } else {
        weatherEventCooldown -= dt;
        if (weatherEventCooldown <= 0) {
          weatherEventCooldown = 60 + Math.random() * 90;
          if (Math.random() < 0.5) {
            startWeatherEvent(canSandstorm && Math.random() < 0.5 ? 'sandstorm' : 'meteorShower');
          }
        }
      }
      if (secretRoom) {
        const dm = secretRoom.doorMesh;
        const targetY = dm.userData.state === 'closed' ? dm.userData.closedY : dm.userData.openY;
        dm.position.y += (targetY - dm.position.y) * Math.min(1, dt * 3);
        if (dm.userData.state === 'closed') {
          secretRoom.doorStripe.material.color.setRGB(1, 0.15 + Math.sin(t * 6) * 0.1, 0.15);
        }
        if (secretRoom.resolved) {
          secretRoom.prizeCrate.material.emissive.setHex(0xffaa33);
          secretRoom.prizeCrate.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
          secretRoom.prizeGlow.intensity = 1.2 + Math.sin(t * 3) * 0.4;
        }
      }
      scrapPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.y = t * 2 + m.userData.spin; } });
      coinPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.z = t * 3; } });
      caveScrapPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.y = t * 2 + m.userData.spin; } });
      caveCoinPickups.forEach((m) => { if (!m.userData.collected) { m.rotation.z = t * 3; } });
      if (partPickup && !partPickup.userData.collected) { partPickup.rotation.y = t * 1.2; partPickup.position.y += Math.sin(t * 2) * 0.002; }
      if (!shuttleGroup.userData.searched) { chipGlow.material.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.4; }
      oreChests.forEach((c) => { if (!c.userData.collected) c.material.emissiveIntensity = 0.2 + Math.sin(t * 2.5) * 0.15; });
      caveOreChests.forEach((c) => { if (!c.userData.collected) c.material.emissiveIntensity = 0.2 + Math.sin(t * 2.5) * 0.15; });
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
      waterMat.opacity = 0.45 + Math.sin(t * 9) * 0.12;
      splashMat.opacity = 0.35 + Math.sin(t * 6) * 0.15;
      poolMat.emissiveIntensity = 0.24 + Math.sin(t * 1.3) * 0.1;
      godRays.forEach((ray, i) => { ray.material.opacity = 0.1 + Math.sin(t * 0.6 + i * 2) * 0.08; });
      dustMotes.forEach((m) => {
        const u = m.userData;
        u.angle += dt * u.speed;
        m.position.x = Math.cos(u.angle) * u.baseR;
        m.position.z = Math.sin(u.angle) * u.baseR;
        m.position.y = u.baseY + Math.sin(t * 0.8 + u.bobPhase) * 1.2;
      });
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
