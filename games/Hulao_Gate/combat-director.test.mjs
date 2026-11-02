import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseEnemyStrike, hitInStrike, canParry, canEnemyEngage } from './combat-director.js';

test('boss moves to more dangerous but telegraphed phase under half health', () => {
  const ordinary = chooseEnemyStrike('boss', 1, () => 0.1);
  const enraged = chooseEnemyStrike('boss', 0.49, () => 0.1);
  assert.equal(ordinary.type, 'shockwave');
  assert.equal(enraged.type, 'shockwave');
  assert.ok(enraged.damage > ordinary.damage);
  assert.ok(enraged.windup > 0.5);
});
test('shockwave covers its ring, but not the safe center', () => {
  const attack = chooseEnemyStrike('boss', 1, () => 0);
  assert.ok(hitInStrike(attack,{x:0,z:0},{x:5,z:0},0));
  assert.ok(!hitInStrike(attack,{x:0,z:0},{x:0.3,z:0.2},0));
  assert.ok(!hitInStrike(attack,{x:0,z:0},{x:10,z:0},0));
});
test('front arc and rear angle are both tested', () => {
  const attack = chooseEnemyStrike('soldier');
  assert.ok(hitInStrike(attack,{x:0,z:0},{x:0,z:-2},0));
  assert.ok(!hitInStrike(attack,{x:0,z:0},{x:0,z:2},0));
});
test('parry requires front-facing attacker and valid timing', () => {
  assert.ok(canParry(0.1,{x:0,z:0},0,{x:0,z:-2}));
  assert.ok(!canParry(0.1,{x:0,z:0},0,{x:0,z:2}));
  assert.ok(!canParry(0,{x:0,z:0},0,{x:0,z:-2}));
});
test('small groups do not all engage at once', () => {
  assert.ok(canEnemyEngage(1,'soldier'));
  assert.ok(!canEnemyEngage(2,'soldier'));
  assert.ok(canEnemyEngage(2,'boss'));
});
