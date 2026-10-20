// Build the bundled Japanese font (spec 01 §3.16): Noto Sans JP (SIL OFL),
// cut down to the characters this game can actually print, so the page
// carries a few hundred KB instead of 5.7 MB per weight and looks the same on
// every machine. The character set is every character in the shipped
// sources (src/, index.html, updates.json) plus the kana, CJK punctuation and
// fullwidth blocks whole, so a player's own station name still mostly finds
// its glyphs; anything else falls through to the system font stack.
//
//   node _dev/subset-fonts.mjs <dir with NotoSansJP_400Regular.ttf and NotoSansJP_600SemiBold.ttf>
//
// The full TTFs come from Google Fonts (or the @expo-google-fonts/noto-sans-jp
// npm package) and are not committed. Needs pyftsubset (pip install fonttools
// brotli). Rerun after adding Japanese text, or new characters render in the
// system font instead.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: node _dev/subset-fonts.mjs <dir with the NotoSansJP TTFs>');
  process.exit(1);
}

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = [...walk(join(ROOT, 'src')).filter((p) => p.endsWith('.js')),
  join(ROOT, 'index.html'), join(ROOT, 'updates.json')];
const chars = new Set();
for (const f of files) for (const ch of readFileSync(f, 'utf8')) chars.add(ch);
const range = (a, b) => { for (let c = a; c <= b; c++) chars.add(String.fromCodePoint(c)); };
range(0x20, 0x7e);      // ASCII
range(0x3000, 0x303f);  // CJK symbols and punctuation
range(0x3041, 0x30ff);  // hiragana and katakana
range(0xff01, 0xff5e);  // fullwidth forms
for (const c of [...chars]) if (c.codePointAt(0) < 0x20) chars.delete(c);

const tmp = mkdtempSync(join(tmpdir(), 'metros-font-'));
const textFile = join(tmp, 'chars.txt');
writeFileSync(textFile, [...chars].join(''));
console.log(chars.size + ' characters');

for (const [ttf, out] of [
  ['NotoSansJP_400Regular.ttf', 'NotoSansJP-Regular.subset.woff2'],
  ['NotoSansJP_600SemiBold.ttf', 'NotoSansJP-SemiBold.subset.woff2'],
]) {
  const dest = join(ROOT, 'fonts', out);
  execFileSync('pyftsubset', [join(SRC, ttf), '--text-file=' + textFile, '--flavor=woff2',
    '--layout-features=*', '--output-file=' + dest]);
  console.log('fonts/' + out + ' ' + Math.round(statSync(dest).size / 1024) + ' KB');
}
