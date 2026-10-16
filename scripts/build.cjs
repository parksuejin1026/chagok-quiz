const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const context = {window: {}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'core.js'), 'utf8'), context);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dataFiles = [...html.matchAll(/(?:src|href)="(data\/[^"?#]+\.js)"/g)].map(match => match[1]);
for (const file of dataFiles) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
const sets = context.QuizCore.validate(context.window.QUIZ_SETS);
const images = sets.flatMap(set => set.questions.flatMap(question => question.image ? [question.image.src] : []));
const files = [...new Set(['index.html', 'styles.css', 'app.js', 'core.js', 'quiz1.html', '.nojekyll', ...dataFiles, ...images])];
// Check every referenced asset before copying the public site.
for (const file of files) {
  if (!fs.statSync(path.join(root, file)).isFile()) throw Error('Missing public file: ' + file);
}
fs.mkdirSync(out, {recursive: true});
for (const file of files) {
  const target = path.join(out, file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, file), target);
}
console.log('Validated and built ' + sets.length + ' question set(s) and ' + images.length + ' image(s) to dist/');
