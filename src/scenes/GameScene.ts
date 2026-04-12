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
  HYPE_CONFIG, SOCIAL_MEDIA_CONFIG, HIT_THE_CHATS_CONFIG,
  VIPType, VIP_CONFIG, MILESTONE_CONFIG, PizzaType,
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

  // === Phase 5: Hype Meter ===
  private hypeLevel: number = 0;
  private hypeText!: Phaser.GameObjects.Text;
  private hypeBar!: Phaser.GameObjects.Graphics;

  // === Phase 5: Social Media ===
  private socialMediaTimer: number = 0;
  private socialMediaDelay: number = 0;
  private totalPositivePosts: number = 0;
  private totalNegativePosts: number = 0;

  // === Phase 5: Hit the Chats ===
  private chatUsesRemaining: number = 0;
  private chatCooldown: number = 0;
  private chatBoostTimer: number = 0;
  private chatBoostActive: boolean = false;
  private chatButton!: Phaser.GameObjects.Container;
  private chatButtonText!: Phaser.GameObjects.Text;

  // === Phase 5: VIP Guests ===
  private activeVIPs: Map<VIPType, Guest> = new Map();
  private vipThresholdsCrossed: Set<VIPType> = new Set();
  private pizzaChefTimer: number = 0;

  // === Phase 5: Milestones ===
  private milestonesAchieved: Set<string> = new Set();
  private goodVibesDuration: number = 0;
  private trashDropMultiplier: number = 1;
  private trashReductionTimer: number = 0;
  private milestoneSpawnBoostTimer: number = 0;

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

    // Phase 5: Hype Meter reset
    this.hypeLevel = HYPE_CONFIG.initialHype;

    // Phase 5: Social Media reset
    this.socialMediaTimer = 0;
    this.socialMediaDelay = Phaser.Math.Between(SOCIAL_MEDIA_CONFIG.postInterval.min, SOCIAL_MEDIA_CONFIG.postInterval.max);
    this.totalPositivePosts = 0;
    this.totalNegativePosts = 0;

    // Phase 5: Hit the Chats reset
    this.chatUsesRemaining = HIT_THE_CHATS_CONFIG.maxUses;
    this.chatCooldown = 0;
    this.chatBoostTimer = 0;
    this.chatBoostActive = false;

    // Phase 5: VIP Guests reset
    this.activeVIPs = new Map();
    this.vipThresholdsCrossed = new Set();
    this.pizzaChefTimer = 0;

    // Phase 5: Milestones reset
    this.milestonesAchieved = new Set();
    this.goodVibesDuration = 0;
    this.trashDropMultiplier = 1;
    this.trashReductionTimer = 0;
    this.milestoneSpawnBoostTimer = 0;

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

    // Phase 5: Chat button
    this.createChatButton();

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

        // Phase 5: Hype bonus from introductions
        this.hypeLevel = Math.min(HYPE_CONFIG.maxHype, this.hypeLevel + HYPE_CONFIG.introductionBonus);

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

    // Hype meter
    this.hypeBar = this.add.graphics();
    this.hypeBar.setDepth(10);
    this.hypeText = this.add.text(GAME_WIDTH / 2, 28, '', { fontSize: '10px', color: '#ff9800' }).setOrigin(0.5, 0).setDepth(10);

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

    // Hype bar
    this.hypeBar.clear();
    const hypeBarWidth = 120;
    const hypeBarX = GAME_WIDTH / 2 - hypeBarWidth / 2;
    this.hypeBar.fillStyle(0x333333, 0.8);
    this.hypeBar.fillRoundedRect(hypeBarX, 28, hypeBarWidth, 8, 3);
    const hypePct = this.hypeLevel / HYPE_CONFIG.maxHype;
    const hypeColor = hypePct < 0.3 ? 0x3498db : hypePct < 0.6 ? 0xff9800 : 0xffd700;
    this.hypeBar.fillStyle(hypeColor, 1);
    this.hypeBar.fillRoundedRect(hypeBarX, 28, hypeBarWidth * hypePct, 8, 3);
    this.hypeText.setText(`Hype: ${Math.round(this.hypeLevel)}%`);

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
      '\u2022 Hype meter affects guest spawn rate and max guests!\n' +
      '\u2022 Hit the Chats to blast group chats for more guests\n' +
      '\u2022 Keep hype high to attract VIP guests with special abilities\n' +
      '\u2022 Earn milestones for bonus rewards!\n' +
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
    const stats = this.add.text(GAME_WIDTH / 2, 340,
      `Final Satisfaction: ${Math.round(avgSat)}%\n` +
      `Total Guests: ${this.totalGuestsSpawned}\n` +
      `Guests who left unhappy: ${this.guestsLeft}\n` +
      `Trash remaining: ${this.trashItems.length}\n` +
      `Staff hired: ${this.staffMembers.length}\n` +
      `Drunk guests: ${drunkCount}\n` +
      `Introductions made: ${this.introducedPairs.size}\n` +
      `Bathroom signs: ${this.signsPosted ? 'Posted' : 'Not posted'}\n` +
      `Hype level: ${Math.round(this.hypeLevel)}%\n` +
      `Social media: ${this.totalPositivePosts} positive / ${this.totalNegativePosts} negative\n` +
      `VIPs attracted: ${this.activeVIPs.size}\n` +
      `Chat blasts: ${HIT_THE_CHATS_CONFIG.maxUses - this.chatUsesRemaining}\n` +
      `Milestones: ${this.milestonesAchieved.size}/5`, {
      fontSize: '13px', color: '#ffffff', align: 'center', lineSpacing: 4,
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

  private setupGuestCallbacks(guest: Guest): void {
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

    // Trash callback — with Clean Machine milestone reduction
    guest.onDropTrash = (x: number, y: number) => {
      // Clean Machine milestone: reduced trash drop
      if (this.trashDropMultiplier < 1 && Math.random() > this.trashDropMultiplier) {
        return; // Reduced by milestone
      }
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
  }

  private spawnGuest(): void {
    if (this.guests.length >= this.getCurrentMaxGuests()) return;

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

    this.setupGuestCallbacks(guest);

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
    // Phase 5: Hype penalty for guest leaving
    this.hypeLevel = Math.max(0, this.hypeLevel - HYPE_CONFIG.guestLeftPenalty);
    // Phase 5: VIP cleanup and extra penalty
    if (guest.isVIP() && guest.vipType) {
      this.activeVIPs.delete(guest.vipType);
      this.hypeLevel = Math.max(0, this.hypeLevel - VIP_CONFIG.leavePenalty);
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
            let djFunBonus = level.passiveFunBonus;
            // Phase 5: DJ Superstar doubles DJ fun bonus
            if (this.activeVIPs.has(VIPType.DJSuperstar)) {
              djFunBonus *= VIP_CONFIG.types[VIPType.DJSuperstar].djBonusMultiplier;
            }
            guest.modifyFun(djFunBonus * dt);
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

  // === Phase 5: Hype Meter ===

  private updateHype(delta: number): void {
    const dt = delta / 1000;
    const avgSat = this.needsSystem.getAverageSatisfaction();

    // Positive factors
    if (avgSat > HYPE_CONFIG.highSatThreshold) {
      this.hypeLevel += HYPE_CONFIG.highSatBonus * dt;
    }

    const dancerCount = this.guests.filter(g => g.getGuestState() === GuestState.Dancing).length;
    this.hypeLevel += HYPE_CONFIG.dancerBonus * dancerCount * dt;

    if (this.guests.length >= this.getCurrentMaxGuests()) {
      this.hypeLevel += HYPE_CONFIG.fullCapacityBonus * dt;
    }

    // Negative factors
    if (avgSat < HYPE_CONFIG.lowSatThreshold) {
      this.hypeLevel -= HYPE_CONFIG.lowSatPenalty * dt;
    }

    if (this.trashItems.length > HYPE_CONFIG.trashThreshold) {
      this.hypeLevel -= HYPE_CONFIG.trashPenalty * dt;
    }

    const drunkCount = this.guests.filter(g => g.getIsDrunk()).length;
    this.hypeLevel -= HYPE_CONFIG.drunkPenalty * drunkCount * dt;

    this.hypeLevel = Phaser.Math.Clamp(this.hypeLevel, 0, HYPE_CONFIG.maxHype);

    // Check VIP arrivals
    this.checkVIPArrivals();
  }

  private getCurrentSpawnInterval(): number {
    let interval = GUEST_CONFIG.spawnInterval;
    // Apply hype tier
    for (const tier of [...HYPE_CONFIG.spawnTiers].reverse()) {
      if (this.hypeLevel >= tier.minHype) {
        interval = tier.spawnInterval;
        break;
      }
    }
    // Apply chat boost if active
    if (this.chatBoostActive) {
      interval = Math.max(HIT_THE_CHATS_CONFIG.minSpawnInterval, interval * HIT_THE_CHATS_CONFIG.spawnIntervalMultiplier);
    }
    // Apply milestone spawn boost
    if (this.milestoneSpawnBoostTimer > 0) {
      interval = Math.max(1500, interval - MILESTONE_CONFIG.fullHouse.spawnBoostReduction);
    }
    return interval;
  }

  private getCurrentMaxGuests(): number {
    for (const tier of [...HYPE_CONFIG.guestCapTiers].reverse()) {
      if (this.hypeLevel >= tier.minHype) {
        return tier.maxGuests;
      }
    }
    return GUEST_CONFIG.maxGuests;
  }

  // === Phase 5: Social Media Posts ===

  private updateSocialMedia(delta: number): void {
    this.socialMediaTimer += delta;
    if (this.socialMediaTimer < this.socialMediaDelay) return;

    // Reset timer
    this.socialMediaTimer = 0;
    this.socialMediaDelay = Phaser.Math.Between(SOCIAL_MEDIA_CONFIG.postInterval.min, SOCIAL_MEDIA_CONFIG.postInterval.max);

    // Pick a random non-leaving guest
    const eligibleGuests = this.guests.filter(g => g.getGuestState() !== GuestState.Leaving);
    if (eligibleGuests.length === 0) return;

    // Weight by personality
    const guest = eligibleGuests[Math.floor(Math.random() * eligibleGuests.length)];
    const personality = guest.getPersonality();

    // Chatty posts more, Shy posts less
    if (personality === Personality.Shy && Math.random() > SOCIAL_MEDIA_CONFIG.shyMultiplier) return;
    // Normal and chatty guests always proceed (chatty is more likely to reach here)

    const sat = guest.getSatisfaction();
    let emoji: string;
    let hypeChange = 0;
    let color = '#ffffff';

    if (sat > SOCIAL_MEDIA_CONFIG.positiveThreshold) {
      const emojis = SOCIAL_MEDIA_CONFIG.positiveEmojis;
      emoji = emojis[Math.floor(Math.random() * emojis.length)];
      hypeChange = SOCIAL_MEDIA_CONFIG.positiveHypeBonus;
      // Check for Influencer VIP multiplier
      if (this.activeVIPs.has(VIPType.Influencer)) {
        hypeChange *= 2;
      }
      color = '#4caf50';
      this.totalPositivePosts++;
    } else if (sat < SOCIAL_MEDIA_CONFIG.negativeThreshold) {
      const emojis = SOCIAL_MEDIA_CONFIG.negativeEmojis;
      emoji = emojis[Math.floor(Math.random() * emojis.length)];
      hypeChange = -SOCIAL_MEDIA_CONFIG.negativeHypePenalty;
      color = '#f44336';
      this.totalNegativePosts++;
    } else {
      const emojis = SOCIAL_MEDIA_CONFIG.neutralEmojis;
      emoji = emojis[Math.floor(Math.random() * emojis.length)];
      // No hype change for neutral
      color = '#aaaaaa';
    }

    this.hypeLevel = Phaser.Math.Clamp(this.hypeLevel + hypeChange, 0, HYPE_CONFIG.maxHype);

    // Float emoji above guest
    const postText = this.add.text(guest.x, guest.y - 30, `\u{1F4F1}${emoji}`, { fontSize: '16px' }).setOrigin(0.5, 0.5).setDepth(50);
    const hypeLabel = hypeChange !== 0
      ? this.add.text(guest.x + 20, guest.y - 30, `${hypeChange > 0 ? '+' : ''}${hypeChange}`, { fontSize: '10px', color, fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(50)
      : null;

    this.tweens.add({
      targets: [postText, hypeLabel].filter(Boolean),
      y: `-=${SOCIAL_MEDIA_CONFIG.floatHeight}`,
      alpha: 0,
      duration: SOCIAL_MEDIA_CONFIG.floatDuration,
      onComplete: () => { postText.destroy(); hypeLabel?.destroy(); },
    });
  }

  // === Phase 5: Hit the Chats ===

  private createChatButton(): void {
    const btnX = GAME_WIDTH - 70;
    const btnY = 140;
    this.chatButton = this.makeSmallButton(btnX, btnY, 100, 22, '\u{1F4AC} Hit Chats (3)', 0x9c27b0, () => this.hitTheChats());
    this.chatButtonText = this.add.text(btnX, btnY + 16, '', { fontSize: '9px', color: '#aaaaaa' }).setOrigin(0.5, 0.5).setDepth(10);
  }

  private hitTheChats(): void {
    if (this.chatUsesRemaining <= 0 || this.chatCooldown > 0 || this.chatBoostActive) return;

    this.chatUsesRemaining--;
    this.chatBoostActive = true;
    this.chatBoostTimer = HIT_THE_CHATS_CONFIG.boostDuration;
    this.chatCooldown = HIT_THE_CHATS_CONFIG.cooldown;

    // Hype bonus
    this.hypeLevel = Math.min(HYPE_CONFIG.maxHype, this.hypeLevel + HIT_THE_CHATS_CONFIG.hypeBonus);

    // Chat emoji animation — emojis fly across screen
    const emojis = HIT_THE_CHATS_CONFIG.chatEmojis;
    for (let i = 0; i < emojis.length; i++) {
      const emojiText = this.add.text(
        Phaser.Math.Between(50, 200),
        Phaser.Math.Between(GAME_HEIGHT - 100, GAME_HEIGHT - 50),
        emojis[i],
        { fontSize: '24px' }
      ).setDepth(50);

      this.tweens.add({
        targets: emojiText,
        x: Phaser.Math.Between(GAME_WIDTH - 200, GAME_WIDTH - 50),
        y: Phaser.Math.Between(50, 150),
        alpha: 0,
        duration: 1200,
        delay: i * 150,
        onComplete: () => emojiText.destroy(),
      });
    }

    // Immediate guest spawns
    const spawns = this.hypeLevel > HIT_THE_CHATS_CONFIG.highHypeThreshold
      ? HIT_THE_CHATS_CONFIG.highHypeImmediateSpawns
      : HIT_THE_CHATS_CONFIG.immediateSpawns;
    for (let i = 0; i < spawns; i++) {
      this.spawnGuest();
    }
  }

  private updateChatTimers(delta: number): void {
    if (this.chatBoostActive) {
      this.chatBoostTimer -= delta;
      if (this.chatBoostTimer <= 0) {
        this.chatBoostActive = false;
        this.chatBoostTimer = 0;
      }
    }
    if (this.chatCooldown > 0) {
      this.chatCooldown -= delta;
    }

    // Update button text
    if (this.chatBoostActive) {
      this.chatButtonText.setText(`Active: ${Math.ceil(this.chatBoostTimer / 1000)}s`);
      this.chatButtonText.setColor('#4caf50');
    } else if (this.chatCooldown > 0) {
      this.chatButtonText.setText(`Cooldown: ${Math.ceil(this.chatCooldown / 1000)}s`);
      this.chatButtonText.setColor('#ff9800');
      this.chatButton.setAlpha(0.5);
    } else {
      this.chatButtonText.setText(`Uses: ${this.chatUsesRemaining}/${HIT_THE_CHATS_CONFIG.maxUses}`);
      this.chatButtonText.setColor('#aaaaaa');
      this.chatButton.setAlpha(this.chatUsesRemaining > 0 ? 1 : 0.3);
    }
  }

  // === Phase 5: VIP Guests ===

  private checkVIPArrivals(): void {
    for (const vipType of Object.values(VIPType)) {
      if (this.vipThresholdsCrossed.has(vipType)) continue;
      if (this.activeVIPs.has(vipType)) continue;

      const config = VIP_CONFIG.types[vipType];
      if (this.hypeLevel >= config.hypeThreshold) {
        this.vipThresholdsCrossed.add(vipType);

        // Announce
        const announcement = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, `\u2B50 VIP ${config.label} arriving! \u2B50`, {
          fontSize: '18px', color: '#ffd700', fontStyle: 'bold',
          stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5, 0.5).setDepth(60);

        this.tweens.add({
          targets: announcement, alpha: 0, y: GAME_HEIGHT / 2 - 100,
          duration: 3000, onComplete: () => announcement.destroy(),
        });

        // Spawn after delay
        this.time.delayedCall(VIP_CONFIG.arrivalDelay, () => {
          this.spawnVIP(vipType);
        });
      }
    }
  }

  private spawnVIP(type: VIPType): void {
    if (this.activeVIPs.has(type)) return;

    const config = VIP_CONFIG.types[type];
    const entrance = ZONES.entrance;
    const guest = new Guest(
      this,
      entrance.x + entrance.width / 2,
      entrance.y,
      config.label
    );

    // Override starting needs — VIPs are happier
    const { min, max } = VIP_CONFIG.startingNeeds;
    guest.modifyHunger(Phaser.Math.Between(min, max) - guest.getHunger());
    guest.modifyFun(Phaser.Math.Between(min, max) - guest.getFun());
    guest.modifySocial(Phaser.Math.Between(min, max) - guest.getSocial());
    guest.modifyThirst(Phaser.Math.Between(min, max) - guest.getThirst());

    guest.setVIP(type, config.icon, config.color);
    guest.bathroomSignsPosted = this.signsPosted;

    // Set up standard callbacks
    this.setupGuestCallbacks(guest);

    guest.on('guest-left', (g: Guest) => {
      this.removeGuest(g);
      this.guestsLeft++;
    });

    // Make clickable for introductions
    guest.setSize(24, 24);
    guest.setInteractive();
    guest.setDepth(6);
    guest.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      if (this.isPlacingTrashCan) return;
      this.onGuestClicked(guest);
    });

    this.guests.push(guest);
    this.needsSystem.registerGuest(guest);
    this.totalGuestsSpawned++;
    this.activeVIPs.set(type, guest);

    guest.walkTo(
      Phaser.Math.Between(VENUE.x + 60, VENUE.right - 60),
      Phaser.Math.Between(VENUE.y + 60, VENUE.bottom - 80)
    );
  }

  private applyVIPBonuses(delta: number): void {
    const dt = delta / 1000;

    // Pizza Chef: auto-orders pizza periodically
    const chef = this.activeVIPs.get(VIPType.PizzaChef);
    if (chef && chef.getGuestState() !== GuestState.Leaving) {
      this.pizzaChefTimer += delta;
      const interval = VIP_CONFIG.types[VIPType.PizzaChef].autoPizzaInterval;
      if (this.pizzaChefTimer >= interval) {
        this.pizzaChefTimer = 0;
        // Order a random pizza type that isn't full
        const types = [PizzaType.Pepperoni, PizzaType.Veggie, PizzaType.Hawaiian];
        const shuffled = types.sort(() => Math.random() - 0.5);
        for (const t of shuffled) {
          if (!this.pizzaStation.isFullForType(t)) {
            this.pizzaStation.orderPizza(t);
            break;
          }
        }
      }
    }

    // Influencer: passive fun bonus to all guests
    const influencer = this.activeVIPs.get(VIPType.Influencer);
    if (influencer && influencer.getGuestState() !== GuestState.Leaving) {
      const bonus = VIP_CONFIG.types[VIPType.Influencer].passiveFunBonus;
      for (const guest of this.guests) {
        guest.modifyFun(bonus * dt);
      }
    }

    // DJ Superstar: add passive hype (DJ fun bonus multiplier handled in applyEntertainmentBonuses)
    const djStar = this.activeVIPs.get(VIPType.DJSuperstar);
    if (djStar && djStar.getGuestState() !== GuestState.Leaving) {
      this.hypeLevel = Math.min(HYPE_CONFIG.maxHype, this.hypeLevel + VIP_CONFIG.types[VIPType.DJSuperstar].passiveHypeBonus * dt);
    }
  }

  // === Phase 5: Party Milestones ===

  private checkMilestones(delta: number): void {
    const avgSat = this.needsSystem.getAverageSatisfaction();

    // Good Vibes: avg sat >= 70 for 10 consecutive seconds
    if (!this.milestonesAchieved.has('goodVibes')) {
      if (avgSat >= MILESTONE_CONFIG.goodVibes.satThreshold) {
        this.goodVibesDuration += delta;
        if (this.goodVibesDuration >= MILESTONE_CONFIG.goodVibes.durationRequired) {
          this.triggerMilestone('goodVibes', 'Good Vibes!');
          this.hypeLevel = Math.min(HYPE_CONFIG.maxHype, this.hypeLevel + MILESTONE_CONFIG.goodVibes.hypeReward);
          for (const g of this.guests) g.modifyFun(MILESTONE_CONFIG.goodVibes.funBonus);
        }
      } else {
        this.goodVibesDuration = 0;
      }
    }

    // Full House: 12+ guests
    if (!this.milestonesAchieved.has('fullHouse') && this.guests.length >= MILESTONE_CONFIG.fullHouse.guestThreshold) {
      this.triggerMilestone('fullHouse', 'Full House!');
      this.hypeLevel = Math.min(HYPE_CONFIG.maxHype, this.hypeLevel + MILESTONE_CONFIG.fullHouse.hypeReward);
      this.milestoneSpawnBoostTimer = MILESTONE_CONFIG.fullHouse.spawnBoostDuration;
    }

    // Social Butterfly: 5 introductions
    if (!this.milestonesAchieved.has('socialButterfly') && this.introducedPairs.size >= MILESTONE_CONFIG.socialButterfly.introductionsRequired) {
      this.triggerMilestone('socialButterfly', 'Social Butterfly!');
      this.hypeLevel = Math.min(HYPE_CONFIG.maxHype, this.hypeLevel + MILESTONE_CONFIG.socialButterfly.hypeReward);
      const talkers = this.guests.filter(g => g.getGuestState() === GuestState.Talking);
      for (const g of talkers) g.modifySocial(MILESTONE_CONFIG.socialButterfly.socialBonus);
    }

    // Clean Machine: 0 trash with 8+ guests
    if (!this.milestonesAchieved.has('cleanMachine') && this.trashItems.length <= MILESTONE_CONFIG.cleanMachine.maxTrash && this.guests.length >= MILESTONE_CONFIG.cleanMachine.minGuests) {
      this.triggerMilestone('cleanMachine', 'Clean Machine!');
      this.hypeLevel = Math.min(HYPE_CONFIG.maxHype, this.hypeLevel + MILESTONE_CONFIG.cleanMachine.hypeReward);
      this.trashDropMultiplier = MILESTONE_CONFIG.cleanMachine.trashDropMultiplier;
      this.trashReductionTimer = MILESTONE_CONFIG.cleanMachine.trashReductionDuration;
    }

    // Hype Train: hype reaches 80
    if (!this.milestonesAchieved.has('hypeTrain') && this.hypeLevel >= MILESTONE_CONFIG.hypeTrain.hypeThreshold) {
      this.triggerMilestone('hypeTrain', 'Hype Train!');
      this.partyTimer += MILESTONE_CONFIG.hypeTrain.timeReward;
      for (let i = 0; i < MILESTONE_CONFIG.hypeTrain.bonusGuests; i++) this.spawnGuest();
    }

    // Update trash reduction timer
    if (this.trashReductionTimer > 0) {
      this.trashReductionTimer -= delta;
      if (this.trashReductionTimer <= 0) {
        this.trashDropMultiplier = 1;
      }
    }

    // Update milestone spawn boost timer
    if (this.milestoneSpawnBoostTimer > 0) {
      this.milestoneSpawnBoostTimer -= delta;
    }
  }

  private triggerMilestone(id: string, label: string): void {
    this.milestonesAchieved.add(id);

    // Gold announcement
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, `\u{1F3C6} ${label}`, {
      fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(60);

    this.tweens.add({
      targets: text,
      scaleX: 1.3, scaleY: 1.3,
      duration: 300,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: text, alpha: 0, y: text.y - 40,
          duration: 1500, onComplete: () => text.destroy(),
        });
      },
    });

    // Celebration emojis
    const celebEmojis = ['\u{1F389}', '\u2B50', '\u{1F525}'];
    for (let i = 0; i < 3; i++) {
      const e = this.add.text(
        GAME_WIDTH / 2 + Phaser.Math.Between(-50, 50),
        GAME_HEIGHT / 2,
        celebEmojis[i],
        { fontSize: '20px' }
      ).setDepth(60);
      this.tweens.add({
        targets: e, y: e.y - 80, alpha: 0,
        duration: 1200, delay: i * 200,
        onComplete: () => e.destroy(),
      });
    }
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

    // Spawn guests — Phase 5: hype-driven spawn interval
    this.guestSpawnTimer += delta;
    if (this.guestSpawnTimer >= this.getCurrentSpawnInterval()) {
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

    // Phase 5: Hype, social media, chat timers, VIP bonuses, milestones
    this.updateHype(delta);
    this.updateSocialMedia(delta);
    this.updateChatTimers(delta);
    this.applyVIPBonuses(delta);
    this.checkMilestones(delta);

    // Feature 5: Introduction cooldown tick
    if (this.introductionCooldown > 0) {
      this.introductionCooldown -= delta;
    }

    // Update HUD
    this.updateHUD();
  }
}
