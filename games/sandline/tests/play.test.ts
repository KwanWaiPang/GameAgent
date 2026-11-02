import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Simulation } from '../src/game/simulation.ts';
import { EMPTY_INPUT } from '../src/game/types.ts';
import { blocked } from '../src/game/collision.ts';
import { getActiveMap, setActiveMap, type MapId } from '../src/game/map.ts';
import { mapPlayableModes, type PlayableMode } from '../src/game/offlineModes.ts';

const maps: MapId[] = ['desert', 'snow'];
const modes = mapPlayableModes('desert');

test('arena objectives sit in open space', () => {
  for (const id of maps) {
    setActiveMap(id);
    const map = getActiveMap();
    for (const site of map.bombSites ?? []) assert.equal(blocked(site.x, site.z, 0.4), false, `${id} site ${site.id}`);
    for (const hostage of map.hostageSpawns ?? []) assert.equal(blocked(hostage.x, hostage.z, 0.4), false, `${id} hostage ${hostage.id}`);
    for (const zone of map.rescueZones ?? []) assert.equal(blocked(zone.x, zone.z, 0.4), false, `${id} rescue`);
  }
  setActiveMap('desert');
});

test('every arena mode survives a short bot match', () => {
  for (const id of maps) {
    setActiveMap(id);
    for (const mode of modes) {
      const sim = new Simulation(7);
      assert.equal(sim.selectMode(mode as PlayableMode), true, mode);
      sim.setBotCounts(1, 2);
      sim.start();
      assert.equal(sim.state.mode, mode);
      for (let i = 0; i < 90; i++) sim.update(1 / 60, EMPTY_INPUT);
      assert.ok(sim.state.actors.length >= 4);
    }
  }
  setActiveMap('desert');
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
