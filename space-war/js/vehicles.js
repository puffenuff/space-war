
// ===================== SHARED HELPERS =====================
function makeWheel(radius, width, color) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  w.rotation.z = Math.PI / 2;
  w.castShadow = true;
  return w;
}

// rust patches + a crooked sit, only visible/active before repair
function addDamage(g, patchSpecs) {
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x5a3420, roughness: 1 });
  const damageGroup = new THREE.Group();
  patchSpecs.forEach(([x, y, z, w, h, rz]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), rustMat);
    p.position.set(x, y, z);
    if (rz) p.rotation.z = rz;
    damageGroup.add(p);
  });
  g.add(damageGroup);
  return damageGroup;
}

function applyBeatUpState(g, repaired) {
  if (!repaired) {
    g.rotation.z = 0.05 + Math.random() * 0.03;
    if (g.userData.flatWheel) g.userData.flatWheel.scale.y = 0.62;
  }
}

function setRepaired(vehicle) {
  const u = vehicle.userData;
  u.repaired = true;
  u.bodyMat.color.set(u.repairedColor || 0xc94f2e);
  u.bodyMat.roughness = 0.45;
  if (u.damageGroup) u.damageGroup.visible = false;
  vehicle.rotation.z = 0;
  if (u.flatWheel) u.flatWheel.scale.set(1, 1, 1);
}

function finishVehicle(g, pos, repaired, vehicleType, wheels, bodyMat, repairedColor, damageGroup, flatWheel) {
  g.position.set(pos[0], pos[1], pos[2]);
  g.userData = { type: 'vehicle', repaired, vehicleType, wheels, bodyMat, repairedColor, damageGroup, flatWheel, driving: false, heading: 0 };
  if (damageGroup) damageGroup.visible = !repaired;
  applyBeatUpState(g, repaired);
  if (repaired) setRepaired(g);
  return g;
}

// ===================== VEHICLE #1: ROVER (wheeled) =====================
function buildRover(pos, repaired, dented) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: dented ? 0x5c5c5c : 0x6b6b6b, roughness: 0.9, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.6), bodyMat);
  body.position.y = 0.9;
  body.castShadow = true;
  g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 1.4), new THREE.MeshStandardMaterial({ color: dented ? 0x1c2530 : 0x2a3a4a, metalness: 0.4, roughness: 0.5 }));
  cab.position.set(-0.4, 1.5, 0);
  cab.rotation.z = dented ? -0.05 : 0;
  g.add(cab);
  const wheels = [
    makeWheel(0.5, 0.4, 0x1c1c1c), makeWheel(0.5, 0.4, 0x1c1c1c),
    makeWheel(0.5, 0.4, 0x1c1c1c), makeWheel(0.5, 0.4, 0x1c1c1c),
  ];
  [[-0.9, 0.5, 0.9], [0.9, 0.5, 0.9], [-0.9, 0.5, -0.9], [0.9, 0.5, -0.9]].forEach(([x, y, z], i) => {
    wheels[i].position.set(x, y, z);
    g.add(wheels[i]);
  });
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x999 }));
  antenna.position.set(0.6, 1.6, -0.6);
  antenna.rotation.z = dented ? 0.5 : 0;
  g.add(antenna);

  const damageGroup = dented ? addDamage(g, [
    [0.7, 1.0, 0.81, 0.5, 0.3, 0.1], [-0.9, 0.7, -0.81, 0.4, 0.5, -0.15], [0.2, 0.55, 0.81, 0.6, 0.18, 0],
  ]) : null;
  return finishVehicle(g, pos, repaired, 'rover', wheels, bodyMat, 0xc94f2e, damageGroup, wheels[2]);
}

// ===================== VEHICLE #2: TRACKED CRAWLER =====================
function buildCrawler(pos, repaired, dented) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: dented ? 0x4a5560 : 0x5a6672, roughness: 0.85, metalness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.7), bodyMat);
  body.position.y = 1.0;
  body.castShadow = true;
  g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 1.3), new THREE.MeshStandardMaterial({ color: dented ? 0x141b22 : 0x1e2a38, metalness: 0.5, roughness: 0.4 }));
  cab.position.set(0.35, 1.55, 0);
  cab.rotation.z = dented ? 0.06 : 0;
  g.add(cab);

  const treadMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.95 });
  const treads = [];
  [-0.95, 0.95].forEach((tx) => {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 2.6), treadMat);
    tread.position.set(tx, 0.55, 0);
    tread.castShadow = true;
    g.add(tread);
    treads.push(tread);
  });
  const wheels = [];
  [-0.95, 0.95].forEach((tx) => {
    [-0.9, 0, 0.9].forEach((tz) => {
      const roller = makeWheel(0.28, 0.46, 0x222222);
      roller.position.set(tx, 0.55, tz);
      g.add(roller);
      wheels.push(roller);
    });
  });
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.6 }));
  dish.position.set(-0.2, 1.85, 0);
  dish.rotation.x = Math.PI / 2.4;
  g.add(dish);

  const damageGroup = dented ? addDamage(g, [
    [0.9, 1.05, 0.86, 0.55, 0.28, -0.08], [-0.6, 0.9, -0.86, 0.4, 0.4, 0.1],
  ]) : null;
  return finishVehicle(g, pos, repaired, 'crawler', wheels, bodyMat, 0x2f7ab8, damageGroup, null);
}

// ===================== VEHICLE #3: DUNE BUGGY (open frame) =====================
function buildBuggy(pos, repaired, dented) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: dented ? 0x556644 : 0x6f9a4a, roughness: 0.8, metalness: 0.2 });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 1.3), bodyMat);
  chassis.position.y = 0.75;
  chassis.castShadow = true;
  g.add(chassis);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 1.0), new THREE.MeshStandardMaterial({ color: dented ? 0x201810 : 0x3a2a1a, roughness: 0.9 }));
  seat.position.set(-0.1, 1.05, 0);
  g.add(seat);
  // roll cage
  const cageMat = new THREE.MeshStandardMaterial({ color: dented ? 0x8a8a8a : 0xd7d7d7, metalness: 0.5, roughness: 0.4 });
  const cageGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6);
  [[-0.6, 1.35, 0.55], [-0.6, 1.35, -0.55], [0.55, 1.1, 0.55], [0.55, 1.1, -0.55]].forEach(([x, y, z]) => {
    const bar = new THREE.Mesh(cageGeo, cageMat);
    bar.position.set(x, y, z);
    bar.rotation.x = dented ? 0.15 : 0;
    g.add(bar);
  });
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), cageMat);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.set(-0.6, 1.95, 0);
  g.add(topBar);

  const wheels = [
    makeWheel(0.62, 0.42, 0x191919), makeWheel(0.62, 0.42, 0x191919),
    makeWheel(0.62, 0.42, 0x191919), makeWheel(0.62, 0.42, 0x191919),
  ];
  [[-0.85, 0.62, 0.85], [0.85, 0.62, 0.85], [-0.85, 0.62, -0.85], [0.85, 0.62, -0.85]].forEach(([x, y, z], i) => {
    wheels[i].position.set(x, y, z);
    g.add(wheels[i]);
  });

  const damageGroup = dented ? addDamage(g, [
    [0.7, 0.78, 0.66, 0.45, 0.22, 0.1], [-0.6, 0.78, -0.66, 0.4, 0.25, -0.12],
  ]) : null;
  return finishVehicle(g, pos, repaired, 'buggy', wheels, bodyMat, 0x7fb84f, damageGroup, wheels[3]);
}

// ===================== VEHICLE #4: ALIEN CRAWLER (exotic) =====================
function buildAlien(pos, repaired, dented) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: dented ? 0x3a2f50 : 0x4a3a70, roughness: 0.7, metalness: 0.5 });
  const hull = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 6), bodyMat);
  hull.rotation.z = Math.PI / 2;
  hull.rotation.y = Math.PI / 6;
  hull.position.y = 1.0;
  hull.castShadow = true;
  g.add(hull);
  const stripeMat = new THREE.MeshStandardMaterial({ color: dented ? 0x552244 : 0xa63aff, emissive: dented ? 0x1a0a20 : 0x8a2aff, emissiveIntensity: dented ? 0.15 : 0.8 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.06), stripeMat);
  stripe.position.set(0, 1.35, 0.7);
  g.add(stripe);

  const podMat = new THREE.MeshStandardMaterial({ color: 0x18141f, roughness: 0.6, metalness: 0.6 });
  const wheels = [];
  [[-0.85, 0.55, 0.8], [0.85, 0.55, 0.8], [-0.85, 0.55, -0.8], [0.85, 0.55, -0.8]].forEach(([x, y, z]) => {
    const pod = makeWheel(0.4, 0.55, 0x18141f);
    pod.material = podMat;
    pod.position.set(x, y, z);
    g.add(pod);
    wheels.push(pod);
  });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0x111, emissive: dented ? 0x220000 : 0xff2a2a, emissiveIntensity: dented ? 0.2 : 0.9 }));
  eye.position.set(1.15, 1.15, 0);
  g.add(eye);

  const damageGroup = dented ? addDamage(g, [
    [0.2, 1.3, 0.5, 0.5, 0.25, 0.15], [-0.5, 0.9, -0.5, 0.4, 0.35, -0.1],
  ]) : null;
  return finishVehicle(g, pos, repaired, 'alien', wheels, bodyMat, 0x8a2aff, damageGroup, null);
}

// ===================== FACTORY =====================
function createVehicle(vehicleType, pos, repaired = false) {
  const dented = !repaired;
  switch (vehicleType) {
    case 'crawler': return buildCrawler(pos, repaired, dented);
    case 'buggy': return buildBuggy(pos, repaired, dented);
    case 'alien': return buildAlien(pos, repaired, dented);
    case 'rover':
    default: return buildRover(pos, repaired, dented);
  }
}

// kept for compatibility with the base-dome garage rover (always spawns already repaired)
function createRover(pos, repaired = false) {
  return createVehicle('rover', pos, repaired);
}

class VehicleController {
  constructor(vehicle, getGroundHeight) {
    this.vehicle = vehicle;
    this.getGroundHeight = getGroundHeight;
    this.speed = 12;
  }
  update(dt) {
    applyLookInput();
    const moveX = input.moveX, moveY = input.moveY;
    const u = this.vehicle.userData;
    if (Math.abs(moveY) > 0.05) {
      u.heading += (moveX * -1) * dt * 2.2 * (moveY < 0 ? -1 : 1);
    } else if (Math.abs(moveX) > 0.05) {
      u.heading += moveX * -1 * dt * 1.4;
    }
    const dir = new THREE.Vector3(-Math.sin(u.heading), 0, -Math.cos(u.heading));
    const speed = Math.abs(moveY) > 0.05 ? this.speed * Math.sign(moveY) : 0;
    this.vehicle.position.addScaledVector(dir, speed * dt);
    this.vehicle.position.y = this.getGroundHeight(this.vehicle.position.x, this.vehicle.position.z) + 0.05;
    this.vehicle.rotation.y = u.heading + Math.PI;
    u.wheels.forEach((w) => { w.rotation.x += speed * dt * 2; });

    // camera follows behind vehicle heading rather than free orbit
    camState.yaw = u.heading;
  }
}
