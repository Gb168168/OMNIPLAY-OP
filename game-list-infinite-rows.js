// Keep a rolling reserve of blank editable rows at the bottom of Game List_Online.
// Preserve the user's viewport while rows are added automatically.
(() => {
  const RESERVE = 15;
  let filling = false;
  let timer = null;

  const isBlankRow = tr => [...tr.querySelectorAll('td[contenteditable]')]
    .every(td => !td.innerText.trim());

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(ensureRows, 120);
  };

  const restoreScroll = (scroller, top, left) => {
    if (!scroller) return;
    scroller.scrollTop = top;
    scroller.scrollLeft = left;
  };

  async function ensureRows() {
    if (filling) return;
    const workspace = document.querySelector('#workspace.game-list-page');
    const body = workspace?.querySelector('#glBody');
    const search = workspace?.querySelector('#glSearch');
    const addBtn = workspace?.querySelector('#glAdd');
    const belowBtn = workspace?.querySelector('#glAddMenu [data-insert="below"]');
    const scroller = workspace?.querySelector('.gl-scroll');
    if (!body || !addBtn || !belowBtn || (search?.value || '').trim()) return;

    const rows = [...body.querySelectorAll('tr[data-row]')];
    if (!rows.length) return;

    let trailing = 0;
    for (let i = rows.length - 1; i >= 0 && isBlankRow(rows[i]); i--) trailing++;
    let need = RESERVE - trailing;
    if (need <= 0) return;

    const savedTop = scroller?.scrollTop || 0;
    const savedLeft = scroller?.scrollLeft || 0;
    const previouslyFocused = document.activeElement;

    filling = true;
    window.__gameListAutoFill = true;
    try {
      while (need-- > 0) {
        const currentRows = [...body.querySelectorAll('tr[data-row]')];
        const last = currentRows[currentRows.length - 1];
        const cell = last?.querySelector('td[contenteditable]');
        if (!cell) break;

        // Select the last row only long enough for the existing insert logic to know the position.
        cell.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
        addBtn.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
        belowBtn.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));

        restoreScroll(scroller, savedTop, savedLeft);
        await new Promise(resolve => requestAnimationFrame(() => {
          restoreScroll(scroller, savedTop, savedLeft);
          resolve();
        }));
        await new Promise(resolve => setTimeout(resolve, 35));
        restoreScroll(scroller, savedTop, savedLeft);
      }
    } finally {
      window.__gameListAutoFill = false;
      filling = false;
      restoreScroll(scroller, savedTop, savedLeft);
      requestAnimationFrame(() => restoreScroll(scroller, savedTop, savedLeft));
      setTimeout(() => restoreScroll(scroller, savedTop, savedLeft), 80);
      if (previouslyFocused && previouslyFocused.isConnected && previouslyFocused !== document.body) {
        try { previouslyFocused.focus({preventScroll:true}); } catch (_) {}
      } else if (document.activeElement?.closest?.('#glBody')) {
        document.activeElement.blur();
      }
    }
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {subtree:true, childList:true, characterData:true});
  document.addEventListener('input', e => {
    if (e.target.closest?.('#glBody td[contenteditable]')) schedule();
  });
  document.addEventListener('DOMContentLoaded', schedule);
  setTimeout(schedule, 700);
})();
