import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';

import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const cfg={apiKey:'AIzaSyB02CLJIYLJgQ2LkMVgYomObyl1kQC84eI',authDomain:'omniplay-op.firebaseapp.com',projectId:'omniplay-op',storageBucket:'omniplay-op.firebasestorage.app',messagingSenderId:'742295844045',appId:'1:742295844045:web:8399ae7bdb21c6a9d12584'};

const fb=initializeApp(cfg),db=getFirestore(fb),ref=doc(db,'omniplay','workspace'),$=s=>document.querySelector(s),KEY='omniplay-workspace-v3';

const CUSTOMER_OPTION_VERSION=4,DEFAULT_CUSTOMER_TYPES=['一般平台','IR平台'],DEFAULT_CUSTOMER_PROGRESS=['測試環境對接中','正式環境對接中','正式上線','已暫停','已終止'],DEFAULT_COMM_APPS=['Telegram','Teams'];
const state={categories:[],customerGroups:[],customers:[],customerTypeOptions:[...DEFAULT_CUSTOMER_TYPES],customerProgressOptions:[...DEFAULT_CUSTOMER_PROGRESS],customerCommAppOptions:[...DEFAULT_COMM_APPS],customerOptionVersion:0,activeCategoryId:null,activePageId:null};
let currentUniver=null,timer=null,cloud=false;

const uid=(p='id')=>`${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m])),cat=()=>state.categories.find(x=>x.id===state.activeCategoryId),page=()=>cat()?.pages?.find(x=>x.id===state.activePageId),icon=t=>({sheet:'📊',files:'📄',photos:'🖼️',videos:'🎬'})[t]||'📄';

async function load(){try{const s=await getDoc(ref);
if(s.exists())Object.assign(state,s.data());
else{try{state.categories=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{}cloud=true;
await saveNow()}state.customerGroups||=[];
state.customers||=[];
if(state.customerOptionVersion!==CUSTOMER_OPTION_VERSION){state.customerTypeOptions=[...DEFAULT_CUSTOMER_TYPES];state.customerProgressOptions=[...DEFAULT_CUSTOMER_PROGRESS];state.customerCommAppOptions=[...DEFAULT_COMM_APPS];state.customerOptionVersion=CUSTOMER_OPTION_VERSION}
state.customerTypeOptions||=[...DEFAULT_CUSTOMER_TYPES];
state.customerProgressOptions||=[...DEFAULT_CUSTOMER_PROGRESS];
state.customerCommAppOptions||=[...DEFAULT_COMM_APPS];
state.customers.map(u=>u.commApp).filter(Boolean).forEach(value=>{if(!state.customerCommAppOptions.includes(value))state.customerCommAppOptions.push(value)});
state.customerGroups.forEach(g=>{g.allowedPages||=[];
g.pageOrder||=[]});
cloud=true;
await saveNow();
$('#cloudStatus').textContent='☁️ Firestore 雲端資料'}catch(e){console.error(e);
$('#cloudStatus').textContent='⚠️ Firestore 連線失敗'}renderNav();
renderPage()}
function payload(){return{categories:state.categories,customerGroups:state.customerGroups,customers:state.customers,customerTypeOptions:state.customerTypeOptions,customerProgressOptions:state.customerProgressOptions,customerCommAppOptions:state.customerCommAppOptions,customerOptionVersion:state.customerOptionVersion,updatedAt:new Date().toISOString()}}function save(){localStorage.setItem(KEY,JSON.stringify(state.categories));
$('#cloudStatus').textContent='☁️ 儲存中…';
clearTimeout(timer);
timer=setTimeout(saveNow,400)}async function saveNow(){if(!cloud)return;
try{await setDoc(ref,payload());
$('#cloudStatus').textContent='☁️ 已同步'}catch(e){console.error(e);
$('#cloudStatus').textContent='⚠️ 雲端儲存失敗'}}function dispose(){if(!currentUniver)return;
try{const w=currentUniver.api.getActiveWorkbook();
if(w?.save)currentUniver.page.snapshot=w.save();
else if(w?.getSnapshot)currentUniver.page.snapshot=w.getSnapshot();
save()}catch{}try{currentUniver.univer.dispose()}catch{}currentUniver=null}
function renderNav(){const r=$('#categoryList');
r.innerHTML='';
state.categories.forEach(c=>{const b=document.createElement('div');
b.className='category';
b.innerHTML=`<div class="category-head ${c.id===state.activeCategoryId?'active':''}"><span>📁 ${esc(c.name)}</span><button class="mini">⋯</button></div><div class="category-pages"></div>`;
b.querySelector('.category-head').onclick=e=>{if(e.target.classList.contains('mini'))return;
state.activeCategoryId=c.id;
state.activePageId=c.pages?.[0]?.id||null;
renderNav();
renderPage()};
b.querySelector('.mini').onclick=()=>{if(confirm(`刪除分類「${c.name}」？`)){state.categories=state.categories.filter(x=>x.id!==c.id);
save();
renderNav();
renderPage()}};
const ps=b.querySelector('.category-pages');
(c.pages||[]).forEach(p=>{const row=document.createElement('div');
row.className=`page-row ${p.id===state.activePageId?'active':''}`;
row.innerHTML=`<button class="page-link">${icon(p.type)} ${esc(p.name)}</button><button class="page-delete">×</button>`;
row.querySelector('.page-link').onclick=()=>{state.activeCategoryId=c.id;
state.activePageId=p.id;
renderNav();
renderPage()};
row.querySelector('.page-delete').onclick=()=>{if(confirm(`刪除頁面「${p.name}」？`)){c.pages=c.pages.filter(x=>x.id!==p.id);
state.customerGroups.forEach(g=>{g.allowedPages=(g.allowedPages||[]).filter(id=>id!==p.id);
g.pageOrder=(g.pageOrder||[]).filter(id=>id!==p.id)});
state.activePageId=c.pages[0]?.id||null;
save();
renderNav();
renderPage()}};
ps.append(row)});
r.append(b)});
$('#addPageBtn').disabled=!state.activeCategoryId}
function renderPage(){dispose();
const p=page(),c=cat();
$('#emptyState').classList.toggle('hidden',!!p||!!c);
$('#workspace').classList.toggle('hidden',!p);
$('#breadcrumb').textContent=c?`工作區 / ${c.name}`:'工作區';
$('#pageTitle').textContent=p?p.name:(c?c.name:'歡迎使用 OMNIPLAY');
if(!p){if(c)$('#emptyState').innerHTML='<div><h2>這個分類還沒有頁面</h2><p>按右上角「新增頁面」開始。</p></div>';
return}p.type==='sheet'?sheet(p):files(p)}
function sheet(p){const w=$('#workspace');
w.className='workspace sheet-workspace';
w.innerHTML='<div class="sheet-note">📊 試算表・繁體中文・Firestore 雲端同步</div><div id="univerSheet" class="univer-sheet"></div>';
try{const{createUniver}=window.UniverPresets,{LocaleType,mergeLocales}=window.UniverCore,{UniverSheetsCorePreset}=window.UniverPresetSheetsCore,l=window.UniverPresetSheetsCoreZhTW,z=LocaleType.ZH_TW||'zh-TW',x=createUniver({locale:z,locales:{[z]:mergeLocales(l)},presets:[UniverSheetsCorePreset({container:'univerSheet'})]});
x.univerAPI.createWorkbook(p.snapshot||{name:p.name});
currentUniver={univer:x.univer,api:x.univerAPI,page:p}}catch(e){w.innerHTML=`<div class="notice">試算表載入失敗：${esc(e.message)}</div>`}}
function files(p){const w=$('#workspace');
w.className='workspace';
p.files||=[];
w.innerHTML='<div class="notice">☁️ 檔案清單已同步；實際檔案內容的雲端儲存稍後接。</div><div class="file-panel"><div id="uploadZone" class="upload-zone"><strong>＋ 加入檔案</strong></div><div id="fileGrid" class="file-grid"></div></div>';
$('#uploadZone').onclick=()=>$('#hiddenUpload').click();
$('#hiddenUpload').onchange=e=>{[...e.target.files].forEach(f=>p.files.push({id:uid('file'),name:f.name,type:f.type,size:f.size}));
save();
files(p)};
const g=$('#fileGrid');
p.files.forEach(f=>g.insertAdjacentHTML('beforeend',`<div class="file-card"><div class="file-placeholder">📄</div><div class="file-name">${esc(f.name)}</div></div>`))}
function allPages(){return state.categories.flatMap(c=>(c.pages||[]).map(p=>({id:p.id,name:p.name,cat:c.name,type:p.type})))}
function formatLaunchDate(value=''){const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?`${match[1].slice(2)}/${match[2]}/${match[3]}`:(value||'—')}
function platformOptionMarkup(items,current){return items.map(item=>{const value=typeof item==='string'?item:item.id,label=typeof item==='string'?item:item.name;return `<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`}).join('')+'<option value="__add__">＋ 新增選項…</option>'}
function handlePlatformOption(select,u,field){if(select.value!=='__add__'){u[field]=select.value;save();return}const labels={customerType:'客戶群組',commApp:'通訊 APP',progress:'對接進度',groupId:'所屬群組'},value=prompt(`新增${labels[field]}選項：`)?.trim();if(!value){renderCustomers();return}if(field==='groupId'){let group=state.customerGroups.find(g=>g.name===value);if(!group){group={id:uid('grp'),name:value,allowedPages:[],pageOrder:[]};state.customerGroups.push(group)}u.groupId=group.id}else{const items=field==='customerType'?state.customerTypeOptions:field==='commApp'?state.customerCommAppOptions:state.customerProgressOptions;if(!items.includes(value))items.push(value);u[field]=value}save();renderCustomers()}
function renderCustomers(){dispose();
$('#emptyState').classList.add('hidden');
const w=$('#workspace');
w.className='workspace platform-list-workspace';
w.classList.remove('hidden');
$('#breadcrumb').textContent='系統管理';
$('#pageTitle').textContent='所有平台列表';
$('#addPageBtn').disabled=true;
const groups=state.customerGroups,customers=state.customers,liveCount=customers.filter(u=>u.progress==='正式上線').length;
w.innerHTML=`<div class="customer-hero"><div><div class="eyebrow">PLATFORM DIRECTORY</div><h2>所有平台列表</h2><p>集中查看所有平台資料，並可直接調整分類、進度與所屬群組。</p></div><div class="customer-tools"><span class="platform-count">共 ${liveCount} 個平台正式上線</span><button class="secondary" id="groupManagerBtn">群組分類管理</button><button class="primary" id="newPlatform">＋ 新增平台</button></div></div><section class="admin-card platform-table-card"><div class="platform-table-wrap"><table class="platform-table"><thead><tr><th>客戶名稱</th><th>客戶域名</th><th>客戶群組</th><th>通訊 APP</th><th>對接進度</th><th>上線日期</th><th>備註說明</th><th>所屬群組</th><th>操作</th></tr></thead><tbody id="platformRows"></tbody></table></div><div id="platformEmpty" class="empty-mini hidden"><div>🏢</div><strong>尚未建立平台</strong><span>按右上「新增平台」開始</span></div></section>`;
const rows=$('#platformRows');
if(!customers.length){$('.platform-table-wrap').classList.add('hidden');$('#platformEmpty').classList.remove('hidden')}
customers.forEach(u=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${esc(u.name||'未命名')}</strong></td><td>${esc(u.domain||u.username||'—')}</td><td><select data-field="customerType">${platformOptionMarkup(state.customerTypeOptions,u.customerType)}</select></td><td><select data-field="commApp">${platformOptionMarkup(state.customerCommAppOptions,u.commApp)}</select></td><td><select data-field="progress">${platformOptionMarkup(state.customerProgressOptions,u.progress)}</select></td><td>${esc(formatLaunchDate(u.launchDate))}</td><td><div class="platform-notes" title="${esc(u.notes||'')}">${esc(u.notes||'—')}</div></td><td><select data-field="groupId">${platformOptionMarkup(groups,u.groupId)}</select></td><td><div class="platform-actions"><button type="button" class="permission-btn">設定權限</button><button type="button" class="customer-delete">刪除</button></div></td>`;
tr.querySelectorAll('select[data-field]').forEach(select=>select.onchange=()=>handlePlatformOption(select,u,select.dataset.field));
tr.querySelector('.permission-btn').onclick=()=>{const selectedGroup=state.customerGroups.find(g=>g.id===u.groupId);if(!selectedGroup){alert('請先選擇所屬群組');return}editGroupPermissions(selectedGroup)};
tr.querySelector('.customer-delete').onclick=()=>{if(!confirm(`確定要刪除平台「${u.name}」嗎？\n刪除後無法復原。`))return;state.customers=state.customers.filter(customer=>customer.id!==u.id);save();renderCustomers()};
rows.append(tr)});
$('#groupManagerBtn').onclick=openGroupManager;
$('#newPlatform').onclick=()=>openCustomerDialog()}
function renderGroup(g){g.allowedPages||=[];
const w=$('#workspace'),members=state.customers.filter(u=>u.groupId===g.id);
$('#breadcrumb').textContent='系統管理 / 群組分類';
$('#pageTitle').textContent=g.name;
w.innerHTML=`<div class="permission-top"><button id="backCustomers" class="secondary">← 返回群組列表</button></div><div class="customer-hero"><div><div class="eyebrow">CUSTOMER GROUP</div><h2>👥 ${esc(g.name)}</h2><p>${members.length} 位客戶・目前可看 ${g.allowedPages.length} 個頁面</p></div><div class="customer-tools"><button class="secondary" id="groupPermission">⚙ 設定群組權限</button><button class="primary" id="addGroupCustomer">＋ 新增客戶</button></div></div><section class="admin-card"><div class="card-head"><h3>群組客戶</h3><span>${members.length} 位</span></div><div id="groupMembers"></div></section>`;
const list=$('#groupMembers');
if(!members.length)list.innerHTML='<div class="empty-mini"><div>👤</div><strong>這個群組還沒有客戶</strong><span>按右上「新增客戶」建立第一位客戶</span></div>';
members.forEach(u=>{const d=document.createElement('div');
d.className='customer-item';
d.innerHTML=`<div class="customer-avatar">${esc((u.name||'?').slice(0,1).toUpperCase())}</div><div class="customer-main"><strong>${esc(u.name)}</strong><div class="file-meta">${esc(u.domain||u.username||'未填域名')}・${esc(u.customerType||'一般客戶')}・${esc(u.progress||'尚未開始')}</div></div><div class="customer-access"><span>沿用群組權限</span><button type="button" class="customer-delete">刪除客戶</button></div>`;
d.querySelector('.customer-delete').onclick=e=>{e.stopPropagation();if(!confirm(`確定要刪除客戶「${u.name}」嗎？\n刪除後無法復原。`))return;state.customers=state.customers.filter(customer=>customer.id!==u.id);save();renderGroup(g)};
list.append(d)});
$('#backCustomers').onclick=renderCustomers;
$('#addGroupCustomer').onclick=()=>openCustomerDialog(g.id);
$('#groupPermission').onclick=()=>editGroupPermissions(g)}
function fillCustomerOptionSelect(id,items){const sel=$(id);
sel.innerHTML=items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}function openGroupDialog(){$('#groupName').value='';
$('#groupDialog').showModal();
setTimeout(()=>$('#groupName').focus(),50)}function openCustomerDialog(groupId){['#customerName','#customerDomain','#customerLaunchDate','#customerNotes'].forEach(id=>$(id).value='');
fillCustomerOptionSelect('#customerType',state.customerTypeOptions);
fillCustomerOptionSelect('#customerCommApp',state.customerCommAppOptions);
fillCustomerOptionSelect('#customerProgress',state.customerProgressOptions);
const sel=$('#customerGroup');
sel.innerHTML=state.customerGroups.map(g=>`<option value="${g.id}" ${g.id===groupId?'selected':''}>${esc(g.name)}</option>`).join('');
const launchDate=$('#customerLaunchDate');
launchDate.onclick=()=>launchDate.showPicker?.();
$('#customerDialog').showModal();
setTimeout(()=>$('#customerName').focus(),50)}
function openGroupManager(){const list=$('#groupManagerList');list.innerHTML='';if(!state.customerGroups.length)list.innerHTML='<div class="empty-mini"><div>👥</div><strong>尚無群組分類</strong><span>按下方按鈕新增第一個群組</span></div>';state.customerGroups.forEach(g=>{const count=state.customers.filter(u=>u.groupId===g.id).length,row=document.createElement('div');row.className='group-manager-row';row.innerHTML=`<div class="group-icon">👥</div><div class="group-manager-main"><strong>${esc(g.name)}</strong><span>${count} 個平台・可看 ${(g.allowedPages||[]).length} 個頁面</span></div><button type="button" class="group-delete" ${count?'disabled':''}>刪除</button>`;const del=row.querySelector('.group-delete');if(count)del.title='請先將此群組的平台移到其他群組';del.onclick=()=>{if(count){alert(`「${g.name}」仍有 ${count} 個平台使用中，請先將平台移到其他群組。`);return}if(!confirm(`確定要刪除群組「${g.name}」嗎？\n刪除後無法復原。`))return;state.customerGroups=state.customerGroups.filter(group=>group.id!==g.id);save();openGroupManager()};list.append(row)});const dialog=$('#groupManagerDialog');if(!dialog.open)dialog.showModal()}
function editGroupPermissions(g){g.allowedPages||=[];
const w=$('#workspace');
w.innerHTML=`<div class="permission-top"><button id="backGroup" class="secondary">← 返回 ${esc(g.name)}</button></div><div class="admin-card permission-card"><div class="modal-head"><div><div class="eyebrow">GROUP PAGE ACCESS</div><h2>${esc(g.name)} 的群組權限</h2><p>依照「分類 → 頁面」顯示，勾選要開放給此群組查看的頁面。</p></div><div class="group-icon">👥</div></div><div id="permissionList" class="permission-list"></div><div class="permission-footer"><span id="permCount">已選 ${g.allowedPages.length} 個頁面</span><button id="savePerm" class="primary">儲存群組權限</button></div></div>`;
const l=$('#permissionList');
const total=allPages().length;
if(!total)l.innerHTML='<div class="empty-mini"><strong>目前沒有可設定的頁面</strong></div>';
state.categories.forEach(c=>{const pages=c.pages||[];
if(!pages.length)return;
const section=document.createElement('section');
section.className='permission-category';
section.innerHTML=`<div class="permission-category-head"><span class="permission-category-icon">📁</span><strong>${esc(c.name)}</strong><span class="permission-category-count">${pages.length} 頁</span></div><div class="permission-category-pages"></div>`;
const pageList=section.querySelector('.permission-category-pages');
pages.forEach(p=>pageList.insertAdjacentHTML('beforeend',`<label class="permission-row" data-page-id="${p.id}"><input type="checkbox" value="${p.id}" ${g.allowedPages.includes(p.id)?'checked':''}><span class="permission-icon">${icon(p.type)}</span><span><strong>${esc(p.name)}</strong><small>頁面</small></span></label>`));
l.append(section)});
l.addEventListener('change',()=>$('#permCount').textContent=`已選 ${l.querySelectorAll('input:checked').length} 個頁面`);
$('#backGroup').onclick=renderCustomers;
$('#savePerm').onclick=()=>{const rows=[...l.querySelectorAll('.permission-row')];
g.pageOrder=rows.map(x=>x.dataset.pageId);
g.allowedPages=rows.filter(x=>x.querySelector('input').checked).map(x=>x.dataset.pageId);
save();
renderCustomers()}}
$('#customerBtn').onclick=renderCustomers;
$('#addCategoryBtn').onclick=()=>{$('#categoryName').value='';
$('#categoryDialog').showModal()};
$('#categoryForm').onsubmit=e=>{e.preventDefault();
const n=$('#categoryName').value.trim();
if(!n)return;
const c={id:uid('cat'),name:n,pages:[]};
state.categories.push(c);
state.activeCategoryId=c.id;
save();
$('#categoryDialog').close();
renderNav();
renderPage()};
$('#addPageBtn').onclick=()=>{$('#pageName').value='';
$('#pageDialog').showModal()};
$('#pageForm').onsubmit=e=>{e.preventDefault();
const c=cat(),n=$('#pageName').value.trim(),t=$('#pageType').value;
if(!c||!n)return;
const p={id:uid('page'),name:n,type:t,createdAt:new Date().toISOString()};
if(t!=='sheet')p.files=[];
c.pages.push(p);
state.activePageId=p.id;
save();
$('#pageDialog').close();
renderNav();
renderPage()};
$('#groupForm').onsubmit=e=>{e.preventDefault();
const n=$('#groupName').value.trim();
if(!n)return;
state.customerGroups.push({id:uid('grp'),name:n,allowedPages:[],pageOrder:[]});
save();
$('#groupDialog').close();
renderCustomers()};
$('#addManagedGroup').onclick=()=>{const name=prompt('新增群組分類名稱：')?.trim();if(!name)return;if(state.customerGroups.some(g=>g.name===name)){alert('已有相同名稱的群組');return}state.customerGroups.push({id:uid('grp'),name,allowedPages:[],pageOrder:[]});save();openGroupManager()};
document.querySelectorAll('.add-option').forEach(b=>b.onclick=()=>{const target=b.dataset.target,isType=target==='customerType',isCommApp=target==='customerCommApp',isGroup=target==='customerGroup',label=isType?'客戶群組':isCommApp?'通訊 APP':isGroup?'所屬群組':'對接進度',value=prompt(`新增${label}選項：`)?.trim();
if(!value)return;
if(isGroup){let group=state.customerGroups.find(g=>g.name===value);if(!group){group={id:uid('grp'),name:value,allowedPages:[],pageOrder:[]};state.customerGroups.push(group)}const sel=$('#customerGroup');sel.innerHTML=state.customerGroups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');sel.value=group.id}else{const items=isType?state.customerTypeOptions:isCommApp?state.customerCommAppOptions:state.customerProgressOptions;if(!items.includes(value))items.push(value);fillCustomerOptionSelect(`#${target}`,items);$(`#${target}`).value=value}
save()});
$('#customerForm').onsubmit=e=>{e.preventDefault();
const name=$('#customerName').value.trim(),sel=$('#customerGroup'),groupId=sel.value;
if(!name||!groupId)return;
state.customers.push({id:uid('usr'),name,domain:$('#customerDomain').value.trim(),customerType:$('#customerType').value,commApp:$('#customerCommApp').value.trim(),groupId,progress:$('#customerProgress').value,launchDate:$('#customerLaunchDate').value.trim(),notes:$('#customerNotes').value.trim()});
save();
$('#customerDialog').close();
renderCustomers()};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{const d=document.getElementById(b.dataset.close);
if(d?.id==='customerDialog'){const s=$('#customerGroup');
s.disabled=false;
delete s.dataset.lockedGroup}d?.close()});
window.addEventListener('beforeunload',()=>{dispose();
saveNow()});
load();
