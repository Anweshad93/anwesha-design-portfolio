// Recreate the outgoing chapter card before the destination can paint. This
// one-use, same-tab handoff covers the document navigation and is removed as
// soon as the next puzzle is ready. Standalone visits never show this card.
(() => {
  const key = 'unfaithful-reflection-arrival-v1';
  let marker;
  try {
    marker = JSON.parse(sessionStorage.getItem(key) || 'null');
    sessionStorage.removeItem(key);
  } catch (_) { return; }
  const chapter = Number(document.documentElement.dataset.journeyChapter);
  const entries = {
    2: ['CHAPTER II', 'The Moonlit Garden', 'The water holds another path.', '#252b45'],
    3: ['CHAPTER III', 'The Water Chamber', 'A light waits beyond the crossing.', '#102f37'],
    4: ['CHAPTER IV', 'The Hall of False Dawn', 'A doorway hides in plain sight.', '#53363f'],
  };
  const data = entries[chapter];
  if (!marker || !data || marker.chapter !== chapter || marker.path !== location.pathname ||
      !Number.isFinite(marker.at) || Math.abs(Date.now() - marker.at) > 120000) return;

  const style = document.createElement('style');
  style.textContent = `
    #journey-arrival-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;color:#f6dfb8;text-align:center;padding:24px;box-sizing:border-box;opacity:1;transition:opacity .7s ease-in-out}
    #journey-arrival-overlay::before,#journey-arrival-overlay::after{content:'';position:absolute;inset:8%;border:1px solid #dcb9824d;pointer-events:none}
    #journey-arrival-overlay::after{inset:calc(8% + 8px);border-color:#dcb98225}
    #journey-arrival-overlay .arrival-content{position:relative;max-width:34rem}
    #journey-arrival-overlay .arrival-eyebrow{margin:0 0 1.5rem;font:700 .68rem/1.4 system-ui,sans-serif;letter-spacing:.25em;text-transform:uppercase;color:#e3c79a}
    #journey-arrival-overlay .arrival-symbol{display:block;color:#f6d899;font:normal 2rem/1.2 Georgia,serif;text-shadow:0 0 30px #f5cc82aa}
    #journey-arrival-overlay h2{margin:.75rem 0 .65rem;font:400 clamp(2rem,6vw,3.5rem)/1.1 Georgia,serif;letter-spacing:-.025em}
    #journey-arrival-overlay .arrival-line{margin:0;font:400 1rem/1.55 Georgia,serif;color:#e5ded5}
    #journey-arrival-overlay .arrival-stars{position:absolute;inset:0;pointer-events:none}
    #journey-arrival-overlay .arrival-stars i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fbe2aa;box-shadow:0 0 12px 2px #ffe5ad99;opacity:.65}
    #journey-arrival-overlay .arrival-stars i:nth-child(1){left:18%;top:27%}#journey-arrival-overlay .arrival-stars i:nth-child(2){left:79%;top:23%}#journey-arrival-overlay .arrival-stars i:nth-child(3){left:24%;top:75%}#journey-arrival-overlay .arrival-stars i:nth-child(4){left:73%;top:70%}#journey-arrival-overlay .arrival-stars i:nth-child(5){left:37%;top:18%}#journey-arrival-overlay .arrival-stars i:nth-child(6){left:61%;top:82%}
    #journey-arrival-overlay.is-arriving-complete{opacity:0;pointer-events:none}
    @media(prefers-reduced-motion:reduce){#journey-arrival-overlay{transition:none}}
  `;
  document.head.append(style);
  const overlay = document.createElement('section');
  overlay.id = 'journey-arrival-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.backgroundColor = data[3];
  const stars = document.createElement('div'); stars.className = 'arrival-stars';
  for (let i = 0; i < 6; i++) stars.append(document.createElement('i'));
  const content = document.createElement('div'); content.className = 'arrival-content';
  const eyebrow = document.createElement('p'); eyebrow.className = 'arrival-eyebrow'; eyebrow.textContent = data[0];
  const symbol = document.createElement('span'); symbol.className = 'arrival-symbol'; symbol.textContent = '✦';
  const heading = document.createElement('h2'); heading.textContent = data[1];
  const line = document.createElement('p'); line.className = 'arrival-line'; line.textContent = data[2];
  content.append(eyebrow, symbol, heading, line); overlay.append(stars, content);
  document.documentElement.append(overlay);

  let started = false, observer, fallback;
  function finish() {
    if (started) return;
    started = true;
    observer?.disconnect();
    clearTimeout(fallback);
    // Wait for a fully painted opening card, then reveal it in place.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add('is-arriving-complete');
      window.setTimeout(() => { overlay.remove(); style.remove(); }, 750);
    }));
  }
  function watchScene() {
    const loading = document.getElementById('loading');
    if (!loading || loading.classList.contains('hidden') || loading.classList.contains('is-hidden')) { finish(); return; }
    observer = new MutationObserver(() => {
      if (loading.classList.contains('hidden') || loading.classList.contains('is-hidden')) finish();
    });
    observer.observe(loading, {attributes: true, attributeFilter: ['class']});
    // Failed or unusually slow loads must still reveal their existing status.
    fallback = window.setTimeout(finish, 8000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchScene, {once:true});
  else watchScene();
})();
