// Life-sim rules for the logged-in game: needs, moods, skills, careers,
// furniture catalogue, perks, missions and transport.

export const NEEDS = [
  { id: 'hunger', label: 'Hunger', emoji: '🍛', color: '#e8954a', decay: 4 },
  { id: 'energy', label: 'Energy', emoji: '⚡', color: '#4f7fe0', decay: 3 },
  { id: 'fun', label: 'Fun', emoji: '🎉', color: '#e7b931', decay: 3 },
  { id: 'social', label: 'Social', emoji: '💬', color: '#e0558a', decay: 2 },
  { id: 'hygiene', label: 'Hygiene', emoji: '🫧', color: '#4bb59a', decay: 2 },
  { id: 'bladder', label: 'Bladder', emoji: '🚽', color: '#8e6be0', decay: 5 },
]; // decay = points per game hour

export const SKILLS = [
  { id: 'cooking', label: 'Cooking', emoji: '🍳' },
  { id: 'charisma', label: 'Charisma', emoji: '😎' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'coding', label: 'Coding', emoji: '💻' },
  { id: 'music', label: 'Music', emoji: '🎸' },
  { id: 'hustle', label: 'Hustle', emoji: '💼' },
  { id: 'dance', label: 'Dance', emoji: '💃🏾' },
  { id: 'comedy', label: 'Comedy', emoji: '🎭' },
];
export const XP_PER_LEVEL = 100;

export const TRAITS = [
  { id: 'tech', label: 'Tech Bro or Sis', emoji: '💻' },
  { id: 'night', label: 'Night Crawler', emoji: '🌙' },
  { id: 'foodie', label: 'Foodie', emoji: '🍲' },
  { id: 'gym', label: 'Gym Rat', emoji: '🏋🏾' },
  { id: 'social', label: 'Life of the Party', emoji: '🥳' },
  { id: 'hustler', label: 'Hustler', emoji: '🧺' },
];

// Career ladders. Each rank needs: performance 100%, `shifts` shifts at that rank, and skill level ≥ rank*2.
export const CAREERS = [
  { id: 'tech', label: 'Tech', emoji: '💻', skill: 'coding', place: 'cchub', days: 5, blurb: 'From Yaba intern to CTO. Coding pushes promotions.',
    ranks: [['Intern', 8600], ['Junior Dev', 19500], ['Senior Dev', 28500], ['Tech Lead', 42000], ['CTO', 70000]] },
  { id: 'banking', label: 'Banking', emoji: '🏦', skill: 'charisma', place: 'marina', days: 5, blurb: 'Hit your account-opening targets on VI. Charisma is king.',
    ranks: [['Marketer', 10100], ['Relationship Officer', 21000], ['Branch Manager', 33000], ['Regional Head', 48000], ['MD', 80000]] },
  { id: 'music', label: 'Music', emoji: '🎤', skill: 'music', place: 'shrine', days: 5, blurb: 'Night shifts at the Shrine. From backup vocals to Afrobeats giant.',
    ranks: [['Backup Singer', 6400], ['Session Artist', 15000], ['Opening Act', 26000], ['Headliner', 45000], ['Afrobeats Giant', 90000]] },
  { id: 'trading', label: 'Trading', emoji: '🧺', skill: 'hustle', place: 'market', days: 6, blurb: 'Six days in Balogun. Hustle your way to Market Oga.',
    ranks: [['Shop Assistant', 7200], ['Stall Owner', 14000], ['Wholesaler', 24000], ['Importer', 38000], ['Market Oga', 60000]] },
  { id: 'chef', label: 'Chef', emoji: '🍳', skill: 'cooking', place: 'amala', days: 6, blurb: 'Start washing plates at Amala Shitta. Cook your way to celebrity chef.',
    ranks: [['Dishwasher', 6400], ['Line Cook', 13000], ['Sous Chef', 22000], ['Head Chef', 36000], ['Celebrity Chef', 65000]] },
  { id: 'dj', label: 'DJ', emoji: '🎧', skill: 'music', place: 'quilox', days: 4, blurb: 'Late nights at Quilox. From hype man to global DJ.',
    ranks: [['Hype Man', 7200], ['Resident DJ', 16000], ['Club Headliner', 28000], ['Festival DJ', 46000], ['Global DJ', 85000]] },
  { id: 'coach', label: 'Fitness Coach', emoji: '🏋🏾', skill: 'fitness', place: 'fitness', days: 5, blurb: 'Early mornings at i-Fitness. Get Lagos in shape.',
    ranks: [['Gym Floor Assistant', 6400], ['Personal Trainer', 14000], ['Head Coach', 24000], ['Gym Owner', 40000], ['Fitness Mogul', 62000]] },
];
export const SHIFT_MINS = 60;

export const TRANSPORT = [
  { id: 'trek', label: 'Trek', emoji: '🚶', fare: 0, speed: 7 },
  { id: 'keke', label: 'Keke', emoji: '🛺', fare: 100, speed: 11 },
  { id: 'danfo', label: 'Danfo', emoji: '🚐', fare: 100, speed: 13 },
  { id: 'okada', label: 'Okada', emoji: '🏍️', fare: 300, speed: 17 },
  { id: 'ride', label: 'Ride-hail', emoji: '🚕', fare: 600, speed: 22 },
];

// Furniture: w×d footprint in tiles, tier stars, actions available on the object.
// act fields: mins (game minutes), cost (₦), fx (needs), skill ({id: xp}).
export const CATEGORIES = ['Sleep', 'Kitchen', 'Bath', 'Comfort', 'Fun', 'Skills', 'Deco'];
export const FURNITURE = [
  { id: 'mat', name: 'Foam Mattress', cat: 'Sleep', shape: 'bed', w: 2, d: 1, stars: 1, price: 4500, color: '#3b63b8',
    acts: [{ id: 'sleep', label: 'Sleep', emoji: '😴', mins: 420, fx: { energy: 90 } }, { id: 'nap', label: 'Nap', emoji: '💤', mins: 60, fx: { energy: 18 } }] },
  { id: 'bed', name: 'Lekki King Bed', cat: 'Sleep', shape: 'bed', w: 2, d: 2, stars: 3, price: 180000, color: '#efe6d8',
    acts: [{ id: 'sleep', label: 'Sleep like royalty', emoji: '👑', mins: 360, fx: { energy: 100, fun: 5 } }, { id: 'nap', label: 'Nap', emoji: '💤', mins: 45, fx: { energy: 22 } }] },
  { id: 'cooler', name: 'Cooler Box', cat: 'Kitchen', shape: 'cooler', w: 1, d: 1, stars: 1, price: 3500, color: '#2a6fd6', blurb: 'Keeps garri, sugar and zobo. No light needed.',
    acts: [{ id: 'garri', label: 'Soak Garri & Sugar', emoji: '🥣', mins: 10, fx: { hunger: 25 } }, { id: 'zobo', label: 'Drink Zobo', emoji: '🧃', mins: 5, fx: { hunger: 6, fun: 6 } }] },
  { id: 'stove', name: 'Kerosene Stove', cat: 'Kitchen', shape: 'stove', w: 1, d: 1, stars: 1, price: 6000, color: '#5a5f66',
    acts: [{ id: 'jollof', label: 'Cook Jollof', emoji: '🍛', mins: 60, cost: 1200, fx: { hunger: 65, fun: 5 }, skill: { cooking: 25 } },
      { id: 'egg', label: 'Fry Egg & Bread', emoji: '🍳', mins: 20, cost: 500, fx: { hunger: 35 }, skill: { cooking: 10 } }] },
  { id: 'fridge', name: 'Double-Door Fridge', cat: 'Kitchen', shape: 'fridge', w: 1, d: 1, stars: 3, price: 420000, color: '#d9dde3',
    acts: [{ id: 'snack', label: 'Grab a cold snack', emoji: '🥤', mins: 10, fx: { hunger: 30, fun: 5 } }, { id: 'leftovers', label: 'Eat leftovers', emoji: '🍲', mins: 20, fx: { hunger: 55 } }] },
  { id: 'toilet', name: 'Water Closet', cat: 'Bath', shape: 'toilet', w: 1, d: 1, stars: 1, price: 15000, color: '#f2f2f2',
    acts: [{ id: 'pee', label: 'Use the toilet', emoji: '🚽', mins: 10, fx: { bladder: 100, hygiene: -3 } }] },
  { id: 'bucket', name: 'Bucket & Bowl', cat: 'Bath', shape: 'bucket', w: 1, d: 1, stars: 1, price: 1500, color: '#2f7fd0',
    acts: [{ id: 'bath', label: 'Bucket bath', emoji: '🪣', mins: 25, fx: { hygiene: 65 } }] },
  { id: 'shower', name: 'Rain Shower', cat: 'Bath', shape: 'shower', w: 1, d: 1, stars: 3, price: 250000, color: '#c9d6e3',
    acts: [{ id: 'shower', label: 'Hot shower', emoji: '🚿', mins: 15, fx: { hygiene: 90, fun: 6 } }] },
  { id: 'plastic', name: 'Plastic Chair', cat: 'Comfort', shape: 'chair', w: 1, d: 1, stars: 1, price: 500, color: '#d23b3b',
    acts: [{ id: 'sit', label: 'Sit and think', emoji: '🤔', mins: 20, fx: { energy: 4, fun: 3 } }] },
  { id: 'armchair', name: 'Lounge Armchair', cat: 'Comfort', shape: 'armchair', w: 1, d: 1, stars: 2, price: 8500, color: '#d8b24a',
    acts: [{ id: 'relax', label: 'Relax', emoji: '😌', mins: 40, fx: { energy: 10, fun: 10 } }] },
  { id: 'sofa', name: 'Velvet Sofa', cat: 'Comfort', shape: 'sofa', w: 2, d: 1, stars: 2, price: 10200, color: '#5a3f8a',
    acts: [{ id: 'lounge', label: 'Lounge', emoji: '🛋️', mins: 45, fx: { energy: 12, fun: 14 } }, { id: 'phonecall', label: 'Call a friend', emoji: '📞', mins: 30, fx: { social: 25 }, skill: { charisma: 10 } }] },
  { id: 'table', name: 'Dining Table', cat: 'Comfort', shape: 'table', w: 2, d: 2, stars: 2, price: 6600, color: '#c79b62',
    acts: [{ id: 'eatin', label: 'Eat at the table', emoji: '🍽️', mins: 25, cost: 800, fx: { hunger: 40, fun: 4 } }] },
  { id: 'fan', name: 'Standing Fan', cat: 'Comfort', shape: 'fan', w: 1, d: 1, stars: 2, price: 2200, color: '#e6e6e6',
    acts: [{ id: 'cool', label: 'Cool off', emoji: '🌬️', mins: 15, fx: { fun: 6, energy: 3 } }] },
  { id: 'tv', name: 'Flat Screen TV', cat: 'Fun', shape: 'tv', w: 2, d: 1, stars: 2, price: 85000, color: '#202227',
    acts: [{ id: 'nolly', label: 'Watch Nollywood', emoji: '🎬', mins: 90, fx: { fun: 30, energy: -4 } }, { id: 'football', label: 'Watch football', emoji: '⚽', mins: 105, fx: { fun: 35, social: 5 } }] },
  { id: 'radio', name: 'Naija Radio Set', cat: 'Fun', shape: 'radio', w: 1, d: 1, stars: 1, price: 4000, color: '#6b4a2b',
    acts: [{ id: 'listen', label: 'Listen to Naija FM', emoji: '📻', mins: 40, fx: { fun: 14 } }, { id: 'dancealone', label: 'Dance to the radio', emoji: '💃🏾', mins: 30, fx: { fun: 18, energy: -6, hygiene: -5 }, skill: { dance: 20 } }] },
  { id: 'computer', name: 'Laptop Desk', cat: 'Skills', shape: 'desk', w: 1, d: 1, stars: 2, price: 120000, color: '#8a6a4a',
    acts: [{ id: 'code', label: 'Practise coding', emoji: '💻', mins: 60, fx: { fun: -4, energy: -6 }, skill: { coding: 35 } },
      { id: 'freelance', label: 'Do a freelance gig', emoji: '🧾', mins: 120, earn: 6000, fx: { energy: -12, fun: -6 }, skill: { coding: 20 } }] },
  { id: 'guitar', name: 'Acoustic Guitar', cat: 'Skills', shape: 'guitar', w: 1, d: 1, stars: 2, price: 35000, color: '#b5762d',
    acts: [{ id: 'play', label: 'Practise guitar', emoji: '🎸', mins: 60, fx: { fun: 15 }, skill: { music: 35 } }] },
  { id: 'weights', name: 'Dumbbell Set', cat: 'Skills', shape: 'weights', w: 1, d: 1, stars: 1, price: 18000, color: '#333',
    acts: [{ id: 'lift', label: 'Lift weights', emoji: '🏋🏾', mins: 45, fx: { energy: -14, hygiene: -12, fun: 6 }, skill: { fitness: 35 } }] },
  { id: 'mirror', name: 'Standing Mirror', cat: 'Skills', shape: 'mirror', w: 1, d: 1, stars: 1, price: 9000, color: '#c4b08a',
    acts: [{ id: 'speech', label: 'Practise a speech', emoji: '🗣️', mins: 30, fx: { fun: 4 }, skill: { charisma: 30 } }, { id: 'jokes', label: 'Rehearse jokes', emoji: '😂', mins: 30, fx: { fun: 10 }, skill: { comedy: 30 } }] },
  { id: 'plant', name: 'Snake Plant', cat: 'Deco', shape: 'plant', w: 1, d: 1, stars: 1, price: 3000, color: '#3f8f45', decor: 3, acts: [] },
  { id: 'painting', name: 'Adire Painting', cat: 'Deco', shape: 'painting', w: 1, d: 1, stars: 2, price: 25000, color: '#2a4a8a', decor: 6, acts: [] },
  { id: 'rug', name: 'Aso-Oke Rug', cat: 'Deco', shape: 'rug', w: 2, d: 2, stars: 2, price: 30000, color: '#b8452d', decor: 8, acts: [] },
];

// The starter house layout (tile coords). Grid is 12×10; rooms are drawn by house.js.
export const STARTER_ITEMS = [
  { item: 'mat', x: 8, z: 1, r: 0 },
  { item: 'plastic', x: 7, z: 3, r: 0 },
  { item: 'cooler', x: 10, z: 5, r: 0 },
  { item: 'stove', x: 11, z: 5, r: 0 },
  { item: 'armchair', x: 2, z: 3, r: 0 },
  { item: 'table', x: 4, z: 5, r: 0 },
  { item: 'toilet', x: 4, z: 8, r: 0 },
  { item: 'bucket', x: 6, z: 8, r: 0 },
  { item: 'radio', x: 1, z: 6, r: 0 },
];
export const GRID = { w: 12, d: 10 };

export const PERKS = [
  { id: 'ironBelle', label: 'Iron Belle', emoji: '🍛', cost: 8, note: 'Hunger drops 25% slower.', decay: { hunger: 0.75 } },
  { id: 'steelBladder', label: 'Steel Bladder', emoji: '🚽', cost: 6, note: 'Bladder drops 30% slower.', decay: { bladder: 0.7 } },
  { id: 'earlyBird', label: 'Early Bird', emoji: '🌅', cost: 8, note: 'Energy drops 25% slower.', decay: { energy: 0.75 } },
  { id: 'neverDull', label: 'Never Dull', emoji: '🎉', cost: 8, note: 'Fun drops 25% slower.', decay: { fun: 0.75 } },
  { id: 'cleanFreak', label: 'Clean Freak', emoji: '🧼', cost: 16, note: 'Hygiene drops 25% slower.', decay: { hygiene: 0.75 } },
  { id: 'butterfly', label: 'Social Butterfly', emoji: '🦋', cost: 16, note: 'Social drops 25% slower.', decay: { social: 0.75 } },
  { id: 'hustleJuice', label: 'Hustle Juice', emoji: '🧃', cost: 12, note: '+25% work performance gain.' },
  { id: 'connected', label: 'Connected', emoji: '📇', cost: 10, note: '10% discount in Buy mode.' },
  { id: 'fastLearner', label: 'Fast Learner', emoji: '🧠', cost: 14, note: 'All skills grow 20% faster.' },
  { id: 'powerNapper', label: 'Power Napper', emoji: '💤', cost: 18, note: 'Sleep restores energy 30% faster.' },
];

// Daily missions; `match` is checked against completed actions.
export const MISSIONS = [
  { id: 'buka', label: 'Visit the buka', emoji: '🍲', match: (e) => e.place === 'amala' },
  { id: 'shift', label: 'Work a shift', emoji: '💼', match: (e) => e.kind === 'shift' },
  { id: 'cook', label: 'Cook a meal at home', emoji: '🍳', match: (e) => e.skill?.cooking },
  { id: 'gist', label: 'Gist with someone', emoji: '💬', match: (e) => e.kind === 'gist' },
  { id: 'outing', label: 'Have fun on the Island', emoji: '🏝️', match: (e) => ['quilox', 'palms', 'cruise', 'eko', 'freedom', 'mako', 'ivory', 'canopy', 'casino'].includes(e.place) },
  { id: 'skill', label: 'Practise a skill', emoji: '🧠', match: (e) => !!e.skill },
  { id: 'clean', label: 'Take a bath', emoji: '🫧', match: (e) => (e.fx?.hygiene || 0) >= 50 },
  { id: 'buy', label: 'Buy something for your house', emoji: '🛋️', match: (e) => e.kind === 'buy' },
];
