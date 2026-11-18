import { instantAtSceneHour, moonPhase, sceneHour, siderealAngle } from './almanac.js';
import { eclipseAt } from './eclipses.js';
import { liveWeather } from './forecast.js';
import { drawInstruments, INSTRUMENTS, placeInstruments, TILE } from './instruments.js';
import { createScene } from './scene.js';
import { liveRiverLevel, riverStage } from './river.js';
import { auroraStrength, liveKp } from './space_weather.js';

const PIXEL = 4;
const FRAME_MS = 110;

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_OF_MONTH = [
  'winter',
  'winter',
  'spring',
  'spring',
  'spring',
  'summer',
  'summer',
  'summer',
  'autumn',
  'autumn',
  'autumn',
  'winter',
];
const WEATHER = {
  spring: ['clear', 'cloudy', 'rain', 'sun shower', 'fog', 'thunderstorm'],
  summer: ['clear', 'cloudy', 'rain', 'thunderstorm', 'hail', 'funnel cloud', 'mammatus', 'smoke', 'sun shower', 'noctilucent'],
  autumn: ['clear', 'cloudy', 'fog', 'rain', 'freezing rain', 'snow'],
  winter: ['clear', 'hoarfrost', 'sun dogs', 'ice fog', 'cloudy', 'snow', 'freezing rain', 'whiteout', 'fog'],
};
const HOUR_OF = { dawn: 6.6, day: 13, dusk: 19, night: 23.5 };
const TIMES = ['auto', ...Object.keys(HOUR_OF)];
const MOON_OF = {
  new: 0,
  'waxing crescent': 0.16,
  'first quarter': 0.25,
  'waxing gibbous': 0.34,
  full: 0.5,
  'waning gibbous': 0.66,
  'third quarter': 0.75,
  'waning crescent': 0.84,
};
const MOONS = ['auto', ...Object.keys(MOON_OF)];
// Auto leaves the aurora to the hour, the moon and the live Kp index; the rest pin its strength, though it still needs a dark, open sky.
const AURORA_OF = { 'aurora off': 0, 'aurora faint': 0.4, 'aurora bright': 1, 'aurora storm': 1.6 };
const AURORAS = ['aurora auto', ...Object.keys(AURORA_OF)];
// Light pollution: the faintest magnitude a clear night shows. Prince Albert's own skyglow leaves only the brightest stars.
const STAR_LIMIT_OF = { 'stars dark sky': 6, 'stars rural': 4.5, 'stars town': 3.5, 'stars city': 2.5 };
const STAR_SKIES = Object.keys(STAR_LIMIT_OF);
// Auto follows the live gauge at Prince Albert; the rest pin the river's stage from low water (-1) to flood (1).
const RIVER_OF = { 'river low': -1, 'river usual': 0, 'river high': 0.5, 'river flood': 1 };
const RIVERS = ['river auto', ...Object.keys(RIVER_OF)];
const HOLES = ['black hole off', 'black hole on'];
const BLACK_HOLE_ODDS = 1 / 10_000;
const EATERS = ['sun eater off', 'sun eater on'];
const SUN_EATER_ODDS = 1 / 100_000;

const canvas = document.querySelector('#river');
const plaque = document.querySelector('.plaque');
const foldButton = document.querySelector('.fold');
const rail = document.querySelector('.rail');
const unfoldButton = document.querySelector('.unfold');
const corner = document.querySelector('.corner');
const almanac = document.querySelector('.almanac');
const buttons = INSTRUMENTS.map((name) => document.querySelector(`#${name}`));
const [seasonButton, weatherButton, timeButton, moonButton, auroraButton, starsButton, gaugeButton, holeButton, eaterButton, squatchButton, fishButton, trainButton] = buttons;
const dials = document.querySelector('.almanac canvas');
const dialContext = dials.getContext('2d');
const context = canvas.getContext('2d');

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = matchMedia('(max-width: 640px)');
const debug = new URLSearchParams(location.search).has('debug');
const began = performance.now();
const now = {
  season: SEASON_OF_MONTH[new Date().getMonth()],
  weather: 'clear',
  time: 'auto',
  moon: 'auto',
  aurora: 'aurora auto',
  stars: 'stars town',
  gauge: 'river auto',
  hole: HOLES[Math.random() < BLACK_HOLE_ODDS ? 1 : 0],
  eater: EATERS[Math.random() < SUN_EATER_ODDS ? 1 : 0],
  squatch: 'spawn squatch',
  fish: 'spawn fish',
  train: 'spawn train',
};

let scene, image, planted, places, dialImage;
let fitted = '';
let lit = -1;
let pokes = [];
let gaze = null,
  stare = 0,
  strain = 0;
const spawns = { squatches: [], fishes: [], trains: [] };
let lastFrame = 0;
let stale = true;
let sky = 'plain';
// Until NOAA answers there is no aurora: the scene shows the lights only when they are really out.
let kp = null;
// The gauge's level in metres; until it answers the river sits at its usual height.
let riverLevel = null;

if (debug) {
  seasonButton.addEventListener('click', () => pick({ season: after(SEASONS, now.season), weather: 'clear' }));
  weatherButton.addEventListener('click', () => pick({ weather: after(WEATHER[now.season], now.weather) }));
  timeButton.addEventListener('click', () => change({ time: after(TIMES, now.time) }));
  moonButton.addEventListener('click', () => change({ moon: after(MOONS, now.moon) }));
  auroraButton.addEventListener('click', () => change({ aurora: after(AURORAS, now.aurora) }));
  starsButton.addEventListener('click', () => change({ stars: after(STAR_SKIES, now.stars) }));
  gaugeButton.addEventListener('click', () => change({ gauge: after(RIVERS, now.gauge) }));
  holeButton.addEventListener('click', () => change({ hole: after(HOLES, now.hole) }));
  eaterButton.addEventListener('click', () => change({ eater: after(EATERS, now.eater) }));
  squatchButton.addEventListener('click', () => {
    spawns.squatches.push(seconds());
    stale = true;
  });
  fishButton.addEventListener('click', () => {
    spawns.fishes.push({ t: seconds(), seed: Math.floor(Math.random() * 10_000) });
    stale = true;
  });
  trainButton.addEventListener('click', () => {
    spawns.trains.push(seconds());
    stale = true;
  });
  buttons.forEach((button, i) => {
    for (const on of ['pointerenter', 'focus']) button.addEventListener(on, () => light(i));
    for (const off of ['pointerleave', 'blur']) button.addEventListener(off, () => light(-1));
  });
  almanac.hidden = false;
  corner.hidden = true;
  describe();
  setInterval(describe, 30_000);
}

for (const item of plaque.querySelectorAll('li:has(a)')) {
  const link = item.querySelector('a').cloneNode();
  link.setAttribute('aria-label', item.textContent.trim());
  link.append(item.querySelector('img').cloneNode());
  rail.append(link);
}
foldButton.addEventListener('click', () => fold(true));
unfoldButton.addEventListener('click', () => fold(false));
foldButton.hidden = false;
rail.hidden = false;

canvas.addEventListener('click', poke);
canvas.addEventListener('pointermove', (event) => {
  gaze = scenePoint(event);
  stale = true;
});
canvas.addEventListener('pointerleave', () => (gaze = null));
addEventListener('resize', () => (stale = true));
requestAnimationFrame(paint);

liveWeather().then((weather) => {
  if (!weather || sky !== 'plain') return;
  sky = 'live';
  change({ season: seasonFor(weather), weather });
});

liveKp().then((index) => {
  kp = index;
  if (debug) describe();
  stale = true;
});

liveRiverLevel().then((level) => {
  riverLevel = level;
  if (debug) describe();
  stale = true;
});

function paint(time) {
  requestAnimationFrame(paint);
  const due = time - lastFrame >= FRAME_MS;
  if (!due || (still && !stale)) return;
  const elapsed = Math.min(0.5, (time - lastFrame) / 1000);
  lastFrame = time;
  stale = false;

  fitScene();
  if (planted !== now.season) {
    scene.build(now.season);
    planted = now.season;
  }
  scene.draw(image.data, seconds(), {
    hour: hour(),
    sidereal: siderealAngle(now.time === 'auto' ? new Date() : instantAtSceneHour(HOUR_OF[now.time])),
    starLimit: STAR_LIMIT_OF[now.stars],
    river: RIVER_OF[now.gauge] ?? (riverLevel === null ? 0 : riverStage(riverLevel)),
    weather: now.weather,
    moon: moon(),
    aurora: AURORA_OF[now.aurora] ?? null,
    geomagnetic: kp === null ? 0 : auroraStrength(kp),
    blackHole: now.hole === 'black hole on',
    sunEater: now.eater === 'sun eater on',
    eclipse: eclipseAt(),
    strain: strainAfter(elapsed),
    pokes,
    spawns,
  });
  context.putImageData(image, 0, 0);
  if (debug) paintInstruments();
}

function paintInstruments() {
  dialImage.data.fill(0);
  drawInstruments(dialImage.data, dials.width, places, now, lit);
  dialContext.putImageData(dialImage, 0, 0);
}

function fitScene() {
  const view = `${innerWidth}x${innerHeight}@${devicePixelRatio}`;
  if (view === fitted) return;
  fitted = view;
  // Round each scene pixel to a whole number of physical device pixels so fractional DPI scaling (1.25x, 1.5x)
  // never interpolates across pixel edges. Rounding the canvas count up overhangs the viewport slightly instead of stretching.
  const block = Math.max(1, Math.round(PIXEL * devicePixelRatio));
  const width = Math.ceil((innerWidth * devicePixelRatio) / block);
  const height = Math.ceil((innerHeight * devicePixelRatio) / block);
  canvas.style.width = `${(width * block) / devicePixelRatio}px`;
  canvas.style.height = `${(height * block) / devicePixelRatio}px`;
  alignRail();
  if (debug) fitInstruments(block);
  if (width === canvas.width && height === canvas.height && scene) return;

  canvas.width = width;
  canvas.height = height;
  image = context.createImageData(width, height);
  scene = createScene(width, height);
  planted = null;
}

// The instruments get their own canvas so phones can draw them at half the scene's pixel size, still in whole device pixels.
function fitInstruments(sceneBlock) {
  const block = phone.matches ? Math.max(1, Math.round(sceneBlock / 2)) : sceneBlock;
  const css = (pixels) => `${(pixels * block) / devicePixelRatio}px`;
  dials.width = Math.floor((innerWidth * devicePixelRatio) / block);
  dials.height = Math.floor((innerHeight * devicePixelRatio) / block);
  Object.assign(dials.style, { width: css(dials.width), height: css(dials.height) });
  dialImage = dialContext.createImageData(dials.width, dials.height);
  places = placeInstruments(dials.width, dials.height);
  buttons.forEach((button, i) =>
    Object.assign(button.style, { left: css(places[i].x), top: css(places[i].y), width: css(TILE), height: css(TILE) }),
  );
}

function light(instrument) {
  lit = instrument;
  stale = true;
}

function pick(patch) {
  sky = 'picked';
  change(patch);
}

function change(patch) {
  Object.assign(now, patch);
  if (scene && !still) scene.snap();
  if (debug) describe();
  stale = true;
}

function describe() {
  seasonButton.dataset.name = now.season;
  weatherButton.dataset.name = now.weather;
  timeButton.dataset.name = now.time === 'auto' ? `auto ${princeAlbertTime()}` : now.time;
  moonButton.dataset.name = now.moon;
  auroraButton.dataset.name = now.aurora === 'aurora auto' ? `aurora auto ${kp === null ? 'no kp' : `kp ${kp.toFixed(1)}`}` : now.aurora;
  starsButton.dataset.name = now.stars;
  gaugeButton.dataset.name = now.gauge === 'river auto' ? `river auto ${riverLevel === null ? 'no gauge' : `${riverLevel.toFixed(2)} m`}` : now.gauge;
  holeButton.dataset.name = now.hole;
  eaterButton.dataset.name = now.eater;
  squatchButton.dataset.name = now.squatch;
  fishButton.dataset.name = now.fish;
  trainButton.dataset.name = now.train;
  for (const button of buttons) button.setAttribute('aria-label', `${button.id}: ${button.dataset.name}`);
  stale = true;
}

function fold(folded) {
  if (folded) alignRail();
  plaque.classList.toggle('folded', folded);
  rail.classList.toggle('here', folded);
  (folded ? unfoldButton : foldButton).focus({ preventScroll: true });
}

// Aligns the rail's top edge with the plaque's top edge so both top-rim chips (`>` and `<`) sit at the same height.
function alignRail() {
  const maxTop = Math.max(20, innerHeight - rail.offsetHeight - 12);
  rail.style.top = `${Math.round(Math.max(20, Math.min(maxTop, plaque.offsetTop)))}px`;
}

// If the live weather does not exist in the current calendar season's table (e.g., sun dogs in November),
// step to the nearest season that supports it, checking the previous season (-1) before the next (+1).
function seasonFor(weather) {
  const calendar = SEASONS.indexOf(now.season);
  const nearest = [0, -1, 1, 2].map((step) => SEASONS[(calendar + step + SEASONS.length) % SEASONS.length]);
  return nearest.find((season) => WEATHER[season].includes(weather)) ?? now.season;
}

function poke(event) {
  pokes = [...pokes.slice(-5), { ...scenePoint(event), t: seconds() }];
}

function scenePoint(event) {
  const box = canvas.getBoundingClientRect();
  return { x: ((event.clientX - box.left) / box.width) * canvas.width, y: ((event.clientY - box.top) / box.height) * canvas.height };
}

// Resting the pointer on the Sun Eater is looking at it with the Sight: after two seconds the strain builds over four
// more, and it takes fifteen to fade once you look away.
function strainAfter(seconds) {
  stare = gaze && scene.gazing(gaze.x, gaze.y) ? stare + seconds : 0;
  strain = stare > 2 ? Math.min(1, strain + seconds / 4) : Math.max(0, strain - seconds / 15);
  return strain;
}

function hour() {
  return now.time === 'auto' ? sceneHour() : HOUR_OF[now.time];
}

function moon() {
  return now.moon === 'auto' ? moonPhase() : MOON_OF[now.moon];
}

function princeAlbertTime() {
  return new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Regina', hour: '2-digit', minute: '2-digit', hour12: false });
}

function seconds() {
  return (performance.now() - began) / 1000;
}

function after(all, current) {
  return all[(all.indexOf(current) + 1) % all.length];
}
