// Generates PNG icons from the leaf mark. Run: npm run icons
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const FOREST = "#19342d";
const IVORY = "#f4f0e7";
const OLIVE = "#a9b98a";

// Leaf glyph drawn in a 100x100 box.
const leaf = `
  <path d="M50 18 C72 28 78 52 62 70 C54 79 44 80 36 76 C26 60 30 34 50 18 Z" fill="${IVORY}"/>
  <path d="M50 24 C47 44 46 62 40 80" stroke="${FOREST}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M47 50 C54 46 59 42 62 36 M44 62 C52 58 58 54 62 48" stroke="${FOREST}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>
  <path d="M40 80 C38 84 34 87 30 88" stroke="${OLIVE}" stroke-width="3" fill="none" stroke-linecap="round"/>`;

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${FOREST}"/>${leaf}</svg>`;
// Maskable: full-bleed background, glyph scaled into the central safe zone (80%).
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${FOREST}"/><g transform="translate(15 15) scale(.7)">${leaf}</g></svg>`;

writeFileSync("public/icons/icon.svg", rounded);
const out = async (svg, file, size) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(`public/icons/${file}`);
await out(rounded, "icon-192.png", 192);
await out(rounded, "icon-512.png", 512);
await out(maskable, "maskable-512.png", 512);
await out(maskable, "apple-touch-icon.png", 180);
console.log("icons written");
