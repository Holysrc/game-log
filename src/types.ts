// Data schema (§3 CLAUDE.md). Changes are additive-only.
export type Status = "backlog" | "playing" | "done" | "dropped";

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
