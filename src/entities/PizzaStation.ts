import Phaser from 'phaser';
import { PizzaType, PIZZA_VARIETY_CONFIG, PIZZA_CONFIG, ZONES } from '../config/GameConfig';

export class PizzaStation extends Phaser.GameObjects.Container {
  private inventory: Map<PizzaType, number> = new Map();
  private isOrdering: Map<PizzaType, boolean> = new Map();
  private orderTimers: Map<PizzaType, number> = new Map();
  private slicesText!: Phaser.GameObjects.Text;
  private progressBars: Map<PizzaType, Phaser.GameObjects.Graphics> = new Map();

  constructor(scene: Phaser.Scene) {
    const zone = ZONES.pizzaTable;
    super(scene, zone.x + zone.width / 2, zone.y + zone.height / 2);

    // Initialize inventory for each type
    for (const config of PIZZA_VARIETY_CONFIG.types) {
      this.inventory.set(config.type, 0);
      this.isOrdering.set(config.type, false);
      this.orderTimers.set(config.type, 0);
    }

    this.createVisuals();
    scene.add.existing(this);
  }

  private createVisuals(): void {
    // Slices counter text
    this.slicesText = this.scene.add.text(0, -38, '', {
      fontSize: '11px', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 3 },
    });
    this.slicesText.setOrigin(0.5, 0.5);
    this.add(this.slicesText);

    // Create 3 buttons (one per pizza type), arranged horizontally
    const types = PIZZA_VARIETY_CONFIG.types;
    const BTN_W = 38;
    const BTN_H = 36;
    const spacing = 2;
    const totalWidth = types.length * BTN_W + (types.length - 1) * spacing;
    const startX = -totalWidth / 2;

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      const btnX = startX + i * (BTN_W + spacing) + BTN_W / 2;
      const btnY = 4;

      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(t.color, 1);
      btnBg.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 6);
      btnBg.lineStyle(2, 0xffffff, 0.8);
      btnBg.strokeRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 6);

      const btnText = this.scene.add.text(0, 0, t.icon, {
        fontSize: '18px',
      });
      btnText.setOrigin(0.5, 0.5);

      const btn = this.scene.add.container(btnX, btnY, [btnBg, btnText]);
      btn.setSize(BTN_W, BTN_H);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.orderPizza(t.type));
      this.add(btn);

      // Progress bar per type
      const pbar = this.scene.add.graphics();
      this.add(pbar);
      this.progressBars.set(t.type, pbar);
    }

    this.setDepth(10);
  }

  public orderPizza(type: PizzaType): void {
    if (this.isOrdering.get(type)) return;
    if ((this.inventory.get(type) || 0) >= PIZZA_CONFIG.maxSlicesPerType) return;

    this.isOrdering.set(type, true);
    this.orderTimers.set(type, 0);
  }

  public update(_time: number, delta: number): void {
    const types = PIZZA_VARIETY_CONFIG.types;

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      const pbar = this.progressBars.get(t.type)!;

      if (this.isOrdering.get(t.type)) {
        const timer = (this.orderTimers.get(t.type) || 0) + delta;
        this.orderTimers.set(t.type, timer);
        const progress = Math.min(timer / PIZZA_CONFIG.orderTime, 1);

        // Draw small progress bar below button
        const totalWidth = types.length * 38 + (types.length - 1) * 2;
        const startX = -totalWidth / 2;
        const barX = startX + i * 40;
        pbar.clear();
        pbar.fillStyle(0x333333, 1);
        pbar.fillRoundedRect(barX, 28, 38, 6, 2);
        pbar.fillStyle(0x4caf50, 1);
        pbar.fillRoundedRect(barX, 28, 38 * progress, 6, 2);

        if (progress >= 1) {
          this.isOrdering.set(t.type, false);
          const current = this.inventory.get(t.type) || 0;
          this.inventory.set(t.type, Math.min(current + PIZZA_CONFIG.maxSlicesPerType, PIZZA_CONFIG.maxSlicesPerType));
          pbar.clear();
        }
      }
    }

    // Update text
    const counts = types.map(t => `${t.icon}${this.inventory.get(t.type) || 0}`).join(' ');
    this.slicesText.setText(counts);
  }

  public hasSlices(): boolean {
    for (const count of this.inventory.values()) {
      if (count > 0) return true;
    }
    return false;
  }

  public hasSlicesOfType(type: PizzaType): boolean {
    return (this.inventory.get(type) || 0) > 0;
  }

  /** Try to take a slice of the preferred type; if unavailable, take any. Returns pizza type or null. */
  public takeSlice(preferredType?: PizzaType): PizzaType | null {
    // Try preferred first
    if (preferredType) {
      const count = this.inventory.get(preferredType) || 0;
      if (count > 0) {
        this.inventory.set(preferredType, count - 1);
        return preferredType;
      }
    }
    // Fall back to any available
    for (const [type, count] of this.inventory.entries()) {
      if (count > 0) {
        this.inventory.set(type, count - 1);
        return type;
      }
    }
    return null;
  }

  public isFullForType(type: PizzaType): boolean {
    return (this.inventory.get(type) || 0) >= PIZZA_CONFIG.maxSlicesPerType;
  }

  public getSliceCount(): number {
    let total = 0;
    for (const count of this.inventory.values()) {
      total += count;
    }
    return total;
  }
}
