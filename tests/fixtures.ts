// Seeded fixture generator: realistic game-log state for tests.
// Never uses real user data. Deterministic for a given seed.

export interface Game {
  id: number;
  name: string;
  status: "backlog" | "playing" | "done" | "dropped";
  years: number[];
  counts?: Record<number, number>;
  rating?: number | null;
  cs?: number | null;
  platform?: string | null;
  source?: string | null;
  genres?: string | null;
  rel?: number | null;
  time?: number | null;
  series?: string | null;
  note?: string | null;
  fav?: boolean;
}

export interface State {
  nextId: number;
  updatedAt?: number;
  games: Game[];
  collapsed: Record<string, boolean>;
  noMerge?: string[];
}

// mulberry32 — small seeded PRNG
export function prng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJ = ["Dark", "Lost", "Eternal", "Crimson", "Silent", "Broken", "Iron", "Golden",
  "Hollow", "Distant", "Burning", "Frozen", "Savage", "Hidden", "Ancient", "Neon",
  "Rusty", "Shattered", "Grim", "Radiant", "Wild", "Forgotten", "Astral", "Cursed"];
const NOUN = ["Kingdom", "Odyssey", "Legacy", "Chronicle", "Requiem", "Frontier", "Depths",
  "Citadel", "Horizon", "Protocol", "Sanctum", "Voyage", "Bastion", "Echoes", "Dominion",
  "Ascent", "Covenant", "Paradox", "Reverie", "Exodus", "Gambit", "Tempest", "Warden", "Rift"];
const GENRES = ["RPG", "Action", "Adventure", "Strategy", "Shooter", "Platformer",
  "Metroidvania", "Roguelike", "Puzzle", "Horror", "Racing", "Simulation", "Souls-like", "JRPG"];
const PLATFORMS = ["PC", "PS5", "PS4", "PS3", "PS2", "Switch", "Xbox Series", "Xbox 360",
  "GBA", "SNES", "Steam Deck", "Android"];
const SOURCES = ["Steam", "GOG", "Epic", "Xbox", "Battle.net", "Эмулятор", "Диск"];
const SERIES = ["Final Fantasy", "Dark Souls", "The Elder Scrolls", "Metal Gear",
  "Resident Evil", "Zelda", "Persona", "Yakuza", "Halo", "Gran Turismo",
  "Silent Hill", "Mass Effect", "Gothic", "Hitman"];
const NOTES = [
  "Остановился на втором боссе, вернуться после DLC",
  "Great soundtrack, replay on hard mode",
  "Дропнул на середине — затянуто, но мир красивый",
  "Co-op with Max, finish act 3",
  "Пройти все концовки",
  "Ждёт патча производительности"
];

export function makeState(count = 1500, seed = 20260809): State {
  const r = prng(seed);
  const pick = <T>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const chance = (p: number) => r() < p;
  const games: Game[] = [];
  const used = new Set<string>();
  let id = 1;

  // series clusters: numbered entries, always Playnite-scored
  for (const ser of SERIES) {
    const n = 3 + Math.floor(r() * 6); // 3..8 entries
    for (let i = 1; i <= n && games.length < count; i++) {
      const name = i === 1 ? ser : `${ser} ${i}`;
      if (used.has(name)) continue;
      used.add(name);
      games.push(finishGame(r, chance, pick, { id: id++, name, series: ser }));
    }
  }
  // standalone games
  while (games.length < count) {
    let name = `${pick(ADJ)} ${pick(NOUN)}`;
    if (used.has(name)) {
      name = `${name} ${2 + Math.floor(r() * 8)}`;
      if (used.has(name)) continue;
    }
    used.add(name);
    games.push(finishGame(r, chance, pick, { id: id++, name, series: null }));
  }

  return {
    nextId: id,
    updatedAt: 1754700000000, // fixed past timestamp
    games,
    collapsed: {},
    noMerge: []
  };
}

function finishGame(
  r: () => number,
  chance: (p: number) => boolean,
  pick: <T>(arr: T[]) => T,
  base: Pick<Game, "id" | "name" | "series">
): Game {
  const roll = r();
  const status: Game["status"] =
    roll < 0.52 ? "backlog" : roll < 0.82 ? "done" : roll < 0.92 ? "dropped" : "playing";
  const years: number[] = [];
  const counts: Record<number, number> = {};
  if (status === "done" || (status !== "backlog" && chance(0.25))) {
    const n = chance(0.15) ? 2 : 1;
    for (let i = 0; i < n; i++) {
      // 0 = «Давно», otherwise 2004..2026 skewed to recent years
      const y = chance(0.3) ? 0 : 2026 - Math.floor(Math.pow(r(), 2) * 22);
      if (!years.includes(y)) years.push(y);
      if (chance(0.12)) counts[y] = 2 + Math.floor(r() * 3);
    }
    years.sort((a, b) => a - b);
  }
  const hasLib = chance(0.75); // in Playnite library
  const rel = chance(0.9) ? 1994 + Math.floor(r() * 32) : null;
  const g: Game = {
    ...base,
    status,
    years,
    rating: years.length || status === "dropped" ? (chance(0.7) ? 1 + Math.floor(r() * 5) : null) : null,
    cs: hasLib && chance(0.8) ? 40 + Math.floor(r() * 60) : null,
    platform: chance(0.85) ? pick(PLATFORMS) : null,
    source: hasLib ? pick(SOURCES) : null,
    genres: chance(0.85) ? [pick(GENRES), pick(GENRES)].filter((v, i, a) => a.indexOf(v) === i).join(", ") : null,
    rel,
    time: hasLib && chance(0.6) ? Math.floor(r() * 120 * 3600) : 0,
    note: chance(0.12) ? pick(NOTES) : null,
    fav: chance(0.06) || undefined
  };
  if (Object.keys(counts).length) g.counts = counts;
  return g;
}

// Small handcrafted state for precise interaction tests
export function tinyState(): State {
  const games: Game[] = [
    { id: 1, name: "Alpha Quest", status: "playing", years: [], platform: "PC", source: "Steam", genres: "RPG, Action", rel: 2020, time: 7200, cs: 85, series: null, rating: null, note: null },
    { id: 2, name: "Beta Blade", status: "backlog", years: [], platform: "PS5", source: "Диск", genres: "Action", rel: 2018, time: 0, cs: 62, series: null, rating: null, note: null },
    { id: 3, name: "Gamma Grove", status: "backlog", years: [], platform: null, source: null, genres: null, rel: null, time: 0, cs: null, series: null, rating: null, note: null },
    { id: 4, name: "Delta Drift", status: "done", years: [2024], platform: "Switch", source: "Steam", genres: "Racing", rel: 2015, time: 36000, cs: 91, series: null, rating: 4, note: "Отличная!", fav: true },
    { id: 5, name: "Epsilon Echo", status: "done", years: [0, 2023], counts: { 0: 3 }, platform: "PC", source: "GOG", genres: "Horror", rel: 2001, time: 18000, cs: 55, series: null, rating: 5, note: null },
    { id: 6, name: "Zeta Zephyr", status: "dropped", years: [], platform: "PC", source: "Epic", genres: "Shooter", rel: 2019, time: 3600, cs: 45, series: null, rating: 2, note: null },
    { id: 7, name: "Final Fantasy VII", status: "done", years: [1998], counts: {}, platform: "PS1", source: "Диск", genres: "JRPG", rel: 1997, time: 144000, cs: 95, series: "Final Fantasy", rating: 5, note: null },
    { id: 8, name: "Final Fantasy VIII", status: "backlog", years: [], platform: "PS1", source: "Диск", genres: "JRPG", rel: 1999, time: 0, cs: 88, series: "Final Fantasy", rating: null, note: null },
    { id: 9, name: "Skyrim", status: "done", years: [2012], platform: "PC", source: "Steam", genres: "RPG", rel: 2011, time: 360000, cs: 94, series: null, rating: 5, note: null },
    { id: 10, name: "Skyrim Special Edition", status: "backlog", years: [], platform: "PC", source: "Steam", genres: "RPG", rel: 2016, time: 0, cs: 90, series: null, rating: null, note: null },
    { id: 11, name: "Dark Souls", status: "done", years: [2015], platform: "PC", source: "Steam", genres: "Souls-like", rel: 2011, time: 90000, cs: 92, series: "Souls", rating: 5, note: null },
    { id: 12, name: "Dark Souls 2", status: "backlog", years: [], platform: "PC", source: "Steam", genres: "Souls-like", rel: 2014, time: 0, cs: 80, series: "Souls", rating: null, note: null }
  ];
  return { nextId: 13, updatedAt: 1754700000000, games, collapsed: {}, noMerge: [] };
}
