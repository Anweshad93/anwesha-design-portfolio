// Start preparing the opening soundtrack before the 3D scene has loaded.
// Browsers may require a tap before allowing any audible playback.
(() => {
  const player = new Audio();
  // The final phrase blends into the opening over ten seconds. Starting the
  // file after that overlap makes the repeat join the same ongoing phrase.
  // Uncompressed PCM avoids the encoder padding that can add a gap to loops.
  player.src = "./assets/tabuk-seamless-fallback.wav";
  player.loop = true;
  player.preload = "auto";
  // Keep the score present while leaving space for footsteps and mechanisms.
  player.volume = .16;
  player.hidden = true;
  document.body.appendChild(player);
  let handedOff = false;

  function start() {
    if (!document.hidden && player.paused) player.play().catch(() => {});
  }
  function tryGesture(event) {
    if (handedOff) return;
    if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
    start();
  }
  document.addEventListener("pointerdown", tryGesture, true);
  document.addEventListener("keydown", tryGesture, true);
  window.openingAudio = {
    player,
    takeOver() {
      handedOff = true;
      document.removeEventListener("pointerdown", tryGesture, true);
      document.removeEventListener("keydown", tryGesture, true);
      return { muted: false };
    },
    isMuted() { return false; },
  };
  start();
})();
