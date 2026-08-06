import * as THREE from 'three';
import { input } from './controls.js';

// ===================== CAMERA ORBIT STATE (shared across scenes) =====================
export const camState = { yaw: 0, pitch: 0.42, distance: 9 };

export function applyLookInput(sensitivity = 0.006) {
  camState.yaw -= input.lookDX * sensitivity;
  camState.pitch -= input.lookDY * sensitivity * 0.7;
  camState.pitch = Math.max(0.08, Math.min(1.25, camState.pitch));
}

export function updateThirdPersonCamera(camera, target, dt, distance = camState.distance, heightOffset = 1.6) {
  const dist = distance;
  const desired = new THREE.Vector3(
    target.x + Math.sin(camState.yaw) * Math.cos(camState.pitch) * dist,
    target.y + heightOffset + Math.sin(camState.pitch) * dist,
    target.z + Math.cos(camState.yaw) * Math.cos(camState.pitch) * dist
  );
  const lerpT = 1 - Math.pow(0.0001, dt);
  camera.position.lerp(desired, lerpT);
  camera.lookAt(target.x, target.y + heightOffset * 0.7, target.z);
}

// ===================== ASTRONAUT MESH =====================
function limb(w, h, d, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  m.castShadow = true;
  return m;
}

export function createAstronaut(suitColor = 0xe8e8e8) {
  const group = new THREE.Group();
  group.name = 'astronaut';

  const body = limb(0.62, 0.8, 0.42, suitColor);
  body.position.y = 1.0;
  group.add(body);

  const chestLight = limb(0.18, 0.18, 0.06, 0xff5a5a);
  chestLight.position.set(0, 1.05, 0.24);
  group.add(chestLight);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  head.position.y = 1.68;
  head.castShadow = true;
  group.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshStandardMaterial({ color: 0x0a2a3a, metalness: 0.6, roughness: 0.15, emissive: 0x0a3a55, emissiveIntensity: 0.4 }));
  visor.position.set(0, 1.68, 0.14);
  visor.rotation.x = -0.15;
  group.add(visor);

  const armL = limb(0.22, 0.62, 0.26, suitColor); armL.position.set(-0.44, 1.05, 0); armL.geometry.translate(0, -0.31, 0); armL.position.y = 1.36;
  const armR = armL.clone(); armR.position.x = 0.44;
  group.add(armL, armR);

  const legL = limb(0.24, 0.62, 0.28, 0xcfcfcf); legL.geometry.translate(0, -0.31, 0); legL.position.set(-0.18, 0.62, 0);
  const legR = legL.clone(); legR.position.x = 0.18;
  group.add(legL, legR);

  // jetpack
  const pack = limb(0.5, 0.6, 0.22, 0x555a66);
  pack.position.set(0, 1.05, -0.32);
  group.add(pack);
  const flameGeo = new THREE.ConeGeometry(0.09, 0.4, 8);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x5ecbff, transparent: true, opacity: 0.0 });
  const flameL = new THREE.Mesh(flameGeo, flameMat.clone());
  flameL.rotation.x = Math.PI;
  flameL.position.set(-0.14, 0.72, -0.32);
  const flameR = flameL.clone();
  flameR.position.x = 0.14;
  group.add(flameL, flameR);

  // gun
  const gun = new THREE.Group();
  const gunBody = limb(0.1, 0.14, 0.45, 0x333333);
  gunBody.position.z = 0.2;
  gun.add(gunBody);
  gun.position.set(0.5, 1.15, 0.15);
  group.add(gun);

  group.userData = { body, head, armL, armR, legL, legR, flameL, flameR, gun, flameMat: [flameL.material, flameR.material] };
  return group;
}

// ===================== PLAYER CONTROLLER =====================
export class Player {
  constructor(opts = {}) {
    this.mesh = createAstronaut();
    this.mesh.position.set(opts.x || 0, 0, opts.z || 0);

    this.heading = 0; // facing angle
    this.velY = 0;
    this.onGround = true;
    this.walkT = 0;
    this.baseSpeed = 6.2;
    this.jumpPower = 8.4;
    this.gravity = -22;
    this.footOffset = 0;
    this.digging = false;
    this.digProgress = 0;
    this.disabled = false; // true while driving a vehicle etc.
    this.fireCooldown = 0;
    this.recoil = 0;

    this.onFire = opts.onFire || (() => {});
    this.getGroundHeight = opts.getGroundHeight || (() => 0);
  }

  get position() { return this.mesh.position; }

  addTo(scene) { scene.add(this.mesh); }
  removeFrom(scene) { scene.remove(this.mesh); }

  worldFireOrigin() {
    const gun = this.mesh.userData.gun;
    const p = new THREE.Vector3();
    gun.getWorldPosition(p);
    return p;
  }
  worldFireDirection() {
    return new THREE.Vector3(Math.sin(this.heading), 0.03, Math.cos(this.heading)).normalize();
  }

  update(dt, speedMult = 1) {
    applyLookInput();

    if (this.disabled) { return; }

    const moveX = input.moveX, moveY = input.moveY;
    const moving = Math.abs(moveX) > 0.05 || Math.abs(moveY) > 0.05;

    // movement relative to camera yaw
    const yaw = camState.yaw;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const move = new THREE.Vector3();
    move.addScaledVector(fwd, moveY);
    move.addScaledVector(right, moveX);
    if (move.lengthSq() > 1) move.normalize();

    const speed = this.baseSpeed * speedMult;
    this.mesh.position.x += move.x * speed * dt;
    this.mesh.position.z += move.z * speed * dt;

    if (moving) {
      const targetHeading = Math.atan2(move.x, move.z);
      this.heading = lerpAngle(this.heading, targetHeading, 1 - Math.pow(0.0001, dt));
      this.walkT += dt * speed * 1.4;
    } else {
      this.walkT *= 0.9;
    }

    // ground collision
    const groundY = this.getGroundHeight(this.mesh.position.x, this.mesh.position.z);
    if (input.jumpPressed && this.onGround) {
      this.velY = this.jumpPower;
      this.onGround = false;
    }
    this.velY += this.gravity * dt;
    this.mesh.position.y += this.velY * dt;
    if (this.mesh.position.y <= groundY) {
      this.mesh.position.y = groundY;
      this.velY = 0;
      this.onGround = true;
    }

    // fire
    this.fireCooldown -= dt;
    if ((input.fireHeld || input.firePressed) && this.fireCooldown <= 0) {
      this.fireCooldown = 0.28;
      this.recoil = 1;
      this.onFire(this.worldFireOrigin(), this.worldFireDirection());
    }

    this.animate(dt, moving);
    this.mesh.rotation.y = this.heading;
  }

  animate(dt, moving) {
    const u = this.mesh.userData;
    const swing = Math.sin(this.walkT) * (moving ? 0.7 : 0);
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.8;
    u.armR.rotation.x = swing * 0.8;

    // idle bob
    const bob = moving ? Math.abs(Math.sin(this.walkT)) * 0.05 : Math.sin(performance.now() * 0.002) * 0.02;
    u.body.position.y = 1.0 + bob;
    u.head.position.y = 1.68 + bob;

    // jetpack flame when airborne
    const flameOn = !this.onGround;
    const targetOpacity = flameOn ? 0.9 : 0;
    u.flameMat.forEach((m) => { m.opacity += (targetOpacity - m.opacity) * Math.min(1, dt * 10); });
    const flick = 1 + Math.sin(performance.now() * 0.03) * 0.15;
    u.flameL.scale.set(flick, flick, flick);
    u.flameR.scale.set(flick, flick, flick);

    // gun recoil
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - dt * 6);
      u.gun.position.z = 0.15 - this.recoil * 0.12;
    }

    // digging animation
    if (this.digging) {
      u.body.rotation.x = 0.5 + Math.sin(performance.now() * 0.02) * 0.1;
      u.armR.rotation.x = -1.2 + Math.sin(performance.now() * 0.03) * 0.4;
    } else {
      u.body.rotation.x += (0 - u.body.rotation.x) * Math.min(1, dt * 8);
    }
  }
}

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
