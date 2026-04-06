#!/usr/bin/env python3
"""
Filter Lichess puzzle database and generate TypeScript puzzle files.

Usage:
    python3 scripts/filter-lichess.py /tmp/lichess/lichess_db_puzzle.csv

Requires: pip install chess
"""

import csv
import sys
import os
import random
import chess

# Theme -> output config
CATEGORIES = {
    "mateIn1": {
        "filename": "lichess-mate1.ts",
        "export_name": "lichessMateIn1Puzzles",
        "id_prefix": "lichess-m1",
        "piece": "Q",
        "mode": "checkmate",
        "title_prefix": "Mate in 1",
        "instruction": "Find the checkmate!",
        "max_puzzles": 20,
        "max_rating": 1000,
    },
    "mateIn2": {
        "filename": "lichess-mate2.ts",
        "export_name": "lichessMateIn2Puzzles",
        "id_prefix": "lichess-m2",
        "piece": "Q",
        "mode": "checkmate",
        "title_prefix": "Mate in 2",
        "instruction": "Find the two-move checkmate!",
        "max_puzzles": 20,
        "max_rating": 1200,
    },
    "fork": {
        "filename": "lichess-forks.ts",
        "export_name": "lichessForkPuzzles",
        "id_prefix": "lichess-fork",
        "piece": "N",
        "mode": None,
        "title_prefix": "Fork",
        "instruction": "Attack two pieces at once!",
        "max_puzzles": 20,
        "max_rating": 1200,
    },
    "skewer": {
        "filename": "lichess-skewers.ts",
        "export_name": "lichessSkewerPuzzles",
        "id_prefix": "lichess-skewer",
        "piece": "R",
        "mode": None,
        "title_prefix": "Skewer",
        "instruction": "Attack through one piece to win another!",
        "max_puzzles": 20,
        "max_rating": 1200,
    },
    "capturingDefender": {
        "filename": "lichess-removing-defender.ts",
        "export_name": "lichessRemovingDefenderPuzzles",
        "id_prefix": "lichess-rtd",
        "piece": "R",
        "mode": None,
        "title_prefix": "Remove the Defender",
        "instruction": "Capture the piece that guards the target!",
        "max_puzzles": 20,
        "max_rating": 1200,
    },
    "discoveredAttack": {
        "filename": "lichess-discovered.ts",
        "export_name": "lichessDiscoveredPuzzles",
        "id_prefix": "lichess-disc",
        "piece": "N",
        "mode": None,
        "title_prefix": "Discovered Attack",
        "instruction": "Move one piece to unleash another!",
        "max_puzzles": 20,
        "max_rating": 1200,
    },
    "pin": {
        "filename": "lichess-pins.ts",
        "export_name": "lichessPinPuzzles",
        "id_prefix": "lichess-pin",
        "piece": "B",
        "mode": None,
        "title_prefix": "Pin",
        "instruction": "Pin a piece so it can't move!",
        "max_puzzles": 15,
        "max_rating": 1200,
    },
    "pawnEndgame": {
        "filename": "lichess-pawn-endings.ts",
        "export_name": "lichessPawnEndingPuzzles",
        "id_prefix": "lichess-pe",
        "piece": None,  # allow mixed K+P moves
        "mode": None,
        "title_prefix": "Pawn Ending",
        "instruction": "Find the winning plan!",
        "max_puzzles": 20,
        "max_rating": 1400,
        "pawns_only": True,  # custom flag: only kings+pawns on board
    },
}


def count_pieces(fen: str) -> int:
    """Count total pieces on the board from FEN."""
    board_part = fen.split()[0]
    return sum(1 for c in board_part if c.isalpha())


def is_pawns_only(fen: str) -> bool:
    """Check if only kings and pawns are on the board."""
    board_part = fen.split()[0]
    for c in board_part:
        if c.isalpha() and c.lower() not in ('k', 'p', '/'):
            return False
    return True


def square_to_id(sq: int) -> str:
    """Convert python-chess square int to SquareId string like 'e4'."""
    return chess.square_name(sq)


def uci_to_from_to(uci_str: str) -> tuple[str, str]:
    """Convert UCI move string like 'e2e4' to (from_sq, to_sq)."""
    move = chess.Move.from_uci(uci_str)
    return square_to_id(move.from_square), square_to_id(move.to_square)


def process_puzzle(row: dict, config: dict, idx: int) -> dict | None:
    """Convert a Lichess CSV row into a Puzzle dict, or None if invalid."""
    fen = row["FEN"]
    moves_str = row["Moves"]
    moves = moves_str.split()

    if len(moves) < 2:
        return None

    # First move is the "setup" move (opponent's last move before puzzle starts)
    setup_move = moves[0]
    puzzle_moves = moves[1:]  # Remaining: player, opponent, player, ...

    # Apply setup move to get the starting position
    try:
        board = chess.Board(fen)
        setup_uci = chess.Move.from_uci(setup_move)
        board.push(setup_uci)
        puzzle_fen = board.fen()
    except Exception:
        return None

    # Only include puzzles where white is to move (PuzzleShell only supports white)
    if not board.turn:  # False = black to move
        return None

    # Extract player move destinations (solution) and opponent responses
    # Also detect the piece type from the first player move
    solution = []
    opponent_responses = []
    player_piece_type = None

    PIECE_MAP = {
        chess.PAWN: "P", chess.KNIGHT: "N", chess.BISHOP: "B",
        chess.ROOK: "R", chess.QUEEN: "Q", chess.KING: "K",
    }

    temp_board = board.copy()
    for i, uci_str in enumerate(puzzle_moves):
        try:
            move = chess.Move.from_uci(uci_str)
            from_sq = square_to_id(move.from_square)
            to_sq = square_to_id(move.to_square)
        except Exception:
            return None

        is_player_move = (i % 2 == 0)

        if is_player_move:
            # Detect the piece being moved
            piece_at = temp_board.piece_at(move.from_square)
            if piece_at is None:
                return None
            piece_letter = PIECE_MAP.get(piece_at.piece_type)
            if piece_letter is None:
                return None

            if config["piece"] is not None:
                if player_piece_type is None:
                    player_piece_type = piece_letter
                elif piece_letter != player_piece_type:
                    # Different piece types across player moves — skip this puzzle
                    return None
            else:
                player_piece_type = player_piece_type or piece_letter

            solution.append(to_sq)
        else:
            opponent_responses.append({"from": from_sq, "to": to_sq})

        try:
            temp_board.push(move)
        except Exception:
            return None

    if not solution or not player_piece_type:
        return None

    # Skip puzzles with ambiguous first moves (multiple mates or equivalent wins)
    first_move_uci = puzzle_moves[0]
    first_move = chess.Move.from_uci(first_move_uci)
    mate_count = 0
    for legal in board.legal_moves:
        board.push(legal)
        if board.is_checkmate():
            mate_count += 1
        board.pop()
    if mate_count > 1:
        return None

    # Generate PGN from moves
    pgn_board = board.copy()
    pgn_parts = []
    move_num = 1
    for i, uci_str in enumerate(puzzle_moves):
        move = chess.Move.from_uci(uci_str)
        san = pgn_board.san(move)
        is_player = (i % 2 == 0)
        if is_player:
            pgn_parts.append(f"{move_num}. {san}")
        else:
            pgn_parts.append(san)
            move_num += 1
        pgn_board.push(move)

    pgn = " ".join(pgn_parts)
    white_move_count = len(solution)

    # Build the puzzle object
    puzzle_id = f'{config["id_prefix"]}-{idx + 1:02d}'
    title = f'{config["title_prefix"]} #{idx + 1}'

    puzzle = {
        "id": puzzle_id,
        "title": title,
        "instruction": config["instruction"],
        "fen": puzzle_fen,
        "pgn": pgn,
        "starThresholds": {
            "three": white_move_count,
            "two": white_move_count + 1,
            "one": white_move_count + 2,
        },
    }

    # Stash rating for post-sort (removed before output)
    puzzle["_rating"] = int(row["Rating"])

    return puzzle


def generate_typescript(puzzles: list[dict], config: dict) -> str:
    """Generate TypeScript file content from puzzle list."""
    lines = []
    lines.append('import type { TacticPuzzle } from "./types";')
    lines.append("")
    lines.append(f"export const {config['export_name']}: TacticPuzzle[] = [")

    for p in puzzles:
        lines.append("  {")
        lines.append(f'    type: "puzzle",')
        lines.append(f'    id: "{p["id"]}",')
        lines.append(f'    title: "{p["title"]}",')
        lines.append(f'    instruction: "{p["instruction"]}",')
        lines.append(f'    fen: "{p["fen"]}",')
        lines.append(f'    pgn: "{p["pgn"]}",')

        st = p["starThresholds"]
        lines.append(f'    starThresholds: {{ three: {st["three"]}, two: {st["two"]}, one: {st["one"]} }},')

        lines.append("  },")

    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 filter-lichess.py <path-to-lichess-csv>")
        sys.exit(1)

    csv_path = sys.argv[1]
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "lib", "puzzles")

    # Collect candidates per category
    candidates: dict[str, list] = {theme: [] for theme in CATEGORIES}

    print(f"Reading {csv_path}...")
    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        row_count = 0
        for row in reader:
            row_count += 1
            if row_count % 500000 == 0:
                print(f"  Processed {row_count} rows...")

            rating = int(row["Rating"])
            themes = row["Themes"].split()
            popularity = int(row["Popularity"])
            fen = row["FEN"]
            piece_count = count_pieces(fen)

            # Skip unpopular puzzles
            if popularity < 80:
                continue

            for theme, config in CATEGORIES.items():
                if theme not in themes:
                    continue
                if rating > config["max_rating"]:
                    continue
                if config.get("pawns_only") and not is_pawns_only(fen):
                    continue

                candidates[theme].append({
                    "row": row,
                    "rating": rating,
                    "piece_count": piece_count,
                    "popularity": popularity,
                })

    print(f"Total rows processed: {row_count}")

    # Process each category
    for theme, config in CATEGORIES.items():
        cands = candidates[theme]
        print(f"\n{theme}: {len(cands)} candidates (rating <= {config['max_rating']})")

        if not cands:
            print(f"  WARNING: No candidates found for {theme}!")
            continue

        # Variety: sort by popularity (most-played = best vetted), then sample
        # evenly across the pool to avoid clustering on one pattern.
        cands.sort(key=lambda x: -x["popularity"])

        # Keep top candidates by popularity, then shuffle for variety
        pool = cands[:config["max_puzzles"] * 40]
        random.seed(42)  # deterministic for reproducibility
        random.shuffle(pool)

        # Convert to puzzles
        puzzles = []
        for cand in pool:
            if len(puzzles) >= config["max_puzzles"]:
                break
            puzzle = process_puzzle(cand["row"], config, len(puzzles))
            if puzzle:
                puzzles.append(puzzle)

        # Sort final selection by rating (easiest first)
        puzzles.sort(key=lambda p: p.get("_rating", 0))
        # Re-number IDs after sorting
        for i, p in enumerate(puzzles):
            p["id"] = f'{config["id_prefix"]}-{i + 1:02d}'
            p["title"] = f'{config["title_prefix"]} #{i + 1}'
            p.pop("_rating", None)

        print(f"  Generated {len(puzzles)} puzzles")

        if puzzles:
            ts_content = generate_typescript(puzzles, config)
            output_path = os.path.join(output_dir, config["filename"])
            with open(output_path, "w") as f:
                f.write(ts_content)
            print(f"  Written to {output_path}")

    print("\nDone!")


if __name__ == "__main__":
    main()
