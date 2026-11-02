import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('./camera-physics.js', import.meta.url), 'utf8');
const { resolveCameraTarget } = await import('data:text/javascript,' + encodeURIComponent(source));
function point(x, y, z) {
  return {
    x, y, z,
    clone() { return point(this.x, this.y, this.z); },
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; },
    lerp(v, f) { this.x += (v.x-this.x)*f; this.y += (v.y-this.y)*f; this.z += (v.z-this.z)*f; return this; },
  };
}
test('keeps camera inside the playable arena', () => {
  const result = resolveCameraTarget(point(0, 2, 0), point(99, 5, -99), []);
  assert.equal(result.x, 33);
  assert.equal(result.z, -55);
});
test('pulls camera ahead of a low tent intersecting the line of sight', () => {
  const result = resolveCameraTarget(point(0, 2, 0), point(0, 3, 10), [{x:0,z:6,r:2,height:4}]);
  assert.ok(result.z > 0 && result.z < 4);
});
test('does not zoom into a tent below the camera line', () => {
  const result = resolveCameraTarget(point(0, 6, 0), point(0, 7, 10), [{x:0,z:6,r:2,height:2}]);
  assert.equal(result.z, 10);
});
test('does not create invalid targets inside a blocking volume', () => {
  const result = resolveCameraTarget(point(0, 2, 0), point(0, 4, 9), [{x:0,z:0,r:2,height:5}]);
  assert.equal(result.z, 9);
});
