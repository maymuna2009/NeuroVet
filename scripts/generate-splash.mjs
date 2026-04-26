import { Jimp } from 'jimp';

const SIZE = 512;
const BG = 0x0a1628ff;
const TEAL = 0x7eb8a4ff;
const WHITE = 0xffffffff;

const image = new Jimp({ width: SIZE, height: SIZE, color: BG });

function drawRect(img, x, y, w, h, color) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
        img.setPixelColor(color, px, py);
      }
    }
  }
}

const cx = SIZE / 2;
const cy = SIZE / 2 - 40;
const r = 150;
const t = 14;

// Teal circle (brain outline)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (dist >= r - t && dist <= r + t) {
      image.setPixelColor(TEAL, x, y);
    }
    if (Math.abs(x - cx) <= t / 2 && y >= cy - r + t && y <= cy + r - t) {
      image.setPixelColor(TEAL, x, y);
    }
    if (Math.abs(y - cy) <= t / 2 && x >= cx - r + t && x <= cx + r - t) {
      image.setPixelColor(TEAL, x, y);
    }
  }
}

// "NV" centered below circle
const S = 10;
const LH = 120;
const LW = 90;
const LX = cx - 105;
const LY = cy + r + 20;

// N
drawRect(image, LX, LY, S, LH, WHITE);
for (let i = 0; i < LH; i++) {
  const x = Math.round(LX + (LW - S) * (i / LH));
  drawRect(image, x, LY + i, S, S, WHITE);
}
drawRect(image, LX + LW, LY, S, LH, WHITE);

// V
const VX = cx + 10;
for (let i = 0; i < LH; i++) {
  const x = Math.round(VX + (LW / 2 - S / 2) * (i / LH));
  drawRect(image, x, LY + i, S, S, WHITE);
}
for (let i = 0; i < LH; i++) {
  const x = Math.round(VX + LW - (LW / 2 - S / 2) * (i / LH));
  drawRect(image, x, LY + i, S, S, WHITE);
}

await image.write('assets/images/splash-icon.png');
console.log('✓ Splash icon generated: assets/images/splash-icon.png (512×512)');
