import { Guest, GuestState } from '../entities/Guest';

/**
 * NeedsSystem - Manages the decay and satisfaction of guest needs
 *
 * Responsibilities:
 * - Tick down needs over time
 * - Apply bonuses when guests perform actions
 * - Track party-wide satisfaction
 * - Trigger events when needs reach critical levels
 */
export class NeedsSystem {
  private guests: Guest[] = [];

  // Decay rates (per second)
  private hungerDecayRate: number = 2;
  private funDecayRate: number = 1.5;
  private socialDecayRate: number = 1;

  // Satisfaction bonuses
  private readonly EATING_BONUS = 30;
  private readonly DANCING_BONUS = 20;
  private readonly TALKING_BONUS = 25;

  constructor() {
    // Initialize system
  }

  public registerGuest(guest: Guest): void {
    this.guests.push(guest);
  }

  public unregisterGuest(guest: Guest): void {
    const index = this.guests.indexOf(guest);
    if (index > -1) {
      this.guests.splice(index, 1);
    }
  }

  public update(delta: number): void {
    const deltaSeconds = delta / 1000;

    for (const guest of this.guests) {
      this.updateGuestNeeds(guest, deltaSeconds);
    }
  }

  private updateGuestNeeds(guest: Guest, deltaSeconds: number): void {
    const state = guest.getGuestState();

    // Apply decay based on state
    switch (state) {
      case GuestState.Idle:
        guest.modifyHunger(-this.hungerDecayRate * deltaSeconds);
        guest.modifyFun(-this.funDecayRate * deltaSeconds);
        guest.modifySocial(-this.socialDecayRate * deltaSeconds);
        break;

      case GuestState.Eating:
        // Hunger goes up while eating, others decay slower
        guest.modifyHunger(this.EATING_BONUS * deltaSeconds);
        guest.modifyFun(-this.funDecayRate * 0.5 * deltaSeconds);
        guest.modifySocial(-this.socialDecayRate * 0.5 * deltaSeconds);
        break;

      case GuestState.Dancing:
        // Fun goes up, hunger decays faster
        guest.modifyHunger(-this.hungerDecayRate * 1.5 * deltaSeconds);
        guest.modifyFun(this.DANCING_BONUS * deltaSeconds);
        guest.modifySocial(-this.socialDecayRate * 0.3 * deltaSeconds);
        break;

      case GuestState.Talking:
        // Social goes up
        guest.modifyHunger(-this.hungerDecayRate * deltaSeconds);
        guest.modifyFun(-this.funDecayRate * 0.5 * deltaSeconds);
        guest.modifySocial(this.TALKING_BONUS * deltaSeconds);
        break;

      case GuestState.Walking:
        // Normal decay
        guest.modifyHunger(-this.hungerDecayRate * deltaSeconds);
        guest.modifyFun(-this.funDecayRate * deltaSeconds);
        guest.modifySocial(-this.socialDecayRate * deltaSeconds);
        break;

      case GuestState.Leaving:
        // No need updates when leaving
        break;
    }
  }

  // Get party-wide statistics
  public getAverageSatisfaction(): number {
    if (this.guests.length === 0) return 0;

    const totalSatisfaction = this.guests.reduce(
      (sum, guest) => sum + guest.getSatisfaction(),
      0
    );
    return totalSatisfaction / this.guests.length;
  }

  public getUnhappyGuestCount(): number {
    return this.guests.filter((guest) => guest.isUnhappy()).length;
  }

  public getGuestCount(): number {
    return this.guests.length;
  }

  // Find guests that need attention
  public getGuestsNeedingPizza(): Guest[] {
    return this.guests.filter((guest) => guest.getHunger() < 30);
  }

  public getGuestsNeedingFun(): Guest[] {
    return this.guests.filter((guest) => guest.getFun() < 30);
  }

  public getGuestsNeedingSocial(): Guest[] {
    return this.guests.filter((guest) => guest.getSocial() < 30);
  }
}
