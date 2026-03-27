import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // No assets to load for MVP — all visuals are procedural
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
