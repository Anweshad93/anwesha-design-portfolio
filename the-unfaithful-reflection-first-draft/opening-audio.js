// Start preparing the opening soundtrack before the 3D scene has loaded.
// Browsers may require a tap before allowing any audible playback.
(() => {
  const player = new Audio("./assets/dreams-become-real.mp3");
  player.loop = true;
  player.preload = "auto";
  player.volume = .12;
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
