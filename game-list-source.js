const value=cell=>cell&&typeof cell==='object'&&'v' in cell?cell.v:cell??'';
const text=v=>String(v??'').trim();
const na=v=>/^n\s*\/\s*a$/i.test(text(v));
export function snapshotGameRows(snapshot){
 const sheet=snapshot?.sheets?.[snapshot.sheetOrder?.[0]];if(!sheet?.cellData)return null;
 let header=-1,start=-1;for(const [r,cells] of Object.entries(sheet.cellData)){if(+r>4)continue;for(const [c,cell] of Object.entries(cells||{}))if(text(value(cell)).replace(/\s+/g,' ').toUpperCase()==='GAME ID'){header=+r;start=+c;break}if(start>=0)break}
 if(start<0)return null;
 const merge=(sheet.mergeData||[]).find(m=>m.startRow===header&&m.startColumn===start);
 const first=merge?merge.endRow+1:header+2;
 const read=(r,c)=>{const direct=sheet.cellData[r]?.[c];if(text(value(direct)))return value(direct);const merged=(sheet.mergeData||[]).find(m=>r>=m.startRow&&r<=m.endRow&&c>=m.startColumn&&c<=m.endColumn);return merged?value(sheet.cellData[merged.startRow]?.[merged.startColumn]):value(direct)};
 let previous=null;return Object.keys(sheet.cellData).map(Number).filter(r=>r>=first).sort((a,b)=>a-b).map(r=>{const row=Array.from({length:19},(_,c)=>read(r,start+c));if(!text(row[0])){const versionId=text(row[1]).match(/^(\d{5,})-/)?.[1];if(previous&&text(row[2])&&text(row[2])===text(previous[2]))row[0]=previous[0];else if(versionId)row[0]=versionId}if(/^\d{5,}$/.test(text(row[0])))previous=row;return row}).filter(row=>/^\d{5,}$/.test(text(row[0])));
}
export function gameListRows(data={}){
 let snapshot=data.nativeSnapshot;try{if(data.snapshotJson)snapshot=JSON.parse(data.snapshotJson)}catch{}
 const native=snapshotGameRows(snapshot);if(native)return native;
 try{const rows=typeof data.rowsJson==='string'?JSON.parse(data.rowsJson):data.rows;return Array.isArray(rows)?rows:[]}catch{return[]}
}
export function preferredGameRows(rows=[]){
 const groups=new Map();for(const row of rows){if(!Array.isArray(row)||!/^\d{5,}$/.test(text(row[0])))continue;const id=text(row[0]);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(row)}
 return [...groups.values()].flatMap(group=>{const eligible=group.filter(row=>!na(row[12])&&!na(row[13]));return eligible.length?eligible:group.slice(0,1)});
}
