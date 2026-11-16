// A black hole with its accretion disk seen almost edge-on. The disk's near half crosses in front of the shadow; its far
// half is bent by gravity into arcs over the top (thick) and under the bottom (thin). Every size is in shadow radii.
const SHAPE = { ring: 1.12, inner: 1.35, outer: 4.4, flat: 0.08, lens: 1.8 };
const TILT = (-5 * Math.PI) / 180;
// A real disk is far hotter than any star, so it reads blue-white, not the orange of film. Colour comes from apparent
// temperature, coolest first: only gas racing away from us redshifts down into orange and red.
const TEMPERATURE = [
  [138, 42, 42],
  [216, 100, 58],
  [255, 200, 154],
  [255, 241, 230],
  [244, 246, 255],
  [207, 220, 255],
  [166, 191, 255],
];
export const DISK_LIGHT = TEMPERATURE[5];
const SHADOW = [3, 2, 8];

export function blackHole(x, y, radius, t) {
  // A fast quiver over a slow breath, like the flickering seen in real disks.
  const flare = 1 + 0.07 * Math.sin(t * 8.2) + 0.1 * Math.sin(t * 0.37);

  // `th` is the caller's Bayer dither threshold, so the disk stipples like every other gradient in the scene.
  const at = (px, py, th) => {
    const dx = px - x,
      dy = py - y,
      d = Math.hypot(dx, dy) / radius;
    // Undo the tilt to read the disk in its own frame.
    const gx = dx * Math.cos(TILT) + dy * Math.sin(TILT),
      gy = dy * Math.cos(TILT) - dx * Math.sin(TILT),
      ellipse = Math.hypot(gx, gy / SHAPE.flat) / radius;
    // Seen from just above the disk plane, its near half sits below centre and passes in front of the shadow.
    const gas = ellipse > SHAPE.inner && ellipse < SHAPE.outer && (gy >= 0 || d > 1) && disk(gx, gy, ellipse, th);
    if (gas) return gas;
    if (d < 1) return SHADOW;
    if (d < SHAPE.ring) return th < 0.6 ? TEMPERATURE[6] : TEMPERATURE[5];
    return arc(gx, gy, d, th);
  };

  const disk = (gx, gy, ellipse, th) => {
    const across = (ellipse - SHAPE.inner) / (SHAPE.outer - SHAPE.inner),
      shift = doppler(gx);
    // Keplerian swirl: inner gas laps faster than outer gas.
    const clump = Math.sin(Math.atan2(gy / SHAPE.flat, gx) * 3 + ellipse * 4 - t * (1.6 / ellipse ** 1.5));
    return glowing(0.55 + 0.35 * (1 - across) + 0.06 * clump + shift, (1 - 0.6 * across) * beaming(shift), th);
  };

  const arc = (gx, gy, d, th) => {
    const tilt = Math.abs(gy) / (d * radius),
      thick = (gy < 0 ? 0.85 : 0.3) * tilt ** 0.6 + 0.06,
      depth = (d - SHAPE.ring) / thick;
    if (depth >= 1) return null;
    const shift = doppler(gx);
    return glowing(0.6 + 0.3 * (1 - depth) + shift, (1 - 0.5 * depth) * beaming(shift), th);
  };

  // Gas on the left is coming toward us (bluer), gas on the right is leaving (redder).
  const doppler = (gx) => (-0.3 * gx) / (radius * SHAPE.outer);
  // Relativistic beaming: brightness scales roughly with the cube of the Doppler factor, so the receding side thins out.
  const beaming = (shift) => (1 + shift) ** 3 * flare;

  const glowing = (warmth, brightness, th) => {
    if (th >= brightness) return null;
    const v = Math.min(1, Math.max(0, warmth)) * (TEMPERATURE.length - 1),
      i = Math.floor(v);
    return TEMPERATURE[v - i > th ? Math.min(i + 1, TEMPERATURE.length - 1) : i];
  };

  // Lens equation: light seen at distance `d` left its source at `d - lens^2 / d`, so stars near the Einstein ring
  // smear into arcs and those inside it show up mirrored.
  const lensed = (px, py) => {
    const dx = px - x,
      dy = py - y,
      pull = 1 - (SHAPE.lens * radius) ** 2 / Math.max(1, dx * dx + dy * dy);
    return [Math.round(x + dx * pull), Math.round(y + dy * pull)];
  };

  // Air scatters the disk's light most strongly near it, the way the sky whitens around the sun.
  const aureole = (px, py) => 0.5 * flare * Math.exp(-Math.hypot(px - x, py - y) / (radius * 2.5));

  return { x, y, flare, at, lensed, aureole };
}
