(() => {
  const english = () => document.documentElement.lang.toLowerCase().startsWith('en');
  const confirmLeave = () => window.confirm(english()
    ? 'Leave this editing page? Unsaved changes may be lost.'
    : '確定離開目前的編輯頁面？尚未儲存的變更可能會遺失。');
  const initial = new WeakMap();
  const changed = new Set();
  function field(target) {
    const el = target?.closest?.('input,textarea,select,[contenteditable=true]');
    if (!el || el.readOnly || el.disabled || el.matches('[type=hidden],[type=button],[type=submit],[type=search]')) return;
    if (el.closest('#permissionList,.owner-permissions-dialog') || !el.closest('dialog[open],#workspace form,[contenteditable=true]')) return;
    if (/搜尋|搜索|search|filter|篩選/i.test([el.placeholder, el.id, el.getAttribute('aria-label')].join(' ')) && !el.closest('.release-form')) return;
    return el;
  }
  function value(el) {
    if (el.matches('[type=checkbox],[type=radio]')) return el.checked;
    if (el.matches('select[multiple]')) return JSON.stringify(Array.from(el.selectedOptions, option => option.value));
    return el.isContentEditable ? el.innerHTML : el.value;
  }
  function remember(event) {
    const el = field(event.target);
    if (el && !changed.has(el)) initial.set(el, value(el));
  }
  for (const type of ['focusin','pointerdown','beforeinput','keydown']) window.addEventListener(type, remember, true);
  function track(event) {
    if (!event.isTrusted) return;
    const el = field(event.target);
    if (!el) return;
    if (initial.has(el) && value(el) === initial.get(el)) changed.delete(el);
    else changed.add(el);
  }
  for (const type of ['input','change']) window.addEventListener(type, track, true);
  function dirty(scope) {
    let pending = false;
    for (const el of changed) {
      const dialog = el.closest('dialog');
      if (!el.isConnected || (dialog && !dialog.open) || value(el) === initial.get(el)) changed.delete(el);
      else if (!scope || scope.contains(el)) pending = true;
    }
    return pending;
  }
  window.addEventListener('close', event => {
    for (const el of changed) if (event.target.contains(el)) changed.delete(el);
  }, true);
  const navigation = '.page-link,.customer-section,.platform-custom-category button,#customerBtn,#platformViewBtn,#backGroup,#backCustomers,[data-guide-toggle],[data-open-folder],[data-folder-crumb],[data-crumb-index],[data-notification-game],.group-permissions,#groupPermission,#customerLanguage';
  const dismiss = '.icon-close,[data-close],[data-member-close],[data-cancel],#cancelMemberEdit';
  const removal = '[data-remove-image],[data-remove-type],.op-group-value-dialog [data-remove]';
  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
  window.addEventListener('click', event => {
    const button = event.target.closest?.('button,a,[role=button]');
    if (!button || button.disabled) return;
    const label = button.textContent.trim();
    if (button.matches(removal) || (button.closest('.gi-color-panel') && /^(移除|Remove)$/i.test(label))) {
      if (!window.confirm(english() ? 'Remove this item?' : '確定移除這個項目？')) stop(event);
      return;
    }
    if (!dirty()) return;
    const dialog = button.closest('dialog[open]');
    if (dialog?.querySelector('#unsavedGroupTitle')) return;
    const exitsDialog = dialog && dirty(dialog) && (button.matches(dismiss) || /^(取消|關閉|返回|取消編輯|×|Cancel|Close|Back|Cancel Edit)$/i.test(label));
    if (!exitsDialog && !button.matches(navigation)) return;
    // The group permission editor already offers a dedicated discard dialog.
    if (!dialog && document.querySelector('#permissionList input:checked:not([checked]),#permissionList input[checked]:not(:checked)') &&
        (button.id === 'backGroup' || button.closest('.sidebar'))) return;
    if (!confirmLeave()) stop(event);
  }, true);
  window.addEventListener('cancel', event => {
    if (event.target.matches?.('dialog') && dirty(event.target) && !confirmLeave()) stop(event);
  }, true);
  window.addEventListener('beforeunload', event => {
    if (dirty()) { event.preventDefault(); event.returnValue = ''; }
  });
})();
