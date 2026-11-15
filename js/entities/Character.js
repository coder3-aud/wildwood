export class Character {
  constructor(state = {}) {
    this.reset(state);
  }

  reset(state = {}) {
    Object.assign(this, {
      x: 0,
      y: 0,
      facingX: 0,
      facingY: 1,
      isJumping: false,
      jumpElapsed: 0,
      lastSafeX: 0,
      lastSafeY: 0,
      health: 100,
      stamina: 100,
      stationaryTime: 0,
      dashTime: 0,
      dashX: 0,
      dashY: 0,
      stones: 0,
      selectedSlot: 0,
      weaponCooldown: 0,
      swordSwing: 0,
      upAttackStuckTime: 0,
      swingDuration: 0.28,
      swingWeaponId: "sword",
      swordSwingType: "normal",
      cauldronIngredients: [],
      healingTowardIngredient: 0,
      damageBoostTime: 0,
      invincibilityTime: 0,
      infiniteStaminaTime: 0,
      shieldRaised: false,
    }, state);
    this.cauldronIngredients = [...(state.cauldronIngredients || [])];
  }
}
