import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

const Studio = lazy(() => import('../../src/modules/froststory/FrostStoryStudio'));

const root = document.getElementById('studio-root');
if (!root) throw new Error('Missing studio application root element (#studio-root)');

createRoot(root).render(
  <StrictMode>
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: '#0a0c14', fontFamily: 'system-ui, sans-serif' }}>กำลังโหลด FrostStory Studio…</div>}>
      <Studio />
    </Suspense>
  </StrictMode>
);
