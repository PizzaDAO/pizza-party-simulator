import Phaser from 'phaser';

/**
 * Guest entity - A party attendee with needs that must be satisfied
 *
 * Needs (Phase 1 MVP):
 * - Hunger: Satisfied by eating pizza
 * - Fun: Satisfied by dancing or socializing
 * - Social: Satisfied by talking to other guests
 *
 * States:
 * - Idle: Standing around
 * - Walking: Moving to a destination
 * - Eating: Consuming pizza
 * - Dancing: On the dance floor
 * - Talking: Socializing with another guest
 * - Leaving: Exiting the party (if needs drop too low)
 */
export class Guest extends Phaser.GameObjects.Container {
  // Needs (0-100 scale)
  private hunger: number = 50;
  private fun: number = 50;
  private social: number = 50;

  // Guest properties
  private guestName: string;
  private guestState: GuestState = GuestState.Idle;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
    super(scene, x, y);
    this.guestName = name;

    // Placeholder: Will be replaced with actual sprite
    this.createPlaceholderVisual();

    scene.add.existing(this as Phaser.GameObjects.Container);
  }

  private createPlaceholderVisual(): void {
    // Simple circle as placeholder
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xff6b35, 1);
    graphics.fillCircle(0, 0, 16);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircle(0, 0, 16);
    this.add(graphics);

    // Name label
    const nameLabel = this.scene.add.text(0, -25, this.guestName, {
      fontSize: '12px',
      color: '#ffffff',
    });
    nameLabel.setOrigin(0.5, 0.5);
    this.add(nameLabel);
  }

  // Getters for needs
  public getHunger(): number {
    return this.hunger;
  }

  public getFun(): number {
    return this.fun;
  }

  public getSocial(): number {
    return this.social;
  }

  public getGuestState(): GuestState {
    return this.guestState;
  }

  public getName(): string {
    return this.guestName;
  }

  // Need modifiers (to be called by NeedsSystem)
  public modifyHunger(amount: number): void {
    this.hunger = Phaser.Math.Clamp(this.hunger + amount, 0, 100);
  }

  public modifyFun(amount: number): void {
    this.fun = Phaser.Math.Clamp(this.fun + amount, 0, 100);
  }

  public modifySocial(amount: number): void {
    this.social = Phaser.Math.Clamp(this.social + amount, 0, 100);
  }

  public setGuestState(state: GuestState): void {
    this.guestState = state;
  }

  // Calculate overall satisfaction (0-100)
  public getSatisfaction(): number {
    return (this.hunger + this.fun + this.social) / 3;
  }

  // Check if guest is about to leave
  public isUnhappy(): boolean {
    return this.getSatisfaction() < 20;
  }

  update(_time: number, _delta: number): void {
    // TODO: Implement AI behavior based on needs
  }
}

export enum GuestState {
  Idle = 'idle',
  Walking = 'walking',
  Eating = 'eating',
  Dancing = 'dancing',
  Talking = 'talking',
  Leaving = 'leaving',
}
