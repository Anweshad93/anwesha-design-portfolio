// Five chapters, including the final chapter still to come. Each scene reports
// meaningful milestones; moving backwards or trying an incorrect answer never
// removes progress already made in the current chapter.
export function createChapterProgress(chapter) {
  const bar = document.querySelector('.journey-chapter-progress');
  const current = bar?.querySelector('.journey-chapter-progress-track > .is-current');
  let highest = 0;
  function render() {
    if (!bar || !current) return;
    const percent = Math.round(highest * 100);
    current.style.setProperty('--level-progress', `${percent}%`);
    bar.setAttribute('aria-valuenow', String(percent));
    bar.setAttribute('aria-valuetext', `Chapter ${chapter} of 5, ${percent}% through this chapter`);
  }
  render();
  return {
    update(value) { if (Number.isFinite(value)) { highest = Math.max(highest, Math.max(0, Math.min(1,value))); render(); } },
    reset() { highest = 0; render(); }
  };
}
