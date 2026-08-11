
// ===================== GROUND RAIDER (or icy "mini yeti" skin on Cryovale) =====================
function createGroundEnemy(spawn, skin = 'raider') {
  const g = new THREE.Group();
  const isYeti = skin === 'miniYeti';
  const bodyMat = new THREE.MeshStandardMaterial({ color: isYeti ? 0xeaf6ff : 0x7a3030, roughness: isYeti ? 0.85 : 0.65, metalness: isYeti ? 0 : 0.2 });
  const armorMat = new THREE.MeshStandardMaterial({ color: isYeti ? 0xb9d4e6 : 0x2b2b2b, roughness: isYeti ? 0.8 : 0.5, metalness: isYeti ? 0 : 0.4 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.78, 0.38), bodyMat);
  body.position.y = 1.02;
  body.castShadow = true;
  g.add(body);

  // shoulder armor plates (fur tufts on the yeti skin)
  const padGeo = new THREE.BoxGeometry(0.26, 0.2, 0.32);
  const padL = new THREE.Mesh(padGeo, armorMat); padL.position.set(-0.32, 1.38, 0);
  const padR = new THREE.Mesh(padGeo, armorMat); padR.position.set(0.32, 1.38, 0);
  g.add(padL, padR);

  // angular helmet with glowing visor slit; the yeti skin gets a fur-colored head + small tusks instead of a helmet spike
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.36), isYeti ? bodyMat : armorMat);
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.04), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
  visor.position.set(0, 1.63, 0.19);
  g.add(visor);
  if (isYeti) {
    const tuskGeo = new THREE.ConeGeometry(0.035, 0.16, 6);
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xf2f8ff, roughness: 0.4 });
    const tuskL = new THREE.Mesh(tuskGeo, tuskMat); tuskL.position.set(-0.09, 1.52, 0.2); tuskL.rotation.x = Math.PI;
    const tuskR = new THREE.Mesh(tuskGeo, tuskMat); tuskR.position.set(0.09, 1.52, 0.2); tuskR.rotation.x = Math.PI;
    g.add(tuskL, tuskR);
  } else {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), armorMat);
    spike.position.set(0, 1.86, -0.05);
    g.add(spike);
  }

  // arms, gun held by the right hand
  const armGeo = new THREE.BoxGeometry(0.18, 0.55, 0.2);
  const armL = new THREE.Mesh(armGeo, bodyMat); armL.geometry.translate(0, -0.275, 0); armL.position.set(-0.36, 1.35, 0);
  const armR = new THREE.Mesh(armGeo, bodyMat); armR.geometry.translate(0, -0.275, 0); armR.position.set(0.36, 1.35, 0);
  g.add(armL, armR);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: isYeti ? 0x8fa5b5 : 0x1c1c1c, metalness: isYeti ? 0.3 : 0.5 }));
  gun.position.set(0.14, -0.42, 0.2);
  armR.add(gun);

  const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.24);
  const legL = new THREE.Mesh(legGeo, armorMat); legL.geometry.translate(0, -0.3, 0); legL.position.set(-0.16, 0.6, 0);
  const legR = new THREE.Mesh(legGeo, armorMat); legR.geometry.translate(0, -0.3, 0); legR.position.set(0.16, 0.6, 0);
  g.add(legL, legR);

  if (isYeti) g.scale.set(1.2, 1.2, 1.2); // stockier than a regular raider, still dwarfed by the boss

  g.position.set(spawn.x, spawn.y, spawn.z);
  g.userData = {
    isEnemy: true, kind: 'ground', hp: isYeti ? 42 : 30, maxHp: isYeti ? 42 : 30,
    home: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
    shootCooldown: 1 + Math.random(), wanderT: Math.random() * 10, wanderTarget: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
    hitRadius: isYeti ? 1.8 : 1.5,
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

// ===================== YETI BOSS (melee, secret-vault only) =====================
function createYetiBoss(spawn) {
  const g = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, roughness: 0.9 });
  const furMatDark = new THREE.MeshStandardMaterial({ color: 0xb9d4e6, roughness: 0.9 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x2a3540, roughness: 0.6 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0xf2f8ff, roughness: 0.4, metalness: 0.2 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 1.5), furMat);
  body.position.y = 2.6;
  body.castShadow = true;
  g.add(body);
  const chestTuft = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.6), furMatDark);
  chestTuft.position.set(0, 3.0, 0.75);
  g.add(chestTuft);

  const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.0), furMat);
  head.position.set(0, 4.35, 0.15);
  head.castShadow = true;
  g.add(head);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.3), furMatDark);
  brow.position.set(0, 4.68, 0.62);
  brow.rotation.x = -0.2;
  g.add(brow);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), faceMat);
  jaw.position.set(0, 3.95, 0.55);
  g.add(jaw);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat); eyeL.position.set(-0.28, 4.42, 0.62);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat); eyeR.position.set(0.28, 4.42, 0.62);
  g.add(eyeL, eyeR);
  const tuskGeo = new THREE.ConeGeometry(0.06, 0.32, 6);
  const tuskL = new THREE.Mesh(tuskGeo, clawMat); tuskL.position.set(-0.18, 3.78, 0.72); tuskL.rotation.x = Math.PI;
  const tuskR = new THREE.Mesh(tuskGeo, clawMat); tuskR.position.set(0.18, 3.78, 0.72); tuskR.rotation.x = Math.PI;
  g.add(tuskL, tuskR);

  // arms are jointed (shoulder -> elbow -> fist) so the punch animation can actually bend
  const upperArmGeo = new THREE.BoxGeometry(0.65, 1.5, 0.65);
  const foreArmGeo = new THREE.BoxGeometry(0.6, 1.3, 0.6);
  const fistGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
  function buildArm(sign) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 1.35, 3.55, 0.1);
    const upper = new THREE.Mesh(upperArmGeo, furMat);
    upper.position.y = -0.7;
    upper.castShadow = true;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.set(0, -1.5, 0);
    const fore = new THREE.Mesh(foreArmGeo, furMatDark);
    fore.position.y = -0.6;
    fore.castShadow = true;
    elbow.add(fore);
    const fist = new THREE.Mesh(fistGeo, clawMat);
    fist.position.y = -1.35;
    fist.castShadow = true;
    elbow.add(fist);
    shoulder.add(elbow);
    return { shoulder, elbow, fist };
  }
  const armL = buildArm(-1);
  const armR = buildArm(1);
  g.add(armL.shoulder, armR.shoulder);

  const legGeo = new THREE.BoxGeometry(0.85, 1.3, 0.85);
  const legL = new THREE.Mesh(legGeo, furMatDark); legL.geometry.translate(0, -0.65, 0); legL.position.set(-0.6, 1.3, 0);
  const legR = new THREE.Mesh(legGeo, furMatDark); legR.geometry.translate(0, -0.65, 0); legR.position.set(0.6, 1.3, 0);
  legL.castShadow = true; legR.castShadow = true;
  g.add(legL, legR);

  const spikeGeo = new THREE.ConeGeometry(0.12, 0.5, 5);
  [[-1.1, 3.9, -0.2], [1.1, 3.9, -0.2], [-0.5, 4.9, -0.1], [0.5, 4.9, -0.1]].forEach(([sx, sy, sz]) => {
    const spike = new THREE.Mesh(spikeGeo, clawMat);
    spike.position.set(sx, sy, sz);
    g.add(spike);
  });

  g.position.set(spawn.x, spawn.y, spawn.z);
  g.userData = {
    isEnemy: true, kind: 'yeti', hp: 650, maxHp: 650,
    home: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
    walkT: Math.random() * 10, alive: true,
    hitRadius: 3.4, punchDamage: 40, punchRange: 4.4,
    slamRange: 13, slamRadius: 9, slamDamage: 42,
    chargeSpeed: 19, chargeDamage: 55,
    chaseSpeed: 4.6,
    specialCooldown: 1,
    attackState: 'burst', attackTimer: 0, hasHitThisSwing: false, chargeDir: new THREE.Vector3(),
    body, head, jaw, armL, armR, legL, legR, eyeL, eyeR,
  };
  return g;
}

// melee/special AI: chase until in punch range, or unleash a telegraphed ice slam (close-medium
// AOE) or charge (long-range dash). Each hit callback fires once per attack, only if the player
// is still in range at the moment of impact, and receives a unit direction vector for knockback.
function updateYetiBoss(yeti, dt, playerPos, groundHeightFn, callbacks) {
  const u = yeti.userData;
  if (!u.alive) return;
  const { onPunchHit, onSlamHit, onChargeHit } = callbacks;
  const toPlayer = new THREE.Vector3().subVectors(playerPos, yeti.position);
  toPlayer.y = 0;
  const dist = toPlayer.length();
  let moving = false;
  u.specialCooldown = Math.max(0, u.specialCooldown - dt);

  if (u.attackState === 'burst') {
    u.attackTimer += dt;
    if (u.attackTimer >= 0.5) { u.attackState = 'chase'; u.attackTimer = 0; }
  } else if (u.attackState === 'chase') {
    if (dist < 45) {
      yeti.lookAt(playerPos.x, yeti.position.y, playerPos.z);
      if (dist <= u.punchRange * 0.8) {
        u.attackState = 'winding'; u.attackTimer = 0; u.hasHitThisSwing = false;
      } else if (u.specialCooldown <= 0 && dist <= u.slamRange) {
        u.attackState = 'windSlam'; u.attackTimer = 0; u.specialCooldown = 2.5 + Math.random();
      } else if (u.specialCooldown <= 0 && dist > u.slamRange) {
        u.attackState = 'windCharge'; u.attackTimer = 0; u.specialCooldown = 3 + Math.random();
      } else {
        const dir = toPlayer.normalize();
        yeti.position.x += dir.x * u.chaseSpeed * dt;
        yeti.position.z += dir.z * u.chaseSpeed * dt;
        yeti.position.y = groundHeightFn(yeti.position.x, yeti.position.z);
        moving = true;
      }
    }
  } else if (u.attackState === 'winding') {
    u.attackTimer += dt;
    if (u.attackTimer >= 0.55) { u.attackState = 'punching'; u.attackTimer = 0; }
  } else if (u.attackState === 'punching') {
    u.attackTimer += dt;
    if (!u.hasHitThisSwing && u.attackTimer >= 0.08) {
      u.hasHitThisSwing = true;
      if (yeti.position.distanceTo(playerPos) < u.punchRange) {
        onPunchHit(new THREE.Vector3().subVectors(playerPos, yeti.position).setY(0).normalize());
      }
    }
    if (u.attackTimer >= 0.22) { u.attackState = 'recover'; u.attackTimer = 0; }
  } else if (u.attackState === 'recover') {
    u.attackTimer += dt;
    if (u.attackTimer >= 0.18) { u.attackState = 'chase'; u.attackTimer = 0; }

  // ---- special: ice slam - both fists raised, then a ground-pound AOE shockwave ----
  } else if (u.attackState === 'windSlam') {
    u.attackTimer += dt;
    if (u.attackTimer >= 0.8) { u.attackState = 'slam'; u.attackTimer = 0; u.hasHitThisSwing = false; }
  } else if (u.attackState === 'slam') {
    u.attackTimer += dt;
    if (!u.hasHitThisSwing && u.attackTimer >= 0.1) {
      u.hasHitThisSwing = true;
      const d = yeti.position.distanceTo(playerPos);
      if (d < u.slamRadius) {
        onSlamHit(new THREE.Vector3().subVectors(playerPos, yeti.position).setY(0).normalize());
      }
    }
    if (u.attackTimer >= 0.3) { u.attackState = 'recoverSlam'; u.attackTimer = 0; }
  } else if (u.attackState === 'recoverSlam') {
    u.attackTimer += dt;
    if (u.attackTimer >= 0.25) { u.attackState = 'chase'; u.attackTimer = 0; }

  // ---- special: charge - a fast telegraphed dash straight at the player's last position ----
  } else if (u.attackState === 'windCharge') {
    u.attackTimer += dt;
    yeti.lookAt(playerPos.x, yeti.position.y, playerPos.z);
    if (u.attackTimer >= 0.6) {
      u.attackState = 'charge'; u.attackTimer = 0; u.hasHitThisSwing = false;
      u.chargeDir.copy(toPlayer).normalize();
    }
  } else if (u.attackState === 'charge') {
    u.attackTimer += dt;
    yeti.position.x += u.chargeDir.x * u.chargeSpeed * dt;
    yeti.position.z += u.chargeDir.z * u.chargeSpeed * dt;
    yeti.position.y = groundHeightFn(yeti.position.x, yeti.position.z);
    moving = true;
    if (!u.hasHitThisSwing && yeti.position.distanceTo(playerPos) < u.punchRange * 1.1) {
      u.hasHitThisSwing = true;
      onChargeHit(u.chargeDir.clone());
    }
    if (u.attackTimer >= 0.6) { u.attackState = 'recoverCharge'; u.attackTimer = 0; }
  } else if (u.attackState === 'recoverCharge') {
    u.attackTimer += dt;
    if (u.attackTimer >= 0.3) { u.attackState = 'chase'; u.attackTimer = 0; }
  }

  animateYetiBoss(yeti, dt, moving);
}

function animateYetiBoss(yeti, dt, moving) {
  const u = yeti.userData;
  if (u.attackState === 'burst') {
    const t = Math.min(1, u.attackTimer / 0.5);
    u.armL.shoulder.rotation.x = -2.0 * (1 - t * 0.6);
    u.armR.shoulder.rotation.x = -2.0 * (1 - t * 0.6);
  } else if (u.attackState === 'chase') {
    u.walkT += dt * (moving ? 5 : 1.5);
    const swing = moving ? Math.sin(u.walkT) * 0.5 : 0;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.shoulder.rotation.x += (-swing * 0.4 - u.armL.shoulder.rotation.x) * Math.min(1, dt * 8);
    u.armR.shoulder.rotation.x += (swing * 0.4 - u.armR.shoulder.rotation.x) * Math.min(1, dt * 8);
    u.armR.elbow.rotation.x += (0 - u.armR.elbow.rotation.x) * Math.min(1, dt * 8);
    u.body.rotation.x += (0 - u.body.rotation.x) * Math.min(1, dt * 6);
  } else if (u.attackState === 'winding') {
    const t = Math.min(1, u.attackTimer / 0.55);
    u.armR.shoulder.rotation.x = -t * 2.4;
    u.armR.elbow.rotation.x = -t * 0.8;
    u.armL.shoulder.rotation.x = t * 0.3;
  } else if (u.attackState === 'punching') {
    const t = Math.min(1, u.attackTimer / 0.22);
    u.armR.shoulder.rotation.x = -2.4 + t * 3.4;
    u.armR.elbow.rotation.x = -0.8 + t * 0.9;
  } else if (u.attackState === 'recover') {
    const t = Math.min(1, u.attackTimer / 0.45);
    u.armR.shoulder.rotation.x = (1 - t) * 1.0;
    u.armR.elbow.rotation.x = (1 - t) * 0.1;
    u.armL.shoulder.rotation.x = (1 - t) * 0.3;

  } else if (u.attackState === 'windSlam') {
    const t = Math.min(1, u.attackTimer / 0.8);
    u.armL.shoulder.rotation.x = -2.6 * t; u.armR.shoulder.rotation.x = -2.6 * t;
    u.armL.elbow.rotation.x = -0.7 * t; u.armR.elbow.rotation.x = -0.7 * t;
    u.body.rotation.x = -0.15 * t;
  } else if (u.attackState === 'slam') {
    const t = Math.min(1, u.attackTimer / 0.3);
    u.armL.shoulder.rotation.x = -2.6 + t * 4.0; u.armR.shoulder.rotation.x = -2.6 + t * 4.0;
    u.armL.elbow.rotation.x = -0.7 + t * 0.8; u.armR.elbow.rotation.x = -0.7 + t * 0.8;
    u.body.rotation.x = -0.15 + t * 0.4;
  } else if (u.attackState === 'recoverSlam') {
    const t = Math.min(1, u.attackTimer / 0.6);
    u.armL.shoulder.rotation.x = (1 - t) * 1.4; u.armR.shoulder.rotation.x = (1 - t) * 1.4;
    u.armL.elbow.rotation.x = (1 - t) * 0.1; u.armR.elbow.rotation.x = (1 - t) * 0.1;
    u.body.rotation.x = (1 - t) * 0.25;

  } else if (u.attackState === 'windCharge') {
    const t = Math.min(1, u.attackTimer / 0.6);
    u.body.rotation.x = t * 0.35;
    u.armL.shoulder.rotation.x = t * 1.1; u.armR.shoulder.rotation.x = t * 1.1;
  } else if (u.attackState === 'charge') {
    u.walkT += dt * 14;
    const swing = Math.sin(u.walkT) * 0.6;
    u.legL.rotation.x = swing; u.legR.rotation.x = -swing;
    u.body.rotation.x = 0.35;
    u.armL.shoulder.rotation.x = 1.1; u.armR.shoulder.rotation.x = 1.1;
  } else if (u.attackState === 'recoverCharge') {
    const t = Math.min(1, u.attackTimer / 0.7);
    u.body.rotation.x = (1 - t) * 0.35;
    u.armL.shoulder.rotation.x = (1 - t) * 1.1; u.armR.shoulder.rotation.x = (1 - t) * 1.1;
  }
  const flick = 0.7 + Math.sin(performance.now() * 0.006) * 0.3;
  u.eyeL.material.color.setRGB(flick, 0.1, 0.1);
  u.eyeR.material.color.setRGB(flick, 0.1, 0.1);
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
