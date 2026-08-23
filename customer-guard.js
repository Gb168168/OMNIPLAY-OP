(function(){
  function syncCustomerCreateButton(){
    const createBtn=document.querySelector('#newCustomer');
    if(!createBtn)return;
    const hasGroup=!!document.querySelector('#groups .admin-row');
    createBtn.style.display=hasGroup?'':'none';
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
    fixFreezeMenuText();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('contextmenu',()=>{
    setTimeout(fixFreezeMenuText,0);
    setTimeout(fixFreezeMenuText,50);
  },true);
  document.addEventListener('DOMContentLoaded',()=>{syncCustomerCreateButton();fixFreezeMenuText()});
  syncCustomerCreateButton();
})();