import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFirstLine, extractFromLines } from '../src/extract.mjs';

test('returns the first nonempty physical line unchanged as Markdown', () => {
  assert.equal(extractFirstLine('# Note\n## About\n\n **Bold** [[Target|link]] ![[Image]]\nLater'),'**Bold** [[Target|link]] ![[Image]]');
  assert.equal(extractFirstLine('## About\r\n\r\nLine\r\nNext'),'Line');
});
test('missing, empty, next heading and first repeated empty heading return an empty string', () => {
  for(const source of ['', 'Text','## About\n\n','## About\n### Child\nText','## About\n## Next\nText','## About\n## About\nText']) assert.equal(extractFirstLine(source),'',source);
});
test('configurable exact ATX heading level, title, and any-level shorthand', () => {
  const source='### About\nFirst\n## About\nSecond';
  assert.equal(extractFirstLine(source),'Second');
  assert.equal(extractFirstLine(source,'About'),'First');
  assert.equal(extractFirstLine(source,'## Other'),'');
  assert.equal(extractFirstLine(' ## About ###\nText'),'Text');
  assert.equal(extractFirstLine('## about\nText'),'');
  assert.equal(extractFirstLine('About\n-----\nText','About'),'');
});
test('ignores headings in YAML, fences, comments, and indented code', () => {
  for (const prefix of ['---\n## About\nwrong\n---\n','```md\n## About\nwrong\n```\n','~~~~\n## About\nwrong\n~~~\n~~~~\n','<!--\n## About\nwrong\n-->\n','%%\n## About\nwrong\n%%\n','    ## About\n']) assert.equal(extractFirstLine(prefix+'## About\nRight'),'Right',prefix);
});
test('stops consuming the input as soon as the content line is found', () => {
  function* input() { yield '## About'; yield ''; yield 'Found'; throw Error('Parser read past the result'); }
  assert.equal(extractFromLines(input()),'Found');
});
