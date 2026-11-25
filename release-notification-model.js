
export const DEFAULT_NOTIFICATION_TYPES=[
 {id:'flow-uat',category:'流程',name:'UAT',nameEn:'UAT'},
 {id:'flow-pord',category:'流程',name:'PROD',nameEn:'PROD'},
 {id:'flow-uat-no-dm',category:'流程',name:'UAT（無DM版本）',nameEn:'UAT (Without DM)'},
 {id:'flow-uat-dm',category:'流程',name:'UAT（補DM版本）',nameEn:'UAT (Marketing Assets Update)'},
 {id:'selected-uat',category:'特選',name:'UAT 特選',nameEn:'Exclusive UAT'},
 {id:'selected-pord',category:'特選',name:'PROD 特選',nameEn:'Exclusive PROD'},
 {id:'first-pord-extension',category:'特選',name:'PROD 特選-延長通知',nameEn:'Exclusive PROD Extension'},
 {id:'schedule-change',category:'其他',name:'新遊戲上線時間調整通知',nameEn:'Game Launch Schedule Change'},
 {id:'schedule-updated',category:'其他',name:'新遊戲上線時間調整 完成通知',nameEn:'Game Launch Schedule Update'},
 {id:'combined',category:'其他',name:'UAT & PROD 遊戲一起上通知',nameEn:'Combined UAT & PROD Launch'}
];
export function normalizeReleaseTypes(value){
 if(value===undefined)return DEFAULT_NOTIFICATION_TYPES.map(type=>({...type}));
 if(!Array.isArray(value)||value.length>100)throw new Error('通知類型最多 100 個');
 const rows=value.map(type=>({id:String(type?.id||''),category:String(type?.category||'').trim().replace(/^(特選遊戲|首發)$/,'特選'),name:String(type?.name||'').trim(),nameEn:String(type?.nameEn||'').trim()}));
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
export function isPordNotification(item){return item?.environment==='production'||/P(?:ROD|ORD)/i.test(item?.typeName||item?.name||item?.environment||'');}
export function notificationHasNoReleaseDate(item){return isPordNotification(item)||item?.environment==='materials'||/^(素材補充通知|Marketing Materials Update)$/i.test(item?.typeName||item?.name||'');}
export function notificationCategory(item){const category=String(item.typeCategory||'').replace(/^(特選遊戲|首發)$/,'特選');return ['流程','首發','特選','其他'].includes(category)?category:(DEFAULT_NOTIFICATION_TYPES.find(type=>type.id===item.environment)?.category||'其他');}
export function notificationTransition(item,types=DEFAULT_NOTIFICATION_TYPES){
 if(item.status!=='published')return null;
 const targets={'flow-uat':'flow-pord','flow-uat-no-dm':'flow-pord','flow-uat-dm':'flow-pord','selected-uat':'selected-pord','other-uat':'flow-pord',test:'flow-pord'};
 const target=types.find(type=>type.id===targets[item.environment]);
 return target?{typeId:target.id,targetName:target.name,label:'轉 PROD'}:null;
}
export function buildReleaseNotification(input,{uid,name,game,groups,now=new Date().toISOString(),id,types}){
 if(!uid||!id||!game?.id)throw new Error('請選擇遊戲並確認登入狀態');
 const selectedType=types?normalizeReleaseTypes(types).find(type=>type.id===input.environment):(ENVIRONMENTS[input.environment]?null:DEFAULT_NOTIFICATION_TYPES.find(type=>type.id===input.environment));
 if(!selectedType&&(types||!Object.hasOwn(ENVIRONMENTS,input.environment)))throw new Error('請選擇有效的通知類型');
 const titleZh=String(input.titleZh??input.title??'').trim(),titleEn=String(input.titleEn||'').trim(),title=titleZh||titleEn,messageZh=String(input.messageZh??input.message??'').trim(),messageEn=String(input.messageEn||'').trim(),message=messageZh||messageEn,releaseAt=String(input.releaseAt||'');
 if(!title||titleZh.length>200||titleEn.length>200||messageZh.length>2000||messageEn.length>2000)throw new Error('標題必填且限 200 字；中英文說明各限 2000 字');
 const noReleaseDate=notificationHasNoReleaseDate({environment:input.environment,typeName:selectedType?.name});
 if(!noReleaseDate&&(!releaseAt||!Number.isFinite(Date.parse(releaseAt))))throw new Error('請填寫有效的上架時間');
 const selected=[...new Set(input.groupIds||[])],known=new Map(groups.map(group=>[group.id,group]));
 if(!selected.length||selected.length>400||selected.some(groupId=>!known.has(groupId)))throw new Error('請選擇有效的接收群組（最多 400 個）');
 const images=input.images||[];
 if(!Array.isArray(images)||images.length>3||images.some(image=>!image||!/^[a-zA-Z0-9-]{1,80}$/.test(image.id)||typeof image.name!=='string'||image.name.length>120)||new Set(images.map(image=>image.id)).size!==images.length)throw new Error('通知圖片資料無效，每則最多 3 張');
 return{...(images.length?{images:images.map(({id,name})=>({id,name}))}:{}),id,environment:input.environment,...(selectedType?{typeName:selectedType.name,typeNameEn:selectedType.nameEn,typeCategory:selectedType.category}:{}),title,titleZh,titleEn,message,messageZh,messageEn,releaseAt:noReleaseDate?'':new Date(releaseAt).toISOString(),game:{id:String(game.id),name:String(game.name||''),mandarinName:String(game.mandarinName||''),version:String(game.version||'')},groupIds:selected,groupNames:selected.map(groupId=>String(known.get(groupId).name||'')),createdAt:now,createdBy:uid,createdByName:String(name||''),status:'published'};
}
export function publicReleaseNotification(notification){const{groupIds,groupNames,recipientScope,recipientExclusions,createdBy,createdByName,updatedBy,updatedByName,...content}=notification;const publisherName=createdByName?.trim();return publisherName?{...content,publisherName}:content;}
export function appendReleaseNotification(existing,notification){return[notification,...(Array.isArray(existing)?existing:[]).filter(item=>item.id!==notification.id)].slice(0,NOTIFICATION_LIMIT);}
export function preserveReleaseNotifications(incoming,latest){if(!Object.hasOwn(incoming,'releaseNotifications')&&Object.hasOwn(latest,'releaseNotifications'))incoming.releaseNotifications=structuredClone(latest.releaseNotifications);return incoming;}
export function visibleReleaseNotifications(items){return(Array.isArray(items)?items:[]).filter(item=>item.status==='published').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}

export function filterReleaseGames(games,records,groups,groupId='',query=''){
 if(groupId&&!groups.some(group=>group.id===groupId))return[];
 const term=String(query||'').trim().toLowerCase();
 return games.filter(game=>(!groupId||(Array.isArray(records[game.id]?.groupIds)&&records[game.id].groupIds.includes(groupId)))&&(!term||[game.id,game.name,game.mandarinName].some(value=>String(value||'').toLowerCase().includes(term))));
}

export function defaultReleaseGroupIds(gameId,records,groups){const assigned=new Set(Array.isArray(records[gameId]?.groupIds)?records[gameId].groupIds:[]);return groups.filter(group=>assigned.has(group.id)).map(group=>group.id);}

export function upgradeReleaseTypeConfig(config){
 if(config?.version>=5){
  const types=normalizeReleaseTypes(config.types);
  if(config.version===5&&!types.some(type=>type.id==='flow-uat-dm')){
   const after=types.findIndex(type=>type.id==='flow-uat-no-dm');
   types.splice(after<0?types.length:after+1,0,{...DEFAULT_NOTIFICATION_TYPES.find(type=>type.id==='flow-uat-dm')});
  }
  return types;
 }
 const builtIn=new Set([...DEFAULT_NOTIFICATION_TYPES.map(type=>type.id),'first-uat','first-pord','other-uat','other-pord','materials']);
 const custom=normalizeReleaseTypes(config?.types).filter(type=>!builtIn.has(type.id));
 return normalizeReleaseTypes([...DEFAULT_NOTIFICATION_TYPES,...custom]);
}

export function releaseRecipientScope(groupIds, platforms, exclusions, environment, supportId) {
 const excluded=new Set((environment==='uat'?exclusions.uat:environment==='prod'?exclusions.prod:[...exclusions.uat,...exclusions.prod]).map(item=>item.id));
 const shared=[],targeted=[],omitted=[];
 for(const groupId of groupIds){
  const members=platforms.filter(platform=>platform.groupId===groupId);
  const removed=groupId===supportId?[]:members.filter(platform=>excluded.has(platform.id));
  if(!removed.length){shared.push(groupId);continue;}
  omitted.push(...removed);
  targeted.push(...members.filter(platform=>!excluded.has(platform.id)));
 }
 return {shared,targeted:Object.fromEntries(targeted.map(platform=>[platform.id,platform.groupId])),omitted};
}
