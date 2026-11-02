import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Simulation } from '../src/game/simulation.ts';
import { EMPTY_INPUT } from '../src/game/types.ts';
import { setActiveMap } from '../src/game/map.ts';
import { modeForMap, mapPlayableModes } from '../src/game/offlineModes.ts';

test('desert and snow keep the upstream mode list', () => {
  for (const id of ['desert', 'snow'] as const) {
    setActiveMap(id);
    assert.deepEqual(mapPlayableModes(id), ['deathmatch', 'knifeOnly', 'pistolOnly', 'armsRace', 'defense']);
    assert.equal(modeForMap('demolition', id), 'deathmatch');
    assert.equal(modeForMap('bounty', id), 'deathmatch');
  }
  setActiveMap('desert');
});

test('a short bot match stays in play', () => {
  setActiveMap('desert');
  const sim = new Simulation(7);
  sim.start('deathmatch');
  for (let i = 0; i < 120; i++) sim.update(1 / 60, EMPTY_INPUT);
  assert.equal(sim.state.phase, 'playing');
  assert.ok(sim.state.actors.length >= 4);
});

test('rifle fire spends a round and reload refills it', () => {
  setActiveMap('desert');
  const sim = new Simulation(3);
  sim.start('deathmatch');
  const player = sim.state.player;
  player.guns.rifle.cooldown = 0;
  assert.equal(sim.fire(player), true);
  assert.equal(player.guns.rifle.ammo, 29);
  player.guns.rifle.ammo = 0;
  assert.equal(sim.reload(player), true);
  for (let i = 0; i < 160; i++) sim.update(1 / 60, EMPTY_INPUT);
  assert.equal(player.guns.rifle.ammo, 30);
});
