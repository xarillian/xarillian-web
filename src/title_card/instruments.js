export const TILE = 12;
const GAP = 2;
const MARGIN = 2;

const PLATE = [27, 22, 55];
const RIM = [244, 236, 216];
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
const MOON_AUTO = `
.Y...WWW..
Y.Y.WW....
.Y.WW.....
..WW......
.WWW......
.WWW......
..WW......
..WWW.....
...WWW....
.....WWW..`;
const MOON_NEW = `
...cccc...
.cc....cc.
.c......c.
c........c
c........c
c........c
c........c
.c......c.
.cc....cc.
...cccc...`;
const MOON_CRESCENT = `
...cccW...
.cc...WW..
.c.....WW.
c.......WW
c.......WW
c.......WW
c.......WW
.c.....WW.
.cc...WW..
...cccW...`;
const MOON_QUARTER = `
...ccWW...
.cc..WWWW.
.c...WWWW.
c....WWWWW
c....WWWWW
c....WWWWW
c....WWWWW
.c...WWWW.
.cc..WWWW.
...ccWW...`;
const MOON_GIBBOUS = `
...cWWW...
.ccWWWWWW.
.cWWWWWWW.
c.WWWWWWWW
c.WWWWWWWW
c.WWWWWWWW
c.WWWWWWWW
.cWWWWWWW.
.ccWWWWWW.
...cWWW...`;
const MOON_FULL = `
...WWWW...
.WWWWWWWW.
.WWWWWWWW.
WWWWWWWWWW
WWWWWWWWWW
WWWWWWWWWW
WWWWWWWWWW
.WWWWWWWW.
.WWWWWWWW.
...WWWW...`;
const CURTAIN = `
L.L..L.L.L
L.L.LL.L.L
I.I.II.I.I
G.G.GG.G.G
G.GGGG.GGG
GGGGGGGGGG
MMM..MMMM.
...MM.....`;
const SPARK = `
.Y........
Y.Y.......
.Y........`;
const BLACK_HOLE = `
...OOOO...
..OYYYYO..
.OY....YO.
.Y......Y.
OY......YO
WWWWWWWWWW
.OYYYYYYO.
..O....O..
...OOOO...`;
const SUN_EATER = `
.......YY.
......YYYY
.......YY.
.....c..c.
.....cccc.
....CC....
...CC.....
..CC......
.CC.......
CC........`;
const SQUATCH = `
....TT....
...TTTT...
..TTTTTT..
.TTTTTTTT.
.TT.TT.TT.
.T..TT..T.
...TTTT...
..TT..TT..
..TT..TT..
.TT....TT.`;
const FISH = `
....GGGG..
..GGGGGGG.
.GGGGGGWGG
GGGGGGGGGG
.GGGGGGGG.
G.GGGG....
GG..GG....
G.........
..B...B...
B...B...B.`;
const TRAIN = `
..RRR.....
.RRRR.....
.RWW..RRR.
.RRRRRRRR.
.RRRRRRRRR
.RRRRRRRRY
.RRRRRRRR.
.cccccccc.
..cc..cc..
..........`;

const below = (rows, down) => '\n'.repeat(down) + rows;
const flipped = (rows) =>
  rows
    .split('\n')
    .map((row) => [...row].reverse().join(''))
    .join('\n');
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
    night: [flipped(MOON_CRESCENT)],
  },
  moon: {
    auto: [MOON_AUTO],
    new: [MOON_NEW],
    'waxing crescent': [MOON_CRESCENT],
    'first quarter': [MOON_QUARTER],
    'waxing gibbous': [MOON_GIBBOUS],
    full: [MOON_FULL],
    'waning gibbous': [flipped(MOON_GIBBOUS)],
    'third quarter': [flipped(MOON_QUARTER)],
    'waning crescent': [flipped(MOON_CRESCENT)],
  },
  aurora: {
    'aurora auto': [below(CURTAIN, 2), SPARK],
    'aurora off': [below(recoloured(CURTAIN, { L: 'c', I: 'c', G: 'c', M: 'c' }), 1)],
    'aurora faint': [below(recoloured(CURTAIN, { L: 'c', I: 'c', G: 'g', M: 'G' }), 1)],
    'aurora bright': [below(CURTAIN, 1)],
    'aurora storm': [below(recoloured(CURTAIN, { L: 'R', I: 'L', M: 'W' }), 1)],
  },
  hole: {
    'black hole off': [recoloured(BLACK_HOLE, { W: 'c', Y: 'c', O: 'c' })],
    'black hole on': [BLACK_HOLE],
  },
  eater: {
    'sun eater off': [recoloured(SUN_EATER, { Y: 'c', C: 'c' })],
    'sun eater on': [SUN_EATER],
  },
  squatch: {
    'spawn squatch': [SQUATCH],
  },
  fish: {
    'spawn fish': [FISH],
  },
  train: {
    'spawn train': [TRAIN],
  },
};

export const INSTRUMENTS = Object.keys(GLYPHS);

// Lines the 12x12 tiles up from the bottom-right corner, MARGIN pixels in. Tiles that don't fit across wrap onto rows
// above, so the last tiles hold the bottom row and the overflow stacks up from the first.
export function placeInstruments(columns, rows) {
  const across = Math.max(1, Math.floor((columns - 2 * MARGIN + GAP) / (TILE + GAP)));
  return INSTRUMENTS.map((_, i) => {
    const fromEnd = INSTRUMENTS.length - 1 - i;
    return {
      x: columns - MARGIN - TILE - (fromEnd % across) * (TILE + GAP),
      y: rows - MARGIN - TILE - Math.floor(fromEnd / across) * (TILE + GAP),
    };
  });
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
