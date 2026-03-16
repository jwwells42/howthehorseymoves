"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";
const GAME_DURATION = 30;

type PieceColor = "w" | "b";
type PieceKind = "K" | "Q" | "R" | "B" | "N" | "P";
type QuestionType = "white" | "black" | "total" | "pawns" | "knights" | "bishops" | "rooks";

const QUESTION_LABELS: Record<QuestionType, string> = {
  white: "White pieces?",
  black: "Black pieces?",
  total: "Total pieces?",
  pawns: "How many pawns?",
  knights: "How many knights?",
  bishops: "How many bishops?",
  rooks: "How many rooks?",
};

interface PiecePlacement {
  piece: PieceKind;
  color: PieceColor;
  square: string;
}

const PIECE_POOL: { piece: PieceKind; color: PieceColor }[] = [
  { piece: "Q", color: "w" }, { piece: "R", color: "w" }, { piece: "R", color: "w" },
  { piece: "B", color: "w" }, { piece: "B", color: "w" }, { piece: "N", color: "w" },
  { piece: "N", color: "w" }, { piece: "P", color: "w" }, { piece: "P", color: "w" },
  { piece: "P", color: "w" },
  { piece: "Q", color: "b" }, { piece: "R", color: "b" }, { piece: "R", color: "b" },
  { piece: "B", color: "b" }, { piece: "B", color: "b" }, { piece: "N", color: "b" },
  { piece: "N", color: "b" }, { piece: "P", color: "b" }, { piece: "P", color: "b" },
  { piece: "P", color: "b" },
];

function randomSquare(): string {
  const f = Math.floor(Math.random() * 8);
  const r = Math.floor(Math.random() * 8);
  return String.fromCharCode(97 + f) + (r + 1);
}

function generatePosition(): PiecePlacement[] {
  const numPieces = Math.floor(Math.random() * 8) + 5; // 5-12 pieces
  const usedSquares = new Set<string>();
  const placements: PiecePlacement[] = [];

  // Always include both kings
  let sq: string;
  do { sq = randomSquare(); } while (usedSquares.has(sq));
  usedSquares.add(sq);
  placements.push({ piece: "K", color: "w", square: sq });

  do { sq = randomSquare(); } while (usedSquares.has(sq));
  usedSquares.add(sq);
  placements.push({ piece: "K", color: "b", square: sq });

  for (let i = 2; i < numPieces; i++) {
    do { sq = randomSquare(); } while (usedSquares.has(sq));
    usedSquares.add(sq);
    const p = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
    placements.push({ ...p, square: sq });
  }

  return placements;
}

function getAnswer(position: PiecePlacement[], qType: QuestionType): number {
  switch (qType) {
    case "white": return position.filter((p) => p.color === "w").length;
    case "black": return position.filter((p) => p.color === "b").length;
    case "total": return position.length;
    case "pawns": return position.filter((p) => p.piece === "P").length;
    case "knights": return position.filter((p) => p.piece === "N").length;
    case "bishops": return position.filter((p) => p.piece === "B").length;
    case "rooks": return position.filter((p) => p.piece === "R").length;
  }
}

const Q_TYPES: QuestionType[] = ["white", "black", "total", "pawns", "knights", "bishops", "rooks"];

interface Challenge {
  position: PiecePlacement[];
  questionType: QuestionType;
  answer: number;
}

function generateChallenge(): Challenge {
  const position = generatePosition();
  const qType = Q_TYPES[Math.floor(Math.random() * Q_TYPES.length)];
  return { position, questionType: qType, answer: getAnswer(position, qType) };
}

interface Attempt {
  position: PiecePlacement[];
  questionType: QuestionType;
  answer: number;
  playerAnswer: number;
  correct: boolean;
}

function getStars(score: number): number {
  if (score >= 8) return 3;
  if (score >= 5) return 2;
  if (score >= 3) return 1;
  return 0;
}

function sqToCoords(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
}

function MiniBoard({ position }: { position: PiecePlacement[] }) {
  const S = 10;
  const B = S * 8;
  return (
    <svg viewBox={`0 0 ${B} ${B}`} className="w-20 h-20">
      {Array.from({ length: 8 }, (_, ri) =>
        Array.from({ length: 8 }, (_, fi) => (
          <rect key={`${fi}-${ri}`} x={fi * S} y={ri * S} width={S} height={S}
            fill={(fi + ri) % 2 === 0 ? LIGHT : DARK} />
        ))
      )}
      {position.map((p, i) => {
        const [f, r] = sqToCoords(p.square);
        return (
          <image key={i} href={`/pieces/${p.color}${p.piece}.svg`}
            x={f * S + S * 0.1} y={r * S + S * 0.1} width={S * 0.8} height={S * 0.8} />
        );
      })}
    </svg>
  );
}

type Phase = "idle" | "flash" | "answer" | "done";

export default function PieceCount() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [challenge, setChallenge] = useState<Challenge>(generateChallenge);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [bestStars, setBestStars] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const FLASH_TIME = 3000;

  useEffect(() => {
    setBestScore(parseInt(localStorage.getItem("blindfold-piececount-best") ?? "0", 10));
    setBestStars(parseInt(localStorage.getItem("blindfold-piececount-best-stars") ?? "0", 10));
  }, []);

  useEffect(() => {
    if (phase !== "answer") return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setPhase("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === "answer") inputRef.current?.focus();
  }, [phase, challenge]);

  useEffect(() => {
    if (phase !== "done") return;
    const stars = getStars(score);
    if (score > bestScore) {
      localStorage.setItem("blindfold-piececount-best", String(score));
      setBestScore(score);
    }
    if (stars > bestStars) {
      localStorage.setItem("blindfold-piececount-best-stars", String(stars));
      setBestStars(stars);
    }
  }, [phase, score, bestScore, bestStars]);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  const showNextChallenge = useCallback(() => {
    const ch = generateChallenge();
    setChallenge(ch);
    setPhase("flash");
    showTimerRef.current = setTimeout(() => {
      setPhase("answer");
    }, FLASH_TIME);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setHistory([]);
    setFlash(null);
    showNextChallenge();
  }, [showNextChallenge]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (phase !== "answer") return;
      const answer = parseInt(input.trim());
      if (isNaN(answer)) return;
      if (flashTimeout.current) clearTimeout(flashTimeout.current);

      const correct = answer === challenge.answer;
      setHistory((h) => [...h, {
        position: challenge.position,
        questionType: challenge.questionType,
        answer: challenge.answer,
        playerAnswer: answer,
        correct,
      }]);

      if (correct) {
        setScore((s) => s + 1);
        setFlash("correct");
      } else {
        setFlash("wrong");
      }
      setInput("");
      flashTimeout.current = setTimeout(() => setFlash(null), 200);
      showNextChallenge();
    },
    [phase, input, challenge, showNextChallenge],
  );

  const stars = getStars(score);
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-orange-400" : "bg-green-500";

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Piece Count</h2>
        <p className="text-muted">
          A position flashes for 3 seconds, then a question appears. Count the pieces! You have 30 seconds total.
        </p>
        {bestScore > 0 && (
          <div className="text-sm text-faint">
            Best: {bestScore} {bestStars > 0 && <StarRating stars={bestStars} size="sm" />}
          </div>
        )}
        <button
          onClick={startGame}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
        >
          Start
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const wrongOnes = history.filter((a) => !a.correct);

    return (
      <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto text-center">
        <h2 className="text-xl font-bold">Time&apos;s up!</h2>
        <p className="text-3xl font-bold">{score}/{history.length} correct</p>
        {stars > 0 && <StarRating stars={stars} size="lg" />}
        {bestScore > 0 && (
          <p className="text-sm text-faint">Personal best: {bestScore}</p>
        )}
        <button
          onClick={startGame}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
        >
          Play Again
        </button>

        {wrongOnes.length > 0 && (
          <div className="w-full border-t border-foreground/10 mt-2 pt-4">
            <h3 className="font-bold text-sm mb-3">Mistakes ({wrongOnes.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 justify-items-center">
              {wrongOnes.map((a, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <MiniBoard position={a.position} />
                  <div className="text-xs text-center">
                    <span className="text-faint">{QUESTION_LABELS[a.questionType]}</span>
                    <br />
                    <span className="text-red-400">{a.answer}</span>
                    <span className="text-faint"> (you: {a.playerAnswer})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "flash") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
          <div className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }} />
        </div>
        <div className="flex justify-between w-full text-sm text-faint">
          <span>Score: {score}</span>
          <span>{timeLeft}s</span>
        </div>
        <div className="text-sm text-muted animate-pulse">Memorize...</div>
        <svg viewBox="0 0 320 320" className="w-full max-w-[280px] sm:max-w-[320px]">
          {Array.from({ length: 8 }, (_, ri) =>
            Array.from({ length: 8 }, (_, fi) => (
              <rect key={`${fi}-${ri}`} x={fi * 40} y={ri * 40} width={40} height={40}
                fill={(fi + ri) % 2 === 0 ? LIGHT : DARK} />
            ))
          )}
          {challenge.position.map((p, i) => {
            const [f, r] = sqToCoords(p.square);
            return (
              <image key={i} href={`/pieces/${p.color}${p.piece}.svg`}
                x={f * 40 + 4} y={r * 40 + 4} width={32} height={32} />
            );
          })}
        </svg>
      </div>
    );
  }

  // answer phase
  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
        <div className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
          style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }} />
      </div>
      <div className="flex justify-between w-full text-sm text-faint">
        <span>Score: {score}</span>
        <span>{timeLeft}s</span>
      </div>

      <div
        className={`text-2xl font-bold py-4 transition-colors duration-100 ${
          flash === "correct" ? "text-green-400" : flash === "wrong" ? "text-red-400" : ""
        }`}
      >
        {QUESTION_LABELS[challenge.questionType]}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-[200px]">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="#"
          maxLength={2}
          className="flex-1 px-4 py-2 rounded-lg border border-card-border bg-card text-foreground font-mono text-2xl text-center focus:outline-none focus:border-foreground/40"
          autoComplete="off"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Go
        </button>
      </form>
    </div>
  );
}
