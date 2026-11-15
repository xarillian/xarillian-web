// What the sky over Prince Albert is doing right now, worked out from the
// date alone so the page needs no weather service to know night from day.

const LATITUDE = 53.2;
const LONGITUDE = -105.75;
const RADIANS = Math.PI / 180;

// The scene's own clock: the sun rises at 5.5, stands highest at 13 and sets
// at 20.5, whatever the season. Real daylight is stretched or squeezed onto
// it, so a December afternoon and a June evening both land on the right sky.
const SCENE_SUNRISE = 5.5;
const SCENE_DAY_HOURS = 15;

export function sceneHour(date = new Date()) {
  const { noon, halfDay } = daylight(date);
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const fromNoon = ((utcHour - noon + 36) % 24) - 12;

  if (Math.abs(fromNoon) <= halfDay) return 13 + (fromNoon / halfDay) * (SCENE_DAY_HOURS / 2);

  const nightHours = 24 - 2 * halfDay;
  const intoNight = fromNoon > 0 ? fromNoon - halfDay : fromNoon + 24 - halfDay;
  return (SCENE_SUNRISE + SCENE_DAY_HOURS + (intoNight / nightHours) * (24 - SCENE_DAY_HOURS)) % 24;
}

// Runs 0 at new moon, 0.5 at full, back to 1 at the next new moon.
export function moonPhase(date = new Date()) {
  const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
  const SYNODIC_DAYS = 29.530588853;
  const age = (date - NEW_MOON) / 86_400_000 / SYNODIC_DAYS;
  return age - Math.floor(age);
}

// Solar noon and half the day's length, both in hours, noon on the UTC clock.
function daylight(date) {
  const dayOfYear =
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000;
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10)) * RADIANS;
  const orbit = ((2 * Math.PI) / 364) * (dayOfYear - 81);
  const equationOfTime = 9.87 * Math.sin(2 * orbit) - 7.53 * Math.cos(orbit) - 1.5 * Math.sin(orbit);

  const horizon = Math.sin(-0.833 * RADIANS);
  const cosHourAngle =
    (horizon - Math.sin(LATITUDE * RADIANS) * Math.sin(declination)) / (Math.cos(LATITUDE * RADIANS) * Math.cos(declination));
  const halfDay = Math.acos(Math.max(-1, Math.min(1, cosHourAngle))) / RADIANS / 15;

  return { noon: 12 - LONGITUDE / 15 - equationOfTime / 60, halfDay };
}
