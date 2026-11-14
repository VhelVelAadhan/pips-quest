// Physics helpers, player, enemies, items, platforms, hazards and particle effects.
const SOLID = new Set('#BC?MSEXPp'.split(''));
const SCORE_CHAIN = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];

function tileAt(w, tx, ty) {
  if (tx < 0 || tx >= w.level.w) return 'X';
  if (ty < 0 || ty >= w.level.h) return ' ';
  return w.tiles[ty][tx];
}
const isSolid = c => SOLID.has(c);
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function boxSolid(w, x, y, bw, bh) {
  const x0 = Math.floor(x / TS), x1 = Math.floor((x + bw - 0.01) / TS);
  const y0 = Math.floor(y / TS), y1 = Math.floor((y + bh - 0.01) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(tileAt(w, tx, ty))) return true;
  return false;
}
// Returns +1 / -1 if a wall was hit on that side, 0 otherwise.
function moveX(w, e) {
  e.x += e.vx;
  const top = Math.floor(e.y / TS), bot = Math.floor((e.y + e.h - 0.01) / TS);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / TS);
    for (let ty = top; ty <= bot; ty++) if (isSolid(tileAt(w, tx, ty))) { e.x = tx * TS - e.w; return 1; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TS);
    for (let ty = top; ty <= bot; ty++) if (isSolid(tileAt(w, tx, ty))) { e.x = (tx + 1) * TS; return -1; }
  }
  return 0;
}
function moveY(w, e, isPlayer = false) {
  const prevBottom = e.y + e.h, prevTop = e.y;
  e.y += e.vy;
  e.onGround = false;
  const l = Math.floor(e.x / TS), r = Math.floor((e.x + e.w - 0.01) / TS);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / TS);
    for (let tx = l; tx <= r; tx++) {
      const c = tileAt(w, tx, ty);
      if (isSolid(c) || (c === '-' && prevBottom <= ty * TS + 0.5)) {
        e.y = ty * TS - e.h; e.vy = 0; e.onGround = true; return { side: 'bottom' };
      }
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TS);
    const hits = [];
    for (let tx = l; tx <= r; tx++) {
      const c = tileAt(w, tx, ty);
      if (isSolid(c) || (isPlayer && c === 'H' && prevTop >= (ty + 1) * TS - 0.5)) hits.push(tx);
    }
    if (hits.length) { e.y = (ty + 1) * TS; e.vy = 0; return { side: 'top', ty, hits }; }
  }
  return null;
}
function drawFlipV(ctx, img, x, y) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y) + img.height); ctx.scale(1, -1); ctx.drawImage(img, 0, 0); ctx.restore();
}

// ---------------- Particles / effects ----------------
const FX = {
  add(w, p) { w.fx.push(Object.assign({ life: 30, t: 0, vx: 0, vy: 0 }, p)); },
  debris(w, tx, ty, color) {
    [[-1.4, -5], [1.4, -5], [-1.1, -3], [1.1, -3]].forEach(([vx, vy], i) =>
      FX.add(w, { kind: 'debris', x: tx * TS + (i % 2) * 8 + 2, y: ty * TS + (i < 2 ? 0 : 8) + 2, vx, vy, life: 70, color }));
  },
  text(w, x, y, text, color = '#fff') { FX.add(w, { kind: 'text', x, y, text: String(text), life: 50, vy: -0.8, color }); },
  gemPop(w, x, y) { FX.add(w, { kind: 'gem', x, y, vy: -5, life: 26 }); },
  sparkle(w, x, y, n = 6, color = '#fff') {
    for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n; FX.add(w, { kind: 'spark', x, y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, life: 20, color }); }
  },
  puff(w, x, y) { FX.add(w, { kind: 'puff', x, y, life: 12 }); },
  update(w) {
    for (const p of w.fx) {
      p.t++;
      if (p.kind === 'debris') { p.vy += 0.3; }
      else if (p.kind === 'gem') { p.vy += 0.35; }
      else if (p.kind === 'text') { if (p.t > 25) p.vy = 0; }
      else if (p.kind === 'spark') { p.vx *= 0.92; p.vy *= 0.92; }
      p.x += p.vx; p.y += p.vy;
    }
    w.fx = w.fx.filter(p => p.t < p.life);
  },
  draw(ctx, w, cx) {
    for (const p of w.fx) {
      const x = Math.round(p.x - cx), y = Math.round(p.y);
      if (p.kind === 'debris') { ctx.fillStyle = p.color; ctx.fillRect(x, y, 5, 5); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 3, y + 3, 2, 2); }
      else if (p.kind === 'text') Gfx.text(ctx, p.text, x, y, p.color, 1, 'center');
      else if (p.kind === 'gem') Gfx.draw(ctx, Gfx.coin(1 + p.t / 2), x - 8, y - 8);
      else if (p.kind === 'spark') { ctx.fillStyle = p.color; ctx.fillRect(x, y, 2, 2); }
      else if (p.kind === 'puff') { const s = 2 + Math.floor(p.t / 2); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x - s, y - 1, s * 2, 2); ctx.fillRect(x - 1, y - s, 2, s * 2); }
    }
  },
};

// ---------------- Player ----------------
class Player {
  constructor(x, y, power = 0) {
    this.power = power; this.w = 12; this.h = power > 0 ? 27 : 15;
    this.x = x; this.y = y + 16 - this.h;
    this.vx = 0; this.vy = 0; this.onGround = false; this.facing = 1;
    this.anim = 0; this.frame = 0; this.inv = 0; this.star = 0; this.crouch = false; this.skid = false;
    this.dead = false; this.deadT = 0; this.ride = null; this.coyote = 0; this.jumpBuf = 0; this.jumpHeld = false;
    this.chain = 0; this.growT = 0; this.growFrom = 0; this.fireCd = 0; this.throwT = 0; this.hidden = false; this.jumpT = 60;
  }
  get big() { return this.power > 0; }

  setPower(w, np) {
    if (np === this.power) return;
    const oldBig = this.power > 0, newBig = np > 0;
    this.growFrom = this.power; this.power = np;
    if (oldBig !== newBig) {
      const nh = newBig ? 27 : 15;
      this.y += this.h - nh; this.h = nh; this.crouch = false;
    }
    this.growT = 40;
  }
  grow(w) { this.setPower(w, Math.max(1, this.power)); Sound.play('power'); }
  fire(w) { this.setPower(w, this.power === 0 ? 1 : 2); Sound.play('power'); }

  hurt(w) {
    if (this.dead || this.inv > 0 || this.star > 0 || this.growT > 0) return;
    if (this.power > 0) { this.setPower(w, 0); this.inv = 120; Sound.play('hurt'); }
    else this.die(w);
  }
  die(w, pit = false) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0; this.vy = pit ? 0 : -5.5; this.vx = 0; this.star = 0; this.hidden = pit;
    if (this.power > 0 && !pit) { this.y += this.h - 15; this.h = 15; }
    w.onPlayerDie();
  }
  bounce() { this.vy = this.jumpHeld ? -6.4 : -4.4; this.onGround = false; this.ride = null; this.jumpT = 6; }

  setCrouch(w, on) {
    if (on === this.crouch || !this.big) return;
    if (on) { this.crouch = true; this.y += 12; this.h = 15; }
    else if (!boxSolid(w, this.x, this.y - 12, this.w, 27)) { this.crouch = false; this.y -= 12; this.h = 27; }
  }

  update(w, inp) {
    if (this.dead) {
      this.deadT++;
      if (this.deadT > 30 && !this.hidden) { this.vy = Math.min(this.vy + 0.25, 6); this.y += this.vy; }
      return;
    }
    if (this.inv > 0) this.inv--;
    if (this.star > 0) { this.star--; if (this.star === 0) w.restoreMusic(); }
    if (this.fireCd > 0) this.fireCd--;
    if (this.throwT > 0) this.throwT--;
    this.jumpHeld = inp.jump;

    // ride moving platform
    if (this.ride) {
      const p = this.ride;
      if (this.x + this.w > p.x && this.x < p.x + p.w && !p.gone) {
        const nx = this.x + p.dx;
        if (!boxSolid(w, nx, p.y - this.h, this.w, this.h)) this.x = nx;
        this.y = p.y - this.h;
      } else this.ride = null;
    }

    // crouch
    if (this.big) {
      if (inp.down && this.onGround) this.setCrouch(w, true);
      else if (!inp.down && this.crouch) this.setCrouch(w, false);
    }

    // horizontal
    const max = inp.run ? 2.8 : 1.75, acc = inp.run ? 0.1 : 0.075;
    let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (this.crouch && this.onGround) dir = 0;
    this.skid = false;
    if (dir) {
      if (this.onGround && this.vx * dir < -0.4) { this.vx += dir * 0.17; this.skid = true; }
      else if (this.vx * dir < max) this.vx += dir * (this.onGround ? acc : acc * 0.85);
      else if (this.onGround) this.vx -= dir * Math.min(0.05, this.vx * dir - max);
      if (this.onGround || Math.abs(this.vx) < 0.5) this.facing = dir;
    } else {
      const fr = this.onGround ? (this.crouch ? 0.05 : 0.08) : 0.02;
      this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), fr);
    }

    // jump (with buffer + coyote time)
    if (inp.jumpPressed) this.jumpBuf = 8; else if (this.jumpBuf > 0) this.jumpBuf--;
    if (this.onGround) { this.coyote = 8; this.chain = 0; } else if (this.coyote > 0) this.coyote--;
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = -(5.4 + Math.abs(this.vx) * 0.25);
      this.jumpBuf = 0; this.coyote = 0; this.onGround = false; this.ride = null; this.jumpT = 0;
      Sound.play(this.big ? 'bigjump' : 'jump');
    }
    // Every jump gets a guaranteed minimum boost; holding jump extends it.
    if (this.jumpT < 60) this.jumpT++;
    const g = this.vy < 0 ? ((inp.jump || this.jumpT < 10) ? 0.2 : 0.5) : 0.45;
    this.vy = Math.min(this.vy + g, 5);

    // shoot
    if (this.power === 2 && inp.runPressed && this.fireCd === 0 && !this.crouch && w.ents.filter(e => e instanceof Fireball).length < 2) {
      w.spawn(new Fireball(this.x + (this.facing > 0 ? this.w : -8), this.y + 6, this.facing));
      this.fireCd = 10; this.throwT = 8; Sound.play('fire');
    }

    // move X
    const hx = moveX(w, this);
    if (hx) this.vx = 0;

    // head corner correction
    if (this.vy < 0) {
      const ty = Math.floor((this.y + this.vy) / TS);
      const l = Math.floor(this.x / TS), r = Math.floor((this.x + this.w - 0.01) / TS);
      if (l !== r) {
        const sl = isSolid(tileAt(w, l, ty)), sr = isSolid(tileAt(w, r, ty));
        if (sl && !sr && (l + 1) * TS - this.x <= 4 && !boxSolid(w, (l + 1) * TS, this.y, this.w, this.h)) this.x = (l + 1) * TS;
        else if (sr && !sl && this.x + this.w - r * TS <= 4 && !boxSolid(w, r * TS - this.w, this.y, this.w, this.h)) this.x = r * TS - this.w;
      }
    }

    // move Y
    const prevBottom = this.y + this.h;
    const res = moveY(w, this, true);
    if (res && res.side === 'top') {
      const cx = this.x + this.w / 2;
      let tx = Math.floor(cx / TS);
      if (!res.hits.includes(tx)) tx = res.hits[0];
      w.bumpTile(tx, res.ty);
    }

    // platforms & springs
    if (this.vy >= 0) {
      for (const p of w.ents) {
        if (!p.isPlatform || p.gone) continue;
        if (this.x + this.w > p.x + 1 && this.x < p.x + p.w - 1 && prevBottom <= p.y + Math.max(0, p.dy || 0) + 2 && this.y + this.h >= p.y) {
          if (p instanceof Spring) {
            this.y = p.y - this.h; this.vy = inp.jump ? -9 : -6.5; this.onGround = false; this.ride = null; this.coyote = 0; this.jumpT = 0;
            p.squash = 10; Sound.play('spring');
          } else {
            this.y = p.y - this.h; this.vy = 0; this.onGround = true; this.ride = p;
            if (p.kind === 'fall' && p.fallT < 0) p.fallT = 0;
          }
        }
      }
    }
    if (!this.onGround && this.ride && this.vy < 0) this.ride = null;

    // tiles overlapping the body: gems, spikes, lava
    const x0 = Math.floor((this.x + 2) / TS), x1 = Math.floor((this.x + this.w - 3) / TS);
    const y0 = Math.floor((this.y + 2) / TS), y1 = Math.floor((this.y + this.h - 1) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(w, tx, ty);
      if (c === 'o') { w.tiles[ty][tx] = ' '; w.addGem(); FX.sparkle(w, tx * TS + 8, ty * TS + 8, 6, '#fff2a6'); }
      else if (c === '^' && this.y + this.h > ty * TS + 8) this.hurt(w);
      else if (c === 'l' && this.y + this.h > ty * TS + 6) { Sound.play('lava'); this.die(w); return; }
    }

    if (this.y > w.level.h * TS + 16) { this.die(w, true); return; }
    if (this.y < -48) this.y = -48;

    // animation
    if (!this.onGround) this.frame = 4;
    else if (this.crouch) this.frame = 7;
    else if (this.skid) this.frame = 5;
    else if (Math.abs(this.vx) > 0.1) { this.anim += Math.abs(this.vx) * 0.16; this.frame = 1 + Math.floor(this.anim) % 3; }
    else { this.frame = 0; this.anim = 0; }
  }

  draw(ctx, cx, tick) {
    if (this.hidden) return;
    if (this.inv > 0 && Math.floor(tick / 3) % 2 === 0) return;
    let big = this.big, frame = this.dead ? 6 : this.frame;
    if (this.growT > 0) { // flicker between old and new form
      const alt = Math.floor(this.growT / 4) % 2 === 0;
      if (alt && (this.growFrom > 0) !== big) big = this.growFrom > 0;
    }
    if (big && this.dead) frame = 4;
    if (!big && frame === 7) frame = 0;
    let pal = this.power === 2 ? 'fire' : 'normal';
    const flick = this.growT > 0 && Math.floor(this.growT / 4) % 2 === 0;
    if (flick && (this.growFrom === 2) !== (this.power === 2)) pal = this.growFrom === 2 ? 'fire' : 'normal';
    if (this.star > 0 && (this.star > 120 || Math.floor(tick / 4) % 2)) pal = 'star' + (Math.floor(tick / 3) % 4);
    if (this.throwT > 0 && this.onGround && !this.crouch) frame = 4;
    const s = Gfx.hero(big, frame, pal);
    Gfx.draw(ctx, s, this.x - 2 - cx, this.y + this.h - s.h, this.facing < 0);
  }
}

// ---------------- Enemies ----------------
class Enemy {
  constructor(x, y, w, h) {
    this.w = w; this.h = h; this.x = x + (16 - w) / 2; this.y = y + 16 - h;
    this.vx = 0; this.vy = 0; this.onGround = false; this.dead = false; this.flipped = false;
    this.active = false; this.isEnemy = true; this.t = 0; this.stompable = true; this.score = 100;
  }
  get harmful() { return !this.dead && !this.flipped; }
  physics(w, turnAtLedge = false) {
    this.vy = Math.min(this.vy + 0.35, 5);
    const hx = moveX(w, this);
    if (hx) this.vx = -hx * Math.abs(this.vx);
    moveY(w, this);
    if (turnAtLedge && this.onGround) {
      const ax = this.vx > 0 ? this.x + this.w + 1 : this.x - 1;
      const c = tileAt(w, Math.floor(ax / TS), Math.floor((this.y + this.h + 2) / TS));
      if (!isSolid(c) && c !== '-') this.vx = -this.vx;
    }
    if (this.y > w.level.h * TS + 32) this.dead = true;
  }
  fallDead(w) {
    this.vy = Math.min(this.vy + 0.3, 6); this.y += this.vy; this.x += this.vx;
    if (this.y > w.level.h * TS + 32) this.dead = true;
  }
  hitBy(w, how, dir) {
    this.flipped = true; this.vy = -3.5; this.vx = (dir || 1) * 0.8;
    Sound.play('kick');
    return this.score;
  }
  stomp(w) { return false; }
  onPlayer(w, p) {
    if (p.star > 0) { const sc = this.hitBy(w, 'star', p.facing); w.chainScore(p, this, sc); return; }
    const stomp = p.vy > 0 && (p.y + p.h - p.vy) <= this.y + 7;
    if (stomp && this.stompable) { p.y = this.y - p.h; this.stomp(w, p); p.bounce(); w.chainScore(p, this); }
    else p.hurt(w);
  }
  drawSprite(ctx, s, cx, ox = -1, oy = 0, left = this.vx < 0) {
    const x = this.x + ox - cx, y = this.y + this.h - s.h + oy;
    if (this.flipped) drawFlipV(ctx, left ? s.l : s.r, x, y); else Gfx.draw(ctx, s, x, y, left);
  }
}

class Grumble extends Enemy {
  constructor(x, y) { super(x, y, 14, 15); this.vx = -0.5; this.squishT = 0; }
  get harmful() { return super.harmful && !this.squishT; }
  update(w) {
    if (this.flipped) return this.fallDead(w);
    if (this.squishT) { if (--this.squishT <= 0) this.dead = true; return; }
    this.t++; this.physics(w);
  }
  stomp() { this.squishT = 30; this.vx = 0; Sound.play('stomp'); return true; }
  draw(ctx, cx) { this.drawSprite(ctx, Gfx.grumble(this.squishT ? 2 : Math.floor(this.t / 10) % 2), cx, -1, 0, false); }
}

class Beetle extends Enemy {
  constructor(x, y) { super(x, y, 14, 15); this.vx = -0.45; this.state = 'walk'; this.shellT = 0; this.grace = 0; this.chain = 0; this.score = 200; }
  update(w) {
    if (this.flipped) return this.fallDead(w);
    this.t++;
    if (this.grace > 0) this.grace--;
    if (this.state === 'walk') this.physics(w, true);
    else if (this.state === 'shell') {
      this.vx = 0; this.physics(w);
      if (++this.shellT > 420) { this.state = 'walk'; this.vx = w.player.x < this.x ? -0.45 : 0.45; }
    } else {
      const before = this.vx;
      this.physics(w);
      if (this.vx !== before && Math.abs(this.x - w.camX - 200) < 220) Sound.play('bump');
      for (const e of w.ents) {
        if (e === this || !e.isEnemy || !e.active || !e.harmful || !overlap(this, e)) continue;
        if (e instanceof Boss) { e.damage(w, 2); this.hitBy(w, 'boss', -Math.sign(this.vx)); continue; }
        const sc = e.hitBy(w, 'shell', Math.sign(this.vx));
        const v = SCORE_CHAIN[Math.min(this.chain + 3, SCORE_CHAIN.length - 1)]; this.chain++;
        w.addScore(sc ? v : 0, e.x + e.w / 2, e.y);
      }
    }
  }
  kick(w, p, dir) {
    this.state = 'slide'; this.vx = 4 * dir; this.grace = 12; this.chain = 0; this.shellT = 0;
    Sound.play('kick'); w.addScore(400, this.x + 7, this.y);
  }
  stomp(w, p) {
    Sound.play('stomp');
    if (this.state === 'walk' || this.state === 'slide') { this.state = 'shell'; this.vx = 0; this.shellT = 0; this.grace = 8; }
    else this.kick(w, p, p.x + p.w / 2 < this.x + this.w / 2 ? 1 : -1);
    return true;
  }
  onPlayer(w, p) {
    if (p.star > 0) return super.onPlayer(w, p);
    if (this.grace > 0) return;
    const stomp = p.vy > 0 && (p.y + p.h - p.vy) <= this.y + 7;
    if (this.state === 'shell' && !stomp) { this.kick(w, p, p.x + p.w / 2 < this.x + this.w / 2 ? 1 : -1); return; }
    super.onPlayer(w, p);
  }
  draw(ctx, cx) {
    let f = this.state === 'walk' ? Math.floor(this.t / 12) % 2 : 2;
    if (this.state === 'slide') f = 2 + Math.floor(this.t / 3) % 2;
    let ox = -1;
    if (this.state === 'shell' && this.shellT > 340) ox += (Math.floor(this.t / 3) % 2) ? 1 : -1;
    this.drawSprite(ctx, Gfx.beetle(f), cx, ox, 0, this.vx < 0);
  }
}

class Buzzer extends Enemy {
  constructor(x, y) { super(x, y, 14, 12); this.baseY = this.y; this.vx = -0.6; this.score = 200; }
  update(w) {
    if (this.flipped) return this.fallDead(w);
    this.t++;
    const hx = moveX(w, this); if (hx) this.vx = -hx * Math.abs(this.vx);
    this.y = this.baseY + Math.sin(this.t * 0.05) * 20;
  }
  stomp(w) { this.flipped = true; this.vy = 0; this.vx = 0; Sound.play('stomp'); return true; }
  draw(ctx, cx) { this.drawSprite(ctx, Gfx.buzzer(Math.floor(this.t / 3) % 2), cx, -1, 2); }
}

class Hopper extends Enemy {
  constructor(x, y) { super(x, y, 14, 14); this.wait = 60 + Math.floor(Math.random() * 60); this.squishT = 0; this.score = 200; }
  get harmful() { return super.harmful && !this.squishT; }
  update(w) {
    if (this.flipped) return this.fallDead(w);
    if (this.squishT) { if (--this.squishT <= 0) this.dead = true; return; }
    this.t++;
    if (this.onGround) {
      this.vx = 0;
      if (--this.wait <= 0) { this.vy = -5.5; this.vx = (w.player.x < this.x ? -1 : 1) * 1.1; this.wait = 90; this.onGround = false; }
    }
    this.physics(w);
  }
  stomp() { this.squishT = 30; this.vx = 0; Sound.play('stomp'); return true; }
  draw(ctx, cx) {
    if (this.squishT) { ctx.fillStyle = '#2e7d32'; ctx.fillRect(Math.round(this.x - cx), Math.round(this.y + this.h - 4), 14, 4); return; }
    this.drawSprite(ctx, Gfx.hopper(this.onGround ? 0 : 1), cx, -1, 0, false);
  }
}

class Spiker extends Enemy {
  constructor(x, y) { super(x, y, 14, 14); this.vx = -0.4; this.stompable = false; this.score = 200; }
  update(w) { if (this.flipped) return this.fallDead(w); this.t++; this.physics(w, true); }
  draw(ctx, cx) { this.drawSprite(ctx, Gfx.spiker(Math.floor(this.t / 10) % 2), cx, -1, 0); }
}

class Boss extends Enemy {
  constructor(x, y) {
    super(x, y, 28, 30); this.x = x; this.y = y + 32 - 30;
    this.hp = 8; this.inv = 0; this.state = 'idle'; this.vx = 0; this.fireT = 90; this.jumpT = 140;
    this.homeX = x; this.score = 5000;
  }
  damage(w, n) {
    if (this.inv > 0 || this.state === 'dead') return;
    if (this.state === 'idle') { this.state = 'fight'; this.vx = -0.7; w.onBossStart(); }
    this.hp -= n; this.inv = 50; Sound.play('bosshit');
    FX.sparkle(w, this.x + 14, this.y + 10, 8, '#ffd23f');
    if (this.hp <= 0) {
      this.state = 'dead'; this.flipped = true; this.vy = -4; this.vx = 0.5;
      Sound.play('bossdie'); w.addScore(5000, this.x + 14, this.y); w.onBossDefeated();
    }
  }
  hitBy(w, how, dir) { this.damage(w, how === 'fire' ? 1 : 2); return 0; }
  stomp(w) { this.damage(w, 2); return true; }
  onPlayer(w, p) {
    if (this.state === 'dead') return;
    const stomp = p.vy > 0 && (p.y + p.h - p.vy) <= this.y + 10;
    if (stomp) { if (this.inv === 0) this.damage(w, 2); p.y = this.y - p.h; p.vy = -6.5; p.onGround = false; Sound.play('stomp'); return; }
    if (p.star > 0) { this.damage(w, 1); return; }
    p.hurt(w);
  }
  update(w) {
    if (this.flipped) return this.fallDead(w);
    this.t++;
    if (this.inv > 0) this.inv--;
    const p = w.player;
    if (this.state === 'idle') {
      if (Math.abs(p.x - this.x) < 15 * TS && !p.dead) { this.state = 'fight'; this.vx = -0.7; w.onBossStart(); }
      this.physics(w); return;
    }
    const enraged = this.hp <= 4;
    const spd = enraged ? 1.1 : 0.7;
    if (this.x < this.homeX - 9 * TS) this.vx = spd;
    else if (this.x > this.homeX + TS) this.vx = -spd;
    else if (Math.abs(this.vx) !== spd) this.vx = Math.sign(this.vx || -1) * spd;
    if (this.onGround && --this.jumpT <= 0) { this.vy = enraged ? -7 : -6; this.jumpT = 100 + Math.floor(Math.random() * 80); }
    if (--this.fireT <= 0 && !p.dead) {
      const dir = p.x < this.x ? -1 : 1;
      w.spawn(new BossFire(this.x + (dir > 0 ? this.w : -16), this.y + 8, dir));
      if (enraged) w.spawn(new BossFire(this.x + (dir > 0 ? this.w : -16), this.y + 20, dir, 1.6));
      this.fireT = enraged ? 80 : 120; Sound.play('bossfire');
    }
    this.physics(w);
  }
  draw(ctx, cx) {
    const left = this.state === 'idle' ? true : this.vx < 0;
    const flash = this.inv > 0 && Math.floor(this.t / 3) % 2 === 0;
    this.drawSprite(ctx, Gfx.boss(Math.floor(this.t / 10) % 2, flash), cx, -2, 0, left);
  }
}

// ---------------- Projectiles ----------------
class Fireball {
  constructor(x, y, dir) { this.x = x; this.y = y; this.w = 8; this.h = 8; this.vx = 4 * dir; this.vy = 1; this.t = 0; this.dead = false; this.active = true; this.always = true; }
  update(w) {
    this.t++;
    this.vy = Math.min(this.vy + 0.4, 4.5);
    if (moveX(w, this)) { this.dead = true; FX.puff(w, this.x + 4, this.y + 4); Sound.play('bump'); return; }
    const r = moveY(w, this);
    if (r && r.side === 'bottom') this.vy = -3.3;
    if (this.x < w.camX - 16 || this.x > w.camX + w.viewW + 16 || this.y > w.level.h * TS) { this.dead = true; return; }
    for (const e of w.ents) {
      if (!e.isEnemy || !e.active || !e.harmful || !overlap(this, e)) continue;
      const sc = e.hitBy(w, 'fire', Math.sign(this.vx));
      if (sc) w.addScore(sc, e.x + e.w / 2, e.y);
      this.dead = true; FX.puff(w, this.x + 4, this.y + 4); return;
    }
  }
  draw(ctx, cx) { Gfx.draw(ctx, Gfx.fireball(Math.floor(this.t / 3) % 4), this.x - cx, this.y); }
}

class BossFire {
  constructor(x, y, dir, spd = 2.2) { this.x = x; this.y = y; this.baseY = y; this.w = 14; this.h = 8; this.vx = spd * dir; this.t = 0; this.dead = false; this.active = true; this.always = true; }
  update(w) {
    this.t++; this.x += this.vx; this.y = this.baseY + Math.sin(this.t * 0.15) * 3;
    if (this.x < w.camX - 40 || this.x > w.camX + w.viewW + 40) this.dead = true;
    const p = w.player;
    if (!p.dead && overlap({ x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 }, this)) p.hurt(w);
  }
  draw(ctx, cx) { Gfx.draw(ctx, Gfx.bossFire(Math.floor(this.t / 4) % 2), this.x - cx - 1, this.y - 1, this.vx < 0); }
}

// ---------------- Items ----------------
class Item {
  constructor(kind, tx, ty) {
    this.kind = kind; this.w = 14; this.h = 15; this.x = tx * TS + 1; this.y = ty * TS + 1;
    this.vx = 0; this.vy = 0; this.emerge = 16; this.t = 0; this.dead = false; this.active = true; this.isItem = true; this.onGround = false;
  }
  update(w) {
    this.t++;
    if (this.emerge > 0) {
      this.y -= 0.5; this.emerge -= 0.5;
      if (this.emerge <= 0) {
        if (this.kind === 'berry' || this.kind === 'heart') this.vx = 0.9;
        if (this.kind === 'comet') { this.vx = 1.3; this.vy = -3; }
      }
      return;
    }
    if (this.kind === 'bloom') return;
    this.vy = Math.min(this.vy + (this.kind === 'comet' ? 0.22 : 0.35), 5);
    const hx = moveX(w, this); if (hx) this.vx = -hx * Math.abs(this.vx);
    const r = moveY(w, this);
    if (r && r.side === 'bottom' && this.kind === 'comet') this.vy = -4.2;
    if (this.y > w.level.h * TS + 16) this.dead = true;
  }
  collect(w, p) {
    this.dead = true;
    const cx = this.x + 7, cy = this.y;
    if (this.kind === 'berry') { p.grow(w); w.addScore(1000, cx, cy); }
    else if (this.kind === 'bloom') { p.fire(w); w.addScore(1000, cx, cy); }
    else if (this.kind === 'comet') { p.star = 640; Sound.play('power'); Sound.music('star'); w.addScore(1000, cx, cy); }
    else if (this.kind === 'heart') w.oneUp(cx, cy);
  }
  draw(ctx, cx) {
    const s = this.kind === 'berry' ? Gfx.berry() : this.kind === 'bloom' ? Gfx.bloom(Math.floor(this.t / 6) % 4)
      : this.kind === 'comet' ? Gfx.comet(Math.floor(this.t / 4) % 2) : Gfx.lifeHeart();
    Gfx.draw(ctx, s, this.x - 1 - cx, this.y - 1);
  }
}

// ---------------- Platforms & props ----------------
class Platform {
  constructor(o) {
    this.kind = o.type === 'fall' ? 'fall' : 'move';
    this.w = (o.w || 3) * TS; this.h = 8;
    this.bx = o.x * TS; this.by = o.y * TS;
    this.rx = (o.dx || 0) * TS; this.ry = (o.dy || 0) * TS; this.speed = o.speed || 0.02;
    this.x = this.bx; this.y = this.by; this.dx = 0; this.dy = 0; this.t = 0;
    this.fallT = -1; this.vy = 0; this.gone = false; this.respawn = 0;
    this.isPlatform = true; this.active = true; this.always = true; this.dead = false;
  }
  update(w) {
    const ox = this.x, oy = this.y;
    if (this.kind === 'move') {
      this.t += this.speed;
      const k = 0.5 - 0.5 * Math.cos(this.t);
      this.x = this.bx + this.rx * k; this.y = this.by + this.ry * k;
    } else if (this.gone) {
      if (--this.respawn <= 0) { this.gone = false; this.x = this.bx; this.y = this.by; this.vy = 0; this.fallT = -1; }
    } else if (this.fallT >= 0) {
      this.fallT++;
      if (this.fallT > 24) { this.vy = Math.min(this.vy + 0.22, 5); this.y += this.vy; }
      if (this.y > w.level.h * TS + 32) { this.gone = true; this.respawn = 150; }
    }
    this.dx = this.x - ox; this.dy = this.y - oy;
  }
  draw(ctx, cx, w) {
    if (this.gone) return;
    const s = Gfx.platform(this.kind, w.level.theme);
    const shake = this.kind === 'fall' && this.fallT >= 0 && this.fallT <= 24 ? (this.fallT % 4 < 2 ? 1 : -1) : 0;
    for (let i = 0; i < this.w; i += TS) Gfx.draw(ctx, s, this.x + i - cx + shake, this.y);
  }
}

class Spring {
  constructor(o) { this.x = o.x * TS; this.y = o.y * TS + 6; this.w = 16; this.h = 10; this.squash = 0; this.isPlatform = true; this.active = true; this.always = true; this.dead = false; this.dx = 0; this.dy = 0; }
  update() { if (this.squash > 0) this.squash--; }
  draw(ctx, cx) { Gfx.draw(ctx, Gfx.spring(this.squash > 0 ? 1 : 0), this.x - cx, this.y - 6); }
}

class Checkpoint {
  constructor(o) { this.x = o.x * TS + 4; this.y = (o.y - 1) * TS; this.w = 8; this.h = 32; this.on = false; this.t = 0; this.active = true; this.always = true; this.dead = false; this.tx = o.x; this.ty = o.y; }
  update(w) {
    this.t++;
    if (!this.on && !w.player.dead && overlap(this, w.player)) {
      this.on = true; w.checkpoint = { x: this.tx, y: this.ty }; Sound.play('checkpoint');
      FX.sparkle(w, this.x + 6, this.y + 4, 10, '#7dff9a'); FX.text(w, this.x + 4, this.y - 8, 'CHECKPOINT', '#7dff9a');
    }
  }
  draw(ctx, cx) {
    const x = Math.round(this.x - cx), y = Math.round(this.y);
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x + 2, y + 2, 2, 30);
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x + 1, y, 4, 3);
    const wave = Math.floor(this.t / 8) % 2;
    ctx.fillStyle = this.on ? '#3ddc6a' : '#c84040';
    ctx.fillRect(x + 4, y + 3, 9, 6 + wave); ctx.fillRect(x + 13, y + 4 + wave, 2, 4);
    ctx.fillStyle = this.on ? '#b8ffcc' : '#ff9a8a'; ctx.fillRect(x + 4, y + 3, 9, 1);
  }
}

class Portal {
  constructor(o) { this.x = o.x * TS; this.y = o.y * TS; this.w = 32; this.h = 48; this.locked = !!o.locked; this.t = 0; this.active = true; this.always = true; this.dead = false; }
  update(w) {
    this.t++;
    const p = w.player;
    if (!this.locked && !p.dead && w.state === 'play' && overlap({ x: this.x + 8, y: this.y + 8, w: 16, h: 40 }, p)) w.levelComplete(this);
    if (!this.locked && this.t % 6 === 0) FX.add(w, { kind: 'spark', x: this.x + 16 + Math.cos(this.t) * 12, y: this.y + 24 + Math.sin(this.t * 1.3) * 18, vy: -0.4, life: 25, color: '#e8d0ff' });
  }
  draw(ctx, cx) {
    const x = Math.round(this.x - cx), y = Math.round(this.y);
    // stone arch
    ctx.fillStyle = '#5a5470'; ctx.fillRect(x, y + 6, 5, 42); ctx.fillRect(x + 27, y + 6, 5, 42); ctx.fillRect(x + 3, y, 26, 6);
    ctx.fillStyle = '#8a84a8'; ctx.fillRect(x, y + 6, 1, 42); ctx.fillRect(x + 27, y + 6, 1, 42); ctx.fillRect(x + 3, y, 26, 1);
    ctx.fillStyle = '#3a3450'; for (let i = 0; i < 6; i++) { ctx.fillRect(x, y + 12 + i * 6, 5, 1); ctx.fillRect(x + 27, y + 12 + i * 6, 5, 1); }
    // swirl
    const cols = this.locked ? ['#2a2440', '#352e52', '#2a2440'] : ['#7a3cff', '#c060ff', '#40d0ff', '#ffffff'];
    for (let ry = 0; ry < 42; ry++) for (let rx = 0; rx < 22; rx += 2) {
      const dx = rx - 11, dy = ry - 21;
      const a = Math.atan2(dy, dx * 1.8), d = Math.sqrt(dx * dx * 3 + dy * dy);
      const k = Math.floor((a * 2 + d * 0.25 - this.t * 0.12) % cols.length + cols.length) % cols.length;
      ctx.fillStyle = cols[k]; ctx.fillRect(x + 5 + rx, y + 6 + ry, 2, 1);
    }
    if (this.locked) {
      ctx.fillStyle = '#8a8a9a'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 7 + i * 5, y + 6, 2, 42);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 12, y + 24, 8, 7); ctx.fillStyle = '#8a6a00'; ctx.fillRect(x + 15, y + 26, 2, 3);
    }
  }
}

class Firebar {
  constructor(o) { this.cx = o.x * TS + 8; this.cy = o.y * TS + 8; this.len = o.len || 5; this.speed = o.speed || 0.04; this.a = 0; this.t = 0; this.active = true; this.always = true; this.dead = false; this.x = this.cx - 48; this.w = 96; }
  orbs() { const r = []; for (let i = 0; i < this.len; i++) r.push([this.cx + Math.cos(this.a) * i * 8, this.cy + Math.sin(this.a) * i * 8]); return r; }
  update(w) {
    this.t++; this.a += this.speed;
    const p = w.player;
    if (p.dead) return;
    const pb = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 };
    for (const [ox, oy] of this.orbs()) if (overlap(pb, { x: ox - 3, y: oy - 3, w: 6, h: 6 })) { p.hurt(w); break; }
  }
  draw(ctx, cx) { for (const [ox, oy] of this.orbs()) Gfx.draw(ctx, Gfx.fireball(Math.floor(this.t / 3) % 4), ox - 4 - cx, oy - 4); }
}

function makeEntity(o) {
  const x = o.x * TS, y = o.y * TS;
  switch (o.type) {
    case 'grumble': return new Grumble(x, y);
    case 'beetle': return new Beetle(x, y);
    case 'buzzer': return new Buzzer(x, y);
    case 'hopper': return new Hopper(x, y);
    case 'spiker': return new Spiker(x, y);
    case 'boss': return new Boss(x, y);
    case 'plat': case 'fall': return new Platform(o);
    case 'spring': return new Spring(o);
    case 'checkpoint': return new Checkpoint(o);
    case 'portal': return new Portal(o);
    case 'firebar': return new Firebar(o);
  }
  return null;
}
