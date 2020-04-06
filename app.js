import $ from 'jquery'
import { moves, BLOCK_SIZE, KEY, LEVEL, account, time } from './js/constants';
import {Board, POINTS} from './js/board'
// import Piece from './js/Piece'
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const canvasNext = document.getElementById('next');
const ctxNext = canvasNext.getContext('2d');
let requestId;
let board = new Board(ctx, ctxNext);
let modalContainer = document.querySelector('.modal-contianer');
addEventListener();
initNext();
get_topscore();
set_top_list();
!localStorage.hasOwnProperty('topscore') ?
  localStorage.topscore = 0 : account.topscore = localStorage.topscore

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
  if (keyCode === KEY.P) {
    pause();
  }
  if (keyCode === KEY.ESC && requestId) {
    gameOver();
    updateUserScore(account.score)
  } else if (modalContainer.classList.contains('active') && keyCode === KEY.ESC) {
    modalContainer.classList.remove('active')
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
        updateUserScore(account.score)
      }
      board.piece.hardDrop();     
    } else if (board.valid(p)) {
      board.piece.move(p);
      if (keyCode === KEY.DOWN) {
        account.score += POINTS.SOFT_DROP;  
        updateUserScore(account.score)
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
  updateUserScore(account.score)
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
  if (localStorage.hasOwnProperty('topscore') && account.score > localStorage.topscore) {
    localStorage.topscore = account.score;
  }
}

function gameOver() {
  if (requestId) {
    updateUserScore(account.score)
    updateIOList(JSON.parse(localStorage.currentUser))
    cancelAnimationFrame(requestId);
    ctx.fillStyle = 'black';
    ctx.fillRect(1, 3, 8, 1.2);
    ctx.font = '1px Arial';
    ctx.fillStyle = 'red';
    ctx.fillText('GAME OVER', 1.8, 4);
  }
  
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
function updateUserScore(score) {
  let lsUser = JSON.parse(localStorage.currentUser)
  lsUser.score = score;
  localStorage.currentUser = JSON.stringify(lsUser)
  updateToplist(score)
}
function registerUser() {
  const modalCtnr = document.querySelector('.modal-contianer')
  const modalInput = modalCtnr.querySelector('input')
  const modalSubm = modalCtnr.querySelector('.btnSubm')
  const modalkeep = modalCtnr.querySelector('.keepbtn')
  const hasUsern = modalCtnr.querySelector('.has-username')
  if (localStorage.hasOwnProperty('currentUser')) {
    modalkeep.style.display = 'inline-block';
    hasUsern.innerText = JSON.parse(localStorage.currentUser).name
    modalkeep.onclick = e => {
      modalCtnr.classList.remove('active')
      play()
    }
  }
  modalCtnr.classList.add('active')
  modalInput.onkeyup = e => {
    e.target.value.length == 3 ? modalSubm.disabled = false : modalSubm.disabled = true;
    
  }
  modalInput.onkeydown = e => {
    let keyCode = e.key 
    if (keyCode == 'Enter') {
      e.preventDefault()
      this.value.length <
      modalSubm.click()
    }
  }
  modalSubm.onclick = (e) => {
    if (modalInput.value.length == 3) {
      modalSubm.disabled = false
      const ajaxObj = {
        action: 'save_user',
        name: modalInput.value,
        id: modalInput.value+'-'+Date.now(),
        score: 0
      }
      localStorage.currentUser = JSON.stringify({
        name: modalInput.value,
        id: modalInput.value + '-' + Date.now(),
        score: 0
      });
      postAjax(ajaxObj).done(res => {
        modalCtnr.classList.remove('active')
        play()
      })
    } else {
      modalSubm.disabled = true
    }
      
  } 
}

function updateIOList(payload) {
  let ajaxObj = {
    action: 'update_list',
    name: payload.name,
    id: payload.id,
    score: payload.score
  }
  postAjax(ajaxObj)
    // .done(res => {
    // console.log('list_update :', res);
    // localStorage.topList = '';
    // localStorage.topList = JSON.stringify(res)
  // })
}

function get_topscore() {
  const ajaxObj = {
    action: 'get_list',
  }
  postAjax(ajaxObj).done(res => {
    localStorage.topList = '';
    localStorage.topList = 'no file' !== res.responseText ? JSON.stringify(res) : '[]';
    set_top_list()
  })
}

function set_top_list() {
  let aToplist = localStorage.hasOwnProperty('topList')  ? JSON.parse(localStorage.topList) : [];
  let elTops = document.querySelector('.top-score .score-container');
  elTops.innerHTML = '';
  let items = '';
  aToplist.forEach(item => {
    items += `<li>${item.name} : ${item.score}</li>`
  })
  elTops.insertAdjacentHTML('afterbegin', items)
}

function updateToplist(score) {
  let currentUser = JSON.parse(localStorage.currentUser);
  let topList = localStorage.hasOwnProperty('topList') ? JSON.parse(localStorage.topList) : [];
  
  topList.map(item => {
    if (item.id === currentUser.id) {
      item.score = score;
    }
  })
  let t = topList.sort((a, b) => a-b)
  localStorage.topList = JSON.stringify(t)
  set_top_list()
  
}

const btn = document.querySelector('.play-button')
btn.addEventListener('click', registerUser);
// btn.addEventListener('click', play);

function postAjax(dataObj, files = false) {
  let ajaxOptions = {
    type: 'POST',
    url: 'https://dev.jontryggvi.is/ajax.php',
    data: dataObj,
    dataType: 'json',
    error(err) {
      console.log(err);
      return err
    }
  }
  let ajaxOptionsWithFiles = {
    url: 'https://dev.jontryggvi.is/ajax.php',
    type: 'POST',
    contentType: false,
    processData: false,
    data: dataObj,
    error(err) {
      console.log(err);
      return err
    },
    cache: false

  }
  let options = files ? ajaxOptionsWithFiles : ajaxOptions;
  return $.ajax(options);
}