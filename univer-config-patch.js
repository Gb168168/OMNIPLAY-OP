(()=>{
 const ns=window.UniverPresetSheetsCore;
 if(!ns||typeof ns.UniverSheetsCorePreset!=='function')return;
 let pendingContainer;
 const original=ns.UniverSheetsCorePreset;
 ns.UniverSheetsCorePreset=function(config={}){pendingContainer=config.container;return original({...config,sheets:{...config.sheets,disableForceStringAlert:true,disableForceStringMark:true}})};
 const presets=window.UniverPresets,notes=window.UniverPresetSheetsNote;
 if(!presets||!notes?.UniverSheetsNotePreset)throw Error('備註模組未載入');
 const create=presets.createUniver;
 presets.createUniver=function(config={}){
  const en=localStorage.getItem('omniplay-customer-language')==='en',locale=en?'en-US':config.locale||'zh-TW',suffix=en?'EnUS':'ZhTW';
  const core=en?window.UniverPresetSheetsCoreEnUS:config.locales?.[locale]||window.UniverPresetSheetsCoreZhTW;
  const labels=en?{rightClick:{addNote:'Insert Note',deleteNote:'Delete Note',toggleNote:'Show / Hide Note'},note:{placeholder:'Enter a note'}}:{rightClick:{addNote:'插入備註',deleteNote:'刪除備註',toggleNote:'顯示／隱藏備註'},note:{placeholder:'輸入備註內容'}};
  const container=typeof pendingContainer==='string'?document.getElementById(pendingContainer):pendingContainer;
  const result=create({...config,locale,locales:{...config.locales,[locale]:window.UniverCore.mergeLocales(core||{},window['UniverPresetSheetsNote'+suffix]||{},window['UniverPresetSheetsSort'+suffix]||{},window['UniverPresetSheetsFilter'+suffix]||{},labels)},presets:[...(config.presets||[]),notes.UniverSheetsNotePreset(),window.UniverPresetSheetsSort.UniverSheetsSortPreset(),window.UniverPresetSheetsFilter.UniverSheetsFilterPreset()]});
  let disposeTouch,touchDisposed=false;const originalDispose=result.univer.dispose.bind(result.univer);result.univer.dispose=()=>{touchDisposed=true;disposeTouch?.();return originalDispose();};
  requestAnimationFrame(()=>{if(!touchDisposed&&container?.isConnected){window.installOmniplaySheetMenu(result.univerAPI,container);disposeTouch=window.installOmniplaySheetTouchNavigation(result.univerAPI,container);}});
  return result;
 };
})();

