const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const restartBtn = document.getElementById("restartBtn");
const startMenu = document.getElementById("startMenu");

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
const birdFrames = [new Image(), new Image(), new Image()];
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
  }
}

[...birdFrames, pipeTopImg, pipeBodyImg, pipeBottomImg].forEach(img => {
  img.onload = assetLoaded;
});

let bird, pipes, score, gameOver, gameStarted;
let jumpPressed = false;
let hasSeenMenu = false;

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
  jumpPressed = false;
  lastTime = performance.now();

  restartBtn.classList.remove("show");
  restartBtn.style.display = "none";

  if (!hasSeenMenu) {
    gameStarted = false;
    startMenu.style.display = "block";
  } else {
    gameStarted = true;
    startMenu.style.display = "none";
    canvas.focus();
    requestAnimationFrame(loop);
  }
}

canvas.addEventListener("click", () => {
  if (!gameStarted) {
    hasSeenMenu = true;
    gameStarted = true;

    startMenu.classList.add("fade-out");

    setTimeout(() => {
      startMenu.style.display = "none";
      canvas.focus();
      requestAnimationFrame(loop);
    }, 500);
  }
});

document.addEventListener("keydown", () => {
  if (!gameOver && gameStarted && !jumpPressed) {
    bird.vel = bird.jump;
    jumpPressed = true;
  }
});

document.addEventListener("keyup", () => {
  jumpPressed = false;
});

restartBtn.addEventListener("click", () => {
  initGame();
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
  if (!gameStarted || gameOver) return;

  bird.vel += bird.gravity * dt;
  bird.y += bird.vel * dt;

  bird.frameIndex = bird.vel < -50 ? 0 : bird.vel < 200 ? 1 : 2;

  if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width * 0.55) {
    spawnPipe();
  }

  const pipeSpeed = scale(240);
  pipes.forEach(pipe => pipe.x -= pipeSpeed * dt);
  pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);

  for (let pipe of pipes) {
    if (collides(pipe)) gameOver = true;
  }

  if (bird.y + bird.height > canvas.height || bird.y < 0) {
    gameOver = true;
  }

  pipes.forEach(pipe => {
    if (!pipe.scored && pipe.x + pipe.width < bird.x) {
      score++;
      pipe.scored = true;
    }
  });
}

function getPipeScale(pipeWidth) {
  return pipeWidth / pipeBodyImg.naturalWidth;
}

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

  const frame = birdFrames[bird.frameIndex];
  ctx.drawImage(frame, bird.x, bird.y, bird.width, bird.height);

  pipes.forEach(pipe => {
    const scaleFactor = getPipeScale(pipe.width);
    const capHeight = pipeTopImg.naturalHeight * scaleFactor;

    const topBodyHeight = pipe.top - capHeight;
    if (topBodyHeight > 0) {
      drawPipeSegment(pipeBodyImg, pipe.x, 0, pipe.width, topBodyHeight);
    }
    ctx.drawImage(pipeTopImg, 0, 0, pipeTopImg.naturalWidth, pipeTopImg.naturalHeight, pipe.x, pipe.top - capHeight, pipe.width, capHeight);

    ctx.drawImage(pipeBottomImg, 0, 0, pipeBottomImg.naturalWidth, pipeBottomImg.naturalHeight, pipe.x, pipe.bottom, pipe.width, capHeight);

    const bottomBodyHeight = canvas.height - (pipe.bottom + capHeight);
    if (bottomBodyHeight > 0) {
      drawPipeSegment(pipeBodyImg, pipe.x, pipe.bottom + capHeight, pipe.width, bottomBodyHeight);
    }
  });

  ctx.fillStyle = "white";
  ctx.font = scale(40) + "px Arial";
  ctx.fillText(score, scale(20), scale(60));

  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = scale(60) + "px Arial";
    ctx.fillText("Game Over", canvas.width * 0.28, canvas.height * 0.45);

    restartBtn.style.display = "block";
    setTimeout(() => restartBtn.classList.add("show"), 20);
  }
}

function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}