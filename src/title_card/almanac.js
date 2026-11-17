export const LATITUDE = 53.2;
export const LONGITUDE = -105.75;
const RADIANS = Math.PI / 180;

// Solar position is computed locally from the date rather than fetched from Open-Meteo so the first frame
// renders at the right time of day before the network responds (or when requests fail).
// Because `scene.js` uses fixed sky-colour keyframes (dawn around 6.5, dusk around 19.0), `sceneHour` warps
// real daytime (noon ± halfDay) onto the fixed [5.5, 20.5] window and night onto the remaining 9 hours.
export const SCENE_SUNRISE = 5.5;
export const SCENE_DAY_HOURS = 15;

export function sceneHour(date = new Date()) {
  const { noon, halfDay } = daylight(date);
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
  // Signed hours from solar noon, wrapped into [-12, 12).
  const fromNoon = ((utcHour - noon + 36) % 24) - 12;

  if (Math.abs(fromNoon) <= halfDay) return SCENE_SUNRISE + SCENE_DAY_HOURS / 2 + (fromNoon / halfDay) * (SCENE_DAY_HOURS / 2);

  const nightHours = 24 - 2 * halfDay;
  const intoNight = fromNoon > 0 ? fromNoon - halfDay : fromNoon + 24 - halfDay;
  return (SCENE_SUNRISE + SCENE_DAY_HOURS + (intoNight / nightHours) * (24 - SCENE_DAY_HOURS)) % 24;
}

// The real instant, nearest `date`, at which the scene's clock reads `hour`: `sceneHour` run backwards.
export function instantAtSceneHour(hour, date = new Date()) {
  const { noon, halfDay } = daylight(date);
  const intoDay = (hour - SCENE_SUNRISE + 24) % 24;
  const fromNoon =
    intoDay <= SCENE_DAY_HOURS
      ? ((intoDay / SCENE_DAY_HOURS) * 2 - 1) * halfDay
      : halfDay + ((intoDay - SCENE_DAY_HOURS) / (24 - SCENE_DAY_HOURS)) * (24 - 2 * halfDay);
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const ahead = ((noon + fromNoon - utcHour + 36) % 24) - 12;
  return new Date(date.getTime() + ahead * 3_600_000);
}

// Local sidereal angle in radians: how far the sky has turned over Prince Albert. Greenwich's was 280.46° at noon UTC on
// 2000-01-01 and gains 360.9856° a day, one full turn plus the day's share of Earth's orbit.
export function siderealAngle(date = new Date()) {
  const days = (date - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
  return ((280.46061837 + 360.98564736629 * days + LONGITUDE) % 360) * RADIANS;
}

// Returns [0, 1) where 0 is new moon and 0.5 is full moon, measured from the known new moon on 2000-01-06 18:14 UTC.
export function moonPhase(date = new Date()) {
  const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
  const SYNODIC_DAYS = 29.530588853;
  const age = (date - NEW_MOON) / 86_400_000 / SYNODIC_DAYS;
  return age - Math.floor(age);
}

function daylight(date) {
  const dayOfYear =
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000;
  // Solar declination from Earth's 23.44° axial tilt; +10 days aligns Jan 1 with the Dec 21 winter solstice.
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10)) * RADIANS;
  // Orbital angle from the vernal equinox (day 81) for the Equation of Time (in minutes),
  // combining axial obliquity (9.87 sin 2x) and orbital eccentricity (-7.53 cos x - 1.5 sin x).
  const orbit = ((2 * Math.PI) / 364) * (dayOfYear - 81);
  const equationOfTime = 9.87 * Math.sin(2 * orbit) - 7.53 * Math.cos(orbit) - 1.5 * Math.sin(orbit);

  // Standard sunrise altitude of -0.833° accounts for the solar disk radius (0.266°) and atmospheric refraction (0.567°).
  const horizon = Math.sin(-0.833 * RADIANS);
  // Sunrise hour-angle equation: cos(ω) = (sin(alt) - sin(lat)sin(dec)) / (cos(lat)cos(dec)).
  const cosHourAngle =
    (horizon - Math.sin(LATITUDE * RADIANS) * Math.sin(declination)) / (Math.cos(LATITUDE * RADIANS) * Math.cos(declination));
  // Earth rotates 15° per hour, converting the clamped hour angle into half-day length in hours.
  const halfDay = Math.acos(Math.max(-1, Math.min(1, cosHourAngle))) / RADIANS / 15;

  return { noon: 12 - LONGITUDE / 15 - equationOfTime / 60, halfDay };
}
