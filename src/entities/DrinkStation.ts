import Phaser from 'phaser';
import { DRINK_CONFIG, ZONES } from '../config/GameConfig';

export class DrinkStation extends Phaser.GameObjects.Container {
  private drinksAvailable: number = 0;
  private isOrdering: boolean = false;
  private orderTimer: number = 0;
  private drinksText!: Phaser.GameObjects.Text;
  private orderButton!: Phaser.GameObjects.Container;
  private progressBar!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    const zone = ZONES.bar;
    super(scene, zone.x + zone.width / 2, zone.y + zone.height / 2);

    this.createVisuals();
    scene.add.existing(this);
  }

  private createVisuals(): void {
    // Drinks counter (above button)
    this.drinksText = this.scene.add.text(0, -32, '\u{1F964} 0 drinks', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 6, y: 3 },
    });
    this.drinksText.setOrigin(0.5, 0.5);
    this.add(this.drinksText);

    // Order Drinks button
    const BTN_W = 120;
    const BTN_H = 42;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0x3498db, 1);
    btnBg.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 8);
    btnBg.lineStyle(3, 0xffffff, 0.9);
    btnBg.strokeRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 8);

    const btnText = this.scene.add.text(0, 0, '\u{1F964} Order Drinks', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5, 0.5);

    this.orderButton = this.scene.add.container(0, 8, [btnBg, btnText]);
    this.orderButton.setSize(BTN_W, BTN_H);
    this.orderButton.setInteractive({ useHandCursor: true });
    this.orderButton.on('pointerdown', () => this.orderDrinks());
    this.add(this.orderButton);

    // Progress bar (below button)
    this.progressBar = this.scene.add.graphics();
    this.add(this.progressBar);

    this.setDepth(10);
  }

  public orderDrinks(): void {
    if (this.isOrdering) return;
    if (this.drinksAvailable >= DRINK_CONFIG.maxDrinks) return;

    this.isOrdering = true;
    this.orderTimer = 0;
  }

  public update(_time: number, delta: number): void {
    if (this.isOrdering) {
      this.orderTimer += delta;
      const progress = Math.min(this.orderTimer / DRINK_CONFIG.orderTime, 1);

      // Draw progress bar
      this.progressBar.clear();
      this.progressBar.fillStyle(0x333333, 1);
      this.progressBar.fillRoundedRect(-60, 36, 120, 10, 4);
      this.progressBar.fillStyle(0x3498db, 1);
      this.progressBar.fillRoundedRect(-60, 36, 120 * progress, 10, 4);

      if (progress >= 1) {
        this.isOrdering = false;
        this.drinksAvailable = Math.min(this.drinksAvailable + DRINK_CONFIG.maxDrinks, DRINK_CONFIG.maxDrinks);
        this.progressBar.clear();
      }
    }

    this.drinksText.setText(`\u{1F964} ${this.drinksAvailable} drinks`);
  }

  public hasDrinks(): boolean {
    return this.drinksAvailable > 0;
  }

  public takeDrink(): boolean {
    if (this.drinksAvailable > 0) {
      this.drinksAvailable--;
      return true;
    }
    return false;
  }

  public getDrinkCount(): number {
    return this.drinksAvailable;
  }

  /** Used by bartender staff to auto-restock */
  public addDrinks(amount: number): void {
    this.drinksAvailable = Math.min(this.drinksAvailable + amount, DRINK_CONFIG.maxDrinks);
  }
}
