import { moonPhase, sceneHour } from './almanac.js';
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
const TIMES = ['auto', 'dawn', 'day', 'dusk', 'night'];
const HOUR_OF = { dawn: 6.6, day: 13, dusk: 19, night: 23.5 };

const canvas = document.querySelector('#scene');
const card = document.querySelector('.card');
const cardClose = document.querySelector('.card-close');
const miniCard = document.querySelector('.mini-card');
const controls = document.querySelector('.controls');
const buttons = INSTRUMENTS.map((name) => document.querySelector(`#${name}`));
const [seasonButton, weatherButton, timeButton] = buttons;

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const began = performance.now();
const now = { season: SEASON_OF_MONTH[new Date().getMonth()], weather: 'clear', time: 'auto' };

let scene, context, image, planted, places;
let lit = -1;
let pokes = [];
let lastFrame = 0;
let stale = true;

seasonButton.addEventListener('click', () => change({ season: after(SEASONS, now.season), weather: 'clear' }));
weatherButton.addEventListener('click', () => change({ weather: after(WEATHER[now.season], now.weather) }));
timeButton.addEventListener('click', () => change({ time: after(TIMES, now.time) }));
cardClose.addEventListener('click', () => putCardAway(true));
miniCard.addEventListener('click', () => putCardAway(false));
canvas.addEventListener('click', poke);
buttons.forEach((button, i) => {
  for (const on of ['pointerenter', 'focus']) button.addEventListener(on, () => light(i));
  for (const off of ['pointerleave', 'blur']) button.addEventListener(off, () => light(-1));
});

controls.hidden = false;
cardClose.hidden = false;
describe();
setInterval(describe, 30_000);
requestAnimationFrame(paint);

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
  scene.draw(image.data, seconds(), { hour: hour(), weather: now.weather, moon: moonPhase(), pokes });
  drawInstruments(image.data, canvas.width, places, now, lit);
  context.putImageData(image, 0, 0);
}

function fitScene() {
  // A scene pixel is a whole number of screen pixels, so the canvas overhangs the window rather than stretch to fit it.
  const block = Math.max(1, Math.round(PIXEL * devicePixelRatio));
  const width = Math.ceil((innerWidth * devicePixelRatio) / block);
  const height = Math.ceil((innerHeight * devicePixelRatio) / block);
  canvas.style.width = `${(width * block) / devicePixelRatio}px`;
  canvas.style.height = `${(height * block) / devicePixelRatio}px`;
  placeButtons(block);
  if (width === canvas.width && height === canvas.height && scene) return;

  canvas.width = width;
  canvas.height = height;
  context = canvas.getContext('2d');
  image = context.createImageData(width, height);
  scene = createScene(width, height);
  planted = null;
}

function placeButtons(block) {
  const css = (scenePixels) => `${(scenePixels * block) / devicePixelRatio}px`;
  places = placeInstruments(Math.floor((innerWidth * devicePixelRatio) / block), Math.floor((innerHeight * devicePixelRatio) / block));
  buttons.forEach((button, i) =>
    Object.assign(button.style, { left: css(places[i].x), top: css(places[i].y), width: css(TILE), height: css(TILE) }),
  );
}

function light(instrument) {
  lit = instrument;
  stale = true;
}

function change(patch) {
  Object.assign(now, patch);
  if (scene && !still) scene.snap();
  describe();
}

function describe() {
  seasonButton.dataset.name = now.season;
  weatherButton.dataset.name = now.weather;
  timeButton.dataset.name = now.time === 'auto' ? `auto ${princeAlbertTime()}` : now.time;
  for (const button of buttons) button.setAttribute('aria-label', `${button.id}: ${button.dataset.name}`);
  document.documentElement.classList.toggle('night', hour() < 6 || hour() >= 20);
  stale = true;
}

function putCardAway(away) {
  card.classList.toggle('away', away);
  miniCard.hidden = !away;
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

function princeAlbertTime() {
  return new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Regina', hour: '2-digit', minute: '2-digit', hour12: false });
}

function seconds() {
  return (performance.now() - began) / 1000;
}

function after(all, current) {
  return all[(all.indexOf(current) + 1) % all.length];
}
