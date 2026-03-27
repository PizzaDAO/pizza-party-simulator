import { Guest } from '../entities/Guest';

/**
 * NeedsSystem - Tracks party-wide satisfaction metrics.
 * Individual need decay/bonuses are handled in Guest.update() directly.
 */
export class NeedsSystem {
  private guests: Guest[] = [];

  public registerGuest(guest: Guest): void {
    this.guests.push(guest);
  }

  public unregisterGuest(guest: Guest): void {
    const index = this.guests.indexOf(guest);
    if (index > -1) {
      this.guests.splice(index, 1);
    }
  }

  public getAverageSatisfaction(): number {
    if (this.guests.length === 0) return 0;
    const total = this.guests.reduce((sum, g) => sum + g.getSatisfaction(), 0);
    return total / this.guests.length;
  }

  public getUnhappyGuestCount(): number {
    return this.guests.filter((g) => g.isUnhappy()).length;
  }

  public getGuestCount(): number {
    return this.guests.length;
  }

  public getGuestsNeedingPizza(): Guest[] {
    return this.guests.filter((g) => g.getHunger() < 30);
  }
}
