import Phaser from 'phaser';
import { GUEST_CONFIG, NEEDS_DECAY, VENUE } from '../config/GameConfig';

export enum GuestState {
  Idle = 'idle',
  Walking = 'walking',
  Eating = 'eating',
  Dancing = 'dancing',
  Talking = 'talking',
  Leaving = 'leaving',
}

export class Guest extends Phaser.GameObjects.Container {
  // Needs (0-100 scale)
  private hunger: number;
  private fun: number;
  private social: number;

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
  private hungerBar!: Phaser.GameObjects.Graphics;
  private stateIcon!: Phaser.GameObjects.Text;
  private bodyColor: number;

  // Wander AI
  private wanderTimer: number = 0;
  private wanderDelay: number;

  // Callback for when guest decides to eat
  public onWantsPizza?: () => boolean;
  public onDropTrash?: (x: number, y: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
    super(scene, x, y);
    this.guestName = name;

    // Randomize starting needs
    const { min, max } = GUEST_CONFIG.startingNeeds;
    this.hunger = Phaser.Math.Between(min, max);
    this.fun = Phaser.Math.Between(min, max);
    this.social = Phaser.Math.Between(min, max);

    // Random appearance
    const colors = [0xff6b35, 0x4ecdc4, 0xff6b6b, 0xc44dff, 0x45b7d1, 0xffa07a, 0x98d8c8, 0xf7dc6f];
    this.bodyColor = colors[Math.floor(Math.random() * colors.length)];

    this.wanderDelay = Phaser.Math.Between(GUEST_CONFIG.wanderInterval.min, GUEST_CONFIG.wanderInterval.max);

    this.createVisuals();
    scene.add.existing(this);
  }

  private createVisuals(): void {
    // Body circle
    this.bodyGraphics = this.scene.add.graphics();
    this.drawBody();
    this.add(this.bodyGraphics);

    // State icon (emoji above head)
    this.stateIcon = this.scene.add.text(0, -32, '', { fontSize: '14px' });
    this.stateIcon.setOrigin(0.5, 0.5);
    this.add(this.stateIcon);

    // Name label
    this.nameLabel = this.scene.add.text(0, -22, this.guestName, {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.nameLabel.setOrigin(0.5, 0.5);
    this.add(this.nameLabel);

    // Hunger bar background + fill
    this.hungerBar = this.scene.add.graphics();
    this.add(this.hungerBar);
  }

  private drawBody(): void {
    this.bodyGraphics.clear();
    this.bodyGraphics.fillStyle(this.bodyColor, 1);
    this.bodyGraphics.fillCircle(0, 0, 12);
    this.bodyGraphics.lineStyle(2, 0xffffff, 0.8);
    this.bodyGraphics.strokeCircle(0, 0, 12);
  }

  private updateHungerBar(): void {
    this.hungerBar.clear();
    const barWidth = 24;
    const barHeight = 3;
    const barY = 14;

    // Background
    this.hungerBar.fillStyle(0x333333, 0.8);
    this.hungerBar.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    // Fill — color based on level
    const pct = this.hunger / 100;
    let color = 0x4caf50; // green
    if (pct < 0.3) color = 0xf44336; // red
    else if (pct < 0.6) color = 0xff9800; // orange

    this.hungerBar.fillStyle(color, 1);
    this.hungerBar.fillRect(-barWidth / 2, barY, barWidth * pct, barHeight);
  }

  private updateStateIcon(): void {
    const icons: Record<GuestState, string> = {
      [GuestState.Idle]: '',
      [GuestState.Walking]: '',
      [GuestState.Eating]: '🍕',
      [GuestState.Dancing]: '💃',
      [GuestState.Talking]: '💬',
      [GuestState.Leaving]: '😠',
    };
    this.stateIcon.setText(icons[this.guestState]);
  }

  // --- Need accessors ---
  public getHunger(): number { return this.hunger; }
  public getFun(): number { return this.fun; }
  public getSocial(): number { return this.social; }
  public getGuestState(): GuestState { return this.guestState; }
  public getName(): string { return this.guestName; }

  public modifyHunger(amount: number): void {
    this.hunger = Phaser.Math.Clamp(this.hunger + amount, 0, 100);
  }
  public modifyFun(amount: number): void {
    this.fun = Phaser.Math.Clamp(this.fun + amount, 0, 100);
  }
  public modifySocial(amount: number): void {
    this.social = Phaser.Math.Clamp(this.social + amount, 0, 100);
  }

  public getSatisfaction(): number {
    return (this.hunger + this.fun + this.social) / 3;
  }

  public isUnhappy(): boolean {
    return this.getSatisfaction() < GUEST_CONFIG.leaveThreshold;
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

  private decideAction(): void {
    // Determine most urgent need
    const lowestNeed = Math.min(this.hunger, this.fun, this.social);

    if (this.hunger <= lowestNeed && this.hunger < 60) {
      // Try to eat
      if (this.onWantsPizza && this.onWantsPizza()) {
        return; // GameScene handles moving guest to pizza table
      }
    }

    if (this.fun <= lowestNeed && this.fun < 60) {
      // Go dance
      this.walkTo(
        Phaser.Math.Between(290, 510),
        Phaser.Math.Between(270, 450)
      );
      this.activityDuration = Phaser.Math.Between(3000, 6000);
      return;
    }

    if (this.social <= lowestNeed && this.social < 60) {
      // Go to chill zone to socialize
      this.walkTo(
        Phaser.Math.Between(570, 720),
        Phaser.Math.Between(390, 520)
      );
      this.activityDuration = Phaser.Math.Between(3000, 5000);
      return;
    }

    // Wander randomly
    this.walkTo(
      Phaser.Math.Between(VENUE.x + 30, VENUE.right - 30),
      Phaser.Math.Between(VENUE.y + 30, VENUE.bottom - 30)
    );
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // Update hunger bar
    this.updateHungerBar();

    // Check if should leave
    if (this.isUnhappy() && this.guestState !== GuestState.Leaving) {
      this.setGuestState(GuestState.Leaving);
      this.walkTo(VENUE.x + VENUE.width / 2, VENUE.bottom + 30);
      return;
    }

    switch (this.guestState) {
      case GuestState.Idle: {
        // Decay needs
        this.modifyHunger(-NEEDS_DECAY.hunger * dt);
        this.modifyFun(-NEEDS_DECAY.fun * dt);
        this.modifySocial(-NEEDS_DECAY.social * dt);

        // Wander timer
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
        // Decay needs while walking
        this.modifyHunger(-NEEDS_DECAY.hunger * dt);
        this.modifyFun(-NEEDS_DECAY.fun * dt);
        this.modifySocial(-NEEDS_DECAY.social * dt);

        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          this.x = this.targetX;
          this.y = this.targetY;

          // Check which zone we're in
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
          const vx = (dx / dist) * this.moveSpeed;
          const vy = (dy / dist) * this.moveSpeed;
          this.x += vx * dt;
          this.y += vy * dt;
        }
        break;
      }

      case GuestState.Eating: {
        this.modifyHunger(35 * dt);
        this.modifyFun(-NEEDS_DECAY.fun * 0.5 * dt);
        this.modifySocial(-NEEDS_DECAY.social * 0.5 * dt);

        this.stateTimer += delta;
        if (this.stateTimer >= this.activityDuration) {
          // Done eating — maybe drop trash
          if (this.onDropTrash && Math.random() < 0.4) {
            this.onDropTrash(this.x + Phaser.Math.Between(-20, 20), this.y + Phaser.Math.Between(-20, 20));
          }
          this.setGuestState(GuestState.Idle);
        }
        break;
      }

      case GuestState.Dancing: {
        this.modifyHunger(-NEEDS_DECAY.hunger * 1.5 * dt);
        this.modifyFun(20 * dt);
        this.modifySocial(-NEEDS_DECAY.social * 0.3 * dt);

        // Small dance wiggle
        this.x += Math.sin(Date.now() / 200) * 0.3;

        this.stateTimer += delta;
        if (this.stateTimer >= this.activityDuration) {
          this.setGuestState(GuestState.Idle);
        }
        break;
      }

      case GuestState.Talking: {
        this.modifyHunger(-NEEDS_DECAY.hunger * dt);
        this.modifyFun(-NEEDS_DECAY.fun * 0.5 * dt);
        this.modifySocial(25 * dt);

        this.stateTimer += delta;
        if (this.stateTimer >= this.activityDuration) {
          this.setGuestState(GuestState.Idle);
        }
        break;
      }

      case GuestState.Leaving: {
        // Move towards exit
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          // Guest has left
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
