import Phaser from 'phaser';

export class Trash extends Phaser.GameObjects.Container {
  private emoji: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const trashEmojis = ['🍕', '🥤', '🧻', '🍽️'];
    const pick = trashEmojis[Math.floor(Math.random() * trashEmojis.length)];

    this.emoji = scene.add.text(0, 0, pick, { fontSize: '16px' });
    this.emoji.setOrigin(0.5, 0.5);
    this.add(this.emoji);

    // Make clickable
    this.setSize(24, 24);
    this.setInteractive({ useHandCursor: true });

    scene.add.existing(this);
  }
}
