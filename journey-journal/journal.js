// The journal belongs to the whole journey, rather than to any one scene.
// Only a chapter's completion calls unlock(); visiting a chapter never does.
const LEGACY_KEY = 'unfaithful-reflection-journal-v1';
// A replay is a new journey, while earlier saved memories remain in the
// original record and in the previous-journeys archive.
const STORAGE_KEY = `${LEGACY_KEY}-current`;
const UNSEEN_KEY = `${STORAGE_KEY}-unseen`;
const ARCHIVE_KEY = `${LEGACY_KEY}-previous-journeys`;
let memoryProgress = [];
let unseenProgress = [];

// Each recovered page has its own hand-drawn scene, loaded only when that memory is shown.
const sceneDescriptions = [
  'The courtyard pool and bridge beside a domed pavilion, golden wheel and red button.',
  'The moonlit garden pool with marked stepping stones, a bare tree and lanterns.',
  'The Water Chamber, with marked stepping stones, lanterns and a far doorway.',
  'The Hall of False Dawn, its red carpet, podium and reflected doorway.',
  'A circular sanctuary with a central pool and pale arches.'
];

const fieldNotes = [
  'The water showed me the way.',
  'A quiet touch brought the garden to life.',
  'I carried a light that still burned.',
  'The water remembered a doorway.',
  'At last, the fortress welcomes them home.'
];

// The objects grow into a small collection as the traveller earns memories.
// Each chapter ending has its own illustration.
const keepsakes = [
  {name:'The star', svg:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="25" class="keepsake-halo"/><path d="m32 8 5.2 15 14.8-5.2-5.2 14.8L52 47.4l-14.8-5.2L32 57l-5.2-14.8L12 47.4l5.2-14.8L12 17.8l14.8 5.2Z" class="keepsake-fill"/></svg>`},
  {name:'The golden globe', svg:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="24" class="keepsake-halo"/><circle cx="32" cy="32" r="15" class="keepsake-fill"/><ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(-25 32 32)" class="keepsake-line"/><ellipse cx="32" cy="32" rx="24" ry="9" transform="rotate(35 32 32)" class="keepsake-line"/></svg>`},
  {name:'The lantern', svg:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="33" r="25" class="keepsake-halo"/><path d="M24 19c0-10 16-10 16 0M19 20h26M21 22h22v30H21zM18 53h28M25 23v27M39 23v27" class="keepsake-line"/><path d="M32 46c-7-4-3-11 0-15 4 5 7 10 0 15Z" class="keepsake-fill"/></svg>`},
  {name:'The hidden doorway', svg:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="25" class="keepsake-halo"/><path d="M16 52V31a16 16 0 0 1 32 0v21M12 52h40" class="keepsake-line keepsake-arch"/><path d="M32 19v26M21 34h22" class="keepsake-light"/></svg>`},
  {name:'The way home', svg:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="25" class="keepsake-halo"/><path d="M14 53V30a18 18 0 0 1 36 0v23M10 53h44" class="keepsake-line"/><circle cx="26" cy="31" r="3" class="keepsake-fill"/><circle cx="38" cy="31" r="3" class="keepsake-fill"/><path d="M26 35v10m-5 6 5-6 5 6m7-16v10m-5 6 5-6 5 6M27 38l5 3 6-3" class="keepsake-line"/><path d="m32 11 2 4 4 1-4 2-2 4-2-4-4-1 4-2z" class="keepsake-fill"/></svg>`}
];

// A chapter reward celebrates only the object found in that chapter. The
// full set is still retained as individual journal entries for the finale.
function renderChapterKeepsake(display, chapter) {
  const keepsake = keepsakes[chapter - 1];
  if (!keepsake) return;
  display.setAttribute('role', 'img');
  display.setAttribute('aria-label', `Discovered in this chapter: ${keepsake.name}.`);
  display.innerHTML = `<span class="journey-keepsake is-new" style="--keepsake-order:0" aria-hidden="true">${keepsake.svg}<span>${keepsake.name}</span></span>`;
}

const entries = [
  {number:'I', title:'The Silent Courtyard', subtitle:'The first trace', art:'The star in the water', clue:'A star shimmered in the water beside a matching tile.', solution:'I turned the bridge to follow its reflection, stepped on the marked tile, and opened the way to a first memory.'},
  {number:'II', title:'The Moonlit Garden', subtitle:'A garden remembers', art:'The golden globe', clue:'The water showed a crescent and a star.', solution:'I matched the scattered stones to their reflections, crossed to the tree, and found the golden globe when it awakened.'},
  {number:'III', title:'The Water Chamber', subtitle:'A light still burns', art:'The little lantern', clue:'Reflected marks showed which stepping stones were safe.', solution:'I followed the marks, restored a carving of a person, lantern and doorway, and found a lantern whose flame still burned.'},
  {number:'IV', title:'The Hall of False Dawn', subtitle:'Beyond the illusion', art:'The hidden doorway', clue:'The wall was bare, but the water showed a doorway.', solution:'I placed the lantern beside the star and globe, then joined the broken reflected arch to reveal a hidden passage.'},
  {number:'V', title:'The Sanctuary of Reflections', subtitle:'The way home', art:'The inhabitants return', clue:'The inhabitants were trapped in the water’s reflection. Three discoveries held the way to bring them home.', solution:'The star recalled the fortress as it once was, the golden globe awakened its people, and the lantern led them safely home. We reunited beyond the doorway.'}
];

function normalize(value) {
  return Array.isArray(value) ? [...new Set(value.filter(n => Number.isInteger(n) && n >= 1 && n <= entries.length))].sort((a,b) => a-b) : [];
}
function readProgress() {
  // Local storage is the shared current journey. Do not merge an older tab's
  // in-memory or session copy into it after another tab starts a new journey.
  for (const name of ['localStorage','sessionStorage']) {
    try {
      const current = window[name].getItem(STORAGE_KEY);
      if (current !== null) { memoryProgress = normalize(JSON.parse(current)); return [...memoryProgress]; }
    } catch (_) { /* Storage can be unavailable in private contexts. */ }
  }
  // Existing players keep their old journal until they start a new journey.
  for (const name of ['localStorage','sessionStorage']) {
    try {
      const old = window[name].getItem(LEGACY_KEY);
      if (old !== null) { memoryProgress = normalize(JSON.parse(old)); return [...memoryProgress]; }
    } catch (_) { /* Storage is optional. */ }
  }
  return [...memoryProgress];
}
function saveProgress(progress) {
  memoryProgress = normalize(progress);
  for (const name of ['localStorage','sessionStorage']) {
    try { window[name].setItem(STORAGE_KEY, JSON.stringify(memoryProgress)); } catch (_) { /* Keep the current page usable without storage. */ }
  }
}
function readUnseen() {
  for (const name of ['localStorage','sessionStorage']) {
    try {
      const unseen = window[name].getItem(UNSEEN_KEY);
      if (unseen !== null) { unseenProgress = normalize(JSON.parse(unseen)); return [...unseenProgress]; }
    } catch (_) { /* Keep the current session usable. */ }
  }
  return [...unseenProgress];
}
function saveUnseen(progress) {
  unseenProgress = normalize(progress);
  for (const name of ['localStorage','sessionStorage']) {
    try { window[name].setItem(UNSEEN_KEY, JSON.stringify(unseenProgress)); } catch (_) { /* Keep the current session usable. */ }
  }
}

function beginJourney() {
  const previous = readProgress();
  if (previous.length) for (const name of ['localStorage','sessionStorage']) {
    try {
      const saved = JSON.parse(window[name].getItem(ARCHIVE_KEY) || '[]');
      const history = Array.isArray(saved) ? saved : [];
      history.push({ completed: previous, savedAt: new Date().toISOString() });
      window[name].setItem(ARCHIVE_KEY, JSON.stringify(history));
    } catch (_) { /* Existing records are never cleared if storage is unavailable. */ }
  }
  memoryProgress = [];
  unseenProgress = [];
  saveProgress([]);
  saveUnseen([]);
}

export function mountJournal({chapter} = {}) {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > entries.length) throw new Error('Journal requires a playable chapter number.');
  const previous = document.getElementById('traveller-journal');
  if (previous) throw new Error('Journal is already mounted.');
  // Repair journals from older versions that saved the finale alone. Its
  // recorded fifth memory proves the journey had already been completed;
  // a player who merely opens this chapter keeps their existing progress.
  const saved=readProgress();
  if (chapter===entries.length && saved.includes(entries.length) && saved.length<entries.length) {
    saveProgress(entries.map((_,index)=>index+1));
  }
  const stylesheet = document.createElement('link');
  stylesheet.rel='stylesheet';
  stylesheet.href=new URL('./journal.css?v=journey-five-20261120', import.meta.url).href;
  document.head.append(stylesheet);

  const controls = document.querySelector('.game-actions, .top-actions');
  if (!controls) throw new Error('Journal game controls are missing.');
  const button = document.createElement('button');
  button.type='button';button.className='journey-journal-toggle';
  const credits = controls.querySelector('details');
  controls.insertBefore(button, credits || null);

  const dialog = document.createElement('dialog');
  dialog.id='traveller-journal';
  dialog.className='journey-journal';
  dialog.setAttribute('aria-labelledby','journey-journal-title');
  dialog.innerHTML=`<div class="journey-journal-inner"><header class="journey-journal-header"><div class="journey-journal-heading"><span class="journey-journal-kicker">✦ &nbsp; The Unfaithful Reflection</span><h2 id="journey-journal-title">The traveller’s journal</h2><p class="journey-journal-subtitle">A record of clues, crossings and memories.</p></div><button class="journey-journal-close" type="button" aria-label="Close the journal">×</button></header><div class="journey-journal-layout"><aside class="journey-journal-index"><p class="journey-journal-complete" hidden>✦ &nbsp; Final chapter complete</p><div class="journey-journal-index-title"><span>MEMORIES SAVED</span><strong class="journey-journal-count-label"></strong></div><div class="journey-journal-progress-track" aria-hidden="true"><span></span></div><p class="journey-journal-progress" aria-live="polite"></p><nav class="journey-journal-chapters" aria-label="Journal chapters"></nav><p class="journey-journal-index-note">Each crossing leaves a memory.</p></aside><section class="journey-journal-page" aria-live="polite" aria-atomic="true"></section></div><footer class="journey-journal-footer"><p>The final chapter is yet to be written.</p><div class="journey-journal-pager" aria-label="Browse journal pages"><button type="button" data-page-step="-1" aria-label="Previous memory">←</button><span class="journey-journal-page-number"></span><button type="button" data-page-step="1" aria-label="Next memory">→</button></div></footer></div>`;
  document.body.append(dialog);
  const page=dialog.querySelector('.journey-journal-page');
  const chapters=dialog.querySelector('.journey-journal-chapters');
  const progressLabel=dialog.querySelector('.journey-journal-progress');
  const countLabel=dialog.querySelector('.journey-journal-count-label');
  const progressFill=dialog.querySelector('.journey-journal-progress-track span');
  const pageNumber=dialog.querySelector('.journey-journal-page-number');
  const previousPage=dialog.querySelector('[data-page-step="-1"]');
  const nextPage=dialog.querySelector('[data-page-step="1"]');
  const closeButton=dialog.querySelector('.journey-journal-close');
  let returnFocus = button;
  let endingButton = null;
  let selected = null;
  let newlyFound = null;

  function render() {
    const completed=readProgress();
    if (selected === null) selected=completed.includes(chapter)?chapter:(completed.at(-1)||chapter);
    // The badge identifies the chapter being played; collected memories are
    // shown separately in the journal so a replay never looks like chapter 4.
    button.innerHTML=`<span>Journal</span><span class="journey-journal-count">${chapter}/${entries.length}</span>`;
    const memoryLabel=completed.length === 1 ? '1 memory collected' : `${completed.length} memories collected`;
    button.title=`Chapter ${chapter} · ${memoryLabel}`;
    button.setAttribute('aria-label',`Open the traveller’s journal. Chapter ${chapter} of ${entries.length}; ${memoryLabel}.`);
    dialog.querySelector('.journey-journal-complete').hidden = !completed.includes(5);
    const savedLabel = completed.length === 1 ? '1 memory saved' : `${completed.length} memories saved`;
    progressLabel.textContent = completed.includes(5)
      ? `${savedLabel}.${completed.length < entries.length ? ' Some earlier chapters have not been recorded.' : ''}`
      : savedLabel;
    countLabel.textContent=`${String(completed.length).padStart(2,'0')} / ${String(entries.length).padStart(2,'0')}`;
    progressFill.style.width=`${completed.length/entries.length*100}%`;
    chapters.innerHTML=entries.map((entry,index)=>{
      const found=completed.includes(index+1);
      const active=selected===index+1;
      return `<button type="button" class="journey-journal-chapter-button${active?' is-active':''}${found?' is-found':' is-locked'}" data-chapter="${index+1}" aria-pressed="${active}" aria-label="Chapter ${entry.number}: ${found?entry.title:'memory not yet found'}"><span class="journey-journal-chapter-symbol" aria-hidden="true">${found?'✦':'✧'}</span><span class="journey-journal-chapter-numeral" aria-hidden="true">${entry.number}</span><span class="journey-journal-chapter-name"><small>CHAPTER ${entry.number}</small><span>${found?entry.title:'A memory awaits'}</span></span></button>`;
    }).join('');
    dialog.querySelector('.journey-journal-footer p').textContent = completed.includes(5) ? 'The fortress is home again.' : 'Each discovery brings the traveller closer to home.';
    const entry=entries[selected-1], found=completed.includes(selected), isNew=newlyFound===selected;
    page.classList.toggle('is-locked',!found);
    page.classList.toggle('is-new',Boolean(isNew));
    page.classList.remove('is-sketch-ready');
    page.innerHTML=found
      ? `<div class="journey-journal-art" data-art="${selected}"><span class="journey-journal-art-ornament" aria-hidden="true">✧</span><div class="journey-journal-drawing" role="img" aria-label="${sceneDescriptions[selected-1]}"><img class="journey-sketch-raster" src="${new URL(`./assets/chapter-${selected}.png`, import.meta.url).href}" alt="" aria-hidden="true" decoding="async"></div><span class="journey-journal-art-caption">${entry.art} <span aria-hidden="true">✦</span></span></div><div class="journal-memory-note"><span class="journal-memory-keepsake" aria-hidden="true">${keepsakes[selected-1].svg}</span><p class="journal-memory-handwriting">“${fieldNotes[selected-1]}”</p></div><div class="journey-journal-copy"><div class="journey-journal-page-meta"><span>MEMORY ${String(selected).padStart(2,'0')} <i>✦</i> CHAPTER ${entry.number}</span>${isNew?'<span class="journey-journal-new">NEW MEMORY</span>':''}</div><p class="journey-journal-page-subtitle">${entry.subtitle}</p><h3>${entry.title}</h3><div class="journey-journal-divider" aria-hidden="true"><span>✦</span></div><p><strong>The clue</strong>${entry.clue}</p><p><strong>What I did</strong>${entry.solution}</p></div>`
      : `<div class="journey-journal-art journey-journal-art-locked"><div class="journey-journal-lock-art" aria-hidden="true">✧</div><span class="journey-journal-art-caption">A PAGE YET TO BE WRITTEN</span></div><div class="journey-journal-copy"><div class="journey-journal-page-meta"><span>CHAPTER ${entry.number}</span></div><p class="journey-journal-page-subtitle">The story continues</p><h3>A memory awaits</h3><div class="journey-journal-divider" aria-hidden="true"><span>✦</span></div><p>Complete this chapter to reveal its sketch and the clue it holds.</p></div>`;
    if (found) {
      const sketch = page.querySelector('.journey-sketch-raster');
      const drawing = sketch.parentElement;
      const ready = () => {
        if (sketch.isConnected) page.classList.add('is-sketch-ready');
      };
      const unavailable = () => {
        if (!sketch.isConnected) return;
        drawing.setAttribute('aria-label', `Sketch unavailable: ${sceneDescriptions[selected-1]}`);
        const message = document.createElement('span');
        message.className = 'journey-sketch-fallback';
        message.setAttribute('aria-hidden', 'true');
        message.textContent = 'This sketch is unavailable.';
        sketch.replaceWith(message);
        page.classList.add('is-sketch-ready');
      };
      sketch.addEventListener('load', ready, {once:true});
      sketch.addEventListener('error', unavailable, {once:true});
      // Cached images can already be complete when the listeners are attached.
      if (sketch.complete) {
        if (sketch.naturalWidth) ready();
        else unavailable();
      }
    }
    pageNumber.textContent=`${String(selected).padStart(2,'0')} / ${String(entries.length).padStart(2,'0')}`;
    previousPage.disabled=selected===1;
    nextPage.disabled=selected===entries.length;
  }
  function selectPage(number, keepFocus=false) {
    if (!Number.isInteger(number) || number<1 || number>entries.length) return;
    selected=number; render();
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && typeof page.animate==='function') {
      page.animate([{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
    }
    if (keepFocus) chapters.querySelector(`[data-chapter="${number}"]`)?.focus();
  }
  function open(source=button) {
    returnFocus=source;
    render();
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else {dialog.setAttribute('open','');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');}
    }
    document.documentElement.dataset.journalOpen='true';
    document.dispatchEvent(new CustomEvent('journal:open'));
    if (newlyFound !== null && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const count = readProgress().length;
      progressFill.style.transition = 'none';
      progressFill.style.width = `${Math.max(0, count - 1) / entries.length * 100}%`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        progressFill.style.transition = '';
        progressFill.style.width = `${count / entries.length * 100}%`;
      }));
    }
    closeButton.focus();
  }
  function afterClose() {
    delete document.documentElement.dataset.journalOpen;
    document.dispatchEvent(new CustomEvent('journal:close'));
    if (newlyFound!==null && endingButton) {
      endingButton.textContent='Review the journal';
      endingButton.setAttribute('aria-label','Review the journal');
      endingButton.classList.remove('journey-journal-ending-new');
    }
    newlyFound=null;
    if (returnFocus?.isConnected) returnFocus.focus();
  }
  function close() {
    if (!dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else {dialog.removeAttribute('open');afterClose();}
  }
  button.addEventListener('click',()=>open(button));
  closeButton.addEventListener('click',close);
  chapters.addEventListener('click',event=>{const target=event.target.closest('[data-chapter]');if(target)selectPage(Number(target.dataset.chapter),true);});
  previousPage.addEventListener('click',()=>selectPage(selected-1));
  nextPage.addEventListener('click',()=>selectPage(selected+1));
  dialog.addEventListener('close',afterClose);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  window.addEventListener('storage',render);
  render();

  // The end card is visible for a few seconds before the journal opens.
  // Show this chapter's own discovery, including when it is replayed.
  function showKeepsake(number) {
    const ending = document.getElementById('ending');
    const card = ending?.querySelector('.card') || ending;
    if (!card) return;
    let display = card.querySelector('.journey-keepsakes');
    if (!display) {
      display = document.createElement('div');
      display.className = 'journey-keepsakes';
      const title = card.querySelector('h2');
      if (title) title.after(display); else card.prepend(display);
    }
    renderChapterKeepsake(display, number);
  }

  // Save the chapter at the moment it is completed, even if the player
  // closes the page during the short pause before the reward appears.
  function record(n=chapter) {
    if (!Number.isInteger(n) || n < 1 || n > keepsakes.length) return false;
    const completed=readProgress(), isNew=!completed.includes(n);
    // Completing the finale closes the whole journey. A player who enters
    // the final chapter directly should still receive the complete journal;
    // visiting it alone never fills in the earlier memories.
    const finaleComplete=chapter===entries.length && n===entries.length;
    if (isNew || (finaleComplete && completed.length<entries.length)) {
      saveProgress(finaleComplete ? entries.map((_,index)=>index+1) : [...completed,n]);
      if (isNew) saveUnseen([...readUnseen(),n]);
      render();
    }
    showKeepsake(n);
    return isNew;
  }

  return {
    open,
    record,
    beginJourney() {
      beginJourney();
      selected=1;
      newlyFound=null;
      render();
    },
    unlock(n=chapter) {
      if (!Number.isInteger(n) || n < 1 || n > keepsakes.length) return false;
      record(n);
      const unseen=readUnseen(), isNew=unseen.includes(n);
      // Always reveal this chapter's page, including on a replay. Only a
      // first discovery receives the NEW MEMORY treatment.
      selected=n; newlyFound=isNew?n:null;
      if (isNew) saveUnseen(unseen.filter(item=>item!==n));
      render();
      const ending=document.getElementById('ending');
      const next=ending?.querySelector('.continue-link, #continue-journey');
      if (ending && !next && !endingButton) {
        endingButton=document.createElement('button');endingButton.type='button';endingButton.className='journey-journal-ending';
        endingButton.textContent='Review the journal';
        endingButton.addEventListener('click',()=>open(endingButton));
        (ending.querySelector('.card') || ending).append(endingButton);
      }
      open(next || endingButton || button);
      return isNew;
    },
    destroy() {
      if (dialog.open) close();
      window.removeEventListener('storage',render);
      endingButton?.remove();document.querySelector('#ending .journey-keepsakes')?.remove();button.remove();dialog.remove();stylesheet.remove();
    }
  };
}
