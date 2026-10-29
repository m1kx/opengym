import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempData } from './helpers.mjs';

const dir = tempData();
const store = await import('../machines/store.js');
const { normalize, brandSlug, MAX_MACHINES } = await import('../machines/normalize.js');

const canned = {
  brand: 'gym80',
  machines: [
    { name: 'Chest Press', series: 'Pure Kraft', bodyPart: 'chest', target: 'pectorals', secondary: ['triceps', 'Delts', 'toenails', 'pectorals'], image: 'https://gym80.de/a.jpg', url: 'https://gym80.de/p/1' },
    { name: 'Chest Press', series: 'Pure Kraft', bodyPart: 'chest', target: 'pectorals', secondary: [] },       // duplicate id
    { name: 'Leg Press', bodyPart: 'upper legs', target: 'quads', secondary: [], image: 'http://gym80.de/b.jpg', url: 'javascript:alert(1)' },
    { name: 'Mystery', bodyPart: 'chest', target: 'flux capacitor', secondary: [] },                             // unknown muscle
    { name: 'Wing', bodyPart: 'wings', target: 'abs', secondary: [] },                                           // unknown body part
    { name: '', bodyPart: 'chest', target: 'abs', secondary: [] }
  ]
};

test('brandSlug uses the label before the TLD', () => {
  assert.equal(brandSlug('https://gym80.de/'), 'gym80');
  assert.equal(brandSlug('https://www.life-fitness.com/en'), 'life-fitness');
});

test('normalize keeps valid machines, drops unknowns, dedupes, rejects http images', () => {
  const { brand, slug, machines } = normalize(canned, 'https://gym80.de/');
  assert.equal(brand, 'gym80');
  assert.equal(slug, 'gym80');
  assert.equal(machines.length, 2);
  assert.deepEqual(machines[0], {
    id: 'm_gym80_chest-press-pure-kraft', n: 'Chest Press (Pure Kraft)', bp: 'chest', eq: 'gym80',
    tg: 'pectorals', sm: ['triceps', 'delts'], img: 'https://gym80.de/a.jpg', url: 'https://gym80.de/p/1', machine: true
  });
  assert.equal(machines[1].id, 'm_gym80_leg-press');
  assert.equal('img' in machines[1], false);
  assert.equal('url' in machines[1], false);
});

test('normalize tolerates garbage and caps the list', () => {
  assert.deepEqual(normalize(null, 'https://gym80.de/').machines, []);
  const many = { machines: Array.from({ length: MAX_MACHINES + 50 }, (_, i) => ({ name: 'M' + i, bodyPart: 'back', target: 'lats' })) };
  assert.equal(normalize(many, 'https://gym80.de/').machines.length, MAX_MACHINES);
});

test('store round-trip: replace, list, delete', () => {
  assert.deepEqual(store.list(), []);
  const a = normalize(canned, 'https://gym80.de/');
  store.replaceBrand(a.slug, a.brand, 'https://gym80.de/', a.machines);
  store.replaceBrand('other', 'Other', 'https://other.com/', [{ id: 'm_other_x', n: 'X', machine: true }]);
  assert.equal(store.list().length, 3);
  assert.deepEqual(store.brands().map(b => [b.slug, b.count]), [['gym80', 2], ['other', 1]]);

  store.replaceBrand('gym80', 'gym80', 'https://gym80.de/', a.machines.slice(0, 1));   // re-import replaces
  assert.equal(store.list().length, 2);

  assert.equal(store.deleteBrand('gym80'), true);
  assert.equal(store.deleteBrand('gym80'), false);
  assert.deepEqual(store.list().map(m => m.id), ['m_other_x']);
  assert.ok(fs.existsSync(path.join(dir, 'machines.json')));
  assert.equal(fs.existsSync(path.join(dir, 'machines.json.tmp')), false);
});
