// Game layout and tuning constants

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Venue bounds (playable area)
export const VENUE = {
  x: 50,
  y: 100,
  width: 700,
  height: 450,
  right: 750,
  bottom: 550,
};

// Zone definitions (within venue)
export const ZONES = {
  pizzaTable: { x: 70, y: 120, width: 160, height: 100, label: '🍕 Pizza Table' },
  danceFloor: { x: 280, y: 260, width: 240, height: 200, label: '💃 Dance Floor' },
  chillZone: { x: 560, y: 380, width: 170, height: 150, label: '😎 Chill Zone' },
  entrance: { x: 370, y: 540, width: 60, height: 20 },
};

// Trash can positions
export const TRASH_CANS = [
  { x: 240, y: 170 },
  { x: 530, y: 350 },
  { x: 740, y: 520 },
];

// Guest tuning
export const GUEST_CONFIG = {
  maxGuests: 12,
  spawnInterval: 4000, // ms between guest arrivals
  moveSpeed: 60, // pixels per second
  wanderInterval: { min: 2000, max: 5000 }, // ms between wander decisions
  leaveThreshold: 15, // satisfaction below this = leave
  startingNeeds: { min: 40, max: 70 },
};

// Needs decay rates (per second)
export const NEEDS_DECAY = {
  hunger: 2.5,
  fun: 1.5,
  social: 1.0,
};

// Satisfaction bonuses (per second while doing activity)
export const NEEDS_BONUS = {
  eating: 35, // hunger restored per second while eating
  dancing: 20, // fun restored per second while dancing
  talking: 25, // social restored per second while talking
};

// Pizza config
export const PIZZA_CONFIG = {
  maxSlices: 8,
  orderTime: 5000, // ms to prepare a pizza
  eatDuration: 3000, // ms for guest to eat a slice
  cost: 0, // free for MVP
};

// Trash config
export const TRASH_CONFIG = {
  dropChance: 0.3, // chance guest drops trash after eating
  maxTrash: 20,
  cleanTime: 500, // ms to clean one piece of trash (click)
  satisfactionPenaltyRadius: 100, // pixels — trash within this range hurts satisfaction
  satisfactionPenaltyRate: 0.5, // extra decay per second per nearby trash
};

// Party timer
export const PARTY_CONFIG = {
  duration: 120, // seconds (2 minutes for MVP)
  winThreshold: 50, // average satisfaction above this = win
  ratingThresholds: {
    amazing: 80,
    great: 65,
    okay: 50,
    bad: 0,
  },
};

// Guest names pool
export const GUEST_NAMES = [
  'Alex', 'Sam', 'Jordan', 'Casey', 'Riley',
  'Morgan', 'Taylor', 'Quinn', 'Avery', 'Parker',
  'Jamie', 'Drew', 'Sage', 'Kai', 'Blake',
];
