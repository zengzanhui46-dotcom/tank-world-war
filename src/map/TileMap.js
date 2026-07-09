import { TILE_SIZE, MAP_COLS, MAP_ROWS, TILE_TYPES } from '../config.js';
import { TileProperties } from './TileType.js';

export default class TileMap {
  constructor(scene, levelData) {
    this.scene = scene;
    this.levelData = levelData;
    this.tiles = levelData.tiles; // 2D array [row][col]
    this.tileSprites = [];        // 2D array of sprite objects
    this.tileBodies = [];         // 2D array of physics bodies
    this.wallGroup = scene.physics.add.staticGroup();
    this.grassGroup = scene.add.group();
    this.waterGroup = scene.add.group();
  }

  build() {
    for (let row = 0; row < MAP_ROWS; row++) {
      this.tileSprites[row] = [];
      this.tileBodies[row] = [];
      for (let col = 0; col < MAP_COLS; col++) {
        const tileType = this.tiles[row][col];
        const props = TileProperties[tileType];
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;

        // Create the visual sprite
        let sprite;
        if (tileType === TILE_TYPES.GRASS) {
          // Grass renders above everything
          sprite = this.scene.add.image(x, y, props.texture);
          sprite.setDepth(100);
          this.grassGroup.add(sprite);
        } else if (tileType === TILE_TYPES.WATER) {
          // Water is on ground layer
          sprite = this.scene.add.image(x, y, props.texture);
          sprite.setDepth(0);
          this.waterGroup.add(sprite);
        } else {
          sprite = this.scene.add.image(x, y, props.texture);
          sprite.setDepth(0);
        }

        this.tileSprites[row][col] = sprite;

        // Create physics body for non-walkable tiles
        if (!props.walkable) {
          const wall = this.wallGroup.create(x, y, props.texture);
          wall.setVisible(false);
          wall.body.setSize(TILE_SIZE, TILE_SIZE);
          wall.refreshBody();
          this.tileBodies[row][col] = wall;
        } else {
          this.tileBodies[row][col] = null;
        }
      }
    }
  }

  getTileAt(col, row) {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) {
      return null;
    }
    return this.tiles[row][col];
  }

  getTileAtPixel(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    return this.getTileAt(col, row);
  }

  getTilePropertiesAt(col, row) {
    const tile = this.getTileAt(col, row);
    if (tile === null) return null;
    return TileProperties[tile];
  }

  destroyTileAt(col, row) {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return;
    if (this.tiles[row][col] === TILE_TYPES.STEEL) return; // Cannot destroy steel

    // Update tile data
    this.tiles[row][col] = TILE_TYPES.EMPTY;

    // Update visuals
    if (this.tileSprites[row][col]) {
      this.tileSprites[row][col].setTexture('tile_empty');
    }

    // Remove physics body
    if (this.tileBodies[row][col]) {
      this.tileBodies[row][col].destroy();
      this.tileBodies[row][col] = null;
    }

    // Update wall group
    this.wallGroup.refresh();
  }

  isWalkable(col, row) {
    const props = this.getTilePropertiesAt(col, row);
    if (!props) return false;
    return props.walkable;
  }

  isBulletPassable(col, row) {
    const props = this.getTilePropertiesAt(col, row);
    if (!props) return false;
    return props.bulletPass;
  }

  isDestructible(col, row) {
    const props = this.getTilePropertiesAt(col, row);
    if (!props) return false;
    return props.destructible;
  }

  isSlippery(col, row) {
    const props = this.getTilePropertiesAt(col, row);
    if (!props) return false;
    return props.slippery;
  }

  /**
   * Check if a rectangular area (tank) collides with any non-walkable tile.
   * Returns the direction(s) that would need to be blocked.
   */
  checkCollision(x, y, width, height) {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;

    const leftCol = Math.floor(left / TILE_SIZE);
    const rightCol = Math.floor(right / TILE_SIZE);
    const topRow = Math.floor(top / TILE_SIZE);
    const bottomRow = Math.floor(bottom / TILE_SIZE);

    const collisions = { up: false, down: false, left: false, right: false };

    for (let row = topRow; row <= bottomRow; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        if (!this.isWalkable(col, row)) {
          // Determine which side is colliding
          const tileLeft = col * TILE_SIZE;
          const tileRight = (col + 1) * TILE_SIZE;
          const tileTop = row * TILE_SIZE;
          const tileBottom = (row + 1) * TILE_SIZE;

          // Check overlap on each side
          if (right > tileLeft && left < tileLeft) collisions.right = true;
          if (left < tileRight && right > tileRight) collisions.left = true;
          if (bottom > tileTop && top < tileTop) collisions.down = true;
          if (top < tileBottom && bottom > tileBottom) collisions.up = true;

          // Full overlap
          if (left < tileRight && right > tileLeft && top < tileBottom && bottom > tileTop) {
            const overlapLeft = right - tileLeft;
            const overlapRight = tileRight - left;
            const overlapTop = bottom - tileTop;
            const overlapBottom = tileBottom - top;

            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapLeft) collisions.right = true;
            else if (minOverlap === overlapRight) collisions.left = true;
            else if (minOverlap === overlapTop) collisions.down = true;
            else if (minOverlap === overlapBottom) collisions.up = true;
          }
        }
      }
    }

    return collisions;
  }

  destroy() {
    this.wallGroup.clear(true, true);
    this.grassGroup.clear(true, true);
    this.waterGroup.clear(true, true);
    this.tileSprites.flat().forEach(s => s && s.destroy());
  }
}
