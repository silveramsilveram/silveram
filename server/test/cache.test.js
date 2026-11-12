import assert from 'node:assert/strict';
import test from 'node:test';
import { TtlCache } from '../src/cache.js';

test('returns a cached value until it expires', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const cache = new TtlCache({ ttlMs: 100 });
  cache.set('a', 1);
  assert.equal(cache.get('a'), 1);
  t.mock.timers.tick(99);
  assert.equal(cache.get('a'), 1);
  t.mock.timers.tick(2);
  assert.equal(cache.get('a'), undefined);
});

test('evicts the oldest entry when the size cap is exceeded', () => {
  const cache = new TtlCache({ ttlMs: 10_000, maxEntries: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
});

test('concurrent getOrLoad calls share one loader run', async () => {
  const cache = new TtlCache({ ttlMs: 10_000 });
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return 'value';
  };
  const results = await Promise.all([cache.getOrLoad('k', loader), cache.getOrLoad('k', loader), cache.getOrLoad('k', loader)]);
  assert.deepEqual(results, ['value', 'value', 'value']);
  assert.equal(calls, 1);
  assert.equal(await cache.getOrLoad('k', loader), 'value');
  assert.equal(calls, 1);
});

test('an undefined loader result is not cached, and a failure is not cached either', async () => {
  const cache = new TtlCache({ ttlMs: 10_000 });
  let calls = 0;
  assert.equal(await cache.getOrLoad('missing', async () => { calls += 1; return undefined; }), undefined);
  assert.equal(await cache.getOrLoad('missing', async () => { calls += 1; return 'now here'; }), 'now here');
  assert.equal(calls, 2);

  await assert.rejects(cache.getOrLoad('boom', async () => { throw new Error('down'); }), /down/);
  assert.equal(await cache.getOrLoad('boom', async () => 'recovered'), 'recovered');
});

test('delete and clear drop entries immediately', () => {
  const cache = new TtlCache({ ttlMs: 10_000 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.delete('a');
  assert.equal(cache.get('a'), undefined);
  cache.clear();
  assert.equal(cache.get('b'), undefined);
});
