// RidGame - Free Fire-style browser shooter
// game.js

const canvas = document.getElementById("game");
if (!canvas) throw new Error("Canvas with id='game' not found.");

const ctx = canvas.getContext("2d");

let W, H;
let running = true;
let score = 0;
let kills = 0;
let ammo = 30;
let reserveAmmo = 120;
let health = 100;
let reloading = false;
let reloadTimer = 0;
let lastTime = 0;
let spawnTimer = 0;
let shootTimer = 0;
let gameOver = false;

const keys = {};
const bullets = [];
const enemies = [];
const particles = [];

const player = {
  x: 0,
  y: 0,
  radius: 18,
  speed: 260,
  angle: 0
};

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;

  if (!player.x) {
    player.x = W / 2;
    player.y = H / 2;
  }
}

window.addEventListener("resize", resize);
resize();

document.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === "r") reload();

  if (e.code === "Space") {
    e.preventDefault();
    shoot();
  }
});

document.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

let mouseX = W / 2;
let mouseY = H / 2;
let firing = false;

canvas.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

canvas.addEventListener("mousedown", () => {
  firing = true;
});

window.addEventListener("mouseup", () => {
  firing = false;
});

canvas.addEventListener("touchstart", e => {
  const t = e.touches[0];
  mouseX = t.clientX;
  mouseY = t.clientY;
  firing = true;
}, { passive: true });

canvas.addEventListener("touchmove", e => {
  const t = e.touches[0];
  mouseX = t.clientX;
  mouseY = t.clientY;
}, { passive: true });

canvas.addEventListener("touchend", () => {
  firing = false;
});

function reload() {
  if (reloading || ammo >= 30 || reserveAmmo <= 0) return;

  reloading = true;
  reloadTimer = 1.2;
}

function shoot() {
  if (!running || gameOver || reloading) return;
  if (ammo <= 0) {
    reload();
    return;
  }

  const now = performance.now();

  if (now - shootTimer < 120) return;
  shootTimer = now;

  ammo--;

  const dx = mouseX - player.x;
  const dy = mouseY - player.y;
  const angle = Math.atan2(dy, dx);

  bullets.push({
    x: player.x + Math.cos(angle) * 25,
    y: player.y + Math.sin(angle) * 25,
    vx: Math.cos(angle) * 720,
    vy: Math.sin(angle) * 720,
    life: 1
  });

  for (let i = 0; i < 4; i++) {
    particles.push({
      x: player.x + Math.cos(angle) * 28,
      y: player.y + Math.sin(angle) * 28,
      vx: Math.cos(angle) * (80 + Math.random() * 120),
      vy: Math.sin(angle) * (80 + Math.random() * 120),
      life: 0.25
    });
  }
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);

  let x, y;

  if (side === 0) {
    x = -30;
    y = Math.random() * H;
  } else if (side === 1) {
    x = W + 30;
    y = Math.random() * H;
  } else if (side === 2) {
    x = Math.random() * W;
    y = -30;
  } else {
    x = Math.random() * W;
    y = H + 30;
  }

  enemies.push({
    x,
    y,
    radius: 20,
    speed: 55 + Math.random() * 45,
    health: 100
  });
}

function update(dt) {
  if (!running || gameOver) return;

  // Player movement
  let dx = 0;
  let dy = 0;

  if (keys["w"] || keys["arrowup"]) dy--;
  if (keys["s"] || keys["arrowdown"]) dy++;
  if (keys["a"] || keys["arrowleft"]) dx--;
  if (keys["d"] || keys["arrowright"]) dx++;

  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;
  }

  player.x = Math.max(25, Math.min(W - 25, player.x));
  player.y = Math.max(25, Math.min(H - 25, player.y));

  player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);

  if (firing) shoot();

  // Reload
  if (reloading) {
    reloadTimer -= dt;

    if (reloadTimer <= 0) {
      const needed = 30 - ammo;
      const amount = Math.min(needed, reserveAmmo);

      ammo += amount;
      reserveAmmo -= amount;
      reloading = false;
    }
  }

  // Enemy spawning
  spawnTimer -= dt;

  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(0.45, 1.4 - kills * 0.01);
  }

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (
      b.life <= 0 ||
      b.x < -50 ||
      b.x > W + 50 ||
      b.y < -50 ||
      b.y > H + 50
    ) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];

      if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 5) {
        e.health -= 50;
        bullets.splice(i, 1);

        if (e.health <= 0) {
          kills++;
          score += 100;

          for (let k = 0; k < 12; k++) {
            particles.push({
              x: e.x,
              y: e.y,
              vx: (Math.random() - 0.5) * 220,
              vy: (Math.random() - 0.5) * 220,
              life: 0.5
            });
          }

          enemies.splice(j, 1);
        }

        break;
      }
    }
  }

  // Enemies
  for (const e of enemies) {
    const ex = player.x - e.x;
    const ey = player.y - e.y;
    const distance = Math.hypot(ex, ey);

    if (distance > 1) {
      e.x += (ex / distance) * e.speed * dt;
      e.y += (ey / distance) * e.speed * dt;
    }

    if (distance < player.radius + e.radius) {
      health -= 30 * dt;

      if (health <= 0) {
        health = 0;
        gameOver = true;
      }
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawBackground() {
  ctx.fillStyle = "#10151c";
  ctx.fillRect(0, 0, W, H);

  // Ground grid
  ctx.strokeStyle = "#18232c";
  ctx.lineWidth = 1;

  const grid = 50;

  for (let x = 0; x < W; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let y = 0; y < H; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();

  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  // Body
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#2589ff";
  ctx.fill();

  // Gun
  ctx.fillStyle = "#d9e1e8";
  ctx.fillRect(8, -5, 30, 10);

  ctx.fillStyle = "#111";
  ctx.fillRect(30, -3, 12, 6);

  ctx.restore();
}

function drawEnemies() {
  for (const e of enemies) {
    const angle = Math.atan2(player.y - e.y, player.x - e.x);

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#e53935";
    ctx.fill();

    ctx.fillStyle = "#222";
    ctx.fillRect(8, -4, 24, 8);

    ctx.restore();

    // Health bar
    ctx.fillStyle = "#222";
    ctx.fillRect(e.x - 22, e.y - 30, 44, 5);

    ctx.fillStyle = "#35d05f";
    ctx.fillRect(e.x - 22, e.y - 30, 44 * (e.health / 100), 5);
  }
}

function drawBullets() {
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd54a";
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = "#ffb300";

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(15, 15, 210, 110);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px Arial";

  ctx.fillText("RIDGAME", 30, 42);
  ctx.fillText("Kills: " + kills, 30, 68);
  ctx.fillText("Score: " + score, 30, 94);

  // Health
  ctx.fillStyle = "#333";
  ctx.fillRect(30, 102, 170, 12);

  ctx.fillStyle = "#25d366";
  ctx.fillRect(30, 102, 170 * (health / 100), 12);

  // Ammo
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(W - 170, H - 80, 150, 60);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px Arial";
  ctx.fillText(ammo + " / " + reserveAmmo, W - 150, H - 42);

  if (reloading) {
    ctx.font = "bold 16px Arial";
    ctx.fillText("RELOADING...", W - 150, H - 18);
  }
}

function drawCrosshair() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(mouseX, mouseY, 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mouseX - 20, mouseY);
  ctx.lineTo(mouseX - 7, mouseY);
  ctx.moveTo(mouseX + 7, mouseY);
  ctx.lineTo(mouseX + 20, mouseY);
  ctx.moveTo(mouseX, mouseY - 20);
  ctx.lineTo(mouseX, mouseY - 7);
  ctx.moveTo(mouseX, mouseY + 7);
  ctx.lineTo(mouseX, mouseY + 20);
  ctx.stroke();
}

function drawGameOver() {
  if (!gameOver) return;

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px Arial";
  ctx.fillText("GAME OVER", W / 2, H / 2 - 50);

  ctx.font = "24px Arial";
  ctx.fillText("Score: " + score, W / 2, H / 2);

  ctx.fillText("Kills: " + kills, W / 2, H / 2 + 40);

  ctx.font = "18px Arial";
  ctx.fillText("Tap or press ENTER to restart", W / 2, H / 2 + 90);

  ctx.textAlign = "left";
}

function restart() {
  player.x = W / 2;
  player.y = H / 2;

  health = 100;
  ammo = 30;
  reserveAmmo = 120;
  score = 0;
  kills = 0;

  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;

  gameOver = false;
  reloading = false;
  spawnTimer = 0;
}

window.addEventListener("keydown", e => {
  if (e.key === "Enter" && gameOver) {
    restart();
  }
});

canvas.addEventListener("click", () => {
  if (gameOver) restart();
});

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;

  update(dt);

  drawBackground();
  drawBullets();
  drawEnemies();
  drawParticles();
  drawPlayer();
  drawHUD();
  drawCrosshair();
  drawGameOver();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
