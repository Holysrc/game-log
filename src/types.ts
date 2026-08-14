// Data schema (§3 CLAUDE.md). Changes are additive-only.
// "onhold" добавлен аддитивно: старые файлы без него читаются как раньше
export type Status = "backlog" | "playing" | "done" | "dropped" | "onhold";

export interface Game {
  id: number;
  name: string;
  status: Status;
  years: number[]; // 0 = «Давно»
  counts?: Record<number, number>;
  rating?: number | null;
  cs?: number | null;
  platform?: string | null;
  source?: string | null;
  genres?: string | null;
  rel?: number | null;
  time?: number | null; // seconds
  series?: string | null;
  note?: string | null;
  fav?: boolean;
  // legacy fields migrated away:
  year?: number;
  oldCount?: number;
}

export interface State {
  nextId: number;
  updatedAt?: number;
  games: Game[];
  collapsed: Record<string, boolean>;
  noMerge?: string[];
}
