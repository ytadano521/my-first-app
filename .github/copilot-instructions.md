# Repository instructions

## Project structure and architecture

This is a dependency-free browser game built with vanilla HTML, CSS, and JavaScript; there is no bundler or application framework.

- `index.html` owns the Japanese page content, game shell, HUD, start/end overlay, and touch controls. Its element IDs and `data-control` attributes are queried by `script.js`.
- `script.js` owns the game state and loop. It updates player physics and collisions, camera position, and coin collection, then draws the scrolling world and player to the `#game` canvas. Level geometry and coin locations are data arrays near the top of the file.
- `style.css` styles the page and game UI, including responsive layout and touch controls. The canvas uses a 960×540 logical coordinate space; its displayed dimensions preserve the 16:9 ratio.

Keep the HTML hooks used by JavaScript in sync when changing the UI. Keep canvas drawing in the logical canvas coordinate space, and account for elapsed frame time in game updates rather than assuming every animation frame is identical.

## Build, test, and lint

There is no package manifest, build command, configured test suite, or linter. Open `index.html` directly in a browser to run the game. To check JavaScript syntax, run:

```sh
node --check script.js
```

This syntax check does not exercise gameplay or browser rendering.

## Repository conventions

- Keep the game dependency-free and use browser APIs directly; `script.js` is loaded with `defer`.
- Keep player input, simulation, and canvas rendering in the game script; use HTML for accessible UI controls and CSS for their presentation.
- The game and its UI copy are Japanese. Preserve that language for player-facing text.
- Display explanations and responses in Japanese.
- Keep level platforms and collectible positions in the existing data-driven arrays so layout changes do not require editing drawing logic.
