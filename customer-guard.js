(function(){
  const firebaseConfig={apiKey:'AIzaSyB02CLJIYLJgQ2LkMVgYomObyl1kQC84eI',authDomain:'omniplay-op.firebaseapp.com',projectId:'omniplay-op',storageBucket:'omniplay-op.firebasestorage.app',messagingSenderId:'742295844045',appId:'1:742295844045:web:8399ae7bdb21c6a9d12584'};
  const GROUP_ORDER_KEY='omniplay-customer-group-order-v1';
  let groupSortTimer=null;
  let groupSortBusy=false;

  function syncCustomerCreateButton(){
    const createBtn=document.querySelector('#newCustomer');
    if(!createBtn)return;
    const hasGroup=!!document.querySelector('#groups .admin-row');
    createBtn.style.display=hasGroup?'':'none';
  }

  function simplifyCustomerManagement(){
    const groups=document.querySelector('#groups');
    if(!groups)return;
    document.querySelector('.stats-grid')?.remove();
    const layout=document.querySelector('.customer-layout');
    if(!layout)return;
    const cards=layout.querySelectorAll(':scope > .admin-card');
    if(cards.length>1)cards[1].remove();
    layout.style.gridTemplateColumns='minmax(0,1fr)';
  }

  async function getWorkspaceStore(){
    const appMod=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js');
    const fsMod=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js');
    const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(firebaseConfig);
    const db=fsMod.getFirestore(app);
    return {fsMod,ref:fsMod.doc(db,'omniplay','workspace')};
  }

  function readSavedGroupOrder(){
    try{
      const v=JSON.parse(localStorage.getItem(GROUP_ORDER_KEY)||'[]');
      return Array.isArray(v)?v:[];
    }catch{return []}
  }

  function saveLocalGroupOrder(container){
    const ids=[...container.querySelectorAll(':scope > .admin-row[data-group-id]')].map(r=>r.dataset.groupId).filter(Boolean);
    localStorage.setItem(GROUP_ORDER_KEY,JSON.stringify(ids));
    return ids;
  }

  function rowGroupName(row){
    return (row.querySelector('strong')?.textContent||'').trim();
  }

  function arrangeRows(container,groups){
    const rows=[...container.querySelectorAll(':scope > .admin-row')];
    const buckets=new Map();
    groups.forEach(g=>{
      const key=String(g.name||'').trim();
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(g);
    });
    rows.forEach(row=>{
      const list=buckets.get(rowGroupName(row))||[];
      const g=list.shift();
      if(g)row.dataset.groupId=g.id;
    });

    const rowById=new Map(rows.filter(r=>r.dataset.groupId).map(r=>[r.dataset.groupId,r]));
    const localOrder=readSavedGroupOrder();
    const sourceOrder=localOrder.length?localOrder:groups.map(g=>g.id);
    sourceOrder.forEach(id=>{const row=rowById.get(id);if(row)container.appendChild(row)});
    groups.forEach(g=>{const row=rowById.get(g.id);if(row&&!sourceOrder.includes(g.id))container.appendChild(row)});
    rows.forEach(row=>{if(!row.dataset.groupId)container.appendChild(row)});
  }

  async function persistGroupOrder(container){
    const ids=saveLocalGroupOrder(container);
    if(!ids.length)return;
    try{
      const {fsMod,ref}=await getWorkspaceStore();
      const snap=await fsMod.getDoc(ref);
      if(!snap.exists())return;
      const data=snap.data();
      const groups=Array.isArray(data.customerGroups)?data.customerGroups:[];
      const byId=new Map(groups.map(g=>[g.id,g]));
      const ordered=ids.map(id=>byId.get(id)).filter(Boolean);
      groups.forEach(g=>{if(!ids.includes(g.id))ordered.push(g)});
      await fsMod.setDoc(ref,{...data,customerGroups:ordered,updatedAt:new Date().toISOString()});
      const status=document.querySelector('#cloudStatus');
      if(status)status.textContent='☁️ 群組排序已同步';
    }catch(e){console.warn('group order save failed',e)}
  }

  async function setupGroupDragSort(){
    if(groupSortBusy)return;
    const container=document.querySelector('#groups');
    if(!container||container.dataset.dragSortReady==='1')return;
    const rows=[...container.querySelectorAll(':scope > .admin-row')];
    if(!rows.length)return;
    groupSortBusy=true;
    try{
      const {fsMod,ref}=await getWorkspaceStore();
      const snap=await fsMod.getDoc(ref);
      if(!snap.exists())return;
      const groups=Array.isArray(snap.data().customerGroups)?snap.data().customerGroups:[];
      arrangeRows(container,groups);

      let dragging=null;
      [...container.querySelectorAll(':scope > .admin-row')].forEach(row=>{
        if(row.querySelector('.group-drag-handle'))return;
        const handle=document.createElement('span');
        handle.className='group-drag-handle';
        handle.textContent='☰';
        handle.title='拖曳調整群組順序';
        handle.draggable=true;
        handle.style.cssText='cursor:grab;font-size:20px;line-height:1;color:#8fa4c4;padding:10px 10px 10px 2px;user-select:none;flex:0 0 auto;';
        row.insertBefore(handle,row.firstChild);
        handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()});
        handle.addEventListener('dragstart',e=>{
          e.stopPropagation();
          dragging=row;
          row.style.opacity='.45';
          e.dataTransfer.effectAllowed='move';
          e.dataTransfer.setData('text/plain',row.dataset.groupId||'group');
        });
        handle.addEventListener('dragend',e=>{
          e.stopPropagation();
          if(dragging)dragging.style.opacity='';
          dragging=null;
          saveLocalGroupOrder(container);
          persistGroupOrder(container);
        });
      });

      container.addEventListener('dragover',e=>{
        if(!dragging)return;
        e.preventDefault();
        e.dataTransfer.dropEffect='move';
        const target=e.target.closest('.admin-row');
        if(!target||target===dragging||target.parentElement!==container)return;
        const box=target.getBoundingClientRect();
        container.insertBefore(dragging,e.clientY<box.top+box.height/2?target:target.nextSibling);
      });
      container.addEventListener('drop',e=>{
        if(!dragging)return;
        e.preventDefault();
        e.stopPropagation();
        saveLocalGroupOrder(container);
        setTimeout(()=>persistGroupOrder(container),0);
      });
      container.dataset.dragSortReady='1';

      if(readSavedGroupOrder().length){
        setTimeout(()=>persistGroupOrder(container),250);
      }
    }catch(e){console.warn('group drag setup failed',e)}
    finally{groupSortBusy=false}
  }

  function scheduleGroupDragSort(){
    clearTimeout(groupSortTimer);
    groupSortTimer=setTimeout(setupGroupDragSort,80);
  }

  function selectedRowCount(api){
    try{
      const wb=api?.getActiveWorkbook?.();
      const sheet=wb?.getActiveSheet?.();
      const range=sheet?.getActiveRange?.();
      if(!range)return 1;
      const notation=String(range.getA1Notation?.()||'').replace(/\$/g,'');
      let m=notation.match(/^(\d+):(\d+)$/);
      if(m)return Math.max(1,Number(m[2]));
      m=notation.match(/^[A-Z]+(\d+):[A-Z]+(\d+)$/i);
      if(m)return Math.max(1,Number(m[2]));
      m=notation.match(/^[A-Z]+(\d+)$/i);
      if(m)return Math.max(1,Number(m[1]));
      const start=Number(range.getRow?.() ?? 0);
      const count=Number(range.getNumRows?.() ?? 1);
      return Math.max(1,start+count);
    }catch{return 1}
  }

  function fixFreezeMenuText(){
    const api=window.__omniplayUniverAPI;
    if(!api)return;
    const rowCount=selectedRowCount(api);
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      const text=(node.nodeValue||'').trim();
      if(/^凍結至第\s*\d+\s*列$/.test(text)){
        node.nodeValue=node.nodeValue.replace(/凍結至第\s*\d+\s*列/,`凍結至第 ${rowCount} 列`);
      }
    }
  }

  const originalCreate=window.UniverPresets?.createUniver;
  if(originalCreate&&!window.UniverPresets.__omniplayFreezePatched){
    window.UniverPresets.__omniplayFreezePatched=true;
    window.UniverPresets.createUniver=function(...args){
      const result=originalCreate.apply(this,args);
      const api=result?.univerAPI;
      window.__omniplayUniverAPI=api;
      if(api&&!api.__omniplayFreezePatched){
        api.__omniplayFreezePatched=true;
        let applying=false;
        api.onCommandExecuted?.((command)=>{
          if(applying||command?.id!=='sheet.command.set-row-frozen')return;
          const rows=selectedRowCount(api);
          setTimeout(()=>{
            try{
              applying=true;
              const sheet=api.getActiveWorkbook?.()?.getActiveSheet?.();
              sheet?.setFrozenRows?.(rows);
            }catch(e){console.warn('freeze row fix',e)}
            finally{applying=false}
          },0);
        });
      }
      return result;
    };
  }

  const observer=new MutationObserver(()=>{
    syncCustomerCreateButton();
    simplifyCustomerManagement();
    scheduleGroupDragSort();
    fixFreezeMenuText();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('contextmenu',()=>{
    setTimeout(fixFreezeMenuText,0);
    setTimeout(fixFreezeMenuText,50);
  },true);
  document.addEventListener('DOMContentLoaded',()=>{syncCustomerCreateButton();simplifyCustomerManagement();scheduleGroupDragSort();fixFreezeMenuText()});
  syncCustomerCreateButton();
  simplifyCustomerManagement();
  scheduleGroupDragSort();
})();