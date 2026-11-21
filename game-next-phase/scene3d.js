import { registerMusicHandoff } from '../journey-ui/audio-handoff.js?v=3';
import { chooseGuidePosition, projectGuidePoint, guideScreenBounds, placeGuideMessage, placeWheelCue, projectWorldBox, resetGuideMessagePlacement } from '../journey-ui/guide-layout.js?v=4';
import * as THREE from "../game-demo/vendor/three.module.js";
import { createFortressWorld } from "./fortress-world.js?v=foot-support-2";
import { createTraveler } from "./traveler3d.js?v=footsteps-2";
import { createSoundEffects } from "./sound-effects.js?v=level-3";
import { createChapterProgress } from '../journey-ui/chapter-progress.js?v=2';
import { mountJournal } from "../journey-journal/journal.js?v=next-level-choice-20261120";

const journal = mountJournal({chapter:1});
const chapterProgress = createChapterProgress(1);

const $ = (selector) => document.querySelector(selector);
// The scene always has an opaque background. An opaque drawing buffer also
// avoids blending the WebGL canvas with the page during moving-object frames.
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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
let switchColorFrom = null;
let switchColorTo = null;
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
let openingGuideActive = false;
// The button cue follows the guide's introduction, not the scene entrance.
let openingCueReady = false;
let openingDeparture = null;
let desiredTrack = "dream";
// Keep the same calm score playing continuously between the two worlds.
const musicPlayers = { dream: window.openingAudio.player, courtyard: window.openingAudio.player };
const musicHandoff = registerMusicHandoff(musicPlayers.dream);

function updateSoundLabels() {
  $("#sound").textContent = sound ? "Sound on" : "Sound off";
  $("#sound").setAttribute("aria-pressed", String(sound));
}

function pauseMusic() {
  musicPlayers.dream.pause();
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
  // A visibility change after the handoff has faded out must not restart the
  // outgoing track over the next-chapter screen.
  if (mode === "won" && musicHandoff.isComplete()) return;
  setMusicTrack(desiredTrack);
}

function setMusicTrack(name) {
  desiredTrack = name;
  if (!sound || paused || document.hidden) return;
  const player = musicPlayers[name];
  if (!player.paused) return;
  player.play().then(updateSoundLabels).catch(updateSoundLabels);
}

new Set(Object.values(musicPlayers)).forEach((player) => {
  player.addEventListener("playing", updateSoundLabels);
  player.addEventListener("pause", updateSoundLabels);
});

// The lightweight opening handler is already live while the 3D module loads.
window.openingFlow.onStart = () => {
  if (mode !== "intro") return;
  journal.beginJourney();
  mode = "story";
  setMusicTrack("dream");
};
// The first click can happen before this module has finished importing.
if (window.openingFlow.started) window.openingFlow.onStart();

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

// Both the floating star in the water and its matching tile are clues the
// traveller needs to see. Keep the guide and its message clear of them.
function guideClueAreas() {
  if (!falseDoorClosed) return [];
  const game = $("#game");
  return [new THREE.Vector3(-2.65, .015, .2), nodes.memoryTile].map(point => {
    const corners = [[-.72,-.72],[-.72,.72],[.72,-.72],[.72,.72]]
      .map(([x,z]) => projectGuidePoint(THREE, camera, game, point.clone().add(new THREE.Vector3(x,0,z))));
    return { left:Math.min(...corners.map(p=>p.x))-8, right:Math.max(...corners.map(p=>p.x))+8,
      top:Math.min(...corners.map(p=>p.y))-8, bottom:Math.max(...corners.map(p=>p.y))+8 };
  });
}

function guideSays(message, position = null, preferredSide = "auto") {
  if (position && world.guide) {
    world.guide.show(chooseGuidePosition(THREE, camera, $("#game"), position, walker.position, guideClueAreas(), {avoidLandmarks:true}), 12);
    soundEffects.guide();
  }
  clearTimeout(guideSays.timer);
  clearTimeout(say.timer);
  $("#prompt").classList.add("is-hidden");
  $("#guide-words").textContent = message;
  resetGuideMessagePlacement($("#guide-speech"));
  $("#guide-speech").dataset.prefer = preferredSide;
  $("#guide-speech").style.transition = "";
  $("#guide-speech").classList.remove("is-hidden");
  guideSays.timer = setTimeout(() => $("#guide-speech").classList.add("is-hidden"), 11000);
}

function guideBeside(point) {
  // Stand on the camera-facing side of the traveller and architecture.
  return point.clone().add(new THREE.Vector3(.65, 0, .65));
}

function refresh() {
  // Each part of the courtyard mystery contributes to this chapter's bar.
  let progress = wheelIntroduced ? .05 + Math.min(stageTurns, 3) * .06 : (place === 'wheel' ? .05 : 0);
  if (reflected && storyStage === 0) progress = Math.max(progress, .25);
  if (falseDoorClosed) progress = .35 + Math.min(stageTurns, 2) * .10;
  if (tileActivated) progress = .68 + Math.min(stageTurns, 1) * .12;
  if (place === 'landing2' && tileActivated) progress = .92;
  if (mode === 'won') progress = 1;
  chapterProgress.update(progress);
  $("#world-state").textContent = reflected ? "Reflected world" : "Real world";
  $("#world-state").classList.toggle("is-reflected", reflected);
  $("#joint-status").textContent = "Bridge points " + orientationNames[orientation] + ".";
  // At a complete reflected bridge the only useful next step is crossing.
  // An incomplete reflection still needs the button route, so it remains
  // available to return to the real world and realign the bridge.
  const canCross = place === "dais" && reflected && bridge.isAligned();
  const doorwayOpen = place === "landing2" && tileActivated;
  const visible = {
    "go-wheel": place === "entry" || (place === "dais" && !canCross),
    "turn-wheel": place === "wheel" && !reflected,
    "go-dais": place === "entry" || place === "wheel",
    "switch-world": false,
    "cross-bridge": canCross,
    "return-bridge": place.startsWith("landing") && !doorwayOpen,
    "go-door": doorwayOpen,
  };
  actionIds.forEach((id) => {
    const button = $("#" + id);
    button.hidden = !visible[id];
    button.disabled = busy || paused;
  });
  const controls = $("#travel-controls");
  // A platform arrival immediately triggers a world change. Keep the action
  // row out of view until both steps have settled, so the previous buttons do
  // not flash in and then jump to the new Cross bridge position.
  const platformTransfer = movement?.destination === "dais" ||
    openingDeparture?.nextMovement?.destination === "dais" || switchTime > 0;
  controls.classList.toggle("is-transitioning", platformTransfer);
  controls.inert = platformTransfer;
  controls.classList.toggle("is-hidden", mode !== "playing");
}

function walkPath(path, destination, callback) {
  if (busy || paused) return;
  // The opening guide stands by the traveller only while he is stationary.
  // Cancel pending appearances as well: an early tap must not summon her into
  // the middle of his walk, or leave him walking through her apparition.
  const fadeOpeningGuide = openingGuideActive && world.guide?.isVisible();
  if (openingGuideActive || openingGuideDelay > 0 || openingGuideSpeechDelay > 0) {
    // If a player moves before the introduction, the pending guide is
    // dismissed for safety. Make the cue available once movement settles.
    openingCueReady = true;
    openingGuideDelay = 0;
    openingGuideSpeechDelay = 0;
    openingGuideActive = false;
    clearTimeout(guideSays.timer);
    // Let the apparition and her message depart together before the
    // traveller moves, keeping her out of his path without a sudden cut.
    $("#guide-speech").style.transition = fadeOpeningGuide ? "opacity 1350ms ease, visibility 1350ms ease" : "none";
    $("#guide-speech").classList.add("is-hidden");
    if (fadeOpeningGuide) world.guide.dismiss();
  }
  busy = true;
  const nextMovement = { path: path.map((p) => p.clone()), destination, callback };
  if (fadeOpeningGuide) openingDeparture = { remaining: 1.35, nextMovement };
  else movement = nextMovement;
  segment = null;
  refresh();
}

function updateWalk(delta) {
  if (openingDeparture) {
    openingDeparture.remaining = Math.max(0, openingDeparture.remaining - delta);
    if (openingDeparture.remaining > 0) return;
    world.guide?.hide();
    movement = openingDeparture.nextMovement;
    openingDeparture = null;
  }
  if (!movement) return;
  if (!segment) {
    let to = movement.path.shift();
    while (to && walker.position.distanceToSquared(to) < 0.000001) to = movement.path.shift();
    if (!to) {
      place = movement.destination;
      const callback = movement.callback;
      movement = null;
      busy = false;
      // Arrival callbacks can start the platform's world change immediately.
      // Commit that state before showing its next actions.
      if (callback) callback();
      refresh();
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

// The raised pad, bridge trim and star tile all sit above the base stone.
// Their support zones extend beyond the visible edges because a swinging toe
// reaches about .20 units ahead of the traveller's centre. The gradual rise
// begins before that toe reaches an edge, then eases down after he leaves it.
function supportTravellerFeet() {
  const floor = 1.3375;
  const padDistance = Math.hypot(walker.position.x - nodes.dais.x, walker.position.z - nodes.dais.z);
  // The decorative gold ring is level with the teal centre (1.40).
  const padLift = .0625 * (1 - THREE.MathUtils.smoothstep(padDistance, .82, 1.02));
  const tileDistance = Math.hypot(walker.position.x - nodes.memoryTile.x, walker.position.z - nodes.memoryTile.z);
  const tileLift = .0465 * (1 - THREE.MathUtils.smoothstep(tileDistance, .63, .83));
  let bridgeLift = 0;
  if (reflected && bridge.isAligned()) {
    const dx = walker.position.x - bridge.group.position.x;
    const dz = walker.position.z - bridge.group.position.z;
    const angle = bridge.group.rotation.y;
    const localX = Math.cos(angle) * dx - Math.sin(angle) * dz;
    const localZ = Math.sin(angle) * dx + Math.cos(angle) * dz;
    // The two coloured trim strips are the bridge's highest surfaces (1.384).
    const side = 1 - THREE.MathUtils.smoothstep(Math.abs(localX), .68, .88);
    const near = 1 - THREE.MathUtils.smoothstep(localZ, .25, .50);
    const far = THREE.MathUtils.smoothstep(localZ, -3.85, -3.60);
    bridgeLift = .0465 * side * near * far;
  }
  walker.position.y = Math.max(walker.position.y, floor + .002 + Math.max(padLift, tileLift, bridgeLift));
}

function toWheel(pressAfterArrival = false) {
  if (place === "dais" && reflected && !busy && !paused) {
    goToWheelAfterSwitch = pressAfterArrival ? "press" : true;
    say("The platform returns you to the real world so you can use the red button.", true);
    switchWorld();
    return;
  }
  walkPath([...(place === "dais" ? [daisEdge] : []), nodes.entry, nodes.wheel], "wheel", () => {
    say(reflected ? "The button works only in the real world. Return to the platform to switch back." : "Press the red button to turn the bridge. Watch the water for a reflection.", true);
    // Turn toward the wheel gradually after arriving. A direct face() here
    // snapped the traveller around by up to 180 degrees before the press.
    const wheelHeading = Math.atan2(world.wheel.position.x - walker.position.x, world.wheel.position.z - walker.position.z);
    const wheelAngle = Math.atan2(Math.sin(wheelHeading - walker.rotation.y), Math.cos(wheelHeading - walker.rotation.y));
    // Also allow the walk-to-idle crossfade to settle before moving the arm.
    wheelSettleTime = Math.max(.3, Math.abs(wheelAngle) / 6 + .05);
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
  world.guide?.dismiss();
  wheelIntroduced = true;
  const from = bridge.group.rotation.y;
  const plan = stagePlans[storyStage];
  const nextOrientation = stageTurns < plan.length ? plan[stageTurns] : (orientation + 1) % 3;
  stageTurns += 1;
  bridge.setTurning(true);
  bridge.setClueEnabled(false);
  let target = targets[nextOrientation];
  while (target - from > Math.PI) target -= Math.PI * 2;
  while (target - from < -Math.PI) target += Math.PI * 2;
  busy = true;
  avatar.face(world.wheel.position);
  turn = { from, target, nextOrientation, wheelFrom: world.wheel.userData.spin?.rotation.z ?? 0, elapsed: 0, pressed: false, sounded: false };
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
  // Keep the courtyard view steady while the traveller presses the button;
  // the bridge itself supplies the motion and remains visible throughout.
  bridge.group.rotation.y = THREE.MathUtils.lerp(turn.from, turn.target, smooth);
  bridge.reflected.rotation.y = bridge.group.rotation.y;
  // Ease the wheel with the bridge instead of starting and stopping it at a
  // fixed speed, so both mechanical movements settle together.
  if (world.wheel?.userData.spin) world.wheel.userData.spin.rotation.z = turn.wheelFrom + 3.3 * smooth;
  if (t >= 1) {
    orientation = turn.nextOrientation;
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
  switchColorFrom = scene.background.clone();
  switchColorTo = new THREE.Color(reflected ? 0xecc4c5 : 0xb5cfd0);
  switchedAt = false;
  soundEffects.magic();
  document.body.classList.add("world-transition");
  refresh();
}
function updateSwitch(delta) {
  if (!switchTime) return;
  switchTime = Math.max(0, switchTime - delta);
  const colorProgress = THREE.MathUtils.smoothstep(1 - switchTime / .8, 0, 1);
  scene.background.lerpColors(switchColorFrom, switchColorTo, colorProgress);
  if (switchTime <= .4 && !switchedAt) {
    switchedAt = true;
    reflected = !reflected;
    bridge.setReflected(reflected);
    setMusicTrack(reflected ? "dream" : "courtyard");
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
    remember("The guide's clue", "Match the star in the water to a round tile, then stand on it.");
    busy = true;
    architectureTime = 1.2;
    say("The doorway seals. Find the star in the water and stand on the matching round tile.", true);
    guideSays("A star glimmers in the water. Find the matching round tile and stand on it.", guideBeside(nodes.falseDoorApproach));
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
    remember("The guide's clue", "The water kept the way when the gates would not.");
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
    chapterProgress.update(1);
    journal.record(1);
    $("#travel-controls").classList.add("is-hidden");
    $("#ending-title").textContent = "The first memory.";
    $("#ending .story-copy").textContent = "The first memory leads to the moonlit garden. The journey continues shortly.";
    $("#ending").classList.remove("is-hidden");
    $('#continue-journey').hidden = true;
    import('../journey-transition.js?v=next-level-choice-20261120').then(({revealChapterReward}) => {
      revealChapterReward(journal, 1, $('#continue-journey'), () => mode === 'won');
    }).catch(() => { $('#continue-journey').hidden = false; if (mode === 'won') journal.unlock(1); });
  });
}
function reset(showIntro, preserveOpening = false) {
  musicHandoff.cancel();
  chapterProgress.reset();
  soundEffects.stopAll();
  if (!preserveOpening) {
    window.openingFlow.cancel();
    $("#intro").inert = false;
  }
  mode = preserveOpening ? "story" : (showIntro ? "intro" : "playing");
  place = "entry"; reflected = false; orientation = 0; busy = false; paused = false;
  syncEffects();
  goToWheelAfterSwitch = false;
  wheelSettleTime = 0; pressWhenSettled = false;
  storyStage = 0; stageTurns = 0;
  openingGuideDelay = 0; openingGuideSpeechDelay = 0; openingGuideActive = false; openingCueReady = false; openingDeparture = null;
  movement = null; segment = null; turn = null; switchTime = 0; architectureTime = 0;
  document.body.classList.remove("world-transition");
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
  if (!preserveOpening) {
    $("#intro").classList.toggle("is-hidden", !showIntro);
    $("#intro").classList.remove("opening-dismiss-content");
    $("#story").classList.add("is-hidden");
  }
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
let journalPausedGame = false;
document.addEventListener('journal:open', () => {
  journalPausedGame = mode === 'playing' && !paused;
  if (journalPausedGame) togglePause(true);
});
document.addEventListener('journal:close', () => {
  if (journalPausedGame) togglePause(false);
  journalPausedGame = false;
});

$("#enter-courtyard").addEventListener("click", () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!audio && AudioContextClass) audio = new AudioContextClass();
  if (audio) soundEffects.attach(audio);
  reset(false);
});
$("#enter-courtyard").disabled = false;
$("#enter-courtyard span").textContent = "Enter the courtyard";
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
// Carry the player’s sound preference into the next chapter in this tab.
$("#continue-journey").addEventListener("click", () => {
  try { sessionStorage.setItem("unfaithful-reflection-sound", sound ? "on" : "off"); }
  catch { /* The next chapter defaults to sound on if storage is unavailable. */ }
});
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
          // Offset in the camera's horizontal direction, rather than placing
          // the guide directly in front of the traveller in world space. Use
          // the actual projected figure bounds with a margin, not just his
          // centre point, when choosing a clear position.
          const game = $("#game");
          const beside = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
          beside.y = 0;
          beside.normalize().multiplyScalar(1.15);
          const travellerBounds = projectWorldBox(THREE, camera, game, new THREE.Box3().setFromObject(walker), 10);
          const exclusions = [...guideClueAreas(), ...(travellerBounds ? [travellerBounds] : [])];
          world.guide.show(chooseGuidePosition(THREE, camera, game, walker.position.clone().add(beside), walker.position, exclusions, {avoidLandmarks:true}), 12);
          openingGuideActive = true;
          soundEffects.guide();
          openingGuideSpeechDelay = .9;
        }
      } else if (openingGuideSpeechDelay > 0) {
        openingGuideSpeechDelay = Math.max(0, openingGuideSpeechDelay - delta);
        if (!openingGuideSpeechDelay) {
          guideSays("Press the red button and watch the water. The reflection will reveal a path.");
          openingCueReady = true;
        }
      }
    }
    updateWalk(delta);
    supportTravellerFeet();
    if (wheelSettleTime > 0) {
      const heading = Math.atan2(world.wheel.position.x - walker.position.x, world.wheel.position.z - walker.position.z);
      const angle = Math.atan2(Math.sin(heading - walker.rotation.y), Math.cos(heading - walker.rotation.y));
      walker.rotation.y += Math.sign(angle) * Math.min(Math.abs(angle), delta * 6);
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
  const showCue = openingCueReady && mode === "playing" && !paused && !busy && !reflected && !wheelIntroduced && (place === "entry" || place === "wheel" || place === "dais");
  const cue = $("#wheel-cue");
  cue.classList.toggle("is-hidden", !showCue);
  if (showCue) {
    const projected = (world.wheel.userData.buttonSurface || world.wheel).getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .55, 0)).project(camera);
    const game = $("#game");
    placeWheelCue(game, cue, {x:(projected.x * .5 + .5) * game.clientWidth, y:(-projected.y * .5 + .5) * game.clientHeight});
    cue.firstChild.textContent = "Tap the red button ";
    cue.setAttribute("aria-label", place === "wheel" ? "Press the red button" : "Walk to and press the red button");
  }
  const speech = $("#guide-speech");
  if (!speech.classList.contains("is-hidden") && world.guide?.isVisible()) {
    const container = $("#game");
    const guidePosition = world.guide.getPosition().add(new THREE.Vector3(0, -1.18, 0));
    const anchor = projectGuidePoint(THREE, camera, container, guidePosition, 1.18);
    const guide = guideScreenBounds(THREE, camera, container, guidePosition);
    const person = projectGuidePoint(THREE, camera, container, walker.position, .65);
    const traveller = {left:person.x-15,right:person.x+15,top:person.y-28,bottom:person.y+28};
    placeGuideMessage(container, speech, anchor, guide, traveller, guideClueAreas(), {nearGuide:true});
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
resize();
// If the player opened the story while the traveller was loading, keep that
// screen in place instead of snapping them back to the opening on completion.
reset(true, mode === "story");
// Prepare first-use materials before play, including the bridge piece and the
// guide, which can otherwise appear for the first time after a button press.
const missingBridgeWasVisible = bridge.missing.visible;
bridge.missing.visible = true;
world.guide?.show(nodes.entry, 2);
try {
  renderer.compile(scene, camera);
  // Rendering once while the opening covers the scene also prepares shadow
  // shaders, which compile separately from the visible material shaders.
  // This keeps the first press from doing that work in the middle of motion.
  renderer.render(scene, camera);
} finally {
  bridge.missing.visible = missingBridgeWasVisible;
  world.guide?.hide();
}
renderer.render(scene, camera);
$("#loading").classList.add("is-hidden");
updateSoundLabels();
resumeMusic();
if (!characterReady) say("The traveller model could not load; a temporary marker is shown.");
animate();
