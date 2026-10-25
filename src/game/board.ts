import { COLS, ROWS, type Rotation } from './constants';
import { Piece } from './piece';

export interface StepResult {
  moved: boolean;       // the active piece descended one row
  locked: boolean;      // the active piece settled this step
  linesCleared: number; // rows cleared on lock
  gameOver: boolean;    // a fresh piece spawned into an occupied cell
}

// The playfield: a COLS×ROWS grid of colour indices (0 = empty) plus the active
// and next pieces. Pure game state — no rendering, no scoring.
export class Board {
  grid: number[][] = [];
  current!: Piece;
  next!: Piece;

  reset(): void {
    this.grid = Board.emptyGrid();
    this.current = new Piece();
    this.next = new Piece();
  }

  static emptyGrid(): number[][] {
    return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  }

  // A piece is valid if every filled cell is inside the walls, above the floor,
  // and on an empty grid cell.
  valid(piece: Piece): boolean {
    return piece.shape.every((row, dy) =>
      row.every((value, dx) => {
        if (value === 0) return true;
        const x = piece.x + dx;
        const y = piece.y + dy;
        return (
          x >= 0 && x < COLS &&
          y < ROWS &&
          (y < 0 || this.grid[y][x] === 0)
        );
      })
    );
  }

  move(dx: number, dy: number): boolean {
    const p = this.current.clone();
    p.x += dx;
    p.y += dy;
    if (!this.valid(p)) return false;
    this.current = p;
    return true;
  }

  rotate(direction: Rotation): boolean {
    const p = this.current.rotated(direction);
    // Simple wall kick: try in place, then nudge left/right by up to 2.
    for (const kick of [0, -1, 1, -2, 2]) {
      const k = p.clone();
      k.x += kick;
      if (this.valid(k)) {
        this.current = k;
        return true;
      }
    }
    return false;
  }

  // Rows the active piece can descend before colliding (for hard drop + ghost).
  dropDistance(): number {
    let d = 0;
    const p = this.current.clone();
    for (;;) {
      p.y += 1;
      if (!this.valid(p)) break;
      d += 1;
    }
    return d;
  }

  // One gravity tick. If the piece can fall it does; otherwise it locks, lines
  // clear, and the next piece spawns (which may end the game).
  step(): StepResult {
    if (this.move(0, 1)) {
      return { moved: true, locked: false, linesCleared: 0, gameOver: false };
    }
    this.freeze();
    const linesCleared = this.clearLines();
    this.current = this.next;
    this.next = new Piece();
    const gameOver = !this.valid(this.current);
    return { moved: false, locked: true, linesCleared, gameOver };
  }

  // Stamp the active piece into the grid.
  private freeze(): void {
    this.current.eachCell((x, y, value) => {
      if (y >= 0) this.grid[y][x] = value;
    });
  }

  // Remove full rows, dropping everything above. Returns how many cleared.
  private clearLines(): number {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; ) {
      if (this.grid[y].every((v) => v > 0)) {
        this.grid.splice(y, 1);
        this.grid.unshift(Array<number>(COLS).fill(0));
        cleared += 1;
        // Don't decrement y: the row that fell into this slot must be re-checked.
      } else {
        y -= 1;
      }
    }
    return cleared;
  }
}
