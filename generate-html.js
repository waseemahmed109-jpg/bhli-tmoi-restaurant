const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

let html;

if (fs.existsSync(path.join(srcDir, 'index.html'))) {
  // ── Assemble from src/ source files ──────────────────────────────
  let skeleton = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
  const css    = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf8');
  const js     = fs.readFileSync(path.join(srcDir, 'app.js'), 'utf8');

  // Inline the CSS: replace the <link rel="stylesheet" href="styles.css"> tag
  skeleton = skeleton.replace(
    '<link rel="stylesheet" href="styles.css">',
    `<style>\n${css}\n</style>`
  );

  // Inline the JS: replace the <script src="app.js"></script> tag
  skeleton = skeleton.replace(
    '<script src="app.js"></script>',
    `<script>\n${js}\n</script>`
  );

  html = skeleton;

  // Keep public/index.html in sync so the dev server can serve it too
  fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html, 'utf8');
  console.log('✅ Assembled public/index.html from src/');
} else {
  // Fallback: use existing public/index.html (first-run before split-html.js is run)
  html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  console.log('ℹ️  Using existing public/index.html (src/ not found)');
}

fs.writeFileSync('html.ts', `export const html = ${JSON.stringify(html)};`);
console.log('✅ Embedded into html.ts for server bundle');
