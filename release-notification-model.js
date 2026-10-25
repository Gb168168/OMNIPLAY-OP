
export const DEFAULT_NOTIFICATION_TYPES=[
 {id:'flow-uat',category:'流程',name:'上架 UAT',nameEn:'UAT Release'},
 {id:'flow-pord',category:'流程',name:'上架 PORD',nameEn:'PORD Release'},
 {id:'first-uat',category:'首發',name:'首發平台 UAT',nameEn:'First-launch Platform UAT'},
 {id:'first-pord',category:'首發',name:'首發平台 PORD',nameEn:'First-launch Platform PORD'},
 {id:'other-uat',category:'首發',name:'其他平台(首發後) UAT',nameEn:'Other Platforms (After First Launch) UAT'},
 {id:'other-pord',category:'首發',name:'其他平台(首發後) PORD',nameEn:'Other Platforms (After First Launch) PORD'},
 {id:'selected-uat',category:'特選遊戲',name:'特選遊戲 UAT',nameEn:'Selected Games UAT'},
 {id:'selected-pord',category:'特選遊戲',name:'特選遊戲 PORD',nameEn:'Selected Games PORD'}
];
export function normalizeReleaseTypes(value){
 if(value===undefined)return DEFAULT_NOTIFICATION_TYPES.map(type=>({...type}));
 if(!Array.isArray(value)||value.length>100)throw new Error('通知類型最多 100 個');
 const rows=value.map(type=>({id:String(type?.id||''),category:String(type?.category||'').trim(),name:String(type?.name||'').trim(),nameEn:String(type?.nameEn||'').trim()}));
 if(rows.some(type=>!/^[a-zA-Z0-9-]{1,80}$/.test(type.id)||!type.name||type.name.length>80||!type.category||type.category.length>40||type.nameEn.length>120)||new Set(rows.map(type=>type.id)).size!==rows.length)throw new Error('通知類型資料無效');
 return rows;
}
export function changeReleaseTypes(current,change){
 const types=normalizeReleaseTypes(current);
 if(change.removeId)return types.filter(type=>type.id!==change.removeId);
 const added=normalizeReleaseTypes([change.add])[0];
 if(types.some(type=>type.id===added.id||type.category===added.category&&type.name===added.name))throw new Error('此通知類型已存在');
 return normalizeReleaseTypes([...types,added]);
}
export const ENVIRONMENTS={test:{zh:'測試環境上架',en:'Test Environment Release'},production:{zh:'正式環境上架',en:'Production Environment Release'}};
export const NOTIFICATION_LIMIT=100;
export function buildReleaseNotification(input,{uid,name,game,groups,now=new Date().toISOString(),id,types}){
 if(!uid||!id||!game?.id)throw new Error('請選擇遊戲並確認登入狀態');
 const selectedType=types?normalizeReleaseTypes(types).find(type=>type.id===input.environment):(ENVIRONMENTS[input.environment]?null:DEFAULT_NOTIFICATION_TYPES.find(type=>type.id===input.environment));
 if(!selectedType&&(types||!Object.hasOwn(ENVIRONMENTS,input.environment)))throw new Error('請選擇有效的通知類型');
 const title=String(input.title||'').trim(),messageZh=String(input.messageZh??input.message??'').trim(),messageEn=String(input.messageEn||'').trim(),message=messageZh||messageEn,releaseAt=String(input.releaseAt||'');
 if(!title||title.length>200||messageZh.length>2000||messageEn.length>2000)throw new Error('標題必填且限 200 字；中英文說明各限 2000 字');
 if(!releaseAt||!Number.isFinite(Date.parse(releaseAt)))throw new Error('請填寫有效的上架時間');
 const selected=[...new Set(input.groupIds||[])],known=new Map(groups.map(group=>[group.id,group]));
 if(!selected.length||selected.length>400||selected.some(groupId=>!known.has(groupId)))throw new Error('請選擇有效的接收群組（最多 400 個）');
 const images=input.images||[];
 if(!Array.isArray(images)||images.length>3||images.some(image=>!image||!/^[a-zA-Z0-9-]{1,80}$/.test(image.id)||typeof image.name!=='string'||image.name.length>120)||new Set(images.map(image=>image.id)).size!==images.length)throw new Error('通知圖片資料無效，每則最多 3 張');
 return{...(images.length?{images:images.map(({id,name})=>({id,name}))}:{}),id,environment:input.environment,...(selectedType?{typeName:selectedType.name,typeNameEn:selectedType.nameEn,typeCategory:selectedType.category}:{}),title,message,messageZh,messageEn,releaseAt:new Date(releaseAt).toISOString(),game:{id:String(game.id),name:String(game.name||''),mandarinName:String(game.mandarinName||''),version:String(game.version||'')},groupIds:selected,groupNames:selected.map(groupId=>String(known.get(groupId).name||'')),createdAt:now,createdBy:uid,createdByName:String(name||''),status:'published'};
}
export function publicReleaseNotification(notification){const{groupIds,groupNames,createdBy,createdByName,...content}=notification;return content;}
export function appendReleaseNotification(existing,notification){return[notification,...(Array.isArray(existing)?existing:[]).filter(item=>item.id!==notification.id)].slice(0,NOTIFICATION_LIMIT);}
export function preserveReleaseNotifications(incoming,latest){if(!Object.hasOwn(incoming,'releaseNotifications')&&Object.hasOwn(latest,'releaseNotifications'))incoming.releaseNotifications=structuredClone(latest.releaseNotifications);return incoming;}
export function visibleReleaseNotifications(items){return(Array.isArray(items)?items:[]).filter(item=>item.status==='published').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}

export function filterReleaseGames(games,records,groups,groupId='',query=''){
 if(groupId&&!groups.some(group=>group.id===groupId))return[];
 const term=String(query||'').trim().toLowerCase();
 return games.filter(game=>(!groupId||(Array.isArray(records[game.id]?.groupIds)&&records[game.id].groupIds.includes(groupId)))&&(!term||[game.id,game.name,game.mandarinName].some(value=>String(value||'').toLowerCase().includes(term))));
}

export function defaultReleaseGroupIds(gameId,records,groups){const assigned=new Set(Array.isArray(records[gameId]?.groupIds)?records[gameId].groupIds:[]);return groups.filter(group=>assigned.has(group.id)).map(group=>group.id);}
