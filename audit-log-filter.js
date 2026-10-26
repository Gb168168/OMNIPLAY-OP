import { auditDate, auditMeta, auditSessions, auditOperations, logoutLabel } from './audit-history-model.js?v=20261025-audit-tabs-2';
import { getDoc } from './member-access.js?v=20261026-shared-manual-1';
import{getApps,initializeApp}from'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import{getFirestore,collection,doc,getDocs,query,orderBy,limit}from'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const cfg={apiKey:'AIzaSyB02CLJIYLJgQ2LkMVgYomObyl1kQC84eI',authDomain:'omniplay-op.firebaseapp.com',projectId:'omniplay-op',storageBucket:'omniplay-op.firebasestorage.app',messagingSenderId:'742295844045',appId:'1:742295844045:web:8399ae7bdb21c6a9d12584'};
const app=getApps().length?getApps()[0]:initializeApp(cfg),db=getFirestore(app);
const esc=(value='')=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateOf=row=>row.createdAt?.toDate?.()||new Date(row.createdAtIso||0);
const dayOf=row=>{const d=dateOf(row);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const timeOf=row=>{const d=dateOf(row);return Number.isNaN(d.getTime())?'—':d.toLocaleString('zh-TW',{hour12:false})};

const actionLabel=action=>({login:'登入',logout:'登出',download:'下載'})[action]||'其他';

function createDialog(){let dialog=document.querySelector('#auditFilterDialog');if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='auditFilterDialog';dialog.style.cssText='width:min(960px,calc(100vw - 32px));max-height:86vh;border:1px solid #cbd5e1;border-radius:14px;padding:0;box-shadow:0 24px 70px rgba(15,23,42,.3)';dialog.innerHTML=`<section style="padding:20px;background:#fff;color:#172033"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px"><div><h2 style="margin:0 0 4px">操作紀錄</h2><small style="color:#64748b">最多顯示最近 500 筆</small></div><button type="button" data-close class="secondary">關閉</button></div><div role="tablist" aria-label="紀錄類型" style="display:flex;gap:8px;margin-bottom:16px"><button type="button" role="tab" id="auditSessionTab" aria-selected="true" aria-controls="auditFilterBody" data-audit-tab="sessions" class="secondary">登入/登出</button><button type="button" role="tab" id="auditOperationTab" aria-selected="false" aria-controls="auditFilterBody" data-audit-tab="operations" class="secondary" tabindex="-1">操作（下載/強制登出）</button></div><div style="display:flex;flex-wrap:wrap;align-items:end;gap:10px;margin-bottom:14px;padding:12px;background:#f4f7fb;border:1px solid #dbe3ee;border-radius:10px"><label style="display:grid;gap:5px;font-size:13px">起始日期<input id="auditDateFrom" type="date"></label><label style="display:grid;gap:5px;font-size:13px">結束日期<input id="auditDateTo" type="date"></label><label style="display:grid;gap:5px;font-size:13px;min-width:210px">群組<select id="auditGroup"><option value="">全部群組</option></select></label><button type="button" id="auditClear" class="secondary">清除篩選</button><span id="auditCount" style="margin-left:auto;color:#64748b;font-size:13px"></span></div><div id="auditFilterBody" role="tabpanel" aria-labelledby="auditSessionTab" style="overflow:auto;max-height:60vh">載入中…</div></section>`;dialog.querySelectorAll('input,select').forEach(el=>el.style.cssText='height:36px;border:1px solid #b8c4d4;border-radius:7px;padding:0 9px;background:#fff;color:#172033');dialog.querySelector('#auditClear').style.height='36px';dialog.querySelector('[data-close]').onclick=()=>dialog.close();document.body.append(dialog);return dialog}


export async function openAudit(){
 const dialog=createDialog(),body=dialog.querySelector('#auditFilterBody'),group=dialog.querySelector('#auditGroup'),from=dialog.querySelector('#auditDateFrom'),to=dialog.querySelector('#auditDateTo'),count=dialog.querySelector('#auditCount');
 let selected='sessions',rows=[],request=0;
 body.textContent='載入中…';dialog.showModal();window.showOmniplayActiveSessions?.(dialog);
 const cells=values=>'<tr>'+values.map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>';
 const inRange=row=>(!from.value||dayOf(row)>=from.value)&&(!to.value||dayOf(row)<=to.value)&&(!group.value||row.groupName===group.value);
 const render=()=>{
  const sessions=selected==='sessions';
  const filtered=(sessions?auditSessions(rows):auditOperations(rows)).filter(row=>inRange(sessions?(row.login||row.logout):row));
  count.textContent=filtered.length+' 筆';
  const headers=sessions?['人員','帳號','群組','登入時間','登出時間','狀態']:['時間','操作人員','帳號','群組','動作','項目／對象'];
  body.innerHTML=filtered.length?'<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>'+headers.map(value=>'<th>'+value+'</th>').join('')+'</tr></thead><tbody>'+filtered.map(row=>{
   if(sessions)return cells([row.name||'—',row.username||'—',row.groupName||'—',row.login?timeOf(row.login):'未取得登入紀錄',row.logout?timeOf(row.logout):'—',logoutLabel(row.logout)]);
   const meta=auditMeta(row),forced=meta.kind==='force_logout';
   return cells([timeOf(row),row.name||'—',row.username||'—',row.groupName||'—',forced?'強制登出':'下載',forced?meta.target||'—':row.item||'—']);
  }).join('')+'</tbody></table>':'沒有符合條件的紀錄';
  body.querySelectorAll('th,td').forEach(cell=>cell.style.cssText='padding:11px 10px;border-bottom:1px solid #e2e8f0;text-align:left;white-space:nowrap');
  dialog.querySelector('#activeSessionPanel')?.toggleAttribute('hidden',!sessions);
  dialog.querySelectorAll('[data-audit-tab]').forEach(tab=>{const active=tab.dataset.auditTab===selected;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;tab.style.cssText=active?'background:#eaf2ff;color:#245b99;border-color:#9abbe8':'background:#fff;color:#64748b;border-color:#dce4ef'});
  body.setAttribute('aria-labelledby',sessions?'auditSessionTab':'auditOperationTab');
 };
 dialog.querySelectorAll('[data-audit-tab]').forEach(tab=>{
  tab.onclick=()=>{selected=tab.dataset.auditTab;render()};
  tab.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs=[...dialog.querySelectorAll('[data-audit-tab]')];const next=tabs[event.key==='Home'?0:event.key==='End'?1:tab===tabs[0]?1:0];next.click();next.focus()}};
 });
 from.onchange=render;to.onchange=render;group.onchange=render;
 dialog.querySelector('#auditClear').onclick=()=>{from.value='';to.value='';group.value='';render()};
 const refresh=async()=>{const id=++request;try{
  const logs=await getDocs(query(collection(db,'omniplay-audit-events'),orderBy('createdAt','desc'),limit(500)));
  if(id!==request)return;
  rows=logs.docs.map(item=>item.data()).filter(row=>!(row.action==='download'&&String(row.item||'').includes('操作紀錄')));
  render();
 }catch(error){console.error(error);body.textContent='紀錄載入失敗'}};
 window.refreshOmniplayAudit=refresh;
 await refresh();
 try{const workspace=await getDoc(doc(db,'omniplay','workspace'));const groups=[...new Set([...(workspace.data()?.customerGroups||[]).map(item=>item.name),...rows.map(row=>row.groupName)].filter(Boolean))];const previous=group.value;group.innerHTML='<option value="">全部群組</option>'+groups.map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join('');group.value=previous;render()}catch(error){console.warn('audit groups',error)}
}

function bind(){const old=document.querySelector('.audit-log-btn');if(!old||old.dataset.filteredAudit)return false;const button=old.cloneNode(true);button.dataset.filteredAudit='1';button.onclick=openAudit;old.replaceWith(button);return true}
if(!bind()){const observer=new MutationObserver(()=>{if(bind())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true})}


