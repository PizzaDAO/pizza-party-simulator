import Phaser from 'phaser';
import { Guest, GuestState } from '../entities/Guest';
import { PizzaStation } from '../entities/PizzaStation';
import { DrinkStation } from '../entities/DrinkStation';
import { Staff, StaffRole } from '../entities/Staff';
import { Trash } from '../entities/Trash';
import { NeedsSystem } from '../systems/NeedsSystem';
import {
  GAME_WIDTH, GAME_HEIGHT,
  VENUE, ZONES, INITIAL_TRASH_CANS, TRASH_CAN_PLACEMENT_CONFIG,
  GUEST_CONFIG, GUEST_NAMES,
  PIZZA_CONFIG, DRINK_CONFIG, TRASH_CONFIG,
  BLADDER_CONFIG, STAFF_CONFIG, DRUNK_CONFIG,
  PARTY_CONFIG, ENTERTAINMENT, EntertainmentDef,
  CONVERSATION_CONFIG, Personality,
  DJ_VOLUME_CONFIG, INTRODUCTION_CONFIG,
} from '../config/GameConfig';

export class GameScene extends Phaser.Scene {
  // Systems
  private needsSystem!: NeedsSystem;

  // Entities
  private guests: Guest[] = [];
  private trashItems: Trash[] = [];
  private pizzaStation!: PizzaStation;
  private drinkStation!: DrinkStation;
  private staffMembers: Staff[] = [];

  // Entertainment
  private entertainmentOccupants: Map<string, number> = new Map();

  // Game state
  private partyTimer: number = PARTY_CONFIG.duration;
  private gameOver: boolean = false;
  private gameStarted: boolean = false;
  private guestSpawnTimer: number = 0;
  private guestsLeft: number = 0;
  private totalGuestsSpawned: number = 0;
  private usedNames: string[] = [];
  private signsPosted: boolean = false;

  // === Feature 1: Pause ===
  private isPaused: boolean = false;
  private pauseOverlay!: Phaser.GameObjects.Container;
  // pauseButton is created and managed by makeSmallButton; no direct reference needed

  // === Feature 2: DJ Volume ===
  private djVolume: number = 1; // 0-indexed into DJ_VOLUME_CONFIG.levels
  private djVolumeText!: Phaser.GameObjects.Text;
  private djPulseRing!: Phaser.GameObjects.Graphics;

  // === Feature 4: Trash Can Placement ===
  private trashCanPositions: { x: number; y: number }[] = [];
  private isPlacingTrashCan: boolean = false;
  private trashCanGhost: Phaser.GameObjects.Text | null = null;
  private addTrashCanBtn!: Phaser.GameObjects.Container;
  private trashCanCountText!: Phaser.GameObjects.Text;

  // === Feature 5: Guest Introductions ===
  private selectedGuest: Guest | null = null;
  private selectionCircle: Phaser.GameObjects.Graphics | null = null;
  private introducedPairs: Set<string> = new Set();
  private introductionCooldown: number = 0;

  // HUD elements
  private timerText!: Phaser.GameObjects.Text;
  private satisfactionText!: Phaser.GameObjects.Text;
  private guestCountText!: Phaser.GameObjects.Text;
  private trashCountText!: Phaser.GameObjects.Text;
  private pizzaCountText!: Phaser.GameObjects.Text;
  private drinkCountText!: Phaser.GameObjects.Text;
  private staffCountText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private startOverlay!: Phaser.GameObjects.Container;
  private endOverlay!: Phaser.GameObjects.Container;
  private signButton!: Phaser.GameObjects.Container;
  private signStatusText!: Phaser.GameObjects.Text;

  // Staff hire UI
  private hireBartenderBtn!: Phaser.GameObjects.Container;
  private hireCleanerBtn!: Phaser.GameObjects.Container;
  private bartenderCountText!: Phaser.GameObjects.Text;
  private cleanerCountText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.needsSystem = new NeedsSystem();
    this.guests = [];
    this.trashItems = [];
    this.staffMembers = [];
    this.guestsLeft = 0;
    this.totalGuestsSpawned = 0;
    this.usedNames = [];
    this.partyTimer = PARTY_CONFIG.duration;
    this.gameOver = false;
    this.gameStarted = false;
    this.guestSpawnTimer = 0;
    this.signsPosted = false;
    this.entertainmentOccupants = new Map();
    for (const ent of ENTERTAINMENT) {
      this.entertainmentOccupants.set(ent.id, 0);
    }

    // Feature 1: Pause reset
    this.isPaused = false;

    // Feature 4: Trash can placement reset
    this.trashCanPositions = [...INITIAL_TRASH_CANS];
    this.isPlacingTrashCan = false;

    // Feature 5: Guest introductions reset
    this.selectedGuest = null;
    this.selectionCircle = null;
    this.introducedPairs = new Set();
    this.introductionCooldown = 0;

    this.drawVenue();
    this.drawEntertainment();
    this.drawTrashCans();
    this.pizzaStation = new PizzaStation(this);
    this.drinkStation = new DrinkStation(this);
    this.createSignButton();
    this.createStaffPanel();
    this.createHUD();

    // Feature 1: Pause button and overlay
    this.createPauseButton();
    this.createPauseOverlay();

    // Feature 2: DJ volume controls
    this.createDJVolumeControls();

    // Feature 4: Trash can placement button
    this.createTrashCanButton();

    this.createStartOverlay();

    this.input.keyboard!.on('keydown-SPACE', () => {
      if (!this.gameStarted && !this.gameOver) {
        this.startParty();
      } else if (this.gameOver) {
        this.scene.restart();
      }
    });

    // Feature 1: P key to pause
    this.input.keyboard!.on('keydown-P', () => this.togglePause());
  }

  // --- Drawing ---

  private drawVenue(): void {
    const g = this.add.graphics();

    g.fillStyle(0x8b4513, 1);
    g.fillRect(VENUE.x, VENUE.y, VENUE.width, VENUE.height);

    g.fillStyle(0xa0522d, 1);
    const tileSize = 50;
    for (let tx = 0; tx < Math.ceil(VENUE.width / tileSize); tx++) {
      for (let ty = 0; ty < Math.ceil(VENUE.height / tileSize); ty++) {
        if ((tx + ty) % 2 === 0) {
          g.fillRect(VENUE.x + tx * tileSize, VENUE.y + ty * tileSize, tileSize, tileSize);
        }
      }
    }

    g.lineStyle(6, 0x4a3728, 1);
    g.strokeRect(VENUE.x, VENUE.y, VENUE.width, VENUE.height);

    // Pizza table
    const pz = ZONES.pizzaTable;
    g.fillStyle(0xd2691e, 1);
    g.fillRect(pz.x, pz.y, pz.width, pz.height);
    g.lineStyle(2, 0x8b4513, 1);
    g.strokeRect(pz.x, pz.y, pz.width, pz.height);
    this.add.text(pz.x + pz.width / 2, pz.y + 12, '\u{1F355} Pizza Table', { fontSize: '11px', color: '#fff' }).setOrigin(0.5, 0.5);

    // Bar
    const bz = ZONES.bar;
    g.fillStyle(0x5d4037, 1);
    g.fillRect(bz.x, bz.y, bz.width, bz.height);
    g.lineStyle(2, 0x3e2723, 1);
    g.strokeRect(bz.x, bz.y, bz.width, bz.height);
    this.add.text(bz.x + bz.width / 2, bz.y + 12, '\u{1F37A} Bar', { fontSize: '11px', color: '#fff' }).setOrigin(0.5, 0.5);

    // Dance floor
    const dz = ZONES.danceFloor;
    g.fillStyle(0x4a4a6a, 0.6);
    g.fillRect(dz.x, dz.y, dz.width, dz.height);
    const colors = [0xff6b35, 0xffcc00, 0xff4757, 0x7bed9f];
    for (let i = 0; i < 4; i++) {
      g.fillStyle(colors[i], 0.25);
      g.fillCircle(dz.x + 60 + (i % 2) * 120, dz.y + 60 + Math.floor(i / 2) * 80, 25);
    }
    this.add.text(dz.x + dz.width / 2, dz.y + 12, '\u{1F483} Dance Floor', { fontSize: '11px', color: '#fff' }).setOrigin(0.5, 0.5);

    // Chill zone
    const cz = ZONES.chillZone;
    g.fillStyle(0x6b5b4f, 1);
    g.fillRect(cz.x, cz.y, cz.width, cz.height);
    g.lineStyle(2, 0x5a4a3f, 1);
    g.strokeRect(cz.x, cz.y, cz.width, cz.height);
    this.add.text(cz.x + cz.width / 2, cz.y + 12, '\u{1F60E} Chill Zone', { fontSize: '11px', color: '#fff' }).setOrigin(0.5, 0.5);

    // Bathroom
    const br = ZONES.bathroom;
    g.fillStyle(0x607d8b, 1);
    g.fillRect(br.x, br.y, br.width, br.height);
    g.lineStyle(2, 0x455a64, 1);
    g.strokeRect(br.x, br.y, br.width, br.height);
    this.add.text(br.x + br.width / 2, br.y + 14, '\u{1F6BB} Bathroom', { fontSize: '11px', color: '#fff' }).setOrigin(0.5, 0.5);

    // Entrance
    const ez = ZONES.entrance;
    g.fillStyle(0x2ecc71, 0.8);
    g.fillRect(ez.x, ez.y, ez.width, ez.height);
    this.add.text(ez.x + ez.width / 2, ez.y + 10, '\u{1F6AA}', { fontSize: '14px' }).setOrigin(0.5, 0.5);
  }

  private drawTrashCans(): void {
    for (const tc of INITIAL_TRASH_CANS) {
      this.add.text(tc.x, tc.y, '\u{1F5D1}\u{FE0F}', { fontSize: '20px' }).setOrigin(0.5, 0.5);
    }
  }

  private drawEntertainment(): void {
    const g = this.add.graphics();
    for (const ent of ENTERTAINMENT) {
      // Background
      g.fillStyle(ent.color, 0.5);
      g.fillRoundedRect(ent.x, ent.y, ent.width, ent.height, 6);
      g.lineStyle(2, ent.color, 0.8);
      g.strokeRoundedRect(ent.x, ent.y, ent.width, ent.height, 6);

      // Label
      this.add.text(ent.x + ent.width / 2, ent.y + ent.height / 2, ent.label, {
        fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0.5).setDepth(3);

      // NOTE: DJ passive radius circle is now drawn by updateDJVisuals()
      // Only draw passive radius for non-DJ entertainment
      if (ent.passiveRadius && ent.id !== 'dj') {
        g.lineStyle(1, ent.color, 0.2);
        g.strokeCircle(ent.x + ent.width / 2, ent.y + ent.height / 2, ent.passiveRadius);
      }
    }
  }

  // === Feature 1: Pause Button & Overlay ===

  private createPauseButton(): void {
    this.makeSmallButton(GAME_WIDTH - 50, 80, 90, 22, '\u23F8 Pause', 0x7f8c8d, () => this.togglePause());
  }

  private createPauseOverlay(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const pausedText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSED', {
      fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    const resumeHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Press P or click Pause to resume', {
      fontSize: '16px', color: '#aaaaaa',
    }).setOrigin(0.5, 0.5);

    this.pauseOverlay = this.add.container(0, 0, [bg, pausedText, resumeHint]);
    this.pauseOverlay.setDepth(99);
    this.pauseOverlay.setVisible(false);
  }

  private togglePause(): void {
    if (this.gameOver || !this.gameStarted) return;
    this.isPaused = !this.isPaused;
    this.pauseOverlay.setVisible(this.isPaused);
  }

  // === Feature 2: DJ Volume Controls ===

  private createDJVolumeControls(): void {
    const dj = ENTERTAINMENT.find(e => e.id === 'dj')!;
    const cx = dj.x + dj.width / 2;
    const cy = dj.y - 10;

    this.makeSmallButton(cx - 25, cy, 22, 18, '-', 0xe91e63, () => this.djVolumeDown());
    this.makeSmallButton(cx + 25, cy, 22, 18, '+', 0xe91e63, () => this.djVolumeUp());

    this.djVolumeText = this.add.text(cx, cy, `Vol: ${this.djVolume + 1}`, {
      fontSize: '9px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(10);

    this.djPulseRing = this.add.graphics();
    this.djPulseRing.setDepth(1);

    this.updateDJVisuals();
  }

  private djVolumeUp(): void {
    if (this.djVolume < DJ_VOLUME_CONFIG.levels.length - 1) {
      this.djVolume++;
      this.updateDJVisuals();
    }
  }

  private djVolumeDown(): void {
    if (this.djVolume > 0) {
      this.djVolume--;
      this.updateDJVisuals();
    }
  }

  private updateDJVisuals(): void {
    this.djVolumeText.setText(`Vol: ${this.djVolume + 1}`);
    // Redraw pulse ring
    const dj = ENTERTAINMENT.find(e => e.id === 'dj')!;
    const cx = dj.x + dj.width / 2;
    const cy = dj.y + dj.height / 2;
    const level = DJ_VOLUME_CONFIG.levels[this.djVolume];
    this.djPulseRing.clear();
    this.djPulseRing.lineStyle(2, 0xe91e63, 0.3);
    this.djPulseRing.strokeCircle(cx, cy, level.passiveRadius);
    if (level.annoyanceRadius > 0) {
      this.djPulseRing.lineStyle(1, 0xff0000, 0.2);
      this.djPulseRing.strokeCircle(cx, cy, level.annoyanceRadius);
    }
  }

  // === Feature 4: Trash Can Placement ===

  private createTrashCanButton(): void {
    const btnX = GAME_WIDTH - 70;
    const btnY = 115;
    this.addTrashCanBtn = this.makeSmallButton(btnX, btnY, 90, 22, '+ Trash Can', 0x795548, () => this.startPlacingTrashCan());
    this.trashCanCountText = this.add.text(btnX, btnY + 16, `Cans: 3/${3 + TRASH_CAN_PLACEMENT_CONFIG.maxAdditional}`, {
      fontSize: '9px', color: '#aaaaaa',
    }).setOrigin(0.5, 0.5).setDepth(10);
  }

  private startPlacingTrashCan(): void {
    const additionalCans = this.trashCanPositions.length - INITIAL_TRASH_CANS.length;
    if (additionalCans >= TRASH_CAN_PLACEMENT_CONFIG.maxAdditional) return;
    if (this.isPlacingTrashCan) { this.cancelPlacingTrashCan(); return; }

    this.isPlacingTrashCan = true;
    this.trashCanGhost = this.add.text(0, 0, '\u{1F5D1}\u{FE0F}', { fontSize: '20px' }).setOrigin(0.5, 0.5).setAlpha(0.5).setDepth(50);

    this.input.on('pointermove', this.onTrashCanMove, this);
    this.input.on('pointerdown', this.onTrashCanPlace, this);
  }

  private onTrashCanMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.trashCanGhost) {
      this.trashCanGhost.setPosition(pointer.x, pointer.y);
    }
  };

  private onTrashCanPlace = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isPlacingTrashCan) return;

    const x = pointer.x;
    const y = pointer.y;

    // Validate: inside venue
    if (x < VENUE.x || x > VENUE.right || y < VENUE.y || y > VENUE.bottom) return;

    // Validate: min distance from other cans
    for (const can of this.trashCanPositions) {
      const dx = x - can.x;
      const dy = y - can.y;
      if (Math.sqrt(dx * dx + dy * dy) < TRASH_CAN_PLACEMENT_CONFIG.minDistanceBetweenCans) return;
    }

    // Place it!
    this.trashCanPositions.push({ x, y });
    this.add.text(x, y, '\u{1F5D1}\u{FE0F}', { fontSize: '20px' }).setOrigin(0.5, 0.5);
    this.cancelPlacingTrashCan();

    const total = 3 + TRASH_CAN_PLACEMENT_CONFIG.maxAdditional;
    this.trashCanCountText.setText(`Cans: ${this.trashCanPositions.length}/${total}`);
    if (this.trashCanPositions.length - INITIAL_TRASH_CANS.length >= TRASH_CAN_PLACEMENT_CONFIG.maxAdditional) {
      this.addTrashCanBtn.setAlpha(0.4);
    }
  };

  private cancelPlacingTrashCan(): void {
    this.isPlacingTrashCan = false;
    if (this.trashCanGhost) {
      this.trashCanGhost.destroy();
      this.trashCanGhost = null;
    }
    this.input.off('pointermove', this.onTrashCanMove, this);
    this.input.off('pointerdown', this.onTrashCanPlace, this);
  }

  // === Feature 5: Guest Introductions ===

  private onGuestClicked(guest: Guest): void {
    if (this.gameOver || !this.gameStarted || this.isPaused) return;
    if (guest.getGuestState() === GuestState.Leaving) return;

    if (this.selectedGuest === null) {
      // Select first guest
      this.selectedGuest = guest;
      this.selectionCircle = this.add.graphics();
      this.selectionCircle.lineStyle(2, 0xffff00, 0.8);
      this.selectionCircle.strokeCircle(0, 0, 16);
      guest.add(this.selectionCircle);
    } else if (this.selectedGuest === guest) {
      // Deselect
      this.clearGuestSelection();
    } else {
      // Introduce the two guests
      if (this.introductionCooldown > 0) {
        this.clearGuestSelection();
        return;
      }
      this.introduceGuests(this.selectedGuest, guest);
      this.clearGuestSelection();
    }
  }

  private clearGuestSelection(): void {
    if (this.selectionCircle) {
      this.selectionCircle.destroy();
      this.selectionCircle = null;
    }
    this.selectedGuest = null;
  }

  private introduceGuests(guestA: Guest, guestB: Guest): void {
    // Generate pair key (order-independent)
    const pairKey = [guestA.guestId, guestB.guestId].sort((a, b) => a - b).join('-');
    this.introducedPairs.add(pairKey);
    this.introductionCooldown = INTRODUCTION_CONFIG.cooldown;

    // Walk both to midpoint
    const midX = (guestA.x + guestB.x) / 2;
    const midY = (guestA.y + guestB.y) / 2;

    // Clamp to venue
    const clampedX = Phaser.Math.Clamp(midX, VENUE.x + 20, VENUE.right - 20);
    const clampedY = Phaser.Math.Clamp(midY, VENUE.y + 20, VENUE.bottom - 20);

    guestA.walkTo(clampedX - 15, clampedY);
    guestB.walkTo(clampedX + 15, clampedY);

    // After they arrive, set them talking with bonus
    this.time.delayedCall(1500, () => {
      if (guestA.getGuestState() !== GuestState.Leaving && guestB.getGuestState() !== GuestState.Leaving) {
        guestA.setGuestState(GuestState.Talking, INTRODUCTION_CONFIG.talkDuration);
        guestB.setGuestState(GuestState.Talking, INTRODUCTION_CONFIG.talkDuration);

        // Apply intro bonuses
        guestA.modifySocial(INTRODUCTION_CONFIG.socialBonus);
        guestB.modifySocial(INTRODUCTION_CONFIG.socialBonus);
        guestA.modifyFun(INTRODUCTION_CONFIG.funBonus);
        guestB.modifyFun(INTRODUCTION_CONFIG.funBonus);

        // Handshake emoji float
        const emoji = this.add.text(clampedX, clampedY - 20, '\u{1F91D}', { fontSize: '20px' }).setOrigin(0.5, 0.5).setDepth(50);
        this.tweens.add({
          targets: emoji, y: clampedY - 60, alpha: 0,
          duration: 1500, onComplete: () => emoji.destroy(),
        });
      }
    });
  }

  // --- Signage button ---

  private createSignButton(): void {
    const br = ZONES.bathroom;
    const btnX = br.x + br.width / 2;
    const btnY = br.y + br.height - 15;
    const BTN_W = 100;
    const BTN_H = 28;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x27ae60, 1);
    btnBg.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 6);
    btnBg.lineStyle(2, 0xffffff, 0.8);
    btnBg.strokeRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 6);

    const btnText = this.add.text(0, 0, '\u{1F4CB} Post Signs', {
      fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
    });
    btnText.setOrigin(0.5, 0.5);

    this.signButton = this.add.container(btnX, btnY, [btnBg, btnText]);
    this.signButton.setSize(BTN_W, BTN_H);
    this.signButton.setInteractive({ useHandCursor: true });
    this.signButton.on('pointerdown', () => this.postSigns());
    this.signButton.setDepth(10);

    this.signStatusText = this.add.text(btnX, btnY + 20, '', {
      fontSize: '9px', color: '#4caf50', fontStyle: 'bold',
    });
    this.signStatusText.setOrigin(0.5, 0.5);
    this.signStatusText.setDepth(10);
  }

  private postSigns(): void {
    if (this.signsPosted) return;
    this.signsPosted = true;
    for (const guest of this.guests) {
      guest.bathroomSignsPosted = true;
    }
    this.signButton.setAlpha(0.5);
    this.signStatusText.setText('Signs posted!');

    const signPositions = [{ x: 200, y: 300 }, { x: 400, y: 200 }, { x: 300, y: 450 }];
    for (const pos of signPositions) {
      const sign = this.add.text(pos.x, pos.y, '\u{1F6BB}\u2192', {
        fontSize: '12px', backgroundColor: 'rgba(96,125,139,0.7)', padding: { x: 2, y: 1 },
      });
      sign.setOrigin(0.5, 0.5).setDepth(5);
    }
  }

  // --- Staff Panel (bottom of screen) ---

  private createStaffPanel(): void {
    const panelY = VENUE.bottom + 8;
    const btnH = 22;

    // Background strip
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.9);
    panelBg.fillRect(VENUE.x, panelY - 4, VENUE.width, 46);
    panelBg.setDepth(9);

    const labelStyle = { fontSize: '10px', color: '#aaaaaa' };

    // --- Bartender section ---
    const bartX = VENUE.x + 10;
    this.add.text(bartX, panelY - 1, '\u{1F37A} Bartenders:', labelStyle).setDepth(10);

    this.bartenderCountText = this.add.text(bartX + 90, panelY - 1, '0/2', { fontSize: '10px', color: '#3498db' });
    this.bartenderCountText.setDepth(10);

    // Hire bartender btn
    this.hireBartenderBtn = this.makeSmallButton(bartX + 130, panelY + 1, 60, btnH, '+ Hire', 0x2980b9, () => this.hireBartender());
    // Train bartender btn
    this.makeSmallButton(bartX + 198, panelY + 1, 60, btnH, 'Train \u2191', 0x8e44ad, () => this.trainStaff(StaffRole.Bartender));

    // --- Cleaner section ---
    const cleanX = VENUE.x + 370;
    this.add.text(cleanX, panelY - 1, '\u{1F9F9} Cleaners:', labelStyle).setDepth(10);

    this.cleanerCountText = this.add.text(cleanX + 80, panelY - 1, '0/2', { fontSize: '10px', color: '#27ae60' });
    this.cleanerCountText.setDepth(10);

    this.hireCleanerBtn = this.makeSmallButton(cleanX + 120, panelY + 1, 60, btnH, '+ Hire', 0x27ae60, () => this.hireCleaner());
    this.makeSmallButton(cleanX + 188, panelY + 1, 60, btnH, 'Train \u2191', 0x8e44ad, () => this.trainStaff(StaffRole.Cleaner));

    // Info text
    this.add.text(GAME_WIDTH / 2, panelY + 30, 'Bartenders auto-restock drinks & cut off drunk guests (Lv3+) | Cleaners auto-pick-up trash', {
      fontSize: '8px', color: '#666666',
    }).setOrigin(0.5, 0.5).setDepth(10);
  }

  private makeSmallButton(x: number, y: number, w: number, h: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    bg.lineStyle(1, 0xffffff, 0.6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);

    const text = this.add.text(0, 0, label, { fontSize: '10px', color: '#ffffff', fontStyle: 'bold' });
    text.setOrigin(0.5, 0.5);

    const btn = this.add.container(x, y, [bg, text]);
    btn.setSize(w, h);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    btn.setDepth(10);
    return btn;
  }

  private hireBartender(): void {
    const bartenders = this.staffMembers.filter(s => s.role === StaffRole.Bartender);
    if (bartenders.length >= STAFF_CONFIG.maxBartenders) return;

    const bz = ZONES.bar;
    const staff = new Staff(this, bz.x + bz.width / 2, bz.y + bz.height / 2, StaffRole.Bartender);

    // Bartender auto-restocks drinks
    staff.onRestockDrinks = (amount: number) => {
      this.drinkStation.addDrinks(amount);
    };

    this.staffMembers.push(staff);
    this.updateStaffUI();
  }

  private hireCleaner(): void {
    const cleaners = this.staffMembers.filter(s => s.role === StaffRole.Cleaner);
    if (cleaners.length >= STAFF_CONFIG.maxCleaners) return;

    // Cleaner starts near center of venue
    const staff = new Staff(
      this,
      Phaser.Math.Between(VENUE.x + 100, VENUE.right - 100),
      Phaser.Math.Between(VENUE.y + 100, VENUE.bottom - 100),
      StaffRole.Cleaner
    );

    // Cleaner looks for nearest trash
    staff.onLookForTrash = () => {
      if (this.trashItems.length === 0) return null;
      let nearest: Trash | null = null;
      let nearestDist = Infinity;
      for (const trash of this.trashItems) {
        const dx = staff.x - trash.x;
        const dy = staff.y - trash.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < STAFF_CONFIG.cleaner.searchRadius && dist < nearestDist) {
          nearest = trash;
          nearestDist = dist;
        }
      }
      return nearest ? { x: nearest.x, y: nearest.y } : null;
    };

    // Cleaner cleans trash at position
    staff.onCleanTrashAt = (x: number, y: number) => {
      for (const trash of this.trashItems) {
        const dx = x - trash.x;
        const dy = y - trash.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          this.cleanTrash(trash);
          return true;
        }
      }
      return false;
    };

    this.staffMembers.push(staff);
    this.updateStaffUI();
  }

  private trainStaff(role: StaffRole): void {
    const staff = this.staffMembers.filter(s => s.role === role);
    if (staff.length === 0) return;
    // Train the lowest-level staff member of this role
    const sorted = staff.sort((a, b) => a.level - b.level);
    sorted[0].trainUp();
    this.updateStaffUI();
  }

  private updateStaffUI(): void {
    const bartenders = this.staffMembers.filter(s => s.role === StaffRole.Bartender);
    const cleaners = this.staffMembers.filter(s => s.role === StaffRole.Cleaner);

    const bartLevels = bartenders.map(b => `Lv${b.level}`).join(', ') || '';
    this.bartenderCountText.setText(`${bartenders.length}/${STAFF_CONFIG.maxBartenders} ${bartLevels}`);

    const cleanLevels = cleaners.map(c => `Lv${c.level}`).join(', ') || '';
    this.cleanerCountText.setText(`${cleaners.length}/${STAFF_CONFIG.maxCleaners} ${cleanLevels}`);

    // Disable hire buttons at max
    if (bartenders.length >= STAFF_CONFIG.maxBartenders) this.hireBartenderBtn.setAlpha(0.4);
    if (cleaners.length >= STAFF_CONFIG.maxCleaners) this.hireCleanerBtn.setAlpha(0.4);
  }

  // --- HUD ---

  private createHUD(): void {
    const hudY = 8;
    const style = { fontSize: '12px', color: '#ffffff', fontFamily: 'Arial, sans-serif' };

    this.timerText = this.add.text(GAME_WIDTH / 2, hudY, '', { ...style, fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.satisfactionText = this.add.text(15, hudY, '', style).setOrigin(0, 0);
    this.guestCountText = this.add.text(15, hudY + 16, '', style).setOrigin(0, 0);
    this.trashCountText = this.add.text(15, hudY + 32, '', style).setOrigin(0, 0);
    this.pizzaCountText = this.add.text(15, hudY + 48, '', style).setOrigin(0, 0);
    this.drinkCountText = this.add.text(15, hudY + 64, '', style).setOrigin(0, 0);
    this.staffCountText = this.add.text(15, hudY + 80, '', style).setOrigin(0, 0);

    this.messageText = this.add.text(GAME_WIDTH / 2, 92, '', {
      fontSize: '14px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // Instructions
    const instX = GAME_WIDTH - 15;
    const instStyle = { fontSize: '9px', color: '#aaaaaa' };
    this.add.text(instX, hudY, 'Click trash to clean', instStyle).setOrigin(1, 0);
    this.add.text(instX, hudY + 12, 'Order Pizza/Drinks: buttons', instStyle).setOrigin(1, 0);
    this.add.text(instX, hudY + 24, 'Post Signs: bathroom visibility', instStyle).setOrigin(1, 0);
    this.add.text(instX, hudY + 36, 'Hire Staff: bottom panel', instStyle).setOrigin(1, 0);
    this.add.text(instX, hudY + 48, 'Guests seek \u{1F579}\u{FE0F}\u{1F3A7}\u{1F4F8} for fun!', instStyle).setOrigin(1, 0);
    this.add.text(instX, hudY + 60, 'Click 2 guests to introduce', instStyle).setOrigin(1, 0);
    this.add.text(instX, hudY + 72, 'P to pause', instStyle).setOrigin(1, 0);
  }

  private updateHUD(): void {
    const avgSat = this.needsSystem.getAverageSatisfaction();
    const minutes = Math.floor(this.partyTimer / 60);
    const seconds = Math.floor(this.partyTimer % 60);

    this.timerText.setText(`\u23F1\u{FE0F} ${minutes}:${seconds.toString().padStart(2, '0')}`);

    let satColor = '#4caf50';
    if (avgSat < 30) satColor = '#f44336';
    else if (avgSat < 50) satColor = '#ff9800';
    this.satisfactionText.setText(`\u{1F60A} Satisfaction: ${Math.round(avgSat)}%`);
    this.satisfactionText.setColor(satColor);

    this.guestCountText.setText(`\u{1F465} Guests: ${this.guests.length} (${this.guestsLeft} left)`);
    this.trashCountText.setText(`\u{1F5D1}\u{FE0F} Trash: ${this.trashItems.length}`);
    this.pizzaCountText.setText(`\u{1F355} Slices: ${this.pizzaStation.getSliceCount()}`);
    this.drinkCountText.setText(`\u{1F964} Drinks: ${this.drinkStation.getDrinkCount()}`);

    const drunkCount = this.guests.filter(g => g.getIsDrunk()).length;
    const staffStr = `\u{1F454} Staff: ${this.staffMembers.length}` + (drunkCount > 0 ? ` | \u{1F974} Drunk: ${drunkCount}` : '');
    this.staffCountText.setText(staffStr);

    // Warning messages
    const needingBathroom = this.needsSystem.getGuestsNeedingBathroom().length;
    if (drunkCount > 2) {
      this.messageText.setText('\u26A0\u{FE0F} Too many drunk guests! Train bartenders!');
    } else if (this.trashItems.length >= TRASH_CONFIG.maxTrash - 3) {
      this.messageText.setText('\u26A0\u{FE0F} Too much trash! Clean or hire cleaners!');
    } else if (needingBathroom > 1 && !this.signsPosted) {
      this.messageText.setText('\u26A0\u{FE0F} Guests need the bathroom! Post signs!');
    } else if (this.needsSystem.getGuestsNeedingPizza().length > 2) {
      this.messageText.setText('\u26A0\u{FE0F} Guests are hungry! Order pizza!');
    } else if (this.needsSystem.getGuestsNeedingDrinks().length > 2) {
      this.messageText.setText('\u26A0\u{FE0F} Guests are thirsty! Order drinks!');
    } else if (avgSat < 35) {
      this.messageText.setText('\u26A0\u{FE0F} Satisfaction dropping fast!');
    } else {
      this.messageText.setText('');
    }
  }

  // --- Start / End ---

  private createStartOverlay(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const title = this.add.text(GAME_WIDTH / 2, 160, '\u{1F355} Pizza Party Simulator \u{1F355}', {
      fontSize: '36px', color: '#ff6b35', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    const sub = this.add.text(GAME_WIDTH / 2, 210, 'Keep your guests happy for 2 minutes!\nManage pizza, drinks, staff, and keep the party going!', {
      fontSize: '14px', color: '#ffffff', align: 'center', lineSpacing: 5,
    }).setOrigin(0.5, 0.5);

    const start = this.add.text(GAME_WIDTH / 2, 280, '[ Press SPACE to Start ]', {
      fontSize: '22px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.tweens.add({ targets: start, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    const tips = this.add.text(GAME_WIDTH / 2, 390,
      '\u{1F4A1} Tips:\n' +
      '\u2022 Order Pizza & Drinks using buttons on the table/bar\n' +
      '\u2022 Post bathroom signs so guests can find the \u{1F6BB}\n' +
      '\u2022 Hire bartenders to auto-restock drinks\n' +
      '\u2022 Hire cleaners to auto-pick-up trash\n' +
      '\u2022 Guests have personalities: \u{1F5E3}\u{FE0F}Chatty \u{1F60A}Shy \u{1F355}Foodie \u{1F389}Party Animal\n' +
      '\u2022 \u{1F579}\u{FE0F}Arcade \u{1F4F8}Photo Booth \u{1F3A7}DJ Booth boost fun!\n' +
      '\u2022 Click two guests to introduce them \u{1F91D}\n' +
      '\u2022 Press P to pause | Place extra trash cans!\n' +
      '\u2022 Keep average satisfaction above 50% to win!', {
      fontSize: '11px', color: '#aaaaaa', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0.5);

    this.startOverlay = this.add.container(0, 0, [bg, title, sub, start, tips]);
    this.startOverlay.setDepth(100);
  }

  private startParty(): void {
    this.gameStarted = true;
    this.startOverlay.setVisible(false);
    for (let i = 0; i < 3; i++) {
      this.spawnGuest();
    }
  }

  private endParty(): void {
    this.gameOver = true;
    const avgSat = this.needsSystem.getAverageSatisfaction();
    const won = avgSat >= PARTY_CONFIG.winThreshold;

    let rating = '\u{1F631} Disaster';
    let ratingColor = '#f44336';
    if (avgSat >= PARTY_CONFIG.ratingThresholds.amazing) { rating = '\u{1F31F} AMAZING Party!'; ratingColor = '#ffd700'; }
    else if (avgSat >= PARTY_CONFIG.ratingThresholds.great) { rating = '\u{1F389} Great Party!'; ratingColor = '#4caf50'; }
    else if (avgSat >= PARTY_CONFIG.ratingThresholds.okay) { rating = '\u{1F44D} Decent Party'; ratingColor = '#ff9800'; }
    else { rating = '\u{1F62C} Bad Party'; ratingColor = '#f44336'; }

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const resultTitle = this.add.text(GAME_WIDTH / 2, 160, won ? '\u{1F38A} Party Over! \u{1F38A}' : '\u{1F61E} Party Over...', {
      fontSize: '36px', color: won ? '#4caf50' : '#f44336', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    const ratingText = this.add.text(GAME_WIDTH / 2, 220, rating, {
      fontSize: '28px', color: ratingColor, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    const drunkCount = this.guests.filter(g => g.getIsDrunk()).length;
    const stats = this.add.text(GAME_WIDTH / 2, 330,
      `Final Satisfaction: ${Math.round(avgSat)}%\n` +
      `Total Guests: ${this.totalGuestsSpawned}\n` +
      `Guests who left unhappy: ${this.guestsLeft}\n` +
      `Trash remaining: ${this.trashItems.length}\n` +
      `Staff hired: ${this.staffMembers.length}\n` +
      `Drunk guests: ${drunkCount}\n` +
      `Introductions made: ${this.introducedPairs.size}\n` +
      `Bathroom signs: ${this.signsPosted ? 'Posted' : 'Not posted'}`, {
      fontSize: '14px', color: '#ffffff', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0.5);

    const restart = this.add.text(GAME_WIDTH / 2, 440, '[ Press SPACE to Play Again ]', {
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

  private getBartenderLevel(): number {
    const bartenders = this.staffMembers.filter(s => s.role === StaffRole.Bartender);
    if (bartenders.length === 0) return 0;
    return Math.max(...bartenders.map(b => b.level));
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

    guest.bathroomSignsPosted = this.signsPosted;

    // Feature 5: Make guests clickable for introductions
    guest.setSize(24, 24);
    guest.setInteractive();
    guest.setDepth(6);
    guest.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation(); // Prevent scene-level handlers
      if (this.isPlacingTrashCan) return;
      this.onGuestClicked(guest);
    });

    // Pizza callback — updated for pizza variety
    guest.onWantsPizza = () => {
      if (this.pizzaStation.hasSlices()) {
        const pz = ZONES.pizzaTable;
        guest.walkTo(
          Phaser.Math.Between(pz.x + 20, pz.x + pz.width - 20),
          Phaser.Math.Between(pz.y + 30, pz.y + pz.height - 10)
        );
        const checkArrival = this.time.addEvent({
          delay: 200, loop: true,
          callback: () => {
            if (guest.getGuestState() !== GuestState.Walking) { checkArrival.destroy(); return; }
            const dx = guest.x - (pz.x + pz.width / 2);
            const dy = guest.y - (pz.y + pz.height / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 60) {
              const pizzaType = this.pizzaStation.takeSlice(guest.preferredPizza);
              if (pizzaType !== null) {
                guest.lastPizzaEaten = pizzaType;
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

    // Drink callback — bartender can refuse drunk guests
    guest.onWantsDrink = () => {
      if (this.drinkStation.hasDrinks()) {
        // Trained bartender refuses drunk guests
        const bartLevel = this.getBartenderLevel();
        if (bartLevel >= STAFF_CONFIG.bartender.drunkRefusalLevel && guest.shouldCutOff()) {
          // Refused! Guest is annoyed but stays sober
          guest.modifyFun(-5);
          return false;
        }

        const bz = ZONES.bar;
        guest.walkTo(
          Phaser.Math.Between(bz.x + 20, bz.x + bz.width - 20),
          Phaser.Math.Between(bz.y + 30, bz.y + bz.height - 10)
        );
        const checkArrival = this.time.addEvent({
          delay: 200, loop: true,
          callback: () => {
            if (guest.getGuestState() !== GuestState.Walking) { checkArrival.destroy(); return; }
            const dx = guest.x - (bz.x + bz.width / 2);
            const dy = guest.y - (bz.y + bz.height / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 60) {
              if (this.drinkStation.takeDrink()) {
                guest.setGuestState(GuestState.Drinking, DRINK_CONFIG.drinkDuration);
              }
              checkArrival.destroy();
            }
          },
        });
        return true;
      }
      return false;
    };

    // Bathroom callback
    guest.onNeedsBathroom = () => {
      const br = ZONES.bathroom;
      guest.walkTo(
        Phaser.Math.Between(br.x + 20, br.x + br.width - 20),
        Phaser.Math.Between(br.y + 30, br.y + br.height - 10)
      );
      const checkArrival = this.time.addEvent({
        delay: 200, loop: true,
        callback: () => {
          if (guest.getGuestState() !== GuestState.Walking) { checkArrival.destroy(); return; }
          const dx = guest.x - (br.x + br.width / 2);
          const dy = guest.y - (br.y + br.height / 2);
          if (Math.sqrt(dx * dx + dy * dy) < 50) {
            guest.setGuestState(GuestState.UsingBathroom, BLADDER_CONFIG.useDuration);
            checkArrival.destroy();
          }
        },
      });
      return true;
    };

    // Entertainment callback
    guest.onWantsEntertainment = (preferredType: string) => {
      const candidates = preferredType === 'any'
        ? ENTERTAINMENT.filter(e => e.capacity > 0)
        : ENTERTAINMENT.filter(e => e.id === preferredType && e.capacity > 0);

      for (const ent of candidates) {
        const occupants = this.entertainmentOccupants.get(ent.id) || 0;
        if (occupants < ent.capacity) {
          this.sendGuestToEntertainment(guest, ent);
          return true;
        }
      }
      return false;
    };

    // Trash callback — updated for trash can proximity absorption
    guest.onDropTrash = (x: number, y: number) => {
      // Check if near a trash can — absorb instead of littering
      for (const can of this.trashCanPositions) {
        const dx = x - can.x;
        const dy = y - can.y;
        if (Math.sqrt(dx * dx + dy * dy) < TRASH_CAN_PLACEMENT_CONFIG.proximityRadius) {
          return; // Absorbed by nearby can
        }
      }
      if (this.trashItems.length < TRASH_CONFIG.maxTrash) {
        this.spawnTrash(x, y);
      }
    };

    guest.on('guest-left', (g: Guest) => {
      this.removeGuest(g);
      this.guestsLeft++;
    });

    this.guests.push(guest);
    this.needsSystem.registerGuest(guest);
    this.totalGuestsSpawned++;

    guest.walkTo(
      Phaser.Math.Between(VENUE.x + 60, VENUE.right - 60),
      Phaser.Math.Between(VENUE.y + 60, VENUE.bottom - 80)
    );
  }

  private removeGuest(guest: Guest): void {
    // Clean up selection if this guest was selected
    if (this.selectedGuest === guest) {
      this.clearGuestSelection();
    }
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
    this.tweens.add({
      targets: trash, scaleX: 0, scaleY: 0, alpha: 0,
      duration: 200, onComplete: () => trash.destroy(),
    });
  }

  // --- Penalties ---

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

  private applyDrunkPenalty(delta: number): void {
    const dt = delta / 1000;
    const drunkGuests = this.guests.filter(g => g.getIsDrunk());
    for (const drunk of drunkGuests) {
      // Drunk guests lower social of nearby sober guests
      for (const guest of this.guests) {
        if (guest === drunk || guest.getIsDrunk()) continue;
        const dx = guest.x - drunk.x;
        const dy = guest.y - drunk.y;
        if (Math.sqrt(dx * dx + dy * dy) < DRUNK_CONFIG.socialPenaltyRadius) {
          guest.modifySocial(-DRUNK_CONFIG.socialPenaltyRate * dt);
          guest.modifyFun(-DRUNK_CONFIG.socialPenaltyRate * 0.5 * dt);
        }
      }
    }
  }

  // --- Entertainment ---

  private sendGuestToEntertainment(guest: Guest, ent: EntertainmentDef): void {
    guest.walkTo(
      Phaser.Math.Between(ent.x + 10, ent.x + ent.width - 10),
      Phaser.Math.Between(ent.y + 10, ent.y + ent.height - 10)
    );

    const checkArrival = this.time.addEvent({
      delay: 200, loop: true,
      callback: () => {
        if (guest.getGuestState() !== GuestState.Walking) { checkArrival.destroy(); return; }
        const dx = guest.x - (ent.x + ent.width / 2);
        const dy = guest.y - (ent.y + ent.height / 2);
        if (Math.sqrt(dx * dx + dy * dy) < Math.max(ent.width, ent.height)) {
          const occupants = this.entertainmentOccupants.get(ent.id) || 0;
          if (occupants < ent.capacity) {
            this.entertainmentOccupants.set(ent.id, occupants + 1);
            guest.setCurrentEntertainmentId(ent.id);
            const duration = Phaser.Math.Between(ent.useDuration.min, ent.useDuration.max);
            guest.setGuestState(GuestState.UsingEntertainment, duration);

            // Decrement occupants when done
            this.time.delayedCall(duration + 100, () => {
              const cur = this.entertainmentOccupants.get(ent.id) || 0;
              this.entertainmentOccupants.set(ent.id, Math.max(0, cur - 1));
            });
          }
          checkArrival.destroy();
        }
      },
    });
  }

  private applyEntertainmentBonuses(delta: number): void {
    const dt = delta / 1000;

    for (const guest of this.guests) {
      // Entertainment active bonuses
      if (guest.getGuestState() === GuestState.UsingEntertainment) {
        const entId = guest.getCurrentEntertainmentId();
        const ent = ENTERTAINMENT.find(e => e.id === entId);
        if (ent) {
          guest.modifyFun(ent.funBonus * dt);
          guest.modifySocial(ent.socialBonus * dt);
        }
      }

      // DJ passive bonus for dancers — volume-driven (Feature 2)
      if (guest.getGuestState() === GuestState.Dancing) {
        const dj = ENTERTAINMENT.find(e => e.id === 'dj');
        if (dj) {
          const level = DJ_VOLUME_CONFIG.levels[this.djVolume];
          const dx = guest.x - (dj.x + dj.width / 2);
          const dy = guest.y - (dj.y + dj.height / 2);
          if (Math.sqrt(dx * dx + dy * dy) < level.passiveRadius) {
            guest.modifyFun(level.passiveFunBonus * dt);
          }
        }
      }

      // DJ annoyance for talkers at high volume (Feature 2)
      if (guest.getGuestState() === GuestState.Talking) {
        const dj = ENTERTAINMENT.find(e => e.id === 'dj');
        if (dj) {
          const level = DJ_VOLUME_CONFIG.levels[this.djVolume];
          if (level.annoyanceRadius > 0) {
            const dx = guest.x - (dj.x + dj.width / 2);
            const dy = guest.y - (dj.y + dj.height / 2);
            if (Math.sqrt(dx * dx + dy * dy) < level.annoyanceRadius) {
              guest.modifySocial(-level.annoyanceSocialPenalty * dt);
            }
          }
        }
      }
    }
  }

  private applyConversationBonuses(delta: number): void {
    const dt = delta / 1000;
    const talkers = this.guests.filter(g => g.getGuestState() === GuestState.Talking);

    // Group talkers by proximity
    const visited = new Set<Guest>();
    for (const guest of talkers) {
      if (visited.has(guest)) continue;
      visited.add(guest);

      const group: Guest[] = [guest];
      for (const other of talkers) {
        if (other === guest || visited.has(other)) continue;
        const dx = guest.x - other.x;
        const dy = guest.y - other.y;
        if (Math.sqrt(dx * dx + dy * dy) < CONVERSATION_CONFIG.groupRadius) {
          group.push(other);
          visited.add(other);
        }
      }

      if (group.length > 1) {
        const bonus = CONVERSATION_CONFIG.groupBonus * (group.length - 1);
        for (const member of group) {
          member.modifySocial(bonus * dt);

          // Compatibility bonuses — with introduction override (Feature 5)
          for (const other of group) {
            if (other === member) continue;
            if (this.areCompatible(member.getPersonality(), other.getPersonality())) {
              member.modifySocial(CONVERSATION_CONFIG.compatibilityBonus * dt);
            } else if (this.areIncompatible(member.getPersonality(), other.getPersonality())) {
              const pairKey = [member.guestId, other.guestId].sort((a, b) => a - b).join('-');
              if (this.introducedPairs.has(pairKey)) {
                member.modifySocial(2 * dt); // introduced pairs override incompatibility
              } else {
                member.modifySocial(-CONVERSATION_CONFIG.incompatibilityPenalty * dt);
              }
            }
          }
        }
      }
    }
  }

  private areCompatible(a: Personality, b: Personality): boolean {
    // chatty+chatty, partyAnimal+partyAnimal, chatty+partyAnimal = good
    if (a === Personality.Chatty && b === Personality.Chatty) return true;
    if (a === Personality.PartyAnimal && b === Personality.PartyAnimal) return true;
    if ((a === Personality.Chatty && b === Personality.PartyAnimal) ||
        (a === Personality.PartyAnimal && b === Personality.Chatty)) return true;
    // shy+shy, shy+foodie = good
    if (a === Personality.Shy && b === Personality.Shy) return true;
    if ((a === Personality.Shy && b === Personality.Foodie) ||
        (a === Personality.Foodie && b === Personality.Shy)) return true;
    return false;
  }

  private areIncompatible(a: Personality, b: Personality): boolean {
    // shy+partyAnimal = bad
    if ((a === Personality.Shy && b === Personality.PartyAnimal) ||
        (a === Personality.PartyAnimal && b === Personality.Shy)) return true;
    return false;
  }

  // --- Game loop ---

  update(time: number, delta: number): void {
    if (!this.gameStarted || this.gameOver) return;

    // Feature 1: Pause guard
    if (this.isPaused) return;

    this.partyTimer -= delta / 1000;
    if (this.partyTimer <= 0) {
      this.partyTimer = 0;
      this.endParty();
      return;
    }

    // Spawn guests
    this.guestSpawnTimer += delta;
    if (this.guestSpawnTimer >= GUEST_CONFIG.spawnInterval) {
      this.guestSpawnTimer = 0;
      this.spawnGuest();
    }

    // Update stations
    this.pizzaStation.update(time, delta);
    this.drinkStation.update(time, delta);

    // Update staff
    for (const staff of this.staffMembers) {
      staff.update(time, delta);
    }

    // Update guests
    for (const guest of [...this.guests]) {
      guest.update(time, delta);
    }

    // Penalties & bonuses
    this.applyTrashPenalty(delta);
    this.applyDrunkPenalty(delta);
    this.applyEntertainmentBonuses(delta);
    this.applyConversationBonuses(delta);

    // Feature 5: Introduction cooldown tick
    if (this.introductionCooldown > 0) {
      this.introductionCooldown -= delta;
    }

    // Update HUD
    this.updateHUD();
  }
}
