import { LATITUDE } from './almanac.js';
import { STARS } from './star_catalogue.js';

const RADIANS = Math.PI / 180;
// Star colour by B-V index: hot blue-white below `BLUE`, cool orange above `ORANGE`, the scene's cream in between.
const TINTS = [
  [196, 214, 255],
  [244, 236, 216],
  [255, 200, 146],
];
const BLUE = 0,
  ORANGE = 1;
// The faintest magnitude seen on a clear dark night here, and at the first of dusk: Sirius and the planets' league.
const DARK_LIMIT = 6,
  DUSK_LIMIT = -1.5;
// Magnitudes of dimming per air mass of atmosphere the starlight crosses, which is what empties the sky near the horizon.
const EXTINCTION = 0.28;
// A star this many magnitudes above the limit is drawn at full strength; fainter ones sink toward the sky in `SHADES` steps.
const FULL_AT = 3,
  SHADES = 4,
  FAINTEST_SHADE = 0.45;

const CATALOGUE = Array.from({ length: STARS.length / 4 }, (_, i) => {
  const [rightAscension, declination, magnitude, colour] = STARS.slice(i * 4, i * 4 + 4).map((tenths) => tenths / 10);
  return {
    rightAscension: rightAscension * RADIANS,
    sinDec: Math.sin(declination * RADIANS),
    cosDec: Math.cos(declination * RADIANS),
    magnitude,
    tint: colour < BLUE ? 0 : colour > ORANGE ? 2 : 1,
  };
});

// The real stars over Prince Albert, as a level camera sees them. `camera` is its `bearing` (degrees from true north), its
// `focal` length in pixels, and the pixel (`x`, `y`) where its axis meets the horizon. `sidereal` is the local sidereal
// angle in radians, which is what turns the sky. `clarity` is 1 for a dark, clear night and 0 for daylight or overcast.
export function starfield(width, height, camera, sidereal, clarity) {
  const sinLat = Math.sin(LATITUDE * RADIANS),
    cosLat = Math.cos(LATITUDE * RADIANS),
    sinBearing = Math.sin(camera.bearing * RADIANS),
    cosBearing = Math.cos(camera.bearing * RADIANS),
    limit = DUSK_LIMIT + (DARK_LIMIT - DUSK_LIMIT) * clarity;
  // Per pixel: 0 for empty sky, else 1 + tint * SHADES + shade. The catalogue runs brightest first, so the first star to a pixel keeps it.
  const lit = new Uint8Array(width * height);

  for (const star of CATALOGUE) {
    if (star.magnitude > limit) break;
    // Equatorial to horizontal coordinates, as components east, north and up.
    const hourAngle = sidereal - star.rightAscension,
      east = -star.cosDec * Math.sin(hourAngle),
      north = star.sinDec * cosLat - star.cosDec * sinLat * Math.cos(hourAngle),
      up = star.sinDec * sinLat + star.cosDec * cosLat * Math.cos(hourAngle);
    const ahead = east * sinBearing + north * cosBearing,
      right = east * cosBearing - north * sinBearing;
    if (up <= 0 || ahead <= 0) continue;
    const x = Math.round(camera.x + (camera.focal * right) / ahead),
      y = Math.round(camera.y - (camera.focal * up) / ahead);
    if (x < 0 || x >= width || y < 0 || y >= height || lit[y * width + x]) continue;
    const headroom = limit - star.magnitude - EXTINCTION * (airMass(up) - 1);
    if (headroom < 0) continue;
    const shade = Math.min(SHADES - 1, Math.floor((headroom / FULL_AT) * SHADES));
    lit[y * width + x] = 1 + star.tint * SHADES + shade;
  }

  // `sky` is the sky colour behind this pixel, which a faint star only partly outshines.
  const at = (x, y, sky) => {
    const star = x >= 0 && x < width && y >= 0 && y < height && lit[y * width + x];
    if (!star) return null;
    const tint = TINTS[Math.floor((star - 1) / SHADES)],
      strength = FAINTEST_SHADE + ((1 - FAINTEST_SHADE) * ((star - 1) % SHADES)) / (SHADES - 1);
    return [0, 1, 2].map((channel) => Math.round(sky[channel] + (tint[channel] - sky[channel]) * strength));
  };

  return { at };
}

// Rozenberg's air mass: 1 straight up, about 40 at the horizon. `up` is the sine of the star's altitude.
const airMass = (up) => 1 / (up + 0.025 * Math.exp(-11 * up));
