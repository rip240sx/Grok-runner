// components/MobileLandscapeGuard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import useVh from '../lib/useVh';

export default function MobileLandscapeGuard({ children, startButtonLabel = 'Start' }) {
  useVh();

  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const check = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', check, { passive: true });
    window.addEventListener('orientationchange', check, { passive: true });
    const id = setTimeout(check, 300);

    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      clearTimeout(id);
    };
  }, []);

  const tryLockLandscape = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {}

    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      } else if (window.screen.lockOrientation) {
        window.screen.lockOrientation('landscape');
      }
    } catch (e) {}

    setTimeout(() => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    }, 300);
  }, []);

  return (
    <div className="full-viewport">
      <div className={isPortrait ? 'hide-when-overlay' : ''} style={{ width: '100%', height: '100%' }}>
        {children}
      </div>

      {isPortrait && (
        <div className="orientation-overlay" role="dialog" aria-modal="true">
          <div className="rotate-graphic" aria-hidden>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7"></path>
              <polyline points="21 3 21 9 15 9"></polyline>
            </svg>
          </div>

          <div className="hint">
            Please rotate your device to landscape to play.
          </div>

          <button
            onClick={tryLockLandscape}
            style={{
              marginTop: 8,
              padding: '10px 18px',
              fontSize: 16,
              borderRadius: 10,
              border: 'none',
              background: '#1e88e5',
              color: '#fff',
            }}
          >
            {startButtonLabel}
          </button>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
            Tap button if rotation doesn't happen automatically.
          </div>
        </div>
      )}
    </div>
  );
}
