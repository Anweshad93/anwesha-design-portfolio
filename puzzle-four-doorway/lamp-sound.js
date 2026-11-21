// Soft, original synthesized notes for the diamonds on the final walk.
// The sound is triggered by the same footfall that makes the diamond glow.
export function createLampSound({ enabled = true, makeContext } = {}) {
  let context = null, output = null, active = Boolean(enabled);
  const playing = new Set();
  function unlock() {
    if (!active) return;
    try {
      if (!context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!makeContext && !AudioContextClass) return;
        context = makeContext ? makeContext() : new AudioContextClass();
        output = context.createGain();
        output.gain.value = .7;
        output.connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch (_) { context = null; output = null; }
  }
  function setEnabled(value) {
    active = Boolean(value);
    if (!context || !output) return;
    const now = context.currentTime;
    output.gain.cancelScheduledValues(now);
    output.gain.setValueAtTime(output.gain.value, now);
    output.gain.linearRampToValueAtTime(active ? .7 : 0, now + .03);
    if (!active) for (const oscillator of playing) {
      try { oscillator.stop(now + .03); } catch (_) { /* Already stopped. */ }
    }
  }
  function glow(index = 0) {
    if (!active || !context || !output) return;
    const now = context.currentTime;
    const frequency = [660, 784, 988][Math.max(0, Math.min(2, index))];
    // A rounded glassy chime, short enough to stay clear of the next footstep.
    for (const [ratio, volume, duration] of [[1, .075, .30], [2, .018, .18]]) {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency * ratio, now);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain); gain.connect(output);
      playing.add(oscillator); oscillator.onended = () => playing.delete(oscillator);
      oscillator.start(now); oscillator.stop(now + duration + .01);
    }
  }
  return { unlock, setEnabled, glow };
}
