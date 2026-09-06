import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Preserve the existing eight-tile composition at twice its CSS display width.
const tiles = [[6,394],[7,360],[1,336],[11,624],[3,624],[4,394],[5,280],[2,336]];
let before = 0;
let after = 0;
for (const [id, width] of tiles) {
  const input = new URL(`../public/landing/${id}.png`, import.meta.url);
  const output = new URL(`../public/landing/${id}.webp`, import.meta.url);
  await sharp(fileURLToPath(input))
    .resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(fileURLToPath(output));
  before += (await stat(input)).size;
  after += (await stat(output)).size;
}
console.log(JSON.stringify({ before, after, reductionPercent: Math.round((1-after/before)*100) }));
