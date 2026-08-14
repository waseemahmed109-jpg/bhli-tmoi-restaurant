#!/usr/bin/env node
// split-html.js
// Splits public/index.html into:
//   src/index.html  — structure only (with <link> and <script> references)
//   src/styles.css  — all inline <style> blocks concatenated
//   src/app.js      — all inline <script> blocks (no src attr) concatenated
//
// The build step (generate-html.js) reassembles them back.
// Running split-html.js again after changes to public/index.html refreshes src/.

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

// ─── 1. Extract all inline <style> blocks ────────────────────────────────────
const cssChunks = [];
// Use a replacer so we extract in-order and can reconstruct the skeleton cleanly
const skeletonAfterCss = html.replace(/<style(?:[^>]*)>([\s\S]*?)<\/style>/g, (match, content) => {
  cssChunks.push(content.trim());
  return '<!-- @@STYLE_PLACEHOLDER@@ -->'; // temporary marker
});

const cssContent = cssChunks.join('\n\n/* ─────────────────────────────────────────────── */\n\n');
fs.writeFileSync(path.join(srcDir, 'styles.css'), cssContent, 'utf8');
console.log(`✅ Extracted ${cssChunks.length} <style> block(s) → src/styles.css`);

// ─── 2. Extract all inline <script> blocks (no src attribute) ────────────────
const jsChunks = [];
const skeletonAfterJs = skeletonAfterCss.replace(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/g, (match, content) => {
  const trimmed = content.trim();
  if (trimmed) jsChunks.push(trimmed);
  return '<!-- @@SCRIPT_PLACEHOLDER@@ -->'; // temporary marker
});

const jsContent = jsChunks.join('\n\n/* ═══════════════════════════════════════════════ */\n\n');
fs.writeFileSync(path.join(srcDir, 'app.js'), jsContent, 'utf8');
console.log(`✅ Extracted ${jsChunks.length} <script> block(s) → src/app.js`);

// ─── 3. Build index.html skeleton ────────────────────────────────────────────
let skeleton = skeletonAfterJs;

// Replace ALL style placeholders with a single <link> tag before </head>
// (remove individual placeholders first, then insert one link before </head>)
skeleton = skeleton.replace(/\n?[ \t]*<!-- @@STYLE_PLACEHOLDER@@ -->\n?/g, '\n');
skeleton = skeleton.replace('</head>', '  <link rel="stylesheet" href="styles.css">\n</head>');

// Replace ALL script placeholders with nothing (remove them),
// then insert one <script src="app.js"> before </body>
skeleton = skeleton.replace(/\n?[ \t]*<!-- @@SCRIPT_PLACEHOLDER@@ -->\n?/g, '\n');
skeleton = skeleton.replace('</body>', '  <script src="app.js"></script>\n</body>');

// Collapse runs of 3+ blank lines down to 2
skeleton = skeleton.replace(/\n{3,}/g, '\n\n');

fs.writeFileSync(path.join(srcDir, 'index.html'), skeleton.trim() + '\n', 'utf8');
console.log('✅ Built skeleton → src/index.html');

// ─── 4. Summary ──────────────────────────────────────────────────────────────
console.log('');
console.log('Source file sizes:');
console.log(`  src/index.html : ${(fs.statSync(path.join(srcDir, 'index.html')).size / 1024).toFixed(1)} KB`);
console.log(`  src/styles.css : ${(fs.statSync(path.join(srcDir, 'styles.css')).size / 1024).toFixed(1)} KB`);
console.log(`  src/app.js     : ${(fs.statSync(path.join(srcDir, 'app.js')).size / 1024).toFixed(1)} KB`);
