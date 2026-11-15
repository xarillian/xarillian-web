// The river, painted one fat pixel at a time. Nothing here is an image: the
// bank, the bridge and the trees are stamped into two layers once per season,
// and every frame the sky, the weather and the water are worked out again for
// each pixel, so the same view can sit under any hour and any weather.
//
//   build(season)                       lays out the land for a season
//   draw(pixels, seconds, conditions)   paints one frame into RGBA pixels;
//                                       `moon` runs 0 new, 0.5 full, 1 new
//   snap()                              keeps the last frame, so the next
//                                       change dissolves in rather than cuts
// We stand low on the bank: the bridge leaves our side large and lands small on the far one. These are fractions of
// its reach across the scene: where its near end and vanishing point sit, how far below the horizon the nearest pier
// stands (eye), and how tall the deck, truss and piers are up close.
const BRIDGE = { near: -0.1, vanish: 1.02, end: 0.14, eye: 0.047, deck: 0.1, truss: 0.156, pier: 0.06, spans: 7 };

export function createScene(w, h) {
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const mix = (a, b, f) => [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const hash = (x, y) => {
    let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
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
  };
  const TONE = {
    night: { light: 0, sil: 0.9, ink: hex('#0b0f19') },
    dawn: { light: 0.5, sil: 0.62, ink: hex('#2a2140') },
    day: { light: 1, sil: 0.05, ink: hex('#16222c') },
    dusk: { light: 0.45, sil: 0.72, ink: hex('#1e1436') },
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
    AUR = hex('#3fd49a'),
    AURHI = hex('#b8f7d4'),
    AUR_TEAL = hex('#3fc7d4'),
    AUR_CROWN = hex('#d6508a'),
    AUR_HEM = hex('#8a6cf0'),
    LAMP = hex('#ffd36b');
  const STEEL = hex('#4b3a3a'),
    POLE = hex('#3a3038'),
    PALE = hex('#e9e2cf');
  const ENGINE = hex('#b5452f');
  const CARS = ['#8a3b2e', '#3a4a5c', '#6b5a3a', '#2d2d38'].map(hex);
  const k = h / 250,
    u = Math.max(1, Math.round(k));
  const q = (v) => Math.max(1, Math.round(v * k));
  const F = new Uint8Array(w * h),
    S = new Uint8Array(w * h),
    N = new Uint8Array(w * h),
    footing = new Int16Array(w);
  const CONCRETE = hex('#8f887c'),
    SAND = hex('#a8946a'),
    SNOWBANK = hex('#dfe7f0');
  let rail = null;
  let HZ = 0,
    lamps = [],
    season = '',
    prev = null,
    fadeAt = -1,
    shown = null;

  const build = (s) => {
    season = s;
    F.fill(0);
    S.fill(0);
    lamps = [];
    N.fill(0);
    let seed = 11;
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
    // A birch keeps one skeleton all year; a season only decides how much leaf hangs on it.
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
    // Our own bank: low in the middle, rising at either side, with sand at the water and the trees set back on the grass.
    const bankTop = (x) => {
      const left = Math.pow(clamp(1 - x / (w * 0.34), 0, 1), 1.5) * h * 0.14,
        right = Math.pow(clamp((x - w * 0.7) / (w * 0.3), 0, 1), 1.5) * h * 0.11;
      return h - q(3) - Math.round(left + right + noise((x * 0.02) / k, 8) * q(3));
    };
    const rooted = (x) => bankTop(x) + q(6 + hash(Math.round(x), 21) * 5);
    const nearBank = () => {
      for (let x = 0; x < w; x++) {
        const top = bankTop(x),
          tuft = Math.floor(hash(x, 5) * q(3)) + (hash(x, 9) > 0.92 ? q(3) : 0);
        for (let y = top; y < h; y++) put(N, x, y, y - top < q(2) - tuft || (winter && hash(x, y) > 0.1) ? 14 : hash(x, y) < 0.18 ? 4 : 3);
      }
    };
    const spruces = (ranges) => {
      for (const [from, to] of ranges)
        for (let cx = from; cx < to; ) {
          const th = h * (0.34 + rnd() * 0.22),
            hw = th * 0.2;
          spruce(N, cx, rooted(clamp(cx, 0, w - 1)), th, hw, 5, 6);
          cx += hw * (0.9 + rnd() * 0.8);
        }
    };
    // The far shore: a strip of sand, then birch and spruce mixed.
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
    // The bridge leaves our bank near and large and lands on the far bank small; everything on it scales with distance.
    const bridge = () => {
      // One measure for width and height keeps the bridge's shape in any window; a very wide one just shows more far bank.
      const reach = Math.min(w, h * 1.9),
        fine = (v) => (v * reach) / 320,
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
      // The truss on the far side of the track sits a little up and along from the near one.
      const across = (point, d) => [point[0] + fine(7) * scale(d), point[1] - fine(2.5) * scale(d)];
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
      truss((d, lift) => across(at(d, lift), d), 17, 2.2);
      for (let i = 0; i < BRIDGE.spans; i++)
        for (let p = 1; p < PANELS; p++) beam(at(i * span + p * panel, 1), across(at(i * span + p * panel, 1), i * span + p * panel), 17);
      piers();
      truss(at, 7, 3.4);
      for (let x = 0; x < w; x++) footing[x] = Math.round(footAt(scaleAtColumn(x)));
    };
    bridge();
    nearBank();
    for (const bx of [0.03, 0.085, 0.135]) {
      const x0 = Math.round(w * bx);
      for (let y = Math.round(h * 0.2); y < rooted(x0); y++)
        for (let a = 0; a < q(y > h * 0.6 ? 3 : 2); a++) put(N, x0 + a, y, hash(x0 + a, y >> 1) < 0.16 ? 9 : 10);
      buds.length = 0;
      for (let i = 0; i < 12; i++)
        bough(x0, h * (0.22 + 0.033 * i), i & 1 ? 1 : -1, q(14 + 20 * Math.sin((Math.PI * (i + 1)) / 13)), x0 + i);
      for (const [x, y] of buds) blob(N, x, y, q(2.5 + hash(x | 0, y | 0) * 2.5), 3, 4);
    }
    spruces([[w * 0.9, w + 6]]);
  };

  // What a car shows at a point along it (0 rear, 1 front) and up it (0 rail, 1 roof): a part to paint, or nothing.
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
  const CONSIST = ['engine', 'boxcar', 'tanker', 'hopper', 'flatcar', 'boxcar', 'hopper', 'tanker', 'flatcar', 'boxcar'];

  // The train runs inside the truss, so the near steel passes in front of it.
  const drawTrain = (t, plot, lit, frame, dark) => {
    const tall = rail.carHeight,
      long = tall * 3.4,
      pitch = long + tall * 0.4,
      route = rail.length + rail.run * 0.9 + pitch * CONSIST.length,
      head = ((t * rail.speed) % route) - rail.run * 0.9;
    const paint = (x, y, c) => {
      if (x >= 0 && x < w && y >= 0 && !N[y * w + x] && S[y * w + x] !== 7) plot(x, y, c);
    };
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
        },
        from = Math.round(rail.xAt(front - long)),
        to = Math.round(rail.xAt(front));
      for (let x = Math.round(rail.xAt(front - pitch)); x <= Math.min(to, rail.land); x++) {
        const sc = rail.scaleAtColumn(x),
          deck = Math.round(rail.deckAt(sc)),
          rise = Math.max(2, Math.round(tall * sc)),
          along = (x - from) / Math.max(1, to - from);
        if (x < from) {
          paint(x, deck - Math.max(1, Math.round(rise * 0.22)), frame);
          continue;
        }
        const truck = Math.abs(along - 0.16) < 0.1 || Math.abs(along - 0.84) < 0.1;
        for (let r = 0; r < Math.ceil(rise * 1.1); r++) {
          const up = (r + 0.5) / rise,
            part = up < 0.2 ? (truck || up > 0.12 || rise < 5 ? 'frame' : null) : CAR_PART[kind](along, up);
          if (part) paint(x, deck - 1 - r, colour[part]);
        }
      }
      if (!i && dark && to < rail.land)
        paint(to + 1, Math.round(rail.deckAt(rail.scaleAtColumn(to)) - tall * rail.scaleAtColumn(to) * 0.45), LAMP);
    });
  };

  const draw = (d, t, { hour, weather, moon, pokes }) => {
    let ki = 0;
    while (ki < KEYS.length - 2 && hour >= KEYS[ki + 1][0]) ki++;
    const kf = (hour - KEYS[ki][0]) / (KEYS[ki + 1][0] - KEYS[ki][0]);
    const A = TONE[KEYS[ki][1]],
      Z = TONE[KEYS[ki + 1][1]];
    const wx = WX[weather];
    const light = A.light + (Z.light - A.light) * kf;
    const ink = mix(A.ink, Z.ink, kf);
    const strike = Math.floor(t / 4.5),
      since = t - strike * 4.5 - hash(strike, 71) * 2.5;
    const bolt = wx.bolts && since >= 0 && since < 0.34;
    const flash = bolt ? (since < 0.1 || (since > 0.17 && since < 0.26) ? 1 : 0.3) : 0;
    const grey = mix(hex(wx.grey ? wx.grey[0] : '#1c2030'), hex(wx.grey ? wx.grey[1] : '#8f99a8'), light);
    let sky = SKY[KEYS[ki][1]].map((c, j) => mix(c, SKY[KEYS[ki + 1][1]][j], kf));
    if (wx.over) sky = sky.map((c) => mix(c, grey, wx.over));
    if (flash) sky = sky.map((c) => mix(c, FLASH, 0.45 * flash));
    const n = sky.length,
      se = SEASON[season],
      frozen = season === 'winter';
    const sil = clamp(A.sil + (Z.sil - A.sil) * kf + wx.over * 0.15 + (flash ? 0.5 : 0), 0, 0.96);
    const lit = (c) => mix(c, ink, sil);
    const hazy = (c) => mix(lit(c), sky[n - 1], 0.2);
    const rime = (c) => (wx.frost ? mix(c, RIME, wx.frost) : c);
    const glint = (x, y) => wx.glaze && hash(x, y) > 0.93 && Math.sin(t * 2.2 + x * 1.3 + y * 0.7) > 0.2;
    const dark = light < 0.3;
    const sand = season === 'winter' ? SNOWBANK : SAND;
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
    const deep = mix(mix(hex('#151b33'), hex('#2a5c8f'), light), grey, wx.over * 0.5);
    const ice = mix(hex('#3a4468'), hex('#dfe7f0'), light);
    const shore = mix(M[1], ink, 0.5);
    const starK = clamp(1 - light * 3, 0, 1) * clamp(1 - wx.over * 1.3, 0, 1);
    const sunUp = hour > 5.5 && hour < 20.5;
    const arc = sunUp ? (hour - 5.5) / 15 : ((hour + 3.5) % 24) / 9;
    const bx = w * (0.14 + 0.72 * arc),
      by = HZ - Math.sin(Math.PI * arc) * HZ * 0.78 + q(3),
      br = q(6),
      wane = Math.cos(2 * Math.PI * moon);
    const body = wx.ember ? EMBER : sunUp ? mix(hex('#fff3c4'), hex('#ff9a4a'), 1 - Math.sin(Math.PI * arc)) : STAR;
    const glow = mix(sky[n - 2], body, 0.45);
    const orb = wx.over < 0.65 || wx.ember,
      halo = q(30);
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
      const th = B[(y & 3) * 4 + (x & 3)] / 16;
      if (fog && th < fog * Math.exp((y - HZ) / (HZ * 0.3))) return fogCol;
      const cn =
        noise((x * 0.03) / k + wind, (y * 0.085) / k + 3.7) * 0.62 +
        noise((x * 0.085) / k + wind * 1.7, (y * 0.21) / k + 9.1) * 0.38 +
        (th - 0.5) * 0.05;
      if (wx.funnel) {
        const base = HZ * 0.36,
          tip = HZ * 0.6;
        if (y < base + Math.sin((x * 0.05) / k + t * 0.2) * q(3)) return th < 0.7 ? mDark : mMid;
        if (y < tip) {
          const p = (y - base) / (tip - base),
            half = q(18) * Math.pow(1 - p, 1.7) + q(0.5),
            off = Math.abs(x - funnelAt(y, p));
          if (off < half) return off > half - 1.5 * u || th < 0.2 ? mMid : mDark;
        }
      }
      if (wx.pouches) {
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
      if (cn > T) return noise((x * 0.03) / k + wind, ((y + 3 * k) * 0.085) / k + 3.7) * 0.62 + 0.19 < T ? cShade : cLit;
      if (wx.wisps && light < 0.35 && y > HZ * 0.4 && y < HZ * 0.9) {
        const veil = noise((x * 0.012) / k + t * 0.01, (y * 0.06) / k + 31);
        const ripple = Math.sin((x * 0.22 + y * 0.6) / k + noise((x * 0.02) / k, (y * 0.05) / k) * 7);
        if (veil > 0.5 && ripple > 0.2 && th < (veil - 0.5) * 4) return ripple > 0.75 ? NLC_HI : NLC;
      }
      if (wx.bow && light > 0.3) {
        const dx = x - w * (bx < w / 2 ? 0.74 : 0.26),
          dy = y - HZ - q(50),
          ring = Math.sqrt(dx * dx + dy * dy) - q(120);
        if (ring >= 0 && ring < q(10) && th < 0.55) return BOW[Math.min(4, Math.floor(ring / q(2)))];
      }
      if (orb) {
        const dx = x - bx,
          dy = y - by,
          d2 = dx * dx + dy * dy;
        if (wx.dogs && sunUp) {
          const off = Math.abs(Math.abs(dx) - halo);
          if (Math.abs(dy) < q(3) && off < q(2.5)) return off < q(1) ? WHITE : DOG;
          if (Math.abs(Math.sqrt(d2) - halo) < u && dy < q(8) && th < 0.3) return glow;
        }
        const limb = Math.sqrt(Math.max(0, br * br - dy * dy)) * wane;
        if (d2 <= br * br && (sunUp || (moon < 0.5 ? dx > limb : dx < -limb))) return body;
        if (sunUp && !wx.ember && d2 < br * br * 6 && th < (1 - Math.sqrt(d2) / (br * 2.45)) * 0.8) return glow;
      }
      const v = clamp(y / HZ, 0, 1) * (n - 1),
        i = Math.floor(v);
      let col = v - i > th ? sky[Math.min(i + 1, n - 1)] : sky[i];
      if (starK && !wx.wisps) {
        const ac = HZ * 0.3 + Math.sin((x * 0.03) / k + t * 0.35) * HZ * 0.09 + Math.sin((x * 0.011) / k - t * 0.2) * HZ * 0.07;
        const dy = (y - ac) / (HZ * 0.06);
        const band = y > ac ? Math.exp(-dy * dy * 0.18) : Math.exp(-dy * dy * 0.5);
        const streak = 0.5 + 0.5 * Math.sin((x * 0.7) / k + Math.sin((x * 0.09) / k + t * 0.8) * 4);
        const a = band * streak * (0.75 + 0.25 * Math.sin(t * 0.6 + x * 0.02)) * starK;
        if (a > th * 0.9 + 0.12) {
          if (dy < -0.7) return AUR_CROWN;
          if (dy > 2.6) return AUR_HEM;
          return a > 0.78 ? AURHI : Math.sin((x * 0.013) / k + t * 0.1) > 0.4 ? AUR_TEAL : AUR;
        }
      }
      if (starK && y < HZ * 0.75) {
        const hs = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const twinkles = hash(x, y) < 0.12;
        if (hs - Math.floor(hs) > 0.994 && th < starK && (!twinkles || Math.sin(t * 1.5 + x * 7.1 + y * 3.3) > -0.2)) col = STAR;
      }
      return col;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const th = B[(y & 3) * 4 + (x & 3)] / 16;
        let col,
          m = N[y * w + x];
        if (m) col = fog && th < fog * 0.33 ? fogCol : glint(x, y) ? WHITE : M[m];
        else if ((m = S[y * w + x])) col = fog && th < fog * 0.5 ? fogCol : M[m];
        else if (y < HZ) {
          m = F[y * w + x];
          col = m ? (fog && th < fog * 0.7 ? fogCol : M[m]) : skyAt(x, y);
        } else if (y === HZ) col = fog && th < fog * 0.7 ? fogCol : shore;
        else {
          const depth = (y - HZ) / Math.max(1, h - HZ),
            ry = Math.max(0, HZ - (y - HZ) - 1),
            sx = frozen
              ? x
              : clamp(x + Math.round(Math.sin((y * 0.9) / k + t * 0.3) * (0.7 + depth * 1.8) * (1 + (wx.rain || 0) * 0.6) * k), 0, w - 1);
          // The angled bridge mirrors about its own piers' feet, not the far shore.
          const under = 2 * footing[sx] - y - 1;
          m = (under >= 0 && S[under * w + sx]) || F[ry * w + sx];
          if (frozen) {
            col = th < 0.62 + depth * 0.25 ? ice : skyAt(x, ry);
            if (hash(x >> 1, y) < 0.06) col = M[4];
          } else {
            col = m ? M[m] : skyAt(sx, ry);
            if (th < 0.3 + depth * 0.35) col = deep;
          }
          if (fog && th < fog * 0.6) col = fogCol;
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
    // Sprites live between the far bank and the near trees, so they pass behind a trunk rather than over it.
    const dot = (x, y, c) => {
      for (let a = 0; a < u; a++)
        for (let b = 0; b < u; b++) {
          const px = Math.round(x) + a,
            py = Math.round(y) + b;
          if (px >= 0 && px < w && py >= 0 && py < h && !N[py * w + px]) plot(px, py, c);
        }
    };

    if (fog < 1) {
      if (!frozen) {
        const cx = Math.round(((t * 2.5 * k + w * 0.62) % (w + 40 * u)) - 20 * u),
          cy = HZ + Math.round((h - HZ) * 0.2);
        for (let i = -5; i <= 5; i++) dot(cx + i * u, cy, M[9]);
        dot(cx - 6 * u, cy - u, M[9]);
        dot(cx + 6 * u, cy - u, M[9]);
        dot(cx - u, cy - u, M[9]);
        dot(cx - u, cy - 2 * u, M[9]);
        dot(cx + u, cy - u, M[9]);
      }
      drawTrain(t, plot, lit, mix(lit(STEEL), ink, 0.5), dark);
      if ((season === 'spring' || season === 'autumn') && light > 0.3) {
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
              hex('#e8f59a'),
            );
      }
    }
    if (wx.rain) {
      const c = mix(sky[n - 1], WHITE, 0.35),
        count = Math.round(((w * h) / 300) * wx.rain);
      for (let i = 0; i < count; i++) {
        const sp = (160 + 80 * hash(i, 3)) * k,
          y = (hash(i, 2) * h + t * sp) % h;
        const x = ((((hash(i, 1) * (w + 40) - t * sp * 0.25) % (w + 40)) + w + 40) % (w + 40)) - 20;
        plot(x, y, c);
        plot(x, y - 1, c);
        plot(x + 1, y - 2, c);
        plot(x + 1, y - 3, c);
      }
    }
    if (wx.snow) {
      const c = mix(hex('#eef3f8'), ink, sil * 0.35),
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
            if (B[((y - r) & 3) * 4 + ((x + a) & 3)] / 16 < (1 - r / reach) * 0.9) plot(x + a, y - r, PILLARS[i % 3]);
      });
    }
    if (season === 'autumn' && !wx.rain) {
      for (let i = 0; i < w / 10; i++)
        plot(
          (hash(i, 6) * w + t * (5 + 6 * hash(i, 7)) * k + Math.sin(t + i) * 4 * k) % w,
          (hash(i, 8) * h + t * (7 + 6 * hash(i, 9)) * k) % h,
          lit(i & 1 ? se.leafHi : hex('#b9452a')),
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
      if (poke.y < HZ) {
        if (age < 0.9)
          for (let j = 0; j < 10; j++) plot(poke.x + (age * 110 - j * 1.6) * k, poke.y + (age * 45 - j * 0.65) * k, j < 3 ? WHITE : STAR);
      } else if (!frozen && age < 3) {
        for (let a = 0; a < 40; a++)
          if (hash(a, Math.floor(age * 5)) > 0.3)
            plot(poke.x + Math.cos(a * 0.157) * age * 10 * k, poke.y + Math.sin(a * 0.157) * age * 3 * k, cLit);
      }
    }
    if (prev) {
      if (fadeAt < 0) fadeAt = t;
      const done = t - fadeAt;
      if (done >= 1) prev = null;
      else
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            if ((B[(y & 3) * 4 + (x & 3)] / 16) * 0.6 + (x / w) * 0.4 < done) continue;
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
  return { build, draw, snap };
}
