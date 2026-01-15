const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const restartBtn = document.getElementById("restartBtn");

let lastTime = 0;
const BASE_HEIGHT = 600;

function scale(value) {
  return value * (canvas.height / BASE_HEIGHT);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Load bird frames
const birdFrames = [
  new Image(),
  new Image(),
  new Image()
];

birdFrames[0].src = "bird_up.png";
birdFrames[1].src = "bird_mid.png";
birdFrames[2].src = "bird_down.png";

// Load pipe parts
const pipeTopImg = new Image();
const pipeBodyImg = new Image();
const pipeBottomImg = new Image();

pipeTopImg.src = "pipe_top.png";
pipeBodyImg.src = "pipe_body.png";
pipeBottomImg.src = "pipe_bottom.png";

let imagesLoaded = 0;
const totalImages = 6;

function assetLoaded() {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    initGame();
    requestAnimationFrame(loop);
  }
}

[...birdFrames, pipeTopImg, pipeBodyImg, pipeBottomImg].forEach(img => {
  img.onload = assetLoaded;
});

let bird, pipes, score, gameOver;
let jumpPressed = false;

function initGame() {
  const birdSize = scale(40);

  bird = {
    x: scale(80),
    y: canvas.height * 0.4,
    width: birdSize,
    height: birdSize,
    vel: 0,
    gravity: scale(1400),
    jump: scale(-420),
    frameIndex: 0
  };

  pipes = [];
  score = 0;
  gameOver = false;
  lastTime = performance.now();
  jumpPressed = false;

  restartBtn.style.display = "none";
}

document.addEventListener("keydown", () => {
  if (!gameOver && !jumpPressed) {
    bird.vel = bird.jump;
    jumpPressed = true;
  }
});

document.addEventListener("keyup", () => {
  jumpPressed = false;
});

function spawnPipe() {
  const gap = canvas.height * 0.16;
  const minTop = canvas.height * 0.1;
  const maxTop = canvas.height * 0.55;

  const topHeight = Math.random() * (maxTop - minTop) + minTop;
  const bottomY = topHeight + gap;

  pipes.push({
    x: canvas.width,
    width: scale(60),
    top: topHeight,
    bottom: bottomY,
    scored: false
  });
}

function collides(pipe) {
  const inX = bird.x < pipe.x + pipe.width && bird.x + bird.width > pipe.x;
  const hitTop = bird.y < pipe.top;
  const hitBottom = bird.y + bird.height > pipe.bottom;
  return inX && (hitTop || hitBottom);
}

function update(dt) {
  if (gameOver) return;

  bird.vel += bird.gravity * dt;
  bird.y += bird.vel * dt;

  // Wing animation based on velocity
  if (bird.vel < -50) {
    bird.frameIndex = 0;
  } else if (bird.vel < 200) {
    bird.frameIndex = 1;
  } else {
    bird.frameIndex = 2;
  }

  // Spawn pipes
  if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width * 0.55) {
    spawnPipe();
  }

  const pipeSpeed = scale(240);
  pipes.forEach(pipe => pipe.x -= pipeSpeed * dt);
  pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);

  // Collisions
  for (let pipe of pipes) {
    if (collides(pipe)) gameOver = true;
  }

  if (bird.y + bird.height > canvas.height || bird.y < 0) {
    gameOver = true;
  }

  // Score
  pipes.forEach(pipe => {
    if (!pipe.scored && pipe.x + pipe.width < bird.x) {
      score++;
      pipe.scored = true;
    }
  });
}

// Shared scale factor for pipe parts
function getPipeScale(pipeWidth) {
  return pipeWidth / pipeBodyImg.naturalWidth;
}

// Tile the pipe body image vertically using scaled height
function drawPipeSegment(img, x, y, width, height) {
  const scaleFactor = getPipeScale(width);
  const segmentHeight = img.naturalHeight * scaleFactor;
  let drawn = 0;

  while (drawn < height) {
    const h = Math.min(segmentHeight, height - drawn);
    ctx.drawImage(
      img,
      0, 0, img.naturalWidth, img.naturalHeight,
      x,
      y + drawn,
      width,
      h
    );
    drawn += h;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw bird
  const frame = birdFrames[bird.frameIndex];
  ctx.drawImage(frame, bird.x, bird.y, bird.width, bird.height);

  // Draw pipes
  pipes.forEach(pipe => {
    const scaleFactor = getPipeScale(pipe.width);
    const capHeight = pipeTopImg.naturalHeight * scaleFactor;

    // TOP PIPE
    const topBodyHeight = pipe.top - capHeight;
    if (topBodyHeight > 0) {
      drawPipeSegment(pipeBodyImg, pipe.x, 0, pipe.width, topBodyHeight);
    }
    ctx.drawImage(
      pipeTopImg,
      0, 0, pipeTopImg.naturalWidth, pipeTopImg.naturalHeight,
      pipe.x,
      pipe.top - capHeight,
      pipe.width,
      capHeight
    );

    // BOTTOM PIPE
    ctx.drawImage(
      pipeBottomImg,
      0, 0, pipeBottomImg.naturalWidth, pipeBottomImg.naturalHeight,
      pipe.x,
      pipe.bottom,
      pipe.width,
      capHeight
    );

    const bottomBodyHeight = canvas.height - (pipe.bottom + capHeight);
    if (bottomBodyHeight > 0) {
      drawPipeSegment(
        pipeBodyImg,
        pipe.x,
        pipe.bottom + capHeight,
        pipe.width,
        bottomBodyHeight
      );
    }
  });

  // Score
  ctx.fillStyle = "white";
  ctx.font = scale(40) + "px Arial";
  ctx.fillText(score, scale(20), scale(60));

  // Game over
  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = scale(60) + "px Arial";
    ctx.fillText("Game Over", canvas.width * 0.28, canvas.height * 0.45);
    restartBtn.style.display = "block";
  }
}

function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

restartBtn.addEventListener("click", () => {
  initGame();
});