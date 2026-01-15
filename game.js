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

// ------------------------------
// DIFFICULTY SCALING
// ------------------------------
function getDifficulty() {
  return 1 + score * 0.05;
}

// ------------------------------
// CLOUDS
// ------------------------------
let clouds = [];

function createCloud() {
  const width = Math.random() * 120 + 80;
  const height = width * 0.35;

  clouds.push({
    x: canvas.width + width,
    y: Math.random() * canvas.height * 0.4,
    width,
    height,
    speed: Math.random() * 20 + 10,
    opacity: Math.random() * 0.3 + 0.4
  });
}

for (let i = 0; i < 6; i++) createCloud();

function drawFlatCloud(cloud) {
  ctx.globalAlpha = cloud.opacity;
  ctx.fillStyle = "white";

  const w = cloud.width;
  const h = cloud.height;

  ctx.fillRect(cloud.x, cloud.y, w, h * 0.5);
  ctx.fillRect(cloud.x + w * 0.15, cloud.y - h * 0.25, w * 0.7, h * 0.5);
  ctx.fillRect(cloud.x + w * 0.25, cloud.y + h * 0.3, w * 0.5, h * 0.4);

  ctx.globalAlpha = 1;
}

// ------------------------------
// INIT GAME
// ------------------------------
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

// ------------------------------
// INPUT
// ------------------------------
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

// ------------------------------
// PIPE GENERATION
// ------------------------------
function spawnPipe() {
  const baseGap = canvas.height * 0.16;
  const gap = baseGap / getDifficulty();

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

// ------------------------------
// UPDATE LOOP
// ------------------------------
function update(dt) {
  if (!gameStarted || gameOver) return;

  // CLOUDS
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed * dt;
  });

  clouds = clouds.filter(cloud => cloud.x + cloud.width > 0);

  if (Math.random() < 0.01) createCloud();

  // BIRD
  bird.vel += bird.gravity * dt;
  bird.y += bird.vel * dt;

  bird.frameIndex = bird.vel < -50 ? 0 : bird.vel < 200 ? 1 : 2;

  // PIPES
  const spawnThreshold = canvas.width * (0.55 / getDifficulty());
  if (pipes.length === 0 || pipes[pipes.length - 1].x < spawnThreshold) {
    spawnPipe();
  }

  const pipeSpeed = scale(240) * getDifficulty();
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

// ------------------------------
// PIPE RENDERING
// ------------------------------
function drawPipeSegment(img, x, y, width, height) {
  const scaleFactor = width / img.naturalWidth;
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

// ------------------------------
// DRAW LOOP
// ------------------------------
function draw() {
  // SKY
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // CLOUDS
  clouds.forEach(drawFlatCloud);

  // BIRD
  const frame = birdFrames[bird.frameIndex];
  ctx.drawImage(frame, bird.x, bird.y, bird.width, bird.height);

  // PIPES
  pipes.forEach(pipe => {
    const scaleFactor = pipe.width / pipeBodyImg.naturalWidth;
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

  // SCORE
  ctx.fillStyle = "white";
  ctx.font = scale(40) + "px Arial";
  ctx.textAlign = "left";
  ctx.fillText(score, scale(20), scale(60));

  // GAME OVER SCREEN
  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = scale(60) + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - scale(40);

    ctx.fillText("Game Over", centerX, centerY);

    restartBtn.style.left = "50%";
    restartBtn.style.top = (centerY + scale(80)) + "px";
    restartBtn.style.transform = "translateX(-50%)";

    restartBtn.style.display = "block";
    setTimeout(() => restartBtn.classList.add("show"), 20);
  }
}

// ------------------------------
// MAIN LOOP
// ------------------------------
function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}