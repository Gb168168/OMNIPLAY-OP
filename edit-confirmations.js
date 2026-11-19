(() => {
  const english = () => document.documentElement.lang.toLowerCase().startsWith('en');
  const confirmLeave = () => window.confirm(english()
    ? 'Leave this editing page? Unsaved changes may be lost.'
    : '確定離開目前的編輯頁面？尚未儲存的變更可能會遺失。');
  const editable = () => !!window.__omniplayCanEdit && !!document.querySelector('#workspace:not(.hidden),dialog[open]');
  const navigation = '.page-link,.customer-section,.platform-custom-category button,#customerBtn,#platformViewBtn,#backGroup,#backCustomers,[data-guide-toggle],[data-open-folder],[data-folder-crumb],[data-crumb-index],[data-notification-game],.group-permissions,#groupPermission,#customerLanguage';
  const dismiss = '.icon-close,[data-close],[data-member-close],[data-cancel],#cancelMemberEdit';
  const removal = '[data-remove-image],[data-remove-type],.op-group-value-dialog [data-remove]';
  function editingDialog(dialog) {
    return dialog && (dialog.querySelector('input:not([type=search]):not([readonly]):not(:disabled),textarea:not([readonly]),select:not(:disabled),[contenteditable=true],.sort-heading') ||
      dialog.querySelector('.group-member-edit,.group-edit,[data-edit],[data-delete]'));
  }
  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
  window.addEventListener('click', event => {
    const button = event.target.closest?.('button,a,[role=button]');
    if (!button || button.disabled) return;
    const label = button.textContent.trim();
    if (button.matches(removal) || (button.closest('.gi-color-panel') && /^(移除|Remove)$/i.test(label))) {
      if (!window.confirm(english() ? 'Remove this item?' : '確定移除這個項目？')) stop(event);
      return;
    }
    if (!editable()) return;
    const dialog = button.closest('dialog[open]');
    if (dialog?.querySelector('#unsavedGroupTitle')) return;
    const exitsDialog = editingDialog(dialog) && (button.matches(dismiss) || /^(取消|關閉|返回|取消編輯|×|Cancel|Close|Back|Cancel Edit)$/i.test(label));
    if (!exitsDialog && !button.matches(navigation)) return;
    // The group permission editor already offers a dedicated discard dialog.
    if (!dialog && document.querySelector('#permissionList input:checked:not([checked]),#permissionList input[checked]:not(:checked)') &&
        (button.id === 'backGroup' || button.closest('.sidebar'))) return;
    if (!confirmLeave()) stop(event);
  }, true);
  window.addEventListener('cancel', event => {
    if (event.target.matches?.('dialog') && editable() && editingDialog(event.target) && !confirmLeave()) stop(event);
  }, true);
  window.addEventListener('beforeunload', event => {
    if (editable()) { event.preventDefault(); event.returnValue = ''; }
  });
})();
