import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const cfg={apiKey:'AIzaSyB02CLJIYLJgQ2LkMVgYomObyl1kQC84eI',authDomain:'omniplay-op.firebaseapp.com',projectId:'omniplay-op',storageBucket:'omniplay-op.firebasestorage.app',messagingSenderId:'742295844045',appId:'1:742295844045:web:8399ae7bdb21c6a9d12584'};
const fb=initializeApp(cfg),db=getFirestore(fb),ref=doc(db,'omniplay','workspace');
const $=s=>document.querySelector(s),KEY='omniplay-workspace-v3';
const state={categories:[],customerGroups:[],customers:[],activeCategoryId:null,activePageId:null};
let currentUniver=null,timer=null,cloud=false;

const uid=(p='id')=>`${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cat=()=>state.categories.find(x=>x.id===state.activeCategoryId);
const page=()=>cat()?.pages?.find(x=>x.id===state.activePageId);
const icon=t=>({sheet:'📊',files:'📄',photos:'🖼️',videos:'🎬'})[t]||'📄';

async function load(){
  try{
    const s=await getDoc(ref);
    if(s.exists()) Object.assign(state,s.data());
    else{
      try{state.categories=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{}
      cloud=true; await saveNow();
    }
    state.customerGroups ||= [];
    state.customers ||= [];
    cloud=true;
    $('#cloudStatus').textContent='☁️ Firestore 雲端資料';
  }catch(e){console.error(e);$('#cloudStatus').textContent='⚠️ Firestore 連線失敗'}
  renderNav(); renderPage();
}

function payload(){return{categories:state.categories,customerGroups:state.customerGroups,customers:state.customers,updatedAt:new Date().toISOString()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state.categories));$('#cloudStatus').textContent='☁️ 儲存中…';clearTimeout(timer);timer=setTimeout(saveNow,400)}
async function saveNow(){if(!cloud)return;try{await setDoc(ref,payload());$('#cloudStatus').textContent='☁️ 已同步'}catch(e){console.error(e);$('#cloudStatus').textContent='⚠️ 雲端儲存失敗'}}
function dispose(){if(!currentUniver)return;try{const w=currentUniver.api.getActiveWorkbook();if(w?.save)currentUniver.page.snapshot=w.save();else if(w?.getSnapshot)currentUniver.page.snapshot=w.getSnapshot();save()}catch{}try{currentUniver.univer.dispose()}catch{}currentUniver=null}

function renderNav(){
  const r=$('#categoryList'); r.innerHTML='';
  state.categories.forEach(c=>{
    const b=document.createElement('div'); b.className='category';
    b.innerHTML=`<div class="category-head ${c.id===state.activeCategoryId?'active':''}"><span>📁 ${esc(c.name)}</span><button class="mini">⋯</button></div><div class="category-pages"></div>`;
    b.querySelector('.category-head').onclick=e=>{if(e.target.classList.contains('mini'))return;state.activeCategoryId=c.id;state.activePageId=c.pages?.[0]?.id||null;renderNav();renderPage()};
    b.querySelector('.mini').onclick=()=>{if(confirm(`刪除分類「${c.name}」？`)){state.categories=state.categories.filter(x=>x.id!==c.id);save();renderNav();renderPage()}};
    const ps=b.querySelector('.category-pages');
    (c.pages||[]).forEach(p=>{
      const row=document.createElement('div'); row.className=`page-row ${p.id===state.activePageId?'active':''}`;
      row.innerHTML=`<button class="page-link">${icon(p.type)} ${esc(p.name)}</button><button class="page-delete">×</button>`;
      row.querySelector('.page-link').onclick=()=>{state.activeCategoryId=c.id;state.activePageId=p.id;renderNav();renderPage()};
      row.querySelector('.page-delete').onclick=()=>{if(confirm(`刪除頁面「${p.name}」？`)){c.pages=c.pages.filter(x=>x.id!==p.id);state.customers.forEach(u=>u.allowedPages=(u.allowedPages||[]).filter(id=>id!==p.id));state.activePageId=c.pages[0]?.id||null;save();renderNav();renderPage()}};
      ps.append(row);
    });
    r.append(b);
  });
  $('#addPageBtn').disabled=!state.activeCategoryId;
}

function renderPage(){
  dispose(); const p=page(),c=cat();
  $('#emptyState').classList.toggle('hidden',!!p||!!c); $('#workspace').classList.toggle('hidden',!p);
  $('#breadcrumb').textContent=c?`工作區 / ${c.name}`:'工作區'; $('#pageTitle').textContent=p?p.name:(c?c.name:'歡迎使用 OMNIPLAY');
  if(!p){if(c)$('#emptyState').innerHTML='<div><h2>這個分類還沒有頁面</h2><p>按右上角「新增頁面」開始。</p></div>';return}
  p.type==='sheet'?sheet(p):files(p);
}

function sheet(p){
  const w=$('#workspace'); w.className='workspace sheet-workspace';
  w.innerHTML='<div class="sheet-note">📊 試算表・繁體中文・Firestore 雲端同步</div><div id="univerSheet" class="univer-sheet"></div>';
  try{
    const {createUniver}=window.UniverPresets,{LocaleType,mergeLocales}=window.UniverCore,{UniverSheetsCorePreset}=window.UniverPresetSheetsCore,l=window.UniverPresetSheetsCoreZhTW,z=LocaleType.ZH_TW||'zh-TW';
    const x=createUniver({locale:z,locales:{[z]:mergeLocales(l)},presets:[UniverSheetsCorePreset({container:'univerSheet'})]});
    x.univerAPI.createWorkbook(p.snapshot||{name:p.name}); currentUniver={univer:x.univer,api:x.univerAPI,page:p};
  }catch(e){w.innerHTML=`<div class="notice">試算表載入失敗：${esc(e.message)}</div>`}
}

function files(p){
  const w=$('#workspace'); w.className='workspace'; p.files||=[];
  w.innerHTML='<div class="notice">☁️ 檔案清單已同步；實際檔案內容的雲端儲存稍後接。</div><div class="file-panel"><div id="uploadZone" class="upload-zone"><strong>＋ 加入檔案</strong></div><div id="fileGrid" class="file-grid"></div></div>';
  $('#uploadZone').onclick=()=>$('#hiddenUpload').click();
  $('#hiddenUpload').onchange=e=>{[...e.target.files].forEach(f=>p.files.push({id:uid('file'),name:f.name,type:f.type,size:f.size}));save();files(p)};
  const g=$('#fileGrid'); p.files.forEach(f=>g.insertAdjacentHTML('beforeend',`<div class="file-card"><div class="file-placeholder">📄</div><div class="file-name">${esc(f.name)}</div></div>`));
}

function allPages(){return state.categories.flatMap(c=>(c.pages||[]).map(p=>({id:p.id,name:p.name,cat:c.name,type:p.type})))}

function renderCustomers(){
  dispose(); $('#emptyState').classList.add('hidden');
  const w=$('#workspace'); w.className='workspace'; w.classList.remove('hidden');
  $('#breadcrumb').textContent='系統管理'; $('#pageTitle').textContent='客戶列表 / 群組與頁面權限'; $('#addPageBtn').disabled=true;
  const groups=state.customerGroups,customers=state.customers;
  w.innerHTML=`
    <div class="customer-hero">
      <div><div class="eyebrow">ACCESS CONTROL</div><h2>客戶存取管理</h2><p>建立客戶、整理群組，並精準控制每一個帳號可查看的頁面。</p></div>
      <div class="customer-tools"><button class="secondary" id="newGroup">＋ 新增群組</button>${groups.length?'<button class="primary" id="newCustomer">＋ 建立客戶</button>':''}</div>
    </div>
    <div class="stats-grid"><div class="stat-card"><span>客戶</span><strong>${customers.length}</strong></div><div class="stat-card"><span>群組</span><strong>${groups.length}</strong></div><div class="stat-card"><span>可管理頁面</span><strong>${allPages().length}</strong></div></div>
    <div class="customer-layout"><section class="admin-card"><div class="card-head"><h3>群組分類</h3><span>${groups.length} 組</span></div><div id="groups"></div></section><section class="admin-card"><div class="card-head"><h3>客戶列表</h3><span>${customers.length} 位</span></div><div id="customers"></div></section></div>`;

  const gr=$('#groups');
  if(!groups.length)gr.innerHTML='<div class="empty-mini"><div>👥</div><strong>尚無群組</strong><span>新增群組後可快速整理客戶</span></div>';
  groups.forEach(g=>{const count=customers.filter(u=>u.groupId===g.id).length;gr.insertAdjacentHTML('beforeend',`<div class="admin-row"><div class="group-icon">👥</div><div><strong>${esc(g.name)}</strong><div class="file-meta">${count} 位客戶</div></div></div>`)});

  const cr=$('#customers');
  if(!customers.length)cr.innerHTML=`<div class="empty-mini"><div>👤</div><strong>尚無客戶</strong><span>${groups.length?'建立客戶後會顯示在這裡':'請先建立群組'}</span></div>`;
  customers.forEach(u=>{
    const d=document.createElement('div');d.className='customer-item';
    const groupName=groups.find(g=>g.id===u.groupId)?.name||'未分類';
    d.innerHTML=`<div class="customer-avatar">${esc((u.name||'?').slice(0,1).toUpperCase())}</div><div class="customer-main"><strong>${esc(u.name)}</strong><div class="file-meta">${esc(u.username)}</div><div class="badge">${esc(groupName)}</div></div><div class="customer-access"><span>${(u.allowedPages||[]).length} 個頁面</span><button class="permission-btn">設定權限</button></div>`;
    d.querySelector('button').onclick=()=>editPermissions(u); cr.append(d);
  });

  $('#newGroup').onclick=openGroupDialog;
  if($('#newCustomer')) $('#newCustomer').onclick=openCustomerDialog;
}

function openGroupDialog(){
  $('#groupName').value=''; $('#groupDialog').showModal(); setTimeout(()=>$('#groupName').focus(),50);
}
function openCustomerDialog(){
  $('#customerName').value=''; $('#customerUsername').value='';
  const sel=$('#customerGroup'); sel.innerHTML=state.customerGroups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  $('#customerDialog').showModal(); setTimeout(()=>$('#customerName').focus(),50);
}

function editPermissions(u){
  const ps=allPages(),w=$('#workspace');
  w.innerHTML=`<div class="permission-top"><button id="backCustomers" class="secondary">← 返回客戶列表</button></div><div class="admin-card permission-card"><div class="modal-head"><div><div class="eyebrow">PAGE ACCESS</div><h2>${esc(u.name)}</h2><p>只勾選這個客戶登入後可以看到的頁面。</p></div><div class="customer-avatar big">${esc((u.name||'?').slice(0,1).toUpperCase())}</div></div><div id="permissionList" class="permission-list"></div><div class="permission-footer"><span id="permCount">已選 ${(u.allowedPages||[]).length} 個頁面</span><button id="savePerm" class="primary">儲存權限</button></div></div>`;
  const l=$('#permissionList');
  if(!ps.length)l.innerHTML='<div class="empty-mini"><strong>目前沒有可設定的頁面</strong></div>';
  ps.forEach(p=>l.insertAdjacentHTML('beforeend',`<label class="permission-row"><input type="checkbox" value="${p.id}" ${(u.allowedPages||[]).includes(p.id)?'checked':''}><span class="permission-icon">${icon(p.type)}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.cat)}</small></span><span class="check-ui">✓</span></label>`));
  const updateCount=()=>$('#permCount').textContent=`已選 ${l.querySelectorAll('input:checked').length} 個頁面`;
  l.addEventListener('change',updateCount); $('#backCustomers').onclick=renderCustomers;
  $('#savePerm').onclick=()=>{u.allowedPages=[...l.querySelectorAll('input:checked')].map(x=>x.value);save();renderCustomers()};
}

$('#customerBtn').onclick=renderCustomers;
$('#addCategoryBtn').onclick=()=>{$('#categoryName').value='';$('#categoryDialog').showModal()};
$('#categoryForm').onsubmit=e=>{e.preventDefault();const n=$('#categoryName').value.trim();if(!n)return;const c={id:uid('cat'),name:n,pages:[]};state.categories.push(c);state.activeCategoryId=c.id;save();$('#categoryDialog').close();renderNav();renderPage()};
$('#addPageBtn').onclick=()=>{$('#pageName').value='';$('#pageDialog').showModal()};
$('#pageForm').onsubmit=e=>{e.preventDefault();const c=cat(),n=$('#pageName').value.trim(),t=$('#pageType').value;if(!c||!n)return;const p={id:uid('page'),name:n,type:t,createdAt:new Date().toISOString()};if(t!=='sheet')p.files=[];c.pages.push(p);state.activePageId=p.id;save();$('#pageDialog').close();renderNav();renderPage()};
$('#groupForm').onsubmit=e=>{e.preventDefault();const n=$('#groupName').value.trim();if(!n)return;state.customerGroups.push({id:uid('grp'),name:n});save();$('#groupDialog').close();renderCustomers()};
$('#customerForm').onsubmit=e=>{e.preventDefault();const name=$('#customerName').value.trim(),username=$('#customerUsername').value.trim(),groupId=$('#customerGroup').value||null;if(!name||!username||!groupId)return;state.customers.push({id:uid('usr'),name,username,groupId,allowedPages:[]});save();$('#customerDialog').close();renderCustomers()};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close)?.close());
window.addEventListener('beforeunload',()=>{dispose();saveNow()});
load();