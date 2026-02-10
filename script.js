const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const livesEl = document.getElementById("lives");
const restartBtn = document.getElementById("restart");

const groundY = canvas.height - 70;
const gravity = 0.75;
const jumpVelocity = -13.5;
const maxLives = 3;

const animals = [
  { name: "Monkey", color: "#6f4e37" },
  { name: "Gorilla", color: "#3b3b3b" },
  { name: "Orangutan", color: "#c86b2a" },
  { name: "Chimp", color: "#4f3b2f" },
  { name: "DingDing", color: "#7b553c" },
  { name: "WoodenTree", color: "#8a5a3c" },
];

let player;
let obstacles = [];
let bananas = [];
let timeElapsed = 0;
let lastTime = 0;
let gameOver = false;
let speed = 4;
let spawnTimer = 0;
let bananaTimer = 0;
let scoreTimer = 0;
let lives = maxLives;
let bananaCount = 0;
let highScore = Number(localStorage.getItem("orami_high_score") || 0);
let jumpVoice = null;
let milestoneShown = false;

highScoreEl.textContent = highScore;

function init() {
  player = createPlayer();
  obstacles = [];
  bananas = [];
  timeElapsed = 0;
  lastTime = performance.now();
  gameOver = false;
  speed = 4;
  spawnTimer = 0;
  bananaTimer = 0;
  scoreTimer = 0;
  lives = maxLives;
  bananaCount = 0;
  milestoneShown = false;
  updateLivesDisplay();
  requestAnimationFrame(loop);
}

function createPlayer() {
  const pick = animals[Math.floor(Math.random() * animals.length)];
  return {
    x: 140,
    y: groundY - 42,
    w: 42,
    h: 42,
    vy: 0,
    onGround: true,
    animal: pick,
  };
}

function updateLivesDisplay() {
  livesEl.textContent = "";
  for (let i = 0; i < lives; i += 1) {
    const heart = document.createElement("span");
    heart.textContent = "♥";
    heart.style.color = "#ff3b3b";
    livesEl.appendChild(heart);
  }
}

function jump() {
  if (gameOver) return;
  if (player.onGround) {
    player.vy = jumpVelocity;
    player.onGround = false;
    playJumpSound();
  }
}

function spawnObstacle() {
  const isSky = Math.random() < 0.35;
  const width = isSky ? 52 : 44;
  const height = isSky ? 32 : 50;
  const y = isSky ? groundY - 130 : groundY - height;
  obstacles.push({
    x: canvas.width + 10,
    y,
    w: width,
    h: height,
    type: isSky ? "sky" : "ground",
  });
}

function spawnBanana() {
  const minY = groundY - 150;
  const maxY = groundY - 90;
  const y = minY + Math.random() * (maxY - minY);
  bananas.push({
    x: canvas.width + 10,
    y,
    w: 24,
    h: 24,
    collected: false,
  });
}

function playJumpSound() {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance("우끼!");
  utterance.rate = 1.25;
  utterance.pitch = 1.6;
  if (jumpVoice) utterance.voice = jumpVoice;
  window.speechSynthesis.speak(utterance);
}

function playCrySound() {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance("오라미...");
  utterance.rate = 0.9;
  utterance.pitch = 0.8;
  if (jumpVoice) utterance.voice = jumpVoice;
  window.speechSynthesis.speak(utterance);
}

function selectJumpVoice() {
  if (!window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  const korean = voices.filter((v) => /ko-KR/i.test(v.lang));
  jumpVoice = korean.find((v) => /female|child|youth|young/i.test(v.name)) || korean[0] || voices[0];
}

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = selectJumpVoice;
  selectJumpVoice();
}

function playFestiveTune() {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctxAudio = new AudioCtx();
  const notes = [523.25, 659.25, 783.99, 659.25, 523.25, 659.25, 1046.5];
  const duration = 0.18;
  notes.forEach((freq, i) => {
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctxAudio.destination);
    const start = ctxAudio.currentTime + i * duration;
    osc.start(start);
    osc.stop(start + duration);
  });
}

function loseLife() {
  lives -= 1;
  updateLivesDisplay();
  playCrySound();
  if (lives <= 0) {
    gameOver = true;
  }
}

function collectBanana() {
  bananaCount += 1;
  if (bananaCount >= 5) {
    bananaCount = 0;
    if (lives < maxLives) {
      lives += 1;
      updateLivesDisplay();
    }
  }
}

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  if (!gameOver) {
    timeElapsed += dt;
  }

  scoreTimer += dt;
  if (scoreTimer >= 1) {
    const inc = Math.floor(scoreTimer);
    scoreTimer -= inc;
    const scoreValue = Math.floor(timeElapsed);
    scoreEl.textContent = scoreValue;
    if (scoreValue > highScore) {
      highScore = scoreValue;
      highScoreEl.textContent = highScore;
      localStorage.setItem("orami_high_score", String(highScore));
    }
  }

  speed = 4 + timeElapsed * 0.15;

  if (!milestoneShown && timeElapsed >= 60) {
    milestoneShown = true;
    playFestiveTune();
  }

  update(dt);
  render();

  if (!gameOver) {
    requestAnimationFrame(loop);
  } else {
    renderGameOver();
  }
}

function update(dt) {
  player.vy += gravity;
  player.y += player.vy;
  if (player.y >= groundY - player.h) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  spawnTimer += dt;
  if (spawnTimer > 1.1 + Math.random() * 0.6) {
    spawnObstacle();
    spawnTimer = 0;
  }

  bananaTimer += dt;
  if (bananaTimer > 2.5 + Math.random() * 2) {
    spawnBanana();
    bananaTimer = 0;
  }

  obstacles.forEach((obs) => {
    obs.x -= speed;
  });
  bananas.forEach((ban) => {
    ban.x -= speed;
  });

  obstacles = obstacles.filter((obs) => obs.x + obs.w > -40);
  bananas = bananas.filter((ban) => ban.x + ban.w > -40 && !ban.collected);

  for (const obs of obstacles) {
    if (rectsOverlap(player, obs)) {
      loseLife();
      obs.x = -100;
      if (gameOver) break;
    }
  }

  for (const ban of bananas) {
    if (!ban.collected && rectsOverlap(player, ban)) {
      ban.collected = true;
      collectBanana();
    }
  }
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky();
  drawGround();
  drawPalmLeft();
  drawPalmRight();

  bananas.forEach(drawBanana);
  obstacles.forEach(drawObstacle);
  drawPlayer();

  drawBananaProgress();

  if (milestoneShown) {
    renderMilestone();
  }
}

function drawSky() {
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(160, 80, 60, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(700, 60, 70, 24, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = "#f4d38b";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.fillStyle = "#5fb57f";
  ctx.fillRect(0, groundY - 12, canvas.width, 12);
}

function drawPalmLeft() {
  ctx.fillStyle = "#7b4b2a";
  ctx.fillRect(30, groundY - 140, 16, 140);
  ctx.fillStyle = "#1c7a54";
  ctx.beginPath();
  ctx.moveTo(38, groundY - 150);
  ctx.lineTo(10, groundY - 190);
  ctx.lineTo(80, groundY - 185);
  ctx.closePath();
  ctx.fill();
}

function drawPalmRight() {
  ctx.fillStyle = "#7b4b2a";
  ctx.fillRect(canvas.width - 50, groundY - 130, 14, 130);
  ctx.fillStyle = "#1c7a54";
  ctx.beginPath();
  ctx.moveTo(canvas.width - 42, groundY - 140);
  ctx.lineTo(canvas.width - 90, groundY - 170);
  ctx.lineTo(canvas.width - 10, groundY - 175);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  ctx.fillStyle = player.animal.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = "#f7e6c4";
  ctx.fillRect(player.x + 8, player.y + 10, 14, 14);
  ctx.fillStyle = "#1f1f1f";
  ctx.fillRect(player.x + 10, player.y + 14, 4, 4);
  ctx.fillRect(player.x + 18, player.y + 14, 4, 4);
  ctx.fillStyle = "#0f2e24";
  ctx.font = "12px Trebuchet MS";
  ctx.fillText(player.animal.name, player.x - 4, player.y - 6);
}

function drawObstacle(obs) {
  if (obs.type === "ground") {
    ctx.fillStyle = "#2f6b45";
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.fillStyle = "#1e4a30";
    ctx.fillRect(obs.x + 8, obs.y - 10, 8, 10);
  } else {
    ctx.fillStyle = "#394b59";
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.fillStyle = "#1e2a33";
    ctx.fillRect(obs.x + 6, obs.y + 6, obs.w - 12, obs.h - 12);
  }
}

function drawBanana(ban) {
  ctx.fillStyle = "#ffcf33";
  ctx.beginPath();
  ctx.ellipse(ban.x + 12, ban.y + 12, 12, 8, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d39b2a";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBananaProgress() {
  ctx.fillStyle = "#0f2e24";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText(`Bananas: ${bananaCount}/5`, 16, 28);
}

function renderGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 34px Trebuchet MS";
  ctx.fillText("Game Over", canvas.width / 2 - 90, canvas.height / 2 - 10);
  ctx.font = "18px Trebuchet MS";
  ctx.fillText("Press Restart to try again", canvas.width / 2 - 120, canvas.height / 2 + 24);
}

function renderMilestone() {
  ctx.fillStyle = "rgba(10, 60, 45, 0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffef9c";
  ctx.font = "bold 52px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("GOOD ORAMI!", canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "start";
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    jump();
  }
});

restartBtn.addEventListener("click", () => {
  init();
});

init();
