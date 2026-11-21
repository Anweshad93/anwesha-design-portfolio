// Dismiss the chapter card without a hard cut. The game can respond at once;
// the fading overlay no longer captures input or keeps focus as it leaves.
export function dismissOpening(element) {
  if (!element || element.classList.contains('hidden') || element.classList.contains('is-leaving')) return;
  const focused = globalThis.document?.activeElement;
  if (focused && element.contains(focused)) focused.blur();
  element.inert = true;
  element.setAttribute('aria-hidden', 'true');
  element.classList.add('is-leaving');
  const finish = () => element.classList.add('hidden');
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) finish();
  else window.setTimeout(finish, 320);
}
