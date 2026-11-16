 export class Weapon {
  constructor({ id, name, damage, range, cooldown, icon }) {
    Object.assign(this, { id, name, damage, range, cooldown, icon });
  }
}

export class Sword extends Weapon {
  constructor() {
    super({
      id: "sword",
      name: "Sword",
      damage: 35,
      range: 48,
      cooldown: 0.42,
      icon: "S",
    });
  }
}

export class Spear extends Weapon {
  constructor() {
    super({
      id: "spear",
      name: "Spear",
      damage: 25,
      range: 68,
      cooldown: 0.5,
      icon: "P",
    });
  }
}

export class Axe extends Weapon {
  constructor() {
    super({
      id: "axe",
      name: "Axe",
      damage: 50,
      range: 42,
      cooldown: 0.68,
      icon: "A",
    });
  }
}

export const WEAPONS = Object.freeze({
  sword: new Sword(),
  spear: new Spear(),
  axe: new Axe(),
});
