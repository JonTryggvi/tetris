'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const LINES_PER_LEVEL = 10;
const COLORS = [
  'none',
  'cyan',
  'midnightblue',
  'darkorange',
  'khaki',
  'seagreen',
  'darkviolet',
  'tomato'
];
Object.freeze(COLORS);

const SHAPES = [
  [],
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
  [[0, 0, 3], // 0,0 -> 2,0 ; 0,1 -> 1,0 ; 0,2 -> 0,0
   [3, 3, 3], // 1,0 -> 2,1 ; 1,1 -> 1,1 ; 1,2 -> 0,1 
   [0, 0, 0]],// 2,0 -> 2,2 ; 2,1 -> 1,2 ; 2,2 -> 0,2
  [[4, 4], [4, 4]],
  [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
  [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
  [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];
Object.freeze(SHAPES);

const KEY = {
  ESC: 27,
  SPACE: 32,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  P: 80,
  Q: 81
}
Object.freeze(KEY);

const POINTS = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  SOFT_DROP: 1,
  HARD_DROP: 2,
}
Object.freeze(POINTS);

const LEVEL = {
  0: 800,
  1: 720,
  2: 630,
  3: 550,
  4: 470,
  5: 380,
  6: 300,
  7: 220,
  8: 130,
  9: 100,
  10: 80,
  11: 80,
  12: 80,
  13: 70,
  14: 70,
  15: 70,
  16: 50,
  17: 50,
  18: 50,
  19: 30,
  20: 30,
  // 29+ is 20ms
}
Object.freeze(LEVEL);

const ROTATION = {
  LEFT: 'left',
  RIGHT: 'right'
}
Object.freeze(ROTATION);

let moves = {
  [KEY.LEFT]: p => ({ ...p, x: p.x - 1 }),
  [KEY.RIGHT]: p => ({ ...p, x: p.x + 1 }),
  [KEY.DOWN]: p => ({ ...p, y: p.y + 1 }),
  [KEY.SPACE]: p => ({ ...p, y: p.y + 1 }),
  [KEY.UP]: (p, board) => board.rotate(p, ROTATION.RIGHT),
  [KEY.Q]: (p, board) => board.rotate(p, ROTATION.LEFT)
};


let accountValues = {
  topscore: localStorage.hasOwnProperty('topscore') ? localStorage.topscore : 0,
  score: 0,
  level: 0,
  lines: 0
}
let account = new Proxy(accountValues, {
  set: (target, key, value) => {
    target[key] = value;
    updateAccount(key, value);
    return true;
  }
});


function updateAccount(key, value) {
  let element = document.getElementById(key);
  if (element) {
    element.textContent = value;
  }
}

let time = { start: 0, elapsed: 0, level: 0 }

const AUDIO_TRACKS = {
  'block-rotate': '/sounds/block-rotate.mp3',
  'force-hit': '/sounds/force-hit.mp3',
  'gameover': '/sounds/gameover.mp3',
  'line-drop': '/sounds/line-drop.mp3',
  'line-removal4': '/sounds/line-removal4.mp3',
  'line-remove': '/sounds/line-remove.mp3',
  'music': '/sounds/music.mp3',
  'pause': '/sounds/pause.mp3',
  'select': '/sounds/select.mp3',
  'slow-hit': '/sounds/slow-hit.mp3',
  'start': '/sounds/start.mp3',
  'whoosh': '/sounds/whoosh.mp3'
};

module.exports = { AUDIO_TRACKS, COLS, ROWS, BLOCK_SIZE, KEY, LINES_PER_LEVEL, SHAPES, POINTS, LEVEL, ROTATION, COLORS, moves, account, time }
