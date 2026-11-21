// A synthesized stone-and-earth rumble follows the hall's actual rotation.
// Its gain is driven by animation progress, so pause and mute do not let a
// pre-recorded cue run ahead of the world.
export function createFlipSound({enabled = true, makeContext} = {}) {
  let context = null, master = null, low = null, scrape = null, active = Boolean(enabled);
  let progress = 0;

  function setLevel() {
    if (!context || !master) return;
    const p = Math.max(0, Math.min(1, progress));
    // The mass begins softly, gathers weight halfway, then settles.
    const envelope = active && p > 0 && p < 1 ? Math.pow(Math.sin(Math.PI * p), .75) : 0;
    const now = context.currentTime;
    master.gain.setTargetAtTime(envelope * .48, now, .025);
    low.frequency.setTargetAtTime(190 + 120 * envelope, now, .08);
    scrape.frequency.setTargetAtTime(470 + 280 * envelope, now, .08);
  }

  function unlock() {
    if (!active) return;
    try {
      if (!context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!makeContext && !AudioContextClass) return;
        context = makeContext ? makeContext() : new AudioContextClass();
        master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);

        // A loop of filtered noise gives the moving masonry its weight; a
        // second band adds a restrained grind, with a low resonant undertone.
        const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 2), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        const rumble = context.createBufferSource();
        rumble.buffer = buffer; rumble.loop = true;
        low = context.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 190;
        const rumbleGain = context.createGain(); rumbleGain.gain.value = .9;
        rumble.connect(low); low.connect(rumbleGain); rumbleGain.connect(master); rumble.start();

        const grit = context.createBufferSource();
        grit.buffer = buffer; grit.loop = true;
        scrape = context.createBiquadFilter(); scrape.type = 'bandpass'; scrape.frequency.value = 470; scrape.Q.value = .8;
        const gritGain = context.createGain(); gritGain.gain.value = .18;
        grit.connect(scrape); scrape.connect(gritGain); gritGain.connect(master); grit.start();

        const stone = context.createOscillator(); stone.type = 'sine'; stone.frequency.value = 55;
        const stoneGain = context.createGain(); stoneGain.gain.value = .20;
        stone.connect(stoneGain); stoneGain.connect(master); stone.start();
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
      setLevel();
    } catch (_) {
      // The puzzle remains playable on browsers without Web Audio.
      context = null; master = null; low = null; scrape = null;
    }
  }

  return {
    unlock,
    setEnabled(value) { active = Boolean(value); setLevel(); },
    update(value) { progress = Number.isFinite(value) ? value : 0; setLevel(); },
  };
}
