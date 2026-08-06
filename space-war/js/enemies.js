import * as THREE from 'three';

// ===================== GROUND RAIDER =====================
export function createGroundEnemy(spawn) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a3b3b, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.4), bodyMat);
  body.position.y = 1.0;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.4 }));
  head.position.y = 1.65;
  g.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
  eye.position.set(0, 1.65, 0.25);
  g.add(eye);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x1c1c1c }));
  gun.position.set(0.4, 1.05, 0.25);
  g.add(gun);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.24), bodyMat); legL.position.set(-0.16, 0.5, 0);
  const legR = legL.clone(); legR.position.x = 0.16;
  g.add(legL, legR);

  g.position.set(spawn.x, spawn.y, spawn.z);
  g.userData = {
    isEnemy: true, kind: 'ground', hp: 30, maxHp: 30,
    home: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
    shootCooldown: 1 + Math.random(), wanderT: Math.random() * 10, wanderTarget: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
    gun, eye, alive: true,
  };
  return g;
}

export function updateGroundEnemy(enemy, dt, playerPos, groundHeightFn, onShoot) {
  const u = enemy.userData;
  if (!u.alive) return;
  const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
  toPlayer.y = 0;
  const dist = toPlayer.length();
  const detectRange = 20, attackRange = 13;

  if (dist < detectRange) {
    enemy.lookAt(playerPos.x, enemy.position.y, playerPos.z);
    if (dist > attackRange * 0.7) {
      const dir = toPlayer.normalize();
      enemy.position.x += dir.x * 3.2 * dt;
      enemy.position.z += dir.z * 3.2 * dt;
      enemy.position.y = groundHeightFn(enemy.position.x, enemy.position.z);
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
    }
  }
}

// ===================== SPACE ENEMY SHIP =====================
export function createSpaceEnemy(pos) {
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

export function updateSpaceEnemy(enemy, dt, playerPos, onShoot) {
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
export function createProjectile(origin, dir, opts = {}) {
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

export function updateProjectiles(list, dt, scene) {
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
export function createExplosion(scene, pos, color = 0xffaa33, count = 16) {
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

export function updateExplosions(list, dt, scene) {
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
