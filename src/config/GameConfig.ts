// Game layout and tuning constants

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const VENUE = {
  x: 50, y: 100, width: 700, height: 450, right: 750, bottom: 550,
};

export const ZONES = {
  pizzaTable: { x: 70, y: 120, width: 160, height: 100, label: '\u{1F355} Pizza Table' },
  bar: { x: 560, y: 120, width: 170, height: 100, label: '\u{1F37A} Bar' },
  danceFloor: { x: 280, y: 260, width: 240, height: 200, label: '\u{1F483} Dance Floor' },
  chillZone: { x: 560, y: 380, width: 170, height: 150, label: '\u{1F60E} Chill Zone' },
  bathroom: { x: 70, y: 280, width: 130, height: 110, label: '\u{1F6BB} Bathroom' },
  entrance: { x: 370, y: 540, width: 60, height: 20 },
};

// Trash can positions (initial set)
export const INITIAL_TRASH_CANS = [
  { x: 240, y: 170 }, { x: 530, y: 350 }, { x: 740, y: 520 },
];

export const TRASH_CAN_PLACEMENT_CONFIG = {
  maxAdditional: 3,
  proximityRadius: 80,
  minDistanceBetweenCans: 60,
};

export const GUEST_CONFIG = {
  maxGuests: 12,
  spawnInterval: 4000,
  moveSpeed: 60,
  wanderInterval: { min: 2000, max: 5000 },
  leaveThreshold: 15,
  startingNeeds: { min: 40, max: 70 },
};

export const NEEDS_DECAY = {
  hunger: 2.5, fun: 1.5, social: 1.0, thirst: 2.0,
};

export const BLADDER_CONFIG = {
  fillRate: 1.5, drinkBoost: 3.0, drinkBoostDuration: 8000,
  urgentThreshold: 70, emergencyThreshold: 90, emergencyPenalty: 15,
  useDuration: 3000,
};

export const NEEDS_BONUS = {
  eating: 35, dancing: 20, talking: 25, drinking: 30,
};

export const PIZZA_CONFIG = {
  maxSlicesPerType: 4, orderTime: 5000, eatDuration: 3000, cost: 0,
};

export enum PizzaType {
  Pepperoni = 'pepperoni',
  Veggie = 'veggie',
  Hawaiian = 'hawaiian',
}

export const PIZZA_VARIETY_CONFIG = {
  maxSlicesPerType: 4,
  types: [
    { type: PizzaType.Pepperoni, icon: '\u{1F355}', label: 'Pepperoni', color: 0xff6b35 },
    { type: PizzaType.Veggie, icon: '\u{1F966}', label: 'Veggie', color: 0x4caf50 },
    { type: PizzaType.Hawaiian, icon: '\u{1F34D}', label: 'Hawaiian', color: 0xffc107 },
  ],
};

export const PIZZA_PREFERENCE_BONUS = 10;

export const DRINK_CONFIG = {
  maxDrinks: 6, orderTime: 3000, drinkDuration: 2500,
};

export const TRASH_CONFIG = {
  dropChance: 0.3, maxTrash: 20, cleanTime: 500,
  satisfactionPenaltyRadius: 100, satisfactionPenaltyRate: 0.5,
};

export const SIGNAGE_CONFIG = {
  baseVisibility: 150, signedVisibility: 500, signCost: 0,
};

export const STAFF_CONFIG = {
  maxBartenders: 2,
  maxCleaners: 2,
  bartender: {
    moveSpeed: 50, serveTime: 2000, restockInterval: 10000,
    restockAmount: 3, drunkRefusalLevel: 3,
  },
  cleaner: {
    moveSpeed: 45, cleanTime: 800, searchRadius: 400, pauseBetweenCleans: 1500,
  },
  maxLevel: 5, levelSpeedBonus: 0.15, trainTime: 3000,
};

export const DRUNK_CONFIG = {
  drinkThreshold: 3, wobbleAmount: 1.5, trashDropChance: 0.7,
  socialPenaltyRadius: 80, socialPenaltyRate: 2.0,
  satisfactionMultiplier: 0.7, soberUpTime: 30000,
};

// --- Phase 4: Personalities ---

export enum Personality {
  Chatty = 'chatty',
  Shy = 'shy',
  Foodie = 'foodie',
  PartyAnimal = 'partyAnimal',
}

export const PERSONALITY_CONFIG: Record<Personality, {
  icon: string;
  label: string;
  color: number;
  decayMultiplier: { hunger: number; fun: number; social: number; thirst: number };
  bonusMultiplier: { eating: number; dancing: number; talking: number };
  funTarget: 'dance' | 'arcade' | 'photoBooth' | 'any';
}> = {
  [Personality.Chatty]: {
    icon: '\u{1F5E3}\u{FE0F}', label: 'Chatty', color: 0xf39c12,
    decayMultiplier: { hunger: 1.0, fun: 1.0, social: 1.5, thirst: 1.0 },
    bonusMultiplier: { eating: 1.0, dancing: 1.0, talking: 1.5 },
    funTarget: 'any',
  },
  [Personality.Shy]: {
    icon: '\u{1F60A}', label: 'Shy', color: 0x9b59b6,
    decayMultiplier: { hunger: 1.0, fun: 1.2, social: 0.5, thirst: 1.0 },
    bonusMultiplier: { eating: 1.0, dancing: 0.7, talking: 0.8 },
    funTarget: 'arcade',
  },
  [Personality.Foodie]: {
    icon: '\u{1F355}', label: 'Foodie', color: 0xe74c3c,
    decayMultiplier: { hunger: 1.8, fun: 0.8, social: 1.0, thirst: 1.2 },
    bonusMultiplier: { eating: 1.5, dancing: 0.8, talking: 1.0 },
    funTarget: 'any',
  },
  [Personality.PartyAnimal]: {
    icon: '\u{1F389}', label: 'Party Animal', color: 0x2ecc71,
    decayMultiplier: { hunger: 1.0, fun: 2.0, social: 0.8, thirst: 1.3 },
    bonusMultiplier: { eating: 1.0, dancing: 1.8, talking: 1.0 },
    funTarget: 'dance',
  },
};

// --- Phase 4: Entertainment Installations ---

export interface EntertainmentDef {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  funBonus: number; // fun/sec for guests using it
  socialBonus: number; // social/sec for guests using it
  capacity: number; // max simultaneous users
  useDuration: { min: number; max: number }; // ms
  passiveRadius?: number; // if set, gives passive bonus to guests within radius
  passiveFunBonus?: number; // passive fun/sec
}

export const ENTERTAINMENT: EntertainmentDef[] = [
  {
    id: 'dj', label: '\u{1F3A7} DJ Booth', icon: '\u{1F3A7}',
    x: 280, y: 235, width: 60, height: 25, color: 0xe91e63,
    funBonus: 0, socialBonus: 0, capacity: 0,
    useDuration: { min: 0, max: 0 },
    passiveRadius: 180, passiveFunBonus: 5, // boosts all dancers nearby
  },
  {
    id: 'arcade', label: '\u{1F579}\u{FE0F} Arcade', icon: '\u{1F579}\u{FE0F}',
    x: 70, y: 420, width: 100, height: 80, color: 0x8e44ad,
    funBonus: 25, socialBonus: 0, capacity: 2,
    useDuration: { min: 3000, max: 6000 },
  },
  {
    id: 'photoBooth', label: '\u{1F4F8} Photo Booth', icon: '\u{1F4F8}',
    x: 260, y: 130, width: 90, height: 70, color: 0x1abc9c,
    funBonus: 15, socialBonus: 20, capacity: 3,
    useDuration: { min: 2000, max: 4000 },
  },
];

// Conversation group bonus
export const CONVERSATION_CONFIG = {
  groupRadius: 60, // pixels — guests this close while talking form a group
  groupBonus: 8, // extra social/sec per additional group member
  compatibilityBonus: 5, // extra social/sec for compatible personalities
  incompatibilityPenalty: 3, // social/sec lost for incompatible
  // Compatibility matrix: chatty+chatty, partyAnimal+partyAnimal, chatty+partyAnimal = good
  // shy+partyAnimal = bad, shy prefers shy or foodie
};

// DJ Volume mechanic
export const DJ_VOLUME_CONFIG = {
  levels: [
    { passiveRadius: 100, passiveFunBonus: 3, annoyanceRadius: 0, annoyanceFunPenalty: 0, annoyanceSocialPenalty: 0 },
    { passiveRadius: 180, passiveFunBonus: 5, annoyanceRadius: 0, annoyanceFunPenalty: 0, annoyanceSocialPenalty: 0 },
    { passiveRadius: 260, passiveFunBonus: 8, annoyanceRadius: 200, annoyanceFunPenalty: 0, annoyanceSocialPenalty: 3 },
  ],
};

// Guest introductions
export const INTRODUCTION_CONFIG = {
  cooldown: 5000, // ms between introductions
  talkDuration: 4000, // ms the introduced pair talks
  socialBonus: 15,
  funBonus: 5,
};

// --- Phase 5: Party Promotion ---

export const HYPE_CONFIG = {
  initialHype: 20,
  maxHype: 100,
  highSatBonus: 2,
  highSatThreshold: 65,
  dancerBonus: 0.5,
  fullCapacityBonus: 1,
  introductionBonus: 5,
  guestLeftPenalty: 8,
  lowSatPenalty: 3,
  lowSatThreshold: 40,
  trashPenalty: 1,
  trashThreshold: 10,
  drunkPenalty: 2,
  spawnTiers: [
    { minHype: 0,  spawnInterval: 5000 },
    { minHype: 26, spawnInterval: 4000 },
    { minHype: 51, spawnInterval: 3000 },
    { minHype: 76, spawnInterval: 2500 },
  ],
  guestCapTiers: [
    { minHype: 0,  maxGuests: 12 },
    { minHype: 60, maxGuests: 15 },
    { minHype: 80, maxGuests: 18 },
  ],
};

export const SOCIAL_MEDIA_CONFIG = {
  postInterval: { min: 8000, max: 15000 },
  positiveThreshold: 60,
  negativeThreshold: 35,
  positiveHypeBonus: 3,
  negativeHypePenalty: 5,
  positiveEmojis: ['\u{1F525}', '\u2764\uFE0F', '\u2B50', '\u{1F389}', '\u{1F4F8}'],
  negativeEmojis: ['\u{1F44E}', '\u{1F634}', '\u{1F621}', '\u{1F5D1}\uFE0F'],
  neutralEmojis: ['\u{1F914}', '\u{1F937}'],
  chattyMultiplier: 2.0,
  shyMultiplier: 0.5,
  floatDuration: 2000,
  floatHeight: 60,
};

export const HIT_THE_CHATS_CONFIG = {
  boostDuration: 15000,
  spawnIntervalMultiplier: 0.5,
  minSpawnInterval: 1500,
  immediateSpawns: 2,
  highHypeImmediateSpawns: 3,
  highHypeThreshold: 50,
  hypeBonus: 5,
  cooldown: 45000,
  maxUses: 3,
  chatEmojis: ['\u{1F4AC}', '\u{1F4F1}', '\u{1F5E3}\uFE0F', '\u{1F4F2}', '\u{1F440}'],
};

export enum VIPType {
  PizzaChef = 'pizzaChef',
  Influencer = 'influencer',
  DJSuperstar = 'djSuperstar',
}

export const VIP_CONFIG = {
  arrivalDelay: 5000,
  startingNeeds: { min: 70, max: 90 },
  leavePenalty: 15,
  types: {
    [VIPType.PizzaChef]: {
      hypeThreshold: 40, icon: '\u{1F468}\u200D\u{1F373}', label: 'Pizza Chef',
      color: 0xff6b35, autoPizzaInterval: 8000,
    },
    [VIPType.Influencer]: {
      hypeThreshold: 60, icon: '\u{1F933}', label: 'Influencer',
      color: 0xe91e63, passiveFunBonus: 2,
    },
    [VIPType.DJSuperstar]: {
      hypeThreshold: 80, icon: '\u{1F31F}', label: 'DJ Superstar',
      color: 0xffd700, djBonusMultiplier: 2.0, passiveHypeBonus: 1,
    },
  },
};

export const MILESTONE_CONFIG = {
  goodVibes: {
    satThreshold: 70, durationRequired: 10000,
    hypeReward: 10, funBonus: 5,
  },
  fullHouse: {
    guestThreshold: 12, hypeReward: 15,
    spawnBoostDuration: 10000, spawnBoostReduction: 1000,
  },
  socialButterfly: {
    introductionsRequired: 5, hypeReward: 10, socialBonus: 10,
  },
  cleanMachine: {
    maxTrash: 0, minGuests: 8, hypeReward: 10,
    trashReductionDuration: 20000, trashDropMultiplier: 0.5,
  },
  hypeTrain: {
    hypeThreshold: 80, timeReward: 15, bonusGuests: 3,
  },
};

export const PARTY_CONFIG = {
  duration: 120,
  winThreshold: 50,
  ratingThresholds: { amazing: 80, great: 65, okay: 50, bad: 0 },
};

export const GUEST_NAMES = [
  'Alex', 'Sam', 'Jordan', 'Casey', 'Riley',
  'Morgan', 'Taylor', 'Quinn', 'Avery', 'Parker',
  'Jamie', 'Drew', 'Sage', 'Kai', 'Blake',
];
