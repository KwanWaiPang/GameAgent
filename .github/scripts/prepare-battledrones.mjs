/**
 * Produce the Battle Drones single-player edition from pinned Apache-2.0
 * upstream sources during GameAgent CI. Keep all shared AI/RTS/rendering
 * components intact, but remove multiplayer entry points and implementations.
 *
 * Usage: node .github/scripts/prepare-battledrones.mjs .battledrones-upstream
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const upstream = resolve(process.argv[2] || ".battledrones-upstream");

function transform(path, fn) {
  const filename = join(upstream, path);
  const previous = readFileSync(filename, "utf8");
  const result = fn(previous);
  if (previous === result) throw new Error("No changes to upstream " + path);
  writeFileSync(filename, result);
}

function replaceOnce(text, find, replacement, label) {
  if (text.split(find).length !== 2) throw new Error("Upstream changed: " + label);
  return text.replace(find, replacement);
}

function cut(text, start, end, label, replacement = "") {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  if (a < 0 || b < 0 || b <= a) throw new Error("Upstream section changed: " + label);
  return text.slice(0, a) + replacement + text.slice(b);
}

transform("src/main.ts", (source) => {
  const oldImports = [
    ['import { activeMutators, duelSetup, gameMode, loadSettings, saveSettings, unchartedMatch, type GameType } from "./game/mode";',
     'import { gameMode, loadSettings, saveSettings, unchartedMatch, type GameType } from "./game/mode";'],
    ['import { mountMenuCareer, openSheet, starsText } from "./ui/career";',
     'import { mountMenuCareer, starsText } from "./ui/career";'],
    ['// (types only: the sound duel\'s code is a lazily loaded chunk, reached through loadDuel() alone)\nimport type * as DuelLobby from "./versus/lobby";\nimport type { VersusFeed } from "./versus/feed";\nimport type * as FfaLobby from "./ffa/lobby";\nimport type { FfaFeed } from "./ffa/feed";\nimport { aiStrategy } from "./game/meta";\n', ""]
  ];
  for (const [from, to] of oldImports) source = replaceOnce(source, from, to, "multiplayer imports");

  // Remove multiplayer lobby loaders, invite/room parsing and reconnect state.
  // Preserve the same local rematch storage key as the original end-screen.
  source = cut(
    source,
    '/**\n * The sound duel (SOUND-DUEL.md',
    '/** Render at device resolution',
    "multiplayer boot functions",
    'const REMATCH_KEY = "battledrones.rematch";\n\n'
  );
  source = cut(
    source,
    '  // a sound duel\'s Rematch (SOUND-DUEL.md',
    '  // ?map=<id>',
    "multiplayer rematch/invite logic"
  );

  // No multiplayer controls or lazy-loaded multiplayer lobby on the menu.
  source = replaceOnce(
    source,
    '    <div class="keyart"></div>',
    '    <div class="keyart"></div>\n    <a class="gameagent-return" href="../../" title="返回 GameAgent 游戏馆">← 游戏馆</a>',
    "GameAgent return link"
  );
  source = replaceOnce(
    source,
    '      <div class="row" id="duelrow" hidden>\n        <button class="cta alt" id="play-online" disabled>🌐 Duel a friend online</button>\n        <button class="cta alt" id="play-duel" disabled hidden>🔊 Duel a friend (sound)</button>\n      </div>\n',
    "",
    "multiplayer buttons"
  );
  source = cut(
    source,
    '  // the sound duel\'s button (Skirmish only)',
    '  // career:',
    "lobby buttons/listeners/prefetch"
  );
  source = replaceOnce(source, '    duelRow.hidden = gameMode.mode !== "skirmish";\n', "", "multiplayer row visibility");
  source = replaceOnce(source, "  if (!duelRematch) sfx.unlockOnGesture();", "  sfx.unlockOnGesture();", "local menu sound");
  // Multiplayer map-specific text and button state are removed. Maps that
  // once supported four online seats remain playable in local single-player.
  source = replaceOnce(
    source,
    `    const four = m.players === 4;
    menu.querySelector("#sub")!.textContent = opsMode
      ? "Short missions with a twist. Three stars each — can you take them all?"
      : survival
        ? "Hold your base against endless, themed waves. How long can you last?"
        : four
          ? "Four commanders, one survivor. Knock out every rival's HQ and Goliaths."
          : "Mine scrap. Build your swarm. Destroy the enemy HQ and its Goliaths.";
    // a four-player map: no sound duel (two phones only), and online seats up to four
    duelBtn.hidden = !duelable || four;
    onlineBtn.textContent = four ? "🌐 Battle friends online (up to 4)" : "🌐 Duel a friend online";
`,
    `    menu.querySelector("#sub")!.textContent = opsMode
      ? "Short missions with a twist. Three stars each — can you take them all?"
      : survival
        ? "Hold your base against endless, themed waves. How long can you last?"
        : "Mine scrap. Build your swarm. Destroy the enemy HQ and its Goliaths.";
`,
    "single-player map description and multiplayer controls"
  );
  source = cut(
    source,
    '  // ------------------------------------------------------------ sound duel ---',
    '  // "Rematch" from the end screen skips straight back into a game',
    "all multiplayer lobby/connection/event handlers"
  );

  if (/from ["']\.\/(versus|ffa|link|net)\//.test(source) ||
      /\b(loadDuel|duelTap|loadFfa|openFfaHost|duelRow|onlineBtn|duelBtn)\b/.test(source))
    throw new Error("Multiplayer reference remains in the main entry point.");
  return source;
});

// Remove the actual multiplayer code, not just its visible controls.
for (const dir of ["src/versus", "src/ffa", "src/link", "src/net", "relay"]) {
  const path = join(upstream, dir);
  if (!existsSync(path)) throw new Error("Expected multiplayer source directory missing: " + dir);
  rmSync(path, { recursive: true, force: true });
}
const probe = join(upstream, "radio-probe.html");
if (!existsSync(probe)) throw new Error("Missing radio link diagnostics page");
rmSync(probe);

transform("vite.config.ts", (source) => {
  source = replaceOnce(source, 'import { duelHash, ffaHash, simHash } from "./tools/arena/files";', 'import { simHash } from "./tools/arena/files";', "multiplayer build hashes");
  source = source.replace(/    \/\/ a sound duel pairs[^\n]*\n    __DUEL_HASH__:[^\n]*\n    \/\/ a four-player online battle[^\n]*\n    __FFA_HASH__:[^\n]*\n/, "");
  if (source.includes("__DUEL_HASH__") || source.includes("__FFA_HASH__")) throw new Error("Multiplayer build constants remain.");
  return replaceOnce(source, '        probe: "radio-probe.html"\n', "", "radio probe build entry");
});

transform("tools/arena/files.ts", (source) =>
  cut(source, "/** The sim plus the sound-duel code", "export function gitCommit", "multiplayer hash helpers")
);

transform("package.json", (source) => {
  const pkg = JSON.parse(source);
  pkg.scripts = { dev: "vite", build: "tsc --noEmit && vite build", preview: "vite preview" };
  return JSON.stringify(pkg, null, 2) + "\n";
});

// Upstream's TS config type-checks multiplayer-specific tests. The application
// type-check remains strict, but only includes the live production source.
transform("tsconfig.json", (source) =>
  replaceOnce(source, '"include": ["src", "tests"]', '"include": ["src"]', "production TypeScript scope")
);

transform("index.html", (source) => source.replaceAll('href="/src/', 'href="./src/').replaceAll('src="/src/', 'src="./src/'));

transform("src/ui/style.css", (source) => source + String.raw`

/* GameAgent integration: the original single-player art and HUD are unchanged. */
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

console.log("Battle Drones single-player edition: multiplayer source/entry points removed, AI and RTS preserved.");
