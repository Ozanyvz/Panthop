import * as THREE from 'three';
import {
  loadCharacterAnimations,
  setAnimFrame,
  loadWallTexture,
  loadBranchTexture,
  makeSawTexture,
  makeBackgroundTexture,
  loadGroundTexture,
} from './sprites.js';
import * as audio from './audio.js';

/* ---------- World constants ---------- */
const VIEW_WIDTH = 6;                 // world units visible horizontally
const WALL_THICKNESS = 1.2;
const WALL_INNER_X = VIEW_WIDTH / 2 - WALL_THICKNESS; // 1.8
const CHAR_ON_WALL_OFFSET = 0.34;     // character center offset from wall inner edge (into gap)
const CHAR_LEFT_X = -WALL_INNER_X + CHAR_ON_WALL_OFFSET;  // hugs the wall it climbs
const CHAR_RIGHT_X = WALL_INNER_X - CHAR_ON_WALL_OFFSET;

// Character display size lives per-animation in sprites.js (anim.scale); only
// the gameplay hitbox is fixed here so collisions stay independent of the art.
// Kept a touch smaller than the art so contact feels fair (no "gap" hits).
const CHAR_HITBOX_W = 0.42;
const CHAR_HITBOX_H = 0.58;

const GROUND_Y = -3.5;                // ground line world y
const GROUND_STAND_Y = GROUND_Y + 0.6; // char y while standing on ground
const START_Y = GROUND_STAND_Y + 1.0;  // reference y used for obstacle placement / first landing

const CLIMB_BASE_SPEED = 2.6;         // world units per second
const CLIMB_MAX_SPEED = 4.2;
const CLIMB_ACCEL_PER_SCORE = 0.09;

const SPRINT_HOLD_TIME_BASE = 2.0;    // default seconds to hold (paused) before sprint; sprintSpeed upgrade shortens it
const SPRINT_MULT = 2.0;              // climb-speed multiplier while sprinting

const NORMAL_JUMP_SCORE = 1;
const SPRINT_JUMP_SCORE = 2;          // landing a jump launched while sprinting
const SPRINT_SMASH_SCORE = 1;         // bonus per mid-air obstacle a sprint jump destroys
const CHARGE_RING_OFFSET = 0.7;       // sprint-charge ring height above the character

const JUMP_DURATION_BASE = 0.42;      // seconds
const JUMP_DURATION_MIN = 0.32;
const JUMP_RISE = 2.1;                // y gained per jump
const JUMP_ARC = 0.45;                // extra apex bump
const JUMP_HOLD_FRAME = 12;           // single stretched-leap frame held while airborne (stable)

// The climb (walk) sprite is rotated a quarter turn so the cat reads as scaling
// the wall upward: head up, belly pressed against the wall it's clinging to.
const CLIMB_ROT = Math.PI / 2;

const OBSTACLE_SPACING_BASE = 3.4;
const OBSTACLE_SPACING_MIN = 2.3;
const SPACING_SHRINK_PER_SCORE = 0.04;
const MIDAIR_CHANCE_BASE = 0.15;
const MIDAIR_CHANCE_MAX = 0.45;
const MIDAIR_CHANCE_GROWTH = 0.012;

const SAW_HITBOX = 0.58;   // bird silhouette doesn't fill its quad — keep contact tight

/* sprite hitbox (attached to wall, reaches into gap) */
const WALL_SPIKE_W = 1.0;
const WALL_SPIKE_H = 0.6;
const WALL_SPIKE_HITBOX_W = 0.62;
const WALL_SPIKE_HITBOX_H = 0.42;
// How far the branch's root edge tucks behind the wall's inner edge so it reads
// as rooted into the trunk (the branch is drawn in front of the wall).
const WALL_SPIKE_OVERLAP = 0.22;

/* camera follow: keep character ~35% from bottom */
const CAM_FOLLOW_OFFSET = 2.0;
const CAM_SMOOTH = 8.0;
const CAM_INTRO_SMOOTH = 1.6;   // gentle glide from the intro framing to the follow target

/* ---------- State machine ---------- */
const STATE = {
  READY: 'ready',     // waiting on wall, not yet started climb
  CLIMB: 'climb',
  JUMP: 'jump',
  DEAD: 'dead',
};

export class PanthopGame {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.running = false;
    this.lastTime = 0;
    this.score = 0;
    this.modifiers = {
      startSpeedMult: 1.0,
      swordCharges: 0,
      sprintEnabled: false,
      sprintHoldTime: SPRINT_HOLD_TIME_BASE,
      sprintJumpBonus: false,
      sprintSmash: false,
    };
    this.swordCharges = 0;

    this._initThree();
    this._initWorld();
    this._bindResize();
    // Paint one frame so the canvas has the clear color when the start screen is above it.
    this.renderer.render(this.scene, this.camera);
  }

  setModifiers(mods) {
    this.modifiers = { ...this.modifiers, ...mods };
  }

  /* ---------- Three.js / scene ---------- */
  _initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    // Cap pixel ratio — 2D game doesn't need retina, keeps mobile GPU fed
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x7ec6f2, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-3, 3, 3, -3, -100, 100);
    this.camera.position.z = 10;

    this._resize();
  }

  _resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);

    const aspect = h / w;
    const halfW = VIEW_WIDTH / 2;
    const halfH = halfW * aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();

    this.viewHalfH = halfH;

    if (this.bg) this._fitBackground();
  }

  _bindResize() {
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize, { passive: true });
  }

  /* ---------- World init ---------- */
  _initWorld() {
    // textures (generated once)
    this.tex = {
      wall: loadWallTexture(),
      spikeL: loadBranchTexture(true),   // branch points right (from left wall)
      spikeR: loadBranchTexture(false),  // branch points left (from right wall)
      saw: makeSawTexture(),
      bg: makeBackgroundTexture(),
      ground: loadGroundTexture(),
    };

    // Use renderOrder to force painter's order — simpler & safer with orthographic sprites.
    // Ground + earth fill sit IN FRONT of the walls so the trunks end at the ground line
    // (the trunks are hidden below it) so the walls appear to end at the ground.
    const ro = {
      bg: 0, wall: 1, underground: 3, ground: 3.2, obstacle: 4, character: 5,
    };

    // Background (sky)
    {
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({ map: this.tex.bg });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, 0, -5);
      m.renderOrder = ro.bg;
      this.scene.add(m);
      this.bg = m;
      this._fitBackground();
    }

    // Ground (at bottom, below walls)
    {
      const geo = new THREE.PlaneGeometry(VIEW_WIDTH, 1.6);
      // Tile the art horizontally at its native aspect so the pixels stay square
      // (mirrored wrap hides the tiling seam); alpha-keyed blade tips need
      // transparency so the sky shows between them.
      this.tex.ground.repeat.set((VIEW_WIDTH / 1.6) / (1100 / 830), 1);
      const mat = new THREE.MeshBasicMaterial({ map: this.tex.ground, transparent: true, depthTest: false, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, GROUND_Y - 0.2, -2);
      m.renderOrder = ro.ground;
      this.scene.add(m);
      this.ground = m;
    }

    // Solid earth fill below the ground so the sky never shows beneath it
    // (colour matched to the grassground art's soil).
    {
      const fillH = 50;
      const geo = new THREE.PlaneGeometry(VIEW_WIDTH, fillH);
      const mat = new THREE.MeshBasicMaterial({ color: 0x8a5a30, depthTest: false, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      // top tucked just under the grass line so its edge stays hidden behind the ground
      m.position.set(0, (GROUND_STAND_Y - 0.1) - fillH / 2, -2.5);
      m.renderOrder = ro.underground;
      this.scene.add(m);
      this.underground = m;
    }

    // Walls: very tall planes with tiling brick texture — follow camera vertically
    const WALL_SEG_H = 60;              // visible wall segment height
    this.WALL_SEG_H = WALL_SEG_H;
    const wallGeo = new THREE.PlaneGeometry(WALL_THICKNESS, WALL_SEG_H);
    // Tile height keeps the trunk art's pixels square: 1.2 wide × (140/76)·1.2 ≈ 2.2 tall.
    this.WALL_TILE_H = 2.2;
    this.tex.wall.repeat.set(1, WALL_SEG_H / this.WALL_TILE_H);
    this.tex.wall.needsUpdate = true;
    {
      const matL = new THREE.MeshBasicMaterial({ map: this.tex.wall });
      const wallL = new THREE.Mesh(wallGeo, matL);
      wallL.position.x = -(VIEW_WIDTH / 2) + WALL_THICKNESS / 2;
      wallL.position.z = -1;
      wallL.renderOrder = ro.wall;
      this.scene.add(wallL);
      this.wallL = wallL;

      const matR = new THREE.MeshBasicMaterial({ map: this.tex.wall });
      const wallR = new THREE.Mesh(wallGeo, matR);
      wallR.position.x = (VIEW_WIDTH / 2) - WALL_THICKNESS / 2;
      wallR.position.z = -1;
      wallR.renderOrder = ro.wall;
      this.scene.add(wallR);
      this.wallR = wallR;
    }

    this._ro = ro;

    // Character — sprite-sheet animations (idle / walk / jump), one shared mesh.
    // The plane is a unit square; per-animation world size & facing live in scale.
    {
      this.anims = loadCharacterAnimations();
      this.charFacing = -1;                 // -1 = facing left (idle starts aimed at the left wall)
      this.charAnimName = 'idle';
      this.charBase = this.anims.idle.scale;
      this.animClock = 0;

      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: this.anims.idle.texture,
        transparent: true,
        depthTest: false,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.z = 1;
      m.renderOrder = ro.character;
      this.scene.add(m);
      this.character = m;
      this.charBobPhase = 0;
      this._applyCharScale();
    }

    // Sprint-charge ring — a radial fill shown above the head while holding,
    // so the player can feel how long until the sprint kicks in.
    {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      this.chargeCanvas = cv;
      this.chargeCtx = cv.getContext('2d');
      this.chargeTex = new THREE.CanvasTexture(cv);
      this.chargeTex.minFilter = THREE.LinearFilter;
      this.chargeTex.magFilter = THREE.LinearFilter;
      const geo = new THREE.PlaneGeometry(0.5, 0.5);
      const mat = new THREE.MeshBasicMaterial({ map: this.chargeTex, transparent: true, depthTest: false });
      const m = new THREE.Mesh(geo, mat);
      m.position.z = 1.2;
      m.renderOrder = ro.character + 1;
      m.visible = false;
      this.scene.add(m);
      this.chargeRing = m;
    }

    // Obstacle pool
    this.obstacles = [];
    this.obstaclePool = [];
    this.nextObstacleY = START_Y + 4;  // first obstacle a little above start
  }

  _fitBackground() {
    const aspect = (this.canvas.clientHeight || window.innerHeight) / (this.canvas.clientWidth || window.innerWidth);
    const w = VIEW_WIDTH;
    const h = w * aspect;
    // Background slightly taller so it covers camera scroll a bit
    this.bg.scale.set(w, h * 1.05, 1);
    this.bg.position.y = this.camera.position.y;
  }

  /* ---------- Lifecycle ---------- */
  reset() {
    // Remove existing obstacles
    for (const o of this.obstacles) {
      this.scene.remove(o.mesh);
      this.obstaclePool.push(o);
    }
    this.obstacles = [];

    this.score = 0;
    this.state = STATE.READY;       // standing on ground, waiting for first tap
    this.wallSide = -1;             // first jump will land on left wall
    this.character.position.set(0, GROUND_STAND_Y, 1);
    this._setCharAnim('idle');
    this._face(-1);                 // face left (about to jump left)
    this.character.rotation.z = 0;
    this.charBobPhase = 0;
    this.holding = false;
    this.holdTime = 0;
    this.isSprintJump = false;
    this._sprintReadyPlayed = false;
    audio.stopCharge();
    audio.stopClimb();
    if (this.chargeRing) this.chargeRing.visible = false;

    this.climbSpeed = CLIMB_BASE_SPEED * (this.modifiers.startSpeedMult ?? 1.0);
    this.swordCharges = this.modifiers.swordCharges ?? 0;
    // Snapshot the sprint unlocks for this run (leaf-bought upgrades).
    this.sprintEnabled = this.modifiers.sprintEnabled ?? false;
    this.sprintHoldTime = this.modifiers.sprintHoldTime ?? SPRINT_HOLD_TIME_BASE;
    this.sprintJumpBonus = this.modifiers.sprintJumpBonus ?? false;
    this.sprintSmash = this.modifiers.sprintSmash ?? false;
    // Dodge charges absorb branch (wall) hits for this run.
    this.dodgeCharges = this.modifiers.dodgeCharges ?? 0;
    if (this.callbacks.onSwordCharges) this.callbacks.onSwordCharges(this.swordCharges);
    if (this.callbacks.onDodgeCharges) this.callbacks.onDodgeCharges(this.dodgeCharges);
    this.isStartJump = false;
    this.nextObstacleY = START_Y + 4;   // first obstacle comfortably above the first landing
    this.cameraTargetY = GROUND_STAND_Y + CAM_FOLLOW_OFFSET - 0.5;
    // Intro framing: start with the camera raised just enough that the flat
    // earth below the ground band stays offscreen; the first jump glides it
    // down/over to the regular follow target (cameraTargetY).
    const introY = (GROUND_Y - 1.0) + this.viewHalfH - 0.05;   // viewport bottom ≈ ground-band bottom
    this.camIntro = introY > this.cameraTargetY;
    this.camIntroGlide = false;
    this.camera.position.y = this.camIntro ? introY : this.cameraTargetY;
    this._fitBackground();

    if (this.callbacks.onScore) this.callbacks.onScore(0);
  }

  start() {
    this.reset();
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
  }

  // Freeze/unfreeze the run without resetting it (in-game pause menu).
  pause() {
    if (!this.running) return;
    this.running = false;
    audio.stopClimb();
    audio.stopCharge();
  }

  resume() {
    if (this.running || this.state === STATE.DEAD) return;
    this.running = true;
    this.lastTime = performance.now();   // avoid a huge dt jump after the pause
    requestAnimationFrame(this._tick);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }

  /* ---------- Input ----------
     Press-and-hold model: pressing pauses the climb; after SPRINT_HOLD_TIME
     seconds of holding the character sprints (climbs SPRINT_MULT× faster).
     Releasing performs the jump — a quick tap (released before the threshold)
     is just a normal jump, exactly like before. */
  onPressStart() {
    if (!this.running) return;
    this.holding = true;
    this.holdTime = 0;
    this._sprintReadyPlayed = false;
  }

  onPressEnd() {
    // Were we sprinting at the moment of release? (decides sprint-jump)
    // Only possible once the hold-to-sprint ability is unlocked.
    const wasSprinting = this.sprintEnabled && this.holding && this.holdTime >= this.sprintHoldTime;
    this.holding = false;
    this.holdTime = 0;
    audio.stopCharge();   // release ends any charging whir
    if (!this.running) return;
    if (this.state === STATE.READY) this._beginStartJump();
    else if (this.state === STATE.CLIMB) this._beginJump(wasSprinting);
    else return;   // mid-jump release performs no new jump
    if (this.callbacks.onJump) this.callbacks.onJump();
  }

  _beginStartJump() {
    this.camIntroGlide = true;   // first jump: ease the intro camera into follow mode
    // First jump: from ground center → left wall at a slightly higher y
    this.state = STATE.JUMP;
    this.jumpT = 0;
    this.jumpFromX = 0;
    this.jumpToX = CHAR_LEFT_X;
    this.jumpFromY = this.character.position.y;
    this.jumpToY = START_Y;              // first landing y (reference for obstacles)
    this.jumpDuration = JUMP_DURATION_BASE + 0.05;
    this.wallSide = 1;                   // pretend we're "on right" so finish flips to left
    this._face(-1);                      // facing left (direction of travel)
    this.isStartJump = true;             // don't count score for this one
    this.isSprintJump = false;
    audio.stopClimb();
    audio.sfx('jumpStart');
  }

  _beginJump(isSprint = false) {
    this.state = STATE.JUMP;
    this.jumpT = 0;
    this.isSprintJump = isSprint;        // sprint jump: +score & smashes mid-air obstacles

    const fromX = this.wallSide === -1 ? CHAR_LEFT_X : CHAR_RIGHT_X;
    const toX = this.wallSide === -1 ? CHAR_RIGHT_X : CHAR_LEFT_X;
    this.jumpFromX = fromX;
    this.jumpToX = toX;
    this.jumpFromY = this.character.position.y;
    this.jumpToY = this.character.position.y + JUMP_RISE;

    const shrink = Math.min(0.25, this.score * 0.004);
    this.jumpDuration = Math.max(JUMP_DURATION_MIN, JUMP_DURATION_BASE - shrink);

    // Face direction of travel (will flip on landing)
    this._face(this.wallSide === -1 ? 1 : -1);

    audio.stopClimb();   // feet leave the wall
    audio.sfx(isSprint ? 'sprintJump' : 'jump');
  }

  _finishJump() {
    this.wallSide = -this.wallSide;
    this.character.position.x = this.wallSide === -1 ? CHAR_LEFT_X : CHAR_RIGHT_X;
    this.character.position.y = this.jumpToY;
    // Orient for climbing: quarter-turn (head up) with belly toward the wall.
    this.character.rotation.z = this.wallSide * CLIMB_ROT;
    this._face(this.wallSide);

    this.state = STATE.CLIMB;
    audio.sfx('land');
    if (this.isStartJump) {
      this.isStartJump = false;
    } else {
      // Sprint jump only scores the +2 bonus once the bonus upgrade is owned.
      const sprintBonus = this.isSprintJump && this.sprintJumpBonus;
      const gain = sprintBonus ? SPRINT_JUMP_SCORE : NORMAL_JUMP_SCORE;
      this.score += gain;
      audio.sfx('scoreTick');   // the point lands together with the grip sound
      const baseStart = CLIMB_BASE_SPEED * (this.modifiers.startSpeedMult ?? 1.0);
      this.climbSpeed = Math.min(CLIMB_MAX_SPEED, baseStart + this.score * CLIMB_ACCEL_PER_SCORE);
      if (this.callbacks.onScore) this.callbacks.onScore(this.score);
      // Floating "+2" so the sprint-jump bonus is felt (only when it actually applied)
      if (sprintBonus && this.callbacks.onScorePop) this.callbacks.onScorePop(gain);
    }

    // Check landing collision with any obstacle on the new wall near this y
    this._checkWallCollisionAt(this.character.position.y);
  }

  /* ---------- Character sprite animation ---------- */
  // dir: +1 faces right, -1 faces left. The art faces right, so left needs a flip.
  _face(dir) {
    this.charFacing = dir;
    this._applyCharScale();
  }

  _applyCharScale() {
    const base = this.charBase || 1;
    this.character.scale.x = this.charFacing * base;
    this.character.scale.y = base;
  }

  // Switch which sheet the character mesh draws from (idle / walk / jump).
  _setCharAnim(name) {
    if (this.charAnimName === name) return;
    const anim = this.anims[name];
    this.charAnimName = name;
    this.charBase = anim.scale;
    this.character.material.map = anim.texture;
    this.character.material.needsUpdate = true;
    this.animClock = 0;
    setAnimFrame(anim, 0);
    this._applyCharScale();
  }

  _syncCharacterAnim(dt) {
    if (this.state === STATE.READY) {
      this._setCharAnim('idle');
    } else if (this.state === STATE.JUMP) {
      this._setCharAnim('jump');
      // Hold one stretched-leap frame for the whole arc so the airborne pose
      // stays steady instead of flickering through the sheet's other poses.
      setAnimFrame(this.anims.jump, JUMP_HOLD_FRAME);
    } else if (this.state === STATE.CLIMB) {
      this._setCharAnim('walk');
      const anim = this.anims.walk;
      // Walk plays while climbing; freezes while charging, speeds up while sprinting.
      let rate = 1;
      if (this.sprintEnabled && this.holding) rate = this.holdTime >= this.sprintHoldTime ? SPRINT_MULT : 0;
      this.animClock += dt * rate;
      setAnimFrame(anim, Math.floor(this.animClock * anim.fps) % anim.frameCount);
    }
    // DEAD: leave the character frozen on its last frame.
  }

  /* ---------- Sprint-charge ring ---------- */
  _updateChargeRing() {
    const ring = this.chargeRing;
    if (!ring) return;
    // Visible whenever the player is holding while climbing: it fills up over the
    // hold time, then stays full (green) while the sprint is active.
    const holdingToCharge = this.sprintEnabled && this.state === STATE.CLIMB && this.holding;
    if (!holdingToCharge) {
      if (ring.visible) ring.visible = false;
      return;
    }
    this._drawChargeRing(Math.min(1, this.holdTime / this.sprintHoldTime));
    ring.position.set(
      this.character.position.x,
      this.character.position.y + CHARGE_RING_OFFSET,
      1.2
    );
    ring.visible = true;
  }

  _drawChargeRing(progress) {
    const ctx = this.chargeCtx;
    const S = this.chargeCanvas.width;
    const cx = S / 2, cy = S / 2, r = S * 0.36, lw = S * 0.16;
    ctx.clearRect(0, 0, S, S);
    // dark outline for contrast over the bright sky
    ctx.lineWidth = lw + 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // empty track
    ctx.lineWidth = lw;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // filled arc (clockwise from the top) — turns green right as it tops off
    ctx.lineCap = 'round';
    ctx.strokeStyle = progress >= 1 ? '#7ed957' : '#ffd447';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
    this.chargeTex.needsUpdate = true;
  }

  /* ---------- Main tick ---------- */
  _tick = (now) => {
    if (!this.running) return;
    requestAnimationFrame(this._tick);
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05;  // clamp big gaps

    this._update(dt);
    this._render();
  };

  _update(dt) {
    if (this.state === STATE.READY) {
      this.charBobPhase += dt * 3.5;
      this.character.position.y = GROUND_STAND_Y + Math.abs(Math.sin(this.charBobPhase)) * 0.12;
      this.character.rotation.z = Math.sin(this.charBobPhase * 2) * 0.04;
    } else if (this.state === STATE.CLIMB) {
      // Climb sway rides on top of the quarter-turn base (head up against the wall).
      const climbRot = this.wallSide * CLIMB_ROT;
      if (this.sprintEnabled && this.holding) {
        this.holdTime += dt;
        if (this.holdTime >= this.sprintHoldTime) {
          // Sprinting: climb faster. Charge whir stops; a one-shot "ready" ding
          // fires the moment we cross the threshold; footsteps speed up.
          audio.stopCharge();
          audio.startClimb(1.7);
          if (!this._sprintReadyPlayed) { audio.sfx('sprintReady'); this._sprintReadyPlayed = true; }
          this.character.position.y += this.climbSpeed * SPRINT_MULT * dt;
          this.charBobPhase += dt * 10 * SPRINT_MULT;
          this.character.rotation.z = climbRot + Math.sin(this.charBobPhase) * 0.05;
        } else {
          // Paused / charging: hold position with a small charge wiggle (no steps)
          audio.stopClimb();
          audio.startCharge();
          this.character.rotation.z = climbRot + Math.sin(this.holdTime * 28) * 0.04;
        }
      } else {
        // Normal climb: steady footsteps.
        audio.stopCharge();
        audio.startClimb(1);
        this.character.position.y += this.climbSpeed * dt;
        this.charBobPhase += dt * 10;
        this.character.rotation.z = climbRot + Math.sin(this.charBobPhase) * 0.05;
      }
      this._checkWallCollisionAt(this.character.position.y);
    } else if (this.state === STATE.JUMP) {
      this.jumpT += dt / this.jumpDuration;
      const t = Math.min(1, this.jumpT);
      const x = this.jumpFromX + (this.jumpToX - this.jumpFromX) * t;
      const y = this.jumpFromY + (this.jumpToY - this.jumpFromY) * t + JUMP_ARC * Math.sin(t * Math.PI);
      this.character.position.x = x;
      this.character.position.y = y;
      this.character.rotation.z = (this.wallSide === -1 ? -1 : 1) * Math.sin(t * Math.PI) * 0.35;

      this._checkMidairCollision();

      if (t >= 1) {
        this._finishJump();
      }
    }

    // Advance the character's sprite animation to match its current state
    this._syncCharacterAnim(dt);
    this._updateChargeRing();

    // Spawn new obstacles as the player climbs
    const spawnUntil = Math.max(this.character.position.y, this.camera.position.y) + this.viewHalfH + 6;
    while (this.nextObstacleY < spawnUntil) {
      this._spawnObstacleAt(this.nextObstacleY);
      const shrink = Math.min(1.0, this.score * SPACING_SHRINK_PER_SCORE);
      const spacing = Math.max(OBSTACLE_SPACING_MIN, OBSTACLE_SPACING_BASE - shrink);
      this.nextObstacleY += spacing;
    }

    // Recycle obstacles that fell below view
    const despawnBelow = this.camera.position.y - this.viewHalfH - 3;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      if (this.obstacles[i].y < despawnBelow) {
        const o = this.obstacles[i];
        this.scene.remove(o.mesh);
        this.obstacles.splice(i, 1);
        this.obstaclePool.push(o);
      }
    }

    // Animate obstacles (hovering bird of prey — gentle wing-tilt, desynced by position)
    this._obsTime = (this._obsTime || 0) + dt;
    for (const o of this.obstacles) {
      if (o.type === 'saw') {
        o.mesh.rotation.z = Math.sin(this._obsTime * 5 + o.y) * 0.18;
      }
    }

    // Camera follow (smooth, upward-only)
    const charTargetY = this.character.position.y + CAM_FOLLOW_OFFSET;
    if (charTargetY > this.cameraTargetY) this.cameraTargetY = charTargetY;
    const dy = this.cameraTargetY - this.camera.position.y;
    if (this.camIntro && !this.camIntroGlide) {
      // Hold the raised intro framing until the first jump.
    } else if (this.camIntro) {
      this.camera.position.y += dy * Math.min(1, CAM_INTRO_SMOOTH * dt);
      if (Math.abs(this.cameraTargetY - this.camera.position.y) < 0.05) this.camIntro = false;
    } else {
      this.camera.position.y += dy * Math.min(1, CAM_SMOOTH * dt);
    }

    // Parallax the background a bit (it follows camera, slower)
    this.bg.position.y = this.camera.position.y;

    // Walls follow camera so the tall tiled strip stays visible
    const camY = this.camera.position.y;
    this.wallL.position.y = camY;
    this.wallR.position.y = camY;
    // Adjust texture offset so the wall texture stays fixed in world space
    // (mesh follows camera, so offset must rise WITH camY — tile is 2 world units tall)
    const uvOffset = camY / this.WALL_TILE_H;   // scroll in lockstep with the world
    this.wallL.material.map.offset.y = uvOffset;
    this.wallR.material.map.offset.y = uvOffset;
  }

  _render() {
    this.renderer.render(this.scene, this.camera);
  }

  /* ---------- Obstacles ---------- */
  _spawnObstacleAt(y) {
    // Alternate: pick based on this wall index parity + small randomness
    const idx = Math.round((y - START_Y) / OBSTACLE_SPACING_BASE);
    const side = idx % 2 === 0 ? -1 : 1;

    this._addWallObstacle(side, y);

    // Possibly add a mid-air obstacle between this and next
    const midChance = Math.min(
      MIDAIR_CHANCE_MAX,
      MIDAIR_CHANCE_BASE + this.score * MIDAIR_CHANCE_GROWTH
    );
    if (idx >= 2 && Math.random() < midChance) {
      // Place in between (offset from the wall obstacle y)
      const offsetY = y + 1.7 + Math.random() * 0.5;
      // Avoid overlapping with next wall obstacle
      if (offsetY + 0.8 < this.nextObstacleY + OBSTACLE_SPACING_BASE) {
        this._addMidairObstacle(offsetY);
      }
    }
  }

  _addWallObstacle(side, y) {
    const o = this._acquireObstacle(side === -1 ? 'spikeL' : 'spikeR');
    // Tuck the branch toward its own wall (left ones left, right ones right) so
    // its root reads as rooted into the trunk instead of floating in the gap.
    const cx = side === -1
      ? -WALL_INNER_X + WALL_SPIKE_W / 2 - WALL_SPIKE_OVERLAP
      : WALL_INNER_X - WALL_SPIKE_W / 2 + WALL_SPIKE_OVERLAP;
    o.mesh.position.set(cx, y, 0.3);
    o.mesh.visible = true;   // reset in case this pooled obstacle was dodged before
    o.type = 'wall';
    o.side = side;
    o.x = cx;
    o.y = y;
    o.hitW = WALL_SPIKE_HITBOX_W;
    o.hitH = WALL_SPIKE_HITBOX_H;
    o.dodged = false;
    // position the spike tip toward the gap — texture already oriented
    this.scene.add(o.mesh);
    this.obstacles.push(o);
  }

  _addMidairObstacle(y) {
    const o = this._acquireObstacle('saw');
    const x = (Math.random() - 0.5) * 1.4; // near center
    o.mesh.position.set(x, y, 0.5);
    o.mesh.rotation.z = 0;
    o.type = 'saw';
    o.side = 0;
    o.x = x;
    o.y = y;
    o.hitW = SAW_HITBOX;
    o.hitH = SAW_HITBOX;
    this.scene.add(o.mesh);
    this.obstacles.push(o);
  }

  _acquireObstacle(kind) {
    // Try to reuse
    for (let i = 0; i < this.obstaclePool.length; i++) {
      if (this.obstaclePool[i].kind === kind) {
        return this.obstaclePool.splice(i, 1)[0];
      }
    }
    let geo, mat;
    if (kind === 'spikeL') {
      geo = new THREE.PlaneGeometry(WALL_SPIKE_W, WALL_SPIKE_H);
      mat = new THREE.MeshBasicMaterial({ map: this.tex.spikeL, transparent: true, depthTest: false });
    } else if (kind === 'spikeR') {
      geo = new THREE.PlaneGeometry(WALL_SPIKE_W, WALL_SPIKE_H);
      mat = new THREE.MeshBasicMaterial({ map: this.tex.spikeR, transparent: true, depthTest: false });
    } else {
      geo = new THREE.PlaneGeometry(1.0, 1.0);
      mat = new THREE.MeshBasicMaterial({ map: this.tex.saw, transparent: true, depthTest: false });
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = this._ro.obstacle;
    return { kind, mesh, type: null, side: 0, x: 0, y: 0, hitW: 0, hitH: 0 };
  }

  /* ---------- Collision ---------- */
  _checkWallCollisionAt(charY) {
    const chX = this.character.position.x;
    for (const o of this.obstacles) {
      if (o.type !== 'wall') continue;
      if (o.side !== this.wallSide) continue;
      if (o.dodged) continue;   // already dodged this branch — don't re-trigger
      // Only wall obstacles on same wall
      const dy = Math.abs(o.y - charY);
      if (dy < (CHAR_HITBOX_H / 2 + o.hitH / 2)) {
        const dx = Math.abs(o.x - chX);
        if (dx < (CHAR_HITBOX_W / 2 + o.hitW / 2)) {
          // Dodge ability: spend a charge to phase through the branch instead of
          // dying. Mark + hide it so the per-frame climb check fires only once.
          if (this.dodgeCharges > 0) {
            this.dodgeCharges -= 1;
            o.dodged = true;
            o.mesh.visible = false;
            audio.sfx('dodge');
            if (this.callbacks.onDodge) this.callbacks.onDodge(this.dodgeCharges);
            return;
          }
          this._die();
          return;
        }
      }
    }
  }

  _checkMidairCollision() {
    const chX = this.character.position.x;
    const chY = this.character.position.y;
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      if (o.type !== 'saw') continue;
      const dy = Math.abs(o.y - chY);
      if (dy > (CHAR_HITBOX_H / 2 + o.hitH / 2)) continue;
      const dx = Math.abs(o.x - chX);
      if (dx >= (CHAR_HITBOX_W / 2 + o.hitW / 2)) continue;
      // Where the bird died, in screen pixels — so the HUD can pop "+1" there.
      const sp = this._projectToScreen(o.mesh.position.x, o.mesh.position.y, o.mesh.position.z);
      // Priority 1: a sprint jump smashes the obstacle for free (+bonus), and
      // must NOT consume an Air-Strike upgrade charge. Requires the sprint-smash unlock.
      if (this.isSprintJump && this.sprintSmash) {
        this.scene.remove(o.mesh);
        this.obstacles.splice(i, 1);
        this.obstaclePool.push(o);
        i -= 1;
        this.score += SPRINT_SMASH_SCORE;
        audio.sfx('sprintSmash');
        if (this.callbacks.onScore) this.callbacks.onScore(this.score);
        if (this.callbacks.onScorePop) this.callbacks.onScorePop(SPRINT_SMASH_SCORE);
        if (this.callbacks.onSprintSmash) this.callbacks.onSprintSmash(sp);
        continue;
      }
      // Priority 2: spend an Air-Strike charge if we have one.
      if (this.swordCharges > 0) {
        this.swordCharges -= 1;
        this.scene.remove(o.mesh);
        this.obstacles.splice(i, 1);
        this.obstaclePool.push(o);
        i -= 1;
        audio.sfx('swordSlash');
        if (this.callbacks.onSwordSlash) this.callbacks.onSwordSlash(this.swordCharges, sp);
        continue;
      }
      this._die();
      return;
    }
  }

  // World point → canvas pixel coords (for HUD overlays anchored to the world).
  _projectToScreen(wx, wy, wz) {
    this._projV = this._projV || new THREE.Vector3();
    this._projV.set(wx, wy, wz).project(this.camera);
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    return {
      x: (this._projV.x * 0.5 + 0.5) * w,
      y: (-this._projV.y * 0.5 + 0.5) * h,
    };
  }

  _die() {
    if (this.state === STATE.DEAD) return;
    this.state = STATE.DEAD;
    this.running = false;
    audio.stopCharge();
    audio.stopClimb();
    audio.sfx('death');
    if (this.callbacks.onGameOver) this.callbacks.onGameOver(this.score);
  }
}
