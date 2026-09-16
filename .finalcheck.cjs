const fs = require('fs');
const s = fs.readFileSync('site/index.html', 'utf8');
const m = s.match(/<style>([\s\S]*?)<\/style>/);
if (!m) { console.log('FAIL: no style block'); process.exit(1); }
const css = m[1];
const open = (css.match(/{/g)||[]).length;
const close = (css.match(/}/g)||[]).length;
console.log('CSS braces: { =', open, ' } =', close, open === close ? 'BALANCED' : 'IMBALANCED');
const mq768 = (css.match(/@media \(max-width: 768px\)/g)||[]).length;
const mq480 = (css.match(/@media \(max-width: 480px\)/g)||[]).length;
console.log('media 768px blocks:', mq768, '| 480px blocks:', mq480);
console.log('has .nav-links.open:', css.includes('.nav-links.open'));
console.log('has .nav-toggle[aria-expanded]:', css.includes('.nav-toggle[aria-expanded'));
if (open !== close) process.exit(1);
