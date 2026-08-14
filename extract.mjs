import fs from 'fs';
import path from 'fs';

const html = fs.readFileSync('legacy_index.html', 'utf8');

// Create directories
fs.mkdirSync('public/images', { recursive: true });
fs.mkdirSync('public/fonts', { recursive: true });

// 1. Extract Logo
const logoMatch = html.match(/LOGO_DATA_URI = '(data:image\/[^;]+;base64,([^']+))'/);
if (logoMatch) {
  const base64Data = logoMatch[2];
  fs.writeFileSync('public/images/logo.jpg', Buffer.from(base64Data, 'base64'));
  console.log('Saved public/images/logo.jpg');
}

// 2. Extract Staff Photos
const imgMatches = [...html.matchAll(/<img[^>]+src="(data:image\/[^;]+;base64,([^"]+))"[^>]*>/g)];
let i = 1;
for (const match of imgMatches) {
  // try to find class name
  const classMatch = match[0].match(/class="[^"]*photo-([^" ]+)[^"]*"/);
  let name = classMatch ? classMatch[1] : `img_${i++}`;
  
  const base64Data = match[2];
  fs.writeFileSync(`public/images/${name}.jpg`, Buffer.from(base64Data, 'base64'));
  console.log(`Saved public/images/${name}.jpg`);
}

// 3. Extract Font
const fontMatch = html.match(/FONT_REGULAR_B64 = '(data:font\/[^;]+;charset=utf-8;base64,([^']+))'|FONT_REGULAR_B64 = '([^']+)'/);
if (fontMatch) {
  const base64Data = fontMatch[2] || fontMatch[3];
  fs.writeFileSync('public/fonts/IBMPlexMono.ttf', Buffer.from(base64Data, 'base64'));
  console.log('Saved public/fonts/IBMPlexMono.ttf');
}
