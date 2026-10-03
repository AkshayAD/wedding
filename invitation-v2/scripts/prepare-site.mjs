import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Vite builds the existing invitation; the personal homepage is the public entry.
copyFileSync('public/index.html', 'dist/index.html');
for (const route of ['Salem', 'salem']) {
  mkdirSync(`dist/${route}`, { recursive: true });
  for (const file of ['index.html', 'styles.css', 'app.js', 'config.js', 'game-core.js', 'game-engine.js', 'store.js']) {
    copyFileSync(`../Salem/site/${file}`, `dist/${route}/${file}`);
  }
}
copyFileSync('../CNAME', 'dist/CNAME');
const commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
writeFileSync('dist/release.json', JSON.stringify({ commit }) + '\n');
