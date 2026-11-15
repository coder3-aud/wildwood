export const TREE_WIDTH_TILES = 2;
export const TREE_HEIGHT_TILES = 3;

export class Tree {
  constructor(rootIndex, variant = 0) {
    this.rootIndex = rootIndex;
    this.variant = variant;
  }

  forEachFootprintCell(mapColumns, callback) {
    const baseRow = Math.floor(this.rootIndex / mapColumns);
    const baseColumn = this.rootIndex % mapColumns;
    for (let row = baseRow - TREE_HEIGHT_TILES + 1; row <= baseRow; row += 1) {
      for (let column = baseColumn; column < baseColumn + TREE_WIDTH_TILES; column += 1) {
        callback(row * mapColumns + column, row, column);
      }
    }
  }

  toSaveEntry() {
    return [this.rootIndex, this.variant];
  }

  static fromSaveEntry([rootIndex, variant]) {
    return new Tree(rootIndex, variant);
  }
}
