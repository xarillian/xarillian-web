// Northern lights as hanging curtains. Each has a crisp lower hem that wanders in slow folds, and rays that rise from it
// and thin out with height: oxygen green at the hem, climbing through teal into the violet and rose of the thin upper air.
const PALE = [184, 247, 212],
  GREEN = [63, 212, 154],
  TEAL = [52, 150, 168],
  VIOLET = [110, 88, 196],
  ROSE = [176, 74, 138];
// `hem` and `reach` are fractions of the sky's height: where the lower edge hangs, and how far the rays climb above it.
// The far curtain sits low and short, the near one high and tall, as arcs stacked toward the north would.
const CURTAINS = [
  { hem: 0.66, reach: 0.22, glow: 0.7, seed: 1.3 },
  { hem: 0.56, reach: 0.36, glow: 0.85, seed: 4.1 },
  { hem: 0.44, reach: 0.42, glow: 1, seed: 7.7 },
];
// Seconds of scene time are slowed to this fraction: curtains drift, they don't dance.
const PACE = 0.3;
// How many flat steps of brightness a curtain is drawn in, and how much of the sky the brightest one covers.
const STEPS = 4,
  OPACITY = 0.85;

// `horizon` is the y where the far shore meets the sky; `strength` is 1 for a good display on a dark night; less dims it, more fills the sky.
export function aurora(width, horizon, scale, t, strength) {
  const slow = t * PACE;
  const curtains = CURTAINS.map((curtain) => hang(curtain, width, horizon, scale, slow, strength));

  // `th` is the caller's Bayer dither threshold; `sky` is the sky colour behind this pixel. The light is laid over the sky
  // in a few flat steps of opacity, stippled only where one step meets the next.
  const at = (x, y, th, sky) => {
    let glow = 0,
      up = 0;
    for (const { hem, reach, shine } of curtains) {
      const rise = (hem[x] - y) / reach[x];
      if (rise < 0 || rise > 1) continue;
      const here = shine[x] * (1 - rise);
      if (here > glow) [glow, up] = [here, rise];
    }
    const step = Math.min(STEPS, Math.floor(glow * STEPS + th));
    if (!step) return null;
    if (step >= STEPS && up < 0.12) return PALE;
    const tint = up + (th - 0.5) * 0.3;
    const hue = tint > 0.74 ? ROSE : tint > 0.54 ? VIOLET : tint > 0.36 ? TEAL : GREEN;
    return veil(sky, hue, (step / STEPS) * OPACITY);
  };

  return { at };
}

// Per column: the hem's y, the rays' length, and how brightly the curtain shines there.
function hang({ hem: height, reach: length, glow, seed }, width, horizon, scale, slow, strength) {
  const hem = new Float32Array(width),
    reach = new Float32Array(width),
    shine = new Float32Array(width);
  const hemAt = (u) =>
    horizon *
    (height +
      0.05 * Math.sin(u * 0.017 + slow * 0.11 + seed) +
      0.03 * Math.sin(u * 0.041 - slow * 0.17 + seed * 2.3) +
      0.012 * Math.sin(u * 0.097 + slow * 0.29 + seed * 5.1));
  for (let x = 0; x < width; x++) {
    const u = x / scale;
    hem[x] = hemAt(u);
    const rays = ripple(u * 0.5 + slow * 0.6, seed);
    // Brighter rays also climb higher, which keeps the curtain's top ragged.
    reach[x] = horizon * length * (0.6 + 0.2 * Math.sin(u * 0.011 + slow * 0.07 + seed * 3.7) + 0.2 * rays);
    // A curtain is a sheet seen from below: where the hem turns steeply the sheet is edge-on, stacking more light into the column.
    const fold = Math.min(1, Math.abs(hemAt(u + 1) - hemAt(u - 1)) / (horizon * 0.004));
    // Long stretches of each curtain fade out entirely, so the sky holds a few loose ribbons rather than three full stripes.
    const patch = clamp(0.7 + 1.1 * Math.sin(u * 0.008 + slow * 0.05 + seed * 1.9) + 0.4 * Math.sin(u * 0.023 - slow * 0.09 + seed), 0, 1);
    shine[x] = strength * glow * patch * (0.4 + 0.6 * rays) * (0.75 + 0.25 * fold);
  }
  return { hem, reach, shine };
}

// Smooth 1D value noise in [0, 1], for the fine rays within a curtain.
function ripple(u, seed) {
  const i = Math.floor(u),
    f = u - i,
    a = grain(i, seed),
    b = grain(i + 1, seed);
  return a + (b - a) * f * f * (3 - 2 * f);
}

function grain(i, seed) {
  const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

const veil = (sky, c, f) => [
  Math.round(sky[0] + (c[0] - sky[0]) * f),
  Math.round(sky[1] + (c[1] - sky[1]) * f),
  Math.round(sky[2] + (c[2] - sky[2]) * f),
];
