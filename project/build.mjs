import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync, unlinkSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const read = path => readFileSync(new URL(path, import.meta.url));
const { version } = JSON.parse(read('package.json'));
const portable = '玄與九爺-網頁初稿.html';
const archive = '玄與九爺-初稿原始檔.zip';
const html = read('index.html').toString();
const css = read('styles.css').toString();
const motionCSS = read('motion/motion.css').toString();
const content = read('content.js').toString().replace(/^export /gm, '');
const app = read('app.js').toString();
assert.ok(html.includes(`content="${version}"`));
assert.ok(app.includes(`from './content.js?v=${version}'`));
const account = read('customer.js').toString().replace(/^export /gm, '');
const motion = read('motion/motion.mjs').toString().replace(/^export /gm, '');
const ziwei = read('ziwei.js').toString().replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const engine = read('vendor/iztro-v2.6.5.min.js').toString();
const script = (engine + '\n' + content + '\n' + account + '\n' + motion + '\n' + ziwei + '\n' + app.replace(/^import .*;\n/gm, '')).replace(/<\/script/gi, '<\\/script');
let publicHTML = html;
const publicCopy = [
  ['data-mode="local-test"', 'data-mode="public-preview"'],
  ["connect-src 'self'", "connect-src 'none'"],
  ['登入／我的資料', '使用說明'],
  ['只用虛構資料試排。資料只留本頁。', '只用虛構資料。資料只留本頁，關閉即清。']
];
for (const [from, to] of publicCopy) {
  assert.equal(publicHTML.split(from).length, 2, `public copy binding: ${from}`);
  publicHTML = publicHTML.replace(from, to);
}
const notices = read('vendor/THIRD_PARTY_NOTICES.txt').toString();
assert.ok(!notices.includes('-->'));
const inline = publicHTML
  .replace('<head>', () => `<head>\n<!-- Third-party licenses\n${notices}\n-->`)
  .replace('  <script defer src="vendor/iztro-v2.6.5.min.js"></script>\n', '')
  .replace(`<link rel="stylesheet" href="styles.css?v=${version}">`, () => `<style>${css}</style>`)
  .replace(`<link rel="stylesheet" href="motion/motion.css?v=${version}">`, () => `<style>${motionCSS}</style>`)
  .replace(`<script type="module" src="app.js?v=${version}"></script>`, () => `<script type="module">${script}</script>`)
  .replace(/assets\/[\w.-]+\.(png|jpg|webp|mp4)/g, (path, type) => `data:${type === 'mp4' ? 'video/mp4' : `image/${type === 'jpg' ? 'jpeg' : type}`};base64,${read(path).toString('base64')}`);
assert.doesNotMatch(inline, /(?:src|href)="(?:assets\/|styles\.css|app\.js|motion\/)|^import |^export /m);
writeFileSync(new URL(portable, import.meta.url), inline);

// The public host is static: this output cannot contact the private account service.
const publicRoot = new URL('public-preview/', import.meta.url);
mkdirSync(new URL('assets/', publicRoot), { recursive: true });

const publicMedia = ['office-entry-chair-v12.mp4', 'office-door-a4.jpg', 'office-desk-chair-v12.jpg', 'journey-reveal.mp4', 'journey-reveal.webp', 'arrival-loop-1080.mp4', 'arrival-loop-1080.webp'].map(name => `assets/${name}`);
const vendorFiles = ['iztro-v2.6.5.min.js', 'THIRD_PARTY_NOTICES.txt'];
const publicFiles = ['index.html', 'styles.css', 'app.js', 'content.js', 'customer.js', 'ziwei.js', 'motion/motion.mjs', 'motion/motion.css', ...publicMedia, ...vendorFiles.map(name => `vendor/${name}`)];
// Remove only our previous generated public files, never unknown files or source assets.
const previousManifest = JSON.parse(read('release-manifest.json'));
for (const name of Object.keys(previousManifest.sha256).filter(name => name.startsWith('public-preview/'))) {
  if (!publicFiles.includes(name.slice('public-preview/'.length)) && existsSync(new URL(name, import.meta.url))) unlinkSync(new URL(name, import.meta.url));
}
writeFileSync(new URL('index.html', publicRoot), publicHTML);
for (const name of publicFiles.filter(name => name !== 'index.html')) {
  mkdirSync(new URL('./', new URL(name, publicRoot)), { recursive: true });
  copyFileSync(new URL(name, import.meta.url), new URL(name, publicRoot));
}
const publicSizes = publicFiles.map(name => readFileSync(new URL(name, publicRoot)).length);
assert.ok(publicFiles.length <= 23 && publicSizes.reduce((a, b) => a + b, 0) <= 50_000_000);
assert.ok(publicFiles.every((name, i) => publicSizes[i] <= (name.endsWith('.mp4') ? 5_000_000 : 1_000_000)));
const actualPublicFiles = readdirSync(publicRoot, { recursive: true }).filter(name => !['assets', 'motion', 'vendor'].includes(name));
assert.deepEqual(actualPublicFiles.sort(), [...publicFiles].sort());

const sources = ['ui.test.mjs', 'journey.test.mjs', 'reading.test.mjs', 'ziwei.js', 'ziwei.test.mjs', 'motion/motion.mjs', 'motion/motion.css', 'motion/motion.test.mjs', 'motion/NOTICE.md', ...vendorFiles.map(name => `vendor/${name}`), 'index.html', 'styles.css', 'app.js', 'content.js', 'customer.js', 'manage.py', 'requirements.txt', 'package.json', 'test.mjs', 'build.mjs', 'README.md', 'DESIGN_NOTES.md', 'image-prompt.txt', 'design-qa.md', 'test-results.txt', portable, ...publicFiles.map(name => `public-preview/${name}`)];
const assets = readdirSync(new URL('assets/', import.meta.url)).map(name => `assets/${name}`);
const evidence = readdirSync(new URL('evidence/office-v2/', import.meta.url)).map(name => `evidence/office-v2/${name}`);
const regressionEvidence = ['identity-before.json', 'baseline-runtime.json', 'red-tests.txt', 'product.patch', 'runtime-results.json', 'regression-qa.md', 'tested-source.sha256', 'tested-delivery.sha256', 'http-source-sha256.json'].map(name => `evidence/r1-r2-v022/${name}`);
const backendFiles = readdirSync(new URL('customer/', import.meta.url), { recursive: true }).filter(path => path.endsWith('.py') && !path.includes('__pycache__')).map(path => `customer/${path}`);
const customerEvidence = ['identity-before.json', 'implementation-scope.txt', 'tested-source.sha256', 'tested-delivery.sha256', 'node-tests.txt', 'backend-tests.txt', 'live-api-check.py', 'live-api-results.json', 'browser-results.json', 'mobile-required-birth.png', '實作與測試報告.md', 'product.patch'].map(name => `evidence/customer-v030/${name}`);
const publicEvidence = ['identity-before.json', 'node-tests.txt', 'backend-tests.txt', 'local-browser-results.json', 'public-package.json', 'remote-hashes.json', 'published-results.json', '發布驗證.md', 'public-desktop-home.png', 'public-mobile-birth.png'].map(name => `evidence/public-v031/${name}`);
const files = [...sources, ...assets, ...evidence, ...regressionEvidence, ...backendFiles, ...customerEvidence, ...publicEvidence];
const sha256 = Object.fromEntries(files.map(path => [path, createHash('sha256').update(read(path)).digest('hex')]));
writeFileSync(new URL('release-manifest.json', import.meta.url), JSON.stringify({ version, scope: `v${version}: shared uncropped portrait stage, 1080p looping home and continuous A4 entrance with stabilized chair, no playback overlays, same-frame accessible desk responses and five topic-led free chart openings on the existing static preview; text exit at the desk after motion, native versus opposite stars labelled separately, five topic-specific readings of everyday behaviour with in-page explanations and no external reference links; homepage without the old optional story shelf; free career, love, family, money and direction comics with six illustrated panels, a chosen alias, fictional birth details, an optional free-text question, answer-first topic-specific dialogue with locally resolved topic choices, and a personalized twelve-house dial transitioning automatically to the reading; no persistence, backend or real data; legacy account storage not released`, sha256 }, null, 2) + '\n');
const staged = `${archive}.${process.pid}.zip`;
try {
  execFileSync('python3', ['-c', `
import sys, zipfile
from pathlib import Path
archive, *files = sys.argv[1:]
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for name in files: z.write(name, name)
with zipfile.ZipFile(archive) as z:
    assert sorted(z.namelist()) == sorted(files)
    for name in files: assert z.read(name) == Path(name).read_bytes(), name
`, staged, ...files, 'release-manifest.json'], { cwd: root });
  renameSync(new URL(staged, import.meta.url), new URL(archive, import.meta.url));
} finally {
  if (existsSync(new URL(staged, import.meta.url))) unlinkSync(new URL(staged, import.meta.url));
}
console.log(`Built ${version}: portable HTML + source ZIP + static public-preview (${publicFiles.length} files, ${publicSizes.reduce((a, b) => a + b, 0)} bytes); ${files.length} file hashes; archive contents verified.`);
