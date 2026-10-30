import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

const Player = lazy(() => import('./player/FrostStoryApp').then(({ FrostStoryApp }) => ({ default: FrostStoryApp })));
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(<StrictMode><Suspense fallback={<p>กำลังโหลด…</p>}><Player /></Suspense></StrictMode>);
