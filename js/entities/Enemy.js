export const ENEMY_MAX_HEALTH = 60;

export class Enemy {
  constructor(state = {}) {
    Object.assign(this, {
      x: 0,
      y: 0,
      airborne: false,
      hoverPhase: 0,
      health: ENEMY_MAX_HEALTH,
      attackCooldown: 0,
      swingTime: 0,
      swingAngle: 0,
      stunTime: 0,
    }, state);
  }

  static from(state) {
    return state.airborne ? new FlyingEnemy(state) : new GroundEnemy(state);
  }
}

export class GroundEnemy extends Enemy {
  constructor(state = {}) {
    super({ ...state, airborne: false });
  }
}

export class FlyingEnemy extends Enemy {
  constructor(state = {}) {
    super({ ...state, airborne: true });
  }
}
