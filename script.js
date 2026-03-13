const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const muteToggleButton = document.getElementById("mute-toggle");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const phaseSelect = document.getElementById("phase-select");
const fullscreenButton = document.getElementById("fullscreen-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GRAVITY = 0.48;
const MOVE_SPEED = 4.55;
const JUMP_SPEED = -11.1;
const TURN_BOOST = 1.12;
const GROUND_STOP_FRICTION = 0.56;
const AIR_STOP_FRICTION = 0.8;
const RESPAWN_LOCK_FRAMES = 22;
const RESPAWN_DROP_HEIGHT = 20;
const MUSIC_STEP_DURATION = 0.72;
const FRAME_UNIT = 1000 / 60;
const MAX_FRAME_MS = 1000 / 24;
const MAX_UPDATE_STEPS = 3;
const TRANSITION_HALF_DURATION = 20;
const CUTSCENE_DURATION = 168;
const AudioContextClass = window.AudioContext || window["webkitAudioContext"];

let audioContext = null;
let audioMasterGain = null;
let audioSfxGain = null;
let audioMusicGain = null;
let musicLoopStarted = false;
let musicLoopTimer = null;
let musicStepIndex = 0;
let lastFrameTime = null;
let frameAccumulator = 0;

const keys = {
  left: false,
  right: false,
  jump: false,
};

const levelMessages = [
  "Fase 1: atravesse os telhados e pegue a chave.",
  "Fase 2: suba pelo beco de espinhos, pegue a chave e alcance o portal.",
  "Fase 3: atravesse a cela, pegue a última chave e liberte o garoto.",
];

const levels = [
  {
    name: "Telhados de Neon",
    skyGlow: "#ff5c8a",
    start: { x: 60, y: 390 },
    checkpoint: {
      x: 488,
      y: 206,
      width: 24,
      height: 54,
      spawn: { x: 500, y: 208 },
      label: "Checkpoint no telhado alto.",
    },
    key: { x: 760, y: 160, color: "#ff9b54" },
    goal: { x: 868, y: 362, width: 46, height: 62, type: "portal" },
    platforms: [
      { x: 0, y: 440, width: 240, height: 100 },
      { x: 120, y: 352, width: 130, height: 18 },
      { x: 300, y: 306, width: 136, height: 18 },
      { x: 492, y: 260, width: 126, height: 18 },
      { x: 674, y: 214, width: 138, height: 18 },
      { x: 830, y: 380, width: 130, height: 160 },
    ],
    hazards: [],
    decor: [
      { x: 80, y: 440, w: 70, h: 70 },
      { x: 260, y: 440, w: 90, h: 110 },
      { x: 640, y: 440, w: 72, h: 90 },
    ],
  },
  {
    name: "Beco dos Espinhos",
    skyGlow: "#87f0ff",
    start: { x: 56, y: 378 },
    checkpoint: {
      x: 630,
      y: 192,
      width: 24,
      height: 54,
      spawn: { x: 650, y: 196 },
      label: "Checkpoint no beco alto.",
    },
    key: { x: 708, y: 182, color: "#87f0ff" },
    goal: { x: 864, y: 226, width: 42, height: 58, type: "portal" },
    platforms: [
      { x: 0, y: 430, width: 170, height: 110 },
      { x: 160, y: 378, width: 132, height: 18 },
      { x: 322, y: 336, width: 120, height: 18 },
      { x: 474, y: 292, width: 122, height: 18 },
      { x: 640, y: 246, width: 118, height: 18 },
      { x: 740, y: 352, width: 72, height: 18 },
      { x: 804, y: 286, width: 156, height: 254 },
    ],
    hazards: [
      { x: 188, y: 430, width: 110, height: 18 },
      { x: 332, y: 430, width: 108, height: 18 },
      { x: 476, y: 430, width: 110, height: 18 },
      { x: 622, y: 430, width: 122, height: 18 },
    ],
    decor: [
      { x: 98, y: 440, w: 60, h: 88 },
      { x: 274, y: 440, w: 64, h: 120 },
      { x: 542, y: 440, w: 72, h: 164 },
      { x: 840, y: 440, w: 54, h: 134 },
    ],
  },
  {
    name: "Cela de Neon",
    skyGlow: "#ff9b54",
    start: { x: 48, y: 388 },
    checkpoint: {
      x: 524,
      y: 234,
      width: 24,
      height: 54,
      spawn: { x: 608, y: 236 },
      label: "Checkpoint no caminho da cela.",
    },
    key: { x: 414, y: 204, color: "#ff5c8a" },
    goal: { x: 826, y: 118, width: 78, height: 142, type: "rescue" },
    platforms: [
      { x: 0, y: 438, width: 148, height: 102 },
      { x: 166, y: 388, width: 88, height: 18 },
      { x: 298, y: 340, width: 94, height: 18 },
      { x: 214, y: 286, width: 88, height: 18 },
      { x: 378, y: 236, width: 106, height: 18 },
      { x: 536, y: 288, width: 102, height: 18 },
      { x: 684, y: 238, width: 98, height: 18 },
      { x: 806, y: 260, width: 154, height: 280 },
    ],
    hazards: [
      { x: 164, y: 438, width: 110, height: 18 },
      { x: 312, y: 438, width: 116, height: 18 },
      { x: 470, y: 438, width: 122, height: 18 },
      { x: 636, y: 438, width: 136, height: 18 },
      { x: 554, y: 270, width: 52, height: 18 },
      { x: 704, y: 220, width: 48, height: 18 },
    ],
    decor: [
      { x: 92, y: 440, w: 70, h: 104 },
      { x: 354, y: 440, w: 88, h: 150 },
      { x: 610, y: 440, w: 62, h: 128 },
      { x: 760, y: 440, w: 64, h: 172 },
    ],
  },
];

const game = {
  state: "menu",
  levelIndex: 0,
  deaths: 0,
  flashes: [],
  particles: [],
  weatherParticles: [],
  messageTimer: 0,
  message: "",
  player: createPlayer(getSpawnPoint(levels[0].start)),
  collectedKey: false,
  respawnTimer: 0,
  endingUnlocked: false,
  cageOpenProgress: 0,
  muted: false,
  tick: 0,
  activeCheckpoint: null,
  pauseLabel: "",
  screenShake: 0,
  selectedMenuLevel: 0,
  frameDelta: 1,
  weatherLevelIndex: -1,
  transitionTimer: 0,
  transitionTargetLevel: 0,
  transitionText: "",
  cutsceneTimer: 0,
  cutsceneStage: 0,
  cutsceneTargetX: 0,
};

function getSpawnPoint(start) {
  return {
    x: start.x,
    y: start.y - RESPAWN_DROP_HEIGHT,
  };
}

function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    prevX: start.x,
    prevY: start.y,
    width: 28,
    height: 52,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
  };
}

function getRenderLevelIndex() {
  if (game.state === "menu") {
    return game.selectedMenuLevel;
  }

  return Math.min(game.levelIndex, levels.length - 1);
}

function getLevel() {
  return levels[getRenderLevelIndex()];
}

function clearLevelProgress() {
  game.collectedKey = false;
  game.endingUnlocked = false;
  game.cageOpenProgress = 0;
  game.activeCheckpoint = null;
}

function spawnPlayer() {
  const level = getLevel();
  const spawnBase = game.activeCheckpoint ? game.activeCheckpoint.spawn : level.start;
  const spawn = getSpawnPoint(spawnBase);
  game.player = createPlayer(spawn);
  game.player.vy = 0.8;
  game.respawnTimer = RESPAWN_LOCK_FRAMES;
}

function enterLevel() {
  clearLevelProgress();
  spawnPlayer();
  game.message = levelMessages[game.levelIndex];
  game.messageTimer = 180;
}

function startGame() {
  ensureAudioReady();
  game.state = "playing";
  game.levelIndex = game.selectedMenuLevel;
  game.deaths = 0;
  game.flashes = [];
  game.particles = [];
  game.screenShake = 0;
  enterLevel();
  playSound("start");
  updateUiState();
}

function restartLevel() {
  if (game.state === "menu") {
    startGame();
    return;
  }

  game.state = "playing";
  game.flashes = [];
  game.particles = [];
  game.screenShake = 0;
  enterLevel();
  playSound("portal");
  updateUiState();
}

function togglePause() {
  if (game.state === "playing") {
    game.state = "paused";
    game.pauseLabel = "Pausado";
    updateUiState();
    return;
  }

  if (game.state === "paused") {
    game.state = "playing";
    game.pauseLabel = "";
    updateUiState();
  }
}

function nextLevel() {
  game.levelIndex += 1;

  if (game.levelIndex >= levels.length) {
    game.state = "victory";
    game.pauseLabel = "";
    playSound("rescue");
    updateUiState();
    return;
  }

  game.state = "playing";
  enterLevel();
  playSound("portal");
  updateUiState();
}

function startLevelTransition(nextLevelIndex) {
  game.state = "transition";
  game.transitionTimer = 0;
  game.transitionTargetLevel = nextLevelIndex;
  game.transitionText = `Fase ${nextLevelIndex + 1}: ${levels[nextLevelIndex].name}`;
  game.pauseLabel = "";
  updateUiState();
}

function startEndingCutscene() {
  const level = getLevel();
  game.state = "cutscene";
  game.cutsceneTimer = 0;
  game.cutsceneStage = 0;
  game.cutsceneTargetX = level.goal.x + 22;
  game.message = "";
  game.messageTimer = 0;
  game.player.vx = 0;
  game.player.vy = 0;
  updateUiState();
}

function addFlash(x, y, color, radius = 12, life = 24) {
  game.flashes.push({ x, y, color, radius, life });
}

function addParticles(x, y, color, amount, power) {
  for (let index = 0; index < amount; index += 1) {
    const angle = (Math.PI * 2 * index) / amount + Math.random() * 0.35;
    const speed = power * (0.45 + Math.random() * 0.75);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 0.8,
      radius: 2 + Math.random() * 3,
      life: 26 + Math.floor(Math.random() * 16),
      color,
    });
  }
}

function ensureAudioReady() {
  if (!AudioContextClass) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
    audioMasterGain = audioContext.createGain();
    audioSfxGain = audioContext.createGain();
    audioMusicGain = audioContext.createGain();

    audioMasterGain.gain.value = 1.08;
    audioSfxGain.gain.value = 1.08;
    audioMusicGain.gain.value = 0.36;

    audioSfxGain.connect(audioMasterGain);
    audioMusicGain.connect(audioMasterGain);
    audioMasterGain.connect(audioContext.destination);
  }

  if (audioContext.state !== "running") {
    audioContext.resume().then(() => {
      applyMuteState();
      if (musicLoopStarted && !musicLoopTimer) {
        scheduleMusicStep();
      }
    }).catch(() => {});
  }

  if (!musicLoopStarted) {
    startMusicLoop();
  }

  applyMuteState();
}

function createNoiseBuffer() {
  if (!audioContext) {
    return null;
  }

  const length = Math.max(1, Math.floor(audioContext.sampleRate * 0.18));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.35;
  }

  return buffer;
}

function playTone({
  type = "sine",
  frequency = 440,
  frequencyEnd = frequency,
  duration = 0.18,
  gain = 0.06,
  delay = 0,
  bus = "sfx",
}) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, frequencyEnd), now + duration);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(bus === "music" ? audioMusicGain : audioSfxGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function playNoise({ duration = 0.1, gain = 0.03, delay = 0, bus = "sfx" }) {
  if (!audioContext) {
    return;
  }

  const buffer = createNoiseBuffer();

  if (!buffer) {
    return;
  }

  const now = audioContext.currentTime + delay;
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gainNode = audioContext.createGain();

  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.setValueAtTime(420, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(bus === "music" ? audioMusicGain : audioSfxGain);
  source.start(now);
  source.stop(now + duration + 0.02);
}

function playMusicLayer(step) {
  const themes = [
    [
      { bass: 130.81, chord: [261.63, 311.13, 392.0], pad: "triangle" },
      { bass: 146.83, chord: [293.66, 349.23, 440.0], pad: "triangle" },
      { bass: 174.61, chord: [261.63, 349.23, 415.3], pad: "sine" },
      { bass: 146.83, chord: [246.94, 329.63, 392.0], pad: "triangle" },
    ],
    [
      { bass: 123.47, chord: [246.94, 293.66, 369.99], pad: "square" },
      { bass: 138.59, chord: [277.18, 329.63, 415.3], pad: "triangle" },
      { bass: 164.81, chord: [246.94, 329.63, 392.0], pad: "square" },
      { bass: 138.59, chord: [220.0, 329.63, 392.0], pad: "triangle" },
    ],
    [
      { bass: 110.0, chord: [220.0, 277.18, 329.63], pad: "sine" },
      { bass: 130.81, chord: [261.63, 311.13, 392.0], pad: "triangle" },
      { bass: 146.83, chord: [293.66, 369.99, 440.0], pad: "sine" },
      { bass: 98.0, chord: [196.0, 261.63, 329.63], pad: "triangle" },
    ],
  ];
  const progression = themes[getRenderLevelIndex()] || themes[0];
  const current = progression[step % progression.length];

  playTone({
    type: current.pad,
    frequency: current.bass,
    frequencyEnd: current.bass * 0.96,
    duration: 0.6,
    gain: getRenderLevelIndex() === 2 ? 0.034 : 0.03,
    bus: "music",
  });

  for (let index = 0; index < current.chord.length; index += 1) {
    playTone({
      type: getRenderLevelIndex() === 1 && index === 0 ? "square" : index === 1 ? "sine" : "triangle",
      frequency: current.chord[index],
      frequencyEnd: current.chord[index] * 1.005,
      duration: 0.44,
      gain: 0.018,
      delay: 0.08 * index,
      bus: "music",
    });
  }

  playNoise({
    duration: 0.12,
    gain: 0.004,
    delay: 0.06,
    bus: "music",
  });
}

function scheduleMusicStep() {
  if (!audioContext || !musicLoopStarted) {
    return;
  }

  musicLoopTimer = null;

  if (audioContext.state !== "running") {
    return;
  }

  playMusicLayer(musicStepIndex);
  musicStepIndex = (musicStepIndex + 1) % 4;
  musicLoopTimer = window.setTimeout(scheduleMusicStep, MUSIC_STEP_DURATION * 1000);
}

function startMusicLoop() {
  if (musicLoopStarted) {
    return;
  }

  musicLoopStarted = true;
  musicStepIndex = 0;
  scheduleMusicStep();
}

function applyMuteState() {
  if (!audioMasterGain) {
    updateUiState();
    return;
  }

  audioMasterGain.gain.setValueAtTime(game.muted ? 0.0001 : 1.08, audioContext.currentTime);
  updateUiState();
}

function playSoundNow(name) {
  if (!audioContext) {
    return;
  }

  if (name === "start") {
    playTone({ type: "triangle", frequency: 260, frequencyEnd: 390, duration: 0.16, gain: 0.05 });
    playTone({ type: "sine", frequency: 390, frequencyEnd: 520, duration: 0.18, gain: 0.04, delay: 0.08 });
    return;
  }

  if (name === "jump") {
    playTone({ type: "triangle", frequency: 280, frequencyEnd: 420, duration: 0.14, gain: 0.045 });
    return;
  }

  if (name === "checkpoint") {
    playTone({ type: "triangle", frequency: 520, frequencyEnd: 680, duration: 0.12, gain: 0.04 });
    playTone({ type: "sine", frequency: 760, frequencyEnd: 940, duration: 0.16, gain: 0.03, delay: 0.05 });
    return;
  }

  if (name === "key") {
    playTone({ type: "sine", frequency: 880, frequencyEnd: 1240, duration: 0.12, gain: 0.05 });
    playTone({ type: "triangle", frequency: 1320, frequencyEnd: 1660, duration: 0.14, gain: 0.035, delay: 0.06 });
    playNoise({ duration: 0.08, gain: 0.014, delay: 0.02 });
    return;
  }

  if (name === "portal") {
    playTone({ type: "sine", frequency: 320, frequencyEnd: 640, duration: 0.22, gain: 0.05 });
    playTone({ type: "triangle", frequency: 210, frequencyEnd: 410, duration: 0.22, gain: 0.03, delay: 0.05 });
    return;
  }

  if (name === "cage-open") {
    playTone({ type: "square", frequency: 220, frequencyEnd: 660, duration: 0.18, gain: 0.045 });
    playTone({ type: "triangle", frequency: 660, frequencyEnd: 990, duration: 0.18, gain: 0.03, delay: 0.07 });
    playNoise({ duration: 0.1, gain: 0.02, delay: 0.03 });
    return;
  }

  if (name === "death") {
    playTone({ type: "sawtooth", frequency: 300, frequencyEnd: 70, duration: 0.28, gain: 0.055 });
    playNoise({ duration: 0.12, gain: 0.018, delay: 0.01 });
    return;
  }

  if (name === "rescue") {
    playTone({ type: "triangle", frequency: 392, frequencyEnd: 392, duration: 0.18, gain: 0.05 });
    playTone({ type: "triangle", frequency: 494, frequencyEnd: 494, duration: 0.18, gain: 0.05, delay: 0.1 });
    playTone({ type: "triangle", frequency: 588, frequencyEnd: 588, duration: 0.22, gain: 0.05, delay: 0.2 });
  }
}

function playSound(name) {
  ensureAudioReady();

  if (!audioContext) {
    return;
  }

  if (audioContext.state !== "running") {
    audioContext.resume().then(() => {
      if (audioContext && audioContext.state === "running") {
        playSoundNow(name);
      }
    }).catch(() => {});
    return;
  }

  playSoundNow(name);
}

function updateUiState() {
  if (phaseSelect) {
    phaseSelect.value = String(game.selectedMenuLevel);
    phaseSelect.disabled = game.state === "playing" || game.state === "paused";
  }

  if (fullscreenButton) {
    const isFullscreen = Boolean(document.fullscreenElement);
    fullscreenButton.textContent = isFullscreen ? "Sair da tela cheia" : "Tela cheia";
  }

  if (muteToggleButton) {
    muteToggleButton.textContent = game.muted ? "Som: mudo" : "Som: ligado";
    muteToggleButton.setAttribute("aria-pressed", String(game.muted));
  }

  if (startButton) {
    if (game.state === "menu") {
      startButton.textContent = "Jogar agora";
    } else if (game.state === "victory") {
      startButton.textContent = "Jogar de novo";
    } else {
      startButton.textContent = "Reiniciar fase";
    }
  }

  if (pauseButton) {
    pauseButton.disabled = !["playing", "paused"].includes(game.state);
    pauseButton.textContent = game.state === "paused" ? "Retomar" : "Pausar";
  }
}

function createWeatherParticle(levelIndex, x = Math.random() * WIDTH, y = Math.random() * HEIGHT) {
  if (levelIndex === 0) {
    return {
      x,
      y,
      vx: -0.18 - Math.random() * 0.22,
      vy: 0.24 + Math.random() * 0.28,
      size: 1 + Math.random() * 2.3,
      life: 120 + Math.random() * 140,
      alpha: 0.18 + Math.random() * 0.22,
      kind: "mist",
    };
  }

  if (levelIndex === 1) {
    return {
      x,
      y,
      vx: -0.48 - Math.random() * 0.4,
      vy: 2.3 + Math.random() * 1.4,
      size: 12 + Math.random() * 18,
      life: 80 + Math.random() * 60,
      alpha: 0.15 + Math.random() * 0.18,
      kind: "rain",
    };
  }

  return {
    x,
    y,
    vx: -0.12 + Math.random() * 0.24,
    vy: 0.5 + Math.random() * 0.7,
    size: 1.4 + Math.random() * 2.4,
    life: 90 + Math.random() * 80,
    alpha: 0.18 + Math.random() * 0.24,
    kind: "ember",
  };
}

function ensureWeatherParticles() {
  const levelIndex = getRenderLevelIndex();

  if (game.weatherLevelIndex === levelIndex && game.weatherParticles.length > 0) {
    return;
  }

  game.weatherLevelIndex = levelIndex;
  game.weatherParticles = Array.from({ length: 34 }, () => createWeatherParticle(levelIndex));
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function updateEffects() {
  ensureWeatherParticles();

  if (game.messageTimer > 0) {
    game.messageTimer = Math.max(0, game.messageTimer - game.frameDelta);
  }

  game.tick += game.frameDelta;
  game.screenShake *= Math.pow(0.84, game.frameDelta);

  if (game.endingUnlocked && game.cageOpenProgress < 1) {
    game.cageOpenProgress = Math.min(1, game.cageOpenProgress + 0.07 * game.frameDelta);
  }

  game.flashes = game.flashes.filter((flash) => {
    flash.radius += 1.5 * game.frameDelta;
    flash.life -= game.frameDelta;
    return flash.life > 0;
  });

  game.particles = game.particles.filter((particle) => {
    particle.x += particle.vx * game.frameDelta;
    particle.y += particle.vy * game.frameDelta;
    particle.vy += 0.08 * game.frameDelta;
    particle.vx *= Math.pow(0.99, game.frameDelta);
    particle.radius *= Math.pow(0.985, game.frameDelta);
    particle.life -= game.frameDelta;
    return particle.life > 0 && particle.radius > 0.5;
  });

  const levelIndex = getRenderLevelIndex();
  game.weatherParticles = game.weatherParticles.map((particle) => {
    const next = { ...particle };
    next.x += next.vx * game.frameDelta;
    next.y += next.vy * game.frameDelta;
    next.life -= game.frameDelta;

    if (next.kind === "mist") {
      next.x += Math.sin((game.tick + next.y) * 0.01) * 0.2 * game.frameDelta;
      next.alpha = 0.16 + Math.sin((game.tick + next.x) * 0.02) * 0.06;
    }

    if (next.kind === "ember") {
      next.x += Math.sin((game.tick + next.y) * 0.03) * 0.35 * game.frameDelta;
      next.vy *= Math.pow(0.995, game.frameDelta);
    }

    if (next.y > HEIGHT + 30 || next.x < -40 || next.life <= 0) {
      return createWeatherParticle(levelIndex, WIDTH + Math.random() * 20, -20 - Math.random() * HEIGHT * 0.3);
    }

    return next;
  });
}

function updatePlaying() {
  const player = game.player;
  const level = getLevel();

  updateEffects();
  storePlayerPreviousPosition();

  if (game.respawnTimer > 0) {
    game.respawnTimer = Math.max(0, game.respawnTimer - game.frameDelta);
    player.vx = 0;
    player.vy += GRAVITY * 0.85 * game.frameDelta;
    player.y += player.vy * game.frameDelta;
    player.grounded = false;
    resolvePlatformCollisions(player, level.platforms, "y");
    return;
  }

  const turningLeft = keys.left && player.vx > 0.35;
  const turningRight = keys.right && player.vx < -0.35;

  if (keys.left) {
    player.vx = -MOVE_SPEED * (player.grounded && turningLeft ? TURN_BOOST : 1);
    player.facing = -1;
    if (turningLeft) {
      player.prevX = player.x;
    }
  } else if (keys.right) {
    player.vx = MOVE_SPEED * (player.grounded && turningRight ? TURN_BOOST : 1);
    player.facing = 1;
    if (turningRight) {
      player.prevX = player.x;
    }
  } else {
    const stopFriction = player.grounded ? GROUND_STOP_FRICTION : AIR_STOP_FRICTION;
    player.vx *= Math.pow(stopFriction, game.frameDelta);
    if (Math.abs(player.vx) < 0.15) {
      player.vx = 0;
    }
  }

  if (keys.jump && player.grounded) {
    player.vy = JUMP_SPEED;
    player.grounded = false;
    playSound("jump");
  }

  player.vy += GRAVITY * game.frameDelta;

  player.x += player.vx * game.frameDelta;
  resolvePlatformCollisions(player, level.platforms, "x");
  player.y += player.vy * game.frameDelta;
  player.grounded = false;
  resolvePlatformCollisions(player, level.platforms, "y");

  if (player.y > HEIGHT + 80) {
    failLevel();
    return;
  }

  activateCheckpoint(level, player);

  if (!game.collectedKey && rectsOverlap(player, { ...level.key, width: 22, height: 22 })) {
    game.collectedKey = true;
    game.messageTimer = 160;
    addFlash(level.key.x + 10, level.key.y + 10, level.key.color, 16, 28);
    addParticles(level.key.x + 10, level.key.y + 10, level.key.color, 14, 2.8);

    if (game.levelIndex === levels.length - 1) {
      game.endingUnlocked = true;
      game.message = "A última chave brilhou. A cela explodiu em luz!";
      game.screenShake = 10;
      addFlash(level.goal.x + level.goal.width / 2, level.goal.y + 50, "#ff9b54", 30, 40);
      addParticles(level.goal.x + level.goal.width / 2, level.goal.y + 60, "#ff9b54", 28, 4.2);
      addParticles(level.goal.x + level.goal.width / 2, level.goal.y + 60, "#87f0ff", 16, 2.8);
      playSound("cage-open");
    } else {
      game.message = "Chave coletada. O caminho se abriu!";
      playSound("key");
    }
  }

  for (const hazard of level.hazards) {
    if (rectsOverlap(player, hazard)) {
      failLevel();
      return;
    }
  }

  if (game.collectedKey && rectsOverlap(player, level.goal)) {
    addFlash(level.goal.x + level.goal.width / 2, level.goal.y + 30, "#ffffff", 18, 26);
    if (game.levelIndex === levels.length - 1) {
      startEndingCutscene();
    } else {
      startLevelTransition(game.levelIndex + 1);
    }
  }
}

function updateTransition() {
  updateEffects();
  game.transitionTimer += game.frameDelta;

  if (game.transitionTimer >= TRANSITION_HALF_DURATION && game.levelIndex !== game.transitionTargetLevel) {
    game.levelIndex = game.transitionTargetLevel;
    enterLevel();
    playSound("portal");
  }

  if (game.transitionTimer >= TRANSITION_HALF_DURATION * 2) {
    game.state = "playing";
    game.transitionTimer = 0;
    game.transitionText = "";
    updateUiState();
  }
}

function updateCutscene() {
  updateEffects();
  storePlayerPreviousPosition();
  game.cutsceneTimer += game.frameDelta;
  game.player.facing = 1;
  game.player.x = Math.min(game.cutsceneTargetX, game.player.x + 1.2 * game.frameDelta);
  game.player.vx = 0;
  game.player.vy = 0;
  game.player.grounded = true;

  if (game.cutsceneTimer > 34 && Math.floor(game.cutsceneTimer) % 14 === 0) {
    const sparkleX = getLevel().goal.x + 36 + Math.random() * 20;
    const sparkleY = getLevel().goal.y + 28 + Math.random() * 32;
    addParticles(sparkleX, sparkleY, "#ff9b54", 6, 1.6);
    addParticles(sparkleX + 6, sparkleY - 8, "#87f0ff", 4, 1.1);
  }

  if (game.cutsceneTimer >= 96 && game.cutsceneStage === 0) {
    game.cutsceneStage = 1;
    game.screenShake = 4;
    addFlash(getLevel().goal.x + 36, getLevel().goal.y + 44, "#ffffff", 26, 32);
    addParticles(getLevel().goal.x + 36, getLevel().goal.y + 44, "#ffffff", 18, 2.4);
  }

  if (game.cutsceneTimer >= CUTSCENE_DURATION) {
    game.state = "victory";
    game.pauseLabel = "";
    playSound("rescue");
    updateUiState();
  }
}

function activateCheckpoint(level, player) {
  if (!level.checkpoint || game.activeCheckpoint === level.checkpoint) {
    return;
  }

  if (rectsOverlap(player, level.checkpoint)) {
    game.activeCheckpoint = level.checkpoint;
    game.message = level.checkpoint.label;
    game.messageTimer = 120;
    addFlash(level.checkpoint.x + 12, level.checkpoint.y + 26, "#87f0ff", 14, 22);
    addParticles(level.checkpoint.x + 12, level.checkpoint.y + 20, "#87f0ff", 10, 1.8);
    playSound("checkpoint");
  }
}

function resolvePlatformCollisions(player, platforms, axis) {
  for (const platform of platforms) {
    if (!rectsOverlap(player, platform)) {
      continue;
    }

    if (axis === "x") {
      if (player.vx > 0) {
        player.x = platform.x - player.width;
      } else if (player.vx < 0) {
        player.x = platform.x + platform.width;
      }
      player.vx = 0;
    } else if (player.vy > 0) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.grounded = true;
    } else if (player.vy < 0) {
      player.y = platform.y + platform.height;
      player.vy = 0;
    }
  }
}

function failLevel() {
  const player = game.player;
  game.deaths += 1;
  addFlash(player.x + player.width / 2, player.y + player.height / 2, "#ff5c8a", 14, 26);
  addParticles(player.x + player.width / 2, player.y + player.height / 2, "#ff5c8a", 12, 2.2);
  game.screenShake = 5;
  playSound("death");
  spawnPlayer();
  game.message = game.activeCheckpoint ? "Respawn no checkpoint." : levelMessages[game.levelIndex];
  game.messageTimer = 120;
}

function update() {
  if (game.state === "playing") {
    updatePlaying();
  } else if (game.state === "transition") {
    updateTransition();
  } else if (game.state === "cutscene") {
    updateCutscene();
  } else if (game.state === "menu" || game.state === "victory") {
    updateEffects();
  }
}

function draw() {
  const level = getLevel();
  const shakeX = game.screenShake > 0 ? (Math.random() - 0.5) * game.screenShake : 0;
  const shakeY = game.screenShake > 0 ? (Math.random() - 0.5) * game.screenShake : 0;
  const zoom = getSceneZoom();

  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-WIDTH / 2, -HEIGHT / 2);
  drawBackground(level);

  if (game.state === "menu") {
    drawMenu();
  } else if (game.state === "playing") {
    drawLevel(level);
    drawHud(level);
  } else if (game.state === "transition") {
    drawLevel(level);
    drawTransitionOverlay();
  } else if (game.state === "cutscene") {
    drawLevel(level);
    drawCutsceneOverlay();
  } else if (game.state === "paused") {
    drawLevel(level);
    drawHud(level);
    drawPauseOverlay();
  } else if (game.state === "victory") {
    drawVictory();
  }

  ctx.restore();
  drawPostProcessing(level);
}

function getSceneZoom() {
  if (game.state === "transition") {
    const total = TRANSITION_HALF_DURATION * 2;
    const progress = game.transitionTimer / total;
    return 1 + Math.sin(progress * Math.PI) * 0.12;
  }

  if (game.state === "cutscene") {
    return 1.03 + Math.min(0.05, game.cutsceneTimer / CUTSCENE_DURATION * 0.05);
  }

  if (game.state === "victory") {
    return 1.01 + Math.sin(game.tick * 0.02) * 0.01;
  }

  return 1;
}

function drawPostProcessing(level) {
  const profile = getPostProcessProfile(level);

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const skyBloom = ctx.createRadialGradient(
    profile.primaryX,
    profile.primaryY,
    18,
    profile.primaryX,
    profile.primaryY,
    profile.primaryRadius
  );
  skyBloom.addColorStop(0, hexToRgba(profile.bloomColor, profile.bloomStrength));
  skyBloom.addColorStop(0.4, hexToRgba(profile.bloomColor, profile.bloomStrength * 0.42));
  skyBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = skyBloom;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const horizonBloom = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT - 26,
    24,
    WIDTH / 2,
    HEIGHT - 26,
    420
  );
  horizonBloom.addColorStop(0, hexToRgba("#ff9b54", profile.horizonStrength));
  horizonBloom.addColorStop(0.45, hexToRgba("#ff5c8a", profile.horizonStrength * 0.42));
  horizonBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = horizonBloom;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (profile.centerStrength > 0) {
    const centerBloom = ctx.createRadialGradient(
      WIDTH / 2,
      HEIGHT / 2,
      12,
      WIDTH / 2,
      HEIGHT / 2,
      280
    );
    centerBloom.addColorStop(0, hexToRgba("#f9eefe", profile.centerStrength));
    centerBloom.addColorStop(0.5, hexToRgba(profile.bloomColor, profile.centerStrength * 0.32));
    centerBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = centerBloom;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.restore();

  ctx.save();
  const vignette = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT / 2,
    WIDTH * 0.18,
    WIDTH / 2,
    HEIGHT / 2,
    WIDTH * 0.76
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.58, "rgba(10, 7, 18, 0.05)");
  vignette.addColorStop(1, `rgba(10, 7, 18, ${profile.vignetteStrength})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();

  drawScanlines(profile.scanlineStrength);
}

function getPostProcessProfile(level) {
  if (game.state === "menu") {
    return {
      bloomColor: "#87f0ff",
      bloomStrength: 0.22,
      horizonStrength: 0.12,
      centerStrength: 0.08,
      scanlineStrength: 0.05,
      vignetteStrength: 0.34,
      primaryX: WIDTH * 0.68,
      primaryY: 122,
      primaryRadius: 320,
    };
  }

  if (game.state === "victory") {
    return {
      bloomColor: "#ff9b54",
      bloomStrength: 0.24,
      horizonStrength: 0.14,
      centerStrength: 0.12,
      scanlineStrength: 0.06,
      vignetteStrength: 0.38,
      primaryX: WIDTH / 2,
      primaryY: 148,
      primaryRadius: 340,
    };
  }

  if (game.state === "cutscene") {
    return {
      bloomColor: level.skyGlow,
      bloomStrength: 0.2,
      horizonStrength: 0.11,
      centerStrength: 0.1,
      scanlineStrength: 0.05,
      vignetteStrength: 0.36,
      primaryX: WIDTH * 0.58,
      primaryY: 132,
      primaryRadius: 300,
    };
  }

  return {
    bloomColor: level.skyGlow,
    bloomStrength: game.state === "transition" ? 0.24 : 0.16,
    horizonStrength: game.state === "transition" ? 0.12 : 0.08,
    centerStrength: game.state === "transition" ? 0.06 : 0,
    scanlineStrength: game.state === "paused" ? 0.07 : 0.045,
    vignetteStrength: game.state === "paused" ? 0.42 : 0.3,
    primaryX: WIDTH * 0.74,
    primaryY: 118,
    primaryRadius: game.state === "transition" ? 300 : 260,
  };
}

function drawScanlines(strength) {
  ctx.save();
  ctx.fillStyle = `rgba(9, 7, 16, ${strength})`;
  for (let y = 0; y < HEIGHT; y += 4) {
    ctx.fillRect(0, y, WIDTH, 1);
  }
  ctx.fillStyle = `rgba(255, 255, 255, ${strength * 0.12})`;
  for (let y = 2; y < HEIGHT; y += 8) {
    ctx.fillRect(0, y, WIDTH, 1);
  }
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawBackground(level) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#2d1c45");
  gradient.addColorStop(0.5, "#1b1630");
  gradient.addColorStop(1, "#120f1d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const playerX = game.player.x;
  const moonX = 740 - playerX * 0.03;
  const moonY = 120 + Math.sin(game.tick * 0.01) * 4;
  ctx.fillStyle = `${level.skyGlow}33`;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 120, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 34; i += 1) {
    const x = ((i * 171) + game.tick * 0.4) % WIDTH;
    const y = (i * 97) % 180;
    const size = 1 + ((i + Math.floor(game.tick / 20)) % 2);
    ctx.fillStyle = i % 3 === 0 ? "#fff7d6" : "#d6dcff";
    ctx.fillRect(x, y, size, size);
  }

  drawWeather();

  drawParallaxLayer(level, 0.08, "#181126", [
    { x: 40, w: 90, h: 120 },
    { x: 210, w: 60, h: 160 },
    { x: 360, w: 96, h: 130 },
    { x: 580, w: 70, h: 180 },
    { x: 760, w: 110, h: 150 },
  ]);
  drawParallaxLayer(level, 0.16, "#231734", [
    { x: 10, w: 120, h: 84 },
    { x: 170, w: 150, h: 120 },
    { x: 390, w: 92, h: 108 },
    { x: 540, w: 136, h: 132 },
    { x: 720, w: 120, h: 98 },
    { x: 888, w: 68, h: 142 },
  ]);

  ctx.fillStyle = "#0c0915";
  ctx.fillRect(0, 448, WIDTH, HEIGHT - 448);
}

function drawWeather() {
  for (const particle of game.weatherParticles) {
    if (particle.kind === "rain") {
      ctx.strokeStyle = `rgba(135, 240, 255, ${particle.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x + 5, particle.y + particle.size);
      ctx.stroke();
      continue;
    }

    if (particle.kind === "ember") {
      ctx.fillStyle = `rgba(255, 155, 84, ${particle.alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.fillStyle = `rgba(214, 220, 255, ${particle.alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParallaxLayer(level, factor, color, buildings) {
  const offset = -(game.player.x * factor) - game.tick * factor * 0.3;
  for (const building of buildings) {
    const x = wrapX(building.x + offset, -180, WIDTH + 60);
    ctx.fillStyle = color;
    ctx.fillRect(x, HEIGHT - building.h, building.w, building.h);
    ctx.fillStyle = `${level.skyGlow}22`;
    ctx.fillRect(x + 10, HEIGHT - building.h + 18, 12, 20);
    ctx.fillRect(x + 28, HEIGHT - building.h + 42, 10, 18);
  }
}

function wrapX(value, min, max) {
  const span = max - min;
  let result = value;

  while (result < min) {
    result += span;
  }

  while (result > max) {
    result -= span;
  }

  return result;
}

function drawLevel(level) {
  for (const decor of level.decor) {
    ctx.fillStyle = "#1a1427";
    ctx.fillRect(decor.x, HEIGHT - decor.h, decor.w, decor.h);
    ctx.fillStyle = "#ff5c8a22";
    ctx.fillRect(decor.x + 10, HEIGHT - decor.h + 12, 12, 24);
  }

  for (const platform of level.platforms) {
    drawPlatform(platform);
  }

  for (const hazard of level.hazards) {
    drawHazard(hazard);
  }

  drawCheckpoint(level.checkpoint);

  if (!game.collectedKey) {
    drawKey(level.key);
  }

  drawGoal(level.goal);
  drawPlayer(getRenderedPlayer());

  for (const flash of game.flashes) {
    ctx.strokeStyle = `${flash.color}${Math.max(flash.life * 8, 16).toString(16).padStart(2, "0")}`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const particle of game.particles) {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (game.messageTimer > 0 && game.message) {
    drawCenteredBanner(game.message);
  }
}

function drawPlatform(platform) {
  const level = getLevel();
  const pulse = 0.18 + Math.sin((game.tick + platform.x) * 0.035) * 0.08;
  ctx.fillStyle = `${level.skyGlow}${Math.round((0.14 + pulse) * 255).toString(16).padStart(2, "0")}`;
  ctx.fillRect(platform.x - 4, platform.y - 6, platform.width + 8, 10);
  ctx.fillStyle = "#271b35";
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  ctx.fillStyle = "#4f325f";
  ctx.fillRect(platform.x, platform.y, platform.width, 6);
  ctx.fillStyle = `${level.skyGlow}30`;
  ctx.fillRect(platform.x + 10, platform.y + 6, platform.width - 20, 4);
  ctx.fillStyle = `${level.skyGlow}12`;
  ctx.fillRect(platform.x + 4, platform.y + 10, platform.width - 8, platform.height - 10);
}

function drawHazard(hazard) {
  const spikeWidth = 18;
  const count = Math.floor(hazard.width / spikeWidth);
  for (let i = 0; i < count; i += 1) {
    const x = hazard.x + i * spikeWidth;
    ctx.fillStyle = "#ff5c8a";
    ctx.beginPath();
    ctx.moveTo(x, hazard.y + hazard.height);
    ctx.lineTo(x + spikeWidth / 2, hazard.y);
    ctx.lineTo(x + spikeWidth, hazard.y + hazard.height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCheckpoint(checkpoint) {
  if (!checkpoint) {
    return;
  }

  const active = game.activeCheckpoint === checkpoint;
  const pulse = 0.55 + Math.sin(game.tick * 0.08) * 0.25;
  ctx.fillStyle = active ? `rgba(135, 240, 255, ${0.28 + pulse * 0.18})` : "#87f0ff22";
  ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.width, checkpoint.height);
  ctx.strokeStyle = active ? "#87f0ff" : "#5c7b8b";
  ctx.lineWidth = 3;
  ctx.strokeRect(checkpoint.x, checkpoint.y, checkpoint.width, checkpoint.height);
  ctx.fillStyle = "#f4fbff";
  ctx.fillRect(checkpoint.x + 9, checkpoint.y - 10, 6, 18);
  ctx.beginPath();
  ctx.moveTo(checkpoint.x + 15, checkpoint.y - 10);
  ctx.lineTo(checkpoint.x + 30, checkpoint.y - 2);
  ctx.lineTo(checkpoint.x + 15, checkpoint.y + 6);
  ctx.closePath();
  ctx.fill();
}

function drawKey(key) {
  const bob = Math.sin(game.tick * 0.08) * 5;
  ctx.save();
  ctx.translate(key.x, key.y + bob);
  ctx.fillStyle = key.color;
  ctx.beginPath();
  ctx.arc(10, 10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(18, 7, 18, 6);
  ctx.fillRect(30, 13, 4, 8);
  ctx.fillRect(24, 13, 4, 5);
  ctx.restore();
}

function drawGoal(goal) {
  if (goal.type === "portal") {
    const glow = 0.2 + Math.sin(game.tick * 0.09) * 0.08;
    drawPortalHeatHaze(goal, game.collectedKey ? 0.2 + glow * 0.12 : 0.08);
    drawChromaticGlow(
      goal.x + goal.width / 2,
      goal.y + goal.height / 2,
      Math.max(goal.width, goal.height) + 22,
      game.collectedKey ? "#87f0ff" : "#6f68ff",
      game.collectedKey ? 0.16 + glow * 0.15 : 0.08
    );
    ctx.fillStyle = `rgba(135, 240, 255, ${game.collectedKey ? 0.28 + glow : 0.12})`;
    ctx.fillRect(goal.x - 4, goal.y - 6, goal.width + 8, goal.height + 12);
    ctx.strokeStyle = game.collectedKey ? "#87f0ff" : "#5c566b";
    ctx.lineWidth = 4;
    ctx.strokeRect(goal.x, goal.y, goal.width, goal.height);
    ctx.fillStyle = game.collectedKey ? "#87f0ff22" : "#21192e";
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
    return;
  }

  drawBoy(goal.x + 12, goal.y + 18);

  if (game.endingUnlocked) {
    const doorOffset = 26 * game.cageOpenProgress;
    const glow = 0.25 + Math.sin(game.tick * 0.1) * 0.1;
    ctx.strokeStyle = "#ff9b54";
    ctx.lineWidth = 3;
    ctx.strokeRect(goal.x - 6, goal.y - 6, goal.width + 12, goal.height + 12);
    ctx.fillStyle = `rgba(255, 155, 84, ${glow})`;
    ctx.fillRect(goal.x - 6, goal.y - 6, goal.width + 12, goal.height + 12);
    ctx.fillStyle = "#5c566b";
    ctx.fillRect(goal.x - 8 - doorOffset, goal.y + 18, 5, 48);
    ctx.fillRect(goal.x + goal.width + 3 + doorOffset, goal.y + 36, 5, 48);
    return;
  }

  ctx.strokeStyle = "#5c566b";
  ctx.lineWidth = 4;
  ctx.strokeRect(goal.x, goal.y, goal.width, goal.height);
  for (let i = 1; i < 4; i += 1) {
    const barX = goal.x + i * (goal.width / 4);
    ctx.beginPath();
    ctx.moveTo(barX, goal.y);
    ctx.lineTo(barX, goal.y + goal.height);
    ctx.stroke();
  }
}

function drawPlayer(player) {
  const running = player.grounded && Math.abs(player.vx) > 0.3;
  const airborne = !player.grounded;
  const cycle = running ? Math.sin(game.tick * 0.42) : Math.sin(game.tick * 0.08);
  const bob = airborne ? -2 : cycle * 1.5;
  const legSwing = running ? cycle * 4 : 0;
  const armSwing = running ? cycle * 3 : 0;
  const fringe = Math.sin(game.tick * 0.16 + player.x * 0.04) * 2;

  ctx.save();
  ctx.translate(player.x, player.y + bob);
  if (player.facing < 0) {
    ctx.scale(-1, 1);
    ctx.translate(-player.width, 0);
  }

  ctx.fillStyle = "#16111f";
  ctx.fillRect(8, 18, 12, 18);

  ctx.fillRect(6 - armSwing * 0.1, 22, 4, 12);
  ctx.fillRect(18 + armSwing * 0.1, 22, 4, 12);

  ctx.fillRect(7 - legSwing * 0.25, 36, 6, 16);
  ctx.fillRect(15 + legSwing * 0.25, 36, 6, 16);

  ctx.fillStyle = "#f0d0c5";
  ctx.fillRect(8, 6, 12, 14);

  ctx.fillStyle = "#ff7b54";
  ctx.fillRect(5, 2, 18, 10);
  ctx.fillRect(4, 10, 7 + fringe * 0.2, 10);
  ctx.fillRect(9, 10, 12, 5);

  ctx.fillStyle = "#050507";
  ctx.fillRect(8, 15, 12, 3);
  if (!airborne && Math.floor(game.tick / 24) % 7 !== 0) {
    ctx.fillRect(9, 22, 4, 2);
    ctx.fillRect(15, 22, 4, 2);
  } else if (!airborne) {
    ctx.fillRect(10, 22, 3, 1);
    ctx.fillRect(15, 22, 3, 1);
  }
  ctx.restore();
}

function storePlayerPreviousPosition() {
  game.player.prevX = game.player.x;
  game.player.prevY = game.player.y;
}

function getRenderedPlayer() {
  const alpha = Math.max(0, Math.min(1, frameAccumulator / FRAME_UNIT));
  return {
    ...game.player,
    x: game.player.prevX + (game.player.x - game.player.prevX) * alpha,
    y: game.player.prevY + (game.player.y - game.player.prevY) * alpha,
  };
}

function drawBoy(x, y) {
  const bob = Math.sin(game.tick * 0.07) * 1.5;
  const blink = Math.floor(game.tick / 26) % 9 === 0;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "#18121f";
  ctx.fillRect(6, 26, 22, 28);
  ctx.fillRect(6, 52, 7, 20);
  ctx.fillRect(21, 52, 7, 20);
  ctx.fillRect(3, 28, 4, 18);
  ctx.fillRect(27, 28, 4, 18);

  ctx.fillStyle = "#efcfbf";
  ctx.fillRect(9, 10, 16, 16);

  ctx.fillStyle = "#0d0b12";
  ctx.fillRect(7, 4, 20, 10);
  ctx.fillRect(7, 12, 6, 8);
  ctx.fillRect(21, 12, 6, 8);
  ctx.fillStyle = "#d64c56";
  ctx.fillRect(7, 13, 4, 7);
  ctx.fillRect(23, 13, 4, 7);

  ctx.strokeStyle = "#9ed7ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 15, 5, 5);
  ctx.strokeRect(19, 15, 5, 5);
  ctx.beginPath();
  ctx.moveTo(15, 16);
  ctx.lineTo(19, 16);
  ctx.stroke();

  ctx.fillStyle = "#050507";
  if (!blink) {
    ctx.fillRect(11, 17, 2, 1);
    ctx.fillRect(20, 17, 2, 1);
  }

  ctx.fillStyle = "#3d2f37";
  ctx.fillRect(12, 22, 10, 2);
  ctx.fillRect(10, 24, 14, 3);

  ctx.fillStyle = "#4b364f";
  ctx.fillRect(12, 31, 10, 8);
  ctx.fillStyle = "#ff5c8a";
  ctx.fillRect(16, 31, 2, 10);
  ctx.restore();
}

function drawHud(level) {
  ctx.fillStyle = "#140f20dd";
  ctx.fillRect(18, 16, 300, 106);
  ctx.strokeStyle = "#ffffff12";
  ctx.strokeRect(18, 16, 300, 106);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.fillText(level.name, 34, 43);
  ctx.font = "15px Arial";
  ctx.fillStyle = "#e5d8ef";
  ctx.fillText(`Fase ${game.levelIndex + 1}/3`, 34, 68);
  ctx.fillText(`Quedas: ${game.deaths}`, 128, 68);
  ctx.fillText(game.collectedKey ? "Chave: ok" : "Chave: faltando", 34, 91);
  ctx.fillText(game.activeCheckpoint ? "Checkpoint: ativo" : "Checkpoint: nenhum", 34, 112);
}

function drawCenteredBanner(text) {
  const bannerWidth = 352;
  const bannerX = WIDTH - bannerWidth - 18;
  const paddingX = 18;
  const lineHeight = 18;
  const lines = wrapTextLines(text, bannerWidth - paddingX * 2, "16px Arial");
  const bannerHeight = Math.max(56, 24 + lines.length * lineHeight);
  ctx.fillStyle = "#120d1ddd";
  ctx.fillRect(bannerX, 16, bannerWidth, bannerHeight);
  ctx.strokeStyle = "#ffffff1c";
  ctx.strokeRect(bannerX, 16, bannerWidth, bannerHeight);
  ctx.fillStyle = "#fbefff";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  lines.forEach((line, index) => {
    const y = 37 + index * lineHeight;
    ctx.fillText(line, bannerX + bannerWidth / 2, y);
  });
  ctx.textAlign = "left";
}

function wrapTextLines(text, maxWidth, font) {
  ctx.save();
  ctx.font = font;

  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  ctx.restore();
  return lines;
}

function drawMenu() {
  const titlePulse = 0.5 + Math.sin(game.tick * 0.045) * 0.14;
  ctx.textAlign = "center";
  ctx.fillStyle = "#120d1de0";
  ctx.fillRect(120, 62, 720, 416);
  ctx.strokeStyle = "#ffffff18";
  ctx.strokeRect(120, 62, 720, 416);

  ctx.fillStyle = "#87f0ff";
  ctx.shadowColor = `rgba(135, 240, 255, ${0.28 + titlePulse * 0.18})`;
  ctx.shadowBlur = 14 + titlePulse * 10;
  ctx.fillRect(370, 104, 220, 28);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#120d1d";
  ctx.font = "bold 14px Arial";
  ctx.fillText("MINI GAMEZINHU <3", WIDTH / 2, 123);

  ctx.fillStyle = "#ff9b54";
  ctx.shadowColor = `rgba(255, 155, 84, ${0.22 + titlePulse * 0.2})`;
  ctx.shadowBlur = 18 + titlePulse * 12;
  ctx.font = "bold 42px Arial";
  ctx.fillText("Emo Rescue", WIDTH / 2, 172);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#ffffff20";
  ctx.beginPath();
  ctx.moveTo(236, 194);
  ctx.lineTo(724, 194);
  ctx.stroke();

  ctx.fillStyle = "#f4e8fb";
  ctx.font = "20px Arial";
  ctx.fillText("Guie a garota ruiva por 3 fases curtinhas para salvar o garoto emo.", WIDTH / 2, 238);
  ctx.fillText("Use o painel lateral para escolher a fase, jogar e controlar o som.", WIDTH / 2, 272);

  ctx.fillStyle = "#ff5c8a22";
  ctx.beginPath();
  ctx.arc(314, 338, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#87f0ff1f";
  ctx.beginPath();
  ctx.arc(648, 344, 86, 0, Math.PI * 2);
  ctx.fill();

  drawPlayer({ x: 286, y: 282, width: 28, height: 52, facing: 1, grounded: true, vx: 2 });
  drawBoy(608, 298);

  ctx.fillStyle = "#bcaed0";
  ctx.font = "18px Arial";
  ctx.fillText("A garota ruiva vai atravessar a noite escura para salvar o garoto emo.", WIDTH / 2, 360);
  ctx.fillText("Comece pela fase que quiser e use checkpoints para ir mais longe.", WIDTH / 2, 392);

  ctx.fillStyle = "#87f0ff";
  ctx.fillText("Pressione Enter ou toque na tela para começar.", WIDTH / 2, 428);
  ctx.textAlign = "left";
}

function drawTransitionOverlay() {
  const fade = game.transitionTimer < TRANSITION_HALF_DURATION
    ? game.transitionTimer / TRANSITION_HALF_DURATION
    : 1 - (game.transitionTimer - TRANSITION_HALF_DURATION) / TRANSITION_HALF_DURATION;
  const opacity = Math.max(0, Math.min(1, fade));

  ctx.fillStyle = `rgba(8, 6, 14, ${0.18 + opacity * 0.72})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#f9eefe";
  ctx.textAlign = "center";
  ctx.font = "bold 36px Arial";
  ctx.fillText(game.transitionText, WIDTH / 2, HEIGHT / 2 - 12);
  ctx.font = "18px Arial";
  ctx.fillStyle = "#87f0ff";
  ctx.fillText("Respire fundo: a noite neon continua.", WIDTH / 2, HEIGHT / 2 + 28);
  ctx.textAlign = "left";
}

function drawCutsceneOverlay() {
  const barHeight = 54;
  ctx.fillStyle = "#05040ae6";
  ctx.fillRect(0, 0, WIDTH, barHeight);
  ctx.fillRect(0, HEIGHT - barHeight, WIDTH, barHeight);

  ctx.fillStyle = "#f8edff";
  ctx.textAlign = "center";
  ctx.font = "18px Arial";

  if (game.cutsceneTimer < 70) {
    ctx.fillText("Ela atravessou a cela e finalmente alcançou o garoto.", WIDTH / 2, HEIGHT - 20);
  } else if (game.cutsceneTimer < 118) {
    ctx.fillText("As luzes da noite neon apagam a última sombra do quarto.", WIDTH / 2, HEIGHT - 20);
  } else {
    ctx.fillText("Agora os dois vão fugir juntos pela noite escura.", WIDTH / 2, HEIGHT - 20);
  }

  ctx.textAlign = "left";
}

function drawPauseOverlay() {
  ctx.fillStyle = "#08060ecc";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#f9eefe";
  ctx.font = "bold 42px Arial";
  ctx.fillText("Pausado", 390, 214);
  ctx.font = "20px Arial";
  ctx.fillText("Pressione P, Esc ou use o botão lateral para retomar.", 222, 258);
  ctx.fillText("Checkpoints e progresso da fase continuam salvos.", 258, 292);
}

function drawVictory() {
  const shimmer = 0.18 + Math.sin(game.tick * 0.04) * 0.06;
  ctx.fillStyle = "#120d1de8";
  ctx.fillRect(120, 58, 720, 424);
  ctx.strokeStyle = "#ffffff18";
  ctx.strokeRect(120, 58, 720, 424);

  ctx.fillStyle = `rgba(135, 240, 255, ${0.14 + shimmer})`;
  ctx.fillRect(250, 98, 460, 2);
  ctx.fillRect(250, 440, 460, 2);

  ctx.textAlign = "center";
  ctx.fillStyle = "#87f0ff";
  ctx.font = "bold 20px Arial";
  ctx.fillText("CRÉDITOS FINAIS", WIDTH / 2, 102);

  ctx.fillStyle = "#ff9b54";
  ctx.font = "bold 42px Arial";
  ctx.fillText("Emo Rescue", WIDTH / 2, 156);

  ctx.fillStyle = "#f8edff";
  ctx.font = "20px Arial";
  ctx.fillText("A ruiva emo venceu as 3 fases e libertou o garoto.", WIDTH / 2, 206);
  ctx.fillText("Agora os dois vão fugir juntos pela noite escura.", WIDTH / 2, 236);

  drawPlayer({ x: 308, y: 258, width: 28, height: 52, facing: 1, grounded: true, vx: 2 });
  drawBoy(552, 270);

  ctx.font = "17px Arial";
  ctx.fillStyle = "#bcaed0";
  ctx.fillText(`Quedas totais: ${game.deaths}`, WIDTH / 2, 334);
  ctx.fillText("Criado por Felipe Gardenghi", WIDTH / 2, 378);

  ctx.fillStyle = "#87f0ff";
  ctx.fillText("Obrigado por jogar.", WIDTH / 2, 430);
  ctx.fillStyle = "#ff9b54";
  ctx.fillText("Pressione Enter, toque na tela ou use o menu para jogar de novo.", WIDTH / 2, 458);
  ctx.textAlign = "left";
}

function drawChromaticGlow(x, y, radius, color, strength) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const cyanGlow = ctx.createRadialGradient(x - 4, y, 4, x - 4, y, radius);
  cyanGlow.addColorStop(0, "rgba(135, 240, 255, 0.22)");
  cyanGlow.addColorStop(0.55, "rgba(135, 240, 255, 0.1)");
  cyanGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = cyanGlow;
  ctx.fillRect(x - radius - 10, y - radius - 10, radius * 2 + 20, radius * 2 + 20);

  const magentaGlow = ctx.createRadialGradient(x + 5, y - 1, 4, x + 5, y - 1, radius * 0.92);
  magentaGlow.addColorStop(0, "rgba(255, 92, 138, 0.2)");
  magentaGlow.addColorStop(0.58, "rgba(255, 92, 138, 0.08)");
  magentaGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = magentaGlow;
  ctx.fillRect(x - radius - 10, y - radius - 10, radius * 2 + 20, radius * 2 + 20);

  const coreGlow = ctx.createRadialGradient(x, y, 2, x, y, radius * 0.72);
  coreGlow.addColorStop(0, hexToRgba(color, strength));
  coreGlow.addColorStop(0.5, hexToRgba(color, strength * 0.42));
  coreGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = coreGlow;
  ctx.fillRect(x - radius - 10, y - radius - 10, radius * 2 + 20, radius * 2 + 20);

  ctx.restore();
}

function drawPortalHeatHaze(goal, strength) {
  const left = goal.x - 12;
  const top = goal.y - 16;
  const width = goal.width + 24;
  const height = goal.height + 32;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";

  for (let index = 0; index < 7; index += 1) {
    const lineY = top + index * (height / 6);
    const wave = Math.sin(game.tick * 0.08 + index * 0.9) * 5;
    const alpha = strength * (0.34 - index * 0.03);
    ctx.fillStyle = `rgba(135, 240, 255, ${Math.max(alpha, 0.03)})`;
    ctx.fillRect(left + 8 + wave, lineY, width - 16, 3);
    ctx.fillStyle = `rgba(255, 155, 84, ${Math.max(alpha * 0.6, 0.02)})`;
    ctx.fillRect(left + 10 - wave * 0.6, lineY + 1, width - 20, 2);
  }

  ctx.restore();
}

function gameLoop() {
  const now = performance.now();

  if (lastFrameTime === null) {
    lastFrameTime = now;
  }

  const elapsed = Math.min(now - lastFrameTime, MAX_FRAME_MS);
  lastFrameTime = now;
  frameAccumulator += elapsed;

  let steps = 0;
  while (frameAccumulator >= FRAME_UNIT && steps < MAX_UPDATE_STEPS) {
    game.frameDelta = 1;
    update();
    frameAccumulator -= FRAME_UNIT;
    steps += 1;
  }

  if (steps === MAX_UPDATE_STEPS) {
    frameAccumulator = 0;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function handleKeyChange(event, pressed) {
  if (pressed) {
    ensureAudioReady();
  }

  const key = event.key.toLowerCase();

  if ((key === "p" || key === "escape") && pressed) {
    togglePause();
    return;
  }

  if (key === "arrowleft" || key === "a") {
    keys.left = pressed;
  }

  if (key === "arrowright" || key === "d") {
    keys.right = pressed;
  }

  if (key === "arrowup" || key === "w" || key === " ") {
    keys.jump = pressed;
  }

  if (pressed && key === "enter") {
    if (game.state === "menu" || game.state === "victory") {
      startGame();
    } else if (game.state === "paused") {
      togglePause();
    }
  }
}

function bindTouchControls() {
  const buttons = document.querySelectorAll("[data-control]");

  for (const button of buttons) {
    const control = button.dataset.control;

    const setPressed = (pressed) => {
      if (control === "left") {
        keys.left = pressed;
      }

      if (control === "right") {
        keys.right = pressed;
      }

      if (control === "jump") {
        keys.jump = pressed;
      }
    };

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      ensureAudioReady();
      setPressed(true);
    });

    button.addEventListener("pointerup", () => {
      setPressed(false);
    });

    button.addEventListener("pointerleave", () => {
      setPressed(false);
    });

    button.addEventListener("pointercancel", () => {
      setPressed(false);
    });
  }
}

if (muteToggleButton) {
  muteToggleButton.addEventListener("click", () => {
    ensureAudioReady();
    game.muted = !game.muted;
    applyMuteState();
  });
}

if (startButton) {
  startButton.addEventListener("click", () => {
    ensureAudioReady();
    if (game.state === "menu" || game.state === "victory") {
      startGame();
    } else {
      restartLevel();
    }
  });
}

if (phaseSelect) {
  phaseSelect.addEventListener("change", () => {
    game.selectedMenuLevel = Number(phaseSelect.value);
    updateUiState();
  });
}

if (fullscreenButton) {
  fullscreenButton.addEventListener("click", async () => {
    const container = canvas.parentElement;

    if (!container || !document.fullscreenEnabled) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } finally {
      updateUiState();
    }
  });
}

document.addEventListener("fullscreenchange", () => {
  ensureAudioReady();
  updateUiState();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    ensureAudioReady();
  }
});

if (pauseButton) {
  pauseButton.addEventListener("click", () => {
    ensureAudioReady();
    togglePause();
  });
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "Escape"].includes(event.key)) {
    event.preventDefault();
  }
  handleKeyChange(event, true);
});

window.addEventListener("keyup", (event) => {
  handleKeyChange(event, false);
});

canvas.addEventListener("pointerdown", () => {
  ensureAudioReady();
  if (game.state === "menu" || game.state === "victory") {
    startGame();
  }
});

updateUiState();
bindTouchControls();
draw();
gameLoop();
