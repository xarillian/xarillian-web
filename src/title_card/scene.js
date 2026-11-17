import { SCENE_DAY_HOURS, SCENE_SUNRISE } from './almanac.js';
import { aurora as createAurora } from './aurora.js';
import { blackHole as createBlackHole, DISK_LIGHT } from './black_hole.js';
import { starfield } from './stars.js';
import { sunEater as createSunEater } from './sun_eater.js';

const SCENE_SUNSET = SCENE_SUNRISE + SCENE_DAY_HOURS;
const SQUATCH = Math.random() < 0.01;
const SQUATCH_FRAMES = [
  ['..XX.', '.XXX.', 'XXXX.', '.XXXX', '.XXX.', '.X.X.', 'X...X'],
  ['..XX.', '.XXX.', '.XXX.', '.XXX.', '.XX..', '.XX..', '.X.X.'],
];

// Bridge geometry as fractions of `reach`: near-bank start (`near`), perspective vanishing point (`vanish`),
// foreshortened scale at the far shore (`end`), pier depth below the horizon at the near bank (`eye`),
// heights of deck, truss, and pier width (`deck`, `truss`, `pier`), span count, and far-truss scale factor (`across`).
// Where the scene is seen from, worked back from the bridge. The real one runs 343.9° from true north, so that is the
// bearing of its vanishing point: we stand on the south bank just downstream of it, looking northwest. `yaw` is how far
// left of the bridge the camera points, and `focal` its focal length as a fraction of `reach`; both follow from the truss
// being about 9 m tall and the bridge 316 m long, and they put the camera's axis mid-screen with a 70° field of view.
const CAMERA = { bridgeBearing: 343.9, yaw: 36, focal: 0.72 };
const BRIDGE = { near: -0.1, vanish: 1.02, end: 0.14, eye: 0.047, deck: 0.1, truss: 0.156, pier: 0.06, spans: 7, across: 0.94 };

export function createScene(w, h) {
  // 4x4 Bayer ordered-dithering matrix (0..15). Comparing a [0, 1] value against `dither(x, y)` produces
  // deterministic pixel-art stippling without alpha blending.
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const mix = (a, b, f) => [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  // Deterministic 2D integer hash returning [0, 1) via prime multiplication and XOR-shift avalanche.
  const hash = (x, y) => {
    let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const dither = (x, y) => B[(y & 3) * 4 + (x & 3)] / 16;
  // 2D value noise: bilinearly interpolates `hash` across integer grid corners using smoothstep (3t^2 - 2t^3).
  const noise = (x, y) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      xf = x - xi,
      yf = y - yi;
    const u = xf * xf * (3 - 2 * xf),
      v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi),
      b = hash(xi + 1, yi),
      c = hash(xi, yi + 1),
      e = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
  };
  const SKY = {
    night: ['#0e0c22', '#120f2a', '#1b1637', '#241b46', '#2f2356', '#3d2c64', '#4e3672'].map(hex),
    dawn: ['#2b2a5e', '#514680', '#8a5f93', '#c9778f', '#f09a7e', '#f8c387', '#fde3a6'].map(hex),
    day: ['#2f6fb7', '#3f86c9', '#58a0d6', '#7bb8e0', '#a3cfe8', '#c6e1ee', '#e3eff0'].map(hex),
    dusk: ['#1e1a4a', '#3a2a6c', '#6b3a80', '#a94a7a', '#de6a62', '#f29a56', '#f9cf7a'].map(hex),
    // Air lit by a disk that pours out ultraviolet scatters violet, the way sunlit air scatters blue.
    hole: ['#231a5e', '#2a2068', '#312774', '#392e82', '#43368f', '#4e409c', '#5b4ca9'].map(hex),
  };
  const TONE = {
    night: { light: 0, sil: 0.9, ink: hex('#0b0f19') },
    dawn: { light: 0.5, sil: 0.62, ink: hex('#2a2140') },
    day: { light: 1, sil: 0.05, ink: hex('#16222c') },
    dusk: { light: 0.45, sil: 0.72, ink: hex('#1e1436') },
    // Harsh light from a blue-white source: brighter than dusk, but warm colours still wash toward violet-grey.
    hole: { light: 0.5, sil: 0.58, ink: hex('#1d2150') },
  };
  const KEYS = [
    [0, 'night'],
    [5, 'night'],
    [6.5, 'dawn'],
    [8.5, 'day'],
    [16.5, 'day'],
    [19, 'dusk'],
    [21, 'night'],
    [24, 'night'],
  ];
  const SEASON = {
    spring: { far: '#4f7d54', farHi: '#8fbf6c', leaf: '#3a6a3a', leafHi: '#9fd07a', ever: '#1f4a33', everHi: '#3f7a4d' },
    summer: { far: '#2f5d4a', farHi: '#3d7558', leaf: '#2a5a34', leafHi: '#5c9a4a', ever: '#173a2c', everHi: '#2c6a45' },
    autumn: { far: '#4f5a34', farHi: '#c7902f', leaf: '#b5611f', leafHi: '#f0b23a', ever: '#1f3a2a', everHi: '#35603a' },
    winter: { far: '#56667e', farHi: '#dfe7f0', leaf: '#3a3440', leafHi: '#eaf0f6', ever: '#22303f', everHi: '#eaf0f6' },
  };
  for (const key in SEASON) for (const name in SEASON[key]) SEASON[key][name] = hex(SEASON[key][name]);
  const WX = {
    clear: { cover: 0.2, over: 0 },
    cloudy: { cover: 0.62, over: 0.45 },
    rain: { cover: 0.85, over: 0.7, rain: 1 },
    'sun shower': { cover: 0.4, over: 0.12, rain: 0.45, bow: true },
    thunderstorm: { cover: 1, over: 0.9, grey: ['#0e1018', '#3b4152'], rain: 1.9, bolts: true },
    mammatus: { cover: 0.25, over: 0.3, pouches: true },
    smoke: { cover: 0, over: 0.78, grey: ['#241a18', '#b98a5e'], fog: 0.45, ember: true },
    fog: { cover: 0.4, over: 0.5, fog: 0.85 },
    snow: { cover: 0.7, over: 0.6, snow: 1 },
    whiteout: { cover: 0.9, over: 0.95, grey: ['#4a5266', '#e6ebf1'], fog: 1.7, snow: 3.2, gale: true },
    'sun dogs': { cover: 0.05, over: 0.1, dogs: true, dust: true },
    hoarfrost: { cover: 0.08, over: 0.12, fog: 0.2, frost: 0.78, dust: true },
    'ice fog': { cover: 0.2, over: 0.55, grey: ['#2a3148', '#c9d3e0'], fog: 0.7, pillars: true, dust: true },
    'freezing rain': { cover: 0.8, over: 0.7, rain: 0.7, glaze: true },
    hail: { cover: 0.95, over: 0.85, grey: ['#101612', '#44524a'], rain: 0.4, hail: true },
    'funnel cloud': { cover: 1, over: 0.88, grey: ['#0f1410', '#3d4a44'], rain: 0.5, funnel: true },
    noctilucent: { cover: 0.05, over: 0, wisps: true },
  };
  for (const kind of Object.values(WX)) if (kind.grey) kind.grey = kind.grey.map(hex);
  const COLD_WX = { clear: { cover: 0, over: 0 } };
  const NO_WX = { cover: 0, over: 0 };
  // The aurora keeps to the dead of night: scene hours either side of the night's midpoint where it is out in full, and
  // the further hour over which it fades in before that and out after.
  const AURORA = { midnight: (SCENE_SUNSET + SCENE_SUNRISE) / 2 + 12, full: 1.5, fade: 1 };
  // Fog opacity multipliers by depth layer so foreground elements cut through fog more clearly than distant ones.
  const FOG = { near: 0.33, bridge: 0.5, water: 0.6, far: 0.7 };
  // Jump interval (30s) and airborne duration (0.9s). Two sturgeon entries to one pike and one walleye give a 2:1:1 ratio.
  const LEAP_EVERY = 30,
    LEAP = 0.9;
  const FISH = [
    { back: '#4f4a40', belly: '#b3a78e', length: 10 },
    { back: '#4f4a40', belly: '#b3a78e', length: 10 },
    { back: '#3d5634', belly: '#cfd9a2', length: 8 },
    { back: '#6e6a2c', belly: '#e6d48c', length: 6 },
  ].map((f) => ({ ...f, back: hex(f.back), belly: hex(f.belly) }));
  const BOW = ['#7a5bd6', '#3fa7e0', '#4fd08a', '#f2d04a', '#ef6a4a'].map(hex),
    DOG = hex('#ffd9a0'),
    EMBER = hex('#e8452c'),
    RIME = hex('#eef4fa'),
    TWIG = hex('#4a3a40'),
    NLC = hex('#5ab8f0'),
    NLC_HI = hex('#b6f0ff'),
    PILLARS = ['#ffb86b', '#bfe0ff', '#ff9ad5'].map(hex);
  const WHITE = [255, 255, 255],
    FLASH = hex('#e6e9ff'),
    STAR = hex('#f4ecd8'),
    LAMP = hex('#ffd36b'),
    FIREFLY = hex('#e8f59a'),
    FLAKE = hex('#eef3f8'),
    RED_LEAF = hex('#b9452a'),
    FLOATER = hex('#5a5e6a');
  // Earth's umbra on the moon: dark copper at its heart, redder toward its edge.
  const COPPER = ['#6e2a24', '#a8503a'].map(hex);
  // [dark, light] colour endpoints blended by `light` (or by solar altitude for `SUN`).
  const GREY = ['#1c2030', '#8f99a8'].map(hex),
    DEEP = ['#151b33', '#2a5c8f'].map(hex),
    ICE = ['#3a4468', '#dfe7f0'].map(hex),
    SUN = ['#fff3c4', '#ff9a4a'].map(hex);
  const STEEL = hex('#4b3a3a'),
    POLE = hex('#3a3038'),
    PALE = hex('#e9e2cf');
  const ENGINE = hex('#b5452f');
  const CARS = ['#8a3b2e', '#3a4a5c', '#6b5a3a', '#2d2d38'].map(hex);
  const SASQUATCH = hex('#2b1d16');
  // Sizes are authored against a 250px reference height; `q(v)` scales a measurement to at least 1 scene pixel.
  const k = h / 250;
  // Clamping `reach` to `min(w, 1.9h)` preserves the bridge's aspect ratio on ultrawide and portrait screens alike.
  const reach = Math.min(w, h * 1.9);
  const q = (v) => Math.max(1, Math.round(v * k)),
    u = q(1);
  // Static seasonal layers holding palette indices into `M`: `F` (far bank), `S` (bridge steel/piers), `N` (near bank/trees).
  // `footing[x]` records the waterline y-coordinate of the bridge pier at column `x` for water reflections.
  const F = new Uint8Array(w * h),
    S = new Uint8Array(w * h),
    N = new Uint8Array(w * h),
    footing = new Int16Array(w);
  // Per-frame layer holding colour indices into `inks` for the moving train so water reflections can sample it with `S`.
  const carriage = new Uint8Array(w * h);
  let inks = [null];
  const CONCRETE = hex('#8f887c'),
    SAND = hex('#a8946a'),
    SNOWBANK = hex('#dfe7f0');
  let rail = null;
  let HZ = 0,
    lamps = [],
    season = '',
    prev = null,
    fadeAt = -1,
    shown = null,
    gazed = null;

  const build = (s) => {
    season = s;
    F.fill(0);
    S.fill(0);
    lamps = [];
    N.fill(0);
    let seed = 11;
    // Lehmer RNG (Park-Miller, multiplier 7^5 mod 2^31 - 1) for repeatable far-shore spruce placement.
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const winter = s === 'winter';
    const put = (L, x, y, m) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && x < w && y >= 0 && y < h) L[y * w + x] = m;
    };
    const rect = (L, x0, y0, x1, y1, m) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(L, x, y, m);
    };
    // Draws a conifer from apex (r = 0) to base (r = th). `(r % 7) / 6` modulates the cone width `hw * (r / th)`
    // into 7-row serrated branch tiers; pixels protruding past the row above (`Math.abs(dx) > last - 1`) take highlight `mh`.
    const spruce = (L, cx, base, th, hw, m, mh) => {
      let last = 0;
      for (let r = 0; r <= th; r++) {
        const wr = hw * (r / th) * (0.55 + 0.45 * ((r % 7) / 6));
        for (let dx = -Math.ceil(wr); dx <= Math.ceil(wr); dx++) {
          if (Math.abs(dx) > wr) continue;
          const x = Math.round(cx + dx),
            y = Math.round(base - th + r);
          put(L, x, y, Math.abs(dx) > last - 1 && (winter || hash(x, y) < 0.3) ? mh : m);
        }
        last = wr;
      }
    };
    const leafy = { winter: 0, autumn: 0.4, spring: 0.6 }[s] ?? 0.85;
    const buds = [];
    const twig = (x, y, dx, dy, len) => {
      for (let i = 0; i < len; i++) put(N, x + dx * i, y + dy * i, 8);
      buds.push([x + dx * len, y + dy * len]);
    };
    const bough = (x, y, side, len, seed) => {
      const lean = side * (0.35 + 0.45 * hash(seed, 1));
      for (let i = 0; i < len; i++) {
        put(N, x + lean * i, y - i, 8);
        if (i <= len * 0.3 || i % q(4)) continue;
        buds.push([x + lean * i, y - i]);
        twig(x + lean * i, y - i, side * (hash(seed, i) > 0.5 ? 0.9 : -0.6), 0.55, q(4 + hash(i, seed) * 6));
      }
      buds.push([x + lean * len, y - len]);
    };
    // Draws an oblate foliage cluster (`dy^2 * 1.4` flattens the ellipse vertically) thinned by seasonal density `leafy`.
    const blob = (L, cx, cy, r, m, mh) => {
      const R = Math.ceil(r);
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          if (dx * dx + dy * dy * 1.4 > r * r) continue;
          const x = Math.round(cx + dx),
            y = Math.round(cy + dy);
          if (hash(x + 71, y) >= leafy) continue;
          put(L, x, y, dy < -r * 0.25 && hash(x, y) < 0.45 ? mh : m);
        }
    };
    // Raises the foreground bank at the left (x < 0.34w) and right (x > 0.7w) margins via a 1.5 power curve.
    const bankTop = (x) => {
      const left = Math.pow(clamp(1 - x / (w * 0.34), 0, 1), 1.5) * h * 0.14,
        right = Math.pow(clamp((x - w * 0.7) / (w * 0.3), 0, 1), 1.5) * h * 0.11;
      return h - q(3) - Math.round(left + right + noise((x * 0.02) / k, 8) * q(3));
    };
    // Sets tree roots 6..11 units below `bankTop` so trunks do not sprout directly from the water's edge.
    const rooted = (x) => bankTop(x) + q(6 + hash(Math.round(x), 21) * 5);
    const nearBank = () => {
      for (let x = 0; x < w; x++) {
        const top = bankTop(x),
          tuft = Math.floor(hash(x, 5) * q(3)) + (hash(x, 9) > 0.92 ? q(3) : 0);
        for (let y = top; y < h; y++) put(N, x, y, y - top < q(2) - tuft || (winter && hash(x, y) > 0.1) ? 14 : hash(x, y) < 0.18 ? 4 : 3);
      }
    };
    const grove = () => {
      const cx = w - q(26),
        th = h * 0.5,
        hw = th * 0.2;
      spruce(N, cx, rooted(cx), th, hw, 5, 6);
      for (const [side, size] of [
        [-1, 0.62],
        [1, 0.5],
      ]) {
        const x = cx + side * hw * 0.62;
        spruce(N, x, rooted(clamp(x, 0, w - 1)) + q(5), th * size, hw * size, 5, 6);
      }
    };
    const farShore = () => {
      const base = HZ - q(3);
      for (let x = 0; x < w; x++) {
        const top = base - q(7) - Math.round(noise((x * 0.012) / k, 4) * q(12) + hash(x >> 1, 3) * q(4));
        for (let y = top; y < base; y++) put(F, x, y, hash(x, y) < (y - top < q(3) ? 0.5 : 0.22) ? 2 : 1);
        if (hash(x, 31) < 0.1) rect(F, x, base - q(3 + hash(x, 33) * 4), x, base - 1, 16);
        rect(F, x, base, x, HZ - 1, 15);
      }
      for (let cx = rnd() * q(10); cx < w; cx += q(5 + rnd() * 22)) {
        const th = q(13 + rnd() * 15);
        spruce(F, cx, base, th, th * 0.24, 12, 13);
      }
    };
    HZ = Math.round(h * 0.64);
    farShore();
    const bridge = () => {
      // Perspective math: for distance `d` along the bridge toward `vanish`, foreshortened scale is `sc = 1 / (1 + d / run)`
      // and screen x is `vanish - run * sc`. Solving `scale(length) = BRIDGE.end` gives total track length `(1 / end - 1) * run`.
      // `footAt(sc)` interpolates pier bases linearly in scale from `HZ + eye * reach` (at sc = 1) to `HZ` (at sc = end)
      // so the last pier lands cleanly on the far shoreline.
      const fine = (v) => (v * reach) / 320,
        from = BRIDGE.near * reach,
        vanish = BRIDGE.vanish * reach,
        run = vanish - from,
        length = (1 / BRIDGE.end - 1) * run;
      const scale = (d) => 1 / (1 + d / run);
      const scaleAtColumn = (x) => clamp((vanish - x) / run, BRIDGE.end, 8);
      const footAt = (sc) => HZ + (BRIDGE.eye * reach * (sc - BRIDGE.end)) / (1 - BRIDGE.end);
      const deckAt = (sc) => HZ - BRIDGE.deck * reach * sc;
      const xAt = (d) => vanish - run * scale(d);
      rail = {
        length,
        run,
        xAt,
        scaleAtColumn,
        deckAt,
        land: Math.round(xAt(length)),
        carHeight: BRIDGE.truss * reach * 0.5,
        speed: fine(26),
      };

      const at = (d, lift) => [xAt(d), deckAt(scale(d)) - lift * BRIDGE.truss * reach * scale(d)];
      const beam = ([x0, y0], [x1, y1], m, thick = 1) => {
        const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
        for (let i = 0; i <= steps; i++)
          for (let a = 0; a < thick; a++)
            for (let b = 0; b < thick; b++) put(S, x0 + ((x1 - x0) * i) / steps + a, y0 + ((y1 - y0) * i) / steps + b, m);
      };
      const PANELS = 6,
        span = length / BRIDGE.spans,
        panel = span / PANELS,
        crown = (p) => (p === 0 || p === PANELS ? 0 : 1);
      // Projects the far-side truss at `BRIDGE.across` (0.94) of the near truss's scale and shifts it right by 7 units
      // so the far steel sits lower and closer to the horizon, matching a camera below deck height.
      const across = (d, lift) => {
        const sc = scale(d) * BRIDGE.across;
        return [xAt(d) + fine(7) * scale(d), deckAt(sc) - lift * BRIDGE.truss * reach * sc];
      };
      // Each span has 6 panels. `crown(p)` drops the top chord to the deck at panel 0 and 6 to form sloped end posts,
      // while interior diagonals alternate downward (`falls`) in the first half of the span and upward in the second.
      const truss = (place, m, heavy) => {
        for (let i = 0; i < BRIDGE.spans; i++)
          for (let p = 0; p < PANELS; p++) {
            const d = i * span + p * panel,
              chord = Math.max(1, Math.round(fine(heavy) * scale(d))),
              web = Math.max(1, Math.round(fine(heavy * 0.6) * scale(d))),
              falls = p < PANELS / 2;
            beam(place(d, 0), place(d + panel, 0), m, chord + 1);
            beam(place(d, crown(p)), place(d + panel, crown(p + 1)), m, chord);
            if (crown(p)) beam(place(d, 0), place(d, 1), m, web);
            if (p > 0 && p < PANELS - 1) beam(place(d, falls ? 1 : 0), place(d + panel, falls ? 0 : 1), m, web);
          }
      };
      const piers = () => {
        for (let i = 0; i <= BRIDGE.spans; i++) {
          const sc = scale(i * span),
            [px] = at(i * span, 0),
            half = Math.max(0.5, BRIDGE.pier * reach * sc * 0.5),
            cap = Math.round(deckAt(sc)) + Math.max(1, Math.round(fine(3) * sc));
          for (let x = Math.round(px - half * 1.25); x <= Math.round(px + half * 1.25 + fine(7) * sc); x++)
            for (let y = Math.round(deckAt(sc)); y < footAt(sc); y++)
              if (y < cap || (x >= px - half && x <= px + half + fine(5) * sc)) put(S, x, y, hash(x, y) < 0.2 ? 9 : 11);
          if (i < BRIDGE.spans && i % 2 === 0) lamps.push(at(i * span + span / 2, 1.12).map(Math.round));
        }
      };
      truss(across, 17, 2.2);
      for (let i = 0; i < BRIDGE.spans; i++)
        for (let p = 1; p < PANELS; p++) beam(at(i * span + p * panel, 1), across(i * span + p * panel, 1), 17);
      piers();
      truss(at, 7, 3.4);
      for (let x = 0; x < w; x++) footing[x] = Math.round(footAt(scaleAtColumn(x)));
    };
    bridge();
    // `forward` (0..1) shifts a birch's base from `rooted(x0)` toward the bottom of the canvas for foreground depth.
    // Bough lengths follow `sin(pi * (i + 1) / 13)` so the middle of the crown spreads widest and tapers at top and bottom.
    const birch = (at, tall, forward = 0) => {
      const x0 = Math.round(w * at),
        size = tall / 0.7,
        foot = rooted(x0) + (h - rooted(x0)) * forward,
        top = foot / h - tall;
      for (let y = Math.round(h * top); y < foot; y++)
        for (let a = 0; a < q(y > h * 0.6 ? 3 : 2); a++) put(N, x0 + a, y, hash(x0 + a, y >> 1) < 0.16 ? 9 : 10);
      buds.length = 0;
      for (let i = 0; i < 12; i++)
        bough(x0, h * (top + (0.02 + 0.033 * i) * size), i & 1 ? 1 : -1, q((14 + 20 * Math.sin((Math.PI * (i + 1)) / 13)) * size), x0 + i);
      for (const [x, y] of buds) blob(N, x, y, q(2.5 + hash(x | 0, y | 0) * 2.5), 3, 4);
    };
    nearBank();
    for (const at of [0.03, 0.085, 0.135]) birch(at, 0.7);
    birch(0.058, 0.5, 0.75);
    birch(0.175, 0.42, 0.8);
    grove();
  };

  // Maps normalized car coordinates `along` (0 rear .. 1 front) and `up` (0 rail .. 1 roof) to a palette key or null.
  const CAR_PART = {
    engine: (along, up) => {
      const roof = along > 0.9 ? 0.62 : along > 0.68 ? 1.08 : 0.82;
      if (up > roof) return null;
      if (along > 0.72 && along < 0.86 && up > 0.78 && up < 0.98) return 'glass';
      if (up > 0.3 && up < 0.42) return 'trim';
      return up > roof - 0.08 ? 'roof' : 'body';
    },
    boxcar: (along, up) => (up > 0.95 ? null : up > 0.87 ? 'roof' : Math.abs(along - 0.5) < 0.09 ? 'shade' : 'body'),
    tanker: (along, up) => {
      const end = Math.min(along, 1 - along),
        round = end < 0.1 ? (0.1 - end) * 2.6 : 0;
      if (Math.abs(along - 0.5) < 0.05 && up > 0.84 && up < 1) return 'shade';
      if (up > 0.86 - round || up < 0.26 + round) return up < 0.26 && up > 0.2 ? 'frame' : null;
      return up > 0.72 ? 'roof' : Math.abs(up - 0.5) < 0.06 ? 'trim' : 'body';
    },
    hopper: (along, up) => {
      const end = Math.min(along, 1 - along);
      if (up > 0.92 || up < 0.2 + Math.max(0, 0.18 - end) * 2.2) return null;
      return up > 0.84 ? 'roof' : Math.round(along * 16) % 2 ? 'body' : 'shade';
    },
    flatcar: (along, up) => {
      if (up < 0.27) return 'frame';
      if (up > 0.86 || Math.abs(along - 0.5) < 0.03 || along < 0.04 || along > 0.96) return null;
      return up > 0.8 ? 'roof' : along < 0.5 ? 'body' : 'second';
    },
  };
  const CONSIST = ['engine', 'boxcar', 'tanker', 'hopper', 'flatcar', 'boxcar'];

  // The scheduled train is a single consist on a closed loop of length `route`, so it can never collide with another
  // scheduled train. Manual debug spawns (`trains`, `fishes`, `squatches`) start on click and are intentionally allowed
  // to overlap each other or scheduled events.
  const drawTrain = (t, lit, frame, dark, trains = []) => {
    const tall = rail.carHeight,
      long = tall * 3.4,
      pitch = long + tall * 0.4,
      route = rail.length + rail.run * 0.9 + pitch * CONSIST.length,
      scheduled = ((t * rail.speed) % route) - rail.run * 0.9,
      heads = [scheduled, ...trains.map((born) => (t - born) * rail.speed).filter((h) => h - pitch * CONSIST.length <= rail.length)],
      // Deck slope (dy/dx) in pixels per screen column so each car's base follows the angled bridge deck.
      lean = rail.deckAt(0) - rail.deckAt(1 / rail.run);
    const paint = (x, y, ink) => {
      if (x >= 0 && x < w && y >= 0 && y < h) carriage[y * w + x] = ink;
    };
    const lamp = inks.push(LAMP) - 1;
    for (const head of heads) {
      CONSIST.forEach((kind, i) => {
        const front = head - i * pitch;
        if (front - pitch <= -rail.run * 0.95) return;
        const body = lit(i ? CARS[i % CARS.length] : ENGINE),
          colour = {
            body,
            frame,
            glass: dark ? LAMP : lit(PALE),
            shade: mix(body, frame, 0.35),
            roof: mix(body, WHITE, 0.22),
            trim: lit(PALE),
            second: lit(CARS[(i + 2) % CARS.length]),
          };
        for (const part in colour) colour[part] = inks.push(colour[part]) - 1;
        // Anchor each car at its integer nose column `to` and step backward (`c <= 0`) using linear deck slope `c * lean`
        // and height taper `(c * tall) / rail.run` so the car translates rigidly without per-column rounding ripple.
        const to = Math.round(rail.xAt(front)),
          sc = rail.scaleAtColumn(to),
          deck = Math.round(rail.deckAt(sc)),
          rise = Math.round(tall * sc),
          span = Math.max(1, Math.round(rail.xAt(front) - rail.xAt(front - long))),
          gap = Math.round(rail.xAt(front) - rail.xAt(front - pitch));
        for (let c = Math.max(-gap, -to); c <= 0 && to + c <= rail.land; c++) {
          const x = to + c,
            base = deck + Math.round(c * lean),
            height = Math.max(2, rise - Math.round((c * tall) / rail.run)),
            along = (c + span) / span;
          if (along < 0) {
            paint(x, base - Math.max(1, Math.round(height * 0.22)), colour.frame);
            continue;
          }
          const truck = Math.abs(along - 0.16) < 0.1 || Math.abs(along - 0.84) < 0.1;
          for (let r = 0; r < Math.ceil(height * 1.1); r++) {
            const up = (r + 0.5) / height,
              part = up < 0.2 ? (truck || up > 0.12 || height < 5 ? 'frame' : null) : CAR_PART[kind](along, up);
            if (part) paint(x, base - 1 - r, colour[part]);
          }
        }
        if (!i && dark && to < rail.land) paint(to + 1, deck - Math.round(rise * 0.45), lamp);
      });
    }
  };

  const draw = (d, t, { hour, sidereal, weather, moon, aurora, geomagnetic, blackHole, sunEater, eclipse, strain, pokes, spawns }) => {
    // A black hole takes the whole sky and its own light: no hour, weather, sun, moon or aurora. It hangs high enough to
    // clear the phone plaque, which also keeps its reflection (chopped into embers by the swell) off the bottom of the river.
    // On portrait screens the birch crowns reach across the left, so it moves right to stay clear of their twigs.
    const hole = blackHole ? createBlackHole(Math.round(w * (w > h ? 0.35 : 0.6)), Math.round(HZ * 0.28), q(9), t) : null;
    let ki = 0;
    while (ki < KEYS.length - 2 && hour >= KEYS[ki + 1][0]) ki++;
    const kf = (hour - KEYS[ki][0]) / (KEYS[ki + 1][0] - KEYS[ki][0]);
    const [from, to] = hole ? ['hole', 'hole'] : [KEYS[ki][1], KEYS[ki + 1][1]];
    const A = TONE[from],
      Z = TONE[to];
    const frozen = season === 'winter';
    const wx = hole ? NO_WX : (frozen && COLD_WX[weather]) || WX[weather];
    const light = A.light + (Z.light - A.light) * kf;
    const ink = mix(A.ink, Z.ink, kf);
    // Divides time into 4.5s windows with a hashed offset up to 2.5s; a 0.34s bolt flashes twice (0..0.1s and 0.17..0.26s).
    const strike = Math.floor(t / 4.5),
      since = t - strike * 4.5 - hash(strike, 71) * 2.5;
    const bolt = wx.bolts && since >= 0 && since < 0.34;
    const flash = bolt ? (since < 0.1 || (since > 0.17 && since < 0.26) ? 1 : 0.3) : 0;
    const grey = mix(...(wx.grey ?? GREY), light);
    let sky = SKY[from].map((c, j) => mix(c, SKY[to][j], kf));
    if (wx.over) sky = sky.map((c) => mix(c, grey, wx.over));
    if (flash) sky = sky.map((c) => mix(c, FLASH, 0.45 * flash));
    const n = sky.length,
      se = SEASON[season];
    const sil = clamp(A.sil + (Z.sil - A.sil) * kf + wx.over * 0.15 + (flash ? 0.5 : 0), 0, 0.96);
    const lit = (c) => mix(c, ink, sil);
    const hazy = (c) => mix(lit(c), sky[n - 1], 0.2);
    const rime = (c) => (wx.frost ? mix(c, RIME, wx.frost) : c);
    const glint = (x, y) => wx.glaze && hash(x, y) > 0.93 && Math.sin(t * 2.2 + x * 1.3 + y * 0.7) > 0.2;
    const dark = light < 0.3;
    const sand = frozen ? SNOWBANK : SAND;
    const M = [
      null,
      hazy(rime(se.far)),
      hazy(rime(se.farHi)),
      lit(rime(se.leaf)),
      lit(rime(se.leafHi)),
      lit(rime(se.ever)),
      lit(rime(se.everHi)),
      lit(STEEL),
      lit(rime(TWIG)),
      lit(POLE),
      lit(PALE),
      lit(CONCRETE),
      hazy(rime(se.ever)),
      hazy(rime(se.everHi)),
      lit(rime(sand)),
      hazy(rime(sand)),
      hazy(PALE),
      mix(lit(STEEL), sky[n - 1], 0.3),
    ];
    const rimM = hole ? M.map((c) => c && mix(c, DISK_LIGHT, 0.6)) : M;
    // Solid edges facing the black hole catch its disk light, thinning out with distance. Requiring solid ground below keeps
    // lone leaves from lighting up, which turned whole crowns orange.
    const rimLit = (L, x, y, th) =>
      hole &&
      y > 0 &&
      y < h - 1 &&
      L[(y + 1) * w + x] &&
      !L[(y - 1) * w + clamp(x + Math.sign(hole.x - x), 0, w - 1)] &&
      th < 0.7 * (1 - Math.hypot(x - hole.x, y - hole.y) / (w * 0.6));
    const deep = mix(mix(...DEEP, light), grey, wx.over * 0.5);
    const ice = mix(...ICE, light);
    const shore = mix(M[1], ink, 0.5);
    // Under the black hole only the brightest stars outshine the lit violet air.
    const starK = hole ? 0.3 : clamp(1 - light * 3, 0, 1) * clamp(1 - wx.over * 1.3, 0, 1);
    const camera = {
      bearing: CAMERA.bridgeBearing - CAMERA.yaw,
      focal: CAMERA.focal * reach,
      x: (BRIDGE.vanish - CAMERA.focal * Math.tan((CAMERA.yaw * Math.PI) / 180)) * reach,
      y: HZ,
    };
    const stars = starK ? starfield(w, h, camera, sidereal, starK) : null;
    const sunUp = hour > SCENE_SUNRISE && hour < SCENE_SUNSET;
    // `arc` runs 0..1 from rise to set, sweeping across the middle 72% of canvas width and a `sin(pi * arc)` altitude curve.
    // `wane = cos(2 * pi * moon)` is +1 at new moon (0), 0 at quarter moon (0.25/0.75), and -1 at full moon (0.5).
    // `(1 + wane) / 2` is the unlit fraction of the moon, scaling `auroraK` from 100% at new moon down to 30% under a full moon.
    // `fromMidnight` is signed scene hours from the middle of the night, wrapped into [-12, 12). `geomagnetic` is how
    // strongly the live Kp index says the lights are out; a pinned `aurora` strength stands in for it, the hour and the moon,
    // but not for the dark, open sky the lights need to show at all.
    const arc = sunUp ? (hour - SCENE_SUNRISE) / SCENE_DAY_HOURS : ((hour + 24 - SCENE_SUNSET) % 24) / (24 - SCENE_DAY_HOURS);
    const bx = w * (0.14 + 0.72 * arc),
      by = HZ - Math.sin(Math.PI * arc) * HZ * 0.78 + q(3),
      br = q(6),
      wane = Math.cos(2 * Math.PI * moon),
      fromMidnight = ((hour - AURORA.midnight + 36) % 24) - 12,
      lateness = clamp((AURORA.full + AURORA.fade - Math.abs(fromMidnight)) / AURORA.fade, 0, 1),
      auroraK = hole || wx.wisps ? 0 : starK * (aurora ?? geomagnetic * lateness * (0.3 + 0.7 * ((1 + wane) / 2))),
      lights = auroraK ? createAurora(w, HZ, k, t, auroraK) : null;
    const body = wx.ember ? EMBER : sunUp ? mix(...SUN, 1 - Math.sin(Math.PI * arc)) : STAR;
    const glow = mix(sky[n - 2], body, 0.45);
    const orb = !hole && (wx.over < 0.65 || wx.ember),
      halo = q(30);
    // The Sun Eater hangs beneath the sun only while it's up; the black hole takes the sun, and the worm, with it.
    const eater = sunEater && sunUp && !hole ? createSunEater(w, HZ, { x: bx, y: by, r: br }, k) : null,
      eaterHaze = 0.5 + wx.over * 0.4;
    gazed = eater;
    // A real eclipse in progress: the moon's bite out of the sun by day, Earth's copper shadow on the moon by night.
    const shade = eclipse?.body === (sunUp ? 'sun' : 'moon') ? eclipse : null;
    // Cloud noise threshold `T` drops as `wx.cover` increases so more of the [0, 1] noise field exceeds `T`.
    const T = 0.92 - wx.cover * 0.55,
      wind = t * 0.02 * (1 + (wx.rain || 0));
    const cLit = mix(sky[4], WHITE, (0.1 + 0.55 * light) * (1 - wx.over * 0.75)),
      cShade = mix(sky[2], grey, 0.45);
    const mLit = mix(cShade, sky[n - 1], 0.75),
      mMid = mix(sky[3], grey, 0.35),
      mDark = mix(sky[1], ink, 0.45);
    const funnelAt = (y, p) => w * 0.6 + Math.sin(t * 0.3) * q(5) + Math.sin((y * 0.09) / k + t * 1.3) * q(4) * p;
    const fog = wx.fog || 0,
      fogCol = mix(sky[n - 1], grey, 0.5);

    const skyAt = (x, y) => {
      const th = dither(x, y);
      // Fog density decays exponentially with height above the horizon (`y < HZ` makes `y - HZ` negative).
      if (fog && th < fog * Math.exp((y - HZ) / (HZ * 0.3))) return fogCol;
      const swallowed = hole?.at(x, y, th);
      if (swallowed) return swallowed;
      // Two-octave value noise (62% coarse + 38% fine) with a 5% Bayer dither nudge to break up flat contour bands.
      const cn =
        noise((x * 0.03) / k + wind, (y * 0.085) / k + 3.7) * 0.62 +
        noise((x * 0.085) / k + wind * 1.7, (y * 0.21) / k + 9.1) * 0.38 +
        (th - 0.5) * 0.05;
      if (wx.funnel) {
        const base = HZ * 0.36,
          tip = HZ * 0.6;
        if (y < base + Math.sin((x * 0.05) / k + t * 0.2) * q(3)) return th < 0.7 ? mDark : mMid;
        if (y < tip) {
          // `p` runs 0 at the cloud base to 1 at the funnel tip; cone half-width narrows as `(1 - p)^1.7`.
          const p = (y - base) / (tip - base),
            half = q(18) * Math.pow(1 - p, 1.7) + q(0.5),
            off = Math.abs(x - funnelAt(y, p));
          if (off < half) return off > half - 1.5 * u || th < 0.2 ? mMid : mDark;
        }
      }
      if (wx.pouches) {
        // Mammatus pouches: 4 staggered rows of semi-circular lobes (`sqrt(1 - a^2)` over normalized cell width `a` in [-1, 1]).
        const cell = q(27),
          base = HZ * 0.4;
        let hang = 1e9;
        for (let r = 0; r < 4; r++) {
          const xx = x + t * 0.8 * k + hash(r, 5) * cell,
            ci = Math.floor(xx / cell),
            a = ((xx - ci * cell) / cell) * 2 - 1;
          const bottom = base - r * q(10) + Math.sqrt(1 - a * a) * q(12) * (0.45 + 0.55 * hash(ci, r));
          if (y <= bottom && bottom - y < hang) hang = bottom - y;
        }
        if (hang < 1e9) {
          const up = hang / q(11);
          if (y < base - q(34)) return th < 0.75 ? mDark : mMid;
          return up < 0.25 ? mLit : th < (0.75 - up) * 2 ? mLit : th < 1.6 - up ? mMid : mDark;
        }
      }
      // Sampling the coarse cloud octave 3 units lower (`y + 3 * k`) detects the bottom rim of a cloud to shade its underside.
      if (wx.cover && cn > T) return noise((x * 0.03) / k + wind, ((y + 3 * k) * 0.085) / k + 3.7) * 0.62 + 0.19 < T ? cShade : cLit;
      if (wx.wisps && light < 0.35 && y > HZ * 0.4 && y < HZ * 0.9) {
        const veil = noise((x * 0.012) / k + t * 0.01, (y * 0.06) / k + 31);
        const ripple = Math.sin((x * 0.22 + y * 0.6) / k + noise((x * 0.02) / k, (y * 0.05) / k) * 7);
        if (veil > 0.5 && ripple > 0.2 && th < (veil - 0.5) * 4) return ripple > 0.75 ? NLC_HI : NLC;
      }
      if (wx.bow && light > 0.3) {
        // Places the rainbow arc opposite the sun (`0.74w` when sun is left of centre, `0.26w` when right), radius 120 units.
        const dx = x - w * (bx < w / 2 ? 0.74 : 0.26),
          dy = y - HZ - q(50),
          ring = Math.sqrt(dx * dx + dy * dy) - q(120);
        if (ring >= 0 && ring < q(10) && th < 0.55) return BOW[Math.min(4, Math.floor(ring / q(2)))];
      }
      const v = clamp(y / HZ, 0, 1) * (n - 1),
        i = Math.floor(v);
      let col = v - i > th ? sky[Math.min(i + 1, n - 1)] : sky[i];
      if (hole && th < hole.aureole(x, y)) return mix(col, DISK_LIGHT, 0.25);
      const flesh = eater?.at(x, y, th, col, eaterHaze);
      if (flesh) return flesh;
      const curtain = lights?.at(x, y, th, col);
      if (curtain) col = curtain;
      if (orb) {
        const dx = x - bx,
          dy = y - by,
          d2 = dx * dx + dy * dy;
        if (wx.dogs && sunUp) {
          const off = Math.abs(Math.abs(dx) - halo);
          if (Math.abs(dy) < q(3) && off < q(2.5)) return off < q(1) ? WHITE : DOG;
          if (Math.abs(Math.sqrt(d2) - halo) < u && dy < q(8) && th < 0.3) return glow;
        }
        // `limb` is the lunar terminator x-offset at row `dy`: `sqrt(br^2 - dy^2)` is the disk's chord half-width,
        // scaled by `wane = cos(2 * pi * moon)`. Waxing moons (`moon < 0.5`) are lit on the right (`dx > limb`), waning on the left.
        const limb = Math.sqrt(Math.max(0, br * br - dy * dy)) * wane;
        if (d2 <= br * br) {
          if (!sunUp && (moon < 0.5 ? dx <= limb : dx >= -limb)) return col;
          const umbra = shade ? Math.hypot(dx / br - shade.along, dy / br - shade.across) / shade.shadow : 2;
          if (umbra < 1) return sunUp ? col : th < umbra ? COPPER[1] : COPPER[0];
          return body;
        }
        if (sunUp && !wx.ember && d2 < br * br * 6 && th < (1 - Math.sqrt(d2) / (br * 2.45)) * 0.8) return glow;
      }
      const [sx, sy] = hole ? hole.lensed(x, y) : [x, y];
      const star = !curtain && stars?.at(sx, sy, col);
      if (star && (hash(sx, sy) > 0.12 || Math.sin(t * 1.5 + sx * 7.1 + sy * 3.3) > -0.2)) col = star;
      return col;
    };

    carriage.fill(0);
    inks = [null];
    if (fog < 1) drawTrain(t, lit, mix(lit(STEEL), ink, 0.5), dark, spawns?.trains);
    // Palette index 7 is the near truss, which occludes the train (`carriage`), which in turn occludes piers and far steel.
    const bridgeAt = (i) => (S[i] === 7 ? M[7] : carriage[i] ? inks[carriage[i]] : S[i] ? M[S[i]] : null);

    for (let y = 0; y < h; y++) {
      // Water rows (`y > HZ`) mirror the sky across the horizon (`ry = 2 * HZ - y - 1`) with horizontal wave offset `swell`.
      // The North Saskatchewan runs calm on top: the swell is near zero at the far bank and grows into long, slow waves
      // many rows tall up close, so the reflection bends as one surface rather than shredding row by row.
      const depth = (y - HZ) / Math.max(1, h - HZ),
        ry = Math.max(0, HZ - (y - HZ) - 1),
        swell = frozen ? 0 : Math.round(Math.sin((y * 0.12) / k + t * 0.2) * (0.2 + depth * 2) * (1 + (wx.rain || 0) * 0.6) * k);
      for (let x = 0; x < w; x++) {
        const th = dither(x, y);
        let col,
          m = N[y * w + x];
        if (m) col = th < fog * FOG.near ? fogCol : glint(x, y) ? WHITE : rimLit(N, x, y, th) ? rimM[m] : M[m];
        else if ((col = bridgeAt(y * w + x))) col = th < fog * FOG.bridge ? fogCol : col;
        else if (y < HZ) {
          m = F[y * w + x];
          col = m ? (th < fog * FOG.far ? fogCol : rimLit(F, x, y, th) ? rimM[m] : M[m]) : skyAt(x, y);
        } else if (y === HZ) col = th < fog * FOG.far ? fogCol : shore;
        else if (th < fog * FOG.water) col = fogCol;
        else if (frozen) col = hash(x >> 1, y) < 0.06 ? M[4] : th < 0.62 + depth * 0.25 ? ice : skyAt(x, ry);
        else {
          const sx = clamp(x + swell, 0, w - 1),
            // Reflects the bridge across its local pier waterline `footing[sx]` (`y` mirrored across `footing` is `2 * footing - y - 1`).
            under = 2 * footing[sx] - y - 1;
          m = F[ry * w + sx];
          col = (under >= 0 && under < h && bridgeAt(under * w + sx)) || (m ? M[m] : skyAt(sx, ry));
          // Deep-water stipple darkens the reflection rather than replacing it, so a bright sunset river doesn't turn to static.
          if (th < 0.3 + depth * 0.35) col = mix(col, deep, 0.4);
        }
        const p = (y * w + x) * 4;
        d[p] = col[0];
        d[p + 1] = col[1];
        d[p + 2] = col[2];
        d[p + 3] = 255;
      }
    }

    const plot = (x, y, c) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const p = (y * w + x) * 4;
      d[p] = c[0];
      d[p + 1] = c[1];
      d[p + 2] = c[2];
    };
    const dot = (x, y, c) => {
      for (let a = 0; a < u; a++)
        for (let b = 0; b < u; b++) {
          const px = Math.round(x) + a,
            py = Math.round(y) + b;
          if (px >= 0 && px < w && py >= 0 && py < h && !N[py * w + px]) plot(px, py, c);
        }
    };

    const open = (x, y) => {
      x = Math.round(x);
      y = Math.round(y);
      return y >= 0 && y < h && x >= 0 && x < w && !N[y * w + x] && !S[y * w + x];
    };
    const water = (x, y) => Math.round(y) > HZ && open(x, y);
    // Draws a foreshortened elliptical ring (`10:3` aspect ratio, 40 samples around `2 * pi`) expanding with `age`.
    const ripple = (x, y, age) => {
      for (let a = 0; a < 40; a++) {
        const rx = x + Math.cos(a * 0.157) * age * 10 * k,
          ry = y + Math.sin(a * 0.157) * age * 3 * k;
        if (hash(a, Math.floor(age * 5)) > 0.3 && water(rx, ry)) plot(rx, ry, cLit);
      }
    };
    const leapAt = (age, seed, forced = false) => {
      let x = w * (0.18 + 0.34 * hash(seed, 63));
      const y = HZ + (h - HZ) * (0.18 + 0.35 * hash(seed, 64));
      if (!open(x, y)) x += q(18);
      if ((!forced && hash(seed, 62) > 0.4) || age < 0 || age > LEAP + 3 || !water(x, y)) return;
      const fish = FISH[Math.floor(hash(seed, 65) * FISH.length)],
        near = 0.5 + (y - HZ) / (h - HZ),
        heading = hash(seed, 66) < 0.5 ? -1 : 1,
        travel = q(16) * near,
        height = q(9) * near,
        length = q(fish.length) * near;
      ripple(x, y, age);
      if (age > LEAP) ripple(x + heading * travel, y, age - LEAP);
      if (age > LEAP) return;
      // Normalizing the arc's tangent vector `(dx, dy)` aligns `(ax, ay)` with the fish's spine and `(nx, ny)` perpendicular to it.
      // `girth` follows an ellipse profile `sqrt(1 - (2s / length)^2)`, clipped at the waterline (`py < y`).
      const p = age / LEAP,
        fx = x + heading * travel * p,
        fy = y - Math.sin(Math.PI * p) * height,
        dx = heading * travel,
        dy = -Math.cos(Math.PI * p) * Math.PI * height,
        norm = Math.hypot(dx, dy),
        [ax, ay] = [dx / norm, dy / norm],
        [nx, ny] = [heading * ay, -heading * ax];
      const fishAt = (s, o, c) => {
        const px = fx + ax * s + nx * o,
          py = fy + ay * s + ny * o;
        if (py < y && open(px, py)) plot(px, py, c);
      };
      for (let s = -length / 2; s <= length / 2; s += 0.5) {
        const girth = length * 0.16 * Math.sqrt(1 - ((2 * s) / length) ** 2);
        for (let o = -girth; o <= girth; o += 0.5) fishAt(s, o, lit(o > -0.5 ? fish.back : fish.belly));
      }
      for (const side of [-1, 1]) fishAt(-length / 2 - 1, side * length * 0.12, lit(fish.back));
    };

    // Looking at the Sun Eater with the Sight costs what magic always costs: floaters drift through your vision over a
    // fizz of visual snow, fading slowly once you look away.
    const witchStrain = (strain) => {
      const tint = (x, y, c, f) => {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || x >= w || y < 0 || y >= h) return;
        const p = (y * w + x) * 4;
        for (let ch = 0; ch < 3; ch++) d[p + ch] += (c[ch] - d[p + ch]) * f;
      };
      const frame = Math.floor(t * 9);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hash(x + frame * 131, y) < strain * 0.03) tint(x, y, WHITE, 0.3);
      // Translucent strands, two pixels thick, sinking slowly and curling as they go.
      for (let i = 0; i < 5; i++) {
        let x = hash(i, 51) * w + Math.sin(t * 0.13 + i) * q(20),
          y = (hash(i, 52) * h + t * q(2)) % h,
          a = hash(i, 53) * 6.3;
        for (let j = 0; j < 28; j++) {
          a += Math.sin(t * 0.4 + i + j * 0.5) * 0.35;
          x += Math.cos(a) * u * 0.8;
          y += Math.sin(a) * u * 0.8;
          for (let b = 0; b < 2 * u; b++) tint(x, y + b, FLOATER, 0.4 * strain);
        }
      }
    };

    const walkSquatch = (sx) => {
      if (sx < -10 * u || sx > w + 10 * u) return;
      const fur = hazy(SASQUATCH),
        frame = SQUATCH_FRAMES[Math.floor(t * 3.5) & 1],
        foot = HZ - u;
      frame.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          if (row[c] !== 'X') continue;
          const px = sx + c * u,
            py = foot - (frame.length - 1 - r) * u;
          if (open(px, py)) dot(px, py, fur);
        }
      });
    };

    if (fog < 1) {
      if (!frozen) {
        const jump = Math.floor(t / LEAP_EVERY);
        leapAt(t - jump * LEAP_EVERY - hash(jump, 61) * (LEAP_EVERY - LEAP - 3), jump);
      }
      for (const f of spawns?.fishes ?? []) leapAt(t - f.t, f.seed, true);
      if (SQUATCH) walkSquatch(Math.round(((t * 3.5 * k) % (w + 40 * u)) - 20 * u));
      for (const born of spawns?.squatches ?? []) walkSquatch(Math.round(w * 0.2 + (t - born) * 3.5 * k));
      if ((season === 'spring' || season === 'autumn') && light > 0.3) {
        // V-formation of 7 geese: `rank = (i + 1) >> 1` pairs birds 1..6 into 3 ranks behind the leader (i = 0).
        const gx = w + 20 * u - ((t * 6 * k + w * 0.75) % (w + 160 * u)),
          gy = HZ * 0.3 + Math.sin(t * 0.3) * 4 * u;
        for (let i = 0; i < 7; i++) {
          const rank = (i + 1) >> 1,
            x0 = Math.round(gx + rank * 3 * u),
            y0 = Math.round(gy + (i & 1 ? 1 : -1) * rank * 2 * u);
          const lift = (Math.floor(t * 3 + i) & 1) * u;
          dot(x0, y0, M[9]);
          dot(x0 - u, y0 - lift, M[9]);
          dot(x0 + u, y0 - lift, M[9]);
        }
      }
      if (season === 'summer' && dark) {
        for (let i = 0; i < 16; i++)
          if (Math.sin(t * 2 + i * 1.7) > 0.2)
            dot(
              hash(i, 31) * w + Math.sin(t * 0.5 + i) * 4 * u,
              h * (0.72 + hash(i, 32) * 0.24) + Math.sin(t * 0.7 + i) * 3 * u,
              FIREFLY,
            );
      }
    }
    if (wx.rain) {
      const c = mix(sky[n - 1], WHITE, 0.35),
        count = Math.round(((w * h) / 300) * wx.rain);
      for (let i = 0; i < count; i++) {
        const sp = (160 + 80 * hash(i, 3)) * k,
          y = (hash(i, 2) * h + t * sp) % h;
        // Positive modulo `((a % N) + N) % N` wraps wind-slanted streaks across [-20, w + 20).
        const x = ((((hash(i, 1) * (w + 40) - t * sp * 0.25) % (w + 40)) + w + 40) % (w + 40)) - 20;
        plot(x, y, c);
        plot(x, y - 1, c);
        plot(x + 1, y - 2, c);
        plot(x + 1, y - 3, c);
      }
    }
    if (wx.snow) {
      const c = mix(FLAKE, ink, sil * 0.35),
        count = Math.round(((w * h) / 260) * wx.snow);
      for (let i = 0; i < count; i++) {
        const fall = wx.gale ? 26 : 10 + 16 * hash(i, 3),
          blow = wx.gale ? 130 + 90 * hash(i, 3) : 3;
        const y = (hash(i, 2) * h + t * fall * k + Math.sin(t * 2 + i) * (wx.gale ? 3 * k : 0)) % h;
        const x = (hash(i, 1) * w + Math.sin(t * 0.8 + i) * 3 * k + t * blow * k) % w;
        plot(x, y, c);
        if (wx.gale || hash(i, 4) > 0.7) plot(x + 1, y, c);
        if (wx.gale) plot(x + 2, y, c);
      }
    }
    if (wx.hail) {
      for (let i = 0; i < (w * h) / 520; i++) {
        const x = hash(i, 11) * w,
          y = (hash(i, 12) * h + t * (210 + 60 * hash(i, 13)) * k) % h;
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) plot(x + a, y + b, WHITE);
      }
      // Hailstones bouncing off the river surface in a `sin(pi * hop / 0.6)` arc during the first 60% of each beat.
      for (let i = 0; i < w / 6; i++) {
        const beat = t * 2.4 + hash(i, 15) * 7,
          hop = beat % 1,
          land = Math.floor(beat);
        if (hop < 0.6)
          plot(hash(i, 14 + land) * w + hop * 6 * k, HZ + hash(i, 17 + land) * (h - HZ) - Math.sin((hop / 0.6) * Math.PI) * q(5), WHITE);
      }
    }
    if (dark && fog < 1) {
      lamps.forEach(([x, y], i) => {
        dot(x, y, LAMP);
        if (!wx.pillars) return;
        const reach = q(64);
        for (let r = u; r < reach; r++)
          for (let a = 0; a < 2 * u; a++)
            if (dither(x + a, y - r) < (1 - r / reach) * 0.9) plot(x + a, y - r, PILLARS[i % 3]);
      });
    }
    if (season === 'autumn' && !wx.rain) {
      for (let i = 0; i < w / 10; i++)
        plot(
          (hash(i, 6) * w + t * (5 + 6 * hash(i, 7)) * k + Math.sin(t + i) * 4 * k) % w,
          (hash(i, 8) * h + t * (7 + 6 * hash(i, 9)) * k) % h,
          lit(i & 1 ? se.leafHi : RED_LEAF),
        );
    }
    if (wx.dust) {
      for (let i = 0; i < 70; i++) if (Math.sin(t * 3 + i * 2.3) > 0.8) plot(hash(i, 41) * w, hash(i, 42) * h, WHITE);
    }
    if (bolt) {
      const fork = (x, y, end, drift, seed, trunk) => {
        for (; y < end; y++) {
          x += (hash(y, seed) - 0.5 + drift) * 3.2 * k;
          plot(x, y, WHITE);
          if (trunk) {
            plot(x + 1, y, WHITE);
            if (hash(y, seed + 9) > 0.94) fork(x, y, Math.min(end, y + q(38)), hash(y, seed) > 0.5 ? 0.42 : -0.42, seed + y, false);
          }
        }
      };
      fork(w * (0.25 + 0.6 * hash(strike, 77)), Math.round(HZ * 0.08), HZ - q(10), 0, strike, true);
    }
    for (const poke of pokes) {
      const age = t - poke.t;
      if (!frozen && age < 3 && water(poke.x, poke.y)) ripple(poke.x, poke.y, age);
    }
    if (strain) witchStrain(strain);
    // Cross-dissolves from the previous frame snapshot `prev` over 1 second using a 60% Bayer dither + 40% horizontal wipe.
    if (prev) {
      if (fadeAt < 0) fadeAt = t;
      const done = t - fadeAt;
      if (done >= 1) prev = null;
      else
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            if (dither(x, y) * 0.6 + (x / w) * 0.4 < done) continue;
            const p = (y * w + x) * 4;
            d[p] = prev[p];
            d[p + 1] = prev[p + 1];
            d[p + 2] = prev[p + 2];
          }
    }
    shown = d;
  };

  const snap = () => {
    if (shown) {
      prev = new Uint8ClampedArray(shown);
      fadeAt = -1;
    }
  };
  // Whether a scene pixel is on the Sun Eater as last drawn.
  const gazing = (x, y) => !!gazed?.holds(Math.round(x), Math.round(y));
  return { build, draw, snap, gazing };
}
