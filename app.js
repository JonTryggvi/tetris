import { moves, BLOCK_SIZE, KEY, LEVEL, account , time} from './js/constants';
import {Board, POINTS} from './js/board'
// import Piece from './js/Piece'
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const canvasNext = document.getElementById('next');
const ctxNext = canvasNext.getContext('2d');
let requestId;
let board = new Board(ctx, ctxNext);
addEventListener();
initNext();

function initNext() {
  // Calculate size of canvas from constants.
  ctxNext.canvas.width = 4 * BLOCK_SIZE;
  ctxNext.canvas.height = 4 * BLOCK_SIZE;
  ctxNext.scale(BLOCK_SIZE, BLOCK_SIZE);
}

function addEventListener() {
  document.addEventListener('keydown', handleEvent);
  document.addEventListener('click', handleEvent);
}
function handleEvent(event) {
  let keyCode = event.keyCode || event.target.dataset.keyCode
  console.log(event.keyCode)
  if (keyCode === KEY.P) {
    pause();
  }
  if (keyCode === KEY.ESC) {
    gameOver();
  } else if (moves[keyCode]) {
    event.preventDefault();
    // Get new state
    let p = moves[keyCode](board.piece, board);
    if (keyCode === KEY.SPACE) {
      // Hard drop
      while (board.valid(p)) {
        account.score += POINTS.HARD_DROP;
        board.piece.move(p);
        p = moves[KEY.DOWN](board.piece);
      }
      board.piece.hardDrop();     
    } else if (board.valid(p)) {
      board.piece.move(p);
      if (keyCode === KEY.DOWN) {
        account.score += POINTS.SOFT_DROP;         
      }
    }
  }
}

function resetGame() {
  account.score = 0;
  account.lines = 0;
  account.level = 0;
  board.reset();
  time.start = 0;
  time.elapsed = 0;
  time.level = LEVEL[account.level];
}

function play() {
  resetGame();
  time.start = performance.now();
  // If we have an old game running a game then cancel the old
  if (requestId) {
    cancelAnimationFrame(requestId);
  }

  animate();
}

function animate(now = 0) {
  time.elapsed = now - time.start;
  if (time.elapsed > time.level) {
    time.start = now;
    if (!board.drop()) {
      gameOver();
      return;
    }
  }

  // Clear board before drawing new state.
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  board.draw();
  requestId = requestAnimationFrame(animate);
}

function gameOver() {
  cancelAnimationFrame(requestId);
  ctx.fillStyle = 'black';
  ctx.fillRect(1, 3, 8, 1.2);
  ctx.font = '1px Arial';
  ctx.fillStyle = 'red';
  ctx.fillText('GAME OVER', 1.8, 4);
}

function pause() {
  if (!requestId) {
    animate();
    return;
  }

  cancelAnimationFrame(requestId);
  requestId = null;
  
  ctx.fillStyle = 'black';
  ctx.fillRect(1, 3, 8, 1.2);
  ctx.font = '1px Arial';
  ctx.fillStyle = 'yellow';
  ctx.fillText('PAUSED', 3, 4);
}

const btn = document.querySelector('.play-button')
btn.addEventListener('click', play);

