# Repository instructions

## Project structure and architecture

This is a dependency-free browser game built with vanilla HTML, CSS, and JavaScript; there is no bundler or application framework.

- `index.html` owns the Japanese page content, game shell, HUD, start/end overlay, and touch controls. Its element IDs and `data-control` attributes are queried by `script.js`; keep these hooks synchronized when changing the UI.
- `script.js` owns input, game state, simulation, and rendering. Its animation loop updates player physics, collisions, enemies, coins, score, stamina, and camera position, then draws the scrolling world to `#game`. Level platforms, coin positions, and enemy patrol ranges are data arrays near the top of the file.
- `style.css` styles the page and game UI, including responsive layout and touch controls. The canvas uses a 960×540 logical coordinate space and its displayed dimensions preserve a 16:9 ratio. World positions are converted to screen positions by subtracting `cameraX` during drawing.

The game loop uses elapsed frame time for simulation and cooldowns; do not make gameplay depend on a fixed refresh rate. Sound effects are synthesized with the Web Audio API after a user gesture, so keep audio browser-native and dependency-free. Game states, overlays, and HUD values are coordinated by `script.js`; use the existing reset and finish flow when adding game outcomes.

## Build, test, and lint

There is no package manifest, build command, automated test suite, or linter. Open `index.html` directly in a browser to run the game. For a single-file JavaScript syntax check, run:

```sh
node --check script.js
```

This check does not exercise gameplay or browser rendering; verify gameplay changes in a browser.

## Repository conventions

- Keep the game dependency-free and use browser APIs directly; `script.js` is loaded with `defer`.
- Keep input, simulation, and canvas rendering in `script.js`; use semantic HTML for accessible controls and CSS for their presentation.
- Keyboard controls are arrows or A/D to move, Space/Up/W to jump, and X/J to attack. Touch buttons use `data-control` values handled by the same input logic.
- Keep player-facing copy in Japanese. `setOverlay` uses fixed HTML for line breaks in titles; put dynamic messages in text content rather than interpolating them as HTML.
- 説明は日本語で表示してください。
- Keep platforms, coins, and enemy placement/patrol ranges in the existing data arrays so level layout changes do not require edits to drawing logic.
- Keep drawing in the canvas's 960×540 logical coordinate space and account for elapsed time in movement and timed effects.
