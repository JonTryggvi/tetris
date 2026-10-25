import { SHAPES, COLORS, type Rotation } from './constants';

// A positioned tetromino. `shape` is a square matrix of colour indices; (x, y)
// is the top-left of that matrix on the board grid.
export class Piece {
  typeId: number;
  shape: number[][];
  color: string;
  x: number;
  y: number;

  constructor(typeId: number = Piece.randomType()) {
    this.typeId = typeId;
    this.shape = SHAPES[typeId].map((row) => [...row]);
    this.color = COLORS[typeId];
    // Spawn roughly centred; O is one column narrower so nudge it right.
    this.x = typeId === 4 ? 4 : 3;
    this.y = 0;
  }

  static randomType(): number {
    // Types 1..7 (0 is the empty placeholder).
    return Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
  }

  // A deep copy with the shape rotated; the board validates before committing.
  rotated(direction: Rotation): Piece {
    const p = this.clone();
    const n = p.shape.length;
    // Transpose.
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < y; x++) {
        [p.shape[x][y], p.shape[y][x]] = [p.shape[y][x], p.shape[x][y]];
      }
    }
    // Reverse rows (right) or the row order (left) to turn the transpose into a
    // rotation.
    if (direction === 'right') {
      p.shape.forEach((row) => row.reverse());
    } else {
      p.shape.reverse();
    }
    return p;
  }

  clone(): Piece {
    const p = new Piece(this.typeId);
    p.shape = this.shape.map((row) => [...row]);
    p.x = this.x;
    p.y = this.y;
    return p;
  }

  // Iterate the filled cells in board coordinates.
  eachCell(fn: (x: number, y: number, value: number) => void): void {
    this.shape.forEach((row, dy) => {
      row.forEach((value, dx) => {
        if (value > 0) fn(this.x + dx, this.y + dy, value);
      });
    });
  }
}
