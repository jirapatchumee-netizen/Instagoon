(() => {
  const langs = ['th', 'en', 'ja'];
  let saved = null;
  try { saved = localStorage.getItem('froststory_lang'); } catch {}
  const browser = (navigator.language || '').slice(0, 2);
  const initial = langs.includes(saved) ? saved : langs.includes(browser) ? browser : 'th';
  const set = (lang) => {
    document.documentElement.lang = lang;
    document.querySelectorAll('article[lang]').forEach((el) => { el.hidden = el.lang !== lang; });
    document.querySelectorAll('.langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.title = document.querySelector(`article[lang="${lang}"] h1`).textContent + ' | instagoon';
    try { localStorage.setItem('froststory_lang', lang); } catch {}
  };
  document.querySelectorAll('.langs button').forEach((b) => b.addEventListener('click', () => set(b.dataset.lang)));
  set(initial);
})();
