import Phaser from 'phaser';
import { STAFF_CONFIG, VENUE } from '../config/GameConfig';

export enum StaffRole {
  Bartender = 'bartender',
  Cleaner = 'cleaner',
}

export enum StaffState {
  Idle = 'idle',
  Walking = 'walking',
  Working = 'working',
}

export class Staff extends Phaser.GameObjects.Container {
  public role: StaffRole;
  public level: number = 1;

  private staffState: StaffState = StaffState.Idle;
  private stateTimer: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private idleX: number;
  private idleY: number;

  // Visual
  private bodyGraphics!: Phaser.GameObjects.Graphics;
  private roleIcon!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  // AI timers
  private actionTimer: number = 0;
  private actionInterval: number = 2000;

  // Callbacks set by GameScene
  public onLookForTrash?: () => { x: number; y: number } | null;
  public onCleanTrashAt?: (x: number, y: number) => boolean;
  public onRestockDrinks?: (amount: number) => void;
  public onCheckGuestDrunk?: (guestX: number, guestY: number) => boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, role: StaffRole) {
    super(scene, x, y);
    this.role = role;
    this.idleX = x;
    this.idleY = y;

    this.createVisuals();
    scene.add.existing(this);
    this.setDepth(8);
  }

  private createVisuals(): void {
    this.bodyGraphics = this.scene.add.graphics();
    this.drawBody();
    this.add(this.bodyGraphics);

    const icon = this.role === StaffRole.Bartender ? '\u{1F37A}' : '\u{1F9F9}';
    this.roleIcon = this.scene.add.text(0, -20, icon, { fontSize: '14px' });
    this.roleIcon.setOrigin(0.5, 0.5);
    this.add(this.roleIcon);

    this.levelText = this.scene.add.text(0, 16, `Lv${this.level}`, {
      fontSize: '8px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 2, y: 1 },
    });
    this.levelText.setOrigin(0.5, 0.5);
    this.add(this.levelText);
  }

  private drawBody(): void {
    this.bodyGraphics.clear();
    const color = this.role === StaffRole.Bartender ? 0x2980b9 : 0x27ae60;
    // Square body to distinguish from round guests
    this.bodyGraphics.fillStyle(color, 1);
    this.bodyGraphics.fillRoundedRect(-10, -10, 20, 20, 4);
    this.bodyGraphics.lineStyle(2, 0xffffff, 0.9);
    this.bodyGraphics.strokeRoundedRect(-10, -10, 20, 20, 4);
  }

  public getLevel(): number { return this.level; }

  public trainUp(): boolean {
    if (this.level >= STAFF_CONFIG.maxLevel) return false;
    this.level++;
    this.levelText.setText(`Lv${this.level}`);
    // Visual flash
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3, scaleY: 1.3,
      duration: 200,
      yoyo: true,
    });
    return true;
  }

  private getSpeedMultiplier(): number {
    return 1 + (this.level - 1) * STAFF_CONFIG.levelSpeedBonus;
  }

  public walkTo(x: number, y: number): void {
    this.targetX = Phaser.Math.Clamp(x, VENUE.x + 15, VENUE.right - 15);
    this.targetY = Phaser.Math.Clamp(y, VENUE.y + 15, VENUE.bottom - 15);
    this.staffState = StaffState.Walking;
  }

  private getBaseSpeed(): number {
    const cfg = this.role === StaffRole.Bartender
      ? STAFF_CONFIG.bartender.moveSpeed
      : STAFF_CONFIG.cleaner.moveSpeed;
    return cfg * this.getSpeedMultiplier();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    switch (this.staffState) {
      case StaffState.Idle: {
        this.actionTimer += delta;
        if (this.actionTimer >= this.actionInterval) {
          this.actionTimer = 0;
          this.decideAction();
        }
        break;
      }

      case StaffState.Walking: {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          this.x = this.targetX;
          this.y = this.targetY;
          this.onArrived();
        } else {
          const speed = this.getBaseSpeed();
          this.x += (dx / dist) * speed * dt;
          this.y += (dy / dist) * speed * dt;
        }
        break;
      }

      case StaffState.Working: {
        this.stateTimer += delta;
        const workTime = this.getWorkDuration();
        if (this.stateTimer >= workTime) {
          this.completeWork();
        }
        break;
      }
    }
  }

  private getWorkDuration(): number {
    if (this.role === StaffRole.Bartender) {
      return STAFF_CONFIG.bartender.serveTime / this.getSpeedMultiplier();
    }
    return STAFF_CONFIG.cleaner.cleanTime / this.getSpeedMultiplier();
  }

  private decideAction(): void {
    if (this.role === StaffRole.Cleaner) {
      // Look for trash to clean
      if (this.onLookForTrash) {
        const trash = this.onLookForTrash();
        if (trash) {
          this.walkTo(trash.x, trash.y);
          return;
        }
      }
      // No trash — return to idle position
      if (Math.abs(this.x - this.idleX) > 20 || Math.abs(this.y - this.idleY) > 20) {
        this.walkTo(this.idleX, this.idleY);
      }
    } else if (this.role === StaffRole.Bartender) {
      // Bartender: auto-restock drinks periodically
      if (this.onRestockDrinks) {
        this.staffState = StaffState.Working;
        this.stateTimer = 0;
      }
    }
  }

  private onArrived(): void {
    if (this.role === StaffRole.Cleaner) {
      // Try to clean trash at current position
      if (this.onCleanTrashAt && this.onCleanTrashAt(this.x, this.y)) {
        this.staffState = StaffState.Working;
        this.stateTimer = 0;
        this.roleIcon.setText('\u{2728}');
      } else {
        this.staffState = StaffState.Idle;
        this.actionTimer = 0;
      }
    } else {
      this.staffState = StaffState.Idle;
      this.actionTimer = 0;
    }
  }

  private completeWork(): void {
    if (this.role === StaffRole.Cleaner) {
      this.roleIcon.setText('\u{1F9F9}');
    } else if (this.role === StaffRole.Bartender) {
      // Restock drinks
      if (this.onRestockDrinks) {
        this.onRestockDrinks(STAFF_CONFIG.bartender.restockAmount);
      }
      this.actionInterval = STAFF_CONFIG.bartender.restockInterval / this.getSpeedMultiplier();
    }
    this.staffState = StaffState.Idle;
    this.stateTimer = 0;
    this.actionTimer = 0;
  }
}
