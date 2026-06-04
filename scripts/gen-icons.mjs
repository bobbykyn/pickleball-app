// Generates all Pickle Kitchen app icons from the stacked wordmark.
// Text is converted to vector paths via opentype.js so no font is needed at
// raster time. Requires: opentype.js, sharp, and scripts/assets/Oswald-Bold.ttf
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp'
import opentype from 'opentype.js'
import { mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Brand palette
const NAVY = '#0D1B2A'
const CREAM = '#F2E7D6'
const CRIMSON = '#C0392B'

const SIZE = 1024
const fontBuf = readFileSync(join(root, 'scripts/assets/Oswald-Bold.ttf'))
const font = opentype.parse(fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength))
const upm = font.unitsPerEm
const capRatio = (font.tables.os2?.sCapHeight ? font.tables.os2.sCapHeight / upm : 0.72)

// Fit the widest line (KITCHEN) to ~80% of the canvas, slightly tightened.
const TRACK = -0.01 // letter-spacing as a fraction of fontSize
const advance = (text, fs) => font.getAdvanceWidth(text, fs) + TRACK * fs * (text.length - 1)
const targetW = SIZE * 0.80
const fontSize = (targetW / advance('KITCHEN', 1000)) * 1000

const cap = capRatio * fontSize
const lineGap = fontSize * 0.86         // baseline-to-baseline
const blockTop = (SIZE - (cap + lineGap)) / 2 + 36
const baseline1 = blockTop + cap
const baseline2 = baseline1 + lineGap

// Build a centered, tracked path string for a line of text.
function linePath(text, baseline) {
  let x = (SIZE - advance(text, fontSize)) / 2
  let d = ''
  for (const ch of text) {
    d += font.getPath(ch, x, baseline, fontSize).toPathData(2) + ' '
    x += font.getAdvanceWidth(ch, fontSize) + TRACK * fontSize
  }
  return d
}

const ruleW = SIZE * 0.20
const ruleY = blockTop - 70

const svg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" fill="${NAVY}"/>
  <rect x="${(SIZE - ruleW) / 2}" y="${ruleY}" width="${ruleW}" height="14" rx="3" fill="${CRIMSON}"/>
  <path d="${linePath('PICKLE', baseline1)}" fill="${CREAM}"/>
  <path d="${linePath('KITCHEN', baseline2)}" fill="${CREAM}"/>
</svg>`

const buf = Buffer.from(svg)

const targets = [
  { file: 'src/app/icon.png', size: 512 },
  { file: 'src/app/apple-icon.png', size: 180 },
  { file: 'public/icon-192.png', size: 192 },
  { file: 'public/icon-512.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
]

mkdirSync(join(root, 'src/app'), { recursive: true })
mkdirSync(join(root, 'public'), { recursive: true })

for (const { file, size } of targets) {
  await sharp(buf).resize(size, size).png().toFile(join(root, file))
  console.log(`✓ ${file} (${size}x${size})`)
}
console.log('Done.')
