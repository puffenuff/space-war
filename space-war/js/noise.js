// ===================== SIMPLE VALUE NOISE (deterministic, seeded) =====================
function hash2(x, y, seed) {
  let n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { return t * t * (3 - 2 * t); }

function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

// fractal sum for rolling hills
function fbm(x, y, seed = 0, octaves = 4) {
  let total = 0, amp = 1, freq = 1, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise(x * freq, y * freq, seed + i * 17.3) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return total / maxAmp;
}

// terrain height function shared by generation + collision
function terrainHeight(x, z, seed, hillScale = 9) {
  const n = fbm(x * 0.02, z * 0.02, seed, 4);
  let h = (n - 0.5) * 2 * hillScale;
  // gentle bowl near center (base landing zone) flattened
  const distFromCenter = Math.hypot(x, z);
  const flatten = Math.max(0, 1 - distFromCenter / 26);
  h *= (1 - flatten * 0.95);
  return h;
}
