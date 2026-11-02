/**
 * Adapt the pinned Apache-2.0 Battle Drones upstream snapshot for GameAgent.
 * Keep the original engine, AI, art and audio intact. This is deliberately a
 * small, verified source transform rather than a reimplementation.
 *
 * Usage: node .github/scripts/prepare-battledrones.mjs .battledrones-upstream
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const upstream = resolve(process.argv[2] || ".battledrones-upstream");

function update(path, transform) {
  const filename = join(upstream, path);
  const before = readFileSync(filename, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`Battle Drones source transform had no effect: ${path}`);
  writeFileSync(filename, after);
}

update("src/main.ts", (source) => {
  const anchor = '    <div class="keyart"></div>';
  if (source.split(anchor).length !== 2) throw new Error("Upstream menu markup changed");
  source = source.replace(
    anchor,
    `${anchor}
    <a class="gameagent-return" href="../../" title="返回 GameAgent 游戏馆">← 游戏馆</a>`
  );

  // The original eagerly downloads the multiplayer lobby on every menu open.
  // The single-player edition never displays multiplayer actions, so avoid
  // this unnecessary load; do not disturb the game controller or AI code.
  const start = source.indexOf("  // (every browser can duel online: the chunk always loads)");
  const end = source.indexOf("\n\n  // career:", start);
  if (start < 0 || end < 0 || end <= start) throw new Error("Upstream multiplayer prefetch block changed");
  source = source.slice(0, start)
    + "  // Multiplayer prefetch disabled: GameAgent offers local single-player modes only."
    + source.slice(end);
  return source;
});

update("src/ui/style.css", (source) => source + `

/* GameAgent: local single-player edition. Original RTS visuals remain intact. */
#splash #duelrow,
#splash #play-online,
#splash #play-duel { display: none !important; }
#splash .gameagent-return {
  position: fixed;
  z-index: 20;
  top: calc(12px + env(safe-area-inset-top, 0px));
  left: calc(12px + env(safe-area-inset-left, 0px));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 13px;
  color: #e8eef9;
  font: 600 13px/1.2 system-ui, sans-serif;
  text-decoration: none;
  background: rgba(9, 18, 33, .85);
  border: 1px solid rgba(223, 234, 255, .35);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}
#splash .gameagent-return:hover,
#splash .gameagent-return:focus-visible {
  color: #fff;
  border-color: #fff;
  background: rgba(20, 42, 64, .96);
}
`);

console.log("Prepared Battle Drones for GameAgent: original single-player game + lobby return link.");
