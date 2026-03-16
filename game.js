// ══════════════════════════════════════════
// game.js — ZARVEN Level 2: Mass Matters
// Game logic: Human vs Robot / Human vs Human
// ══════════════════════════════════════════

// ── CANVAS SETUP ──────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const CELL = 20;
const COLS = 36;
const ROWS = 26;
canvas.width  = COLS * CELL;
canvas.height = ROWS * CELL;

// ── DIRECTIONS ───────────────────────────
// Using strings (not arrays) so equality checks work correctly
// e.g.  dir === 'UP'  works;  [0,-1] === [0,-1]  does NOT (different references)
const DIR = {
  UP:    'UP',
  DOWN:  'DOWN',
  LEFT:  'LEFT',
  RIGHT: 'RIGHT',
};

// Convert direction string → [dx, dy] vector for movement
const DIR_VEC = {
  UP:    [0, -1],
  DOWN:  [0,  1],
  LEFT:  [-1, 0],
  RIGHT: [1,  0],
};

// Opposite direction map — used to block reversal
const OPPOSITE = {
  UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
};

// ── GAME STATE ────────────────────────────
let gameMode   = null;   // 'HvM' or 'HvH'
let rangeKey   = null;   // '1-10', '11-20', '1-20'
let pool       = [];     // active element pool

let snake1, snake2;
let nextDir1, nextDir2;
// Input queues so fast key presses between ticks are not lost
let inputQueue1 = [];
let inputQueue2 = [];
let orbs       = [];
let score1     = 0;
let score2     = 0;
let lives1     = 3;
let lives2     = 3;
let timeLeft   = 90;

let timerInterval  = null;
let gameLoopTimer  = null;
let nobleTimer     = null;
let running        = false;
let hudTimeout     = null;

// ══════════════════════════════════════════
// MENU INTERACTIONS
// ══════════════════════════════════════════

function selectMode(m) {
  gameMode = m;
  document.getElementById('cardHvM').classList.toggle('selected', m === 'HvM');
  document.getElementById('cardHvH').classList.toggle('selected', m === 'HvH');
  document.getElementById('p2hint').textContent =
    m === 'HvH' ? 'Player 2: Arrow keys' : 'Robot plays automatically';
  checkStartReady();
}

function selectRange(key, btn) {
  rangeKey = key;
  document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  checkStartReady();
}

function checkStartReady() {
  document.getElementById('startBtn').disabled = !(gameMode && rangeKey);
}

// ══════════════════════════════════════════
// GAME START / RESTART
// ══════════════════════════════════════════

function startGame() {
  pool = ELEMENT_RANGES[rangeKey];
  updatePlayerLabels();
  showScreen('gameScreen');
  initState();
  runCountdown(3, beginLoop);
}

function restartGame() {
  initState();
  runCountdown(3, beginLoop);
}

function backToMenu() {
  stopAll();
  showScreen('menuScreen');
}

function updatePlayerLabels() {
  const p2name = gameMode === 'HvM' ? 'ROBOT 🤖' : 'PLAYER 2';
  document.getElementById('p1label').textContent  = 'PLAYER 1';
  document.getElementById('p2label').textContent  = p2name;
  document.getElementById('rp1name').textContent  = 'PLAYER 1';
  document.getElementById('rp2name').textContent  = p2name;
}

// ── Initialise game state ─────────────────
function initState() {
  score1 = score2 = 0;
  lives1 = lives2 = 3;
  timeLeft = 90;
  orbs = [];
  running = false;

  snake1 = {
    body:   [{ x: 5, y: Math.floor(ROWS / 2) }],
    dir:    'RIGHT',
    alive:  true,
    frozen: false,
  };
  snake2 = {
    body:   [{ x: COLS - 6, y: Math.floor(ROWS / 2) }],
    dir:    'LEFT',
    alive:  true,
    frozen: false,
  };
  nextDir1 = 'RIGHT';
  nextDir2 = 'LEFT';
  inputQueue1 = [];
  inputQueue2 = [];

  spawnOrbs(5);
  updateHUD();
  drawFrame();
}

// ── Countdown then start ──────────────────
function runCountdown(n, callback) {
  const overlay = document.getElementById('cdOverlay');
  const numEl   = document.getElementById('cdNum');
  overlay.classList.remove('hidden');
  numEl.textContent = n > 0 ? n : 'GO!';

  // Force CSS animation replay
  numEl.style.animation = 'none';
  void numEl.offsetWidth;
  numEl.style.animation = '';

  if (n <= 0) {
    setTimeout(() => {
      overlay.classList.add('hidden');
      callback();
    }, 600);
    return;
  }
  setTimeout(() => runCountdown(n - 1, callback), 800);
}

// ── Begin game loop ───────────────────────
function beginLoop() {
  running = true;

  timerInterval = setInterval(() => {
    timeLeft--;
    const el = document.getElementById('timerVal');
    el.textContent = timeLeft;
    el.className   = timeLeft <= 15 ? 'urgent' : '';
    if (timeLeft <= 0) endGame('time');
  }, 1000);

  // Game runs at ~5 ticks/sec (200ms) — slow enough for human to react
  gameLoopTimer = setInterval(gameLoop, 200);

  // Noble gas spawns every 20 seconds
  nobleTimer = setInterval(spawnNobleGas, 20000);
}

function stopAll() {
  running = false;
  clearInterval(timerInterval);
  clearInterval(gameLoopTimer);
  clearInterval(nobleTimer);
}

// ══════════════════════════════════════════
// ORB SPAWNING
// ══════════════════════════════════════════

function spawnOrbs(count) {
  for (let i = 0; i < count; i++) {
    const pos = randomFreeCell();
    if (!pos) continue;
    const elem = pool[randInt(0, pool.length)];
    orbs.push({ x: pos.x, y: pos.y, elem, noble: false });
  }
}

function spawnNobleGas() {
  if (!running) return;
  const nobles = pool.filter(e => e.noble);
  if (!nobles.length) return;

  const elem = nobles[randInt(0, nobles.length)];
  const pos  = randomFreeCell();
  if (!pos) return;

  const orb = { x: pos.x, y: pos.y, elem, noble: true };
  orbs.push(orb);

  // Noble gas disappears after 9 seconds if not eaten
  setTimeout(() => {
    const idx = orbs.indexOf(orb);
    if (idx > -1) orbs.splice(idx, 1);
  }, 9000);
}

function randomFreeCell() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const x = randInt(1, COLS - 1);
    const y = randInt(1, ROWS - 1);
    if (!orbs.some(o => o.x === x && o.y === y)) return { x, y };
  }
  return null;
}

// ══════════════════════════════════════════
// MAIN GAME LOOP
// ══════════════════════════════════════════

function gameLoop() {
  if (!running) return;

  // Flush input queues — apply next buffered direction for each player
  if (inputQueue1.length > 0) nextDir1 = inputQueue1.shift();
  if (inputQueue2.length > 0) nextDir2 = inputQueue2.shift();

  // Robot AI moves snake2
  if (gameMode === 'HvM' && snake2.alive && !snake2.frozen) {
    robotAI();
  }

  // Move snakes
  if (snake1.alive && !snake1.frozen) moveSnake(snake1, nextDir1, 1);
  if (snake2.alive && !snake2.frozen) moveSnake(snake2, nextDir2, 2);

  // Keep board populated
  const normalOrbs = orbs.filter(o => !o.noble);
  if (normalOrbs.length < 3) spawnOrbs(2);

  drawFrame();
  updateHUD();
}

// ── Move a snake one step ─────────────────
function moveSnake(snake, dir, playerNum) {
  snake.dir = dir;
  const vec  = DIR_VEC[dir];
  const head = snake.body[0];
  const nx   = head.x + vec[0];
  const ny   = head.y + vec[1];

  // Wall collision
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
    handleDeath(snake, playerNum);
    return;
  }
  // Self collision
  if (snake.body.some(s => s.x === nx && s.y === ny)) {
    handleDeath(snake, playerNum);
    return;
  }
  // Other snake collision
  const other = playerNum === 1 ? snake2 : snake1;
  if (other.alive && other.body.some(s => s.x === nx && s.y === ny)) {
    handleDeath(snake, playerNum);
    return;
  }

  // Move head
  snake.body.unshift({ x: nx, y: ny });

  // Check orb eating
  const orbIdx = orbs.findIndex(o => o.x === nx && o.y === ny);
  if (orbIdx !== -1) {
    const orb = orbs.splice(orbIdx, 1)[0];
    eatOrb(snake, orb, playerNum);
  } else {
    snake.body.pop(); // no grow, remove tail
  }
}

// ── Eat an orb ────────────────────────────
function eatOrb(snake, orb, playerNum) {
  const elem = orb.elem;

  if (orb.noble) {
    // Noble gas: freeze the snake for 2 seconds
    freezeSnake(snake);
    showHUD(`⚠  ${elem.name} — Noble gas! FROZEN 2s`);
    return;
  }

  // Normal element: grow by floor(mass / 10), min 1
  const growBy = Math.max(1, Math.floor(elem.mass / 10));
  const tail   = snake.body[snake.body.length - 1];
  for (let i = 0; i < growBy; i++) {
    snake.body.push({ ...tail });
  }

  // Add score = atomic mass
  if (playerNum === 1) score1 += elem.mass;
  else                  score2 += elem.mass;

  showHUD(`⚛  ${elem.sym} · ${elem.name}  (mass ${elem.mass})  —  ${elem.example}`);
}

// ── Freeze a snake ────────────────────────
function freezeSnake(snake) {
  snake.frozen = true;
  const banner = document.getElementById('freezeBanner');
  banner.style.display = 'flex';
  setTimeout(() => {
    snake.frozen   = false;
    banner.style.display = 'none';
  }, 2000);
}

// ── Handle death ──────────────────────────
function handleDeath(snake, playerNum) {
  if (playerNum === 1) {
    lives1--;
    if (lives1 <= 0) {
      snake.alive = false;
    } else {
      respawnSnake(snake, 5, Math.floor(ROWS / 2), 'RIGHT');
      inputQueue1 = [];
      nextDir1 = 'RIGHT';
    }
  } else {
    lives2--;
    if (lives2 <= 0) {
      snake.alive = false;
    } else {
      respawnSnake(snake, COLS - 6, Math.floor(ROWS / 2), 'LEFT');
      inputQueue2 = [];
      nextDir2 = 'LEFT';
    }
  }

  updateHUD();
  if (!snake1.alive && !snake2.alive) endGame('both_dead');
}

function respawnSnake(snake, x, y, dir) {
  snake.body   = [{ x, y }];
  snake.dir    = dir;
  snake.alive  = true;
  snake.frozen = false;
}

// ══════════════════════════════════════════
// ROBOT AI
// ══════════════════════════════════════════
//
// Strategy: steer toward the heaviest non-noble orb.
// Avoids reversing direction and walls.

function robotAI() {
  const head    = snake2.body[0];
  const targets = orbs.filter(o => !o.noble);
  if (!targets.length) return;

  const best = targets.reduce((a, b) => b.elem.mass > a.elem.mass ? b : a);
  const dx = best.x - head.x;
  const dy = best.y - head.y;

  const preferred = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    preferred.push(dx > 0 ? 'RIGHT' : 'LEFT');
    preferred.push(dy > 0 ? 'DOWN'  : 'UP');
  } else {
    preferred.push(dy > 0 ? 'DOWN'  : 'UP');
    preferred.push(dx > 0 ? 'RIGHT' : 'LEFT');
  }
  preferred.push('RIGHT', 'LEFT', 'UP', 'DOWN');

  for (const d of preferred) {
    // Cannot reverse into itself
    if (d === OPPOSITE[snake2.dir]) continue;
    const vec = DIR_VEC[d];
    const nx = head.x + vec[0];
    const ny = head.y + vec[1];
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
    if (snake2.body.some(s => s.x === nx && s.y === ny)) continue;
    nextDir2 = d;
    break;
  }
}

// ══════════════════════════════════════════
// DRAW
// ══════════════════════════════════════════

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Checkerboard background
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#060d1a' : '#070f1e';
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }

  // Draw orbs
  orbs.forEach(orb => drawOrb(orb));

  // Draw snakes
  if (snake1.alive) drawSnake(snake1, '#1a8fff', '#0a5fa0', snake1.frozen ? '#aaddff' : null);
  if (snake2.alive) drawSnake(snake2, '#ff6b35', '#aa3500', snake2.frozen ? '#ffbbaa' : null);
}

// ── Draw one element orb ──────────────────
function drawOrb(orb) {
  const px   = orb.x * CELL + CELL / 2;
  const py   = orb.y * CELL + CELL / 2;
  const elem = orb.elem;

  // Visual radius scaled by mass
  const r = Math.min(CELL * 0.46, 4 + elem.mass * 0.19);

  if (orb.noble) {
    // Noble gas: dashed silver circle
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#888888';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(140,140,140,0.15)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#aaaaaa';
    ctx.font      = `bold ${Math.max(7, r * 0.6)}px Share Tech Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(elem.sym, px, py);
    ctx.restore();
    return;
  }

  // Normal element: glow ring, symbol, mass
  // Color: blue (light) → green → red (heavy)
  const t   = Math.min(1, elem.mass / 40);
  const col = t < 0.5
    ? lerpColor('#1a8fff', '#39bb22', t * 2)
    : lerpColor('#39bb22', '#e24b4a', (t - 0.5) * 2);

  // Glow
  ctx.strokeStyle = col;
  ctx.lineWidth   = 1.5;
  ctx.fillStyle   = col + '22';
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Symbol
  ctx.fillStyle    = col;
  ctx.font         = `bold ${Math.max(7, r * 0.65)}px Share Tech Mono, monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(elem.sym, px, py - r * 0.1);

  // Mass
  ctx.fillStyle = '#888888';
  ctx.font      = `${Math.max(5, r * 0.4)}px Share Tech Mono, monospace`;
  ctx.fillText(elem.mass, px, py + r * 0.55);
}

// ── Draw one snake ────────────────────────
function drawSnake(snake, headColor, bodyColor, frozenColor) {
  snake.body.forEach((seg, i) => {
    const px = seg.x * CELL + 1;
    const py = seg.y * CELL + 1;
    const sz = CELL - 2;

    ctx.fillStyle  = frozenColor || (i === 0 ? headColor : bodyColor);
    ctx.globalAlpha = i === 0 ? 1 : Math.max(0.35, 0.85 - i * 0.012);
    roundRect(ctx, px, py, sz, sz, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (i === 0) {
      // Eyes
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.arc(px + sz * 0.3, py + sz * 0.32, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + sz * 0.7, py + sz * 0.32, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// ══════════════════════════════════════════
// END GAME
// ══════════════════════════════════════════

function endGame(reason) {
  stopAll();

  const p2name = gameMode === 'HvM' ? 'Robot' : 'Player 2';

  let title, winner;
  if (reason === 'time')       title = "Time's Up!";
  else if (reason === 'both_dead') title = "Game Over";
  else                          title = "Game Over";

  if      (score1 > score2) winner = '🏆  Player 1 wins!';
  else if (score2 > score1) winner = `🏆  ${p2name} wins!`;
  else                       winner = "🤝  It's a draw!";

  document.getElementById('resultTitle').textContent = title;
  document.getElementById('winnerLine').textContent  = winner;
  document.getElementById('rp1score').textContent    = score1;
  document.getElementById('rp2score').textContent    = score2;

  const p1card = document.querySelector('.res-card.p1');
  const p2card = document.querySelector('.res-card.p2');
  p1card.classList.toggle('winner', score1 >= score2 && score1 !== score2);
  p2card.classList.toggle('winner', score2 > score1);

  setTimeout(() => showScreen('resultScreen'), 600);
}

// ══════════════════════════════════════════
// HUD BANNER
// ══════════════════════════════════════════

function showHUD(msg) {
  const el = document.getElementById('hudBanner');
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(hudTimeout);
  hudTimeout = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}

// ══════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════

function updateHUD() {
  document.getElementById('score1').textContent  = score1;
  document.getElementById('score2').textContent  = score2;
  document.getElementById('lives1').textContent  = '❤️'.repeat(Math.max(0, lives1));
  document.getElementById('lives2').textContent  = '❤️'.repeat(Math.max(0, lives2));
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ══════════════════════════════════════════
// KEYBOARD INPUT
// Uses string direction names for reliable comparison.
// Inputs are pushed into a queue (max 2) so fast presses
// between game ticks are not lost.
// ══════════════════════════════════════════

function queueDir(queue, currentDir, newDir) {
  // Don't allow reversing — compare against last queued or current dir
  const lastDir = queue.length > 0 ? queue[queue.length - 1] : currentDir;
  if (newDir === OPPOSITE[lastDir]) return;
  if (queue.length < 2) queue.push(newDir);
}

document.addEventListener('keydown', (e) => {
  // Accept input even during countdown so player is ready
  if (!snake1) return;

  // Player 1: W A S D
  switch (e.key) {
    case 'w': case 'W': queueDir(inputQueue1, snake1.dir, 'UP');    break;
    case 's': case 'S': queueDir(inputQueue1, snake1.dir, 'DOWN');  break;
    case 'a': case 'A': queueDir(inputQueue1, snake1.dir, 'LEFT');  break;
    case 'd': case 'D': queueDir(inputQueue1, snake1.dir, 'RIGHT'); break;
  }

  // Player 2: Arrow keys — Human vs Human only
  if (gameMode === 'HvH' && snake2) {
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); queueDir(inputQueue2, snake2.dir, 'UP');    break;
      case 'ArrowDown':  e.preventDefault(); queueDir(inputQueue2, snake2.dir, 'DOWN');  break;
      case 'ArrowLeft':  e.preventDefault(); queueDir(inputQueue2, snake2.dir, 'LEFT');  break;
      case 'ArrowRight': e.preventDefault(); queueDir(inputQueue2, snake2.dir, 'RIGHT'); break;
    }
  }
});

// ══════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);       ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);   ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);       ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);           ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return '#' + ((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0');
}
