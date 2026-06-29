import { useEffect, useRef } from 'react';

// Lerp factor — higher = faster ring catch-up (0.12 ≈ 80ms feel, 0.18 feels snappier)
const LERP = 0.18;

export default function CustomCursor() {
  // Skip on touch/mobile devices
  if (window.matchMedia('(pointer: coarse)').matches) return null;

  return <CursorImpl />;
}

function CursorImpl() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Current real mouse position (dot)
    let mx = -200, my = -200;
    // Ring's interpolated position
    let rx = -200, ry = -200;
    let rafId;

    // --- Mouse position tracker ---
    const onMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      // Dot follows immediately via direct style mutation — zero React overhead
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    };

    // --- RAF loop for ring lerp ---
    const loop = () => {
      rx += (mx - rx) * LERP;
      ry += (my - ry) * LERP;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    // --- Hover state detection ---
    const INTERACTIVE = 'button, a, [role="button"], input, select, label';
    const INPUT_ELS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

    const onMouseOver = (e) => {
      const isInput = INPUT_ELS.has(e.target.tagName);
      const isHovering = !!e.target.closest(INTERACTIVE);

      if (isInput) {
        // Thin vertical bar for text inputs
        dot.style.width = '2px';
        dot.style.height = '16px';
        dot.style.borderRadius = '1px';
        ring.classList.remove('cursor-hover');
      } else if (isHovering) {
        dot.style.width = '6px';
        dot.style.height = '6px';
        dot.style.borderRadius = '50%';
        ring.classList.add('cursor-hover');
      } else {
        dot.style.width = '6px';
        dot.style.height = '6px';
        dot.style.borderRadius = '50%';
        ring.classList.remove('cursor-hover');
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseover', onMouseOver, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      {/* Dot — snaps to mouse immediately */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'var(--cursor-dot)',
          pointerEvents: 'none',
          zIndex: 999999,
          willChange: 'transform',
        }}
      />

      {/* Ring — lerp-follows with 0.18 factor */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1.5px solid var(--cursor-ring)',
          background: 'transparent',
          pointerEvents: 'none',
          zIndex: 999998,
          willChange: 'transform',
          transition: 'width 0.15s ease, height 0.15s ease, background 0.15s ease, border-color 0.15s ease',
        }}
      // .cursor-hover is toggled by onMouseOver above
      // Styles for .cursor-hover live in index.css (.cursor-ring.hovering)
      // We re-use the existing class from index.css for the expanded/tinted state
      />

      <style>{`
        div[data-cursor-ring].cursor-hover,
        .cursor-hover {
          width: 48px !important;
          height: 48px !important;
          background: rgba(200, 149, 108, 0.15) !important;
          border-color: #C8956C !important;
        }
      `}</style>
    </>
  );
}
