import { useEffect, useRef } from 'react';

// ADR 0014: one history entry per open Overlay, so the device back button / edge swipe closes the top one.
type HistoryPort = Pick<History, 'pushState' | 'back'>;

export function createOverlayStack(history: HistoryPort) {
  const stack: (() => void)[] = [];
  let pendingSelfBacks = 0;

  return {
    open(close: () => void) {
      const entry = () => close();
      stack.push(entry);
      history.pushState({ instagoonOverlay: true }, '');
      return function dispose() {
        const index = stack.lastIndexOf(entry);
        if (index === -1) return;
        stack.splice(index, 1);
        pendingSelfBacks += 1;
        history.back();
      };
    },
    onPopState() {
      if (pendingSelfBacks > 0) {
        pendingSelfBacks -= 1;
        return;
      }
      stack.pop()?.();
    },
    get depth() {
      return stack.length;
    },
  };
}

const overlays = typeof window === 'undefined' ? null : createOverlayStack(window.history);

if (overlays) {
  // A reload keeps our old entries in the session history even though no Overlay is open any more.
  if ((window.history.state as { instagoonOverlay?: boolean } | null)?.instagoonOverlay) {
    window.history.replaceState(null, '');
  }
  window.addEventListener('popstate', overlays.onPopState);
}

export function useOverlayHistory(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open || !overlays) return;
    return overlays.open(() => closeRef.current());
  }, [open]);
}
