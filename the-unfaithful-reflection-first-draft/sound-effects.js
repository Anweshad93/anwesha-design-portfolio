// Original, synthesized sound effects. No recordings or third-party samples.
// The game owns the AudioContext and enables it after a player gesture.
export function createSoundEffects() {
  let audio = null;
  let output = null;
  let noise = null;
  let enabled = false;
  const active = new Set();

  function attach(context) {
    if (!context || audio === context) return;
    stopAll();
    if (output) output.disconnect();
    audio = context;
    output = audio.createGain();
    output.gain.value = enabled ? .24 : 0;
    output.connect(audio.destination);

    // A short noise buffer supplies filtered textures for stone and machinery.
    noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * .32), audio.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    // Cancel scheduled tones as well as muting the bus. They must not resume
    // unexpectedly if the player unmutes or returns to the tab immediately.
    if (!enabled) stopAll();
    if (!audio || !output) return;
    const now = audio.currentTime;
    output.gain.cancelScheduledValues(now);
    output.gain.setTargetAtTime(enabled ? .24 : 0, now, .025);
  }

  function remember(source) {
    active.add(source);
    source.onended = () => active.delete(source);
    return source;
  }

  function stopAll() {
    active.forEach((source) => {
      try { source.stop(); } catch { /* Already stopped. */ }
    });
    active.clear();
  }

  function canPlay() {
    return enabled && audio && output && audio.state === "running";
  }

  function tone(start, duration, frequency, endFrequency, volume, type = "sine", attack = .025) {
    const oscillator = remember(audio.createOscillator());
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(attack, duration / 4));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  function texturedSound(start, duration, frequency, volume, q = .8, attack = .07) {
    const source = remember(audio.createBufferSource());
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = noise;
    source.loop = duration > noise.duration;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(attack, duration / 3));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter).connect(gain).connect(output);
    source.start(start);
    source.stop(start + duration + .02);
  }

  // A gradual rise, sustained movement, and fade give heavy architecture
  // weight without the sudden click of a single short noise burst.
  function stoneMovement(start, duration, frequency, volume) {
    const source = remember(audio.createBufferSource());
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = noise;
    source.loop = true;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency, start);
    filter.frequency.exponentialRampToValueAtTime(frequency * .72, start + duration);
    filter.Q.value = .75;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .16);
    gain.gain.linearRampToValueAtTime(volume * .65, start + duration * .58);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter).connect(gain).connect(output);
    source.start(start);
    source.stop(start + duration + .02);
  }

  function footstep(side) {
    if (!canPlay()) return;
    const now = audio.currentTime;
    // A quick heel impact and short hard contact, without a leafy brush.
    // Both sounds decay quickly, like shoes tapping a solid stone floor.
    tone(now, .09, side === "left" ? 155 : 142, 70, .105, "sine", .004);
    texturedSound(now, .035, side === "left" ? 1750 : 1600, .055, 1.1, .002);
    tone(now, .045, side === "left" ? 1000 : 920, 780, .018, "triangle", .002);
  }

  function bridge() {
    if (!canPlay()) return;
    const now = audio.currentTime;
    // Warm stone movement and a more noticeable mechanical resonance.
    texturedSound(now, 1.8, 285, .145, .65);
    tone(now, 1.7, 86, 69, .082, "sine");
    tone(now + .12, 1.45, 172, 138, .028, "sine");
  }

  function closeDoor() {
    if (!canPlay()) return;
    const now = audio.currentTime;
    // The lowering starts softly, builds to a rounded impact, and settles
    // into a short resonance instead of a sudden crack.
    stoneMovement(now, .84, 300, .16);
    tone(now, .85, 115, 68, .10, "sine", .16);
    tone(now + .50, .78, 136, 53, .27, "sine", .075);
    tone(now + .51, .53, 260, 125, .075, "triangle", .06);
    texturedSound(now + .50, .42, 650, .055, .8, .08);
    tone(now + .74, .72, 105, 65, .055, "sine", .08);
  }

  function lowerGate() {
    if (!canPlay()) return;
    const now = audio.currentTime;
    // A quieter, slower sound accompanies the third platform's gate as it
    // sinks; a softened final note suggests the mechanism settling in place.
    stoneMovement(now, 1.55, 225, .14);
    tone(now, 1.4, 94, 63, .09, "sine", .17);
    tone(now + .88, .65, 155, 90, .07, "triangle", .1);
  }

  function magic() {
    if (!canPlay()) return;
    const now = audio.currentTime;
    // Airy, sparse tones that fade behind the soundtrack.
    tone(now, 1.05, 660, 665, .032);
    tone(now + .16, 1.2, 880, 888, .022);
    tone(now + .31, 1.3, 1108, 1116, .014);
  }

  return { attach, setEnabled, footstep, bridge, closeDoor, lowerGate, magic, stopAll };
}
