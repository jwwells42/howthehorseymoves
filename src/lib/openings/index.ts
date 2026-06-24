// Barrel for the openings module.
// - parser.ts   — types + PGN-variation parser / line extraction / NAG display
// - openings-data.ts — the OPENINGS repertoire data + getOpening() lookup
// Consumers import from "$lib/openings" and shouldn't need to know the split.
export * from "./parser";
export * from "./openings-data";
