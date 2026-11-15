// The three instruments in the corner of the scene: season, weather and time, drawn in the scene's own pixels.

export const TILE = 12;
const GAP = 2;
const MARGIN = 3;

const PLATE = [27, 22, 55];
const RIM = [112, 96, 160];
const RIM_LIT = [63, 212, 154];
const INK = {
  W: [244, 236, 216],
  Y: [242, 194, 48],
  O: [224, 138, 44],
  R: [208, 96, 104],
  G: [86, 180, 98],
  g: [44, 122, 70],
  M: [143, 224, 168],
  B: [106, 168, 232],
  C: [216, 211, 234],
  c: [143, 136, 173],
  L: [185, 168, 221],
  I: [168, 228, 240],
  T: [150, 112, 84],
};

const SPROUT = `
..........
.MM...MM..
MMMM.MMMM.
MMMMgMMMM.
.MMMgMMM..
....g.....
....g.....
....g.....
..TTTTT...`;
const LEAF = `
.......GG.
.....GGGG.
...GGGGgG.
..GGGGgGG.
.GGGGgGGG.
.GGGgGGG..
.GGgGGG...
.GgGGG....
.gGG......
g.........`;
const SNOWFLAKE = `
....WW....
.W..WW..W.
..W.WW.W..
...WWWW...
WWWWWWWWWW
WWWWWWWWWW
...WWWW...
..W.WW.W..
.W..WW..W.
....WW....`;

const CLEAR = `
..........
...WWWW...
..W....W..
.W......W.
.W......W.
.W......W.
.W......W.
..W....W..
...WWWW...`;
const CLOUD = `
...CCC....
..CCCCCC..
.CCCCCCCC.
CCCCCCCCCC
.cccccccc.`;
const SUN_PEEK = `
......Y.Y.
.......YYY
......YYYY`;
const DROPS = `
.B...B...B
B...B...B.
..........
..B...B...`;
const FLAKES = `
.W...W...W
..........
...W...W..
W........W`;
const STONES = `
II...II...
II...II...
..II....II
..II....II`;
const BOLT = `
....YY....
...YY.....
..YYYY....
....YY....
...Y......`;
const GLAZE = `
.I...I...I
I...I...I.
..........
WIIWIIWIIW`;
const BANKS = `
..........
.CCCCCCC..
..........
CCCCCCCCC.
..........
..CCCCCCCC
..........
CCCCCCC...`;
const POUCHES = `
..........
cccccccccc
CCCCCCCCCC
CCCCCCCCCC
CCcCCcCCcC
CC.CC.CC.C`;
const HAZE = `
..........
.......RR.
.......RR.
..........
cc...cc...
..ccc..ccc
..........
.cc...cc..
c..ccc..cc`;
const NIGHT_SHINE = `
..........
W......W..
..........
.II...II..
I..III..II
..........
II...II...
..III..III
..........
...W......`;
const FUNNEL = `
..........
cccccccccc
cccccccccc
.cccccccc.
..cccccc..
...cccc...
...ccc....
....cc....
....c.....`;
const WHITEOUT = `
W..W..W..W
..W..W..W.
.W..W..W..
W..W..W..W
..W..W..W.
.W..W..W..
W..W..W..W
..W..W..W.
.W..W..W..
W..W..W..W`;
const SUN_DOGS = `
..........
..W....W..
.W......W.
....YY....
O..YYYY..O
O..YYYY..O
....YY....
.W......W.
..W....W..`;
const RIMED_TWIG = `
........W.
W......WT.
TW..W.WT..
.TW.TWT...
..TWTT....
...TT.....
W..T......
TTTT......
...T......
...T......`;
const LIGHT_PILLAR = `
....WW....
....WW....
....YY....
....YY....
....OO....
..........
IIIIIIII..
..........
..IIIIIIII`;

const CLOCK = `
...WWWW...
.WW....WW.
.W..Y...W.
W...Y....W
W...YYY..W
W........W
W........W
.W......W.
.WW....WW.
...WWWW...`;
const SUNRISE = `
..........
....Y.....
.Y.....Y..
..........
...YYYY...
Y.YYYYYY.Y
.YYYYYYYY.
LLLLLLLLLL`;
const SUN = `
....YY....
.Y......Y.
...YYYY...
..YYYYYY..
Y.YYYYYY.Y
Y.YYYYYY.Y
..YYYYYY..
...YYYY...
.Y......Y.
....YY....`;
const SUNSET = `
..........
W.........
.......W..
..........
..........
....RR....
..RRRRRR..
LLLLLLLLLL
.R.RRRR.R.
...R..R...`;
const MOON = `
.....WWW..
...WWW....
..WWW.....
..WW....W.
.WWW......
.WWW......
..WW......
..WWW...W.
...WWW....
.....WWW..`;

const below = (rows, down) => '\n'.repeat(down) + rows;
const recoloured = (rows, swaps) => rows.replace(/[A-Za-z]/g, (ink) => swaps[ink] ?? ink);
const STORM_CLOUD = recoloured(CLOUD, { C: 'c' });

const GLYPHS = {
  season: {
    spring: [SPROUT],
    summer: [LEAF],
    autumn: [recoloured(LEAF, { G: 'O', g: 'R' })],
    winter: [SNOWFLAKE],
  },
  weather: {
    clear: [CLEAR],
    cloudy: [below(CLOUD, 3)],
    rain: [CLOUD, below(DROPS, 6)],
    'sun shower': [SUN_PEEK, below(CLOUD, 1), below(DROPS, 6)],
    thunderstorm: [STORM_CLOUD, below(BOLT, 5)],
    hail: [STORM_CLOUD, below(STONES, 6)],
    'funnel cloud': [FUNNEL],
    mammatus: [POUCHES],
    smoke: [HAZE],
    fog: [BANKS],
    noctilucent: [NIGHT_SHINE],
    snow: [CLOUD, below(FLAKES, 6)],
    whiteout: [WHITEOUT],
    'freezing rain': [CLOUD, below(GLAZE, 6)],
    hoarfrost: [RIMED_TWIG],
    'sun dogs': [SUN_DOGS],
    'ice fog': [LIGHT_PILLAR],
  },
  time: {
    auto: [CLOCK],
    dawn: [SUNRISE],
    day: [SUN],
    dusk: [SUNSET],
    night: [MOON],
  },
};

export const INSTRUMENTS = Object.keys(GLYPHS);

// Where each tile sits, in scene pixels, given how much of the scene the window shows.
export function placeInstruments(columns, rows) {
  const top = rows - MARGIN - TILE;
  return INSTRUMENTS.map((_, i) => ({ x: columns - MARGIN - TILE - (INSTRUMENTS.length - 1 - i) * (TILE + GAP), y: top }));
}

export function drawInstruments(pixels, width, places, now, lit) {
  INSTRUMENTS.forEach((name, i) => {
    const paint = painter(pixels, width, places[i]);
    drawTile(paint, i === lit ? RIM_LIT : RIM);
    for (const layer of GLYPHS[name][now[name]]) drawLayer(paint, layer);
  });
}

function drawTile(paint, rim) {
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) paint(x, y, x === 0 || y === 0 || x === TILE - 1 || y === TILE - 1 ? rim : PLATE);
}

function drawLayer(paint, layer) {
  layer
    .slice(1)
    .split('\n')
    .forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] !== '.') paint(x + 1, y + 1, INK[row[x]]);
    });
}

function painter(pixels, width, { x: left, y: top }) {
  return (x, y, [red, green, blue]) => {
    const at = ((top + y) * width + left + x) * 4;
    pixels[at] = red;
    pixels[at + 1] = green;
    pixels[at + 2] = blue;
    pixels[at + 3] = 255;
  };
}
