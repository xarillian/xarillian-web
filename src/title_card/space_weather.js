const KP_INDEX = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
// Prince Albert sits under the edge of the auroral oval: below Kp 1.5 the lights stay north of the horizon, around Kp 4
// they are a proper display overhead, and a geomagnetic storm (Kp 5 and up) fills the sky.
const QUIET_KP = 1.5,
  DISPLAY_KP = 4,
  STORM_STRENGTH = 1.6;

// The latest planetary Kp index (0 to 9) from NOAA's Space Weather Prediction Center, or null when it can't be had.
export async function liveKp() {
  try {
    const reply = await fetch(KP_INDEX);
    if (!reply.ok) return null;
    const { Kp } = (await reply.json()).at(-1);
    return Number.isFinite(Kp) ? Kp : null;
  } catch {
    return null;
  }
}

// How strongly the aurora shows over Prince Albert at a given Kp: 0 is none, 1 a good display.
export function auroraStrength(kp) {
  return Math.min(STORM_STRENGTH, Math.max(0, (kp - QUIET_KP) / (DISPLAY_KP - QUIET_KP)));
}
