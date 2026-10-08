import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { listMemberProfiles, setMemberRole, syncMembersAndViews, transferToRondo } from './member-access.js?v=20261008-internal-1';
const session = window.__omniplaySession;
if (session?.superAdmin) {
  const controls = document.querySelector('.session-controls') || document.querySelector('.sidebar');
  const button = document.createElement('button');
  button.className = 'secondary'; button.type = 'button';
  button.textContent = session.bootstrap ? '建立 Rondo 並交接' : '管理員權限';
  controls.append(button);
  const resync = document.createElement('button'); resync.className = 'secondary'; resync.type = 'button'; resync.textContent = '重新同步人員登入'; controls.append(resync);
  resync.onclick = async () => {
    resync.disabled = true; const status = document.querySelector('#cloudStatus');
    status.textContent = '☁️ 正在驗證並同步人員登入…';
    try { await syncMembersAndViews(getFirestore()); status.textContent = '☁️ 人員登入已同步'; }
    catch (error) { status.textContent = '⚠️ ' + error.message; }
    finally { resync.disabled = false; }
  };
  button.onclick = async () => {
    const dialog = document.createElement('dialog'); dialog.style.cssText = 'width:min(560px,calc(100vw - 32px));padding:24px;border:1px solid #cbd5e1;border-radius:16px'; document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    const title = document.createElement('h2'); title.textContent = session.bootstrap ? '設定最高管理者 Rondo' : '管理員權限'; dialog.append(title);
    const message = document.createElement('p'); message.setAttribute('role', 'status'); dialog.append(message);
    const close = document.createElement('button'); close.type = 'button'; close.className = 'secondary'; close.textContent = '關閉'; close.onclick = () => dialog.close();
    if (session.bootstrap) {
      message.textContent = '先發布新版 Firebase 規則。交接後，請用 Rondo 和下方設定的密碼登入；原信箱不再具有網站管理權限。';
      const form = document.createElement('form'), label = document.createElement('label'), input = document.createElement('input');
      label.textContent = 'Rondo 登入密碼'; input.type = 'password'; input.required = true; input.autocomplete = 'new-password'; input.style.cssText = 'display:block;width:100%;margin:12px 0'; label.append(input);
      const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'primary'; submit.textContent = '建立 Rondo 並交接'; form.append(label, submit); dialog.append(form);
      form.onsubmit = async event => {
        event.preventDefault(); submit.disabled = true; close.disabled = true; message.textContent = '正在建立、驗證並交接 Rondo…';
        try { await transferToRondo(input.value); input.value = ''; location.reload(); }
        catch (error) { message.textContent = error.message; submit.disabled = false; close.disabled = false; }
      };
    } else {
      message.textContent = '只有 Rondo 能指定或取消管理員。其他管理員可以編輯網站、查看登入紀錄，但不能任免管理員或讀取人員密碼。';
      try {
        const profiles = await listMemberProfiles();
        for (const profile of profiles.filter(item => item.enabled)) {
          const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0';
          const name = document.createElement('span'); name.textContent = profile.username + ' · ' + (profile.groupName || ''); row.append(name);
          if (profile.owner) { const badge = document.createElement('strong'); badge.textContent = '最高管理者'; row.append(badge); }
          else {
            const select = document.createElement('select');
            for (const [value, text] of [['member', '一般使用者'], ['admin', '管理員']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
            select.value = profile.role === 'admin' ? 'admin' : 'member';
            select.onchange = async () => { select.disabled = true; try { await setMemberRole(profile.uid, select.value); profile.role = select.value; message.textContent = profile.username + ' 的權限已更新；重新登入後套用。'; } catch (error) { select.value = profile.role || 'member'; message.textContent = error.message; } finally { select.disabled = false; } }; row.append(select);
          }
          dialog.append(row);
        }
      } catch (error) { message.textContent = error.message; }
    }
    dialog.append(close); dialog.showModal();
  };
}
