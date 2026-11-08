"use strict";

(() => {
  const TILE_SIZE = 32;
  const MAP_COLUMNS = 80;
  const MAP_ROWS = 80;
  const PLAYER_RADIUS = 10;
  const PLAYER_SPEED = 190;
  const PLAYER_MAX_HEALTH = 100;
  const PLAYER_MAX_STAMINA = 100;
  const CAULDRON_INGREDIENTS_TO_BREW = 3;
  const CAULDRON_HEALING_PER_INGREDIENT = PLAYER_MAX_HEALTH / 4;
  const DAMAGE_BOOST_DURATION = 3;
  const INVINCIBILITY_DURATION = 5;
  const INFINITE_STAMINA_DURATION = 10;
  const JUMP_STAMINA_COST = PLAYER_MAX_STAMINA / 8;
  const DASH_STAMINA_COST = PLAYER_MAX_STAMINA / 4;
  const DASH_DURATION = 0.2;
  const DASH_SPEED_MULTIPLIER = 3;
  const STAMINA_REGEN_DELAY = 1;
  const STAMINA_REGEN_RATE = 35;
  const INVENTORY_SLOT_COUNT = 8;
  const MAX_FOOD_STACK = 5;
  const ENEMY_MAX_HEALTH = 60;
  const ENEMY_RADIUS = 8;
  const ENEMY_SPEED = 58;
  const ENEMY_DAMAGE = 6;
  const ENEMY_SWING_DURATION = 0.55;
  const FLYING_ENEMY_CHANCE = 0.3;
  const FOG_SCALE = 0.25;
  const FOV_EDGE_FADE_START = 0.9;
  const JUMP_DURATION = 0.55;
  const JUMP_HEIGHT = 24;
  const SWORD_RANGE = 48;
  const SWORD_COOLDOWN = 0.42;
  const SWORD_SWING_DURATION = 0.28;
  const STONE_BUILD_RANGE = TILE_SIZE * 5;
  const ENEMY_SPAWN_INTERVAL = 5;
  const MAX_ENEMIES = 7;
  const OBSTACLE_NONE = 0;
  const OBSTACLE_TREE = 1;
  const OBSTACLE_ROCK = 2;
  const OBSTACLE_GRASS = 3;
  const OBSTACLE_STONE = 4;
  const GROUND_COLORS = ["#557b45", "#587f47", "#527641", "#5b8049"];
  const WEAPONS = {
    sword: { name: "Sword", damage: 35, range: SWORD_RANGE, cooldown: SWORD_COOLDOWN, icon: "S" },
    spear: { name: "Spear", damage: 25, range: 68, cooldown: 0.5, icon: "P" },
    axe: { name: "Axe", damage: 50, range: 42, cooldown: 0.68, icon: "A" },
  };
  const FOODS = {
    berries: { name: "Berries", healing: 20, icon: "B" },
    apple: { name: "Apple", healing: 35, icon: "F" },
  };
  const canvas = document.querySelector("#game");
  const context = canvas.getContext("2d");
  const minimapCanvas = document.querySelector("#minimap");
  const minimapContext = minimapCanvas.getContext("2d");
  const minimapTerrain = document.createElement("canvas");
  minimapTerrain.width = minimapCanvas.width;
  minimapTerrain.height = minimapCanvas.height;
  const minimapTerrainContext = minimapTerrain.getContext("2d");
  const worldFog = document.createElement("canvas");
  worldFog.width = MAP_COLUMNS * TILE_SIZE * FOG_SCALE;
  worldFog.height = MAP_ROWS * TILE_SIZE * FOG_SCALE;
  const worldFogContext = worldFog.getContext("2d");
  worldFogContext.imageSmoothingEnabled = true;
  const coordinatesLabel = document.querySelector("#player-coordinates");
  const newWorldButton = document.querySelector("#new-world");

  const keysDown = new Set();
  const enemies = [];
  const inventory = Array(INVENTORY_SLOT_COUNT).fill(null);
  const pickups = [];
  const player = {
    x: 0,
    y: 0,
    facingX: 0,
    facingY: 1,
    isJumping: false,
    jumpElapsed: 0,
    lastSafeX: 0,
    lastSafeY: 0,
    health: PLAYER_MAX_HEALTH,
    stamina: PLAYER_MAX_STAMINA,
    stationaryTime: 0,
    dashTime: 0,
    dashX: 0,
    dashY: 0,
    stones: 0,
    selectedSlot: 0,
    weaponCooldown: 0,
    swordSwing: 0,
    swingDuration: SWORD_SWING_DURATION,
    swingWeaponId: "sword",
    cauldronIngredients: [],
    healingTowardIngredient: 0,
    damageBoostTime: 0,
    invincibilityTime: 0,
    infiniteStaminaTime: 0,
    shieldRaised: false,
  };
  let world;
  let viewWidth = 0;
  let viewHeight = 0;
  let currentCameraX = 0;
  let currentCameraY = 0;
  let mouseWorldX = 0;
  let mouseWorldY = 0;
  let previousFrame = 0;
  let enemySpawnTimer = 0;

  function normalizeKey(key) {
    return key.length === 1 ? key.toLowerCase() : key;
  }

  function updateMouseWorldPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    mouseWorldX = currentCameraX + (event.clientX - bounds.left) * viewWidth / bounds.width;
    mouseWorldY = currentCameraY + (event.clientY - bounds.top) * viewHeight / bounds.height;
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createWorld(seed) {
    const random = createRandom(seed);
    const ground = new Uint8Array(MAP_COLUMNS * MAP_ROWS);
    const objects = new Uint8Array(MAP_COLUMNS * MAP_ROWS);
    const spawnColumn = Math.floor(MAP_COLUMNS / 2);
    const spawnRow = Math.floor(MAP_ROWS / 2);

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const index = row * MAP_COLUMNS + column;
        const distanceFromSpawn = Math.hypot(column - spawnColumn, row - spawnRow);

        ground[index] = Math.floor(random() * GROUND_COLORS.length);

        if (distanceFromSpawn < 3 || random() > 0.13) {
          continue;
        }

        const objectRoll = random();
        objects[index] = objectRoll < 0.42
          ? OBSTACLE_TREE
          : objectRoll < 0.72
            ? OBSTACLE_ROCK
            : OBSTACLE_GRASS;
      }
    }

    const pickups = [];
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const index = row * MAP_COLUMNS + column;
        const distanceFromSpawn = Math.hypot(column - spawnColumn, row - spawnRow);
        if (
          distanceFromSpawn < 5
          || (objects[index] !== OBSTACLE_NONE && objects[index] !== OBSTACLE_GRASS)
          || random() > 0.004
        ) {
          continue;
        }

        const roll = random();
        const id = roll < 0.25
          ? "spear"
          : roll < 0.45
            ? "axe"
            : roll < 0.73
              ? "berries"
              : "apple";
        pickups.push({
          x: column * TILE_SIZE + TILE_SIZE / 2,
          y: row * TILE_SIZE + TILE_SIZE / 2,
          id,
        });
      }
    }

    return { ground, objects, pickups };
  }

  function createSeed() {
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0];
    }
    return Math.floor(Math.random() * 0xffffffff);
  }

  function startNewWorld() {
    const seed = createSeed();
    world = createWorld(seed);
    pickups.length = 0;
    pickups.push(...world.pickups);
    inventory.fill(null);
    inventory[0] = { type: "weapon", id: "sword" };
    enemies.length = 0;
    drawMinimapTerrain();
    player.x = Math.floor(MAP_COLUMNS / 2) * TILE_SIZE + TILE_SIZE / 2;
    player.y = Math.floor(MAP_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2;
    player.facingX = 0;
    player.facingY = 1;
    player.isJumping = false;
    player.jumpElapsed = 0;
    player.lastSafeX = player.x;
    player.lastSafeY = player.y;
    player.health = PLAYER_MAX_HEALTH;
    player.stamina = PLAYER_MAX_STAMINA;
    player.stationaryTime = 0;
    player.dashTime = 0;
    player.dashX = 0;
    player.dashY = 0;
    player.stones = 0;
    player.selectedSlot = 0;
    player.weaponCooldown = 0;
    player.swordSwing = 0;
    player.swingDuration = SWORD_SWING_DURATION;
    player.swingWeaponId = "sword";
    player.cauldronIngredients = [];
    player.healingTowardIngredient = 0;
    player.damageBoostTime = 0;
    player.invincibilityTime = 0;
    player.infiniteStaminaTime = 0;
    player.shieldRaised = false;
    mouseWorldX = player.x + player.facingX * TILE_SIZE;
    mouseWorldY = player.y + player.facingY * TILE_SIZE;
    enemySpawnTimer = 0;
    resetMinimapExploration();
    spawnEnemy();
    spawnEnemy(true);
  }

  function drawMinimapTerrain() {
    const tileWidth = minimapTerrain.width / MAP_COLUMNS;
    const tileHeight = minimapTerrain.height / MAP_ROWS;

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const index = row * MAP_COLUMNS + column;
        const object = world.objects[index];
        minimapTerrainContext.fillStyle = object === OBSTACLE_TREE
          ? "#315239"
          : object === OBSTACLE_ROCK
            ? "#9ba394"
            : object === OBSTACLE_STONE
              ? "#777f75"
                : object === OBSTACLE_GRASS
                  ? "#a2b96a"
                  : GROUND_COLORS[world.ground[index]];
        minimapTerrainContext.fillRect(
          column * tileWidth,
          row * tileHeight,
          tileWidth,
          tileHeight,
        );
      }
    }
  }

  function drawMinimap() {
    minimapContext.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    minimapContext.drawImage(minimapTerrain, 0, 0);
    minimapContext.drawImage(worldFog, 0, 0, minimapCanvas.width, minimapCanvas.height);

    const playerX = (player.x / (MAP_COLUMNS * TILE_SIZE)) * minimapCanvas.width;
    const playerY = (player.y / (MAP_ROWS * TILE_SIZE)) * minimapCanvas.height;
    minimapContext.fillStyle = "#f3d37a";
    minimapContext.strokeStyle = "#17251c";
    minimapContext.lineWidth = 2;
    minimapContext.beginPath();
    minimapContext.arc(playerX, playerY, 4, 0, Math.PI * 2);
    minimapContext.fill();
    minimapContext.stroke();

    const column = Math.floor(player.x / TILE_SIZE) + 1;
    const row = Math.floor(player.y / TILE_SIZE) + 1;
    coordinatesLabel.textContent = `X ${column} · Y ${row}`;
  }

  function drawWorldFog(cameraX, cameraY) {
    context.drawImage(
      worldFog,
      cameraX * FOG_SCALE,
      cameraY * FOG_SCALE,
      viewWidth * FOG_SCALE,
      viewHeight * FOG_SCALE,
      0,
      0,
      viewWidth,
      viewHeight,
    );
    drawViewportVignette();
  }

  function drawViewportVignette() {
    if (viewWidth === 0 || viewHeight === 0) {
      return;
    }

    context.save();
    context.translate(viewWidth / 2, viewHeight / 2);
    context.scale(viewWidth / 2, viewHeight / 2);
    const vignette = context.createRadialGradient(0, 0, 0, 0, 0, Math.SQRT2);
    vignette.addColorStop(0, "rgb(0 0 0 / 0%)");
    vignette.addColorStop(0.6, "rgb(0 0 0 / 0%)");
    vignette.addColorStop(0.707, "rgb(0 0 0 / 4%)");
    vignette.addColorStop(0.9, "rgb(0 0 0 / 12%)");
    vignette.addColorStop(1, "rgb(0 0 0 / 22%)");
    context.fillStyle = vignette;
    context.fillRect(-1, -1, 2, 2);
    context.restore();
  }

  function revealWorldArea() {
    const playerX = player.x * FOG_SCALE;
    const playerY = player.y * FOG_SCALE;
    const visionRadius = Math.hypot(viewWidth, viewHeight) * 0.5 * FOG_SCALE;
    if (visionRadius === 0) {
      return;
    }
    const vision = worldFogContext.createRadialGradient(
      playerX,
      playerY,
      visionRadius * FOV_EDGE_FADE_START,
      playerX,
      playerY,
      visionRadius,
    );
    vision.addColorStop(0, "rgba(0, 0, 0, 1)");
    vision.addColorStop(1, "rgba(0, 0, 0, 0)");
    worldFogContext.globalCompositeOperation = "destination-out";
    worldFogContext.fillStyle = vision;
    worldFogContext.fillRect(
      playerX - visionRadius,
      playerY - visionRadius,
      visionRadius * 2,
      visionRadius * 2,
    );
    worldFogContext.globalCompositeOperation = "source-over";
  }

  function resetMinimapExploration() {
    worldFogContext.globalCompositeOperation = "source-over";
    worldFogContext.fillStyle = "rgb(10 17 13 / 88%)";
    worldFogContext.fillRect(0, 0, worldFog.width, worldFog.height);
    revealWorldArea();
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    viewWidth = bounds.width;
    viewHeight = bounds.height;
    canvas.width = Math.round(viewWidth * pixelRatio);
    canvas.height = Math.round(viewHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function getObjectAt(column, row) {
    if (column < 0 || row < 0 || column >= MAP_COLUMNS || row >= MAP_ROWS) {
      return OBSTACLE_TREE;
    }
    return world.objects[row * MAP_COLUMNS + column];
  }

  function isBlockedAt(x, y, jumping = player.isJumping, radius = PLAYER_RADIUS) {
    const minColumn = Math.floor((x - radius) / TILE_SIZE);
    const maxColumn = Math.floor((x + radius) / TILE_SIZE);
    const minRow = Math.floor((y - radius) / TILE_SIZE);
    const maxRow = Math.floor((y + radius) / TILE_SIZE);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const obstacle = getObjectAt(column, row);
        if (
          obstacle === OBSTACLE_TREE
          || obstacle === OBSTACLE_STONE
          || (obstacle === OBSTACLE_ROCK && !jumping)
        ) {
          const left = column * TILE_SIZE + 5;
          const top = row * TILE_SIZE + 5;
          const closestX = Math.max(left, Math.min(x, left + TILE_SIZE - 10));
          const closestY = Math.max(top, Math.min(y, top + TILE_SIZE - 10));
          const distanceX = x - closestX;
          const distanceY = y - closestY;
          if (distanceX * distanceX + distanceY * distanceY < radius * radius) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function spawnEnemy(forceFlying = false) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 260 + Math.random() * 180;
      const x = Math.max(
        ENEMY_RADIUS,
        Math.min(MAP_COLUMNS * TILE_SIZE - ENEMY_RADIUS, player.x + Math.cos(angle) * distance),
      );
      const y = Math.max(
        ENEMY_RADIUS,
        Math.min(MAP_ROWS * TILE_SIZE - ENEMY_RADIUS, player.y + Math.sin(angle) * distance),
      );
      const airborne = forceFlying || Math.random() < FLYING_ENEMY_CHANCE;
      const isBlocked = airborne
        ? isBlockedForFlyingEnemy(x, y)
        : isBlockedAt(x, y, false, ENEMY_RADIUS);
      if (Math.hypot(x - player.x, y - player.y) < 200 || isBlocked) {
        continue;
      }

      enemies.push({
        x,
        y,
        airborne,
        hoverPhase: Math.random() * Math.PI * 2,
        health: ENEMY_MAX_HEALTH,
        attackCooldown: 0,
        swingTime: 0,
        swingAngle: 0,
      });
      return;
    }
  }

  function isBlockedForFlyingEnemy(x, y) {
    if (
      x < ENEMY_RADIUS
      || y < ENEMY_RADIUS
      || x >= MAP_COLUMNS * TILE_SIZE - ENEMY_RADIUS
      || y >= MAP_ROWS * TILE_SIZE - ENEMY_RADIUS
    ) {
      return true;
    }

    const minColumn = Math.floor((x - ENEMY_RADIUS) / TILE_SIZE);
    const maxColumn = Math.floor((x + ENEMY_RADIUS) / TILE_SIZE);
    const minRow = Math.floor((y - ENEMY_RADIUS) / TILE_SIZE);
    const maxRow = Math.floor((y + ENEMY_RADIUS) / TILE_SIZE);
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        if (getObjectAt(column, row) === OBSTACLE_STONE) {
          return true;
        }
      }
    }
    return false;
  }

  function getPlayerJumpHeight() {
    return player.isJumping
      ? Math.sin((player.jumpElapsed / JUMP_DURATION) * Math.PI) * JUMP_HEIGHT
      : 0;
  }

  function faceWorldPoint(x, y) {
    const directionX = x - player.x;
    const directionY = y - player.y;
    const distance = Math.hypot(directionX, directionY);
    if (distance > 0) {
      player.facingX = directionX / distance;
      player.facingY = directionY / distance;
    }
  }

  function getShieldAngle() {
    const directionX = mouseWorldX - player.x;
    const directionY = mouseWorldY - player.y;
    return Math.hypot(directionX, directionY) > 0
      ? Math.atan2(directionY, directionX)
      : Math.atan2(player.facingY, player.facingX);
  }

  function isEnemyBlockedByShield(enemy) {
    if (!player.shieldRaised) {
      return false;
    }

    const directionX = enemy.x - player.x;
    const directionY = enemy.y - player.y;
    const distance = Math.hypot(directionX, directionY);
    if (distance === 0) {
      return true;
    }

    const shieldAngle = getShieldAngle();
    const facingX = Math.cos(shieldAngle);
    const facingY = Math.sin(shieldAngle);
    return (directionX * facingX + directionY * facingY) / distance >= 0;
  }

  function beginSwordSwing() {
    const selectedItem = inventory[player.selectedSlot];
    if (
      player.health <= 0
      || player.weaponCooldown > 0
      || selectedItem?.type !== "weapon"
    ) {
      return false;
    }

    const weapon = WEAPONS[selectedItem.id];
    player.weaponCooldown = weapon.cooldown;
    player.swingDuration = SWORD_SWING_DURATION;
    player.swingWeaponId = selectedItem.id;
    player.swordSwing = player.swingDuration;
    return true;
  }

  function getSelectedWeapon() {
    const selectedItem = inventory[player.selectedSlot];
    return selectedItem?.type === "weapon" ? WEAPONS[selectedItem.id] : null;
  }

  function addCauldronIngredient(ingredient) {
    if (player.cauldronIngredients.length >= CAULDRON_INGREDIENTS_TO_BREW) {
      return;
    }

    player.cauldronIngredients.push(ingredient);
    if (player.cauldronIngredients.length === CAULDRON_INGREDIENTS_TO_BREW) {
      const recipe = player.cauldronIngredients.slice();
      player.cauldronIngredients = [];
      if (recipe.every((action) => action === "hit")) {
        player.damageBoostTime = DAMAGE_BOOST_DURATION;
      } else if (recipe.every((action) => action === "block")) {
        player.invincibilityTime = INVINCIBILITY_DURATION;
      } else if (recipe.every((action) => action === "heal")) {
        player.infiniteStaminaTime = INFINITE_STAMINA_DURATION;
        player.stamina = PLAYER_MAX_STAMINA;
      }
    }
  }

  function attackWithWeapon(x, y) {
    const selectedItem = inventory[player.selectedSlot];
    if (selectedItem?.type === "food") {
      consumeSelectedFood();
      return;
    }

    faceWorldPoint(x, y);
    if (!beginSwordSwing()) {
      return;
    }

    const weapon = getSelectedWeapon();
    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      const enemy = enemies[index];
      const offsetX = enemy.x - player.x;
      const offsetY = enemy.y - player.y;
      const distance = Math.hypot(offsetX, offsetY);
      const facingDot = distance === 0
        ? 1
        : (offsetX * player.facingX + offsetY * player.facingY) / distance;
      if (
        distance > weapon.range
        || facingDot < 0.15
        || (enemy.airborne && getPlayerJumpHeight() < JUMP_HEIGHT / 2)
      ) {
        continue;
      }

      enemy.health -= weapon.damage * (player.damageBoostTime > 0 ? 2 : 1);
      addCauldronIngredient("hit");
      if (enemy.health <= 0) {
        enemies.splice(index, 1);
      }
    }
  }

  function consumeSelectedFood() {
    const slot = inventory[player.selectedSlot];
    if (player.health <= 0 || slot?.type !== "food" || player.health >= PLAYER_MAX_HEALTH) {
      return;
    }

    const previousHealth = player.health;
    player.health = Math.min(PLAYER_MAX_HEALTH, player.health + FOODS[slot.id].healing);
    player.healingTowardIngredient += player.health - previousHealth;
    while (player.healingTowardIngredient >= CAULDRON_HEALING_PER_INGREDIENT) {
      player.healingTowardIngredient -= CAULDRON_HEALING_PER_INGREDIENT;
      addCauldronIngredient("heal");
    }
    slot.count -= 1;
    if (slot.count === 0) {
      inventory[player.selectedSlot] = null;
    }
  }

  function addPickupToInventory(pickup) {
    if (WEAPONS[pickup.id]) {
      if (inventory.some((slot) => slot?.type === "weapon" && slot.id === pickup.id)) {
        return false;
      }
      const emptySlot = inventory.findIndex((slot) => slot === null);
      if (emptySlot < 0) {
        return false;
      }
      inventory[emptySlot] = { type: "weapon", id: pickup.id };
      return true;
    }

    const existingStack = inventory.find((slot) =>
      slot?.type === "food" && slot.id === pickup.id && slot.count < MAX_FOOD_STACK);
    if (existingStack) {
      existingStack.count += 1;
      return true;
    }

    const emptySlot = inventory.findIndex((slot) => slot === null);
    if (emptySlot < 0) {
      return false;
    }
    inventory[emptySlot] = { type: "food", id: pickup.id, count: 1 };
    return true;
  }

  function collectPickups() {
    for (let index = pickups.length - 1; index >= 0; index -= 1) {
      const pickup = pickups[index];
      if (Math.hypot(pickup.x - player.x, pickup.y - player.y) > PLAYER_RADIUS + 9) {
        continue;
      }
      if (addPickupToInventory(pickup)) {
        pickups.splice(index, 1);
      }
    }
  }

  function interactWithWorld(x, y) {
    const column = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (column < 0 || row < 0 || column >= MAP_COLUMNS || row >= MAP_ROWS) {
      return;
    }

    const tileX = column * TILE_SIZE + TILE_SIZE / 2;
    const tileY = row * TILE_SIZE + TILE_SIZE / 2;
    const distance = Math.hypot(tileX - player.x, tileY - player.y);
    const index = row * MAP_COLUMNS + column;
    const object = world.objects[index];

    if (object === OBSTACLE_ROCK || object === OBSTACLE_STONE) {
      if (distance > SWORD_RANGE || !beginSwordSwing()) {
        return;
      }
      faceWorldPoint(tileX, tileY);
      world.objects[index] = OBSTACLE_NONE;
      player.stones += 1;
      drawMinimapTerrain();
      return;
    }

    if (
      (object !== OBSTACLE_NONE && object !== OBSTACLE_GRASS)
      || player.stones === 0
      || distance > STONE_BUILD_RANGE
      || Math.hypot(tileX - player.x, tileY - player.y) < TILE_SIZE / 2 + PLAYER_RADIUS
      || enemies.some((enemy) => Math.hypot(tileX - enemy.x, tileY - enemy.y) < TILE_SIZE / 2 + ENEMY_RADIUS)
    ) {
      return;
    }

    world.objects[index] = OBSTACLE_STONE;
    player.stones -= 1;
    drawMinimapTerrain();
  }

  function updateEnemies(deltaSeconds) {
    if (player.health <= 0) {
      return;
    }

    enemySpawnTimer += deltaSeconds;
    if (enemySpawnTimer >= ENEMY_SPAWN_INTERVAL) {
      enemySpawnTimer = 0;
      if (enemies.length < MAX_ENEMIES) {
        spawnEnemy();
      }
    }

    for (const enemy of enemies) {
      if (enemy.airborne) {
        enemy.hoverPhase += deltaSeconds * 8;
      }
      enemy.swingTime = Math.max(0, enemy.swingTime - deltaSeconds);
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - deltaSeconds);
      const offsetX = player.x - enemy.x;
      const offsetY = player.y - enemy.y;
      const distance = Math.hypot(offsetX, offsetY);

      const canReachPlayer = !enemy.airborne
        || getPlayerJumpHeight() >= JUMP_HEIGHT / 2;
      if (distance <= PLAYER_RADIUS + ENEMY_RADIUS + 3 && canReachPlayer) {
        if (enemy.attackCooldown === 0) {
          const blockedByShield = isEnemyBlockedByShield(enemy);
          const damage = blockedByShield || player.invincibilityTime > 0
            ? 0
            : ENEMY_DAMAGE;
          player.health = Math.max(0, player.health - damage);
          if (blockedByShield) {
            addCauldronIngredient("block");
          }
          enemy.attackCooldown = 1.1;
          enemy.swingTime = ENEMY_SWING_DURATION;
          enemy.swingAngle = Math.atan2(offsetY, offsetX);
        }
        continue;
      }
      if (distance === 0) {
        continue;
      }

      const moveX = (offsetX / distance) * ENEMY_SPEED * deltaSeconds;
      const moveY = (offsetY / distance) * ENEMY_SPEED * deltaSeconds;
      const isBlocked = enemy.airborne ? isBlockedForFlyingEnemy : (x, y) =>
        isBlockedAt(x, y, false, ENEMY_RADIUS);
      if (!isBlocked(enemy.x + moveX, enemy.y)) {
        enemy.x += moveX;
      }
      if (!isBlocked(enemy.x, enemy.y + moveY)) {
        enemy.y += moveY;
      }
    }
  }

  function updatePlayer(deltaSeconds) {
    player.weaponCooldown = Math.max(0, player.weaponCooldown - deltaSeconds);
    player.swordSwing = Math.max(0, player.swordSwing - deltaSeconds);
    player.damageBoostTime = Math.max(0, player.damageBoostTime - deltaSeconds);
    player.invincibilityTime = Math.max(0, player.invincibilityTime - deltaSeconds);
    player.infiniteStaminaTime = Math.max(0, player.infiniteStaminaTime - deltaSeconds);
    if (player.infiniteStaminaTime > 0) {
      player.stamina = PLAYER_MAX_STAMINA;
    }
    if (player.health <= 0) {
      return;
    }

    if (player.isJumping) {
      player.jumpElapsed += deltaSeconds;
      if (player.jumpElapsed >= JUMP_DURATION) {
        if (isBlockedAt(player.x, player.y, false)) {
          player.x = player.lastSafeX;
          player.y = player.lastSafeY;
        }
        player.isJumping = false;
      }
    }

    const isDashing = player.dashTime > 0;
    let moveX = isDashing
      ? player.dashX
      : Number(keysDown.has("ArrowRight") || keysDown.has("d") || keysDown.has("D"))
        - Number(keysDown.has("ArrowLeft") || keysDown.has("a") || keysDown.has("A"));
    let moveY = isDashing
      ? player.dashY
      : Number(keysDown.has("ArrowDown") || keysDown.has("s") || keysDown.has("S"))
        - Number(keysDown.has("ArrowUp") || keysDown.has("w") || keysDown.has("W"));

    const previousX = player.x;
    const previousY = player.y;
    if (moveX !== 0 || moveY !== 0) {
      const magnitude = Math.hypot(moveX, moveY);
      moveX /= magnitude;
      moveY /= magnitude;
      if (!isDashing) {
        player.facingX = moveX;
        player.facingY = moveY;
      }

      const speed = PLAYER_SPEED * (isDashing ? DASH_SPEED_MULTIPLIER : 1);
      const distance = speed * deltaSeconds;
      const nextX = player.x + moveX * distance;
      const nextY = player.y + moveY * distance;

      if (!isBlockedAt(nextX, player.y)) {
        player.x = nextX;
      }
      if (!isBlockedAt(player.x, nextY)) {
        player.y = nextY;
      }
      if (player.isJumping && !isBlockedAt(player.x, player.y, false)) {
        player.lastSafeX = player.x;
        player.lastSafeY = player.y;
      }
    }
    if (isDashing) {
      player.dashTime = Math.max(0, player.dashTime - deltaSeconds);
    }

    const moved = player.x !== previousX || player.y !== previousY;
    if (moved || isDashing) {
      player.stationaryTime = 0;
    } else if (!player.isJumping) {
      player.stationaryTime += deltaSeconds;
      if (player.stationaryTime >= STAMINA_REGEN_DELAY) {
        player.stamina = Math.min(
          PLAYER_MAX_STAMINA,
          player.stamina + STAMINA_REGEN_RATE * deltaSeconds,
        );
      }
    }
    collectPickups();
  }

  function drawTree(x, y) {
    context.fillStyle = "rgb(23 39 27 / 28%)";
    context.beginPath();
    context.ellipse(x + 2, y + 9, 13, 7, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#79563a";
    context.fillRect(x - 3, y - 3, 7, 17);
    context.fillStyle = "#345b37";
    context.beginPath();
    context.arc(x, y - 8, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#477348";
    context.beginPath();
    context.arc(x - 4, y - 10, 7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#669153";
    context.beginPath();
    context.arc(x - 3, y - 14, 3, 0, Math.PI * 2);
    context.fill();
  }

  function drawRock(x, y) {
    context.fillStyle = "rgb(23 39 27 / 28%)";
    context.beginPath();
    context.ellipse(x + 1, y + 7, 11, 5, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#777e72";
    context.beginPath();
    context.moveTo(x - 10, y + 5);
    context.lineTo(x - 8, y - 3);
    context.lineTo(x - 2, y - 8);
    context.lineTo(x + 7, y - 6);
    context.lineTo(x + 11, y + 2);
    context.lineTo(x + 7, y + 7);
    context.lineTo(x - 6, y + 8);
    context.closePath();
    context.fill();
    context.fillStyle = "#a0a698";
    context.beginPath();
    context.moveTo(x - 7, y - 3);
    context.lineTo(x - 2, y - 7);
    context.lineTo(x + 4, y - 5);
    context.lineTo(x - 1, y - 2);
    context.closePath();
    context.fill();
  }

  function drawStoneBlock(x, y) {
    context.fillStyle = "rgb(23 39 27 / 35%)";
    context.fillRect(x - 13, y + 9, 26, 5);
    context.fillStyle = "#71796f";
    context.fillRect(x - 12, y - 11, 24, 21);
    context.fillStyle = "#929a8e";
    context.fillRect(x - 9, y - 8, 18, 3);
    context.strokeStyle = "#596158";
    context.lineWidth = 1;
    context.strokeRect(x - 12, y - 11, 24, 21);
  }

  function drawGrass(x, y) {
    context.strokeStyle = "#a2b96a";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x, y + 7);
    context.lineTo(x - 4, y - 2);
    context.moveTo(x + 1, y + 7);
    context.lineTo(x + 2, y - 5);
    context.moveTo(x + 2, y + 7);
    context.lineTo(x + 6, y);
    context.stroke();
  }

  function drawHealthBar(x, y, width, health, maxHealth, height = 4) {
    const healthRatio = Math.max(0, health / maxHealth);
    context.fillStyle = "rgb(15 22 17 / 82%)";
    context.fillRect(x - 1, y - 1, width + 2, height + 2);
    context.fillStyle = healthRatio > 0.5 ? "#8fcb75" : "#e4a95c";
    context.fillRect(x, y, width * healthRatio, height);
  }

  function drawEnemy(enemy, cameraX, cameraY) {
    const x = enemy.x - cameraX;
    const groundY = enemy.y - cameraY;
    context.fillStyle = "rgb(18 32 22 / 35%)";
    context.beginPath();
    context.ellipse(x, groundY + 7, 11, 5, 0, 0, Math.PI * 2);
    context.fill();

    const hoverOffset = enemy.airborne ? Math.sin(enemy.hoverPhase) * 2 : 0;
    const y = groundY - (enemy.airborne ? JUMP_HEIGHT : 0) + hoverOffset;
    if (enemy.airborne) {
      const wingBeat = Math.sin(enemy.hoverPhase * 3) * 4;
      context.fillStyle = "#d7d0bc";
      context.beginPath();
      context.ellipse(x - 9, y - 2, 8, 3 + wingBeat * 0.25, -0.25, 0, Math.PI * 2);
      context.ellipse(x + 9, y - 2, 8, 3 - wingBeat * 0.25, 0.25, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = enemy.airborne ? "#514a69" : "#7b5149";
    context.beginPath();
    context.arc(x, y, ENEMY_RADIUS + 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = enemy.airborne ? "#8f83ae" : "#b87560";
    context.beginPath();
    context.arc(x - 2, y - 2, ENEMY_RADIUS - 3, Math.PI, Math.PI * 2);
    context.fill();
    context.fillStyle = enemy.airborne ? "#dff7f0" : "#f4e8cf";
    context.beginPath();
    context.arc(x - 3, y - 1, 1.5, 0, Math.PI * 2);
    context.arc(x + 3, y - 1, 1.5, 0, Math.PI * 2);
    context.fill();
    if (enemy.swingTime > 0) {
      const progress = Math.min(1, 1 - enemy.swingTime / ENEMY_SWING_DURATION);
      const easedProgress = progress * progress * (3 - 2 * progress);
      const swingStart = enemy.swingAngle - 1.3;
      const swingEnd = enemy.swingAngle + 1.3;
      const swordAngle = swingStart + (swingEnd - swingStart) * easedProgress;

      context.save();
      context.lineCap = "round";
      for (let segment = 0; segment < 10; segment += 1) {
        const segmentEndProgress = Math.max(0, easedProgress - segment * 0.045);
        const segmentStartProgress = Math.max(0, segmentEndProgress - 0.07);
        if (segmentEndProgress <= segmentStartProgress) {
          continue;
        }

        const startAngle = swingStart + (swingEnd - swingStart) * segmentStartProgress;
        const endAngle = swingStart + (swingEnd - swingStart) * segmentEndProgress;
        context.strokeStyle = `rgb(255 224 198 / ${Math.round(42 * (1 - segment / 10))}%)`;
        context.lineWidth = 2 + (1 - segment / 10) * 4;
        context.beginPath();
        context.arc(x, y, 23, startAngle, endAngle);
        context.stroke();
      }

      const handX = x + Math.cos(swordAngle) * 7;
      const handY = y + Math.sin(swordAngle) * 7;
      const tipX = x + Math.cos(swordAngle) * 25;
      const tipY = y + Math.sin(swordAngle) * 25;
      context.strokeStyle = "#b8a18e";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(handX, handY);
      context.lineTo(tipX, tipY);
      context.stroke();
      context.strokeStyle = "#f4e4cc";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(handX + Math.cos(swordAngle + Math.PI / 2), handY + Math.sin(swordAngle + Math.PI / 2));
      context.lineTo(tipX + Math.cos(swordAngle + Math.PI / 2), tipY + Math.sin(swordAngle + Math.PI / 2));
      context.stroke();
      context.restore();
    }
    drawHealthBar(
      x - 12,
      y - 15,
      24,
      enemy.health,
      ENEMY_MAX_HEALTH,
    );
  }

  function drawItemIcon(id, x, y, scale = 1) {
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    if (id === "sword" || id === "spear") {
      const length = id === "spear" ? 22 : 17;
      context.lineCap = "round";
      context.strokeStyle = id === "spear" ? "#795538" : "#75563c";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-length / 2, 4);
      context.lineTo(length / 2, -4);
      context.stroke();
      context.strokeStyle = id === "spear" ? "#d9ded0" : "#e4e6d9";
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(length / 2 + 3, -5.5);
      context.stroke();
      context.fillStyle = "#f3f0de";
      context.beginPath();
      context.moveTo(length / 2 + 6, -7);
      context.lineTo(length / 2 + 1, -3.5);
      context.lineTo(length / 2 + 3, -8.5);
      context.closePath();
      context.fill();
      if (id === "sword") {
        context.strokeStyle = "#d4ae6e";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-3, 0);
        context.lineTo(1, 5);
        context.stroke();
      }
    } else if (id === "axe") {
      context.lineCap = "round";
      context.strokeStyle = "#76543a";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-7, 6);
      context.lineTo(5, -6);
      context.stroke();
      context.fillStyle = "#c8cec1";
      context.beginPath();
      context.moveTo(2, -3);
      context.lineTo(5, -10);
      context.lineTo(10, -11);
      context.lineTo(9, -5);
      context.lineTo(5, 0);
      context.closePath();
      context.fill();
      context.strokeStyle = "#737a70";
      context.lineWidth = 1;
      context.stroke();
    } else if (id === "apple") {
      context.fillStyle = "#c95642";
      context.beginPath();
      context.arc(-3, 1, 5, 0, Math.PI * 2);
      context.arc(3, 1, 5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#60452e";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, -4);
      context.lineTo(1, -8);
      context.stroke();
      context.fillStyle = "#8caf64";
      context.beginPath();
      context.ellipse(4, -6, 3, 1.5, -0.5, 0, Math.PI * 2);
      context.fill();
    } else if (id === "berries") {
      context.fillStyle = "#70558f";
      context.beginPath();
      context.arc(-4, 1, 3.5, 0, Math.PI * 2);
      context.arc(1, -2, 3.5, 0, Math.PI * 2);
      context.arc(5, 2, 3.5, 0, Math.PI * 2);
      context.arc(0, 4, 3.5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#b8c77d";
      context.beginPath();
      context.arc(-3, 0, 1, 0, Math.PI * 2);
      context.arc(2, -3, 1, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawPickup(pickup) {
    const x = pickup.x - currentCameraX;
    const y = pickup.y - currentCameraY;
    context.fillStyle = "rgb(18 32 22 / 35%)";
    context.beginPath();
    context.ellipse(x, y + 6, 10, 4, 0, 0, Math.PI * 2);
    context.fill();
    drawItemIcon(pickup.id, x, y);
  }

  function drawPlayerHealth() {
    const panelWidth = viewWidth < 480 ? 138 : 170;
    const x = viewWidth - panelWidth - (viewWidth < 480 ? 10 : 16);
    const y = 16;
    const activeEffects = [
      { label: "DAMAGE x2", remaining: player.damageBoostTime, duration: DAMAGE_BOOST_DURATION, color: "#e18b65" },
      { label: "INVINCIBLE", remaining: player.invincibilityTime, duration: INVINCIBILITY_DURATION, color: "#8ec5d2" },
      { label: "INFINITE STAMINA", remaining: player.infiniteStaminaTime, duration: INFINITE_STAMINA_DURATION, color: "#b4d880" },
    ].filter((effect) => effect.remaining > 0);
    const panelHeight = 80 + activeEffects.length * 22;
    context.fillStyle = "rgb(20 34 24 / 84%)";
    context.fillRect(x, y, panelWidth, panelHeight);
    context.fillStyle = "#f0f5e9";
    context.font = "700 10px ui-sans-serif, system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText("HEALTH", x + 10, y + 7);
    drawHealthBar(x + 10, y + 20, panelWidth - 20, player.health, PLAYER_MAX_HEALTH, 7);
    context.fillText("STAMINA", x + 10, y + 34);
    drawHealthBar(
      x + 10,
      y + 47,
      panelWidth - 20,
      player.stamina,
      PLAYER_MAX_STAMINA,
      7,
    );
    context.font = "600 10px ui-sans-serif, system-ui, sans-serif";
    context.fillText(`STONE ${player.stones}`, x + 10, y + 62);
    activeEffects.forEach((effect, index) => {
      const effectY = y + 80 + index * 22;
      context.fillStyle = effect.color;
      context.font = "700 8px ui-sans-serif, system-ui, sans-serif";
      context.fillText(effect.label, x + 10, effectY);
      context.textAlign = "right";
      context.fillText(`${effect.remaining.toFixed(1)}s`, x + panelWidth - 10, effectY);
      context.textAlign = "left";
      context.fillStyle = "rgb(15 22 17 / 82%)";
      context.fillRect(x + 10, effectY + 10, panelWidth - 20, 5);
      context.fillStyle = effect.color;
      context.fillRect(
        x + 10,
        effectY + 10,
        (panelWidth - 20) * effect.remaining / effect.duration,
        5,
      );
    });

    if (player.health === 0) {
      context.fillStyle = "rgb(10 17 13 / 72%)";
      context.fillRect(0, 0, viewWidth, viewHeight);
      context.fillStyle = "#f0f5e9";
      context.font = "700 28px ui-sans-serif, system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("You were caught", viewWidth / 2, viewHeight / 2 - 12);
      context.font = "14px ui-sans-serif, system-ui, sans-serif";
      context.fillText("Generate a new world to play again", viewWidth / 2, viewHeight / 2 + 18);
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
    }
  }

  function drawInventory() {
    const gap = viewWidth < 480 ? 3 : 5;
    const padding = 6;
    const maxWidth = Math.min(viewWidth - 16, 8 * 54 + 7 * gap + padding * 2);
    const slotSize = (maxWidth - padding * 2 - gap * 7) / INVENTORY_SLOT_COUNT;
    const slotHeight = 52;
    const barWidth = slotSize * INVENTORY_SLOT_COUNT + gap * 7 + padding * 2;
    const barHeight = slotHeight + padding * 2;
    const left = (viewWidth - barWidth) / 2;
    const top = viewHeight - barHeight - 10;

    context.fillStyle = "rgb(20 34 24 / 88%)";
    context.fillRect(left, top, barWidth, barHeight);

    for (let index = 0; index < INVENTORY_SLOT_COUNT; index += 1) {
      const x = left + padding + index * (slotSize + gap);
      const y = top + padding;
      const item = inventory[index];
      context.fillStyle = index === player.selectedSlot ? "#526847" : "#29372d";
      context.fillRect(x, y, slotSize, slotHeight);
      context.strokeStyle = index === player.selectedSlot ? "#e1d17e" : "#47584a";
      context.lineWidth = index === player.selectedSlot ? 2 : 1;
      context.strokeRect(x, y, slotSize, slotHeight);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "700 8px ui-sans-serif, system-ui, sans-serif";
      context.fillStyle = "#c5d6b7";
      context.fillText(String(index + 1), x + 7, y + 7);

      if (!item) {
        context.fillStyle = "#718071";
        context.font = "11px ui-sans-serif, system-ui, sans-serif";
        context.fillText("·", x + slotSize / 2, y + slotHeight / 2);
        continue;
      }

      const isWeapon = item.type === "weapon";
      const itemInfo = isWeapon ? WEAPONS[item.id] : FOODS[item.id];
      drawItemIcon(item.id, x + slotSize / 2, y + 22, 0.78);
      context.fillStyle = "#f0f5e9";
      context.font = "600 7px ui-sans-serif, system-ui, sans-serif";
      context.fillText(itemInfo.name.toUpperCase(), x + slotSize / 2, y + 42);
      if (item.type !== "weapon") {
        context.fillStyle = "#f0f5e9";
        context.font = "700 8px ui-sans-serif, system-ui, sans-serif";
        context.textAlign = "right";
        context.fillText(String(item.count), x + slotSize - 3, y + 8);
      }
    }

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  function drawCauldron(timestamp) {
    const centerX = viewWidth - 64;
    const centerY = viewHeight - (viewWidth < 720 ? 128 : 74);
    const ingredients = player.cauldronIngredients;
    const ingredientColors = {
      hit: "#e18b65",
      block: "#8ec5d2",
      heal: "#b4d880",
    };
    const ingredientLabels = {
      hit: "H",
      block: "B",
      heal: "+",
    };
    const ingredientCenters = Array.from({ length: CAULDRON_INGREDIENTS_TO_BREW }, (_, index) => {
      const angle = -Math.PI / 2 + index * (Math.PI * 2 / CAULDRON_INGREDIENTS_TO_BREW);
      return {
        x: centerX + Math.cos(angle) * 44,
        y: centerY + Math.sin(angle) * 44,
      };
    });

    context.save();
    context.fillStyle = "#e7eddc";
    context.font = "700 9px ui-sans-serif, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("BREW", centerX, centerY - 61);

    context.fillStyle = "rgb(12 19 14 / 45%)";
    context.beginPath();
    context.arc(centerX, centerY + 3, 29, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#26352e";
    context.beginPath();
    context.arc(centerX, centerY, 27, 0, Math.PI * 2);
    context.fill();
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, 22, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = "#172522";
    context.fillRect(centerX - 22, centerY - 22, 44, 44);
    if (ingredients.length > 0) {
      const fillRatio = ingredients.length / CAULDRON_INGREDIENTS_TO_BREW;
      const liquidTop = centerY + 18 - 36 * fillRatio;
      const wave = Math.sin(timestamp / 180) * 2;
      const liquid = context.createLinearGradient(0, liquidTop, 0, centerY + 20);
      liquid.addColorStop(0, "#b4d880");
      liquid.addColorStop(1, "#477d55");
      context.fillStyle = liquid;
      context.beginPath();
      context.moveTo(centerX - 23, liquidTop + wave);
      context.quadraticCurveTo(centerX, liquidTop - wave, centerX + 23, liquidTop + wave);
      context.lineTo(centerX + 23, centerY + 23);
      context.lineTo(centerX - 23, centerY + 23);
      context.closePath();
      context.fill();
      for (let index = 0; index < ingredients.length; index += 1) {
        const cycle = (timestamp / 700 + index / 3) % 1;
        const bubbleX = centerX + Math.sin(timestamp / 250 + index * 2) * (5 + index * 2);
        const bubbleY = liquidTop + 3 + cycle * Math.max(2, centerY + 18 - liquidTop);
        context.fillStyle = `rgb(223 246 167 / ${Math.round(75 * (1 - cycle))}%)`;
        context.beginPath();
        context.arc(bubbleX, bubbleY, 1.5, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
    context.strokeStyle = "#a4b99a";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(centerX, centerY, 25, 0, Math.PI * 2);
    context.stroke();

    ingredientCenters.forEach((point, index) => {
      const ingredient = ingredients[index];
      context.fillStyle = ingredient ? ingredientColors[ingredient] : "rgb(24 35 29 / 92%)";
      context.beginPath();
      context.arc(point.x, point.y, 10, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = ingredient ? "#e1ebd2" : "#899789";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(point.x, point.y, 10, 0, Math.PI * 2);
      context.stroke();
      if (ingredient) {
        context.fillStyle = "#17251c";
        context.font = "800 10px ui-sans-serif, system-ui, sans-serif";
        context.fillText(ingredientLabels[ingredient], point.x, point.y + 0.5);
      }
    });
    context.restore();
  }

  function drawPlayer(screenX, screenY) {
    context.fillStyle = "rgb(18 32 22 / 35%)";
    context.beginPath();
    context.ellipse(screenX, screenY + 8, 11, 6, 0, 0, Math.PI * 2);
    context.fill();

    const jumpHeight = getPlayerJumpHeight();
    const isAtJumpApex = jumpHeight >= JUMP_HEIGHT / 2;
    screenY -= jumpHeight;

    context.fillStyle = isAtJumpApex ? "#f0d84f" : "#d8a46e";
    context.beginPath();
    context.arc(screenX, screenY - 5, 7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = isAtJumpApex ? "#fff08a" : "#e7c495";
    context.beginPath();
    context.arc(screenX - 2, screenY - 7, 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = isAtJumpApex ? "#d4b52e" : "#477f58";
    context.beginPath();
    context.ellipse(screenX, screenY + 3, 8, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#eff0d4";
    context.beginPath();
    context.arc(screenX + player.facingX * 4, screenY - 5 + player.facingY * 3, 1.5, 0, Math.PI * 2);
    context.fill();

    if (player.shieldRaised) {
      const shieldAngle = getShieldAngle();
      const guardStart = shieldAngle - Math.PI / 2;
      const guardEnd = shieldAngle + Math.PI / 2;
      context.fillStyle = "rgb(131 174 193 / 15%)";
      context.beginPath();
      context.moveTo(screenX, screenY + 1);
      context.arc(screenX, screenY + 1, 23, guardStart, guardEnd);
      context.closePath();
      context.fill();
      context.strokeStyle = "rgb(190 218 218 / 48%)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(screenX, screenY + 1, 23, guardStart, guardEnd);
      context.stroke();

      context.save();
      context.translate(
        screenX + Math.cos(shieldAngle) * 13,
        screenY + 1 + Math.sin(shieldAngle) * 13,
      );
      context.rotate(shieldAngle);
      context.fillStyle = "#738f96";
      context.strokeStyle = "#d5d5b9";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(7, -8);
      context.lineTo(9, -5);
      context.lineTo(7, 5);
      context.lineTo(0, 10);
      context.lineTo(-7, 5);
      context.lineTo(-9, -5);
      context.lineTo(-7, -8);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    }

    const activeWeapon = player.swordSwing > 0
      ? WEAPONS[player.swingWeaponId]
      : getSelectedWeapon();
    if (!activeWeapon) {
      return;
    }

    const facingAngle = Math.atan2(player.facingY, player.facingX);
    let swordAngle = facingAngle;
    if (player.swordSwing > 0) {
      const progress = Math.min(1, 1 - player.swordSwing / player.swingDuration);
      const easedProgress = progress * progress * (3 - 2 * progress);
      const swingStart = facingAngle - 1.3;
      const swingEnd = facingAngle + 1.3;
      swordAngle = swingStart + (swingEnd - swingStart) * easedProgress;

      context.save();
      context.lineCap = "round";
      for (let segment = 0; segment < 10; segment += 1) {
        const segmentEndProgress = Math.max(0, easedProgress - segment * 0.045);
        const segmentStartProgress = Math.max(0, segmentEndProgress - 0.07);
        if (segmentEndProgress <= segmentStartProgress) {
          continue;
        }

        const startAngle = swingStart + (swingEnd - swingStart) * segmentStartProgress;
        const endAngle = swingStart + (swingEnd - swingStart) * segmentEndProgress;
        context.strokeStyle = `rgb(224 236 214 / ${Math.round(34 * (1 - segment / 10))}%)`;
        context.lineWidth = 2 + (1 - segment / 10) * 5;
        context.beginPath();
        context.arc(screenX, screenY + 1, 29, startAngle, endAngle);
        context.stroke();
      }
      context.restore();
    }

    const handX = screenX + Math.cos(swordAngle) * 9;
    const handY = screenY + 1 + Math.sin(swordAngle) * 9;
    const weaponLength = 31 * (activeWeapon.range / WEAPONS.sword.range);
    const tipX = screenX + Math.cos(swordAngle) * weaponLength;
    const tipY = screenY + 1 + Math.sin(swordAngle) * weaponLength;
    context.strokeStyle = activeWeapon === WEAPONS.axe ? "#8b6842" : "#e3e7d2";
    context.lineWidth = activeWeapon === WEAPONS.axe ? 5 : 4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(handX, handY);
    context.lineTo(tipX, tipY);
    context.stroke();

    if (activeWeapon === WEAPONS.axe) {
      context.fillStyle = "#d4d7c8";
      context.beginPath();
      context.moveTo(tipX, tipY);
      context.lineTo(tipX - Math.cos(swordAngle) * 5 + Math.cos(swordAngle + Math.PI / 2) * 7,
        tipY - Math.sin(swordAngle) * 5 + Math.sin(swordAngle + Math.PI / 2) * 7);
      context.lineTo(tipX - Math.cos(swordAngle) * 12, tipY - Math.sin(swordAngle) * 12);
      context.lineTo(tipX - Math.cos(swordAngle) * 5 - Math.cos(swordAngle + Math.PI / 2) * 7,
        tipY - Math.sin(swordAngle) * 5 - Math.sin(swordAngle + Math.PI / 2) * 7);
      context.closePath();
      context.fill();
    } else {
      context.strokeStyle = "#fff4ce";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(handX + Math.cos(swordAngle + Math.PI / 2), handY + Math.sin(swordAngle + Math.PI / 2));
      context.lineTo(tipX + Math.cos(swordAngle + Math.PI / 2), tipY + Math.sin(swordAngle + Math.PI / 2));
      context.stroke();
    }
  }

  function drawWorld(timestamp) {
    revealWorldArea();
    const cameraX = Math.max(0, Math.min(
      player.x - viewWidth / 2,
      MAP_COLUMNS * TILE_SIZE - viewWidth,
    ));
    const cameraY = Math.max(0, Math.min(
      player.y - viewHeight / 2,
      MAP_ROWS * TILE_SIZE - viewHeight,
    ));
    currentCameraX = cameraX;
    currentCameraY = cameraY;
    const startColumn = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(cameraY / TILE_SIZE));
    const endColumn = Math.min(MAP_COLUMNS, Math.ceil((cameraX + viewWidth) / TILE_SIZE) + 1);
    const endRow = Math.min(MAP_ROWS, Math.ceil((cameraY + viewHeight) / TILE_SIZE) + 1);

    context.clearRect(0, 0, viewWidth, viewHeight);

    for (let row = startRow; row < endRow; row += 1) {
      for (let column = startColumn; column < endColumn; column += 1) {
        const index = row * MAP_COLUMNS + column;
        const screenX = column * TILE_SIZE - cameraX;
        const screenY = row * TILE_SIZE - cameraY;
        const groundVariant = world.ground[index];
        const object = world.objects[index];

        context.fillStyle = GROUND_COLORS[groundVariant];
        context.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        context.fillStyle = "rgb(207 220 153 / 12%)";
        context.fillRect(screenX + 6 + (groundVariant * 7) % 17, screenY + 7, 2, 2);
        context.fillStyle = "rgb(34 61 39 / 13%)";
        context.fillRect(screenX + 19, screenY + 21 + (groundVariant * 3) % 7, 3, 2);

        const objectX = screenX + TILE_SIZE / 2;
        const objectY = screenY + TILE_SIZE / 2;
        if (object === OBSTACLE_TREE) {
          drawTree(objectX, objectY);
        } else if (object === OBSTACLE_ROCK) {
          drawRock(objectX, objectY);
        } else if (object === OBSTACLE_GRASS) {
          drawGrass(objectX, objectY);
        } else if (object === OBSTACLE_STONE) {
          drawStoneBlock(objectX, objectY);
        }
      }
    }

    for (const pickup of pickups) {
      if (
        pickup.x >= cameraX - TILE_SIZE
        && pickup.x <= cameraX + viewWidth + TILE_SIZE
        && pickup.y >= cameraY - TILE_SIZE
        && pickup.y <= cameraY + viewHeight + TILE_SIZE
      ) {
        drawPickup(pickup);
      }
    }

    for (const enemy of enemies) {
      drawEnemy(enemy, cameraX, cameraY);
    }
    drawPlayer(player.x - cameraX, player.y - cameraY);
    drawWorldFog(cameraX, cameraY);
    drawPlayerHealth();
    drawInventory();
    drawCauldron(timestamp);
    drawMinimap();
  }

  function frame(timestamp) {
    const deltaSeconds = previousFrame === 0
      ? 0
      : Math.min((timestamp - previousFrame) / 1000, 0.05);
    previousFrame = timestamp;

    updatePlayer(deltaSeconds);
    updateEnemies(deltaSeconds);
    drawWorld(timestamp);
    window.requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select")) {
      return;
    }
    const key = event.key;
    if (normalizeKey(key) === "e") {
      player.shieldRaised = true;
    }
    if (/^[1-8]$/.test(key)) {
      player.selectedSlot = Number(key) - 1;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (
        !event.repeat
        && !player.isJumping
        && player.health > 0
        && (player.infiniteStaminaTime > 0 || player.stamina >= JUMP_STAMINA_COST)
      ) {
        player.isJumping = true;
        player.jumpElapsed = 0;
        player.lastSafeX = player.x;
        player.lastSafeY = player.y;
        if (player.infiniteStaminaTime <= 0) {
          player.stamina -= JUMP_STAMINA_COST;
        }
        player.stationaryTime = 0;
      }
    }
    if (key === "Shift") {
      event.preventDefault();
      if (
        !event.repeat
        && player.dashTime === 0
        && player.health > 0
        && (player.infiniteStaminaTime > 0 || player.stamina >= DASH_STAMINA_COST)
      ) {
        let dashX = Number(keysDown.has("ArrowRight") || keysDown.has("d") || keysDown.has("D"))
          - Number(keysDown.has("ArrowLeft") || keysDown.has("a") || keysDown.has("A"));
        let dashY = Number(keysDown.has("ArrowDown") || keysDown.has("s") || keysDown.has("S"))
          - Number(keysDown.has("ArrowUp") || keysDown.has("w") || keysDown.has("W"));
        const magnitude = Math.hypot(dashX, dashY);
        if (magnitude > 0) {
          dashX /= magnitude;
          dashY /= magnitude;
        } else {
          dashX = player.facingX;
          dashY = player.facingY;
        }

        player.dashX = dashX;
        player.dashY = dashY;
        player.dashTime = DASH_DURATION;
        if (player.infiniteStaminaTime <= 0) {
          player.stamina -= DASH_STAMINA_COST;
        }
        player.stationaryTime = 0;
      }
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      event.preventDefault();
    }
    if (/^(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|[wasd])$/i.test(key)) {
      keysDown.add(normalizeKey(key));
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = normalizeKey(event.key);
    keysDown.delete(key);
    if (key === "e") {
      player.shieldRaised = false;
    }
  });
  window.addEventListener("blur", () => {
    keysDown.clear();
    player.shieldRaised = false;
  });
  canvas.addEventListener("mousemove", updateMouseWorldPosition);
  canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0 && event.button !== 2) {
      return;
    }

    event.preventDefault();
    updateMouseWorldPosition(event);
    if (event.button === 0) {
      attackWithWeapon(mouseWorldX, mouseWorldY);
    } else {
      interactWithWorld(mouseWorldX, mouseWorldY);
    }
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  newWorldButton.addEventListener("click", startNewWorld);

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);

  startNewWorld();
  resizeCanvas();
  window.requestAnimationFrame(frame);
})();
