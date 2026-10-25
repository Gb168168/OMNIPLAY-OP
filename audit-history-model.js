export function auditDate(row){return row.createdAt?.toDate?.()||new Date(row.createdAtIso||0)}
export function auditMeta(row){try{const value=JSON.parse(row.item||'');return value&&typeof value==='object'?value:{}}catch{return {}}}
export function auditSessions(rows){
 const sessions=[],byId=new Map(),legacy=new Map();
 const ordered=rows.map((row,index)=>({...row,_index:index})).sort((a,b)=>auditDate(a)-auditDate(b)||b._index-a._index);
 for(const row of ordered){
  const meta=auditMeta(row);if(!['login','logout'].includes(row.action)||meta.kind==='force_logout')continue;
  const account=row.authUid||row.username, id=meta.sessionId, key=id?account+':'+id:null;
  if(row.action==='login'){const entry={...row,login:row,logout:null};sessions.push(entry);if(key)byId.set(key,entry);else{const stack=legacy.get(account)||[];stack.push(entry);legacy.set(account,stack)}}
  else{const stack=legacy.get(account)||[];const entry=key?byId.get(key):stack.pop();if(entry&&!entry.logout)entry.logout=row;else sessions.push({...row,login:null,logout:row})}
 }
 return sessions.sort((a,b)=>auditDate(b.login||b.logout)-auditDate(a.login||a.logout));
}
export function auditOperations(rows){return rows.filter(row=>row.action==='download'||auditMeta(row).kind==='force_logout').sort((a,b)=>auditDate(b)-auditDate(a))}
export function logoutLabel(row){if(!row)return '未記錄登出';const meta=auditMeta(row);return meta.reason==='forced'||String(row.item).includes('強制登出')?'強制登出':'已登出'}
