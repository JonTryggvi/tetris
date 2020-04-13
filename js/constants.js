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
  'block-rotate': new Audio('/sounds/block-rotate.mp3'),
  'force-hit': new Audio('/sounds/force-hit.mp3') ,
  'gameover': new Audio('/sounds/gameover.mp3'),
  'line-drop': new Audio('/sounds/line-drop.mp3') ,
  'line-removal4': new Audio('/sounds/line-removal4.mp3'),
  'line-remove': new Audio('/sounds/line-remove.mp3'),
  'music': new Audio('/sounds/music.mp3'),
  'pause': new Audio('/sounds/pause.mp3'),
  'select': new Audio('/sounds/select.mp3'),
  'slow-hit': new Audio('/sounds/slow-hit.mp3'),
  'start': new Audio('/sounds/start.mp3'),
  'whoosh': new Audio('/sounds/start.mp3'),
  'tmusic': new Audio('/sounds/Tetris.ogg')
  
};

const SVG_ICONS = {
  stop: `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><path d="M256,0C114.833,0,0,114.844,0,256s114.833,256,256,256s256-114.844,256-256S397.167,0,256,0z M256,490.667 C126.604,490.667,21.333,385.396,21.333,256S126.604,21.333,256,21.333S490.667,126.604,490.667,256S385.396,490.667,256,490.667 z"/><path d="M352,149.333H160c-5.896,0-10.667,4.771-10.667,10.667v192c0,5.896,4.771,10.667,10.667,10.667h192 c5.896,0,10.667-4.771,10.667-10.667V160C362.667,154.104,357.896,149.333,352,149.333z M341.333,341.333H170.667V170.667 h170.667V341.333z"/></svg>`,
  play: `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><path d="M256,0C114.833,0,0,114.844,0,256s114.833,256,256,256s256-114.844,256-256S397.167,0,256,0z M256,490.667 C126.604,490.667,21.333,385.396,21.333,256S126.604,21.333,256,21.333S490.667,126.604,490.667,256S385.396,490.667,256,490.667 z"/><path d="M357.771,247.031l-149.333-96c-3.271-2.135-7.5-2.25-10.875-0.396C194.125,152.51,192,156.094,192,160v192 c0,3.906,2.125,7.49,5.563,9.365c1.583,0.865,3.354,1.302,5.104,1.302c2,0,4.021-0.563,5.771-1.698l149.333-96 c3.042-1.958,4.896-5.344,4.896-8.969S360.813,248.99,357.771,247.031z M213.333,332.458V179.542L332.271,256L213.333,332.458z"/></svg>`
}

module.exports = { SVG_ICONS, AUDIO_TRACKS, COLS, ROWS, BLOCK_SIZE, KEY, LINES_PER_LEVEL, SHAPES, POINTS, LEVEL, ROTATION, COLORS, moves, account, time }
