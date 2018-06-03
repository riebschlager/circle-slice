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
gui.add(slice, 'save');

img.src = './img/sea.jpg';
img.addEventListener('load', slice.init);

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

function Slice() {
  this.steps = 10;
  this.rotate = 10;

  this.save = () => {
    canvasToImage('canvas', {
      name: 'circle-slice-' + Date.now(),
      type: 'jpg',
      quality: 1
    });
  };

  const draw = () => {
    let area = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    let rect = { x: 0, y: 0, width: img.width, height: img.height };
    let transform = fit(rect, area, { cover: true });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      transform.x,
      transform.y,
      transform.width,
      transform.height
    );
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
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
      ctx.rotate((i + 1) * this.rotate * Math.PI / 180);
      ctx.drawImage(
        img,
        -canvas.width / 2 + transform.x,
        -canvas.height / 2 + transform.y,
        transform.width,
        transform.height
      );
      ctx.restore();
    }
    requestAnimationFrame(draw);
  };

  this.init = () => {
    draw();
  };
}

function dropHandler(ev) {
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      if (ev.dataTransfer.items[i].kind === 'file') {
        let file = ev.dataTransfer.items[i].getAsFile();
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = function() {
          img.src = reader.result;
        };
      }
    }
  }

  removeDragData(ev);
}

function dragOverHandler(ev) {
  ev.preventDefault();
}

function removeDragData(ev) {
  if (ev.dataTransfer.items) {
    ev.dataTransfer.items.clear();
  } else {
    ev.dataTransfer.clearData();
  }
}
