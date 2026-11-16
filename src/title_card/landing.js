import { moonPhase, sceneHour } from './almanac.js';
import { liveWeather } from './forecast.js';
import { drawInstruments, INSTRUMENTS, placeInstruments, TILE } from './instruments.js';
import { createScene } from './scene.js';

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

const canvas = document.querySelector('#river');
const plaque = document.querySelector('.plaque');
const foldButton = document.querySelector('.fold');
const rail = document.querySelector('.rail');
const unfoldButton = document.querySelector('.unfold');
const corner = document.querySelector('.corner');
const almanac = document.querySelector('.almanac');
const buttons = INSTRUMENTS.map((name) => document.querySelector(`#${name}`));
const [seasonButton, weatherButton, timeButton, moonButton, squatchButton, fishButton, trainButton] = buttons;
const weatherCredit = document.querySelector('.weather-credit');
const context = canvas.getContext('2d');

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const debug = new URLSearchParams(location.search).has('debug');
const began = performance.now();
const now = {
  season: SEASON_OF_MONTH[new Date().getMonth()],
  weather: 'clear',
  time: 'auto',
  moon: 'auto',
  squatch: 'spawn squatch',
  fish: 'spawn fish',
  train: 'spawn train',
};

let scene, image, planted, places;
let fitted = '';
let lit = -1;
let pokes = [];
const spawns = { squatches: [], fishes: [], trains: [] };
let lastFrame = 0;
let stale = true;
let sky = 'plain';

if (debug) {
  seasonButton.addEventListener('click', () => pick({ season: after(SEASONS, now.season), weather: 'clear' }));
  weatherButton.addEventListener('click', () => pick({ weather: after(WEATHER[now.season], now.weather) }));
  timeButton.addEventListener('click', () => change({ time: after(TIMES, now.time) }));
  moonButton.addEventListener('click', () => change({ moon: after(MOONS, now.moon) }));
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

for (const item of plaque.querySelectorAll('li')) {
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
addEventListener('resize', () => (stale = true));
requestAnimationFrame(paint);

liveWeather().then((weather) => {
  if (!weather || sky !== 'plain') return;
  sky = 'live';
  change({ season: seasonFor(weather), weather });
});

function paint(time) {
  requestAnimationFrame(paint);
  const due = time - lastFrame >= FRAME_MS;
  if (!due || (still && !stale)) return;
  lastFrame = time;
  stale = false;

  fitScene();
  if (planted !== now.season) {
    scene.build(now.season);
    planted = now.season;
  }
  scene.draw(image.data, seconds(), { hour: hour(), weather: now.weather, moon: moon(), pokes, spawns });
  if (debug) drawInstruments(image.data, canvas.width, places, now, lit);
  context.putImageData(image, 0, 0);
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
  if (debug) placeButtons(block);
  if (width === canvas.width && height === canvas.height && scene) return;

  canvas.width = width;
  canvas.height = height;
  image = context.createImageData(width, height);
  scene = createScene(width, height);
  planted = null;
}

function placeButtons(block) {
  // Convert scene-pixel coordinates back into CSS pixels for the DOM button overlays.
  const css = (scenePixels) => `${(scenePixels * block) / devicePixelRatio}px`;
  places = placeInstruments(Math.floor((innerWidth * devicePixelRatio) / block), Math.floor((innerHeight * devicePixelRatio) / block));
  buttons.forEach((button, i) =>
    Object.assign(button.style, { left: css(places[i].x), top: css(places[i].y), width: css(TILE), height: css(TILE) }),
  );
  const weather = places[buttons.indexOf(weatherButton)];
  Object.assign(weatherCredit.style, { left: css(weather.x + TILE), top: css(weather.y) });
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
  weatherButton.dataset.name = weatherCredit.dataset.name = now.weather;
  almanac.classList.toggle('live', sky === 'live');
  timeButton.dataset.name = now.time === 'auto' ? `auto ${princeAlbertTime()}` : now.time;
  moonButton.dataset.name = now.moon;
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
  const box = canvas.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width) * canvas.width;
  const y = ((event.clientY - box.top) / box.height) * canvas.height;
  pokes = [...pokes.slice(-5), { x, y, t: seconds() }];
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
