import { COLS, ROWS, POINTS, LINES_PER_LEVEL, levelSpeed, COLORS, type Action } from './constants';
import { Board } from './board';

export interface Stats {
  score: number;
  lines: number;
  level: number;
}

export interface GameSummary extends Stats {
  durationS: number;
}

export interface EngineHooks {
  onStats: (stats: Stats) => void;
  onGameOver: (summary: GameSummary) => void;
  onRunningChange: (running: boolean) => void;
}

type Status = 'idle' | 'playing' | 'paused' | 'over';

// Owns the game loop, scoring, input handling and board rendering. The board
// cells and next-preview cells are plain <div>s the engine composites into.
export class Engine {
  private board = new Board();
  private status: Status = 'idle';
  private score = 0;
  private lines = 0;
  private level = 0;

  private rafId = 0;
  private lastTime = 0;
  private dropCounter = 0;
  private startTime = 0;

  // Diff buffer so we only touch cells whose colour changed.
  private rendered: string[] = new Array(COLS * ROWS).fill('');

  constructor(
    private cells: HTMLElement[],
    private nextCells: HTMLElement[],
    private hooks: EngineHooks,
  ) {}

  get isPlaying(): boolean {
    return this.status === 'playing';
  }
  get isPaused(): boolean {
    return this.status === 'paused';
  }

  start(): void {
    this.board.reset();
    this.score = 0;
    this.lines = 0;
    this.level = 0;
    this.dropCounter = 0;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.setStatus('playing');
    this.emitStats();
    this.renderNext();
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.loop);
  }

  togglePause(): void {
    if (this.status === 'playing') {
      this.setStatus('paused');
      cancelAnimationFrame(this.rafId);
    } else if (this.status === 'paused') {
      this.setStatus('playing');
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.setStatus('idle');
  }

  handle(action: Action): void {
    if (this.status !== 'playing') return;
    if (action === 'left') this.board.move(-1, 0);
    else if (action === 'right') this.board.move(1, 0);
    else if (action === 'rotateR') this.board.rotate('right');
    else if (action === 'rotateL') this.board.rotate('left');
    else if (action === 'down') {
      if (this.board.move(0, 1)) {
        this.addScore(POINTS.SOFT_DROP);
        this.dropCounter = 0;
      }
    } else if (action === 'drop') {
      const distance = this.board.dropDistance();
      if (distance > 0) {
        this.board.move(0, distance);
        this.addScore(distance * POINTS.HARD_DROP);
      }
      this.lockStep();
      this.dropCounter = 0;
    }
    this.render();
  }

  private loop = (now: number): void => {
    this.dropCounter += now - this.lastTime;
    this.lastTime = now;
    const interval = levelSpeed(this.level);
    if (this.dropCounter > interval) {
      this.dropCounter = 0;
      this.lockStep();
    }
    this.render();
    if (this.status === 'playing') {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };

  // Advance gravity one tick and handle locking / line clears / game over.
  private lockStep(): void {
    const result = this.board.step();
    if (result.gameOver) {
      this.endGame();
      return;
    }
    if (result.linesCleared > 0) {
      this.addScore(this.linePoints(result.linesCleared));
      this.lines += result.linesCleared;
      if (this.lines >= LINES_PER_LEVEL * (this.level + 1)) {
        this.level += 1;
      }
      this.emitStats();
    }
    if (result.locked) this.renderNext();
  }

  private linePoints(n: number): number {
    const base =
      n === 1 ? POINTS.SINGLE :
      n === 2 ? POINTS.DOUBLE :
      n === 3 ? POINTS.TRIPLE :
      n >= 4 ? POINTS.TETRIS : 0;
    return base * (this.level + 1);
  }

  private endGame(): void {
    cancelAnimationFrame(this.rafId);
    this.setStatus('over');
    const durationS = Math.max(1, Math.round((performance.now() - this.startTime) / 1000));
    this.hooks.onGameOver({ score: this.score, lines: this.lines, level: this.level, durationS });
  }

  private addScore(points: number): void {
    this.score += points;
    this.emitStats();
  }

  private emitStats(): void {
    this.hooks.onStats({ score: this.score, lines: this.lines, level: this.level });
  }

  private setStatus(status: Status): void {
    const wasRunning = this.status === 'playing';
    this.status = status;
    const running = status === 'playing';
    if (running !== wasRunning) this.hooks.onRunningChange(running);
  }

  // --- rendering -----------------------------------------------------------

  private render(): void {
    // Start from the frozen grid.
    const buffer = this.board.grid.map((row) => row.slice());

    // Ghost: where the active piece would land.
    const ghost = this.board.current.clone();
    ghost.y += this.board.dropDistance();

    // Composite ghost (negative marker) then the live piece over the top.
    ghost.eachCell((x, y) => {
      if (y >= 0 && buffer[y][x] === 0) buffer[y][x] = -this.board.current.typeId;
    });
    this.board.current.eachCell((x, y, value) => {
      if (y >= 0) buffer[y][x] = value;
    });

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const value = buffer[y][x];
        const sig = String(value);
        if (this.rendered[i] === sig) continue;
        this.rendered[i] = sig;
        this.paintCell(this.cells[i], value);
      }
    }
  }

  private paintCell(el: HTMLElement, value: number): void {
    if (value > 0) {
      el.className = 'cell on';
      el.style.setProperty('--c', COLORS[value]);
    } else if (value < 0) {
      el.className = 'cell ghost';
      el.style.setProperty('--c', COLORS[-value]);
    } else {
      el.className = 'cell';
      el.style.removeProperty('--c');
    }
  }

  private renderNext(): void {
    const next = this.board.next;
    // Centre the shape in the 4×4 preview.
    const offset = Math.floor((4 - next.shape.length) / 2);
    this.nextCells.forEach((el) => {
      el.className = 'nx-cell';
      el.style.removeProperty('--c');
    });
    next.shape.forEach((row, dy) =>
      row.forEach((value, dx) => {
        if (value === 0) return;
        const nx = dx + offset;
        const ny = dy + offset;
        if (nx >= 0 && nx < 4 && ny >= 0 && ny < 4) {
          const el = this.nextCells[ny * 4 + nx];
          el.className = 'nx-cell on';
          el.style.setProperty('--c', COLORS[value]);
        }
      })
    );
  }
}
