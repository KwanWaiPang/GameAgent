[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Go

Browser Go with local two-player play and an in-browser AI. Chinese rules (area scoring: stones and empty points both count).

## Features

- Boards: 9, 13, and 19
- Handicap: 2–9 stones (at most 5 on 9×9), standard stars, White plays first, default komi 0
- Two humans, record review (move numbers on stones), or human vs AI as Black or White
- Sixteen strengths, from 25 kyu to 9 dan (default 6 kyu)
  - 25 kyu to 1 kyu: local search. Weak ranks play loosely on purpose. Monte Carlo from 10 kyu. 3 kyu reads captures. 1 kyu searches the longest.
  - 1 dan to 9 dan: a KataGo model, the same engine family as Web KaTrain, computed in the browser. Higher dan searches more. A 9 dan move can take tens of seconds.
- Model commentary: 1–9 dan can estimate the loss of each move. Lower ranks do not run it automatically. Moves the search never saw are not judged. In a record you can ask the model about the previous move.
- Graded practice: 15 kyu-style problem ranks, all with a checkable solution. Levels 1–3 are original and expanded. Levels 4–9 are weekly problems. Levels 10–15 are solved problems from Gokyo Shumyo, Xuanxuan Qijing, and Xuanlan on u-go.net. Endgame has eight ranks. You can change rank at any time.
- Classical 19×19 games, searchable by player, rank, and era. Replay step by step, scrub, autoplay (pausing on comments), jump by clicking a stone, guess the next move, or play one side. Two wrong guesses are remembered for later practice.
- Rules: capture, no suicide, simple ko (no immediate recapture)
- During a game you can auto-mark dead stones or confirm the score. Dead-stone judgment can use a heuristic or the KataGo model (falling back to the heuristic). Two consecutive passes also enter scoring.
- Pass, resign, undo, and stone sounds

## Layout

```
index.html      # entry
css/styles.css
js/engine.js    # rules
js/ai.js        # local AI
js/app.js
js/drill.js
js/problems.js
js/kifu.js
js/kifu-play.js
tools/build-problems.mjs
tools/build-kifu.mjs
```

## Run

From the repository root:

```bash
python -m http.server 8080
```

Open <http://localhost:8080/games/go/>.

## Notes

25 kyu through 1 kyu use classic in-browser search. 1 dan through 9 dan use KataGo's public small network `g170-b6c96`, via the Web KaTrain browser port. The first download is about 4 MB and the computation stays in the player's browser. The full large network is about 96 MB and its public host does not allow other pages to fetch it, so the high dans use this small network.

Problem levels 4–9 are the Go Game Guru weekly problems by An Younggil 8 dan and David Ormerod, CC BY-NC-SA 4.0. Levels 10–15 and the endgame problems are public-domain classical material with marked solutions. Modern problem sets that cannot be redistributed are not included. Each problem states its goal first; coordinates and reasons are behind “hint”. If the record has a reply, the opponent plays it. “Classical games” are full 19×19 games, separate from local problems.
