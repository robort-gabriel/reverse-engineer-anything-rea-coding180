// Static world data for Eko Life. Positions are world units on the city plane:
// x runs west → east, z runs north (mainland, negative) → south (island, positive).
// The lagoon occupies LAGOON.z0..LAGOON.z1 across the full width.

export const WORLD = { w: 104, d: 84 };
export const LAGOON = { z0: -4, z1: 7 };
export const BRIDGES = [-14, 16]; // x positions of the two bridges

// effects keys: energy, hunger, fun, social, hygiene (each 0..100)
export const PLACES = [
  // ── Mainland ──────────────────────────────────────────────
  { id: 'shrine', name: 'Afrika Shrine', emoji: '🎷', pos: [-38, -26], style: 'hall', color: '#c0573c', h: 3,
    blurb: 'Afrobeat, heat and loud speakers in Ikeja.',
    actions: [
      { id: 'dance', label: 'Dance to live Afrobeat', emoji: '💃🏾', mins: 120, cost: 2000, fx: { fun: 35, energy: -18, social: 15, hygiene: -10 } },
      { id: 'drink', label: 'Chill with a cold one', emoji: '🍺', mins: 45, cost: 1200, fx: { fun: 15, social: 10 } },
    ] },
  { id: 'viewing', name: 'Viewing Centre', emoji: '⚽', pos: [-24, -30], style: 'shack', color: '#3f8f5a', h: 2,
    blurb: 'Plastic chairs, one big screen, a lot of shouting.',
    actions: [
      { id: 'match', label: 'Watch the big match', emoji: '📺', mins: 105, cost: 500, fx: { fun: 30, social: 18, energy: -5 } },
      { id: 'bet', label: 'Argue about ball with strangers', emoji: '🗣️', mins: 30, cost: 0, fx: { social: 14, fun: 6 } },
    ] },
  { id: 'amala', name: 'Amala Shitta', emoji: '🍲', pos: [-10, -24], style: 'shack', color: '#d48a2c', h: 2,
    blurb: 'Amala, ewedu, gbegiri and a long queue in Surulere.',
    actions: [
      { id: 'eat', label: 'Chop amala & ewedu', emoji: '🍲', mins: 40, cost: 1800, fx: { hunger: 55, fun: 6 } },
      { id: 'takeaway', label: 'Takeaway for later', emoji: '🥡', mins: 15, cost: 1500, fx: { hunger: 30 } },
    ] },
  { id: 'cchub', name: 'CcHub', emoji: '💡', pos: [4, -28], style: 'office', color: '#2f6fb0', h: 6,
    blurb: 'Yaba tech hub. Fast wifi, faster ideas.',
    actions: [
      { id: 'build', label: 'Ship your startup MVP', emoji: '💻', mins: 240, earn: 7500, fx: { energy: -25, fun: -5, hunger: -10 } },
      { id: 'meetup', label: 'Attend a tech meetup', emoji: '🤝', mins: 90, cost: 0, fx: { social: 20, fun: 8, energy: -6 } },
    ] },
  { id: 'market', name: 'Market', emoji: '🧺', pos: [18, -30], style: 'stalls', color: '#e0b43a', h: 1.4,
    blurb: 'Everything has a price. The first price is never it.',
    actions: [
      { id: 'sell', label: 'Run a stall for the day', emoji: '🧾', mins: 240, earn: 4200, fx: { energy: -20, social: 12, hygiene: -10 } },
      { id: 'buy', label: 'Buy foodstuff', emoji: '🛒', mins: 45, cost: 2500, fx: { hunger: 25 } },
    ] },
  { id: 'fitness', name: 'i-Fitness', emoji: '🏋️', pos: [32, -24], style: 'office', color: '#7a4fb3', h: 3,
    blurb: 'Leg day is not optional.',
    actions: [
      { id: 'workout', label: 'Work out', emoji: '🏋️', mins: 75, cost: 1000, fx: { energy: -20, fun: 10, hygiene: -18 } },
      { id: 'shower', label: 'Shower at the gym', emoji: '🚿', mins: 15, cost: 0, fx: { hygiene: 45 } },
    ] },
  { id: 'library', name: 'The Library', emoji: '📚', pos: [44, -30], style: 'hall', color: '#8a6a4a', h: 3,
    blurb: 'Air-con and silence. Rare things in Lagos.',
    actions: [
      { id: 'read', label: 'Read for a while', emoji: '📖', mins: 90, cost: 0, fx: { fun: 12, energy: -4 } },
      { id: 'nap', label: 'Sneak a nap', emoji: '😴', mins: 60, cost: 0, fx: { energy: 22 } },
    ] },
  { id: 'salon', name: "Mama Bisi's Salon", emoji: '💇🏾‍♀️', pos: [-40, -12], style: 'shack', color: '#d0608a', h: 2,
    blurb: 'Gist is free with every appointment.',
    actions: [
      { id: 'hair', label: 'Get your hair done', emoji: '💇🏾', mins: 120, cost: 3500, fx: { hygiene: 30, social: 18, fun: 8 } },
    ] },
  { id: 'church', name: 'Church', emoji: '⛪', pos: [-26, -12], style: 'church', color: '#e8e2d6', h: 4,
    blurb: 'Sunday service runs till Monday.',
    actions: [
      { id: 'service', label: 'Attend service', emoji: '🙏🏾', mins: 180, cost: 0, fx: { social: 25, fun: 6, energy: -8 } },
      { id: 'choir', label: 'Sing in the choir', emoji: '🎶', mins: 60, cost: 0, fx: { fun: 18, social: 10 } },
    ] },
  { id: 'radio', name: 'Naija Radio', emoji: '📻', pos: [-8, -12], style: 'tower', color: '#c23b3b', h: 7,
    blurb: 'On air, on point, on generator.',
    actions: [
      { id: 'host', label: 'Host a radio segment', emoji: '🎙️', mins: 180, earn: 5000, fx: { energy: -14, social: 15, fun: 6 } },
    ] },
  { id: 'unilag', name: 'UNILAG', emoji: '🎓', pos: [10, -14], style: 'campus', color: '#6b8fbf', h: 4,
    blurb: 'University of First Choice and Best for Last.',
    actions: [
      { id: 'lecture', label: 'Attend a lecture', emoji: '📝', mins: 120, cost: 0, fx: { energy: -10, fun: -4, social: 8 } },
      { id: 'tutor', label: 'Tutor students', emoji: '🧑🏾‍🏫', mins: 120, earn: 3000, fx: { energy: -12, social: 6 } },
    ] },
  { id: 'mindspace', name: 'MindSpace', emoji: '🫶🏾', pos: [26, -12], style: 'office', color: '#5bb5a2', h: 2.5,
    blurb: 'Therapy, breathing and a soft couch.',
    actions: [
      { id: 'therapy', label: 'Talk it out', emoji: '🛋️', mins: 60, cost: 2500, fx: { fun: 20, energy: 10, social: 8 } },
    ] },
  { id: 'stadium', name: 'Stadium', emoji: '🏟️', pos: [42, -14], style: 'stadium', color: '#9aa3ad', h: 2.5,
    blurb: 'National Stadium, Surulere. Jog the track.',
    actions: [
      { id: 'jog', label: 'Jog the track', emoji: '🏃🏾', mins: 45, cost: 0, fx: { energy: -12, fun: 8, hygiene: -14 } },
      { id: 'fiveaside', label: 'Play 5-a-side', emoji: '⚽', mins: 90, cost: 500, fx: { fun: 25, social: 15, energy: -20, hygiene: -15 } },
    ] },
  { id: 'snooker', name: 'Snooker Spot', emoji: '🎱', pos: [-44, -32], style: 'shack', color: '#2e7d4f', h: 1.8,
    blurb: 'Winner stays on. Loser buys mineral.',
    actions: [
      { id: 'snooker', label: 'Play a frame', emoji: '🎱', mins: 40, cost: 300, fx: { fun: 18, social: 10 } },
    ] },
  { id: 'jibowu', name: 'Jibowu Park', emoji: '🚌', pos: [30, -34], style: 'park', color: '#e8c33a', h: 1,
    blurb: 'Danfo central. Enter with your change ready.',
    actions: [
      { id: 'conductor', label: 'Work as a danfo conductor', emoji: '🚐', mins: 180, earn: 3800, fx: { energy: -22, social: 10, hygiene: -15 } },
    ] },

  // ── Island ────────────────────────────────────────────────
  { id: 'freedom', name: 'Freedom Park', emoji: '🎭', pos: [-36, 16], style: 'park', color: '#4f9a52', h: 1,
    blurb: 'Poetry, plays and open-air vibes.',
    actions: [
      { id: 'show', label: 'Watch a stage play', emoji: '🎭', mins: 120, cost: 1500, fx: { fun: 28, social: 10 } },
      { id: 'perform', label: 'Perform spoken word', emoji: '🎤', mins: 30, earn: 1200, fx: { fun: 10, social: 12 } },
    ] },
  { id: 'marina', name: 'Marina Towers', emoji: '🏢', pos: [-22, 14], style: 'tower', color: '#7d8a99', h: 11,
    blurb: 'Corporate Lagos. Suits in 33°C.',
    actions: [
      { id: 'bank', label: 'Work a banking shift', emoji: '🏦', mins: 300, earn: 11000, fx: { energy: -28, fun: -12, social: 4 } },
    ] },
  { id: 'court', name: 'High Court', emoji: '⚖️', pos: [-8, 18], style: 'hall', color: '#d9cfbf', h: 3.5,
    blurb: 'Objection, my lord.',
    actions: [
      { id: 'case', label: 'Argue a case', emoji: '👩🏾‍⚖️', mins: 240, earn: 9000, fx: { energy: -22, social: 8 } },
    ] },
  { id: 'eko', name: 'Eko Hotels', emoji: '🏨', pos: [8, 14], style: 'tower', color: '#e9eef5', h: 8,
    blurb: 'Weddings every weekend. Small chops always.',
    actions: [
      { id: 'owambe', label: 'Crash an owambe', emoji: '🎉', mins: 150, cost: 0, fx: { fun: 30, hunger: 35, social: 25, energy: -15 } },
      { id: 'room', label: 'Book a room & sleep', emoji: '🛏️', mins: 420, cost: 45000, fx: { energy: 80, hygiene: 40 } },
    ] },
  { id: 'quilox', name: 'Quilox', emoji: '🪩', pos: [22, 18], style: 'club', color: '#2a2440', h: 3,
    blurb: 'Bottles, sparklers and a dress code.',
    actions: [
      { id: 'party', label: 'Party till 4am', emoji: '🪩', mins: 240, cost: 15000, fx: { fun: 50, social: 30, energy: -35, hygiene: -15 } },
    ] },
  { id: 'casino', name: 'Eko Casino', emoji: '🎰', pos: [36, 14], style: 'club', color: '#b8312f', h: 3,
    blurb: 'The house always wins. Usually.',
    actions: [
      { id: 'slots', label: 'Try your luck (₦2,000)', emoji: '🎰', mins: 30, cost: 2000, gamble: true, fx: { fun: 15 } },
    ] },
  { id: 'palms', name: 'The Palms', emoji: '🛍️', pos: [-36, 30], style: 'mall', color: '#f0a64a', h: 3,
    blurb: 'Mall, cinema and food court in Lekki.',
    actions: [
      { id: 'shop', label: 'Shop for new drip', emoji: '🛍️', mins: 90, cost: 8000, fx: { fun: 20, hygiene: 5 } },
      { id: 'cinema', label: 'Catch a movie', emoji: '🍿', mins: 120, cost: 3500, fx: { fun: 30, social: 8 } },
    ] },
  { id: 'ivory', name: 'Ivory Rooftop', emoji: '🕯️', pos: [-20, 32], style: 'office', color: '#f3e7cf', h: 5,
    blurb: 'Candlelight dinner with a view.',
    actions: [
      { id: 'date', label: 'Go on a date', emoji: '🥂', mins: 120, cost: 12000, fx: { fun: 30, social: 35, hunger: 40 } },
    ] },
  { id: 'mako', name: 'Mako', emoji: '🍕', pos: [-4, 30], style: 'shack', color: '#e05a3a', h: 2,
    blurb: 'Pizza and small chops by the water.',
    actions: [
      { id: 'pizza', label: 'Order pizza', emoji: '🍕', mins: 40, cost: 6500, fx: { hunger: 50, fun: 10 } },
    ] },
  { id: 'polanco', name: 'Polanco Motors', emoji: '🚘', pos: [12, 30], style: 'mall', color: '#3a3f4a', h: 2.4,
    blurb: 'Tokunbo deals, brand-new dreams.',
    actions: [
      { id: 'testdrive', label: 'Test-drive a car', emoji: '🚗', mins: 45, cost: 0, fx: { fun: 20 } },
      { id: 'buycar', label: 'Buy a car (₦2.5M)', emoji: '🔑', mins: 60, cost: 2500000, perk: 'car', fx: { fun: 40 } },
    ] },
  { id: 'canopy', name: 'Canopy Walk', emoji: '🌉', pos: [30, 30], style: 'forest', color: '#3d8a48', h: 1,
    blurb: 'Lekki Conservation Centre. Mind the monkeys.',
    actions: [
      { id: 'walk', label: 'Walk the canopy', emoji: '🌳', mins: 90, cost: 3000, fx: { fun: 25, energy: -10, hygiene: -6 } },
    ] },
  { id: 'cruise', name: 'Boat Cruise', emoji: '⛵', pos: [46, 24], style: 'jetty', color: '#ffffff', h: 1,
    blurb: 'Lagos from the water. Life jacket compulsory.',
    actions: [
      { id: 'cruise', label: 'Take a boat cruise', emoji: '⛵', mins: 120, cost: 10000, fx: { fun: 35, social: 20 } },
    ] },
  { id: 'obo', name: 'OBO · Coming soon', emoji: '👑', pos: [46, 2], style: 'none', color: '#000', h: 0, soon: true,
    blurb: 'Something royal is coming to the lagoon.', actions: [] },
];

// Home neighbourhoods a Sim can live in, with rent per day and comfort bonus.
export const HOMES = [
  { id: 'mushin', name: 'Mushin', pos: [-46, -20], rent: 0, comfort: 0.7, emoji: '🏚️' },
  { id: 'yaba', name: 'Yaba', pos: [18, -20], rent: 500, comfort: 0.9, emoji: '🏠' },
  { id: 'surulere', name: 'Surulere', pos: [-16, -34], rent: 800, comfort: 1.0, emoji: '🏡' },
  { id: 'ikoyi', name: 'Ikoyi', pos: [44, 32], rent: 4000, comfort: 1.25, emoji: '🏘️' },
  { id: 'bananaIsland', name: 'Banana Island', pos: [-46, 22], rent: 9000, comfort: 1.5, emoji: '🏝️' },
];

export const HOME_ACTIONS = [
  { id: 'sleep', label: 'Sleep', emoji: '🛏️', mins: 480, cost: 0, fx: { energy: 85 } },
  { id: 'cook', label: 'Cook jollof', emoji: '🍛', mins: 60, cost: 1200, fx: { hunger: 60, fun: 5 } },
  { id: 'bath', label: 'Take a bath', emoji: '🛁', mins: 25, cost: 0, fx: { hygiene: 60 } },
  { id: 'netflix', label: 'Watch Nollywood', emoji: '📺', mins: 90, cost: 0, fx: { fun: 22, energy: -4 } },
];

export const HEADLINES = [
  'Balogun trader gives first price. Market in shock.',
  'NEPA restores light for 4 hours. Residents throw party.',
  'Third Mainland Bridge traffic moves at walking pace — of a snail.',
  'Danfo conductor gives exact change. Investigation ongoing.',
  'Amala Shitta queue now visible from space.',
  'Owambe at Eko Hotels runs out of small chops. Guests regroup.',
  'Yaba startup raises seed round, changes name for the third time.',
];

export const TIPS = [
  'Queue actions by tapping places — your Sim does them in order.',
  'Low energy? Go home and sleep, or sneak a nap at The Library.',
  'Jobs pay naira. Marina Towers pays best, but it drains your fun.',
  'Vote at the State House. Governors set a policy that changes prices.',
  'Rent a Sea Plot to float your brand on the lagoon for 30 days.',
];

export const WEATHER = [
  { id: 'sunny', label: 'Sunny', emoji: '☀️', fx: { energy: -1 } },
  { id: 'rainy', label: 'Rainy', emoji: '🌧️', fx: { fun: -1 } },
  { id: 'cloudy', label: 'Cloudy', emoji: '⛅', fx: {} },
  { id: 'harmattan', label: 'Harmattan', emoji: '🌫️', fx: { hygiene: -1 } },
];

// Governor policies: each tweaks the economy while that governor is in office.
export const POLICIES = {
  transport: { label: 'Free BRT rides', note: 'Travel costs nothing and is 30% faster.', travelSpeed: 1.3 },
  food: { label: 'Food subsidy', note: 'Food actions cost 40% less.', foodDiscount: 0.6 },
  jobs: { label: 'Minimum wage boost', note: 'Jobs pay 20% more.', wageBoost: 1.2 },
  fun: { label: 'Owambe every day', note: 'Fun actions give 25% more fun.', funBoost: 1.25 },
};

export const NPC_NAMES = [
  'tolu_eko', 'chidi.vibes', 'amaka_lekki', 'seun4real', 'bolanle', 'ikenna_dev', 'zainab.ng',
  'femi_danfo', 'kemi_owambe', 'dayo_yaba', 'ngozi', 'tunde.ikoyi', 'ada_codes', 'sola_surulere',
];

export const GIST = [
  'Who get charger for here? 🔌', 'This place sweet die 🔥', 'Traffic for Ojuelegba no be here o',
  'Abeg who wan follow me go Quilox later?', 'NEPA don take light again 😩', 'I just finished shift, I tire',
  'Amala today na 10/10', 'Who dey vote for next governor?', 'Make we go boat cruise this weekend',
  'This governor policy dey work sha', 'Na who get car among us? 🚘', 'Rain don start again 🌧️',
];

export const LOOKS = {
  skin: ['#f1c7a3', '#d9a07a', '#c68a62', '#9a6440', '#7a4a2c', '#4e2d1a'],
  top: ['#1d2433', '#22b573', '#e0533d', '#f0b429', '#3a7bd5', '#8e44ad', '#ffffff'],
};
