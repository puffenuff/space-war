
function createShip() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 0.6, roughness: 0.3 }));
  hull.rotation.x = Math.PI / 2;
  g.add(hull);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2a6fbf, emissive: 0x1a3a5a, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }));
  cockpit.position.set(0, 0.2, 0.3);
  g.add(cockpit);
  const wingGeo = new THREE.BoxGeometry(2.4, 0.08, 0.9);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x4d79ff, metalness: 0.5, roughness: 0.4 });
  const wing = new THREE.Mesh(wingGeo, wingMat);
  wing.position.z = 0.3;
  g.add(wing);
  const flameGeo = new THREE.ConeGeometry(0.22, 0.9, 8);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x5ecbff, transparent: true, opacity: 0.85 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0, 1.5);
  g.add(flame);
  g.userData = { flame };
  return g;
}

class SpaceFlight {
  constructor(destPlanetId, opts = {}) {
    this.destPlanetId = destPlanetId;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02030a);

    const ambient = new THREE.AmbientLight(0x8899ff, 0.6);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(30, 40, 20);
    this.scene.add(sun);

    // starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1400;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 2] = (Math.random()) * -2000 + 100;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: true });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    // destination planet visual
    const planetData = PLANETS[destPlanetId];
    // trips between planets are meant to feel like a real journey now that you can go
    // anywhere anytime - forwardSpeed is a constant 20/sec, so this default is a ~2 minute trip
    this.travelGoal = opts.travelGoal || 2400;
    const pMesh = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 20), new THREE.MeshStandardMaterial({ color: planetData.ground, roughness: 0.9 }));
    pMesh.position.set(0, 0, -this.travelGoal - 40);
    this.scene.add(pMesh);
    this.destPlanetMesh = pMesh;

    // other worlds in the system, drifting past off to either side of the flight path -
    // borrows colors from other planets' data so it reads as "the same solar system"
    this.sideBodies = [];
    const otherIds = PLANET_ID_LIST.filter((id) => id !== destPlanetId);
    for (let i = 0; i < 6; i++) {
      const srcPlanet = PLANETS[otherIds[Math.floor(Math.random() * otherIds.length)]];
      const side = i % 2 === 0 ? 1 : -1;
      const radius = 14 + Math.random() * 34;
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 12),
        new THREE.MeshStandardMaterial({ color: srcPlanet.ground, roughness: 0.85, emissive: srcPlanet.ground, emissiveIntensity: 0.1 })
      );
      body.position.set(
        side * (130 + Math.random() * 220),
        (Math.random() - 0.5) * 160,
        -(150 + Math.random() * (this.travelGoal + 350))
      );
      body.userData = { spin: 0.05 + Math.random() * 0.15 };
      this.scene.add(body);
      this.sideBodies.push(body);
      if (i === 1 || i === 4) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(radius * 1.4, radius * 2.1, 32),
          new THREE.MeshBasicMaterial({ color: srcPlanet.outfitColor || 0xd4af37, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
        );
        ring.rotation.x = Math.PI / 2.5;
        body.add(ring);
      }
    }

    this.ship = createShip();
    this.scene.add(this.ship);

    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.explosions = [];
    this.spawnTimer = 1.5;
    this.traveled = 0;
    this.arrived = false;
    this.health = opts.health ?? 100;
    this.maxHealth = opts.maxHealth ?? 100;
    this.fireCooldown = 0;
    this.kills = 0;
    this.forcedCombat = opts.forcedCombat ?? true;
    this.forcedKillsNeeded = opts.forcedCombat ? 3 : 0;
  }

  spawnEnemy() {
    const x = (Math.random() - 0.5) * 26;
    const y = (Math.random() - 0.5) * 16 + 2;
    const z = this.ship.position.z - (60 + Math.random() * 40);
    const e = createSpaceEnemy(new THREE.Vector3(x, y, z));
    this.scene.add(e);
    this.enemies.push(e);
  }

  update(dt, callbacks = {}) {
    applyLookInput();
    if (this.arrived) { consumeOneShots(); return; }

    const forwardSpeed = 20;
    this.ship.position.z -= forwardSpeed * dt;
    this.traveled += forwardSpeed * dt;

    const targetX = THREE.MathUtils.clamp(this.ship.position.x + input.moveX * 14 * dt, -22, 22);
    const targetY = THREE.MathUtils.clamp(this.ship.position.y + input.moveY * 10 * dt, -14, 14);
    this.ship.position.x = targetX;
    this.ship.position.y = targetY;
    this.ship.rotation.z = -input.moveX * 0.5;
    this.ship.rotation.x = input.moveY * 0.25;

    const flick = 1 + Math.sin(performance.now() * 0.02) * 0.2;
    this.ship.userData.flame.scale.set(flick, flick, 1);
    this.sideBodies.forEach((b) => { b.rotation.y += b.userData.spin * dt; });

    this.fireCooldown -= dt;
    if ((input.fireHeld || input.firePressed) && this.fireCooldown <= 0) {
      this.fireCooldown = 0.2;
      const origin = this.ship.position.clone();
      origin.z -= 1.4;
      const p = createProjectile(origin, new THREE.Vector3(0, 0, -1), { color: 0x8dffb0, speed: 60, damage: 12, owner: 'player' });
      this.scene.add(p);
      this.projectiles.push(p);
      sfx.shoot();
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < 5 && this.traveled < this.travelGoal - 40) {
      this.spawnTimer = 2.2 + Math.random() * 1.6;
      this.spawnEnemy();
    }

    this.enemies.forEach((e) => {
      updateSpaceEnemy(e, dt, this.ship.position, (origin, dir) => {
        const p = createProjectile(origin, dir, { color: 0xff5050, speed: 26, damage: 8, owner: 'enemy' });
        this.scene.add(p);
        this.enemyProjectiles.push(p);
        sfx.enemyShoot();
      });
    });

    updateProjectiles(this.projectiles, dt, this.scene);
    updateProjectiles(this.enemyProjectiles, dt, this.scene);
    updateExplosions(this.explosions, dt, this.scene);

    // player projectile vs enemy
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      for (const e of this.enemies) {
        if (!e.userData.alive) continue;
        if (p.position.distanceTo(e.position) < 1.6) {
          e.userData.hp -= p.userData.damage;
          this.scene.remove(p);
          this.projectiles.splice(i, 1);
          if (e.userData.hp <= 0) {
            e.userData.alive = false;
            this.explosions.push(createExplosion(this.scene, e.position, 0xffaa33));
            this.scene.remove(e);
            this.kills++;
            sfx.explosion();
            callbacks.onEnemyKilled && callbacks.onEnemyKilled();
          } else {
            sfx.hit();
          }
          break;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.userData.alive);

    // enemy projectile vs ship
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      if (p.position.distanceTo(this.ship.position) < 1.3) {
        this.health -= p.userData.damage;
        this.explosions.push(createExplosion(this.scene, this.ship.position.clone(), 0xff5050, 8));
        this.scene.remove(p);
        this.enemyProjectiles.splice(i, 1);
        sfx.playerHurt();
        callbacks.onPlayerHit && callbacks.onPlayerHit(this.health);
      }
    }

    // camera
    const camTarget = this.ship.position.clone();
    const desired = new THREE.Vector3(
      camTarget.x + Math.sin(camState.yaw) * 2,
      camTarget.y + 2.2 + Math.sin(camState.pitch) * 1,
      camTarget.z + 7
    );
    this._camDesired = desired;
    this._camTarget = camTarget;

    if (this.traveled >= this.travelGoal) {
      this.arrived = true;
      callbacks.onArrive && callbacks.onArrive();
    }
    if (this.health <= 0 && !this.destroyedFlag) {
      this.destroyedFlag = true;
      callbacks.onDestroyed && callbacks.onDestroyed();
    }

    consumeOneShots();
  }

  updateCamera(camera, dt) {
    if (!this._camDesired) return;
    const lerpT = 1 - Math.pow(0.0001, dt);
    camera.position.lerp(this._camDesired, lerpT);
    camera.lookAt(this._camTarget.x, this._camTarget.y + 0.5, this._camTarget.z - 5);
  }

  progress01() { return Math.min(1, this.traveled / this.travelGoal); }
}
