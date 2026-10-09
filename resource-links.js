// Shared automatic game-folder links for admin and permission-filtered customer views.
const pageNames=new Set(['game asset','game assets','bmm report','rng certificate','rtp certificate','game description','marketing resources','遊戲素材','認證報告','rng報告','rtp報告','遊戲說明','行銷資源']);
const knownPages=new Set(['page_1791531414882_0blcjj','page_1791531427139_hjvx77','page_1791531426803_m1qawl','page_1791531426376_fnbcg9','page_1791531427800_tfqrmu','page_1791531429063_lm01jt']);
const normalized=value=>String(value||'').normalize('NFKC').trim().toLowerCase().replace(/[\s_-]+/g,' ');
export function folderMatchesGame(folder,game){
 const id=String(game.id||'').trim(),name=normalized(game.name);
 if(folder.gameAssetGameId)return String(folder.gameAssetGameId)===id;
 const label=String(folder.name||'').normalize('NFKC');
 const ids=label.match(/(?<!\d)\d{5,}(?!\d)/g)||[];
 if(ids.length)return ids.includes(id);
 return !!name&&normalized(label)===name;
}
export function automaticGameFolders(workspace,game,allowedPages=null){
 const links=[],seen=new Set();
 for(const category of workspace.categories||[]){
  const categoryName=String(category.name||'');
  if(categoryName.includes('內部參考')||categoryName.includes('請勿外流'))continue;
  for(const page of category.pages||[]){
   if(allowedPages&&!allowedPages.has(page.id))continue;
   if(!['files','photos'].includes(page.type))continue;
   if(!knownPages.has(page.id)&&!pageNames.has(normalized(page.resourceSection||page.name))&&!pageNames.has(normalized(page.displayName)))continue;
   const visit=folders=>{for(const folder of folders||[]){
    if(folderMatchesGame(folder,game)){
     const key=page.id+'::'+folder.id;
     if(!seen.has(key)){seen.add(key);links.push({id:'auto:'+key,pageId:page.id,workspaceFolderId:folder.id,name:(page.resourceSection||page.displayName||page.name)+' / '+folder.name,type:folder.type==='photos'?'photos':'files',autoLinked:true})}
    }else visit(folder.folders);
   }};
   visit(page.folders);
  }
 }
 return links;
}
