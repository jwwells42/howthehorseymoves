// Client for the public Lichess opening explorer API (explorer.lichess.ovh).
//
// This is the ONLY external network call in the app. It is used exclusively by
// The Probabilitizer (an off-nav tool). No student/app data is sent — only chess
// positions, encoded as a list of UCI moves from the standard starting position.
//
// The probability method (walking a line and multiplying per-move conditional
// probabilities, split by mover) is from EikaMikiku's Opening-Explorer-Plus:
// https://github.com/EikaMikiku/Opening-Explorer-Plus

export interface ExplorerMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
}

export interface ExplorerData {
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMove[];
}

export type ExplorerDb = "masters" | "lichess";

export interface ExplorerSettings {
  db: ExplorerDb;
  ratings: number[]; // Lichess DB only
  speeds: string[]; // Lichess DB only
}

export const RATING_BUCKETS = [1600, 1800, 2000, 2200, 2500];
export const SPEEDS = ["bullet", "blitz", "rapid", "classical"];

/**
 * Query the Lichess explorer for the position reached by playing `playUci`
 * (UCI moves, e.g. ["e2e4", "e7e5"]) from the standard start position.
 */
export async function fetchExplorer(
  playUci: string[],
  settings: ExplorerSettings,
  signal?: AbortSignal,
): Promise<ExplorerData> {
  const base = settings.db === "lichess" ? "lichess" : "masters";
  const params = new URLSearchParams({
    variant: "standard",
    moves: "20",
  });
  if (playUci.length > 0) params.set("play", playUci.join(","));
  if (settings.db === "lichess") {
    if (settings.ratings.length > 0) params.set("ratings", settings.ratings.join(","));
    if (settings.speeds.length > 0) params.set("speeds", settings.speeds.join(","));
  }

  const url = `https://explorer.lichess.ovh/${base}?${params.toString()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(
      res.status === 429
        ? "Lichess is rate-limiting requests — wait a moment and try again."
        : `Lichess explorer error (${res.status}).`,
    );
  }
  const data = (await res.json()) as ExplorerData;
  return {
    white: data.white ?? 0,
    draws: data.draws ?? 0,
    black: data.black ?? 0,
    moves: Array.isArray(data.moves) ? data.moves : [],
  };
}
