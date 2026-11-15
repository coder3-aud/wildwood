# Wildwood

Wildwood is a browser-based canvas game. Run it from a local HTTP server so the
browser can load the JavaScript modules:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Entity models are in [`js/entities/`](./js/entities/), while `game.js` owns the
game loop, canvas rendering, and browser UI.
