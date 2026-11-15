"use strict";

(() => {
  const TILE_SIZE = 32;
  const MAP_COLUMNS = 2500;
  const MAP_ROWS = 2000;
  const SAVE_SLOT_COUNT = 3;
  const SAVE_DATABASE_NAME = "wildwood-saves";
  const SAVE_DATABASE_VERSION = 1;
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
  const FOG_SCALE = 1 / TILE_SIZE;
  const FOV_EDGE_FADE_START = 0.9;
  const JUMP_DURATION = 0.55;
  const JUMP_HEIGHT = 24;
  const SWORD_RANGE = 48;
  const SWORD_COOLDOWN = 0.42;
  const SWORD_SWING_DURATION = 0.28;
  const UP_ATTACK_STAMINA_COST = PLAYER_MAX_STAMINA / 2;
  const UP_ATTACK_RADIUS = TILE_SIZE * 3;
  const ENEMY_STUN_DURATION = 0.5;
  const STONE_BUILD_RANGE = TILE_SIZE * 5;
  const ENEMY_SPAWN_INTERVAL = 5;
  const MAX_ENEMIES = 7;
  const OBSTACLE_NONE = 0;
  const OBSTACLE_TREE = 1;
  const OBSTACLE_ROCK = 2;
  const OBSTACLE_STONE = 4;
  const OBSTACLE_BUSH = 5;
  const GROUND_COLORS = ["#557b45", "#587f47", "#527641", "#5b8049"];
  const DEFAULT_TREE_SPAWN_CHANCE = 0.42;
  const TREE_WIDTH_TILES = 2;
  const TREE_HEIGHT_TILES = 3;
  const TREE_GREEN_CHANCE = 0.8;
  const TREE_SPRITES = ["tree-green", "tree-orange"];
  const ROCK_SPRITES = ["tile092^2", "tile093^2", "tile094^2"];
  const BUSH_SPRITES = ["tile058^2", "tile059^2"];
  const EDITOR_PART_COLUMNS = 18;
  const EDITOR_PART_ROWS = 13;
  const EDITOR_PART_FILES = Array.from(
    { length: EDITOR_PART_COLUMNS * EDITOR_PART_ROWS },
    (_, index) => {
      const row = Math.floor(index / EDITOR_PART_COLUMNS) + 1;
      const column = index % EDITOR_PART_COLUMNS + 1;
      return `overworld-parts/part-r${String(row).padStart(2, "0")}-c${String(column).padStart(2, "0")}.png`;
    },
  );
  const EDITOR_GROUND_ASSETS = GROUND_COLORS.map((_, index) => ({
    label: `Ground ${index + 1}`,
    file: `ground-${index}.png`,
    value: index,
  }));
  const EDITOR_OBJECT_ASSETS = [
    { label: "Tree", value: OBSTACLE_TREE },
    { label: "Rock", file: `${ROCK_SPRITES[0]}.png`, value: OBSTACLE_ROCK },
    { label: "Bush", file: `${BUSH_SPRITES[0]}.png`, value: OBSTACLE_BUSH },
    { label: "Stone", file: "stone-block.png", value: OBSTACLE_STONE },
  ];
  const treeSpawnSettings = { chance: DEFAULT_TREE_SPAWN_CHANCE };
  const EDITOR_ART_SIZE = 128;
  const EDITOR_ART_EXTENSIONS = /\.(avif|bmp|gif|jpe?g|png|svg|webp|tiff?)$/i;
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
  let context = canvas.getContext("2d");
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
  const startPage = document.querySelector("#start-page");
  const settingsPage = document.querySelector("#settings-page");
  const creditsPage = document.querySelector("#credits-page");
  const gameShell = document.querySelector("#game-shell");
  const playButton = document.querySelector("#play-button");
  const openSettingsPageButton = document.querySelector("#open-settings-page");
  const openCreditsPageButton = document.querySelector("#open-credits-page");
  const returnToTitleButtons = Array.from(document.querySelectorAll("[data-return-to-title]"));
  const coordinatesLabel = document.querySelector("#player-coordinates");
  const pauseMenu = document.querySelector("#pause-menu");
  const pauseResumeButton = document.querySelector("#pause-resume");
  const pauseSaveLoadButton = document.querySelector("#pause-save-load");
  const saveMenu = document.querySelector("#save-menu");
  const saveMenuOpenButton = document.querySelector("#save-menu-open");
  const saveMenuCloseButton = document.querySelector("#save-menu-close");
  const saveSlotButtons = Array.from(document.querySelectorAll("[data-save-slot]"));
  const loadSaveButton = document.querySelector("#load-save");
  const createSaveWorldButton = document.querySelector("#create-save-world");
  const saveCurrentWorldButton = document.querySelector("#save-current-world");
  const saveMenuStatus = document.querySelector("#save-menu-status");
  const editorPanel = document.querySelector("#editor-panel");
  const editorCloseButton = document.querySelector("#editor-close");
  const terrainPalette = document.querySelector("#terrain-palette");
  const objectPalette = document.querySelector("#object-palette");
  const treeSpawnChanceInput = document.querySelector("#tree-spawn-chance");
  const treeSpawnChanceValue = document.querySelector("#tree-spawn-chance-value");
  const generateNewWorldButton = document.querySelector("#generate-new-world");
  const customPalette = document.querySelector("#custom-palette");
  const hitboxEditor = document.querySelector("#hitbox-editor");
  const hitboxAssetLabel = document.querySelector("#hitbox-asset-label");
  const hitboxEnabledInput = document.querySelector("#hitbox-enabled");
  const behindPlayerInput = document.querySelector("#behind-player");
  const hitboxPreview = document.querySelector("#hitbox-preview");
  const hitboxPreviewImage = document.querySelector("#hitbox-preview-image");
  const hitboxPreviewBox = document.querySelector("#hitbox-preview-box");
  const hitboxFields = {
    x: document.querySelector("#hitbox-x"),
    y: document.querySelector("#hitbox-y"),
    width: document.querySelector("#hitbox-width"),
    height: document.querySelector("#hitbox-height"),
  };
  const loadArtFolderButton = document.querySelector("#load-art-folder");
  const importArtFilesButton = document.querySelector("#import-art-files");
  const artFolderInput = document.querySelector("#art-folder-input");
  const artFilesInput = document.querySelector("#art-files-input");
  const customArtStatus = document.querySelector("#custom-art-status");
  const eraseToolButton = document.querySelector("#erase-tool");
  const editorSelectionLabel = document.querySelector("#editor-selection");
  const canvasWrap = document.querySelector(".canvas-wrap");
  const spriteImages = new Map();
  const SPRITE_FILES = [
    "tile024.png",
    ...TREE_SPRITES.map((sprite) => `${sprite}.png`),
    ...BUSH_SPRITES.map((sprite) => `${sprite}.png`),
    ...ROCK_SPRITES.map((sprite) => `${sprite}.png`),
    "stone-block.png",
    "enemy.png",
    "flying-enemy.png",
    "flying-wings.png",
    "player.png",
    "player-jump.png",
    "sword.png",
    "spear.png",
    "axe.png",
    "apple.png",
    "berries.png",
  ];

  for (const filename of SPRITE_FILES) {
    const image = new Image();
    image.onerror = () => console.error(`Unable to load sprite: assets/${filename}`);
    image.src = `assets/${filename}`;
    spriteImages.set(filename.slice(0, -4), image);
  }

  function drawSprite(name, x, y, width, height = width) {
    const image = spriteImages.get(name);
    if (!image?.complete || image.naturalWidth === 0) {
      return false;
    }

    context.drawImage(image, x - width / 2, y - height / 2, width, height);
    return true;
  }

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
    swordSwingType: "normal",
    cauldronIngredients: [],
    healingTowardIngredient: 0,
    damageBoostTime: 0,
    invincibilityTime: 0,
    infiniteStaminaTime: 0,
    shieldRaised: false,
  };
  let world;
  let hasActiveWorld = false;
  let activeSaveSlot = null;
  let selectedSaveSlot = 0;
  let saveSlotMetadata = Array(SAVE_SLOT_COUNT).fill(null);
  let pauseMenuOpen = false;
  let saveMenuOpen = false;
  let returnToPauseAfterSaveMenu = false;
  let viewWidth = 0;
  let viewHeight = 0;
  let currentCameraX = 0;
  let currentCameraY = 0;
  let mouseWorldX = 0;
  let mouseWorldY = 0;
  let previousFrame = 0;
  let enemySpawnTimer = 0;
  let editorOpen = false;
  let editorPainting = false;
  let editorPointerInside = false;
  let editorLastColumn = null;
  let editorLastRow = null;
  let editorAssetDirectory = null;
  let nextCustomAssetId = 0;
  let isDrawingHitbox = false;
  let hitboxDragStartX = 0;
  let hitboxDragStartY = 0;
  const editorAssets = new Map();
  let editorSelection = { type: "object", value: OBSTACLE_TREE, label: "Tree", variant: 0 };

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
    const objectVariants = new Uint8Array(MAP_COLUMNS * MAP_ROWS);
    const treeFootprints = new Uint8Array(MAP_COLUMNS * MAP_ROWS);
    const trees = new Map();
    const treeCells = new Map();
    const treeSpawnChance = treeSpawnSettings.chance;
    const spawnColumn = Math.floor(MAP_COLUMNS / 2);
    const spawnRow = Math.floor(MAP_ROWS / 2);

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const index = row * MAP_COLUMNS + column;
        const distanceFromSpawn = Math.hypot(column - spawnColumn, row - spawnRow);
        ground[index] = Math.floor(random() * GROUND_COLORS.length);

        if (treeFootprints[index] || distanceFromSpawn < 3 || random() > 0.1) {
          continue;
        }

        const objectRoll = random();
        if (objectRoll < treeSpawnChance) {
          let canPlaceTree = row >= TREE_HEIGHT_TILES - 1
            && column + TREE_WIDTH_TILES <= MAP_COLUMNS;
          if (canPlaceTree) {
            for (let treeRow = row - TREE_HEIGHT_TILES + 1; treeRow <= row; treeRow += 1) {
              for (let treeColumn = column; treeColumn < column + TREE_WIDTH_TILES; treeColumn += 1) {
                const treeIndex = treeRow * MAP_COLUMNS + treeColumn;
                if (treeFootprints[treeIndex] || objects[treeIndex] !== OBSTACLE_NONE) {
                  canPlaceTree = false;
                }
              }
            }
          }

          if (canPlaceTree) {
            const variant = random() < TREE_GREEN_CHANCE ? 0 : 1;
            trees.set(index, variant);
            for (let treeRow = row - TREE_HEIGHT_TILES + 1; treeRow <= row; treeRow += 1) {
              for (let treeColumn = column; treeColumn < column + TREE_WIDTH_TILES; treeColumn += 1) {
                const treeIndex = treeRow * MAP_COLUMNS + treeColumn;
                treeFootprints[treeIndex] = 1;
                treeCells.set(treeIndex, index);
                if (treeRow === row) {
                  objects[treeIndex] = OBSTACLE_TREE;
                }
              }
            }
            continue;
          }
        }

        const nonTreeRoll = objectRoll < treeSpawnChance
          ? random()
          : (objectRoll - treeSpawnChance) / (1 - treeSpawnChance);
        if (nonTreeRoll < 30 / 58) {
          objects[index] = OBSTACLE_ROCK;
          objectVariants[index] = Math.floor(random() * ROCK_SPRITES.length);
        } else {
          objects[index] = OBSTACLE_BUSH;
          objectVariants[index] = Math.floor(random() * BUSH_SPRITES.length);
        }
      }
    }

    const pickups = [];
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const index = row * MAP_COLUMNS + column;
        const distanceFromSpawn = Math.hypot(column - spawnColumn, row - spawnRow);
        if (
          treeFootprints[index]
          || distanceFromSpawn < 5
          || objects[index] !== OBSTACLE_NONE
          || random() > 0.000008
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

    return {
      ground,
      objects,
      objectVariants,
      trees,
      treeCells,
      pickups,
      customObjects: new Map(),
    };
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
    player.swordSwingType = "normal";
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
    hasActiveWorld = true;
    updateSaveMenu();
  }

  function openSaveDatabase() {
    if (!window.indexedDB) {
      return Promise.reject(new Error("This browser does not support local save files."));
    }

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(SAVE_DATABASE_NAME, SAVE_DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("saves")) {
          database.createObjectStore("saves", { keyPath: "slot" });
        }
        if (!database.objectStoreNames.contains("metadata")) {
          database.createObjectStore("metadata", { keyPath: "slot" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Unable to open local save files."));
      request.onblocked = () => reject(new Error("Save files are blocked by another open game tab."));
    });
  }

  async function getSaveSlotMetadata() {
    const database = await openSaveDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("metadata", "readonly");
      const request = transaction.objectStore("metadata").getAll();
      request.onsuccess = () => {
        resolve(request.result);
        database.close();
      };
      request.onerror = () => {
        database.close();
        reject(request.error || new Error("Unable to read save slots."));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("Unable to read save slots."));
      };
    });
  }

  async function readSaveSlot(slot) {
    const database = await openSaveDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("saves", "readonly");
      const request = transaction.objectStore("saves").get(slot);
      request.onsuccess = () => {
        resolve(request.result);
        database.close();
      };
      request.onerror = () => {
        database.close();
        reject(request.error || new Error("Unable to read this save file."));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("Unable to read this save file."));
      };
    });
  }

  async function writeSaveSlot(slot, save, metadata) {
    const database = await openSaveDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(["saves", "metadata"], "readwrite");
      transaction.objectStore("saves").put(save);
      transaction.objectStore("metadata").put(metadata);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("Unable to write this save file."));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("Unable to write this save file."));
      };
    });
  }

  function createSaveSnapshot(slot) {
    const savedAssets = new Map();
    const customObjects = Array.from(world.customObjects, ([index, asset]) => {
      if (!savedAssets.has(asset.id)) {
        const key = `asset-${savedAssets.size}`;
        savedAssets.set(asset.id, {
          key,
          label: asset.label,
          path: asset.path || "",
          source: asset.source || "save",
          behindPlayer: asset.behindPlayer,
          hitbox: { ...asset.hitbox },
          image: asset.canvas.toDataURL("image/png"),
        });
      }
      return [index, savedAssets.get(asset.id).key];
    });
    const now = Date.now();

    return {
      slot,
      version: 1,
      savedAt: now,
      world: {
        ground: world.ground,
        objects: world.objects,
        objectVariants: world.objectVariants,
        trees: Array.from(world.trees),
        customObjects,
      },
      customAssets: Array.from(savedAssets.values()),
      pickups: pickups.map((pickup) => ({ ...pickup })),
      enemies: enemies.map((enemy) => ({ ...enemy })),
      player: {
        x: player.x,
        y: player.y,
        facingX: player.facingX,
        facingY: player.facingY,
        health: player.health,
        stamina: player.stamina,
        stones: player.stones,
        selectedSlot: player.selectedSlot,
        inventory: inventory.map((item) => item ? { ...item } : null),
        cauldronIngredients: [...player.cauldronIngredients],
        healingTowardIngredient: player.healingTowardIngredient,
      },
      metadata: {
        slot,
        savedAt: now,
        x: Math.floor(player.x / TILE_SIZE) + 1,
        y: Math.floor(player.y / TILE_SIZE) + 1,
      },
    };
  }

  function updateSaveMenu() {
    for (const button of saveSlotButtons) {
      const slot = Number(button.dataset.saveSlot);
      const metadata = saveSlotMetadata[slot];
      const detail = button.querySelector(".save-slot-detail");
      button.setAttribute("aria-pressed", String(slot === selectedSaveSlot));
      detail.textContent = metadata
        ? `Saved ${new Date(metadata.savedAt).toLocaleString()} · X ${metadata.x}, Y ${metadata.y}`
        : "Empty slot";
    }
    loadSaveButton.disabled = !saveSlotMetadata[selectedSaveSlot];
    saveCurrentWorldButton.disabled = !hasActiveWorld;
    saveMenuCloseButton.hidden = false;
    saveMenuCloseButton.setAttribute(
      "aria-label",
      hasActiveWorld ? "Close save menu" : "Back to start page",
    );
  }

  async function refreshSaveSlots() {
    const metadata = await getSaveSlotMetadata();
    saveSlotMetadata = Array(SAVE_SLOT_COUNT).fill(null);
    for (const entry of metadata) {
      if (Number.isInteger(entry.slot) && entry.slot >= 0 && entry.slot < SAVE_SLOT_COUNT) {
        saveSlotMetadata[entry.slot] = entry;
      }
    }
    updateSaveMenu();
    saveMenuStatus.textContent = "Choose a slot to continue or create a world.";
  }

  function setSaveMenuOpen(open) {
    saveMenuOpen = open;
    saveMenu.hidden = !open;
    document.body.classList.toggle("save-selection-active", open);
    if (open) {
      selectedSaveSlot = activeSaveSlot ?? selectedSaveSlot;
      updateSaveMenu();
      saveSlotButtons[selectedSaveSlot]?.focus({ preventScroll: true });
      refreshSaveSlots().catch((error) => {
        saveMenuStatus.textContent = `Unable to load save slots: ${error.message}`;
      });
    } else {
      keysDown.clear();
      player.shieldRaised = false;
      if (returnToPauseAfterSaveMenu) {
        returnToPauseAfterSaveMenu = false;
        setPauseMenuOpen(true);
      } else if (hasActiveWorld) {
        gameShell.hidden = false;
        canvas.focus({ preventScroll: true });
      }
    }
  }

  function showStartPage() {
    saveMenuOpen = false;
    saveMenu.hidden = true;
    document.body.classList.remove("save-selection-active");
    pauseMenuOpen = false;
    pauseMenu.hidden = true;
    gameShell.hidden = true;
    settingsPage.hidden = true;
    creditsPage.hidden = true;
    startPage.hidden = false;
    keysDown.clear();
    player.shieldRaised = false;
    playButton.focus({ preventScroll: true });
  }

  function openGameSelection() {
    startPage.hidden = true;
    settingsPage.hidden = true;
    creditsPage.hidden = true;
    setSaveMenuOpen(true);
  }

  function setPauseMenuOpen(open) {
    if (open && (!hasActiveWorld || saveMenuOpen)) {
      return;
    }
    pauseMenuOpen = open;
    pauseMenu.hidden = !open;
    keysDown.clear();
    player.shieldRaised = false;
    if (open) {
      pauseResumeButton.focus({ preventScroll: true });
    } else {
      canvas.focus({ preventScroll: true });
    }
  }

  async function saveCurrentWorldToSelectedSlot() {
    if (!world) {
      return false;
    }
    const slot = selectedSaveSlot;
    saveMenuStatus.textContent = `Saving to Save ${slot + 1}…`;
    try {
      const snapshot = createSaveSnapshot(slot);
      await writeSaveSlot(slot, snapshot, snapshot.metadata);
      activeSaveSlot = slot;
      saveSlotMetadata[slot] = snapshot.metadata;
      updateSaveMenu();
      saveMenuStatus.textContent = `Saved to Save ${slot + 1}.`;
      return true;
    } catch (error) {
      saveMenuStatus.textContent = `Unable to save this world: ${error.message}`;
      return false;
    }
  }

  async function decodeSavedAsset(asset) {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error(`Unable to restore custom art "${asset.label}".`));
      image.src = asset.image;
    });
    return image;
  }

  async function restoreSaveSlot(slot) {
    const save = await readSaveSlot(slot);
    if (!save || save.version !== 1 || !save.world) {
      throw new Error("This save file is missing or has an unsupported format.");
    }
    const tileCount = MAP_COLUMNS * MAP_ROWS;
    if (
      save.world.ground?.length !== tileCount
      || save.world.objects?.length !== tileCount
      || save.world.objectVariants?.length !== tileCount
    ) {
      throw new Error("This save file contains an incomplete world map.");
    }
    if (
      !save.player
      || !Number.isFinite(save.player.x)
      || !Number.isFinite(save.player.y)
      || !Array.isArray(save.player.inventory)
    ) {
      throw new Error("This save file contains invalid player data.");
    }

    const restoredAssets = new Map();
    for (const assetData of save.customAssets || []) {
      const id = `saved-${slot}-${assetData.key}`;
      const previousAsset = editorAssets.get(id);
      if (previousAsset) {
        customPalette.querySelector(`[data-editor-value="${id}"]`)?.remove();
        editorAssets.delete(id);
      }
      const image = await decodeSavedAsset(assetData);
      const asset = {
        id,
        label: assetData.label,
        path: assetData.path,
        source: assetData.source,
        canvas: createNormalizedArt(image, false),
      };
      addCustomAsset(asset);
      asset.behindPlayer = assetData.behindPlayer;
      asset.hitbox = { ...assetData.hitbox };
      restoredAssets.set(assetData.key, asset);
    }

    const restoredWorld = {
      ground: new Uint8Array(save.world.ground),
      objects: new Uint8Array(save.world.objects),
      objectVariants: new Uint8Array(save.world.objectVariants),
      trees: new Map(save.world.trees),
      treeCells: new Map(),
      pickups: save.pickups.map((pickup) => ({ ...pickup })),
      customObjects: new Map(),
    };
    for (const rootIndex of restoredWorld.trees.keys()) {
      forEachTreeFootprintCell(rootIndex, (index) => restoredWorld.treeCells.set(index, rootIndex));
    }
    for (const [index, assetKey] of save.world.customObjects || []) {
      const asset = restoredAssets.get(assetKey);
      if (!asset) {
        throw new Error("This save file is missing art used in the world.");
      }
      restoredWorld.customObjects.set(index, asset);
    }

    world = restoredWorld;
    pickups.length = 0;
    pickups.push(...restoredWorld.pickups);
    enemies.length = 0;
    enemies.push(...(save.enemies || []).map((enemy) => ({ ...enemy })));
    inventory.fill(null);
    for (const [index, item] of (save.player.inventory || []).entries()) {
      if (index < inventory.length && item) {
        inventory[index] = { ...item };
      }
    }
    Object.assign(player, {
      x: save.player.x,
      y: save.player.y,
      facingX: save.player.facingX,
      facingY: save.player.facingY,
      health: save.player.health,
      stamina: save.player.stamina,
      stones: save.player.stones,
      selectedSlot: save.player.selectedSlot,
      cauldronIngredients: [...(save.player.cauldronIngredients || [])],
      healingTowardIngredient: save.player.healingTowardIngredient || 0,
      isJumping: false,
      jumpElapsed: 0,
      lastSafeX: save.player.x,
      lastSafeY: save.player.y,
      stationaryTime: 0,
      dashTime: 0,
      dashX: 0,
      dashY: 0,
      weaponCooldown: 0,
      swordSwing: 0,
      damageBoostTime: 0,
      invincibilityTime: 0,
      infiniteStaminaTime: 0,
      shieldRaised: false,
    });
    mouseWorldX = player.x + player.facingX * TILE_SIZE;
    mouseWorldY = player.y + player.facingY * TILE_SIZE;
    enemySpawnTimer = 0;
    drawMinimapTerrain();
    resetMinimapExploration();
    hasActiveWorld = true;
    activeSaveSlot = slot;
    selectedSaveSlot = slot;
    updateSaveMenu();
  }

  async function loadSelectedSave() {
    const slot = selectedSaveSlot;
    saveMenuStatus.textContent = `Loading Save ${slot + 1}…`;
    try {
      await restoreSaveSlot(slot);
      saveMenuStatus.textContent = `Loaded Save ${slot + 1}.`;
      returnToPauseAfterSaveMenu = false;
      setSaveMenuOpen(false);
    } catch (error) {
      saveMenuStatus.textContent = `Unable to load this world: ${error.message}`;
    }
  }

  async function createWorldInSelectedSlot() {
    const slot = selectedSaveSlot;
    if (
      saveSlotMetadata[slot]
      && !window.confirm(`Replace Save ${slot + 1} with a new world?`)
    ) {
      return;
    }
    saveMenuStatus.textContent = `Creating a new world in Save ${slot + 1}…`;
    try {
      activeSaveSlot = slot;
      startNewWorld();
      if (await saveCurrentWorldToSelectedSlot()) {
        returnToPauseAfterSaveMenu = false;
        setSaveMenuOpen(false);
      }
    } catch (error) {
      saveMenuStatus.textContent = `Unable to create this world: ${error.message}`;
    }
  }

  function drawMinimapTerrain() {
    for (let pixelY = 0; pixelY < minimapTerrain.height; pixelY += 1) {
      const row = Math.min(MAP_ROWS - 1, Math.floor(pixelY * MAP_ROWS / minimapTerrain.height));
      for (let pixelX = 0; pixelX < minimapTerrain.width; pixelX += 1) {
        const column = Math.min(MAP_COLUMNS - 1, Math.floor(pixelX * MAP_COLUMNS / minimapTerrain.width));
        const index = row * MAP_COLUMNS + column;
        minimapTerrainContext.fillStyle = getMinimapColor(index);
        minimapTerrainContext.fillRect(pixelX, pixelY, 1, 1);
      }
    }
  }

  function getMinimapColor(index) {
    if (world.customObjects.has(index)) {
      return "#c2bb8a";
    }

    const object = world.objects[index];
    if (object === OBSTACLE_TREE || object === OBSTACLE_BUSH) {
      return "#315239";
    }
    if (object === OBSTACLE_ROCK) {
      return "#9ba394";
    }
    if (object === OBSTACLE_STONE) {
      return "#777f75";
    }
    return GROUND_COLORS[world.ground[index]];
  }

  function drawMinimapTile(column, row) {
    const pixelX = Math.min(minimapTerrain.width - 1, Math.floor(column * minimapTerrain.width / MAP_COLUMNS));
    const pixelY = Math.min(minimapTerrain.height - 1, Math.floor(row * minimapTerrain.height / MAP_ROWS));
    const index = row * MAP_COLUMNS + column;
    minimapTerrainContext.fillStyle = getMinimapColor(index);
    minimapTerrainContext.fillRect(pixelX, pixelY, 1, 1);
  }

  function buildEditorPalette(container, assets, type) {
    for (const asset of assets) {
      const button = document.createElement("button");
      button.className = "asset-button";
      button.type = "button";
      button.setAttribute("aria-label", asset.label);
      button.setAttribute("aria-pressed", "false");
      button.dataset.editorType = type;
      button.dataset.editorValue = String(asset.value);
      button.dataset.editorVariant = String(asset.variant ?? 0);

      const label = document.createElement("span");
      label.textContent = asset.label;
      if (asset.file) {
        const image = document.createElement("img");
        image.src = `assets/${asset.file}`;
        image.alt = "";
        image.draggable = false;
        button.append(image);
      }
      button.append(label);
      button.addEventListener("click", () => (
        selectEditorAsset(type, asset.value, asset.label, asset.variant)
      ));
      container.append(button);
    }
  }

  function updateTreeSpawnSettings() {
    const chance = treeSpawnChanceInput.valueAsNumber;
    treeSpawnSettings.chance = Number.isFinite(chance)
      ? Math.max(0, Math.min(100, chance)) / 100
      : DEFAULT_TREE_SPAWN_CHANCE;
    treeSpawnChanceValue.value = `${Math.round(treeSpawnSettings.chance * 100)}%`;
  }

  function getImageLabel(path) {
    const filename = path.split("/").pop() || path;
    return filename.replace(/\.[^.]+$/, "");
  }

  function createNormalizedArt(source, smooth = true) {
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    if (!width || !height) {
      throw new Error("The image has no readable dimensions.");
    }

    const artCanvas = document.createElement("canvas");
    artCanvas.width = EDITOR_ART_SIZE;
    artCanvas.height = EDITOR_ART_SIZE;
    const artContext = artCanvas.getContext("2d");
    artContext.imageSmoothingEnabled = smooth;
    const scale = Math.min(EDITOR_ART_SIZE / width, EDITOR_ART_SIZE / height);
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    artContext.drawImage(
      source,
      (EDITOR_ART_SIZE - drawWidth) / 2,
      (EDITOR_ART_SIZE - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    return artCanvas;
  }

  async function decodeImageFile(file) {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file);
        try {
          return createNormalizedArt(bitmap);
        } finally {
          bitmap.close();
        }
      } catch {
        // Fall through to the browser image decoder for formats not handled by createImageBitmap.
      }
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("The browser cannot decode this image format."));
        element.src = objectUrl;
      });
      return createNormalizedArt(image);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function addCustomAsset(asset) {
    asset.hitbox = { enabled: false, x: 24, y: 24, width: 80, height: 80 };
    asset.behindPlayer ??= true;
    asset.tileSize ??= TILE_SIZE;
    editorAssets.set(asset.id, asset);
    const button = document.createElement("button");
    button.className = "asset-button";
    button.type = "button";
    button.setAttribute("aria-label", asset.label);
    button.setAttribute("aria-pressed", "false");
    button.dataset.editorType = "custom";
    button.dataset.editorValue = asset.id;

    const image = document.createElement("img");
    image.src = asset.canvas.toDataURL("image/png");
    image.alt = "";
    image.draggable = false;

    const label = document.createElement("span");
    label.textContent = asset.label;
    button.append(image, label);
    button.addEventListener("click", () => selectEditorAsset("custom", asset.id, asset.label));
    customPalette.append(button);
  }

  function loadEditorPartAssets() {
    const partRequests = EDITOR_PART_FILES.map((path, index) => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ path, index, image });
      image.onerror = () => resolve({ path, index });
      image.src = `assets/${path}`;
    }));

    Promise.all(partRequests).then((parts) => {
      let loadedCount = 0;
      const failures = [];
      for (const part of parts) {
        const { path, index, image } = part;
        if (!image) {
          console.error(`Unable to load editor part: assets/${path}`);
          failures.push(path);
          continue;
        }

        const row = Math.floor(index / EDITOR_PART_COLUMNS) + 1;
        const column = index % EDITOR_PART_COLUMNS + 1;
        try {
          addCustomAsset({
            id: `overworld-part-${index + 1}`,
            label: `Part ${row}-${column}`,
            path,
            source: "tileset",
            tileSize: TILE_SIZE,
            canvas: createNormalizedArt(image, false),
          });
          loadedCount += 1;
        } catch (error) {
          console.error(`Unable to prepare editor part assets/${path}:`, error);
          failures.push(path);
        }
      }

      const failureMessage = failures.length > 0
        ? ` ${failures.length} part${failures.length === 1 ? "" : "s"} failed to load.`
        : "";
      customArtStatus.textContent = `${loadedCount} of ${EDITOR_PART_FILES.length} 16 × 16 parts loaded.${failureMessage}`;
    });
  }

  async function loadEditorImages(files, source, replaceFolderAssets = false) {
    const decodedAssets = [];
    const failures = [];
    const folderSelectionWasActive = replaceFolderAssets
      && editorAssets.get(editorSelection.value)?.source === "folder";
    for (const entry of files) {
      const file = entry.file || entry;
      const path = entry.path || file.webkitRelativePath || file.name;
      if (!file.type.startsWith("image/") && !EDITOR_ART_EXTENSIONS.test(path)) {
        continue;
      }

      try {
        decodedAssets.push({
          id: `custom-${nextCustomAssetId++}`,
          label: getImageLabel(path),
          path,
          source,
          canvas: await decodeImageFile(file),
        });
      } catch (error) {
        failures.push(`${path}: ${error.message}`);
      }
    }

    if (replaceFolderAssets) {
      for (const [id, asset] of editorAssets) {
        if (asset.source === "folder") {
          editorAssets.delete(id);
          customPalette.querySelector(`[data-editor-value="${id}"]`)?.remove();
        }
      }
    }

    for (const asset of decodedAssets) {
      addCustomAsset(asset);
    }
    if (folderSelectionWasActive) {
      selectEditorAsset("object", OBSTACLE_TREE, "Tree");
    }

    const loadedCount = decodedAssets.length;
    const totalCount = editorAssets.size;
    const skippedMessage = failures.length > 0
      ? ` ${failures.length} image${failures.length === 1 ? "" : "s"} could not be loaded: ${failures.slice(0, 3).join("; ")}`
      : "";
    customArtStatus.textContent = loadedCount > 0
      ? `Loaded ${loadedCount} image${loadedCount === 1 ? "" : "s"}; ${totalCount} available.${skippedMessage}`
      : `No supported images found. ${totalCount} image${totalCount === 1 ? "" : "s"} remain available.${skippedMessage}`;
  }

  async function readEditorAssetDirectory(directory) {
    if (typeof directory.queryPermission === "function") {
      let permission = await directory.queryPermission({ mode: "read" });
      if (permission !== "granted" && typeof directory.requestPermission === "function") {
        permission = await directory.requestPermission({ mode: "read" });
      }
      if (permission !== "granted") {
        throw new Error("Read access to the selected folder was not granted.");
      }
    }

    const files = [];
    async function readEntries(handle, parentPath) {
      for await (const [name, entry] of handle.entries()) {
        const path = parentPath ? `${parentPath}/${name}` : name;
        if (entry.kind === "file") {
          files.push({ file: await entry.getFile(), path });
        } else if (entry.kind === "directory") {
          await readEntries(entry, path);
        }
      }
    }
    await readEntries(directory, "");
    return files;
  }

  async function chooseArtFolder() {
    try {
      if (editorAssetDirectory) {
        const files = await readEditorAssetDirectory(editorAssetDirectory);
        await loadEditorImages(files, "folder", true);
        return;
      }

      if (typeof window.showDirectoryPicker === "function") {
        editorAssetDirectory = await window.showDirectoryPicker({ mode: "read" });
        const files = await readEditorAssetDirectory(editorAssetDirectory);
        await loadEditorImages(files, "folder", true);
        return;
      }

      artFolderInput.click();
    } catch (error) {
      if (error.name !== "AbortError") {
        editorAssetDirectory = null;
        customArtStatus.textContent = `Unable to read the art folder: ${error.message}`;
      }
    }
  }

  function selectEditorAsset(type, value, label, variant = 0) {
    editorSelection = { type, value, label, variant };
    editorSelectionLabel.textContent = `Painting: ${label}`;
    eraseToolButton.setAttribute("aria-pressed", "false");
    for (const button of editorPanel.querySelectorAll(".asset-button")) {
      const isSelected = button.dataset.editorType === type
        && button.dataset.editorValue === String(value)
        && button.dataset.editorVariant === String(variant);
      button.setAttribute("aria-pressed", String(isSelected));
    }
    updateHitboxEditor();
  }

  function selectEraser() {
    editorSelection = { type: "erase", value: OBSTACLE_NONE, label: "Erase objects" };
    editorSelectionLabel.textContent = "Erasing objects and pickups";
    eraseToolButton.setAttribute("aria-pressed", "true");
    for (const button of editorPanel.querySelectorAll(".asset-button")) {
      button.setAttribute("aria-pressed", "false");
    }
    updateHitboxEditor();
  }

  function updateHitboxPreview(asset) {
    const { x, y, width, height, enabled } = asset.hitbox;
    hitboxPreviewBox.style.left = `${x / EDITOR_ART_SIZE * 100}%`;
    hitboxPreviewBox.style.top = `${y / EDITOR_ART_SIZE * 100}%`;
    hitboxPreviewBox.style.width = `${width / EDITOR_ART_SIZE * 100}%`;
    hitboxPreviewBox.style.height = `${height / EDITOR_ART_SIZE * 100}%`;
    hitboxPreviewBox.classList.toggle("is-disabled", !enabled);
  }

  function updateHitboxEditor() {
    const asset = editorSelection.type === "custom"
      ? editorAssets.get(editorSelection.value)
      : null;
    hitboxEditor.hidden = !asset;
    if (!asset) {
      hitboxAssetLabel.textContent = "Select a custom image to edit its hitbox.";
      hitboxPreviewImage.removeAttribute("src");
      return;
    }

    hitboxAssetLabel.textContent = asset.label;
    hitboxPreviewImage.src = asset.canvas.toDataURL("image/png");
    hitboxEnabledInput.checked = asset.hitbox.enabled;
    behindPlayerInput.checked = asset.behindPlayer;
    for (const [field, input] of Object.entries(hitboxFields)) {
      input.value = String(asset.hitbox[field]);
    }
    updateHitboxPreview(asset);
  }

  function updateHitboxFromFields() {
    const asset = editorAssets.get(editorSelection.value);
    if (editorSelection.type !== "custom" || !asset) {
      return;
    }

    const x = Math.max(0, Math.min(EDITOR_ART_SIZE - 1, Number(hitboxFields.x.value) || 0));
    const y = Math.max(0, Math.min(EDITOR_ART_SIZE - 1, Number(hitboxFields.y.value) || 0));
    const width = Math.max(1, Math.min(EDITOR_ART_SIZE - x, Number(hitboxFields.width.value) || 1));
    const height = Math.max(1, Math.min(EDITOR_ART_SIZE - y, Number(hitboxFields.height.value) || 1));
    asset.hitbox = { ...asset.hitbox, x, y, width, height };
    for (const [field, input] of Object.entries(hitboxFields)) {
      input.value = String(asset.hitbox[field]);
    }
    updateHitboxPreview(asset);
  }

  function updateHitboxFromPointer(event) {
    const asset = editorAssets.get(editorSelection.value);
    if (!isDrawingHitbox || editorSelection.type !== "custom" || !asset) {
      return;
    }

    const bounds = hitboxPreview.getBoundingClientRect();
    const toArtCoordinate = (value, origin, size) => Math.max(
      0,
      Math.min(EDITOR_ART_SIZE, Math.round((value - origin) / size * EDITOR_ART_SIZE)),
    );
    const startX = hitboxDragStartX;
    const startY = hitboxDragStartY;
    const endX = toArtCoordinate(event.clientX, bounds.left, bounds.width);
    const endY = toArtCoordinate(event.clientY, bounds.top, bounds.height);
    const x = Math.min(EDITOR_ART_SIZE - 1, Math.min(startX, endX));
    const y = Math.min(EDITOR_ART_SIZE - 1, Math.min(startY, endY));
    asset.hitbox = {
      enabled: asset.hitbox.enabled,
      x,
      y,
      width: Math.max(1, Math.min(EDITOR_ART_SIZE - x, Math.abs(endX - startX))),
      height: Math.max(1, Math.min(EDITOR_ART_SIZE - y, Math.abs(endY - startY))),
    };
    for (const [field, input] of Object.entries(hitboxFields)) {
      input.value = String(asset.hitbox[field]);
    }
    updateHitboxPreview(asset);
  }

  function setEditorOpen(open) {
    editorOpen = open;
    editorPanel.hidden = !open;
    canvasWrap.classList.toggle("editor-active", open);
    editorPainting = false;
    editorLastColumn = null;
    editorLastRow = null;
    keysDown.clear();
    player.shieldRaised = false;
    if (!open) {
      canvas.focus({ preventScroll: true });
    }
  }

  function forEachTreeFootprintCell(rootIndex, callback) {
    const baseRow = Math.floor(rootIndex / MAP_COLUMNS);
    const baseColumn = rootIndex % MAP_COLUMNS;
    for (let row = baseRow - TREE_HEIGHT_TILES + 1; row <= baseRow; row += 1) {
      for (let column = baseColumn; column < baseColumn + TREE_WIDTH_TILES; column += 1) {
        callback(row * MAP_COLUMNS + column, row, column);
      }
    }
  }

  function removeTreeAt(rootIndex) {
    if (!world.trees.has(rootIndex)) {
      return;
    }

    const baseRow = Math.floor(rootIndex / MAP_COLUMNS);
    forEachTreeFootprintCell(rootIndex, (index, row, column) => {
      if (world.treeCells.get(index) !== rootIndex) {
        return;
      }
      world.treeCells.delete(index);
      world.customObjects.delete(index);
      if (row === baseRow) {
        world.objects[index] = OBSTACLE_NONE;
        world.objectVariants[index] = 0;
      }
      drawMinimapTile(column, row);
    });
    world.trees.delete(rootIndex);
  }

  function removeTreeCovering(index) {
    const rootIndex = world.treeCells.get(index);
    if (rootIndex !== undefined) {
      removeTreeAt(rootIndex);
    }
  }

  function removePickupsAt(column, row) {
    for (let pickupIndex = pickups.length - 1; pickupIndex >= 0; pickupIndex -= 1) {
      const pickup = pickups[pickupIndex];
      if (
        Math.floor(pickup.x / TILE_SIZE) === column
        && Math.floor(pickup.y / TILE_SIZE) === row
      ) {
        pickups.splice(pickupIndex, 1);
      }
    }
  }

  function placeTreeAt(column, baseRow, variant) {
    if (
      baseRow < TREE_HEIGHT_TILES - 1
      || column + TREE_WIDTH_TILES > MAP_COLUMNS
    ) {
      customArtStatus.textContent = "Trees need a 2-by-3 tile area to be placed.";
      return false;
    }

    const rootIndex = baseRow * MAP_COLUMNS + column;
    const existingRoots = new Set();
    forEachTreeFootprintCell(rootIndex, (index) => {
      const existingRoot = world.treeCells.get(index);
      if (existingRoot !== undefined) {
        existingRoots.add(existingRoot);
      }
    });
    for (const existingRoot of existingRoots) {
      removeTreeAt(existingRoot);
    }

    world.trees.set(rootIndex, variant % TREE_SPRITES.length);
    forEachTreeFootprintCell(rootIndex, (index, row, treeColumn) => {
      world.treeCells.set(index, rootIndex);
      world.objects[index] = row === baseRow ? OBSTACLE_TREE : OBSTACLE_NONE;
      world.objectVariants[index] = 0;
      world.customObjects.delete(index);
      removePickupsAt(treeColumn, row);
      drawMinimapTile(treeColumn, row);
    });
    return true;
  }

  function paintEditorTile(column, row) {
    if (column < 0 || row < 0 || column >= MAP_COLUMNS || row >= MAP_ROWS) {
      return;
    }

    const index = row * MAP_COLUMNS + column;
    if (editorSelection.type === "ground") {
      world.ground[index] = editorSelection.value;
    } else if (
      editorSelection.type === "object"
      && editorSelection.value === OBSTACLE_TREE
    ) {
      placeTreeAt(column, row, editorSelection.variant);
      return;
    } else {
      removeTreeCovering(index);
      if (editorSelection.type === "custom") {
        const asset = editorAssets.get(editorSelection.value);
        if (!asset) {
          customArtStatus.textContent = `The selected image "${editorSelection.label}" is no longer loaded.`;
          return;
        }
        world.objects[index] = OBSTACLE_NONE;
        world.customObjects.set(index, asset);
      } else if (editorSelection.type === "object") {
        world.customObjects.delete(index);
        world.objects[index] = editorSelection.value;
        world.objectVariants[index] = editorSelection.variant;
      } else {
        world.objects[index] = OBSTACLE_NONE;
        world.customObjects.delete(index);
        removePickupsAt(column, row);
      }
    }
    drawMinimapTile(column, row);
  }

  function paintEditorLine(startColumn, startRow, endColumn, endRow) {
    let column = startColumn;
    let row = startRow;
    const deltaColumn = Math.abs(endColumn - startColumn);
    const stepColumn = startColumn < endColumn ? 1 : -1;
    const deltaRow = -Math.abs(endRow - startRow);
    const stepRow = startRow < endRow ? 1 : -1;
    let error = deltaColumn + deltaRow;

    while (true) {
      paintEditorTile(column, row);
      if (column === endColumn && row === endRow) {
        break;
      }
      const doubledError = 2 * error;
      if (doubledError >= deltaRow) {
        error += deltaRow;
        column += stepColumn;
      }
      if (doubledError <= deltaColumn) {
        error += deltaColumn;
        row += stepRow;
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
    worldFogContext.fillStyle = "rgb(10 17 13 / 62%)";
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
    const index = row * MAP_COLUMNS + column;
    return world.objects[index];
  }

  function isBlockedByCustomAsset(asset, left, top, size, x, y, radius) {
    if (!asset?.hitbox.enabled) {
      return false;
    }

    const hitbox = asset.hitbox;
    const hitboxScale = size / EDITOR_ART_SIZE;
    const hitboxLeft = left + hitbox.x * hitboxScale;
    const hitboxTop = top + hitbox.y * hitboxScale;
    const hitboxRight = hitboxLeft + hitbox.width * hitboxScale;
    const hitboxBottom = hitboxTop + hitbox.height * hitboxScale;
    const closestX = Math.max(hitboxLeft, Math.min(x, hitboxRight));
    const closestY = Math.max(hitboxTop, Math.min(y, hitboxBottom));
    const distanceX = x - closestX;
    const distanceY = y - closestY;
    return distanceX * distanceX + distanceY * distanceY < radius * radius;
  }

  function isBlockedAt(x, y, jumping = player.isJumping, radius = PLAYER_RADIUS) {
    const minColumn = Math.floor((x - radius) / TILE_SIZE);
    const maxColumn = Math.floor((x + radius) / TILE_SIZE);
    const minRow = Math.floor((y - radius) / TILE_SIZE);
    const maxRow = Math.floor((y + radius) / TILE_SIZE);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const index = row * MAP_COLUMNS + column;
        const customAsset = world.customObjects.get(index);
        if (
          isBlockedByCustomAsset(
            customAsset,
            column * TILE_SIZE,
            row * TILE_SIZE,
            TILE_SIZE,
            x,
            y,
            radius,
          )
        ) {
          return true;
        }

        const obstacle = getObjectAt(column, row);
        if (
          obstacle === OBSTACLE_TREE
          || obstacle === OBSTACLE_BUSH
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
        stunTime: 0,
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

  function beginSwordSwing(swingType = "normal") {
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
    player.swordSwingType = swingType;
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

  function attackWithWeapon() {
    const selectedItem = inventory[player.selectedSlot];
    if (selectedItem?.type === "food") {
      consumeSelectedFood();
      return;
    }

    if (
      player.shieldRaised
      && selectedItem?.type === "weapon"
      && selectedItem.id === "sword"
    ) {
      attackUpward();
      return;
    }

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

  function attackUpward() {
    if (
      player.health <= 0
      || player.weaponCooldown > 0
      || (
        player.infiniteStaminaTime <= 0
        && player.stamina < UP_ATTACK_STAMINA_COST
      )
    ) {
      return;
    }
    if (!beginSwordSwing("up")) {
      return;
    }

    if (player.infiniteStaminaTime <= 0) {
      player.stamina -= UP_ATTACK_STAMINA_COST;
    }
    player.stationaryTime = 0;

    const attackX = player.x;
    const attackY = player.y - TILE_SIZE;
    const attackVisualY = player.y - getPlayerJumpHeight() - TILE_SIZE;
    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      const enemy = enemies[index];
      if (Math.hypot(enemy.x - attackX, enemy.y - attackY) > UP_ATTACK_RADIUS) {
        continue;
      }

      const enemyScreenY = enemy.y - JUMP_HEIGHT + Math.sin(enemy.hoverPhase) * 2;
      const isInStrikeZone = enemy.airborne
        && Math.hypot(
          enemy.x - attackX,
          enemyScreenY - attackVisualY,
        ) <= PLAYER_RADIUS + ENEMY_RADIUS;
      if (isInStrikeZone) {
        enemy.health = 0;
        enemies.splice(index, 1);
        addCauldronIngredient("hit");
        continue;
      }

      let knockbackX = enemy.x - player.x;
      let knockbackY = enemy.y - player.y;
      const distanceFromPlayer = Math.hypot(knockbackX, knockbackY);
      if (distanceFromPlayer === 0) {
        knockbackX = 0;
        knockbackY = -1;
      } else {
        knockbackX /= distanceFromPlayer;
        knockbackY /= distanceFromPlayer;
      }
      const startX = enemy.x;
      const startY = enemy.y;
      const steps = Math.ceil(TILE_SIZE / (ENEMY_RADIUS / 2));
      for (let step = 1; step <= steps; step += 1) {
        const distance = TILE_SIZE * step / steps;
        const nextX = startX + knockbackX * distance;
        const nextY = startY + knockbackY * distance;
        const isBlocked = enemy.airborne
          ? isBlockedForFlyingEnemy(nextX, nextY)
          : isBlockedAt(nextX, nextY, false, ENEMY_RADIUS);
        if (isBlocked) {
          break;
        }
        enemy.x = nextX;
        enemy.y = nextY;
      }
      enemy.stunTime = ENEMY_STUN_DURATION;
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
      world.objects[index] = OBSTACLE_NONE;
      player.stones += 1;
      drawMinimapTerrain();
      return;
    }

    if (
      object !== OBSTACLE_NONE
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
      enemy.stunTime = Math.max(0, enemy.stunTime - deltaSeconds);
      if (enemy.stunTime > 0) {
        continue;
      }
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

  function drawTree(x, y, variant) {
    const sprite = TREE_SPRITES[variant] || TREE_SPRITES[0];
    if (drawSprite(
      sprite,
      x + TILE_SIZE * TREE_WIDTH_TILES / 2,
      y + TILE_SIZE * TREE_HEIGHT_TILES / 2,
      TILE_SIZE * TREE_WIDTH_TILES,
      TILE_SIZE * TREE_HEIGHT_TILES,
    )) {
      return;
    }

    context.fillStyle = "rgb(23 39 27 / 28%)";
    context.beginPath();
    context.ellipse(x + TILE_SIZE, y + TILE_SIZE * 2.85, 20, 6, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#79563a";
    context.fillRect(x + TILE_SIZE - 5, y + TILE_SIZE * 2, 10, TILE_SIZE);
    context.fillStyle = variant === 1 ? "#8a4524" : "#345b37";
    context.beginPath();
    context.ellipse(x + TILE_SIZE, y + TILE_SIZE, 29, 30, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = variant === 1 ? "#c26a32" : "#477348";
    context.beginPath();
    context.ellipse(x + TILE_SIZE, y + TILE_SIZE * 0.75, 20, 20, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = variant === 1 ? "#e3a34f" : "#669153";
    context.beginPath();
    context.ellipse(x + TILE_SIZE - 8, y + TILE_SIZE * 0.55, 8, 9, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawTreeCanopy(x, y, variant) {
    context.save();
    context.beginPath();
    context.rect(
      x,
      y,
      TILE_SIZE * TREE_WIDTH_TILES,
      TILE_SIZE * (TREE_HEIGHT_TILES - 1),
    );
    context.clip();
    drawTree(x, y, variant);
    context.restore();
  }

  function drawCustomObject(asset, x, y) {
    const size = asset.tileSize || TILE_SIZE;
    context.drawImage(
      asset.canvas,
      x - size / 2,
      y - size / 2,
      size,
      size,
    );
  }

  function drawRock(x, y, variant) {
    const sprite = ROCK_SPRITES[variant % ROCK_SPRITES.length];
    if (drawSprite(sprite, x, y, 32)) {
      return;
    }

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
    if (drawSprite("stone-block", x, y, 32)) {
      return;
    }

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

  function drawBush(x, y, variant) {
    if (drawSprite(BUSH_SPRITES[variant % BUSH_SPRITES.length], x, y, 32)) {
      return;
    }

    context.fillStyle = "#345b37";
    context.beginPath();
    context.arc(x - 5, y + 2, 7, 0, Math.PI * 2);
    context.arc(x + 5, y + 2, 7, 0, Math.PI * 2);
    context.arc(x, y - 3, 8, 0, Math.PI * 2);
    context.fill();
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
    const spriteName = enemy.airborne ? "flying-enemy" : "enemy";
    if (enemy.airborne) {
      drawEnemyWings(x, y, enemy.hoverPhase);
    }
    if (!drawSprite(spriteName, x, y, 32)) {
      drawEnemyBody(x, y, enemy.airborne);
    }

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

  function drawEnemyWings(x, y, hoverPhase) {
    const wingBeat = Math.sin(hoverPhase * 3) * 4;
    if (drawSprite("flying-wings", x, y - 2, 40, 12 + wingBeat)) {
      return;
    }

    context.fillStyle = "#d7d0bc";
    context.beginPath();
    context.ellipse(x - 9, y - 2, 8, 3 + wingBeat * 0.25, -0.25, 0, Math.PI * 2);
    context.ellipse(x + 9, y - 2, 8, 3 - wingBeat * 0.25, 0.25, 0, Math.PI * 2);
    context.fill();
  }

  function drawEnemyBody(x, y, airborne) {
    context.fillStyle = airborne ? "#514a69" : "#7b5149";
    context.beginPath();
    context.arc(x, y, ENEMY_RADIUS + 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = airborne ? "#8f83ae" : "#b87560";
    context.beginPath();
    context.arc(x - 2, y - 2, ENEMY_RADIUS - 3, Math.PI, Math.PI * 2);
    context.fill();
    context.fillStyle = airborne ? "#dff7f0" : "#f4e8cf";
    context.beginPath();
    context.arc(x - 3, y - 1, 1.5, 0, Math.PI * 2);
    context.arc(x + 3, y - 1, 1.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawItemIcon(id, x, y, scale = 1) {
    if (drawSprite(id, x, y, 36 * scale)) {
      return;
    }

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

    const spriteName = isAtJumpApex ? "player-jump" : "player";
    if (!drawSprite(spriteName, screenX, screenY, 32)) {
      drawPlayerBody(screenX, screenY, isAtJumpApex);
    }

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
      const swingStart = player.swordSwingType === "up" ? -Math.PI * 0.72 : facingAngle - 1.3;
      const swingEnd = player.swordSwingType === "up" ? -Math.PI * 0.28 : facingAngle + 1.3;
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

  function drawPlayerBody(screenX, screenY, isAtJumpApex) {
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
  }

  function drawGroundTile(x, y, variant) {
    if (drawSprite("tile024", x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE)) {
      return;
    }

    context.fillStyle = GROUND_COLORS[variant];
    context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    context.fillStyle = "rgb(207 220 153 / 12%)";
    context.fillRect(x + 6 + (variant * 7) % 17, y + 7, 2, 2);
    context.fillStyle = "rgb(34 61 39 / 13%)";
    context.fillRect(x + 19, y + 21 + (variant * 3) % 7, 3, 2);
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
    const startColumn = Math.max(
      0,
      Math.floor(cameraX / TILE_SIZE) - TREE_WIDTH_TILES + 1,
    );
    const startRow = Math.max(
      0,
      Math.floor(cameraY / TILE_SIZE) - TREE_HEIGHT_TILES + 1,
    );
    const endColumn = Math.min(
      MAP_COLUMNS,
      Math.ceil((cameraX + viewWidth) / TILE_SIZE) + TREE_WIDTH_TILES,
    );
    const endRow = Math.min(
      MAP_ROWS,
      Math.ceil((cameraY + viewHeight) / TILE_SIZE) + TREE_HEIGHT_TILES,
    );

    context.clearRect(0, 0, viewWidth, viewHeight);

    const visibleTrees = [];
    const foregroundCustomObjects = [];
    for (let row = startRow; row < endRow; row += 1) {
      for (let column = startColumn; column < endColumn; column += 1) {
        const index = row * MAP_COLUMNS + column;
        const screenX = column * TILE_SIZE - cameraX;
        const screenY = row * TILE_SIZE - cameraY;
        const groundVariant = world.ground[index];
        const object = world.objects[index];

        drawGroundTile(screenX, screenY, groundVariant);

        const objectX = screenX + TILE_SIZE / 2;
        const objectY = screenY + TILE_SIZE / 2;
        const customObject = world.customObjects.get(index);
        if (world.trees.has(index)) {
          const variant = world.trees.get(index);
          const treeY = screenY - TILE_SIZE * (TREE_HEIGHT_TILES - 1);
          visibleTrees.push({ x: screenX, y: treeY, variant });
        } else if (customObject) {
          if (customObject.behindPlayer) {
            drawCustomObject(customObject, objectX, objectY);
          } else {
            foregroundCustomObjects.push({ asset: customObject, x: objectX, y: objectY });
          }
        } else if (object === OBSTACLE_ROCK) {
          drawRock(objectX, objectY, world.objectVariants[index]);
        } else if (object === OBSTACLE_BUSH) {
          drawBush(objectX, objectY, world.objectVariants[index]);
        } else if (object === OBSTACLE_STONE) {
          drawStoneBlock(objectX, objectY);
        }
      }
    }

    for (const tree of visibleTrees) {
      drawTree(tree.x, tree.y, tree.variant);
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
    for (const tree of visibleTrees) {
      drawTreeCanopy(tree.x, tree.y, tree.variant);
    }
    for (const customObject of foregroundCustomObjects) {
      drawCustomObject(customObject.asset, customObject.x, customObject.y);
    }
    drawWorldFog(cameraX, cameraY);
    drawEditorCursor(cameraX, cameraY);
    drawPlayerHealth();
    drawInventory();
    drawCauldron(timestamp);
    drawMinimap();
  }

  function drawEditorCursor(cameraX, cameraY) {
    if (!editorOpen || !editorPointerInside) {
      return;
    }

    const column = Math.floor(mouseWorldX / TILE_SIZE);
    const row = Math.floor(mouseWorldY / TILE_SIZE);
    if (column < 0 || row < 0 || column >= MAP_COLUMNS || row >= MAP_ROWS) {
      return;
    }

    const x = column * TILE_SIZE - cameraX;
    const y = row * TILE_SIZE - cameraY;
    context.fillStyle = editorSelection.type === "erase"
      ? "rgb(211 112 83 / 20%)"
      : "rgb(202 230 160 / 16%)";
    context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    context.strokeStyle = editorSelection.type === "erase" ? "#e09a7d" : "#d3edaa";
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  }

  function frame(timestamp) {
    const deltaSeconds = previousFrame === 0
      ? 0
      : Math.min((timestamp - previousFrame) / 1000, 0.05);
    previousFrame = timestamp;

    if (world && !editorOpen && !saveMenuOpen && !pauseMenuOpen) {
      updatePlayer(deltaSeconds);
      updateEnemies(deltaSeconds);
    }
    if (world) {
      drawWorld(timestamp);
    }
    window.requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key;
    if (saveMenuOpen) {
      if (key === "Escape") {
        event.preventDefault();
        if (hasActiveWorld) {
          setSaveMenuOpen(false);
        } else {
          showStartPage();
        }
      }
      return;
    }
    if (!hasActiveWorld) {
      return;
    }
    if (pauseMenuOpen) {
      if (key === "Escape" && !event.repeat) {
        event.preventDefault();
        setPauseMenuOpen(false);
      }
      return;
    }
    if (editorOpen && key === "Escape") {
      event.preventDefault();
      setEditorOpen(false);
      return;
    }
    if (key === "Escape" && world && !event.repeat) {
      event.preventDefault();
      setPauseMenuOpen(true);
      return;
    }
    if (normalizeKey(key) === "p" && !event.repeat) {
      event.preventDefault();
      setEditorOpen(!editorOpen);
      return;
    }
    if (editorOpen) {
      return;
    }
    if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select")) {
      return;
    }
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
    editorPainting = false;
  });
  canvas.addEventListener("mousemove", (event) => {
    updateMouseWorldPosition(event);
    editorPointerInside = true;
    if (!editorOpen || !editorPainting) {
      return;
    }

    const column = Math.floor(mouseWorldX / TILE_SIZE);
    const row = Math.floor(mouseWorldY / TILE_SIZE);
    if (editorLastColumn === null || editorLastRow === null) {
      paintEditorTile(column, row);
    } else {
      paintEditorLine(editorLastColumn, editorLastRow, column, row);
    }
    editorLastColumn = column;
    editorLastRow = row;
  });
  canvas.addEventListener("mouseenter", () => {
    editorPointerInside = true;
  });
  canvas.addEventListener("mouseleave", () => {
    editorPointerInside = false;
    editorLastColumn = null;
    editorLastRow = null;
  });
  canvas.addEventListener("mousedown", (event) => {
    if (saveMenuOpen || pauseMenuOpen) {
      return;
    }
    if (event.button !== 0 && event.button !== 2) {
      return;
    }

    event.preventDefault();
    updateMouseWorldPosition(event);
    if (editorOpen) {
      if (event.button === 0) {
        editorPainting = true;
        editorPointerInside = true;
        editorLastColumn = Math.floor(mouseWorldX / TILE_SIZE);
        editorLastRow = Math.floor(mouseWorldY / TILE_SIZE);
        paintEditorTile(editorLastColumn, editorLastRow);
      }
      return;
    }
    if (event.button === 0) {
      attackWithWeapon();
    } else {
      interactWithWorld(mouseWorldX, mouseWorldY);
    }
  });
  window.addEventListener("mouseup", () => {
    editorPainting = false;
    editorLastColumn = null;
    editorLastRow = null;
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  playButton.addEventListener("click", openGameSelection);
  openSettingsPageButton.addEventListener("click", () => {
    startPage.hidden = true;
    settingsPage.hidden = false;
  });
  openCreditsPageButton.addEventListener("click", () => {
    startPage.hidden = true;
    creditsPage.hidden = false;
  });
  returnToTitleButtons.forEach((button) => {
    button.addEventListener("click", showStartPage);
  });
  function openSaveMenuFromCurrentContext() {
    if (pauseMenuOpen) {
      returnToPauseAfterSaveMenu = true;
      setPauseMenuOpen(false);
    }
    setSaveMenuOpen(true);
  }
  saveMenuOpenButton.addEventListener("click", openSaveMenuFromCurrentContext);
  pauseResumeButton.addEventListener("click", () => setPauseMenuOpen(false));
  pauseSaveLoadButton.addEventListener("click", openSaveMenuFromCurrentContext);
  saveMenuCloseButton.addEventListener("click", () => {
    if (hasActiveWorld) {
      setSaveMenuOpen(false);
    } else {
      showStartPage();
    }
  });
  saveSlotButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedSaveSlot = Number(button.dataset.saveSlot);
      updateSaveMenu();
    });
  });
  loadSaveButton.addEventListener("click", loadSelectedSave);
  createSaveWorldButton.addEventListener("click", createWorldInSelectedSlot);
  saveCurrentWorldButton.addEventListener("click", saveCurrentWorldToSelectedSlot);
  editorCloseButton.addEventListener("click", () => setEditorOpen(false));
  generateNewWorldButton.addEventListener("click", startNewWorld);
  eraseToolButton.addEventListener("click", selectEraser);
  hitboxEnabledInput.addEventListener("change", () => {
    const asset = editorAssets.get(editorSelection.value);
    if (editorSelection.type !== "custom" || !asset) {
      return;
    }
    asset.hitbox.enabled = hitboxEnabledInput.checked;
    updateHitboxPreview(asset);
  });
  behindPlayerInput.addEventListener("change", () => {
    const asset = editorAssets.get(editorSelection.value);
    if (editorSelection.type !== "custom" || !asset) {
      return;
    }
    asset.behindPlayer = behindPlayerInput.checked;
  });
  for (const input of Object.values(hitboxFields)) {
    input.addEventListener("input", updateHitboxFromFields);
    input.addEventListener("change", updateHitboxFromFields);
  }
  hitboxPreview.addEventListener("pointerdown", (event) => {
    if (editorSelection.type !== "custom") {
      return;
    }
    const asset = editorAssets.get(editorSelection.value);
    if (!asset) {
      return;
    }
    event.preventDefault();
    hitboxPreview.setPointerCapture(event.pointerId);
    const bounds = hitboxPreview.getBoundingClientRect();
    hitboxDragStartX = Math.min(
      EDITOR_ART_SIZE - 1,
      Math.max(0, Math.round((event.clientX - bounds.left) / bounds.width * EDITOR_ART_SIZE)),
    );
    hitboxDragStartY = Math.min(
      EDITOR_ART_SIZE - 1,
      Math.max(0, Math.round((event.clientY - bounds.top) / bounds.height * EDITOR_ART_SIZE)),
    );
    isDrawingHitbox = true;
    updateHitboxFromPointer(event);
  });
  hitboxPreview.addEventListener("pointermove", updateHitboxFromPointer);
  hitboxPreview.addEventListener("pointerup", (event) => {
    updateHitboxFromPointer(event);
    isDrawingHitbox = false;
  });
  hitboxPreview.addEventListener("pointercancel", () => {
    isDrawingHitbox = false;
  });
  loadArtFolderButton.addEventListener("click", chooseArtFolder);
  importArtFilesButton.addEventListener("click", () => artFilesInput.click());
  artFolderInput.addEventListener("change", async () => {
    editorAssetDirectory = null;
    await loadEditorImages(
      Array.from(artFolderInput.files, (file) => ({ file, path: file.webkitRelativePath || file.name })),
      "folder",
      true,
    );
    artFolderInput.value = "";
  });
  artFilesInput.addEventListener("change", async () => {
    await loadEditorImages(Array.from(artFilesInput.files), "import");
    artFilesInput.value = "";
  });
  buildEditorPalette(terrainPalette, EDITOR_GROUND_ASSETS, "ground");
  buildEditorPalette(objectPalette, EDITOR_OBJECT_ASSETS, "object");
  treeSpawnChanceInput.addEventListener("input", updateTreeSpawnSettings);
  updateTreeSpawnSettings();
  loadEditorPartAssets();
  selectEditorAsset("object", OBSTACLE_TREE, "Tree");

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);

  updateSaveMenu();
  refreshSaveSlots().catch((error) => {
    saveMenuStatus.textContent = `Unable to load save slots: ${error.message}`;
  });
  resizeCanvas();
  window.requestAnimationFrame(frame);
})();
