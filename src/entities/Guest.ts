import Phaser from 'phaser';
import {
  GUEST_CONFIG, NEEDS_DECAY, BLADDER_CONFIG, DRUNK_CONFIG, VENUE, ZONES, SIGNAGE_CONFIG,
  Personality, PERSONALITY_CONFIG, PizzaType, PIZZA_PREFERENCE_BONUS,
} from '../config/GameConfig';

export enum GuestState {
  Idle = 'idle',
  Walking = 'walking',
  Eating = 'eating',
  Dancing = 'dancing',
  Talking = 'talking',
  Drinking = 'drinking',
  UsingBathroom = 'usingBathroom',
  UsingEntertainment = 'usingEntertainment',
  Leaving = 'leaving',
}

export class Guest extends Phaser.GameObjects.Container {
  // Static guest ID counter
  private static nextId: number = 0;
  public guestId: number;

  // Needs (0-100 scale)
  private hunger: number;
  private fun: number;
  private social: number;
  private thirst: number;

  // Bladder (0-100 scale, 0 = empty, 100 = bursting)
  private bladder: number = 0;
  private drinkBoostTimer: number = 0;

  // Drunk system
  private drinksConsumed: number = 0;
  private isDrunk: boolean = false;
  private drunkTimer: number = 0; // ms until sober

  // Personality
  public personality: Personality;

  // Pizza preferences
  public preferredPizza: PizzaType;
  public lastPizzaEaten: PizzaType | null = null;

  // Entertainment
  private currentEntertainmentId: string = '';

  // Guest properties
  private guestName: string;
  private guestState: GuestState = GuestState.Idle;
  private stateTimer: number = 0;
  private activityDuration: number = 0;

  // Movement
  private targetX: number = 0;
  private targetY: number = 0;
  private moveSpeed: number = GUEST_CONFIG.moveSpeed;

  // Visual components
  private bodyGraphics!: Phaser.GameObjects.Graphics;
  private nameLabel!: Phaser.GameObjects.Text;
  private needsBar!: Phaser.GameObjects.Graphics;
  private stateIcon!: Phaser.GameObjects.Text;
  private bodyColor: number;

  // Wander AI
  private wanderTimer: number = 0;
  private wanderDelay: number;

  // Bathroom awareness
  public bathroomSignsPosted: boolean = false;

  // Callbacks
  public onWantsPizza?: () => boolean;
  public onWantsDrink?: () => boolean;
  public onNeedsBathroom?: () => boolean;
  public onDropTrash?: (x: number, y: number) => void;
  public onWantsEntertainment?: (preferredType: string) => boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
    super(scene, x, y);
    this.guestId = Guest.nextId++;
    this.guestName = name;

    // Assign random personality
    const personalities = Object.values(Personality);
    this.personality = personalities[Math.floor(Math.random() * personalities.length)];

    // Assign random pizza preference
    const pizzaTypes = Object.values(PizzaType);
    this.preferredPizza = pizzaTypes[Math.floor(Math.random() * pizzaTypes.length)];

    const { min, max } = GUEST_CONFIG.startingNeeds;
    this.hunger = Phaser.Math.Between(min, max);
    this.fun = Phaser.Math.Between(min, max);
    this.social = Phaser.Math.Between(min, max);
    this.thirst = Phaser.Math.Between(min, max);

    // Use personality color for body
    this.bodyColor = PERSONALITY_CONFIG[this.personality].color;

    this.wanderDelay = Phaser.Math.Between(GUEST_CONFIG.wanderInterval.min, GUEST_CONFIG.wanderInterval.max);

    this.createVisuals();
    scene.add.existing(this);
  }

  private createVisuals(): void {
    this.bodyGraphics = this.scene.add.graphics();
    this.drawBody();
    this.add(this.bodyGraphics);

    this.stateIcon = this.scene.add.text(0, -32, '', { fontSize: '14px' });
    this.stateIcon.setOrigin(0.5, 0.5);
    this.add(this.stateIcon);

    const pIcon = PERSONALITY_CONFIG[this.personality].icon;
    this.nameLabel = this.scene.add.text(0, -22, `${pIcon}${this.guestName}`, {
      fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
    });
    this.nameLabel.setOrigin(0.5, 0.5);
    this.add(this.nameLabel);

    this.needsBar = this.scene.add.graphics();
    this.add(this.needsBar);
  }

  private drawBody(): void {
    this.bodyGraphics.clear();
    this.bodyGraphics.fillStyle(this.bodyColor, 1);
    this.bodyGraphics.fillCircle(0, 0, 12);
    this.bodyGraphics.lineStyle(2, this.isDrunk ? 0xff6b6b : 0xffffff, 0.8);
    this.bodyGraphics.strokeCircle(0, 0, 12);
    // Drunk swirl indicator
    if (this.isDrunk) {
      this.bodyGraphics.lineStyle(1, 0xff6b6b, 0.6);
      this.bodyGraphics.strokeCircle(0, 0, 15);
    }
  }

  private updateNeedsBars(): void {
    this.needsBar.clear();
    const barWidth = 24;
    const barHeight = 3;
    const startY = 14;

    // Hunger bar
    this.needsBar.fillStyle(0x333333, 0.8);
    this.needsBar.fillRect(-barWidth / 2, startY, barWidth, barHeight);
    const hungerPct = this.hunger / 100;
    let hungerColor = 0x4caf50;
    if (hungerPct < 0.3) hungerColor = 0xf44336;
    else if (hungerPct < 0.6) hungerColor = 0xff9800;
    this.needsBar.fillStyle(hungerColor, 1);
    this.needsBar.fillRect(-barWidth / 2, startY, barWidth * hungerPct, barHeight);

    // Thirst bar
    const thirstY = startY + barHeight + 1;
    this.needsBar.fillStyle(0x333333, 0.8);
    this.needsBar.fillRect(-barWidth / 2, thirstY, barWidth, barHeight);
    const thirstPct = this.thirst / 100;
    let thirstColor = 0x3498db;
    if (thirstPct < 0.3) thirstColor = 0xe74c3c;
    else if (thirstPct < 0.6) thirstColor = 0xf39c12;
    this.needsBar.fillStyle(thirstColor, 1);
    this.needsBar.fillRect(-barWidth / 2, thirstY, barWidth * thirstPct, barHeight);

    // Bladder indicator
    if (this.bladder >= BLADDER_CONFIG.urgentThreshold) {
      const urgency = (this.bladder - BLADDER_CONFIG.urgentThreshold) /
        (100 - BLADDER_CONFIG.urgentThreshold);
      const blColor = this.bladder >= BLADDER_CONFIG.emergencyThreshold ? 0xf44336 : 0xf1c40f;
      this.needsBar.fillStyle(blColor, 0.6 + urgency * 0.4);
      this.needsBar.fillCircle(barWidth / 2 + 5, startY + 2, 3);
    }

    // Drunk indicator
    if (this.isDrunk) {
      this.needsBar.fillStyle(0xff6b6b, 0.8);
      this.needsBar.fillCircle(-barWidth / 2 - 5, startY + 2, 3);
    }
  }

  private updateStateIcon(): void {
    const entertainmentIcons: Record<string, string> = {
      arcade: '\u{1F579}\u{FE0F}', photoBooth: '\u{1F4F8}', dj: '\u{1F3A7}',
    };
    const icons: Record<GuestState, string> = {
      [GuestState.Idle]: this.isDrunk ? '\u{1F974}' : '',
      [GuestState.Walking]: this.isDrunk ? '\u{1F974}' : '',
      [GuestState.Eating]: '\u{1F355}',
      [GuestState.Dancing]: '\u{1F483}',
      [GuestState.Talking]: '\u{1F4AC}',
      [GuestState.Drinking]: '\u{1F964}',
      [GuestState.UsingBathroom]: '\u{1F6BB}',
      [GuestState.UsingEntertainment]: entertainmentIcons[this.currentEntertainmentId] || '\u{1F3AE}',
      [GuestState.Leaving]: '\u{1F620}',
    };
    this.stateIcon.setText(icons[this.guestState]);
  }

  // --- Need accessors ---
  public getHunger(): number { return this.hunger; }
  public getFun(): number { return this.fun; }
  public getSocial(): number { return this.social; }
  public getThirst(): number { return this.thirst; }
  public getBladder(): number { return this.bladder; }
  public getDrinksConsumed(): number { return this.drinksConsumed; }
  public getIsDrunk(): boolean { return this.isDrunk; }
  public getGuestState(): GuestState { return this.guestState; }
  public getName(): string { return this.guestName; }
  public getPersonality(): Personality { return this.personality; }
  public getCurrentEntertainmentId(): string { return this.currentEntertainmentId; }
  public setCurrentEntertainmentId(id: string): void { this.currentEntertainmentId = id; }

  public modifyHunger(amount: number): void {
    this.hunger = Phaser.Math.Clamp(this.hunger + amount, 0, 100);
  }
  public modifyFun(amount: number): void {
    this.fun = Phaser.Math.Clamp(this.fun + amount, 0, 100);
  }
  public modifySocial(amount: number): void {
    this.social = Phaser.Math.Clamp(this.social + amount, 0, 100);
  }
  public modifyThirst(amount: number): void {
    this.thirst = Phaser.Math.Clamp(this.thirst + amount, 0, 100);
  }

  public getSatisfaction(): number {
    let sat = (this.hunger + this.fun + this.social + this.thirst) / 4;
    // Bladder emergency penalty
    if (this.bladder >= BLADDER_CONFIG.emergencyThreshold) {
      sat *= 0.4;
    } else if (this.bladder >= BLADDER_CONFIG.urgentThreshold) {
      const urgency = (this.bladder - BLADDER_CONFIG.urgentThreshold) /
        (BLADDER_CONFIG.emergencyThreshold - BLADDER_CONFIG.urgentThreshold);
      sat *= (1.0 - urgency * 0.4);
    }
    // Drunk penalty
    if (this.isDrunk) {
      sat *= DRUNK_CONFIG.satisfactionMultiplier;
    }
    return sat;
  }

  public isUnhappy(): boolean {
    return this.getSatisfaction() < GUEST_CONFIG.leaveThreshold;
  }

  // --- Drunk system ---
  public addDrink(): void {
    this.drinksConsumed++;
    if (this.drinksConsumed >= DRUNK_CONFIG.drinkThreshold && !this.isDrunk) {
      this.makeDrunk();
    }
  }

  /** Called by bartender to check if this guest should be cut off */
  public shouldCutOff(): boolean {
    return this.drinksConsumed >= DRUNK_CONFIG.drinkThreshold;
  }

  private makeDrunk(): void {
    this.isDrunk = true;
    this.drunkTimer = DRUNK_CONFIG.soberUpTime;
    this.drawBody();
    this.updateStateIcon();
  }

  // --- AI ---
  public setGuestState(state: GuestState, duration: number = 0): void {
    this.guestState = state;
    this.stateTimer = 0;
    this.activityDuration = duration;
    this.updateStateIcon();
  }

  public walkTo(x: number, y: number): void {
    this.targetX = Phaser.Math.Clamp(x, VENUE.x + 20, VENUE.right - 20);
    this.targetY = Phaser.Math.Clamp(y, VENUE.y + 20, VENUE.bottom - 20);
    this.guestState = GuestState.Walking;
    this.updateStateIcon();
  }

  private canSeeBathroom(): boolean {
    const bz = ZONES.bathroom;
    const dx = this.x - (bz.x + bz.width / 2);
    const dy = this.y - (bz.y + bz.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const visRange = this.bathroomSignsPosted ? SIGNAGE_CONFIG.signedVisibility : SIGNAGE_CONFIG.baseVisibility;
    return dist < visRange;
  }

  private decideAction(): void {
    // PRIORITY 1: Bladder emergency
    if (this.bladder >= BLADDER_CONFIG.urgentThreshold) {
      if (this.canSeeBathroom()) {
        if (this.onNeedsBathroom && this.onNeedsBathroom()) {
          return;
        }
      }
      this.wanderDelay = 1000;
    }

    // Drunk guests make worse decisions — sometimes wander randomly instead
    if (this.isDrunk && Math.random() < 0.3) {
      this.walkTo(
        Phaser.Math.Between(VENUE.x + 30, VENUE.right - 30),
        Phaser.Math.Between(VENUE.y + 30, VENUE.bottom - 30)
      );
      return;
    }

    const needs = [
      { type: 'hunger', value: this.hunger },
      { type: 'thirst', value: this.thirst },
      { type: 'fun', value: this.fun },
      { type: 'social', value: this.social },
    ];
    needs.sort((a, b) => a.value - b.value);
    const lowest = needs[0];

    if (lowest.type === 'hunger' && this.hunger < 60) {
      if (this.onWantsPizza && this.onWantsPizza()) return;
    }

    if (lowest.type === 'thirst' && this.thirst < 60) {
      if (this.onWantsDrink && this.onWantsDrink()) return;
    }

    if (lowest.type === 'fun' && this.fun < 60) {
      // Try personality-preferred entertainment first
      const funTarget = PERSONALITY_CONFIG[this.personality].funTarget;
      if (funTarget !== 'any' && funTarget !== 'dance') {
        if (this.onWantsEntertainment && this.onWantsEntertainment(funTarget)) return;
      }
      // Try any entertainment
      if (Math.random() < 0.4 && this.onWantsEntertainment && this.onWantsEntertainment('any')) return;
      // Fallback to dance floor
      this.walkTo(Phaser.Math.Between(290, 510), Phaser.Math.Between(270, 450));
      this.activityDuration = Phaser.Math.Between(3000, 6000);
      return;
    }

    if (lowest.type === 'social' && this.social < 60) {
      // Photo booth can also help social
      if (Math.random() < 0.3 && this.onWantsEntertainment && this.onWantsEntertainment('photoBooth')) return;
      this.walkTo(Phaser.Math.Between(570, 720), Phaser.Math.Between(390, 520));
      this.activityDuration = Phaser.Math.Between(3000, 5000);
      return;
    }

    this.walkTo(
      Phaser.Math.Between(VENUE.x + 30, VENUE.right - 30),
      Phaser.Math.Between(VENUE.y + 30, VENUE.bottom - 30)
    );
  }

  private decayNeeds(dt: number, multiplier: number = 1): void {
    const pm = PERSONALITY_CONFIG[this.personality].decayMultiplier;
    this.modifyHunger(-NEEDS_DECAY.hunger * pm.hunger * multiplier * dt);
    this.modifyFun(-NEEDS_DECAY.fun * pm.fun * multiplier * dt);
    this.modifySocial(-NEEDS_DECAY.social * pm.social * multiplier * dt);
    this.modifyThirst(-NEEDS_DECAY.thirst * pm.thirst * multiplier * dt);

    let bladderRate = BLADDER_CONFIG.fillRate;
    if (this.drinkBoostTimer > 0) {
      bladderRate += BLADDER_CONFIG.drinkBoost;
      this.drinkBoostTimer -= dt * 1000;
    }
    this.bladder = Phaser.Math.Clamp(this.bladder + bladderRate * dt, 0, 100);

    // Drunk timer countdown
    if (this.isDrunk) {
      this.drunkTimer -= dt * 1000;
      if (this.drunkTimer <= 0) {
        this.isDrunk = false;
        this.drinksConsumed = 0;
        this.drawBody();
        this.updateStateIcon();
      }
    }
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    this.updateNeedsBars();

    // Check if should leave
    if (this.isUnhappy() && this.guestState !== GuestState.Leaving) {
      this.setGuestState(GuestState.Leaving);
      this.walkTo(VENUE.x + VENUE.width / 2, VENUE.bottom + 30);
      return;
    }

    // Drunk wobble applied to all states
    if (this.isDrunk && this.guestState !== GuestState.Leaving) {
      this.x += Math.sin(Date.now() / 150) * DRUNK_CONFIG.wobbleAmount * dt * 10;
    }

    switch (this.guestState) {
      case GuestState.Idle: {
        this.decayNeeds(dt);

        this.wanderTimer += delta;
        if (this.wanderTimer >= this.wanderDelay) {
          this.wanderTimer = 0;
          this.wanderDelay = Phaser.Math.Between(
            GUEST_CONFIG.wanderInterval.min,
            GUEST_CONFIG.wanderInterval.max
          );
          this.decideAction();
        }
        break;
      }

      case GuestState.Walking: {
        this.decayNeeds(dt);

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          this.x = this.targetX;
          this.y = this.targetY;

          const inDanceFloor = this.x >= 280 && this.x <= 520 && this.y >= 260 && this.y <= 460;
          const inChillZone = this.x >= 560 && this.x <= 730 && this.y >= 380 && this.y <= 530;

          if (inDanceFloor) {
            this.setGuestState(GuestState.Dancing, this.activityDuration || 4000);
          } else if (inChillZone) {
            this.setGuestState(GuestState.Talking, this.activityDuration || 4000);
          } else {
            this.setGuestState(GuestState.Idle);
          }
        } else {
          const speed = this.isDrunk ? this.moveSpeed * 0.7 : this.moveSpeed;
          const vx = (dx / dist) * speed;
          const vy = (dy / dist) * speed;
          this.x += vx * dt;
          this.y += vy * dt;
        }
        break;
      }

      case GuestState.Eating: {
        const eatMult = PERSONALITY_CONFIG[this.personality].bonusMultiplier.eating;
        this.modifyHunger(35 * eatMult * dt);
        // Pizza preference bonus
        if (this.lastPizzaEaten === this.preferredPizza) {
          const extraBonus = this.personality === Personality.Foodie ? PIZZA_PREFERENCE_BONUS * 1.5 : PIZZA_PREFERENCE_BONUS;
          this.modifyHunger(extraBonus * dt);
        }
        this.modifyFun(-NEEDS_DECAY.fun * 0.5 * dt);
        this.modifySocial(-NEEDS_DECAY.social * 0.5 * dt);
        this.modifyThirst(-NEEDS_DECAY.thirst * 0.5 * dt);
        this.bladder = Phaser.Math.Clamp(this.bladder + BLADDER_CONFIG.fillRate * dt, 0, 100);
        if (this.drinkBoostTimer > 0) this.drinkBoostTimer -= dt * 1000;
        if (this.isDrunk) { this.drunkTimer -= dt * 1000; if (this.drunkTimer <= 0) { this.isDrunk = false; this.drinksConsumed = 0; this.drawBody(); } }

        this.stateTimer += delta;
        if (this.stateTimer >= this.activityDuration) {
          const dropChance = this.isDrunk ? DRUNK_CONFIG.trashDropChance : 0.4;
          if (this.onDropTrash && Math.random() < dropChance) {
            this.onDropTrash(this.x + Phaser.Math.Between(-20, 20), this.y + Phaser.Math.Between(-20, 20));
          }
          this.setGuestState(GuestState.Idle);
        }
        break;
      }

      case GuestState.Drinking: {
        this.modifyThirst(30 * dt);
        this.modifyHunger(-NEEDS_DECAY.hunger * 0.5 * dt);
        this.modifyFun(-NEEDS_DECAY.fun * 0.5 * dt);
        this.modifySocial(-NEEDS_DECAY.social * 0.5 * dt);
        this.bladder = Phaser.Math.Clamp(this.bladder + (BLADDER_CONFIG.fillRate + BLADDER_CONFIG.drinkBoost) * dt, 0, 100);

        this.stateTimer += delta;
        if (this.stateTimer >= this.activityDuration) {
          this.addDrink();
          this.drinkBoostTimer = BLADDER_CONFIG.drinkBoostDuration;
          const dropChance = this.isDrunk ? DRUNK_CONFIG.trashDropChance : 0.3;
          if (this.onDropTrash && Math.random() < dropChance) {
            this.onDropTrash(this.x + Phaser.Math.Between(-20, 20), this.y + Phaser.Math.Between(-20, 20));
          }
          this.setGuestState(GuestState.Idle);
        }
        break;
      }

      case GuestState.Dancing: {
        const danceMult = PERSONALITY_CONFIG[this.personality].bonusMultiplier.dancing;
        this.modifyHunger(-NEEDS_DECAY.hunger * 1.5 * dt);
        this.modifyFun(20 * danceMult * dt);
        this.modifySocial(-NEEDS_DECAY.social * 0.3 * dt);
        this.modifyThirst(-NEEDS_DECAY.thirst * 1.5 * dt);
        this.bladder = Phaser.Math.Clamp(this.bladder + BLADDER_CONFIG.fillRate * dt, 0, 100);
        if (this.drinkBoostTimer > 0) this.drinkBoostTimer -= dt * 1000;
        if (this.isDrunk) { this.drunkTimer -= dt * 1000; if (this.drunkTimer <= 0) { this.isDrunk = false; this.drinksConsumed = 0; this.drawBody(); } }

        this.x += Math.sin(Date.now() / 200) * 0.3;

        this.stateTimer += delta;
        if (this.stateTimer >= this.activityDuration) {
          this.setGuestState(GuestState.Idle);
        }
        break;
      }

      case GuestState.Talking: {
        const talkMult = PERSONALITY_CONFIG[this.personality].bonusMultiplier.talking;
        this.modifyHunger(-NEEDS_DECAY.hunger * dt);
        this.modifyFun(-NEEDS_DECAY.fun * 0.5 * dt);
        this.modifySocial(25 * talkMult * dt);
        this.modifyThirst(-NEEDS_DECAY.thirst * dt);
        this.bladder = Phaser.Math.Clamp(this.bladder + BLADDER_CONFIG.fillRate * dt, 0, 100);
        if (this.drinkBoostTimer > 0) this.drinkBoostTimer -= dt * 1000;
        if (this.isDrunk) { this.drunkTimer -= dt * 1000; if (this.drunkTimer <= 0) { this.isDrunk = false; this.drinksConsumed = 0; this.drawBody(); } }

        this.stateTimer += delta;
        if (this.stateTimer >= this.activityDuration) {
          this.setGuestState(GuestState.Idle);
        }
        break;
      }

      case GuestState.UsingBathroom: {
        this.modifyHunger(-NEEDS_DECAY.hunger * 0.3 * dt);
        this.modifyFun(-NEEDS_DECAY.fun * 0.3 * dt);
        this.modifySocial(-NEEDS_DECAY.social * 0.3 * dt);
        this.modifyThirst(-NEEDS_DECAY.thirst * 0.3 * dt);

        this.stateTimer += delta;
        if (this.stateTimer >= this.activityDuration) {
          this.bladder = 0;
          this.drinkBoostTimer = 0;
          this.setGuestState(GuestState.Idle);
        }
        break;
      }

      case GuestState.UsingEntertainment: {
        // Fun and social gains are applied by GameScene based on entertainment def
        // Here we just decay other needs slowly
        this.modifyHunger(-NEEDS_DECAY.hunger * 0.5 * dt);
        this.modifyThirst(-NEEDS_DECAY.thirst * 0.5 * dt);
        this.bladder = Phaser.Math.Clamp(this.bladder + BLADDER_CONFIG.fillRate * dt, 0, 100);
        if (this.drinkBoostTimer > 0) this.drinkBoostTimer -= dt * 1000;
        if (this.isDrunk) { this.drunkTimer -= dt * 1000; if (this.drunkTimer <= 0) { this.isDrunk = false; this.drinksConsumed = 0; this.drawBody(); } }

        this.stateTimer += delta;
        if (this.stateTimer >= this.activityDuration) {
          this.currentEntertainmentId = '';
          this.setGuestState(GuestState.Idle);
        }
        break;
      }

      case GuestState.Leaving: {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          this.emit('guest-left', this);
        } else {
          const vx = (dx / dist) * this.moveSpeed * 1.5;
          const vy = (dy / dist) * this.moveSpeed * 1.5;
          this.x += vx * dt;
          this.y += vy * dt;
        }
        break;
      }
    }
  }
}
