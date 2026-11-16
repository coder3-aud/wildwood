# Wildwood

Wildwood is a browser-based canvas game. Run it from a local HTTP server so the
browser can load the JavaScript modules:

On macOS, double-click [`run-game.command`](./run-game.command) to start the
server and open the game in Google Chrome. Leave the terminal window open while
playing; closing it stops the server.

To start the server manually:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://localhost:8000>.

Entity models are in [`js/entities/`](./js/entities/), while `game.js` owns the
game loop, canvas rendering, and browser UI.
