[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Tactical Assault

A realistic military first-person shooter without gore. It runs in the browser against a local AI, in two modes.

You start with an **AK-47** (30-round magazine, **200** reserve). Five weapons appear in the match:

| Weapon | Notes |
|---|---|
| Pistol | Sidearm, 26 per shot; headshot ×1.85 |
| AK-47 | High damage, 24, a bit more recoil than the M4; headshot ×2 |
| M4 | Steadier and faster, 18 per shot |
| Shotgun | 8 pellets ×10, close-range burst; pellet headshots only ×1.35 |
| Bolt rifle | Torso 48 (about two shots), headshot ×2.5; you cycle the bolt after each shot |

You can pick up ammo, medkits, and those guns (**bolt-rifle ammo is rare**). **The AI also picks up and swaps guns.** A picked-up gun goes into the inventory and is not equipped automatically. Press `1`–`5` or the wheel to switch. The HUD shows the current weapon and ammo. Enemies use low-poly counter-terror / counter-terrorist shapes. Gunshots are real firearm samples.

You are briefly invulnerable at the start. After about **4 seconds** without a new hit you regenerate. A medkit picked up at full health is stored and used automatically when you are hurt. Enemies do not regenerate.

The map is a larger street block (about 170 m for assault, 210 m for battle royale): main and side roads, enterable buildings, alley cover, and lamps. Each match picks one **map variant**:

| Variant | Style |
|---|---|
| Central plaza | Open court and a monument, mid and long range |
| Industrial yard | Crates and pallets, close alleys |
| River dock | A channel and piers on the north side, narrow flanks |

Force a map with `?map=plaza|yards|docks`. Fire has stronger recoil and FOV kick. Kills have a break confirmation and a sound.

You and your allies are red. Enemies are blue. **About five per team** (you plus four allies). No friendly fire. AI seeks cover when shot, flanks by angle, and alternates suppress / push in pairs. Red allies push. Tracers are visible (blue / red). The HUD **kill** count is only your own kills.

Bullets do not pass through solid walls or cover (glass and decoration do not block). A head hit is a headshot, ×2, with its own marker and sound. The HUD points at the fight and shows which side you were hit from.

## Modes

- **Assault:** about five per side; **3 respawns**; **killstreaks** (×3 spot, ×5 supply, ×7 area suppression); allies can push the objective; blue waves; kill feed and streak HUD.
- **Mini battle royale:** about five per side; a **white circle** previews the next safe zone; shrinking zone and rising outside damage; **staged airdrops**; AI outside the zone falls back; **clear every blue player** to win (losing allies does not lose the match).

## Controls

| Key | Action |
|---|---|
| WASD | Move |
| Left click | Fire |
| Right click | Aim |
| R | Reload (empty mag reloads in about 3 seconds) |
| Q / E | Hold to lean |
| Z | Hold to crouch |
| H | Call for help |
| Shift | Sprint |
| Space | Jump |
| 1–5 | Select a weapon you already hold |
| Wheel | Cycle held weapons |
| Esc | Release pointer / pause |

## Layout

```
index.html
css/styles.css
js/         # loop, player, weapons, AI, modes
vendor/     # Three.js r160 + PointerLockControls
```

## Run

From the repository root:

```bash
python -m http.server 8080
```

Open <http://localhost:8080/games/fps/>.

Use a desktop browser with WebGL. Serve over HTTP; do not open the file with `file://`.

## Notes

Hits flash, bodies fade, and the crosshair sparks. There is no gore. Enemies are local scripted AI, not an online match.
