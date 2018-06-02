const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
const steps = 10;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const slice = new Slice();

const gui = new dat.GUI();
gui.add(slice, 'steps', 1, 50);
gui.add(slice, 'rotate', 1, 50);

img.src = './img/beach-calm-clouds-378271.jpg';
img.addEventListener('load', slice.init);

function Slice() {
  this.steps = 10;
  this.rotate = 10;

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let sizeStep = canvas.height / 2 / this.steps;
    for (let i = 0; i < this.steps; i++) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.height / 2 - i * sizeStep,
        0,
        Math.PI * 2,
        false
      );
      ctx.clip();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(i * this.rotate * Math.PI / 180);
      ctx.drawImage(
        img,
        -canvas.width / 2,
        -canvas.height / 2,
        canvas.width,
        canvas.height
      );
      ctx.restore();
    }
    requestAnimationFrame(draw);
  };

  this.init = () => {
    draw();
  };
}
