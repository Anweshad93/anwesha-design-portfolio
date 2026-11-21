// Two locally hosted tracks share the game's sound and pause controls.
// Their levels change only in the render loop so pausing also pauses a fade.
export function createHallMusic({calmSrc, mysterySrc, enabled = true, onError = () => {}, makeAudio} = {}) {
  const factory = makeAudio || ((src, id) => {
    const audio = document.createElement('audio');
    audio.id = id;
    audio.src = src;
    audio.hidden = true;
    audio.setAttribute('aria-hidden', 'true');
    document.body.appendChild(audio);
    return audio;
  });
  const calm = {audio: factory(calmSrc, 'music-calm'), pending: false, priming: false, blocked: false, generation: 0};
  const mystery = {audio: factory(mysterySrc, 'music-mystery'), pending: false, priming: false, blocked: false, generation: 0};
  for (const track of [calm, mystery]) {
    track.audio.loop = true;
    track.audio.preload = 'auto';
    track.audio.volume = 0;
  }
  // The first minute is the quieter section; fade its ends when replaying it.
  calm.audio.loop = false;
  const volume = .22;
  // These gentle time-based envelopes were measured from the original audio.
  // They lower the louder phrases before they swell, rather than making the
  // entire score quieter. Linear interpolation prevents audible jumps.
  const calmBalance = [[0,1],[35,1],[37,.94],[40,.72],[43,.71],[49,.74],[56,.72],[60,.75]];
  const mysteryBalance = [[0,1],[23,1],[26,.90],[31,.95],[33,1],[45,1],[48,.91],[50,.86],[52,.98],[54,1],[158,1],[164,.87],[168,1],[180,1]];
  function levelAt(curve, seconds) {
    const t = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    for (let i=1; i<curve.length; i++) {
      const [end, to] = curve[i], [start, from] = curve[i-1];
      if (t <= end) return from + (to-from) * (t-start) / (end-start);
    }
    return curve[curve.length-1][1];
  }
  const transitionSeconds = 2.8, endingSeconds = 8;
  let started = false, paused = false, sound = Boolean(enabled), mode = 'opening';
  let mix = 0, fade = 1;
  if (calm.audio.addEventListener) calm.audio.addEventListener('timeupdate', () => {
    if (calm.audio.currentTime >= 60 && mix < 1 && mode !== 'ended') calm.audio.currentTime = 0;
  });

  function shouldPlay(track) {
    if (!started || !sound || paused || mode === 'ended') return false;
    if (mode === 'transition') return true;
    return track === calm ? mix < 1 : mix > 0;
  }
  function stop(track) {
    track.generation++;
    track.audio.pause();
  }
  function play(track) {
    if (!shouldPlay(track) || !track.audio.paused || track.pending || track.blocked) return;
    const generation = track.generation;
    track.pending = true;
    let attempt;
    try { attempt = track.audio.play(); }
    catch (error) {
      track.pending = false;
      track.blocked = true;
      onError(error);
      return;
    }
    Promise.resolve(attempt).then(() => {
      if (generation !== track.generation || !shouldPlay(track)) track.audio.pause();
    }).catch(error => {
      // A pause or source change may cancel an in-flight play request.
      if (generation === track.generation && shouldPlay(track) && error?.name !== 'AbortError') {
        track.blocked = true;
        onError(error);
      }
    }).finally(() => { track.pending = false; });
  }
  // Some browsers grant playback permission per audio element. Give the
  // silent second track that permission during the Start button's gesture,
  // then immediately pause it until the world begins turning.
  function primeMystery() {
    if (!started || !sound || paused || mode !== 'opening' || mystery.pending) return;
    const generation = mystery.generation;
    mystery.audio.volume = 0;
    mystery.pending = true;
    mystery.priming = true;
    let attempt;
    try { attempt = mystery.audio.play(); }
    catch (_) { mystery.pending = false; mystery.priming = false; return; }
    Promise.resolve(attempt).then(() => {
      if (generation !== mystery.generation || !shouldPlay(mystery)) mystery.audio.pause();
    }).catch(() => {}).finally(() => {
      mystery.pending = false;
      mystery.priming = false;
      if (shouldPlay(mystery)) play(mystery);
    });
  }
  function reconcile() {
    const audible = started && sound && !paused && mode !== 'ended';
    const time = Number.isFinite(calm.audio.currentTime) ? calm.audio.currentTime : 0;
    const openingEnvelope = Math.max(0, Math.min(1, time / 2, (60 - time) / 3));
    calm.audio.volume = audible ? volume * (1 - mix) * fade * openingEnvelope * levelAt(calmBalance, time) : 0;
    mystery.audio.volume = audible ? volume * mix * fade * levelAt(mysteryBalance, mystery.audio.currentTime) : 0;
    for (const track of [calm, mystery]) {
      if (shouldPlay(track)) play(track);
      else if (track.priming && started && sound && !paused && mode === 'opening') continue;
      else if (!track.audio.paused || track.pending) stop(track);
    }
  }
  function retryPlayback() { calm.blocked = false; mystery.blocked = false; }

  return {
    // Called directly in the Start button's user gesture.
    start() { started = true; retryPlayback(); reconcile(); primeMystery(); },
    // Called once when the hall begins its turn.
    beginFlip() {
      if (mode !== 'opening') return;
      mode = 'transition';
      reconcile();
    },
    setEnabled(value) { sound = Boolean(value); if (sound) retryPlayback(); reconcile(); if (sound) primeMystery(); },
    setPaused(value) { paused = Boolean(value); if (!paused) retryPlayback(); reconcile(); },
    finish() { if (mode !== 'ended' && mode !== 'ending') mode = 'ending'; },
    update(dt) {
      if (paused || !started || mode === 'ended') return;
      const step = Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, .1));
      if (calm.audio.currentTime >= 60 && mix < 1) calm.audio.currentTime = 0;
      if (mode === 'transition') {
        mix = Math.min(1, mix + step / transitionSeconds);
        if (mix >= 1) mode = 'mystery';
      } else if (mode === 'ending') {
        fade = Math.max(0, fade - step / endingSeconds);
        if (fade <= 0) mode = 'ended';
      }
      reconcile();
    },
    stop() { mode = 'ended'; reconcile(); },
  };
}
