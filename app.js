import { db, storage } from './firebase.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';

const $ = (s) => document.querySelector(s);
const state = {
  categories: [],
  activeCategoryId: null,
  activePageId: null,
  cloud: false
};
const workspaceRef = doc(db, 'workspaces', 'default');
const LOCAL_KEY = 'omniplay-workspace-v1';

function uid(prefix='id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function esc(s='') { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function activeCategory() { return state.categories.find(c => c.id === state.activeCategoryId); }
function activePage() { return activeCategory()?.pages?.find(p => p.id === state.activePageId); }

async function load() {
  try {
    const snap = await getDoc(workspaceRef);
    if (snap.exists()) state.categories = snap.data().categories || [];
    else state.categories = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    state.cloud = true;
    $('#cloudStatus').textContent = '☁ Firebase 已連線';
  } catch (e) {
    console.warn(e);
    state.categories = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    $('#cloudStatus').textContent = '本機模式（請啟用 Firestore）';
  }
  renderNav();
  renderPage();
}

async function save() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state.categories));
  if (!state.cloud) return;
  try {
    await setDoc(workspaceRef, { categories: state.categories, updatedAt: new Date().toISOString() });
    $('#cloudStatus').textContent = '☁ 已儲存';
  } catch (e) {
    console.warn(e);
    state.cloud = false;
    $('#cloudStatus').textContent = '本機模式（Firestore 權限未開）';
  }
}

function renderNav() {
  const root = $('#categoryList');
  root.innerHTML = '';
  state.categories.forEach(cat => {
    const box = document.createElement('div');
    box.className = 'category';
    box.innerHTML = `<div class="category-head ${cat.id===state.activeCategoryId?'active':''}" data-cat="${cat.id}"><span>📁 ${esc(cat.name)}</span><span>›</span></div><div class="category-pages"></div>`;
    box.querySelector('.category-head').onclick = () => {
      state.activeCategoryId = cat.id;
      state.activePageId = cat.pages?.[0]?.id || null;
      renderNav(); renderPage();
    };
    const pages = box.querySelector('.category-pages');
    (cat.pages || []).forEach(p => {
      const b = document.createElement('button');
      b.className = `page-link ${p.id===state.activePageId?'active':''}`;
      b.textContent = `${typeIcon(p.type)} ${p.name}`;
      b.onclick = () => { state.activeCategoryId = cat.id; state.activePageId = p.id; renderNav(); renderPage(); };
      pages.appendChild(b);
    });
    root.appendChild(box);
  });
  $('#addPageBtn').disabled = !state.activeCategoryId;
}

function typeIcon(t) { return ({sheet:'📊',files:'📄',photos:'🖼️',videos:'🎬'})[t] || '📄'; }

function renderPage() {
  const page = activePage(), cat = activeCategory();
  $('#emptyState').classList.toggle('hidden', !!page || !!cat);
  $('#workspace').classList.toggle('hidden', !page);
  $('#breadcrumb').textContent = cat ? `工作區 / ${cat.name}` : '工作區';
  $('#pageTitle').textContent = page ? page.name : (cat ? cat.name : '歡迎使用 OMNIPLAY');
  if (!page) {
    if (cat) $('#emptyState').innerHTML = '<h2>這個分類還沒有頁面</h2><p>按右上角「新增頁面」開始。</p>';
    return;
  }
  if (page.type === 'sheet') renderSheet(page);
  else renderFiles(page);
}

function renderSheet(page) {
  page.sheet ||= { rows: 60, cols: 20, cells: {} };
  const ws = $('#workspace');
  ws.innerHTML = `<div class="toolbar"><button id="undoBtn">↶ 復原</button><button id="addRowBtn">＋ 列</button><button id="addColBtn">＋ 欄</button><button id="importCsvBtn">匯入 CSV</button><button id="exportCsvBtn">匯出 CSV</button><button id="clearSheetBtn">清空</button></div><div class="formula-bar"><input id="cellAddress" value="A1" readonly><input id="formulaInput" placeholder="輸入內容或公式，例如 =SUM(A1:A5)"></div><div class="sheet-wrap"><table id="sheet" class="sheet"></table></div>`;
  const table = $('#sheet');
  let selected = 'A1';
  let history = [];

  function colName(n){ let s=''; for(n++; n>0; n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; }
  function build(){
    let html='<thead><tr><th class="row-head"></th>';
    for(let c=0;c<page.sheet.cols;c++) html+=`<th>${colName(c)}</th>`;
    html+='</tr></thead><tbody>';
    for(let r=1;r<=page.sheet.rows;r++){
      html+=`<tr><th class="row-head">${r}</th>`;
      for(let c=0;c<page.sheet.cols;c++){
        const a=`${colName(c)}${r}`, raw=page.sheet.cells[a] ?? '';
        html+=`<td contenteditable="true" data-a="${a}" data-raw="${esc(raw)}">${esc(displayValue(raw,page.sheet.cells))}</td>`;
      }
      html+='</tr>';
    }
    html+='</tbody>'; table.innerHTML=html;
    table.querySelectorAll('td').forEach(td=>{
      td.onfocus=()=>{ selected=td.dataset.a; $('#cellAddress').value=selected; $('#formulaInput').value=page.sheet.cells[selected] ?? ''; };
      td.onblur=async()=>{
        const old=page.sheet.cells[td.dataset.a] ?? '', val=td.textContent;
        if(old!==val){ history.push(JSON.stringify(page.sheet.cells)); page.sheet.cells[td.dataset.a]=val; await save(); build(); }
      };
      td.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); td.blur(); } };
    });
  }
  $('#formulaInput').onkeydown = async e => { if(e.key==='Enter'){ history.push(JSON.stringify(page.sheet.cells)); page.sheet.cells[selected]=e.target.value; await save(); build(); } };
  $('#undoBtn').onclick=async()=>{ const prev=history.pop(); if(prev){ page.sheet.cells=JSON.parse(prev); await save(); build(); } };
  $('#addRowBtn').onclick=async()=>{ page.sheet.rows+=10; await save(); build(); };
  $('#addColBtn').onclick=async()=>{ page.sheet.cols+=5; await save(); build(); };
  $('#clearSheetBtn').onclick=async()=>{ if(confirm('確定清空這張試算表？')){ page.sheet.cells={}; await save(); build(); } };
  $('#importCsvBtn').onclick=()=>$('#csvImport').click();
  $('#csvImport').onchange=async e=>{
    const f=e.target.files[0]; if(!f)return; const txt=await f.text(); const rows=parseCSV(txt);
    rows.forEach((row,r)=>row.forEach((v,c)=>{page.sheet.cells[`${colName(c)}${r+1}`]=v;}));
    page.sheet.rows=Math.max(page.sheet.rows,rows.length+5); page.sheet.cols=Math.max(page.sheet.cols,Math.max(...rows.map(x=>x.length),0)+2); await save(); build(); e.target.value='';
  };
  $('#exportCsvBtn').onclick=()=>{
    const lines=[]; for(let r=1;r<=page.sheet.rows;r++){ const row=[]; for(let c=0;c<page.sheet.cols;c++){ const v=page.sheet.cells[`${colName(c)}${r}`]??''; row.push(`"${String(v).replaceAll('"','""')}"`);} lines.push(row.join(',')); }
    download(`${page.name}.csv`,lines.join('\n'),'text/csv;charset=utf-8');
  };
  build();
}

function displayValue(raw, cells) {
  if (typeof raw !== 'string' || !raw.startsWith('=')) return raw;
  try {
    const expr = raw.slice(1).toUpperCase();
    const rangeVals = r => {
      const m=r.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/); if(!m)return[];
      const colNum=s=>[...s].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1;
      const vals=[]; for(let y=+m[2];y<=+m[4];y++) for(let x=colNum(m[1]);x<=colNum(m[3]);x++){ let n=Number(cells[`${String.fromCharCode(65+x)}${y}`]); vals.push(Number.isFinite(n)?n:0); } return vals;
    };
    const fn=expr.match(/^(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(([^)]+)\)$/);
    if(fn){ const v=rangeVals(fn[2]); if(fn[1]==='SUM')return v.reduce((a,b)=>a+b,0); if(fn[1]==='AVERAGE'||fn[1]==='AVG')return v.length?v.reduce((a,b)=>a+b,0)/v.length:0; if(fn[1]==='MIN')return Math.min(...v); if(fn[1]==='MAX')return Math.max(...v); if(fn[1]==='COUNT')return v.length; }
    const safe=expr.replace(/([A-Z]+\d+)/g,m=>Number(cells[m])||0);
    if(!/^[0-9+\-*/().\s]+$/.test(safe)) return '#ERROR!';
    return Function(`"use strict";return (${safe})`)();
  } catch { return '#ERROR!'; }
}

function parseCSV(text){ return text.trim().split(/\r?\n/).map(line=>{ const out=[]; let cur='',q=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'){ if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;} else if(ch===','&&!q){out.push(cur);cur='';}else cur+=ch;} out.push(cur); return out; }); }
function download(name, content, type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); }

function renderFiles(page) {
  page.files ||= [];
  const accept = page.type==='photos'?'image/*':page.type==='videos'?'video/*':'.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf';
  const title = page.type==='photos'?'照片':page.type==='videos'?'影片':'檔案 / PDF';
  const ws=$('#workspace');
  ws.innerHTML=`${!state.cloud?'<div class="notice">目前是本機模式。啟用 Firebase Firestore 與 Storage 後，檔案才能上傳到雲端。</div>':''}<div class="file-panel"><div id="uploadZone" class="upload-zone"><strong>＋ 上傳${title}</strong><div class="file-meta">點擊選擇檔案，可一次選多個</div></div><div id="fileGrid" class="file-grid"></div></div>`;
  const input=$('#hiddenUpload'); input.accept=accept;
  $('#uploadZone').onclick=()=>input.click();
  input.onchange=async e=>{ await uploadFiles(page,[...e.target.files]); e.target.value=''; };
  const grid=$('#fileGrid');
  if(!page.files.length) grid.innerHTML='<div class="file-meta">目前沒有檔案。</div>';
  page.files.forEach(f=>{
    const card=document.createElement('div'); card.className='file-card';
    const preview = f.type?.startsWith('image/')?`<img src="${esc(f.url)}" alt="">`:f.type?.startsWith('video/')?`<video src="${esc(f.url)}" controls></video>`:`<div style="height:140px;display:grid;place-items:center;font-size:48px">📄</div>`;
    card.innerHTML=`${preview}<div class="file-name" title="${esc(f.name)}">${esc(f.name)}</div><div class="file-meta">${formatBytes(f.size||0)}</div><a href="${esc(f.url)}" target="_blank" rel="noopener">開啟檔案 ↗</a>`;
    grid.appendChild(card);
  });
}

async function uploadFiles(page, files) {
  if(!files.length)return;
  if(!state.cloud){ alert('請先在 Firebase 啟用 Firestore 與 Storage。'); return; }
  $('#cloudStatus').textContent='正在上傳…';
  try{
    for(const file of files){
      if(page.type==='photos'&&!file.type.startsWith('image/')) continue;
      if(page.type==='videos'&&!file.type.startsWith('video/')) continue;
      const path=`uploads/${page.id}/${Date.now()}-${file.name.replace(/[^\w.\-\u4e00-\u9fff]/g,'_')}`;
      const r=ref(storage,path); await uploadBytes(r,file); const url=await getDownloadURL(r);
      page.files.push({id:uid('file'),name:file.name,type:file.type,size:file.size,url,path,createdAt:new Date().toISOString()});
    }
    await save(); renderPage();
  }catch(e){ console.error(e); alert('上傳失敗。請確認 Firebase Storage 已建立，且安全規則允許目前網站操作。'); $('#cloudStatus').textContent='上傳失敗'; }
}
function formatBytes(n){ if(!n)return'0 B'; const u=['B','KB','MB','GB']; let i=0; while(n>=1024&&i<u.length-1){n/=1024;i++;} return `${n.toFixed(i?1:0)} ${u[i]}`; }

$('#addCategoryBtn').onclick=()=>{ $('#categoryName').value=''; $('#categoryDialog').showModal(); };
$('#categoryForm').onsubmit=async e=>{
  e.preventDefault(); const name=$('#categoryName').value.trim(); if(!name)return;
  const cat={id:uid('cat'),name,pages:[]}; state.categories.push(cat); state.activeCategoryId=cat.id; state.activePageId=null; await save(); $('#categoryDialog').close(); renderNav(); renderPage();
};
$('#addPageBtn').onclick=()=>{ $('#pageName').value=''; $('#pageDialog').showModal(); };
$('#pageForm').onsubmit=async e=>{
  e.preventDefault(); const cat=activeCategory(),name=$('#pageName').value.trim(),type=$('#pageType').value; if(!cat||!name)return;
  const page={id:uid('page'),name,type,createdAt:new Date().toISOString()}; if(type==='sheet')page.sheet={rows:60,cols:20,cells:{}}; else page.files=[];
  cat.pages.push(page); state.activePageId=page.id; await save(); $('#pageDialog').close(); renderNav(); renderPage();
};

load();
