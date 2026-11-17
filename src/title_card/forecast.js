import { LATITUDE, LONGITUDE, SCENE_DAY_HOURS, SCENE_SUNRISE, sceneHour } from './almanac.js';

const PLACE = `latitude=${LATITUDE}&longitude=${LONGITUDE}&timezone=UTC`;
const FORECAST =
  `https://api.open-meteo.com/v1/forecast?${PLACE}` +
  '&current=temperature_2m,weather_code,cloud_cover,wind_gusts_10m,precipitation_probability,is_day&hourly=weather_code&past_hours=6&forecast_hours=1';
const AIR = `https://air-quality-api.open-meteo.com/v1/air-quality?${PLACE}&current=pm2_5`;

// WMO 4677 weather interpretation codes returned by Open-Meteo.
const CODES = {
  fog: [45, 48],
  rain: [51, 53, 55, 61, 63, 65, 80, 81, 82],
  freezing: [56, 57, 66, 67],
  snow: [71, 73, 75, 77, 85, 86],
  thunder: [95],
  hail: [96, 99],
};

export async function liveWeather() {
  try {
    const [forecast, air] = await Promise.all([fetchJson(FORECAST), fetchJson(AIR).catch(() => ({}))]);
    const { time, ...now } = forecast.current;
    const before = forecast.hourly.time.flatMap((hour, i) => (hour < time ? [forecast.hourly.weather_code[i]] : []));
    return readSky({ ...now, before, smoke: air.current?.pm2_5 ?? 0 });
  } catch {
    return null;
  }
}

// Checks active precipitation first, then secondary atmospheric phenomena inferred from recent history, temperature, and probability rolls.
function readSky(
  { weather_code, temperature_2m: celsius, cloud_cover, wind_gusts_10m, precipitation_probability = 0, is_day, before, smoke },
  date = new Date(),
  roll = Math.random,
) {
  const now = kind(weather_code),
    earlier = before.map(kind),
    open = cloud_cover < 40;

  if (now === 'hail' || now === 'thunder') {
    if (celsius >= 10 && (wind_gusts_10m >= 50 || roll() < 0.2)) return 'funnel cloud';
    if (now === 'hail' || (celsius >= 10 && roll() < 0.15)) return 'hail';
    return 'thunderstorm';
  }
  if (now === 'freezing') return 'freezing rain';
  if (now === 'snow') return wind_gusts_10m >= 40 ? 'whiteout' : 'snow';
  if (now === 'rain') return is_day && (cloud_cover < 50 || roll() < 0.2) ? 'sun shower' : 'rain';
  if (now === 'fog') return celsius <= -15 ? 'ice fog' : 'fog';
  // PM2.5 >= 35 µg/m³ marks unhealthy wildfire smoke levels.
  if (smoke >= 35) return 'smoke';
  if (earlier.includes('thunder') || earlier.includes('hail')) return 'mammatus';
  if (is_day && celsius > 5 && cloud_cover >= 15 && cloud_cover <= 70 && precipitation_probability >= 50) return 'sun shower';
  if (celsius >= 15 && cloud_cover >= 50 && roll() < 0.1) return 'mammatus';
  // Below -25°C, open river water and town exhaust form ice fog and light pillars even without a reported WMO fog code.
  if (celsius <= -25 && roll() < 0.35) return 'ice fog';
  // Hoarfrost forms in the -5°C to -20°C window where cold air still holds enough moisture to rim branches.
  if (open && celsius <= -5 && celsius >= -20 && (earlier.includes('fog') || roll() < 0.25)) return 'hoarfrost';
  if (open && is_day && celsius <= -5 && roll() < (celsius <= -15 && sunIsLow(date) ? 0.4 : 0.2)) return 'sun dogs';
  if (open && !is_day && [4, 5, 6, 7].includes(date.getUTCMonth()) && roll() < 0.2) return 'noctilucent';
  return cloud_cover >= 60 ? 'cloudy' : 'clear';
}

function kind(code) {
  return Object.keys(CODES).find((name) => CODES[name].includes(code));
}

function sunIsLow(date) {
  const fromSunrise = sceneHour(date) - SCENE_SUNRISE;
  return fromSunrise < 3.5 || fromSunrise > SCENE_DAY_HOURS - 3.5;
}

async function fetchJson(url) {
  const reply = await fetch(url);
  if (!reply.ok) throw new Error(`${url}: ${reply.status}`);
  return reply.json();
}
