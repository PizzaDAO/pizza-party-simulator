import Phaser from 'phaser';
import { Guest, GuestState } from '../entities/Guest';
import { PizzaStation } from '../entities/PizzaStation';
import { Trash } from '../entities/Trash';
import { NeedsSystem } from '../systems/NeedsSystem';
import {
  GAME_WIDTH, GAME_HEIGHT,
  VENUE, ZONES, TRASH_CANS,
  GUEST_CONFIG, GUEST_NAMES,
  PIZZA_CONFIG, TRASH_CONFIG,
  PARTY_CONFIG,
} from '../config/GameConfig';

export class GameScene extends Phaser.Scene {
  // Systems
  private needsSystem!: NeedsSystem;

  // Entities
  private guests: Guest[] = [];
  private trashItems: Trash[] = [];
  private pizzaStation!: PizzaStation;

  // Game state
  private partyTimer: number = PARTY_CONFIG.duration;
  private gameOver: boolean = false;
  private gameStarted: boolean = false;
  private guestSpawnTimer: number = 0;
  private guestsLeft: number = 0;
  private totalGuestsSpawned: number = 0;
  private usedNames: string[] = [];

  // HUD elements
  private timerText!: Phaser.GameObjects.Text;
  private satisfactionText!: Phaser.GameObjects.Text;
  private guestCountText!: Phaser.GameObjects.Text;
  private trashCountText!: Phaser.GameObjects.Text;
  private pizzaCountText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private startOverlay!: Phaser.GameObjects.Container;
  private endOverlay!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.needsSystem = new NeedsSystem();
    this.guests = [];
    this.trashItems = [];
    this.guestsLeft = 0;
    this.totalGuestsSpawned = 0;
    this.usedNames = [];
    this.partyTimer = PARTY_CONFIG.duration;
    this.gameOver = false;
    this.gameStarted = false;
    this.guestSpawnTimer = 0;

    this.drawVenue();
    this.drawTrashCans();
    this.pizzaStation = new PizzaStation(this);
    this.createHUD();
    this.createStartOverlay();

    // Keyboard
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (!this.gameStarted && !this.gameOver) {
        this.startParty();
      } else if (this.gameOver) {
        this.scene.restart();
      }
    });
  }

  // --- Drawing ---

  private drawVenue(): void {
    const g = this.add.graphics();

    // Floor
    g.fillStyle(0x8b4513, 1);
    g.fillRect(VENUE.x, VENUE.y, VENUE.width, VENUE.height);

    // Checkerboard
    g.fillStyle(0xa0522d, 1);
    const tileSize = 50;
    for (let tx = 0; tx < Math.ceil(VENUE.width / tileSize); tx++) {
      for (let ty = 0; ty < Math.ceil(VENUE.height / tileSize); ty++) {
        if ((tx + ty) % 2 === 0) {
          g.fillRect(VENUE.x + tx * tileSize, VENUE.y + ty * tileSize, tileSize, tileSize);
        }
      }
    }

    // Walls
    g.lineStyle(6, 0x4a3728, 1);
    g.strokeRect(VENUE.x, VENUE.y, VENUE.width, VENUE.height);

    // Pizza table zone
    const pz = ZONES.pizzaTable;
    g.fillStyle(0xd2691e, 1);
    g.fillRect(pz.x, pz.y, pz.width, pz.height);
    g.lineStyle(2, 0x8b4513, 1);
    g.strokeRect(pz.x, pz.y, pz.width, pz.height);
    this.add.text(pz.x + pz.width / 2, pz.y + 12, '🍕 Pizza Table', {
      fontSize: '11px', color: '#fff',
    }).setOrigin(0.5, 0.5);

    // Dance floor
    const dz = ZONES.danceFloor;
    g.fillStyle(0x4a4a6a, 0.6);
    g.fillRect(dz.x, dz.y, dz.width, dz.height);
    // Disco lights
    const colors = [0xff6b35, 0xffcc00, 0xff4757, 0x7bed9f];
    for (let i = 0; i < 4; i++) {
      g.fillStyle(colors[i], 0.25);
      g.fillCircle(dz.x + 60 + (i % 2) * 120, dz.y + 60 + Math.floor(i / 2) * 80, 25);
    }
    this.add.text(dz.x + dz.width / 2, dz.y + 12, '💃 Dance Floor', {
      fontSize: '11px', color: '#fff',
    }).setOrigin(0.5, 0.5);

    // Chill zone
    const cz = ZONES.chillZone;
    g.fillStyle(0x6b5b4f, 1);
    g.fillRect(cz.x, cz.y, cz.width, cz.height);
    g.lineStyle(2, 0x5a4a3f, 1);
    g.strokeRect(cz.x, cz.y, cz.width, cz.height);
    this.add.text(cz.x + cz.width / 2, cz.y + 12, '😎 Chill Zone', {
      fontSize: '11px', color: '#fff',
    }).setOrigin(0.5, 0.5);

    // Entrance
    const ez = ZONES.entrance;
    g.fillStyle(0x2ecc71, 0.8);
    g.fillRect(ez.x, ez.y, ez.width, ez.height);
    this.add.text(ez.x + ez.width / 2, ez.y + 10, '🚪', { fontSize: '14px' }).setOrigin(0.5, 0.5);
  }

  private drawTrashCans(): void {
    for (const tc of TRASH_CANS) {
      this.add.text(tc.x, tc.y, '🗑️', { fontSize: '20px' }).setOrigin(0.5, 0.5);
    }
  }

  // --- HUD ---

  private createHUD(): void {
    const hudY = 8;
    const style = { fontSize: '14px', color: '#ffffff', fontFamily: 'Arial, sans-serif' };

    this.timerText = this.add.text(GAME_WIDTH / 2, hudY, '', { ...style, fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.satisfactionText = this.add.text(15, hudY, '', style).setOrigin(0, 0);
    this.guestCountText = this.add.text(15, hudY + 20, '', style).setOrigin(0, 0);
    this.trashCountText = this.add.text(15, hudY + 40, '', style).setOrigin(0, 0);
    this.pizzaCountText = this.add.text(15, hudY + 60, '', style).setOrigin(0, 0);

    this.messageText = this.add.text(GAME_WIDTH / 2, 85, '', {
      fontSize: '16px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // Instructions (right side)
    this.add.text(GAME_WIDTH - 15, hudY, 'Click: Clean trash', {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(1, 0);
    this.add.text(GAME_WIDTH - 15, hudY + 16, 'Order Pizza: Button on table', {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(1, 0);
  }

  private updateHUD(): void {
    const avgSat = this.needsSystem.getAverageSatisfaction();
    const minutes = Math.floor(this.partyTimer / 60);
    const seconds = Math.floor(this.partyTimer % 60);

    this.timerText.setText(`⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`);

    // Color satisfaction based on level
    let satColor = '#4caf50';
    if (avgSat < 30) satColor = '#f44336';
    else if (avgSat < 50) satColor = '#ff9800';
    this.satisfactionText.setText(`😊 Satisfaction: ${Math.round(avgSat)}%`);
    this.satisfactionText.setColor(satColor);

    this.guestCountText.setText(`👥 Guests: ${this.guests.length} (${this.guestsLeft} left)`);
    this.trashCountText.setText(`🗑️ Trash: ${this.trashItems.length}`);
    this.pizzaCountText.setText(`🍕 Slices: ${this.pizzaStation.getSliceCount()}`);

    // Warning messages
    if (this.trashItems.length >= TRASH_CONFIG.maxTrash - 3) {
      this.messageText.setText('⚠️ Too much trash! Click to clean!');
    } else if (this.needsSystem.getGuestsNeedingPizza().length > 2) {
      this.messageText.setText('⚠️ Guests are hungry! Order pizza!');
    } else if (avgSat < 35) {
      this.messageText.setText('⚠️ Satisfaction dropping fast!');
    } else {
      this.messageText.setText('');
    }
  }

  // --- Start / End ---

  private createStartOverlay(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const title = this.add.text(GAME_WIDTH / 2, 200, '🍕 Pizza Party Simulator 🍕', {
      fontSize: '36px', color: '#ff6b35', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    const sub = this.add.text(GAME_WIDTH / 2, 260, 'Keep your guests happy for 2 minutes!\nOrder pizza, clean trash, and let them party!', {
      fontSize: '16px', color: '#ffffff', align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5, 0.5);

    const start = this.add.text(GAME_WIDTH / 2, 350, '[ Press SPACE to Start ]', {
      fontSize: '22px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.tweens.add({ targets: start, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    const tips = this.add.text(GAME_WIDTH / 2, 430,
      '💡 Tips:\n• Click the "Order Pizza" button to feed hungry guests\n• Click trash on the ground to clean it\n• Watch the hunger bars above guests\' heads\n• Keep average satisfaction above 50% to win!', {
      fontSize: '13px', color: '#aaaaaa', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0.5);

    this.startOverlay = this.add.container(0, 0, [bg, title, sub, start, tips]);
    this.startOverlay.setDepth(100);
  }

  private startParty(): void {
    this.gameStarted = true;
    this.startOverlay.setVisible(false);
    // Spawn first 3 guests immediately
    for (let i = 0; i < 3; i++) {
      this.spawnGuest();
    }
  }

  private endParty(): void {
    this.gameOver = true;
    const avgSat = this.needsSystem.getAverageSatisfaction();
    const won = avgSat >= PARTY_CONFIG.winThreshold;

    let rating = '😱 Disaster';
    let ratingColor = '#f44336';
    if (avgSat >= PARTY_CONFIG.ratingThresholds.amazing) { rating = '🌟 AMAZING Party!'; ratingColor = '#ffd700'; }
    else if (avgSat >= PARTY_CONFIG.ratingThresholds.great) { rating = '🎉 Great Party!'; ratingColor = '#4caf50'; }
    else if (avgSat >= PARTY_CONFIG.ratingThresholds.okay) { rating = '👍 Decent Party'; ratingColor = '#ff9800'; }
    else { rating = '😬 Bad Party'; ratingColor = '#f44336'; }

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const resultTitle = this.add.text(GAME_WIDTH / 2, 180, won ? '🎊 Party Over! 🎊' : '😞 Party Over...', {
      fontSize: '36px', color: won ? '#4caf50' : '#f44336', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    const ratingText = this.add.text(GAME_WIDTH / 2, 240, rating, {
      fontSize: '28px', color: ratingColor, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    const stats = this.add.text(GAME_WIDTH / 2, 320,
      `Final Satisfaction: ${Math.round(avgSat)}%\n` +
      `Total Guests: ${this.totalGuestsSpawned}\n` +
      `Guests who left unhappy: ${this.guestsLeft}\n` +
      `Trash remaining: ${this.trashItems.length}`, {
      fontSize: '16px', color: '#ffffff', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5, 0.5);

    const restart = this.add.text(GAME_WIDTH / 2, 420, '[ Press SPACE to Play Again ]', {
      fontSize: '20px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.tweens.add({ targets: restart, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.endOverlay = this.add.container(0, 0, [bg, resultTitle, ratingText, stats, restart]);
    this.endOverlay.setDepth(100);
  }

  // --- Guest management ---

  private getUniqueName(): string {
    const available = GUEST_NAMES.filter((n) => !this.usedNames.includes(n));
    if (available.length === 0) {
      this.usedNames = [];
      return GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
    }
    const name = available[Math.floor(Math.random() * available.length)];
    this.usedNames.push(name);
    return name;
  }

  private spawnGuest(): void {
    if (this.guests.length >= GUEST_CONFIG.maxGuests) return;

    const entrance = ZONES.entrance;
    const guest = new Guest(
      this,
      entrance.x + entrance.width / 2 + Phaser.Math.Between(-20, 20),
      entrance.y,
      this.getUniqueName()
    );

    // Wire up pizza callback
    guest.onWantsPizza = () => {
      if (this.pizzaStation.hasSlices()) {
        const pz = ZONES.pizzaTable;
        guest.walkTo(
          Phaser.Math.Between(pz.x + 20, pz.x + pz.width - 20),
          Phaser.Math.Between(pz.y + 30, pz.y + pz.height - 10)
        );
        // When guest arrives at pizza table, they'll eat
        const checkArrival = this.time.addEvent({
          delay: 200,
          loop: true,
          callback: () => {
            if (guest.getGuestState() !== GuestState.Walking) {
              checkArrival.destroy();
              return;
            }
            const dx = guest.x - (pz.x + pz.width / 2);
            const dy = guest.y - (pz.y + pz.height / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 60) {
              if (this.pizzaStation.takeSlice()) {
                guest.setGuestState(GuestState.Eating, PIZZA_CONFIG.eatDuration);
              }
              checkArrival.destroy();
            }
          },
        });
        return true;
      }
      return false;
    };

    // Wire up trash callback
    guest.onDropTrash = (x: number, y: number) => {
      if (this.trashItems.length < TRASH_CONFIG.maxTrash) {
        this.spawnTrash(x, y);
      }
    };

    // Wire up leave event
    guest.on('guest-left', (g: Guest) => {
      this.removeGuest(g);
      this.guestsLeft++;
    });

    this.guests.push(guest);
    this.needsSystem.registerGuest(guest);
    this.totalGuestsSpawned++;

    // Walk in from entrance
    guest.walkTo(
      Phaser.Math.Between(VENUE.x + 60, VENUE.right - 60),
      Phaser.Math.Between(VENUE.y + 60, VENUE.bottom - 80)
    );
  }

  private removeGuest(guest: Guest): void {
    this.needsSystem.unregisterGuest(guest);
    const idx = this.guests.indexOf(guest);
    if (idx > -1) this.guests.splice(idx, 1);
    guest.destroy();
  }

  // --- Trash ---

  private spawnTrash(x: number, y: number): void {
    const trash = new Trash(this, x, y);
    trash.on('pointerdown', () => {
      this.cleanTrash(trash);
    });
    this.trashItems.push(trash);
  }

  private cleanTrash(trash: Trash): void {
    const idx = this.trashItems.indexOf(trash);
    if (idx > -1) this.trashItems.splice(idx, 1);
    // Quick scale-down animation
    this.tweens.add({
      targets: trash,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 200,
      onComplete: () => trash.destroy(),
    });
  }

  // --- Trash satisfaction penalty ---

  private applyTrashPenalty(delta: number): void {
    const dt = delta / 1000;
    for (const guest of this.guests) {
      let nearbyTrash = 0;
      for (const trash of this.trashItems) {
        const dx = guest.x - trash.x;
        const dy = guest.y - trash.y;
        if (Math.sqrt(dx * dx + dy * dy) < TRASH_CONFIG.satisfactionPenaltyRadius) {
          nearbyTrash++;
        }
      }
      if (nearbyTrash > 0) {
        const penalty = TRASH_CONFIG.satisfactionPenaltyRate * nearbyTrash * dt;
        guest.modifyFun(-penalty);
        guest.modifySocial(-penalty);
      }
    }
  }

  // --- Game loop ---

  update(time: number, delta: number): void {
    if (!this.gameStarted || this.gameOver) return;

    // Party timer
    this.partyTimer -= delta / 1000;
    if (this.partyTimer <= 0) {
      this.partyTimer = 0;
      this.endParty();
      return;
    }

    // Spawn guests periodically
    this.guestSpawnTimer += delta;
    if (this.guestSpawnTimer >= GUEST_CONFIG.spawnInterval) {
      this.guestSpawnTimer = 0;
      this.spawnGuest();
    }

    // Update pizza station
    this.pizzaStation.update(time, delta);

    // Update guests
    for (const guest of [...this.guests]) {
      guest.update(time, delta);
    }

    // Trash penalty
    this.applyTrashPenalty(delta);

    // Update HUD
    this.updateHUD();
  }
}
