import fs from 'node:fs';
const {version}=JSON.parse(fs.readFileSync('manifest.json','utf8'));
if (process.env.RELEASE_TAG !== version) throw Error('Release tag must exactly match manifest.version (no v prefix).');
