const PHOTO = '/images/austin.webp';
// The part of the 400px photo that holds the man and the cat, as [x, y, width, height].
const MAN_AND_CAT = [30, 45, 370, 307];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// A five-step ramp from near-black to paper through the site's dusk purples and lilac.
const INKS = ['#120e26', '#2e2560', '#5b4a9e', '#b9a8dd', '#f4ecd8'].map(rgb);
const DUSK = rgb('#1b1637');
// The photo is dark, so its tones are stretched: this luminance and below is the darkest ink, SHADOW + RANGE and above the lightest.
const SHADOW = 0.1;
const RANGE = 0.62;
const FADE_FROM = 0.9;

const canvas = document.querySelector('.preview canvas');
paintDitheredPortrait(await loadPhoto());

async function loadPhoto() {
  const photo = new Image();
  photo.src = PHOTO;
  await photo.decode();
  return photo;
}

// Redraws the photo in five inks with the scene's Bayer stipple, dissolving into the background on the right.
function paintDitheredPortrait(photo) {
  const { width, height } = canvas;
  const context = canvas.getContext('2d');
  context.drawImage(photo, ...MAN_AND_CAT, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const threshold = BAYER[(y & 3) * 4 + (x & 3)] / 16;
      const faded = (x / width - FADE_FROM) / (1 - FADE_FROM) > threshold;
      const tone = clamp((luma(image.data, p) - SHADOW) / RANGE, 0, 1) * (INKS.length - 1);
      const ink = Math.min(INKS.length - 1, Math.floor(tone) + (tone % 1 > threshold ? 1 : 0));
      image.data.set(faded ? DUSK : INKS[ink], p);
    }
  context.putImageData(image, 0, 0);
}

function luma(data, p) {
  return (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function rgb(hex) {
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
}
