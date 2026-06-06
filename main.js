// =====================
// CANVAS & IMAGES
// =====================
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W, H;

function resize(){
  const wrap = document.getElementById('cv-wrap');
  W = wrap.clientWidth;
  H = wrap.clientHeight;
  cv.width = W; cv.height = H;
}

// Load meat image
const imgMeat = new Image();
imgMeat.src = 'meet.png'; // Make sure this file exists

// =====================
// GAME STATE
// =====================
const GAME_SEC = 45;
let timeLeft = GAME_SEC;
let score = 0;
let combo = 1;
let successCount = 0;
let missCount = 0;
let gameActive = false;
let gameOver = false;
let rafId, lastTs;

// Food state machine
const FOODS = ['steak']; // Array with single element to reuse doToss logic
let food = {
  emoji: 'steak', // No longer an emoji, but a key for image
  phase: 'idle',   // idle | tossed | flying | catchable | caught | missed
  y: 0,            // 0=pan, 1=peak
  vy: 0,
  rotation: 0,
  rotSpeed: 0,
  x: 0,
  scale: 1,
};

// pan
let panAngle = 0;   // visual tilt in degrees
let panAngleTarget = 0;
let basePanAngle = 0;

// particles
let particles = [];

let cooldown = 0;

// =====================
// CONTROLS
// =====================
const strengthRange = document.getElementById('strength-range');
const angleRange = document.getElementById('angle-range');
const strengthValue = document.getElementById('strength-value');
const angleValue = document.getElementById('angle-value');
const tossBtn = document.getElementById('toss-btn');
const catchBtn = document.getElementById('catch-btn');
let tossPower = 0.5;

strengthRange.addEventListener('input', e => {
  tossPower = Number(e.target.value) / 100;
  strengthValue.textContent = `${e.target.value}%`;
});
angleRange.addEventListener('input', e => {
  panAngleTarget = Number(e.target.value);
  angleValue.textContent = `${e.target.value}°`;
});

tossBtn.addEventListener('click', () => {
  if(!gameActive || gameOver) return;
  if(cooldown <= 0 && food.phase === 'idle') doToss(tossPower);
});
catchBtn.addEventListener('click', () => {
  if(!gameActive || gameOver) return;
  if(food.phase === 'catchable') doCatch();
});

cv.addEventListener('click', e => {
  if(!gameActive) return;
  if(food.phase === 'catchable') doCatch();
});

// =====================
// GAME ACTIONS
// =====================
function doToss(power){
  food.phase = 'flying';
  food.emoji = 'steak';
  food.y = 0;
  food.vy = -(5.0 + power * 4.0); // pixels per frame in normalized space
  food.rotation = 0;
  food.rotSpeed = (Math.random()-0.5) * 25 * (0.5 + power);
  
  // 角度に基づいて難度を増加：角度が大きいほどx方向のオフセット幅が増える
  const angleDifficulty = Math.abs(panAngleTarget) / 25; // 0-1
  const baseOffset = 30;
  const maxOffset = 80;
  const offset = baseOffset + angleDifficulty * (maxOffset - baseOffset);
  food.x = W/2 + (Math.random()-0.5) * offset;
  
  food.scale = 1;
  cooldown = 0.3;
  basePanAngle = -25;
  spawnParticles('toss');
}

function doCatch(){
  if(food.phase !== 'catchable') return;
  food.phase = 'caught';
  combo = Math.min(combo + 1, 10);
  
  // 難度計算：角度と強さに基づいてボーナス倍率を決定
  const angleDifficulty = Math.abs(panAngleTarget) / 25; // 0-1: 角度が大きいほど難度高
  const strengthDiff = Math.abs(tossPower - 0.5) / 0.5; // 0-1: 50%から離れるほど難度高
  const difficultyBonus = 1.0 + (Math.min(angleDifficulty, 1) + Math.min(strengthDiff, 1)) * 0.75;
  
  const basePts = 100 * combo;
  const pts = Math.floor(basePts * difficultyBonus);
  score += pts;
  successCount++;
  document.getElementById('hval-score').textContent = score;
  document.getElementById('hval-combo').textContent = '×'+combo;
  cooldown = 0.5;
  basePanAngle = 10;
  spawnParticles('catch');
  showComboFlash(combo, pts, difficultyBonus);
}

function doMiss(){
  food.phase = 'missed';
  combo = 1;
  missCount++;
  document.getElementById('hval-combo').textContent = '×1';
  basePanAngle = 35;
  spawnParticles('miss');
  cooldown = 0.6;
}

function showComboFlash(c, pts, difficultyBonus=1.0){
  const el = document.getElementById('combo-flash');
  const diffText = difficultyBonus > 1.5 ? '🌟' : difficultyBonus > 1.25 ? '⭐' : '';
  const comboText = c >= 5 ? `🔥 ${c}COMBO!! +${pts}pts` : c >= 3 ? `✨ ${c}コンボ! +${pts}pts` : `+${pts}pts`;
  const text = diffText ? `${diffText} ${comboText}` : comboText;
  el.textContent = text;
  el.style.fontSize = c >= 5 ? '44px' : '38px';
  el.style.color = c >= 5 ? '#ffd166' : c >= 3 ? '#06d6a0' : '#f0f4f8';
  el.style.opacity = '1';
  el.style.transition = 'none';
  setTimeout(()=>{
    el.style.transition = 'opacity 0.6s';
    el.style.opacity = '0';
  }, 600);
}

// =====================
// PARTICLES
// =====================
function spawnParticles(type){
  const cx2 = W/2, cy2 = H*0.62;
  const count = type==='catch'?18:type==='miss'?10:8;
  for(let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2;
    const spd = 2.5 + Math.random()*4; // Slightly increased speed
    const col = type==='catch'?`hsl(${40+Math.random()*40},100%,60%)`:
                type==='miss'?`hsl(${350+Math.random()*20},90%,60%)`:
                `hsl(${30+Math.random()*30},90%,55%)`;
    particles.push({
      x:cx2, y:cy2,
      vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd - (type==='toss'?3:0), // More upward boost on toss
      life:1.2, col, r:3+Math.random()*4, // Slightly longer life
    });
  }
}

// =====================
// UPDATE
// =====================
function update(dt){
  cooldown = Math.max(0, cooldown - dt);

  // pan spring - increased constant for sharper response
  basePanAngle *= (1 - dt*20);
  panAngle = basePanAngle + panAngleTarget;

  // food physics
  const pHeight = H * 0.72; // Increased to match new velocities and gravity

  if(food.phase === 'flying' || food.phase === 'catchable'){
    food.y += food.vy * dt * 60;
    // Increased gravity for less 'mossari' feel
    food.vy += 12.0 * dt; 
    food.rotation += food.rotSpeed * dt;

    if(food.vy > 0){
      // Peak reached → now falling = catchable
      food.phase = 'catchable';
    }

    if(food.y >= 0 && food.phase === 'catchable'){
      // reached pan level — miss if not caught
      doMiss();
    }
  }

  if(food.phase === 'caught'){
    food.y += (0 - food.y) * dt * 15; // Increased catch pull
    food.rotation += food.rotSpeed * dt * 0.3;
    food.rotSpeed *= 0.85;
    if(Math.abs(food.y) < 1){
      food.phase = 'idle';
      food.y = 0;
    }
  }

  if(food.phase === 'missed'){
    food.y += 10 * dt * 60; // Faster fall
    food.rotation += food.rotSpeed * dt;
    if(food.y > H * 0.6){
      food.phase = 'idle';
      food.y = 0;
    }
  }

  // particles
  particles = particles.filter(p=>{
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.1; // Slightly more particle gravity
    p.life -= dt * 1.8;
    return p.life > 0;
  });

  // time
  if(gameActive && !gameOver){
    timeLeft = Math.max(0, timeLeft - dt);
    document.getElementById('hval-time').textContent = Math.ceil(timeLeft);
    if(timeLeft <= 0) endGame();
  }

  if(catchBtn){
    catchBtn.disabled = !(food.phase === 'catchable' && gameActive && !gameOver);
  }
  if(tossBtn){
    tossBtn.disabled = !(food.phase === 'idle' && cooldown <= 0 && gameActive && !gameOver);
  }
  
  // 難度表示の更新
  const angleDiff = Math.abs(panAngleTarget) / 25;
  const strengthDiff = Math.abs(tossPower - 0.5) / 0.5;
  const difficulty = Math.min((angleDiff + strengthDiff) / 2, 1.0);
  const diffDisplay = document.getElementById('hval-difficulty');
  if(diffDisplay){
    diffDisplay.textContent = `${Math.round(difficulty * 100)}%`;
  }
}

// =====================
// DRAW
// =====================
function draw(){
  ctx.clearRect(0,0,W,H);

  // bg gradient
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0f1923');
  bg.addColorStop(1,'#0a1118');
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,W,H);

  // grid lines (subtle)
  ctx.strokeStyle='rgba(255,255,255,0.03)';
  ctx.lineWidth=1;
  for(let y=0;y<H;y+=40){
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
  }

  // draw particles
  particles.forEach(p=>{
    ctx.globalAlpha = p.life * 0.9;
    ctx.fillStyle = p.col;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha = 1;

  const panCX = W/2;
  const panCY = H * 0.72;

  // food in air
  if(food.phase === 'flying' || food.phase === 'catchable' || food.phase === 'missed'){
    const foodY = panCY + food.y * 1;
    ctx.save();
    ctx.translate(food.x, foodY);
    ctx.rotate(food.rotation * Math.PI / 180);

    // catchable glow
    if(food.phase === 'catchable'){
      const pulse = 0.5+0.5*Math.sin(Date.now()/120);
      ctx.shadowColor = '#06d6a0';
      ctx.shadowBlur = 25 + pulse*20; // Increased shadow
    }

    drawFood(food.emoji,0,0,0);
    ctx.shadowBlur = 0;
    ctx.restore();

    // catch prompt
    if(food.phase === 'catchable'){
      const pulse = 0.6+0.4*Math.sin(Date.now()/100);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#06d6a0';
      ctx.font = 'bold 16px "Noto Sans JP"';
      ctx.textAlign = 'center';
      ctx.fillText('キャッチボタンで受け止めよう！', W/2, H*0.15);
      ctx.globalAlpha = 1;
    }
  }

  // ── PAN ──
  ctx.save();
  ctx.translate(panCX, panCY);
  ctx.rotate(panAngle * Math.PI / 180);

  // handle
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(90, 30);
  ctx.stroke();
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 8;
  ctx.stroke();

  // pan body shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  // pan body
  const panW = 110, panH = 28;
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.ellipse(0, 0, panW, panH, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // pan rim
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, panW, panH, 0, 0, Math.PI*2);
  ctx.stroke();

  // pan inner (hot surface)
  const panGrad = ctx.createRadialGradient(-10,-5,0,0,0,panW*0.85);
  panGrad.addColorStop(0,'#3a2010');
  panGrad.addColorStop(0.6,'#2a1808');
  panGrad.addColorStop(1,'#1a1008');
  ctx.fillStyle = panGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, panW-6, panH-6, 0, 0, Math.PI*2);
  ctx.fill();

  // food on pan (idle/caught)
  if(food.phase === 'idle' || food.phase === 'caught'){
    drawFood(food.emoji, food.y * 0.3, -4, 0);
  }

  // heat shimmer
  const shimmer = 0.15 + 0.1*Math.sin(Date.now()/200);
  ctx.strokeStyle = `rgba(255,100,20,${shimmer})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, panW-8, panH-8, 0, 0, Math.PI*2);
  ctx.stroke();

  ctx.restore();

  // flame under pan
  drawFlame(panCX, panCY + panH + 14);

  // phase instruction at bottom
  if(food.phase === 'idle' && gameActive && !gameOver){
    const pulse = 0.5+0.5*Math.sin(Date.now()/400);
    ctx.globalAlpha = 0.5 + pulse*0.4;
    ctx.fillStyle = '#ff6b2b';
    ctx.font = 'bold 13px "Noto Sans JP"';
    ctx.textAlign = 'center';
    ctx.fillText('投げるボタンを押して！', W/2, H*0.92);
    ctx.globalAlpha = 1;
  }
}


function drawFood(type, x, y, rot=0){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rot);

  // Original emoji drawing removed. Now using image_0.png.
  if (type === 'steak') {
    // Width is approximately 3 times original, maintaining aspect ratio roughly
    const drawW = 90;
    const drawH = 70;
    // Center image
    ctx.drawImage(imgMeat, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  
  ctx.restore();
}

function drawFlame(x, y){
  const t = Date.now()/300;
  for(let i=0;i<5;i++){
    const off = (i-2)*14;
    const h = 18+12*Math.sin(t+i*1.3);
    const grad = ctx.createLinearGradient(x+off, y, x+off, y-h);
    grad.addColorStop(0,'rgba(255,80,0,0.9)');
    grad.addColorStop(0.5,'rgba(255,160,0,0.6)');
    grad.addColorStop(1,'rgba(255,220,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x+off, y, 5, h/2, 0, 0, Math.PI*2);
    ctx.fill();
  }
}

// =====================
// LOOP
// =====================
function loop(ts){
  const dt = Math.min((ts-lastTs)/1000, 0.05);
  lastTs = ts;
  update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

// =====================
// START / END
// =====================
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
}

async function startGame(){
  showScreen('game');
  resize();

  score=0; combo=1; successCount=0; missCount=0;
  timeLeft=GAME_SEC; gameOver=false; gameActive=false;
  particles=[]; food.phase='idle'; food.emoji='steak'; food.y=0;
  panAngle=0; panAngleTarget=Number(angleRange.value); basePanAngle=0; cooldown=0;

  document.getElementById('hval-score').textContent='0';
  document.getElementById('hval-time').textContent=GAME_SEC;
  document.getElementById('hval-combo').textContent='×1';
  document.getElementById('res-ov').classList.remove('show');
  document.getElementById('combo-flash').style.opacity='0';

  await countdown();
  gameActive=true;
  lastTs=performance.now();
  rafId=requestAnimationFrame(loop);
}

async function countdown(){
  const ov=document.getElementById('cd-ov');
  const num=document.getElementById('cd-num');
  ov.classList.add('show');
  for(const t of ['3','2','1','🍳']){
    num.textContent=t;
    await sleep(700);
  }
  ov.classList.remove('show');
}

function endGame(){
  gameOver=true; gameActive=false;
  cancelAnimationFrame(rafId);

  const label =
    score>=3000?'👑 神の手！':
    score>=1800?'🔥 プロ級！':
    score>=900 ?'😊 なかなか！':
    '😅 要練習…';
  const emoji =
    score>=3000?'👑':score>=1800?'🏆':score>=900?'🙂':'😅';

  document.getElementById('res-emoji').textContent=emoji;
  document.getElementById('res-label').textContent=label;
  document.getElementById('res-score').textContent=score+'点';
  document.getElementById('res-detail').textContent=
    `成功 ${successCount}回 ／ ミス ${missCount}回 ／ 最大コンボ ×${combo}`;
  document.getElementById('res-ov').classList.add('show');
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// =====================
// EVENTS
// =====================
document.getElementById('start-btn').onclick=startGame;
document.getElementById('retry-btn').onclick=startGame;
document.getElementById('finish-btn').onclick=()=>{
  if(gameActive&&!gameOver) endGame();
};

document.addEventListener('touchmove', e => {
  const target = e.target;
  if(target.type !== 'range' && !target.closest('#controls')) {
    e.preventDefault();
  }
}, {passive:false});

document.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('resize',resize);

resize();
