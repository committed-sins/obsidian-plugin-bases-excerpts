import fs from 'node:fs/promises';
import path from 'node:path';
const root = process.env.OBSIDIAN_VAULT;
if (!root) throw Error('Set OBSIDIAN_VAULT to the vault root. No target path is stored in this repository.');
const vault = await fs.realpath(path.resolve(root));
const configName = process.env.OBSIDIAN_CONFIG_DIR || '.obsidian';
if (path.isAbsolute(configName) || configName.split(/[\\/]/).some(part => part === '..')) throw Error('OBSIDIAN_CONFIG_DIR must be a relative directory within the vault.');
const config = await fs.realpath(path.join(vault, configName));
const within = (parent, child) => { const rel = path.relative(parent, child); return rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
if (!within(vault, config)) throw Error('The config directory resolves outside the selected vault.');
const manifest = JSON.parse(await fs.readFile('dist/manifest.json', 'utf8'));
if (!/^[a-z0-9-]+$/.test(manifest.id)) throw Error('Invalid plugin ID.');
const plugins = path.join(config, 'plugins');
await fs.mkdir(plugins, { recursive: true });
const pluginsReal = await fs.realpath(plugins);
if (!within(config, pluginsReal)) throw Error('The plugins directory resolves outside the selected config directory.');
const target = path.join(pluginsReal, manifest.id);
await fs.mkdir(target, { recursive: true });
const targetReal = await fs.realpath(target);
if (!within(pluginsReal, targetReal)) throw Error('The plugin directory resolves outside the plugins directory.');
const files = ['main.js', 'manifest.json', 'styles.css'];
for (const name of files) {
  // Refuse file symlinks as well as directory escapes. data.json is never touched.
  const destination = path.join(targetReal, name);
  try { if ((await fs.lstat(destination)).isSymbolicLink()) throw Error('Refusing symlink: ' + destination); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.copyFile(path.join('dist', name), destination);
}
console.log('Deployed ' + manifest.id + ' to ' + targetReal + '. Enable/reload it manually in Obsidian.');
