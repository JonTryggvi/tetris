import { AUDIO_TRACKS, SHAPES, COLORS } from './constants';
class Piece {
  x;
  y;
  color;
  shape;
  ctx;
  typeId;
  hardDropped;

  constructor(ctx) {
    this.ctx = ctx;
    this.spawn();
  }

  spawn() {
    this.typeId = this.randomizeTetrominoType(COLORS.length - 1);
    this.shape = SHAPES[this.typeId];
    this.color = COLORS[this.typeId];
    this.x = 0;
    this.y = 0;
    this.hardDropped = false;
  }

  draw() {
    this.ctx.fillStyle = this.color;
    this.ctx.shadowBlur = 1;
    this.ctx.shadowColor = "black";
    this.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.ctx.fillRect(this.x + x, this.y + y, 1, 1);
        }
      });
    });
  }

  move(p) {
   
    if(!this.hardDropped){
      this.x = p.x;
      this.y = p.y;
    }
    this.shape = p.shape;
  }

  hardDrop(){
    this.hardDropped = true;
    // var play_hard_drop = new Audio(AUDIO_TRACKS['force-hit']);
    // play_hard_drop.play();
  }

  setStartingPosition() {
    this.x = this.typeId === 4 ? 4 : 3;
  }

  randomizeTetrominoType(noOfTypes) {
    return Math.floor(Math.random() * noOfTypes + 1);
  }
}

module.exports = Piece