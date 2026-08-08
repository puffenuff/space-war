
function makeLabel(text, color = '#eaffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(6,10,24,0.75)';
  ctx.roundRect ? ctx.roundRect(0, 0, 256, 64, 12) : ctx.rect(0, 0, 256, 64);
  ctx.fill();
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 0.8, 1);
  return sprite;
}

function buildShopBuilding(color, label) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 4.2), new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 }));
  base.position.y = 1.3;
  base.castShadow = true; base.receiveShadow = true;
  g.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.3, roughness: 0.5 }));
  roof.position.y = 3.3; roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.7, 0.15), new THREE.MeshStandardMaterial({ color: 0x1c2a3a, emissive: 0x123044, emissiveIntensity: 0.5 }));
  door.position.set(0, 0.9, 2.12);
  g.add(door);
  const sign = makeLabel(label);
  sign.position.set(0, 3.9, 0);
  g.add(sign);
  return g;
}

function buildBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1330);
  scene.fog = new THREE.Fog(0x0a1330, 60, 220);

  const ambient = new THREE.AmbientLight(0xaeeaff, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(40, 70, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  scene.add(sun);

  // ---- outer landscape (visible through glass) ----
  const outerGround = new THREE.Mesh(
    new THREE.CircleGeometry(400, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a3355, roughness: 1 })
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.05;
  scene.add(outerGround);
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 55 + Math.random() * 300;
    const star = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 6, 6 + Math.random() * 18, 5), new THREE.MeshStandardMaterial({ color: 0x394a7a, roughness: 1 }));
    star.position.set(Math.cos(a) * r, star.geometry.parameters.height / 2 - 0.2, Math.sin(a) * r);
    scene.add(star);
  }

  // ---- plaza floor ----
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(38, 48), new THREE.MeshStandardMaterial({ color: 0x384766, roughness: 0.8, metalness: 0.1 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.receiveShadow = true;
  scene.add(plaza);
  const ring = new THREE.Mesh(new THREE.RingGeometry(37, 38.6, 48), new THREE.MeshStandardMaterial({ color: 0x5ecbff, emissive: 0x1a5a7a, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  function groundHeightFn() { return 0; }

  // ---- dome (bottom 10% opaque ring, top 90% glass) ----
  const domeRadius = 40;
  const ringHeight = domeRadius * 0.28; // structural base ring (visually ~"bottom 10%" of the tall dome silhouette)
  const baseRing = new THREE.Mesh(
    new THREE.CylinderGeometry(domeRadius, domeRadius * 1.02, ringHeight, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x232b45, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })
  );
  baseRing.position.y = ringHeight / 2;
  scene.add(baseRing);

  const glassDome = new THREE.Mesh(
    new THREE.SphereGeometry(domeRadius, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, envMapIntensity: 1 })
  );
  glassDome.position.y = ringHeight;
  scene.add(glassDome);

  // dome ribs for structure look
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const ribPts = [];
    const segs = 14;
    for (let s = 0; s <= segs; s++) {
      const theta = (s / segs) * (Math.PI / 2);
      const r = domeRadius * Math.sin(theta);
      const y = domeRadius * Math.cos(theta) + ringHeight;
      ribPts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(ribPts);
    const ribGeo = new THREE.TubeGeometry(curve, 20, 0.12, 5, false);
    const rib = new THREE.Mesh(ribGeo, new THREE.MeshStandardMaterial({ color: 0x8fa5c0, metalness: 0.7, roughness: 0.3 }));
    scene.add(rib);
  }

  // ---- shop buildings ----
  const shopDefs = [
    { key: 'parts', color: 0x3a6ea5, label: 'PARTS SHOP', pos: [-14, 0, -10] },
    { key: 'upgrades', color: 0x6a3aa5, label: 'UPGRADES', pos: [14, 0, -10] },
    { key: 'tools', color: 0x3aa563, label: 'TOOL SHOP', pos: [-14, 0, 12] },
    { key: 'food', color: 0xa57a3a, label: 'FOOD SHOP', pos: [14, 0, 12] },
  ];
  const shops = [];
  shopDefs.forEach((def) => {
    const b = buildShopBuilding(def.color, def.label);
    b.position.set(def.pos[0], 0, def.pos[2]);
    b.lookAt(0, 0, 0);
    b.userData = { type: 'shop', shopKey: def.key, label: def.label };
    scene.add(b);
    shops.push(b);
  });

  // ---- launch pad ----
  const padGroup = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 0.6, 20), new THREE.MeshStandardMaterial({ color: 0x555f70, metalness: 0.5, roughness: 0.5 }));
  pad.position.y = 0.3;
  padGroup.add(pad);
  const rocketGroup = new THREE.Group();
  const rHull = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 5, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.3 }));
  rHull.position.y = 3;
  rocketGroup.add(rHull);
  const rNose = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 14), new THREE.MeshStandardMaterial({ color: 0xff4d4d }));
  rNose.position.y = 6.3;
  rocketGroup.add(rNose);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.9), new THREE.MeshStandardMaterial({ color: 0x4d79ff }));
    const a = (i / 3) * Math.PI * 2;
    fin.position.set(Math.sin(a) * 1.0, 0.9, Math.cos(a) * 1.0);
    fin.rotation.y = a;
    rocketGroup.add(fin);
  }
  padGroup.add(rocketGroup);
  padGroup.position.set(0, 0, -26);
  padGroup.userData = { type: 'launchPad', label: 'Launch Pad', rocketGroup };
  scene.add(padGroup);
  const padSign = makeLabel('LAUNCH PAD', '#ffd35e');
  padSign.position.set(0, 8, -26);
  scene.add(padSign);

  // ---- star map terminal ----
  const starMap = new THREE.Group();
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0x2a3550, metalness: 0.5, roughness: 0.4 }));
  pedestal.position.y = 0.8;
  starMap.add(pedestal);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshStandardMaterial({ color: 0x6fd7ff, emissive: 0x2a8fbf, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 }));
  orb.position.y = 2.1;
  starMap.add(orb);
  starMap.position.set(0, 0, 22);
  starMap.userData = { type: 'starMap', label: 'Star Map', orb };
  scene.add(starMap);
  const smSign = makeLabel('STAR MAP', '#6fd7ff');
  smSign.position.set(0, 3.2, 22);
  scene.add(smSign);

  // ---- base rover garage (find a vehicle at base, already usable) ----
  const garage = new THREE.Group();
  const garageBody = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4.5), new THREE.MeshStandardMaterial({ color: 0x445066, roughness: 0.7 }));
  garageBody.position.y = 1.5;
  garage.add(garageBody);
  garage.position.set(24, 0, 4);
  scene.add(garage);
  const baseRover = createRover([24, 0.05, 8], true);
  baseRover.userData.type = 'vehicle';
  scene.add(baseRover);
  const garageSign = makeLabel('GARAGE', '#c9d6ff');
  garageSign.position.set(24, 4.2, 4);
  scene.add(garageSign);

  // ---- wardrobe stand: holographic display case for switching found outfits ----
  const wardrobe = new THREE.Group();

  // tiered glowing platform
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x1a2438, metalness: 0.6, roughness: 0.3 });
  const platformBase = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.3, 16), platformMat);
  platformBase.position.y = 0.15;
  wardrobe.add(platformBase);
  const platformMid = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.35, 16), platformMat);
  platformMid.position.y = 0.5;
  wardrobe.add(platformMid);
  const wardrobePost = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0x2a3550, metalness: 0.6, roughness: 0.3 }));
  wardrobePost.position.y = 1.15;
  wardrobe.add(wardrobePost);

  // holographic energy field encasing the mannequin
  const fieldMat = new THREE.MeshBasicMaterial({ color: 0x6fd7ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const field = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.4, 16, 1, true), fieldMat);
  field.position.y = 2.6;
  wardrobe.add(field);

  // mannequin with arms for a more humanoid silhouette
  const mannequinMat = new THREE.MeshStandardMaterial({ color: 0xd8dfe8, emissive: 0x3a5a7a, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.4 });
  const mannTorso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), mannequinMat);
  mannTorso.position.y = 1.9;
  wardrobe.add(mannTorso);
  const mannArmGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.7, 8);
  const mannArmL = new THREE.Mesh(mannArmGeo, mannequinMat); mannArmL.position.set(-0.4, 1.75, 0); mannArmL.rotation.z = 0.25;
  const mannArmR = new THREE.Mesh(mannArmGeo, mannequinMat); mannArmR.position.set(0.4, 1.75, 0); mannArmR.rotation.z = -0.25;
  wardrobe.add(mannArmL, mannArmR);
  const mannHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), mannequinMat);
  mannHead.position.y = 2.45;
  wardrobe.add(mannHead);
  const mannVisor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: 0x0a2a3a, emissive: 0x6fd7ff, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.15 }));
  mannVisor.position.set(0, 2.45, 0.14);
  wardrobe.add(mannVisor);

  // counter-rotating holographic rings
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 24), new THREE.MeshBasicMaterial({ color: 0x6fd7ff }));
  ringA.rotation.x = Math.PI / 2; ringA.position.y = 1.0;
  wardrobe.add(ringA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 8, 24), new THREE.MeshBasicMaterial({ color: 0xa66fff }));
  ringB.rotation.x = Math.PI / 2; ringB.position.y = 3.4;
  wardrobe.add(ringB);
  const groundRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.05, 8, 24), new THREE.MeshBasicMaterial({ color: 0x6fd7ff }));
  groundRing.rotation.x = Math.PI / 2; groundRing.position.y = 0.02;
  wardrobe.add(groundRing);

  // small orbiting glow motes
  const moteGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const motes = [];
  for (let i = 0; i < 5; i++) {
    const mote = new THREE.Mesh(moteGeo, new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x6fd7ff : 0xa66fff }));
    wardrobe.add(mote);
    motes.push(mote);
  }

  wardrobe.position.set(-24, 0, -4);
  wardrobe.userData = { type: 'wardrobe', label: 'Wardrobe', ringA, ringB, motes, mannVisor };
  scene.add(wardrobe);
  const wardrobeSign = makeLabel('WARDROBE', '#6fd7ff');
  wardrobeSign.position.set(-24, 4.4, -4);
  scene.add(wardrobeSign);

  return {
    scene, groundHeightFn,
    spawnPoint: { x: 0, z: 4 },
    shops, padGroup, starMap, baseRover, wardrobe,
    tick(dt, t) {
      orb.position.y = 2.1 + Math.sin(t * 2) * 0.1;
      orb.rotation.y = t;
      glassDome.material.opacity = 0.16 + Math.sin(t * 0.5) * 0.03;
      mannHead.rotation.y = Math.sin(t * 0.7) * 0.3;
      ringA.rotation.z = t * 1.4;
      ringB.rotation.z = -t * 0.9;
      mannVisor.material.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.3;
      motes.forEach((m, i) => {
        const a = t * 0.8 + (i / motes.length) * Math.PI * 2;
        m.position.set(Math.cos(a) * 1.5, 1.6 + Math.sin(t * 1.5 + i) * 0.6, Math.sin(a) * 1.5);
      });
    },
  };
}
