// The original track is truncated at a verified MP3 frame boundary. Alternating
// two players blends the end of that opening into its beginning while keeping
// the existing mute, pause and journey controls. Native looping is a fallback
// if a browser cannot start the second player.
export function createFinaleMusic({src, enabled = true, makeAudio, onError = () => {}} = {}) {
  const factory = makeAudio || ((source, id) => {
    const audio = document.createElement('audio');
    audio.src = source;
    audio.id = id;
    audio.hidden = true;
    audio.setAttribute('aria-hidden', 'true');
    document.body.append(audio);
    return audio;
  });
  const tracks = [factory(src, 'music-finale-a'), factory(src, 'music-finale-b')];
  tracks.forEach(track => { track.preload = 'auto'; track.loop = true; track.volume = 0; });
  let active = 0, started = false, sound = Boolean(enabled), paused = false, stopped = false;
  let initialGain = 0, blend = 0, blending = false, nextPending = false, nextReady = false;
  let generation = 0;
  const volume = .22, crossfadeSeconds = 4;
  const wanted = () => started && sound && !paused && !stopped;

  function play(track, whenReady = () => {}, whenFailed = () => {}) {
    if (!wanted() || !track.paused) { if (wanted()) whenReady(); else whenFailed(); return; }
    const token = generation;
    let result;
    try { result = track.play(); }
    catch (error) { onError(error); whenFailed(); return; }
    Promise.resolve(result).then(() => {
      if (token !== generation || !wanted()) { track.pause(); whenFailed(); return; }
      whenReady();
    }).catch(error => { if (token === generation && error?.name !== 'AbortError') onError(error); whenFailed(); });
  }

  function mixVolumes() {
    const level = wanted() ? volume * initialGain : 0;
    tracks[active].volume = level * (blending ? 1 - blend : 1);
    tracks[1 - active].volume = level * (blending ? blend : 0);
  }

  function pauseAll() { generation++; tracks.forEach(track => track.pause()); }

  function primeStandby() {
    const standby = tracks[1 - active];
    standby.volume = 0;
    play(standby, () => {
      // Do not interrupt a blend that began while the play promise resolved.
      if (!blending && !nextPending) { standby.pause(); try { standby.currentTime = 0; } catch (_) {} }
    });
  }

  function resume() {
    if (!wanted()) return;
    play(tracks[active]);
    if (blending) play(tracks[1 - active]);
    else primeStandby();
    mixVolumes();
  }

  return {
    start() { if (started) return; started = true; resume(); },
    beginFlip() {},
    setEnabled(value) { sound = Boolean(value); if (!sound) pauseAll(); else resume(); mixVolumes(); },
    setPaused(value) { paused = Boolean(value); if (paused) pauseAll(); else resume(); mixVolumes(); },
    finish() {},
    update(dt) {
      if (!wanted()) return;
      const step = Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, .1));
      initialGain = Math.min(1, initialGain + step / 2);
      const current = tracks[active], standby = tracks[1 - active];
      const duration = Number.isFinite(current.duration) && current.duration > 1 ? current.duration : 45;
      if (!blending && !nextPending && current.currentTime >= duration - crossfadeSeconds) {
        nextPending = true; nextReady = false;
        try { standby.currentTime = 0; } catch (_) {}
        play(standby, () => { nextReady = true; nextPending = false; blending = true; blend = 0; }, () => { nextPending = false; });
      }
      if (blending && nextReady) {
        blend = Math.min(1, blend + step / crossfadeSeconds);
        if (blend >= 1) {
          current.pause();
          try { current.currentTime = 0; } catch (_) {}
          active = 1 - active; blending = false; nextReady = false; blend = 0;
        }
      }
      mixVolumes();
    },
    stop() { stopped = true; pauseAll(); mixVolumes(); }
  };
}
