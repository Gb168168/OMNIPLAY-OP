import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { listMemberProfiles, setMemberRole, syncMembersAndViews, transferToRondo } from './member-access.js?v=20261026-api-entry-editor-1';
const session = window.__omniplaySession;
if (session?.superAdmin) {
  const controls = document.querySelector('.account-settings-menu') || document.querySelector('.session-controls') || document.querySelector('.sidebar');
  const button = document.createElement('button');
  button.className = 'secondary'; button.type = 'button';
  button.textContent = session.bootstrap ? '建立 Rondo 並交接' : '管理員權限';
  const audit=controls.querySelector('.audit-log-btn,.logout-btn');if (session.bootstrap) controls.insertBefore(button,audit);
  const resync = document.createElement('button'); resync.className = 'secondary'; resync.type = 'button'; resync.textContent = '同步帳號與權限'; controls.insertBefore(resync,controls.querySelector('.audit-log-btn,.logout-btn'));

  const syncHelp = document.createElement('div');
  syncHelp.id = 'accountSyncHelp'; syncHelp.className = 'account-sync-tooltip';
  syncHelp.setAttribute('role', 'tooltip'); syncHelp.hidden = true;
  syncHelp.textContent = '主要用在：\n\n• 新增使用者後，讓帳號可以登入。\n• 修改帳號或密碼後，更新登入資料。\n• 移除使用者後，停用舊帳號。\n• 更新群組權限、遊戲和檔案後，重新產生客戶可查看的資料。\n\n平常不用一直按。系統已有自動同步，這顆按鈕是同步失敗或資料沒更新時的手動補救。';
  document.body.append(syncHelp); resync.setAttribute('aria-describedby', syncHelp.id);
  const hideSyncHelp = () => { syncHelp.hidden = true; };
  const showSyncHelp = () => {
    syncHelp.hidden = false;
    const rect = resync.getBoundingClientRect(), box = syncHelp.getBoundingClientRect();
    syncHelp.style.left = Math.max(12, Math.min(rect.left - box.width - 12, innerWidth - box.width - 12)) + 'px';
    syncHelp.style.top = Math.max(12, Math.min(rect.top, innerHeight - box.height - 12)) + 'px';
  };
  resync.addEventListener('mouseenter', showSyncHelp);
  resync.addEventListener('mouseleave', hideSyncHelp);
  resync.addEventListener('focus', showSyncHelp);
  resync.addEventListener('blur', hideSyncHelp);
  resync.addEventListener('click', hideSyncHelp);
  resync.addEventListener('keydown', event => { if (event.key === 'Escape') hideSyncHelp(); });
  window.addEventListener('resize', hideSyncHelp);
  document.querySelector('.account-settings')?.addEventListener('toggle', event => { if (!event.target.open) hideSyncHelp(); });
  resync.onclick = async () => {
    resync.disabled = true; const status = document.querySelector('#cloudStatus');
    status.textContent = '☁️ 正在同步帳號與權限…';
    try { await syncMembersAndViews(getFirestore()); status.textContent = '☁️ 帳號與權限已同步'; }
    catch (error) { status.textContent = '⚠️ ' + error.message; }
    finally { resync.disabled = false; }
  };
  const showPermissions = async (host = null, person = null) => {
    if (host?.querySelector('.owner-permissions-dialog')) { host.replaceChildren(); return; }
    const dialog = document.createElement(host ? 'section' : 'dialog'); dialog.className = 'owner-permissions-dialog'; dialog.setAttribute('aria-labelledby', 'ownerPermissionsTitle'); dialog.setAttribute('aria-describedby', 'ownerPermissionsHelp'); if (host) { host.append(dialog); dialog.close = () => { dialog.remove(); document.querySelector('#platformAdminPermissionsBtn')?.setAttribute('aria-expanded', 'false'); }; } else document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    const title = document.createElement('h2'); title.textContent = person ? '管理此人 · '+person.username : session.bootstrap ? '設定最高管理者 Rondo' : '管理員權限'; title.id = 'ownerPermissionsTitle';
    const header = document.createElement('div'); header.className = 'owner-permissions-head';
    const heading = document.createElement('div'), eyebrow = document.createElement('div'); eyebrow.className = 'eyebrow'; eyebrow.textContent = 'ACCESS MANAGEMENT'; heading.append(eyebrow, title);
    const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.className = 'icon-close'; dismiss.textContent = '×'; dismiss.setAttribute('aria-label', '關閉管理員權限'); dismiss.onclick = () => dialog.close(); header.append(heading, dismiss); dialog.append(header);
    const body = document.createElement('div'); body.className = 'owner-permissions-body'; dialog.append(body);
    const help = document.createElement('p'); help.id = 'ownerPermissionsHelp'; help.className = 'owner-permissions-help'; body.append(help);
    const message = document.createElement('p'); message.setAttribute('role', 'status'); message.className = 'owner-permissions-status'; body.append(message);
    const close = document.createElement('button'); close.type = 'button'; close.className = 'secondary'; close.textContent = '關閉'; close.onclick = () => dialog.close();
    if (session.bootstrap) {
      help.textContent = '先發布新版 Firebase 規則。交接後，請用 Rondo 和下方設定的密碼登入；原信箱不再具有網站管理權限。';
      const form = document.createElement('form'), label = document.createElement('label'), input = document.createElement('input');
      label.textContent = 'Rondo 登入密碼'; input.type = 'password'; input.required = true; input.autocomplete = 'new-password'; input.style.cssText = 'display:block;width:100%;margin:12px 0'; label.append(input);
      const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'primary'; submit.textContent = '建立 Rondo 並交接'; form.append(label, submit); body.append(form); form.className = 'dialog-form owner-transfer-form';
      form.onsubmit = async event => {
        event.preventDefault(); submit.disabled = true; close.disabled = true; dismiss.disabled = true; message.textContent = '正在建立、驗證並交接 Rondo…';
        try { await transferToRondo(input.value); input.value = ''; location.reload(); }
        catch (error) { message.textContent = error.message; submit.disabled = false; close.disabled = false; dismiss.disabled = false; }
      };
    } else {
      help.textContent = '由 Rondo 管理此帳號的角色及通知固定模板權限。';
      const list = document.createElement('div'); list.className = 'owner-permissions-list'; body.append(list);
      message.textContent = '正在載入人員…';
      try {
        const db = getFirestore();
        const [profiles, grants] = await Promise.all([listMemberProfiles(), getDocs(collection(db, 'omniplay-template-grants'))]);
        const granted = new Set(grants.docs.map(row => row.id));
        const enabled = profiles.filter(item => item.enabled && (!person || (item.groupId === person.groupId && (person.uid ? item.uid === person.uid : item.username?.trim().toLowerCase() === person.username.trim().toLowerCase()))));
        message.textContent = enabled.length ? '' : '此帳號尚未同步或未啟用。';
        for (const profile of enabled) {
          const row = document.createElement('div'); row.className = 'owner-permissions-row';
          const identity = document.createElement('div'); identity.className = 'owner-permissions-identity';
          const avatar = document.createElement('span'); avatar.className = 'owner-permissions-avatar'; avatar.textContent = Array.from(profile.username || '?')[0]; avatar.setAttribute('aria-hidden', 'true');
          const details = document.createElement('div'), name = document.createElement('strong'), group = document.createElement('small'); name.textContent = profile.username; group.textContent = profile.groupName || '未指定群組'; details.append(name, group); identity.append(avatar, details); row.append(identity);
          if (profile.owner) { const badge = document.createElement('strong'); badge.className = 'owner-permissions-badge'; badge.textContent = '最高權限者'; row.append(badge); }
          else {
            const select = document.createElement('select'); select.setAttribute('aria-label', profile.username + ' 的角色');
            for (const [value, text] of [['member', '一般使用者'], ['admin', '管理員']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
            select.value = profile.role === 'admin' ? 'admin' : 'member';
            const grant = document.createElement('input'), grantLabel = document.createElement('label');
            const eligible = ['OMNIPLAY','OMNIPLAY Support'].includes(profile.groupName);
            grant.type = 'checkbox'; grant.checked = granted.has(profile.uid); grant.disabled = !eligible || (profile.role !== 'admin' && !grant.checked);
            grantLabel.append(grant, ' 管理通知固定模板');
            grant.onchange = async () => {
              grant.disabled = select.disabled = true;
              const ref = doc(db, 'omniplay-template-grants', profile.uid);
              try {
                if (grant.checked) await setDoc(ref, {enabled:true}); else await deleteDoc(ref);
                message.textContent = profile.username + (grant.checked ? ' 已取得模板權限' : ' 的模板權限已收回');
              } catch (error) { grant.checked = !grant.checked; message.textContent = error.message; }
              finally { select.disabled = false; grant.disabled = !eligible || (profile.role !== 'admin' && !grant.checked); }
            };
            select.onchange = async () => { select.disabled = grant.disabled = true; try { await setMemberRole(profile.uid, select.value); profile.role = select.value;
              document.dispatchEvent(new CustomEvent('omniplay-member-role-changed',{detail:{groupId:profile.groupId,username:profile.username,role:profile.role,owner:profile.owner}})); if (select.value !== 'admin') grant.checked = false; message.textContent = profile.username + ' 的權限已更新；重新登入後套用。'; } catch (error) { select.value = profile.role || 'member'; message.textContent = error.message; } finally { select.disabled = false; grant.disabled = !eligible || (profile.role !== 'admin' && !grant.checked); } }; row.append(select, grantLabel);
          }
          list.append(row);
        }
      } catch (error) { message.textContent = error.message; }
    }
    const footer = document.createElement('div'); footer.className = 'owner-permissions-footer';
    const hint = document.createElement('small'); hint.textContent = session.bootstrap ? '最高管理者交接' : '權限變更於下次登入生效'; footer.append(hint, close); dialog.append(footer); if (!host) dialog.showModal();
  };
  button.onclick = () => showPermissions();
  if (!session.bootstrap) {
    window.manageGroupPerson = person => showPermissions(null, person);
    window.showOmniplayPermissions = showPermissions;
    window.listGroupAccounts = async () => (await listMemberProfiles()).filter(p=>p.enabled).map(({uid,username,groupId,groupName,role,owner})=>({uid,username,groupId,groupName,role,owner}));
  }
}



