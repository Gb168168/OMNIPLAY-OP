function syncCustomerCreateButton(){
  const createBtn=document.querySelector('#newCustomer');
  if(!createBtn)return;
  const hasGroup=!!document.querySelector('#groups .admin-row');
  createBtn.style.display=hasGroup?'':'none';
}
const observer=new MutationObserver(syncCustomerCreateButton);
observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',syncCustomerCreateButton);
syncCustomerCreateButton();