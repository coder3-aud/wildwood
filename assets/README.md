# Wildwood sprites

Replace a PNG with your own art under the **same filename**, then reload the
game. Sprites are drawn at their listed sizes; replacement images can use
different dimensions and will be scaled to fit. Transparent backgrounds work
best for characters, objects, and item icons.

| Files | Used for | Default size |
| --- | --- | --- |
| `tile024.png` | All forest floor tiles | 32 × 32 |
| `Overworld_Tileset.png` | Source sheet for the editor's split tiles | 288 × 208 |
| [`overworld-parts/`](./overworld-parts/) | Individual 16 × 16 source parts, each scaled to fill one editor tile | 16 × 16 source; 32 × 32 placed |
| `tree-green.png`, `tree-orange.png` | Generated 2 × 3 tile trees | 64 × 96 |
| `tile092^2.png` through `tile094^2.png` | Mineable rocks, jumpable | 32 × 32 |
| `tile058^2.png`, `tile059^2.png` | Solid bushes | 32 × 32 |
| `stone-block.png` | Placeable stone blocks | 32 × 32 |
| `enemy.png` | Ground enemies | 32 × 32 |
| `flying-enemy.png` | Flying enemy body | 32 × 32 |
| `flying-wings.png` | Animated flying enemy wings | 40 × 12 |
| `player.png` | Player on the ground | 32 × 32 |
| `player-jump.png` | Player at the jump apex | 32 × 32 |
| `sword.png`, `spear.png`, `axe.png` | Inventory and pickup icons | 40 × 40 |
| `apple.png`, `berries.png` | Inventory and pickup icons | 40 × 40 |

The 234 16 × 16 parts from the tileset are available independently in the
editor. Each is scaled to fill one 32 × 32 world tile. Generated trees use the
green design 80% of the time and the orange design 20% of the time. Each spans
two columns by three rows: the bottom two tiles are solid, while the top four
are passable and draw over the player. Use the map editor's **Tree spawning**
slider to set their share of object spawns, then generate a new world to apply
it.

If a sprite file is missing or cannot be loaded, the game falls back to its
built-in drawing for that sprite.

## Custom map art

Put additional images in [`editor-assets/`](./editor-assets/), then open the
map editor and choose **Load / refresh art folder**. Select that folder to
load its images into the custom-art palette. Refresh after changing its
contents. You can also import image files directly from the editor.

Custom art accepts image formats the browser can decode, including PNG,
JPEG, WebP, GIF, BMP, AVIF, and SVG. Images are fitted without cropping to a
transparent 128 × 128 pixel canvas, then scaled to one 32 × 32 world tile.
