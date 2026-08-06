import * as THREE from 'three';
import { input } from './controls.js';
import { camState, applyLookInput } from './player.js';

export function createRover(pos, repaired = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: repaired ? 0xc94f2e : 0x6b6b6b, roughness: repaired ? 0.5 : 0.9, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.6), bodyMat);
  body.position.y = 0.9;
  body.castShadow = true;
  g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 1.4), new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.4, roughness: 0.4 }));
  cab.position.set(-0.4, 1.5, 0);
  g.add(cab);
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });
  const wheels = [];
  [[-0.9, 0.5, 0.9], [0.9, 0.5, 0.9], [-0.9, 0.5, -0.9], [0.9, 0.5, -0.9]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  });
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x999 }));
  antenna.position.set(0.6, 1.6, -0.6);
  g.add(antenna);

  g.position.set(pos[0], pos[1], pos[2]);
  g.userData = { type: 'vehicle', repaired, wheels, bodyMat, driving: false, heading: 0 };
  return g;
}

export function setRepaired(vehicle) {
  vehicle.userData.repaired = true;
  vehicle.userData.bodyMat.color.set(0xc94f2e);
  vehicle.userData.bodyMat.roughness = 0.5;
}

export class VehicleController {
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
    const dir = new THREE.Vector3(Math.sin(u.heading), 0, Math.cos(u.heading));
    const speed = Math.abs(moveY) > 0.05 ? this.speed * Math.sign(moveY) : 0;
    this.vehicle.position.addScaledVector(dir, speed * dt);
    this.vehicle.position.y = this.getGroundHeight(this.vehicle.position.x, this.vehicle.position.z) + 0.05;
    this.vehicle.rotation.y = u.heading;
    u.wheels.forEach((w) => { w.rotation.x += speed * dt * 2; });

    // camera follows behind vehicle heading rather than free orbit
    camState.yaw = u.heading;
  }
}
