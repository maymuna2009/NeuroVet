import { Jimp } from 'jimp';

const SIZE = 1024;
const BG = 0x0a1628ff;      // dark navy
const TEAL = 0x7eb8a4ff;    // teal green

const image = new Jimp({ width: SIZE, height: SIZE, color: BG });

// Draw a simple brain-like circle outline (teal ring)
const cx = SIZE / 2;
const cy = SIZE / 2 - 80;
const r = 200;
const thickness = 18;

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (dist >= r - thickness && dist <= r + thickness) {
      image.setPixelColor(TEAL, x, y);
    }
    // Inner cross to suggest brain hemispheres
    if (
      Math.abs(x - cx) <= thickness / 2 &&
      y >= cy - r + thickness && y <= cy + r - thickness
    ) {
      image.setPixelColor(TEAL, x, y);
    }
    if (
      Math.abs(y - cy) <= thickness / 2 &&
      x >= cx - r + thickness && x <= cx + r - thickness
    ) {
      image.setPixelColor(TEAL, x, y);
    }
  }
}

// Draw "NV" text using thick pixel blocks
function drawRect(img, x, y, w, h, color) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
        img.setPixelColor(color, px, py);
      }
    }
  }
}

const WHITE = 0xffffffff;
const S = 16; // stroke width
const LX = SIZE / 2 - 140;
const LY = SIZE / 2 + 160;
const LH = 200;
const LW = 140;

// N — left vertical
drawRect(image, LX, LY, S, LH, WHITE);
// N — diagonal (approximated as steps)
for (let i = 0; i < LH; i++) {
  const x = Math.round(LX + (LW - S) * (i / LH));
  drawRect(image, x, LY + i, S, S, WHITE);
}
// N — right vertical
drawRect(image, LX + LW, LY, S, LH, WHITE);

const VX = SIZE / 2 + 20;
// V — left diagonal
for (let i = 0; i < LH; i++) {
  const x = Math.round(VX + (LW / 2 - S / 2) * (i / LH));
  drawRect(image, x, LY + i, S, S, WHITE);
}
// V — right diagonal
for (let i = 0; i < LH; i++) {
  const x = Math.round(VX + LW - (LW / 2 - S / 2) * (i / LH));
  drawRect(image, x, LY + i, S, S, WHITE);
}

await image.write('assets/images/icon.png');
console.log('✓ Icon generated: assets/images/icon.png (1024×1024)');
