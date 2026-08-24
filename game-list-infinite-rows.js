// Keep a rolling reserve of blank editable rows at the bottom of Game List_Online.
// Rows are created through the page's existing insert-row controls so DATA,
// formatting indexes and Firestore persistence stay in sync.
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

  async function ensureRows() {
    if (filling) return;
    const workspace = document.querySelector('#workspace.game-list-page');
    const body = workspace?.querySelector('#glBody');
    const search = workspace?.querySelector('#glSearch');
    const addBtn = workspace?.querySelector('#glAdd');
    const belowBtn = workspace?.querySelector('#glAddMenu [data-insert="below"]');
    if (!body || !addBtn || !belowBtn || (search?.value || '').trim()) return;

    const rows = [...body.querySelectorAll('tr[data-row]')];
    if (!rows.length) return;

    let trailing = 0;
    for (let i = rows.length - 1; i >= 0 && isBlankRow(rows[i]); i--) trailing++;
    let need = RESERVE - trailing;
    if (need <= 0) return;

    filling = true;
    try {
      while (need-- > 0) {
        const currentRows = [...body.querySelectorAll('tr[data-row]')];
        const last = currentRows[currentRows.length - 1];
        const cell = last?.querySelector('td[contenteditable]');
        if (!cell) break;
        cell.click();
        addBtn.click();
        belowBtn.click();
        await new Promise(resolve => setTimeout(resolve, 90));
      }
    } finally {
      filling = false;
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
