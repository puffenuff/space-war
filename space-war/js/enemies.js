
// ===================== GROUND RAIDER =====================
function createGroundEnemy(spawn) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7a3030, roughness: 0.65, metalness: 0.2 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5, metalness: 0.4 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.78, 0.38), bodyMat);
  body.position.y = 1.02;
  body.castShadow = true;
  g.add(body);

  // shoulder armor plates
  const padGeo = new THREE.BoxGeometry(0.26, 0.2, 0.32);
  const padL = new THREE.Mesh(padGeo, armorMat); padL.position.set(-0.32, 1.38, 0);
  const padR = new THREE.Mesh(padGeo, armorMat); padR.position.set(0.32, 1.38, 0);
  g.add(padL, padR);

  // angular helmet with glowing visor slit
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.36), armorMat);
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.04), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
  visor.position.set(0, 1.63, 0.19);
  g.add(visor);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), armorMat);
  spike.position.set(0, 1.86, -0.05);
  g.add(spike);

  // arms, gun held by the right hand
  const armGeo = new THREE.BoxGeometry(0.18, 0.55, 0.2);
  const armL = new THREE.Mesh(armGeo, bodyMat); armL.geometry.translate(0, -0.275, 0); armL.position.set(-0.36, 1.35, 0);
  const armR = new THREE.Mesh(armGeo, bodyMat); armR.geometry.translate(0, -0.275, 0); armR.position.set(0.36, 1.35, 0);
  g.add(armL, armR);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x1c1c1c }));
  gun.position.set(0.14, -0.42, 0.2);
  armR.add(gun);

  const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.24);
  const legL = new THREE.Mesh(legGeo, armorMat); legL.geometry.translate(0, -0.3, 0); legL.position.set(-0.16, 0.6, 0);
  const legR = new THREE.Mesh(legGeo, armorMat); legR.geometry.translate(0, -0.3, 0); legR.position.set(0.16, 0.6, 0);
  g.add(legL, legR);

  g.position.set(spawn.x, spawn.y, spawn.z);
  g.userData = {
    isEnemy: true, kind: 'ground', hp: 30, maxHp: 30,
    home: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
    shootCooldown: 1 + Math.random(), wanderT: Math.random() * 10, wanderTarget: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
    gun, visor, armL, armR, legL, legR, walkT: Math.random() * 10, alive: true,
  };
  return g;
}

function animateGroundEnemy(enemy, dt, moving, t) {
  const u = enemy.userData;
  if (moving) u.walkT += dt * 6;
  const swing = moving ? Math.sin(u.walkT) * 0.6 : 0;
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.7;
  const flick = 0.7 + Math.sin(t * 8) * 0.3;
  u.visor.material.color.setRGB(flick, 0.15, 0.15);
}

function updateGroundEnemy(enemy, dt, playerPos, groundHeightFn, onShoot) {
  const u = enemy.userData;
  if (!u.alive) return;
  const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
  toPlayer.y = 0;
  const dist = toPlayer.length();
  const detectRange = 20, attackRange = 13;
  let moving = false;

  if (dist < detectRange) {
    enemy.lookAt(playerPos.x, enemy.position.y, playerPos.z);
    if (dist > attackRange * 0.7) {
      const dir = toPlayer.normalize();
      enemy.position.x += dir.x * 3.2 * dt;
      enemy.position.z += dir.z * 3.2 * dt;
      enemy.position.y = groundHeightFn(enemy.position.x, enemy.position.z);
      moving = true;
    }
    if (dist < attackRange) {
      u.shootCooldown -= dt;
      if (u.shootCooldown <= 0) {
        u.shootCooldown = 1.6 + Math.random() * 0.8;
        const origin = new THREE.Vector3();
        u.gun.getWorldPosition(origin);
        const dir = new THREE.Vector3().subVectors(playerPos, origin).normalize();
        onShoot(origin, dir);
      }
    }
  } else {
    // wander near home
    u.wanderT -= dt;
    if (u.wanderT <= 0) {
      u.wanderT = 3 + Math.random() * 4;
      u.wanderTarget.set(u.home.x + (Math.random() - 0.5) * 8, 0, u.home.z + (Math.random() - 0.5) * 8);
    }
    const d = new THREE.Vector3().subVectors(u.wanderTarget, enemy.position); d.y = 0;
    if (d.length() > 0.5) {
      d.normalize();
      enemy.position.x += d.x * 1.2 * dt;
      enemy.position.z += d.z * 1.2 * dt;
      enemy.position.y = groundHeightFn(enemy.position.x, enemy.position.z);
      enemy.rotation.y = Math.atan2(d.x, d.z);
      moving = true;
    }
  }
  animateGroundEnemy(enemy, dt, moving, performance.now() * 0.001);
}

// ===================== SPACE ENEMY SHIP =====================
function createSpaceEnemy(pos) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2, 6), new THREE.MeshStandardMaterial({ color: 0xaa3333, metalness: 0.5, roughness: 0.4 }));
  hull.rotation.x = Math.PI / 2;
  g.add(hull);
  const wingGeo = new THREE.BoxGeometry(1.6, 0.1, 0.5);
  const wing = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: 0x552222, metalness: 0.4 }));
  wing.position.z = 0.2;
  g.add(wing);
  const glow = new THREE.PointLight(0xff5050, 0.6, 5);
  glow.position.z = -1;
  g.add(glow);
  g.position.copy(pos);
  g.userData = { isEnemy: true, kind: 'space', hp: 20, maxHp: 20, alive: true, shootCooldown: 1 + Math.random(), strafeT: Math.random() * 10 };
  return g;
}

function updateSpaceEnemy(enemy, dt, playerPos, onShoot) {
  const u = enemy.userData;
  if (!u.alive) return;
  u.strafeT += dt;
  const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
  const dist = toPlayer.length();
  const dir = toPlayer.clone().normalize();
  const desiredDist = 22;
  const speed = 9;
  if (dist > desiredDist) {
    enemy.position.addScaledVector(dir, speed * dt);
  } else if (dist < desiredDist * 0.6) {
    enemy.position.addScaledVector(dir, -speed * dt);
  }
  enemy.position.x += Math.sin(u.strafeT * 0.8) * 6 * dt;
  enemy.position.y += Math.cos(u.strafeT * 0.6) * 4 * dt;
  enemy.lookAt(playerPos);

  u.shootCooldown -= dt;
  if (dist < 60 && u.shootCooldown <= 0) {
    u.shootCooldown = 1.2 + Math.random() * 0.8;
    onShoot(enemy.position.clone(), dir);
  }
}

// ===================== PROJECTILES =====================
function createProjectile(origin, dir, opts = {}) {
  const color = opts.color || 0x5ecbff;
  const geo = new THREE.SphereGeometry(opts.size || 0.09, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(origin);
  m.userData = {
    velocity: dir.clone().multiplyScalar(opts.speed || 30),
    life: opts.life || 3,
    damage: opts.damage || 10,
    owner: opts.owner || 'player',
  };
  return m;
}

function updateProjectiles(list, dt, scene) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.position.addScaledVector(p.userData.velocity, dt);
    p.userData.life -= dt;
    if (p.userData.life <= 0) {
      scene.remove(p);
      list.splice(i, 1);
    }
  }
}

// ===================== EXPLOSIONS =====================
function createExplosion(scene, pos, color = 0xffaa33, count = 16) {
  const group = new THREE.Group();
  group.position.copy(pos);
  const geo = new THREE.SphereGeometry(0.08, 5, 5);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const m = new THREE.Mesh(geo, mat);
    const dir = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize();
    m.userData = { velocity: dir.multiplyScalar(3 + Math.random() * 5) };
    group.add(m);
    parts.push(m);
  }
  group.userData = { life: 0.8, maxLife: 0.8, parts };
  scene.add(group);
  return group;
}

function updateExplosions(list, dt, scene) {
  for (let i = list.length - 1; i >= 0; i--) {
    const ex = list[i];
    ex.userData.life -= dt;
    const t = Math.max(0, ex.userData.life / ex.userData.maxLife);
    ex.userData.parts.forEach((p) => {
      p.position.addScaledVector(p.userData.velocity, dt);
      p.material.opacity = t;
      p.scale.setScalar(0.5 + (1 - t) * 1.5);
    });
    if (ex.userData.life <= 0) {
      scene.remove(ex);
      list.splice(i, 1);
    }
  }
}
