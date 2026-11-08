import * as THREE from "../game-demo/vendor/three.module.js";
import { createFortressWorld } from "./fortress-world.js?v=reflection-contrast-5";
import { createTraveler } from "./traveler3d.js?v=footsteps-2";
import { createSoundEffects } from "./sound-effects.js?v=gate-sound-3";

const $ = (selector) => document.querySelector(selector);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$("#scene").appendChild(renderer.domElement);
const world = createFortressWorld(THREE);
const { scene, camera, bridge, nodes } = world;
const cameraHome = camera.position.clone();
const clock = new THREE.Clock();
nodes.wheel.z = 4.77;
// Stop before the shutter's front face so the traveller never intersects it.
nodes.falseDoorApproach.z = -2.55;
// Match the actual stone and raised switching-platform surfaces.
for (const node of [nodes.entry, nodes.wheel, nodes.pivot, ...nodes.landings, nodes.door, nodes.doorApproach, nodes.falseDoorApproach]) node.y = 1.3375;
nodes.memoryTile.y = 1.38;
nodes.dais.y = 1.40;
const daisEdge = new THREE.Vector3(1.326, 1.3375, 4.279);
const bridgeStart = nodes.pivot.clone().setY(1.3675);
const bridgeEnd = (index) => nodes.landings[index].clone().lerp(nodes.pivot, .12).setY(1.3675);
let mode = "intro";
let place = "entry";
let reflected = false;
let orientation = 0;
let busy = false;
let paused = false;
let movement = null;
let segment = null;
let turn = null;
let switchTime = 0;
let architectureTime = 0;
let switchedAt = false;
let sound = !window.openingAudio.isMuted();
let audio = null;
const soundEffects = createSoundEffects();
let wheelIntroduced = false;
let falseDoorClosed = false;
let tileActivated = false;
let goToWheelAfterSwitch = false;
let wheelSettleTime = 0;
let pressWhenSettled = false;
let storyStage = 0;
let stageTurns = 0;
let openingGuideDelay = 0;
let openingGuideSpeechDelay = 0;
const tracks = {
  dream: new URL("./assets/dreams-become-real.mp3", import.meta.url).href,
  courtyard: new URL("../game-demo/assets/fluidscape-loop.mp3", import.meta.url).href,
};
let desiredTrack = "dream";
let currentTrack = "dream";
let musicFadeToken = 0;
const musicPlayers = Object.fromEntries(Object.entries(tracks).map(([name, src]) => {
  const player = name === "dream" ? window.openingAudio.player : new Audio(src);
  player.loop = true;
  player.preload = "auto";
  if (name !== "dream") player.volume = 0;
  player.hidden = true;
  player.dataset.soundtrack = name;
  if (!player.isConnected) document.body.appendChild(player);
  return [name, player];
}));

function updateSoundLabels() {
  $("#sound").textContent = sound ? "Sound on" : "Sound off";
  $("#sound").setAttribute("aria-pressed", String(sound));
}

function pauseMusic() {
  musicFadeToken += 1;
  Object.values(musicPlayers).forEach((player) => player.pause());
  updateSoundLabels();
}

function syncEffects() {
  const enabled = sound && !paused && !document.hidden;
  soundEffects.setEnabled(enabled);
  if (!enabled) soundEffects.stopAll();
  else if (audio?.state === "suspended") audio.resume().catch(() => {});
}

function resumeMusic() {
  if (!sound || paused || document.hidden) return;
  setMusicTrack(desiredTrack);
}

function setMusicTrack(name) {
  desiredTrack = name;
  if (!sound || paused || document.hidden) return;
  const next = musicPlayers[name];
  const other = musicPlayers[name === "dream" ? "courtyard" : "dream"];
  // The same recording continues uninterrupted from the opening into the story.
  if (name === currentTrack && !next.paused && other.paused) return;
  const token = ++musicFadeToken;
  const fromNext = next.volume;
  const fromOther = other.volume;
  // Keep the outgoing track playing until the incoming one is ready.
  next.play().then(() => {
    if (token !== musicFadeToken) return;
    currentTrack = name;
    updateSoundLabels();
    const started = performance.now();
    function crossfade(now) {
      if (token !== musicFadeToken || !sound || paused || document.hidden) return;
      const t = Math.min(1, (now - started) / 1800);
      const eased = t * t * (3 - 2 * t);
      next.volume = fromNext + (.12 - fromNext) * eased;
      other.volume = fromOther * (1 - eased);
      if (t < 1) requestAnimationFrame(crossfade);
      else { other.pause(); other.volume = 0; updateSoundLabels(); }
    }
    requestAnimationFrame(crossfade);
  }).catch(() => { updateSoundLabels(); });
}

Object.values(musicPlayers).forEach((player) => {
  player.addEventListener("playing", updateSoundLabels);
  player.addEventListener("pause", updateSoundLabels);
});

const avatar = await createTraveler(THREE, scene);
const walker = avatar.group;
const characterReady = avatar.loaded;
sound = !window.openingAudio.takeOver().muted;
if (!sound) pauseMusic();

// A first tap on the opening screen can unlock music after browser autoplay
// restrictions, but must never override the player's explicit mute choice.
function unlockOpeningMusic(event) {
  if (mode !== "intro" || !sound || !musicPlayers.dream.paused) return;
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
  resumeMusic();
}
document.addEventListener("pointerdown", unlockOpeningMusic, true);
document.addEventListener("keydown", unlockOpeningMusic, true);

const actionIds = ["go-wheel", "turn-wheel", "go-dais", "switch-world", "cross-bridge", "return-bridge", "go-door"];
const orientationNames = ["north", "west", "east"];
const targets = [0, Math.PI / 2, -Math.PI / 2];
const buttonTurnDuration = 3;
// Each chapter begins with deliberate discoveries before the reflection appears.
const stagePlans = [[1, 2, 0], [2, 1], [2]];

function say(message, objective = false) {
  if (objective) $("#objective").textContent = message;
  if (!$("#guide-speech").classList.contains("is-hidden")) return;
  $("#prompt").textContent = message;
  $("#prompt").classList.remove("is-hidden");
  clearTimeout(say.timer);
  say.timer = setTimeout(() => $("#prompt").classList.add("is-hidden"), 3800);
}

function remember(label, text) {
  const line = $("#memory-line");
  const heading = document.createElement("span");
  heading.textContent = label;
  line.replaceChildren(heading, document.createTextNode(text));
}

function guideSays(message, position = null, preferredSide = "auto") {
  if (position && world.guide) world.guide.show(position, 12);
  clearTimeout(guideSays.timer);
  clearTimeout(say.timer);
  $("#prompt").classList.add("is-hidden");
  $("#guide-words").textContent = "“" + message + "”";
  $("#guide-speech").dataset.prefer = preferredSide;
  $("#guide-speech").classList.remove("is-hidden");
  guideSays.timer = setTimeout(() => $("#guide-speech").classList.add("is-hidden"), 11000);
}

function guideBeside(point) {
  return point.clone().add(new THREE.Vector3(.65, 0, -.2));
}

function refresh() {
  $("#world-state").textContent = reflected ? "Reflected world" : "Real world";
  $("#world-state").classList.toggle("is-reflected", reflected);
  $("#joint-status").textContent = "Bridge points " + orientationNames[orientation] + ".";
  const visible = {
    "go-wheel": place === "entry" || place === "dais",
    "turn-wheel": place === "wheel" && !reflected,
    "go-dais": place === "entry" || place === "wheel",
    "switch-world": false,
    "cross-bridge": place === "dais",
    "return-bridge": place.startsWith("landing"),
    "go-door": place === "landing2" && tileActivated,
  };
  actionIds.forEach((id) => {
    const button = $("#" + id);
    button.hidden = !visible[id];
    button.disabled = busy || paused;
  });
  $("#travel-controls").classList.toggle("is-hidden", mode !== "playing");
}

function walkPath(path, destination, callback) {
  if (busy || paused) return;
  busy = true;
  movement = { path: path.map((p) => p.clone()), destination, callback };
  segment = null;
  refresh();
}

function updateWalk(delta) {
  if (!movement) return;
  if (!segment) {
    let to = movement.path.shift();
    while (to && walker.position.distanceToSquared(to) < 0.000001) to = movement.path.shift();
    if (!to) {
      place = movement.destination;
      const callback = movement.callback;
      movement = null;
      busy = false;
      refresh();
      if (callback) callback();
      return;
    }
    const from = walker.position.clone();
    const direction = to.clone().sub(from);
    const horizontalDistance = Math.hypot(direction.x, direction.z);
    const heading = horizontalDistance > .01 ? Math.atan2(direction.x, direction.z) : walker.rotation.y;
    const angle = Math.atan2(Math.sin(heading - walker.rotation.y), Math.cos(heading - walker.rotation.y));
    segment = { from, to, heading, aligning: Math.abs(angle) > .65, elapsed: 0, duration: Math.max(.04, direction.length() / 1.15) };
  }
  const angle = Math.atan2(Math.sin(segment.heading - walker.rotation.y), Math.cos(segment.heading - walker.rotation.y));
  const step = Math.min(Math.abs(angle), delta * 6);
  walker.rotation.y += Math.sign(angle) * step;
  if (segment.aligning && Math.abs(angle) > .12) return;
  segment.aligning = false;
  segment.elapsed += delta;
  const t = Math.min(1, segment.elapsed / segment.duration);
  walker.position.lerpVectors(segment.from, segment.to, t);
  if (t >= 1) segment = null;
}

function toWheel(pressAfterArrival = false) {
  if (place === "dais" && reflected && !busy && !paused) {
    goToWheelAfterSwitch = pressAfterArrival ? "press" : true;
    say("The platform returns you to the real world so you can use the red button.", true);
    switchWorld();
    return;
  }
  walkPath([...(place === "dais" ? [daisEdge] : []), nodes.entry, nodes.wheel], "wheel", () => {
    avatar.face(world.wheel.position);
    say(reflected ? "The button works only in the real world. Return to the platform to switch back." : "Press the red button to turn the bridge. Watch the water for a reflection.", true);
    // Let the walking animation settle before moving the arm, including when
    // a direct tap queues the press as soon as the traveller arrives.
    wheelSettleTime = .3;
    pressWhenSettled = Boolean(pressAfterArrival && !reflected);
    busy = true;
    refresh();
  });
}
function toDais() {
  walkPath([nodes.entry, daisEdge, nodes.dais], "dais", () => {
    avatar.face(nodes.pivot);
    say("The platform responds. Watch the bridge appear in the reflection.", true);
    switchWorld();
  });
}
function rotateBridge() {
  if (place !== "wheel" || reflected || busy || paused) return;
  // A previous wrong-turn hint should not cover the next result.
  clearTimeout(guideSays.timer);
  $("#guide-speech").classList.add("is-hidden");
  world.guide?.hide();
  wheelIntroduced = true;
  const from = bridge.group.rotation.y;
  const plan = stagePlans[storyStage];
  orientation = stageTurns < plan.length ? plan[stageTurns] : (orientation + 1) % 3;
  stageTurns += 1;
  bridge.setTurning(true);
  bridge.setClueEnabled(false);
  let target = targets[orientation];
  while (target - from > Math.PI) target -= Math.PI * 2;
  while (target - from < -Math.PI) target += Math.PI * 2;
  busy = true;
  avatar.face(world.wheel.position);
  turn = { from, target, elapsed: 0, pressed: false, sounded: false };
  refresh();
}
function updateTurn(delta) {
  if (!turn) return;
  turn.elapsed += delta;
  const t = Math.min(1, turn.elapsed / buttonTurnDuration);
  if (!turn.pressed && t >= .3) {
    turn.pressed = true;
    world.wheel.userData.pressButton?.();
  }
  const motion = THREE.MathUtils.clamp((t - .34) / .66, 0, 1);
  if (!turn.sounded && t >= .34) {
    turn.sounded = true;
    soundEffects.bridge();
  }
  const smooth = motion * motion * (3 - 2 * motion);
  // Come closer for the hand's approach and press, then pull back to show
  // the bridge moving. The camera retains the same isometric direction.
  const focus = THREE.MathUtils.smoothstep(t, 0, .16) * (1 - THREE.MathUtils.smoothstep(t, .60, .96));
  const cameraShift = new THREE.Vector3(world.wheel.position.x, 0.7, world.wheel.position.z - 0.5).multiplyScalar(focus * .78);
  camera.position.copy(cameraHome).add(cameraShift);
  camera.zoom = 1 + focus * .95;
  camera.updateProjectionMatrix();
  bridge.group.rotation.y = THREE.MathUtils.lerp(turn.from, turn.target, smooth);
  bridge.reflected.rotation.y = bridge.group.rotation.y;
  if (world.wheel?.userData.spin && t >= .34) world.wheel.userData.spin.rotation.z += delta * 1.7;
  if (t >= 1) {
    bridge.setOrientation(orientation);
    bridge.setTurning(false);
    bridge.setClueEnabled(stageTurns >= stagePlans[storyStage].length);
    if (stageTurns >= stagePlans[storyStage].length && bridge.isAligned()) soundEffects.magic();
    if (storyStage === 1 && bridge.isAligned()) world.memoryTile.revealStar();
    camera.position.copy(cameraHome);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    turn = null;
    busy = false;
    let clue = "No reflection here. Press the red button again and watch the water.";
    if (storyStage === 0 && stageTurns === 1) clue = "No reflection on the left. Press the red button again to try the right.";
    else if (storyStage === 0 && stageTurns === 2) clue = "No reflection on the right. Press the red button again to try the front.";
    else if (storyStage === 1 && stageTurns === 1) clue = "No reflection on the right. Press the red button again to try the left.";
    else if (storyStage === 1 && bridge.isAligned()) clue = "The star rises to the marked tile. Step onto the circle and follow the path.";
    else if (bridge.isAligned()) clue = "A complete reflection appears. Step onto the circle to follow the path.";
    say(clue, true);
    if (!bridge.isAligned()) {
      let guidance = "This reflection is broken. Look for a whole path in the water.";
      if (storyStage === 0 && stageTurns === 1) guidance = "The water keeps no path here. Try another turn.";
      else if (storyStage === 0 && stageTurns === 2) guidance = "Still no bridge in the water. One direction remains.";
      else if (storyStage === 1 && stageTurns === 1) guidance = "The star stays hidden here. Turn once more.";
      soundEffects.magic();
      const offset = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      offset.y = 0;
      offset.normalize().multiplyScalar(1.45);
      guideSays(guidance, walker.position.clone().add(offset), "right");
    }
    refresh();
  }
}
function switchWorld() {
  if (place !== "dais" || busy || paused) return;
  avatar.face(nodes.pivot);
  busy = true;
  switchTime = .8;
  switchedAt = false;
  soundEffects.magic();
  document.body.classList.add("world-transition");
  refresh();
}
function updateSwitch(delta) {
  if (!switchTime) return;
  switchTime = Math.max(0, switchTime - delta);
  if (switchTime <= .4 && !switchedAt) {
    switchedAt = true;
    reflected = !reflected;
    bridge.setReflected(reflected);
    setMusicTrack(reflected ? "dream" : "courtyard");
    scene.background = new THREE.Color(reflected ? 0xb5cfd0 : 0xecc4c5);
    say(reflected ? (bridge.isAligned() ? "The reflection forms a complete bridge. Cross to explore the path." : "There is no reflected path here. Return to the red button and watch the water as you press it.") : "You are back in the real world. Press the red button and watch the water.", true);
  }
  if (!switchTime) {
    busy = false;
    document.body.classList.remove("world-transition");
    refresh();
    if (goToWheelAfterSwitch) { const pressAfter = goToWheelAfterSwitch === "press"; goToWheelAfterSwitch = false; toWheel(pressAfter); }
  }
}
function cross() {
  if (place !== "dais" || busy || paused) return;
  if (!reflected) {
    say("The bridge is broken here. Step onto the circular platform to enter its reflection.");
    return;
  }
  if (!bridge.isAligned()) {
    say("There is no reflected path here. Press the red button until the water shows a complete path.", true);
    return;
  }
  const index = orientation;
  const approachDoor = index === 0 && !falseDoorClosed;
  const approachTile = index === 1 && !tileActivated;
  const path = [daisEdge, nodes.entry, nodes.pivot, bridgeStart, bridgeEnd(index), nodes.landings[index]];
  if (approachDoor) path.push(nodes.falseDoorApproach);
  if (approachTile) path.push(nodes.memoryTile);
  walkPath(path, "landing" + index, () => {
    if (approachDoor) sealFalseDoor();
    else if (approachTile) activateTile();
    else if (index === 0) say("The first doorway is sealed. Return and investigate the marked tile.", true);
    else if (index === 1) say(tileActivated ? "The marked tile has moved the far gate. Return to the red button." : "A marked stone tile lies on this landing. Step onto it and see how the courtyard responds.", true);
    else {
      say(tileActivated ? "The gate has moved. The path continues to the doorway." : "A stone gate blocks the path. Another part of the courtyard must move it.", true);
      if (tileActivated) guideSays("Follow the opened path. The first memory is waiting.", guideBeside(nodes.landings[2]), "right");
    }
  });
}

function sealFalseDoor() {
    if (falseDoorClosed) return;
    openingGuideDelay = 0;
    openingGuideSpeechDelay = 0;
    avatar.face(world.falseDoor.group.position);
    falseDoorClosed = true;
    world.falseDoor.setClosed(true);
    soundEffects.closeDoor();
    storyStage = 1;
    stageTurns = 0;
    bridge.setClueTarget(1);
    bridge.setClueEnabled(false);
    soundEffects.magic();
    remember("The guide's clue", "“Match the star in the water to a round tile, then stand on it.”");
    busy = true;
    architectureTime = 1.2;
    say("The doorway seals. Find the star in the water and stand on the matching round tile.", true);
    guideSays("A star glimmers in the water. Find the matching round tile and stand on it.");
    refresh();
}

function activateTile() {
    if (place !== "landing1" || tileActivated) return;
    const towardViewer = camera.getWorldDirection(new THREE.Vector3()).negate();
    avatar.face(walker.position.clone().add(new THREE.Vector3(towardViewer.x, 0, towardViewer.z)));
    if (!falseDoorClosed) {
      say("The tile is still. Perhaps another doorway must be disturbed first.", true);
      guideSays("This stone is waiting. Explore the open doorway first.", guideBeside(nodes.memoryTile));
      refresh();
      return;
    }
    tileActivated = true;
    storyStage = 2;
    stageTurns = 0;
    bridge.setClueTarget(2);
    bridge.setClueEnabled(false);
    world.memoryTile.setActive(true);
    world.pathGate.setOpen(true);
    soundEffects.lowerGate();
    soundEffects.magic();
    remember("The guide's clue", "“The water kept the way when the gates would not.”");
    busy = true;
    architectureTime = 1.5;
    say("The tile lights beneath your feet. Across the water, the gate lowers. Return to the red button and align the bridge with the newly opened path.", true);
    guideSays("You found it. The water remembers a way beyond the gate.", guideBeside(nodes.memoryTile));
    refresh();
}
function walkBack() {
  if (!place.startsWith("landing")) return;
  const index = Number(place.slice(-1));
  walkPath([nodes.landings[index], bridgeEnd(index), bridgeStart, nodes.pivot, nodes.entry, daisEdge, nodes.dais], "dais", () => {
    avatar.face(nodes.pivot);
    say("The platform responds, bringing you back to the real world.", true);
    switchWorld();
  });
}
function reachDoor() {
  if (place !== "landing2" || !tileActivated) return;
  walkPath([nodes.doorApproach, nodes.door], "door", () => {
    mode = "won";
    $("#travel-controls").classList.add("is-hidden");
    $("#ending-title").textContent = "The first memory.";
    $("#ending .story-copy").textContent = "A small fragment rests beyond the doorway. In its surface, the traveller glimpses the people who once lived here. Their story is not yet over.";
    $("#ending").classList.remove("is-hidden");
  });
}
function reset(showIntro) {
  soundEffects.stopAll();
  mode = showIntro ? "intro" : "playing";
  place = "entry"; reflected = false; orientation = 0; busy = false; paused = false;
  syncEffects();
  goToWheelAfterSwitch = false;
  wheelSettleTime = 0; pressWhenSettled = false;
  storyStage = 0; stageTurns = 0;
  openingGuideDelay = 0; openingGuideSpeechDelay = 0;
  movement = null; segment = null; turn = null; switchTime = 0; architectureTime = 0;
  camera.position.copy(cameraHome);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  wheelIntroduced = false;
  falseDoorClosed = false;
  tileActivated = false;
  clearTimeout(guideSays.timer);
  $("#guide-speech").classList.add("is-hidden");
  if (world.guide) world.guide.hide();
  remember("Your search", "Discover what happened to the missing inhabitants.");
  world.falseDoor.setClosed(false);
  world.memoryTile.setActive(false);
  world.pathGate.setOpen(false);
  walker.position.copy(nodes.entry);
  walker.rotation.y = Math.PI;
  bridge.setClueTarget(0);
  bridge.setTurning(false);
  bridge.setClueEnabled(false);
  bridge.setOrientation(0);
  bridge.setReflected(false);
  scene.background = new THREE.Color(0xecc4c5);
  $("#intro").classList.toggle("is-hidden", !showIntro);
  $("#story").classList.add("is-hidden");
  $("#hud").classList.toggle("is-hidden", showIntro);
  $("#ending").classList.add("is-hidden");
  $("#pause-panel").classList.add("is-hidden");
  $("#pause").textContent = "Pause";
  $("#pause").setAttribute("aria-pressed", "false");
  if (!showIntro) {
    setMusicTrack("courtyard");
    say("Walk to the red button. Press it and watch the water for a reflection.", true);
    openingGuideDelay = 1.8;
  }
  refresh();
}
function togglePause(value) {
  if (mode !== "playing") return;
  paused = typeof value === "boolean" ? value : !paused;
  $("#pause-panel").classList.toggle("is-hidden", !paused);
  $("#pause").textContent = paused ? "Resume" : "Pause";
  $("#pause").setAttribute("aria-pressed", String(paused));
  if (paused) pauseMusic();
  else if (sound) resumeMusic();
  syncEffects();
  refresh();
}

$("#begin").addEventListener("click", () => {
  mode = "story";
  setMusicTrack("dream");
  $("#intro").classList.add("is-hidden");
  $("#story").classList.remove("is-hidden");
  $("#enter-courtyard").focus();
});
$("#enter-courtyard").addEventListener("click", () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!audio && AudioContextClass) audio = new AudioContextClass();
  if (audio) soundEffects.attach(audio);
  reset(false);
});
$("#go-wheel").addEventListener("click", () => toWheel());
$("#wheel-cue").addEventListener("click", () => {
  if (mode !== "playing" || busy || paused || reflected) return;
  if (place === "wheel") rotateBridge();
  else if (place === "entry" || place === "dais") toWheel(true);
});
$("#turn-wheel").addEventListener("click", rotateBridge);
$("#go-dais").addEventListener("click", toDais);
$("#switch-world").addEventListener("click", switchWorld);
$("#cross-bridge").addEventListener("click", cross);
$("#return-bridge").addEventListener("click", walkBack);
$("#go-door").addEventListener("click", reachDoor);
$("#pause").addEventListener("click", () => togglePause());
$("#resume").addEventListener("click", () => togglePause(false));
$("#restart").addEventListener("click", () => reset(false));
$("#play-again").addEventListener("click", () => reset(false));
$("#sound").addEventListener("click", () => {
  sound = !sound;
  if (!sound) pauseMusic();
  else resumeMusic();
  syncEffects();
  updateSoundLabels();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseMusic();
  else if (sound && !paused) resumeMusic();
  syncEffects();
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener("pointerup", (event) => {
  if (mode !== "playing" || busy || paused) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects([
    ...world.clickable.wheel,
    ...world.clickable.dais,
    ...world.clickable.landings,
    ...world.clickable.door,
    ...world.clickable.falseDoor,
    ...world.clickable.memoryTile,
    ...world.clickable.pathGate,
  ], false);
  if (!hits.length) {
    say("Choose a reachable stone path. Water and gaps cannot be crossed.");
    return;
  }
  const hit = hits[0].object;
  if (world.clickable.falseDoor.includes(hit)) {
    say(falseDoorClosed ? "The doorway is sealed. Find the star in the water and stand on its matching tile." : "Align the bridge with this landing to investigate the doorway.");
  } else if (world.clickable.memoryTile.includes(hit)) {
    say(tileActivated ? "The marked tile has opened the far gate." : "There is a marked stone on that landing. Find a way across to it.");
  } else if (world.clickable.pathGate.includes(hit)) {
    if (place === "landing2" && tileActivated) reachDoor();
    else say("The gate is closed. Something in the courtyard may move it.");
  } else if (world.clickable.wheel.includes(hit)) {
    if (place === "wheel") rotateBridge();
    else if (place === "entry" || place === "dais") toWheel(true);
  } else if (world.clickable.dais.includes(hit)) {
    if (place === "entry" || place === "wheel") toDais();
  } else if (world.clickable.landings.includes(hit)) {
    const landing = world.clickable.landings.indexOf(hit);
    if (place === "dais" && landing === orientation) cross();
    else if (place.startsWith("landing")) walkBack();
    else say("That landing is not connected to your current route.");
  } else if (world.clickable.door.includes(hit)) {
    if (place === "landing2") reachDoor();
    else say("The doorway is across the water. Find a connected route first.");
  }
});

function resize() {
  const aspect = window.innerWidth / window.innerHeight;
  // Keep the complete miniature in frame on portrait phones as well as wide screens.
  const view = Math.max(13, 15 / aspect);
  camera.left = -view * aspect / 2;
  camera.right = view * aspect / 2;
  camera.top = view / 2;
  camera.bottom = -view / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
function animate() {
  const delta = Math.min(clock.getDelta(), .05);
  if (!paused) {
    if (mode === "playing" && !document.hidden) {
      if (openingGuideDelay > 0) {
        openingGuideDelay = Math.max(0, openingGuideDelay - delta);
        if (!openingGuideDelay) {
          const inFront = new THREE.Vector3(0, 0, 1).applyQuaternion(walker.quaternion).multiplyScalar(.85);
          world.guide.show(walker.position.clone().add(inFront), 12);
          soundEffects.magic();
          openingGuideSpeechDelay = .9;
        }
      } else if (openingGuideSpeechDelay > 0) {
        openingGuideSpeechDelay = Math.max(0, openingGuideSpeechDelay - delta);
        if (!openingGuideSpeechDelay) guideSays("Press the red button and watch the water. The reflection will reveal a path.");
      }
    }
    updateWalk(delta);
    if (wheelSettleTime > 0) {
      wheelSettleTime = Math.max(0, wheelSettleTime - delta);
      if (!wheelSettleTime) {
        const press = pressWhenSettled;
        pressWhenSettled = false;
        busy = false;
        if (press) rotateBridge();
        else refresh();
      }
    }
    updateTurn(delta);
    updateSwitch(delta);
    avatar.update(delta, { moving: !!movement && !segment?.aligning, turning: turn ? { wheel: world.wheel, progress: Math.min(1, turn.elapsed / buttonTurnDuration) } : null, onFootstep: soundEffects.footstep });
    world.update(clock.elapsedTime, delta);
    if (architectureTime > 0) {
      architectureTime = Math.max(0, architectureTime - delta);
      if (!architectureTime) { busy = false; refresh(); }
    }
  }
  world.switchPad.setGuiding(mode === "playing" && place === "dais" && !reflected);
  const showCue = mode === "playing" && !paused && !busy && !reflected && !wheelIntroduced && (place === "entry" || place === "wheel" || place === "dais");
  const cue = $("#wheel-cue");
  cue.classList.toggle("is-hidden", !showCue);
  if (showCue) {
    const projected = (world.wheel.userData.buttonSurface || world.wheel).getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .55, 0)).project(camera);
    cue.style.left = Math.max(55, Math.min(window.innerWidth - 55, (projected.x * .5 + .5) * window.innerWidth)) + "px";
    cue.style.top = Math.max(160, Math.min(window.innerHeight - 120, (-projected.y * .5 + .5) * window.innerHeight)) + "px";
    cue.firstChild.textContent = "Tap the red button ";
    cue.setAttribute("aria-label", place === "wheel" ? "Press the red button" : "Walk to and press the red button");
  }
  const speech = $("#guide-speech");
  if (!speech.classList.contains("is-hidden") && world.guide?.isVisible()) {
    const anchor = world.guide.getPosition().project(camera);
    const x = (anchor.x * .5 + .5) * window.innerWidth;
    const y = (-anchor.y * .5 + .5) * window.innerHeight;
    const gap = 18;
    const width = speech.offsetWidth;
    const height = speech.offsetHeight;
    const traveller = walker.position.clone().add(new THREE.Vector3(0, .8, 0)).project(camera);
    const travellerX = (traveller.x * .5 + .5) * window.innerWidth;
    const roomRight = x + gap + width < window.innerWidth - 10;
    const roomLeft = x - gap - width > 10;
    // Keep the speech on the side opposite the traveller wherever space allows.
    const preferRight = speech.dataset.prefer === "right";
    const toRight = preferRight || (travellerX < x ? (roomRight || !roomLeft) : (!roomLeft && roomRight));
    speech.dataset.side = toRight ? "right" : "left";
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, toRight ? x + gap : x - gap - width));
    let top = y - 24;
    if (preferRight && left < travellerX + 12) {
      // Keep the message above the traveller if the screen is too narrow to
      // place it fully beside him.
      const head = walker.position.clone().add(new THREE.Vector3(0, 1.1, 0)).project(camera);
      const headY = (-head.y * .5 + .5) * window.innerHeight;
      top = Math.min(top, headY - height - 12);
    }
    speech.style.left = left + "px";
    speech.style.top = Math.max(8, Math.min(window.innerHeight - height - 65, top)) + "px";
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
resize();
reset(true);
$("#loading").classList.add("is-hidden");
updateSoundLabels();
resumeMusic();
if (!characterReady) say("The traveller model could not load; a temporary marker is shown.");
animate();
