# Wildwood sprites

Replace a PNG with your own art under the **same filename**, then reload the
game. Sprites are drawn at their listed sizes; replacement images can use
different dimensions and will be scaled to fit. Transparent backgrounds work
best for characters, objects, and item icons.

| Files | Used for | Default size |
| --- | --- | --- |
| `ground-0.png` through `ground-3.png` | Forest floor tile variations | 32 × 32 |
| `tree.png` | Trees | 48 × 48 |
| `rock.png` | Mineable rocks | 32 × 32 |
| `grass.png` | Grass tufts | 24 × 24 |
| `stone-block.png` | Placeable stone blocks | 32 × 32 |
| `enemy.png` | Ground enemies | 32 × 32 |
| `flying-enemy.png` | Flying enemy body | 32 × 32 |
| `flying-wings.png` | Animated flying enemy wings | 40 × 12 |
| `player.png` | Player on the ground | 32 × 32 |
| `player-jump.png` | Player at the jump apex | 32 × 32 |
| `sword.png`, `spear.png`, `axe.png` | Inventory and pickup icons | 40 × 40 |
| `apple.png`, `berries.png` | Inventory and pickup icons | 40 × 40 |

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
