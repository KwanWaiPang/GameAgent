import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { Team } from '../game/types';

type Bucket = { positions: number[]; normals: number[]; indices: number[]; skinIndex: number[]; skinWeight: number[] };

const up = new THREE.Vector3(0, 1, 0);
const quat = new THREE.Quaternion();
const axis = new THREE.Vector3();
const center = new THREE.Vector3();
const radial = new THREE.Vector3();
const normal = new THREE.Vector3();

function bucket(): Bucket {
  return { positions: [], normals: [], indices: [], skinIndex: [], skinWeight: [] };
}

function addTube(out: Bucket, a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, bone: number, parent: number, rings = 6, segs = 10) {
  axis.subVectors(b, a);
  const length = axis.length() || 1e-4;
  quat.setFromUnitVectors(up, axis.multiplyScalar(1 / length));
  const base = out.positions.length / 3;
  const row = segs + 1;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    center.lerpVectors(a, b, t);
    const radius = r0 + (r1 - r0) * t;
    const parentWeight = t < 0.22 ? ((0.22 - t) / 0.22) * 0.4 : 0;
    for (let s = 0; s <= segs; s++) {
      const angle = (s / segs) * Math.PI * 2;
      radial.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).applyQuaternion(quat);
      normal.copy(radial).normalize();
      out.positions.push(center.x + radial.x, center.y + radial.y, center.z + radial.z);
      out.normals.push(normal.x, normal.y, normal.z);
      out.skinIndex.push(bone, parent, 0, 0);
      out.skinWeight.push(1 - parentWeight, parentWeight, 0, 0);
    }
  }
  for (let i = 0; i < rings; i++) for (let s = 0; s < segs; s++) {
    const v = base + i * row + s;
    const w = v + row;
    out.indices.push(v, w, v + 1, w, w + 1, v + 1);
  }
}

function addSphere(out: Bucket, c: THREE.Vector3, radius: number, bone: number, parent: number, width = 12, height = 8, y0 = 0, y1 = Math.PI) {
  const base = out.positions.length / 3;
  const row = width + 1;
  for (let y = 0; y <= height; y++) {
    const v = y0 + (y1 - y0) * (y / height);
    const sy = Math.cos(v);
    const sr = Math.sin(v);
    for (let x = 0; x <= width; x++) {
      const u = (x / width) * Math.PI * 2;
      normal.set(Math.cos(u) * sr, sy, Math.sin(u) * sr);
      out.positions.push(c.x + normal.x * radius, c.y + normal.y * radius, c.z + normal.z * radius);
      out.normals.push(normal.x, normal.y, normal.z);
      out.skinIndex.push(bone, parent, 0, 0);
      out.skinWeight.push(1, 0, 0, 0);
    }
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const v = base + y * row + x;
    const w = v + row;
    out.indices.push(v, w, v + 1, w, w + 1, v + 1);
  }
}

function meshFrom(bucket: Bucket, materialName: string, roughness: number, metalness = 0, meshName = materialName) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(bucket.skinIndex, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(bucket.skinWeight, 4));
  geometry.setIndex(bucket.indices);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness, metalness, name: materialName });
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = meshName;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function track(name: string, frames: number, duration: number, sample: (t: number) => THREE.Quaternion) {
  const times: number[] = [];
  const values: number[] = [];
  const q = new THREE.Quaternion();
  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1);
    times.push(t * duration);
    q.copy(sample(t));
    values.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(`mixamorig${name}.quaternion`, times, values);
}

const euler = new THREE.Euler();
function swing(x: number, y = 0, z = 0) {
  return new THREE.Quaternion().setFromEuler(euler.set(x, y, z));
}

function clips() {
  const idle = new THREE.AnimationClip('Idle', 2.4, [
    track('Spine2', 9, 2.4, t => swing(Math.sin(t * Math.PI * 2) * 0.03)),
    track('Head', 9, 2.4, t => swing(Math.sin(t * Math.PI * 2) * 0.02, 0, 0)),
    track('LeftArm', 2, 2.4, () => swing(0.15, 0, 0.18)),
    track('RightArm', 2, 2.4, () => swing(0.35, 0, -0.12)),
    track('LeftForeArm', 2, 2.4, () => swing(-0.25)),
    track('RightForeArm', 2, 2.4, () => swing(-0.55)),
  ]);
  const stride = (amount: number, bend: number, arm: number, duration: number, name: string) => new THREE.AnimationClip(name, duration, [
    track('Hips', 13, duration, t => swing(0, 0, Math.sin(t * Math.PI * 2) * 0.04)),
    track('Spine', 13, duration, t => swing(0.06, Math.sin(t * Math.PI * 2) * 0.05)),
    track('Spine2', 13, duration, t => swing(0.08, Math.sin(t * Math.PI * 2 + Math.PI) * 0.08)),
    track('LeftUpLeg', 13, duration, t => swing(Math.sin(t * Math.PI * 2) * amount)),
    track('RightUpLeg', 13, duration, t => swing(Math.sin(t * Math.PI * 2 + Math.PI) * amount)),
    track('LeftLeg', 13, duration, t => swing(Math.max(0, -Math.sin(t * Math.PI * 2)) * bend)),
    track('RightLeg', 13, duration, t => swing(Math.max(0, -Math.sin(t * Math.PI * 2 + Math.PI)) * bend)),
    track('LeftArm', 13, duration, t => swing(Math.sin(t * Math.PI * 2 + Math.PI) * arm, 0, 0.12)),
    track('RightArm', 13, duration, t => swing(Math.sin(t * Math.PI * 2) * arm * 0.45, 0, -0.08)),
    track('LeftForeArm', 13, duration, t => swing(-0.35 - Math.max(0, Math.sin(t * Math.PI * 2)) * 0.25)),
    track('RightForeArm', 13, duration, t => swing(-0.7)),
    track('Head', 13, duration, t => swing(-0.04, Math.sin(t * Math.PI * 2) * 0.03)),
  ]);
  return [idle, stride(0.62, 0.85, 0.45, 0.92, 'Walk'), stride(0.95, 1.15, 0.7, 0.62, 'Run')];
}

/** Original skinned soldier using the same Mixamo joint names as the upstream IK. */
export function proceduralSoldier(): GLTF {
  const scene = new THREE.Group();
  scene.name = 'procedural-soldier';
  scene.userData.proceduralSoldier = true;
  scene.userData.importedSoldier = true;
  const bones: THREE.Bone[] = [];
  const index = new Map<string, number>();
  const joint = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const bone = new THREE.Bone();
    bone.name = `mixamorig${name}`;
    bone.position.set(x, y, z);
    parent.add(bone);
    index.set(name, bones.length);
    bones.push(bone);
    return bone;
  };
  const hips = joint('Hips', scene, 0, 0.98, 0);
  const spine = joint('Spine', hips, 0, 0.12, 0);
  const spine1 = joint('Spine1', spine, 0, 0.13, 0);
  const spine2 = joint('Spine2', spine1, 0, 0.14, 0);
  const neck = joint('Neck', spine2, 0, 0.14, 0);
  joint('Head', neck, 0, 0.1, 0);
  for (const [side, sign] of [['Left', -1], ['Right', 1]] as const) {
    const upLeg = joint(`${side}UpLeg`, hips, sign * 0.1, -0.06, 0);
    const leg = joint(`${side}Leg`, upLeg, 0, -0.44, 0);
    const foot = joint(`${side}Foot`, leg, 0, -0.42, 0.02);
    joint(`${side}ToeBase`, foot, 0, -0.05, 0.14);
    const arm = joint(`${side}Arm`, spine2, sign * 0.18, 0.02, 0);
    const fore = joint(`${side}ForeArm`, arm, 0, -0.28, 0);
    const hand = joint(`${side}Hand`, fore, 0, -0.26, 0);
    joint(`${side}HandMiddle1`, hand, 0, -0.07, -0.035);
    joint(`${side}HandIndex1`, hand, sign * 0.028, -0.055, -0.02);
    joint(`${side}HandPinky1`, hand, sign * -0.028, -0.05, -0.012);
  }
  scene.updateMatrixWorld(true);
  const at = (name: string) => bones[index.get(name)!].getWorldPosition(new THREE.Vector3());
  const groups: Record<string, Bucket> = {
    skin: bucket(), cloth: bucket(), armor: bucket(), boot: bucket(), helm: bucket(), cap: bucket(), scarf: bucket(), eye: bucket(),
  };
  const link = (group: string, from: string, to: string, r0: number, r1: number) => {
    addTube(groups[group], at(from), at(to), r0, r1, index.get(to)!, index.get(from)!);
  };
  link('cloth', 'Hips', 'Spine', 0.15, 0.16);
  link('armor', 'Spine', 'Spine1', 0.17, 0.18);
  link('armor', 'Spine1', 'Spine2', 0.19, 0.2);
  link('skin', 'Spine2', 'Neck', 0.07, 0.055);
  link('skin', 'Neck', 'Head', 0.055, 0.08);
  addSphere(groups.skin, at('Head').add(new THREE.Vector3(0, 0.04, 0)), 0.105, index.get('Head')!, index.get('Neck')!);
  addSphere(groups.skin, at('Head').add(new THREE.Vector3(0, 0.01, -0.075)), 0.03, index.get('Head')!, index.get('Head')!, 8, 6);
  addSphere(groups.eye, at('Head').add(new THREE.Vector3(-0.038, 0.03, -0.09)), 0.012, index.get('Head')!, index.get('Head')!, 6, 4);
  addSphere(groups.eye, at('Head').add(new THREE.Vector3(0.038, 0.03, -0.09)), 0.012, index.get('Head')!, index.get('Head')!, 6, 4);
  addSphere(groups.helm, at('Head').add(new THREE.Vector3(0, 0.07, 0.01)), 0.125, index.get('Head')!, index.get('Neck')!, 12, 6, 0, Math.PI * 0.62);
  addSphere(groups.cap, at('Head').add(new THREE.Vector3(0, 0.1, -0.01)), 0.118, index.get('Head')!, index.get('Head')!, 10, 5, 0, Math.PI * 0.5);
  addTube(groups.scarf, at('Neck'), at('Head').add(new THREE.Vector3(0, -0.02, -0.05)), 0.075, 0.095, index.get('Head')!, index.get('Neck')!, 3, 8);
  for (const side of ['Left', 'Right'] as const) {
    link('cloth', 'Hips', `${side}UpLeg`, 0.1, 0.09);
    link('cloth', `${side}UpLeg`, `${side}Leg`, 0.085, 0.07);
    link('cloth', `${side}Leg`, `${side}Foot`, 0.065, 0.05);
    link('boot', `${side}Foot`, `${side}ToeBase`, 0.055, 0.04);
    addSphere(groups.boot, at(`${side}Foot`), 0.06, index.get(`${side}Foot`)!, index.get(`${side}Leg`)!, 8, 6);
    link('armor', 'Spine2', `${side}Arm`, 0.075, 0.065);
    link('cloth', `${side}Arm`, `${side}ForeArm`, 0.058, 0.05);
    link('skin', `${side}ForeArm`, `${side}Hand`, 0.045, 0.04);
    addSphere(groups.skin, at(`${side}Hand`), 0.04, index.get(`${side}Hand`)!, index.get(`${side}ForeArm`)!, 8, 6);
    addSphere(groups.armor, at('Spine2').add(new THREE.Vector3(side === 'Left' ? -0.16 : 0.16, 0.02, 0)), 0.07, index.get('Spine2')!, index.get('Spine1')!, 8, 6);
  }
  addSphere(groups.armor, at('Spine1').add(new THREE.Vector3(0, 0.02, -0.1)), 0.11, index.get('Spine1')!, index.get('Spine')!, 8, 6);
  addTube(groups.armor, at('Spine2').add(new THREE.Vector3(0, -0.02, 0.12)), at('Spine').add(new THREE.Vector3(0, 0, 0.14)), 0.1, 0.12, index.get('Spine2')!, index.get('Spine')!, 4, 8);

  const spec: Record<string, [string, number, number, string]> = {
    skin: ['skin', 0.62, 0.02, 'skin'],
    cloth: ['cloth', 0.86, 0, 'cloth'],
    armor: ['armor', 0.7, 0.08, 'armor'],
    boot: ['boot', 0.8, 0.04, 'boot'],
    helm: ['helm', 0.45, 0.35, 'opt-helm'],
    cap: ['cap', 0.84, 0, 'opt-cap'],
    scarf: ['scarf', 0.9, 0, 'opt-scarf'],
    eye: ['eye', 0.25, 0.55, 'eye'],
  };
  const meshes = Object.entries(groups).map(([key, data]) => {
    const [materialName, rough, metal, meshName] = spec[key];
    return meshFrom(data, materialName, rough, metal, meshName);
  });
  const skeleton = new THREE.Skeleton(bones);
  scene.remove(hips);
  meshes[0].add(hips);
  for (const surface of meshes) {
    surface.bind(skeleton);
    scene.add(surface);
  }
  scene.updateMatrixWorld(true);
  return { scene, animations: clips(), cameras: [], scenes: [scene], asset: {}, parser: null, userData: {} } as unknown as GLTF;
}

const PALETTE: Record<Team, Record<string, string>> = {
  blue: { skin: '#d2a67c', cloth: '#31465c', armor: '#24384c', boot: '#1a1d22', helm: '#2a3644', eye: '#1b1e22', cap: '#3d5368', scarf: '#6d7c74' },
  red: { skin: '#c4926a', cloth: '#5a4636', armor: '#6a3a32', boot: '#241910', helm: '#3a2c24', eye: '#1b1e22', cap: '#6a5344', scarf: '#c2b49a' },
};

export function paintProceduralSoldier(model: THREE.Object3D, team: Team, variant = 0) {
  const colors = PALETTE[team];
  const gear = variant % 3 === 0 ? 'helm' : variant % 3 === 1 ? 'cap' : 'scarf';
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const source = object.material as THREE.MeshStandardMaterial;
    const next = source.clone();
    const key = source.name;
    next.color.set(colors[key]);
    object.material = next;
    object.castShadow = true;
    if (object.name.startsWith('opt-')) object.visible = object.name === `opt-${gear}` || (gear === 'scarf' && object.name === 'opt-scarf');
  });
}
