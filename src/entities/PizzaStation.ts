import Phaser from 'phaser';
import { PIZZA_CONFIG, ZONES } from '../config/GameConfig';

export class PizzaStation extends Phaser.GameObjects.Container {
  private slicesAvailable: number = 0;
  private isOrdering: boolean = false;
  private orderTimer: number = 0;
  private slicesText!: Phaser.GameObjects.Text;
  private orderButton!: Phaser.GameObjects.Container;
  private progressBar!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    const zone = ZONES.pizzaTable;
    super(scene, zone.x + zone.width / 2, zone.y + zone.height / 2);

    this.createVisuals();
    scene.add.existing(this);
  }

  private createVisuals(): void {
    // Slices counter
    this.slicesText = this.scene.add.text(0, -20, '🍕 0 slices', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 6, y: 3 },
    });
    this.slicesText.setOrigin(0.5, 0.5);
    this.add(this.slicesText);

    // Order button
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0xff6b35, 1);
    btnBg.fillRoundedRect(-40, 5, 80, 28, 6);
    btnBg.lineStyle(2, 0xffffff, 0.8);
    btnBg.strokeRoundedRect(-40, 5, 80, 28, 6);

    const btnText = this.scene.add.text(0, 19, 'Order Pizza', {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5, 0.5);

    this.orderButton = this.scene.add.container(0, 0, [btnBg, btnText]);
    this.orderButton.setSize(80, 28);
    this.orderButton.setInteractive({ useHandCursor: true });
    this.orderButton.on('pointerdown', () => this.orderPizza());
    this.add(this.orderButton);

    // Progress bar (hidden by default)
    this.progressBar = this.scene.add.graphics();
    this.add(this.progressBar);
  }

  public orderPizza(): void {
    if (this.isOrdering) return;
    if (this.slicesAvailable >= PIZZA_CONFIG.maxSlices) return;

    this.isOrdering = true;
    this.orderTimer = 0;
  }

  public update(_time: number, delta: number): void {
    if (this.isOrdering) {
      this.orderTimer += delta;
      const progress = Math.min(this.orderTimer / PIZZA_CONFIG.orderTime, 1);

      // Draw progress bar
      this.progressBar.clear();
      this.progressBar.fillStyle(0x333333, 1);
      this.progressBar.fillRoundedRect(-40, 38, 80, 8, 3);
      this.progressBar.fillStyle(0x4caf50, 1);
      this.progressBar.fillRoundedRect(-40, 38, 80 * progress, 8, 3);

      if (progress >= 1) {
        this.isOrdering = false;
        this.slicesAvailable = Math.min(this.slicesAvailable + PIZZA_CONFIG.maxSlices, PIZZA_CONFIG.maxSlices);
        this.progressBar.clear();
      }
    }

    this.slicesText.setText(`🍕 ${this.slicesAvailable} slices`);
  }

  public hasSlices(): boolean {
    return this.slicesAvailable > 0;
  }

  public takeSlice(): boolean {
    if (this.slicesAvailable > 0) {
      this.slicesAvailable--;
      return true;
    }
    return false;
  }

  public getSliceCount(): number {
    return this.slicesAvailable;
  }
}
