// Original, synthesized cues: no downloaded sound assets are required.
// The context is created from a player gesture so browser autoplay rules apply.
export function createGardenSounds() {
  let context = null, output = null, noise = null, enabled = true;
  const active = new Set();

  function setEnabled(value) {
    enabled = Boolean(value);
    if (context && output) {
      const now = context.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setValueAtTime(output.gain.value, now);
      output.gain.linearRampToValueAtTime(enabled ? .70 : 0, now + .045);
      // Stop even delayed notes, so a pause/unmute cannot revive old cues.
      if (!enabled) for (const source of active) {
        try { source.stop(now + .05); } catch (_) { /* Already stopped. */ }
      }
    }
  }

  function unlock() {
    if (!enabled) return;
    try {
      if (!context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        context = new AudioContextClass();
        output = context.createGain();
        output.gain.value = .70;
        output.connect(context.destination);
        noise = context.createBuffer(1, Math.floor(context.sampleRate * .13), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch (_) {
      // Music and gameplay remain available if Web Audio is unavailable.
      context = null; output = null; noise = null;
    }
  }

  function remember(source) {
    active.add(source);
    source.onended = () => active.delete(source);
    return source;
  }

  function tone(frequency, delay, duration, level, type = 'sine', endFrequency = frequency, attack = .015) {
    if (!context || !output || !enabled) return;
    const start = context.currentTime + delay;
    const oscillator = remember(context.createOscillator()), gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(output);
    oscillator.start(start); oscillator.stop(start + duration + .02);
  }

  function impact(landing = false) {
    if (!context || !output || !enabled) return;
    const now = context.currentTime, duration = landing ? .13 : .085;
    // A rounded sole impact plus a distinct, short stone contact makes each
    // footstep audible over the music without a harsh or sustained thump.
    tone(landing ? 145 : 175, 0, duration, landing ? .28 : .22, 'sine', landing ? 70 : 85, .004);
    tone(landing ? 780 : 950, 0, .055, landing ? .10 : .085, 'triangle', 550, .003);
    if (!noise) return;
    const source = remember(context.createBufferSource()), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noise;
    filter.type = 'bandpass'; filter.frequency.value = landing ? 1150 : 1550;
    filter.Q.value = .8;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(landing ? .20 : .16, now + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(output);
    source.start(now); source.stop(now + duration);
  }

  return {
    unlock, setEnabled,
    footstep() { impact(false); },
    landing() { impact(true); },
    jump() {
      // A slightly brighter lift remains audible over the music, while the
      // short envelope keeps the traveller's small hop light.
      tone(250, 0, .21, .18, 'sine', 430, .025);
      tone(510, .025, .16, .095, 'sine', 710, .02);
    },
    correctTile() {
      // A gentle rising pair rewards the match without interrupting the guide.
      tone(587, 0, .28, .10, 'sine', 587, .012);
      tone(784, .09, .38, .075, 'sine', 784, .015);
    },
    wrongTile() {
      // A softer descending pair signals a mismatch without a harsh buzzer.
      tone(392, 0, .23, .11, 'triangle', 350, .015);
      tone(294, .12, .30, .085, 'sine', 277, .018);
    },
    guide() {
      tone(659, 0, .50, .055); tone(988, .09, .50, .042); tone(1319, .18, .56, .030);
    },
    tree() {
      tone(330, 0, .90, .065, 'sine', 392);
      tone(494, .13, .85, .050); tone(659, .28, .95, .043); tone(988, .45, .9, .025);
    },
    key() {
      tone(880, 0, .52, .055); tone(1175, .12, .62, .043); tone(1568, .24, .7, .030);
    },
    quake() {
      if (!context || !output || !enabled) return;
      // A low stone rumble, brief cracks, then a softer airy release follow
      // the three-second shake and dissolve. All sources use the same output
      // and active set as the other effects, so pause/mute stops them too.
      const now=context.currentTime, duration=2.8;
      const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate);
      const samples=buffer.getChannelData(0);
      for(let i=0;i<samples.length;i++) samples[i]=Math.random()*2-1;
      const rumble=remember(context.createBufferSource()),low=context.createBiquadFilter(),rumbleGain=context.createGain();
      rumble.buffer=buffer;low.type='lowpass';low.frequency.setValueAtTime(520,now);low.frequency.exponentialRampToValueAtTime(180,now+duration);
      rumbleGain.gain.setValueAtTime(.0001,now);rumbleGain.gain.exponentialRampToValueAtTime(.27,now+.12);rumbleGain.gain.setValueAtTime(.27,now+.55);rumbleGain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      rumble.connect(low);low.connect(rumbleGain);rumbleGain.connect(output);rumble.start(now);rumble.stop(now+duration+.02);
      tone(105,0,1.65,.15,'sine',55,.04);
      for(const delay of [.20,.53,.88,1.22]){
        tone(260,delay,.17,.09,'triangle',95,.008);
        tone(740,delay,.09,.035,'triangle',330,.005);
      }
      tone(640,1.35,1.1,.028,'sine',970,.20);
    },
    door() {
      if (!context || !output || !enabled) return;
      // Airy friction and a resonant hinge make the opening audible, while a
      // long release lets it settle naturally into the music.
      const now = context.currentTime;
      const source = remember(context.createBufferSource());
      const filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = noise; source.loop = true;
      filter.type = 'bandpass'; filter.Q.value = .8;
      filter.frequency.setValueAtTime(390, now);
      filter.frequency.exponentialRampToValueAtTime(680, now + 1.25);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.24, now + .2);
      gain.gain.exponentialRampToValueAtTime(.0001, now + 1.65);
      source.connect(filter); filter.connect(gain); gain.connect(output);
      source.start(now); source.stop(now + 1.7);
      tone(190, .08, 1.35, .12, 'sine', 230, .12);
      tone(460, .18, 1.05, .065, 'triangle', 530, .12);
    },
  };
}
