import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./character-assets.js', import.meta.url), 'utf8');
const { matchAnimationClips } = await import('data:text/javascript,' + encodeURIComponent(source));
const clips = ['Idle', 'Walking', 'Run', 'Attack01', 'PowerStrike', 'Roll', 'HitReact', 'Death']
  .map((name) => ({ name, duration: 1 }));

test('maps named animation clips independently of case', () => {
  const states = matchAnimationClips(clips, { heavy: 'PowerStrike' });
  assert.equal(states.idle.name, 'Idle');
  assert.equal(states.walk.name, 'Walking');
  assert.equal(states.run.name, 'Run');
  assert.equal(states.attack.name, 'Attack01');
  assert.equal(states.heavy.name, 'PowerStrike');
  assert.equal(states.dodge.name, 'Roll');
  assert.equal(states.hit.name, 'HitReact');
  assert.equal(states.death.name, 'Death');
});
test('does not silently invent missing required clips', () => {
  const states = matchAnimationClips([{ name: 'Idle' }]);
  assert.equal(states.idle.name, 'Idle');
  assert.equal(states.walk, undefined);
  assert.equal(states.attack, undefined);
});
test('custom clip names override fallback aliases', () => {
  const states = matchAnimationClips([{ name: 'Attack01' }, { name: 'MyUltimate' }], { skill: 'MyUltimate' });
  assert.equal(states.skill.name, 'MyUltimate');
});
