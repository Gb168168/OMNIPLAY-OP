// Keep the browser tab aligned with the visible workspace heading.
const brand = 'OMNIPLAY ASSETS';
const heading = document.getElementById('pageTitle');
function updateTabTitle() {
  if (document.documentElement.classList.contains('needs-login')) {
    document.title = '登入｜' + brand;
    return;
  }
  const name = document.documentElement.classList.contains('auth-ready')
    ? heading?.textContent.replace(/\s+/g, ' ').trim() : '';
  document.title = name ? name + '｜' + brand : brand;
}
if (heading) new MutationObserver(updateTabTitle).observe(heading, { childList: true, characterData: true, subtree: true });
new MutationObserver(updateTabTitle).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
updateTabTitle();
