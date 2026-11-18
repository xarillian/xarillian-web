import { SCENE_DAY_HOURS, SCENE_SUNRISE, sceneHour } from './almanac.js';

// Environment and Climate Change Canada's open data: the Prince Albert city page (current conditions and the hourly
// forecast), the airport's surface observations (CYPA, Glass Field) and the air quality monitor in town.
const API = 'https://api.weather.gc.ca/collections';
const CITY_PAGE = `${API}/citypageweather-realtime/items/sk-27?f=json`;
// Two reports an hour, one from the automatic station and one from the observer on shift (about 6 am to 9 pm local),
// so 16 cover the last 8 hours.
const AIRPORT =
  `${API}/swob-realtime/items?f=json&skipGeometry=true&icao_stn_id-value=CYPA&sortby=-date_tm-value&limit=16` +
  '&properties=date_tm-value,vis,avg_vis_pst10mts,rmk';
const AIR = `${API}/aqhi-observations-realtime/items?f=json&skipGeometry=true&location_id=HAPNV&sortby=-observation_datetime&limit=1&properties=aqhi`;
const HISTORY_HOURS = 6;

// Condition text, most dramatic first. The city page names these in plain words ("Light Snow", "Thunderstorm with Hail",
// "Ice Fog", "Smoke"); the airport observer's remarks use METAR abbreviations.
const KINDS = [
  ['funnel', /funnel|tornado|waterspout/i],
  ['hail', /hail/i],
  ['thunder', /thunder/i],
  ['freezing', /freezing (rain|drizzle)|ice pellets/i],
  ['blowing', /blowing snow/i],
  ['snow', /snow|flurr|ice crystals/i],
  ['rain', /rain|drizzle|shower/i],
  ['fog', /fog|mist/i],
  ['smoke', /smoke|haze/i],
];
const REMARKS = { fog: /\bFG\b/, thunder: /\bTS\b|LTG|CB\d|\bCB\b/, hail: /\bGR\b|\bGS\b/ };
// Sky cover in percent for the city page's cloud words, and for its icon codes when the station reports no condition:
// 0/30 sunny or clear, 1/31 mainly, 2/32 partly cloudy, 3/33 mostly cloudy (day/night).
const COVER_WORDS = [
  [/mainly (sunny|clear)/i, 25],
  [/sunny|clear/i, 0],
  [/partly/i, 50],
  [/mostly cloudy/i, 75],
];
const COVER_ICONS = { 0: 0, 30: 0, 1: 25, 31: 25, 2: 50, 32: 50, 3: 75, 33: 75 };
// An Air Quality Health Index of 7 or more is "high risk", which on the prairies in summer means wildfire smoke.
const SMOKY_AQHI = 7;
// Visibility under a kilometre is fog by definition.
const FOG_KM = 1;

export async function liveWeather() {
  try {
    const [page, airport, air] = await Promise.all([
      fetchJson(CITY_PAGE),
      fetchJson(AIRPORT).catch(() => ({ features: [] })),
      fetchJson(AIR).catch(() => ({ features: [] })),
    ]);
    const { currentConditions: current, hourlyForecastGroup: hourly } = page.properties;
    const condition = english(current.condition) ?? '';
    return readSky({
      now: kindOf(condition),
      condition,
      celsius: english(current.temperature?.value) ?? 0,
      cover: coverOf(condition, current.iconCode?.value),
      gusts: english(current.wind?.gust?.value) ?? english(current.wind?.speed?.value) ?? 0,
      precipitation: english(hourly?.hourlyForecasts?.[0]?.lop?.value) ?? 0,
      before: history(airport.features.map((feature) => feature.properties)),
      aqhi: air.features[0]?.properties.aqhi ?? 0,
    });
  } catch {
    return null;
  }
}

// Checks active precipitation first, then secondary atmospheric phenomena inferred from recent history, temperature, and probability rolls.
function readSky({ now, condition, celsius, cover, gusts, precipitation, before, aqhi }, date = new Date(), roll = Math.random) {
  const open = cover < 40,
    day = isDay(date);

  if (now === 'funnel') return 'funnel cloud';
  if (now === 'hail' || now === 'thunder') {
    if (celsius >= 10 && (gusts >= 50 || roll() < 0.2)) return 'funnel cloud';
    if (now === 'hail' || (celsius >= 10 && roll() < 0.15)) return 'hail';
    return 'thunderstorm';
  }
  if (now === 'freezing') return 'freezing rain';
  if (now === 'blowing') return 'whiteout';
  if (now === 'snow') return gusts >= 40 ? 'whiteout' : 'snow';
  if (now === 'rain') return day && (cover < 50 || roll() < 0.2) ? 'sun shower' : 'rain';
  if (now === 'fog') return /ice fog/i.test(condition) || celsius <= -15 ? 'ice fog' : 'fog';
  if (now === 'smoke' || aqhi >= SMOKY_AQHI) return 'smoke';
  if (before.has('thunder') || before.has('hail')) return 'mammatus';
  if (day && celsius > 5 && cover >= 15 && cover <= 70 && precipitation >= 50) return 'sun shower';
  if (celsius >= 15 && cover >= 50 && roll() < 0.1) return 'mammatus';
  // Below -25°C, open river water and town exhaust form ice fog and light pillars even without fog in the report.
  if (celsius <= -25 && roll() < 0.35) return 'ice fog';
  // Hoarfrost forms in the -5°C to -20°C window where cold air still holds enough moisture to rim branches.
  if (open && celsius <= -5 && celsius >= -20 && (before.has('fog') || roll() < 0.25)) return 'hoarfrost';
  if (open && day && celsius <= -5 && roll() < (celsius <= -15 && sunIsLow(date) ? 0.4 : 0.2)) return 'sun dogs';
  if (open && !day && [4, 5, 6, 7].includes(date.getUTCMonth()) && roll() < 0.2) return 'noctilucent';
  return cover >= 60 ? 'cloudy' : 'clear';
}

function kindOf(text) {
  return KINDS.find(([, pattern]) => pattern.test(text))?.[0];
}

function coverOf(condition, icon) {
  if (condition) return COVER_WORDS.find(([pattern]) => pattern.test(condition))?.[1] ?? 100;
  return COVER_ICONS[icon] ?? 100;
}

// What the airport saw over the last few hours: fog from its visibility or the observer's remarks, thunder and hail
// from the remarks alone, so overnight, with no observer on shift, only fog is caught.
function history(reports, date = new Date()) {
  const since = date.getTime() - HISTORY_HOURS * 3_600_000,
    seen = new Set();
  for (const report of reports) {
    if (Date.parse(report['date_tm-value']) < since) continue;
    const visibility = report.vis ?? report.avg_vis_pst10mts;
    if (visibility !== undefined && visibility < FOG_KM) seen.add('fog');
    for (const [kind, pattern] of Object.entries(REMARKS)) if (pattern.test(report.rmk ?? '')) seen.add(kind);
  }
  return seen;
}

function isDay(date) {
  const intoDay = sceneHour(date) - SCENE_SUNRISE;
  return intoDay >= 0 && intoDay <= SCENE_DAY_HOURS;
}

function sunIsLow(date) {
  const fromSunrise = sceneHour(date) - SCENE_SUNRISE;
  return fromSunrise < 3.5 || fromSunrise > SCENE_DAY_HOURS - 3.5;
}

// The city page gives every value in both official languages.
function english(value) {
  return value && typeof value === 'object' ? value.en : value;
}

async function fetchJson(url) {
  const reply = await fetch(url);
  if (!reply.ok) throw new Error(`${url}: ${reply.status}`);
  return reply.json();
}
