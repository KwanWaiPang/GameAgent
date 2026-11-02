# Licensed character assets / 写实角色资产

No third-party character models ship in this repository. The base game remains playable with procedural characters until reviewed GLB assets are added.

## Add a skinned model

Copy a licensed glTF 2.0 `.glb` (embedded textures and animations) into this directory. Set `characters` in `manifest.json`:

```json
{
  "version": 1,
  "characters": {
    "hero": {
      "file": "./assets/characters/guanyu.glb",
      "height": 2.3,
      "facingOffset": 0,
      "clips": {
        "idle": "Idle",
        "walk": "Walk",
        "run": "Run",
        "attack": "Attack",
        "heavy": "Heavy",
        "skill": "Musou",
        "dodge": "Dodge",
        "hit": "Hit",
        "death": "Death"
      }
    }
  }
}
```

Kinds: `hero` = Guan Yu, `boss` = Lu Bu, `soldier` = normal soldier, `elite` = elite soldier (can reuse soldier). A character needs **Idle / Walk / Attack** clips or the entire character gracefully falls back to the procedural version. The rest are optional but strongly recommended for production. Clip matching is case-insensitive and strips punctuation; explicit names in `clips` take priority.

Model orientation: Y-up, humanoid height given in metres, feet aligned to floor, **in-place (no root motion)**, facing adjusted using `facingOffset` in radians. Include fitted weapons/armor in the GLB; the placeholder procedural mesh and its procedural weapon are hidden together. Model bounding-box height is normalized to `height`. GLB files must be inside this directory (no remote URLs). A missing model, broken animation set, or CDN failure leaves the current gameplay functional.

Because skinned clones share cached source geometry/materials, each enemy removes only its clone's skeleton; **never dispose the shared GLB geometry, textures or material on individual enemy death**. Keep all source models cached until the page closes.

Rights: preserve creator, source URL, precise license, attribution requirements, and explicit redistribution permission for each asset. Avoid game rips or assets from existing commercial *Dynasty Warriors* games.

**Note:** This commit provides the loading/animation infrastructure but **does not yet include Guan Yu or Lu Bu high-fidelity models**. Obtain or create redistributable characters before calling the graphics photorealistic.
