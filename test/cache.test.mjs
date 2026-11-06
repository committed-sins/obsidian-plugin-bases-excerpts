import test from 'node:test';
import assert from 'node:assert/strict';
import { ExcerptCache } from '../src/cache.mjs';
const deferred = () => { let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}; };

test('memoizes file/heading results and shares concurrent reads', async () => {
  let calls=0, notifications=0; const file={path:'Note.md'};
  const cache=new ExcerptCache(async()=>{calls++;return '## About\nValue\n## Other\nOther value';},()=>notifications++);
  assert.equal(cache.get(file,'## About'),'');
  await Promise.all([cache.load(file,'## About'),cache.load(file,'## About')]);
  assert.equal(calls,1);assert.equal(notifications,1);assert.equal(cache.get(file,'## About'),'Value');
  assert.equal(await cache.load(file,'## Other'),'Other value'); assert.equal(calls,2);
});
test('modification invalidates cached values and empty sections are cached too', async () => {
  let text='## About\nOld';const file={path:'Note.md'};
  const cache=new ExcerptCache(async()=>text,()=>{});
  await cache.load(file,'## About');text='## About\nNew';
  assert.deepEqual(cache.invalidate(file.path),['## About']);
  assert.equal(await cache.load(file,'## About'),'New');
  text='## About\n';cache.invalidate(file.path);await cache.load(file,'## About');
  assert.equal(cache.get(file,'## About'),'');assert.equal(cache.entries.get(file.path).get('## About').ready,true);
});
test('late reads cannot resurrect invalidated, deleted, renamed, or unloaded entries', async () => {
  for (const action of ['invalidate','rename','dispose']) {
    const read=deferred();let notified=0;const file={path:'Old.md'};
    const cache=new ExcerptCache(()=>read.promise,()=>notified++);
    const pending=cache.load(file,'## About');
    if(action==='dispose')cache.dispose();else cache.invalidate(file.path);
    if(action==='rename')file.path='New.md';
    read.resolve('## About\nStale'); assert.equal(await pending,'');assert.equal(notified,0,action);
    assert.equal(cache.entries.size,0,action);
  }
});
test('can retry a transient read failure', async () => {
  let calls=0;const file={path:'Note.md'};
  const cache=new ExcerptCache(async()=>{if(calls++===0)throw Error('temporary');return '## About\nRecovered';},()=>{});
  await assert.rejects(cache.load(file,'## About'),/temporary/);
  assert.equal(await cache.load(file,'## About'),'Recovered');
});
