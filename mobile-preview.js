const PREVIEW_KEYS=['wsView','wsCategory','wsPage'];
const API_VIEW={wsView:'page',wsCategory:'cat_1793003007825_ylju99',wsPage:'page_1793005322799_je05mf'};

export function previewTarget(search,base){
 const input=new URLSearchParams(search),url=new URL('./',base);
 for(const key of PREVIEW_KEYS){const value=input.get(key);if(value)url.searchParams.set(key,value);}
 if(!url.searchParams.has('wsView'))for(const [key,value]of Object.entries(API_VIEW))url.searchParams.set(key,value);
 return url;
}

export function installMobilePreview(){
 if(!window.__omniplayCanEdit||window.self!==window.top||document.getElementById('mobilePreviewButton'))return;
 const menu=document.querySelector('.account-settings-menu');if(!menu)return;
 const button=document.createElement('button');button.type='button';button.id='mobilePreviewButton';button.className='secondary';
 const en=document.documentElement.lang.startsWith('en');button.textContent=en?'Mobile Preview':'手機預覽';
 button.onclick=()=>{const url=new URL('./mobile-preview.html',location.href);const current=new URL(location.href);for(const key of PREVIEW_KEYS){const value=current.searchParams.get(key);if(value)url.searchParams.set(key,value);}window.open(url.href,'_blank','noopener');};
 menu.append(button);
}

export function startMobilePreview(){
 const frame=document.getElementById('mobilePreviewFrame');if(!frame)return;
 const target=previewTarget(location.search,location.href),size=document.getElementById('previewSize'),phone=document.getElementById('previewPhone'),space=document.getElementById('previewPhoneSpace'),dimensions=document.getElementById('previewDimensions'),status=document.getElementById('previewStatus');
 document.getElementById('previewOpen').href=target.href;
 const fit=()=>{const [width,height]=size.value.split('x').map(Number),scale=Math.min(1,Math.max(1,document.documentElement.clientWidth-40)/(width+12));phone.style.width=(width+12)+'px';phone.style.height=(height+12)+'px';phone.style.transform='scale('+scale+')';space.style.width=(width+12)*scale+'px';space.style.height=(height+12)*scale+'px';dimensions.textContent=width+' × '+height;};
 const en=localStorage.getItem('omniplay-customer-language')==='en';
 if(en){document.documentElement.lang='en';document.title='Mobile Preview | OMNIPLAY';document.querySelectorAll('[data-en]').forEach(node=>node.textContent=node.dataset.en);size.setAttribute('aria-label','Screen size');frame.title='OMNIPLAY Mobile Preview';}
 size.onchange=fit;window.addEventListener('resize',fit);fit();
 frame.addEventListener('load',()=>{status.textContent=en?'Live site · uses your existing login':'即時網站 · 使用現有登入狀態';});
 document.getElementById('previewReload').onclick=()=>{status.textContent=en?'Reloading…':'重新載入中…';frame.contentWindow.location.reload();};
 status.textContent=en?'Loading…':'載入中…';frame.src=target.href;
}

if(document.getElementById('mobilePreviewFrame'))startMobilePreview();
