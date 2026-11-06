import test from 'node:test';
import assert from 'node:assert/strict';
import { withoutEmbeds, referenceDefinitions } from '../src/markdown.mjs';

test('turns embeds and images into links without changing other Markdown', () => {
  assert.equal(withoutEmbeds('**Bold** ![[Folder/Note#Heading|Alias]] ![alt](./image.png) [link](./Note.md)'), '**Bold** [[Folder/Note#Heading|Alias]] [alt](./image.png) [link](./Note.md)');
  assert.equal(withoutEmbeds('![alt][image]'), '[alt][image]');
});
test('preserves embeds inside code and escaped literals', () => {
  const source='`![[literal]]` ``![code](x)`` \\![[escaped]]';assert.equal(withoutEmbeds(source),source);
  assert.equal(withoutEmbeds('` unmatched ![[actual]]'),'` unmatched [[actual]]');
});
test('raw media HTML is displayed literally', () => {
  assert.equal(withoutEmbeds('<img src="x"> <video>'), '&lt;img src="x"> &lt;video>');
});
test('reference-style links reuse source-note metadata without rereading its body', () => {
  assert.equal(referenceDefinitions({referenceLinks:[{id:'Local note',link:'./Note.md'},{id:'Web',link:'https://example.com/'}]}),'[Local note]: <./Note.md>\n[Web]: <https://example.com/>');
  assert.equal(referenceDefinitions(null),'');
});
