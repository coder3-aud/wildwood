# Custom map art

Put custom image files in this folder, then open the map editor and choose
**Load / refresh art folder**. Select this folder to add its images to the
editor palette. Refresh after adding or removing files.

The editor accepts image formats the browser can decode, including PNG, JPEG,
WebP, GIF, BMP, AVIF, and SVG. Each image is fitted, without cropping, to a
transparent 128 × 128 pixel canvas. Custom art is then scaled to one 32 × 32
world tile when placed. Keeping source art at 128 × 128 pixels gives the
clearest results.

Select a custom image in the editor to configure its optional collision
hitbox. Drag on the preview to draw the box, or enter its X, Y, width, and
height in 128 × 128 art pixels. Enable **Solid to player and ground enemies**
to make that box block movement. The hitbox settings apply to every placed
instance of that image while the current world is open.

Alternatively, choose **Import image files** in the editor to load images
from anywhere on your computer for the current browser session.
