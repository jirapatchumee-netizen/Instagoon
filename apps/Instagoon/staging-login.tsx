import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LANGS, LoginScreen, TRANSLATIONS, type Lang } from './player/FrostStoryApp';

function StagingLogin() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('froststory_lang');
    return LANGS.some(item => item.id === saved) ? saved as Lang : 'th';
  });
  return <LoginScreen t={TRANSLATIONS[lang]} lang={lang} onSetLang={(value) => { localStorage.setItem('froststory_lang', value); setLang(value); }} error="" />;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(<StagingLogin />);
