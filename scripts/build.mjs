import { build } from 'esbuild';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/main.mjs'], outfile: 'dist/main.js', bundle: true, external: ['obsidian'], platform: 'browser', format: 'cjs', target: 'es2022', sourcemap: false, banner: { js: '/* Built from source. See the repository for the MIT license. */' } });
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
// Repository/package names may include obsidian; a publishable plugin ID may not.
if (!/^[a-z-]+$/.test(manifest.id) || manifest.id.includes('obsidian') || manifest.id.endsWith('plugin')) throw Error('Plugin ID must follow the Obsidian manifest naming rules.');
const versions = JSON.parse(await readFile('versions.json', 'utf8'));
if (pkg.version !== manifest.version || versions[manifest.version] !== manifest.minAppVersion) throw Error('Version metadata is inconsistent.');
for (const file of ['manifest.json', 'styles.css']) await copyFile(file, 'dist/' + file);
console.log('Built ' + manifest.id + ' ' + manifest.version + ' in dist/');
