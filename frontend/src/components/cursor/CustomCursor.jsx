import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const CustomCursor = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isInput, setIsInput] = useState(false);
  const dotX = useMotionValue(0);
  const dotY = useMotionValue(0);
  const ringXRaw = useMotionValue(0);
  const ringYRaw = useMotionValue(0);
  const ringX = useSpring(ringXRaw, { stiffness: 150, damping: 20 });
  const ringY = useSpring(ringYRaw, { stiffness: 150, damping: 20 });

  useEffect(() => {
    const onMove = (e) => {
      dotX.set(e.clientX);
      dotY.set(e.clientY);
      ringXRaw.set(e.clientX);
      ringYRaw.set(e.clientY);
    };
    const onOver = (e) => {
      const tag = e.target.tagName.toLowerCase();
      const isClickable = e.target.closest('button, a, [role="button"], [data-clickable]');
      const isInputEl = ['input', 'textarea', 'select'].includes(tag);
      setIsInput(isInputEl);
      setIsHovering(!!isClickable && !isInputEl);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseover', onOver); };
  }, [dotX, dotY, ringXRaw, ringYRaw]);

  // Hide on touch devices
  if (window.matchMedia('(pointer: coarse)').matches) return null;

  return (
    <>
      <motion.div
        style={{ x: dotX, y: dotY, translateX: '-50%', translateY: '-50%' }}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] pointer-events-none z-[9999]"
      />
      <motion.div
        style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
        className={`fixed top-0 left-0 rounded-full pointer-events-none z-[9998] border transition-all duration-200 ${
          isHovering
            ? 'w-12 h-12 bg-[var(--copper-glow)] border-[var(--copper)]'
            : isInput
            ? 'w-4 h-4 border-[var(--copper)]'
            : 'w-8 h-8 border-[rgba(200,149,108,0.5)]'
        }`}
      />
    </>
  );
};

export default CustomCursor;
