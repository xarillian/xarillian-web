// Water Survey of Canada's real-time gauge 05GG001, North Saskatchewan River at Prince Albert, a few hundred metres from
// the bridge in the scene.
const GAUGE =
  'https://api.weather.gc.ca/collections/hydrometric-realtime/items?STATION_NUMBER=05GG001&sortby=-DATETIME&limit=1&f=json';
// Gauge levels in metres from the 2011-2024 daily means: the median, about the lowest the river runs, and the spring
// floods (2013, 2018 and 2020 all crested past 5.3 m).
const USUAL = 2.0,
  LOWEST = 1.3,
  FLOOD = 4.5;

// The latest water level at the gauge in metres, or null when it can't be had.
export async function liveRiverLevel() {
  try {
    const reply = await fetch(GAUGE);
    if (!reply.ok) return null;
    const level = (await reply.json()).features[0]?.properties.LEVEL;
    return Number.isFinite(level) ? level : null;
  } catch {
    return null;
  }
}

// How high the river stands, from -1 (low water, the bars out) through 0 (usual) to 1 (in flood).
export function riverStage(level) {
  const stage = level < USUAL ? (level - USUAL) / (USUAL - LOWEST) : (level - USUAL) / (FLOOD - USUAL);
  return Math.min(1, Math.max(-1, stage));
}
