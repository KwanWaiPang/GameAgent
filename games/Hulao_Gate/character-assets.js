/**
 * Optional GLB character pipeline. Skinned clones own mixers/skeletons, while
 * their GPU geometry/materials belong to the cached source asset.
 */
const aliases = {
  idle: ['idle', 'stand', 'breath', 'rest'],
  walk: ['walk', 'walking', 'locomotion'],
  run: ['run', 'running', 'sprint', 'jog'],
  attack: ['attack', 'attack1', 'slash', 'swing', 'melee'],
  heavy: ['heavy', 'attack2', 'power', 'strong', 'attack'],
  skill: ['skill', 'special', 'spin', 'attack3', 'attack'],
  dodge: ['dodge', 'roll', 'evade', 'dash'],
  hit: ['hit', 'hurt', 'stagger', 'impact'],
  death: ['death', 'die', 'fall', 'collapse'],
};
const oneShot = new Set(['attack', 'heavy', 'skill', 'dodge', 'hit', 'death']);
const normalize = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function matchAnimationClips(animations, overrides = {}) {
  const clips = {};
  for (const [state, names] of Object.entries(aliases)) {
    const wanted = overrides[state] ? [overrides[state], ...names] : names;
    const match = wanted.map((name) => {
      const key = normalize(name);
      return animations.find((clip) => normalize(clip.name) === key)
        || animations.find((clip) => normalize(clip.name).includes(key));
    }).find(Boolean);
    if (match) clips[state] = match;
  }
  return clips;
}

export function createCharacterAssets(THREE, { low = false } = {}) {
  const pending = new Map();
  const live = new Map();
  const templates = new Map();
  const definitions = new Map();
  let ready = false;
  let loading = null;

  async function prepare() {
    if (loading) return loading;
    loading = (async () => {
      let manifest;
      try {
        const response = await fetch(new URL('./assets/characters/manifest.json', import.meta.url));
        if (!response.ok) throw Error('Character manifest HTTP ' + response.status);
        manifest = await response.json();
      } catch (error) {
        console.warn('Hulao: character manifest missing; using original warriors.', error);
        manifest = { characters: {} };
      }
      for (const [kind, config] of Object.entries(manifest.characters || {})) {
        if (!['hero', 'boss', 'soldier', 'elite'].includes(kind) || !config?.file) continue;
        const file = String(config.file);
        if (!/^\.\/assets\/characters\/[a-zA-Z0-9_./-]+\.glb$/.test(file) || file.includes('..')) {
          console.warn('Hulao: unsafe or unsupported GLB path:', kind);
          continue;
        }
        definitions.set(kind, config);
      }
      if (definitions.size) {
        const [{ GLTFLoader }, { clone }] = await Promise.all([
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/addons/utils/SkeletonUtils.js'),
        ]);
        const loader = new GLTFLoader();
        await Promise.all(Array.from(definitions, async ([kind, config]) => {
          try {
            const gltf = await loader.loadAsync(new URL(config.file, import.meta.url).href);
            const clips = matchAnimationClips(gltf.animations, config.clips || {});
            if (!clips.idle || !clips.walk || !clips.attack) {
              console.warn('Hulao: GLB needs Idle, Walk and Attack:', kind);
              return;
            }
            templates.set(kind, { gltf, clips, clone, config });
          } catch (error) {
            console.warn('Hulao: GLB unavailable; keeping original warrior:', kind, error);
          }
        }));
      }
      ready = true;
      for (const [root, kind] of pending) mount(root, kind);
      return { loaded: templates.size, configured: definitions.size };
    })().catch((error) => {
      ready = true;
      console.warn('Hulao: GLB fallback:', error);
      return { loaded: 0, configured: definitions.size };
    });
    return loading;
  }

  function mount(root, kind) {
    if (!ready || !pending.has(root) || !root.parent || live.has(root)) return;
    const template = templates.get(kind) || (kind === 'elite' ? templates.get('soldier') : null);
    if (!template) return;
    const { gltf, clips, clone, config } = template;
    const figure = clone(gltf.scene);
    const bounds = new THREE.Box3().setFromObject(figure);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y < 0.1) return;
    const scale = THREE.MathUtils.clamp(Number(config.height) || 2.25, 1.5, 3.4) / size.y;
    figure.scale.multiplyScalar(scale);
    figure.position.set(
      -(bounds.min.x + bounds.max.x) * 0.5 * scale,
      -bounds.min.y * scale,
      -(bounds.min.z + bounds.max.z) * 0.5 * scale,
    );
    figure.rotation.y = Number(config.facingOffset) || 0;
    figure.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = !low;
      node.receiveShadow = !low;
      if (node.isSkinnedMesh) node.frustumCulled = false;
    });
    root.add(figure);
    root.userData.rig.visible = false;
    const mixer = new THREE.AnimationMixer(figure);
    const actions = Object.fromEntries(Object.entries(clips).map(([state, clip]) => [state, mixer.clipAction(clip)]));
    live.set(root, { figure, mixer, actions, playing: null, serial: null, state: null });
  }

  function attach(root, kind) {
    root.userData.motion = { state: 'idle', token: 0, duration: 0 };
    pending.set(root, kind);
    if (ready && root.parent) mount(root, kind);
  }

  function setState(root, state, token = 0, duration = 0) {
    if (root?.userData) root.userData.motion = { state, token, duration };
  }

  function update(dt) {
    for (const [root, kind] of pending) {
      if (!live.has(root) && root.parent && ready) mount(root, kind);
    }
    for (const [root, instance] of live) {
      if (!root.parent) continue;
      const req = root.userData.motion || { state: 'idle', token: 0, duration: 0 };
      const state = req.state;
      const target = instance.actions[state]
        || instance.actions[state === 'run' ? 'walk' : oneShot.has(state) ? 'attack' : 'idle']
        || instance.actions.idle;
      const changed = instance.playing !== target || instance.state !== state
        || (oneShot.has(state) && instance.serial !== req.token);
      if (changed) {
        const previous = instance.playing;
        if (previous && previous !== target) previous.fadeOut(0.12);
        target.reset();
        target.enabled = true;
        target.setEffectiveWeight(1);
        target.setLoop(oneShot.has(state) ? THREE.LoopOnce : THREE.LoopRepeat, oneShot.has(state) ? 1 : Infinity);
        target.clampWhenFinished = oneShot.has(state);
        const clipLength = target.getClip().duration;
        const duration = req.duration > 0 ? req.duration : clipLength;
        target.setEffectiveTimeScale(duration > 0 ? clipLength / duration : 1);
        if (state === 'run' && !instance.actions.run) target.setEffectiveTimeScale(1.45);
        if (previous !== target) target.fadeIn(0.12);
        target.play();
        instance.playing = target;
        instance.state = state;
        instance.serial = req.token;
      }
      instance.mixer.update(dt);
    }
  }

  function detach(root) {
    pending.delete(root);
    const instance = live.get(root);
    if (!instance) return;
    instance.mixer.stopAllAction();
    instance.mixer.uncacheRoot(instance.figure);
    instance.figure.traverse((node) => {
      // SkeletonUtils gives skinned clones independent skeleton instances.
      if (node.isSkinnedMesh) node.skeleton?.dispose();
    });
    root.remove(instance.figure);
    if (root.userData.rig) root.userData.rig.visible = true;
    live.delete(root);
  }
  return { prepare, attach, setState, update, detach };
}
