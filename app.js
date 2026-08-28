import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';

import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const cfg={apiKey:'AIzaSyB02CLJIYLJgQ2LkMVgYomObyl1kQC84eI',authDomain:'omniplay-op.firebaseapp.com',projectId:'omniplay-op',storageBucket:'omniplay-op.firebasestorage.app',messagingSenderId:'742295844045',appId:'1:742295844045:web:8399ae7bdb21c6a9d12584'};

const fb=initializeApp(cfg),db=getFirestore(fb),ref=doc(db,'omniplay','workspace'),sheetRef=id=>doc(db,'omniplay',`sheet-${String(id)}`),sheetChunkRef=(id,index)=>doc(db,'omniplay',`sheet-${String(id)}-chunk-${index}`),$=s=>document.querySelector(s),KEY='omniplay-workspace-v3';

const CUSTOMER_OPTION_VERSION=4,DEFAULT_CUSTOMER_TYPES=['一般平台','IR平台'],DEFAULT_CUSTOMER_PROGRESS=['測試環境對接中','正式環境對接中','正式上線','已暫停','已終止'],DEFAULT_COMM_APPS=['Telegram','Teams'];
const GAME_LIST_HEADERS=['GAME ID','GAME VERSION','LIST OF GAMES','MANUFACTURER','DENOMINATION','GAME TYPE','NO. OF LINES','BET (PHP) MINIMUM','BET (PHP) MAXIMUM','MAX PRIZE (PHP)','MAX PRIZE MULTIPLIER','PROGRESSIVE JACKPOT GROUP','JACKPOT RANGE MIN (PHP)','JACKPOT RANGE MAX (PHP)','JACKPOT RTP RESERVE %','JACKPOT RTP INCREMENT %','TOTAL JACKPOT RTP %','BASE GAME RTP %','TOTAL PAYOUT % (THEORETICAL)'];
const OP_GAME_HEADERS=['Game ID','中文遊戲名稱 / Game Name (Mandarin)','英文遊戲名稱 / Game Name (English)','Game Status','Release Date','Pagcor Approval','Free Spin','Game Version','Manufacturer','Denomination','Game Type','No. of Lines','Bet (PHP) Minimum','Bet (PHP) Maximum','Max Prize (PHP)','Max Prize Multiplier','Progressive Jackpot Group','Jackpot Range Min (PHP)','Jackpot Range Max (PHP)','Jackpot RTP Reserve %','Jackpot RTP Increment %','Total Jackpot RTP %','Base Game RTP %','Total Payout % (Theoretical)'];
const PLATFORM_IMPORT_VERSION=1,IMPORTED_PLATFORMS=[
['Newport (Playtech)','', 'IR平台','','','找不到資料'],['Juan365','', '一般平台','','','找不到資料'],
['Filbet','FBTS4','一般平台','測試環境對接中','',''],['Filbet','FBTS3','一般平台','測試環境對接中','',''],['Filbet','FBTS2','一般平台','測試環境對接中','',''],
['789PLAY','PLS','一般平台','正式上線','2026-08-24',''],['789BINGO','BGS','一般平台','正式上線','2026-08-24',''],['Arenaplus','APS1','一般平台','測試環境對接中','',''],['H&H','LLS','IR平台','正式環境對接中','',''],
['OKBet','OKBS','一般平台','正式環境對接中','','Okbet 單一錢包'],['FBM','MBF2S','一般平台','正式環境對接中','','Philweb旗下平台'],['IGO-NP','IGNS','IR平台','正式環境對接中','',''],
['PWNWR','PWN2S','','','','Philweb旗下平台'],['PWNWR','PWNWRS','','','','Philweb旗下平台'],
['NinoGaming','LORAT','一般平台','正式上線','2026-05-12','Philweb旗下平台：Hann分支（原PWNN）'],['NinoGaming','PWNNT','一般平台','正式上線','2026-05-12','Philweb旗下平台：Hann分支（原PWNNT）'],
['BigBunny','VIVOT','一般平台','正式上線','2026-05-12','Philweb旗下平台：Hann分支（原PWBB）'],['BigBunny','PWBBT','一般平台','正式上線','2026-05-12','Philweb旗下平台：Hann分支（原PWBB）'],
['ArionPlay','YOYOT','一般平台','正式上線','2026-05-12','Philweb旗下平台：Hann分支（原PWAP）'],['ArionPlay','PWAPT','一般平台','正式上線','2026-05-12','Philweb旗下平台：Hann分支（原PWAP）'],
['Pin77','PNS','一般平台','測試環境對接中','',''],['Hann','HNT','一般平台','正式上線','2026-05-12',''],['FBM','FBMS','一般平台','正式上線','2026-05-01','Philweb旗下平台'],
['Nustar','NSS2','一般平台','正式上線','2026-04-24','Philweb旗下平台'],['Casino Plus','CPS5','IR平台','正式上線','2026-05-04',''],['OKADAPLAY','OKPS','一般平台','正式上線','2026-05-01','Philweb旗下平台'],
['Digitalwin','DGWS','一般平台','正式環境對接中','',''],['Playtime','PTS2','一般平台','正式上線','2026-04-01','Philweb旗下平台'],['LuckyWorld','LWS','IR平台','正式環境對接中','',''],
['DF','DFS2','一般平台','已終止','2026-03-20',''],['DF','DFS1','一般平台','已終止','2026-03-20',''],['BingoPlus','BPS2','一般平台','測試環境對接中','','GLI環境，僅有測試環境，不會有BPS2正式環境'],
['BingoPlus','BPS1','一般平台','正式上線','2026-04-01',''],['Casino Plus','CPS4','IR平台','測試環境對接中','','CPS4不會有正式環境'],['Casino Plus','CPS3','IR平台','測試環境對接中','','CPS3不會有正式環境'],
['Casino Plus','CPS2','IR平台','正式上線','2026-03-25','檢查用途'],['Casino Plus','CPS1','IR平台','正式上線','2026-03-25',''],['Nustar','NSS','一般平台','正式上線','2026-02-10','Philweb旗下平台'],
['Playtime','PTS','一般平台','正式上線','2026-02-12','Philweb旗下平台'],['Okada','OKDT','IR平台','正式上線','2026-02-12',''],['Okfun / Okcard','GSPHT','一般平台','已暫停','2025-11-11',''],
['S5','NTS','','','','Philweb旗下平台'],['Casino Filipino Online','CFOS','IR平台','正式環境對接中','',''],['Filbet','FBTS','一般平台','正式上線','2025-11-10',''],
['OKBet','OKBT','一般平台','正式上線','2025-09-15','Okbet 轉帳錢包'],['Solaire','SLS','','','','Philweb旗下平台'],['Philweb','ECGT','一般平台','已終止','',''],['Laikiwin (OCMS)','OCS','一般平台','正式上線','','']
];
const state={categories:[],customerGroups:[],customers:[],customerTypeOptions:[...DEFAULT_CUSTOMER_TYPES],customerProgressOptions:[...DEFAULT_CUSTOMER_PROGRESS],customerCommAppOptions:[...DEFAULT_COMM_APPS],customerOptionVersion:0,platformImportVersion:0,activeCategoryId:null,activePageId:null};
let currentUniver=null,timer=null,sheetSaveTimer=null,cloud=false,editingCustomerId=null,saveQueue=Promise.resolve();

const uid=(p='id')=>`${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m])),cat=()=>state.categories.find(x=>x.id===state.activeCategoryId),page=()=>cat()?.pages?.find(x=>x.id===state.activePageId),icon=t=>({sheet:'📊',files:'📄',photos:'🖼️',videos:'🎬'})[t]||'📄';

const SHEET_CHUNK_SIZE=240000;
function firebaseError(e){return String(e?.code||e?.message||'未知錯誤').replace(/^FirebaseError:\s*/,'').slice(0,100)}
function cleanSnapshot(snapshot){try{return JSON.parse(JSON.stringify(snapshot))}catch(e){console.warn('clean sheet snapshot',e);return null}}
async function readStoredSheet(page){const stored=await getDoc(sheetRef(page.id));if(!stored.exists())return null;const data=stored.data()||{};if(data.format==='json-chunks-v1'&&Number(data.chunkCount)>0){const pieces=[];for(let i=0;i<Number(data.chunkCount);i++){const part=await getDoc(sheetChunkRef(page.id,i));if(!part.exists()||typeof part.data()?.data!=='string')throw new Error(`缺少試算表分段 ${i+1}/${data.chunkCount}`);pieces.push(part.data().data)}return JSON.parse(pieces.join(''))}if(typeof data.snapshotJson==='string')return JSON.parse(data.snapshotJson);return data.snapshot||null}
async function hydrateSheetSnapshots(){for(const category of state.categories||[]){for(const page of category.pages||[]){if(page.type!=='sheet'||!page.id)continue;try{const snapshot=await readStoredSheet(page);if(snapshot)page.snapshot=snapshot;else if(page.snapshot)await persistSheetSnapshot(page,page.snapshot)}catch(e){console.warn('load sheet snapshot',page.id,e);$('#cloudStatus').textContent=`⚠️ 讀取失敗：${firebaseError(e)}`}}}}
async function persistSheetSnapshot(page,snapshot=page?.snapshot){if(!page?.id||!snapshot)return false;const clean=cleanSnapshot(snapshot);if(!clean)return false;const json=JSON.stringify(clean),chunks=[];for(let i=0;i<json.length;i+=SHEET_CHUNK_SIZE)chunks.push(json.slice(i,i+SHEET_CHUNK_SIZE));await Promise.all(chunks.map((data,index)=>setDoc(sheetChunkRef(page.id,index),{data,index,updatedAt:new Date().toISOString()})));await setDoc(sheetRef(page.id),{format:'json-chunks-v1',chunkCount:chunks.length,updatedAt:new Date().toISOString()});page.snapshot=clean;return true}
async function load(){try{const s=await getDoc(ref);
if(s.exists())Object.assign(state,s.data());
else{try{state.categories=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{}cloud=true;
await saveNow()}await hydrateSheetSnapshots();state.customerGroups||=[];
state.customers||=[];
if(state.customerOptionVersion!==CUSTOMER_OPTION_VERSION){state.customerTypeOptions=[...DEFAULT_CUSTOMER_TYPES];state.customerProgressOptions=[...DEFAULT_CUSTOMER_PROGRESS];state.customerCommAppOptions=[...DEFAULT_COMM_APPS];state.customerOptionVersion=CUSTOMER_OPTION_VERSION}
state.customerTypeOptions||=[...DEFAULT_CUSTOMER_TYPES];
state.customerProgressOptions||=[...DEFAULT_CUSTOMER_PROGRESS];
state.customerCommAppOptions||=[...DEFAULT_COMM_APPS];
state.customers.map(u=>u.commApp).filter(Boolean).forEach(value=>{if(!state.customerCommAppOptions.includes(value))state.customerCommAppOptions.push(value)});
if(state.platformImportVersion!==PLATFORM_IMPORT_VERSION){const existing=new Map(state.customers.map(u=>[`${String(u.name||'').trim().toLowerCase()}|${String(u.domain||u.username||'').trim().toLowerCase()}`,u]));IMPORTED_PLATFORMS.forEach(([name,domain,customerType,progress,launchDate,notes])=>{const key=`${name.trim().toLowerCase()}|${domain.trim().toLowerCase()}`,found=existing.get(key),data={name,domain,customerType,progress,launchDate,notes};if(found){Object.entries(data).forEach(([field,value])=>{if(value&&!found[field])found[field]=value})}else{const customer={id:uid('usr'),...data,commApp:'',groupId:''};state.customers.push(customer);existing.set(key,customer)}});state.platformImportVersion=PLATFORM_IMPORT_VERSION}
state.customerGroups.forEach(g=>{g.allowedPages||=[];
g.pageOrder||=[]});
cloud=true;
await saveNow();
$('#cloudStatus').textContent='☁️ Firestore 雲端資料'}catch(e){console.error(e);
$('#cloudStatus').textContent='⚠️ Firestore 連線失敗'}renderNav();
renderPage()}
function payload(){const categories=(state.categories||[]).map(category=>({...category,pages:(category.pages||[]).map(page=>{if(page.type!=='sheet')return page;const{snapshot,...metadata}=page;return metadata})}));return{categories,customerGroups:state.customerGroups,customers:state.customers,customerTypeOptions:state.customerTypeOptions,customerProgressOptions:state.customerProgressOptions,customerCommAppOptions:state.customerCommAppOptions,customerOptionVersion:state.customerOptionVersion,platformImportVersion:state.platformImportVersion,updatedAt:new Date().toISOString()}}function save(){localStorage.setItem(KEY,JSON.stringify(state.categories));
$('#cloudStatus').textContent='☁️ 儲存中…';
clearTimeout(timer);
timer=setTimeout(saveNow,400)}function saveNow(){if(!cloud)return Promise.resolve();clearTimeout(timer);
const data=payload();saveQueue=saveQueue.catch(()=>{}).then(()=>setDoc(ref,data)).then(()=>{$('#cloudStatus').textContent='☁️ 已同步'}).catch(e=>{console.error(e);
$('#cloudStatus').textContent=`⚠️ 儲存失敗：${firebaseError(e)}`});return saveQueue}function scheduleSheetSave(){if(!currentUniver)return;clearTimeout(sheetSaveTimer);$('#cloudStatus').textContent='☁️ 試算表儲存中…';const context=currentUniver;sheetSaveTimer=setTimeout(()=>captureCurrentSheet(context),900)}function workbookSnapshot(workbook){try{const snapshot=workbook?.getSnapshot?.();if(snapshot)return snapshot}catch(e){console.warn('get sheet snapshot',e)}return workbook?.save?.()}async function captureCurrentSheet(context=currentUniver){if(!context)return false;try{const workbook=context.api.getActiveWorkbook(),snapshot=await Promise.resolve(workbookSnapshot(workbook));if(!snapshot)return false;await persistSheetSnapshot(context.page,snapshot);localStorage.setItem(KEY,JSON.stringify(state.categories));await saveNow();return true}catch(e){console.warn('sheet autosave',e);$('#cloudStatus').textContent=`⚠️ 儲存失敗：${firebaseError(e)}`;return false}}function dispose(){$('#sheetCellTools')?.remove();if(!currentUniver)return;
const context=currentUniver;clearTimeout(sheetSaveTimer);context.autoSaveDisposable?.dispose?.();
captureCurrentSheet(context);try{context.univer.dispose()}catch{}currentUniver=null}
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
async function renderPage(){dispose();
$('.topbar').classList.remove('hidden');
const p=page(),c=cat();
if(p?.type==='sheet'&&String(p.name||'').trim()==='Game List_Online')normalizeGameListCells(p);
if(p?.type==='sheet'&&String(p.name||'').trim()==='OP GAME')await syncOpGameFromGameList(p);
$('#emptyState').classList.toggle('hidden',!!p||!!c);
$('#workspace').classList.toggle('hidden',!p);
$('#breadcrumb').textContent=c?`工作區 / ${c.name}`:'工作區';
$('#pageTitle').textContent=p?p.name:(c?c.name:'歡迎使用 OMNIPLAY');
if(!p){if(c)$('#emptyState').innerHTML='<div><h2>這個分類還沒有頁面</h2><p>按右上角「新增頁面」開始。</p></div>';
return}p.type==='sheet'?sheet(p):files(p)}
function firstSheet(snapshot){const id=snapshot?.sheetOrder?.[0];return id?snapshot.sheets?.[id]:null}
function cellValue(cell){let value=cell;for(let i=0;i<4&&value&&typeof value==='object'&&'v'in value;i++)value=value.v;return value&&typeof value==='object'?'':(value??'')}
function normalizedHeader(value){const key=String(value??'').toLowerCase().replace(/%/g,' percent ').replace(/[^a-z0-9]+/g,' ').trim();return key==='list of games'?'game name english':key}
function jackpotTwoLines(value){return String(value).replace(/Grand\s*[:：]\s*/i,'Grand：').replace(/\s*Major\s*[:：]\s*/i,'\nMajor：')}
function normalizedCell(cell,header){const value=cellValue(cell),style=cell&&typeof cell==='object'&&cell.s&&typeof cell.s==='object'?cell.s:{};if(typeof value==='string'&&/Grand\s*[:：].*Major\s*[:：]/i.test(value))return{v:jackpotTwoLines(value),s:style};const numericColumn=/^(no of lines|bet php|maximum|minimum|max prize|jackpot range|jackpot rtp|total jackpot rtp|base game rtp|total payout)/.test(header),raw=String(value??'').trim();if(numericColumn&&/^[+-]?[\d,]+(?:\.\d+)?$/.test(raw)){const number=Number(raw.replace(/,/g,''));if(Number.isFinite(number))return{v:number,t:2,s:{...style,n:{pattern:'#,##0.###'}}}}return typeof structuredClone==='function'?structuredClone(cell):JSON.parse(JSON.stringify(cell))}
function normalizeGameListCells(sourcePage){const sheet=firstSheet(sourcePage?.snapshot);if(!sheet)return false;const cells=sheet.cellData||{},headers=cells[0]||{};let changed=false;Object.entries(cells).forEach(([row,rowCells])=>{if(+row===0||!rowCells)return;Object.entries(rowCells).forEach(([column,cell])=>{const header=normalizedHeader(cellValue(headers[column])),value=cellValue(cell),next=normalizedCell(cell,header),nextValue=cellValue(next);if(String(value??'')!==String(nextValue??'')||next?.t!==cell?.t||nextValue!==value){rowCells[column]=next;changed=true}if(typeof nextValue==='string'&&nextValue.includes('\n')){sheet.rowData||(sheet.rowData={});sheet.rowData[row]={...(sheet.rowData[row]||{}),h:44}}})});if(changed){sourcePage.gameListNormalizedAt=new Date().toISOString();persistSheetSnapshot(sourcePage).catch(e=>console.warn('save normalized sheet',e));save()}return changed}
function applyGameListRows(rows){if(!Array.isArray(rows))return false;const sourcePage=state.categories.flatMap(c=>c.pages||[]).find(p=>p.type==='sheet'&&String(p.name||'').trim()==='Game List_Online'),sheet=firstSheet(sourcePage?.snapshot);if(!sheet)return false;const existingHeader=sheet.cellData?.[0]||{},header=Object.keys(existingHeader).length?existingHeader:Object.fromEntries(GAME_LIST_HEADERS.map((value,column)=>[column,{v:value}])),cellData={0:header};rows.forEach((values,index)=>{if(!Array.isArray(values))return;const row={};values.forEach((value,column)=>{if(value!==''&&value!=null)row[column]={v:value}});if(Object.keys(row).length)cellData[index+1]=row});sheet.cellData=cellData;sheet.rowCount=Math.max(rows.length+201,500);sourcePage.gameListLegacySyncedAt=new Date().toISOString();return true}
async function refreshGameListSource(){try{const stored=await getDoc(doc(db,'omniplay','game-list-online-page'));if(stored.exists()&&Array.isArray(stored.data()?.rows))applyGameListRows(stored.data().rows)}catch(e){console.warn('refresh Game List source',e)}}
window.addEventListener('omniplay-game-list-updated',event=>{if(applyGameListRows(event.detail?.rows)){const target=state.categories.flatMap(c=>c.pages||[]).find(p=>p.type==='sheet'&&String(p.name||'').trim()==='OP GAME');if(target)syncOpGameFromGameList(target,false)}})
async function syncOpGameFromGameList(targetPage,refresh=true){
if(refresh)await refreshGameListSource();
const sourcePage=state.categories.flatMap(c=>c.pages||[]).find(p=>p.type==='sheet'&&String(p.name||'').trim()==='Game List_Online');
normalizeGameListCells(sourcePage);
const source=firstSheet(sourcePage?.snapshot),target=firstSheet(targetPage?.snapshot);
if(!source||!target)return false;
const sourceCells=source.cellData||{},targetCells=target.cellData||(target.cellData={}),sourceHeader=sourceCells[0]||(sourceCells[0]=Object.fromEntries(GAME_LIST_HEADERS.map((value,column)=>[column,{v:value}]))),targetHeader=targetCells[0]||(targetCells[0]=Object.fromEntries(OP_GAME_HEADERS.map((value,column)=>[column,{v:value}])));
if(!Object.keys(targetHeader).length)OP_GAME_HEADERS.forEach((value,column)=>targetHeader[column]={v:value});
const sourceColumns=new Map();Object.entries(sourceHeader).forEach(([column,cell])=>{const key=normalizedHeader(cellValue(cell));if(key)sourceColumns.set(key,+column)});
const matches=[];Object.entries(targetHeader).forEach(([column,cell])=>{const sourceColumn=sourceColumns.get(normalizedHeader(cellValue(cell)));if(Number.isInteger(sourceColumn))matches.push([sourceColumn,+column])});
if(!matches.length)return false;
const matchedTargets=new Set(matches.map(([,to])=>to));Object.entries(targetCells).forEach(([row,cells])=>{if(+row===0||!cells)return;matchedTargets.forEach(column=>delete cells[column]);if(!Object.keys(cells).length)delete targetCells[row]});
let lastRow=1,changed=true;Object.entries(sourceCells).sort((a,b)=>+a[0]-+b[0]).forEach(([sourceRow,cells])=>{const rowNumber=+sourceRow;if(rowNumber===0||!cells)return;const row=targetCells[rowNumber]||(targetCells[rowNumber]={});let copied=false;matches.forEach(([from,to])=>{const sourceCell=cells[from];if(sourceCell==null)return;const header=normalizedHeader(cellValue(targetHeader[to])),next=normalizedCell(sourceCell,header);row[to]=next;if(typeof cellValue(next)==='string'&&cellValue(next).includes('\n')){target.rowData||(target.rowData={});target.rowData[rowNumber]={...(target.rowData[rowNumber]||{}),h:44}}copied=true});if(copied)lastRow=Math.max(lastRow,rowNumber)});
if(changed){target.rowCount=Math.max(Number(target.rowCount)||0,lastRow+200);targetPage.opGameAutoLinkedAt=new Date().toISOString();persistSheetSnapshot(targetPage).catch(e=>console.warn('save linked sheet',e));save()}
return changed}
function applyVisibleCellFixes(api,pageName){if(pageName!=='Game List_Online'&&pageName!=='OP GAME')return;requestAnimationFrame(()=>setTimeout(()=>{try{const worksheet=api.getActiveWorkbook()?.getActiveSheet(),range=worksheet?.getDataRange?.(),values=range?.getValues?.();if(!worksheet||!Array.isArray(values))return;values.forEach((row,ri)=>(row||[]).forEach((value,ci)=>{if(typeof value!=='string'||!/Grand\s*[:：].*Major\s*[:：]/i.test(value))return;const fixed=jackpotTwoLines(value);if(fixed===value)return;const cell=worksheet.getRange(ri,ci,1,1);cell.setValue(fixed);cell.setWrap?.(true);worksheet.setRowHeightsForced?.(ri,1,44)}))}catch(e){console.warn('visible cell fix',e)}},80))}
function mergeSelectedCells(action){if(!currentUniver)return;try{const workbook=currentUniver.api.getActiveWorkbook(),worksheet=workbook?.getActiveSheet?.(),range=worksheet?.getActiveRange?.()||workbook?.getActiveRange?.();if(!range)throw new Error('請先選取儲存格');if(action==='merge')range.merge();else range.breakApart();const status=$('#sheetMergeStatus');if(status){status.textContent=action==='merge'?'已合併':'已取消合併';setTimeout(()=>{if(status)status.textContent=''},1200)}scheduleSheetSave()}catch(e){console.warn('merge cells',e);const status=$('#sheetMergeStatus');if(status)status.textContent=e?.message||'操作失敗'}}
function mountSheetCellTools(){let tools=$('#sheetCellTools');if(tools)return;tools=document.createElement('div');tools.id='sheetCellTools';tools.className='sheet-cell-tools';tools.innerHTML='<button type="button" id="sheetMergeBtn">合併儲存格</button><button type="button" id="sheetUnmergeBtn">取消合併</button><small id="sheetMergeStatus"></small>';$('#addPageBtn')?.before(tools);$('#sheetMergeBtn').onclick=()=>mergeSelectedCells('merge');$('#sheetUnmergeBtn').onclick=()=>mergeSelectedCells('unmerge')}
function sheet(p){const w=$('#workspace');
w.className='workspace sheet-workspace';
w.innerHTML='<div id="univerSheet" class="univer-sheet"></div>';
try{const{createUniver}=window.UniverPresets,{LocaleType,mergeLocales}=window.UniverCore,{UniverSheetsCorePreset}=window.UniverPresetSheetsCore,l=window.UniverPresetSheetsCoreZhTW,z=LocaleType.ZH_TW||'zh-TW',x=createUniver({locale:z,locales:{[z]:mergeLocales(l)},presets:[UniverSheetsCorePreset({container:'univerSheet',disableTextFormatAlert:true,disableTextFormatMark:true})]});
x.univerAPI.createWorkbook(p.snapshot||{name:p.name});
currentUniver={univer:x.univer,api:x.univerAPI,page:p};currentUniver.autoSaveDisposable=x.univerAPI.addEvent?.(x.univerAPI.Event.CommandExecuted,()=>scheduleSheetSave());mountSheetCellTools();applyVisibleCellFixes(x.univerAPI,String(p.name||'').trim())}catch(e){w.innerHTML=`<div class="notice">試算表載入失敗：${esc(e.message)}</div>`}}
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
function platformOptionMarkup(items,current){const empty=current?'':'<option value="" selected>未設定</option>';return empty+items.map(item=>{const value=typeof item==='string'?item:item.id,label=typeof item==='string'?item:item.name;return `<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`}).join('')+'<option value="__add__">＋ 新增選項…</option>'}
function handlePlatformOption(select,u,field){if(select.value!=='__add__'){u[field]=select.value;save();return}const labels={customerType:'客戶群組',commApp:'通訊 APP',progress:'對接進度',groupId:'所屬群組'},value=prompt(`新增${labels[field]}選項：`)?.trim();if(!value){renderCustomers();return}if(field==='groupId'){let group=state.customerGroups.find(g=>g.name===value);if(!group){group={id:uid('grp'),name:value,allowedPages:[],pageOrder:[]};state.customerGroups.push(group)}u.groupId=group.id}else{const items=field==='customerType'?state.customerTypeOptions:field==='commApp'?state.customerCommAppOptions:state.customerProgressOptions;if(!items.includes(value))items.push(value);u[field]=value}save();renderCustomers()}
function renderCustomers(){dispose();
$('.topbar').classList.add('hidden');
$('#emptyState').classList.add('hidden');
const w=$('#workspace');
w.className='workspace platform-list-workspace';
w.classList.remove('hidden');
$('#breadcrumb').textContent='系統管理';
$('#pageTitle').textContent='所有平台列表';
$('#addPageBtn').disabled=true;
const groups=state.customerGroups,customers=state.customers,liveCount=customers.filter(u=>u.progress==='正式上線').length;
w.innerHTML=`<div class="customer-hero"><div><div class="eyebrow">PLATFORM DIRECTORY</div><h2>所有平台列表</h2><p>集中查看所有平台資料，並可直接調整分類、進度與所屬群組。</p></div><div class="customer-tools"><span class="platform-count">共 ${liveCount} 個平台正式上線</span><button class="secondary" id="groupManagerBtn">群組分類管理</button><button class="primary" id="newPlatform">＋ 新增平台</button></div></div><section class="admin-card platform-table-card"><div class="platform-table-wrap"><table class="platform-table"><thead><tr><th>客戶名稱</th><th>客戶域名</th><th>客戶群組</th><th>對接進度</th><th>上線日期</th><th>備註說明</th><th>所屬群組</th><th>操作</th></tr></thead><tbody id="platformRows"></tbody></table></div><div id="platformEmpty" class="empty-mini hidden"><div>🏢</div><strong>尚未建立平台</strong><span>按右上「新增平台」開始</span></div></section>`;
const rows=$('#platformRows');
if(!customers.length){$('.platform-table-wrap').classList.add('hidden');$('#platformEmpty').classList.remove('hidden')}
customers.forEach(u=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${esc(u.name||'未命名')}</strong></td><td>${esc(u.domain||u.username||'—')}</td><td><select data-field="customerType">${platformOptionMarkup(state.customerTypeOptions,u.customerType)}</select></td><td><select data-field="progress">${platformOptionMarkup(state.customerProgressOptions,u.progress)}</select></td><td>${esc(formatLaunchDate(u.launchDate))}</td><td><div class="platform-notes" title="${esc(u.notes||'')}">${esc(u.notes||'—')}</div></td><td><select data-field="groupId">${platformOptionMarkup(groups,u.groupId)}</select></td><td><div class="platform-actions"><button type="button" class="platform-edit">編輯</button><button type="button" class="permission-btn">設定權限</button><button type="button" class="customer-delete">刪除</button></div></td>`;
tr.querySelectorAll('select[data-field]').forEach(select=>select.onchange=()=>handlePlatformOption(select,u,select.dataset.field));
tr.querySelector('.platform-edit').onclick=()=>openCustomerDialog(u.groupId,u);
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
function fillCustomerOptionSelect(id,items,allowEmpty=false){const sel=$(id);
sel.innerHTML=(allowEmpty?'<option value="">未設定</option>':'')+items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}function openGroupDialog(){$('#groupName').value='';
$('#groupDialog').showModal();
setTimeout(()=>$('#groupName').focus(),50)}function openCustomerDialog(groupId,customer=null){editingCustomerId=customer?.id||null;
$('#customerDialogTitle').textContent=customer?'編輯平台':'建立平台';
$('#customerSubmitBtn').textContent=customer?'儲存變更':'建立平台';
['#customerName','#customerDomain','#customerLaunchDate','#customerNotes'].forEach(id=>$(id).value='');
fillCustomerOptionSelect('#customerType',state.customerTypeOptions,true);
fillCustomerOptionSelect('#customerCommApp',state.customerCommAppOptions,true);
fillCustomerOptionSelect('#customerProgress',state.customerProgressOptions,true);
const sel=$('#customerGroup');
sel.innerHTML='<option value="">未設定</option>'+state.customerGroups.map(g=>`<option value="${g.id}" ${g.id===groupId?'selected':''}>${esc(g.name)}</option>`).join('');
if(customer){$('#customerName').value=customer.name||'';$('#customerDomain').value=customer.domain||customer.username||'';$('#customerType').value=customer.customerType||'';$('#customerCommApp').value=customer.commApp||'';$('#customerProgress').value=customer.progress||'';$('#customerLaunchDate').value=/^\d{4}-\d{2}-\d{2}$/.test(customer.launchDate||'')?customer.launchDate:'';$('#customerNotes').value=customer.notes||'';sel.value=customer.groupId||''}
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
if(!name)return;
const existing=editingCustomerId?state.customers.find(customer=>customer.id===editingCustomerId):null,inputDate=$('#customerLaunchDate').value.trim(),data={name,domain:$('#customerDomain').value.trim(),customerType:$('#customerType').value,commApp:$('#customerCommApp').value.trim(),groupId,progress:$('#customerProgress').value,launchDate:inputDate||((existing?.launchDate&&!/^\d{4}-\d{2}-\d{2}$/.test(existing.launchDate))?existing.launchDate:''),notes:$('#customerNotes').value.trim()};
if(existing)Object.assign(existing,data);else state.customers.push({id:uid('usr'),...data});
editingCustomerId=null;
save();
$('#customerDialog').close();
renderCustomers()};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{const d=document.getElementById(b.dataset.close);
if(d?.id==='customerDialog'){editingCustomerId=null;const s=$('#customerGroup');
s.disabled=false;
delete s.dataset.lockedGroup}d?.close()});
window.addEventListener('beforeunload',()=>{dispose();
saveNow()});
const themeToggle=$('#themeToggle');
function applyTheme(theme){document.documentElement.dataset.theme=theme;themeToggle.checked=theme==='dark';try{localStorage.setItem('omniplay-theme',theme)}catch{}}
applyTheme(document.documentElement.dataset.theme==='light'?'light':'dark');
themeToggle.onchange=()=>applyTheme(themeToggle.checked?'dark':'light');
load();
