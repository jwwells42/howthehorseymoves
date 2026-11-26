export interface ModelGame {
  id: string;
  white: string;
  black: string;
  event: string;
  year: number;
  result: string;
  pgn: string;
  /** Games from one PGN file in pgn/ (a match, a study): their own section on /games */
  collection?: string;
  /** Its round in the match, from the PGN's [Round] */
  round?: string;
}
