import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Draw party venue background (colored rectangle for now)
    this.drawVenueBackground();

    // Title text with pizza-themed styling
    const title = this.add.text(width / 2, 60, 'Pizza Party Simulator', {
      fontSize: '48px',
      color: '#ff6b35',
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#2d2d44',
      strokeThickness: 6,
    });
    title.setOrigin(0.5, 0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, 110, 'Keep the party going!', {
      fontSize: '20px',
      color: '#ffcc00',
      fontFamily: 'Arial, sans-serif',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Phase 1 MVP placeholder text
    const mvpText = this.add.text(width / 2, height / 2, 'Phase 1 MVP - Coming Soon', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: { x: 20, y: 10 },
    });
    mvpText.setOrigin(0.5, 0.5);

    // Add some decorative pizza emojis as placeholder
    this.addDecorativePizzas();

    // Instructions text
    const instructions = this.add.text(width / 2, height - 50, 'Press SPACE to start (when ready)', {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'Arial, sans-serif',
    });
    instructions.setOrigin(0.5, 0.5);

    // Blinking effect on instructions
    this.tweens.add({
      targets: instructions,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private drawVenueBackground(): void {
    const graphics = this.add.graphics();

    // Main floor (warm wood color)
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillRect(50, 140, 700, 410);

    // Floor pattern - checkerboard tiles
    graphics.fillStyle(0xa0522d, 1);
    for (let x = 0; x < 14; x++) {
      for (let y = 0; y < 8; y++) {
        if ((x + y) % 2 === 0) {
          graphics.fillRect(50 + x * 50, 140 + y * 51, 50, 51);
        }
      }
    }

    // Venue border/walls
    graphics.lineStyle(8, 0x4a3728, 1);
    graphics.strokeRect(50, 140, 700, 410);

    // Pizza table area (top-left)
    graphics.fillStyle(0xd2691e, 1);
    graphics.fillRect(70, 160, 120, 80);
    graphics.lineStyle(3, 0x8b4513, 1);
    graphics.strokeRect(70, 160, 120, 80);

    // Dance floor area (center)
    graphics.fillStyle(0x4a4a6a, 0.6);
    graphics.fillRect(280, 260, 240, 200);

    // Dance floor lights effect
    const colors = [0xff6b35, 0xffcc00, 0xff4757, 0x7bed9f];
    for (let i = 0; i < 4; i++) {
      graphics.fillStyle(colors[i], 0.3);
      graphics.fillCircle(340 + (i % 2) * 120, 320 + Math.floor(i / 2) * 80, 30);
    }

    // Chill zone (bottom-right)
    graphics.fillStyle(0x6b5b4f, 1);
    graphics.fillRect(560, 380, 170, 150);
    graphics.lineStyle(2, 0x5a4a3f, 1);
    graphics.strokeRect(560, 380, 170, 150);
  }

  private addDecorativePizzas(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Pizza slice decorations using text (placeholder until we have sprites)
    const pizzaPositions = [
      { x: 130, y: 200, scale: 1.5 },
      { x: 100, y: height - 80, scale: 1 },
      { x: width - 100, y: 180, scale: 1.2 },
    ];

    pizzaPositions.forEach((pos) => {
      const pizza = this.add.text(pos.x, pos.y, '🍕', {
        fontSize: `${32 * pos.scale}px`,
      });
      pizza.setOrigin(0.5, 0.5);

      // Gentle floating animation
      this.tweens.add({
        targets: pizza,
        y: pos.y - 10,
        duration: 1500 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }
}
