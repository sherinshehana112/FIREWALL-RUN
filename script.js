const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startMsg = document.getElementById('startMsg');
const overMsg = document.getElementById('overMsg');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');

let W = 0, H = 0, DPR = 1;
function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);

/* ---------- state ---------- */
const GRAVITY = 1600;
const FLAP_V = -430;
let bird = { x: 0, y: 0, vy: 0, r: 14 };
let pipes = [];
let particles = [];
let bgDots = [];
let score = 0;
let best = parseInt(localStorage.getItem('firewallrun_best') || '0', 10);
let state = 'start'; // start | playing | over
let pipeGapBase = 190;
let pipeSpeed = 190;
let spawnTimer = 0;
let elapsed = 0;
let overAt = 0;

function resetGame(){
  bird = { x: W * 0.28, y: H * 0.4, vy: 0, r: 14 };
  pipes = [];
  particles = [];
  score = 0;
  pipeSpeed = 190;
  spawnTimer = 0;
  elapsed = 0;
  scoreEl.textContent = '0';
}

function initBgDots(){
  bgDots = [];
  for (let i = 0; i < 60; i++){
    bgDots.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.6 + 0.4,
      speed: 20 + Math.random() * 40
    });
  }
}

function flap(){
  if (state === 'start'){
    state = 'playing';
    startMsg.hidden = true;
    bird.vy = FLAP_V;
    return;
  }
  if (state === 'over'){
    if (performance.now() - overAt < 400) return;
    overMsg.hidden = true;
    resetGame();
    state = 'playing';
    bird.vy = FLAP_V;
    return;
  }
  bird.vy = FLAP_V;
  for (let i = 0; i < 6; i++){
    particles.push({
      x: bird.x - bird.r * 0.6,
      y: bird.y + (Math.random() - 0.5) * 8,
      vx: -60 - Math.random() * 60,
      vy: (Math.random() - 0.5) * 60,
      life: 1
    });
  }
}

window.addEventListener('pointerdown', flap);
window.addEventListener('keydown', e => { if (e.code === 'Space') flap(); });

function spawnPipe(){
  const gap = Math.max(130, pipeGapBase - score * 1.5);
  const margin = 60;
  const gapY = margin + Math.random() * (H - margin * 2 - gap);
  pipes.push({ x: W + 40, gapY, gap, width: 62, passed: false });
}

function update(dt){
  elapsed += dt;
  bird.vy += GRAVITY * dt;
  bird.y += bird.vy * dt;

  if (bird.y - bird.r < 0){ bird.y = bird.r; bird.vy = 0; }
  if (bird.y + bird.r > H){ triggerGameOver(); return; }

  spawnTimer -= dt;
  if (spawnTimer <= 0){
    spawnPipe();
    spawnTimer = Math.max(1.1, 1.7 - score * 0.02);
  }

  pipes.forEach(p => { p.x -= pipeSpeed * dt; });
  pipes = pipes.filter(p => p.x + p.width > -20);

  for (const p of pipes){
    if (!p.passed && p.x + p.width < bird.x){
      p.passed = true;
      score++;
      scoreEl.textContent = score;
    }
    const withinX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + p.width;
    if (withinX){
      const hitsTop = bird.y - bird.r < p.gapY;
      const hitsBottom = bird.y + bird.r > p.gapY + p.gap;
      if (hitsTop || hitsBottom){ triggerGameOver(); return; }
    }
  }

  pipeSpeed = 190 + Math.min(120, score * 4);

  particles.forEach(pt => {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt * 2;
  });
  particles = particles.filter(pt => pt.life > 0);

  bgDots.forEach(d => {
    d.x -= d.speed * dt;
    if (d.x < 0) d.x = W;
  });
}

function triggerGameOver(){
  if (state !== 'playing') return;
  state = 'over';
  overAt = performance.now();
  if (score > best){
    best = score;
    localStorage.setItem('firewallrun_best', String(best));
  }
  finalScoreEl.textContent = score;
  bestScoreEl.textContent = best;
  setTimeout(() => { overMsg.hidden = false; }, 300);
}

/* ---------- render ---------- */
function drawBackground(){
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0e1a');
  g.addColorStop(1, '#150a24');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0,229,255,0.35)';
  bgDots.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPipes(){
  pipes.forEach(p => {
    ctx.save();
    ctx.shadowColor = 'rgba(255,46,154,0.6)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#1a0e2e';
    ctx.strokeStyle = '#ff2e9a';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.rect(p.x, 0, p.width, p.gapY);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(p.x, p.gapY + p.gap, p.width, H - (p.gapY + p.gap));
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawBird(){
  particles.forEach(pt => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life);
    ctx.fillStyle = '#ffb000';
    ctx.shadowColor = '#ffb000';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  const angle = Math.max(-0.5, Math.min(0.9, bird.vy / 500));
  ctx.translate(bird.x, bird.y);
  ctx.rotate(angle);
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#eaf0ff';
  ctx.beginPath();
  ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.arc(bird.r * 0.4, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

let lastTime = null;
function loop(now){
  if (lastTime === null) lastTime = now;
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  if (state === 'playing') update(dt);
  else {
    bgDots.forEach(d => { d.x -= d.speed * dt * 0.3; if (d.x < 0) d.x = W; });
    if (state === 'start'){
      bird.y = H * 0.4 + Math.sin(now / 400) * 10;
    }
  }

  drawBackground();
  drawPipes();
  drawBird();

  requestAnimationFrame(loop);
}

resize();
initBgDots();
resetGame();
requestAnimationFrame(loop);
