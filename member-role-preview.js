/** Return the confirmed grant, or null when the owner cancels the dialog. */
export function choosePagePermissions(categories, current = {}) {
  const dialog = document.createElement('dialog');
  const form = document.createElement('form');
  form.className = 'dialog-form';
  form.method = 'dialog';
  const title = document.createElement('h3');
  title.textContent = '管理員操作權限（預覽）';
  dialog.className = 'support-permission-preview';
  dialog.setAttribute('aria-label', title.textContent);
  form.append(title);
  const fields = [];
  function addPermission(parent, scope, id, action, caption) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = current[scope]?.[id]?.includes(action) === true;
    label.append(input, ' ' + caption);
    parent.append(label);
    fields.push({input, scope, id, action});
  }
  for (const category of categories) {
    const section = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = category.displayName || category.name;
    section.append(legend);
    for (const [action, caption] of [['rename','重新命名分類'], ['delete','刪除分類'], ['visibility','變更平台可見']]) {
      addPermission(section, 'categories', category.id, action, caption);
    }
    for (const page of category.pages || []) {
      const row = document.createElement('fieldset');
      const name = document.createElement('legend');
      name.textContent = page.displayName || page.name;
      row.append(name);
      addPermission(row, 'pages', page.id, 'edit', '編輯');
      addPermission(row, 'pages', page.id, 'delete', '刪除');
      section.append(row);
    }
    form.append(section);
  }
  for (const [value, caption] of [['cancel','取消'], ['apply','確認預覽']]) {
    const button = document.createElement('button');
    button.type = 'submit';
    button.value = value;
    button.textContent = caption;
    form.append(button);
  }
  dialog.append(form);
  document.body.append(dialog);
  return new Promise(resolve => {
    dialog.addEventListener('close', () => {
      const result = {categories: Object.create(null), pages: Object.create(null)};
      for (const {input, scope, id, action} of fields) {
        if (input.checked) (result[scope][id] ||= []).push(action);
      }
      result.documents = {};
      for (const category of categories) for (const page of category.pages || []) {
        if (!result.pages[page.id]?.includes('edit')) continue;
        const name = (page.name || '').trim().toLowerCase();
        if (name === 'game list_online') result.documents.gameListOnline = ['edit'];
        if (!page.customerOpGame && (name === 'op game' || page.gameInformation)) result.documents.gameRecords = ['edit'];
        if (name === 'api' && [category.name, category.displayName].includes('操作手冊')) result.documents.api = ['edit'];
      }
      dialog.remove();
      resolve(dialog.returnValue === 'apply' ? result : null);
    }, {once: true});
    dialog.showModal();
  });
}

export function mountSupportRoleField(form, group, categories) {
  if (group.name.trim() !== 'OMNIPLAY Support' || window.__omniplaySession?.bootstrap || !window.__omniplaySession?.superAdmin) return;
  const label = document.createElement('label');
  label.append('管理權限');
  const role = document.createElement('select');
  role.name = 'memberRole';
  role.add(new Option('一般使用者', 'member'));
  role.add(new Option('管理員', 'admin'));
  label.append(role);
  const configure = document.createElement('button');
  configure.type = 'button';
  configure.className = 'secondary';
  configure.textContent = '設定頁面與分類權限';
  configure.hidden = true;
  const submit = form.querySelector('button[type="submit"]') || form.querySelector('.member-actions button:not([type="button"])');
  const note = document.createElement('small');
  note.textContent = '管理員設定僅供預覽，勾選後不會授權或建立管理員帳號。';
  label.append(note);
  let permissions = null;
  async function configurePermissions() {
    const result = await choosePagePermissions(categories, permissions || {});
    if (result) permissions = result;
    if (!permissions) role.value = 'member';
    configure.hidden = role.value !== 'admin';
    submit.disabled = role.value === 'admin';
  }
  form.addEventListener('submit', event => {
    if (role.value === 'admin') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  role.onchange = () => {
    if (role.value === 'admin') return configurePermissions();
    permissions = null;
    submit.disabled = false;
    configure.hidden = true;
  };
  configure.onclick = configurePermissions;
  form.querySelector('.member-actions').before(label, configure);
  return () => ({role: role.value, permissions});
}
