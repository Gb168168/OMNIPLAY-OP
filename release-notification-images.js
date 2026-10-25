import {doc,getDocFromServer,setDoc} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
export const MAX_RELEASE_IMAGES=3;
export const MAX_RELEASE_IMAGE_DATA=400000;
export async function prepareReleaseImage(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('請選擇 JPG、PNG 或 WebP 圖片');
 if(!file.size||file.size>10*1024*1024)throw new Error('單張圖片上限 10 MB');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  image.src=url;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('無法讀取圖片');
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  let data='';for(const quality of [.85,.7,.55,.4]){data=canvas.toDataURL('image/jpeg',quality);if(data.length<=MAX_RELEASE_IMAGE_DATA)break}
  if(data.length>MAX_RELEASE_IMAGE_DATA)throw new Error('圖片壓縮後仍過大，請縮小圖片後重試');
  return {id:crypto.randomUUID(),name:String(file.name||'通知圖片').slice(0,120),data};
 }finally{URL.revokeObjectURL(url)}
}
export async function uploadReleaseImages(db,notificationId,images){
 if(images.length>MAX_RELEASE_IMAGES)throw new Error('每則通知最多 3 張圖片');
 for(const image of images){
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(image.id)||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(image.data)||image.data.length>MAX_RELEASE_IMAGE_DATA)throw new Error('通知圖片資料無效');
  await setDoc(doc(db,'omniplay-release-notifications',notificationId,'images',image.id),{data:image.data});
 }
}
export async function readReleaseImage(db,notificationId,imageId){
 const snapshot=await getDocFromServer(doc(db,'omniplay-release-notifications',notificationId,'images',imageId));
 const data=snapshot.data()?.data;
 if(!snapshot.exists()||typeof data!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(data)||data.length>MAX_RELEASE_IMAGE_DATA)throw new Error('圖片無法載入');
 return data;
}
