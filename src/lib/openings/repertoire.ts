import {
  type OpeningLine,
  type OpeningMove,
  type OpeningTree,
  extractLines,
  findBranchPoint,
  formatMoves,
  positionAfter,
} from "./parser";

/**
 * A repertoire keeps one copy of each position, as ChessTempo's does: a line
 * that reaches a position another line reached first, by other moves (a
 * transposition), stops there. Its last move carries `joins`, the move order
 * it joins, and what comes after is learned once, in that line.
 *
 * The same moves written again (each chapter of a study starts with its own
 * 1.e4) aren't a transposition, and neither is a position coming back later
 * in the same line (a repetition): those lines go on as written.
 *
 * If a line was written on past the join, the moves after it go onto the
 * first move order instead: a line of those moves comes right after it,
 * unless a line already has them. They're the same moves in the same
 * position, so their keys, and what was learned of them, are the same.
 */
export function repertoireLines(tree: OpeningTree): OpeningLine[] {
  const lines = extractLines(tree);
  const firstPath = new Map<string, OpeningLine>();
  const out: OpeningLine[] = [];
  const cutIds = new Set<string>();

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let cut = -1;
    let join: OpeningLine = [];
    for (let i = 0; i < line.length; i++) {
      const position = positionAfter(line[i]);
      const first = firstPath.get(position);
      if (!first) {
        firstPath.set(position, line.slice(0, i + 1));
      } else if (!startsWith(line, first)) {
        cut = i;
        join = first;
        break;
      }
    }
    if (cut < 0) {
      out.push(line);
      continue;
    }
    // Lines that go on through the same move are cut the same: kept once
    const stopped = [...line.slice(0, cut), { ...line[cut], joins: join }];
    const id = stopped.map((m) => m.key).join(" ");
    if (!cutIds.has(id)) {
      cutIds.add(id);
      out.push(stopped);
    }
    const rest = line.slice(cut + 1);
    if (rest.length > 0) {
      const moved = [...join, ...rest];
      if (!lines.some((l) => startsWith(l, moved))) lines.splice(li + 1, 0, moved);
    }
  }
  return out;
}

/**
 * For a line that stops where it transposes: ⇄ and the move order it joins,
 * from where the two part ("⇄ 3.Nc3 Nf6 4.Nf3"). Otherwise empty.
 */
export function joinText(line: OpeningLine): string {
  const join = line.at(-1)?.joins;
  return join ? `⇄ ${formatMoves(join, findBranchPoint(line, join))}` : "";
}

/** Whether a line begins with these moves */
function startsWith(line: OpeningLine, start: OpeningLine): boolean {
  return line.length >= start.length && start.every((m, i) => line[i].key === m.key);
}

// === The tree, as rows of moves between branch points ===

/** One move in the tree: the same move in the same position is one, however many lines go through it */
export interface TreeNode {
  move: OpeningMove;
  /** Its place in the line: White's first move is 0 */
  ply: number;
  parent: TreeNode | null;
  children: TreeNode[];
}

/**
 * A row of the tree: the moves from one branch point to the next (or to a
 * line's end, or to where it joins another line), and the rows that branch
 * off after its last move.
 */
export interface BranchRow {
  nodes: TreeNode[];
  rows: BranchRow[];
  parent: BranchRow | null;
  /** The row's line stops here, joining this move order */
  joins?: OpeningLine;
}

export interface RepertoireTree {
  /** The first moves */
  roots: TreeNode[];
  rows: BranchRow[];
  /** The row each move is in */
  rowOf: Map<TreeNode, BranchRow>;
}

/**
 * The lines as one tree, with the same moves merged (a comment or arrows
 * written on any copy of a move are kept, the first copy's if more than one
 * has them), cut into rows at the branch points.
 */
export function branchRows(lines: OpeningLine[]): RepertoireTree {
  const roots: TreeNode[] = [];
  for (const line of lines) {
    let siblings = roots;
    let parent: TreeNode | null = null;
    line.forEach((move, ply) => {
      let node = siblings.find((n) => n.move.key === move.key);
      if (!node) {
        node = { move, ply, parent, children: [] };
        siblings.push(node);
      } else {
        const kept = node.move;
        if ((!kept.comment && move.comment) || (!kept.arrows && move.arrows) || (!kept.joins && move.joins)) {
          node.move = { ...kept, comment: kept.comment ?? move.comment, arrows: kept.arrows ?? move.arrows, joins: kept.joins ?? move.joins };
        }
      }
      parent = node;
      siblings = node.children;
    });
  }

  const rowOf = new Map<TreeNode, BranchRow>();
  function rowsFrom(starts: TreeNode[], parent: BranchRow | null): BranchRow[] {
    return starts.map((start) => {
      const nodes = [start];
      let last = start;
      while (last.children.length === 1) {
        last = last.children[0];
        nodes.push(last);
      }
      const row: BranchRow = { nodes, rows: [], parent, joins: last.move.joins };
      for (const n of nodes) rowOf.set(n, row);
      row.rows = rowsFrom(last.children, row);
      return row;
    });
  }
  return { roots, rows: rowsFrom(roots, null), rowOf };
}

/** The moves from the start up to this one */
export function lineTo(node: TreeNode): OpeningLine {
  const line: OpeningLine = [];
  for (let n: TreeNode | null = node; n; n = n.parent) line.unshift(n.move);
  return line;
}

/** The tree's moves along a line, as far as the tree has them */
export function treePath(tree: RepertoireTree, line: OpeningLine): TreeNode[] {
  const path: TreeNode[] = [];
  let siblings = tree.roots;
  for (const move of line) {
    const node = siblings.find((n) => n.move.key === move.key);
    if (!node) break;
    path.push(node);
    siblings = node.children;
  }
  return path;
}
