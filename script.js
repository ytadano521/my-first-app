const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const startButton = document.querySelector("#start-button");
const coinCount = document.querySelector("#coin-count");
const staminaCount = document.querySelector("#stamina-count");
const scoreCount = document.querySelector("#score-count");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WORLD_WIDTH = 2700;
const GRAVITY = 0.58;
const keys = { left: false, right: false, jump: false, attack: false };
const MAX_STAMINA = 3;

const platforms = [
  { x: 0, y: 465, w: 440, h: 100 },
  { x: 505, y: 465, w: 340, h: 100 },
  { x: 915, y: 465, w: 380, h: 100 },
  { x: 1365, y: 465, w: 350, h: 100 },
  { x: 1785, y: 465, w: 390, h: 100 },
  { x: 2245, y: 465, w: 455, h: 100 },
  { x: 270, y: 365, w: 125, h: 18 },
  { x: 610, y: 355, w: 130, h: 18 },
  { x: 1020, y: 350, w: 140, h: 18 },
  { x: 1510, y: 355, w: 130, h: 18 },
  { x: 1905, y: 345, w: 145, h: 18 },
  { x: 2370, y: 355, w: 135, h: 18 },
];

const coinSpots = [
  { x: 330, y: 326 },
  { x: 675, y: 315 },
  { x: 1088, y: 310 },
  { x: 1575, y: 315 },
  { x: 1978, y: 305 },
];

const enemySpots = [
  { x: 350, minX: 320, maxX: 410 },
  { x: 700, minX: 650, maxX: 800 },
  { x: 1100, minX: 970, maxX: 1240 },
  { x: 1580, minX: 1400, maxX: 1680 },
  { x: 1990, minX: 1810, maxX: 2130 },
  { x: 2440, minX: 2280, maxX: 2640 },
];

const player = {
  x: 82,
  y: 405,
  w: 30,
  h: 44,
  vx: 0,
  vy: 0,
  speed: 4.1,
  grounded: false,
  facing: 1,
  stamina: MAX_STAMINA,
  invulnerableMs: 0,
  attackMs: 0,
  attackCooldownMs: 0,
  attackQueued: false,
};

let coins = [];
let enemies = [];
let cameraX = 0;
let gameState = "title";
let lastTime = 0;
let elapsed = 0;
let defeatedEnemies = 0;
let audioContext;

function playSound(kind) {
  if (!audioContext) return;
  const sounds = {
    jump: [440, 660, "sine"],
    coin: [740, 990, "sine"],
    attack: [230, 150, "square"],
    defeat: [520, 260, "triangle"],
    hurt: [180, 90, "sawtooth"],
    clear: [523, 784, "sine"],
    out: [220, 110, "triangle"],
  };
  const [startFrequency, endFrequency, type] = sounds[kind];
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.12);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.15);
}

function currentScore() {
  const collected = coins.filter((coin) => coin.collected).length;
  return collected * 100 + defeatedEnemies * 150;
}

function updateHud() {
  const collected = coins.filter((coin) => coin.collected).length;
  coinCount.textContent = `${collected} / ${coins.length}`;
  staminaCount.textContent = "♥".repeat(player.stamina) + "♡".repeat(MAX_STAMINA - player.stamina);
  staminaCount.setAttribute("aria-label", `スタミナ ${player.stamina}/${MAX_STAMINA}`);
  scoreCount.textContent = `SCORE ${String(currentScore()).padStart(5, "0")}`;
}

function finishGame(state) {
  gameState = state;
  if (state === "won") {
    const timeBonus = Math.max(0, 3000 - Math.floor(elapsed / 1000) * 10);
    const score = currentScore() + timeBonus;
    playSound("clear");
    setOverlay("ステージクリア！<br>お見事！", `スコア ${score} 点（タイムボーナス ${timeBonus} 点） / ${Math.floor(elapsed / 1000)} 秒`, "もう一度遊ぶ");
  } else {
    playSound("out");
    setOverlay("GAME OVER", state === "fall" ? "穴に落ちてしまった！冒険はここまで。" : "スタミナが尽きてしまった！もう一度挑戦しよう。", "リトライ");
  }
}

function resetGame() {
  keys.left = false;
  keys.right = false;
  keys.jump = false;
  keys.attack = false;
  player.x = 82;
  player.y = 405;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.facing = 1;
  player.stamina = MAX_STAMINA;
  player.invulnerableMs = 0;
  player.attackMs = 0;
  player.attackCooldownMs = 0;
  player.attackQueued = false;
  cameraX = 0;
  coins = coinSpots.map((coin) => ({ ...coin, collected: false }));
  enemies = enemySpots.map((enemy) => ({ ...enemy, y: 421, w: 32, h: 38, speed: 1.15, direction: 1, attackCooldownMs: 0, alive: true }));
  defeatedEnemies = 0;
  elapsed = 0;
  updateHud();
  gameState = "playing";
  overlay.classList.add("is-hidden");
}

function setOverlay(title, copy, buttonText) {
  overlayTitle.innerHTML = title;
  overlayCopy.textContent = copy;
  startButton.innerHTML = `${buttonText} <span>→</span>`;
  overlay.classList.remove("is-hidden");
}

function startGame() {
  if (!audioContext && window.AudioContext) audioContext = new window.AudioContext();
  if (audioContext?.state === "suspended") audioContext.resume();
  resetGame();
  lastTime = performance.now();
}

startButton.addEventListener("click", startGame);

function setKey(key, isDown) {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") keys.left = isDown;
  if (key === "ArrowRight" || key.toLowerCase() === "d") keys.right = isDown;
  if (key === " " || key === "ArrowUp" || key.toLowerCase() === "w") {
    if (isDown && !keys.jump) player.jumpQueued = true;
    keys.jump = isDown;
  }
  if (key.toLowerCase() === "x" || key.toLowerCase() === "j") {
    if (isDown && !keys.attack) player.attackQueued = true;
    keys.attack = isDown;
  }
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "x", "X"].includes(event.key)) event.preventDefault();
  setKey(event.key, true);
  if ((event.key === "Enter" || event.key === " ") && gameState !== "playing") startGame();
});

window.addEventListener("keyup", (event) => setKey(event.key, false));
window.addEventListener("blur", () => {
  keys.left = false;
  keys.right = false;
  keys.jump = false;
  keys.attack = false;
});

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  const press = (event) => {
    event.preventDefault();
    if (control === "attack") {
      if (!keys.attack) player.attackQueued = true;
      keys.attack = true;
      return;
    }
    if (control === "jump") {
      if (!keys.jump) player.jumpQueued = true;
      keys.jump = true;
    } else {
      keys[control] = true;
    }
  };
  const release = () => {
    if (control === "attack") keys.attack = false;
    if (control === "jump") keys.jump = false;
    else if (control !== "attack") keys[control] = false;
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
});

function update(delta) {
  if (gameState !== "playing") return;
  const step = Math.min(delta / 16.67, 2);
  elapsed += delta;
  player.invulnerableMs = Math.max(0, player.invulnerableMs - delta);
  player.attackMs = Math.max(0, player.attackMs - delta);
  player.attackCooldownMs = Math.max(0, player.attackCooldownMs - delta);
  player.vx = ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * player.speed;
  if (player.vx !== 0) player.facing = Math.sign(player.vx);

  if (player.jumpQueued && player.grounded) {
    player.vy = -12;
    player.grounded = false;
    playSound("jump");
  }
  player.jumpQueued = false;
  if (player.attackQueued && player.attackCooldownMs === 0) {
    player.attackMs = 180;
    player.attackCooldownMs = 420;
    playSound("attack");
  }
  player.attackQueued = false;

  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.w, player.x + player.vx * step));
  const previousBottom = player.y + player.h;
  player.vy = Math.min(player.vy + GRAVITY * step, 14);
  player.y += player.vy * step;
  player.grounded = false;

  if (player.vy >= 0) {
    for (const platform of platforms) {
      const horizontalOverlap = player.x + player.w > platform.x && player.x < platform.x + platform.w;
      const crossedTop = previousBottom <= platform.y && player.y + player.h >= platform.y;
      if (horizontalOverlap && crossedTop) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.grounded = true;
        break;
      }
    }
  }

  for (const coin of coins) {
    if (coin.collected) continue;
    const dx = player.x + player.w / 2 - coin.x;
    const dy = player.y + player.h / 2 - coin.y;
    if (Math.hypot(dx, dy) < 30) {
      coin.collected = true;
      playSound("coin");
      updateHud();
    }
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.attackCooldownMs = Math.max(0, enemy.attackCooldownMs - delta);
    enemy.x += enemy.speed * enemy.direction * step;
    if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) enemy.direction *= -1;

    const overlaps = player.x < enemy.x + enemy.w && player.x + player.w > enemy.x
      && player.y < enemy.y + enemy.h && player.y + player.h > enemy.y;
    const attackHits = player.attackMs > 0 && player.y < enemy.y + enemy.h
      && player.y + player.h > enemy.y
      && (player.facing > 0
        ? enemy.x + enemy.w / 2 >= player.x + player.w / 2 && enemy.x <= player.x + player.w + 48
        : enemy.x + enemy.w / 2 <= player.x + player.w / 2 && enemy.x + enemy.w >= player.x - 48);
    if (attackHits) {
      enemy.alive = false;
      defeatedEnemies += 1;
      playSound("defeat");
      updateHud();
      continue;
    }
    if (overlaps && player.invulnerableMs === 0 && enemy.attackCooldownMs === 0) {
      player.stamina -= 1;
      player.invulnerableMs = 900;
      enemy.attackCooldownMs = 900;
      player.vx = player.x < enemy.x ? -5 : 5;
      player.vy = -4;
      player.grounded = false;
      playSound("hurt");
      updateHud();
      if (player.stamina <= 0) {
        finishGame("stamina");
        return;
      }
    }
  }

  if (player.y > HEIGHT) {
    finishGame("fall");
    return;
  }

  cameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * 0.36));
  if (player.x > WORLD_WIDTH - 115) {
    finishGame("won");
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#8bd0e0");
  sky.addColorStop(1, "#d5eddf");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255, 242, 190, 0.78)";
  ctx.beginPath();
  ctx.arc(760 - cameraX * 0.08, 100, 38, 0, Math.PI * 2);
  ctx.fill();

  drawHills("#a0d4cd", 365, 0.13, 170);
  drawHills("#7fc0b6", 415, 0.25, 205);
  drawCloud(150 - (cameraX * 0.2) % 1120, 115, 1);
  drawCloud(570 - (cameraX * 0.15) % 1300, 190, 0.72);
  drawCloud(920 - (cameraX * 0.18) % 1200, 125, 0.88);
}

function drawHills(color, baseY, speed, size) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = -size; x <= WIDTH + size; x += size) {
    const worldX = x + ((cameraX * speed) % size);
    ctx.quadraticCurveTo(worldX + size / 2, baseY - size * 0.55, worldX + size, baseY);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.64)";
  ctx.beginPath();
  ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 24 * scale, y - 9 * scale, 29 * scale, 0, Math.PI * 2);
  ctx.arc(x + 54 * scale, y, 21 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatform(platform) {
  const x = platform.x - cameraX;
  if (x + platform.w < 0 || x > WIDTH) return;
  ctx.fillStyle = platform.h > 30 ? "#426b69" : "#547e76";
  roundedRect(x, platform.y, platform.w, platform.h, 7);
  ctx.fill();
  ctx.fillStyle = "#84c59d";
  roundedRect(x, platform.y, platform.w, 9, 5);
  ctx.fill();
  ctx.fillStyle = "rgba(221, 238, 193, 0.55)";
  for (let mark = 0; mark < platform.w; mark += 38) {
    ctx.fillRect(x + mark + 9, platform.y + 20, 12, 3);
  }
}

function drawCoin(coin) {
  if (coin.collected) return;
  const x = coin.x - cameraX;
  if (x < -25 || x > WIDTH + 25) return;
  const pulse = 1 + Math.sin(elapsed / 180 + coin.x) * 0.1;
  ctx.save();
  ctx.translate(x, coin.y);
  ctx.scale(pulse, 1);
  ctx.fillStyle = "#f4c85d";
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff0a8";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#d99b37";
  ctx.fillRect(-1, -6, 2, 12);
  ctx.restore();
}

function drawPlayer() {
  const x = player.x - cameraX;
  const y = player.y;
  const bob = player.grounded && Math.abs(player.vx) > 0 ? Math.sin(elapsed / 55) * 2 : 0;
  ctx.save();
  ctx.translate(x + player.w / 2, y + bob);
  if (player.invulnerableMs > 0 && Math.floor(elapsed / 90) % 2 === 0) ctx.globalAlpha = 0.45;

  ctx.fillStyle = "rgba(33, 64, 77, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, player.h + 2, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f37d68";
  roundedRect(-15, 5, 30, 34, 9);
  ctx.fill();
  ctx.fillStyle = "#f5bf91";
  roundedRect(-12, -9, 24, 23, 9);
  ctx.fill();
  ctx.fillStyle = "#fff8ed";
  ctx.beginPath();
  ctx.arc(player.facing * 4, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#34475b";
  ctx.beginPath();
  ctx.arc(player.facing * 5 + player.facing, 0, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#426b69";
  roundedRect(-14, 34, 12, 9, 4);
  ctx.fill();
  roundedRect(3, 34, 12, 9, 4);
  ctx.fill();
  if (player.attackMs > 0) {
    ctx.strokeStyle = "#fff2a1";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.facing * 28, 17, 24, player.facing > 0 ? -0.8 : Math.PI - 0.8, player.facing > 0 ? 0.8 : Math.PI + 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  if (!enemy.alive) return;
  const x = enemy.x - cameraX;
  if (x + enemy.w < 0 || x > WIDTH) return;
  ctx.save();
  ctx.translate(x + enemy.w / 2, enemy.y);
  ctx.fillStyle = "#523c63";
  roundedRect(-16, 8, 32, 27, 10);
  ctx.fill();
  ctx.fillStyle = "#ef8b79";
  ctx.beginPath();
  ctx.arc(0, 9, 16, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#fff4df";
  ctx.beginPath();
  ctx.arc(-6, 18, 3, 0, Math.PI * 2);
  ctx.arc(6, 18, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#392e4e";
  ctx.beginPath();
  ctx.arc(-6, 18, 1.5, 0, Math.PI * 2);
  ctx.arc(6, 18, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGoal() {
  const x = WORLD_WIDTH - 105 - cameraX;
  ctx.fillStyle = "#edf3dc";
  ctx.fillRect(x, 355, 5, 110);
  ctx.fillStyle = "#f37d68";
  ctx.beginPath();
  ctx.moveTo(x + 5, 358);
  ctx.lineTo(x + 48, 371);
  ctx.lineTo(x + 5, 385);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#edf3dc";
  ctx.beginPath();
  ctx.arc(x + 2, 352, 6, 0, Math.PI * 2);
  ctx.fill();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function render() {
  drawBackground();
  for (const platform of platforms) drawPlatform(platform);
  for (const coin of coins) drawCoin(coin);
  for (const enemy of enemies) drawEnemy(enemy);
  drawGoal();
  drawPlayer();
}

function frame(time) {
  const delta = time - (lastTime || time);
  lastTime = time;
  update(delta);
  render();
  requestAnimationFrame(frame);
}

coins = coinSpots.map((coin) => ({ ...coin, collected: false }));
coinCount.textContent = `0 / ${coins.length}`;
requestAnimationFrame(frame);
