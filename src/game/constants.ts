// Core Tetris constants. Shapes and scoring are ported from the 2023 game;
// colours are remapped onto the jontryggvi.is brand palette.

export const COLS = 10;
export const ROWS = 20;
export const LINES_PER_LEVEL = 10;

// Index 0 is "empty". Indices 1..7 are the seven tetromino types, coloured from
// the brand palette (design call: the board only defined 5 brand colours, so Z
// and T get in-family tints that stay distinct on the deep-basalt board).
export const COLORS = [
  'transparent',
  '#7cc8d1', // 1 I  — photography teal
  '#a68bd6', // 2 J  — music violet
  '#f4b04a', // 3 L  — sun
  '#f3f1ee', // 4 O  — snow
  '#f0746a', // 5 S  — web coral
  '#9ad0a4', // 6 T  — soft green (in family with teal)
  '#d58fb3', // 7 Z  — rose (between coral and violet)
] as const;

// Each tetromino as a square matrix of colour indices. Rotation transposes +
// reverses the matrix, so the matrix must be square.
export const SHAPES: number[][][] = [
  [],
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // J
  [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // L
  [[4, 4], [4, 4]],                                          // O
  [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
  [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
  [[7, 7, 0], [0, 7, 7], [0, 0, 0]],                         // Z
];

export const POINTS = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  SOFT_DROP: 1,
  HARD_DROP: 2,
} as const;

// Per-level gravity interval in ms (lower = faster). Clamped past the top entry.
export const LEVEL: Record<number, number> = {
  0: 800, 1: 720, 2: 630, 3: 550, 4: 470, 5: 380, 6: 300, 7: 220,
  8: 130, 9: 100, 10: 80, 11: 80, 12: 80, 13: 70, 14: 70, 15: 70,
  16: 50, 17: 50, 18: 50, 19: 30, 20: 30,
};

export function levelSpeed(level: number): number {
  return LEVEL[level] ?? 30;
}

export type Rotation = 'left' | 'right';

// Logical move names, mapped from keyboard keys in the engine.
export type Action = 'left' | 'right' | 'down' | 'drop' | 'rotateR' | 'rotateL';

export const KEY_MAP: Record<string, Action> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowUp: 'rotateR',
  ' ': 'drop',
  q: 'rotateL',
  Q: 'rotateL',
};
