// The Sun Eater: a nil serpent some 4 AU long, its jaws fixed open just beneath the sun, its body a dead pillar reaching
// down past the eastern horizon. It hangs off the sun, so it crosses the sky with it, and it sits far beyond the air:
// the lower it reaches, the more sky it is seen through, like a far mountain range.
const BODY = [40, 33, 47];
const TOOTH = [150, 142, 156];
const THROAT = [14, 10, 18];
// A snake's lopsided gape, in radians from straight up: the heavy upper jaw rears nearly upright past the sun's
// eastern side, while the thin lower jaw drops wide open on the west.
const UPPER = -0.6,
  LOWER = 0.75;

// `horizon` is the y where the far shore meets the sky; `sun` is the sun's centre and radius in scene pixels.
export function sunEater(width, horizon, sun, scale) {
  const girth = 2.5 * scale,
    hinge = { x: sun.x, y: Math.round(sun.y + sun.r * 2.4) },
    height = Math.max(1, horizon - hinge.y),
    lean = -0.08 * width;
  const jaws = [jaw(UPPER, sun.r * 2.6, girth * 2), jaw(LOWER, sun.r * 2.2, girth)];
  // One dim eye, set back on the upper jaw away from the mouth.
  const [upper] = jaws,
    eye = {
      x: hinge.x + upper.dx * upper.length * 0.3 - upper.dy * upper.width * 0.2 * upper.inward,
      y: hinge.y + upper.dy * upper.length * 0.3 + upper.dx * upper.width * 0.2 * upper.inward,
    };

  // Per row from the hinge down to the horizon: the body's centre, its half-width, and how high up it is (1 at the head).
  const top = Math.max(0, hinge.y),
    centre = new Float32Array(horizon + 1),
    reach = new Float32Array(horizon + 1),
    rise = new Float32Array(horizon + 1);
  for (let y = top; y <= horizon; y++) {
    const up = (horizon - y) / height,
      // It leans back toward the east and winds like a snake, straightening as it rears up under the sun.
      bends = Math.sin(up * Math.PI * 2.6 + 0.6) * 10 * scale * (1 - up ** 3);
    centre[y] = hinge.x + lean * (1 - up) ** 1.5 + bends;
    rise[y] = up;
  }
  // Rows bend sideways, so a row's half-width widens by the body's lean there to keep the body's true thickness.
  for (let y = top; y <= horizon; y++)
    reach[y] = girth * Math.hypot(1, (centre[Math.min(horizon, y + 1)] - centre[Math.max(top, y - 1)]) / 2);

  const inBody = (x, y) => y >= top && y <= horizon && Math.abs(x - centre[y]) < reach[y];
  const inSkull = (x, y) => Math.hypot(x - hinge.x, y - hinge.y) < girth * 1.6;
  // Between the jaws, close to the hinge: the open throat.
  const inThroat = (x, y) => {
    const angle = Math.atan2(x - hinge.x, hinge.y - y);
    return angle > UPPER && angle < LOWER && inSkull(x, y);
  };
  const onJaw = (x, y) => {
    for (const { dx, dy, length, width: base, inward } of jaws) {
      const px = x - hinge.x,
        py = y - hinge.y,
        along = px * dx + py * dy,
        across = px * dy - py * dx,
        half = base * (1 - (0.75 * along) / length);
      if (along >= 0 && along <= length && Math.abs(across) < half) return { along, inner: across * inward > half * 0.45 };
    }
    return null;
  };

  const holds = (x, y) => inBody(x, y) || inSkull(x, y) || !!onJaw(x, y);

  // `th` is the Bayer threshold; `sky` is the sky colour behind this pixel; `haze` is how much the air already veils it.
  const at = (x, y, th, sky, haze) => {
    if (inThroat(x, y)) return veil(THROAT, sky, haze * 0.6);
    if (Math.hypot(x - eye.x, y - eye.y) < 0.7 * scale) return veil(TOOTH, sky, haze * 0.6);
    const bite = onJaw(x, y);
    if (bite) return veil(bite.inner && Math.sin(bite.along / scale) > 0.3 ? TOOTH : BODY, sky, haze);
    if (inSkull(x, y)) return veil(BODY, sky, haze);
    if (!inBody(x, y)) return null;
    const low = 1 - rise[y];
    if (th > 0.97 - 0.3 * low) return null;
    return veil(BODY, sky, Math.min(0.92, haze + 0.45 * low));
  };

  return { at, holds };
}

// A jaw runs from the hinge at `angle` from straight up; `inward` is the sign of its side facing the other jaw.
const jaw = (angle, length, width) => ({ dx: Math.sin(angle), dy: -Math.cos(angle), length, width, inward: Math.sign(angle) });

const veil = (c, sky, f) => [
  Math.round(c[0] + (sky[0] - c[0]) * f),
  Math.round(c[1] + (sky[1] - c[1]) * f),
  Math.round(c[2] + (sky[2] - c[2]) * f),
];
